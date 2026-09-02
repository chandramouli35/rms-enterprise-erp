import React from 'react';
import { X, CheckCircle, Package } from 'lucide-react';
import api from '../api/axios';

interface StackHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stackNo: string;
  plantId: string;
  onStackCompleted: () => void;
}

export default function StackHistoryModal({ isOpen, onClose, stackNo, plantId, onStackCompleted }: StackHistoryModalProps) {
  const [loading, setLoading] = React.useState(true);
  const [history, setHistory] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (isOpen && stackNo) {
      setLoading(true);
      api.get(`/api/procurement/stack/history?plantId=${plantId}&stackNo=${stackNo}`)
        .then(res => {
          const { inwards, transfers } = res.data;
          // Combine and sort by date
          const combined = [
            ...inwards.map((i: any) => ({
              ...i,
              type: 'INWARD',
              sortDate: new Date(i.createdAt).getTime()
            })),
            ...transfers.map((t: any) => ({
              ...t,
              type: 'TRANSFER',
              sortDate: new Date(t.date).getTime()
            }))
          ].sort((a, b) => a.sortDate - b.sortDate); // Oldest first for checklist
          
          setHistory(combined);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, stackNo, plantId]);

  const handleMarkComplete = async () => {
    try {
      await api.patch(`/api/procurement/stack/${stackNo}/complete`, { plantId });
      onStackCompleted();
      onClose();
    } catch (error) {
      console.error('Failed to mark stack complete', error);
      alert('Failed to mark complete');
    }
  };

  if (!isOpen) return null;

  let totalWt = 0;
  let totalBags = 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
              <Package className="text-[#e67e00]" />
              Stack Record Requirements Checklist: {stackNo}
            </h2>
            <p className="text-sm text-[var(--text-muted-alt)] mt-1">Detailed history of truck unloadings and transfers</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-panel-hover)] rounded-lg text-[var(--text-muted-alt)] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center items-center py-12 text-[var(--text-muted-alt)]">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#e67e00] mr-3"></div>
              Loading stack history...
            </div>
          ) : (
            <div className="overflow-x-auto border border-[var(--border-subtle)] rounded-lg">
              <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-[var(--bg-panel-hover)]">
                    <th className="p-3 border-r border-[var(--border-subtle)] font-medium text-[var(--text-muted)]">S.no.</th>
                    <th className="p-3 border-r border-[var(--border-subtle)] font-medium text-[var(--text-muted)]">Date</th>
                    <th className="p-3 border-r border-[var(--border-subtle)] font-medium text-[var(--text-muted)]">Mill GP</th>
                    <th className="p-3 border-r border-[var(--border-subtle)] font-medium text-[var(--text-muted)]">Agency GP/Bill No.</th>
                    <th className="p-3 border-r border-[var(--border-subtle)] font-medium text-[var(--text-muted)]">Truck no.</th>
                    <th className="p-3 border-r border-[var(--border-subtle)] font-medium text-[var(--text-muted)]">Party name</th>
                    <th className="p-3 border-r border-[var(--border-subtle)] font-medium text-[var(--text-muted)]">Mandi</th>
                    <th className="p-3 border-r border-[var(--border-subtle)] font-medium text-[var(--text-muted)]">Moisture</th>
                    <th className="p-3 border-r border-[var(--border-subtle)] font-medium text-[var(--text-muted)]">Stack Weight</th>
                    <th className="p-3 border-r border-[var(--border-subtle)] font-medium text-[var(--text-muted)]">Bags</th>
                    <th className="p-3 border-r border-[var(--border-subtle)] font-medium text-[var(--text-muted)]">Bags type A class / B class</th>
                    <th className="p-3 border-r border-[var(--border-subtle)] font-medium text-[var(--text-muted)]">Unloaded By</th>
                    <th className="p-3 font-medium text-[var(--text-muted)]">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-main)]">
                  {history.map((record, index) => {
                    if (record.type === 'INWARD') {
                      const bags = parseFloat(record.paddyInwardDetails?.bagsRecAtMill) || 0;
                      const wt = parseFloat(record.paddyInwardDetails?.netWtAtMill) || 0;
                      totalBags += bags;
                      totalWt += wt;
                      return (
                        <tr key={record.id} className="hover:bg-[var(--bg-app)]">
                          <td className="p-3 border-r border-[var(--border-subtle)]">{index + 1}</td>
                          <td className="p-3 border-r border-[var(--border-subtle)]">{new Date(record.createdAt).toLocaleDateString()}</td>
                          <td className="p-3 border-r border-[var(--border-subtle)]">{record.gatePassNo}</td>
                          <td className="p-3 border-r border-[var(--border-subtle)]">{record.agencyGpNo || '-'}</td>
                          <td className="p-3 border-r border-[var(--border-subtle)]">{record.truckNo}</td>
                          <td className="p-3 border-r border-[var(--border-subtle)]">{record.supplier?.name || '-'}</td>
                          <td className="p-3 border-r border-[var(--border-subtle)]">{record.supplier?.mandi || '-'}</td>
                          <td className="p-3 border-r border-[var(--border-subtle)]">{record.quality?.moisture || '-'}%</td>
                          <td className="p-3 border-r border-[var(--border-subtle)] text-right font-mono">{wt.toFixed(2)}</td>
                          <td className="p-3 border-r border-[var(--border-subtle)] text-right font-mono">{bags}</td>
                          <td className="p-3 border-r border-[var(--border-subtle)]">{record.paddyInwardDetails?.originalBardanaClass?.replace('_', ' ') || '-'}</td>
                          <td className="p-3 border-r border-[var(--border-subtle)]">{record.paddyInwardDetails?.unloadedBy || '-'}</td>
                          <td className="p-3 text-green-500 font-medium">INWARD</td>
                        </tr>
                      );
                    } else {
                      const transferBags = parseFloat(record.bags) || 0;
                      totalBags -= transferBags;
                      return (
                        <tr key={record.id} className="bg-red-500/10 hover:bg-red-500/20 text-red-500">
                          <td className="p-3 border-r border-[var(--border-subtle)] border-red-500/20">{index + 1}</td>
                          <td className="p-3 border-r border-[var(--border-subtle)] border-red-500/20">{new Date(record.date).toLocaleDateString()}</td>
                          <td className="p-3 border-r border-[var(--border-subtle)] border-red-500/20">-</td>
                          <td className="p-3 border-r border-[var(--border-subtle)] border-red-500/20">-</td>
                          <td className="p-3 border-r border-[var(--border-subtle)] border-red-500/20">-</td>
                          <td className="p-3 border-r border-[var(--border-subtle)] border-red-500/20">-</td>
                          <td className="p-3 border-r border-[var(--border-subtle)] border-red-500/20">-</td>
                          <td className="p-3 border-r border-[var(--border-subtle)] border-red-500/20">{record.moisture || '-'}%</td>
                          <td className="p-3 border-r border-[var(--border-subtle)] border-red-500/20 text-right font-mono">-</td>
                          <td className="p-3 border-r border-[var(--border-subtle)] border-red-500/20 text-right font-mono">-{transferBags}</td>
                          <td className="p-3 border-r border-[var(--border-subtle)] border-red-500/20">-</td>
                          <td className="p-3 border-r border-[var(--border-subtle)] border-red-500/20">{record.unloadedBy || '-'}</td>
                          <td className="p-3 font-medium">HOODI TRANSFER</td>
                        </tr>
                      );
                    }
                  })}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={13} className="p-6 text-center text-[var(--text-muted)]">No records found for this stack.</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-[var(--bg-panel-hover)] font-bold text-[var(--text-main)]">
                  <tr>
                    <td colSpan={8} className="p-3 border-r border-[var(--border-subtle)] text-right">Total Balance</td>
                    <td className="p-3 border-r border-[var(--border-subtle)] text-right font-mono">{totalWt.toFixed(2)}</td>
                    <td className="p-3 border-r border-[var(--border-subtle)] text-right font-mono">{totalBags}</td>
                    <td colSpan={3} className="p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-panel-hover)] flex justify-end gap-3 rounded-b-xl">
          <button onClick={onClose} className="px-5 py-2 border border-[var(--border-subtle)] text-[var(--text-main)] font-medium rounded-lg hover:bg-[var(--bg-app)] transition-colors">
            Close
          </button>
          <button onClick={handleMarkComplete} className="px-5 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
            <CheckCircle size={18} /> Mark Stack Complete
          </button>
        </div>
      </div>
    </div>
  );
}

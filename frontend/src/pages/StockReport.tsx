import React, { useState, useEffect } from 'react';
import { FileText, X, Download } from 'lucide-react';
import { inventoryApi } from '../api/inventory';

interface StockReportProps {
  onClose: () => void;
}

export const StockReport: React.FC<StockReportProps> = ({ onClose }) => {
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchReport();
  }, [targetDate]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.getStockReport(targetDate);
      setReportData(res.data);
    } catch (error) {
      console.error("Failed to fetch stock report", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-panel-alt)] rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-main)]">Daily Stock Report</h2>
              <p className="text-xs text-[var(--text-muted-alt)]">Plant / Batch + Inventory summary</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <input 
              type="date" 
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-main)] text-sm rounded-lg px-3 py-1.5 outline-none focus:border-blue-500"
            />
            <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-panel-hover)] hover:bg-[var(--glass-bg)] border border-[var(--border-subtle)] text-[var(--text-main)] rounded-lg font-medium text-sm transition-colors">
              <Download size={14} /> Export
            </button>
            <button onClick={onClose} className="p-2 hover:bg-[var(--bg-panel-hover)] text-[var(--text-muted)] hover:text-white rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-[var(--bg-base)]">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-lg shadow-black/20">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-[var(--bg-panel-alt)] border-b border-[var(--border-subtle)] text-[var(--text-muted-alt)] text-xs uppercase font-bold tracking-wider">
                      <th className="px-4 py-3 border-r border-[var(--border-subtle)]">S.No</th>
                      <th className="px-4 py-3 border-r border-[var(--border-subtle)]">Items</th>
                      <th className="px-4 py-3 text-right bg-blue-900/10">Op Bal</th>
                      <th className="px-4 py-3 text-right text-green-500/80">Day in / Pro</th>
                      <th className="px-4 py-3 text-right text-green-500/80">Night in / Pro</th>
                      <th className="px-4 py-3 text-right bg-[var(--glass-bg)] font-bold text-blue-400 border-x border-[var(--border-subtle)]">Total</th>
                      <th className="px-4 py-3 text-right text-red-500/80">Day out / Use</th>
                      <th className="px-4 py-3 text-right text-red-500/80">Night out / Use</th>
                      <th className="px-4 py-3 text-right bg-blue-900/10 border-l border-[var(--border-subtle)]">Cl Bal</th>
                      <th className="px-4 py-3 border-l border-[var(--border-subtle)]">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, idx) => (
                      <tr key={idx} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)] transition-colors">
                        <td className="px-4 py-3 text-[var(--text-muted-alt)] border-r border-[var(--border-subtle)]">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-[var(--text-main)] border-r border-[var(--border-subtle)]">{row.item}</td>
                        <td className="px-4 py-3 text-right font-medium text-[var(--text-muted)] bg-blue-900/5">{row.opBal}</td>
                        <td className="px-4 py-3 text-right text-[var(--text-muted)]">{row.dayIn}</td>
                        <td className="px-4 py-3 text-right text-[var(--text-muted)]">{row.nightIn}</td>
                        <td className="px-4 py-3 text-right font-bold text-[var(--text-main)] bg-[var(--glass-bg)] border-x border-[var(--border-subtle)]">{row.totalAvailable}</td>
                        <td className="px-4 py-3 text-right text-[var(--text-muted)]">{row.dayOut}</td>
                        <td className="px-4 py-3 text-right text-[var(--text-muted)]">{row.nightOut}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-400 bg-blue-900/5 border-l border-[var(--border-subtle)]">{row.clBal}</td>
                        <td className="px-4 py-3 text-[var(--text-muted-alt)] border-l border-[var(--border-subtle)]">-</td>
                      </tr>
                    ))}
                    {reportData.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-[var(--text-muted-alt)]">
                          No stock data available for this date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

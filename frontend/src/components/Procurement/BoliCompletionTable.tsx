import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '../../store/uiStore';
import api from '../../api/axios';
import { usePlantStore } from '../../store/plantStore';

interface BoliCompletionTableProps {
  sodaPending: any[];
  supplierId: string;
  boliInputs: Record<string, string>;
  setBoliInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSodaComplete?: () => void;
}

export default function BoliCompletionTable({ sodaPending, supplierId, boliInputs, setBoliInputs, onSodaComplete }: BoliCompletionTableProps) {
  const navigate = useNavigate();
  const activePlantId = usePlantStore(state => state.activePlant?.id);
  
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [completionData, setCompletionData] = useState<any>(null);

  const handleBoliCompletionToggle = (e: React.ChangeEvent<HTMLInputElement>, boli: any, soda: any) => {
    if(e.target.checked) {
      const finalBags = parseFloat(boli.bags) || 0;
      const recInSoda = parseFloat(boli.bagsRecInSoda) || 0;
      const recToday = parseFloat(boliInputs[boli.id]) || 0;
      const totalRec = recInSoda + recToday;
      const variance = Math.abs(finalBags - totalRec) / finalBags;
      
      if(variance > 0.15) { // 15% tolerance
        useUiStore.getState().addToast('Admin Notified: Variance exceeds 15%', 'error');
        alert("Variance exceeds 15%. Admin has been notified.");
      }
      
      setCompletionData({ type: 'boli', item: boli, soda, totalRec });
      setShowCompletionPopup(true);
    }
  };

  const handleSodaCompletionToggle = (e: React.ChangeEvent<HTMLInputElement>, soda: any) => {
    if(e.target.checked) {
      setCompletionData({ type: 'soda', item: soda });
      setShowCompletionPopup(true);
    }
  };

  const confirmCompletion = async () => {
    try {
      if (completionData.type === 'boli') {
        const { item, soda, totalRec } = completionData;
        await api.put(`/api/procurement/bolis/${item.id}`, {
          isCompleted: true,
          bagsRecInSoda: totalRec,
          sodaId: soda.id
        }, { headers: { 'x-plant-id': activePlantId } });
        useUiStore.getState().addToast('Boli marked as completed', 'success');
      } else if (completionData.type === 'soda') {
        const { item } = completionData;
        await api.put(`/api/procurement/sodas/${item.id}`, {
          isCompleted: true
        }, { headers: { 'x-plant-id': activePlantId } });
        useUiStore.getState().addToast('Soda marked as completed', 'success');
      }
      setShowCompletionPopup(false);
      setCompletionData(null);
      if (onSodaComplete) onSodaComplete();
    } catch (err) {
      console.error(err);
      useUiStore.getState().addToast('Failed to complete', 'error');
    }
  };

  const handleCancelPopup = () => {
    setShowCompletionPopup(false);
    setCompletionData(null);
    navigate('/master/suppliers'); // As requested: redirect to supplier master
  };

  const filteredSoda = sodaPending.filter((s: any) => s.supplierId === supplierId && !s.isCompleted);

  if (filteredSoda.length === 0) {
    return <div className="p-3 text-center text-gray-500 italic">No pending bolis found.</div>;
  }

  return (
    <div className="overflow-x-auto mb-4 border border-[var(--border-subtle)] rounded">
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead>
           <tr className="text-[var(--text-muted-alt)] text-xs border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
            <th className="p-2 font-medium">Date</th>
            <th className="p-2 font-medium">Rate</th>
            <th className="p-2 font-medium">Moisture</th>
            <th className="p-2 font-medium">Final Bags</th>
            <th className="p-2 font-medium">Bags Rec in soda</th>
            <th className="p-2 font-medium text-blue-400">Bags Rec Today</th>
            <th className="p-2 font-medium text-center">Complete</th>
            <th className="p-2 font-medium">Note</th>
          </tr>
        </thead>
        <tbody>
          {filteredSoda.map((soda: any) => (
            <React.Fragment key={soda.id}>
              {soda.bolis?.filter((b: any) => !b.isCompleted).map((boli: any) => (
                <tr key={boli.id} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--bg-base)]">
                  <td className="p-2">{new Date(soda.date).toLocaleDateString()}</td>
                  <td className="p-2">{boli.rate || soda.rate || '-'}</td>
                  <td className="p-2">{boli.moisture || soda.moisture || '-'}</td>
                  <td className="p-2">{boli.bags}</td>
                  <td className="p-2">{boli.bagsRecInSoda || 0}</td>
                  <td className="p-2">
                    <input type="number" min="0" 
                           value={boliInputs[boli.id] || ''} 
                           onChange={(e) => setBoliInputs(prev => ({...prev, [boli.id]: e.target.value}))}
                           className="w-20 bg-[var(--bg-base)] border border-blue-500/50 rounded px-2 py-1 text-[var(--text-main)] outline-none focus:border-blue-500" 
                           placeholder="Bags" />
                  </td>
                  <td className="p-2 text-center">
                    <input type="checkbox" onChange={(e) => handleBoliCompletionToggle(e, boli, soda)} className="accent-blue-500 w-4 h-4" />
                  </td>
                  <td className="p-2 text-[var(--text-muted)] truncate max-w-[150px]">{soda.note || '-'}</td>
                </tr>
              ))}
              {/* Soda Completion row */}
              <tr className="bg-[#e67e00]/5 border-b-2 border-black/20">
                <td colSpan={6} className="p-2 text-right font-bold text-[#e67e00] text-xs">Complete Entire Soda:</td>
                <td className="p-2 text-center">
                  <input type="checkbox" onChange={(e) => handleSodaCompletionToggle(e, soda)} className="accent-[#e67e00] w-4 h-4" />
                </td>
                <td className="p-2"></td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {showCompletionPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-xl font-bold text-[var(--text-main)] mb-4">Confirm Completion</h2>
            <p className="text-[var(--text-muted)] text-sm mb-6">
              Are you sure you want to mark this {completionData?.type === 'boli' ? 'Boli' : 'Soda'} as completed?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={handleCancelPopup} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
              <button onClick={confirmCompletion} className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold shadow hover:bg-[#cc7000] transition-colors">Confirm Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

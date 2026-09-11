import React, { useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import api from '../../api/axios';
import { usePlantStore } from '../../store/plantStore';

interface BoliCompletionTableProps {
  sodaPending: any[];
  supplierId: string;
  boliInputs: Record<string, string>;
  setBoliInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSodaComplete?: () => void;
  /** Feedback 33 — only editable when Mandi Type = Boli */
  editable?: boolean;
}

/**
 * Feedback 32 — Paddy Inward individual Boli receive + complete.
 * No bulk "complete entire soda". Cancelled (bags=0) bolis are hidden.
 * Complete requires Final Bags and enforces 5% balance tolerance (admin alerted server-side).
 */
export default function BoliCompletionTable({
  sodaPending,
  supplierId,
  boliInputs,
  setBoliInputs,
  onSodaComplete,
  editable = true,
}: BoliCompletionTableProps) {
  const activePlantId = usePlantStore((state) => state.activePlant?.id);

  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [completionData, setCompletionData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const handleBoliCompletionToggle = (e: React.ChangeEvent<HTMLInputElement>, boli: any, soda: any) => {
    if (!e.target.checked) return;

    if (boli.finalBags == null || boli.finalBags === '') {
      e.target.checked = false;
      useUiStore.getState().addToast('Final Bags must be set (Add Final Boli) before completing', 'error');
      return;
    }

    const finalBags = parseFloat(boli.finalBags) || 0;
    const recInSoda = parseFloat(boli.bagsRecInSoda ?? boli.bagsReceived) || 0;
    const recToday = parseFloat(boliInputs[boli.id]) || 0;
    const totalRec = recInSoda + recToday;
    const balance = finalBags - totalRec;
    const tolerance = 0.05 * finalBags;

    // PDF: balance cannot be outside ±5% of Final Bags — block complete
    // Still call API so Admin notification fires (Feedback 32)
    if (Math.abs(balance) > tolerance) {
      e.target.checked = false;
      (async () => {
        try {
          await api.put(
            `/api/procurement/bolis/${boli.id}/complete`,
            { bagsRecToday: recToday },
            { headers: { 'x-plant-id': activePlantId } },
          );
        } catch (err: any) {
          useUiStore
            .getState()
            .addToast(
              err?.response?.data?.message ||
                `Cannot complete: balance ${balance} outside ±5% of Final Bags (${finalBags}). Admin has been notified.`,
              'error',
            );
          return;
        }
        useUiStore
          .getState()
          .addToast(
            `Cannot complete: balance ${balance} outside ±5% of Final Bags (${finalBags}). Admin has been notified.`,
            'error',
          );
      })();
      return;
    }

    setCompletionData({ type: 'boli', item: boli, soda, totalRec, balance, tolerance });
    setShowCompletionPopup(true);
  };

  const confirmCompletion = async () => {
    if (!completionData || saving) return;
    setSaving(true);
    try {
      const { item } = completionData;
      const res = await api.put(
        `/api/procurement/bolis/${item.id}/complete`,
        {
          bagsRecToday: parseFloat(boliInputs[item.id]) || 0,
        },
        { headers: { 'x-plant-id': activePlantId } },
      );
      if (res.data?.adminNotified) {
        useUiStore.getState().addToast('Boli completed — Admin notified (balance outside 5%)', 'error');
      } else {
        useUiStore.getState().addToast('Boli marked as completed', 'success');
      }
      setShowCompletionPopup(false);
      setCompletionData(null);
      setBoliInputs((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      if (onSodaComplete) onSodaComplete();
    } catch (err: any) {
      console.error(err);
      useUiStore.getState().addToast(err.response?.data?.message || 'Failed to complete boli', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPopup = () => {
    setShowCompletionPopup(false);
    setCompletionData(null);
  };

  const filteredSoda = sodaPending.filter((s: any) => s.supplierId === supplierId && !s.sodaCompleted && !s.isCompleted);

  const pendingBolis = filteredSoda
    .flatMap((soda: any) =>
      (soda.bolis || [])
        .filter((b: any) => !b.isCompleted && !b.isCancelled && Number(b.bags) > 0)
        .map((b: any) => ({ boli: b, soda })),
    )
    // Feedback 33 — latest boli at top
    .sort((a, b) => new Date(b.soda.date).getTime() - new Date(a.soda.date).getTime() || new Date(b.boli.createdAt || 0).getTime() - new Date(a.boli.createdAt || 0).getTime());

  if (!supplierId) {
    return <div className="p-3 text-center text-gray-500 italic">Select an Arthiya to see pending bolis.</div>;
  }

  if (pendingBolis.length === 0) {
    return <div className="p-3 text-center text-gray-500 italic">No pending bolis found.</div>;
  }

  let lastDate = '';

  return (
    <div className="overflow-x-auto mb-4 border border-[var(--border-subtle)] rounded">
      {!editable && (
        <div className="px-3 py-2 text-xs text-amber-400 bg-amber-500/10 border-b border-amber-500/20">
          View-only — Mandi Type is Control. Switch to Boli to receive/complete bolis.
        </div>
      )}
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead>
          <tr className="text-[var(--text-muted-alt)] text-xs border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
            <th className="p-2 font-medium">Boli No.</th>
            <th className="p-2 font-medium">Date</th>
            <th className="p-2 font-medium">Rate</th>
            <th className="p-2 font-medium">Moisture</th>
            <th className="p-2 font-medium">Final Bags</th>
            <th className="p-2 font-medium">Bags Rec in soda</th>
            <th className="p-2 font-medium text-blue-400">Bags Rec Today</th>
            <th className="p-2 font-medium text-center">Complete</th>
          </tr>
        </thead>
        <tbody>
          {pendingBolis.map(({ boli, soda }) => {
            const d = new Date(soda.date).toLocaleDateString();
            const showSpacer = lastDate && lastDate !== d;
            lastDate = d;
            return (
            <React.Fragment key={boli.id}>
            {showSpacer && (
              <tr><td colSpan={8} className="h-3 bg-[var(--bg-base)] border-b border-[var(--border-subtle)]" /></tr>
            )}
            <tr className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--bg-base)]">
              <td className="p-2 font-mono text-xs text-[#e67e00]">{boli.boliNo || '-'}</td>
              <td className="p-2">{d}</td>
              <td className="p-2">{boli.rate ?? soda.rate ?? '-'}</td>
              <td className="p-2">{boli.moisture ?? soda.moisture ?? '-'}</td>
              <td className="p-2">{boli.finalBags ?? '—'}</td>
              <td className="p-2">{boli.bagsRecInSoda ?? boli.bagsReceived ?? 0}</td>
              <td className="p-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={boliInputs[boli.id] || ''}
                  disabled={!editable}
                  onChange={(e) => setBoliInputs((prev) => ({ ...prev, [boli.id]: e.target.value }))}
                  className={`w-20 bg-[var(--bg-base)] border border-blue-500/50 rounded px-2 py-1 text-[var(--text-main)] outline-none focus:border-blue-500 ${!editable ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="Bags"
                />
              </td>
              <td className="p-2 text-center">
                <input
                  type="checkbox"
                  disabled={!editable}
                  onChange={(e) => handleBoliCompletionToggle(e, boli, soda)}
                  className={`accent-blue-500 w-4 h-4 ${!editable ? 'opacity-40 cursor-not-allowed' : ''}`}
                  title={editable ? 'Mark this boli completed' : 'View-only for Control'}
                />
              </td>
            </tr>
            </React.Fragment>
          );})}
        </tbody>
      </table>

      {showCompletionPopup && completionData && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 max-w-md w-full shadow-xl">
            <h4 className="text-lg font-bold text-[var(--text-main)] mb-2">Confirm Boli Complete</h4>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              You are marking Boli <span className="text-[#e67e00] font-mono">{completionData.item.boliNo}</span> as
              completed. Received total: <strong>{completionData.totalRec}</strong> / Final{' '}
              <strong>{completionData.item.finalBags}</strong>. Balance: <strong>{completionData.balance}</strong>.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelPopup}
                className="px-3 py-1.5 rounded border border-[var(--border-subtle)] text-sm"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCompletion}
                disabled={saving}
                className="px-3 py-1.5 rounded bg-[#e67e00] text-black text-sm font-bold disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Confirm Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

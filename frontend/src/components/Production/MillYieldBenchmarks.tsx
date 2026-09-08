import React, { useEffect, useState } from 'react';
import { Edit2, RefreshCw, Save, X, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';

type BenchRow = {
  id: string;
  itemKey: string;
  itemLabel: string;
  requiredQty: number | null;
  yieldPctPaddy: number;
  yieldPctRice: number;
  roundFigRicePct: number;
};

export const MillYieldBenchmarks: React.FC = () => {
  const { user } = useAuthStore();
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'PLANT_MANAGER';
  const [rows, setRows] = useState<BenchRow[]>([]);
  const [targets, setTargets] = useState({
    yieldTargetPctPaddy: 71,
    yieldTargetPctRice: 66.2,
    targetId: '' as string,
  });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<BenchRow>>({});
  const [targetDraft, setTargetDraft] = useState({ yieldTargetPctPaddy: 71, yieldTargetPctRice: 66.2 });

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await api.get('/production/mill-yield-benchmarks');
      setRows(res.data.rows || []);
      if (res.data.targets) {
        setTargets(res.data.targets);
        setTargetDraft({
          yieldTargetPctPaddy: res.data.targets.yieldTargetPctPaddy,
          yieldTargetPctRice: res.data.targets.yieldTargetPctRice,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const startEdit = (row: BenchRow) => {
    setEditingId(row.id);
    setDraft({ ...row });
  };

  const save = async () => {
    if (!editingId) return;
    try {
      await api.put(`/production/mill-yield-benchmarks/${editingId}`, {
        requiredQty: draft.requiredQty,
        yieldPctPaddy: draft.yieldPctPaddy,
        yieldPctRice: draft.yieldPctRice,
        roundFigRicePct: draft.roundFigRicePct,
        itemLabel: draft.itemLabel,
      });
      setEditingId(null);
      fetchRows();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Save failed');
    }
  };

  const remove = async (id: string, label: string) => {
    if (!window.confirm(`Deactivate benchmark "${label}"?`)) return;
    try {
      await api.delete(`/production/mill-yield-benchmarks/${id}`);
      fetchRows();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Delete failed');
    }
  };

  const saveTargets = async () => {
    if (!targets.targetId) return;
    try {
      await api.put(`/production/mill-yield-benchmarks/${targets.targetId}`, {
        yieldPctPaddy: targetDraft.yieldTargetPctPaddy,
        yieldPctRice: targetDraft.yieldTargetPctRice,
      });
      fetchRows();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Target save failed');
    }
  };

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-main)]">Mill Yield Benchmarks</h2>
          <p className="text-xs text-[var(--text-muted-alt)] mt-0.5">
            Yield targets {targets.yieldTargetPctPaddy}% of paddy · {targets.yieldTargetPctRice}% of rice
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRows}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {canEdit && (
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex flex-wrap gap-3 items-end bg-[var(--bg-panel-alt)]">
          <div>
            <label className="text-[10px] uppercase text-[var(--text-muted-alt)]">Target % Paddy</label>
            <input
              type="number"
              step="0.1"
              value={targetDraft.yieldTargetPctPaddy}
              onChange={(e) =>
                setTargetDraft({ ...targetDraft, yieldTargetPctPaddy: Number(e.target.value) })
              }
              className="block bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-sm w-28"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase text-[var(--text-muted-alt)]">Target % Rice</label>
            <input
              type="number"
              step="0.1"
              value={targetDraft.yieldTargetPctRice}
              onChange={(e) =>
                setTargetDraft({ ...targetDraft, yieldTargetPctRice: Number(e.target.value) })
              }
              className="block bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-sm w-28"
            />
          </div>
          <button onClick={saveTargets} className="px-3 py-1.5 bg-amber-500 text-black text-xs font-bold rounded-lg">
            Save Targets
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-10 text-center text-[var(--text-muted-alt)]">Loading benchmarks…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-panel-alt)] text-[11px] uppercase text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)]">
                <th className="px-3 py-3 text-left">Item</th>
                <th className="px-3 py-3 text-right">Required Qty</th>
                <th className="px-3 py-3 text-right">Yield % (Paddy)</th>
                <th className="px-3 py-3 text-right">Yield % (Rice)</th>
                <th className="px-3 py-3 text-right">Round Fig % (Rice)</th>
                {canEdit && <th className="px-3 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {rows.map((row) => {
                const isEditing = editingId === row.id;
                return (
                  <tr key={row.id} className="hover:bg-[var(--glass-bg)]">
                    <td className="px-3 py-3 font-medium text-[var(--text-main)]">
                      {isEditing ? (
                        <input
                          className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 w-full"
                          value={draft.itemLabel || ''}
                          onChange={(e) => setDraft({ ...draft, itemLabel: e.target.value })}
                        />
                      ) : (
                        row.itemLabel
                      )}
                    </td>
                    {(['requiredQty', 'yieldPctPaddy', 'yieldPctRice', 'roundFigRicePct'] as const).map(
                      (field) => (
                        <td key={field} className="px-3 py-3 text-right text-[var(--text-main)]">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.001"
                              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 w-28 text-right"
                              value={(draft as any)[field] ?? ''}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  [field]: e.target.value === '' ? null : Number(e.target.value),
                                })
                              }
                            />
                          ) : (row as any)[field] != null ? (
                            Number((row as any)[field]).toLocaleString('en-IN', {
                              maximumFractionDigits: 6,
                            })
                          ) : (
                            '—'
                          )}
                        </td>
                      ),
                    )}
                    {canEdit && (
                      <td className="px-3 py-3 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <button onClick={save} className="p-1 text-green-500">
                              <Save size={14} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1 text-[var(--text-muted)]">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => startEdit(row)} className="p-1 text-blue-400">
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => remove(row.id, row.itemLabel)}
                              className="p-1 text-red-400"
                              title="Deactivate"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

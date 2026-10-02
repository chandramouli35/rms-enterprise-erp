import React, { useEffect, useState } from 'react';
import { Edit2, RefreshCw, Save, X, Trash2, ShieldAlert } from 'lucide-react';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { usePlantStore } from '../../store/plantStore';

type BenchRow = {
  id: string;
  itemKey: string;
  itemLabel: string;
  requiredQty: number | null;
  yieldPctPaddy: number;
  yieldPctRice: number;
  roundFigRicePct: number;
};

/** Visual section breaks matching client Mill Yield Benchmarks sheet */
const SECTION_AFTER = new Set(['REJECTION', 'K_PHUCK', 'HUSK']);

const formatCell = (value: number | null | undefined, digits = 6) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: digits });
};

export const MillYieldBenchmarks: React.FC = () => {
  const { user } = useAuthStore();
  const activePlant = usePlantStore((s) => s.activePlant);
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const [rows, setRows] = useState<BenchRow[]>([]);
  const [targets, setTargets] = useState({
    yieldTargetPctPaddy: 71,
    yieldTargetPctRice: 66.2,
    targetId: '' as string,
  });
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<BenchRow>>({});
  const [targetDraft, setTargetDraft] = useState({ yieldTargetPctPaddy: 71, yieldTargetPctRice: 66.2 });

  const fetchRows = async () => {
    if (!activePlant?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setForbidden(false);
    try {
      const res = await api.get('/production/mill-yield-benchmarks', {
        params: { plantId: activePlant.id },
      });
      setRows(res.data.rows || []);
      if (res.data.targets) {
        setTargets(res.data.targets);
        setTargetDraft({
          yieldTargetPctPaddy: res.data.targets.yieldTargetPctPaddy,
          yieldTargetPctRice: res.data.targets.yieldTargetPctRice,
        });
      }
    } catch (e: any) {
      if (e?.response?.status === 403) setForbidden(true);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, activePlant?.id]);

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

  const displayPct = (row: BenchRow, field: 'yieldPctPaddy' | 'yieldPctRice' | 'roundFigRicePct') => {
    if (row.itemKey === 'PADDY') return '—';
    const v = row[field];
    if (v == null || v === 0) return '—';
    return formatCell(v, field === 'yieldPctRice' ? 9 : 6);
  };

  if (!isAdmin || forbidden) {
    return (
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-10 flex flex-col items-center gap-3 text-center">
        <ShieldAlert className="text-amber-500" size={28} />
        <h2 className="text-lg font-bold text-[var(--text-main)]">Admin only</h2>
        <p className="text-sm text-[var(--text-muted-alt)] max-w-md">
          Mill Yield Benchmarks are restricted to Admin / Super Admin.
        </p>
      </div>
    );
  }

  if (!activePlant?.id) {
    return (
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-10 text-center text-[var(--text-muted-alt)]">
        Select a mill/plant to view Mill Yield Benchmarks.
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-main)]">Mill Yield Benchmarks (Production)</h2>
          <p className="text-xs text-[var(--text-muted-alt)] mt-0.5">
            Mill: <span className="text-[var(--text-main)] font-medium">{activePlant.name}</span>
            {' · '}
            Yield target {targets.yieldTargetPctPaddy}% of paddy · Yield target {targets.yieldTargetPctRice}% of rice
          </p>
        </div>
        <button
          onClick={fetchRows}
          className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs flex items-center gap-1.5"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex flex-wrap gap-3 items-end bg-[var(--bg-panel-alt)]">
        <div>
          <label className="text-[10px] uppercase text-[var(--text-muted-alt)]">Yield target % of paddy</label>
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
          <label className="text-[10px] uppercase text-[var(--text-muted-alt)]">Yield target % of rice</label>
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

      {loading ? (
        <div className="p-10 text-center text-[var(--text-muted-alt)]">Loading benchmarks…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-panel-alt)] text-[11px] uppercase text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)]">
                <th className="px-3 py-3 text-left">Item Name</th>
                <th className="px-3 py-3 text-right">Required quantity</th>
                <th className="px-3 py-3 text-right">Yield % as per paddy</th>
                <th className="px-3 py-3 text-right">Yield % as per rice</th>
                <th className="px-3 py-3 text-right">Round Fig yield % of rice</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isEditing = editingId === row.id;
                return (
                  <React.Fragment key={row.id}>
                    <tr className="border-b border-[var(--border-subtle)] hover:bg-[var(--glass-bg)]">
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
                      <td className="px-3 py-3 text-right text-[var(--text-main)]">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.001"
                            className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 w-28 text-right"
                            value={draft.requiredQty ?? ''}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                requiredQty: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                          />
                        ) : (
                          formatCell(row.requiredQty)
                        )}
                      </td>
                      {(['yieldPctPaddy', 'yieldPctRice', 'roundFigRicePct'] as const).map((field) => (
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
                          ) : (
                            displayPct(row, field)
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <button onClick={save} className="p-1 text-green-500" title="Save">
                              <Save size={14} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1 text-[var(--text-muted)]" title="Cancel">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => startEdit(row)} className="p-1 text-blue-400" title="Edit">
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
                    </tr>
                    {SECTION_AFTER.has(row.itemKey) && (
                      <tr aria-hidden>
                        <td colSpan={6} className="h-3 bg-[var(--bg-panel-alt)]/40 border-b border-[var(--border-subtle)]" />
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

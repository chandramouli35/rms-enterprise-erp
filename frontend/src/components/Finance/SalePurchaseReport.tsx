import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { liveBillingPreview, oilResultAfterCut, salePurchaseApi } from '../../api/salePurchase';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { hasFinancePermission } from '../../utils/financePermissions';

type ReportType = 'SALE' | 'PURCHASE';

const fmt = (n: number | null | undefined, d = 3) =>
  n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toFixed(d);

const fmtMoney = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const payLabel = (s: string) =>
  ({ CLEAR: 'Clear', UNDERWAY: 'Underway', NOT_CLEAR: 'Unclear' } as Record<string, string>)[s] || s;

export const SalePurchaseReport: React.FC<{ reportType: ReportType }> = ({ reportType }) => {
  const user = useAuthStore((s) => s.user);
  const addToast = useUiStore((s) => s.addToast);
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const subLabel = reportType === 'SALE' ? 'Sale' : 'Purchase';
  const canEditReport = isAdmin && hasFinancePermission(subLabel, 'canEdit');

  const [plants, setPlants] = useState<any[]>([]);
  const [plantId, setPlantId] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [oilDraft, setOilDraft] = useState<Record<string, string>>({});
  const [cdDraft, setCdDraft] = useState<Record<string, string>>({});
  const [audits, setAudits] = useState<any[]>([]);
  const [showAudits, setShowAudits] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await salePurchaseApi.list(reportType, plantId || undefined);
      setPlants(res.data.plants || []);
      setRows(res.data.rows || []);
    } catch (e: any) {
      if (!opts?.silent) addToast(e?.response?.data?.message || 'Failed to load report', 'error');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [reportType, plantId, addToast]);

  const loadAudits = useCallback(async () => {
    try {
      const res = await salePurchaseApi.audits();
      setAudits(Array.isArray(res.data) ? res.data : []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setDrawerOpen(true);
  }, [reportType]);

  // Near-real-time sync (PDF websocket alternative — short poll)
  useEffect(() => {
    const t = setInterval(() => load({ silent: true }), 3000);
    return () => clearInterval(t);
  }, [load]);

  const patchRow = async (id: string, body: any) => {
    try {
      const res = await salePurchaseApi.update(id, body);
      setRows((prev) => prev.map((r) => (r.id === id ? res.data : r)));
      addToast('Updated', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Update failed', 'error');
      await load();
    }
  };

  const patchPay = async (id: string, paymentStatus: string) => {
    try {
      const res = await salePurchaseApi.paymentStatus(id, paymentStatus, plantId || undefined);
      setPlants(res.data.plants || plants);
      setRows(res.data.rows || []);
      addToast('Payment status synced to Soda Report (Section Z / L)', 'success');
      if (showAudits) loadAudits();
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Update failed', 'error');
    }
  };

  const liveMap = useMemo(() => {
    const map: Record<
      string,
      { oilAfterCut: number | null; rateV: number | null; billAmount: number; netPayment: number }
    > = {};
    for (const r of rows) {
      const oilRaw = oilDraft[r.id];
      const oilOverride =
        oilRaw !== undefined && oilRaw !== '' ? parseFloat(oilRaw) : r.oilResult ?? null;
      const cdRaw = cdDraft[r.id];
      const cdOverride = cdRaw !== undefined && cdRaw !== '' ? parseFloat(cdRaw) : null;
      const preview = liveBillingPreview(
        r,
        oilOverride != null && oilOverride > 0 ? oilOverride : null,
        cdOverride,
      );
      // Prefer server P when no oil draft; still live V/W/Y when drafting oil
      map[r.id] = {
        oilAfterCut:
          oilRaw !== undefined && oilRaw !== ''
            ? oilResultAfterCut(parseFloat(oilRaw))
            : r.oilResultAfterCut,
        rateV: oilRaw !== undefined || cdRaw !== undefined ? preview.rateV : r.rateV,
        billAmount:
          oilRaw !== undefined || cdRaw !== undefined ? preview.billAmount : r.billAmount,
        netPayment:
          oilRaw !== undefined || cdRaw !== undefined ? preview.netPayment : r.netPayment,
      };
    }
    return map;
  }, [rows, oilDraft, cdDraft]);

  const title = reportType === 'SALE' ? 'Sale Report' : 'Purchase Report';
  const orderLabel = reportType === 'SALE' ? 'Sale Order No.' : 'Purchase Order No.';
  const selectedMillName = plantId
    ? plants.find((p) => p.id === plantId)?.name || 'Mill'
    : 'All mills';

  const reportBody = (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-[var(--text-main)]">{title}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Mill: <span className="text-[var(--text-main)] font-medium">{selectedMillName}</span>
            {' · '}Submitted Gate Passes linked to finance sodas (drafts excluded)
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-xs text-[var(--text-muted)]">
            Select Mill
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              className="mt-1 min-w-[200px] block bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-amber-500 outline-none"
            >
              <option value="">All mills</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {canEditReport && (
            <>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await salePurchaseApi.backfill();
                    addToast(
                      `Backfill: ${res.data.created} created / ${res.data.scanned} scanned`,
                      'success',
                    );
                    await load();
                  } catch (e: any) {
                    addToast(e?.response?.data?.message || 'Backfill failed', 'error');
                  }
                }}
                className="px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:bg-[var(--glass-bg)]"
              >
                Backfill
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAudits((v) => !v);
                  if (!showAudits) loadAudits();
                }}
                className={`px-3 py-2 rounded-lg border text-xs hover:bg-[var(--glass-bg)] ${
                  showAudits
                    ? 'border-amber-500/50 text-amber-400'
                    : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
                }`}
              >
                Payment audit
              </button>
            </>
          )}
        </div>
      </div>

      {showAudits && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 max-h-48 overflow-y-auto shrink-0">
          <h4 className="text-sm font-bold text-[var(--text-main)] mb-2">Payment status audit trail</h4>
          {audits.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No status changes yet</p>
          ) : (
            <ul className="space-y-1 text-xs text-[var(--text-muted)]">
              {audits.slice(0, 30).map((a) => (
                <li key={a.id}>
                  {new Date(a.createdAt).toLocaleString()} —{' '}
                  {a.financeSoda?.sodaType}-{a.financeSoda?.sodaNumber}: {a.fromStatus} → {a.toStatus}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-x-auto min-h-[280px] flex-1">
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-[var(--text-muted)]">
            Loading report…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <p className="text-sm font-medium text-[var(--text-main)]">No rows for this filter</p>
            <p className="mt-2 text-xs text-[var(--text-muted)] max-w-md leading-relaxed">
              Rows appear after a <span className="text-[var(--text-main)]">non-draft</span> Gate Pass
              is submitted with a Finance Soda. Try another mill, or create a soda and cut GP Out/In.
            </p>
          </div>
        ) : (
          <table className="min-w-[2200px] w-full text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] text-left">
                <th className="px-2 py-2 sticky left-0 bg-[var(--bg-panel)]">Mill</th>
                <th className="px-2 py-2">A Date</th>
                <th className="px-2 py-2">B Item</th>
                <th className="px-2 py-2">C Party</th>
                <th className="px-2 py-2">D Rate</th>
                <th className="px-2 py-2">E Qty</th>
                <th className="px-2 py-2">F {orderLabel}</th>
                <th className="px-2 py-2">G Bill</th>
                <th className="px-2 py-2">H S.No</th>
                <th className="px-2 py-2">I GP Date</th>
                <th className="px-2 py-2">J Truck</th>
                <th className="px-2 py-2">K GP</th>
                <th className="px-2 py-2">L Bags</th>
                <th className="px-2 py-2">M Bag Type</th>
                <th className="px-2 py-2">N Bag Wt?</th>
                <th className="px-2 py-2">O Oil %</th>
                <th className="px-2 py-2">P Oil After Cut</th>
                <th className="px-2 py-2">Q Mill Wt</th>
                <th className="px-2 py-2">R Party Wt</th>
                <th className="px-2 py-2 text-amber-400">S Lower Wt</th>
                <th className="px-2 py-2">T Diff</th>
                <th className="px-2 py-2">U Wt/Bag</th>
                <th className="px-2 py-2">V Rate</th>
                <th className="px-2 py-2">W Bill Amt</th>
                <th className="px-2 py-2">X CD%</th>
                <th className="px-2 py-2">Y Net Pay</th>
                <th className="px-2 py-2">Z Pay Status</th>
                <th className="px-2 py-2">AA Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const live = liveMap[r.id] || {};
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)] ${
                      r.oilRequired || r.bagWeightError || r.weightsMissing ? 'bg-red-500/5' : ''
                    }`}
                  >
                    <td className="px-2 py-1.5 sticky left-0 bg-[var(--bg-panel)] font-medium text-[var(--text-main)]">
                      {r.plantName}
                    </td>
                    <td className="px-2 py-1.5 text-[var(--text-main)]">
                      {r.sodaDate ? new Date(r.sodaDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-[var(--text-main)]">{r.itemName}</td>
                    <td className="px-2 py-1.5 text-[var(--text-main)]">{r.partyName}</td>
                    <td className="px-2 py-1.5 text-[var(--text-main)]">
                      {r.isShift ? 'Shift' : fmt(r.rate, 2)}
                    </td>
                    <td className="px-2 py-1.5 text-[var(--text-main)]">{r.quantity}</td>
                    <td className="px-2 py-1.5 text-[var(--text-main)] font-semibold">{r.sodaNumber}</td>
                    <td className="px-2 py-1.5 text-[var(--text-main)]">{r.billNo || '—'}</td>
                    <td className="px-2 py-1.5 text-amber-400 font-bold">
                      {String(r.serialNo).padStart(2, '0')}
                    </td>
                    <td className="px-2 py-1.5 text-[var(--text-main)]">
                      {r.gpDate ? new Date(r.gpDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-[var(--text-main)]">{r.truckNo}</td>
                    <td className="px-2 py-1.5 text-[var(--text-main)]">{r.gpNo}</td>
                    <td className="px-2 py-1.5 text-[var(--text-main)]">{r.bags}</td>
                    <td className="px-2 py-1.5 text-[var(--text-main)]">{r.bagType || '—'}</td>
                    <td className="px-2 py-1.5" title={r.bagWeightError || ''}>
                      {canEditReport ? (
                        <select
                          value={r.bagWeightConsideration ? 'YES' : 'NO'}
                          onChange={(e) =>
                            patchRow(r.id, { bagWeightConsideration: e.target.value === 'YES' })
                          }
                          className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-1 py-0.5 text-[var(--text-main)]"
                        >
                          <option value="NO">No</option>
                          <option value="YES">Yes</option>
                        </select>
                      ) : r.bagWeightConsideration ? (
                        'Yes'
                      ) : (
                        'No'
                      )}
                      {r.bagWeightError && (
                        <div className="text-[9px] text-red-400 max-w-[90px]">{r.bagWeightError}</div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {r.isRiceBran && canEditReport ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Required"
                          value={oilDraft[r.id] !== undefined ? oilDraft[r.id] : r.oilResult ?? ''}
                          onChange={(e) => setOilDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (!v || !(parseFloat(v) > 0)) {
                              addToast('Oil Result required (> 0) for Rice Bran', 'error');
                              setOilDraft((d) => {
                                const n = { ...d };
                                delete n[r.id];
                                return n;
                              });
                              return;
                            }
                            patchRow(r.id, { oilResult: parseFloat(v) }).then(() => {
                              setOilDraft((d) => {
                                const n = { ...d };
                                delete n[r.id];
                                return n;
                              });
                            });
                          }}
                          className={`w-16 bg-[var(--bg-panel-alt)] border rounded px-1 py-0.5 text-[var(--text-main)] ${
                            r.oilRequired ? 'border-red-500' : 'border-[var(--border-subtle)]'
                          }`}
                        />
                      ) : (
                        <span className={r.oilRequired ? 'text-red-400' : ''}>
                          {fmt(r.oilResult, 2)}
                          {r.oilRequired ? ' (req)' : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-[var(--text-muted)]">{fmt(live.oilAfterCut, 2)}</td>
                    <td className="px-2 py-1.5 text-[var(--text-main)]">
                      {r.weightsMissing ? (
                        <span className="text-yellow-500" title="Weighbridge off / weights missing">
                          N/A
                        </span>
                      ) : (
                        fmt(r.netWeightMill)
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-[var(--text-main)]">
                      {r.weightsMissing ? (
                        <span className="text-yellow-500">N/A</span>
                      ) : (
                        fmt(r.netWeightParty)
                      )}
                    </td>
                    <td className="px-2 py-1.5 font-bold text-amber-400" title="Primary billing weight">
                      {r.weightsMissing ? 'N/A' : fmt(r.lowerWeight)}
                    </td>
                    <td
                      className={`px-2 py-1.5 ${
                        r.weightDiscrepancy
                          ? 'text-orange-400 font-semibold'
                          : 'text-[var(--text-main)]'
                      }`}
                      title={
                        r.weightDiscrepancy
                          ? 'Mill vs Party weight variance — verify Gate Pass Report'
                          : undefined
                      }
                    >
                      {r.weightsMissing
                        ? '—'
                        : `${r.weightDifference > 0 ? '+' : ''}${fmt(r.weightDifference)}`}
                    </td>
                    <td className="px-2 py-1.5 text-[var(--text-main)]">
                      {r.weightsMissing || !(r.bags > 0) ? 'N/A' : fmt(r.weightPerBag)}
                    </td>
                    <td className="px-2 py-1.5 text-[var(--text-main)]">
                      {r.oilRequired ? (
                        <span className="text-red-400">Oil req</span>
                      ) : (
                        fmt(live.rateV, 2)
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-[var(--text-main)]">{fmtMoney(live.billAmount)}</td>
                    <td className="px-2 py-1.5">
                      {canEditReport ? (
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={
                            cdDraft[r.id] !== undefined ? cdDraft[r.id] : String(r.cdPercent ?? 0)
                          }
                          onChange={(e) => setCdDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                          onBlur={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            patchRow(r.id, { cdPercent: v }).then(() => {
                              setCdDraft((d) => {
                                const n = { ...d };
                                delete n[r.id];
                                return n;
                              });
                            });
                          }}
                          className="w-14 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-1 py-0.5 text-[var(--text-main)]"
                        />
                      ) : (
                        fmt(r.cdPercent, 2)
                      )}
                    </td>
                    <td className="px-2 py-1.5 font-semibold text-green-400">
                      {fmtMoney(live.netPayment)}
                    </td>
                    <td className="px-2 py-1.5">
                      {canEditReport ? (
                        <select
                          value={r.paymentStatus}
                          onChange={(e) => patchPay(r.id, e.target.value)}
                          className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-1 py-0.5 text-[var(--text-main)]"
                        >
                          <option value="CLEAR">Clear</option>
                          <option value="UNDERWAY">Underway</option>
                          <option value="NOT_CLEAR">Unclear</option>
                        </select>
                      ) : (
                        <span>{payLabel(r.paymentStatus)}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {canEditReport ? (
                        <input
                          type="text"
                          defaultValue={r.note || ''}
                          key={`note-${r.id}-${r.note}`}
                          onBlur={(e) => {
                            if ((e.target.value || '') !== (r.note || '')) {
                              patchRow(r.id, { note: e.target.value });
                            }
                          }}
                          className="w-28 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-1 py-0.5 text-[var(--text-main)]"
                        />
                      ) : (
                        r.note || '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );

  return (
    <div className="space-y-3">
      {!drawerOpen && (
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold"
        >
          Open {title} drawer
        </button>
      )}

      {/* Feedback 29: slide-over drawer with Select Mill + mill-wise report */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            aria-label="Close drawer backdrop"
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 flex h-full w-full max-w-[min(100vw,1400px)] flex-col gap-3 border-l border-[var(--border-subtle)] bg-[var(--bg-base)] p-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                Finance · {title}
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--glass-bg)]"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto">{reportBody}</div>
          </div>
        </div>
      )}
    </div>
  );
};

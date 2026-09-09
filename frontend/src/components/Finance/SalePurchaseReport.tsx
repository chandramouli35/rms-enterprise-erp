import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { oilResultAfterCut, salePurchaseApi } from '../../api/salePurchase';
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
  const [audits, setAudits] = useState<any[]>([]);
  const [showAudits, setShowAudits] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salePurchaseApi.list(reportType, plantId || undefined);
      setPlants(res.data.plants || []);
      setRows(res.data.rows || []);
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to load report', 'error');
    } finally {
      setLoading(false);
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

  // Near-real-time sync (PDF: websocket / no manual refresh → short poll)
  useEffect(() => {
    const t = setInterval(() => load(), 3000);
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
      addToast('Payment status synced to Soda Report (Section L)', 'success');
      if (showAudits) loadAudits();
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Update failed', 'error');
    }
  };

  const liveP = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const r of rows) {
      const raw = oilDraft[r.id];
      if (raw !== undefined && raw !== '') {
        map[r.id] = oilResultAfterCut(parseFloat(raw));
      } else {
        map[r.id] = r.oilResultAfterCut;
      }
    }
    return map;
  }, [rows, oilDraft]);

  const title = reportType === 'SALE' ? 'Sale Report' : 'Purchase Report';
  const orderLabel = reportType === 'SALE' ? 'Sale Order No.' : 'Purchase Order No.';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-[var(--text-main)]">{title}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            From submitted Gate Passes linked to finance sodas
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
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 max-h-48 overflow-y-auto">
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

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-x-auto min-h-[280px]">
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
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)] ${
                    r.oilRequired || r.bagWeightError ? 'bg-red-500/5' : ''
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
                  <td className="px-2 py-1.5 text-[var(--text-main)]">{r.isShift ? 'Shift' : fmt(r.rate, 2)}</td>
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
                    ) : (
                      r.bagWeightConsideration ? 'Yes' : 'No'
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
                  <td className="px-2 py-1.5 text-[var(--text-muted)]">{fmt(liveP[r.id], 2)}</td>
                  <td className="px-2 py-1.5 text-[var(--text-main)]">{fmt(r.netWeightMill)}</td>
                  <td className="px-2 py-1.5 text-[var(--text-main)]">{fmt(r.netWeightParty)}</td>
                  <td className="px-2 py-1.5 font-bold text-amber-400" title="Primary billing weight">
                    {fmt(r.lowerWeight)}
                  </td>
                  <td
                    className={`px-2 py-1.5 ${
                      r.weightDiscrepancy ? 'text-orange-400 font-semibold' : 'text-[var(--text-main)]'
                    }`}
                  >
                    {r.weightDifference > 0 ? '+' : ''}
                    {fmt(r.weightDifference)}
                  </td>
                  <td className="px-2 py-1.5 text-[var(--text-main)]">{fmt(r.weightPerBag)}</td>
                  <td className="px-2 py-1.5 text-[var(--text-main)]">
                    {r.oilRequired ? <span className="text-red-400">Oil req</span> : fmt(r.rateV, 2)}
                  </td>
                  <td className="px-2 py-1.5 text-[var(--text-main)]">{fmtMoney(r.billAmount)}</td>
                  <td className="px-2 py-1.5">
                    {canEditReport ? (
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        defaultValue={r.cdPercent ?? 0}
                        key={`cd-${r.id}-${r.cdPercent}`}
                        onBlur={(e) => patchRow(r.id, { cdPercent: parseFloat(e.target.value) || 0 })}
                        className="w-14 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-1 py-0.5 text-[var(--text-main)]"
                      />
                    ) : (
                      fmt(r.cdPercent, 2)
                    )}
                  </td>
                  <td className="px-2 py-1.5 font-semibold text-green-400">{fmtMoney(r.netPayment)}</td>
                  <td className="px-2 py-1.5">
                    {canEditReport ? (
                      <select
                        value={r.paymentStatus}
                        onChange={(e) => patchPay(r.id, e.target.value)}
                        className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-1 py-0.5 text-[var(--text-main)]"
                      >
                        <option value="CLEAR">Clear</option>
                        <option value="UNDERWAY">Underway</option>
                        <option value="NOT_CLEAR">Not Clear</option>
                      </select>
                    ) : (
                      <span>
                        {({ CLEAR: 'Clear', UNDERWAY: 'Underway', NOT_CLEAR: 'Not Clear' } as any)[
                          r.paymentStatus
                        ] || r.paymentStatus}
                      </span>
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { dieselApi } from '../../api/diesel';
import { useUiStore } from '../../store/uiStore';

const fmt = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 3 });

export const PumpWisePanel: React.FC = () => {
  const addToast = useUiStore((s) => s.addToast);
  const [parties, setParties] = useState<any[]>([]);
  const [partyId, setPartyId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [slipFrom, setSlipFrom] = useState('');
  const [slipTo, setSlipTo] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadParties = useCallback(async () => {
    try {
      const res = await dieselApi.partyList();
      setParties(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to load parties', 'error');
    }
  }, [addToast]);

  useEffect(() => {
    loadParties();
  }, [loadParties]);

  const loadDetail = useCallback(async () => {
    if (!partyId) {
      setRows([]);
      setTotals(null);
      return;
    }
    setLoading(true);
    try {
      const res = await dieselApi.partyWise({
        partyId,
        from: from || undefined,
        to: to || undefined,
        slipFrom: slipFrom ? parseInt(slipFrom, 10) : undefined,
        slipTo: slipTo ? parseInt(slipTo, 10) : undefined,
      });
      setRows(res.data?.rows || []);
      setTotals(res.data?.totals || null);
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [partyId, from, to, slipFrom, slipTo, addToast]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const selected = parties.find((p) => p.partyId === partyId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">Pump wise details</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Parties / pumps used in diesel forms (unique). Tap one to see refill history and amount
          to pay.
        </p>
      </div>

      {!partyId ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                <th className="px-4 py-2">Party Name</th>
                <th className="px-4 py-2 text-right">Refills</th>
                <th className="px-4 py-2 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {parties.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-6 text-[var(--text-muted)]">
                    No pump parties yet — submit fuel entries first.
                  </td>
                </tr>
              ) : (
                parties.map((p) => (
                  <tr
                    key={p.partyId}
                    className="border-b border-[var(--border-subtle-alt)] text-[var(--text-main)] cursor-pointer hover:bg-amber-500/5"
                    onClick={() => setPartyId(p.partyId)}
                  >
                    <td className="px-4 py-2 font-medium text-amber-400 underline">
                      {p.partyName}
                    </td>
                    <td className="px-4 py-2 text-right">{p.refillCount}</td>
                    <td className="px-4 py-2 text-right">{fmt(p.totalAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={() => setPartyId('')}
              className="text-xs text-amber-400 underline"
            >
              ← All parties
            </button>
            <span className="text-sm font-semibold text-[var(--text-main)]">
              {selected?.partyName || 'Party'}
            </span>
            <label className="text-xs text-[var(--text-muted)]">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)]"
              />
            </label>
            <label className="text-xs text-[var(--text-muted)]">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)]"
              />
            </label>
            <label className="text-xs text-[var(--text-muted)]">
              Slip from
              <input
                type="number"
                value={slipFrom}
                onChange={(e) => setSlipFrom(e.target.value)}
                className="mt-1 block w-24 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)]"
              />
            </label>
            <label className="text-xs text-[var(--text-muted)]">
              Slip to
              <input
                type="number"
                value={slipTo}
                onChange={(e) => setSlipTo(e.target.value)}
                className="mt-1 block w-24 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)]"
              />
            </label>
          </div>

          {totals && (
            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-2">
                <p className="text-[var(--text-muted)]">Total to pay</p>
                <p className="text-lg font-bold text-amber-400">{fmt(totals.totalAmount)}</p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-2">
                <p className="text-[var(--text-muted)]">Kms / Hrs total</p>
                <p className="text-lg font-bold text-[var(--text-main)]">{fmt(totals.totalRun)}</p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-2">
                <p className="text-[var(--text-muted)]">Diesel total</p>
                <p className="text-lg font-bold text-[var(--text-main)]">
                  {fmt(totals.totalDiesel)}
                </p>
              </div>
            </div>
          )}

          {totals && (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden">
              <div className="px-3 py-2 border-b border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-main)]">
                Best / Declining Average
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                    <th className="px-3 py-2">Metric</th>
                    <th className="px-3 py-2 text-right">Average</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--border-subtle-alt)] text-[var(--text-main)]">
                    <td className="px-3 py-2">Best average</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-400">
                      {fmt(totals.bestAverage)}
                    </td>
                  </tr>
                  <tr className="text-[var(--text-main)]">
                    <td className="px-3 py-2">Declining average</td>
                    <td className="px-3 py-2 text-right font-semibold text-red-400">
                      {fmt(totals.decliningAverage)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden">
            {loading ? (
              <p className="p-6 text-sm text-[var(--text-muted)]">Loading…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1000px] w-full text-xs">
                  <thead>
                    <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Truck No</th>
                      <th className="px-2 py-2">Mill</th>
                      <th className="px-2 py-2">Slip</th>
                      <th className="px-2 py-2">Reading</th>
                      <th className="px-2 py-2">Avg</th>
                      <th className="px-2 py-2 text-right">Run</th>
                      <th className="px-2 py-2">Diesel</th>
                      <th className="px-2 py-2">Rate</th>
                      <th className="px-2 py-2">Amount</th>
                      <th className="px-2 py-2">Driver</th>
                      <th className="px-2 py-2">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-6 text-[var(--text-muted)]">
                          No refills for this pump in range.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-[var(--border-subtle-alt)] text-[var(--text-main)]"
                        >
                          <td className="px-2 py-1.5">
                            {r.date ? new Date(r.date).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-2 py-1.5 font-medium">{r.truckNo}</td>
                          <td className="px-2 py-1.5">{r.millName}</td>
                          <td className="px-2 py-1.5">{r.slipNo}</td>
                          <td className="px-2 py-1.5">{fmt(r.newReading)}</td>
                          <td className="px-2 py-1.5 text-amber-400">{fmt(r.average)}</td>
                          <td className="px-2 py-1.5 text-right">{fmt(r.totalRun)}</td>
                          <td className="px-2 py-1.5">{fmt(r.dieselQty)}</td>
                          <td className="px-2 py-1.5">{fmt(r.rate)}</td>
                          <td className="px-2 py-1.5">{fmt(r.amount)}</td>
                          <td className="px-2 py-1.5">{r.driverName}</td>
                          <td className="px-2 py-1.5">{r.by}</td>
                        </tr>
                      ))
                    )}
                    {rows.length > 0 && totals && (
                      <tr className="font-semibold bg-[var(--bg-base)]">
                        <td className="px-2 py-2" colSpan={5}>
                          Totals
                        </td>
                        <td className="px-2 py-2 text-amber-400">
                          {fmt(totals.totalAverage)}
                        </td>
                        <td className="px-2 py-2 text-right">{fmt(totals.totalRun)}</td>
                        <td className="px-2 py-2">{fmt(totals.totalDiesel)}</td>
                        <td className="px-2 py-2">—</td>
                        <td className="px-2 py-2 text-amber-400">
                          {fmt(totals.totalAmount)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

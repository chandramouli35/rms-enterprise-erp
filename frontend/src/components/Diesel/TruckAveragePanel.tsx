import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { dieselApi } from '../../api/diesel';
import { useUiStore } from '../../store/uiStore';

const fmt = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 3 });

type SortKey =
  | 'date'
  | 'truckNo'
  | 'millName'
  | 'slipNo'
  | 'newReading'
  | 'average'
  | 'dieselQty'
  | 'rate'
  | 'amount';

export const TruckAveragePanel: React.FC = () => {
  const addToast = useUiStore((s) => s.addToast);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [truckId, setTruckId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dieselApi
      .trucks()
      .then((res) => setTrucks(Array.isArray(res.data) ? res.data : []))
      .catch(() => setTrucks([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dieselApi.truckAverage({
        truckId: truckId || undefined,
        from: from || undefined,
        to: to || undefined,
        limit: truckId || from || to ? 200 : 10,
      });
      setRows(res.data?.rows || []);
      setTotals(res.data?.totals || null);
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [truckId, from, to, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortAsc ? av - bv : bv - av;
      }
      const as = String(av ?? '');
      const bs = String(bv ?? '');
      return sortAsc ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return copy;
  }, [rows, sortKey, sortAsc]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc((v) => !v);
    else {
      setSortKey(k);
      setSortAsc(true);
    }
  };

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      className="px-2 py-2 cursor-pointer hover:text-amber-400 whitespace-nowrap"
      onClick={() => toggleSort(k)}
    >
      {label}
      {sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : ''}
    </th>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">Truck Average</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Last 10 refills by default. Filter by truck / date. Vehicles can refill at any mill.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-[var(--text-muted)]">
          Truck No.
          <select
            value={truckId}
            onChange={(e) => setTruckId(e.target.value)}
            className="mt-1 block min-w-[180px] bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-2 text-sm text-[var(--text-main)]"
          >
            <option value="">All trucks</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.truckNumber}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--text-muted)]">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-2 text-sm text-[var(--text-main)]"
          />
        </label>
        <label className="text-xs text-[var(--text-muted)]">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-2 text-sm text-[var(--text-main)]"
          />
        </label>
      </div>

      {totals && (
        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-2">
            <p className="text-[var(--text-muted)]">Kms / Hrs total</p>
            <p className="text-lg font-bold text-[var(--text-main)]">{fmt(totals.totalRun)}</p>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-2">
            <p className="text-[var(--text-muted)]">Diesel total</p>
            <p className="text-lg font-bold text-[var(--text-main)]">{fmt(totals.totalDiesel)}</p>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-2">
            <p className="text-[var(--text-muted)]">Total Average</p>
            <p className="text-lg font-bold text-amber-400">{fmt(totals.totalAverage)}</p>
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
            <table className="min-w-[1100px] w-full text-xs">
              <thead>
                <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  <Th k="date" label="Date" />
                  <Th k="truckNo" label="Truck No" />
                  <Th k="millName" label="Mill" />
                  <Th k="slipNo" label="Slip No" />
                  <th className="px-2 py-2">Type</th>
                  <Th k="newReading" label="Reading" />
                  <Th k="average" label="Average" />
                  <th className="px-2 py-2 text-right">Run</th>
                  <Th k="dieselQty" label="Diesel" />
                  <Th k="rate" label="Rate" />
                  <Th k="amount" label="Amount" />
                  <th className="px-2 py-2">Driver</th>
                  <th className="px-2 py-2">Party</th>
                  <th className="px-2 py-2">By</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="p-6 text-[var(--text-muted)]">
                      No refill records.
                    </td>
                  </tr>
                ) : (
                  sorted.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-[var(--border-subtle-alt)] text-[var(--text-main)]"
                    >
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {r.date ? new Date(r.date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-2 py-1.5 font-medium">{r.truckNo}</td>
                      <td className="px-2 py-1.5">{r.millName}</td>
                      <td className="px-2 py-1.5">{r.slipNo}</td>
                      <td className="px-2 py-1.5">{r.truckType}</td>
                      <td className="px-2 py-1.5">
                        {fmt(r.newReading)} {r.readingUnit}
                      </td>
                      <td className="px-2 py-1.5 text-amber-400 font-semibold">
                        {fmt(r.average)}
                      </td>
                      <td className="px-2 py-1.5 text-right">{fmt(r.totalRun)}</td>
                      <td className="px-2 py-1.5">{fmt(r.dieselQty)}</td>
                      <td className="px-2 py-1.5">{fmt(r.rate)}</td>
                      <td className="px-2 py-1.5">{fmt(r.amount)}</td>
                      <td className="px-2 py-1.5">{r.driverName}</td>
                      <td className="px-2 py-1.5">{r.partyName}</td>
                      <td className="px-2 py-1.5">{r.by}</td>
                    </tr>
                  ))
                )}
                {sorted.length > 0 && totals && (
                  <tr className="font-semibold bg-[var(--bg-base)] text-[var(--text-main)]">
                    <td className="px-2 py-2" colSpan={6}>
                      Totals
                    </td>
                    <td className="px-2 py-2 text-amber-400">{fmt(totals.totalAverage)}</td>
                    <td className="px-2 py-2 text-right">{fmt(totals.totalRun)}</td>
                    <td className="px-2 py-2">{fmt(totals.totalDiesel)}</td>
                    <td className="px-2 py-2">—</td>
                    <td className="px-2 py-2">{fmt(totals.totalAmount)}</td>
                    <td colSpan={3} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

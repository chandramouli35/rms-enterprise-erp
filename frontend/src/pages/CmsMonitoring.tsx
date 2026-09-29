import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { cmsApi } from '../api/cms';
import { usePlantStore } from '../store/plantStore';
import {
  CMS_TAB_SUBMODULE,
  CMS_TABS,
  hasCmsPermission,
} from '../utils/cmsPermissions';
import {
  AuditLogsPanel,
  CorrectionAuditPanel,
  ManualCorrectionsPanel,
  OverpricePanel,
  PaddyCostPanel,
  PlantComparePanel,
  ReceivablesPanel,
  SeverityPanel,
  StockDispatchPanel,
  TraceabilityPanel,
  WeighmentPatternsPanel,
} from '../components/Cms/CmsFinalPanels';

const POLL_MS = 5000;

function fmt(n: any, d = 1) {
  if (n == null || n === '') return '—';
  const x = Number(n);
  if (Number.isNaN(x)) return String(n);
  return x.toLocaleString(undefined, { maximumFractionDigits: d });
}

function fmtTime(v: any) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function LiveBadge({ at }: { at?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      Real-time · {at ? fmtTime(at) : '…'}
    </div>
  );
}

function MillFilterHint({ plantName }: { plantName?: string | null }) {
  return (
    <p className="text-xs text-[var(--text-muted)] mb-3">
      {plantName
        ? `Mill-wise · ${plantName}`
        : 'Mill-wise · all mills (Global Overview)'}
    </p>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="py-10 text-center text-sm text-[var(--text-muted)]">{msg}</div>
  );
}

function NotificationsStrip({
  items,
}: {
  items?: { id: string; title: string; message: string; createdAt: string }[];
}) {
  if (!items?.length) return null;
  return (
    <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="text-[11px] uppercase tracking-wide text-amber-700 mb-2 font-semibold">
        Notified
      </div>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {items.slice(0, 12).map((n) => (
          <div key={n.id} className="text-xs text-[var(--text-main)]">
            <span className="font-medium">{n.title}</span>
            <span className="text-[var(--text-muted)]"> — {n.message}</span>
            <span className="ml-2 text-[10px] text-[var(--text-muted)]">
              {fmtTime(n.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function useCmsPoll<T>(
  loader: () => Promise<T>,
  enabled: boolean,
): { data: T | null; error: string | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await loader();
      setData(res);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const run = async () => {
      if (document.visibilityState === 'hidden') return;
      if (cancelled) return;
      await refresh();
    };
    run();
    const id = setInterval(run, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, refresh]);

  return { data, error, loading };
}

function BasisTrackingPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.overview();
    if (plantId && plantId !== 'global') {
      return {
        ...data,
        mills: (data.mills || []).filter((m: any) => m.plantId === plantId),
      };
    }
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader, true);
  const plantName = data?.mills?.[0]?.plantName;

  if (loading && !data) return <Empty msg="Loading real-time basis tracking…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;

  const t = data.totals || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MillFilterHint plantName={plantId ? plantName : null} />
        <LiveBadge at={data.generatedAt} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          ['Mills', t.mills],
          ['Paddy Inward today', t.inwardToday],
          ['Pending Bolis', t.pendingBolis],
          ['Active GPs', t.activeGps],
          ['Paddy stock (MT)', fmt(t.paddyStockMt)],
          ['Production batches', t.productionBatches],
        ].map(([label, val]) => (
          <div
            key={String(label)}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-3"
          >
            <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              {label}
            </div>
            <div className="mt-1 text-xl font-semibold text-[var(--text-main)]">
              {val ?? '—'}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-base)] text-[11px] uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Mill</th>
              <th className="px-3 py-2 text-right">Paddy Inward</th>
              <th className="px-3 py-2 text-right">Pending Boli</th>
              <th className="px-3 py-2 text-right">Active GP</th>
              <th className="px-3 py-2 text-right">Paddy Stock</th>
              <th className="px-3 py-2 text-right">Production</th>
              <th className="px-3 py-2 text-right">Ledger today</th>
              <th className="px-3 py-2 text-right">Yield 7d</th>
            </tr>
          </thead>
          <tbody>
            {(data.mills || []).map((m: any) => (
              <tr
                key={m.plantId}
                className="border-t border-[var(--border-subtle)]"
              >
                <td className="px-3 py-2 font-medium text-[var(--text-main)]">
                  {m.plantName}
                  <span className="ml-1 text-xs text-[var(--text-muted)]">
                    {m.plantCode}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  {m.paddyInward.count}
                  <span className="text-[var(--text-muted)] text-xs ml-1">
                    ({fmt(m.paddyInward.bags, 0)} bags)
                  </span>
                </td>
                <td className="px-3 py-2 text-right">{m.boli.pending}</td>
                <td className="px-3 py-2 text-right">{m.gatePass.active}</td>
                <td className="px-3 py-2 text-right">{fmt(m.paddyStockMt)} MT</td>
                <td className="px-3 py-2 text-right">
                  {m.production.batches}
                  {m.production.inProgress > 0 && (
                    <span className="ml-1 text-amber-600 text-xs">
                      ({m.production.inProgress} live)
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {m.stockLedgerToday.entries}
                </td>
                <td className="px-3 py-2 text-right">
                  {m.yieldAvg7d != null ? `${m.yieldAvg7d}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data.mills || []).length === 0 && <Empty msg="No mills found" />}
      </div>

      {(data.notifications || []).length > 0 && (
        <NotificationsStrip items={data.notifications} />
      )}
    </div>
  );
}

function InwardPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.paddyInward(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader, true);

  if (loading && !data) return <Empty msg="Loading real-time paddy inward…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;

  return (
    <div>
      <div className="flex justify-between mb-3">
        <MillFilterHint plantName={null} />
        <LiveBadge at={data.generatedAt} />
      </div>
      <NotificationsStrip items={data.notifications} />
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-base)] text-[11px] uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Mill</th>
              <th className="px-3 py-2 text-left">Truck</th>
              <th className="px-3 py-2 text-left">GP</th>
              <th className="px-3 py-2 text-left">Mandi / Artia</th>
              <th className="px-3 py-2 text-right">Bags</th>
              <th className="px-3 py-2 text-right">Net Wt</th>
            </tr>
          </thead>
          <tbody>
            {(data.rows || []).map((r: any) => (
              <tr key={r.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2 whitespace-nowrap">{fmtTime(r.time)}</td>
                <td className="px-3 py-2">{r.plantName}</td>
                <td className="px-3 py-2">{r.truckNo || '—'}</td>
                <td className="px-3 py-2">{r.gpNo || '—'}</td>
                <td className="px-3 py-2">
                  {r.mandi || '—'}
                  <div className="text-xs text-[var(--text-muted)]">{r.artia}</div>
                </td>
                <td className="px-3 py-2 text-right">{fmt(r.bags, 0)}</td>
                <td className="px-3 py-2 text-right">{fmt(r.netWt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data.rows || []).length === 0 && (
          <Empty msg="No paddy inward today" />
        )}
      </div>
    </div>
  );
}

function BoliPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.boliRecords(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader, true);
  const [showAll, setShowAll] = useState(false);

  if (loading && !data) return <Empty msg="Loading boli records…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;

  const rows = showAll ? data.all || [] : data.pending || [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className={`text-xs px-3 py-1 rounded border ${!showAll ? 'border-blue-500 text-blue-600' : 'border-[var(--border-subtle)] text-[var(--text-muted)]'}`}
          >
            Pending Boli Also ({(data.pending || []).length})
          </button>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={`text-xs px-3 py-1 rounded border ${showAll ? 'border-blue-500 text-blue-600' : 'border-[var(--border-subtle)] text-[var(--text-muted)]'}`}
          >
            All Boli Record ({(data.all || []).length})
          </button>
        </div>
        <LiveBadge at={data.generatedAt} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-base)] text-[11px] uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Mill</th>
              <th className="px-3 py-2 text-left">Boli No</th>
              <th className="px-3 py-2 text-left">Artia / Mandi</th>
              <th className="px-3 py-2 text-right">Bags</th>
              <th className="px-3 py-2 text-right">Received</th>
              <th className="px-3 py-2 text-right">Pending</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2">{r.plantName}</td>
                <td className="px-3 py-2 font-medium">{r.boliNo || '—'}</td>
                <td className="px-3 py-2">
                  {r.artia}
                  <div className="text-xs text-[var(--text-muted)]">{r.mandi}</div>
                </td>
                <td className="px-3 py-2 text-right">{fmt(r.bags, 0)}</td>
                <td className="px-3 py-2 text-right">{fmt(r.bagsReceived, 0)}</td>
                <td className="px-3 py-2 text-right">{fmt(r.pendingBags, 0)}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      r.isPending
                        ? 'text-amber-600'
                        : r.isCompleted
                          ? 'text-emerald-600'
                          : ''
                    }
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty msg="No boli records" />}
      </div>
    </div>
  );
}

function GpPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.gatePass(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader, true);

  if (loading && !data) return <Empty msg="Loading GP entry tracking…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;

  return (
    <div>
      <div className="flex justify-between mb-3">
        <MillFilterHint plantName={null} />
        <LiveBadge at={data.generatedAt} />
      </div>
      <NotificationsStrip items={data.notifications} />
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-base)] text-[11px] uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Mill</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Vehicle</th>
              <th className="px-3 py-2 text-left">Party</th>
              <th className="px-3 py-2 text-right">Bags</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data.rows || []).map((r: any) => (
              <tr key={r.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2 whitespace-nowrap">
                  {fmtTime(r.createdAt)}
                </td>
                <td className="px-3 py-2">{r.plantName}</td>
                <td className="px-3 py-2">{r.passType}</td>
                <td className="px-3 py-2">{r.vehicleNo}</td>
                <td className="px-3 py-2">{r.partyName || '—'}</td>
                <td className="px-3 py-2 text-right">{fmt(r.noOfBags, 0)}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      r.status === 'ACTIVE' ? 'text-amber-600 font-medium' : ''
                    }
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data.rows || []).length === 0 && <Empty msg="No gate pass activity" />}
      </div>
    </div>
  );
}

function PaddyStockPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.paddyStock(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader, true);

  if (loading && !data) return <Empty msg="Loading paddy stock…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <MillFilterHint plantName={null} />
        <LiveBadge at={data.generatedAt} />
      </div>
      {(data.mills || []).map((m: any) => (
        <div
          key={m.plantId}
          className="rounded-lg border border-[var(--border-subtle)] overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-base)]">
            <span className="font-medium text-[var(--text-main)]">
              {m.plantName}{' '}
              <span className="text-xs text-[var(--text-muted)]">
                {m.plantCode}
              </span>
            </span>
            <span className="text-sm font-semibold">{fmt(m.totalMt)} MT</span>
          </div>
          <table className="min-w-full text-sm">
            <thead className="text-[11px] uppercase text-[var(--text-muted)]">
              <tr>
                <th className="px-3 py-2 text-left">Variety</th>
                <th className="px-3 py-2 text-left">Godown</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Usable</th>
                <th className="px-3 py-2 text-right">Reserved</th>
              </tr>
            </thead>
            <tbody>
              {(m.lines || []).map((l: any, i: number) => (
                <tr key={i} className="border-t border-[var(--border-subtle)]">
                  <td className="px-3 py-2">{l.variety || '—'}</td>
                  <td className="px-3 py-2">{l.godown || '—'}</td>
                  <td className="px-3 py-2 text-right">{fmt(l.quantity)}</td>
                  <td className="px-3 py-2 text-right">{fmt(l.usable)}</td>
                  <td className="px-3 py-2 text-right">{fmt(l.reserved)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {(data.mills || []).length === 0 && <Empty msg="No paddy stock" />}
    </div>
  );
}

function ProductionPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.production(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader, true);

  if (loading && !data) return <Empty msg="Loading production tracking…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;

  return (
    <div>
      <div className="flex justify-between mb-3">
        <MillFilterHint plantName={null} />
        <LiveBadge at={data.generatedAt} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-base)] text-[11px] uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Mill</th>
              <th className="px-3 py-2 text-left">Batch</th>
              <th className="px-3 py-2 text-left">Shift</th>
              <th className="px-3 py-2 text-right">Paddy</th>
              <th className="px-3 py-2 text-right">Rice</th>
              <th className="px-3 py-2 text-right">Yield</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data.rows || []).map((r: any) => (
              <tr key={r.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2">{r.plantName}</td>
                <td className="px-3 py-2 font-medium">{r.batchNo}</td>
                <td className="px-3 py-2">{r.shift}</td>
                <td className="px-3 py-2 text-right">{fmt(r.paddyUsedQty)}</td>
                <td className="px-3 py-2 text-right">{fmt(r.riceProducedQty)}</td>
                <td className="px-3 py-2 text-right">
                  {r.yieldPct != null ? `${fmt(r.yieldPct)}%` : '—'}
                </td>
                <td className="px-3 py-2">
                  {r.status}
                  {r.status === 'In Progress' && (
                    <span className="ml-1 text-xs text-amber-600">
                      {r.progress}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data.rows || []).length === 0 && (
          <Empty msg="No production batches today" />
        )}
      </div>
    </div>
  );
}

function LedgerPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.stockLedger(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader, true);

  if (loading && !data) return <Empty msg="Loading live stock ledger…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;

  return (
    <div>
      <div className="flex justify-between mb-3">
        <MillFilterHint plantName={null} />
        <LiveBadge at={data.generatedAt} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-base)] text-[11px] uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Mill</th>
              <th className="px-3 py-2 text-left">Txn</th>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-right">Qty (MT)</th>
              <th className="px-3 py-2 text-left">Ref</th>
            </tr>
          </thead>
          <tbody>
            {(data.rows || []).map((r: any) => (
              <tr key={r.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2 whitespace-nowrap">
                  {fmtTime(r.createdAt)}
                </td>
                <td className="px-3 py-2">{r.plantName}</td>
                <td className="px-3 py-2">{r.transaction}</td>
                <td className="px-3 py-2">{r.itemType}</td>
                <td className="px-3 py-2 text-right">{fmt(r.quantity)}</td>
                <td className="px-3 py-2 text-xs text-[var(--text-muted)]">
                  {r.reference || r.remarks || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data.rows || []).length === 0 && <Empty msg="No ledger entries" />}
      </div>
    </div>
  );
}

function YieldPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.yield(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader, true);

  if (loading && !data) return <Empty msg="Loading yield analysis…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <MillFilterHint plantName={null} />
        <LiveBadge at={data.generatedAt} />
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {(data.mills || []).map((m: any) => (
          <div
            key={m.plantId}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
          >
            <div className="font-medium text-[var(--text-main)]">
              {m.plantName}
            </div>
            <div className="mt-2 text-3xl font-semibold">
              {m.avgYield != null ? `${m.avgYield}%` : '—'}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              14-day avg · {m.sampleCount} batches · min{' '}
              {m.minYield != null ? `${m.minYield}%` : '—'} · max{' '}
              {m.maxYield != null ? `${m.maxYield}%` : '—'}
            </div>
          </div>
        ))}
      </div>
      {(data.mills || []).length === 0 && <Empty msg="No yield data" />}
    </div>
  );
}

function AlertsPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.alerts(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader, true);

  if (loading && !data) return <Empty msg="Loading alerts…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;

  const color = (s: string) =>
    s === 'critical'
      ? 'border-red-400/50 text-red-600'
      : s === 'warning'
        ? 'border-amber-400/50 text-amber-700'
        : 'border-[var(--border-subtle)] text-[var(--text-main)]';

  return (
    <div>
      <div className="flex justify-between mb-3">
        <MillFilterHint plantName={null} />
        <LiveBadge at={data.generatedAt} />
      </div>
      <div className="space-y-2">
        {(data.alerts || []).map((a: any, i: number) => (
          <div
            key={i}
            className={`rounded-lg border px-3 py-2 ${color(a.severity)}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-sm">
                {a.title}
                {a.plantName && a.plantName !== '—' && (
                  <span className="ml-2 text-xs opacity-70">{a.plantName}</span>
                )}
              </span>
              <span className="text-[11px] opacity-60">{fmtTime(a.at)}</span>
            </div>
            <div className="text-xs mt-0.5 opacity-80">{a.details}</div>
          </div>
        ))}
        {(data.alerts || []).length === 0 && (
          <Empty msg="No abnormal transaction alerts right now" />
        )}
      </div>
    </div>
  );
}

/** CMS User Permission Controls — On/Off for all rights per normal-user role */
function UserRightsPanel() {
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const rolesRes = await api.get('/cms/user-rights/roles');
        const list = rolesRes.data || [];
        setRoles(list);
        if (list.length) setSelectedRoleId(list[0].id);
      } catch (e: any) {
        setMsg(e?.response?.data?.message || 'Failed to load roles');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedRoleId) return;
    (async () => {
      try {
        const res = await api.get(
          `/cms/user-rights/roles/${selectedRoleId}/permissions`,
        );
        setPermissions(res.data || []);
        setMsg('');
      } catch (e: any) {
        setMsg(e?.response?.data?.message || 'Failed to load permissions');
      }
    })();
  }, [selectedRoleId]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const usersOnRole = selectedRole?.users || [];

  const toggleModule = (moduleIndex: number, on: boolean) => {
    setPermissions((prev) => {
      const next = structuredClone(prev);
      const mod = next[moduleIndex];
      if (!mod) return prev;
      mod.permissions = {
        view: on,
        add: on,
        edit: on,
        delete: on,
        approve: !!mod.permissions?.approve && on,
      };
      if (Array.isArray(mod.subModules)) {
        mod.subModules = mod.subModules.map((sub: any) => ({
          ...sub,
          permissions: {
            view: on,
            add: on,
            edit: on,
            delete: on,
            approve: !!sub.permissions?.approve && on,
          },
        }));
      }
      return next;
    });
  };

  const toggleSub = (moduleIndex: number, subIndex: number, on: boolean) => {
    setPermissions((prev) => {
      const next = structuredClone(prev);
      const mod = next[moduleIndex];
      if (!mod?.subModules?.[subIndex]) return prev;
      mod.subModules[subIndex].permissions = {
        view: on,
        add: on,
        edit: on,
        delete: on,
        approve: !!mod.subModules[subIndex].permissions?.approve && on,
      };
      const anyOn = mod.subModules.some((s: any) => s.permissions?.view);
      mod.permissions = {
        ...mod.permissions,
        view: anyOn,
        add: anyOn ? mod.permissions?.add : false,
        edit: anyOn ? mod.permissions?.edit : false,
        delete: anyOn ? mod.permissions?.delete : false,
      };
      return next;
    });
  };

  const save = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    setMsg('');
    try {
      await api.post(
        `/cms/user-rights/roles/${selectedRoleId}/permissions`,
        { permissions },
      );
      setMsg('Saved — On/Off rights applied for normal users on this role.');
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Empty msg="Loading CMS User Permission Controls…" />;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          <span className="block text-xs text-[var(--text-muted)] mb-1">
            Normal user role
          </span>
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-sm min-w-[200px]"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.userCount || 0} users)
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={save}
          disabled={saving || !selectedRoleId}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save rights'}
        </button>
      </div>

      {usersOnRole.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          Applies to {usersOnRole.length} normal user
          {usersOnRole.length === 1 ? '' : 's'}:{' '}
          {usersOnRole
            .slice(0, 8)
            .map((u: any) => u.username)
            .join(', ')}
          {usersOnRole.length > 8 ? '…' : ''}
        </p>
      )}

      {msg && (
        <p className="text-xs text-[var(--text-muted)] border border-[var(--border-subtle)] rounded px-3 py-2">
          {msg}
        </p>
      )}

      <div className="rounded-lg border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
        {permissions.map((mod, idx) => {
          const on = !!mod.permissions?.view;
          return (
            <div key={mod.name} className="px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[var(--text-main)]">
                  {mod.name}
                </span>
                <button
                  type="button"
                  onClick={() => toggleModule(idx, !on)}
                  className={`text-xs px-3 py-1 rounded border ${
                    on
                      ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                      : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
                  }`}
                >
                  {on ? 'On' : 'Off'}
                </button>
              </div>
              {Array.isArray(mod.subModules) && mod.subModules.length > 0 && (
                <div className="mt-2 ml-3 grid sm:grid-cols-2 gap-1.5">
                  {mod.subModules.map((sub: any, subIdx: number) => {
                    const subOn = !!sub.permissions?.view;
                    return (
                      <div
                        key={sub.name}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-[var(--text-muted)] truncate">
                          {sub.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleSub(idx, subIdx, !subOn)}
                          className={`px-2 py-0.5 rounded border shrink-0 ${
                            subOn
                              ? 'border-emerald-500/60 text-emerald-600'
                              : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
                          }`}
                        >
                          {subOn ? 'On' : 'Off'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const CmsMonitoring: React.FC = () => {
  const [params, setParams] = useSearchParams();
  let tab = params.get('tab') || 'paddy_inward';
  // legacy tab id
  if (tab === 'overview') tab = 'basis_tracking';
  const activePlant = usePlantStore((s) => s.activePlant);
  const plantId = activePlant?.id;

  useEffect(() => {
    const raw = params.get('tab');
    if (!raw) {
      setParams({ tab: 'paddy_inward' }, { replace: true });
    } else if (raw === 'overview') {
      setParams({ tab: 'basis_tracking' }, { replace: true });
    }
  }, []);

  if (!hasCmsPermission(CMS_TAB_SUBMODULE[tab] || '', 'canView')) {
    const first = CMS_TABS.find((t) =>
      hasCmsPermission(CMS_TAB_SUBMODULE[t.id] || '', 'canView'),
    );
    if (first && first.id !== tab) {
      return <Navigate to={`/cms?tab=${first.id}`} replace />;
    }
    return (
      <div className="p-8 text-center text-sm text-[var(--text-muted)]">
        You do not have permission to view CMS.
      </div>
    );
  }

  return (
    <div className="p-2 md:p-4 space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-[var(--text-main)]">
          {CMS_TAB_SUBMODULE[tab] || 'Central Monitoring System'}
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          {tab === 'user_rights'
            ? 'Rest all rights toggleable (On / Off) per normal user. Select the role used by normal users, then turn each module On or Off.'
            : tab === 'severity'
              ? 'Show transactions in three categories: Critical · Warning · Normal.'
              : tab === 'correction_audit'
                ? 'Any correction must include reason, approval, date, and time.'
                : tab === 'audit_logs'
                  ? 'Maintain logs for Created · Edited · Deleted · Approved.'
                  : `Mill-wise real-time monitoring · refreshes every ${POLL_MS / 1000}s`}
        </p>
      </div>

      {tab === 'paddy_inward' && <InwardPanel plantId={plantId} />}
      {tab === 'boli_record' && <BoliPanel plantId={plantId} />}
      {tab === 'gp_tracking' && <GpPanel plantId={plantId} />}
      {tab === 'paddy_stock' && <PaddyStockPanel plantId={plantId} />}
      {tab === 'production' && <ProductionPanel plantId={plantId} />}
      {tab === 'stock_ledger' && <LedgerPanel plantId={plantId} />}
      {tab === 'yield' && <YieldPanel plantId={plantId} />}
      {tab === 'alerts' && <AlertsPanel plantId={plantId} />}
      {tab === 'basis_tracking' && <BasisTrackingPanel plantId={plantId} />}
      {tab === 'user_rights' && <UserRightsPanel />}
      {tab === 'traceability' && <TraceabilityPanel plantId={plantId} />}
      {tab === 'plant_compare' && <PlantComparePanel />}
      {tab === 'manual_corrections' && (
        <ManualCorrectionsPanel plantId={plantId} />
      )}
      {tab === 'overprice' && <OverpricePanel plantId={plantId} />}
      {tab === 'weighment_patterns' && (
        <WeighmentPatternsPanel plantId={plantId} />
      )}
      {tab === 'correction_audit' && (
        <CorrectionAuditPanel plantId={plantId} />
      )}
      {tab === 'audit_logs' && <AuditLogsPanel plantId={plantId} />}
      {tab === 'severity' && <SeverityPanel plantId={plantId} />}
      {tab === 'stock_dispatch' && <StockDispatchPanel plantId={plantId} />}
      {tab === 'receivables' && <ReceivablesPanel />}
      {tab === 'paddy_cost' && <PaddyCostPanel plantId={plantId} />}
    </div>
  );
};

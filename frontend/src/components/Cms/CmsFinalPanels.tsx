import React, { useCallback, useState } from 'react';
import { cmsApi } from '../../api/cms';

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

function Empty({ msg }: { msg: string }) {
  return (
    <div className="py-10 text-center text-sm text-[var(--text-muted)]">{msg}</div>
  );
}

function useCmsPoll<T>(loader: () => Promise<T>, enabled = true) {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = useCallback(async () => {
    try {
      setData(await loader());
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [loader]);

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const run = async () => {
      if (document.visibilityState === 'hidden' || cancelled) return;
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

function SeverityDot({ s }: { s: string }) {
  const c =
    s === 'critical'
      ? 'bg-red-500'
      : s === 'warning'
        ? 'bg-amber-500'
        : 'bg-emerald-500';
  return <span className={`inline-block h-2 w-2 rounded-full ${c}`} />;
}

export function TraceabilityPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.traceability(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader);
  if (loading && !data) return <Empty msg="Loading full traceability…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;
  return (
    <div>
      <div className="flex justify-end mb-3">
        <LiveBadge at={data.generatedAt} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-base)] text-[11px] uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Mill</th>
              <th className="px-3 py-2 text-left">Truck / GP</th>
              <th className="px-3 py-2 text-left">Artia</th>
              <th className="px-3 py-2 text-left">Chain</th>
              <th className="px-3 py-2 text-right">Net Wt</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data.rows || []).map((r: any) => (
              <tr key={r.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2 whitespace-nowrap">{fmtTime(r.time)}</td>
                <td className="px-3 py-2">{r.plantName}</td>
                <td className="px-3 py-2">
                  {r.truckNo || '—'}
                  <div className="text-xs text-[var(--text-muted)]">{r.gpNo}</div>
                </td>
                <td className="px-3 py-2">{r.artia || '—'}</td>
                <td className="px-3 py-2 text-xs">
                  {(r.chain || []).join(' → ') || '—'}
                  {!r.chainComplete && (
                    <span className="ml-1 text-amber-600">incomplete</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">{fmt(r.netWt)}</td>
                <td className="px-3 py-2">
                  {r.status}
                  {r.isBackdated && (
                    <span className="ml-1 text-xs text-amber-600">backdated</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data.rows || []).length === 0 && <Empty msg="No traced transactions" />}
      </div>
    </div>
  );
}

export function PlantComparePanel() {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.plantComparison();
    return data;
  }, []);
  const { data, error, loading } = useCmsPoll(loader);
  if (loading && !data) return <Empty msg="Loading plant-wise comparison…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;
  return (
    <div>
      <div className="flex justify-between mb-3 text-xs text-[var(--text-muted)]">
        <span>
          Benchmark yield 7d:{' '}
          {data.benchmarkYieldAvg != null ? `${data.benchmarkYieldAvg}%` : '—'}
        </span>
        <LiveBadge at={data.generatedAt} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-base)] text-[11px] uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Mill</th>
              <th className="px-3 py-2 text-right">Inward</th>
              <th className="px-3 py-2 text-right">Pending Boli</th>
              <th className="px-3 py-2 text-right">Active GP</th>
              <th className="px-3 py-2 text-right">Paddy MT</th>
              <th className="px-3 py-2 text-right">Yield 7d</th>
              <th className="px-3 py-2 text-right">Shortage</th>
              <th className="px-3 py-2 text-left">Flag</th>
            </tr>
          </thead>
          <tbody>
            {(data.mills || []).map((m: any) => (
              <tr key={m.plantId} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2 font-medium">{m.plantName}</td>
                <td className="px-3 py-2 text-right">{m.inwardToday}</td>
                <td className="px-3 py-2 text-right">{m.pendingBolis}</td>
                <td className="px-3 py-2 text-right">{m.activeGps}</td>
                <td className="px-3 py-2 text-right">{fmt(m.paddyStockMt)}</td>
                <td className="px-3 py-2 text-right">
                  {m.yieldAvg7d != null ? `${m.yieldAvg7d}%` : '—'}
                </td>
                <td className="px-3 py-2 text-right">{fmt(m.shortageQtlToday)}</td>
                <td className="px-3 py-2">
                  {m.unusual ? (
                    <span className="text-amber-600 text-xs">Unusual</span>
                  ) : (
                    <span className="text-emerald-600 text-xs">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ManualCorrectionsPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.manualCorrections(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader);
  if (loading && !data) return <Empty msg="Loading manual correction alerts…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;
  return (
    <div>
      <div className="flex justify-end mb-3">
        <LiveBadge at={data.generatedAt} />
      </div>
      <div className="space-y-2">
        {(data.alerts || []).map((a: any, i: number) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--border-subtle)] px-3 py-2 flex gap-2 items-start"
          >
            <SeverityDot s={a.severity} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">
                {a.title}{' '}
                <span className="text-xs text-[var(--text-muted)]">
                  {a.plantName}
                </span>
              </div>
              <div className="text-xs text-[var(--text-muted)]">{a.details}</div>
            </div>
            <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
              {fmtTime(a.at)}
            </span>
          </div>
        ))}
        {(data.alerts || []).length === 0 && (
          <Empty msg="No manual corrections flagged" />
        )}
      </div>
    </div>
  );
}

export function OverpricePanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.overprice(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader);
  if (loading && !data) return <Empty msg="Loading overprice detection…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <LiveBadge at={data.generatedAt} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-base)] text-[11px] uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Mill</th>
              <th className="px-3 py-2 text-left">Artia</th>
              <th className="px-3 py-2 text-right">Overprice count</th>
              <th className="px-3 py-2 text-right">Delta sum</th>
              <th className="px-3 py-2 text-right">Max delta</th>
            </tr>
          </thead>
          <tbody>
            {(data.byArtia || []).map((a: any, i: number) => (
              <tr key={i} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2">{a.plantName}</td>
                <td className="px-3 py-2">
                  {a.artia}
                  <div className="text-xs text-[var(--text-muted)]">{a.mandi}</div>
                </td>
                <td className="px-3 py-2 text-right text-amber-600 font-medium">
                  {a.count}
                </td>
                <td className="px-3 py-2 text-right">{fmt(a.deltaSum, 0)}</td>
                <td className="px-3 py-2 text-right">{fmt(a.maxDelta, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data.byArtia || []).length === 0 && (
          <Empty msg="No overprice purchases detected" />
        )}
      </div>
    </div>
  );
}

export function WeighmentPatternsPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.weighmentPatterns(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader);
  if (loading && !data) return <Empty msg="Loading weighment patterns…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;
  return (
    <div>
      <div className="flex justify-between mb-3 text-xs text-[var(--text-muted)]">
        <span>Unusual patterns: {data.unusualCount || 0}</span>
        <LiveBadge at={data.generatedAt} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-base)] text-[11px] uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Mill</th>
              <th className="px-3 py-2 text-left">Truck</th>
              <th className="px-3 py-2 text-right">Trips (7d)</th>
              <th className="px-3 py-2 text-left">Same net?</th>
              <th className="px-3 py-2 text-left">Severity</th>
            </tr>
          </thead>
          <tbody>
            {(data.patterns || []).map((p: any, i: number) => (
              <tr key={i} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2">{p.plantName}</td>
                <td className="px-3 py-2 font-medium">{p.vehicleNo}</td>
                <td className="px-3 py-2 text-right">{p.count}</td>
                <td className="px-3 py-2">
                  {p.sameNetRepeated ? 'Yes' : 'No'}
                </td>
                <td className="px-3 py-2 capitalize flex items-center gap-1.5">
                  <SeverityDot s={p.severity} /> {p.severity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data.patterns || []).length === 0 && (
          <Empty msg="No repeated weighment patterns" />
        )}
      </div>
    </div>
  );
}

export function CorrectionAuditPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.correctionAudit(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader);
  if (loading && !data) return <Empty msg="Loading correction audit control…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;
  return (
    <div>
      <div className="flex justify-between mb-3 text-xs text-[var(--text-muted)]">
        <span>
          Incomplete (missing reason / approval): {data.incomplete || 0}
        </span>
        <LiveBadge at={data.generatedAt} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-base)] text-[11px] uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Mill</th>
              <th className="px-3 py-2 text-left">Entity</th>
              <th className="px-3 py-2 text-left">Reason</th>
              <th className="px-3 py-2 text-left">Approval</th>
              <th className="px-3 py-2 text-left">Date / Time</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data.rows || []).map((r: any, i: number) => (
              <tr key={i} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2">{r.type}</td>
                <td className="px-3 py-2">{r.plantName}</td>
                <td className="px-3 py-2">{r.entity}</td>
                <td className="px-3 py-2 text-xs">{r.reason || '—'}</td>
                <td className="px-3 py-2 text-xs">{r.approval || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {fmtTime(r.dateTime)}
                </td>
                <td className="px-3 py-2">
                  {r.complete ? (
                    <span className="text-emerald-600 text-xs">Complete</span>
                  ) : (
                    <span className="text-amber-600 text-xs">
                      Missing {(r.missing || []).join(', ')}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data.rows || []).length === 0 && <Empty msg="No corrections found" />}
      </div>
    </div>
  );
}

export function AuditLogsPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.auditLogs(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader);
  const [cat, setCat] = useState<'all' | 'Created' | 'Edited' | 'Deleted' | 'Approved'>('all');
  if (loading && !data) return <Empty msg="Loading audit logs…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;
  const rows =
    cat === 'all' ? data.all || [] : data[cat] || [];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1">
          {(['all', 'Created', 'Edited', 'Deleted', 'Approved'] as const).map(
            (c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`text-xs px-2.5 py-1 rounded border ${
                  cat === c
                    ? 'border-blue-500 text-blue-600'
                    : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
                }`}
              >
                {c === 'all'
                  ? 'All'
                  : `${c} (${data.counts?.[c] ?? 0})`}
              </button>
            ),
          )}
        </div>
        <LiveBadge at={data.generatedAt} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-base)] text-[11px] uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Action</th>
              <th className="px-3 py-2 text-left">Module</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2 whitespace-nowrap">{fmtTime(r.at)}</td>
                <td className="px-3 py-2">{r.category}</td>
                <td className="px-3 py-2">{r.action}</td>
                <td className="px-3 py-2">{r.module}</td>
                <td className="px-3 py-2">{r.user || '—'}</td>
                <td className="px-3 py-2 text-xs text-[var(--text-muted)] max-w-xs truncate">
                  {r.details || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty msg="No audit logs in this category" />}
      </div>
    </div>
  );
}

export function SeverityPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.severity(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader);
  if (loading && !data) return <Empty msg="Loading transaction severity…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;

  const Section = ({
    title,
    color,
    items,
    hint,
  }: {
    title: string;
    color: string;
    items: any[];
    hint: string;
  }) => (
    <div className={`rounded-lg border ${color} p-3`}>
      <div className="font-semibold text-sm mb-1">{title}</div>
      <div className="text-[11px] text-[var(--text-muted)] mb-2">{hint}</div>
      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {items.map((a, i) => (
          <div key={i} className="text-xs border-t border-[var(--border-subtle)] pt-1.5">
            <div className="font-medium">
              {a.title}{' '}
              <span className="text-[var(--text-muted)]">{a.plantName}</span>
            </div>
            <div className="text-[var(--text-muted)]">{a.details}</div>
            <div className="text-[10px] opacity-60">{fmtTime(a.at)}</div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-xs text-[var(--text-muted)] py-2">None</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-[var(--text-muted)]">
        <span>
          🔴 {data.counts?.critical || 0} · 🟠 {data.counts?.warning || 0} · 🟢{' '}
          {data.counts?.normal || 0}
        </span>
        <LiveBadge at={data.generatedAt} />
      </div>
      <div className="grid lg:grid-cols-3 gap-3">
        <Section
          title="🔴 Critical"
          color="border-red-500/40"
          hint="Requires immediate attention."
          items={data.critical || []}
        />
        <Section
          title="🟠 Warning"
          color="border-amber-500/40"
          hint="Needs investigation."
          items={data.warning || []}
        />
        <Section
          title="🟢 Normal"
          color="border-emerald-500/40"
          hint="No action required."
          items={data.normal || []}
        />
      </div>
    </div>
  );
}

export function StockDispatchPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.stockDispatch(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader);
  if (loading && !data) return <Empty msg="Loading stock for dispatch…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <span className="text-sm">
          Total available:{' '}
          <strong>{fmt(data.totalAvailable)} MT</strong>
        </span>
        <LiveBadge at={data.generatedAt} />
      </div>
      {(data.mills || []).map((m: any) => (
        <div
          key={m.plantId}
          className="rounded-lg border border-[var(--border-subtle)] overflow-hidden"
        >
          <div className="flex justify-between px-3 py-2 bg-[var(--bg-base)] text-sm">
            <span className="font-medium">{m.plantName}</span>
            <span>
              Available {fmt(m.availableForDispatch)} MT · Reserved{' '}
              {fmt(m.reserved)}
            </span>
          </div>
          <table className="min-w-full text-sm">
            <thead className="text-[11px] uppercase text-[var(--text-muted)]">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">Variety</th>
                <th className="px-3 py-2 text-right">Usable</th>
                <th className="px-3 py-2 text-right">Reserved</th>
                <th className="px-3 py-2 text-right">Available</th>
              </tr>
            </thead>
            <tbody>
              {(m.lines || []).map((l: any, i: number) => (
                <tr key={i} className="border-t border-[var(--border-subtle)]">
                  <td className="px-3 py-2">{l.itemType}</td>
                  <td className="px-3 py-2">{l.variety || '—'}</td>
                  <td className="px-3 py-2 text-right">{fmt(l.usable)}</td>
                  <td className="px-3 py-2 text-right">{fmt(l.reserved)}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {fmt(l.availableForDispatch)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {(data.mills || []).length === 0 && <Empty msg="No stock rows" />}
    </div>
  );
}

export function ReceivablesPanel() {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.receivables();
    return data;
  }, []);
  const { data, error, loading } = useCmsPoll(loader);
  if (loading && !data) return <Empty msg="Loading receivables…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;
  return (
    <div>
      <div className="flex justify-between mb-3">
        <span className="text-sm">
          Total outstanding: <strong>₹ {fmt(data.total, 0)}</strong>
        </span>
        <LiveBadge at={data.generatedAt} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-base)] text-[11px] uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Party</th>
              <th className="px-3 py-2 text-left">Mill</th>
              <th className="px-3 py-2 text-right">Billed</th>
              <th className="px-3 py-2 text-right">Settled</th>
              <th className="px-3 py-2 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {(data.rows || []).map((r: any, i: number) => (
              <tr key={i} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2">{r.party}</td>
                <td className="px-3 py-2">{r.plantName}</td>
                <td className="px-3 py-2 text-right">{fmt(r.billed, 0)}</td>
                <td className="px-3 py-2 text-right">{fmt(r.settled, 0)}</td>
                <td className="px-3 py-2 text-right font-medium">
                  {fmt(r.outstanding, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data.rows || []).length === 0 && (
          <Empty msg="No outstanding receivables" />
        )}
      </div>
    </div>
  );
}

export function PaddyCostPanel({ plantId }: { plantId?: string }) {
  const loader = useCallback(async () => {
    const { data } = await cmsApi.paddyCost(plantId);
    return data;
  }, [plantId]);
  const { data, error, loading } = useCmsPoll(loader);
  if (loading && !data) return <Empty msg="Loading paddy cost…" />;
  if (error && !data) return <Empty msg={error} />;
  if (!data) return null;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <LiveBadge at={data.generatedAt} />
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {(data.mills || []).map((m: any) => (
          <div
            key={m.plantId}
            className="rounded-lg border border-[var(--border-subtle)] p-3"
          >
            <div className="font-medium text-sm">{m.plantName}</div>
            <div className="mt-1 text-xl font-semibold">
              ₹ {fmt(m.totalCost, 0)}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {m.count} lots · avg ₹{fmt(m.avgCostPerMt, 0)} / MT
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-base)] text-[11px] uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Mill</th>
              <th className="px-3 py-2 text-left">Artia</th>
              <th className="px-3 py-2 text-right">Net Wt</th>
              <th className="px-3 py-2 text-right">Rate</th>
              <th className="px-3 py-2 text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            {(data.rows || []).slice(0, 80).map((r: any) => (
              <tr key={r.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2 whitespace-nowrap">{fmtTime(r.at)}</td>
                <td className="px-3 py-2">{r.plantName}</td>
                <td className="px-3 py-2">{r.artia || '—'}</td>
                <td className="px-3 py-2 text-right">{fmt(r.netWt)}</td>
                <td className="px-3 py-2 text-right">{fmt(r.rate, 0)}</td>
                <td className="px-3 py-2 text-right">{fmt(r.cost, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data.rows || []).length === 0 && <Empty msg="No paddy cost rows" />}
      </div>
    </div>
  );
}

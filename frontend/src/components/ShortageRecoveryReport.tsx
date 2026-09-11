import React, { useState, useEffect, useMemo } from 'react';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import api from '../api/axios';
import { exportToExcel } from '../utils/exportUtils';
import { useAuthStore } from '../store/authStore';

const CHART_COLORS = ['#e67e00', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#14b8a6'];

type ViewMode = 'ledger' | 'daily' | 'balances';

export default function ShortageRecoveryReport({ activePlant }: { activePlant: any }) {
  const user = useAuthStore((s) => s.user);
  const today = new Date().toISOString().slice(0, 10);
  const [view, setView] = useState<ViewMode>('daily');
  const [data, setData] = useState<any[]>([]);
  const [daily, setDaily] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [trend, setTrend] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    reportDate: today,
    groupBy: 'mill',
  });

  const fetchLedger = async () => {
    const params = new URLSearchParams();
    if (filters.groupBy === 'mill' && activePlant?.id) params.append('plantId', activePlant.id);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    const res = await api.get(`/api/procurement/reports/shortage-summary?${params.toString()}`);
    setData(Array.isArray(res.data) ? res.data : []);
  };

  const [submitting, setSubmitting] = useState(false);

  const fetchDaily = async () => {
    const res = await api.get(`/api/procurement/reports/shortage-daily?date=${filters.reportDate}`);
    setDaily(res.data);
  };

  const handleSubmitDaily = async () => {
    setSubmitting(true);
    try {
      await api.post('/api/procurement/reports/shortage-daily/submit', {
        date: filters.reportDate,
        plantId: 'global',
        submittedBy: user?.username || 'Supervisor',
        source: 'MANUAL',
      });
      await fetchDaily();
    } catch (err) {
      console.error('Submit daily shortage failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchBalances = async () => {
    const res = await api.get(`/api/procurement/reports/shortage-artia-balances?asOf=${filters.reportDate}`);
    setBalances(Array.isArray(res.data) ? res.data : []);
  };

  const fetchTrend = async () => {
    const res = await api.get('/api/procurement/reports/shortage-mill-trend?days=14');
    setTrend(res.data);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const jobs: Promise<any>[] = [fetchTrend()];
      if (view === 'ledger') jobs.push(fetchLedger());
      if (view === 'daily') jobs.push(fetchDaily());
      if (view === 'balances') {
        jobs.push(fetchDaily());
        jobs.push(fetchBalances());
      }
      await Promise.all(jobs);
    } catch (err) {
      console.error('Shortage report fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [activePlant, filters, view]);

  const handlePunchRecovery = async (detailsId: string, value: string) => {
    const val = parseFloat(value);
    if (isNaN(val) || !detailsId) return;
    try {
      await api.patch(`/api/procurement/inward-details/${detailsId}/shortage-recovery`, {
        shortageRecoveryQtl: val,
      });
      fetchLedger();
    } catch (err) {
      console.error('Error updating shortage recovery', err);
    }
  };

  const handleExport = () => {
    if (view === 'daily' && daily?.columns) {
      const exportData: any[] = [];
      daily.columns.forEach((col: any) => {
        col.rows.forEach((r: any) => {
          exportData.push({
            Date: daily.date,
            Mill: col.label,
            'S.No': r.sno,
            Artia: r.artia,
            Mandi: r.mandi,
            'Shortage Quintals': r.shortageQtl,
            'Shortage Bags': r.shortageBags,
          });
        });
        exportData.push({
          Date: daily.date,
          Mill: col.label,
          'S.No': '',
          Artia: 'TOTAL',
          Mandi: '',
          'Shortage Quintals': col.totalQtl,
          'Shortage Bags': col.totalBags,
        });
      });
      exportToExcel(exportData, `Shortage_Daily_${daily.date}`);
      return;
    }
    if (view === 'balances') {
      exportToExcel(
        balances.map((b) => ({
          Mill: b.millName,
          Artia: b.artia,
          Mandi: b.mandi,
          'Till-date Shortage Qtl': b.shortageQtl,
          'Recovery Qtl': b.recoveryQtl,
          'Balance Qtl': b.balanceQtl,
          'Balance Bags': b.balanceBags,
        })),
        `Shortage_Artia_Balances_${filters.reportDate}`,
      );
      return;
    }
    exportToExcel(
      data.map((row) => ({
        Date: new Date(row.date).toLocaleDateString(),
        Mill: row.millName,
        Mandi: row.mandiName,
        Artia: row.supplierName,
        'Mill GP': row.millGp,
        'Agency GP': row.agencyGp,
        Truck: row.truckNo,
        Type: row.entryType,
        Direction: row.direction,
        'Amount Qtl': row.amountQtl,
        'Amount Bags': row.amountBags,
        Narration: row.shortageNarration,
      })),
      `Shortage_Ledger_${filters.groupBy}`,
    );
  };

  const recoveryByDetails = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((row) => {
      if (!row.detailsId) return;
      if (row.direction === 'CREDIT') {
        map[row.detailsId] = (map[row.detailsId] || 0) + (Number(row.amountQtl) || 0);
      }
    });
    return map;
  }, [data]);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-main)]">Shortage Report</h2>
          <p className="text-xs text-[var(--text-muted-alt)]">
            Daily consolidated · till-date Artia balances · auto narration (evening submit / 7:05 PM cron / GP finalize)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {view === 'daily' && (
            <button
              onClick={handleSubmitDaily}
              disabled={submitting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              title="Freeze / submit evening daily shortage report"
            >
              {submitting ? 'Submitting...' : 'Submit Daily Report'}
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-[#e67e00] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#cc7000] transition-colors"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['daily', 'Daily Consolidated'],
            ['balances', 'Artia Till-date'],
            ['ledger', 'Ledger / Narration'],
          ] as [ViewMode, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
              view === key
                ? 'bg-[#e67e00]/15 border-[#e67e00] text-[#e67e00]'
                : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        {(view === 'daily' || view === 'balances') && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-muted-alt)]">As of / Report Date</label>
            <input
              type="date"
              value={filters.reportDate}
              onChange={(e) => setFilters((p) => ({ ...p, reportDate: e.target.value }))}
              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-main)] px-3 py-1.5 rounded text-sm outline-none focus:border-[#e67e00]"
            />
          </div>
        )}
        {view === 'ledger' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted-alt)]">From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
                className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-main)] px-3 py-1.5 rounded text-sm outline-none focus:border-[#e67e00]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted-alt)]">To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
                className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-main)] px-3 py-1.5 rounded text-sm outline-none focus:border-[#e67e00]"
              />
            </div>
          </>
        )}
      </div>

      {/* Mill shortage trend graph */}
      {trend?.series?.length > 0 && (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-[var(--text-main)]">Mill Shortage Trend (14 days)</h3>
            <div className="flex flex-wrap gap-2">
              {(trend.trends || []).map((t: any) => (
                <span
                  key={t.mill}
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                    t.increasing ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
                  }`}
                >
                  {t.increasing ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {t.mill}: {t.deltaQtl > 0 ? '+' : ''}
                  {t.deltaQtl} qtl
                </span>
              ))}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                {(trend.mills || []).map((mill: string, i: number) => (
                  <Line
                    key={mill}
                    type="monotone"
                    dataKey={mill}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-sm relative min-h-[280px]">
        {loading && (
          <div className="absolute inset-0 bg-[var(--bg-panel)]/50 flex items-center justify-center z-10">
            <div className="w-8 h-8 border-4 border-[#e67e00] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {view === 'daily' && daily && (
          <div className="overflow-x-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[var(--text-main)]">
                Daily Consolidated — {daily.date}
                <span className="text-xs text-[var(--text-muted-alt)] font-normal ml-2">
                  {daily.fromSnapshot
                    ? `Submitted ${daily.submittedAt ? new Date(daily.submittedAt).toLocaleString() : ''} (${daily.source || 'snapshot'})`
                    : `Live preview — submit evening report to freeze`}
                </span>
              </p>
              <p className="text-sm font-bold text-[#e67e00]">
                Grand: {daily.grandTotalQtl} qtl / {daily.grandTotalBags} bags
              </p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {(daily.columns || []).map((col: any) => (
                <div key={col.key} className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                  <div className="bg-[#e67e00]/10 px-3 py-2 border-b border-[var(--border-subtle)]">
                    <h4 className="font-bold text-sm text-[#e67e00]">{col.label}</h4>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)]">
                        <th className="px-2 py-1.5 text-left">S.No</th>
                        <th className="px-2 py-1.5 text-left">Artia</th>
                        <th className="px-2 py-1.5 text-left">Mandi</th>
                        <th className="px-2 py-1.5 text-right">Qtl</th>
                        <th className="px-2 py-1.5 text-right">Bags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {col.rows.map((r: any) => (
                        <tr key={`${col.key}-${r.sno}`} className="border-b border-[var(--border-subtle-alt)]">
                          <td className="px-2 py-1.5 text-[var(--text-muted-alt)]">{r.sno}</td>
                          <td className="px-2 py-1.5 font-medium text-[var(--text-main)]">{r.artia}</td>
                          <td className="px-2 py-1.5 text-[var(--text-muted)]">{r.mandi}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-red-400">{Number(r.shortageQtl).toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{Number(r.shortageBags).toFixed(2)}</td>
                        </tr>
                      ))}
                      {col.rows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-2 py-4 text-center text-[var(--text-muted-alt)] text-xs">
                            No shortage balance
                          </td>
                        </tr>
                      )}
                      <tr className="bg-[var(--bg-panel-hover)] font-bold">
                        <td colSpan={3} className="px-2 py-2 text-right text-[var(--text-main)]">
                          Total
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-[#e67e00]">{Number(col.totalQtl).toFixed(2)}</td>
                        <td className="px-2 py-2 text-right font-mono text-[#e67e00]">{Number(col.totalBags).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'balances' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-max">
              <thead>
                <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-subtle)] text-xs uppercase text-[var(--text-muted-alt)]">
                  <th className="px-4 py-3">Mill</th>
                  <th className="px-4 py-3">Artia</th>
                  <th className="px-4 py-3">Mandi</th>
                  <th className="px-4 py-3 text-right">Debit Qtl</th>
                  <th className="px-4 py-3 text-right">Credit Qtl</th>
                  <th className="px-4 py-3 text-right">Balance Qtl</th>
                  <th className="px-4 py-3 text-right">Balance Bags</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b, i) => (
                  <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-muted)]">
                    <td className="px-4 py-2 text-sm">{b.millName}</td>
                    <td className="px-4 py-2 text-sm font-bold">{b.artia}</td>
                    <td className="px-4 py-2 text-sm">{b.mandi}</td>
                    <td className="px-4 py-2 text-sm text-right font-mono text-red-400">{Number(b.shortageQtl).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-right font-mono text-emerald-400">{Number(b.recoveryQtl).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-right font-mono font-bold">{Number(b.balanceQtl).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-right font-mono">{Number(b.balanceBags).toFixed(2)}</td>
                  </tr>
                ))}
                {balances.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted-alt)]">
                      No artia balances for this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {view === 'ledger' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-max">
              <thead>
                <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-subtle)] text-xs uppercase text-[var(--text-muted-alt)]">
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Mill</th>
                  <th className="px-3 py-3">Artia</th>
                  <th className="px-3 py-3">Mandi</th>
                  <th className="px-3 py-3">Mill GP</th>
                  <th className="px-3 py-3">Agency GP</th>
                  <th className="px-3 py-3">Truck</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3 text-right">Qtl</th>
                  <th className="px-3 py-3 text-right">Bags</th>
                  <th className="px-3 py-3">Recovery Punch</th>
                  <th className="px-3 py-3">Narration</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={row.id || idx} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-muted)]">
                    <td className="px-3 py-2 text-sm whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-sm">{row.millName}</td>
                    <td className="px-3 py-2 text-sm font-bold">{row.supplierName}</td>
                    <td className="px-3 py-2 text-sm">{row.mandiName}</td>
                    <td className="px-3 py-2 text-xs font-mono">{row.millGp}</td>
                    <td className="px-3 py-2 text-xs font-mono">{row.agencyGp}</td>
                    <td className="px-3 py-2 text-sm font-mono">{row.truckNo}</td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          row.direction === 'CREDIT' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                        }`}
                      >
                        {row.entryType || row.direction}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-mono">{Number(row.amountQtl || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-sm text-right font-mono">{Number(row.amountBags || 0).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      {row.direction === 'DEBIT' && row.detailsId ? (
                        <input
                          type="number"
                          step="0.01"
                          key={`${row.detailsId}-${recoveryByDetails[row.detailsId] || 0}`}
                          defaultValue={recoveryByDetails[row.detailsId] || 0}
                          onBlur={(e) => {
                            if (parseFloat(e.target.value) !== (recoveryByDetails[row.detailsId] || 0)) {
                              handlePunchRecovery(row.detailsId, e.target.value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                          }}
                          className="w-24 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1 text-right outline-none focus:border-[#e67e00]"
                          title="Total recovery for this inward (auto credits + manual)"
                        />
                      ) : (
                        <span className="text-[var(--text-muted-alt)] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--text-main)] font-medium max-w-[240px]" title={row.shortageNarration}>
                      {row.shortageNarration || '-'}
                    </td>
                  </tr>
                ))}
                {data.length === 0 && !loading && (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-[var(--text-muted-alt)]">
                      No shortage ledger entries for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

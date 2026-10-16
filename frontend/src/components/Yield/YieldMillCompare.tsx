import React, { useEffect, useState } from 'react';
import { RefreshCw, Download, Calculator, FileSpreadsheet, Layers } from 'lucide-react';
import api from '../../api/axios';
import { usePlantStore } from '../../store/plantStore';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { exportToExcel, exportToPDF, exportMultiPagePDF } from '../../utils/exportUtils';
import { biometricService } from '../../services/biometricService';
import * as XLSX from 'xlsx';

type Basis = 'rice' | 'paddy';

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

const defaultRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return { from: isoDay(from), to: isoDay(to) };
};

export const YieldMillCompare: React.FC<{ basis: Basis }> = ({ basis }) => {
  const { user } = useAuthStore();
  const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name;
  const canExport = roleName === 'SUPER_ADMIN';
  const activePlant = usePlantStore((s) => s.activePlant);
  const notify = (message: string, type: 'success' | 'error' | 'info' = 'info') =>
    useUiStore.getState().addToast(message, type);

  const [period, setPeriod] = useState(basis === 'paddy' ? 'weekly' : 'daily');
  const [unit, setUnit] = useState<'bags' | 'weight'>('bags');
  const defaults = defaultRange();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [format2Mill, setFormat2Mill] = useState('goyal');
  const [viewMode, setViewMode] = useState<'compare' | 'datesheet'>('compare');
  const [datesheet, setDatesheet] = useState<any>(null);
  const [paddyOpen, setPaddyOpen] = useState(false);
  const [paddyForm, setPaddyForm] = useState({
    paddyInHoodi: '',
    paddyInDryer: '',
    paddyInSilos: '',
    submittedBy: '',
    biometricData: '',
  });
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    if (basis === 'paddy') setPeriod('weekly');
  }, [basis]);

  useEffect(() => {
    if (basis === 'paddy' && period === 'daily') setPeriod('weekly');
  }, [basis, period]);

  /** Resolve From/To for Format 1 / Format 2 / datesheet */
  const resolveFormatDates = (): { from: string; to: string } | null => {
    let from = dateFrom;
    let to = dateTo;
    if (!from && !to) {
      const d = defaultRange();
      from = d.from;
      to = d.to;
      setDateFrom(from);
      setDateTo(to);
    } else if (from && !to) {
      to = from;
      setDateTo(to);
    } else if (!from && to) {
      from = to;
      setDateFrom(from);
    }
    if (!from || !to) {
      notify('Set From and To dates (date pickers next to period).', 'error');
      return null;
    }
    if (from > to) {
      notify('From date must be on or before To date.', 'error');
      return null;
    }
    return { from, to };
  };

  const formatGranularity = () =>
    period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : 'day';

  const loadDatesheet = async () => {
    const range = resolveFormatDates();
    if (!range) return;
    setLoading(true);
    try {
      const res = await api.get('/yield/mill-compare/format2', {
        params: {
          basis,
          unit,
          dateFrom: range.from,
          dateTo: range.to,
          millKey: format2Mill,
          granularity: formatGranularity(),
        },
      });
      setDatesheet(res.data);
      setViewMode('datesheet');
      notify(`Datesheet loaded for ${format2Mill}`, 'success');
    } catch (e: any) {
      notify(e?.response?.data?.message || 'Datesheet failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const rangeParams = () => {
    if (period === 'range') return { dateFrom, dateTo };
    if (period === 'daily' && dateFrom) return { dateFrom, dateTo: dateFrom };
    return {};
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/yield/mill-compare', {
        params: {
          basis,
          period: period === 'range' ? 'till_date' : period,
          unit,
          ...rangeParams(),
        },
      });
      setReport(res.data);
      setViewMode('compare');
    } catch (e: any) {
      console.error(e);
      notify(e?.response?.data?.message || 'Failed to load yield compare', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [basis, period, unit, dateFrom, dateTo]);

  const openPaddyPopup = async () => {
    if (!activePlant?.id) {
      notify('Select a plant first', 'error');
      return;
    }
    try {
      const res = await api.get('/yield/paddy-usage/preview', { params: { plantId: activePlant.id } });
      setPreview(res.data);
      setPaddyOpen(true);
    } catch (e: any) {
      notify(e?.response?.data?.message || 'Failed to load paddy preview', 'error');
    }
  };

  const submitPaddy = async () => {
    if (!activePlant?.id) return;
    try {
      await api.post('/yield/paddy-usage', paddyForm, { params: { plantId: activePlant.id } });
      notify('Paddy usage saved', 'success');
      setPaddyOpen(false);
      fetchReport();
    } catch (e: any) {
      notify(e?.response?.data?.message || 'Submit failed', 'error');
    }
  };

  const exportFormat1 = async () => {
    const range = resolveFormatDates();
    if (!range) return;
    setLoading(true);
    try {
      const res = await api.get('/yield/mill-compare/format1', {
        params: {
          basis,
          unit,
          dateFrom: range.from,
          dateTo: range.to,
          granularity: formatGranularity(),
          period: 'range',
        },
      });
      const pages = res.data?.pages || [];
      if (!pages.length) {
        notify('No pages in that date range', 'error');
        return;
      }

      const wb = XLSX.utils.book_new();
      pages.forEach((page: any, idx: number) => {
        const millsPage = page.report?.mills || [];
        const keys: string[] = page.report?.itemKeys || itemKeys;
        const rows = keys.map((item) => {
          const row: any = { Item: item };
          for (const m of millsPage) {
            const cell = m.items?.[item];
            row[`${m.firm} Qty`] = cell?.qty ?? 0;
            row[`${m.firm} %`] = cell?.pct ?? 0;
            row[`${m.firm} Diff`] = cell?.diff ?? 0;
          }
          return row;
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const name = (page.label || `Page${idx + 1}`).toString().slice(0, 28);
        XLSX.utils.book_append_sheet(wb, ws, name || `Page${idx + 1}`);
      });
      XLSX.writeFile(wb, `yield_${basis}_format1.xlsx`);

      const pdfPages = pages.map((page: any) => {
        const millsPage = page.report?.mills || [];
        const keys: string[] = page.report?.itemKeys || itemKeys;
        const columns = ['Item', ...millsPage.flatMap((m: any) => [`${m.firm} %`, `${m.firm} Diff`])];
        const rows = keys.map((item: string) => {
          const row: any[] = [item];
          for (const m of millsPage) {
            const cell = m.items?.[item];
            row.push(cell?.pct ?? 0, cell?.diff ?? 0);
          }
          return row;
        });
        return { label: page.label || 'Page', columns, rows };
      });
      exportMultiPagePDF(`Yield Format 1 (${basis})`, pdfPages, `yield_${basis}_format1.pdf`);
      notify(`Format 1 exported (${pages.length} pages)`, 'success');
    } catch (e: any) {
      notify(e?.response?.data?.message || 'Format 1 export failed (SUPER_ADMIN only)', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportFormat2 = async () => {
    const range = resolveFormatDates();
    if (!range) return;
    setLoading(true);
    try {
      const res = await api.get('/yield/mill-compare/format2', {
        params: {
          basis,
          unit,
          dateFrom: range.from,
          dateTo: range.to,
          granularity: formatGranularity(),
          millKey: format2Mill,
          export: '1',
        },
      });
      const d = res.data;
      const keys: string[] = d.itemKeys || [];
      const data = (d.rows || []).map((r: any) => {
        const row: any = { Date: r.date };
        for (const k of keys) {
          row[k] = r.items?.[k]?.pct ?? r.items?.[k]?.qty ?? 0;
        }
        return row;
      });
      const avgRow: any = { Date: 'Average yield' };
      const diffRow: any = { Date: 'Difference in yield' };
      for (const k of keys) {
        avgRow[k] = d.averageYield?.[k] ?? 0;
        diffRow[k] = d.diffInYield?.[k] ?? 0;
      }
      data.push(avgRow, diffRow);
      exportToExcel(data, `yield_${basis}_format2_${format2Mill}.xlsx`);

      const cols = ['Date', ...keys];
      const pdfRows = data.map((row: any) => cols.map((c) => row[c]));
      exportToPDF(
        `Yield Format 2 — ${d.firm || format2Mill} (${basis})`,
        cols,
        pdfRows,
        `yield_${basis}_format2_${format2Mill}.pdf`,
      );
      notify('Format 2 exported (Excel + PDF)', 'success');
    } catch (e: any) {
      notify(e?.response?.data?.message || 'Format 2 export failed (SUPER_ADMIN only)', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mills = report?.mills || [];
  const itemKeys: string[] = report?.itemKeys || [];
  // Always show From/To — Format 1 / Datesheet / Format 2 need a range
  const showRangeDates = true;

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex flex-wrap gap-3 justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-main)]">
            Yield from {basis === 'rice' ? 'Rice Produced Stock' : 'Paddy Stock'}
          </h2>
          <p className="text-xs text-[var(--text-muted-alt)]">
            Consolidated mill compare · Diff vs benchmarks
            {report?.dateRangeLabel ? ` · ${report.dateRangeLabel}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs"
          >
            {basis === 'paddy' ? (
              <>
                <option value="weekly">Weekly (default calc)</option>
                <option value="monthly">Monthly (view)</option>
                <option value="till_date">Till Date (view)</option>
                <option value="range">Date Range (view)</option>
              </>
            ) : (
              <>
                <option value="daily">Daily</option>
                <option value="till_date">Till Date</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="range">Date Range</option>
              </>
            )}
          </select>
          {showRangeDates && (
            <>
              <label className="text-[10px] text-[var(--text-muted-alt)] self-center">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs"
                title="From date"
              />
              <label className="text-[10px] text-[var(--text-muted-alt)] self-center">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs"
                title="To date"
              />
            </>
          )}
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as any)}
            className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs"
          >
            <option value="bags">Bags</option>
            <option value="weight">Weight</option>
          </select>
          {basis === 'paddy' && (
            <button
              onClick={openPaddyPopup}
              className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-lg text-xs flex items-center gap-1"
            >
              <Calculator size={14} /> Paddy Usage
            </button>
          )}
          <button
            onClick={fetchReport}
            className="px-3 py-1.5 border border-[var(--border-subtle)] rounded-lg text-xs flex items-center gap-1"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          {canExport && (
            <>
              <button
                onClick={exportFormat1}
                className="px-3 py-1.5 border border-sky-500/40 text-sky-400 rounded-lg text-xs flex items-center gap-1"
                title="Format 1 — each day/week/month page (Excel + PDF)"
              >
                <Layers size={14} /> Format 1
              </button>
              <select
                value={format2Mill}
                onChange={(e) => setFormat2Mill(e.target.value)}
                className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs"
                title="Mill for Format 2"
              >
                <option value="goyal">Goyal</option>
                <option value="beas">Beas</option>
                <option value="rajoa">Rajoa</option>
              </select>
              <button
                onClick={loadDatesheet}
                className="px-3 py-1.5 border border-violet-500/40 text-violet-400 rounded-lg text-xs flex items-center gap-1"
                title="Show Format 2 datesheet on screen"
              >
                <FileSpreadsheet size={14} /> View Datesheet
              </button>
              <button
                onClick={exportFormat2}
                className="px-3 py-1.5 border border-violet-500/40 text-violet-400 rounded-lg text-xs flex items-center gap-1"
                title="Format 2 — full datesheet Excel + PDF"
              >
                <Download size={14} /> Format 2
              </button>
              {viewMode === 'datesheet' && (
                <button
                  onClick={() => { setViewMode('compare'); setDatesheet(null); }}
                  className="px-3 py-1.5 border border-[var(--border-subtle)] rounded-lg text-xs"
                >
                  Back to Compare
                </button>
              )}
            </>
          )}
          {!canExport && (
            <>
              <select
                value={format2Mill}
                onChange={(e) => setFormat2Mill(e.target.value)}
                className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs"
              >
                <option value="goyal">Goyal</option>
                <option value="beas">Beas</option>
                <option value="rajoa">Rajoa</option>
              </select>
              <button
                onClick={loadDatesheet}
                className="px-3 py-1.5 border border-violet-500/40 text-violet-400 rounded-lg text-xs flex items-center gap-1"
              >
                <FileSpreadsheet size={14} /> View Datesheet
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-[var(--text-muted-alt)]">Loading…</div>
      ) : viewMode === 'datesheet' && datesheet ? (
        <div className="overflow-x-auto p-2">
          <p className="text-xs text-[var(--text-muted-alt)] px-3 py-2">
            Format 2 · {datesheet.firm || format2Mill} · {datesheet.dateRangeLabel}
          </p>
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-[var(--bg-panel-alt)] text-[10px] uppercase text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)]">
                <th className="px-3 py-2 text-left">Date</th>
                {(datesheet.itemKeys || []).map((k: string) => (
                  <th key={k} className="px-2 py-2 text-right">{k}</th>
                ))}
                <th className="px-2 py-2 text-right">Safai+Patal qtl</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {(datesheet.rows || []).map((row: any) => (
                <tr key={row.label || row.date}>
                  <td className="px-3 py-2 font-medium">{row.label || row.date}</td>
                  {(datesheet.itemKeys || []).map((k: string) => (
                    <td key={k} className="px-2 py-2 text-right">
                      {row.items?.[k]?.qty ?? row.items?.[k]?.avg ?? row[k] ?? '—'}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right text-amber-300">{row.wastage?.weightQtl ?? 0}</td>
                </tr>
              ))}
              {datesheet.averageYield && (
                <tr className="bg-[var(--bg-panel-alt)] font-semibold">
                  <td className="px-3 py-2">Average yield</td>
                  {(datesheet.itemKeys || []).map((k: string) => (
                    <td key={k} className="px-2 py-2 text-right">{datesheet.averageYield[k] ?? '—'}</td>
                  ))}
                  <td />
                </tr>
              )}
              {datesheet.diffInYield && (
                <tr className="font-semibold">
                  <td className="px-3 py-2">Diff in yield</td>
                  {(datesheet.itemKeys || []).map((k: string) => (
                    <td
                      key={k}
                      className={`px-2 py-2 text-right ${(datesheet.diffInYield[k] || 0) < 0 ? 'text-red-500' : 'text-green-500'}`}
                    >
                      {datesheet.diffInYield[k] ?? '—'}
                    </td>
                  ))}
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-panel-alt)] text-[10px] uppercase text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)]">
                <th className="px-3 py-3 text-left sticky left-0 bg-[var(--bg-panel-alt)]">Items</th>
                {mills.map((m: any) => (
                  <th key={m.millKey} className="px-3 py-3 text-center" colSpan={2}>
                    {m.firm}
                  </th>
                ))}
              </tr>
              <tr className="bg-[var(--bg-panel-alt)] text-[10px] text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)]">
                <th className="px-3 py-2 sticky left-0 bg-[var(--bg-panel-alt)]" />
                {mills.map((m: any) => (
                  <React.Fragment key={m.millKey}>
                    <th className="px-2 py-2 text-right font-normal">
                      Avg yield / % age
                    </th>
                    <th className="px-2 py-2 text-right font-normal">Diff in yield</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {itemKeys.map((item) => (
                <tr key={item} className="hover:bg-[var(--glass-bg)]">
                  <td className="px-3 py-2 font-medium text-[var(--text-main)] sticky left-0 bg-[var(--bg-panel)]">
                    {item}
                  </td>
                  {mills.map((m: any) => {
                    const cell = m.items?.[item] || { qty: 0, avg: 0, pct: 0, diff: 0 };
                    const bagsOrQty = cell.qty ?? cell.avg ?? 0;
                    const pct = cell.pct ?? cell.avg ?? 0;
                    return (
                      <React.Fragment key={m.millKey}>
                        <td className="px-2 py-2 text-right text-[var(--text-main)]">
                          <div>{bagsOrQty}</div>
                          {item !== 'Paddy Used' && (
                            <div className="text-[10px] text-[var(--text-muted-alt)]">{pct}%</div>
                          )}
                        </td>
                        <td
                          className={`px-2 py-2 text-right font-semibold ${
                            cell.diff < 0 ? 'text-red-500' : 'text-green-500'
                          }`}
                        >
                          {cell.diff > 0 ? '+' : ''}
                          {cell.diff}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-amber-500/10">
                <td className="px-3 py-2 font-medium text-amber-300 sticky left-0 bg-[var(--bg-panel)]">
                  Safai Dust + Patal
                  <div className="text-[10px] font-normal text-[var(--text-muted-alt)]">Accounted wastage, not a yield item</div>
                </td>
                {mills.map((m: any) => {
                  const w = m.wastage || {};
                  return (
                    <td key={m.millKey} colSpan={2} className="px-2 py-2 text-right text-amber-200">
                      <div>{w.safaiDustBags || 0} + {w.patalBags || 0} bags</div>
                      <div className="text-[10px] text-[var(--text-muted-alt)]">
                        {w.weightQtl || 0} qtl @ {w.bagWeightQtl || 0.382}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {paddyOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl w-full max-w-md p-5 space-y-3">
            <h3 className="font-bold text-[var(--text-main)]">Paddy Usage (Weekly)</h3>
            <p className="text-xs text-[var(--text-muted-alt)]">
              Opening {preview?.openingStock ?? 0} − In hand {preview?.stockInHand ?? 0} − Dispatched{' '}
              {preview?.paddyDispatched ?? 0} + Hoodi + Dryer + Silos = Total Used
            </p>
            {[
              ['paddyInHoodi', 'Paddy in Main Hoodi (manual)'],
              ['paddyInDryer', 'Paddy in Dryer (manual)'],
              ['paddyInSilos', 'Paddy in Silos / Dry Hoodi (manual)'],
              ['submittedBy', 'Supervisor Name'],
            ].map(([k, label]) => (
              <div key={k}>
                <label className="text-xs text-[var(--text-muted-alt)]">{label}</label>
                <input
                  type={k === 'submittedBy' ? 'text' : 'number'}
                  value={(paddyForm as any)[k]}
                  onChange={(e) => setPaddyForm({ ...paddyForm, [k]: e.target.value })}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Fingerprint…"
                value={paddyForm.biometricData}
                onChange={(e) => setPaddyForm({ ...paddyForm, biometricData: e.target.value })}
                className="flex-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="button"
                className="px-3 py-2 bg-amber-500 text-black text-xs font-bold rounded-lg"
                onClick={async () => {
                  try {
                    const xml = await biometricService.captureAndVerifyLoggedInUser();
                    setPaddyForm((p) => ({ ...p, biometricData: xml }));
                    notify('Captured', 'success');
                  } catch (err: any) {
                    notify(err?.message || 'Scan failed', 'error');
                  }
                }}
              >
                Scan
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPaddyOpen(false)}
                className="px-4 py-2 border border-[var(--border-subtle)] rounded-lg text-sm"
              >
                Cancel
              </button>
              <button onClick={submitPaddy} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, Download, Edit2, RefreshCw, Save, X } from 'lucide-react';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { hasModulePermission } from '../../utils/modulePermissions';
import { exportToExcel } from '../../utils/exportUtils';

type StockHealthRow = {
  millKey: string;
  firm: string;
  plantId: string | null;
  plantName: string | null;
  totalWork: number;
  deliveredTillYesterday: number;
  paddyStockConsignment: number;
  paddyStockBags: number;
  riceStockConsignment: number;
  riceStockBags: number;
  totalStockInHand: number;
  dueConsignment: number;
  surplusMinus: number;
  alert: boolean;
};

const fmt = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtBags = (n: number) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

const ConsignmentCell = ({
  consignments,
  bags,
}: {
  consignments: number;
  bags?: number;
}) => (
  <td className="px-3 py-3 text-right">
    <div className="font-semibold text-[var(--text-main)]">{fmt(consignments)}</div>
    {bags != null && (
      <div className="text-[10px] text-[var(--text-muted-alt)]">({fmtBags(bags)})</div>
    )}
  </td>
);

export const StockHealthReport: React.FC = () => {
  useAuthStore((s) => s.user);
  const canEdit = hasModulePermission('Yield Mgmt', 'canEdit', 'Stock Health Report');

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'till_date' | 'weekly' | 'monthly' | 'range'>('till_date');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [mill, setMill] = useState('all');
  const [report, setReport] = useState<any>(null);
  const [editingPlantId, setEditingPlantId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { mill, period };
      if (period === 'range') {
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
      }
      const res = await api.get('/yield/stock-health', { params });
      setReport(res.data);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || 'Failed to load Stock Health report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period, mill, dateFrom, dateTo]);

  const displayRows: StockHealthRow[] = [
    ...(report?.rows || []),
    ...(report?.total ? [report.total] : []),
  ];

  const startEdit = (row: StockHealthRow) => {
    if (!row.plantId || row.millKey === 'total') return;
    setEditingPlantId(row.plantId);
    setEditValue(String(row.totalWork || ''));
  };

  const saveTotalWork = async () => {
    if (!editingPlantId) return;
    setSaving(true);
    try {
      await api.put('/yield/stock-health/total-work', {
        plantId: editingPlantId,
        totalWork: Number(editValue),
      });
      setEditingPlantId(null);
      await fetchReport();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to save Total Work');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!displayRows.length) return;
    const data = displayRows.map((r) => ({
      Firm: r.firm,
      'Total Work (A)': r.totalWork,
      'Delivered till yesterday (B)': r.deliveredTillYesterday,
      'Paddy Stock Cons. (C)': r.paddyStockConsignment,
      'Paddy Bags': r.paddyStockBags,
      'Rice Stock Cons. (D)': r.riceStockConsignment,
      'Rice Bags': r.riceStockBags,
      'Total Stock In Hand (E)': r.totalStockInHand,
      'Due Consignment (F)': r.dueConsignment,
      'Surplus / Minus (G)': r.surplusMinus,
    }));
    exportToExcel(data, 'stock_health_report.xlsx');
  };

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-main)]">
            Stock Health Report
          </h2>
          <p className="text-xs text-[var(--text-muted-alt)] mt-0.5">
            Plus / Minus wagons details · Consignment = 580 bags (rice) · Paddy ÷ 1154
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReport}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--glass-bg)] flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 rounded-lg border border-green-500/40 text-green-500 text-xs font-semibold flex items-center gap-1.5 hover:bg-green-500/10"
          >
            <Download size={14} /> Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-panel-hover)] flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted-alt)] mb-1 font-semibold">
            View Period
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-main)] outline-none"
          >
            <option value="till_date">Till Date (Default)</option>
            <option value="weekly">Weekly Report</option>
            <option value="monthly">Monthly Report</option>
            <option value="range">Date Range</option>
          </select>
        </div>

        {period === 'range' && (
          <>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted-alt)] mb-1 font-semibold">
                From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-main)] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted-alt)] mb-1 font-semibold">
                To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-main)] outline-none"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted-alt)] mb-1 font-semibold">
            Mill Selection
          </label>
          <select
            value={mill}
            onChange={(e) => setMill(e.target.value)}
            className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-main)] outline-none"
          >
            <option value="all">Comparable (All Mills)</option>
            <option value="goyal">Goyal</option>
            <option value="beas">Beas</option>
            <option value="rajoa">Rajoa</option>
          </select>
          {mill !== 'all' && (
            <button
              type="button"
              onClick={() => setMill('all')}
              className="ml-1 text-[10px] text-amber-500 hover:underline"
            >
              ← Comparable view
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-[var(--text-muted-alt)]">
          <Calendar size={14} />
          <span>Date: {report?.dateRangeLabel || '—'}</span>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-[var(--text-muted-alt)]">Loading Stock Health…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-panel-alt)] text-[var(--text-muted-alt)] text-[11px] uppercase tracking-wider border-b border-[var(--border-subtle)]">
                <th className="px-3 py-3 text-left font-semibold">Firm</th>
                <th className="px-3 py-3 text-right font-semibold" title="Admin sets once">
                  A · Total Work
                </th>
                <th className="px-3 py-3 text-right font-semibold">B · Delivered till yesterday</th>
                <th className="px-3 py-3 text-right font-semibold">C · Paddy Stock</th>
                <th className="px-3 py-3 text-right font-semibold">D · Rice Stock</th>
                <th className="px-3 py-3 text-right font-semibold">E · Total Stock In Hand<br /><span className="normal-case font-normal">(C+D)</span></th>
                <th className="px-3 py-3 text-right font-semibold">F · Due Consignment<br /><span className="normal-case font-normal">(A−B)</span></th>
                <th className="px-3 py-3 text-right font-semibold">G · Surplus / Minus<br /><span className="normal-case font-normal">(B+E−A)</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {displayRows.map((row) => {
                const isTotal = row.millKey === 'total';
                const isEditing = editingPlantId && editingPlantId === row.plantId;
                return (
                  <tr
                    key={row.millKey}
                    className={`${isTotal ? 'bg-amber-500/5 font-semibold' : 'hover:bg-[var(--glass-bg)]'} ${row.alert ? 'bg-red-500/5' : ''}`}
                  >
                    <td className="px-3 py-3 text-[var(--text-main)]">
                      <div className="flex items-center gap-2">
                        {!isTotal ? (
                          <button
                            type="button"
                            onClick={() => setMill(row.millKey)}
                            className={`text-left font-medium hover:underline ${
                              mill === row.millKey ? 'text-amber-500' : 'text-[var(--text-main)]'
                            }`}
                            title="Filter to this mill"
                          >
                            {row.firm}
                          </button>
                        ) : (
                          <span>{row.firm}</span>
                        )}
                        {!row.plantId && !isTotal && (
                          <span className="text-[10px] text-amber-500">(plant not mapped)</span>
                        )}
                        {row.alert && (
                          <span title="Surplus/Minus below −1" className="text-red-500">
                            <AlertTriangle size={14} />
                          </span>
                        )}
                      </div>
                      {row.plantName && (
                        <div className="text-[10px] text-[var(--text-muted-alt)]">{row.plantName}</div>
                      )}
                    </td>

                    <td className="px-3 py-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-24 bg-[var(--bg-base)] border border-amber-500/50 rounded px-2 py-1 text-sm text-right"
                          />
                          {canEdit && (
                          <button
                            onClick={saveTotalWork}
                            disabled={saving}
                            className="p-1 text-green-500 hover:bg-green-500/10 rounded"
                          >
                            <Save size={14} />
                          </button>
                          )}
                          <button
                            onClick={() => setEditingPlantId(null)}
                            className="p-1 text-[var(--text-muted)] hover:bg-[var(--glass-bg)] rounded"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[var(--text-main)]">{fmt(row.totalWork)}</span>
                            {canEdit && row.plantId && !isTotal && (
                              <button
                                onClick={() => startEdit(row)}
                                className="p-1 text-blue-400 hover:bg-blue-400/10 rounded"
                                title={
                                  row.totalWork > 0
                                    ? 'Edit Total Work (set once; change only when admin updates)'
                                    : 'Set Total Work once for this mill'
                                }
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                          </div>
                          {canEdit && row.plantId && !isTotal && (
                            <span className={`text-[9px] ${row.totalWork > 0 ? 'text-[var(--text-muted-alt)]' : 'text-amber-500'}`}>
                              {row.totalWork > 0 ? 'Set · admin may edit' : 'Not set — enter once'}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-3 text-right text-[var(--text-main)]">
                      {fmt(row.deliveredTillYesterday)}
                    </td>

                    <ConsignmentCell
                      consignments={row.paddyStockConsignment}
                      bags={row.paddyStockBags}
                    />
                    <ConsignmentCell
                      consignments={row.riceStockConsignment}
                      bags={row.riceStockBags}
                    />

                    <td className="px-3 py-3 text-right font-semibold text-[var(--text-main)]">
                      {fmt(row.totalStockInHand)}
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--text-main)]">
                      {fmt(row.dueConsignment)}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-bold ${
                        row.surplusMinus < 0 ? 'text-red-500' : 'text-green-500'
                      }`}
                    >
                      {fmt(row.surplusMinus)}
                    </td>
                  </tr>
                );
              })}

              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-[var(--text-muted-alt)]">
                    No mill data found. Ensure plants named Goyal / Beas / Rajoa exist.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-5 py-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted-alt)] space-y-1">
        <p>
          <strong className="text-[var(--text-muted)]">C</strong> = Paddy bags ÷ 1154 ·{' '}
          <strong className="text-[var(--text-muted)]">D</strong> = (Final Rice + Mansoori + Wand + Parmal + FRK bags) ÷ 580 ·
          values shown as <em>consignments (bags)</em>
        </p>
        <p>
          Admin sets <strong className="text-[var(--text-muted)]">Total Work (A)</strong> once per mill (editable by admin later). Daily alert when Surplus/Minus &lt; −1 (e.g. −2, −3). Tap a firm name to filter that mill.
        </p>
      </div>
    </div>
  );
};

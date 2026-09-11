import React, { useEffect, useState } from 'react';
import { Printer, Download } from 'lucide-react';
import api from '../../api/axios';
import { exportToExcel } from '../../utils/exportUtils';
import { useUiStore } from '../../store/uiStore';

/** Feedback 35 — multi-mill mandi opening / today / total (bags), auto-generated */
export default function MandiBalanceDashboard() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/procurement/reports/mandi-balance-dashboard?date=${date}`);
      setData(res.data);
    } catch (e: any) {
      useUiStore.getState().addToast(e?.response?.data?.message || 'Failed to load mandi dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [date]);

  const columns = data?.columns || [];
  const mandiNames: string[] =
    columns[0]?.rows?.map((r: any) => r.mandi) || [];

  const exportAll = () => {
    const rows = mandiNames.map((mandi) => {
      const row: any = { Mandi: mandi };
      for (const col of columns) {
        const cell = col.rows.find((r: any) => r.mandi === mandi);
        row[`${col.label} Opening`] = cell?.openingBalance ?? 0;
        row[`${col.label} Today`] = cell?.todayArrival ?? 0;
        row[`${col.label} Total`] = cell?.total ?? 0;
      }
      return row;
    });
    exportToExcel(rows, `Mandi_Balance_${date}.xlsx`);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-main)]">Mandi Balance Dashboard</h3>
          <p className="text-xs text-[var(--text-muted-alt)]">
            Auto-generated · bags · Opening = prior completed lifting · Today Arrival = day&apos;s completed GPs · no manual submit
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-sm text-[var(--text-main)]"
          />
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-1.5 border border-[var(--border-subtle)] rounded text-sm"
          >
            <Printer size={16} /> Print
          </button>
          <button
            onClick={exportAll}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-bold"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-[var(--text-muted-alt)]">Loading…</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="w-full text-sm text-left min-w-max">
          <thead>
            <tr className="bg-[var(--bg-muted)] text-[10px] uppercase text-[var(--text-muted-alt)]">
              <th className="px-3 py-2 sticky left-0 bg-[var(--bg-muted)]">Mandi</th>
              {columns.map((col: any) => (
                <React.Fragment key={col.key}>
                  <th className="px-3 py-2 text-center border-l border-[var(--border-subtle)]" colSpan={3}>
                    {col.label}
                  </th>
                </React.Fragment>
              ))}
            </tr>
            <tr className="bg-[var(--bg-base)] text-[10px] uppercase text-[var(--text-muted-alt)]">
              <th className="px-3 py-1 sticky left-0 bg-[var(--bg-base)]" />
              {columns.map((col: any) => (
                <React.Fragment key={`${col.key}-sub`}>
                  <th className="px-2 py-1 text-right border-l border-[var(--border-subtle)]">Opening</th>
                  <th className="px-2 py-1 text-right">Today Arrival</th>
                  <th className="px-2 py-1 text-right">Total</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {mandiNames.map((mandi) => (
              <tr key={mandi} className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-muted)]">
                <td className="px-3 py-2 font-bold text-[var(--text-main)] sticky left-0 bg-[var(--bg-panel)]">
                  {mandi}
                </td>
                {columns.map((col: any) => {
                  const cell = col.rows.find((r: any) => r.mandi === mandi) || {
                    openingBalance: 0,
                    todayArrival: 0,
                    total: 0,
                  };
                  return (
                    <React.Fragment key={`${col.key}-${mandi}`}>
                      <td className="px-2 py-2 text-right font-mono border-l border-[var(--border-subtle)]">
                        {cell.openingBalance}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-[#e67e00]">{cell.todayArrival}</td>
                      <td className="px-2 py-2 text-right font-mono font-bold">{cell.total}</td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
            {columns.length > 0 && (
              <tr className="border-t-2 border-[var(--border-subtle)] bg-[var(--bg-muted)] font-bold">
                <td className="px-3 py-2 sticky left-0 bg-[var(--bg-muted)]">Total</td>
                {columns.map((col: any) => (
                  <React.Fragment key={`${col.key}-tot`}>
                    <td className="px-2 py-2 text-right border-l border-[var(--border-subtle)]">
                      {col.totals?.openingBalance ?? 0}
                    </td>
                    <td className="px-2 py-2 text-right text-[#e67e00]">{col.totals?.todayArrival ?? 0}</td>
                    <td className="px-2 py-2 text-right">{col.totals?.total ?? 0}</td>
                  </React.Fragment>
                ))}
              </tr>
            )}
            {!loading && mandiNames.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-[var(--text-muted-alt)]">
                  No mandi data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Printer, Download } from 'lucide-react';
import api from '../../api/axios';
import { exportToExcel } from '../../utils/exportUtils';
import { useUiStore } from '../../store/uiStore';

/** Feedback 35 — Daily Inward Summary + Artia-wise shortage section */
export default function DailyInwardSummary({ activePlant }: { activePlant: any }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any>(null);
  const [artiaShortage, setArtiaShortage] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const pid = activePlant?.id || 'global';
      const [sumRes, balRes] = await Promise.all([
        api.get(`/api/procurement/reports/daily-inward-summary?plantId=${pid}&date=${date}`),
        api.get(`/api/procurement/reports/shortage-artia-balances?asOf=${date}`),
      ]);
      setData(sumRes.data);
      let balances = Array.isArray(balRes.data) ? balRes.data : [];
      if (pid !== 'global' && activePlant?.name) {
        const re = new RegExp(activePlant.name.split(/\s+/)[0] || activePlant.name, 'i');
        balances = balances.filter((b: any) => re.test(b.millName || ''));
      }
      setArtiaShortage(balances);
    } catch (e: any) {
      useUiStore.getState().addToast(e?.response?.data?.message || 'Failed to load summary', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activePlant?.id, date]);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-main)]">Daily Inward Summary</h3>
          <p className="text-xs text-[var(--text-muted-alt)]">
            Auto-sent to mill when evening inward lists are submitted
            {data?.fromSnapshot
              ? ` · Submitted ${data.submittedAt ? new Date(data.submittedAt).toLocaleString() : ''}`
              : ' · Live'}
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
            onClick={() =>
              exportToExcel(
                (data?.mandiRows || []).map((r: any) => ({
                  Mandi: r.mandi,
                  Trucks: r.trucks,
                  'Agency Bags': r.agencyBags,
                  'Mill Bags': r.millBags,
                  'Shortage Bags': r.shortageBags,
                  'Total Bags': r.totalBags,
                })),
                `Daily_Inward_Summary_${date}.xlsx`,
              )
            }
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-bold"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ['Trucks', data?.truckCount],
          ['Agency Bags', data?.totals?.agencyBags],
          ['Mill Bags', data?.totals?.millBags],
          ['Shortage', data?.totals?.shortageBags],
          ['Total Bags', data?.totals?.totalBags],
        ].map(([label, val]) => (
          <div key={String(label)} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3">
            <p className="text-[10px] uppercase text-[var(--text-muted-alt)]">{label}</p>
            <p className="text-xl font-bold text-[var(--text-main)]">{loading ? '…' : val ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-[var(--bg-muted)] text-xs uppercase text-[var(--text-muted-alt)]">
              <th className="px-3 py-2">Mandi</th>
              <th className="px-3 py-2 text-right">Trucks</th>
              <th className="px-3 py-2 text-right">Agency Bags</th>
              <th className="px-3 py-2 text-right">Mill Bags</th>
              <th className="px-3 py-2 text-right">Shortage Bags</th>
              <th className="px-3 py-2 text-right">Total Bags</th>
            </tr>
          </thead>
          <tbody>
            {(data?.mandiRows || []).map((r: any) => (
              <tr key={r.mandi} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2 font-bold text-[var(--text-main)]">{r.mandi}</td>
                <td className="px-3 py-2 text-right">{r.trucks}</td>
                <td className="px-3 py-2 text-right text-[#e67e00]">{r.agencyBags}</td>
                <td className="px-3 py-2 text-right">{r.millBags}</td>
                <td className="px-3 py-2 text-right text-amber-400">{r.shortageBags}</td>
                <td className="px-3 py-2 text-right font-bold">{r.totalBags}</td>
              </tr>
            ))}
            {!loading && !(data?.mandiRows || []).length && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[var(--text-muted-alt)]">
                  No inward data for this date.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Feedback 35 — Daily shortage report summary with Artia-wise section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-sm font-bold text-[var(--text-main)]">Artia-wise Shortage Report</h4>
            <p className="text-[10px] text-[var(--text-muted-alt)]">
              Till-date shortage balances (also in Shortage Recovery → Daily Consolidated / Artia Till-date)
            </p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[var(--bg-muted)] text-xs uppercase text-[var(--text-muted-alt)]">
                <th className="px-3 py-2">Mill</th>
                <th className="px-3 py-2">Artia</th>
                <th className="px-3 py-2">Mandi</th>
                <th className="px-3 py-2 text-right">Shortage Qtl</th>
                <th className="px-3 py-2 text-right">Recovery Qtl</th>
                <th className="px-3 py-2 text-right">Balance Qtl</th>
                <th className="px-3 py-2 text-right">Balance Bags</th>
              </tr>
            </thead>
            <tbody>
              {artiaShortage.map((b: any, i: number) => (
                <tr key={i} className="border-t border-[var(--border-subtle)]">
                  <td className="px-3 py-2">{b.millName}</td>
                  <td className="px-3 py-2 font-bold text-[var(--text-main)]">{b.artia}</td>
                  <td className="px-3 py-2">{b.mandi}</td>
                  <td className="px-3 py-2 text-right font-mono text-red-400">{Number(b.shortageQtl).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-400">{Number(b.recoveryQtl).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold">{Number(b.balanceQtl).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono">{Number(b.balanceBags).toFixed(2)}</td>
                </tr>
              ))}
              {!loading && artiaShortage.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-[var(--text-muted-alt)]">
                    No artia shortage balances.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

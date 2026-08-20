import React, { useState, useEffect } from 'react';
import { usePlantStore } from '../../store/plantStore';
import api from '../../api/axios';
import { Download } from 'lucide-react';

export const DailyStockReport = () => {
  const activePlant = usePlantStore((state) => state.activePlant);
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const plantId = activePlant?.id || 'global';
        const response = await api.get(`/production/daily-stock-report?plantId=${plantId}&date=${date}`);
        setReportData(response.data);
      } catch (error) {
        console.error('Error fetching report', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [activePlant?.id, date]);

  const handleExport = () => {
    // Basic export stub
    console.log('Exporting to Excel...');
  };

  return (
    <div className="flex flex-col gap-6 flex-1">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[var(--text-main)]">Daily Productions & Stock Report</h2>
          <div className="flex gap-4 items-center">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500 transition-colors"
            />
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-main)] rounded-lg text-sm font-semibold hover:border-amber-500 transition-colors flex items-center gap-2"
            >
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-[var(--text-muted)] py-10">Loading report...</div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse border border-[var(--border-subtle)]">
              <thead>
                <tr>
                  <th className="border border-[var(--border-subtle)] px-3 py-2 text-center align-middle font-bold text-sm bg-[var(--bg-base)] text-[var(--text-muted)]" rowSpan={2}>S.NO.</th>
                  <th className="border border-[var(--border-subtle)] px-3 py-2 text-center align-middle font-bold text-sm bg-[var(--bg-base)] text-[var(--text-muted)] min-w-[150px]" rowSpan={2}>ITEM</th>
                  <th className="border border-[var(--border-subtle)] px-3 py-2 text-center align-middle font-bold text-sm bg-[var(--bg-base)] text-[var(--text-muted)]" colSpan={7}>IN</th>
                  <th className="border border-[var(--border-subtle)] px-3 py-2 text-center align-middle font-bold text-sm bg-[var(--bg-base)] text-[var(--text-muted)]" colSpan={3}>SALE/OUT/USAGE</th>
                  <th className="border border-[var(--border-subtle)] px-3 py-2 text-center align-middle font-bold text-sm bg-[var(--bg-base)] text-[var(--text-muted)]" rowSpan={2}>BAL</th>
                  <th className="border border-[var(--border-subtle)] px-3 py-2 text-center align-middle font-bold text-sm bg-[var(--bg-base)] text-[var(--text-muted)] min-w-[100px]" rowSpan={2}>NOTE</th>
                </tr>
                <tr>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">OP BAL</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">DAY</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">DAY %</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">NIGHT</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">NIGHT %</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">IN TOTAL</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">NOTE</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">DAY</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">NIGHT</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">OUT TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, index) => (
                  <tr key={index} className="hover:bg-[var(--bg-base)] transition-colors">
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-center text-sm font-medium text-[var(--text-main)]">{index + 1}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 font-bold text-sm text-[var(--text-main)]">{row.item}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-main)]">{row.opBal}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-main)]">{row.inDay}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-muted-alt)]">{row.dayPercent > 0 ? `${row.dayPercent}%` : '-'}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-main)]">{row.inNight}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-muted-alt)]">{row.nightPercent > 0 ? `${row.nightPercent}%` : '-'}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right font-bold text-sm text-[var(--text-main)]">{row.inTotal}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-muted)]"></td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-main)]">{row.outDay}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-main)]">{row.outNight}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right font-bold text-sm text-[var(--text-main)]">{row.outTotal}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right font-bold text-sm text-[var(--text-main)]">{row.balance}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-muted)]"></td>
                  </tr>
                ))}
                {reportData.length === 0 && (
                  <tr>
                    <td colSpan={14} className="border border-[var(--border-subtle)] px-3 py-6 text-center text-sm text-[var(--text-muted)]">
                      No stock data found for the selected date.
                    </td>
                  </tr>
                )}
                {reportData.length > 0 && (
                  <tr className="bg-[var(--bg-base)]">
                    <td colSpan={2} className="border border-[var(--border-subtle)] px-3 py-4 text-sm font-bold text-[var(--text-muted)] align-top bg-blue-500/10">ADHIKARI<br/>DAY</td>
                    <td colSpan={3} className="border border-[var(--border-subtle)] px-3 py-4"></td>
                    <td colSpan={2} className="border border-[var(--border-subtle)] px-3 py-4 text-sm font-bold text-[var(--text-muted)] align-top bg-blue-500/10">ADHIKARI<br/>NIGHT</td>
                    <td colSpan={3} className="border border-[var(--border-subtle)] px-3 py-4"></td>
                    <td colSpan={2} className="border border-[var(--border-subtle)] px-3 py-4 text-sm font-bold text-[var(--text-muted)] align-top bg-blue-500/10">HEAD ADHIKARI</td>
                    <td colSpan={2} className="border border-[var(--border-subtle)] px-3 py-4"></td>
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

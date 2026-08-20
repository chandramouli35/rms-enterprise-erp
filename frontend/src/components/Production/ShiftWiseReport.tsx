import React, { useState, useEffect } from 'react';
import { usePlantStore } from '../../store/plantStore';
import api from '../../api/axios';
import { Download } from 'lucide-react';

export const ShiftWiseReport = () => {
  const activePlant = usePlantStore((state) => state.activePlant);
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [reportData, setReportData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const plantId = activePlant?.id || 'global';
        const response = await api.get(`/production/shift-wise-stock-report?plantId=${plantId}&date=${date}`);
        setReportData(response.data.reportData || []);
        setSummary(response.data.summary || null);
      } catch (error) {
        console.error('Error fetching report', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [activePlant?.id, date]);

  const handleExport = () => {
    console.log('Exporting to Excel...');
  };

  return (
    <div className="flex flex-col gap-6 flex-1 pb-10">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[var(--text-main)]">Shift-Wise Report (Internal vs External)</h2>
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
                  <th className="border border-[var(--border-subtle)] px-3 py-2 text-center align-middle font-bold text-sm bg-[var(--bg-base)] text-[var(--text-muted)]" rowSpan={2}>OPENING<br/>BALANCE</th>
                  <th className="border border-[var(--border-subtle)] px-3 py-2 text-center align-middle font-bold text-sm bg-blue-500/10 text-blue-600" colSpan={3}>PRODUCTION IN (Internal)</th>
                  <th className="border border-[var(--border-subtle)] px-3 py-2 text-center align-middle font-bold text-sm bg-purple-500/10 text-purple-600" colSpan={3}>GATE PASS IN (External)</th>
                  <th className="border border-[var(--border-subtle)] px-3 py-2 text-center align-middle font-bold text-sm bg-amber-500/10 text-amber-600" colSpan={3}>USAGE OUT (Internal)</th>
                  <th className="border border-[var(--border-subtle)] px-3 py-2 text-center align-middle font-bold text-sm bg-red-500/10 text-red-600" colSpan={3}>GATE PASS OUT (External)</th>
                  <th className="border border-[var(--border-subtle)] px-3 py-2 text-center align-middle font-bold text-sm bg-[var(--bg-base)] text-[var(--text-muted)]" rowSpan={2}>CLOSING<br/>BALANCE</th>
                  <th className="border border-[var(--border-subtle)] px-3 py-2 text-center align-middle font-bold text-sm bg-[var(--bg-base)] text-[var(--text-muted)]" rowSpan={2}>NET RICE<br/>PROD</th>
                  <th className="border border-[var(--border-subtle)] px-3 py-2 text-center align-middle font-bold text-sm bg-[var(--bg-base)] text-[var(--text-muted)]" rowSpan={2}>BAGS</th>
                </tr>
                <tr>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">DAY</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">NIGHT</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">TOTAL</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">DAY</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">NIGHT</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">TOTAL</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">DAY</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">NIGHT</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">TOTAL</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">DAY</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">NIGHT</th>
                  <th className="border border-[var(--border-subtle)] px-2 py-1 text-center text-xs font-semibold bg-[var(--bg-base)] text-[var(--text-muted)]">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, index) => (
                  <tr key={index} className="hover:bg-[var(--bg-base)] transition-colors">
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-center text-sm font-medium text-[var(--text-main)]">{index + 1}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 font-bold text-sm text-[var(--text-main)]">{row.item}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-main)]">{row.opBal}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-main)]">{row.prodInDay}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-main)]">{row.prodInNight}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right font-bold text-sm text-[var(--text-main)]">{row.prodInTotal}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-main)]">{row.gpInDay}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-main)]">{row.gpInNight}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right font-bold text-sm text-[var(--text-main)]">{row.gpInTotal}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-main)]">{row.usageOutDay}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-main)]">{row.usageOutNight}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right font-bold text-sm text-[var(--text-main)]">{row.usageOutTotal}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-main)]">{row.gpOutDay}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-main)]">{row.gpOutNight}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right font-bold text-sm text-[var(--text-main)]">{row.gpOutTotal}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right font-bold text-sm text-[var(--text-main)]">{row.balance}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm font-semibold text-emerald-600">{row.netRiceProd ?? '-'}</td>
                    <td className="border border-[var(--border-subtle)] px-3 py-2 text-right text-sm text-[var(--text-main)]">{row.bags || 0}</td>
                  </tr>
                ))}
                {reportData.length === 0 && (
                  <tr>
                    <td colSpan={18} className="border border-[var(--border-subtle)] px-3 py-6 text-center text-sm text-[var(--text-muted)]">
                      No stock data found for the selected date.
                    </td>
                  </tr>
                )}
                {reportData.length > 0 && (
                  <tr className="bg-[var(--bg-base)]">
                    <td colSpan={2} className="border border-[var(--border-subtle)] px-4 py-8 text-sm font-bold text-[var(--text-main)] align-top bg-white/5">
                      <div className="h-16">Munim sign &amp; stamp</div>
                    </td>
                    <td colSpan={7} className="border border-[var(--border-subtle)] px-4 py-8 text-sm font-bold text-[var(--text-main)] align-top bg-white/5">
                      <div className="h-16">Main Munim sign &amp; stamp</div>
                    </td>
                    <td colSpan={9} className="border border-[var(--border-subtle)] px-4 py-2 align-top bg-white/5">
                      <div className="font-bold text-sm text-[var(--text-main)] mb-1">NOTE</div>
                      <div className="h-16 border border-[var(--border-subtle)] rounded bg-[var(--bg-panel)] w-full"></div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* 100% Coverage: Dedicated Summary Section for the far right column metrics from Page 17 */}
      {summary && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
            <h3 className="text-md font-bold text-blue-600 mb-4 border-b border-[var(--border-subtle)] pb-2">DAY SHIFT SUMMARY</h3>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-[var(--text-muted)]">Final Rice Day</span>
              <span className="text-sm font-bold text-[var(--text-main)]">{summary.finalRiceDay || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-[var(--text-muted)]">Total Rice Input Day (-)</span>
              <span className="text-sm font-bold text-red-500">{summary.totalRiceInputDay || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-[var(--border-subtle)] mt-2 pt-2">
              <span className="text-sm font-bold text-[var(--text-main)]">Net Rice Production Day</span>
              <span className="text-sm font-bold text-emerald-600">{summary.netRiceProductionDay || 0}</span>
            </div>
          </div>

          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
            <h3 className="text-md font-bold text-purple-600 mb-4 border-b border-[var(--border-subtle)] pb-2">NIGHT SHIFT SUMMARY</h3>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-[var(--text-muted)]">Final Rice Night</span>
              <span className="text-sm font-bold text-[var(--text-main)]">{summary.finalRiceNight || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-[var(--text-muted)]">Total Rice Input Night (-)</span>
              <span className="text-sm font-bold text-red-500">{summary.totalRiceInputNight || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-[var(--border-subtle)] mt-2 pt-2">
              <span className="text-sm font-bold text-[var(--text-main)]">Net Rice Production Night</span>
              <span className="text-sm font-bold text-emerald-600">{summary.netRiceProductionNight || 0}</span>
            </div>
          </div>

          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
            <h3 className="text-md font-bold text-amber-600 mb-4 border-b border-[var(--border-subtle)] pb-2">WAGON DELIVERY SUMMARY</h3>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-[var(--text-muted)]">Rice Wagon Delivered (Prev)</span>
              <span className="text-sm font-bold text-[var(--text-main)]">{summary.riceWagonDelivered || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-[var(--text-muted)]">Today Delivery (+)</span>
              <span className="text-sm font-bold text-emerald-600">{summary.todayDelivery || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-[var(--border-subtle)] mt-2 pt-2">
              <span className="text-sm font-bold text-[var(--text-main)]">Total Rice Wagons Delivered</span>
              <span className="text-sm font-bold text-[var(--text-main)]">{summary.totalRiceWagonsDelivered || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

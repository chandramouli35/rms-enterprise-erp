import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { usePlantStore } from '../store/plantStore';
import { Search, Download, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

interface HoodiRecord {
  id: string;
  date: string;
  gpNo: string | null;
  mandiGpNo: string | null;
  truckNo: string | null;
  supplierName: string | null;
  mandiName: string | null;
  stackNo: string | null;
  moisture: number | null;
  bags: number | null;
  unloadedBy: string | null;
  sourceType: string;
}

export default function DailyHoodiReport() {
  const activePlant = usePlantStore(state => state.activePlant);
  const [data, setData] = useState<HoodiRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, [activePlant?.id, dateFrom, dateTo]);

  const fetchData = async () => {
    if (!activePlant) return;
    setLoading(true);
    try {
      const response = await api.get('/api/procurement/reports/hoodi-summary', {
        params: {
          plantId: activePlant.id,
          dateFrom,
          dateTo
        }
      });
      setData(response.data || []);
    } catch (error) {
      console.error('Error fetching hoodi report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = data.map(row => ({
      "Date": new Date(row.date).toLocaleDateString(),
      "GP No": row.gpNo || '-',
      "Mandi GP No": row.mandiGpNo || '-',
      "Truck No": row.truckNo || '-',
      "Party Name": row.supplierName || '-',
      "Mandi": row.mandiName || '-',
      "Stack no.": row.stackNo || '-',
      "Moisture": row.moisture || '-',
      "Bags": row.bags || 0,
      "Unloaded By": row.unloadedBy || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Hoodi Record');
    XLSX.writeFile(wb, `Daily_Hoodi_Record.xlsx`);
  };

  return (
    <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] shadow-sm">
      <div className="p-4 border-b border-[var(--border-subtle)] flex flex-wrap gap-4 items-center justify-between bg-gradient-to-r from-[var(--bg-panel)] to-[var(--bg-panel-hover)] rounded-t-xl">
        <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
          <div className="p-1.5 bg-orange-500/10 rounded-lg text-[#e67e00]">
            <Calendar size={20} />
          </div>
          Daily Hoodi Record
        </h2>
        
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--text-muted-alt)] font-medium">From</label>
            <input 
              type="date" 
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-main)] outline-none focus:border-[#e67e00] transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--text-muted-alt)] font-medium">To</label>
            <input 
              type="date" 
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-main)] outline-none focus:border-[#e67e00] transition-colors"
            />
          </div>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 bg-[#e67e00] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm"
          >
            <Search size={16} /> Filter
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-[var(--bg-app)] border border-[var(--border-subtle)] text-[var(--text-main)] px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-[var(--bg-panel-hover)] transition-colors"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--bg-panel-hover)]">
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">GP No</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Mandi GP No</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Truck No</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Party Name</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Mandi</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Stack no.</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Moisture</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Bags</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Unloaded By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center">
                  <div className="flex justify-center items-center gap-2 text-[var(--text-muted-alt)]">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#e67e00]"></div>
                    Loading records...
                  </div>
                </td>
              </tr>
            ) : data.length > 0 ? (
              data.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--bg-panel-hover)] transition-colors">
                  <td className="px-4 py-3 text-sm text-[var(--text-main)]">{new Date(row.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm font-mono text-[var(--text-main)]">{row.gpNo || '-'}</td>
                  <td className="px-4 py-3 text-sm font-mono text-[var(--text-main)]">{row.mandiGpNo || '-'}</td>
                  <td className="px-4 py-3 text-sm font-mono text-[var(--text-main)]">{row.truckNo || '-'}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-main)] font-medium">
                    {row.sourceType === 'STACK_TRANSFER' ? <span className="text-xs text-gray-400 italic">N/A</span> : (row.supplierName || '-')}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-main)]">
                    {row.sourceType === 'STACK_TRANSFER' ? <span className="text-xs text-gray-400 italic">N/A</span> : (row.mandiName || '-')}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono font-bold text-[var(--text-main)]">{row.stackNo || '-'}</td>
                  <td className="px-4 py-3 text-sm font-mono text-[var(--text-main)]">{row.moisture || '-'}</td>
                  <td className="px-4 py-3 text-sm font-mono text-[#e67e00] font-bold">{row.bags || 0}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-main)]">{row.unloadedBy || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-[var(--text-muted-alt)]">
                  No hoodi records found for the selected date range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import api from '../api/axios';
import { exportToExcel } from '../utils/exportUtils';

export default function ShortageRecoveryReport({ activePlant }: { activePlant: any }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    mandiId: '',
    supplierId: '',
    groupBy: 'none' // 'none', 'mill', 'mandi', 'artia'
  });

  const fetchData = async () => {
    if (!activePlant) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.groupBy === 'mill') {
        params.append('plantId', activePlant.id);
      } else if (filters.groupBy === 'mandi') {
        if (filters.mandiId) params.append('mandiId', filters.mandiId);
      } else if (filters.groupBy === 'artia') {
        if (filters.supplierId) params.append('supplierId', filters.supplierId);
      } else {
        params.append('plantId', activePlant.id); // Default to current mill
      }
      
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const res = await api.get(`/api/procurement/reports/shortage-summary?${params.toString()}`);
      
      // If we need to group them visually, we can just sort by the selected group
      let sortedData = [...res.data];
      if (filters.groupBy === 'mandi') {
        sortedData.sort((a, b) => (a.mandiName || '').localeCompare(b.mandiName || ''));
      } else if (filters.groupBy === 'artia') {
        sortedData.sort((a, b) => (a.supplierName || '').localeCompare(b.supplierName || ''));
      }
      
      setData(sortedData);
    } catch (err) {
      console.error('Error fetching shortage recovery report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activePlant, filters]);

  const handlePunchRecovery = async (id: string, value: string) => {
    const val = parseFloat(value);
    if (isNaN(val)) return;

    try {
      await api.patch(`/api/procurement/inward-details/${id}/shortage-recovery`, {
        shortageRecoveryQtl: val
      });
      fetchData(); // Refresh to get calculated net amounts
    } catch (err) {
      console.error('Error updating shortage recovery', err);
    }
  };

  const handleExport = () => {
    const exportData = data.map(row => ({
      "Date": new Date(row.date).toLocaleDateString(),
      "Mandi Name": row.mandiName || 'Unknown',
      "Artia Name": row.supplierName || 'Unknown',
      "Mill GP": row.millGp || '-',
      "Agency GP": row.agencyGp || '-',
      "Truck No": row.truckNo,
      "Shortage": row.shortageQtl,
      "Shortage Recovery": row.shortageRecoveryQtl,
      "Net shortage Qtl": row.netShortageQtl,
      "Net shortage bags": row.netShortageBags
    }));
    exportToExcel(exportData, `Shortage_Recovery_Report_${filters.groupBy}`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-[var(--text-main)]">Shortage Summary Report</h2>
        <button onClick={handleExport} className="flex items-center gap-2 bg-[#e67e00] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#cc7000] transition-colors">
          <Download size={16} />
          Export Report
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-muted-alt)]">From Date</label>
          <input 
            type="date" 
            value={filters.dateFrom}
            onChange={(e) => setFilters(p => ({...p, dateFrom: e.target.value}))}
            className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-main)] px-3 py-1.5 rounded text-sm outline-none focus:border-[#e67e00]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-muted-alt)]">To Date</label>
          <input 
            type="date" 
            value={filters.dateTo}
            onChange={(e) => setFilters(p => ({...p, dateTo: e.target.value}))}
            className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-main)] px-3 py-1.5 rounded text-sm outline-none focus:border-[#e67e00]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-muted-alt)]">Report View</label>
          <select 
            value={filters.groupBy}
            onChange={(e) => setFilters(p => ({...p, groupBy: e.target.value}))}
            className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-main)] px-3 py-1.5 rounded text-sm outline-none focus:border-[#e67e00]"
          >
            <option value="mill">Mill-wise Report</option>
            <option value="mandi">Mandi-wise Report</option>
            <option value="artia">Artia-wise Report</option>
          </select>
        </div>
      </div>

      <div className="flex-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-sm flex flex-col relative">
        {loading && (
          <div className="absolute inset-0 bg-[var(--bg-panel)]/50 flex items-center justify-center z-10">
            <div className="w-8 h-8 border-4 border-[#e67e00] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-subtle)]">
                <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Mandi Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Artia Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Mill GP</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Agency GP</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Truck No.</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Shortage</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Shortage Recovery</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Net shortage Qtl</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Net shortage bags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filters.groupBy === 'mill' || filters.groupBy === 'mandi' || filters.groupBy === 'artia' ? (
                Object.entries(
                  data.reduce((acc, row) => {
                    let key = 'Unknown';
                    if (filters.groupBy === 'mill') key = activePlant?.name || 'Unknown';
                    else if (filters.groupBy === 'mandi') key = row.mandiName || 'Unknown';
                    else if (filters.groupBy === 'artia') key = row.supplierName || 'Unknown';
                    
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(row);
                    return acc;
                  }, {} as Record<string, any[]>)
                ).map(([groupKey, groupRows]: [string, any], groupIdx) => (
                  <React.Fragment key={groupIdx}>
                    <tr className="bg-[var(--bg-panel-hover)]">
                      <td colSpan={10} className="px-4 py-2 font-bold text-[#e67e00] bg-orange-500/10 border-y border-orange-500/20">
                        {filters.groupBy === 'mill' ? 'Mill' : filters.groupBy === 'mandi' ? 'Mandi' : 'Artia'}: {groupKey} 
                        <span className="text-xs text-[var(--text-muted-alt)] ml-2">({groupRows.length} records)</span>
                      </td>
                    </tr>
                    {groupRows.map((row: any, idx: number) => (
                      <tr key={`${groupIdx}-${idx}`} className="hover:bg-[var(--bg-muted)] transition-colors">
                        <td className="px-4 py-3 text-sm text-[var(--text-main)]">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text-main)]">{row.mandiName || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text-main)] font-bold">{row.supplierName || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text-main)]">{row.millGp || '-'}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text-main)]">{row.agencyGp || '-'}</td>
                        <td className="px-4 py-3 text-sm font-mono text-[var(--text-main)]">{row.truckNo}</td>
                        <td className="px-4 py-3 text-sm font-mono text-red-400 font-bold">{row.shortageQtl.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-mono">
                          <input 
                            type="number"
                            step="0.01"
                            defaultValue={row.shortageRecoveryQtl}
                            onBlur={(e) => {
                              if (parseFloat(e.target.value) !== row.shortageRecoveryQtl) {
                                handlePunchRecovery(row.id, e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            className="w-24 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1 text-right outline-none focus:border-[#e67e00]"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-[var(--text-main)]">{row.netShortageQtl.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-mono text-[var(--text-main)]">{row.netShortageBags.toFixed(2)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[var(--bg-muted)] transition-colors">
                    <td className="px-4 py-3 text-sm text-[var(--text-main)]">{new Date(row.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-main)]">{row.mandiName || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-main)] font-bold">{row.supplierName || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-main)]">{row.millGp || '-'}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-main)]">{row.agencyGp || '-'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-[var(--text-main)]">{row.truckNo}</td>
                    <td className="px-4 py-3 text-sm font-mono text-red-400 font-bold">{row.shortageQtl.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-mono">
                      <input 
                        type="number"
                        step="0.01"
                        defaultValue={row.shortageRecoveryQtl}
                        onBlur={(e) => {
                          if (parseFloat(e.target.value) !== row.shortageRecoveryQtl) {
                            handlePunchRecovery(row.id, e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-24 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1 text-right outline-none focus:border-[#e67e00]"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-[var(--text-main)]">{row.netShortageQtl.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-[var(--text-main)]">{row.netShortageBags.toFixed(2)}</td>
                  </tr>
                ))
              )}
              {data.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-[var(--text-muted-alt)]">
                    No shortage records found for the selected filters.
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

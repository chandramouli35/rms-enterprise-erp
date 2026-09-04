import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

interface CompareReportsProps {
  onMillClick?: (millName: string) => void;
}

export const CompareReports: React.FC<CompareReportsProps> = ({ onMillClick }) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Determine mode: if both dates are filled and different => date-range (Table B), otherwise batch-wise (Table A)
  const isDateRangeMode = dateFrom !== '' && dateTo !== '' && dateFrom !== dateTo;

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let res;
      if (isDateRangeMode) {
        // Table B: Date-Range Comparison
        res = await api.get(`/production/compare-date-range?dateFrom=${dateFrom}&dateTo=${dateTo}`);
      } else {
        // Table A: Batch-Wise Comparison (use selected date or today)
        const batchDate = dateFrom || new Date().toISOString().split('T')[0];
        res = await api.get(`/production/compare-batch-wise?date=${batchDate}`);
      }
      setData(res.data);
    } catch (error) {
      console.error("Error fetching compare data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearDates = () => {
    setDateFrom('');
    setDateTo('');
  };

  const comparisonData = data?.comparisonData || null;
  const rawBatches = data?.rawBatches || [];
  
  const mills = comparisonData ? Object.keys(comparisonData) : [];
  const rows = [
    'R. Bran', 'K. Phuck', 'Broken Rice', 'Nakku 1', 'Nakku 2',
    'Rejection', 'Final Rice', 'Net rice'
  ];

  const isSingleDay = !isDateRangeMode;

  const intermillBatches = rawBatches.filter((b: any) => b.productionState === 'INTERMILL_PROCESSING');
  const paddyDryingBatches = rawBatches.filter((b: any) => b.productionState === 'PADDY_DRYING');
  const plantOffBatches = rawBatches.filter((b: any) => b.productionState === 'PLANT_OFF');

  const renderBatchTable = (batches: any[], title: string, stateColorClass: string, stateName: string) => {
    if (batches.length === 0) return null;
    return (
      <div className="mt-8">
        <h3 className="text-md font-bold text-[var(--text-main)] mb-3">{title}</h3>
        <div className="border border-[var(--border-subtle)] rounded overflow-x-auto">
          <table className="w-full text-left text-sm text-[var(--text-main)] border-collapse">
            <thead className="bg-[var(--bg-panel-alt)]">
              <tr>
                <th className="p-2 border-b border-r border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">State</th>
                <th className="p-2 border-b border-r border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Mill</th>
                <th className="p-2 border-b border-r border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Batch No.</th>
                <th className="p-2 border-b border-r border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Date</th>
                <th className="p-2 border-b border-r border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Shift</th>
                <th className="p-2 border-b border-r border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Supervisor</th>
                <th className="p-2 border-b border-r border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Raw Material & Qty</th>
                <th className="p-2 border-b border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Expected Output & Qty</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch: any) => (
                <tr key={batch.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-panel-hover)]">
                  <td className="p-2 border-r border-[var(--border-subtle)] font-medium text-[var(--text-main)]">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${stateColorClass}`}>
                      {stateName}
                    </span>
                  </td>
                  <td className="p-2 border-r border-[var(--border-subtle)] font-medium text-[#e67e00]">{batch.plant?.name || 'Unknown'}</td>
                  <td className="p-2 border-r border-[var(--border-subtle)] text-[var(--text-muted)]">{batch.batchNo}</td>
                  <td className="p-2 border-r border-[var(--border-subtle)] text-[var(--text-muted)]">{new Date(batch.date).toLocaleDateString()}</td>
                  <td className="p-2 border-r border-[var(--border-subtle)] text-[var(--text-muted)]">{batch.shift}</td>
                  <td className="p-2 border-r border-[var(--border-subtle)] text-[var(--text-muted)]">{batch.supervisorName || '-'}</td>
                  <td className="p-2 border-r border-[var(--border-subtle)] text-[var(--text-muted)]">
                    {batch.productionState === 'PADDY_DRYING' ? `${batch.paddyType || 'Paddy'} (${batch.paddyUsedQty || 0} MT)` :
                     batch.productionState === 'INTERMILL_PROCESSING' ? `Inputs (${batch.paddyUsedQty || 0} MT)` : '-'}
                  </td>
                  <td className="p-2 border-[var(--border-subtle)] text-[var(--text-muted)]">
                    {batch.productionState === 'PADDY_DRYING' ? `Dried Paddy (${batch.riceProducedQty || 0} MT)` :
                     batch.productionState === 'INTERMILL_PROCESSING' ? `Processed (${batch.riceProducedQty || 0} MT)` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-8 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-panel-alt)] flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--text-main)]">Mill Comparison Reports</h2>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[var(--text-muted)]">From:</label>
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)}
              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-sm text-[var(--text-main)] outline-none focus:border-[#e67e00]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[var(--text-muted)]">To:</label>
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)}
              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-sm text-[var(--text-main)] outline-none focus:border-[#e67e00]"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={handleClearDates}
              className="px-3 py-1 text-xs font-medium rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors border border-red-500/30"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="p-4 overflow-x-auto">
        <h3 className="text-md font-bold text-[var(--text-main)] mb-3">
          {isDateRangeMode ? 'Table B: Date-Range Comparison' : 'Table A: Batch-Wise Comparison'}
        </h3>
        
        {loading ? (
          <div className="text-center py-10 text-[var(--text-muted-alt)]">Loading comparison data...</div>
        ) : !comparisonData || mills.length === 0 ? (
          <div className="text-center py-10 text-[var(--text-muted-alt)]">No data available for the selected dates.</div>
        ) : (
          <div className="border border-[var(--border-subtle)] rounded overflow-x-auto">
            <table className="w-full text-left text-sm text-[var(--text-main)] border-collapse">
              <thead className="bg-[var(--bg-panel-alt)]">
                <tr>
                  <th className="p-2 border-b border-r border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider" rowSpan={2}>
                    Items
                  </th>
                  {mills.map(mill => (
                    <th 
                      key={mill} 
                      colSpan={isSingleDay ? 4 : 2} 
                      className="p-2 border-b border-r border-[var(--border-subtle)] text-center cursor-pointer hover:bg-[var(--bg-panel-hover)] transition-colors"
                      onClick={() => onMillClick?.(mill)}
                    >
                      <span className="font-bold text-[#e67e00] hover:underline">{mill}</span>
                    </th>
                  ))}
                </tr>
                <tr>
                  {mills.map(mill => (
                    <React.Fragment key={mill + "-cols"}>
                      {isSingleDay ? (
                        <>
                          <th className="p-2 border-b border-r border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)]">Batch 01 (Days)</th>
                          <th className="p-2 border-b border-r border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)]">Batch 02 (Night)</th>
                          <th className="p-2 border-b border-r border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)]">Total</th>
                        </>
                      ) : (
                        <th className="p-2 border-b border-r border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)]">Production (From - to Date)</th>
                      )}
                      <th className="p-2 border-b border-r border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)]">
                        <div>{isSingleDay ? '(%) Yield Percentage' : '% age as per yield'}</div>
                        <div className="text-[10px] text-blue-400 font-normal mt-0.5">(Diff in yield)</div>
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(item => (
                  <tr key={item} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-panel-hover)]">
                    <td className="p-2 border-r border-[var(--border-subtle)] font-medium text-[var(--text-main)]">{item}</td>
                    {mills.map(mill => {
                      const mData = comparisonData[mill]?.[item] || {};
                      
                      return (
                        <React.Fragment key={mill + "-" + item}>
                          {isSingleDay ? (
                            <>
                              <td className="p-2 border-r border-[var(--border-subtle)] text-right">{mData.day || 0}</td>
                              <td className="p-2 border-r border-[var(--border-subtle)] text-right">{mData.night || 0}</td>
                              <td className="p-2 border-r border-[var(--border-subtle)] text-right font-medium">{mData.total || 0}</td>
                            </>
                          ) : (
                            <td className="p-2 border-r border-[var(--border-subtle)] text-right font-medium">{mData.production || 0}</td>
                          )}
                          <td className="p-2 border-r border-[var(--border-subtle)] text-right text-blue-400">
                            <span className="font-medium text-[var(--text-main)]">
                              {mData.yieldPercent !== null && mData.yieldPercent !== undefined ? `${mData.yieldPercent}%` : '-'}
                            </span>
                            {mData.diffInYield !== null && mData.diffInYield !== undefined && (
                              <span className={`ml-2 text-[11px] font-bold ${mData.diffInYield < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                ({mData.diffInYield > 0 ? '+' : ''}{mData.diffInYield})
                              </span>
                            )}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
                
                {/* Paddy Drying Row (Must be at the very bottom per requirements) */}
                <tr className="bg-[var(--bg-panel-alt)] border-b border-[var(--border-subtle)] hover:bg-[var(--bg-panel-hover)]">
                  <td className="p-2 border-r border-[var(--border-subtle)] font-bold text-[var(--text-main)]">Paddy Drying</td>
                  {mills.map(mill => {
                    const pdData = data[mill]?.['Paddy Drying'] || {};
                    return (
                      <React.Fragment key={mill + "-pd"}>
                        {isSingleDay ? (
                          <>
                            <td className="p-2 border-r border-[var(--border-subtle)] text-right">{pdData.day || 0}</td>
                            <td className="p-2 border-r border-[var(--border-subtle)] text-right">{pdData.night || 0}</td>
                            <td className="p-2 border-r border-[var(--border-subtle)] text-right font-medium">{pdData.total || 0}</td>
                          </>
                        ) : (
                          <td className="p-2 border-r border-[var(--border-subtle)] text-right font-medium">{pdData.production || 0}</td>
                        )}
                        <td className="p-2 border-r border-[var(--border-subtle)] text-right text-gray-500">-</td>
                      </React.Fragment>
                    );
                  })}
                </tr>

              </tbody>
            </table>
          </div>
        )}

        {/* 2. Middle: Intermill Processing (Mill-wise) */}
        {renderBatchTable(intermillBatches, "Intermill Processing (Mill-wise)", "bg-blue-500/20 text-blue-500", "Intermill Processing")}
        
        {/* 3. Lower Middle: Paddy Processing / Paddy Drying (Mill-wise) */}
        {renderBatchTable(paddyDryingBatches, "Paddy Processing / Paddy Drying (Mill-wise)", "bg-yellow-500/20 text-yellow-500", "Paddy Drying")}
        
        {/* 4. Bottom: Plant Off records (Mill-wise) */}
        {renderBatchTable(plantOffBatches, "Plant Off Records (Mill-wise)", "bg-red-500/20 text-red-500", "Plant Off")}
        
      </div>
    </div>
  );
};

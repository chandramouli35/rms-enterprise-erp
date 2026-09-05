import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { exportToPDF } from '../../utils/exportUtils';
import { CustomModal } from '../CustomModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AdminAnalysisReportProps {}

export default function AdminAnalysisReport({}: AdminAnalysisReportProps) {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState<any>(null);

  useEffect(() => {
    fetchReport();
  }, [date]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/production/analysis-report?date=${date}`);
      setReportData(res.data);
    } catch (err) {
      console.error('Failed to fetch analysis report', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDrillDown = (plantName: string, shift: string) => {
    const records = reportData?.[plantName]?.[shift]?.rawRecords || [];
    setSelectedFirm({ plantName, shift, records });
  };

  const renderTable = (plantName: string) => {
    const plant = reportData[plantName];
    if (!plant) return null;

    const shifts = ['Day Shift', 'Night Shift'];

    return (
      <div key={plantName} className="mb-6 bg-[var(--bg-elevated)] p-4 rounded-lg shadow border border-[var(--border-subtle)]">
        <h3 className="text-md font-bold mb-3 text-[var(--text-main)] cursor-pointer hover:text-[#e67e00]" onClick={() => handleDrillDown(plantName, 'Day Shift')}>
          {plantName}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse border border-[var(--border-subtle)]">
            <thead className="bg-[var(--bg-base)] text-[var(--text-muted)] text-[10px] uppercase">
              <tr>
                <th className="px-2 py-2 border border-[var(--border-subtle)]">Date</th>
                <th className="px-2 py-2 border border-[var(--border-subtle)] whitespace-nowrap">Paddy moisture</th>
                <th className="px-2 py-2 border border-[var(--border-subtle)] whitespace-nowrap">Khanjan Broken</th>
                <th className="px-2 py-2 border border-[var(--border-subtle)] whitespace-nowrap">Polisher 01</th>
                <th className="px-2 py-2 border border-[var(--border-subtle)] whitespace-nowrap">Polisher 02</th>
                <th className="px-2 py-2 border border-[var(--border-subtle)] whitespace-nowrap">Polisher 03</th>
                <th className="px-2 py-2 border border-[var(--border-subtle)] whitespace-nowrap">Polisher 04</th>
                <th className="px-2 py-2 border border-[var(--border-subtle)] whitespace-nowrap">Difference 01-04</th>
                <th className="px-2 py-2 border border-[var(--border-subtle)] whitespace-nowrap">Parmala Broken</th>
                <th className="px-2 py-2 border border-[var(--border-subtle)] whitespace-nowrap">Rice Broken</th>
                <th className="px-2 py-2 border border-[var(--border-subtle)] whitespace-nowrap">Rice Moisture</th>
                <th className="px-2 py-2 border border-[var(--border-subtle)] whitespace-nowrap">Damage %</th>
                <th className="px-2 py-2 border border-[var(--border-subtle)] whitespace-nowrap">Discolour %</th>
                <th className="px-2 py-2 border border-[var(--border-subtle)] whitespace-nowrap">FRK %</th>
                <th className="px-2 py-2 border border-[var(--border-subtle)] whitespace-nowrap">Supervisor</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift, idx) => {
                const row = plant[shift]?.averages || {};
                return (
                  <tr key={shift} className={`hover:bg-[var(--bg-base)] cursor-pointer ${idx === 0 ? 'border-b border-[var(--border-subtle)]' : ''}`} onClick={() => handleDrillDown(plantName, shift)}>
                    <td className="px-2 py-2 border-r border-[var(--border-subtle)] font-medium">
                      {shift === 'Day Shift' ? 'Day' : 'Night'}
                    </td>
                    <td className="px-2 py-2 border-r border-[var(--border-subtle)]">{row.paddyMoisture || '-'}</td>
                    <td className="px-2 py-2 border-r border-[var(--border-subtle)]">{row.khanjanBroken || '-'}</td>
                    <td className="px-2 py-2 border-r border-[var(--border-subtle)]">{row.polisher1 || '-'}</td>
                    <td className="px-2 py-2 border-r border-[var(--border-subtle)]">{row.polisher2 || '-'}</td>
                    <td className="px-2 py-2 border-r border-[var(--border-subtle)]">{row.polisher3 || '-'}</td>
                    <td className="px-2 py-2 border-r border-[var(--border-subtle)]">{row.polisher4 || '-'}</td>
                    <td className="px-2 py-2 border-r border-[var(--border-subtle)]">{row.difference1To4 || '-'}</td>
                    <td className="px-2 py-2 border-r border-[var(--border-subtle)]">{row.pamalaBroken || '-'}</td>
                    <td className="px-2 py-2 border-r border-[var(--border-subtle)]">{row.finalBroken || '-'}</td>
                    <td className="px-2 py-2 border-r border-[var(--border-subtle)]">{row.riceMoisture || '-'}</td>
                    <td className="px-2 py-2 border-r border-[var(--border-subtle)]">{row.damagePercent || '-'}</td>
                    <td className="px-2 py-2 border-r border-[var(--border-subtle)]">{row.discolourPercent || '-'}</td>
                    <td className="px-2 py-2 border-r border-[var(--border-subtle)]">
                      {row.frkPercent || '-'}
                      {shift === 'Day Shift' && <div className="text-[8px] text-[var(--text-muted-alt)] mt-1">Shows the avg data of shift</div>}
                    </td>
                    <td className="px-2 py-2 text-blue-400 font-medium">{row.supervisorName || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-8 print-area">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-[var(--text-main)]">Analysis Report Checklist</h2>
        <div className="flex gap-4 items-center">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm px-3 py-1.5 rounded text-[var(--text-main)] outline-none focus:border-[#e67e00]"
          />
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 bg-[#e67e00] hover:bg-[#cc7000] text-black font-bold rounded shadow flex items-center gap-2 text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-[var(--text-muted)]">Loading Analysis Report...</div>
      ) : (
        <div>
          {reportData && Object.keys(reportData).length > 0 ? (
            Object.keys(reportData).map(plantName => renderTable(plantName))
          ) : (
            <div className="text-center py-8 text-[var(--text-muted)]">No data found for this date.</div>
          )}
        </div>
      )}

      {selectedFirm && (
        <CustomModal
          isOpen={!!selectedFirm}
          onClose={() => setSelectedFirm(null)}
          title={`${selectedFirm.plantName} - ${selectedFirm.shift} Details`}
        >
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {selectedFirm.records.length > 0 ? (
              <table className="w-full text-xs text-left border-collapse border border-[var(--border-subtle)]">
                <thead className="bg-[var(--bg-base)] text-[var(--text-muted)]">
                  <tr>
                    <th className="px-2 py-1 border border-[var(--border-subtle)]">Time</th>
                    <th className="px-2 py-1 border border-[var(--border-subtle)]">Batch ID</th>
                    <th className="px-2 py-1 border border-[var(--border-subtle)]">Paddy Moisture</th>
                    <th className="px-2 py-1 border border-[var(--border-subtle)]">Rice Broken</th>
                    <th className="px-2 py-1 border border-[var(--border-subtle)]">Rice Moisture</th>
                    <th className="px-2 py-1 border border-[var(--border-subtle)]">Supervisor</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFirm.records.map((r: any) => (
                    <tr key={r.id}>
                      <td className="px-2 py-1 border border-[var(--border-subtle)]">{new Date(r.entryTime).toLocaleTimeString()}</td>
                      <td className="px-2 py-1 border border-[var(--border-subtle)] font-mono">{r.productionBatchId.substring(0,8)}</td>
                      <td className="px-2 py-1 border border-[var(--border-subtle)]">{r.paddyMoisture || '-'}</td>
                      <td className="px-2 py-1 border border-[var(--border-subtle)]">{r.finalBroken || '-'}</td>
                      <td className="px-2 py-1 border border-[var(--border-subtle)]">{r.riceMoisture || '-'}</td>
                      <td className="px-2 py-1 border border-[var(--border-subtle)]">{r.supervisorName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-[var(--text-muted)]">No individual records found for this shift.</p>
            )}
          </div>
        </CustomModal>
      )}
    </div>
  );
}

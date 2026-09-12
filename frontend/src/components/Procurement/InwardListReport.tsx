import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Printer, Fingerprint, Eye, Edit, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useMandiStore } from '../../store/mandiStore';
import { biometricService } from '../../services/biometricService';
import { CustomModal } from '../CustomModal';
import Combobox from '../Combobox';
import { exportToExcel } from '../../utils/exportUtils';

type ListMode = 'govt' | 'mill';

interface Props {
  activePlant: any;
  suppliers: any[];
  onView?: (row: any) => void;
  onContinueDraft?: (row: any) => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

/** Indian paddy season typically starts 1 Oct */
function seasonStartStr(ref = new Date()) {
  const y = ref.getMonth() >= 9 ? ref.getFullYear() : ref.getFullYear() - 1;
  return `${y}-10-01`;
}

export default function InwardListReport({ activePlant, suppliers, onView, onContinueDraft }: Props) {
  const user = useAuthStore((s) => s.user);
  const { mandis } = useMandiStore();
  const toast = (msg: string, type: 'success' | 'error' | 'info' = 'info') =>
    useUiStore.getState().addToast(msg, type);

  const [mode, setMode] = useState<ListMode>('mill');
  const [bagWt, setBagWt] = useState(0.382);
  const [supervisorDetail, setSupervisorDetail] = useState<{
    name: string;
    at: string | null;
  } | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: todayStr(),
    dateTo: todayStr(),
    mandi: '',
    supplierId: '',
  });
  const [report, setReport] = useState<any>(null);
  const [activeGpsLive, setActiveGpsLive] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [supervisorName, setSupervisorName] = useState(user?.username || '');
  const [biometricData, setBiometricData] = useState('');
  const [manualMatchConfirmed, setManualMatchConfirmed] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const plantId = activePlant?.id || 'global';
  const plantLabel = activePlant?.name || 'All Mills';

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('plantId', plantId);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.mandi) params.set('mandi', filters.mandi);
      if (filters.supplierId) params.set('supplierId', filters.supplierId);
      params.set('bagWt', String(bagWt));
      params.set('date', filters.dateTo || todayStr());
      // Feedback 35 — evening snapshot when viewing a single day (same report as submitted)
      const singleDay =
        !!filters.dateTo && (!filters.dateFrom || filters.dateFrom === filters.dateTo);
      if (singleDay && !filters.mandi && !filters.supplierId) {
        params.set('snapshot', '1');
      }
      const [res, gpsRes] = await Promise.all([
        api.get(`/api/procurement/reports/inward-list?${params}`),
        api.get(`/api/procurement/reports/active-gps?plantId=${plantId}`).catch(() => null),
      ]);
      let payload = res.data;
      // Multi-day print: merge per-day evening snapshots into dateGroups when available
      if (
        filters.dateFrom &&
        filters.dateTo &&
        filters.dateFrom !== filters.dateTo &&
        !filters.mandi &&
        !filters.supplierId
      ) {
        try {
          const days: string[] = [];
          const cursor = new Date(filters.dateFrom + 'T12:00:00');
          const end = new Date(filters.dateTo + 'T12:00:00');
          while (cursor <= end) {
            const y = cursor.getFullYear();
            const m = String(cursor.getMonth() + 1).padStart(2, '0');
            const d = String(cursor.getDate()).padStart(2, '0');
            days.push(`${y}-${m}-${d}`);
            cursor.setDate(cursor.getDate() + 1);
          }
          const snaps = await Promise.all(
            days.map((day) =>
              api
                .get(
                  `/api/procurement/reports/inward-list?plantId=${plantId}&date=${day}&dateFrom=${day}&dateTo=${day}&bagWt=${bagWt}&snapshot=1`,
                )
                .then((r) => r.data)
                .catch(() => null),
            ),
          );
          const mergedGroups = snaps
            .filter((s) => s?.fromSnapshot && s?.dateGroups?.length)
            .flatMap((s: any) => s.dateGroups);
          if (mergedGroups.length) {
            payload = {
              ...payload,
              dateGroups: mergedGroups.sort((a: any, b: any) => String(b.date).localeCompare(String(a.date))),
              fromSnapshot: true,
              snapshotMerged: true,
            };
          }
        } catch {
          /* keep live */
        }
      }
      setReport(payload);
      if (gpsRes?.data?.count != null) setActiveGpsLive(Number(gpsRes.data.count));
    } catch (e: any) {
      console.error(e);
      toast(e?.response?.data?.message || 'Failed to load inward list', 'error');
    } finally {
      setLoading(false);
    }
  }, [plantId, filters, bagWt]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Feedback 35 — dynamic Active GP indicator (poll while page open)
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const gpsRes = await api.get(`/api/procurement/reports/active-gps?plantId=${plantId}`);
        if (!cancelled && gpsRes?.data?.count != null) {
          setActiveGpsLive(Number(gpsRes.data.count));
        }
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = window.setInterval(poll, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [plantId]);

  const totals = report?.totals || { agencyBags: 0, millBags: 0, shortageBags: 0, totalBags: 0 };

  /** Feedback 35 — Artia select: always season Latest→Oldest */
  const onArtiaChange = (supplierId: string) => {
    setFilters((f) => {
      if (supplierId) {
        return {
          ...f,
          supplierId,
          dateFrom: seasonStartStr(),
          dateTo: todayStr(),
        };
      }
      return { ...f, supplierId: '' };
    });
  };

  const exportCurrent = () => {
    if (!report) return;
    if (mode === 'govt') {
      exportToExcel(
        (report.govt?.rows || []).map((r: any) => ({
          'S.No': r.sno,
          Date: r.date,
          'Agency GP': r.agencyGp,
          'Truck No': r.truckNo,
          Mandi: r.mandi,
          'Party Name': r.partyName,
          Moisture: r.moisture,
          'A Class': r.aClass,
          'B Class': r.bClass,
          'Bags at Agency GP': r.agencyBags ?? (Number(r.aClass || 0) + Number(r.bClass || 0)),
          'Mill Net Weight': r.millNetWeight,
        })),
        `Govt_Inward_List_${filters.dateFrom}_${filters.dateTo}.xlsx`,
      );
    } else {
      exportToExcel(
        (report.mill?.rows || []).map((r: any) => ({
          'S.No': r.sno,
          Date: r.date,
          'RST No': r.rstNo,
          'In Time': r.timeIn,
          'GP Complete Date': r.gpCompleteDate,
          'Out Time': r.timeOut,
          'Mill GP': r.millGp,
          'Agency GP': r.agencyGp,
          'Truck No': r.truckNo,
          Mandi: r.mandi,
          'Party Name': r.partyName,
          'Mill A': r.aClassMill,
          'Mill B': r.bClassMill,
          'Shortage A': r.aClassShortage,
          'Shortage B': r.bClassShortage,
          'Total A': r.aClassTotal,
          'Total B': r.bClassTotal,
          Moisture: r.moisture,
          'Required Net Wt': r.requiredNetWt,
          'Mill Net Wt': r.millNetWt,
          'Surplus +/-': r.surplus,
          'Actual Received Bags': r.millBags,
          'Bags at Agency GP': r.agencyBags,
          Status: r.status,
        })),
        `Mill_Inward_List_${filters.dateFrom}_${filters.dateTo}.xlsx`,
      );
    }
  };

  const handlePrint = () => window.print();

  const scanFp = async () => {
    setScanning(true);
    try {
      const xml = await biometricService.captureFingerprint();
      setBiometricData(xml);
      toast('Fingerprint captured', 'success');
    } catch (err: any) {
      if (user?.role === 'SUPER_ADMIN' || user?.role === 'PLANT_MANAGER') {
        setBiometricData('ADMIN_BYPASS');
        toast('Admin bypass fingerprint (scanner unavailable)', 'success');
      } else {
        toast(err.message || 'Fingerprint capture failed', 'error');
      }
    } finally {
      setScanning(false);
    }
  };

  const submitEvening = async () => {
    if (!manualMatchConfirmed) {
      toast('Please confirm manual entries match digital entries', 'error');
      return;
    }
    if (!biometricData) {
      toast('Fingerprint is required', 'error');
      return;
    }
    if (
      biometricData === 'ADMIN_BYPASS' &&
      user?.role !== 'SUPER_ADMIN' &&
      user?.role !== 'PLANT_MANAGER'
    ) {
      toast('Supervisor fingerprint scan is required', 'error');
      return;
    }
    if (!supervisorName.trim()) {
      toast('Supervisor name is required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/procurement/reports/inward-list/submit', {
        plantId,
        date: filters.dateTo || todayStr(),
        bagWt,
        supervisorName: supervisorName.trim(),
        biometricData,
        source: 'EVENING_SUBMIT',
      });
      toast('Evening lists submitted. Daily Paddy Summary sent to mill (Reports → Daily Inward Summary).', 'success');
      setSubmitOpen(false);
      setBiometricData('');
      setManualMatchConfirmed(false);
      fetchReport();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Submit failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const clusterSections = useMemo(() => {
    if (!report?.artiaClusters) return [];
    if (filters.supplierId) {
      return report.artiaClusters.filter((c: any) => c.artiaId === filters.supplierId);
    }
    return report.artiaClusters;
  }, [report, filters.supplierId]);

  const ClusterBlocks = ({ forPrint = false }: { forPrint?: boolean }) => (
    <div className={forPrint ? '' : 'space-y-6'}>
      {clusterSections.length === 0 && !forPrint && (
        <p className="text-center text-[var(--text-muted-alt)] py-4 text-sm">No artia clusters for filters.</p>
      )}
      {clusterSections.map((cluster: any) => (
        <div
          key={`${forPrint ? 'p' : 's'}-${cluster.artiaName}`}
          className={`border border-[var(--border-subtle)] rounded-xl overflow-hidden ${forPrint ? 'print-artia-page mb-6' : ''}`}
        >
          <div className="bg-[var(--bg-muted)] px-4 py-2 flex flex-wrap justify-between gap-2">
            <h3 className="font-bold text-[var(--text-main)]">Artia: {cluster.artiaName}</h3>
            <div className="text-xs text-[var(--text-muted-alt)] flex gap-3">
              <span>
                Agency: <b className="text-[#e67e00]">{cluster.totals.agencyBags}</b>
              </span>
              <span>
                Mill: <b>{cluster.totals.millBags}</b>
              </span>
              <span>
                Shortage: <b className="text-amber-400">{cluster.totals.shortageBags}</b>
              </span>
              <span>
                Total: <b className="text-emerald-400">{cluster.totals.totalBags}</b>
              </span>
            </div>
          </div>
          <div className="p-3 space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase text-[var(--text-muted-alt)] mb-2">
                Govt Mandi & Artia List — Total Bags {cluster.totals.agencyBags}
              </h4>
              <GovtTable
                rows={cluster.rows.map((r: any, i: number) => ({
                  sno: i + 1,
                  date: r.date,
                  agencyGp: r.agencyGp,
                  truckNo: r.truckNo,
                  mandi: r.mandi,
                  partyName: r.partyName,
                  moisture: r.moisture,
                  aClass: r.aClassAgency,
                  bClass: r.bClassAgency,
                  millNetWeight: r.govtMillNetWt,
                  id: r.id,
                  status: r.status,
                  isBackdated: r.isBackdated,
                  entryMadeByName: r.entryMadeByName,
                  entryCompletionAt: r.entryCompletionAt,
                }))}
                compact
                onSupervisorClick={(name, at) => setSupervisorDetail({ name, at })}
              />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase text-[var(--text-muted-alt)] mb-2">
                Mill Mandi & Artia List — Mill {cluster.totals.millBags} · Shortage{' '}
                {cluster.totals.shortageBags} · Total {cluster.totals.totalBags}
              </h4>
              <MillTable
                rows={cluster.rows.map((r: any, i: number) => ({ sno: i + 1, ...r }))}
                compact
                onSupervisorClick={(name, at) => setSupervisorDetail({ name, at })}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full bg-[var(--bg-panel)] p-6 rounded-xl border border-[var(--border-subtle)] shadow-2xl inward-list-print-root">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .inward-list-print-root, .inward-list-print-root * { visibility: visible !important; }
          .inward-list-print-root { position: absolute; left: 0; top: 0; width: 100%; background: white !important; color: black !important; }
          .no-print, .screen-only { display: none !important; visibility: hidden !important; }
          .print-only { display: block !important; visibility: visible !important; }
          .print-date-page, .print-artia-page { page-break-after: always; break-after: page; }
          .print-date-page:last-child, .print-artia-page:last-child { page-break-after: auto; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[var(--border-subtle-alt)] pb-3 no-print">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[#e67e00] text-[10px] bg-[#e67e00]/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
            {plantLabel}
          </span>
          <h1 className="text-base font-bold text-[var(--text-muted)]">Inward List</h1>
          <span className="ml-2 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Active GPs: {activeGpsLive ?? report?.activeGps ?? '—'}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-200 border border-violet-500/30"
            title="Rows with a violet background are backdated entries"
          >
            Violet row = backdated
          </span>
          {report?.fromSnapshot && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
              Submitted {report.submittedAt ? new Date(report.submittedAt).toLocaleString() : ''}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSubmitOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2"
          >
            <Fingerprint size={16} /> Submit Evening Lists
          </button>
          <button
            onClick={handlePrint}
            className="bg-[var(--bg-panel-hover)] text-[var(--text-main)] px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 border border-[var(--border-subtle)]"
          >
            <Printer size={16} /> Print
          </button>
          <button
            onClick={exportCurrent}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Mode-aware header boxes (PDF) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className={`rounded-lg border p-3 ${mode === 'govt' ? 'border-[#e67e00] bg-[#e67e00]/10' : 'border-[var(--border-subtle)] bg-[var(--bg-base)]'}`}>
          <p className="text-[10px] uppercase text-[var(--text-muted-alt)] font-bold">As per Agency GP</p>
          <p className="text-xl font-bold text-[#e67e00]">{totals.agencyBags}</p>
          <p className="text-[10px] text-[var(--text-muted-alt)]">Govt Inward List · Total Bags</p>
        </div>
        <div className={`rounded-lg border p-3 ${mode === 'mill' ? 'border-[#e67e00] bg-[#e67e00]/10' : 'border-[var(--border-subtle)] bg-[var(--bg-base)]'}`}>
          <p className="text-[10px] uppercase text-[var(--text-muted-alt)] font-bold">Mill Bags</p>
          <p className="text-xl font-bold text-[var(--text-main)]">{totals.millBags}</p>
          <p className="text-[10px] text-[var(--text-muted-alt)]">As per Mill Inward List</p>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3">
          <p className="text-[10px] uppercase text-[var(--text-muted-alt)] font-bold">Shortage Bags</p>
          <p className="text-xl font-bold text-amber-400">{totals.shortageBags}</p>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3">
          <p className="text-[10px] uppercase text-[var(--text-muted-alt)] font-bold">Total Bags</p>
          <p className="text-xl font-bold text-emerald-400">{totals.totalBags}</p>
          <p className="text-[10px] text-[var(--text-muted-alt)]">Mill + Shortage</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4 no-print">
        <div>
          <label className="block text-[var(--text-muted-alt)] text-xs mb-1">From</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm"
          />
        </div>
        <div>
          <label className="block text-[var(--text-muted-alt)] text-xs mb-1">To</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm"
          />
        </div>
        <div>
          <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Mandi</label>
          <select
            value={filters.mandi}
            onChange={(e) => setFilters((f) => ({ ...f, mandi: e.target.value }))}
            className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm min-w-[140px]"
          >
            <option value="">All Mandis</option>
            {mandis.filter((m: any) => m.isActive).map((m: any) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px]">
          <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Artia (season if selected)</label>
          <Combobox
            name="supplierIdFilter"
            value={filters.supplierId}
            onChange={(e: any) => onArtiaChange(e.target.value)}
            options={suppliers}
            valueKey="id"
            placeholder="All Artias"
            className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm"
          />
        </div>
        <div>
          <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Bag Wt (Govt Net)</label>
          <select
            value={bagWt}
            onChange={(e) => setBagWt(parseFloat(e.target.value))}
            className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm"
          >
            <option value={0.382}>× 0.382</option>
            <option value={0.381}>× 0.381</option>
          </select>
        </div>
        <button
          onClick={() =>
            setFilters({ dateFrom: todayStr(), dateTo: todayStr(), mandi: '', supplierId: '' })
          }
          className="bg-[var(--bg-panel-hover)] text-[var(--text-main)] px-3 py-1.5 rounded border border-[var(--border-subtle)] text-sm"
        >
          Clear
        </button>
      </div>

      <div className="flex border-b border-[var(--border-subtle)] mb-4 no-print">
        {(
          [
            ['govt', 'Govt Inward List'],
            ['mill', 'Mill Inward List'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              mode === key
                ? 'border-[#e67e00] text-[#e67e00]'
                : 'border-transparent text-[var(--text-muted-alt)] hover:text-[var(--text-main)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-[var(--text-muted-alt)] mb-2 no-print">Loading…</p>}

      {/* Main list (screen) — page scroll only, no nested vertical scroll */}
      <div className="screen-only">
        {mode === 'govt' ? (
          <GovtTable
            rows={report?.govt?.rows || []}
            onSupervisorClick={(name, at) => setSupervisorDetail({ name, at })}
          />
        ) : (
          <MillTable
            rows={[...(report?.mill?.rows || []), ...(report?.mill?.draftRows || [])]}
            onView={onView}
            onContinueDraft={onContinueDraft}
            onSupervisorClick={(name, at) => setSupervisorDetail({ name, at })}
          />
        )}

        {/* Feedback 35 — Mandi & Artia sections BELOW the inward list */}
        <div className="mt-8 pt-4 border-t border-[var(--border-subtle)]">
          <h2 className="text-sm font-bold text-[var(--text-main)] mb-1">Mandi & Artia Wise Details</h2>
          <p className="text-[10px] text-[var(--text-muted-alt)] mb-4">
            Artia-wise clusters (Latest → Oldest). Mandi filter shows all artias for that mandi; Artia filter shows that artia for the season.
          </p>
          <ClusterBlocks />
        </div>
      </div>

      {/* Print: date-wise pages + full Mandi/Artia pages */}
      <div className="print-only">
        <h1 className="text-lg font-bold mb-1">
          {mode === 'govt' ? 'Govt Inward List (Agency GP)' : 'Mill Inward List (Actual Bags)'} — {plantLabel}
        </h1>
        <p className="text-xs mb-4">
          Bag Wt {bagWt} · {filters.dateFrom} → {filters.dateTo}
          {filters.mandi ? ` · Mandi: ${filters.mandi}` : ''}
          {filters.supplierId ? ' · Artia filtered' : ''}
        </p>

        {(report?.dateGroups || []).map((g: any) => (
          <div key={`d-${g.date}`} className="print-date-page mb-6">
            <h2 className="font-bold mb-2 border-b pb-1">
              Date: {g.date} · Total Bags: {g.totals.totalBags}
            </h2>
            {mode === 'govt' ? (
              <GovtTable
                rows={g.rows.map((r: any, i: number) => ({
                  sno: i + 1,
                  date: r.date,
                  agencyGp: r.agencyGp,
                  truckNo: r.truckNo,
                  mandi: r.mandi,
                  partyName: r.partyName,
                  moisture: r.moisture,
                  aClass: r.aClassAgency,
                  bClass: r.bClassAgency,
                  millNetWeight: r.govtMillNetWt,
                  isBackdated: r.isBackdated,
                  entryMadeByName: r.entryMadeByName,
                  entryCompletionAt: r.entryCompletionAt,
                }))}
                onSupervisorClick={(name, at) => setSupervisorDetail({ name, at })}
              />
            ) : (
              <MillTable
                rows={g.rows.map((r: any, i: number) => ({ sno: i + 1, ...r }))}
                onSupervisorClick={(name, at) => setSupervisorDetail({ name, at })}
              />
            )}
            <p className="mt-2 text-sm font-bold">
              Day totals — Agency: {g.totals.agencyBags} · Mill: {g.totals.millBags} · Shortage:{' '}
              {g.totals.shortageBags} · Total: {g.totals.totalBags}
            </p>
          </div>
        ))}

        {/* PDF: Print full Mandi pages including all Artias */}
        <div className="print-artia-page">
          <h2 className="text-base font-bold mb-3 border-b pb-1">
            Mandi & Artia Wise Details
            {filters.mandi ? ` — ${filters.mandi}` : ' — All Mandis'}
          </h2>
          <ClusterBlocks forPrint />
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] text-sm font-bold text-[var(--text-main)] flex flex-wrap gap-4">
        <span>Cumulative Agency Bags: {totals.agencyBags}</span>
        <span>Mill Bags: {totals.millBags}</span>
        <span>Shortage: {totals.shortageBags}</span>
        <span className="text-[#e67e00]">Total Bags: {totals.totalBags}</span>
      </div>

      <CustomModal isOpen={submitOpen} onClose={() => setSubmitOpen(false)} title="Submit Evening Inward Lists">
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex gap-2 text-sm text-amber-200">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p>
              Confirming that the manual entries completed matches the digital entries of the day.
              Both <b>Govt (Agency GP)</b> and <b>Mill (Actual Bags)</b> lists will be submitted for{' '}
              <b>{filters.dateTo || todayStr()}</b>, and Daily Paddy Summary will be sent to the mill.
            </p>
          </div>
          <label className="flex items-start gap-2 text-sm text-[var(--text-main)] cursor-pointer">
            <input
              type="checkbox"
              checked={manualMatchConfirmed}
              onChange={(e) => setManualMatchConfirmed(e.target.checked)}
              className="mt-1 accent-[#e67e00]"
            />
            I confirm manual entries match the digital inward entries for today.
          </label>
          <div>
            <label className="block text-xs text-[var(--text-muted-alt)] mb-1">Supervisor Name</label>
            <input
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted-alt)] mb-1">Fingerprint</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={biometricData ? 'Captured ✓' : ''}
                placeholder="Scan fingerprint…"
                className="flex-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              />
              <button
                type="button"
                onClick={scanFp}
                disabled={scanning}
                className="px-3 py-2 border border-[var(--border-subtle)] rounded text-sm"
              >
                {scanning ? 'Scanning…' : 'Scan'}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setSubmitOpen(false)} className="px-4 py-2 text-[var(--text-muted-alt)]" disabled={submitting}>
              Cancel
            </button>
            <button
              onClick={submitEvening}
              disabled={submitting || !manualMatchConfirmed || !biometricData}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded font-bold"
            >
              {submitting ? 'Submitting…' : 'Submit with Fingerprint'}
            </button>
          </div>
        </div>
      </CustomModal>

      <CustomModal
        isOpen={!!supervisorDetail}
        onClose={() => setSupervisorDetail(null)}
        title="Fingerprint Submission"
      >
        <div className="p-2 space-y-3 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted-alt)] mb-0.5">
              Supervisor
            </div>
            <div className="font-bold text-[var(--text-main)]">
              {supervisorDetail?.name || '-'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted-alt)] mb-0.5">
              Date &amp; Time of Fingerprint / Thumb Entry
            </div>
            <div className="font-medium text-[var(--text-main)]">
              {supervisorDetail?.at
                ? new Date(supervisorDetail.at).toLocaleString()
                : 'Not recorded'}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setSupervisorDetail(null)}
              className="px-4 py-2 border border-[var(--border-subtle)] rounded-lg text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}

function SupervisorCell({
  name,
  at,
  onClick,
}: {
  name?: string | null;
  at?: string | null;
  onClick?: (name: string, at: string | null) => void;
}) {
  if (!name) return <span className="text-[var(--text-muted-alt)]">-</span>;
  if (!onClick) return <span>{name}</span>;
  return (
    <button
      type="button"
      onClick={() => onClick(name, at || null)}
      className="text-blue-400 hover:text-blue-300 underline underline-offset-2 font-medium text-left"
      title="View fingerprint submission time"
    >
      {name}
    </button>
  );
}

function GovtTable({
  rows,
  compact,
  onSupervisorClick,
}: {
  rows: any[];
  compact?: boolean;
  onSupervisorClick?: (name: string, at: string | null) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse text-[var(--text-muted)] ${compact ? 'text-xs' : 'text-sm'}`}>
        <thead>
          <tr className="border-b border-[var(--border-subtle)] uppercase text-[var(--text-muted-alt)] text-left bg-[var(--glass-bg)] text-xs font-semibold tracking-wide">
            <th className="p-2.5">S.No</th>
            <th className="p-2.5">Date</th>
            <th className="p-2.5">Agency GP</th>
            <th className="p-2.5">Truck No.</th>
            <th className="p-2.5">Mandi</th>
            <th className="p-2.5">Party Name</th>
            <th className="p-2.5">Supervisor</th>
            <th className="p-2.5 text-right">Moisture</th>
            <th className="p-2.5 text-right">A Class</th>
            <th className="p-2.5 text-right">B Class</th>
            <th className="p-2.5 text-right">Bags at Agency GP</th>
            <th className="p-2.5 text-right">Mill Net Weight</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.id || i}
              className={`border-b border-[var(--border-subtle-alt)] ${
                r.isBackdated ? 'bg-violet-500/20 text-violet-100' : ''
              }`}
              title={
                r.isBackdated
                  ? `Backdated entry${r.entryMadeByName ? ` by ${r.entryMadeByName}` : ''}${r.entryCompletionAt ? ` at ${r.entryCompletionAt}` : ''}`
                  : undefined
              }
            >
              <td className="p-2">{r.sno ?? i + 1}</td>
              <td className="p-2">{r.date}</td>
              <td className="p-2 font-mono text-xs">{r.agencyGp}</td>
              <td className="p-2">{r.truckNo}</td>
              <td className="p-2">{r.mandi}</td>
              <td className="p-2 font-bold text-[var(--text-main)]">{r.partyName}</td>
              <td className="p-2">
                <SupervisorCell
                  name={r.entryMadeByName}
                  at={r.entryCompletionAt}
                  onClick={onSupervisorClick}
                />
              </td>
              <td className="p-2 text-right">{r.moisture ?? '-'}</td>
              <td className="p-2 text-right">{r.aClass}</td>
              <td className="p-2 text-right">{r.bClass}</td>
              <td className="p-2 text-right font-bold">
                {r.agencyBags ?? Number(r.aClass || 0) + Number(r.bClass || 0)}
              </td>
              <td className="p-2 text-right font-bold">{r.millNetWeight}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={12} className="p-6 text-center text-[var(--text-muted-alt)]">
                No govt inward rows.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function MillTable({
  rows,
  compact,
  onView,
  onContinueDraft,
  onSupervisorClick,
}: {
  rows: any[];
  compact?: boolean;
  onView?: (row: any) => void;
  onContinueDraft?: (row: any) => void;
  onSupervisorClick?: (name: string, at: string | null) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse text-[var(--text-muted)] ${compact ? 'text-xs' : 'text-sm'}`}>
        <thead>
          <tr className="border-b border-[var(--border-subtle)] uppercase text-[var(--text-muted-alt)] text-left bg-[var(--glass-bg)] text-xs font-semibold tracking-wide">
            <th className="p-2.5" rowSpan={2}>S.No</th>
            <th className="p-2.5" rowSpan={2}>Date</th>
            <th className="p-2.5" rowSpan={2}>RST No.</th>
            <th className="p-2.5" rowSpan={2}>In Time</th>
            <th className="p-2.5" rowSpan={2}>GP Complete Date</th>
            <th className="p-2.5" rowSpan={2}>Out Time</th>
            <th className="p-2.5" rowSpan={2}>Mill GP</th>
            <th className="p-2.5" rowSpan={2}>Agency GP</th>
            <th className="p-2.5" rowSpan={2}>Truck No.</th>
            <th className="p-2.5" rowSpan={2}>Mandi</th>
            <th className="p-2.5" rowSpan={2}>Party Name</th>
            <th className="p-2.5" rowSpan={2}>Supervisor</th>
            <th className="p-2 text-center border-l border-[var(--border-subtle)]" colSpan={2}>Mill</th>
            <th className="p-2 text-center text-amber-400" colSpan={2}>Shortage</th>
            <th className="p-2 text-center text-[#e67e00]" colSpan={2}>Total</th>
            <th className="p-2.5" rowSpan={2}>Moisture</th>
            <th className="p-2.5 text-right" rowSpan={2}>Required Net Weight</th>
            <th className="p-2.5 text-right" rowSpan={2}>Mill Net Weight</th>
            <th className="p-2.5 text-right" rowSpan={2}>Surplus Plus / Minus</th>
            <th className="p-2.5 text-right" rowSpan={2} title="Actual Received = mill A+B excl shortage">Actual Rec. Bags</th>
            <th className="p-2.5 text-right" rowSpan={2}>Bags at Agency GP</th>
            <th className="p-2.5 no-print" rowSpan={2}>Status</th>
            {(onView || onContinueDraft) && <th className="p-2.5 text-center no-print" rowSpan={2}>Action</th>}
          </tr>
          <tr className="border-b border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-muted-alt)] bg-[var(--bg-base)]">
            <th className="p-2 text-right border-l border-[var(--border-subtle)]">A</th>
            <th className="p-2 text-right">B</th>
            <th className="p-2 text-right text-amber-400">A</th>
            <th className="p-2 text-right text-amber-400">B</th>
            <th className="p-2 text-right text-[#e67e00]">A</th>
            <th className="p-2 text-right text-[#e67e00]">B</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.id || i}
              className={`border-b border-[var(--border-subtle-alt)] whitespace-nowrap ${
                r.isBackdated ? 'bg-violet-500/20 text-violet-100' : ''
              }`}
              title={
                r.isBackdated
                  ? `Backdated entry${r.entryMadeByName ? ` by ${r.entryMadeByName}` : ''}${r.entryCompletionAt ? ` at ${r.entryCompletionAt}` : ''}`
                  : undefined
              }
            >
              <td className="p-2">{r.sno ?? i + 1}</td>
              <td className="p-2">{r.date}</td>
              <td className="p-2 text-xs">{r.rstNo}</td>
              <td className="p-2">{r.timeIn || '-'}</td>
              <td className="p-2 whitespace-nowrap">{r.gpCompleteDate || '-'}</td>
              <td className="p-2">{r.timeOut || '-'}</td>
              <td className="p-2 font-mono text-xs font-bold text-[var(--text-main)]">{r.millGp}</td>
              <td className="p-2 text-xs">{r.agencyGp}</td>
              <td className="p-2">{r.truckNo}</td>
              <td className="p-2">{r.mandi}</td>
              <td className="p-2 font-bold text-[var(--text-main)]">{r.partyName}</td>
              <td className="p-2">
                <SupervisorCell
                  name={r.entryMadeByName}
                  at={r.entryCompletionAt}
                  onClick={onSupervisorClick}
                />
              </td>
              <td className="p-2 text-right border-l border-[var(--border-subtle)]">{r.aClassMill}</td>
              <td className="p-2 text-right">{r.bClassMill}</td>
              <td className="p-2 text-right text-amber-400">{r.aClassShortage}</td>
              <td className="p-2 text-right text-amber-400">{r.bClassShortage}</td>
              <td className="p-2 text-right text-[#e67e00] font-bold">{r.aClassTotal ?? (Number(r.aClassMill||0)+Number(r.aClassShortage||0))}</td>
              <td className="p-2 text-right text-[#e67e00] font-bold">{r.bClassTotal ?? (Number(r.bClassMill||0)+Number(r.bClassShortage||0))}</td>
              <td className="p-2 text-right">{r.moisture ?? '-'}</td>
              <td className="p-2 text-right">{r.requiredNetWt || '-'}</td>
              <td className="p-2 text-right font-bold">{r.millNetWt || '-'}</td>
              <td className="p-2 text-right">{r.surplus ?? '-'}</td>
              <td className="p-2 text-right font-bold">{r.millBags ?? '-'}</td>
              <td className="p-2 text-right">{r.agencyBags ?? '-'}</td>
              <td className="p-2 no-print">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    r.status === 'DRAFT'
                      ? 'bg-amber-500/20 text-amber-400'
                      : r.status === 'CONFIRMED' || r.status === 'COMPLETED'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-[var(--glass-bg)]'
                  }`}
                >
                  {r.status || '-'}
                </span>
              </td>
              {(onView || onContinueDraft) && (
                <td className="p-2 text-center no-print">
                  <div className="flex justify-center gap-1">
                    {r.status === 'DRAFT' && onContinueDraft && (
                      <button onClick={() => onContinueDraft(r)} className="text-[#e67e00] p-1" title="Continue Draft">
                        <Edit size={16} />
                      </button>
                    )}
                    {onView && (
                      <button onClick={() => onView(r)} className="text-blue-500 p-1" title="View">
                        <Eye size={16} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={26} className="p-6 text-center text-[var(--text-muted-alt)]">
                No mill inward rows.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Edit, Package, ArrowUpRight, ArrowDownRight, Printer } from 'lucide-react';
import api from '../../api/axios';
import { usePlantStore } from '../../store/plantStore';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useMandiStore } from '../../store/mandiStore';
import { biometricService } from '../../services/biometricService';
import Pagination from '../Pagination';
import Combobox from '../Combobox';
import { CustomModal } from '../CustomModal';
import { exportToExcel } from '../../utils/exportUtils';
import { useSubmitLock } from '../../hooks/useSubmitLock';

/** Hide faker / Latin placeholder notes left in seed or test data */
function displayNote(note?: string | null): string {
  const n = String(note || '').trim();
  if (!n) return '';
  if (/(iusto|lusto|quasi|quia sint|nobis veri|ipsum|dolor sit)/i.test(n)) return '';
  return n;
}

type Props = {
  suppliers: any[];
  fetchSuppliers: (plantId?: string) => void;
  onOpenEstimate: (preset?: any) => void;
  onEditEstimate: (sodaOrRow: any) => void;
  refreshKey?: number;
};

/**
 * Feedback 32 — Boli Record register (Table 01) + Add Final Boli section.
 */
export default function BoliRecordPanel({
  suppliers,
  fetchSuppliers,
  onOpenEstimate,
  onEditEstimate,
  refreshKey = 0,
}: Props) {
  const activePlant = usePlantStore((s) => s.activePlant);
  const user = useAuthStore((s) => s.user);
  const isSupervisor = user?.role === 'SUPERVISOR';
  const isAdmin = /SUPER_ADMIN|PLANT_MANAGER|ADMIN/i.test(String(user?.role || ''));
  const { mandis } = useMandiStore();

  const [filters, setFilters] = useState({
    supplierId: '',
    mandi: '',
    dateFrom: '',
    dateTo: '',
  });
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);

  const [openBolis, setOpenBolis] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [finalForm, setFinalForm] = useState({
    boliId: '',
    supervisorName: '',
    artiaBillChecked: 'No' as 'Yes' | 'No',
    /** Final Bags per boli line (Feedback 32 — up to 4 lines like Estimate Purchase) */
    finalBagsById: {} as Record<string, string>,
    biometricData: '',
  });
  const [finalSaving, setFinalSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const selectedOpen = useMemo(
    () => openBolis.find((b) => b.id === finalForm.boliId) || null,
    [openBolis, finalForm.boliId],
  );

  /** One dropdown option per Boli No. (soda) — not one per M/C line */
  const openBoliOptions = useMemo(() => {
    const bySoda = new Map<string, any>();
    for (const b of openBolis) {
      const key = b.sodaId || b.id;
      if (!bySoda.has(key)) bySoda.set(key, b);
    }
    return [...bySoda.values()].sort((a, b) =>
      String(a.boliNo || '').localeCompare(String(b.boliNo || '')),
    );
  }, [openBolis]);

  /** Always 4 lines: selected + sibling open bolis from same soda, then empty slots */
  const finalBoliLines = useMemo(() => {
    const empty = () => null as any;
    if (!selectedOpen) return [empty(), empty(), empty(), empty()];
    const siblings = openBolis.filter((b) => b.sodaId === selectedOpen.sodaId);
    const ordered = [
      selectedOpen,
      ...siblings.filter((b) => b.id !== selectedOpen.id),
    ].slice(0, 4);
    while (ordered.length < 4) ordered.push(empty());
    return ordered;
  }, [selectedOpen, openBolis]);

  const resetFinalForm = () =>
    setFinalForm({
      boliId: '',
      supervisorName: '',
      artiaBillChecked: 'No',
      finalBagsById: {},
      biometricData: '',
    });

  const fetchRows = async () => {
    if (!activePlant?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.mandi) params.append('mandi', filters.mandi);
      if (filters.supplierId) params.append('supplierId', filters.supplierId);
      params.append('page', String(page));
      params.append('limit', String(pageSize));
      const res = await api.get(`/api/procurement/boli-records/${activePlant.id}?${params}`);
      setRows(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (e) {
      console.error(e);
      useUiStore.getState().addToast('Failed to load Boli records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOpenBolis = async () => {
    if (!activePlant?.id) return;
    try {
      const res = await api.get(`/api/procurement/bolis/open-for-final/${activePlant.id}`);
      setOpenBolis(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSupervisors = async () => {
    if (!activePlant?.id) return;
    try {
      const res = await api.get(`/api/procurement/supervisors/${activePlant.id}`);
      setSupervisors(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [activePlant?.id, filters, page, pageSize, refreshKey]);

  useEffect(() => {
    fetchOpenBolis();
    fetchSupervisors();
    if (activePlant?.id) fetchSuppliers(activePlant.id);
  }, [activePlant?.id, refreshKey]);

  // Cluster-wise Artia daily stats from current page rows (display aid)
  const dailyStats = useMemo(() => {
    const stats: Record<string, { maxRate: number; minRate: number; overPricedValue: number; govtRate: number }> = {};
    rows.forEach((r) => {
      if (r.isCancelled) return;
      const d = new Date(r.date).toLocaleDateString();
      const govtRate = r.govtRate || activePlant?.govtRate || 0;
      if (!stats[d]) stats[d] = { maxRate: 0, minRate: Infinity, overPricedValue: 0, govtRate };
      const rate = Number(r.rate) || 0;
      if (rate > stats[d].maxRate) stats[d].maxRate = rate;
      if (rate < stats[d].minRate) stats[d].minRate = rate;
    });
    return Object.entries(stats).map(([date, s]) => ({
      date,
      maxRate: s.maxRate,
      minRate: s.minRate === Infinity ? 0 : s.minRate,
      overPricedValue: s.overPricedValue,
    }));
  }, [rows, activePlant]);

  const exportAll = async (mode: 'excel' | 'print' = 'excel') => {
    if (!activePlant?.id) return;
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.mandi) params.append('mandi', filters.mandi);
      if (filters.supplierId) params.append('supplierId', filters.supplierId);
      params.append('page', '1');
      params.append('limit', '1000000');
      const res = await api.get(`/api/procurement/boli-records/${activePlant.id}?${params}`);
      const list = res.data?.data || [];
      if (mode === 'print') {
        const html = `
          <html><head><title>Boli Record</title>
          <style>
            body{font-family:Arial,sans-serif;font-size:12px;padding:16px}
            table{border-collapse:collapse;width:100%}
            th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}
            th{background:#eee}
            h1{font-size:16px}
          </style></head><body>
          <h1>Boli Record — ${activePlant.name || ''}</h1>
          <p>Filters: Artia=${filters.supplierId || 'All'}, Mandi=${filters.mandi || 'All'}, ${filters.dateFrom || '…'} to ${filters.dateTo || '…'}</p>
          <table><thead><tr>
            <th>Party</th><th>Date</th><th>Boli No</th><th>M/C</th><th>Est</th><th>Final</th><th>Rate</th>
            <th>Payment</th><th>Hisab</th><th>Received</th><th>Balance</th><th>Complete</th><th>Note</th>
          </tr></thead><tbody>
          ${list
            .map(
              (item: any) => `<tr>
              <td>${item.partyName || ''}</td>
              <td>${item.date ? new Date(item.date).toLocaleDateString() : ''}</td>
              <td>${item.boliNo || ''}</td>
              <td>${item.moisture ?? ''}</td>
              <td>${item.estimatedBags ?? ''}</td>
              <td>${item.finalBags ?? ''}</td>
              <td>${item.rate ?? ''}</td>
              <td>${item.payment ?? ''}</td>
              <td>${item.finalHisabAmt ?? ''}</td>
              <td>${item.bagsReceived ?? 0}</td>
              <td>${item.balanceBags ?? ''}</td>
              <td>${item.isCompleted ? 'Yes' : item.isCancelled ? 'Cancelled' : 'Underway'}</td>
              <td>${displayNote(item.note)}</td>
            </tr>`,
            )
            .join('')}
          </tbody></table></body></html>`;
        const w = window.open('', '_blank');
        if (w) {
          w.document.write(html);
          w.document.close();
          w.focus();
          w.print();
        }
        return;
      }
      const data = list.map((item: any) => ({
        'Party Name': item.partyName,
        Date: item.date,
        'Boli No.': item.boliNo,
        'M/C': item.moisture,
        'Estimated Bags': item.estimatedBags,
        'Final Bags': item.finalBags,
        Rate: item.rate,
        Payment: item.payment,
        'Final Hisab Amount': item.finalHisabAmt,
        'Received Bags': item.bagsReceived,
        'Balance Bags': item.balanceBags,
        'Complete Soda': item.isCompleted
          ? 'Done'
          : item.isCancelled
            ? 'Cancelled'
            : 'Underway',
        Note: displayNote(item.note),
        Mandi: item.mandi,
        Supervisor: item.supervisorName,
      }));
      exportToExcel(data, `Boli_Record_Full`);
    } catch (e) {
      console.error(e);
      useUiStore.getState().addToast(mode === 'print' ? 'Print failed' : 'Export failed', 'error');
    }
  };

  const canEditRow = (row: any) => {
    if (isAdmin) return true;
    if (!isSupervisor) return false;
    const d = new Date(row.date);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const [adminEdit, setAdminEdit] = useState<{
    isOpen: boolean;
    row: any | null;
    payment: string;
    note: string;
    finalBags: string;
  }>({ isOpen: false, row: null, payment: '', note: '', finalBags: '' });
  const adminEditLock = useSubmitLock();

  const openAdminEdit = (row: any) => {
    setAdminEdit({
      isOpen: true,
      row,
      payment: row.payment != null ? String(row.payment) : '',
      note: displayNote(row.note),
      finalBags: row.finalBags != null ? String(row.finalBags) : '',
    });
  };

  const saveAdminEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEdit.row?.boliId) return;
    await adminEditLock.wrapSubmit(async () => {
    try {
      await api.put(`/api/procurement/bolis/${adminEdit.row.boliId}/admin-table01`, {
        payment: adminEdit.payment === '' ? undefined : parseFloat(adminEdit.payment),
        note: adminEdit.note,
        finalBags: adminEdit.finalBags === '' ? undefined : parseInt(adminEdit.finalBags, 10),
      });
      useUiStore.getState().addToast('Table 01 row updated', 'success');
      setAdminEdit({ isOpen: false, row: null, payment: '', note: '', finalBags: '' });
      await fetchRows();
    } catch (err: any) {
      useUiStore.getState().addToast(err.response?.data?.message || 'Admin update failed', 'error');
    }
    });
  };

  const seasonStartStr = () => {
    const ref = new Date();
    const y = ref.getMonth() >= 9 ? ref.getFullYear() : ref.getFullYear() - 1;
    return `${y}-10-01`;
  };

  const todayStr = () => new Date().toISOString().slice(0, 10);

  const scanFingerprint = async () => {
    setScanning(true);
    try {
      const xml = await biometricService.captureFingerprint();
      setFinalForm((f) => ({ ...f, biometricData: xml }));
      useUiStore.getState().addToast('Fingerprint captured', 'success');
    } catch (e: any) {
      if (isAdmin) {
        setFinalForm((f) => ({ ...f, biometricData: 'ADMIN_BYPASS' }));
        useUiStore.getState().addToast('Admin bypass fingerprint (scanner unavailable)', 'success');
      } else {
        useUiStore.getState().addToast(e.message || 'Fingerprint capture failed', 'error');
      }
    } finally {
      setScanning(false);
    }
  };

  const submitFinalBoli = async (e: React.FormEvent) => {
    e.preventDefault();
    if (finalSaving) return;
    if (finalForm.artiaBillChecked !== 'Yes') {
      useUiStore.getState().addToast('Set Artia Bill Checked And Matched to Yes', 'error');
      return;
    }
    if (!finalForm.boliId) {
      useUiStore.getState().addToast('Select a Boli No. first', 'error');
      return;
    }
    if (!finalForm.biometricData) {
      useUiStore.getState().addToast('Fingerprint required', 'error');
      return;
    }

    const toSubmit = finalBoliLines
      .filter(Boolean)
      .map((b: any) => ({
        id: b.id,
        boliNo: b.boliNo,
        bags: String(finalForm.finalBagsById[b.id] ?? '').trim(),
      }))
      .filter((x) => x.bags !== '');

    if (!toSubmit.length) {
      useUiStore.getState().addToast('Enter Final Bags on at least one line', 'error');
      return;
    }
    for (const row of toSubmit) {
      if (/[.]/.test(row.bags) || !/^\d{1,3}$/.test(row.bags)) {
        useUiStore
          .getState()
          .addToast(
            `Final Bags for ${row.boliNo || 'line'} must be a whole number (max 999)`,
            'error',
          );
        return;
      }
    }

    setFinalSaving(true);
    try {
      for (const row of toSubmit) {
        await api.put(`/api/procurement/bolis/${row.id}/final`, {
          artiaBillChecked: true,
          finalBags: parseInt(row.bags, 10),
          supervisorName: finalForm.supervisorName || selectedOpen?.supervisorName,
          biometricData: finalForm.biometricData,
        });
      }
      useUiStore
        .getState()
        .addToast(
          toSubmit.length === 1
            ? 'Final Boli submitted'
            : `${toSubmit.length} Final Boli lines submitted`,
          'success',
        );
      resetFinalForm();
      await fetchRows();
      await fetchOpenBolis();
    } catch (err: any) {
      useUiStore.getState().addToast(err.response?.data?.message || 'Failed to submit Final Boli', 'error');
    } finally {
      setFinalSaving(false);
    }
  };

  const cancelSelectedBoli = async () => {
    if (!selectedOpen?.id || cancelling) return;
    if (
      !window.confirm(
        `Cancel Boli ${selectedOpen.boliNo}? It will be removed from inward receiving. Max 3 cancels per soda.`,
      )
    ) {
      return;
    }
    setCancelling(true);
    try {
      await api.put(`/api/procurement/bolis/${selectedOpen.id}/cancel`);
      useUiStore.getState().addToast(`Boli ${selectedOpen.boliNo} cancelled`, 'success');
      resetFinalForm();
      await fetchRows();
      await fetchOpenBolis();
    } catch (err: any) {
      useUiStore
        .getState()
        .addToast(err.response?.data?.message || 'Failed to cancel boli', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const cancelEntireSoda = async () => {
    if (!selectedOpen?.sodaId || cancelling) return;
    if (
      !window.confirm(
        `Cancel entire soda for ${selectedOpen.artiaName}? All open bolis without Final Bags will be cancelled.`,
      )
    ) {
      return;
    }
    setCancelling(true);
    try {
      const res = await api.put(
        `/api/procurement/soda-pending/${selectedOpen.sodaId}/cancel`,
      );
      useUiStore
        .getState()
        .addToast(
          `Soda cancelled (${res.data?.cancelled ?? ''} boli)`,
          'success',
        );
      resetFinalForm();
      await fetchRows();
      await fetchOpenBolis();
    } catch (err: any) {
      useUiStore
        .getState()
        .addToast(err.response?.data?.message || 'Failed to cancel soda', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const billYes = finalForm.artiaBillChecked === 'Yes';

  // Group rows visually by Artia (cluster-wise)
  let lastParty = '';

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)] gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
          <Package className="text-[#e67e00]" /> 3. Boli Record
        </h2>
        <div className="flex items-center gap-2">
          {!isSupervisor && (
            <>
              <button
                onClick={() => exportAll('excel')}
                className="flex items-center gap-2 bg-[#107c41] text-white px-3 py-1.5 rounded hover:bg-[#1f8c51] transition-colors text-sm font-medium"
              >
                <Download size={16} /> Export All
              </button>
              <button
                onClick={() => exportAll('print')}
                className="flex items-center gap-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-main)] px-3 py-1.5 rounded text-sm font-medium"
              >
                <Printer size={16} /> Print All
              </button>
            </>
          )}
          {activePlant && (
            <button
              onClick={() => onOpenEstimate()}
              className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-orange-500/20"
            >
              + Add Estimate Purchase
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[var(--bg-base)] p-4 space-y-4">
        {/* Filters: Artia → Mandi → From/To */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Artia (Supplier) Name</label>
            <Combobox
              name="supplierIdFilter"
              value={filters.supplierId}
              onChange={(e: any) => {
                setPage(1);
                const supplierId = e.target.value;
                setFilters((f) => ({
                  ...f,
                  supplierId,
                  // Feedback 32 — Artia select shows from first entry of the season
                  ...(supplierId
                    ? {
                        dateFrom: f.dateFrom && f.dateFrom !== todayStr() ? f.dateFrom : seasonStartStr(),
                        dateTo: f.dateTo || todayStr(),
                      }
                    : {}),
                }));
                // Feedback 32 — show all bolis for selected Artia (no page hide)
                if (supplierId) setPageSize(100000);
                else setPageSize(50);
              }}
              options={suppliers}
              valueKey="id"
              placeholder="All Artias"
              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm min-w-[180px]"
            />
          </div>
          <div>
            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Mandi</label>
            <select
              value={filters.mandi}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, mandi: e.target.value }));
              }}
              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm"
            >
              <option value="">All Mandis</option>
              {mandis.filter((m: any) => m.isActive).map((m: any) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, dateFrom: e.target.value }));
              }}
              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm"
            />
          </div>
          <div>
            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, dateTo: e.target.value }));
              }}
              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm"
            />
          </div>
          <button
            onClick={() => {
              setPage(1);
              setFilters({ supplierId: '', mandi: '', dateFrom: '', dateTo: '' });
            }}
            className="bg-[var(--bg-panel-hover)] text-[var(--text-main)] px-3 py-1.5 rounded border border-[var(--border-subtle)] text-sm"
          >
            Clear
          </button>
        </div>

        {dailyStats.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {dailyStats.map((stat) => (
              <div
                key={stat.date}
                className="min-w-[160px] bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs"
              >
                <div className="font-bold text-[var(--text-muted-alt)]">{stat.date}</div>
                <div className="flex justify-between mt-1">
                  <span>High</span>
                  <span className="text-red-400 font-bold">₹{stat.maxRate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Low</span>
                  <span className="text-green-400 font-bold">₹{stat.minRate}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table 01 — mill-wise Boli Record (no row divider lines; F32 Pg.2/3) */}
        <div className="overflow-x-auto rounded-lg bg-[var(--bg-panel-alt)]">
          <table className="w-full border-collapse text-[var(--text-muted)] text-sm min-w-[1100px]">
            <thead>
              <tr className="uppercase text-[var(--text-muted-alt)] text-[10px] text-left border-b border-[var(--border-subtle)]">
                <th className="p-2 font-semibold">Party Name</th>
                <th className="p-2 font-semibold">Date</th>
                <th className="p-2 font-semibold">Boli No.</th>
                <th className="p-2 font-semibold">M/C</th>
                <th className="p-2 font-semibold">Est. Bags</th>
                <th className="p-2 font-semibold">Final Bags</th>
                <th className="p-2 font-semibold">Rate</th>
                <th className="p-2 font-semibold">Payment</th>
                <th className="p-2 font-semibold">Final Hisab</th>
                <th className="p-2 font-semibold">Received</th>
                <th className="p-2 font-semibold">Balance</th>
                <th className="p-2 font-semibold">Complete</th>
                <th className="p-2 font-semibold">Note</th>
                <th className="p-2 font-semibold text-right">Edit</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={14} className="p-6 text-center text-[var(--text-muted-alt)]">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((r) => {
                  const showCluster = r.partyName !== lastParty;
                  lastParty = r.partyName;
                  return (
                    <tr
                      key={r.boliId}
                      className={`hover:bg-[var(--glass-bg)]/60 ${
                        r.isCancelled ? 'opacity-50' : ''
                      } ${showCluster ? 'pt-1' : ''}`}
                    >
                      <td className="p-2 font-medium text-[var(--text-main)]">
                        {showCluster ? r.partyName : ''}
                        {r.mandi && showCluster ? (
                          <div className="text-[10px] text-[var(--text-muted-alt)]">{r.mandi}</div>
                        ) : null}
                      </td>
                      <td className="p-2">{new Date(r.date).toLocaleDateString()}</td>
                      <td className="p-2 font-mono text-xs text-[#e67e00]">{r.boliNo || '-'}</td>
                      <td className="p-2">{r.moisture ?? '-'}</td>
                      <td className="p-2">{r.estimatedBags ?? '-'}</td>
                      <td className="p-2 font-bold text-[var(--text-main)]">{r.finalBags ?? '—'}</td>
                      <td className="p-2 text-[#e67e00] font-bold">{r.rate ?? '-'}</td>
                      <td className="p-2">{r.payment != null ? `₹${Number(r.payment).toFixed(2)}` : '—'}</td>
                      <td className="p-2">
                        {Number(r.finalHisabAmt) > 0 ? (
                          <span className="text-red-500 font-bold inline-flex items-center gap-1">
                            <ArrowUpRight size={12} /> ₹{Number(r.finalHisabAmt).toFixed(2)}
                          </span>
                        ) : Number(r.finalHisabAmt) < 0 ? (
                          <span className="text-green-500 font-bold inline-flex items-center gap-1">
                            <ArrowDownRight size={12} /> ₹{Math.abs(Number(r.finalHisabAmt)).toFixed(2)}
                          </span>
                        ) : (
                          <span>₹0</span>
                        )}
                      </td>
                      <td className="p-2">{r.bagsReceived ?? 0}</td>
                      <td className="p-2">{r.balanceBags != null ? r.balanceBags : '—'}</td>
                      <td className="p-2 text-center">
                        {r.isCompleted ? (
                          <span className="text-green-500 text-xs font-bold">✓ Done</span>
                        ) : r.isCancelled ? (
                          <span className="text-[var(--text-muted-alt)] text-xs">Cancelled</span>
                        ) : (
                          <span className="text-[var(--text-muted-alt)] text-xs">Underway</span>
                        )}
                      </td>
                      <td className="p-2 max-w-[120px] truncate">
                        {displayNote(r.note) || ''}
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-1">
                          {isAdmin && (
                            <button
                              onClick={() => openAdminEdit(r)}
                              className="text-[#e67e00] hover:text-orange-400 text-[10px] font-bold px-1"
                              title="Admin edit Payment / Note / Final Bags"
                            >
                              Admin
                            </button>
                          )}
                          {canEditRow(r) ? (
                            <button
                              onClick={() => onEditEstimate(r)}
                              className="text-blue-400 hover:text-blue-300"
                              title="Edit estimate"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          ) : !isAdmin ? (
                            <span className="text-[10px] text-[var(--text-muted-alt)]">Locked</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={14} className="p-6 text-center text-[var(--text-muted-alt)]">
                    No boli records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!filters.supplierId ? (
          <Pagination
            currentPage={page}
            totalItems={total}
            itemsPerPage={pageSize}
            onPageChange={setPage}
            pageSizeOptions={[10, 50, 100]}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        ) : (
          <p className="text-xs text-[var(--text-muted-alt)] py-2">
            Showing all {total} boli(s) for selected Artia (no pagination).
          </p>
        )}


        {/* Add Final Boli — Feedback 32 Pg.2 */}
        <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-panel-alt)]">
          <div className="px-4 py-2 border-b border-[var(--border-subtle)] font-bold text-sm text-[#e67e00] bg-[#e67e00]/10">
            Add Final Boli
          </div>
          <form onSubmit={submitFinalBoli} className="p-4 space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[var(--text-muted-alt)] mb-1">
                  Boli No. (Dropdown)
                </label>
                <select
                  value={finalForm.boliId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const b = openBolis.find((x) => x.id === id);
                    // Auto-fetch all estimate details for this Boli No.
                    setFinalForm((f) => ({
                      ...f,
                      boliId: id,
                      supervisorName:
                        b?.supervisorName ||
                        (isSupervisor ? user?.username : '') ||
                        '',
                      artiaBillChecked: 'No',
                      finalBagsById: {},
                      biometricData: '',
                    }));
                  }}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                >
                  <option value="">Select Boli No.</option>
                  {openBoliOptions.map((b) => (
                    <option key={b.sodaId || b.id} value={b.id}>
                      {b.boliNo} — {b.artiaName}
                      {b.date
                        ? ` (${new Date(b.date).toLocaleDateString()})`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted-alt)] mb-1">
                  Artia Name (Auto-fetch)
                </label>
                <input
                  readOnly
                  tabIndex={-1}
                  value={selectedOpen?.artiaName || ''}
                  placeholder="—"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] opacity-80 cursor-default"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted-alt)] mb-1">
                  Mandi Name (Auto-fetch)
                </label>
                <input
                  readOnly
                  tabIndex={-1}
                  value={selectedOpen?.mandi || ''}
                  placeholder="—"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] opacity-80 cursor-default"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted-alt)] mb-1">
                  Supervisor
                </label>
                {isSupervisor || !isAdmin ? (
                  <input
                    readOnly
                    tabIndex={-1}
                    value={
                      selectedOpen?.supervisorName ||
                      finalForm.supervisorName ||
                      user?.username ||
                      ''
                    }
                    placeholder="—"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] opacity-80 cursor-default"
                  />
                ) : (
                  <select
                    value={finalForm.supervisorName}
                    onChange={(e) =>
                      setFinalForm((f) => ({
                        ...f,
                        supervisorName: e.target.value,
                      }))
                    }
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                  >
                    <option value="">Select Supervisor</option>
                    {selectedOpen?.supervisorName && (
                      <option value={selectedOpen.supervisorName}>
                        {selectedOpen.supervisorName}
                      </option>
                    )}
                    {supervisors.map((s) => (
                      <option key={s.id} value={s.username}>
                        {s.username}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-[var(--text-muted-alt)] mb-1">
                  Artia Bill Checked And Matched of this Boli
                </label>
                <div className="flex gap-4 py-2">
                  {(['Yes', 'No'] as const).map((v) => (
                    <label
                      key={v}
                      className="flex items-center gap-2 cursor-pointer text-[var(--text-main)]"
                    >
                      <input
                        type="radio"
                        name="artiaBillChecked"
                        checked={finalForm.artiaBillChecked === v}
                        onChange={() =>
                          setFinalForm((f) => ({
                            ...f,
                            artiaBillChecked: v,
                            ...(v === 'No'
                              ? { finalBagsById: {}, biometricData: '' }
                              : {}),
                          }))
                        }
                        className="accent-[#e67e00]"
                      />
                      {v}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Feedback 32: always 4 lines — M/C | Estimate Bags | Rate | Final Bags
                (same as Estimate Purchase default 4 boli slots). Sibling soda bolis fill extra lines. */}
            {(() => {
              const anyCancelled =
                !!selectedOpen &&
                finalBoliLines.some(
                  (b: any) =>
                    b &&
                    (b.isCancelled ||
                      (!Number.isNaN(Number(b.estimatedBags)) &&
                        Number(b.estimatedBags) === 0)),
                );
              const showHeaders = !anyCancelled || finalBoliLines.some((b: any) => b && Number(b.estimatedBags) > 0);
              return (
            <div className="overflow-x-auto rounded-lg bg-[var(--bg-base)] px-1 py-2">
              <table className="w-full text-sm border-separate border-spacing-0">
                {showHeaders && (
                <thead>
                  <tr className="text-[var(--text-muted-alt)] text-[11px] uppercase tracking-wide">
                    <th className="font-medium text-left px-3 py-2 w-10">#</th>
                    <th className="font-medium text-left px-3 py-2">Boli No.</th>
                    <th className="font-medium text-left px-3 py-2">M/C</th>
                    <th className="font-medium text-left px-3 py-2">
                      Estimate Bags
                    </th>
                    <th className="font-medium text-left px-3 py-2">Rate</th>
                    <th className="font-medium text-left px-3 py-2">
                      Final Bags <span className="text-red-500 normal-case">*</span>
                    </th>
                  </tr>
                </thead>
                )}
                <tbody>
                  {finalBoliLines.map((line: any, idx: number) => {
                    const bagsCancelled =
                      !!line &&
                      (line.isCancelled ||
                        (!Number.isNaN(Number(line.estimatedBags)) &&
                          Number(line.estimatedBags) === 0));
                    const empty = !line;
                    const dash = '-';
                    return (
                  <tr key={line?.id || `empty-${idx}`} className="border-t border-[var(--border-subtle)]/40">
                    <td className="px-3 py-1.5 text-[var(--text-muted-alt)] text-xs">{idx + 1}</td>
                    <td className="px-3 py-1.5 align-middle text-[var(--text-muted)] text-xs">
                      {empty ? dash : line.boliNo || dash}
                    </td>
                    <td className="px-3 py-1.5 align-middle">
                      <input
                        readOnly
                        tabIndex={-1}
                        title="Auto-fetched from Estimate Purchase"
                        value={
                          empty || bagsCancelled
                            ? ''
                            : line.moisture != null && line.moisture !== ''
                              ? String(line.moisture)
                              : ''
                        }
                        placeholder={empty ? dash : bagsCancelled ? 'Cancelled' : 'Auto'}
                        className="w-full min-w-[5rem] bg-transparent border-0 px-0 py-1 text-[var(--text-main)] opacity-90 cursor-default outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 align-middle">
                      <input
                        readOnly
                        tabIndex={-1}
                        title="Auto-fetched from Estimate Purchase"
                        value={
                          empty || bagsCancelled
                            ? ''
                            : line.estimatedBags != null && line.estimatedBags !== ''
                              ? String(line.estimatedBags)
                              : ''
                        }
                        placeholder={empty ? dash : bagsCancelled ? '' : 'Auto'}
                        className="w-full min-w-[5rem] bg-transparent border-0 px-0 py-1 text-[var(--text-main)] opacity-90 cursor-default outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 align-middle">
                      <input
                        readOnly
                        tabIndex={-1}
                        title="Auto-fetched from Estimate Purchase"
                        value={
                          empty || bagsCancelled
                            ? ''
                            : line.rate != null && line.rate !== ''
                              ? String(line.rate)
                              : ''
                        }
                        placeholder={empty ? dash : bagsCancelled ? '' : 'Auto'}
                        className="w-full min-w-[5rem] bg-transparent border-0 px-0 py-1 text-[var(--text-main)] opacity-90 cursor-default outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 align-middle">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={3}
                        disabled={empty || !billYes || bagsCancelled}
                        title={
                          empty
                            ? 'Empty line (no boli on this slot)'
                            : bagsCancelled
                              ? 'Cancelled (Bags = 0) — Final Bags not applicable'
                              : billYes
                                ? 'Enter Final Bags manually (max 999, whole numbers)'
                                : 'Set Artia Bill Checked = Yes to enable'
                        }
                        value={
                          empty || bagsCancelled
                            ? ''
                            : finalForm.finalBagsById[line.id] || ''
                        }
                        onChange={(e) => {
                          if (empty || !line?.id) return;
                          const raw = e.target.value.replace(/\D/g, '').slice(0, 3);
                          setFinalForm((f) => ({
                            ...f,
                            finalBagsById: {
                              ...f.finalBagsById,
                              [line.id]: raw,
                            },
                          }));
                        }}
                        placeholder={
                          empty
                            ? dash
                            : bagsCancelled
                              ? '—'
                              : billYes
                                ? 'Manual'
                                : 'Locked'
                        }
                        className={`w-full min-w-[6rem] bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-[var(--text-main)] outline-none focus:border-[#e67e00] ${
                          empty || !billYes || bagsCancelled
                            ? 'opacity-40 cursor-not-allowed'
                            : ''
                        }`}
                      />
                    </td>
                  </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[10px] text-[var(--text-muted-alt)] px-3 pt-1">
                One Boli No. covers all today&apos;s lines for this Artia (Estimate Purchase).
                M/C, Estimate Bags and Rate auto-fetch per line; empty slots show (-). Enter
                Final Bags on each filled line when Artia Bill = Yes.
              </p>
            </div>
              );
            })()}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={scanFingerprint}
                disabled={scanning || !billYes || !selectedOpen}
                className="px-3 py-2 rounded border border-[var(--border-subtle)] text-sm disabled:opacity-40"
              >
                {scanning
                  ? 'Scanning…'
                  : finalForm.biometricData
                    ? 'Fingerprint ✓'
                    : 'Scan Fingerprint'}
              </button>
              <button
                type="submit"
                disabled={!billYes || !selectedOpen || finalSaving}
                className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {finalSaving ? 'Submitting…' : 'Submit with Fingerprint'}
              </button>
              {selectedOpen && (
                <>
                  <button
                    type="button"
                    onClick={cancelSelectedBoli}
                    disabled={cancelling}
                    className="px-3 py-2 rounded border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/10 disabled:opacity-40"
                    title="Cancel this Boli (supervisor allowed here)"
                  >
                    {cancelling ? 'Cancelling…' : 'Cancel this Boli'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEntireSoda}
                    disabled={cancelling}
                    className="px-3 py-2 rounded border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/10 disabled:opacity-40"
                    title="Cancel entire soda / estimate"
                  >
                    Cancel entire Soda
                  </button>
                </>
              )}
            </div>
            {selectedOpen && (
              <p className="text-[10px] text-[var(--text-muted-alt)]">
                Cancel is allowed here for supervisors (max 3 per soda). Cancel is
                blocked in Add Estimate Purchase.
              </p>
            )}
          </form>
        </div>

      </div>

      <CustomModal
        isOpen={adminEdit.isOpen}
        onClose={() => setAdminEdit({ isOpen: false, row: null, payment: '', note: '', finalBags: '' })}
        title="Admin Edit — Table 01"
      >
        {adminEdit.row && (
          <form onSubmit={saveAdminEdit} className="space-y-3">
            <p className="text-xs text-[var(--text-muted-alt)]">
              Boli {adminEdit.row.boliNo} · {adminEdit.row.partyName}
            </p>
            <div>
              <label className="block text-xs text-[var(--text-muted-alt)] mb-1">Final Bags</label>
              <input
                type="number"
                min="0"
                max="999"
                step="1"
                value={adminEdit.finalBags}
                onChange={(e) => setAdminEdit((s) => ({ ...s, finalBags: e.target.value }))}
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted-alt)] mb-1">Payment (H)</label>
              <input
                type="number"
                step="0.01"
                value={adminEdit.payment}
                onChange={(e) => setAdminEdit((s) => ({ ...s, payment: e.target.value }))}
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              />
              <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">
                Leave blank to auto-calc from Final Bags × 0.375 × (Govt − Rate). Final Hisab (I) recompounds from Payment.
              </p>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted-alt)] mb-1">Note</label>
              <textarea
                value={adminEdit.note}
                onChange={(e) => setAdminEdit((s) => ({ ...s, note: e.target.value }))}
                rows={2}
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdminEdit({ isOpen: false, row: null, payment: '', note: '', finalBags: '' })}
                className="px-3 py-2 text-[var(--text-muted-alt)]"
              >
                Cancel
              </button>
              <button type="submit" disabled={adminEditLock.pending} className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold disabled:opacity-50">
                {adminEditLock.pending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </CustomModal>
    </div>
  );
}

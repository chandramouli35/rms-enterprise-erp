import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { usePlantStore } from '../store/plantStore';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { biometricService } from '../services/biometricService';
import { Fingerprint, Scale } from 'lucide-react';
import { hasModulePermission } from '../utils/modulePermissions';

export type StackTransferMode = 'stack_to_hoodi' | 'dryer_bharai_to_stack';

type Props = {
  mode: StackTransferMode;
};

const nowLocalDate = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const nowLocalTime = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Feedback 47 — Stack → Hoodi and Dryer Bharai → Stack:
 * Gross / Tare / Net, real-time Date/Time (Global Settings), pending WB truck pick.
 */
export default function StackHoodiTransferForm({ mode }: Props) {
  const activePlant = usePlantStore((s) => s.activePlant);
  const user = useAuthStore((s) => s.user);
  const isAdmin = /SUPER_ADMIN|PLANT_MANAGER|ADMIN/i.test(String(user?.role || ''));
  const allowManual = !!activePlant?.allowManualDateTimeStackTransfer;
  const autoRealtime = !allowManual;

  const isStackToHoodi = mode === 'stack_to_hoodi';
  const canTransfer = hasModulePermission(
    'Procurement',
    'canAdd',
    isStackToHoodi ? 'Stack to Hoodi' : 'Dryer Bharai to Stack',
  );
  const endpoint = isStackToHoodi
    ? '/api/procurement/hoodi-transfer'
    : '/api/procurement/dryer-bharai-transfer';

  const [loading, setLoading] = useState(false);
  const [wbLoading, setWbLoading] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [pendingId, setPendingId] = useState('');

  const [formData, setFormData] = useState({
    stackNo: '',
    bags: '',
    moisture: '',
    unloadedBy: '',
    truckNo: '',
    grossWeight: '',
    tareWeight: '',
    netWeight: '',
    rstNo: '',
    entryDate: nowLocalDate(),
    entryTime: nowLocalTime(),
    biometricData: '',
  });

  // Live clock when real-time tracking ON
  useEffect(() => {
    if (!autoRealtime) return;
    const tick = () =>
      setFormData((prev) => ({
        ...prev,
        entryDate: nowLocalDate(),
        entryTime: nowLocalTime(),
      }));
    tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
  }, [autoRealtime]);

  // Net = Gross − Tare
  useEffect(() => {
    const g = parseFloat(formData.grossWeight);
    const t = parseFloat(formData.tareWeight);
    if (!Number.isFinite(g) || !Number.isFinite(t)) return;
    const net = (g - t).toFixed(3);
    setFormData((prev) => (prev.netWeight === net ? prev : { ...prev, netWeight: net }));
  }, [formData.grossWeight, formData.tareWeight]);

  const loadPending = useCallback(async () => {
    if (!activePlant?.id) return;
    try {
      const res = await api.get(`/api/weighbridge/history/${activePlant.id}`);
      const rows = Array.isArray(res.data) ? res.data : [];
      setPendingList(
        rows.filter(
          (r: any) =>
            r.status === 'COMPLETED' &&
            (r.netWeight != null ||
              (r.grossWeight != null && r.tareWeight != null)),
        ),
      );
    } catch {
      setPendingList([]);
    }
  }, [activePlant?.id]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const applyPending = (id: string) => {
    setPendingId(id);
    const row = pendingList.find((r) => r.id === id);
    if (!row) return;
    const gross = row.grossWeight != null ? Number(row.grossWeight) : null;
    const tare = row.tareWeight != null ? Number(row.tareWeight) : null;
    const net =
      row.netWeight != null
        ? Number(row.netWeight)
        : gross != null && tare != null
          ? gross - tare
          : null;
    setFormData((prev) => ({
      ...prev,
      truckNo: row.vehicleNo || prev.truckNo,
      ...(gross != null ? { grossWeight: String(gross) } : {}),
      ...(tare != null ? { tareWeight: String(tare) } : {}),
      ...(net != null ? { netWeight: Number(net).toFixed(3) } : {}),
    }));
    useUiStore.getState().addToast('Pending weighbridge entry applied', 'success');
  };

  const fetchLiveWeights = async () => {
    if (!activePlant?.id) return;
    setWbLoading(true);
    setErrorMsg('');
    try {
      if (formData.truckNo.trim()) {
        const res = await api.get(
          `/api/weighbridge/latest/${activePlant.id}/${encodeURIComponent(formData.truckNo.trim())}`,
        );
        const wb = res.data;
        if (!wb) {
          setErrorMsg('No weighbridge reading found for this truck');
          return;
        }
        const kgToQtl = (kg: number) => Number((kg / 100).toFixed(3));
        const gross = wb.grossWeight != null ? kgToQtl(Number(wb.grossWeight)) : null;
        const tare = wb.tareWeight != null ? kgToQtl(Number(wb.tareWeight)) : null;
        const net =
          wb.netWeight != null
            ? kgToQtl(Number(wb.netWeight))
            : gross != null && tare != null
              ? Number((gross - tare).toFixed(3))
              : null;
        setFormData((prev) => ({
          ...prev,
          ...(gross != null ? { grossWeight: String(gross) } : {}),
          ...(tare != null ? { tareWeight: String(tare) } : {}),
          ...(net != null ? { netWeight: Number(net).toFixed(3) } : {}),
        }));
        return;
      }
      const res = await api.get(`/api/weighbridge/live/${activePlant.id}`);
      const live = res.data;
      if (!live?.connected || live.weightKg == null) {
        setErrorMsg(
          live?.message ||
            'No live weighbridge reading. Connect the COM Bridge or select a pending truck.',
        );
        return;
      }
      // Live single reading → treat as gross hint; supervisor still needs tare
      const mt = Number(live.weightKg) / 1000;
      setFormData((prev) => ({
        ...prev,
        grossWeight: mt > 0 ? mt.toFixed(3) : prev.grossWeight,
      }));
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'Failed to fetch weighbridge weight');
    } finally {
      setWbLoading(false);
    }
  };

  const captureFingerprint = async () => {
    setFpLoading(true);
    try {
      const xml = await biometricService.captureAndVerifyLoggedInUser();
      setFormData((prev) => ({ ...prev, biometricData: xml }));
      useUiStore.getState().addToast('Fingerprint matched', 'success');
    } catch (e: any) {
      useUiStore.getState().addToast(e?.message || 'Fingerprint capture failed', 'error');
    } finally {
      setFpLoading(false);
    }
  };

  const weightLocked = autoRealtime; // when realtime ON, weights come from WB / pending (manual punch when OFF)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlant) return;
    if (!(parseFloat(formData.bags) > 0)) {
      setErrorMsg('Bags must be greater than 0');
      return;
    }
    if (!(parseFloat(formData.netWeight) > 0)) {
      setErrorMsg('Net Weight is required (Gross − Tare, or select pending WB entry)');
      return;
    }
    if (!formData.rstNo.trim()) {
      setErrorMsg('RST No. is required');
      return;
    }
    if (!isAdmin && !formData.biometricData) {
      setErrorMsg('Supervisor fingerprint is required');
      return;
    }
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await api.post(endpoint, {
        plantId: activePlant.id,
        stackNo: formData.stackNo,
        bags: formData.bags,
        moisture: formData.moisture,
        unloadedBy: formData.unloadedBy || undefined,
        truckNo: formData.truckNo || undefined,
        grossWeight: formData.grossWeight || undefined,
        tareWeight: formData.tareWeight || undefined,
        netWeight: formData.netWeight,
        rstNo: formData.rstNo,
        entryDate: formData.entryDate,
        entryTime: formData.entryTime,
        biometricData: formData.biometricData || (isAdmin ? 'ADMIN_BYPASS' : undefined),
      });
      setSuccessMsg(
        isStackToHoodi
          ? 'Successfully transferred stack to Hoodi.'
          : 'Successfully recorded Dryer Bharai to Stack.',
      );
      setFormData({
        stackNo: '',
        bags: '',
        moisture: '',
        unloadedBy: '',
        truckNo: '',
        grossWeight: '',
        tareWeight: '',
        netWeight: '',
        rstNo: '',
        entryDate: nowLocalDate(),
        entryTime: nowLocalTime(),
        biometricData: '',
      });
      setPendingId('');
      loadPending();
    } catch (error: any) {
      setErrorMsg(
        error.response?.data?.message ||
          (isStackToHoodi
            ? 'Failed to transfer stack.'
            : 'Failed to record Dryer Bharai to Stack.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const title = isStackToHoodi ? '4. Stack to Hoodi Transfer' : '5. Dryer Bharai to Stack';
  const subtitle = isStackToHoodi
    ? 'Feedback 47 — Gross/Tare/Net, real-time date/time, pending WB'
    : 'Dried paddy returned to stack — same weight rules as Stack to Hoodi';
  const accent = isStackToHoodi ? 'text-[#e67e00]' : 'text-emerald-500';
  const btnClass = isStackToHoodi
    ? 'bg-[#e67e00] hover:bg-orange-600 shadow-orange-500/20'
    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20';

  const pendingOptions = useMemo(
    () =>
      pendingList.slice(0, 40).map((r) => {
        const net =
          r.netWeight != null
            ? Number(r.netWeight)
            : Number(r.grossWeight || 0) - Number(r.tareWeight || 0);
        const when = r.createdAt ? new Date(r.createdAt).toLocaleString() : '';
        return {
          id: r.id,
          label: `${r.vehicleNo || '—'} · Net ${Number(net).toFixed(3)} · ${when}`,
        };
      }),
    [pendingList],
  );

  const inputCls =
    'w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00] transition-colors';
  const lockedCls = `${inputCls} opacity-70 cursor-not-allowed bg-[var(--bg-panel-alt)]`;

  return (
    <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] shadow-sm max-w-2xl">
      <div className="p-4 border-b border-[var(--border-subtle)] bg-gradient-to-r from-[var(--bg-panel)] to-[var(--bg-panel-hover)] rounded-t-xl">
        <h2 className={`text-lg font-bold text-[var(--text-main)] flex items-center gap-2`}>
          <div
            className={`p-1.5 rounded-lg ${isStackToHoodi ? 'bg-orange-500/10' : 'bg-emerald-500/10'} ${accent}`}
          >
            <Scale size={20} />
          </div>
          {title}
        </h2>
        <p className="text-[10px] text-[var(--text-muted-alt)] mt-1 ml-10">{subtitle}</p>
        <p className="text-[10px] mt-1 ml-10">
          Real-time tracking:{' '}
          <span className={autoRealtime ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
            {autoRealtime ? 'ON' : 'OFF'}
          </span>
          <span className="text-[var(--text-muted-alt)]">
            {' '}
            (Global Settings → Stack / Hoodi Transfer)
          </span>
        </p>
      </div>

      <div className="p-6">
        {successMsg && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded text-sm">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.entryDate}
                readOnly={autoRealtime}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, entryDate: e.target.value }))
                }
                className={autoRealtime ? lockedCls : inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">
                Time *
              </label>
              <input
                type="time"
                required
                value={formData.entryTime}
                readOnly={autoRealtime}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, entryTime: e.target.value }))
                }
                className={autoRealtime ? lockedCls : inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">
                Stack No. *
              </label>
              <input
                type="text"
                required
                value={formData.stackNo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, stackNo: e.target.value }))
                }
                className={inputCls}
                placeholder="e.g. 100A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">
                Bags *
              </label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={formData.bags}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bags: e.target.value }))
                }
                className={inputCls}
                placeholder="2340"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">
                Moisture (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.moisture}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, moisture: e.target.value }))
                }
                className={inputCls}
                placeholder={isStackToHoodi ? '17.0' : '14.0'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">
                Unloaded By
              </label>
              <input
                type="text"
                value={formData.unloadedBy}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, unloadedBy: e.target.value }))
                }
                className={inputCls}
                placeholder="Name"
              />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)]/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
                <Scale size={16} className="text-[#e67e00]" />
                Weight Segment
              </div>
              <button
                type="button"
                onClick={fetchLiveWeights}
                disabled={wbLoading}
                className="px-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg text-xs font-medium text-[var(--text-main)] hover:border-[#e67e00] disabled:opacity-50"
              >
                {wbLoading ? '…' : 'Fetch WB'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">
                Pending weighbridge truck (optional)
              </label>
              <select
                value={pendingId}
                onChange={(e) => applyPending(e.target.value)}
                className={inputCls}
              >
                <option value="">Select pending entry…</option>
                {pendingOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">
                  Truck No.
                </label>
                <input
                  type="text"
                  value={formData.truckNo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, truckNo: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="For WB lookup"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">
                  RST No. *
                </label>
                <input
                  type="text"
                  required
                  value={formData.rstNo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, rstNo: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="RST-7485963"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">
                  Gross
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.grossWeight}
                  readOnly={weightLocked}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, grossWeight: e.target.value }))
                  }
                  className={weightLocked ? lockedCls : `${inputCls} font-mono`}
                  placeholder="0.000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">
                  Tare
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.tareWeight}
                  readOnly={weightLocked}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tareWeight: e.target.value }))
                  }
                  className={weightLocked ? lockedCls : `${inputCls} font-mono`}
                  placeholder="0.000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">
                  Net * (auto)
                </label>
                <input
                  type="number"
                  required
                  step="0.001"
                  min="0.001"
                  value={formData.netWeight}
                  readOnly
                  className={`${lockedCls} font-mono font-semibold text-amber-400`}
                  placeholder="Gross − Tare"
                  title="Auto-calculated Net Weight"
                />
              </div>
            </div>
            <p className="text-[10px] text-[var(--text-muted-alt)]">
              {allowManual
                ? 'Manual mode: punch Gross/Tare (or Fetch WB / pending). Net = Gross − Tare.'
                : 'Real-time ON: use Fetch WB or select a pending truck. Gross/Tare not typed manually; Net auto.'}
            </p>
          </div>

          {!isAdmin && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] p-3">
              <div className="text-sm text-[var(--text-muted-alt)]">
                Supervisor fingerprint <span className="text-red-500">*</span>
                {formData.biometricData && (
                  <span className="ml-2 text-green-500 font-medium">Captured</span>
                )}
              </div>
              <button
                type="button"
                onClick={captureFingerprint}
                disabled={fpLoading}
                className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg text-sm font-medium text-[var(--text-main)] hover:border-[#e67e00] disabled:opacity-50"
              >
                <Fingerprint size={16} className="text-[#e67e00]" />
                {fpLoading ? 'Scanning…' : formData.biometricData ? 'Re-scan' : 'Scan'}
              </button>
            </div>
          )}

          <div className="flex justify-end pt-4">
            {canTransfer ? (
            <button
              type="submit"
              disabled={loading}
              className={`${btnClass} text-white px-6 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 transition-colors`}
            >
              {loading
                ? isStackToHoodi
                  ? 'Transferring...'
                  : 'Saving...'
                : isStackToHoodi
                  ? 'Transfer to Hoodi'
                  : 'Record Dryer Bharai to Stack'}
            </button>
            ) : (
              <p className="text-sm text-[var(--text-muted-alt)]">
                Add permission is required to save this transfer.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

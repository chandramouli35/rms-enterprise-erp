import React, { useState } from 'react';
import api from '../api/axios';
import { usePlantStore } from '../store/plantStore';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { biometricService } from '../services/biometricService';
import { ArrowRightLeft, Fingerprint, Scale } from 'lucide-react';

/**
 * Stack → Hoodi with Weight Segment (weighbridge), RST No., fingerprint auth.
 * Part of Stack & Paddy Integration.
 */
export default function StackToHoodiTransfer() {
  const activePlant = usePlantStore((state) => state.activePlant);
  const user = useAuthStore((s) => s.user);
  const isAdmin = /SUPER_ADMIN|PLANT_MANAGER|ADMIN/i.test(
    String(user?.role?.name || user?.role || ''),
  );
  const [loading, setLoading] = useState(false);
  const [wbLoading, setWbLoading] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    stackNo: '',
    bags: '',
    moisture: '',
    unloadedBy: '',
    netWeight: '',
    rstNo: '',
    biometricData: '',
  });

  const fetchLiveNetWeight = async () => {
    if (!activePlant?.id) return;
    setWbLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get(`/api/weighbridge/live/${activePlant.id}`);
      const live = res.data;
      if (!live?.connected || live.weightKg == null) {
        setErrorMsg(
          live?.message ||
            'No live weighbridge reading. Connect the COM Bridge first.',
        );
        return;
      }
      // Live indicator is kg; store as MT for stack totals
      const mt = Number(live.weightKg) / 1000;
      setFormData((prev) => ({
        ...prev,
        netWeight: mt > 0 ? mt.toFixed(3) : '',
      }));
    } catch (e: any) {
      setErrorMsg(
        e?.response?.data?.message || 'Failed to fetch weighbridge weight',
      );
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
      useUiStore
        .getState()
        .addToast(e?.message || 'Fingerprint capture failed', 'error');
    } finally {
      setFpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlant) return;
    if (!formData.netWeight) {
      setErrorMsg('Net Weight (Weight Segment) is required — fetch from weighbridge');
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
      await api.post('/api/procurement/hoodi-transfer', {
        plantId: activePlant.id,
        stackNo: formData.stackNo,
        bags: formData.bags,
        moisture: formData.moisture,
        unloadedBy: formData.unloadedBy,
        netWeight: formData.netWeight,
        rstNo: formData.rstNo,
        biometricData: formData.biometricData || (isAdmin ? 'ADMIN_BYPASS' : undefined),
      });
      setSuccessMsg('Successfully transferred stack to Hoodi.');
      setFormData({
        stackNo: '',
        bags: '',
        moisture: '',
        unloadedBy: '',
        netWeight: '',
        rstNo: '',
        biometricData: '',
      });
    } catch (error: any) {
      setErrorMsg(
        error.response?.data?.message || 'Failed to transfer stack.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] shadow-sm max-w-2xl">
      <div className="p-4 border-b border-[var(--border-subtle)] bg-gradient-to-r from-[var(--bg-panel)] to-[var(--bg-panel-hover)] rounded-t-xl">
        <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
          <div className="p-1.5 bg-orange-500/10 rounded-lg text-[#e67e00]">
            <ArrowRightLeft size={20} />
          </div>
          4. Stack to Hoodi Transfer
        </h2>
        <p className="text-[10px] text-[var(--text-muted-alt)] mt-1 ml-10">
          Stack &amp; Paddy Integration — Weight Segment, RST No., fingerprint
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
                Stack No. *
              </label>
              <input
                type="text"
                required
                value={formData.stackNo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, stackNo: e.target.value }))
                }
                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00] transition-colors"
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
                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00] transition-colors"
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
                  setFormData((prev) => ({
                    ...prev,
                    moisture: e.target.value,
                  }))
                }
                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00] transition-colors"
                placeholder="17.0"
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
                  setFormData((prev) => ({
                    ...prev,
                    unloadedBy: e.target.value,
                  }))
                }
                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00] transition-colors"
                placeholder="Name"
              />
            </div>
          </div>

          {/* Weight Segment — weighbridge */}
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)]/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
              <Scale size={16} className="text-[#e67e00]" />
              Weight Segment
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">
                  Net Weight (MT) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    step="0.001"
                    min="0.001"
                    value={formData.netWeight}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        netWeight: e.target.value,
                      }))
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00] transition-colors font-mono"
                    placeholder="From WB"
                  />
                  <button
                    type="button"
                    onClick={fetchLiveNetWeight}
                    disabled={wbLoading}
                    className="shrink-0 px-3 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg text-xs font-medium text-[var(--text-main)] hover:border-[#e67e00] disabled:opacity-50"
                  >
                    {wbLoading ? '…' : 'Fetch WB'}
                  </button>
                </div>
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
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00] transition-colors"
                  placeholder="RST-7485963"
                />
              </div>
            </div>
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
            <button
              type="submit"
              disabled={loading}
              className="bg-[#e67e00] text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Transferring...' : 'Transfer to Hoodi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

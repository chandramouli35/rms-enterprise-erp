import React, { useState } from 'react';
import api from '../api/axios';
import { usePlantStore } from '../store/plantStore';
import { ArrowRightLeft } from 'lucide-react';

export default function StackToHoodiTransfer() {
  const activePlant = usePlantStore(state => state.activePlant);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState({
    stackNo: '',
    bags: '',
    moisture: '',
    unloadedBy: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlant) return;
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await api.post('/api/procurement/hoodi-transfer', {
        plantId: activePlant.id,
        stackNo: formData.stackNo,
        bags: formData.bags,
        moisture: formData.moisture,
        unloadedBy: formData.unloadedBy
      });
      setSuccessMsg('Successfully transferred stack to Hoodi.');
      setFormData({ stackNo: '', bags: '', moisture: '', unloadedBy: '' });
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to transfer stack.');
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
          Below Boli Record in Procurement nav (running section S.No. 3 → 4)
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
              <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Stack No. *</label>
              <input
                type="text"
                required
                value={formData.stackNo}
                onChange={(e) => setFormData(prev => ({ ...prev, stackNo: e.target.value }))}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00] transition-colors"
                placeholder="e.g. 100A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Bags *</label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={formData.bags}
                onChange={(e) => setFormData(prev => ({ ...prev, bags: e.target.value }))}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00] transition-colors"
                placeholder="2340"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Moisture (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.moisture}
                onChange={(e) => setFormData(prev => ({ ...prev, moisture: e.target.value }))}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00] transition-colors"
                placeholder="17.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Unloaded By</label>
              <input
                type="text"
                value={formData.unloadedBy}
                onChange={(e) => setFormData(prev => ({ ...prev, unloadedBy: e.target.value }))}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00] transition-colors"
                placeholder="Name"
              />
            </div>
          </div>

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

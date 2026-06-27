import React, { useState } from 'react';
import axiosInstance from '../api/axios';
import { toast } from 'react-hot-toast';

export const QualityControl: React.FC = () => {
  const [gatePassId, setGatePassId] = useState('');
  const [metrics, setMetrics] = useState({
    moisturePercentage: 14.0,
    discolorationPercentage: 2.0,
    brokenGrainsPercentage: 5.0,
    foreignMatterPercentage: 1.0,
  });

  // Calculate status preview based on tolerances
  const getStatusPreview = () => {
    if (metrics.moisturePercentage > 18.0 || metrics.brokenGrainsPercentage > 10.0) {
      return { status: 'REJECTED', color: 'bg-red-500/20 text-red-500 border-red-500/50' };
    }
    if (metrics.moisturePercentage > 14.0 || metrics.brokenGrainsPercentage > 5.0) {
      return { status: 'ACCEPTED_WITH_DEDUCTION', color: 'bg-orange-500/20 text-orange-500 border-orange-500/50' };
    }
    return { status: 'APPROVED', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50' };
  };

  const preview = getStatusPreview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/quality-checks', {
        gatePassId,
        ...metrics
      });
      toast.success('Quality Check recorded successfully');
      setGatePassId('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit QC');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-100">Quality Inspection Desk</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Gate Pass / Vehicle ID</label>
              <input
                type="text" required
                placeholder="Scan or enter ID..."
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 text-lg font-mono"
                value={gatePassId}
                onChange={(e) => setGatePassId(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-gray-300 font-semibold border-b border-white/10 pb-2">Lab Parameters</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Moisture (%)</label>
                  <input
                    type="number" step="0.1" required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                    value={metrics.moisturePercentage}
                    onChange={(e) => setMetrics({ ...metrics, moisturePercentage: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Standard: ≤ 14.0%</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Broken Grains (%)</label>
                  <input
                    type="number" step="0.1" required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                    value={metrics.brokenGrainsPercentage}
                    onChange={(e) => setMetrics({ ...metrics, brokenGrainsPercentage: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Standard: ≤ 5.0%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Discoloration (%)</label>
                  <input
                    type="number" step="0.1" required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                    value={metrics.discolorationPercentage}
                    onChange={(e) => setMetrics({ ...metrics, discolorationPercentage: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Foreign Matter (%)</label>
                  <input
                    type="number" step="0.1" required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                    value={metrics.foreignMatterPercentage}
                    onChange={(e) => setMetrics({ ...metrics, foreignMatterPercentage: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-500 text-white px-4 py-3 rounded-lg font-bold transition-colors text-lg"
            >
              Submit Quality Check
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border ${preview.color} flex flex-col justify-center items-center h-48 transition-colors duration-300`}>
            <span className="text-sm font-semibold tracking-wider opacity-80 uppercase mb-2">Automated Decision Preview</span>
            <h2 className="text-3xl font-bold text-center">{preview.status.replace(/_/g, ' ')}</h2>
            {preview.status === 'ACCEPTED_WITH_DEDUCTION' && (
              <p className="mt-4 text-center opacity-90">
                Price deductions will be applied automatically to this batch based on threshold limits.
              </p>
            )}
            {preview.status === 'REJECTED' && (
              <p className="mt-4 text-center opacity-90 font-medium">
                Batch exceeds maximum allowable tolerance limits. Do not unload vehicle.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

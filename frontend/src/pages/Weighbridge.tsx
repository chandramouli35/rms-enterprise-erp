import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axios';
import { usePlantStore } from '../store/plantStore';
import { toast } from 'react-hot-toast';

export const Weighbridge: React.FC = () => {
  const activePlantId = usePlantStore(state => state.activePlant?.id);
  const [activeQueue, setActiveQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // LED Scoreboard state
  const [currentWeight, setCurrentWeight] = useState(0);
  const [selectedPass, setSelectedPass] = useState<any>(null);
  
  // Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [captureType, setCaptureType] = useState<'GROSS' | 'TARE'>('GROSS');

  const loadQueue = async () => {
    if (!activePlantId) return;
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/weighbridge/active-queue');
      setActiveQueue(data);
    } catch (err: any) {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    // Simulate live weight fluctuations
    const interval = setInterval(() => {
      setCurrentWeight((prev) => prev + (Math.random() > 0.5 ? 0.01 : -0.01));
    }, 1500);
    return () => clearInterval(interval);
  }, [activePlantId]);

  const handleCaptureInitiate = (pass: any, type: 'GROSS' | 'TARE') => {
    setSelectedPass(pass);
    setCaptureType(type);
    if (isManualOverride) {
      setShowOverrideModal(true);
    } else {
      executeCapture(pass.id, type, currentWeight, false);
    }
  };

  const executeCapture = async (gatePassId: string, type: 'GROSS' | 'TARE', weight: number, isOverride: boolean, reason?: string) => {
    try {
      await axiosInstance.post('/weighbridge/capture-weight', {
        gatePassId,
        weight,
        type,
        isManualOverride: isOverride,
        overrideReason: reason
      });
      toast.success(`${type} weight captured successfully`);
      setShowOverrideModal(false);
      setOverrideReason('');
      setSelectedPass(null);
      loadQueue();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to capture weight');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Live Weighbridge Control</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative w-64">
            <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input
              type="text"
              placeholder="Search Pass No, Vehicle..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-400">Manual Override</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={isManualOverride} onChange={(e) => setIsManualOverride(e.target.checked)} />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
          </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LED Scoreboard */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center space-y-4 border-amber-500/30">
            <h3 className="text-gray-400 font-semibold tracking-wider">LIVE INDICATOR (MT)</h3>
            <div className="bg-black border-[4px] border-gray-800 rounded-xl w-full flex items-center justify-center min-h-[160px] shadow-inner relative overflow-hidden px-4">
              <span className="font-mono text-4xl lg:text-5xl text-red-500 tracking-wider font-bold z-10 py-4 whitespace-nowrap" style={{ textShadow: '0 0 10px rgba(239,68,68,0.8)' }}>
                {(currentWeight > 0 ? currentWeight : 15.45 + currentWeight).toFixed(3)}
              </span>
              {/* Optional: Add a subtle grid or scanline effect to the LED background here if you like */}
            </div>
            {isManualOverride && (
              <div className="w-full pt-2">
                <label className="text-xs text-gray-500 mb-1 block">MANUAL INPUT (MT)</label>
                <input
                  type="number"
                  className="w-full bg-[#111] border border-red-500/50 text-red-500 font-mono text-center text-3xl py-3 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.2)] focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  value={currentWeight > 0 ? currentWeight.toFixed(3) : (15.45 + currentWeight).toFixed(3)}
                  onChange={(e) => setCurrentWeight(parseFloat(e.target.value) || 0)}
                  step="0.001"
                />
              </div>
            )}
          </div>
        </div>

        {/* Queue */}
        <div className="lg:col-span-2">
          <div className="glass-panel rounded-xl overflow-hidden h-full">
            <div className="p-4 border-b border-white/10 bg-white/5">
              <h3 className="font-semibold text-gray-200">Active Vehicle Queue</h3>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/20 border-b border-white/5">
                    <th className="p-4 text-sm font-semibold text-gray-400">Gate Pass</th>
                    <th className="p-4 text-sm font-semibold text-gray-400">Vehicle</th>
                    <th className="p-4 text-sm font-semibold text-gray-400">Status</th>
                    <th className="p-4 text-sm font-semibold text-gray-400 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="p-4 text-center text-gray-400">Loading queue...</td></tr>
                  ) : activeQueue.filter(pass => {
                      if (!searchTerm) return true;
                      const term = searchTerm.toLowerCase();
                      return pass.passNumber?.toLowerCase().includes(term) || pass.vehicleNumber?.toLowerCase().includes(term);
                    }).length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-center text-gray-400">No matching vehicles found</td></tr>
                  ) : (
                    activeQueue.filter(pass => {
                      if (!searchTerm) return true;
                      const term = searchTerm.toLowerCase();
                      return pass.passNumber?.toLowerCase().includes(term) || pass.vehicleNumber?.toLowerCase().includes(term);
                    }).map((pass) => (
                      <tr key={pass.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-amber-500">{pass.passNumber}</td>
                        <td className="p-4 font-bold text-gray-200">{pass.vehicleNumber}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${pass.status === 'GENERATED' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                            {pass.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {pass.status === 'GENERATED' && (
                            <button
                              onClick={() => handleCaptureInitiate(pass, 'GROSS')}
                              className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded font-semibold text-sm transition-colors"
                            >
                              Capture Gross
                            </button>
                          )}
                          {pass.status === 'QC_PASSED' && (
                            <button
                              onClick={() => handleCaptureInitiate(pass, 'TARE')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded font-semibold text-sm transition-colors"
                            >
                              Capture Tare
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showOverrideModal && selectedPass && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-red-500/30 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center space-x-3 mb-4 text-red-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              <h3 className="text-xl font-bold">Manual Override Required</h3>
            </div>
            <p className="text-gray-300 mb-4 text-sm">
              You are capturing a manual {captureType} weight for <strong className="text-white">{selectedPass.vehicleNumber}</strong>. This action requires supervisory tracking.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">Reason for Override</label>
              <textarea
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </div>
            <div className="pt-2 flex space-x-3">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => executeCapture(selectedPass.id, captureType, currentWeight > 0 ? currentWeight : 15.45 + currentWeight, true, overrideReason)}
                disabled={!overrideReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

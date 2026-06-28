import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axios';
import { usePlantStore } from '../store/plantStore';
import { toast } from 'react-hot-toast';

interface MillingBatch {
  id: string;
  batchNumber: string;
  rawMaterialQty: number;
  status: string;
  createdAt: string;
  millingProcess?: {
    id: string;
    startTime: string;
    endTime?: string;
    productionLogs?: Array<{ quantity: number }>;
  };
}

const MillingDashboard: React.FC = () => {
  const activePlantId = usePlantStore(state => state.activePlant?.id);
  const [batches, setBatches] = useState<MillingBatch[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBatch, setNewBatch] = useState({ batchNumber: '', rawMaterialQty: '' });
  
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [activeBatch, setActiveBatch] = useState<MillingBatch | null>(null);
  const [logData, setLogData] = useState({ itemType: 'HEAD_RICE', quantity: '', shift: 'DAY' });
  const [paddyStock, setPaddyStock] = useState<number>(0);

  const fetchBatches = async () => {
    if (!activePlantId) return;
    try {
      setLoading(true);
      const { data } = await axiosInstance.get(`/production/plants/${activePlantId}/batches`);
      setBatches(data);
    } catch (err: any) {
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaddyStock = async () => {
    if (!activePlantId) return;
    try {
      const { data } = await axiosInstance.get(`/inventory/plants/${activePlantId}`);
      const paddy = data.find((i: any) => i.itemType === 'PADDY');
      setPaddyStock(paddy ? paddy.quantity : 0);
    } catch (err) {
      console.error('Failed to fetch paddy stock');
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchPaddyStock();
  }, [activePlantId]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/production/batches', {
        plantId: activePlantId,
        batchNumber: newBatch.batchNumber,
        rawMaterialQty: parseFloat(newBatch.rawMaterialQty)
      });
      toast.success('Batch created successfully');
      setIsCreateModalOpen(false);
      setNewBatch({ batchNumber: '', rawMaterialQty: '' });
      fetchBatches();
      fetchPaddyStock();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create batch');
    }
  };

  const handleStartMilling = async (batchId: string) => {
    try {
      await axiosInstance.post(`/production/batches/${batchId}/start`);
      toast.success('Milling started');
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start milling');
    }
  };

  const handleStopMilling = async (batchId: string) => {
    try {
      await axiosInstance.post(`/production/batches/${batchId}/stop`);
      toast.success('Milling stopped');
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to stop milling');
    }
  };

  const handleLogProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatch || !activeBatch.millingProcess) return;
    try {
      await axiosInstance.post(`/production/milling/${activeBatch.millingProcess.id}/log`, {
        itemType: logData.itemType,
        quantity: parseFloat(logData.quantity),
        shift: logData.shift
      });
      toast.success('Production logged successfully');
      setIsLogModalOpen(false);
      setLogData({ itemType: 'HEAD_RICE', quantity: '', shift: 'DAY' });
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to log production');
    }
  };

  const openLogModal = (batch: MillingBatch) => {
    setActiveBatch(batch);
    setIsLogModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Milling & Batch Management</h1>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white font-medium shadow-lg shadow-blue-500/20"
        >
          Create New Batch
        </button>
      </div>
      
      <div className="glass-panel p-4 mb-6">
        <h2 className="text-xl font-semibold mb-2">Active Batches</h2>
        <p className="text-sm text-gray-400">View and manage milling processes.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="py-2 px-2">Date</th>
                <th className="py-2 px-2">Batch No</th>
                <th className="py-2 px-2">Raw Material (MT)</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-4 text-center text-gray-500">Loading batches...</td></tr>
              ) : batches.length === 0 ? (
                <tr><td colSpan={5} className="py-4 text-center text-gray-500">No batches found.</td></tr>
              ) : (
                batches.map(batch => (
                  <tr key={batch.id} className="border-b border-gray-700 hover:bg-white/5">
                    <td className="py-3 px-2 text-sm text-gray-300">{new Date(batch.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-2 font-mono text-white">{batch.batchNumber}</td>
                    <td className="py-3 px-2 font-medium">{batch.rawMaterialQty.toFixed(3)}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        batch.status === 'PENDING' ? 'bg-gray-500/20 text-gray-400' :
                        batch.status === 'RUNNING' ? 'bg-yellow-500/20 text-yellow-500' :
                        'bg-emerald-500/20 text-emerald-500'
                      }`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right space-x-2">
                      {batch.status === 'PENDING' && (
                        <button 
                          onClick={() => handleStartMilling(batch.id)}
                          className="text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded text-white font-medium transition-colors"
                        >
                          Start Milling
                        </button>
                      )}
                      {batch.status === 'RUNNING' && batch.millingProcess && (
                        <>
                          <button 
                            onClick={() => openLogModal(batch)}
                            className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-white font-medium transition-colors"
                          >
                            Log Production
                          </button>
                          <button 
                            onClick={() => handleStopMilling(batch.id)}
                            className="text-xs bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded text-white font-medium transition-colors"
                          >
                            Stop
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Batch Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl w-full max-w-md shadow-2xl p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-1">Create New Batch</h3>
              <p className="text-xs text-gray-400">Initialize a milling process</p>
              
              <div className="mt-3 bg-gray-800/50 border border-gray-700 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-400">Current PADDY Stock</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${paddyStock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {paddyStock.toFixed(3)} MT
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Batch Number</label>
                <input
                  type="text"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                  value={newBatch.batchNumber}
                  onChange={(e) => setNewBatch({...newBatch, batchNumber: e.target.value})}
                  placeholder="e.g. BAT-2026-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Raw Material Quantity (MT)</label>
                <input
                  type="number"
                  required
                  step="0.001"
                  min="0.1"
                  max={paddyStock > 0 ? paddyStock : 0.1}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  value={newBatch.rawMaterialQty}
                  onChange={(e) => setNewBatch({...newBatch, rawMaterialQty: e.target.value})}
                />
              </div>
              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paddyStock <= 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Production Modal */}
      {isLogModalOpen && activeBatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl w-full max-w-md shadow-2xl p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-1">Log Finished Goods</h3>
              <p className="text-xs text-gray-400">Batch {activeBatch.batchNumber}</p>
              
              {/* Remaining calculation UI */}
              {(() => {
                const totalProduced = activeBatch.millingProcess?.productionLogs?.reduce((sum, log) => sum + log.quantity, 0) || 0;
                const remaining = Math.max(0, activeBatch.rawMaterialQty - totalProduced);
                return (
                  <div className="mt-3 bg-gray-800/50 border border-gray-700 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-400">Original Stock</p>
                      <p className="text-sm font-medium text-gray-200">{activeBatch.rawMaterialQty.toFixed(3)} MT</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Available to Log</p>
                      <p className={`text-sm font-bold ${remaining > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {remaining.toFixed(3)} MT
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <form onSubmit={handleLogProduction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Item Type</label>
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  value={logData.itemType}
                  onChange={(e) => setLogData({...logData, itemType: e.target.value})}
                >
                  <option value="HEAD_RICE">Head Rice</option>
                  <option value="BROKEN_RICE">Broken Rice</option>
                  <option value="BRAN">Bran</option>
                  <option value="HUSK">Husk</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Quantity Produced (MT)</label>
                <input
                  type="number"
                  required
                  step="0.001"
                  min="0.001"
                  max={Math.max(0, activeBatch.rawMaterialQty - (activeBatch.millingProcess?.productionLogs?.reduce((sum, log) => sum + log.quantity, 0) || 0))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  value={logData.quantity}
                  onChange={(e) => setLogData({...logData, quantity: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Shift</label>
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  value={logData.shift}
                  onChange={(e) => setLogData({...logData, shift: e.target.value})}
                >
                  <option value="DAY">Day Shift</option>
                  <option value="NIGHT">Night Shift</option>
                </select>
              </div>
              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MillingDashboard;

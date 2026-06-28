import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axios';
import { usePlantStore } from '../store/plantStore';
import { toast } from 'react-hot-toast';

interface Transfer {
  id: string;
  sourcePlantId: string;
  targetPlantId: string;
  itemType: string;
  itemCategory: string;
  quantity: number;
  status: 'INITIATED' | 'IN_TRANSIT' | 'RECEIVED';
  dispatchedAt: string;
  receivedAt: string | null;
  targetPlant?: {
    name: string;
  };
  sourcePlant?: {
    name: string;
  };
}

const PlantTransfers: React.FC = () => {
  const activePlantId = usePlantStore(state => state.activePlant?.id);
  const activePlantName = usePlantStore(state => state.activePlant?.name);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [allPlants, setAllPlants] = useState<{id: string, name: string}[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTransfer, setNewTransfer] = useState({
    targetPlantId: '',
    itemType: 'HEAD_RICE',
    itemCategory: 'FINISHED_GOOD',
    quantity: ''
  });

  const fetchTransfers = async () => {
    if (!activePlantId) return;
    try {
      setLoading(true);
      const { data } = await axiosInstance.get(`/transfers/plants/${activePlantId}`);
      setTransfers(data);
    } catch (err: any) {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlants = async () => {
    try {
      const { data } = await axiosInstance.get('/plants');
      setAllPlants(data.data || data || []);
    } catch (err) {
      toast.error('Failed to load plants for transfer options');
    }
  };

  useEffect(() => {
    fetchTransfers();
    fetchPlants();
  }, [activePlantId]);

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlantId) return;
    try {
      await axiosInstance.post('/transfers/initiate', {
        sourcePlantId: activePlantId,
        targetPlantId: newTransfer.targetPlantId,
        itemType: newTransfer.itemType,
        itemCategory: newTransfer.itemCategory,
        quantity: parseFloat(newTransfer.quantity)
      });
      toast.success('Transfer initiated successfully');
      setIsModalOpen(false);
      setNewTransfer({ ...newTransfer, quantity: '' }); // Reset quantity
      fetchTransfers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to initiate transfer');
    }
  };

  const handleMarkReceived = async (transferId: string, itemCategory: string) => {
    try {
      await axiosInstance.post(`/transfers/${transferId}/receive`, { itemCategory });
      toast.success('Transfer received successfully');
      fetchTransfers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to receive transfer');
    }
  };

  const outgoingInitiated = transfers.filter(t => t.sourcePlantId === activePlantId && t.status === 'INITIATED');
  const incomingInTransit = transfers.filter(t => t.targetPlantId === activePlantId && t.status === 'IN_TRANSIT');
  const allReceived = transfers.filter(t => (t.sourcePlantId === activePlantId || t.targetPlantId === activePlantId) && t.status === 'RECEIVED');

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inter-Plant Transfers</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white font-medium shadow-lg shadow-blue-500/20 transition-colors"
        >
          Initiate Transfer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* INITIATED (Outgoing from active plant) */}
        <div className="glass-panel p-4 flex flex-col h-[600px]">
          <h2 className="text-lg font-semibold mb-4 text-blue-400 border-b border-gray-800 pb-2">Initiated (Outgoing)</h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {loading ? <p className="text-gray-500 text-sm">Loading...</p> : outgoingInitiated.length === 0 ? <p className="text-gray-500 text-sm">No initiated transfers.</p> :
              outgoingInitiated.map(t => (
                <div key={t.id} className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-200">TRF-{t.id.substring(0, 5).toUpperCase()}</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-semibold tracking-wider">INITIATED</span>
                  </div>
                  <p className="text-base text-gray-100 font-medium mb-1">{t.itemType} - <span className="text-amber-500">{t.quantity} MT</span></p>
                  <p className="text-xs text-gray-400">To: <span className="text-gray-300">{t.targetPlant?.name || t.targetPlantId}</span></p>
                  <p className="text-[10px] text-gray-500 mt-2">{new Date(t.dispatchedAt).toLocaleString()}</p>
                </div>
              ))
            }
          </div>
        </div>

        {/* IN_TRANSIT (Incoming to active plant) */}
        <div className="glass-panel p-4 flex flex-col h-[600px]">
          <h2 className="text-lg font-semibold mb-4 text-amber-400 border-b border-gray-800 pb-2">In Transit (Incoming)</h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {loading ? <p className="text-gray-500 text-sm">Loading...</p> : incomingInTransit.length === 0 ? <p className="text-gray-500 text-sm">No incoming transit.</p> :
              incomingInTransit.map(t => (
                <div key={t.id} className="bg-gray-800/40 p-4 rounded-xl border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)] hover:border-amber-500/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-200">TRF-{t.id.substring(0, 5).toUpperCase()}</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-semibold tracking-wider animate-pulse">IN TRANSIT</span>
                  </div>
                  <p className="text-base text-gray-100 font-medium mb-1">{t.itemType} - <span className="text-amber-500">{t.quantity} MT</span></p>
                  <p className="text-xs text-gray-400">From: <span className="text-gray-300">{t.sourcePlant?.name || t.sourcePlantId}</span></p>
                  <button 
                    onClick={() => handleMarkReceived(t.id, t.itemCategory)}
                    className="mt-4 w-full text-xs bg-emerald-600/90 hover:bg-emerald-500 py-2 rounded text-white font-medium transition-colors shadow-lg shadow-emerald-900/20"
                  >
                    Mark as Received
                  </button>
                </div>
              ))
            }
          </div>
        </div>

        {/* RECEIVED (Historical) */}
        <div className="glass-panel p-4 flex flex-col h-[600px]">
          <h2 className="text-lg font-semibold mb-4 text-emerald-400 border-b border-gray-800 pb-2">Received History</h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {loading ? <p className="text-gray-500 text-sm">Loading...</p> : allReceived.length === 0 ? <p className="text-gray-500 text-sm">No received transfers.</p> :
              allReceived.map(t => (
                <div key={t.id} className="bg-[#111] p-4 rounded-xl border border-gray-800 opacity-80 hover:opacity-100 transition-opacity">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-400">TRF-{t.id.substring(0, 5).toUpperCase()}</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-500/70 px-2 py-0.5 rounded font-semibold tracking-wider border border-emerald-500/20">RECEIVED</span>
                  </div>
                  <p className="text-base text-gray-300 font-medium mb-1">{t.itemType} - {t.quantity} MT</p>
                  <p className="text-xs text-gray-500">
                    {t.targetPlantId === activePlantId 
                      ? <>Received from: <span className="text-gray-400">{t.sourcePlant?.name || t.sourcePlantId}</span></>
                      : <>Sent to: <span className="text-gray-400">{t.targetPlant?.name || t.targetPlantId}</span></>
                    }
                  </p>
                  {t.receivedAt && (
                    <p className="text-[10px] text-gray-600 mt-2">Finished on {new Date(t.receivedAt).toLocaleString()}</p>
                  )}
                </div>
              ))
            }
          </div>
        </div>

      </div>

      {/* Initiate Transfer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-1">Initiate Transfer</h3>
            <p className="text-sm text-gray-400 mb-6">From: <span className="text-blue-400 font-medium">{activePlantName}</span></p>
            
            <form onSubmit={handleInitiateTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Destination Plant</label>
                <select
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  value={newTransfer.targetPlantId}
                  onChange={(e) => setNewTransfer({...newTransfer, targetPlantId: e.target.value})}
                >
                  <option value="" disabled>Select target plant</option>
                  {allPlants.filter(p => p.id !== activePlantId).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    value={newTransfer.itemCategory}
                    onChange={(e) => setNewTransfer({...newTransfer, itemCategory: e.target.value})}
                  >
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="FINISHED_GOOD">Finished Good</option>
                    <option value="CONSUMABLE">Consumable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Item Type</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    value={newTransfer.itemType}
                    onChange={(e) => setNewTransfer({...newTransfer, itemType: e.target.value.toUpperCase()})}
                    placeholder="e.g. HEAD_RICE"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Quantity</label>
                <input
                  type="number"
                  required
                  step="0.001"
                  min="0.001"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                  value={newTransfer.quantity}
                  onChange={(e) => setNewTransfer({...newTransfer, quantity: e.target.value})}
                  placeholder="0.000"
                />
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Initiate Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantTransfers;

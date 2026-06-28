import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axios';
import { usePlantStore } from '../store/plantStore';
import { toast } from 'react-hot-toast';

interface InventoryItem {
  id: string;
  itemType: string;
  itemCategory: string;
  quantity: number;
  updatedAt: string;
}

interface LedgerEntry {
  id: string;
  transactionType: string;
  quantity: number;
  referenceId: string;
  remarks: string;
  createdAt: string;
}

const InventoryMatrix: React.FC = () => {
  const activePlantId = usePlantStore(state => state.activePlant?.id);
  const [activeTab, setActiveTab] = useState('RAW_MATERIAL');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const tabs = [
    { id: 'RAW_MATERIAL', label: 'Raw Materials' },
    { id: 'FINISHED_GOOD', label: 'Finished Goods' },
    { id: 'CONSUMABLE', label: 'Consumables' }
  ];

  const fetchInventory = async () => {
    if (!activePlantId) return;
    try {
      setLoading(true);
      const { data } = await axiosInstance.get(`/inventory/plants/${activePlantId}?category=${activeTab}`);
      setInventory(data);
    } catch (err: any) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [activePlantId, activeTab]);

  const openAuditModal = async (item: InventoryItem) => {
    setSelectedItem(item);
    setIsAuditModalOpen(true);
    try {
      setLedgerLoading(true);
      const { data } = await axiosInstance.get(`/inventory/items/${item.id}/ledger`);
      setLedgerEntries(data);
    } catch (err: any) {
      toast.error('Failed to load ledger');
    } finally {
      setLedgerLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inventory Matrix</h1>
      
      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-700 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2 px-1 ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-500 font-medium'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-panel p-4">
        <h2 className="text-xl font-semibold mb-4">{tabs.find(t => t.id === activeTab)?.label} Stock</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="py-2">Item Type</th>
              <th className="py-2">Quantity</th>
              <th className="py-2">Unit</th>
              <th className="py-2">Last Updated</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-4 text-center text-gray-500">Loading inventory...</td></tr>
            ) : inventory.length === 0 ? (
              <tr><td colSpan={5} className="py-4 text-center text-gray-500">No stock found in this category.</td></tr>
            ) : (
              inventory.map(item => (
                <tr key={item.id} className="border-b border-gray-700 hover:bg-white/5">
                  <td className="py-2 font-medium">{item.itemType}</td>
                  <td className="py-2 font-mono text-white text-lg">{item.quantity.toFixed(3)}</td>
                  <td className="py-2 text-gray-400">{item.itemCategory === 'CONSUMABLE' ? 'Units' : 'MT'}</td>
                  <td className="py-2 text-gray-400 text-sm">{new Date(item.updatedAt).toLocaleString()}</td>
                  <td className="py-2 text-right">
                    <button 
                      onClick={() => openAuditModal(item)}
                      className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-white border border-gray-600 transition-colors"
                    >
                      Audit Ledger
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Audit Ledger Modal */}
      {isAuditModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <div>
                <h3 className="text-xl font-bold text-white">Stock Ledger: {selectedItem.itemType}</h3>
                <p className="text-sm text-gray-400">Current Stock: {selectedItem.quantity.toFixed(3)} {selectedItem.itemCategory === 'CONSUMABLE' ? 'Units' : 'MT'}</p>
              </div>
              <button onClick={() => setIsAuditModalOpen(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-[#1a1a1a]">
                  <tr className="border-b border-gray-800 text-sm text-gray-400">
                    <th className="py-2 px-2">Date / Time</th>
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-2 text-right">Quantity</th>
                    <th className="py-2 px-2">Ref ID</th>
                    <th className="py-2 px-2">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerLoading ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-500">Loading ledger entries...</td></tr>
                  ) : ledgerEntries.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-500">No ledger entries found.</td></tr>
                  ) : (
                    ledgerEntries.map(entry => (
                      <tr key={entry.id} className="border-b border-gray-800 hover:bg-white/5 text-sm">
                        <td className="py-3 px-2 text-gray-300">{new Date(entry.createdAt).toLocaleString()}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            entry.transactionType === 'IN' ? 'bg-emerald-500/20 text-emerald-400' :
                            entry.transactionType === 'OUT' ? 'bg-red-500/20 text-red-400' :
                            entry.transactionType === 'TRANSFER' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {entry.transactionType}
                          </span>
                        </td>
                        <td className={`py-3 px-2 text-right font-mono ${
                          entry.quantity > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {entry.quantity > 0 ? '+' : ''}{entry.quantity.toFixed(3)}
                        </td>
                        <td className="py-3 px-2 text-gray-500 font-mono text-xs">{entry.referenceId || '-'}</td>
                        <td className="py-3 px-2 text-gray-400">{entry.remarks || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryMatrix;

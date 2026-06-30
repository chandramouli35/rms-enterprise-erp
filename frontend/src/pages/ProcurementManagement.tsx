import React, { useState } from 'react';
import { Layout, FileText, CheckSquare, List } from 'lucide-react';
import axios from 'axios';
import { CustomModal } from '../components/CustomModal';
import { usePlantStore } from '../store/plantStore';

const API_URL = 'http://localhost:3000/api';

export const ProcurementManagement = () => {
  const [activeTab, setActiveTab] = useState('purchase');
  const activePlant = usePlantStore(state => state.activePlant);
  
  // State for Purchase Entry
  const [formData, setFormData] = useState({
    plantId: activePlant?.id || '',
    supplierId: 's1d2e3f4-5678-90ab-cdef-123456789012', // Placeholder
    gatePassId: 'g1d2e3f4-5678-90ab-cdef-123456789012',
    weighbridgeId: 'w1d2e3f4-5678-90ab-cdef-123456789012',
    netWeight: 0,
    ratePerQuintal: 0,
    transportCharges: 0,
    otherCharges: 0,
    moisture: 0,
    broken: 0,
    discoloration: 0,
    foreignMatter: 0,
    inspectedBy: 'Inspector Name'
  });

  React.useEffect(() => {
    if (activePlant?.id) {
      setFormData(prev => ({ ...prev, plantId: activePlant.id }));
    }
  }, [activePlant]);

  const [savedPurchase, setSavedPurchase] = useState<any>(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', content: '' });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) || value }));
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plantId) {
      setModalConfig({ isOpen: true, title: 'Error', content: 'No active plant selected.' });
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/procurement/save-purchase`, formData);
      setSavedPurchase(res.data);
      setModalConfig({ isOpen: true, title: 'Success', content: 'Purchase and Quality Inspection saved successfully!' });
    } catch (error) {
      console.error('Failed to save purchase', error);
      setModalConfig({ isOpen: true, title: 'Error', content: 'Failed to save purchase. Please try again.' });
    }
  };

  return (
    <div className="flex flex-col h-full text-white">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-[#e67e00]">Procurement Management</h1>
      </div>
      
      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-white/10 pb-2">
        <button onClick={() => setActiveTab('supplier')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'supplier' ? 'bg-[#e67e00] text-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>Supplier Master</button>
        <button onClick={() => setActiveTab('purchase')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'purchase' ? 'bg-[#e67e00] text-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>Paddy Purchase & Quality</button>
        <button onClick={() => setActiveTab('register')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'register' ? 'bg-[#e67e00] text-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>Purchase Register</button>
      </div>

      <div className="flex-1 bg-[#121212] rounded-xl border border-neutral-800 p-6 overflow-y-auto">
        {activeTab === 'purchase' && (
           <form onSubmit={handleSavePurchase} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Purchase Details */}
                 <div className="bg-[#0a0a0a] rounded border border-white/5 p-6 space-y-4">
                    <h2 className="text-xl font-semibold border-b border-white/10 pb-2">Purchase Entry</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Net Weight (MT)</label>
                        <input name="netWeight" type="number" step="0.01" onChange={handleInputChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" required />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Rate (₹ / Quintal)</label>
                        <input name="ratePerQuintal" type="number" step="0.01" onChange={handleInputChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" required />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Transport (₹)</label>
                        <input name="transportCharges" type="number" step="0.01" onChange={handleInputChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Other Charges (₹)</label>
                        <input name="otherCharges" type="number" step="0.01" onChange={handleInputChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" />
                      </div>
                    </div>
                    <div className="pt-4 border-t border-white/10 mt-4">
                      <p className="text-gray-400">Total Calculation: (Net Weight in Qtl * Rate) + Charges</p>
                    </div>
                 </div>

                 {/* Quality Parameters */}
                 <div className="bg-[#0a0a0a] rounded border border-white/5 p-6 space-y-4">
                    <h2 className="text-xl font-semibold border-b border-white/10 pb-2">Quality Inspection</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Moisture (%)</label>
                        <input name="moisture" type="number" step="0.1" onChange={handleInputChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" required />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Broken (%)</label>
                        <input name="broken" type="number" step="0.1" onChange={handleInputChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" required />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Discoloration (%)</label>
                        <input name="discoloration" type="number" step="0.1" onChange={handleInputChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Foreign Matter (%)</label>
                        <input name="foreignMatter" type="number" step="0.1" onChange={handleInputChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" />
                      </div>
                    </div>
                 </div>
              </div>

              <div className="flex justify-end">
                 <button type="submit" className="bg-[#e67e00] hover:bg-[#ff9914] text-black px-8 py-3 rounded-lg font-bold text-lg">Save Purchase & Inspection</button>
              </div>
           </form>
        )}
        
        {/* Other Tabs */}
        {activeTab === 'supplier' && <div className="text-gray-500">Supplier Master Placeholder</div>}
        {activeTab === 'register' && <div className="text-gray-500">Purchase Register Placeholder</div>}
      </div>

      <CustomModal 
        isOpen={modalConfig.isOpen} 
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title}
        footer={
          <button 
            onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
            className="px-4 py-2 bg-[#e67e00] text-white hover:bg-[#cc7000] rounded-lg text-sm font-medium transition-colors"
          >
            Okay
          </button>
        }
      >
        <p className="text-gray-300 leading-relaxed">{modalConfig.content}</p>
      </CustomModal>
    </div>
  );
};

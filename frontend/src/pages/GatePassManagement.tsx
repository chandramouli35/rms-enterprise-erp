import React, { useState, useEffect } from 'react';
import { Truck, LogIn, LogOut, QrCode, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import Barcode from 'react-barcode';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { usePlantStore } from '../store/plantStore';

// Use standard API URL or proxy setup. Assuming proxy is configured for /api
const API_URL = 'http://localhost:3000/api';

export const GatePassManagement = () => {
  const [activeTab, setActiveTab] = useState('gate-in');
  const activePlant = usePlantStore(state => state.activePlant);
  
  // State for Gate Pass Generation
  const [formData, setFormData] = useState({
    plantId: activePlant?.id || '',
    passType: 'INWARD',
    vehicleNo: '',
    purpose: 'Paddy Purchase',
    driverName: '',
    contactNo: ''
  });
  
  const [generatedPass, setGeneratedPass] = useState<any>(null);
  
  // State for Campus Status
  const [campusStatus, setCampusStatus] = useState({ activeInward: 0, completed: 0, total: 0 });

  useEffect(() => {
    if (activePlant?.id) {
      setFormData(prev => ({ ...prev, plantId: activePlant.id }));
      fetchCampusStatus(activePlant.id);
    }
  }, [activePlant]);

  const fetchCampusStatus = async (plantId: string) => {
    try {
      const res = await axios.get(`${API_URL}/gate-pass/campus-status/${plantId}`);
      setCampusStatus(res.data);
    } catch (error) {
      console.error('Failed to fetch campus status', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGeneratePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plantId) return;
    try {
      const res = await axios.post(`${API_URL}/gate-pass/generate`, formData);
      setGeneratedPass(res.data);
      fetchCampusStatus(formData.plantId); // Refresh donut chart
    } catch (error) {
      console.error('Failed to generate gate pass', error);
    }
  };

  const chartData = [
    { name: 'Inside Campus', value: campusStatus.activeInward, color: '#4ade80' },
    { name: 'Completed/Exited', value: campusStatus.completed, color: '#3b82f6' }
  ];

  return (
    <div className="flex flex-col h-full text-white">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-[#e67e00]">Gate Pass Management</h1>
      </div>
      
      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-white/10 pb-2">
        <button onClick={() => setActiveTab('gate-in')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'gate-in' ? 'bg-[#e67e00] text-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>Gate In</button>
        <button onClick={() => setActiveTab('gate-out')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'gate-out' ? 'bg-[#e67e00] text-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>Gate Out</button>
        <button onClick={() => setActiveTab('qr')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'qr' ? 'bg-[#e67e00] text-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>QR / Barcode</button>
        <button onClick={() => setActiveTab('duplicate')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'duplicate' ? 'bg-[#e67e00] text-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>Duplicate Prevention</button>
      </div>

      <div className="flex-1 bg-[#121212] rounded-xl border border-neutral-800 p-6 overflow-y-auto">
        {(activeTab === 'gate-in' || activeTab === 'gate-out') && (
           <div className="space-y-8">
              {/* Top Row: 3 Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Form */}
                 <form onSubmit={handleGeneratePass} className="bg-[#0a0a0a] rounded border border-white/5 p-6 space-y-4">
                    <h3 className="text-lg font-semibold">{activeTab === 'gate-in' ? 'Create Gate In Pass' : 'Create Gate Out Pass'}</h3>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Vehicle No.</label>
                      <input name="vehicleNo" value={formData.vehicleNo} onChange={handleInputChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" required />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Driver Name</label>
                      <input name="driverName" value={formData.driverName} onChange={handleInputChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Contact No.</label>
                      <input name="contactNo" value={formData.contactNo} onChange={handleInputChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" />
                    </div>
                    <button type="submit" className="w-full bg-[#e67e00] text-black font-semibold py-2 rounded hover:bg-[#ff9914] transition">
                      Generate {activeTab === 'gate-in' ? 'Gate In' : 'Gate Out'} Pass
                    </button>
                 </form>
                 
                 {/* History */}
                 <div className="bg-[#0a0a0a] rounded border border-white/5 p-6 space-y-4">
                    <h3 className="text-lg font-semibold">Recent Entries</h3>
                    <div className="text-sm text-gray-400">
                      {generatedPass ? (
                        <div className="p-3 bg-[#1a1a1a] border border-green-500/30 rounded mb-2">
                          <p><span className="text-gray-500">Ticket:</span> {generatedPass.qrCode}</p>
                          <p><span className="text-gray-500">Vehicle:</span> {generatedPass.vehicleNo}</p>
                          <p><span className="text-gray-500">Status:</span> <span className="text-green-400">{generatedPass.status}</span></p>
                        </div>
                      ) : (
                        <p>No recent entries generated in this session.</p>
                      )}
                    </div>
                 </div>
                 
                 {/* Voucher Preview */}
                 <div className="bg-white text-black p-6 rounded shadow-lg flex flex-col justify-between items-center h-auto min-h-[16rem] border-t-8 border-amber-500">
                    <h3 className="text-lg font-bold tracking-widest uppercase border-b-2 border-black pb-2 w-full text-center">Gate Pass Ticket</h3>
                    <div className="flex-1 flex flex-col items-center justify-center w-full py-4">
                       {generatedPass ? (
                         <>
                           <div className="mb-2 font-bold text-xl">{generatedPass.qrCode}</div>
                           <Barcode value={generatedPass.qrCode} width={1.5} height={50} displayValue={false} />
                           <div className="mt-2 text-sm">Vehicle: {generatedPass.vehicleNo}</div>
                         </>
                       ) : (
                         <div className="w-full h-16 border-2 border-black border-dashed flex items-center justify-center text-gray-500 font-medium">AWAITING GENERATION</div>
                       )}
                    </div>
                    <div className="text-xs font-bold w-full text-center mt-2">AUTHORIZATION BADGE</div>
                 </div>
              </div>
              
              {/* Bottom Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-[#0a0a0a] rounded border border-white/5 p-6">
                    <h3 className="text-lg font-semibold mb-4">In Campus / In Transit Status</h3>
                    <div className="h-48 flex items-center justify-center">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                             {chartData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                           </Pie>
                           <Tooltip />
                         </PieChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
                 <div className="bg-red-950/20 rounded border border-red-900/30 p-6">
                    <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2"><ShieldAlert size={20} /> Duplicate Prevention Alerts</h3>
                    <div className="space-y-3">
                       <div className="border-l-4 border-red-500 pl-4 py-2">
                          <p className="text-sm text-gray-300">Vehicle <span className="font-bold text-white">UP16-AB-1234</span> attempted double entry.</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}
        
        {/* Other Tabs omitted for brevity */}
      </div>
    </div>
  );
};

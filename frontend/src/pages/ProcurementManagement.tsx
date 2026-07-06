import React, { useState, useEffect } from 'react';
import { Users, Package, ShieldCheck, FileText, Search, Plus, Calendar, ChevronDown, Download, Printer, Settings, Upload } from 'lucide-react';
import api from '../api/axios';
import { CustomModal } from '../components/CustomModal';
import { usePlantStore } from '../store/plantStore';

export const ProcurementManagement = () => {
  const [activeTab, setActiveTab] = useState<'supplier_master' | 'paddy_purchase' | 'quality_inspection' | 'purchase_register'>('paddy_purchase');
  const activePlant = usePlantStore(state => state.activePlant);
  const [category, setCategory] = useState<'OPERATIONAL' | 'NON_OPERATIONAL'>('OPERATIONAL');

  // State
  const defaultFormData = {
    plantId: activePlant?.id || '',
    supplierId: '',
    purchaseType: 'PADDY_BOLI',
    netWeight: 0,
    ratePerQuintal: 0,
    transportCharges: 0,
    otherCharges: 0,
    moisture: 0,
    bugs: 0,
    gpNo: '',
    mandiEgNo: '',
    rstNo: '',
    pahunchPersonName: '',
    safaiType: 'Good',
    allocationType: 'Hoodi',
    originalBardanaClass: 'A_Class',
    agencyGpBardanaClass: 'A_Class',
    bagsRecAtMill: 0,
    netWtAtMill: 0,
    requiredNetWt: 0,
    netWtDifference: 0,
    netWtAtParty: 0,
    shortageType: 'NA',
    balanceShortageArhtia: 0,
  };

  const [formData, setFormData] = useState<any>(defaultFormData);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [sodaPending, setSodaPending] = useState<any[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal States
  const [addSupplierModal, setAddSupplierModal] = useState({ isOpen: false, name: '', contact: '' });
  const [inspectModal, setInspectModal] = useState({ isOpen: false, batchId: '', moisture: 0, broken: 0, discoloration: 0, foreignMatter: 0 });

  useEffect(() => {
    if (activePlant?.id) {
      setFormData((prev: any) => ({ ...prev, plantId: activePlant.id }));
      fetchSuppliers();
      fetchSodaPending();
      fetchRecentPurchases();
    }
  }, [activePlant]);

  const fetchRecentPurchases = async () => {
    try {
      const res = await api.get(`/api/procurement/recent/${activePlant?.id}`);
      setRecentPurchases(res.data);
    } catch (error) {
      console.error('Error fetching recent purchases', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get(`/api/procurement/suppliers`);
      setSuppliers(res.data);
    } catch (error) {
      console.error('Error fetching suppliers', error);
    }
  };

  const fetchSodaPending = async () => {
    try {
      const res = await api.get(`/api/procurement/soda-pending/${activePlant?.id}`);
      setSodaPending(res.data);
    } catch (error) {
      console.error('Error fetching soda pending', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const calculateTotal = () => {
    const netWt = parseFloat(formData.netWeight) || 0;
    const rate = parseFloat(formData.ratePerQuintal) || 0;
    const trans = parseFloat(formData.transportCharges) || 0;
    const other = parseFloat(formData.otherCharges) || 0;
    const baseAmt = (netWt * 10) * rate; 
    return (baseAmt + trans + other).toFixed(2);
  };

  const handleSubmitPurchase = async () => {
    try {
      setIsSubmitting(true);
      await api.post('/api/procurement/save-purchase', { ...formData, category });
      alert('Purchase Entry Saved successfully');
      setFormData({ ...defaultFormData, plantId: activePlant?.id || '' });
    } catch (error) {
      console.error('Failed to save purchase', error);
      alert('Failed to save purchase. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSupplierModal.name) return;
    try {
      await api.post('/api/procurement/suppliers', { name: addSupplierModal.name, contact: addSupplierModal.contact, type: 'ARHTIA' });
      setAddSupplierModal({ isOpen: false, name: '', contact: '' });
      fetchSuppliers();
    } catch (error) {
      console.error('Failed to add supplier', error);
    }
  };

  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/api/procurement/quality/${inspectModal.batchId}`, {
        moisture: parseFloat(inspectModal.moisture as any),
        broken: parseFloat(inspectModal.broken as any),
        discoloration: parseFloat(inspectModal.discoloration as any),
        foreignMatter: parseFloat(inspectModal.foreignMatter as any),
        status: 'COMPLETED'
      });
      setInspectModal({ isOpen: false, batchId: '', moisture: 0, broken: 0, discoloration: 0, foreignMatter: 0 });
      fetchRecentPurchases();
    } catch (error) {
      console.error('Failed to update quality', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header & Category Toggle */}
      <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="text-[#e67e00]" /> Procurement Module
          </h1>
          <p className="text-gray-400 mt-1">Manage robust multi-tenant industrial ERP flows</p>
        </div>
        
        <div className="flex bg-[#121212] rounded-lg p-1 border border-white/10">
          <button 
            className={`px-6 py-2 rounded-md font-bold text-sm transition-colors ${category === 'OPERATIONAL' ? 'bg-[#e67e00] text-black shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setCategory('OPERATIONAL')}
          >
            Operational
          </button>
          <button 
            className={`px-6 py-2 rounded-md font-bold text-sm transition-colors ${category === 'NON_OPERATIONAL' ? 'bg-[#e67e00] text-black shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setCategory('NON_OPERATIONAL')}
          >
            Non-Operational
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex px-6 border-b border-white/10 shrink-0 overflow-x-auto bg-[#0f0f0f] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        {[
          { id: 'supplier_master', icon: Users, label: 'Supplier Master' },
          { id: 'paddy_purchase', icon: Package, label: 'Paddy Purchase & Quality' },
          { id: 'quality_inspection', icon: ShieldCheck, label: 'Quality Inspection Desk' },
          { id: 'purchase_register', icon: FileText, label: 'Purchase Register & Soda Pending' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? 'border-[#e67e00] text-[#e67e00] bg-[#e67e00]/5' 
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto p-6">
        
        {/* TAB 1: SUPPLIER MASTER */}
        {activeTab === 'supplier_master' && (
          <div className="bg-[#121212] border border-white/10 rounded-xl flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#161616]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="text-[#e67e00]" /> Supplier Master
              </h2>
              <button onClick={() => setAddSupplierModal({ isOpen: true, name: '', contact: '' })} className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-orange-500/20">
                + Add Supplier
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-[#0a0a0a] p-6">
              <table className="w-full border-collapse text-gray-300 text-sm">
                <thead>
                  <tr className="border-b border-white/10 uppercase text-gray-500 text-left">
                    <th className="p-3">Name</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s, i) => (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 font-medium text-white">{s.name}</td>
                      <td className="p-3">{s.contact || '-'}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded bg-green-900/50 text-green-400 text-xs font-bold">Active</span>
                      </td>
                    </tr>
                  ))}
                  {suppliers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-gray-500">No suppliers found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PADDY PURCHASE & QUALITY */}
        {activeTab === 'paddy_purchase' && (
          <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Left Column (Purchase Entry) */}
            <div className="w-full lg:flex-1 flex flex-col gap-6">
              <div className="bg-[#121212] border border-white/10 rounded-xl p-5 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                  Purchase Entry
                  {category === 'OPERATIONAL' && (
                    <select 
                      name="purchaseType"
                      value={formData.purchaseType}
                      onChange={handleInputChange}
                      className="bg-[#1a1c23] border border-white/10 text-[#e67e00] font-bold text-xs rounded px-2 py-1"
                    >
                      <option value="PADDY_BOLI">PADDY BOLI</option>
                      <option value="PADDY_NORMAL">PADDY NORMAL</option>
                    </select>
                  )}
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Supplier / Arhtia</label>
                    <select 
                      name="supplierId"
                      value={formData.supplierId}
                      onChange={handleInputChange}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Net Wt (MT)</label>
                      <input type="number" name="netWeight" value={formData.netWeight} onChange={handleInputChange} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Rate / Qtl</label>
                      <input type="number" name="ratePerQuintal" value={formData.ratePerQuintal} onChange={handleInputChange} className="w-full bg-[#0a0a0a] border border-[#e67e00]/50 rounded-lg px-3 py-2 text-white text-sm font-bold" />
                    </div>
                  </div>

                  {formData.purchaseType === 'PADDY_BOLI' && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-[#e67e00]/5 border border-[#e67e00]/20 rounded-lg">
                      <div>
                        <label className="block text-xs font-bold text-[#e67e00] mb-1">Moisture (M/C) %</label>
                        <input type="number" name="moisture" value={formData.moisture} onChange={handleInputChange} className="w-full bg-[#0a0a0a] border border-[#e67e00]/30 rounded-lg px-3 py-2 text-white text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#e67e00] mb-1">Bugs %</label>
                        <input type="number" name="bugs" value={formData.bugs} onChange={handleInputChange} className="w-full bg-[#0a0a0a] border border-[#e67e00]/30 rounded-lg px-3 py-2 text-white text-sm" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Transport Chg.</label>
                      <input type="number" name="transportCharges" value={formData.transportCharges} onChange={handleInputChange} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Other Chg.</label>
                      <input type="number" name="otherCharges" value={formData.otherCharges} onChange={handleInputChange} className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-[#1a1a1a] rounded-lg border border-white/5 flex items-center justify-between">
                    <span className="text-gray-400 text-sm font-medium">Est. Final Amount</span>
                    <span className="text-xl font-bold text-white">₹ {calculateTotal()}</span>
                  </div>

                  <button 
                    onClick={handleSubmitPurchase}
                    disabled={isSubmitting}
                    className="w-full mt-2 bg-[#e67e00] hover:bg-[#d67500] text-black font-bold py-3 rounded-lg shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing...' : 'Save & Initiate Inward'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column (Advanced Inward Form BEAS AGRO) */}
            <div className="w-full lg:flex-[2] bg-[#121212] text-white border border-white/10 rounded-xl p-8 overflow-y-auto shadow-2xl relative">
              <div className="text-center mb-6 border-b-2 border-white/20 pb-4">
                <h1 className="text-4xl font-serif font-bold tracking-widest text-[#e67e00]">BEAS AGRO</h1>
                <h2 className="text-xl font-bold tracking-widest mt-1 text-gray-300">IN/OUT</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm font-medium">
                
                <div className="flex items-end gap-2">
                  <span className="w-24 text-gray-400">GP No.</span>
                  <input type="text" name="gpNo" value={formData.gpNo} onChange={handleInputChange} className="flex-1 min-w-0 border-b border-white/20 border-dashed bg-transparent focus:outline-none text-white" />
                </div>
                
                <div className="flex items-end gap-2">
                  <span className="w-24 text-gray-400">Mandi e-GP / Bill No.</span>
                  <input type="text" name="mandiEgNo" value={formData.mandiEgNo} onChange={handleInputChange} className="flex-1 min-w-0 border-b border-white/20 border-dashed bg-transparent focus:outline-none text-white" />
                </div>
                
                <div className="flex items-end gap-2">
                  <span className="w-24 text-gray-400">Party Name</span>
                  <input type="text" value={suppliers.find(s=>s.id===formData.supplierId)?.name || ''} readOnly className="flex-1 min-w-0 border-b border-white/20 border-dashed bg-transparent focus:outline-none text-white" />
                </div>

                <div className="flex items-end gap-2">
                  <span className="w-24 text-gray-400">RST No.</span>
                  <input type="text" name="rstNo" value={formData.rstNo} onChange={handleInputChange} className="flex-1 min-w-0 border-b border-white/20 border-dashed bg-transparent focus:outline-none text-white" />
                </div>
                
                <div className="flex items-end gap-2 col-span-2">
                  <span className="w-32 text-gray-400">Pahunch Person Name</span>
                  <input type="text" name="pahunchPersonName" value={formData.pahunchPersonName} onChange={handleInputChange} className="flex-1 min-w-0 border-b border-white/20 border-dashed bg-transparent focus:outline-none text-white" />
                </div>
                
                <div className="flex items-center gap-4 col-span-2 mt-2">
                  <span className="text-gray-400">Safai :</span>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="safaiType" value="Good" checked={formData.safaiType==='Good'} onChange={handleInputChange} /> Good</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="safaiType" value="Patal" checked={formData.safaiType==='Patal'} onChange={handleInputChange} /> Patal</label>
                </div>
                
                <div className="flex items-center gap-8 col-span-2 mt-2 font-bold text-blue-400">
                  <div className="flex items-center gap-2 border border-blue-900 px-3 py-1 rounded bg-blue-900/20 cursor-pointer hover:bg-blue-900/40 transition-colors">
                    <Upload size={16} /> Bhari video upload
                  </div>
                  <div className="flex items-center gap-2 border border-blue-900 px-3 py-1 rounded bg-blue-900/20 cursor-pointer hover:bg-blue-900/40 transition-colors">
                    <Upload size={16} /> Khali video upload
                  </div>
                </div>
                
                <div className="flex items-center gap-4 col-span-2 mt-2">
                  <span className="text-gray-400">Allocation :</span>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="allocationType" value="Hoodi" checked={formData.allocationType==='Hoodi'} onChange={handleInputChange} /> Hoodi</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="allocationType" value="Stacking" checked={formData.allocationType==='Stacking'} onChange={handleInputChange} /> Stacking</label>
                </div>
                
                <div className="flex items-center gap-6 col-span-2 mt-2">
                  <span className="font-bold text-gray-300">Original Bardana :</span>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="originalBardanaClass" value="A_Class" checked={formData.originalBardanaClass==='A_Class'} onChange={handleInputChange} /> A class</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="originalBardanaClass" value="B_Class" checked={formData.originalBardanaClass==='B_Class'} onChange={handleInputChange} /> B class</label>
                </div>
                
                <div className="flex items-center gap-6 col-span-2 mt-1 mb-4">
                  <span className="font-bold text-gray-400">AGENCY-GP Bardana :</span>
                  <label className="flex items-center gap-1 cursor-pointer text-gray-400"><input type="radio" name="agencyGpBardanaClass" value="A_Class" checked={formData.agencyGpBardanaClass==='A_Class'} onChange={handleInputChange} /> A class</label>
                  <label className="flex items-center gap-1 cursor-pointer text-gray-400"><input type="radio" name="agencyGpBardanaClass" value="B_Class" checked={formData.agencyGpBardanaClass==='B_Class'} onChange={handleInputChange} /> B class</label>
                </div>
                
                <div className="flex items-end gap-2">
                  <span className="whitespace-nowrap text-gray-400">Bags rec @ mill</span>
                  <input type="number" name="bagsRecAtMill" value={formData.bagsRecAtMill} onChange={handleInputChange} className="flex-1 min-w-0 border-b border-white/20 border-dashed bg-transparent focus:outline-none text-center font-bold text-white" /> <span className="text-gray-400">Bags</span>
                </div>
                
                <div className="flex items-end gap-2">
                  <span className="whitespace-nowrap text-gray-400">Bags @ Agency-GP</span>
                  <input type="number" name="bagsAtAgencyGp" value={formData.bagsAtAgencyGp} onChange={handleInputChange} className="flex-1 min-w-0 border-b border-white/20 border-dashed bg-transparent focus:outline-none text-center text-white" /> <span className="text-gray-400">Bags</span>
                </div>
                
                <div className="flex items-end gap-2">
                  <span className="whitespace-nowrap text-gray-400">Net Wt.@ Mill</span>
                  <input type="number" name="netWtAtMill" value={formData.netWtAtMill} onChange={handleInputChange} className="flex-1 min-w-0 border-b border-white/20 border-dashed bg-transparent focus:outline-none text-center font-bold text-red-400" /> <span className="text-gray-400">Qtl</span>
                </div>
                
                <div className="flex items-end gap-2">
                  <span className="whitespace-nowrap text-gray-400">Required net wt</span>
                  <input type="number" name="requiredNetWt" value={formData.requiredNetWt} onChange={handleInputChange} className="flex-1 min-w-0 border-b border-white/20 border-dashed bg-transparent focus:outline-none text-center text-white" /> <span className="text-gray-400">Qtl</span>
                </div>
                
                <div className="flex items-end gap-2">
                  <span className="whitespace-nowrap font-bold text-gray-300">Net wt. Difference</span>
                  <input type="number" name="netWtDifference" value={formData.netWtDifference} onChange={handleInputChange} className="flex-1 min-w-0 border-b border-white/20 border-dashed bg-transparent focus:outline-none text-center text-blue-400 font-bold" /> <span className="text-gray-400">kgs</span>
                </div>
                
                <div className="flex items-end gap-2">
                  <span className="whitespace-nowrap text-gray-400">Net Wt.@ Party</span>
                  <input type="number" name="netWtAtParty" value={formData.netWtAtParty} onChange={handleInputChange} className="flex-1 min-w-0 border-b border-white/20 border-dashed bg-transparent focus:outline-none text-center text-white" /> <span className="text-gray-400">Qtl</span>
                </div>
                
                <div className="flex items-center gap-4 col-span-2 mt-4 font-bold bg-white/5 p-2 rounded">
                  <span className="text-gray-300">Shortage:</span>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="shortageType" value="Received" checked={formData.shortageType==='Received'} onChange={handleInputChange} /> received</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="shortageType" value="Occurred" checked={formData.shortageType==='Occurred'} onChange={handleInputChange} /> occurred</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="shortageType" value="NA" checked={formData.shortageType==='NA'} onChange={handleInputChange} /> N.A</label>
                </div>
                
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: QUALITY INSPECTION DESK */}
        {activeTab === 'quality_inspection' && (
          <div className="bg-[#121212] border border-white/10 rounded-xl flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#161616]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="text-[#e67e00]" /> Quality Inspection Desk
              </h2>
            </div>
            <div className="flex-1 overflow-auto bg-[#0a0a0a] p-6">
              <table className="w-full border-collapse text-gray-300 text-sm">
                <thead>
                  <tr className="border-b border-white/10 uppercase text-gray-500 text-left">
                    <th className="p-3">Purchase No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Supplier</th>
                    <th className="p-3">Net Wt</th>
                    <th className="p-3">Moisture</th>
                    <th className="p-3">QC Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPurchases.filter(p => p.qcStatus === 'PENDING' || p.qcStatus === 'Pending').map((p, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 font-mono text-xs">{p.purchaseNo}</td>
                      <td className="p-3">{p.date}</td>
                      <td className="p-3 font-bold text-white">{p.supplier}</td>
                      <td className="p-3 text-right">{p.netWeight} MT</td>
                      <td className="p-3 text-right">{p.moisture}%</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded bg-yellow-900/50 text-yellow-400 text-xs font-bold">Pending</span>
                      </td>
                      <td className="p-3">
                        <button onClick={() => setInspectModal({ isOpen: true, batchId: p.purchaseNo, moisture: p.moisture || 0, broken: p.broken || 0, discoloration: 0, foreignMatter: 0 })} className="bg-[#e67e00] text-black px-3 py-1 rounded text-xs font-bold">Inspect</button>
                      </td>
                    </tr>
                  ))}
                  {recentPurchases.filter(p => p.qcStatus === 'PENDING' || p.qcStatus === 'Pending').length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-gray-500">No pending inspections.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SODA PENDING */}
        {activeTab === 'purchase_register' && (
          <div className="flex flex-col gap-6 h-full overflow-y-auto">
            {/* Hisab / Paddy Soda Pending */}
            <div className="bg-[#121212] border border-white/10 rounded-xl flex flex-col shrink-0">
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#161616]">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="text-[#e67e00]" /> Hisab / Paddy Soda Pending
                </h2>
                <button className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-orange-500/20">
                  Settle Hisab
                </button>
              </div>
            
            <div className="flex-1 overflow-auto bg-gray-300">
              <table className="w-full border-collapse text-black text-sm">
                <thead>
                  <tr className="bg-gray-400 font-bold uppercase">
                    <th className="border border-gray-500 p-2 text-left">Party - Mandi</th>
                    <th className="border border-gray-500 p-2 text-left">Date</th>
                    <th className="border border-gray-500 p-2 text-right">Mc</th>
                    <th className="border border-gray-500 p-2 text-right">Bags</th>
                    <th className="border border-gray-500 p-2 text-right">Rate</th>
                    <th className="border border-gray-500 p-2 text-right">Diff</th>
                    <th className="border border-gray-500 p-2 text-right">Payment</th>
                    <th className="border border-gray-500 p-2 text-left">Note</th>
                    <th className="border border-gray-500 p-2 text-right">Final Hisab Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {sodaPending.map((p, i) => (
                    <tr key={p.id} className={i % 2 === 0 ? 'bg-gray-200' : 'bg-gray-300'}>
                      <td className="border border-gray-400 p-2 font-medium">{p.partyMandi}</td>
                      <td className="border border-gray-400 p-2">{new Date(p.date).toLocaleDateString()}</td>
                      <td className="border border-gray-400 p-2 text-right">{p.mc}</td>
                      <td className="border border-gray-400 p-2 text-right font-bold">{p.bags}</td>
                      <td className="border border-gray-400 p-2 text-right font-bold">{p.rate}</td>
                      <td className="border border-gray-400 p-2 text-right text-red-700 font-medium">{p.diff}</td>
                      <td className="border border-gray-400 p-2 text-right">{p.payment}</td>
                      <td className="border border-gray-400 p-2 text-gray-600">{p.note}</td>
                      <td className="border border-gray-400 p-2 text-right font-bold text-blue-800">{p.finalHisabAmt}</td>
                    </tr>
                  ))}
                  {sodaPending.length === 0 && (
                    <tr>
                      <td colSpan={9} className="border border-gray-400 p-6 text-center text-gray-600 font-medium italic">
                        No outstanding pending Hisabs found. Try adding a Boli purchase!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      <CustomModal 
        isOpen={addSupplierModal.isOpen} 
        onClose={() => setAddSupplierModal({ ...addSupplierModal, isOpen: false })}
        title="Add New Supplier"
      >
        <form onSubmit={handleAddSupplier} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Supplier Name</label>
            <input type="text" value={addSupplierModal.name} onChange={e => setAddSupplierModal({...addSupplierModal, name: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Contact Details</label>
            <input type="text" value={addSupplierModal.contact} onChange={e => setAddSupplierModal({...addSupplierModal, contact: e.target.value})} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-white/10 mt-4">
            <button type="button" onClick={() => setAddSupplierModal({...addSupplierModal, isOpen: false})} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold hover:bg-[#cc7000] transition-colors">Add Supplier</button>
          </div>
        </form>
      </CustomModal>

      <CustomModal 
        isOpen={inspectModal.isOpen} 
        onClose={() => setInspectModal({ ...inspectModal, isOpen: false })}
        title="Quality Inspection"
      >
        <form onSubmit={handleInspect} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Moisture (%)</label>
              <input type="number" step="0.1" value={inspectModal.moisture} onChange={e => setInspectModal({...inspectModal, moisture: e.target.value as any})} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Broken (%)</label>
              <input type="number" step="0.1" value={inspectModal.broken} onChange={e => setInspectModal({...inspectModal, broken: e.target.value as any})} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Discoloration (%)</label>
              <input type="number" step="0.1" value={inspectModal.discoloration} onChange={e => setInspectModal({...inspectModal, discoloration: e.target.value as any})} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Foreign Matter (%)</label>
              <input type="number" step="0.1" value={inspectModal.foreignMatter} onChange={e => setInspectModal({...inspectModal, foreignMatter: e.target.value as any})} className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-white/10 mt-4">
            <button type="button" onClick={() => setInspectModal({...inspectModal, isOpen: false})} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold hover:bg-[#cc7000] transition-colors">Complete Inspection</button>
          </div>
        </form>
      </CustomModal>
    </div>
  );
};

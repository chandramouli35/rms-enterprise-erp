import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Package, ShieldCheck, FileText, Search, Plus, Calendar, ChevronDown, Download, Printer, Settings, Upload } from 'lucide-react';
import api from '../api/axios';
import { CustomModal } from '../components/CustomModal';
import { usePlantStore } from '../store/plantStore';
import { useUiStore } from '../store/uiStore';

export const ProcurementManagement = () => {
 const [searchParams] = useSearchParams();
 const activeTab = searchParams.get('tab') || 'supplier_master';
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

 // Inward Form States
 const [inwardFormData, setInwardFormData] = useState<any>({
 gpNo: '', date: '', timeIn: '', timeOut: '', truckNo: '', mandiEgpNo: '', rstNo: '', supplierId: '',
 moisture: '', safai: 'Good', mandiIntimation: 'N.A.', remarks: '',
 allocationType: 'Hoodi', hoodiUpload: 'N.A.', allocateUnloader: '', stackNo: '', unloaderTruckCount: '', labour: 'Inside', unloadingStartTime: '', unloadingFinishTime: '',
 origBagsRec: 0, origAClass: 0, origBClass: 0, origAClassAg: 0, origBClassAg: 0,
 agencyBagsRec: 0, agencyAClass: 0, agencyBClass: 0, agencyAClassAg: 0, agencyBClassAg: 0,
 netWtMill: 0, reqNetWt: 0, netWtParty: 0, netWtDiff: 0,
 shortageType: 'Shortage Received', updateShortageReg: 'Yes', balanceShortage: 0, discrepancy: '',
 driverName: '', mobileNumber: '',
 driverSign: '', unloaderSign: '', pahunchPersonSign: ''
 });
 const [dhanakLots, setDhanakLots] = useState([{ id: 1, sNo: '', bags: 0, moisture: 0, bardanaClass: '' }]);

 const handleInwardChange = (e: any) => {
 const { name, value, type, checked } = e.target;
 setInwardFormData((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
 };

 const handleDhanakChange = (index: number, field: string, value: any) => {
 const newLots = [...dhanakLots];
 newLots[index] = { ...newLots[index], [field]: value };
 setDhanakLots(newLots);
 };

 const addDhanakRow = () => {
 setDhanakLots([...dhanakLots, { id: Date.now(), sNo: '', bags: 0, moisture: 0, bardanaClass: '' }]);
 };

 // Modal States
 const [addSupplierModal, setAddSupplierModal] = useState({ isOpen: false, name: '', contact: '' });
 const [inspectModal, setInspectModal] = useState({ isOpen: false, batchId: '', moisture: 0, broken: 0, discoloration: 0, foreignMatter: 0 });
 const [settleHisabModal, setSettleHisabModal] = useState<{
 isOpen: boolean;
 hisab: any;
 payment: string;
 note: string;
 finalHisabAmt: string;
 }>({
 isOpen: false,
 hisab: null,
 payment: '',
 note: '',
 finalHisabAmt: ''
 });

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
 useUiStore.getState().addToast('Purchase Entry Saved successfully', 'success');
 setFormData({ ...defaultFormData, plantId: activePlant?.id || '' });
 } catch (error) {
 console.error('Failed to save purchase', error);
 useUiStore.getState().addToast('Failed to save purchase. Please try again.', 'error');
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleAddSupplier = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!addSupplierModal.name) return;
 try {
 await api.post('/api/procurement/suppliers', { name: addSupplierModal.name, contact: addSupplierModal.contact });
 setAddSupplierModal({ isOpen: false, name: '', contact: '' });
 fetchSuppliers();
 } catch (error) {
 console.error('Failed to add supplier', error);
 }
 };

 const handleInwardSubmit = async () => {
 console.log("handleInwardSubmit triggered!");
 try {
 setIsSubmitting(true);
 // We merge formData to ensure we send necessary base fields if they started here
 await api.post('/api/procurement/save-purchase', { ...formData, ...inwardFormData, category, plantId: activePlant?.id });
 useUiStore.getState().addToast('Paddy Inward (Goods Receipt) Saved Successfully!', 'success');
 setInwardFormData((prev: any) => ({ ...prev, truckNo: '', gpNo: '' })); // clear some fields
 fetchSodaPending();
 fetchRecentPurchases();
 } catch (error) {
 console.error('Failed to save inward', error);
 useUiStore.getState().addToast('Failed to save inward data.', 'error');
 } finally {
 setIsSubmitting(false);
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

 const handleSettleHisabSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!settleHisabModal.hisab) return;
 try {
 await api.post('/api/procurement/settle-hisab', {
 id: settleHisabModal.hisab.id,
 payment: parseFloat(settleHisabModal.payment) || 0,
 note: settleHisabModal.note,
 finalHisabAmt: parseFloat(settleHisabModal.finalHisabAmt) || 0
 });
 setSettleHisabModal({ ...settleHisabModal, isOpen: false });
 fetchSodaPending();
 } catch (error) {
 console.error('Settle Hisab failed', error);
 useUiStore.getState().addToast('Failed to settle hisab', 'error');
 }
 };

 return (
 <div className="flex flex-col h-full bg-[var(--bg-base)]">
 {/* Header & Category Toggle */}
 <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-panel)]">
 <div className="flex items-center gap-2">
 <Package size={16} className="text-[#e67e00]" />
 <h1 className="text-sm font-semibold text-[var(--text-muted)]">Procurement Module</h1>
 </div>
 
 <div className="flex bg-[var(--bg-base)] rounded-md p-0.5 border border-[var(--border-subtle-alt)] scale-90 origin-right">
 <button 
 className={`px-4 py-1.5 rounded-sm font-bold text-xs transition-colors ${category === 'OPERATIONAL' ? 'bg-[#e67e00] text-black' : 'text-[var(--text-muted-alt)] hover:text-[var(--text-muted)]'}`}
 onClick={() => setCategory('OPERATIONAL')}
 >
 Operational
 </button>
 <button 
 className={`px-4 py-1.5 rounded-sm font-bold text-xs transition-colors ${category === 'NON_OPERATIONAL' ? 'bg-[#e67e00] text-black' : 'text-[var(--text-muted-alt)] hover:text-[var(--text-muted)]'}`}
 onClick={() => setCategory('NON_OPERATIONAL')}
 >
 Non-Operational
 </button>
 </div>
 </div>



 {/* Main Content Area */}
 <div className="flex-1 overflow-x-hidden overflow-y-auto p-6">
 
 {/* TAB 1: SUPPLIER MASTER */}
 {activeTab === 'supplier_master' && (
 <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col h-full overflow-hidden">
 <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)]">
 <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
 <Users className="text-[#e67e00]" /> Supplier Master
 </h2>
 <button onClick={() => setAddSupplierModal({ isOpen: true, name: '', contact: '' })} className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-orange-500/20">
 + Add Supplier
 </button>
 </div>
 <div className="flex-1 overflow-auto bg-[var(--bg-base)] p-6">
 <table className="w-full border-collapse text-[var(--text-muted)] text-sm">
 <thead>
 <tr className="border-b border-[var(--border-subtle)] uppercase text-[var(--text-muted-alt)] text-left">
 <th className="p-3">Name</th>
 <th className="p-3">Contact</th>
 <th className="p-3">Status</th>
 </tr>
 </thead>
 <tbody>
 {suppliers.map((s, i) => (
 <tr key={s.id} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)]">
 <td className="p-3 font-medium text-[var(--text-main)]">{s.name}</td>
 <td className="p-3">{s.contact || '-'}</td>
 <td className="p-3">
 <span className="px-2 py-1 rounded bg-green-900/50 text-green-400 text-xs font-bold">Active</span>
 </td>
 </tr>
 ))}
 {suppliers.length === 0 && (
 <tr>
 <td colSpan={3} className="p-6 text-center text-[var(--text-muted-alt)]">No suppliers found.</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* TAB 2: PADDY PURCHASE & QUALITY */}
 {activeTab === 'paddy_purchase' && (
 <div className="flex flex-col max-w-3xl mx-auto gap-6 h-full">
 {/* Purchase Entry */}
 <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-xl">
 <h2 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center justify-between">
 Purchase Entry
 {category === 'OPERATIONAL' && (
 <select 
 name="purchaseType"
 value={formData.purchaseType}
 onChange={handleInputChange}
 className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[#e67e00] font-bold text-xs rounded px-2 py-1"
 >
 <option value="PADDY_BOLI">PADDY BOLI</option>
 <option value="PADDY_NORMAL">PADDY NORMAL</option>
 </select>
 )}
 </h2>
 
 <div className="space-y-4">
 <div>
 <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Supplier / Arhtia</label>
 <select 
 name="supplierId"
 value={formData.supplierId}
 onChange={handleInputChange}
 className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] text-sm"
 >
 <option value="">Select Supplier</option>
 {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
 </select>
 </div>
 
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Net Wt (MT)</label>
 <input type="number" name="netWeight" value={formData.netWeight} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] text-sm" min="0" />
 </div>
 <div>
 <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Rate / Qtl</label>
 <input type="number" name="ratePerQuintal" value={formData.ratePerQuintal} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[#e67e00]/50 rounded-lg px-3 py-2 text-[var(--text-main)] text-sm font-bold" min="0" />
 </div>
 </div>

 {formData.purchaseType === 'PADDY_BOLI' && (
 <div className="grid grid-cols-2 gap-3 p-3 bg-[#e67e00]/5 border border-[#e67e00]/20 rounded-lg">
 <div>
 <label className="block text-xs font-bold text-[#e67e00] mb-1">Moisture (M/C) %</label>
 <input type="number" name="moisture" value={formData.moisture} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[#e67e00]/30 rounded-lg px-3 py-2 text-[var(--text-main)] text-sm" min="0" max="100" step="0.01" />
 </div>
 <div>
 <label className="block text-xs font-bold text-[#e67e00] mb-1">Bugs %</label>
 <input type="number" name="bugs" value={formData.bugs} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[#e67e00]/30 rounded-lg px-3 py-2 text-[var(--text-main)] text-sm" min="0" />
 </div>
 </div>
 )}

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Transport Chg.</label>
 <input type="number" name="transportCharges" value={formData.transportCharges} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] text-sm" min="0" />
 </div>
 <div>
 <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Other Chg.</label>
 <input type="number" name="otherCharges" value={formData.otherCharges} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] text-sm" min="0" />
 </div>
 </div>

 <div className="mt-4 p-4 bg-[var(--bg-panel-alt)] rounded-lg border border-[var(--border-subtle-alt)] flex items-center justify-between">
 <span className="text-[var(--text-muted-alt)] text-sm font-medium">Est. Final Amount</span>
 <span className="text-xl font-bold text-[var(--text-main)]">₹ {calculateTotal()}</span>
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
 )}

 {/* TAB 3: PADDY INWARD (GOODS RECEIPT) */}
 {activeTab === 'paddy_inward' && (
 <div className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-2xl flex flex-col h-full overflow-y-auto">
 {/* Top Toolbar */}
 <div className="flex items-center justify-between mb-4 border-b border-[var(--border-subtle-alt)] pb-3">
 <div className="flex items-center gap-3">
 <span className="text-[#e67e00] text-[10px] bg-[#e67e00]/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">BEAS AGRO</span>
 <h1 className="text-base font-bold text-[var(--text-muted)]">
 Paddy Inward (Goods Receipt)
 </h1>
 <p className="text-[var(--text-muted-alt)] text-xs border-l border-[var(--border-subtle)] pl-3 hidden sm:block">Procurement &gt; Paddy Inward</p>
 </div>

 </div>

 <div className="grid grid-cols-12 gap-6 flex-1">
 {/* LEFT COLUMN */}
 <div className="col-span-12 xl:col-span-7 space-y-6">
 
 {/* 1. Basic Information */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">1. Basic Information</div>
 <div className="p-4 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4 text-sm">
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">GP No.</label>
 <input type="text" name="gpNo" value={inwardFormData.gpNo} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="1-1000/Sept/25" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-[11px] mb-1 truncate">Date</label>
 <input type="date" name="date" value={inwardFormData.date} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Time In</label>
 <input type="time" name="timeIn" value={inwardFormData.timeIn} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Time Out</label>
 <input type="time" name="timeOut" value={inwardFormData.timeOut} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Truck No.</label>
 <input type="text" name="truckNo" value={inwardFormData.truckNo} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="PB 10 AB 1234" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Mandi e-GP / Bill No.</label>
 <input type="text" name="mandiEgpNo" value={inwardFormData.mandiEgpNo} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="EGP-458796" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">RST No.</label>
 <input type="text" name="rstNo" value={inwardFormData.rstNo} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="RST-7485963" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Party / Supplier Name</label>
 <select name="supplierId" value={inwardFormData.supplierId} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]">
 <option value="">Select Supplier</option>
 {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
 </select>
 </div>
 </div>
 </div>

 {/* 2. Quality Details */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">2. Quality Details</div>
 <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Moisture (%)</label>
 <input type="number" name="moisture" value={inwardFormData.moisture} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" min="0" max="100" step="0.01" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Safai</label>
 <select name="safai" value={inwardFormData.safai} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]">
 <option value="Good">Good</option>
 <option value="Patal">Patal</option>
 </select>
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">If Not As Per Standards</label>
 <div className="flex items-center gap-4 mt-2">
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="mandiIntimation" value="N.A." checked={inwardFormData.mandiIntimation === 'N.A.'} onChange={handleInwardChange} className="accent-blue-500" /> N.A.</label>
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="mandiIntimation" value="Yes" checked={inwardFormData.mandiIntimation === 'Yes'} onChange={handleInwardChange} className="accent-blue-500" /> Yes</label>
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="mandiIntimation" value="No" checked={inwardFormData.mandiIntimation === 'No'} onChange={handleInwardChange} className="accent-blue-500" /> No</label>
 </div>
 </div>
 <div className="col-span-1 sm:col-span-2">
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Remarks</label>
 <textarea name="remarks" value={inwardFormData.remarks} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" rows={2}></textarea>
 </div>
 </div>
 </div>

 {/* 3. Vehicle Verification */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">3. Vehicle Verification</div>
 <div className="p-4 grid grid-cols-2 gap-4 text-sm">
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Bhari (Loaded) Video Upload</label>
 <button className="w-full py-3 border border-blue-500/30 border-dashed rounded-lg text-blue-400 hover:bg-blue-900/20 flex items-center justify-center gap-2 transition-colors">
 <Upload size={16} /> Upload Video / Image
 </button>
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Khali (Empty) Video Upload</label>
 <button className="w-full py-3 border border-blue-500/30 border-dashed rounded-lg text-blue-400 hover:bg-blue-900/20 flex items-center justify-center gap-2 transition-colors">
 <Upload size={16} /> Upload Video / Image
 </button>
 </div>
 </div>
 </div>

 {/* 4. Unloading Management */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">4. Unloading Management</div>
 <div className="p-4 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4 text-sm">
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Allocation Type</label>
 <select name="allocationType" value={inwardFormData.allocationType} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]">
 <option value="Hoodi">Hoodi</option>
 <option value="Stacking">Stacking</option>
 </select>
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Upload @ Hoodi Reg.</label>
 <div className="flex items-center gap-4 mt-2">
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="hoodiUpload" value="N.A." checked={inwardFormData.hoodiUpload === 'N.A.'} onChange={handleInwardChange} className="accent-blue-500" /> N.A.</label>
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="hoodiUpload" value="Yes" checked={inwardFormData.hoodiUpload === 'Yes'} onChange={handleInwardChange} className="accent-blue-500" /> Yes</label>
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="hoodiUpload" value="No" checked={inwardFormData.hoodiUpload === 'No'} onChange={handleInwardChange} className="accent-blue-500" /> No</label>
 </div>
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Allocate Unloader</label>
 <input type="text" name="allocateUnloader" value={inwardFormData.allocateUnloader} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="Ramesh Kumar" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Stack No.</label>
 <input type="text" name="stackNo" value={inwardFormData.stackNo} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Truck Unload Count</label>
 <input type="number" name="unloaderTruckCount" value={inwardFormData.unloaderTruckCount} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" min="0" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Labour</label>
 <select name="labour" value={inwardFormData.labour} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]">
 <option value="Inside">Inside</option>
 <option value="Outside">Outside</option>
 </select>
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Starts Time</label>
 <input type="time" name="unloadingStartTime" value={inwardFormData.unloadingStartTime} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Finish Time</label>
 <input type="time" name="unloadingFinishTime" value={inwardFormData.unloadingFinishTime} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" />
 </div>
 </div>
 </div>

 {/* 5. Bardana Details & 6. Weight Details */}
 <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
 {/* 5. Bardana */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">5. Bardana (Bag) Details</div>
 <div className="p-4">
 <table className="w-full text-sm text-left">
 <thead>
 <tr className="text-[var(--text-muted-alt)] text-xs border-b border-[var(--border-subtle)]">
 <th className="pb-2 font-medium">Original Bardana</th>
 <th className="pb-2 font-medium">A Class</th>
 <th className="pb-2 font-medium">B Class</th>
 </tr>
 </thead>
 <tbody>
 <tr className="border-b border-[var(--border-subtle-alt)]">
 <td className="py-2 text-[var(--text-muted)]">Bags Received @ Mill</td>
 <td className="py-2"><input type="number" name="origAClass" value={inwardFormData.origAClass} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 text-[var(--text-main)]" min="0" /></td>
 <td className="py-2"><input type="number" name="origBClass" value={inwardFormData.origBClass} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 text-[var(--text-main)]" min="0" /></td>
 </tr>
 <tr>
 <td className="py-2 text-[var(--text-muted)]">Bags @ Agency GP</td>
 <td className="py-2"><input type="number" name="origAClassAg" value={inwardFormData.origAClassAg} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 text-[var(--text-main)]" min="0" /></td>
 <td className="py-2"><input type="number" name="origBClassAg" value={inwardFormData.origBClassAg} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 text-[var(--text-main)]" min="0" /></td>
 </tr>
 </tbody>
 </table>

 <table className="w-full text-sm text-left mt-4">
 <thead>
 <tr className="text-[var(--text-muted-alt)] text-xs border-b border-[var(--border-subtle)]">
 <th className="pb-2 font-medium">Agency Bardana</th>
 <th className="pb-2 font-medium">A Class</th>
 <th className="pb-2 font-medium">B Class</th>
 </tr>
 </thead>
 <tbody>
 <tr className="border-b border-[var(--border-subtle-alt)]">
 <td className="py-2 text-[var(--text-muted)]">Bags Received @ Mill</td>
 <td className="py-2"><input type="number" name="agencyAClass" value={inwardFormData.agencyAClass} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 text-[var(--text-main)]" min="0" /></td>
 <td className="py-2"><input type="number" name="agencyBClass" value={inwardFormData.agencyBClass} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 text-[var(--text-main)]" min="0" /></td>
 </tr>
 <tr>
 <td className="py-2 text-[var(--text-muted)]">Bags @ Agency GP</td>
 <td className="py-2"><input type="number" name="agencyAClassAg" value={inwardFormData.agencyAClassAg} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 text-[var(--text-main)]" min="0" /></td>
 <td className="py-2"><input type="number" name="agencyBClassAg" value={inwardFormData.agencyBClassAg} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 text-[var(--text-main)]" min="0" /></td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 {/* 6. Weight Details */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden flex flex-col">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">6. Weight Details</div>
 <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 content-start">
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Net Wt. @ Mill (Qtl)</label>
 <input type="number" name="netWtMill" value={inwardFormData.netWtMill} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] font-bold outline-none" min="0" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Required Net Wt. (Qtl)</label>
 <input type="number" name="reqNetWt" value={inwardFormData.reqNetWt} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none" min="0" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Net Wt. @ Party (Qtl)</label>
 <input type="number" name="netWtParty" value={inwardFormData.netWtParty} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none" min="0" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Net Wt. Difference (Kgs)</label>
 <input type="number" name="netWtDiff" value={inwardFormData.netWtDiff} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-blue-400 font-bold outline-none" min="0" />
 </div>
 </div>
 </div>
 </div>

 </div>

 {/* RIGHT COLUMN */}
 <div className="col-span-12 xl:col-span-5 space-y-6">
 
 {/* 10. Dhanak / Lot Details */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">10. Dhanak / Lot Details</div>
 <div className="p-4">
 <table className="w-full text-sm text-center">
 <thead>
 <tr className="text-[var(--text-muted-alt)] text-xs border-b border-[var(--border-subtle)] uppercase font-medium bg-[var(--bg-base)]">
 <th className="py-2">Sr. No.</th>
 <th className="py-2">Dhanak (S. No.)</th>
 <th className="py-2">Bags</th>
 <th className="py-2">Moisture (%)</th>
 <th className="py-2">Bardana Class</th>
 </tr>
 </thead>
 <tbody>
 {dhanakLots.map((lot, idx) => (
 <tr key={lot.id} className="border-b border-[var(--border-subtle-alt)]">
 <td className="py-1 text-[var(--text-muted-alt)]">{idx + 1}</td>
 <td className="py-2"><input type="text" value={lot.sNo} onChange={(e) => handleDhanakChange(idx, 'sNo', e.target.value)} className="w-20 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)] text-xs" /></td>
 <td className="py-2"><input type="number" value={lot.bags} onChange={(e) => handleDhanakChange(idx, 'bags', e.target.value)} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)] text-xs" /></td>
 <td className="py-2"><input type="number" value={lot.moisture} onChange={(e) => handleDhanakChange(idx, 'moisture', e.target.value)} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)] text-xs" /></td>
 <td className="py-2">
 <select value={lot.bardanaClass} onChange={(e) => handleDhanakChange(idx, 'bardanaClass', e.target.value)} className="w-24 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-1 py-1 text-[var(--text-main)] text-xs">
 <option value="">Select</option>
 <option value="A_Class">A Class</option>
 <option value="B_Class">B Class</option>
 </select>
 </td>
 </tr>
 ))}
 <tr className="font-bold bg-[var(--bg-panel)]">
 <td colSpan={2} className="py-3 text-right pr-4 text-[var(--text-main)]">TOTAL</td>
 <td className="py-3 text-[var(--text-main)]">{dhanakLots.reduce((acc, lot) => acc + (parseInt(lot.bags as any) || 0), 0)}</td>
 <td colSpan={2}></td>
 </tr>
 </tbody>
 </table>
 <button onClick={addDhanakRow} className="mt-3 text-blue-400 text-sm font-bold flex items-center gap-1 hover:text-blue-300">
 <Plus size={14} /> Add Row
 </button>
 </div>
 </div>

 {/* 7. Shortage Management */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">7. Shortage Management</div>
 <div className="p-4 grid grid-cols-2 gap-4 text-sm">
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Shortage Received / Occurred</label>
 <select name="shortageType" value={inwardFormData.shortageType} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none">
 <option value="Shortage Received">Shortage Received</option>
 <option value="Shortage Occurred">Shortage Occurred</option>
 <option value="N.A.">N.A.</option>
 </select>
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Update in Shortage Register</label>
 <div className="flex items-center gap-4 mt-2">
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="updateShortageReg" value="Yes" checked={inwardFormData.updateShortageReg === 'Yes'} onChange={handleInwardChange} className="accent-blue-500" /> Yes</label>
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="updateShortageReg" value="No" checked={inwardFormData.updateShortageReg === 'No'} onChange={handleInwardChange} className="accent-blue-500" /> No</label>
 </div>
 </div>
 <div className="col-span-2">
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Balance Shortage of Arhtia (Kgs / Bags)</label>
 <input type="text" name="balanceShortage" value={inwardFormData.balanceShortage} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none" />
 </div>
 <div className="col-span-2">
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Any Discrepancy / Point Raise</label>
 <textarea name="discrepancy" value={inwardFormData.discrepancy} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none" rows={2}></textarea>
 </div>
 </div>
 </div>

 {/* 8. Driver Information */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">8. Driver Information</div>
 <div className="p-4 grid grid-cols-2 gap-4 text-sm">
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Driver Name</label>
 <input type="text" name="driverName" value={inwardFormData.driverName} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Mobile Number</label>
 <input type="text" name="mobileNumber" value={inwardFormData.mobileNumber} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none" />
 </div>
 </div>
 </div>

 {/* 9. Signatures */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">9. Signatures</div>
 <div className="p-4 grid grid-cols-3 gap-4 text-sm">
 <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded p-2 h-24 flex flex-col justify-between relative group">
 <span className="text-[var(--text-muted-alt)] text-[10px] uppercase font-bold absolute top-2 left-2 pointer-events-none">Driver Sign</span>
 <div className="flex-1 flex items-center justify-center mt-4 h-full">
 <input type="text" name="driverSign" value={inwardFormData.driverSign} onChange={handleInwardChange} className="bg-transparent border-none outline-none text-center font-[cursive] text-[var(--text-muted)] text-lg w-full h-full placeholder:text-gray-700 px-2" placeholder="Type Sign" />
 </div>
 <span onClick={() => setInwardFormData((p: any) => ({...p, driverSign: ''}))} className="text-red-400 text-[10px] absolute bottom-2 right-2 cursor-pointer z-10 opacity-0 group-hover:opacity-100 transition-opacity">Clear</span>
 </div>
 <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded p-2 h-24 flex flex-col justify-between relative group">
 <span className="text-[var(--text-muted-alt)] text-[10px] uppercase font-bold absolute top-2 left-2 pointer-events-none">Unloader Sign</span>
 <div className="flex-1 flex items-center justify-center mt-4 h-full">
 <input type="text" name="unloaderSign" value={inwardFormData.unloaderSign} onChange={handleInwardChange} className="bg-transparent border-none outline-none text-center font-[cursive] text-[var(--text-muted)] text-lg w-full h-full placeholder:text-gray-700 px-2" placeholder="Type Sign" />
 </div>
 <span onClick={() => setInwardFormData((p: any) => ({...p, unloaderSign: ''}))} className="text-red-400 text-[10px] absolute bottom-2 right-2 cursor-pointer z-10 opacity-0 group-hover:opacity-100 transition-opacity">Clear</span>
 </div>
 <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded p-2 h-24 flex flex-col justify-between relative group">
 <span className="text-[var(--text-muted-alt)] text-[10px] uppercase font-bold absolute top-2 left-2 pointer-events-none">Pahunch Person</span>
 <div className="flex-1 flex items-center justify-center mt-4 h-full">
 <input type="text" name="pahunchPersonSign" value={inwardFormData.pahunchPersonSign} onChange={handleInwardChange} className="bg-transparent border-none outline-none text-center font-[cursive] text-[var(--text-muted)] text-lg w-full h-full placeholder:text-gray-700 px-2" placeholder="Type Sign" />
 </div>
 <span onClick={() => setInwardFormData((p: any) => ({...p, pahunchPersonSign: ''}))} className="text-red-400 text-[10px] absolute bottom-2 right-2 cursor-pointer z-10 opacity-0 group-hover:opacity-100 transition-opacity">Clear</span>
 </div>
 </div>
 </div>

 {/* 11. Authentication (Biometric) */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">11. Authentication (Biometric)</div>
 <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center text-sm">
 <div className="flex items-center gap-3">
 <div className="text-[var(--text-muted-alt)] font-bold bg-[var(--glass-bg)] px-3 py-1.5 rounded flex items-center gap-2">
 <ShieldCheck size={16} /> Pending
 </div>
 <div className="w-8 h-8 shrink-0 rounded bg-[var(--glass-bg)] flex items-center justify-center border border-[var(--border-subtle)]">
 <svg className="w-4 h-4 text-[#e67e00]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
 <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
 <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2"/>
 <path d="M12 7c-1.5 0-3 1.5-3 3 0 2 2 3 2 5" stroke="currentColor" strokeWidth="1"/>
 <path d="M15 10c0-1.5-1.5-3-3-3" stroke="currentColor" strokeWidth="1"/>
 <path d="M9 10c0 1.5 1.5 3 3 3" stroke="currentColor" strokeWidth="1"/>
 </svg>
 </div>
 </div>
 <div className="sm:text-center">
 <div className="text-[var(--text-muted-alt)] text-[11px] uppercase tracking-wider mb-0.5">Authenticated By</div>
 <div className="text-[var(--text-main)] font-medium">-</div>
 </div>
 <div className="sm:text-right">
 <div className="text-[var(--text-muted-alt)] text-[11px] uppercase tracking-wider mb-0.5">Date & Time</div>
 <div className="text-[var(--text-main)] font-medium">-</div>
 </div>
 </div>
 </div>

 </div>
 </div>
 
 {/* Bottom Actions */}
 <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex justify-end gap-3 shrink-0">
 <button className="px-6 py-2.5 border border-[var(--border-subtle)] rounded-lg text-[var(--text-main)] font-bold hover:bg-[var(--glass-bg)]">Cancel</button>
 <button className="px-6 py-2.5 bg-[var(--bg-panel)] border border-blue-500/30 text-blue-400 rounded-lg font-bold hover:bg-blue-900/20">Save Draft</button>
 <button 
 onClick={handleInwardSubmit}
 disabled={isSubmitting}
 className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-[var(--text-main)] rounded-lg font-bold shadow-lg shadow-green-600/20 disabled:opacity-50"
 >
 {isSubmitting ? 'Saving...' : 'Save & Confirm'}
 </button>
 </div>
 </div>
 )}

 {/* TAB 3: QUALITY INSPECTION DESK */}
 {activeTab === 'quality_inspection' && (
 <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col h-full overflow-hidden">
 <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)]">
 <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
 <ShieldCheck className="text-[#e67e00]" /> Quality Inspection Desk
 </h2>
 </div>
 <div className="flex-1 overflow-auto bg-[var(--bg-base)] p-6">
 <table className="w-full border-collapse text-[var(--text-muted)] text-sm">
 <thead>
 <tr className="border-b border-[var(--border-subtle)] uppercase text-[var(--text-muted-alt)] text-left">
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
 <tr key={i} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)]">
 <td className="p-3 font-mono text-xs">{p.purchaseNo}</td>
 <td className="p-3">{p.date}</td>
 <td className="p-3 font-bold text-[var(--text-main)]">{p.supplier}</td>
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
 <td colSpan={7} className="p-6 text-center text-[var(--text-muted-alt)]">No pending inspections.</td>
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
 <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col shrink-0">
 <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)]">
 <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
 <FileText className="text-[#e67e00]" /> Hisab / Paddy Soda Pending
 </h2>
 <div className="text-[var(--text-muted-alt)] text-sm italic">Click on a row's button to settle</div>
 </div>
 
 <div className="flex-1 overflow-auto bg-[var(--bg-panel)] rounded-b-xl">
 <table className="w-full border-collapse text-[var(--text-muted)] text-sm">
 <thead>
 <tr className="bg-[var(--bg-panel-alt)] font-bold uppercase text-xs text-[var(--text-muted-alt)]">
 <th className="border-b border-[var(--border-subtle)] p-3 text-left font-medium">Party - Mandi</th>
 <th className="border-b border-[var(--border-subtle)] p-3 text-left font-medium">Date</th>
 <th className="border-b border-[var(--border-subtle)] p-3 text-right font-medium">Mc</th>
 <th className="border-b border-[var(--border-subtle)] p-3 text-right font-medium">Bags</th>
 <th className="border-b border-[var(--border-subtle)] p-3 text-right font-medium">Rate</th>
 <th className="border-b border-[var(--border-subtle)] p-3 text-right font-medium">Diff</th>
 <th className="border-b border-[var(--border-subtle)] p-3 text-right font-medium">Payment</th>
 <th className="border-b border-[var(--border-subtle)] p-3 text-left font-medium">Note</th>
 <th className="border-b border-[var(--border-subtle)] p-3 text-right text-[#e67e00] font-bold">Final Hisab Amt</th>
 <th className="border-b border-[var(--border-subtle)] p-3 text-center font-medium">Action</th>
 </tr>
 </thead>
 <tbody>
 {sodaPending.map((p, i) => (
 <tr key={p.id} className={`border-b border-[var(--border-subtle-alt)] transition-colors hover:bg-[var(--glass-bg)] ${i % 2 === 0 ? 'bg-[var(--bg-panel)]' : 'bg-[var(--bg-panel-hover)]'}`}>
 <td className="p-3 font-medium text-[var(--text-main)]">{p.partyMandi}</td>
 <td className="p-3">{new Date(p.date).toLocaleDateString()}</td>
 <td className="p-3 text-right">{p.mc}</td>
 <td className="p-3 text-right font-bold text-[var(--text-muted)]">{p.bags}</td>
 <td className="p-3 text-right font-bold text-[var(--text-muted)]">{p.rate}</td>
 <td className="p-3 text-right text-red-400 font-medium">{p.diff}</td>
 <td className="p-3 text-right">{p.payment}</td>
 <td className="p-3 text-[var(--text-muted-alt)]">{p.note}</td>
 <td className="p-3 text-right font-bold text-[#e67e00]">{p.finalHisabAmt}</td>
 <td className="p-3 text-center">
 <button 
 onClick={() => setSettleHisabModal({ 
 isOpen: true, 
 hisab: p, 
 payment: p.payment?.toString() || '', 
 note: p.note || '', 
 finalHisabAmt: p.finalHisabAmt?.toString() || '' 
 })}
 className="px-3 py-1 bg-[#e67e00] hover:bg-[#cc7000] text-black rounded font-bold text-xs transition-colors"
 >
 Settle
 </button>
 </td>
 </tr>
 ))}
 {sodaPending.length === 0 && (
 <tr>
 <td colSpan={10} className="p-6 text-center text-[var(--text-muted-alt)] font-medium italic border-b border-[var(--border-subtle-alt)]">
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
 <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Supplier Name</label>
 <input type="text" value={addSupplierModal.name} onChange={e => setAddSupplierModal({...addSupplierModal, name: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" required />
 </div>
 <div>
 <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Contact Details</label>
 <input type="text" value={addSupplierModal.contact} onChange={e => setAddSupplierModal({...addSupplierModal, contact: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" />
 </div>
 <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)] mt-4">
 <button type="button" onClick={() => setAddSupplierModal({...addSupplierModal, isOpen: false})} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)]">Cancel</button>
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
 <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Moisture (%)</label>
 <input type="number" step="0.1" value={inspectModal.moisture} onChange={e => setInspectModal({...inspectModal, moisture: e.target.value as any})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" required />
 </div>
 <div>
 <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Broken (%)</label>
 <input type="number" step="0.1" value={inspectModal.broken} onChange={e => setInspectModal({...inspectModal, broken: e.target.value as any})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" required />
 </div>
 <div>
 <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Discoloration (%)</label>
 <input type="number" step="0.1" value={inspectModal.discoloration} onChange={e => setInspectModal({...inspectModal, discoloration: e.target.value as any})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" />
 </div>
 <div>
 <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Foreign Matter (%)</label>
 <input type="number" step="0.1" value={inspectModal.foreignMatter} onChange={e => setInspectModal({...inspectModal, foreignMatter: e.target.value as any})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" />
 </div>
 </div>
 <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)] mt-4">
 <button type="button" onClick={() => setInspectModal({...inspectModal, isOpen: false})} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)]">Cancel</button>
 <button type="submit" className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold hover:bg-[#cc7000] transition-colors">Complete Inspection</button>
 </div>
 </form>
 </CustomModal>

 <CustomModal 
 isOpen={settleHisabModal.isOpen} 
 onClose={() => setSettleHisabModal({ ...settleHisabModal, isOpen: false })}
 title="Settle Hisab (Final Settlement)"
 >
 {settleHisabModal.hisab && (
 <form onSubmit={handleSettleHisabSubmit} className="space-y-4">
 <div className="grid grid-cols-2 gap-4 text-sm mb-4">
 <div className="text-[var(--text-muted-alt)]">Party / Mandi: <span className="text-[var(--text-main)] font-bold">{settleHisabModal.hisab.partyMandi}</span></div>
 <div className="text-[var(--text-muted-alt)]">Bags: <span className="text-[var(--text-main)] font-bold">{settleHisabModal.hisab.bags}</span></div>
 <div className="text-[var(--text-muted-alt)]">Rate: <span className="text-[var(--text-main)] font-bold">{settleHisabModal.hisab.rate}</span></div>
 <div className="text-[var(--text-muted-alt)]">Difference: <span className="text-red-400 font-bold">{settleHisabModal.hisab.diff}</span></div>
 </div>
 
 <div className="border-t border-[var(--border-subtle)] pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Payment</label>
 <input type="number" value={settleHisabModal.payment} onChange={e => setSettleHisabModal({...settleHisabModal, payment: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="Enter payment amount" />
 </div>
 <div>
 <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Final Hisab Amount</label>
 <input type="number" value={settleHisabModal.finalHisabAmt} onChange={e => setSettleHisabModal({...settleHisabModal, finalHisabAmt: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="Enter final amount" />
 </div>
 <div className="col-span-1 md:col-span-2">
 <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Notes</label>
 <textarea value={settleHisabModal.note} onChange={e => setSettleHisabModal({...settleHisabModal, note: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" rows={2} placeholder="Add any settlement notes"></textarea>
 </div>
 </div>
 
 <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)] mt-4">
 <button type="button" onClick={() => setSettleHisabModal({...settleHisabModal, isOpen: false})} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)]">Cancel</button>
 <button type="submit" className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold hover:bg-[#cc7000] transition-colors">Settle Hisab</button>
 </div>
 </form>
 )}
 </CustomModal>
 </div>
 );
};

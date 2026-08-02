import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Package, ShieldCheck, FileText, Search, Plus, Calendar, ChevronDown, Download, Printer, Settings, Upload, Edit, Layers, ScanBarcode, X } from 'lucide-react';
import api from '../api/axios';
import { CustomModal } from '../components/CustomModal';
import { usePlantStore } from '../store/plantStore';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { biometricService } from '../services/biometricService';
import StackSelectionModal from '../components/StackSelectionModal';

export const ProcurementManagement = () => {
 const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'supplier_master';
  const activePlant = usePlantStore(state => state.activePlant);
  const user = useAuthStore(state => state.user);
  const hasBackdatePermission = user?.role === 'SUPER_ADMIN' || (user?.backdatePermissionUntil && new Date(user.backdatePermissionUntil) > new Date());
  const hasManualWeighbridgePermission = user?.role === 'SUPER_ADMIN' || (user?.manualWeighbridgeUntil && new Date(user.manualWeighbridgeUntil) > new Date());
  const isSupervisor = user?.role === 'SUPERVISOR';
  const [category, setCategory] = useState<'OPERATIONAL' | 'NON_OPERATIONAL'>('OPERATIONAL');

  const MOCK_LABOUR_CONTRACTORS = ['Ramesh Kumar', 'Suresh Singh', 'Manoj Enterprises', 'Shiva Labour Co.'];

  const [plants, setPlants] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  

  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const res = await api.get('/plants');
        setPlants(res.data);
      } catch (error) {
        console.error('Failed to fetch plants', error);
      }
    };
    if (!activePlant) fetchPlants();
  }, [activePlant]);

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
 mandiEgpNo: '',
 rstNo: '',
 mandiParchiNo: '',
 pahunchPersonName: '',
 safaiType: 'Good',
 allocationType: 'Hoodi',
 originalBardanaClass: 'A_Class',
 agencyGpBardanaClass: 'A_Class',
 bagsRecAtMill: 0,
  gatePassId: '',
  weighbridgeId: '',
  category: 'OPERATIONAL',
  baseRate: 0,
  finalRate: 0,
  arhtiaCorrection: 0,
  nextDayCorrection: 0,
  amount: 0,
  deductions: 0,
  netAmount: 0,
  balanceShortageArhtia: 0,
 };

 const [formData, setFormData] = useState<any>(defaultFormData);
 const [suppliers, setSuppliers] = useState<any[]>([]);
 const [sodaPending, setSodaPending] = useState<any[]>([]);
 const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [inwardList, setInwardList] = useState<any[]>([]);
  const [viewInwardModal, setViewInwardModal] = useState<any>(null);
  const [listFilters, setListFilters] = useState({ dateFrom: '', dateTo: '', mandi: '', supplierId: '' });
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isScanningFingerprint, setIsScanningFingerprint] = useState(false);

 // Stack Selection State
  const [isStackModalOpen, setIsStackModalOpen] = useState(false);
  const [occupiedStacks, setOccupiedStacks] = useState<Record<string, any>>({});

 // Inward Form States
  const defaultInwardFormData = {
    gpNo: '', date: '', timeIn: '', timeOut: '', truckNo: '', mandiEgpNo: '', rstNo: '', mandiParchiNo: '', supplierId: '',
    mandi: '', pahunchPersonName: '',
    moisture: '', safai: 'Good', mandiIntimation: 'N.A.', remarks: '',
    allocationType: 'Hoodi',
    origBagsRec: 0, origAClass: 0, origBClass: 0, origAClassAg: 0, origBClassAg: 0,
    shortageAClass: 0, shortageBClass: 0,
    qualityCutType: 'NONE', qualityCutValue: 0, qualityCutReason: '',
    agencyBagsRec: 0, agencyAClass: 0, agencyBClass: 0, agencyAClassAg: 0, agencyBClassAg: 0,
    netWtMill: 0, reqNetWt: 0, netWtParty: 0, netWtDiff: 0,
    shortageType: 'Shortage Received', updateShortageReg: 'Yes', allocatedUnloader: '',
    unloaderTruckCount: 0,
    stackNo: '',
    hoodiUpload: 'N.A.',
    allocateUnloader: '',
    driverName: '', mobileNumber: '',
    // Signatures
    driverSign: '',
    unloaderSign: '',
    pahunchPersonSign: '',
    // Biometric Data
    biometricData: '',
    bhariVideoUpload: 'Yes', khaliVideoUpload: 'Yes'
  };

  const [inwardFormData, setInwardFormData] = useState<any>(defaultInwardFormData);
  
  // Track Boli bags input from supervisor
  const [boliInputs, setBoliInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!hasBackdatePermission) {
      const interval = setInterval(() => {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0,5);
        setInwardFormData((prev: any) => ({
          ...prev,
          date: dateStr,
          timeIn: prev.timeIn || timeStr,
          timeOut: prev.timeOut || timeStr,
        }));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [hasBackdatePermission]);

  useEffect(() => {
    // Auto calculate Required Net Wt and Shortage
    const origA = parseFloat(inwardFormData.origAClass) || 0;
    const origB = parseFloat(inwardFormData.origBClass) || 0;
    const shortA = parseFloat(inwardFormData.shortageAClass) || 0;
    const shortB = parseFloat(inwardFormData.shortageBClass) || 0;
    
    // Fallback to activePlant or selected localPlant
    const selectedPlant = plants.find(p => p.id === (activePlant?.id ));
    const stdWeightA = selectedPlant?.aClassBagWeight || 0.380;
    const stdWeightB = selectedPlant?.bClassBagWeight || 0.385;

    const totalA = origA + shortA;
    const totalB = origB + shortB;
    const reqA = totalA * stdWeightA;
    const reqB = totalB * stdWeightB;
    const req = (reqA + reqB).toFixed(3);
    
    const actualWt = parseFloat(inwardFormData.netWtMill) || 0;
    const shortageQtl = (parseFloat(req) - actualWt).toFixed(2);
    // Rough estimation of bags using an average weight or specifically A/B ratio
    const avgWeight = totalA + totalB > 0 ? (reqA + reqB) / (totalA + totalB) : stdWeightA;
    const shortageBags = (parseFloat(shortageQtl) / avgWeight).toFixed(2);

    setInwardFormData((prev: any) => ({ 
      ...prev, 
      reqNetWt: req,
      shortageQtl: parseFloat(shortageQtl) > 0 ? shortageQtl : '0.00',
      shortageBags: parseFloat(shortageBags) > 0 ? shortageBags : '0.00'
    }));
  }, [inwardFormData.origAClass, inwardFormData.origBClass, inwardFormData.shortageAClass, inwardFormData.shortageBClass, inwardFormData.netWtMill, activePlant, plants]);
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
 const [addSupplierModal, setAddSupplierModal] = useState({ isOpen: false, name: '', firmNames: '', mandi: '', contact: '' });
 const [inspectModal, setInspectModal] = useState({ isOpen: false, batchId: '', moisture: 0, broken: 0, discoloration: 0, foreignMatter: 0 });

  const [paddyPurchaseModal, setPaddyPurchaseModal] = useState<any>({
    isOpen: false,
    id: '',
    plantId: '',
    supplierId: '',
    riceCategory: 'ANY',
    date: new Date().toISOString().split('T')[0],
    bolis: [{ moisture: '', bags: '', rate: '' }],
    govtRate: '',
    diff: '',
    payment: '',
    note: '',
    finalHisabAmt: ''
  });
  const [viewBolisModal, setViewBolisModal] = useState<any>({ isOpen: false, bolis: [], partyMandi: '', date: '' });
  
  const handlePaddyPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPlantId = paddyPurchaseModal.plantId || activePlant?.id ;
    if (!selectedPlantId) {
      useUiStore.getState().addToast('Please select a plant at the top of the page first.', 'error');
      return;
    }
    try {
      const payload = { ...paddyPurchaseModal, plantId: selectedPlantId };
      
      if (paddyPurchaseModal.id) {
        await api.put(`/api/procurement/soda-pending/${paddyPurchaseModal.id}`, payload);
        useUiStore.getState().addToast('Purchase updated successfully', 'success');
      } else {
        await api.post('/api/procurement/soda-pending', payload);
        useUiStore.getState().addToast('Purchase created successfully', 'success');
      }
      setPaddyPurchaseModal({ ...paddyPurchaseModal, isOpen: false });
      await fetchSodaPending();
    } catch (error: any) {
      console.error('Failed to save purchase', error);
      const msg = error.response?.data?.message || 'Failed to save purchase';
      useUiStore.getState().addToast(msg, 'error');
    }
  };
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
    if (activePlant?.id ) {
      setFormData((prev: any) => ({ ...prev, plantId: activePlant?.id  }));
      const fetchData = async () => {
        fetchRecentPurchases();
        fetchSuppliers();
        fetchSodaPending();
        
        try {
          const [tRes, dRes, sRes] = await Promise.all([
            api.get('/api/master-data/trucks'),
            api.get('/api/master-data/drivers'),
            api.get('/api/master-data/staff')
          ]);
          setTrucks(tRes.data);
          setDrivers(dRes.data);
          setStaff(sRes.data);
        } catch(err) {
          console.error('Failed to fetch masters', err);
        }
      };
      fetchData();
    }
    fetchInwardList();
  }, [activePlant?.id, activeTab, listFilters.dateFrom, listFilters.dateTo]);

 
  const handleViewInward = async (inward: any) => {
    try {
      const res = await api.get(`/api/procurement/inward-details/${inward.id}`);
      setViewInwardModal(res.data);
    } catch (error) {
      console.error('Failed to fetch inward details', error);
      useUiStore.getState().addToast('Failed to load inward details', 'error');
    }
  };

  const fetchInwardList = async () => {
    try {
      const pid = activePlant?.id  || 'global';
      const params = new URLSearchParams();
      if (listFilters.dateFrom) params.append('dateFrom', listFilters.dateFrom);
      if (listFilters.dateTo) params.append('dateTo', listFilters.dateTo);
      if (listFilters.mandi) params.append('mandi', listFilters.mandi);
      if (listFilters.supplierId) params.append('supplierId', listFilters.supplierId);
      const res = await api.get(`/api/procurement/inwards/${pid}?${params.toString()}`);
      setInwardList(res.data);
    } catch (error) {
      console.error('Failed to fetch inward list', error);
    }
  };

  const fetchRecentPurchases = async () => {
 try {
 const pid = activePlant?.id  || 'global';
 const params = new URLSearchParams();
 if (listFilters.dateFrom) params.append('dateFrom', listFilters.dateFrom);
 if (listFilters.dateTo) params.append('dateTo', listFilters.dateTo);
 const res = await api.get(`/api/procurement/recent/${pid}?${params.toString()}`);
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
 const pid = activePlant?.id  || 'global';
 const params = new URLSearchParams();
 if (listFilters.dateFrom) params.append('dateFrom', listFilters.dateFrom);
 if (listFilters.dateTo) params.append('dateTo', listFilters.dateTo);
 const res = await api.get(`/api/procurement/soda-pending/${pid}?${params.toString()}`);
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
 await api.post('/api/procurement/suppliers', { name: addSupplierModal.name, contact: addSupplierModal.contact, firmNames: addSupplierModal.firmNames.split(',').map(s=>s.trim()).filter(Boolean), mandi: addSupplierModal.mandi });
 setAddSupplierModal({ isOpen: false, name: '', firmNames: '', mandi: '', contact: '' });
 fetchSuppliers();
 } catch (error) {
 console.error('Failed to add supplier', error);
 }
 };

  const openStackModal = async () => {
    const selectedPlantId = activePlant?.id ;
    if (!selectedPlantId) {
      useUiStore.getState().addToast('Please select a plant at the top of the page first.', 'error');
      return;
    }
    try {
      const res = await api.get(`/api/procurement/occupied-stacks/${selectedPlantId}`);
      setOccupiedStacks(res.data);
    } catch (err) {
      console.error('Failed to fetch occupied stacks', err);
    }
    setIsStackModalOpen(true);
  };
  const handleInwardSubmit = async () => {
    const selectedPlantId = activePlant?.id ;
    if (!selectedPlantId) {
      useUiStore.getState().addToast('Please select a plant at the top of the page first.', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      
      const parsedOrigA = parseFloat(inwardFormData.origAClass as any) || 0;
      const parsedOrigB = parseFloat(inwardFormData.origBClass as any) || 0;
      const parsedShortageA = parseFloat(inwardFormData.shortageAClass as any) || 0;
      const parsedShortageB = parseFloat(inwardFormData.shortageBClass as any) || 0;
      const computedBagsRecAtMill = parsedOrigA + parsedOrigB + parsedShortageA + parsedShortageB;

      const parsedOrigAAg = parseFloat(inwardFormData.origAClassAg as any) || 0;
      const parsedOrigBAg = parseFloat(inwardFormData.origBClassAg as any) || 0;
      const computedBagsAtAgencyGp = parsedOrigAAg + parsedOrigBAg;

      const payload = {
        ...formData,
        ...inwardFormData,
        bagsRecAtMill: computedBagsRecAtMill,
        bagsAtAgencyGp: computedBagsAtAgencyGp,
        boliInputs,
        category,
        plantId: selectedPlantId
      };

      await api.post('/api/procurement/save-purchase', payload);
      useUiStore.getState().addToast('Paddy Inward (Goods Receipt) Saved Successfully!', 'success');
      setInwardFormData({ ...defaultInwardFormData }); // clear all fields
      setBoliInputs({}); // clear boli inputs
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-main)]">
          <Users className="text-[#e67e00]" /> Arthiya Master
        </h2>
        <button onClick={() => setAddSupplierModal({ isOpen: true, name: '', firmNames: '', mandi: '', contact: '' })} className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-orange-500/20">
          + Add Arthiya
        </button>
      </div>
 </div>
 <div className="flex-1 overflow-auto bg-[var(--bg-base)] p-6">
 <table className="w-full border-collapse text-[var(--text-muted)] text-sm">
 <thead>
 <tr className="border-b border-[var(--border-subtle)] uppercase text-[var(--text-muted-alt)] text-left">
 <th className="p-3">Name</th>
 <th className="p-3">Firm Names</th>
 <th className="p-3">Mandi</th>
 <th className="p-3">Contact</th>
 <th className="p-3">Status</th>
 </tr>
 </thead>
 <tbody>
 {suppliers.map((s, i) => (
 <tr key={s.id} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)]">
 <td className="p-3 font-medium text-[var(--text-main)]">{s.name}</td>
 <td className="p-3">{s.firmNames && s.firmNames.length > 0 ? s.firmNames.join(', ') : '-'}</td>
 <td className="p-3">{s.mandi || '-'}</td>
 <td className="p-3">{s.contact || '-'}</td>
 <td className="p-3">
 <span className="px-2 py-1 rounded bg-green-900/50 text-green-400 text-xs font-bold">Active</span>
 </td>
 </tr>
 ))}
 {suppliers.length === 0 && (
 <tr>
 <td colSpan={5} className="p-6 text-center text-[var(--text-muted-alt)]">No suppliers found.</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* TAB 2: PADDY PURCHASE */}
  {activeTab === 'paddy_purchase' && (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col h-full overflow-hidden">
      <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)]">
        <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
          <Package className="text-[#e67e00]" /> Paddy Purchase
        </h2>
        <button 
          onClick={() => setPaddyPurchaseModal({
            isOpen: true, id: '', plantId: activePlant?.id || '', supplierId: '', riceCategory: 'ANY',
            date: new Date().toISOString().split('T')[0], 
            bolis: [{ moisture: '', bags: '', rate: '' }],
            govtRate: '', diff: '', payment: '', note: '', finalHisabAmt: ''
          })}
          className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-orange-500/20"
        >
          + New purchase
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-[var(--bg-base)] p-6">
        
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div>
              <label className="block text-[var(--text-muted-alt)] text-xs mb-1">From Date</label>
              <input type="date" value={listFilters.dateFrom} onChange={e => setListFilters(f => ({...f, dateFrom: e.target.value}))} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm" />
            </div>
            <div>
              <label className="block text-[var(--text-muted-alt)] text-xs mb-1">To Date</label>
              <input type="date" value={listFilters.dateTo} onChange={e => setListFilters(f => ({...f, dateTo: e.target.value}))} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm" />
            </div>
            <div>
              <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Mandi</label>
              <input type="text" value={listFilters.mandi} onChange={e => setListFilters(f => ({...f, mandi: e.target.value}))} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm" placeholder="Mandi..." />
            </div>
            <div>
              <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Artia (Supplier)</label>
              <select value={listFilters.supplierId} onChange={e => setListFilters(f => ({...f, supplierId: e.target.value}))} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm">
                <option value="">All Artias</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => setListFilters({dateFrom: '', dateTo: '', mandi: '', supplierId: ''})} className="bg-[var(--bg-panel-hover)] text-[var(--text-main)] px-3 py-1.5 rounded border border-[var(--border-subtle)] text-sm hover:bg-[var(--bg-panel)]">Clear</button>
            </div>
          </div>
          <table className="w-full border-collapse text-[var(--text-muted)] text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] uppercase text-[var(--text-muted-alt)] text-left bg-[var(--glass-bg)]">
              <th className="p-3">Party - Supplier</th>
              <th className="p-3">Date</th>
              <th className="p-3">Mc</th>
              <th className="p-3">Bags</th>
              <th className="p-3">Rate</th>
              <th className="p-3">Diff</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Note</th>
              <th className="p-3">Final Hisab Amt</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sodaPending.map((p, i) => (
              <tr key={p.id} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)]">
                  <td className="p-3 font-medium text-[var(--text-main)]">{p.partyMandi}</td>
                  <td className="p-3">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="p-3">
                    {p.bolis?.length ? <button onClick={() => setViewBolisModal({isOpen: true, bolis: p.bolis, partyMandi: p.partyMandi, date: p.date})} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/30">View {p.bolis.length} Bolis</button> : p.mc || '-'}
                  </td>
                  <td className="p-3 font-bold text-[var(--text-muted)]">{p.bolis?.length ? '-' : p.bags || '-'}</td>
                  <td className="p-3 font-bold text-[#e67e00]">{p.bolis?.length ? '-' : p.rate || '-'}</td>
                <td className="p-3 text-red-400">{p.diff || '0'}</td>
                <td className="p-3 text-green-400">{p.payment || '0'}</td>
                <td className="p-3">{p.note || '-'}</td>
                <td className="p-3 font-bold text-[var(--text-main)]">{p.finalHisabAmt || '0'}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setPaddyPurchaseModal({
                    isOpen: true, id: p.id, plantId: activePlant?.id || '', supplierId: p.supplierId, riceCategory: p.riceCategory || 'ANY',
                    date: new Date(p.date).toISOString().split('T')[0], 
                    bolis: p.bolis && p.bolis.length > 0 ? p.bolis : [{ moisture: p.mc || '', bags: p.bags || '', rate: p.rate || '' }],
                    diff: p.diff || '', payment: p.payment || '', note: p.note || '', finalHisabAmt: p.finalHisabAmt || '',
                    govtRate: p.govtRate || ''
                  })} className="text-blue-400 hover:text-blue-300">
                    <Edit className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {sodaPending.length === 0 && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-[var(--text-muted-alt)]">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )}

  {/* View Bolis Modal */}
  {viewBolisModal.isOpen && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-panel)] rounded-xl w-full max-w-lg shadow-2xl border border-[var(--border-subtle)] overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-main)]">Bolis Breakdown</h3>
            <p className="text-xs text-[var(--text-muted-alt)] mt-1">{viewBolisModal.partyMandi} - {new Date(viewBolisModal.date).toLocaleDateString()}</p>
          </div>
          <button onClick={() => setViewBolisModal({isOpen: false, bolis: []})} className="text-[var(--text-muted)] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="py-2 text-xs text-[var(--text-muted-alt)] uppercase">#</th>
                <th className="py-2 text-xs text-[var(--text-muted-alt)] uppercase">Moisture (%)</th>
                <th className="py-2 text-xs text-[var(--text-muted-alt)] uppercase text-right">Bags</th>
                <th className="py-2 text-xs text-[var(--text-muted-alt)] uppercase text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {viewBolisModal.bolis.map((b: any, idx: number) => (
                <tr key={idx} className="border-b border-[var(--border-subtle-alt)] last:border-0 hover:bg-[var(--glass-bg)]">
                  <td className="py-3 text-sm text-[var(--text-muted)]">{idx + 1}</td>
                  <td className="py-3 text-sm text-[var(--text-main)]">{b.moisture}%</td>
                  <td className="py-3 text-sm text-right text-[var(--text-main)] font-bold">{b.bags}</td>
                  <td className="py-3 text-sm text-right text-[#e67e00] font-bold">{b.rate}</td>
                </tr>
              ))}
              <tr className="bg-[var(--bg-base)]">
                <td colSpan={2} className="py-3 text-sm font-bold text-right text-[var(--text-muted)]">Total:</td>
                <td className="py-3 text-sm text-right text-[var(--text-main)] font-bold">{viewBolisModal.bolis.reduce((acc: number, b: any) => acc + (parseFloat(b.bags) || 0), 0)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div className="mt-6 flex justify-end">
            <button onClick={() => setViewBolisModal({isOpen: false, bolis: []})} className="px-4 py-2 bg-[var(--bg-base)] hover:bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded text-[var(--text-main)] text-sm">Close</button>
          </div>
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
  <input type="date" name="date" value={inwardFormData.date} onChange={handleInwardChange} disabled={!hasBackdatePermission} className={`w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none ${hasBackdatePermission ? 'focus:border-[#e67e00]' : 'opacity-70 cursor-not-allowed'}`} />
  </div>
  <div>
  <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Time In</label>
  <input type="time" name="timeIn" value={inwardFormData.timeIn} onChange={handleInwardChange} disabled={!hasBackdatePermission} className={`w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none ${hasBackdatePermission ? 'focus:border-[#e67e00]' : 'opacity-70 cursor-not-allowed'}`} />
  </div>
  <div>
  <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Time Out</label>
  <input type="time" name="timeOut" value={inwardFormData.timeOut} onChange={handleInwardChange} disabled={!hasBackdatePermission} className={`w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none ${hasBackdatePermission ? 'focus:border-[#e67e00]' : 'opacity-70 cursor-not-allowed'}`} />
  </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Truck No.</label>
 <select name="truckNo" value={inwardFormData.truckNo} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]">
   <option value="">Select Truck</option>
   {trucks.map(t => <option key={t.id} value={t.truckNumber}>{t.truckNumber}</option>)}
 </select>
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
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Mandi Parchi No.</label>
 <input type="text" name="mandiParchiNo" value={inwardFormData.mandiParchiNo} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="PRC-12345" />
 </div>
 <div>
  <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Party / Supplier Name</label>
  <select name="supplierId" value={inwardFormData.supplierId} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]">
  <option value="">Select Supplier</option>
  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
  </select>
  </div>
  <div>
  <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Mandi</label>
  <input type="text" name="mandi" value={inwardFormData.mandi} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="Mandi Name" />
  </div>
  <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1 flex items-center gap-2">Pahunch Person / Staff</label>
 <select name="pahunchPersonName" value={inwardFormData.pahunchPersonName} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none">
   <option value="">Select Staff</option>
   {staff.map(s => <option key={s.id} value={s.name}>{s.name} ({s.role})</option>)}
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
 <input type="number" min="0" name="moisture" value={inwardFormData.moisture} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"  max="100" step="0.01" />
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
 <div className="flex items-center gap-4 py-2">
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="bhariVideoUpload" value="Yes" checked={inwardFormData.bhariVideoUpload === 'Yes'} onChange={handleInwardChange} className="accent-blue-500" /> Yes</label>
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="bhariVideoUpload" value="No" checked={inwardFormData.bhariVideoUpload === 'No'} onChange={handleInwardChange} className="accent-blue-500" /> Uploading</label>
 </div>
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Khali (Empty) Video Upload</label>
 <div className="flex items-center gap-4 py-2">
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="khaliVideoUpload" value="Yes" checked={inwardFormData.khaliVideoUpload === 'Yes'} onChange={handleInwardChange} className="accent-blue-500" /> Yes</label>
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="khaliVideoUpload" value="No" checked={inwardFormData.khaliVideoUpload === 'No'} onChange={handleInwardChange} className="accent-blue-500" /> Uploading</label>
 </div>
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
 </div>
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1 flex items-center justify-between">Allocate Unloader <ScanBarcode size={14} className="text-[#e67e00]" /></label>
 <div className="relative">
 <input type="text" name="allocateUnloader" value={inwardFormData.allocateUnloader} onChange={e => {
 handleInwardChange(e);
 if (e.target.value) {
  setInwardFormData((prev: any) => ({...prev, unloaderTruckCount: Math.floor(Math.random() * 5) + 1}));
 }
 }} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 pl-8 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="Scan barcode..." />
 <ScanBarcode size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
 </div>
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1 flex items-center justify-between">Stack No. <ScanBarcode size={14} className="text-[#e67e00]" /></label>
 <div className="flex gap-2">
 <div className="relative flex-1">
 <input type="text" name="stackNo" value={inwardFormData.stackNo} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 pl-8 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="Scan stack barcode..." />
 <ScanBarcode size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
 </div>
 <button type="button" onClick={openStackModal} className="px-3 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-[var(--text-main)] hover:bg-[var(--glass-bg)]" title="Select Manually">
 <Layers size={16} />
 </button>
 </div>
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Truck Unload Count (Today)</label>
 <input type="number" min="0" name="unloaderTruckCount" value={inwardFormData.unloaderTruckCount} disabled className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] opacity-70 cursor-not-allowed" title="Calculated automatically" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Labour Name</label>
 <select name="labour" value={inwardFormData.labour} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]">
 <option value="">Select Labour Contractor</option>
 {MOCK_LABOUR_CONTRACTORS.map(l => <option key={l} value={l}>{l}</option>)}
 </select>
 </div>
 <div>
  <div className="col-span-1 sm:col-span-2 bg-[#e67e00]/10 p-3 rounded-lg border border-[#e67e00]/30 grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-3">
      <div className="font-bold text-[#e67e00] text-xs">UNLOADING START VERIFICATION</div>
      <label className="flex items-center gap-2 text-sm text-[var(--text-main)]">
        <input type="checkbox" checked={inwardFormData.loadedVideoVerified} onChange={e => setInwardFormData((prev: any) => ({...prev, loadedVideoVerified: e.target.checked}))} className="accent-[#e67e00] w-4 h-4" />
        Loaded Truck Video Captured & Verified
      </label>
      <input type="password" placeholder="Supervisor PIN (1234)" value={inwardFormData.startPin} onChange={e => setInwardFormData((prev: any) => ({...prev, startPin: e.target.value}))} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-sm outline-none" />
      <div>
      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Starts Time</label>
      <div className="flex gap-2">
      <input type="time" name="unloadingStartTime" value={inwardFormData.unloadingStartTime} onChange={handleInwardChange} disabled={!hasBackdatePermission} className={`flex-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] outline-none ${hasBackdatePermission ? 'focus:border-[#e67e00]' : 'opacity-70 cursor-not-allowed'}`} />
      {!hasBackdatePermission && (
        <button type="button" disabled={!inwardFormData.loadedVideoVerified || inwardFormData.startPin !== '1234'} onClick={() => setInwardFormData((prev: any) => ({...prev, unloadingStartTime: new Date().toTimeString().slice(0,5)}))} className="bg-[#e67e00] hover:bg-[#cc7000] disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 rounded text-xs font-bold transition-colors">NOW</button>
      )}
      </div>
      </div>
    </div>
    
    <div className="space-y-3">
      <div className="font-bold text-[#e67e00] text-xs">UNLOADING FINISH VERIFICATION</div>
      <label className="flex items-center gap-2 text-sm text-[var(--text-main)]">
        <input type="checkbox" checked={inwardFormData.emptyVideoVerified} onChange={e => setInwardFormData((prev: any) => ({...prev, emptyVideoVerified: e.target.checked}))} className="accent-[#e67e00] w-4 h-4" />
        Empty Truck Video Captured & Verified
      </label>
      <input type="password" placeholder="Supervisor PIN (1234)" value={inwardFormData.finishPin} onChange={e => setInwardFormData((prev: any) => ({...prev, finishPin: e.target.value}))} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-sm outline-none" />
      <div>
      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Finish Time</label>
      <div className="flex gap-2">
      <input type="time" name="unloadingFinishTime" value={inwardFormData.unloadingFinishTime} onChange={handleInwardChange} disabled={!hasBackdatePermission} className={`flex-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] outline-none ${hasBackdatePermission ? 'focus:border-[#e67e00]' : 'opacity-70 cursor-not-allowed'}`} />
      {!hasBackdatePermission && (
        <button type="button" disabled={!inwardFormData.emptyVideoVerified || inwardFormData.finishPin !== '1234'} onClick={() => setInwardFormData((prev: any) => ({...prev, unloadingFinishTime: new Date().toTimeString().slice(0,5)}))} className="bg-[#e67e00] hover:bg-[#cc7000] disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 rounded text-xs font-bold transition-colors">NOW</button>
      )}
      </div>
      </div>
    </div>
  </div></div>
 </div>
 </div>

 {/* Pending Bolis & Quality Cut (Supervisor Input) */}
 {inwardFormData.supplierId && (
   <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[#e67e00]/30 overflow-hidden mt-6">
     <div className="bg-[#e67e00]/10 px-4 py-2 border-b border-[#e67e00]/20 text-[#e67e00] font-bold text-sm flex items-center justify-between">
       <span>Pending Bolis / Soda for Selected Arthiya</span>
     </div>
     <div className="p-4">
       <div className="overflow-x-auto mb-4 border border-[var(--border-subtle)] rounded">
         <table className="w-full text-sm text-left whitespace-nowrap">
           <thead>
             <tr className="text-[var(--text-muted-alt)] text-xs border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
               <th className="p-2 font-medium">Date</th>
               <th className="p-2 font-medium">Moisture</th>
               <th className="p-2 font-medium">Rate</th>
               <th className="p-2 font-medium">Expected Bags</th>
               <th className="p-2 font-medium text-blue-400">Bags Rec</th>
               <th className="p-2 font-medium">Note</th>
             </tr>
           </thead>
           <tbody>
             {sodaPending.filter((s: any) => s.supplierId === inwardFormData.supplierId).length === 0 ? (
               <tr><td colSpan={6} className="p-3 text-center text-gray-500 italic">No pending bolis found.</td></tr>
             ) : (
               sodaPending.filter((s: any) => s.supplierId === inwardFormData.supplierId).map((soda: any) => (
                 <React.Fragment key={soda.id}>
                   {soda.bolis?.filter((b: any) => !b.isCompleted).map((boli: any) => (
                     <tr key={boli.id} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--bg-base)]">
                       <td className="p-2">{new Date(soda.date).toLocaleDateString()}</td>
                       <td className="p-2">{boli.moisture}%</td>
                       <td className="p-2">₹{boli.rate}</td>
                       <td className="p-2">{boli.bags}</td>
                       <td className="p-2">
                         <input type="number" min="0" 
                                value={boliInputs[boli.id] || ''} 
                                onChange={(e) => setBoliInputs(prev => ({...prev, [boli.id]: e.target.value}))}
                                className="w-20 bg-[var(--bg-base)] border border-blue-500/50 rounded px-2 py-1 text-[var(--text-main)] outline-none focus:border-blue-500" 
                                placeholder="Enter bags" />
                       </td>
                       <td className="p-2 text-[var(--text-muted)] truncate max-w-[150px]">{soda.note || '-'}</td>
                     </tr>
                   ))}
                 </React.Fragment>
               ))
             )}
           </tbody>
         </table>
       </div>
       
       <div className="bg-[var(--bg-base)] rounded border border-[var(--border-subtle)] p-3">
         <h4 className="text-xs font-bold text-[var(--text-muted-alt)] mb-2 uppercase">Quality Cut</h4>
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <div>
             <label className="block text-[var(--text-muted-alt)] text-[10px] mb-1">Cut Type</label>
             <select name="qualityCutType" value={inwardFormData.qualityCutType} onChange={handleInwardChange} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)] outline-none">
               <option value="NONE">None</option>
               <option value="BAGS">In Terms of Bags</option>
               <option value="PERCENTAGE">In Terms of Percentage</option>
             </select>
           </div>
           <div>
             <label className="block text-[var(--text-muted-alt)] text-[10px] mb-1">
               Value {inwardFormData.qualityCutType === 'PERCENTAGE' ? '(%)' : inwardFormData.qualityCutType === 'BAGS' ? '(Bags)' : ''}
             </label>
             <input type="number" min="0" name="qualityCutValue" value={inwardFormData.qualityCutValue} onChange={handleInwardChange} disabled={inwardFormData.qualityCutType === 'NONE'} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)] outline-none disabled:opacity-50" />
           </div>
           <div>
             <label className="block text-[var(--text-muted-alt)] text-[10px] mb-1">Reason</label>
             <input type="text" name="qualityCutReason" value={inwardFormData.qualityCutReason} onChange={handleInwardChange} disabled={inwardFormData.qualityCutType === 'NONE'} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)] outline-none disabled:opacity-50" placeholder="e.g. High Moisture" />
           </div>
         </div>
         {inwardFormData.qualityCutType === 'PERCENTAGE' && inwardFormData.qualityCutValue > 0 && inwardFormData.netWtMill > 0 && (
           <div className="mt-2 text-xs text-orange-400">
             <span className="font-bold">Calculated Cut equivalent:</span> {((parseFloat(inwardFormData.netWtMill) * parseFloat(inwardFormData.qualityCutValue)) / 100).toFixed(2)} Qtl (Will be added to Shortage)
           </div>
         )}
       </div>
     </div>
   </div>
 )}

 </div>

 {/* RIGHT COLUMN */}
 <div className="col-span-12 xl:col-span-5 space-y-6">
 {/* 5. Bardana Details & 6. Weight Details */}
 <div className="flex flex-col gap-6 mt-6">
 {/* 5. Bardana */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">5. Bardana (Bag) Details</div>
 <div className="p-4">
 <table className="w-full text-sm text-left">
 <thead>
 <tr className="text-[var(--text-muted-alt)] text-xs border-b border-[var(--border-subtle)]">
 <th className="pb-2 font-medium w-1/3"></th>
 <th className="pb-2 font-medium text-center" colSpan={2}>Original Bardana</th>
 <th className="pb-2 font-medium text-center text-[#e67e00]" colSpan={2}>Shortage Received</th>
 </tr>
 <tr className="text-[var(--text-muted-alt)] text-xs border-b border-[var(--border-subtle)]">
 <th className="pb-2 font-medium"></th>
 <th className="pb-2 font-medium">A Class</th>
 <th className="pb-2 font-medium">B Class</th>
 <th className="pb-2 font-medium text-[#e67e00]">A Class</th>
 <th className="pb-2 font-medium text-[#e67e00]">B Class</th>
 </tr>
 </thead>
 <tbody>
 <tr className="border-b border-[var(--border-subtle-alt)]">
 <td className="py-3 text-[var(--text-muted)] font-medium">Bags Rec. @ Mill</td>
 <td className="py-3"><input type="number" min="0" name="origAClass" value={inwardFormData.origAClass} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)]"  /></td>
 <td className="py-3"><input type="number" min="0" name="origBClass" value={inwardFormData.origBClass} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)]"  /></td>
 <td className="py-3"><input type="number" min="0" name="shortageAClass" value={inwardFormData.shortageAClass} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[#e67e00]/50 rounded px-2 py-1 text-[var(--text-main)]"  /></td>
 <td className="py-3"><input type="number" min="0" name="shortageBClass" value={inwardFormData.shortageBClass} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[#e67e00]/50 rounded px-2 py-1 text-[var(--text-main)]"  /></td>
 </tr>
 <tr>
 <td className="py-3 text-[var(--text-muted)] font-medium">Bags @ Agency GP</td>
 <td className="py-3"><input type="number" min="0" name="origAClassAg" value={inwardFormData.origAClassAg} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)]"  /></td>
 <td className="py-3"><input type="number" min="0" name="origBClassAg" value={inwardFormData.origBClassAg} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)]"  /></td>
 <td className="py-3 text-center text-gray-500" colSpan={2}>-</td>
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
  <label className="block text-[var(--text-muted-alt)] text-xs mb-1 flex justify-between items-center">
    <span>Net Wt. @ Mill (Qtl)</span>
    {!hasManualWeighbridgePermission && (
      <button type="button" onClick={() => {
        // Simulate weighbridge fetch
        setInwardFormData((prev: any) => ({...prev, netWtMill: (Math.random() * (450 - 350) + 350).toFixed(2)}));
      }} className="text-[#e67e00] hover:text-white transition-colors flex items-center gap-1" title="Fetch from Weighbridge">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        Fetch
      </button>
    )}
  </label>
  <input type="number" min="0" name="netWtMill" value={inwardFormData.netWtMill} onChange={handleInwardChange} disabled={!hasManualWeighbridgePermission} className={`w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] font-bold outline-none ${hasManualWeighbridgePermission ? 'focus:border-[#e67e00]' : 'opacity-70 cursor-not-allowed'}`}  />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Required Net Wt. (Qtl)</label>
 <input type="number" min="0" name="reqNetWt" value={inwardFormData.reqNetWt} disabled className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none opacity-70 cursor-not-allowed" title="Auto calculated"  />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Net Wt. @ Party (Qtl)</label>
 <input type="number" min="0" name="netWtParty" value={inwardFormData.netWtParty} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none"  />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Net Wt. Difference (Kgs)</label>
 <input type="number" min="0" name="netWtDiff" value={inwardFormData.netWtDiff} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-blue-400 font-bold outline-none"  />
 </div>
 </div>
 </div>
 </div>
 
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
 <td className="py-2"><input type="number" min="0" value={lot.bags} onChange={(e) => handleDhanakChange(idx, 'bags', e.target.value)} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)] text-xs" /></td>
 <td className="py-2"><input type="number" min="0" value={lot.moisture} onChange={(e) => handleDhanakChange(idx, 'moisture', e.target.value)} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)] text-xs" /></td>
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
  <div className="col-span-2 bg-red-900/10 border border-red-500/20 p-3 rounded-lg flex items-center justify-between">
    <div>
      <span className="text-red-400 font-bold block">Calculated Shortage</span>
      <span className="text-[10px] text-[var(--text-muted-alt)]">Based on Standard Bag Weight ({plants.find(p => p.id === (activePlant?.id ))?.standardBagWeight || 0.382} Qtl)</span>
    </div>
    <div className="flex gap-6">
      <div className="text-center">
        <div className="text-[10px] text-[var(--text-muted-alt)] uppercase tracking-wider">Qtl</div>
        <div className="text-[var(--text-main)] font-mono font-bold text-lg">{inwardFormData.shortageQtl || '0.00'}</div>
      </div>
      <div className="text-center border-l border-red-500/20 pl-6">
        <div className="text-[10px] text-[var(--text-muted-alt)] uppercase tracking-wider">Bags</div>
        <div className="text-[var(--text-main)] font-mono font-bold text-lg">{inwardFormData.shortageBags || '0.00'}</div>
      </div>
    </div>
  </div>
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
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1 flex items-center gap-2">Driver Name</label>
 <select name="driverName" value={inwardFormData.driverName} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none">
   <option value="">Select Driver</option>
   {drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Mobile Number</label>
 <input type="tel" pattern="[0-9]{10}" maxLength={10} title="10 digit mobile number" name="mobileNumber" value={inwardFormData.mobileNumber} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none" />
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
 <div className="p-4 flex flex-wrap gap-6 items-center justify-between text-sm">
 <div className="flex items-center gap-3 flex-wrap">
 {inwardFormData.biometricData ? (
   <div className="text-green-400 font-bold bg-green-900/10 border border-green-900/20 px-3 py-1.5 rounded flex items-center gap-2">
     <ShieldCheck size={16} /> Authenticated
   </div>
 ) : (
   <div className="text-[var(--text-muted-alt)] font-bold bg-[var(--glass-bg)] px-3 py-1.5 rounded flex items-center gap-2">
     <ShieldCheck size={16} /> Pending
   </div>
 )}
 <div className={`w-8 h-8 rounded ${inwardFormData.biometricData ? 'bg-green-900/20 border-green-500/50' : 'bg-[var(--glass-bg)] border-[var(--border-subtle)]'} flex items-center justify-center border`}>
 <svg className={`w-4 h-4 ${inwardFormData.biometricData ? 'text-green-500' : 'text-[#e67e00]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
 <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
 <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2"/>
 <path d="M12 7c-1.5 0-3 1.5-3 3 0 2 2 3 2 5" stroke="currentColor" strokeWidth="1"/>
 <path d="M15 10c0-1.5-1.5-3-3-3" stroke="currentColor" strokeWidth="1"/>
 <path d="M9 10c0 1.5 1.5 3 3 3" stroke="currentColor" strokeWidth="1"/>
 </svg>
 </div>
 {!inwardFormData.biometricData && (
   <button type="button" 
     disabled={isScanningFingerprint}
     onClick={async () => {
       try {
         setIsScanningFingerprint(true);
         const xmlData = await biometricService.captureFingerprint();
         setInwardFormData((prev: any) => ({...prev, biometricData: xmlData}));
         useUiStore.getState().addToast('Fingerprint captured successfully', 'success');
       } catch (err: any) {
         useUiStore.getState().addToast(err.message, 'error');
       } finally {
         setIsScanningFingerprint(false);
       }
     }}
     className="px-3 py-1.5 bg-[#e67e00] text-black font-bold rounded text-xs hover:bg-[#cc7000] disabled:opacity-50">
     {isScanningFingerprint ? 'Scanning...' : 'Scan Fingerprint'}
   </button>
 )}
 </div>
 <div className="flex flex-wrap gap-8 w-full sm:w-auto justify-between sm:justify-end">
 <div className="text-left sm:text-right min-w-[120px]">
 <div className="text-[var(--text-muted-alt)] text-[11px] uppercase tracking-wider mb-0.5">Authenticated By</div>
 <div className="text-[var(--text-main)] font-medium">{inwardFormData.biometricData ? 'System (Verified)' : '-'}</div>
 </div>
 <div className="text-right min-w-[120px]">
 <div className="text-[var(--text-muted-alt)] text-[11px] uppercase tracking-wider mb-0.5">Date & Time</div>
 <div className="text-[var(--text-main)] font-medium">{inwardFormData.biometricData ? new Date().toLocaleString() : '-'}</div>
 </div>
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


   {/* TAB: INWARD REGISTER */}
   {activeTab === 'inward_register' && (
      <div className="flex-1 overflow-auto bg-[var(--bg-panel)] p-6 rounded-xl border border-[var(--border-subtle)] flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between mb-4 border-b border-[var(--border-subtle-alt)] pb-3">
          <div className="flex items-center gap-3">
            <span className="text-[#e67e00] text-[10px] bg-[#e67e00]/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">BEAS AGRO</span>
            <h1 className="text-base font-bold text-[var(--text-muted)]">Inward List</h1>
            <p className="text-[var(--text-muted-alt)] text-xs border-l border-[var(--border-subtle)] pl-3 hidden sm:block">Procurement &gt; Inward List</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">From Date</label>
            <input type="date" value={listFilters.dateFrom} onChange={e => setListFilters(f => ({...f, dateFrom: e.target.value}))} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm" />
          </div>
          <div>
            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">To Date</label>
            <input type="date" value={listFilters.dateTo} onChange={e => setListFilters(f => ({...f, dateTo: e.target.value}))} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm" />
          </div>
          <div>
            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Mandi</label>
            <input type="text" value={listFilters.mandi} onChange={e => setListFilters(f => ({...f, mandi: e.target.value}))} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm" placeholder="Mandi..." />
          </div>
          <div>
            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Artia (Supplier)</label>
            <select value={listFilters.supplierId} onChange={e => setListFilters(f => ({...f, supplierId: e.target.value}))} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm">
              <option value="">All Artias</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => setListFilters({dateFrom: '', dateTo: '', mandi: '', supplierId: ''})} className="bg-[var(--bg-panel-hover)] text-[var(--text-main)] px-3 py-1.5 rounded border border-[var(--border-subtle)] text-sm hover:bg-[var(--bg-panel)]">Clear</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-[var(--text-muted)] text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] uppercase text-[var(--text-muted-alt)] text-left bg-[var(--glass-bg)]">
                <th className="p-3">Purchase No.</th>
                <th className="p-3">Date</th>
                <th className="p-3">GP No</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">Mandi EG No</th>
                <th className="p-3">Vehicle</th>
                <th className="p-3 text-right">Gross Wt</th>
                <th className="p-3 text-right">Tare Wt</th>
                <th className="p-3 text-right">Net Wt</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {inwardList.map((p, i) => (
                <tr key={i} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)]">
                  <td className="p-3 font-mono text-xs">{p.purchaseNo}</td>
                  <td className="p-3">{p.date}</td>
                  <td className="p-3">{p.gpNo}</td>
                  <td className="p-3 text-[var(--text-main)] font-bold">{p.supplier}</td>
                  <td className="p-3">{p.mandiEgNo}</td>
                  <td className="p-3">{p.vehicleNo}</td>
                  <td className="p-3 text-right text-[var(--text-muted-alt)]">{p.grossWt || '-'}</td>
                  <td className="p-3 text-right text-[var(--text-muted-alt)]">{p.tareWt || '-'}</td>
                  <td className="p-3 text-right font-bold text-[#e67e00]">{p.netWt || '-'}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => handleViewInward(p)} className="text-blue-500 hover:text-blue-400 p-1 rounded hover:bg-[var(--bg-base)]" title="View Full Details">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {inwardList.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-[var(--text-muted-alt)]">No inward records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        
        {/* Full Details Modal */}
        {viewInwardModal && (
          <CustomModal isOpen={!!viewInwardModal} onClose={() => setViewInwardModal(null)} title="Full Inward Details">
            <div className="space-y-6 max-h-[75vh] overflow-y-auto px-2">
              
              <div className="bg-[var(--bg-base)] p-5 rounded-lg border border-[var(--border-subtle)] shadow-inner">
                <h3 className="text-sm font-bold text-[#e67e00] mb-4 pb-2 border-b border-[var(--border-subtle)] uppercase tracking-wider">Basic Information</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Purchase No</p><p className="font-bold text-[var(--text-main)] font-mono">{viewInwardModal.id?.substring(0,8).toUpperCase()}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Date</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.createdAt ? new Date(viewInwardModal.createdAt).toLocaleDateString() : '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Supplier</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.supplier?.name || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">GP No</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.gpNo || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Mandi EG No</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.mandiEgNo || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Mandi</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.mandi || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Vehicle / Truck No</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.weighbridge?.vehicleNo || viewInwardModal.paddyInwardDetails?.truckNo || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Purchase Type</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.purchaseType || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Category</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.category || '-'}</p></div>
                </div>
              </div>

              <div className="bg-[var(--bg-base)] p-5 rounded-lg border border-[var(--border-subtle)] shadow-inner">
                <h3 className="text-sm font-bold text-[#e67e00] mb-4 pb-2 border-b border-[var(--border-subtle)] uppercase tracking-wider">Weight & Bags Details</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6">
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Gross Wt</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.weighbridge?.grossWeight || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Tare Wt</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.weighbridge?.tareWeight || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Net Wt</p><p className="font-bold text-green-500">{viewInwardModal.netWeight || viewInwardModal.paddyInwardDetails?.netWtAtMill || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Net Wt at Party</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.netWtAtParty || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Required Net Wt</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.requiredNetWt || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Difference</p><p className="font-bold text-red-500">{viewInwardModal.paddyInwardDetails?.netWtDifference || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Bags Rec at Mill</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.bagsRecAtMill || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Bags at Agency GP</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.bagsAtAgencyGp || '-'}</p></div>
                </div>
              </div>

              <div className="bg-[var(--bg-base)] p-5 rounded-lg border border-[var(--border-subtle)] shadow-inner">
                <h3 className="text-sm font-bold text-[#e67e00] mb-4 pb-2 border-b border-[var(--border-subtle)] uppercase tracking-wider">Unloading & Labor Details</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6">
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Allocation Type</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.allocationType || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Stack No</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.stackNo || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Safai Type</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.safaiType || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Labour Type</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.labourType || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Allocated Unloader</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.allocateUnloader || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Gaddi Count</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.gaddiCount || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Start Time</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.unloadingStartTime ? new Date(viewInwardModal.paddyInwardDetails.unloadingStartTime).toLocaleTimeString() : '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">End Time</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.unloadingEndTime ? new Date(viewInwardModal.paddyInwardDetails.unloadingEndTime).toLocaleTimeString() : '-'}</p></div>
                </div>
              </div>

              <div className="bg-[var(--bg-base)] p-5 rounded-lg border border-[var(--border-subtle)] shadow-inner">
                <h3 className="text-sm font-bold text-[#e67e00] mb-4 pb-2 border-b border-[var(--border-subtle)] uppercase tracking-wider">Quality, Bardana & Shortage</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6">
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Moisture</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.quality?.moisture || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Broken</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.quality?.broken || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Discoloration</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.quality?.discoloration || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Foreign Matter</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.quality?.foreignMatter || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Quality Cut</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.qualityCutValue || '0'} ({viewInwardModal.paddyInwardDetails?.qualityCutType || 'NONE'})</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Cut Reason</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.qualityCutReason || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Orig Bardana</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.originalBardanaClass || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Agency Bardana</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.agencyGpBardanaClass || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Shortage Type</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.shortageType || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Shortage A-Class</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.shortageAClass || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Shortage B-Class</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.shortageBClass || '-'}</p></div>
                  <div><p className="text-[var(--text-muted-alt)] text-xs">Arhtia Shortage Bal</p><p className="font-bold text-[var(--text-main)]">{viewInwardModal.paddyInwardDetails?.balanceShortageArhtia || '-'}</p></div>
                </div>
              </div>

            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setViewInwardModal(null)} className="px-5 py-2.5 bg-[#e67e00] hover:bg-[#cc7000] text-white rounded-lg font-bold shadow-lg">Close</button>
            </div>
          </CustomModal>
        )}

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
 <th className="border-b border-[var(--border-subtle)] p-3 text-left font-medium">Party - Supplier</th>
 <th className="border-b border-[var(--border-subtle)] p-3 text-left font-medium">Date</th>
 <th className="border-b border-[var(--border-subtle)] p-3 text-right font-medium">Mc</th>
 <th className="border-b border-[var(--border-subtle)] p-3 text-right font-medium">Bags</th>
 <th className="border-b border-[var(--border-subtle)] p-3 text-right font-medium">Govt Rate</th>
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
 <td className="p-3 text-right">
   {p.bolis?.length ? <button onClick={() => setViewBolisModal({isOpen: true, bolis: p.bolis, partyMandi: p.partyMandi, date: p.date})} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/30">View {p.bolis.length} Bolis</button> : p.mc}
 </td>
 <td className="p-3 text-right font-bold text-[var(--text-muted)]">
   {p.bolis?.length ? '-' : p.bags}
 </td>
 <td className="p-3 text-right text-[var(--text-muted)]">{p.govtRate || '-'}</td>
 <td className="p-3 text-right font-bold text-[var(--text-muted)]">
   {p.bolis?.length ? '-' : p.rate}
 </td>
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
 <td colSpan={11} className="p-6 text-center text-[var(--text-muted-alt)] font-medium italic border-b border-[var(--border-subtle-alt)]">
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
    isOpen={paddyPurchaseModal.isOpen} 
    onClose={() => setPaddyPurchaseModal({ ...paddyPurchaseModal, isOpen: false })}
    title={paddyPurchaseModal.id ? "Edit Paddy Purchase" : "New Paddy Purchase"}
  >
    <form onSubmit={handlePaddyPurchaseSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Rice Mill</label>
          <select value={paddyPurchaseModal.plantId} onChange={e => setPaddyPurchaseModal({...paddyPurchaseModal, plantId: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" required>
            <option value="">Select Plant</option>
            {plants.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Party - Supplier</label>
          <select value={paddyPurchaseModal.supplierId} onChange={e => setPaddyPurchaseModal({...paddyPurchaseModal, supplierId: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" required>
            <option value="">Select Supplier</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Date</label>
          <input type="date" value={paddyPurchaseModal.date} onChange={e => setPaddyPurchaseModal({...paddyPurchaseModal, date: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" required />
        </div>
        <div className="col-span-2 border border-[var(--border-subtle)] rounded p-4 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-[var(--text-main)]">Boli Details (Rate, Moisture, Bags)</h3>
            <button type="button" onClick={() => {
              setPaddyPurchaseModal({ ...paddyPurchaseModal, bolis: [...paddyPurchaseModal.bolis, { moisture: '', bags: '', rate: '' }] });
            }} className="text-xs bg-[var(--bg-panel)] text-[#e67e00] px-3 py-1 rounded font-bold border border-[#e67e00]/30 hover:bg-[#e67e00]/10">
              + Add Boli
            </button>
          </div>
          {paddyPurchaseModal.bolis.map((boli: any, index: number) => (
            <div key={index} className="grid grid-cols-3 gap-2 items-end">
              <div>
                <label className="block text-xs text-[var(--text-muted-alt)] mb-1">Moisture (Mc)</label>
                <input type="number" min="0" step="0.01" value={boli.moisture} onChange={e => {
                  const newBolis = [...paddyPurchaseModal.bolis];
                  newBolis[index].moisture = e.target.value;
                  setPaddyPurchaseModal({...paddyPurchaseModal, bolis: newBolis});
                }} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-[var(--text-main)] text-sm" />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted-alt)] mb-1">Bags</label>
                <input type="number" min="0" value={boli.bags} onChange={e => {
                  const newBolis = [...paddyPurchaseModal.bolis];
                  newBolis[index].bags = e.target.value;
                  const totalBags = newBolis.reduce((s, b) => s + (parseFloat(b.bags) || 0), 0);
                  const finalAmt = (totalBags * 0.375 * (parseFloat(paddyPurchaseModal.diff) || 0)).toFixed(2);
                  setPaddyPurchaseModal({...paddyPurchaseModal, bolis: newBolis, finalHisabAmt: finalAmt});
                }} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-[var(--text-main)] text-sm" required />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-[var(--text-muted-alt)] mb-1">Rate (Boli)</label>
                  <input type="number" min="0" step="0.01" value={boli.rate} onChange={e => {
                    const newBolis = [...paddyPurchaseModal.bolis];
                    newBolis[index].rate = e.target.value;
                    const r = parseFloat(e.target.value) || 0;
                    const g = parseFloat(paddyPurchaseModal.govtRate) || 0;
                    
                    let diff = paddyPurchaseModal.diff;
                    if (index === 0 && g && r) {
                      diff = (g - r).toFixed(2);
                    }
                    
                    const totalBags = newBolis.reduce((s, b) => s + (parseFloat(b.bags) || 0), 0);
                    const finalAmt = (totalBags * 0.375 * (parseFloat(diff) || 0)).toFixed(2);
                    
                    setPaddyPurchaseModal({...paddyPurchaseModal, bolis: newBolis, diff, finalHisabAmt: finalAmt});
                  }} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-[var(--text-main)] text-sm" required />
                </div>
                {paddyPurchaseModal.bolis.length > 1 && (
                  <button type="button" onClick={() => {
                    const newBolis = paddyPurchaseModal.bolis.filter((_: any, i: number) => i !== index);
                    const totalBags = newBolis.reduce((s: number, b: any) => s + (parseFloat(b.bags) || 0), 0);
                    const finalAmt = (totalBags * 0.375 * (parseFloat(paddyPurchaseModal.diff) || 0)).toFixed(2);
                    setPaddyPurchaseModal({...paddyPurchaseModal, bolis: newBolis, finalHisabAmt: finalAmt});
                  }} className="mb-0.5 px-2 py-1.5 text-red-400 hover:bg-red-400/10 rounded">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {!isSupervisor && (
          <>
            <div>
              <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Govt Rate</label>
              <input type="number" min="0" step="0.01" value={paddyPurchaseModal.govtRate || ''} onChange={e => {
                const govtRate = e.target.value;
                const g = parseFloat(govtRate) || 0;
                const firstRate = parseFloat(paddyPurchaseModal.bolis[0]?.rate) || 0;
                const diff = (g && firstRate) ? (g - firstRate).toFixed(2) : paddyPurchaseModal.diff;
                
                const totalBags = paddyPurchaseModal.bolis.reduce((s: number, b: any) => s + (parseFloat(b.bags) || 0), 0);
                const finalAmt = (totalBags * 0.375 * (parseFloat(diff) || 0)).toFixed(2);
                
                setPaddyPurchaseModal({...paddyPurchaseModal, govtRate, diff, finalHisabAmt: finalAmt});
              }} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Diff</label>
              <input type="number" min="0" step="0.01" value={paddyPurchaseModal.diff} onChange={e => {
                const diff = e.target.value;
                const totalBags = paddyPurchaseModal.bolis.reduce((s: number, b: any) => s + (parseFloat(b.bags) || 0), 0);
                const finalAmt = (totalBags * 0.375 * (parseFloat(diff) || 0)).toFixed(2);
                setPaddyPurchaseModal({...paddyPurchaseModal, diff, finalHisabAmt: finalAmt});
              }} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Payment</label>
              <input type="number" min="0" step="0.01" value={paddyPurchaseModal.payment} onChange={e => setPaddyPurchaseModal({...paddyPurchaseModal, payment: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Final Hisab Amt</label>
              <input type="number" min="0" step="0.01" value={paddyPurchaseModal.finalHisabAmt} onChange={e => setPaddyPurchaseModal({...paddyPurchaseModal, finalHisabAmt: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" />
              {paddyPurchaseModal.bolis.length > 0 && paddyPurchaseModal.diff && (
                <div className="mt-2 text-xs text-[var(--text-muted)] bg-blue-900/10 p-2 rounded border border-blue-900/20 text-blue-400">
                  <span className="font-semibold block mb-1">Calculation Breakdown:</span>
                  (Bags &times; 0.375) &times; Diff<br/>
                  ({paddyPurchaseModal.bolis.reduce((s: number, b: any) => s + (parseFloat(b.bags) || 0), 0)} &times; 0.375) &times; {paddyPurchaseModal.diff} = <span className="font-bold">{(paddyPurchaseModal.bolis.reduce((s: number, b: any) => s + (parseFloat(b.bags) || 0), 0) * 0.375 * parseFloat(paddyPurchaseModal.diff)).toFixed(2)}</span>
                </div>
              )}
            </div>
          </>
        )}
        <div className="col-span-2">
          <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Note</label>
          <input type="text" value={paddyPurchaseModal.note} onChange={e => setPaddyPurchaseModal({...paddyPurchaseModal, note: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)] mt-4">
        <button type="button" onClick={() => setPaddyPurchaseModal({...paddyPurchaseModal, isOpen: false})} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)]">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold hover:bg-[#cc7000] transition-colors">{paddyPurchaseModal.id ? "Update Purchase" : "Create Purchase"}</button>
      </div>
    </form>
  </CustomModal>

 <CustomModal 
    isOpen={addSupplierModal.isOpen} 
    onClose={() => setAddSupplierModal({ ...addSupplierModal, isOpen: false })}
    title="Add New Arthiya"
  >
    <form onSubmit={handleAddSupplier} className="space-y-4">
      <div>
        <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Arthiya Name</label>
        <input type="text" value={addSupplierModal.name} onChange={e => setAddSupplierModal({...addSupplierModal, name: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" required />
      </div>
      <div>
        <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Firm Names (comma separated)</label>
        <input type="text" value={addSupplierModal.firmNames} onChange={e => setAddSupplierModal({...addSupplierModal, firmNames: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" placeholder="E.g. Balaji Traders, Shivam Rice" />
      </div>
      <div>
        <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Mandi</label>
        <input type="text" value={addSupplierModal.mandi} onChange={e => setAddSupplierModal({...addSupplierModal, mandi: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" placeholder="E.g. Kurali Mandi" />
      </div>
      <div>
        <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Contact Details</label>
        <input type="tel" pattern="[0-9]{10}" maxLength={10} title="10 digit mobile number" value={addSupplierModal.contact} onChange={e => setAddSupplierModal({...addSupplierModal, contact: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" />
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)] mt-4">
        <button type="button" onClick={() => setAddSupplierModal({...addSupplierModal, isOpen: false})} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)]">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold hover:bg-[#cc7000] transition-colors">Add Arthiya</button>
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
 <input type="number" min="0" step="0.1" value={inspectModal.moisture} onChange={e => setInspectModal({...inspectModal, moisture: e.target.value as any})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" required />
 </div>
 <div>
 <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Broken (%)</label>
 <input type="number" min="0" step="0.1" value={inspectModal.broken} onChange={e => setInspectModal({...inspectModal, broken: e.target.value as any})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" required />
 </div>
 <div>
 <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Discoloration (%)</label>
 <input type="number" min="0" step="0.1" value={inspectModal.discoloration} onChange={e => setInspectModal({...inspectModal, discoloration: e.target.value as any})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" />
 </div>
 <div>
 <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Foreign Matter (%)</label>
 <input type="number" min="0" step="0.1" value={inspectModal.foreignMatter} onChange={e => setInspectModal({...inspectModal, foreignMatter: e.target.value as any})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" />
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
 <input type="number" min="0" value={settleHisabModal.payment} onChange={e => setSettleHisabModal({...settleHisabModal, payment: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="Enter payment amount" />
 </div>
 <div>
 <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Final Hisab Amount</label>
 <input type="number" min="0" value={settleHisabModal.finalHisabAmt} onChange={e => setSettleHisabModal({...settleHisabModal, finalHisabAmt: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="Enter final amount" />
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

  <StackSelectionModal 
    isOpen={isStackModalOpen} 
    onClose={() => setIsStackModalOpen(false)} 
    onSelect={(stack, bagType) => {
      setInwardFormData((prev: any) => ({ ...prev, stackNo: stack, bagType }));
      setIsStackModalOpen(false);
    }} 
    occupiedStacks={occupiedStacks}
    currentMoisture={parseFloat(inwardFormData.moisture) || 0}
  />
    </div>
  );
};

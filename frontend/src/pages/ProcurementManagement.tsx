import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Package, ShieldCheck, FileText, Search, Plus, Calendar, ChevronDown, Download, Printer, Settings, Upload, Edit, Layers, ScanBarcode, X, AlertTriangle, Trash, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import BoliCompletionTable from '../components/Procurement/BoliCompletionTable';
import api from '../api/axios';
import { CustomModal } from '../components/CustomModal';
import { usePlantStore } from '../store/plantStore';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useMandiStore } from '../store/mandiStore';
import { biometricService } from '../services/biometricService';
import StackSelectionModal from '../components/StackSelectionModal';
import Pagination from '../components/Pagination';
import { exportToExcel } from '../utils/exportUtils';

export const ProcurementManagement = () => {
 const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'supplier_master';
  const activePlant = usePlantStore(state => state.activePlant);
  const user = useAuthStore(state => state.user);
  const hasBackdatePermission = user?.role === 'SUPER_ADMIN' || (user?.backdatePermissionUntil && new Date(user.backdatePermissionUntil) > new Date());
  const hasManualWeighbridgePermission = user?.role === 'SUPER_ADMIN' || (user?.manualWeighbridgeUntil && new Date(user.manualWeighbridgeUntil) > new Date());
  const isSupervisor = user?.role === 'SUPERVISOR';
  const [category, setCategory] = useState<'OPERATIONAL' | 'NON_OPERATIONAL'>('OPERATIONAL');

  const { mandis, fetchMandis, createMandi, updateMandi, deleteMandi } = useMandiStore();



  const [plants, setPlants] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [labours, setLabours] = useState<any[]>([]);
  

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
 const [pahunchs, setPahunchs] = useState<any[]>([]);
 const [sodaPending, setSodaPending] = useState<any[]>([]);
 const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [inwardList, setInwardList] = useState<any[]>([]);
  const [inwardTotalItems, setInwardTotalItems] = useState(0);
  const [inwardCurrentPage, setInwardCurrentPage] = useState(1);

  const [viewInwardModal, setViewInwardModal] = useState<any>(null);
  const [listFilters, setListFilters] = useState({ dateFrom: '', dateTo: '', mandi: '', supplierId: '' });
  
  const [recentPurchasesTotalItems, setRecentPurchasesTotalItems] = useState(0);
  const [recentPurchasesCurrentPage, setRecentPurchasesCurrentPage] = useState(1);
  
  const [sodaPendingTotalItems, setSodaPendingTotalItems] = useState(0);
  const [sodaPendingCurrentPage, setSodaPendingCurrentPage] = useState(1);

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
    allocationType: '',
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
    bhariVideoUpload: 'Yes', khaliVideoUpload: 'Yes',
    
    // NEW FIELDS FROM FORM IMAGE
    previousTruckReading: '', newTruckReading: '', kmsDriven: '',
    partyName: '', paddyBoliRecord: 'Not applicable', mainUnloaderTruckCount: '',
    bagsInMainStack: '', secondPartStackNo: '', bagsInSecondPartStack: '',
    unloaderName: '', unloadingEndTime: '',
    cutToBeAddedInShortage: false, totalBagsReceived: '',
    bagsRecLessThanAgencyGp: false, plusWtConsiderInShortageRecovery: false,
    unloaderSignAndStamp: false, pahunchPersonSignAndStamp: false
  };

  const [inwardFormData, setInwardFormData] = useState<any>(defaultInwardFormData);
  
  // Auto-select first options for dynamic dropdowns if not already selected
  useEffect(() => {
    setInwardFormData((prev: any) => {
      let updated = false;
      const next = { ...prev };
      
      if (!next.truckNo && trucks.length > 0) {
        next.truckNo = trucks[0].truckNumber;
        updated = true;
      }
      if (!next.supplierId && suppliers.length > 0) {
        next.supplierId = suppliers[0].id;
        updated = true;
      }
      
      return updated ? next : prev;
    });
  }, [trucks, suppliers, staff, labours]);
  
  // Track Boli bags input from supervisor
  const [boliInputs, setBoliInputs] = useState<Record<string, string>>({});
  
  // Plant Procurement Settings
  const [plantSettings, setPlantSettings] = useState({
    govtRate: '',
    benchmarkMoisture: '',
    safaiCut: '',
    processingCut: ''
  });
  const [isEditingSettings, setIsEditingSettings] = useState<boolean>(false);

  useEffect(() => {
    if (activePlant) {
      setPlantSettings({
        govtRate: activePlant.govtRate?.toString() || '',
        benchmarkMoisture: activePlant.benchmarkMoisture?.toString() || '17',
        safaiCut: activePlant.safaiCut?.toString() || '2',
        processingCut: activePlant.processingCut?.toString() || '4',
      });
    }
  }, [activePlant]);

  const handleUpdateSettings = async () => {
    if (!activePlant) {
      useUiStore.getState().addToast('No active plant selected', 'error');
      return;
    }
    try {
      const payload = {
        govtRate: parseFloat(plantSettings.govtRate) || 0,
        benchmarkMoisture: parseFloat(plantSettings.benchmarkMoisture) || 17,
        safaiCut: parseFloat(plantSettings.safaiCut) || 2,
        processingCut: parseFloat(plantSettings.processingCut) || 4,
      };
      await api.put(`/api/plants/${activePlant.id}`, payload);
      setIsEditingSettings(false);
      const { setActivePlant } = usePlantStore.getState();
      setActivePlant({ ...activePlant, ...payload });
      useUiStore.getState().addToast('Plant Settings updated successfully', 'success');
    } catch (err) {
      console.error('Failed to update plant settings', err);
      useUiStore.getState().addToast('Failed to update Plant Settings', 'error');
    }
  };

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
    
    const qualityCutType = inwardFormData.qualityCutType || 'NONE';
    const qualityCutValue = parseFloat(inwardFormData.qualityCutValue) || 0;
    let qualityCutQtl = 0;
    if (qualityCutType === 'BAGS') {
      qualityCutQtl = qualityCutValue * 0.382;
    } else if (qualityCutType === 'PERCENTAGE') {
      qualityCutQtl = (actualWt * qualityCutValue) / 100;
    }
    
    const shortageQtl = (parseFloat(req) - actualWt + qualityCutQtl).toFixed(2);
    
    // Shortage Bags = Agency Bags - Bags Rec
    const agencyA = parseFloat(inwardFormData.origAClassAg) || 0;
    const agencyB = parseFloat(inwardFormData.origBClassAg) || 0;
    const totalAgencyBags = agencyA + agencyB;
    const totalRecBags = totalA + totalB;
    const shortageBags = totalAgencyBags > 0 ? (totalAgencyBags - totalRecBags).toString() : '0';

    setInwardFormData((prev: any) => ({ 
      ...prev, 
      reqNetWt: req,
      actualShortageQtl: parseFloat(shortageQtl),
      shortageQtl: parseFloat(shortageQtl) > 0 ? shortageQtl : '0.00',
      shortageBags: parseFloat(shortageBags) > 0 ? shortageBags : '0.00'
    }));
  }, [inwardFormData.origAClass, inwardFormData.origBClass, inwardFormData.shortageAClass, inwardFormData.shortageBClass, inwardFormData.netWtMill, inwardFormData.qualityCutType, inwardFormData.qualityCutValue, activePlant, plants]);
 const [dhanakLots, setDhanakLots] = useState([{ id: 1, sNo: '', bags: 0, moisture: 0, bardanaClass: '' }]);

  const [inwardErrors, setInwardErrors] = useState<Record<string, string>>({});

  const handleInwardChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setInwardFormData((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (inwardErrors[name]) {
      setInwardErrors((prev) => ({ ...prev, [name]: '' }));
    }
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
  const [addSupplierModal, setAddSupplierModal] = useState({ isOpen: false, name: '', firmNames: '', mandi: '', contact: '', plantId: '' });
  const [addMandiModal, setAddMandiModal] = useState({ isOpen: false, id: '', name: '', isActive: true });
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
      const payload = { 
        ...paddyPurchaseModal, 
        plantId: selectedPlantId,
        updatePlantGovtRate: user?.role === 'SUPER_ADMIN' 
      };
      
      if (paddyPurchaseModal.id) {
        await api.put(`/api/procurement/soda-pending/${paddyPurchaseModal.id}`, payload);
        useUiStore.getState().addToast('Purchase updated successfully', 'success');
      } else {
        await api.post('/api/procurement/soda-pending', payload);
        useUiStore.getState().addToast('Purchase created successfully', 'success');
      }
      setPaddyPurchaseModal({ ...paddyPurchaseModal, isOpen: false });
      await fetchSodaPending();
      await fetchRecentPurchases();
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
    }
    const fetchData = async () => {
      fetchRecentPurchases();
      fetchSuppliers();
      fetchSodaPending();
      fetchMandis();
      
      const fetchMasterData = async () => {
        try { const res = await api.get('/api/master-data/trucks'); setTrucks(res.data); } catch (e) { console.error('Failed to fetch trucks', e); }
        try { const res = await api.get('/api/master-data/drivers'); setDrivers(res.data); } catch (e) { console.error('Failed to fetch drivers', e); }
        try { const res = await api.get('/api/master-data/staff'); setStaff(res.data); } catch (e) { console.error('Failed to fetch staff', e); }
        try { const res = await api.get('/api/master-data/labour'); setLabours(res.data); } catch (e) { console.error('Failed to fetch labour', e); }
        try { const res = await api.get('/api/master-data/pahunch'); setPahunchs(res.data); } catch (e) { console.error('Failed to fetch pahunchs', e); }
      };
      
      fetchMasterData();
    };
    if (activeTab !== 'inward_register') {
      fetchData();
    }
  }, [activePlant?.id, activeTab, listFilters.dateFrom, listFilters.dateTo]);

  // Dedicated useEffect for lists to respect pagination
  useEffect(() => {
    if (activeTab === 'inward_register') {
      fetchInwardList();
    }
  }, [activePlant?.id, activeTab, listFilters, inwardCurrentPage]);

  useEffect(() => {
    if (activeTab === 'paddy_inward') {
      fetchRecentPurchases();
    }
  }, [activePlant?.id, activeTab, listFilters.dateFrom, listFilters.dateTo, recentPurchasesCurrentPage]);

  useEffect(() => {
    if (activeTab === 'soda_pending') {
      fetchSodaPending();
    }
  }, [activePlant?.id, activeTab, listFilters.dateFrom, listFilters.dateTo, sodaPendingCurrentPage]);

 
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
      params.append('page', inwardCurrentPage.toString());
      params.append('limit', '10');
      const res = await api.get(`/api/procurement/inwards/${pid}?${params.toString()}`);
      if (res.data && Array.isArray(res.data.data)) {
        setInwardList(res.data.data);
        setInwardTotalItems(res.data.total || 0);
      } else {
        setInwardList(res.data); // Fallback for transition
        setInwardTotalItems(res.data.length || 0);
      }
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
 params.append('page', recentPurchasesCurrentPage.toString());
 params.append('limit', '10');
 const res = await api.get(`/api/procurement/recent/${pid}?${params.toString()}`);
 if (res.data && Array.isArray(res.data.data)) {
   setRecentPurchases(res.data.data);
   setRecentPurchasesTotalItems(res.data.total || 0);
 } else {
   setRecentPurchases(res.data);
   setRecentPurchasesTotalItems(res.data.length || 0);
 }
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
 params.append('page', sodaPendingCurrentPage.toString());
 params.append('limit', '10');
 const res = await api.get(`/api/procurement/soda-pending/${pid}?${params.toString()}`);
 if (res.data && Array.isArray(res.data.data)) {
   setSodaPending(res.data.data);
   setSodaPendingTotalItems(res.data.total || 0);
 } else {
   setSodaPending(res.data);
   setSodaPendingTotalItems(res.data.length || 0);
 }
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
    const supplierPlantId = addSupplierModal.plantId || activePlant?.id || 'global';
    await api.post('/api/procurement/suppliers', { name: addSupplierModal.name, contact: addSupplierModal.contact, firmNames: addSupplierModal.firmNames.split(',').map(s=>s.trim()).filter(Boolean), mandi: addSupplierModal.mandi, plantId: supplierPlantId });
    setAddSupplierModal({ isOpen: false, name: '', firmNames: '', mandi: '', contact: '', plantId: '' });
    fetchSuppliers();
    } catch (error) {
   console.error('Failed to add supplier', error);
   }
   };
  
    const handleToggleMandiStatus = async (m: any) => {
      try {
        await updateMandi(m.id, { name: m.name, isActive: !m.isActive });
        useUiStore.getState().addToast(`Mandi ${m.name} marked as ${!m.isActive ? 'Active' : 'Inactive'}`, 'success');
        fetchMandis();
      } catch (error) {
        console.error('Failed to toggle status', error);
      }
    };

    const handleDeleteMandi = async (id: string) => {
      if (window.confirm("Are you sure you want to delete this Mandi?")) {
        try {
          await deleteMandi(id);
          useUiStore.getState().addToast('Mandi deleted successfully', 'success');
          fetchMandis();
        } catch (error) {
          console.error('Failed to delete mandi', error);
        }
      }
    };
  
   const handleAddMandi = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!addMandiModal.name) return;
     try {
       if (addMandiModal.id) {
         await updateMandi(addMandiModal.id, { name: addMandiModal.name, isActive: addMandiModal.isActive });
         useUiStore.getState().addToast('Mandi updated successfully', 'success');
       } else {
         await createMandi({ name: addMandiModal.name, isActive: addMandiModal.isActive });
         useUiStore.getState().addToast('Mandi added successfully', 'success');
       }
       setAddMandiModal({ isOpen: false, id: '', name: '', isActive: true });
       fetchMandis();
     } catch (error) {
       console.error('Failed to save mandi', error);
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
  const handleInwardSubmit = async (status: string = 'CONFIRMED') => {
    // Validate mandatory fields
    const requiredFields = [
      'gpNo', 'date', 'timeIn', 'timeOut', 'truckNo',
      'previousTruckReading', 'newTruckReading', 'kmsDriven', 'supplierId',
      'mandiParchiNo', 'mandiEgpNo', 'rstNo', 'pahunchPersonName', 'moisture',
      'safai', 'mandiIntimation', 'remarks', 'bhariVideoUpload', 'khaliVideoUpload', 
      'paddyBoliRecord', 'allocationType', 'hoodiUpload',
      'allocateUnloader', 'pahunchPerson', 'stackNo', 'mainUnloaderTruckCount',
      'bagsInMainStack', 'secondPartStackNo', 'bagsInSecondPartStack',
      'unloaderName', 'unloadingEndTime', 'labour', 'startPin',
      'unloadingStartTime', 'finishPin', 'unloadingFinishTime',
      'origAClass', 'origBClass', 'shortageAClass', 'shortageBClass',
      'origAClassAg', 'origBClassAg', 'netWtMill', 'netWtDiff', 'netWtParty',
      'discrepancy', 'driverSign', 'unloaderSign', 'pahunchPersonSign'
    ];
    
    let hasError = false;
    const newErrors: Record<string, string> = {};
    
    requiredFields.forEach(field => {
      // Exclude specific fields based on conditions if necessary, but here we assume all strictly required
      if (!inwardFormData[field] && inwardFormData[field] !== 0) {
        newErrors[field] = 'This field is mandatory';
        hasError = true;
      }
    });

    if (hasError) {
      setInwardErrors(newErrors);
      useUiStore.getState().addToast('Please fill all the mandatory fields', 'error');
      return;
    }

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
        plantId: selectedPlantId,
        status: status
      };

      await api.post('/api/procurement/save-purchase', payload);
      useUiStore.getState().addToast(`Paddy Inward Saved as ${status}`, 'success');
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

  const filteredSodaPending = sodaPending.filter(p => {
    let matches = true;
    if (listFilters.supplierId) matches = matches && p.supplierId === listFilters.supplierId;
    if (listFilters.mandi) matches = matches && p.partyMandi?.toLowerCase().includes(listFilters.mandi.toLowerCase());
    return matches;
  });

  const dailyStats = React.useMemo(() => {
    const stats: Record<string, { maxRate: number, minRate: number, totalBags: number, purchases: number, govtRate: number, overPricedValue: number }> = {};
    
    filteredSodaPending.forEach((p: any) => {
      const d = new Date(p.date).toLocaleDateString();
      const govtRate = parseFloat(p.govtRate) || (activePlant?.govtRate) || 0;
      if (!stats[d]) {
        stats[d] = { maxRate: 0, minRate: Infinity, totalBags: 0, purchases: 0, govtRate, overPricedValue: 0 };
      }
      
      const processRate = (rate: number, bags: number, moisture: number) => {
        if (rate > 0) {
          if (rate > stats[d].maxRate) stats[d].maxRate = rate;
          if (rate < stats[d].minRate) stats[d].minRate = rate;
          if (stats[d].govtRate > 0) {
             const bMoisture = activePlant?.benchmarkMoisture || 17;
             const safaiCut = activePlant?.safaiCut || 2;
             const procCut = activePlant?.processingCut || 4;
             const mCut = moisture > bMoisture ? (moisture - bMoisture) : 0;
             const totalCut = mCut + safaiCut + procCut;
             const requiredRate = stats[d].govtRate - (stats[d].govtRate * (totalCut / 100));
             
             if (rate > requiredRate) {
                stats[d].overPricedValue += (rate - requiredRate) * bags;
             }
          }
        }
      };

      if (p.bolis && p.bolis.length > 0) {
        p.bolis.forEach((b: any) => {
           processRate(parseFloat(b.rate) || 0, parseFloat(b.bags) || 0, parseFloat(b.moisture || p.mc) || 0);
           stats[d].totalBags += parseFloat(b.bags) || 0;
        });
        stats[d].purchases += p.bolis.length;
      } else {
        processRate(parseFloat(p.rate) || 0, parseFloat(p.bags) || 0, parseFloat(p.mc) || 0);
        stats[d].totalBags += parseFloat(p.bags) || 0;
        stats[d].purchases += 1;
      }
    });
    
    Object.keys(stats).forEach(k => {
       if (stats[k].minRate === Infinity) stats[k].minRate = 0;
    });
    return Object.entries(stats).map(([date, data]) => ({ date, ...data }));
  }, [filteredSodaPending, activePlant]);

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
   
   {/* TAB: MANDI MASTER */}
   {activeTab === 'mandi_master' && (
   <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col h-full overflow-hidden">
     <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-main)]">
            <Users className="text-[#e67e00]" /> Mandi Master
          </h2>
          <button onClick={() => setAddMandiModal({ isOpen: true, id: '', name: '', isActive: true })} className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-orange-500/20">
            + Add Mandi
          </button>
        </div>
     </div>
     <div className="flex-1 overflow-auto bg-[var(--bg-base)] p-6">
       <table className="w-full border-collapse text-[var(--text-muted)] text-sm">
         <thead>
           <tr className="border-b border-[var(--border-subtle)] uppercase text-[var(--text-muted-alt)] text-left">
             <th className="p-3">Name</th>
             <th className="p-3">Status</th>
             <th className="p-3">Actions</th>
           </tr>
         </thead>
         <tbody>
           {mandis.map((m: any) => (
             <tr key={m.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-panel)]">
               <td className="p-3 font-medium text-[var(--text-main)]">{m.name}</td>
                <td className="p-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={m.isActive} onChange={() => handleToggleMandiStatus(m)} />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => setAddMandiModal({ isOpen: true, id: m.id, name: m.name, isActive: m.isActive })} className="text-amber-500 hover:text-amber-400 p-1 bg-amber-500/10 rounded">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDeleteMandi(m.id)} className="text-red-500 hover:text-red-400 p-1 bg-red-500/10 rounded">
                    <Trash size={14} />
                  </button>
               </td>
             </tr>
           ))}
         </tbody>
       </table>
     </div>
   </div>
   )}

   {/* TAB 1: SUPPLIER MASTER */}
 {activeTab === 'supplier_master' && (
 <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col h-full overflow-hidden">
 <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-main)]">
          <Users className="text-[#e67e00]" /> Arthiya Master
        </h2>
        <button onClick={() => setAddSupplierModal({ isOpen: true, name: '', firmNames: '', mandi: '', contact: '', plantId: '' })} className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-orange-500/20">
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
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
            <Package className="text-[#e67e00]" /> Paddy Purchase
          </h2>
          <button 
            onClick={async () => {
                try {
                  const params = new URLSearchParams();
                  if (listFilters.dateFrom) params.append('dateFrom', listFilters.dateFrom);
                  if (listFilters.dateTo) params.append('dateTo', listFilters.dateTo);
                  if (listFilters.mandi) params.append('mandi', listFilters.mandi);
                  if (listFilters.supplierId) params.append('supplierId', listFilters.supplierId);
                  params.append('limit', '1000000');
                  params.append('page', '1');
                  const pid = activePlant?.id || 'global';
                  
                  const res = await api.get(`/api/procurement/soda-pending/${pid}?${params.toString()}`);
                  const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                  
                  const exportData = data.map((item: any) => ({
                    "Party": item.partyMandi,
                    "Date": item.date,
                    "Bags": item.bags,
                    "Rate": item.rate,
                    "Diff": item.diff,
                    "Payment": item.payment,
                    "Note": item.note,
                    "Final Amount": item.finalHisabAmt
                  }));
                  exportToExcel(exportData, `Paddy_Purchase_Full`);
                } catch(error) {
                  console.error('Failed to export all records', error);
                }
            }}
            className="flex items-center gap-2 bg-[#107c41] text-white px-3 py-1.5 rounded hover:bg-[#1f8c51] transition-colors text-sm font-medium"
          >
            <Download size={16} /> Export All to Excel
          </button>
        </div>
        {user?.role !== 'SUPER_ADMIN' && (
          <button 
            onClick={() => setPaddyPurchaseModal({
              isOpen: true, id: '', plantId: activePlant?.id || '', supplierId: '', riceCategory: 'ANY',
              date: new Date().toISOString().split('T')[0], 
              bolis: [{ moisture: '', bags: '', rate: '' }],
              govtRate: activePlant?.govtRate?.toString() || '', diff: '', payment: '', note: '', finalHisabAmt: ''
            })}
            className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-orange-500/20"
          >
            + New purchase
          </button>
        )}
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
              <select value={listFilters.mandi} onChange={e => setListFilters(f => ({...f, mandi: e.target.value}))} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm">
                <option value="">Select Mandi</option>
                {mandis.filter((m: any) => m.isActive).map((m: any) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
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
          
          {/* Daily Stats Dashboard */}
          {dailyStats.length > 0 && (
            <div className="flex gap-4 overflow-x-auto pb-4 mb-4 hide-scrollbar">
              {dailyStats.map((stat, idx) => (
                <div key={idx} className="min-w-[200px] bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-xl p-3 shadow flex flex-col gap-1">
                  <div className="text-xs font-bold text-[var(--text-muted-alt)]">{stat.date}</div>
                  <div className="flex justify-between items-end mt-1">
                    <span className="text-[10px] text-[var(--text-muted)]">Highest</span>
                    <span className="text-sm font-bold text-red-400">₹{stat.maxRate}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-[var(--text-muted)]">Lowest</span>
                    <span className="text-sm font-bold text-green-400">₹{stat.minRate}</span>
                  </div>
                  <div className="flex justify-between items-end mt-1 border-t border-[var(--border-subtle)] pt-1">
                    <span className="text-[10px] text-[var(--text-muted)]">Overpriced Diff</span>
                    <span className="text-sm font-bold text-[#e67e00]">₹{stat.overPricedValue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <table className="w-full border-collapse text-[var(--text-muted)] text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] uppercase text-[var(--text-muted-alt)] text-left bg-[var(--glass-bg)]">
              <th className="p-3">Party - Supplier</th>
              <th className="p-3">Date</th>
              <th className="p-3">Mc</th>
              <th className="p-3">Estimated Bags</th>
              <th className="p-3">Final Bags</th>
              <th className="p-3">Rate</th>
              <th className="p-3">Diff</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Note</th>
              <th className="p-3">Final Hisab Amt</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSodaPending.map((p, i) => {
              // Calculate Overpriced Flag
              const govtRate = parseFloat(p.govtRate) || activePlant?.govtRate || 0;
              const bMoisture = activePlant?.benchmarkMoisture || 17;
              const safaiCut = activePlant?.safaiCut || 2;
              const procCut = activePlant?.processingCut || 4;
              
              const mVal = parseFloat(p.mc) || 0;
              const mCut = mVal > bMoisture ? (mVal - bMoisture) : 0;
              const totalCut = mCut + safaiCut + procCut;
              const requiredRate = govtRate > 0 ? (govtRate - (govtRate * (totalCut / 100))) : 0;
              const actRate = parseFloat(p.rate) || 0;
              const isOverpriced = govtRate > 0 && actRate > requiredRate;
              
              // Calculate Final Bags if bolis exist
              const totalFinalBags = p.bolis?.reduce((acc: number, b: any) => acc + (parseFloat(b.bags) || 0), 0) || 0;

              return (
              <tr key={p.id} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)]">
                  <td className="p-3 font-medium text-[var(--text-main)]">{p.partyMandi}</td>
                  <td className="p-3">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="p-3">
                    {p.bolis?.length ? <button onClick={() => setViewBolisModal({isOpen: true, soda: p, partyMandi: p.partyMandi, date: p.date})} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/30">View {p.bolis.length} Bolis</button> : p.mc || '-'}
                  </td>
                  <td className="p-3 font-bold text-[var(--text-muted)]">{p.bolis?.length ? '-' : p.bags || '-'}</td>
                  <td className="p-3 font-bold text-[var(--text-main)]">{p.bolis?.length ? totalFinalBags : '-'}</td>
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#e67e00]">{p.bolis?.length ? '-' : p.rate || '-'}</span>
                      {!p.bolis?.length && govtRate > 0 && actRate > 0 && (
                        isOverpriced 
                          ? <span className="text-[10px] text-red-500 font-bold bg-red-500/10 px-1 py-0.5 rounded mt-0.5 inline-block w-max">OVERPRICED (Req: ₹{requiredRate.toFixed(2)})</span> 
                          : <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-1 py-0.5 rounded mt-0.5 inline-block w-max">GOOD BUY</span>
                      )}
                    </div>
                  </td>
                <td className="p-3">
                  {parseFloat(p.diff) > 0 ? (
                    <span className="text-red-500 font-bold">₹{p.diff} (Pending)</span>
                  ) : parseFloat(p.diff) < 0 ? (
                    <span className="text-green-500 font-bold">₹{Math.abs(parseFloat(p.diff))} (Advance)</span>
                  ) : (
                    <span className="text-[var(--text-muted)]">₹0</span>
                  )}
                </td>
                <td className="p-3 text-[var(--text-main)] font-bold">{p.payment || '0'}</td>
                <td className="p-3">{p.note || '-'}</td>
                <td className="p-3">
                  {parseFloat(p.finalHisabAmt) > 0 ? (
                    <span className="text-red-500 font-bold flex items-center gap-1"><ArrowUpRight size={14}/> ₹{p.finalHisabAmt}</span>
                  ) : parseFloat(p.finalHisabAmt) < 0 ? (
                    <span className="text-green-500 font-bold flex items-center gap-1"><ArrowDownRight size={14}/> ₹{Math.abs(parseFloat(p.finalHisabAmt))}</span>
                  ) : (
                    <span className="text-[var(--text-main)] font-bold">₹{p.finalHisabAmt || '0'}</span>
                  )}
                </td>
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
              );
            })}
            {filteredSodaPending.length === 0 && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-[var(--text-muted-alt)]">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
            currentPage={sodaPendingCurrentPage}
            totalItems={sodaPendingTotalItems}
            onPageChange={setSodaPendingCurrentPage}
          />
      </div>
    </div>
  )}

  {/* View Bolis Modal */}
  {viewBolisModal.isOpen && viewBolisModal.soda && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-panel)] rounded-xl w-full max-w-4xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-main)]">Bolis Breakdown & Completion</h3>
            <p className="text-xs text-[var(--text-muted-alt)] mt-1">{viewBolisModal.partyMandi} - {new Date(viewBolisModal.date).toLocaleDateString()}</p>
          </div>
          <button onClick={() => setViewBolisModal({isOpen: false, soda: null})} className="text-[var(--text-muted)] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-auto max-h-[70vh]">
          <BoliCompletionTable
            sodaPending={[viewBolisModal.soda]}
            supplierId={viewBolisModal.soda.supplierId}
            boliInputs={boliInputs}
            setBoliInputs={setBoliInputs}
            onSodaComplete={fetchSodaPending}
          />
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
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">GP No. <span className="text-red-500">*</span></label>
 <input type="text" name="gpNo" value={inwardFormData.gpNo} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="1-1000/Sept/25" />
 {inwardErrors.gpNo && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.gpNo}</span>}
 </div>
 <div>
  <label className="block text-[var(--text-muted-alt)] text-[11px] mb-1 truncate">Date <span className="text-red-500">*</span></label>
  <input type="date" name="date" value={inwardFormData.date} onChange={handleInwardChange} disabled={!hasBackdatePermission} className={`w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none ${hasBackdatePermission ? 'focus:border-[#e67e00]' : 'opacity-70 cursor-not-allowed'}`} />
  {inwardErrors.date && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.date}</span>}
  </div>
  <div>
  <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Time In <span className="text-red-500">*</span></label>
  <input type="time" name="timeIn" value={inwardFormData.timeIn} onChange={handleInwardChange} disabled={!hasBackdatePermission} className={`w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none ${hasBackdatePermission ? 'focus:border-[#e67e00]' : 'opacity-70 cursor-not-allowed'}`} />
  {inwardErrors.timeIn && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.timeIn}</span>}
  </div>
  <div>
  <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Time Out <span className="text-red-500">*</span></label>
  <input type="time" name="timeOut" value={inwardFormData.timeOut} onChange={handleInwardChange} disabled={!hasBackdatePermission} className={`w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none ${hasBackdatePermission ? 'focus:border-[#e67e00]' : 'opacity-70 cursor-not-allowed'}`} />
  {inwardErrors.timeOut && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.timeOut}</span>}
  </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Truck No. <span className="text-red-500">*</span></label>
 <select name="truckNo" value={inwardFormData.truckNo} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]">
   <option value="">Select Truck</option>
   {trucks.map(t => <option key={t.id} value={t.truckNumber}>{t.truckNumber}</option>)}
 </select>
 {inwardErrors.truckNo && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.truckNo}</span>}
 </div>
  <div>
  <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Previous Truck Reading <span className="text-red-500">*</span></label>
  <input type="number" name="previousTruckReading" value={inwardFormData.previousTruckReading} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="0" />
  {inwardErrors.previousTruckReading && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.previousTruckReading}</span>}
  </div>
  <div>
  <label className="block text-[var(--text-muted-alt)] text-xs mb-1">New Truck Reading <span className="text-red-500">*</span></label>
  <input type="number" name="newTruckReading" value={inwardFormData.newTruckReading} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="0" />
  {inwardErrors.newTruckReading && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.newTruckReading}</span>}
  </div>
  <div>
  <label className="block text-[var(--text-muted-alt)] text-xs mb-1 flex items-center justify-between">
    <span>Kms Driven <span className="text-red-500">*</span></span>
    <label className="flex items-center gap-1 text-[10px] text-red-400 cursor-pointer" title="Notify admin that meter is not working">
      <input type="checkbox" name="meterNotWorking" checked={inwardFormData.meterNotWorking || false} onChange={(e) => {
        if(e.target.checked) {
           setInwardFormData((p: any) => ({...p, meterNotWorking: true}));
        } else {
           setInwardFormData((p: any) => ({...p, meterNotWorking: false}));
        }
      }} className="accent-red-500" />
      Meter Not Working
    </label>
  </label>
  <input type="number" name="kmsDriven" value={inwardFormData.kmsDriven} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="0" />
  {inwardErrors.kmsDriven && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.kmsDriven}</span>}
  </div>
  <div>
  <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Party / Supplier Name <span className="text-red-500">*</span></label>
  <input 
    list="supplier-options"
    name="supplierId"
    value={suppliers.find(s => s.id === inwardFormData.supplierId)?.name || inwardFormData.supplierId || ''}
    onChange={(e) => {
      const val = e.target.value;
      const matched = suppliers.find(s => s.name === val);
      handleInwardChange({ target: { name: 'supplierId', value: matched ? matched.id : val } });
    }}
    className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
    placeholder="Type to search supplier..."
  />
  <datalist id="supplier-options">
    {suppliers.map(s => <option key={s.id} value={s.name}>{s.mandi || 'No Mandi'}</option>)}
  </datalist>
  {inwardErrors.supplierId && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.supplierId}</span>}
  </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Mandi Parchi No. <span className="text-red-500">*</span></label>
 <input type="text" name="mandiParchiNo" value={inwardFormData.mandiParchiNo} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="PRC-12345" />
 {inwardErrors.mandiParchiNo && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.mandiParchiNo}</span>}
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Mandi e-GP / Bill No. <span className="text-red-500">*</span></label>
 <input type="text" name="mandiEgpNo" value={inwardFormData.mandiEgpNo} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="EGP-458796" />
 {inwardErrors.mandiEgpNo && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.mandiEgpNo}</span>}
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">RST No. <span className="text-red-500">*</span></label>
 <input type="text" name="rstNo" value={inwardFormData.rstNo} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="RST-7485963" />
 {inwardErrors.rstNo && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.rstNo}</span>}
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1 flex items-center gap-2">Pahunch Person / Staff <span className="text-red-500">*</span></label>
 <select name="pahunchPersonName" value={inwardFormData.pahunchPersonName} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none">
   <option value="">Select Staff</option>
   {pahunchs.map(s => <option key={s.id} value={s.name}>{s.name} {s.contact ? `(${s.contact})` : ''}</option>)}
 </select>
 {inwardErrors.pahunchPersonName && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.pahunchPersonName}</span>}
 </div>
 </div>
 </div>

 {/* 2. Quality Details */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">2. Quality Details</div>
 <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Moisture (%) <span className="text-red-500">*</span></label>
 <input type="number" min="0" name="moisture" value={inwardFormData.moisture} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"  max="100" step="0.01" />
 {inwardErrors.moisture && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.moisture}</span>}
 </div>
 <div>
   <div className="col-span-1 sm:col-span-1">
   <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Safai <span className="text-red-500">*</span></label>
   <div className="flex items-center gap-4 mt-2">
     <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="safai" value="Good" checked={inwardFormData.safai === 'Good'} onChange={handleInwardChange} className="accent-blue-500" /> Good</label>
     <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="safai" value="Patal" checked={inwardFormData.safai === 'Patal'} onChange={handleInwardChange} className="accent-blue-500" /> Patal</label>
   </div>
   {inwardErrors.safai && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.safai}</span>}
   </div>
 </div>
 <div className="col-span-1 sm:col-span-2">
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">If Not As Per Standards (Mandi Intimation given or not) <span className="text-red-500">*</span></label>
 <div className="flex flex-col gap-2 mt-2">
 <div className="flex flex-wrap items-center gap-4">
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="mandiIntimation" value="N.A." checked={inwardFormData.mandiIntimation === 'N.A.'} onChange={handleInwardChange} className="accent-blue-500" /> N.A.</label>
 <label className="flex items-center gap-1 text-red-400 font-medium text-xs"><input type="radio" name="mandiIntimation" value="Yes" checked={inwardFormData.mandiIntimation === 'Yes'} onChange={handleInwardChange} className="accent-red-500" /> Incoming quality/standard is not as per requirement</label>
 </div>
 {inwardErrors.mandiIntimation && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.mandiIntimation}</span>}
 </div>
 </div>
 <div className="col-span-1 sm:col-span-2">
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Remarks <span className="text-red-500">*</span></label>
 <textarea name="remarks" value={inwardFormData.remarks} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" rows={2}></textarea>
 {inwardErrors.remarks && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.remarks}</span>}
 </div>
 </div>
 </div>

 {/* 3. Vehicle Verification */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">3. Vehicle Verification</div>
 <div className="p-4 grid grid-cols-2 gap-4 text-sm">
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Bhari (Loaded) Video Upload <span className="text-red-500">*</span></label>
 <div className="flex items-center gap-4 py-2">
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="checkbox" name="bhariVideoUpload" checked={inwardFormData.bhariVideoUpload === 'Yes'} onChange={(e) => handleInwardChange({ target: { name: 'bhariVideoUpload', value: e.target.checked ? 'Yes' : '' } } as any)} className="accent-blue-500" /> Yes Done</label>
 </div>
 {inwardErrors.bhariVideoUpload && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.bhariVideoUpload}</span>}
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Khali (Empty) Video Upload <span className="text-red-500">*</span></label>
 <div className="flex items-center gap-4 py-2">
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="checkbox" name="khaliVideoUpload" checked={inwardFormData.khaliVideoUpload === 'Yes'} onChange={(e) => handleInwardChange({ target: { name: 'khaliVideoUpload', value: e.target.checked ? 'Yes' : '' } } as any)} className="accent-blue-500" /> Yes Done</label>
 </div>
 {inwardErrors.khaliVideoUpload && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.khaliVideoUpload}</span>}
 </div>
 </div>
  <div>
  <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Paddy Boli Record <span className="text-red-500">*</span></label>
  <select name="paddyBoliRecord" value={inwardFormData.paddyBoliRecord} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]">
  <option value="Done">Done</option>
  <option value="Not applicable">Not applicable</option>
  </select>
  {inwardErrors.paddyBoliRecord && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.paddyBoliRecord}</span>}
  </div>
 </div>

 {/* 4. Unloading Management */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">4. Unloading Management</div>
 <div className="p-4 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4 text-sm">
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Allocation Type <span className="text-red-500">*</span></label>
 <div className="flex items-center gap-2">
   <select name="allocationType" value={inwardFormData.allocationType} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]">
   <option value="" disabled>Select Allocation Type</option>
   <option value="Hoodi">Hoodi</option>
   <option value="Stacking">Stacking</option>
   </select>
   {inwardFormData.allocationType === 'Hoodi' && (
     <label className="flex items-center gap-1 text-[10px] text-gray-500 font-medium whitespace-nowrap whitespace-nowrap cursor-pointer">
       <input type="checkbox" name="informBauji" checked={inwardFormData.informBauji || false} onChange={e => setInwardFormData((prev: any) => ({ ...prev, informBauji: e.target.checked }))} className="accent-[#e67e00]" />
       Inform Bauji
     </label>
   )}
 </div>
 {inwardErrors.allocationType && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.allocationType}</span>}
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Upload @ Hoodi Reg. <span className="text-red-500">*</span></label>
 <div className="flex items-center gap-4 mt-2">
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="hoodiUpload" value="N.A." checked={inwardFormData.hoodiUpload === 'N.A.'} onChange={handleInwardChange} className="accent-blue-500" /> N.A.</label>
 <label className="flex items-center gap-1 text-[var(--text-main)]"><input type="radio" name="hoodiUpload" value="Yes" checked={inwardFormData.hoodiUpload === 'Yes'} onChange={handleInwardChange} className="accent-blue-500" /> Yes</label>
 </div>
 {inwardErrors.hoodiUpload && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.hoodiUpload}</span>}
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Allocate Unloader <span className="text-red-500">*</span></label>
 <select name="allocateUnloader" value={inwardFormData.allocateUnloader} onChange={e => {
   handleInwardChange(e);
   if (e.target.value) {
     setInwardFormData((prev: any) => ({...prev, unloaderTruckCount: Math.floor(Math.random() * 5) + 1}));
   }
 }} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]">
   <option value="">Select Unloader</option>
   {labours.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
 </select>
 {inwardErrors.allocateUnloader && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.allocateUnloader}</span>}
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Pahunch Person Name <span className="text-red-500">*</span></label>
<select name="pahunchPerson" value={inwardFormData.pahunchPerson || ''} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]">
  <option value="">Select Pahunch Person</option>
  {pahunchs.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
</select>
 {inwardErrors.pahunchPerson && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.pahunchPerson}</span>}
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1 flex items-center justify-between"><span>Stack No. <span className="text-red-500">*</span></span> <ScanBarcode size={14} className="text-[#e67e00]" /></label>
 <div className="flex gap-2">
 <div className="relative flex-1">
 <input type="text" name="stackNo" value={inwardFormData.stackNo} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 pl-8 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="Scan stack barcode..." />
 <ScanBarcode size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
 </div>
 <button type="button" onClick={openStackModal} className="px-3 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-[var(--text-main)] hover:bg-[var(--glass-bg)]" title="Select Manually">
 <Layers size={16} />
 </button>
 </div>
 {inwardErrors.stackNo && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.stackNo}</span>}
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Truck Unload Count (Today)</label>
 <input type="number" readOnly value={inwardFormData.unloaderTruckCount} className="w-full bg-blue-900/10 border border-blue-500/30 rounded px-3 py-2 text-blue-400 font-bold outline-none" />
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Bags in Main Stack <span className="text-red-500">*</span></label>
 <input type="number" name="bagsInMainStack" value={inwardFormData.bagsInMainStack} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="0" />
 {inwardErrors.bagsInMainStack && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.bagsInMainStack}</span>}
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Second part Stack no. <span className="text-red-500">*</span></label>
 <input type="text" name="secondPartStackNo" value={inwardFormData.secondPartStackNo} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="Stack No." />
 {inwardErrors.secondPartStackNo && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.secondPartStackNo}</span>}
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Bags in second part stack <span className="text-red-500">*</span></label>
 <input type="number" name="bagsInSecondPartStack" value={inwardFormData.bagsInSecondPartStack} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="0" />
 {inwardErrors.bagsInSecondPartStack && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.bagsInSecondPartStack}</span>}
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Unloader Name <span className="text-red-500">*</span></label>
 <input type="text" name="unloaderName" value={inwardFormData.unloaderName} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" placeholder="Name" />
 {inwardErrors.unloaderName && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.unloaderName}</span>}
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Unloading Finish Time <span className="text-red-500">*</span></label>
 <input type="time" name="unloadingEndTime" value={inwardFormData.unloadingEndTime} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]" />
 {inwardErrors.unloadingEndTime && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.unloadingEndTime}</span>}
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Labour Name <span className="text-red-500">*</span></label>
 <select name="labour" value={inwardFormData.labour} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]">
 <option value="">Select Labour Contractor</option>
 {labours.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
 </select>
 {inwardErrors.labour && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.labour}</span>}
 </div>
 <div>
  <div className="col-span-1 sm:col-span-2 bg-[#e67e00]/10 p-3 rounded-lg border border-[#e67e00]/30 grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-3">
      <div className="font-bold text-[#e67e00] text-xs">UNLOADING START VERIFICATION</div>
      <label className="flex items-center gap-2 text-sm text-[var(--text-main)]">
        <input type="checkbox" checked={inwardFormData.loadedVideoVerified} onChange={e => setInwardFormData((prev: any) => ({...prev, loadedVideoVerified: e.target.checked}))} className="accent-[#e67e00] w-4 h-4" />
        Loaded Truck Video Captured & Verified
      </label>
      <div>
       <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Supervisor PIN <span className="text-red-500">*</span></label>
       <input type="password" name="startPin" placeholder="Supervisor PIN (1234)" value={inwardFormData.startPin} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-sm outline-none" />
       {inwardErrors.startPin && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.startPin}</span>}
       </div>
       <div>
       <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Starts Time <span className="text-red-500">*</span></label>
       <div className="flex gap-2">
       <input type="time" name="unloadingStartTime" value={inwardFormData.unloadingStartTime} onChange={handleInwardChange} disabled={!hasBackdatePermission} className={`flex-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] outline-none ${hasBackdatePermission ? 'focus:border-[#e67e00]' : 'opacity-70 cursor-not-allowed'}`} />
       {!hasBackdatePermission && (
         <button type="button" disabled={!inwardFormData.loadedVideoVerified || inwardFormData.startPin !== '1234'} onClick={() => { setInwardFormData((prev: any) => ({...prev, unloadingStartTime: new Date().toTimeString().slice(0,5)})); setInwardErrors((prev: any) => ({...prev, unloadingStartTime: ''})) }} className="bg-[#e67e00] hover:bg-[#cc7000] disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 rounded text-xs font-bold transition-colors">NOW</button>
       )}
       </div>
       {inwardErrors.unloadingStartTime && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.unloadingStartTime}</span>}
       </div>
    </div>
    
    <div className="space-y-3">
      <div className="font-bold text-[#e67e00] text-xs">UNLOADING FINISH VERIFICATION</div>
      <label className="flex items-center gap-2 text-sm text-[var(--text-main)]">
        <input type="checkbox" checked={inwardFormData.emptyVideoVerified} onChange={e => setInwardFormData((prev: any) => ({...prev, emptyVideoVerified: e.target.checked}))} className="accent-[#e67e00] w-4 h-4" />
        Empty Truck Video Captured & Verified
      </label>
      <div>
       <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Supervisor PIN <span className="text-red-500">*</span></label>
       <input type="password" name="finishPin" placeholder="Supervisor PIN (1234)" value={inwardFormData.finishPin} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-sm outline-none" />
       {inwardErrors.finishPin && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.finishPin}</span>}
       </div>
       <div>
       <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Finish Time <span className="text-red-500">*</span></label>
       <div className="flex gap-2">
       <input type="time" name="unloadingFinishTime" value={inwardFormData.unloadingFinishTime} onChange={handleInwardChange} disabled={!hasBackdatePermission} className={`flex-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] outline-none ${hasBackdatePermission ? 'focus:border-[#e67e00]' : 'opacity-70 cursor-not-allowed'}`} />
       {!hasBackdatePermission && (
         <button type="button" disabled={!inwardFormData.emptyVideoVerified || inwardFormData.finishPin !== '1234'} onClick={() => { setInwardFormData((prev: any) => ({...prev, unloadingFinishTime: new Date().toTimeString().slice(0,5)})); setInwardErrors((prev: any) => ({...prev, unloadingFinishTime: ''})) }} className="bg-[#e67e00] hover:bg-[#cc7000] disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 rounded text-xs font-bold transition-colors">NOW</button>
       )}
       </div>
       {inwardErrors.unloadingFinishTime && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.unloadingFinishTime}</span>}
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
        <BoliCompletionTable 
          sodaPending={sodaPending} 
          supplierId={inwardFormData.supplierId} 
          boliInputs={boliInputs} 
          setBoliInputs={setBoliInputs} 
          onSodaComplete={fetchSodaPending}
        />
       </div>
       
       <div className="bg-[var(--bg-base)] rounded border border-[var(--border-subtle)] p-3">
         <h4 className="text-xs font-bold text-[var(--text-muted-alt)] mb-2 uppercase">Quality Cut</h4>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-5">
              <label className="block text-[var(--text-muted-alt)] text-[10px] mb-1">Cut Type</label>
              <div className="flex flex-wrap items-center gap-3 py-1">
                <label className="flex items-center gap-1 text-[var(--text-main)] text-sm cursor-pointer whitespace-nowrap">
                  <input type="radio" name="qualityCutType" value="NONE" checked={inwardFormData.qualityCutType === 'NONE' || !inwardFormData.qualityCutType} onChange={handleInwardChange} className="accent-[#e67e00]" />
                  None
                </label>
                <label className="flex items-center gap-1 text-[var(--text-main)] text-sm cursor-pointer whitespace-nowrap">
                  <input type="radio" name="qualityCutType" value="BAGS" checked={inwardFormData.qualityCutType === 'BAGS'} onChange={handleInwardChange} className="accent-[#e67e00]" />
                  Bags
                </label>
                <label className="flex items-center gap-1 text-[var(--text-main)] text-sm cursor-pointer whitespace-nowrap">
                  <input type="radio" name="qualityCutType" value="PERCENTAGE" checked={inwardFormData.qualityCutType === 'PERCENTAGE'} onChange={handleInwardChange} className="accent-[#e67e00]" />
                  %age
                </label>
              </div>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[var(--text-muted-alt)] text-[10px] mb-1">
                Value {inwardFormData.qualityCutType === 'PERCENTAGE' ? '(%)' : inwardFormData.qualityCutType === 'BAGS' ? '(Bags)' : ''}
              </label>
              <input type="number" min="0" name="qualityCutValue" value={inwardFormData.qualityCutValue} onChange={handleInwardChange} disabled={inwardFormData.qualityCutType === 'NONE'} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)] outline-none disabled:opacity-50" />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-[var(--text-muted-alt)] text-[10px] mb-1">Reason</label>
              <input type="text" name="qualityCutReason" value={inwardFormData.qualityCutReason} onChange={handleInwardChange} disabled={inwardFormData.qualityCutType === 'NONE'} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)] outline-none disabled:opacity-50" placeholder="e.g. High Moisture" />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-2">
             <label className="flex items-center gap-2 text-xs text-[var(--text-main)] cursor-pointer">
               <input type="checkbox" name="bagsRecLessThanAgencyGp" checked={inwardFormData.bagsRecLessThanAgencyGp || false} onChange={e => setInwardFormData((prev: any) => ({ ...prev, bagsRecLessThanAgencyGp: e.target.checked }))} className="accent-[#e67e00] w-4 h-4" />
               Bags Rec. less than Agency GP: N/A
             </label>
             <label className="flex items-center gap-2 text-xs text-[var(--text-main)] cursor-pointer">
               <input type="checkbox" name="plusWeight" checked={inwardFormData.plusWeight || false} onChange={e => setInwardFormData((prev: any) => ({ ...prev, plusWeight: e.target.checked }))} className="accent-[#e67e00] w-4 h-4" />
               + Weight
             </label>
             {inwardFormData.plusWeight && (
               <label className="flex items-center gap-2 text-xs text-[var(--text-main)] cursor-pointer bg-red-900/20 px-2 py-1 rounded">
                 <input type="checkbox" name="baujiPermission" checked={inwardFormData.baujiPermission || false} onChange={e => setInwardFormData((prev: any) => ({ ...prev, baujiPermission: e.target.checked }))} className="accent-red-500 w-4 h-4" />
                 Bauji Permission Required
               </label>
             )}
          </div>
          {inwardFormData.qualityCutType && inwardFormData.qualityCutType !== 'NONE' && inwardFormData.qualityCutValue > 0 && inwardFormData.netWtMill > 0 && (
            <div className="mt-2 text-xs text-orange-400">
              <span className="font-bold">Calculated Cut equivalent:</span> {
                inwardFormData.qualityCutType === 'BAGS' 
                  ? (parseFloat(inwardFormData.qualityCutValue) * 0.382).toFixed(2)
                  : ((parseFloat(inwardFormData.netWtMill) * parseFloat(inwardFormData.qualityCutValue)) / 100).toFixed(2)
              } Qtl (Will be added to Shortage)
            </div>
          )}
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
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">5. Bags Rec. and Bardana Class</div>
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
 <td className="py-3">
  <input type="number" min="0" name="origAClass" value={inwardFormData.origAClass} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)]"  />
  {inwardErrors.origAClass && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.origAClass}</span>}
 </td>
 <td className="py-3">
  <input type="number" min="0" name="origBClass" value={inwardFormData.origBClass} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)]"  />
  {inwardErrors.origBClass && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.origBClass}</span>}
 </td>
 <td className="py-3">
  <input type="number" min="0" name="shortageAClass" value={inwardFormData.shortageAClass} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[#e67e00]/50 rounded px-2 py-1 text-[var(--text-main)]"  />
  {inwardErrors.shortageAClass && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.shortageAClass}</span>}
 </td>
 <td className="py-3">
  <input type="number" min="0" name="shortageBClass" value={inwardFormData.shortageBClass} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[#e67e00]/50 rounded px-2 py-1 text-[var(--text-main)]"  />
  {inwardErrors.shortageBClass && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.shortageBClass}</span>}
 </td>
 </tr>
 <tr>
 <td className="py-3 text-[var(--text-muted)] font-medium">Bags @ Agency GP</td>
 <td className="py-3">
  <input type="number" min="0" name="origAClassAg" value={inwardFormData.origAClassAg} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)]"  />
  {inwardErrors.origAClassAg && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.origAClassAg}</span>}
 </td>
 <td className="py-3">
  <input type="number" min="0" name="origBClassAg" value={inwardFormData.origBClassAg} onChange={handleInwardChange} className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)]"  />
  {inwardErrors.origBClassAg && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.origBClassAg}</span>}
 </td>
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
    <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
      Required Nt Wt. : (Qtl)
      <span className="block text-[10px] opacity-80">(agency + shortage bags)</span>
    </label>
    <input type="number" min="0" name="reqNetWt" value={inwardFormData.reqNetWt} disabled className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none opacity-70 cursor-not-allowed" title="Auto calculated"  />
  </div>
  <div>
    <label className="block text-[var(--text-muted-alt)] text-xs mb-1 flex justify-between items-center">
      <span>Net Wt. at Mill : (Qtl) <span className="text-red-500">*</span></span>
      {!hasManualWeighbridgePermission && (
        <button type="button" onClick={() => {
          setInwardFormData((prev: any) => ({...prev, netWtMill: (Math.random() * (450 - 350) + 350).toFixed(2)}));
          setInwardErrors((prev: any) => ({...prev, netWtMill: ''}));
        }} className="text-[#e67e00] hover:text-white transition-colors flex items-center gap-1" title="Fetch from Weighbridge">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Fetch
        </button>
      )}
    </label>
    <input type="number" min="0" name="netWtMill" value={inwardFormData.netWtMill} onChange={handleInwardChange} disabled={!hasManualWeighbridgePermission} className={`w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] font-bold outline-none ${hasManualWeighbridgePermission ? 'focus:border-[#e67e00]' : 'opacity-70 cursor-not-allowed'}`}  />
    {inwardErrors.netWtMill && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.netWtMill}</span>}
  </div>
  <div>
    <label className="block text-[var(--text-main)] font-bold text-xs mb-1">Net Wt. Difference : (Qtl) <span className="text-red-500">*</span></label>
    <input type="number" min="0" name="netWtDiff" value={inwardFormData.netWtDiff} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-blue-400 font-bold outline-none"  />
    {inwardErrors.netWtDiff && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.netWtDiff}</span>}
  </div>
  <div>
    <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Net Wt. at Party : (Qtl) <span className="text-red-500">*</span></label>
    <input type="number" min="0" name="netWtParty" value={inwardFormData.netWtParty} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none"  />
    {inwardErrors.netWtParty && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.netWtParty}</span>}
  </div>
  </div>
 </div>
 </div>
 
 {/* 7. Dhanak / Lot Details */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">7. Dhanak / Lot Details</div>
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

 {/* 8. Shortage Management */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
  <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">8. Shortage Management</div>
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
  


  {/* Removed Shortage Received / Occurred as per feedback */}
  <div>
    <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Update in Shortage Register</label>
    <div className="flex items-center gap-4 mt-2">
      <label className="flex items-center gap-1 text-[var(--text-main)]">
        <input type="radio" name="updateShortageReg" value="Yes" checked={inwardFormData.updateShortageReg === 'Yes'} onChange={handleInwardChange} className="accent-blue-500" /> Yes
      </label>
      <label className="flex items-center gap-1 text-[var(--text-main)]">
        <input type="radio" name="updateShortageReg" value="N/A" checked={inwardFormData.updateShortageReg === 'N/A' || inwardFormData.updateShortageReg === 'No'} onChange={handleInwardChange} className="accent-blue-500" /> N/A
      </label>
    </div>
  </div>
  
  <div>
    <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Total shortage of Artia (Qtl)</label>
    <input type="text" value={inwardFormData.shortageQtl || '0.00'} disabled className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none opacity-70 cursor-not-allowed font-bold text-red-400" />
  </div>
  <div>
    <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Total shortage of Artia (Bags)</label>
    <input type="text" value={inwardFormData.shortageBags || '0'} disabled className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none opacity-70 cursor-not-allowed font-bold text-red-400" />
  </div>

  {inwardFormData.actualShortageQtl < 0 && (
    <div className="col-span-2">
      <span className="text-yellow-500 font-bold text-sm block mb-2">Excess Weight Received: {Math.abs(inwardFormData.actualShortageQtl)} Qtl</span>
    </div>
  )}

  <div className="col-span-2">
    <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Plus wt. consider in shortage recovery :</label>
    <div className="flex flex-wrap items-center gap-4 mt-2">
      <label className="flex items-center gap-1 cursor-pointer text-[var(--text-main)]">
        <input type="radio" name="shortageRecoveryOpt" value="No" checked={inwardFormData.shortageRecoveryOpt === 'No' || !inwardFormData.shortageRecoveryOpt} onChange={() => setInwardFormData((p: any) => ({...p, shortageRecoveryOpt: 'No', baujiPermissionPlusWt: false}))} className="accent-blue-500" /> No
      </label>
      <label className="flex items-center gap-1 cursor-pointer text-[var(--text-main)]">
        <input type="radio" name="shortageRecoveryOpt" value="Yes" checked={inwardFormData.shortageRecoveryOpt === 'Yes'} onChange={(e) => {
          if (e.target.checked) setInwardFormData((p: any) => ({...p, shortageRecoveryOpt: 'Yes'}));
        }} className="accent-blue-500" /> Yes
        <span className="text-[10px] text-[var(--text-muted-alt)] ml-1">( if Yes inform Bauji on each entry )</span>
      </label>
      
      {inwardFormData.shortageRecoveryOpt === 'Yes' && (
        <label className="flex items-center gap-2 text-sm text-[var(--text-main)] font-medium cursor-pointer ml-4 animate-in fade-in slide-in-from-left-2 duration-200">
          <input type="checkbox" checked={inwardFormData.baujiPermissionPlusWt} onChange={(e) => setInwardFormData((p: any) => ({...p, baujiPermissionPlusWt: e.target.checked}))} className="accent-blue-500 w-4 h-4" />
          Bauji Permission Obtained
        </label>
      )}
    </div>
  </div>

  <div className="col-span-2">
    <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Any Discrepancy / Point Raise <span className="text-red-500">*</span></label>
    <textarea name="discrepancy" value={inwardFormData.discrepancy} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none" rows={2}></textarea>
    {inwardErrors.discrepancy && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.discrepancy}</span>}
  </div>
 </div>
 </div>

 {/* 9. Driver Information */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">9. Driver Information</div>
 <div className="p-4 grid grid-cols-2 gap-4 text-sm">
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1 flex items-center gap-2">Driver Name <span className="text-red-500">*</span></label>
 <select name="driverName" value={inwardFormData.driverName} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none">
   <option value="">Select Driver</option>
   {drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
 </select>
 {inwardErrors.driverName && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.driverName}</span>}
 </div>
 <div>
 <label className="block text-[var(--text-muted-alt)] text-xs mb-1">Mobile Number <span className="text-red-500">*</span></label>
 <input type="tel" pattern="[0-9]{10}" maxLength={10} title="10 digit mobile number" name="mobileNumber" value={inwardFormData.mobileNumber} onChange={handleInwardChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none" />
 {inwardErrors.mobileNumber && <span className="text-red-500 text-[10px] mt-1 block">{inwardErrors.mobileNumber}</span>}
 </div>
 </div>
 </div>

 {/* 10. Authentication (Biometric) */}
 <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
 <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm flex items-center justify-between">
   <span>10. Authentication (Biometric)</span>
   {inwardFormData.shortageRecoveryOpt === 'Yes' && <span className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle size={14} /> High Risk: 2 Punches Required</span>}
 </div>
 <div className="p-4 flex flex-col gap-4 text-sm">
 
 {/* First Punch - Supervisor */}
 <div className="flex flex-wrap gap-6 items-center justify-between p-3 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)]">
   <div className="flex items-center gap-3 flex-wrap flex-1">
     <div className="w-24 text-[var(--text-muted-alt)] font-medium text-xs">Supervisor</div>
     {inwardFormData.biometricData ? (
       <div className="text-green-400 font-bold bg-green-900/10 border border-green-900/20 px-3 py-1.5 rounded flex items-center gap-2">
         <ShieldCheck size={16} /> Authenticated
       </div>
     ) : (
        <div className="flex gap-2 items-center">
          <button 
            type="button" 
            onClick={async () => {
              try {
                const xml = await biometricService.captureFingerprint();
                setInwardFormData((p: any) => ({...p, biometricData: xml}));
                useUiStore.getState().addToast('Fingerprint Captured Successfully', 'success');
              } catch(e: any) {
                useUiStore.getState().addToast(e.message, 'error');
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 rounded px-4 py-1.5 text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
            Scan Fingerprint
          </button>
          <span className="text-xs text-[var(--text-muted-alt)]">Place finger on device</span>
        </div>
     )}
   </div>
   <div className="text-right min-w-[120px]">
     <div className="text-[var(--text-muted-alt)] text-[11px] uppercase tracking-wider mb-0.5">Date & Time</div>
     <div className="text-[var(--text-main)] font-medium">{inwardFormData.biometricData ? new Date().toLocaleString() : '-'}</div>
   </div>
 </div>

 {/* Second Punch - Head Supervisor (Conditional) */}
 {inwardFormData.shortageRecoveryOpt === 'Yes' && (
  <div className="flex flex-wrap gap-6 items-center justify-between p-3 rounded bg-red-900/10 border border-red-500/20">
    <div className="flex items-center gap-3 flex-wrap flex-1">
      <div className="w-24 text-red-400 font-medium text-xs">Head Supervisor</div>
      {inwardFormData.headBiometricData ? (
        <div className="text-green-400 font-bold bg-green-900/10 border border-green-900/20 px-3 py-1.5 rounded flex items-center gap-2">
          <ShieldCheck size={16} /> Authenticated
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <button 
            type="button" 
            onClick={async () => {
              try {
                const xml = await biometricService.captureFingerprint();
                setInwardFormData((p: any) => ({...p, headBiometricData: xml}));
                useUiStore.getState().addToast('Head Supervisor Fingerprint Captured Successfully', 'success');
              } catch(e: any) {
                useUiStore.getState().addToast(e.message, 'error');
              }
            }}
            className="bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-500/50 rounded px-4 py-1.5 text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
            Scan Fingerprint
          </button>
          <span className="text-xs text-red-400/70">Place finger on device</span>
        </div>
      )}
    </div>
    <div className="text-right min-w-[120px]">
      <div className="text-[var(--text-muted-alt)] text-[11px] uppercase tracking-wider mb-0.5">Date & Time</div>
      <div className="text-[var(--text-main)] font-medium">{inwardFormData.headBiometricData ? new Date().toLocaleString() : '-'}</div>
    </div>
  </div>
 )}

 </div>
 </div>
 </div>
 </div>
 
 {/* Bottom Actions */}
 {/* Bottom Actions */}
 <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex justify-end gap-3 shrink-0">
 <button type="button" onClick={() => setInwardFormData(defaultInwardFormData)} className="px-6 py-2.5 border border-[var(--border-subtle)] rounded-lg text-[var(--text-main)] font-bold hover:bg-[var(--glass-bg)]">Cancel</button>
 <button 
   onClick={() => {
     if (inwardFormData.bhariVideoUpload !== 'Yes') {
       alert("Please upload the Bhari (Loaded) video first before transferring the vehicle for unloading.");
       return;
     }
     if (!inwardFormData.biometricData) {
       alert("Supervisor Biometric Verification is required.");
       return;
     }
     if (inwardFormData.shortageRecoveryOpt === 'Yes' && !inwardFormData.headBiometricData) {
       alert("Head Supervisor Biometric Verification is required for Shortage Recovery.");
       return;
     }
     handleInwardSubmit('DRAFT');
   }}
   disabled={isSubmitting}
   className="px-6 py-2.5 bg-[var(--bg-panel)] border border-blue-500/30 text-blue-400 rounded-lg font-bold hover:bg-blue-900/20 disabled:opacity-50">
   {isSubmitting ? 'Saving...' : 'Save Draft'}
 </button>
 <button 
 onClick={() => {
   if (inwardFormData.bhariVideoUpload !== 'Yes' || inwardFormData.khaliVideoUpload !== 'Yes') {
     alert("Both Bhari (Loaded) and Khali (Empty) videos must be uploaded (Yes) to Save and Confirm.");
     return;
   }
   if (!inwardFormData.biometricData) {
     alert("Supervisor Biometric Verification is required.");
     return;
   }
   if (inwardFormData.shortageRecoveryOpt === 'Yes' && !inwardFormData.headBiometricData) {
     alert("Head Supervisor Biometric Verification is required for Shortage Recovery.");
     return;
   }
   handleInwardSubmit('CONFIRMED');
 }}
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
          <button 
              onClick={async () => {
                try {
                  const params = new URLSearchParams();
                  if (listFilters.dateFrom) params.append('dateFrom', listFilters.dateFrom);
                  if (listFilters.dateTo) params.append('dateTo', listFilters.dateTo);
                  if (listFilters.mandi) params.append('mandi', listFilters.mandi);
                  if (listFilters.supplierId) params.append('supplierId', listFilters.supplierId);
                  params.append('limit', '1000000');
                  params.append('page', '1');
                  const pid = activePlant?.id || 'global';
                  
                  const res = await api.get(`/api/procurement/inwards/${pid}?${params.toString()}`);
                  const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                  
                  const exportData = data.map((item: any) => ({
                    "Purchase No": item.purchaseNo,
                    "Date": item.date,
                    "GP No": item.gpNo,
                    "Supplier": item.supplier,
                    "Mandi EG No": item.mandiEgNo,
                    "Vehicle No": item.vehicleNo,
                    "Gross Wt": item.grossWt,
                    "Tare Wt": item.tareWt,
                    "Net Wt": item.netWt
                  }));
                  exportToExcel(exportData, 'Inward_List_Full.xlsx');
                } catch (error) {
                  console.error('Failed to export all records', error);
                }
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Download size={16} /> Export to Excel
            </button>
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
            <select value={listFilters.mandi} onChange={e => setListFilters(f => ({...f, mandi: e.target.value}))} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm">
              <option value="">Select Mandi</option>
              {mandis.filter((m: any) => m.isActive).map((m: any) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
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
                <th className="p-3">Supplier</th>
                <th className="p-3">Mandi EG / GP</th>
                <th className="p-3">Vehicle</th>
                <th className="p-3 text-right">Gross Wt</th>
                <th className="p-3 text-right">Tare Wt</th>
                <th className="p-3 text-right">Net Wt</th>
                <th className="p-3 text-right">Bags</th>
                <th className="p-3">Quality</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {inwardList.map((p, i) => (
                <tr key={i} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)] whitespace-nowrap">
                  <td className="p-3 font-mono text-xs">{p.purchaseNo || p.id?.substring(0,8).toUpperCase()}</td>
                  <td className="p-3">{p.date || (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-')}</td>
                  <td className="p-3 text-[var(--text-main)] font-bold">{p.supplier || p.supplier?.name || '-'}</td>
                  <td className="p-3 text-xs">EG: {p.mandiEgNo || p.paddyInwardDetails?.mandiEgNo || '-'}<br/>GP: {p.gpNo || p.paddyInwardDetails?.gpNo || '-'}</td>
                  <td className="p-3">{p.vehicleNo || p.weighbridge?.vehicleNo || p.paddyInwardDetails?.truckNo || '-'}</td>
                  <td className="p-3 text-right text-[var(--text-muted-alt)]">{p.grossWt || p.weighbridge?.grossWeight || '-'}</td>
                  <td className="p-3 text-right text-[var(--text-muted-alt)]">{p.tareWt || p.weighbridge?.tareWeight || '-'}</td>
                  <td className="p-3 text-right font-bold text-[#e67e00]">{p.netWt || p.weighbridge?.netWeight || '-'}</td>
                  <td className="p-3 text-right">Total: {p.bags || p.paddyInwardDetails?.totalBags || '-'}<br/><span className="text-[10px] text-[var(--text-muted)]">Std: {p.paddyInwardDetails?.standardBags || '0'} | A: {p.paddyInwardDetails?.aClassBags || '0'}</span></td>
                  <td className="p-3 text-[10px]">
                    <div className="flex flex-col gap-0.5">
                       <span>MC: {p.quality?.moisture || '-'}%</span>
                       <span>BR: {p.quality?.broken || '-'}%</span>
                    </div>
                  </td>
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
          <Pagination
            currentPage={inwardCurrentPage}
            totalItems={inwardTotalItems}
            onPageChange={setInwardCurrentPage}
            itemsPerPage={10}
          />
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

{/* TAB: PLANT SETTINGS (GOVT RATE) */}
   {activeTab === 'global_settings' && (
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col h-full overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
              <Settings className="text-[#e67e00]" /> Plant Settings
            </h2>
            <p className="text-xs text-[var(--text-muted-alt)] mt-1">Configure variables for this plant</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-[var(--bg-base)] p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* General Procurement Settings */}
            <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
              <div className="bg-amber-500/10 px-5 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2">
                <FileText size={18} className="text-amber-500" />
                <h3 className="font-bold text-[var(--text-main)]">Procurement Defaults</h3>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                
                  {/* Procurement Cut Settings */}
                  <div className="col-span-1 md:col-span-2 bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle)] p-6 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                        <Settings className="w-4 h-4 text-amber-500" />
                        Procurement & Cut Configurations
                      </h4>
                      {!isEditingSettings && (
                        <button onClick={() => setIsEditingSettings(true)} className="text-amber-500 hover:text-amber-400 px-3 py-1 bg-amber-500/10 rounded font-bold text-xs">
                          Edit Settings
                        </button>
                      )}
                    </div>

                    {!isEditingSettings ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                          <p className="text-xs text-[var(--text-muted-alt)] mb-1">Govt Purchase Rate</p>
                          <p className="text-xl font-bold text-[var(--text-main)]">₹{plantSettings.govtRate || '0.00'}<span className="text-xs text-[var(--text-muted)] font-normal ml-1">/ Qtl</span></p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-muted-alt)] mb-1">Benchmark Moisture</p>
                          <p className="text-xl font-bold text-[var(--text-main)]">{plantSettings.benchmarkMoisture || '17'}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-muted-alt)] mb-1">Safai Cut</p>
                          <p className="text-xl font-bold text-[var(--text-main)]">{plantSettings.safaiCut || '2'}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-muted-alt)] mb-1">Processing Cut</p>
                          <p className="text-xl font-bold text-[var(--text-main)]">{plantSettings.processingCut || '4'}%</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="text-xs text-[var(--text-muted-alt)] mb-1 block">Govt Rate (₹)</label>
                          <input type="number" min="0" step="0.01" value={plantSettings.govtRate} onChange={(e) => setPlantSettings({...plantSettings, govtRate: e.target.value})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-amber-500" />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--text-muted-alt)] mb-1 block">Benchmark Moisture (%)</label>
                          <input type="number" min="0" step="0.1" value={plantSettings.benchmarkMoisture} onChange={(e) => setPlantSettings({...plantSettings, benchmarkMoisture: e.target.value})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-amber-500" />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--text-muted-alt)] mb-1 block">Safai Cut (%)</label>
                          <input type="number" min="0" step="0.1" value={plantSettings.safaiCut} onChange={(e) => setPlantSettings({...plantSettings, safaiCut: e.target.value})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-amber-500" />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--text-muted-alt)] mb-1 block">Processing Cut (%)</label>
                          <input type="number" min="0" step="0.1" value={plantSettings.processingCut} onChange={(e) => setPlantSettings({...plantSettings, processingCut: e.target.value})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-amber-500" />
                        </div>
                        <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex justify-end gap-3 mt-2">
                          <button onClick={() => setIsEditingSettings(false)} className="bg-[var(--bg-panel)] hover:bg-[var(--glass-bg)] border border-[var(--border-subtle)] text-[var(--text-main)] px-4 py-2 rounded-lg font-bold text-sm transition-all">Cancel</button>
                          <button onClick={handleUpdateSettings} className="bg-amber-500 hover:bg-amber-600 text-black px-6 py-2 rounded-lg font-bold shadow-md text-sm transition-all">Save Changes</button>
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-[var(--text-muted-alt)] mt-4 pt-3 border-t border-[var(--border-subtle)]">
                      These settings are applied globally to this active plant and directly affect the Overpriced Purchase Tagging algorithms.
                    </p>
                  </div>    
              </div>
            </div>

          </div>
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
 <button 
            onClick={async () => {
              try {
                const params = new URLSearchParams();
                params.append('limit', '1000000');
                params.append('page', '1');
                const pid = activePlant?.id || 'global';
                
                const res = await api.get(`/api/procurement/recent/${pid}?${params.toString()}`);
                const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                const pendingItems = data.filter((p: any) => p.qcStatus === 'PENDING' || p.qcStatus === 'Pending');
                
                const exportData = pendingItems.map((item: any) => ({
                  "Purchase No": item.purchaseNo,
                  "Date": item.date,
                  "Supplier": item.supplierName || item.supplier,
                  "Net Wt": item.netWeight,
                  "Moisture": item.moisture,
                  "QC Status": item.qcStatus
                }));
                exportToExcel(exportData, `Quality_Inspection_Full`);
              } catch (error) {
                console.error('Failed to export all records', error);
              }
            }}
            className="flex items-center gap-2 bg-[#107c41] text-white px-3 py-1.5 rounded hover:bg-[#1f8c51] transition-colors text-sm font-medium"
          >
            <Download size={16} /> Export All to Excel
          </button>
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
 <Pagination
            currentPage={recentPurchasesCurrentPage}
            totalItems={recentPurchasesTotalItems}
            onPageChange={setRecentPurchasesCurrentPage}
          />
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
 <button 
              onClick={async () => {
                try {
                  const params = new URLSearchParams();
                  if (listFilters.dateFrom) params.append('dateFrom', listFilters.dateFrom);
                  if (listFilters.dateTo) params.append('dateTo', listFilters.dateTo);
                  if (listFilters.mandi) params.append('mandi', listFilters.mandi);
                  if (listFilters.supplierId) params.append('supplierId', listFilters.supplierId);
                  params.append('limit', '1000000');
                  params.append('page', '1');
                  const pid = activePlant?.id || 'global';
                  
                  const res = await api.get(`/api/procurement/soda-pending/${pid}?${params.toString()}`);
                  const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                  
                  const exportData = data.map((item: any) => ({
                    "Party": item.partyMandi,
                    "Date": item.date,
                    "Bags": item.bags,
                    "Govt Rate": item.govtRate,
                    "Rate": item.rate,
                    "Diff": item.diff,
                    "Payment": item.payment,
                    "Final Hisab Amt": item.finalHisabAmt
                  }));
                  exportToExcel(exportData, 'Soda_Pending_Full.xlsx');
                } catch (error) {
                  console.error('Failed to export all records', error);
                }
              }}
            className="text-blue-500 hover:text-blue-400 text-xs font-bold flex items-center gap-1 bg-[var(--bg-base)] px-2 py-1 rounded border border-[var(--border-subtle)]"
          >
            <Download size={14} /> Export
          </button>
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
 {filteredSodaPending.map((p, i) => (
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
 {filteredSodaPending.length === 0 && (
 <tr>
 <td colSpan={11} className="p-6 text-center text-[var(--text-muted-alt)] font-medium italic border-b border-[var(--border-subtle-alt)]">
 No outstanding pending Hisabs found. Try adding a Boli purchase!
 </td>
 </tr>
 )}
 </tbody>
 </table>
 <Pagination
     currentPage={sodaPendingCurrentPage}
     totalItems={sodaPendingTotalItems}
     onPageChange={setSodaPendingCurrentPage}
   />
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
     isOpen={addMandiModal.isOpen} 
     onClose={() => setAddMandiModal({ ...addMandiModal, isOpen: false })}
     title={addMandiModal.id ? "Edit Mandi" : "Add New Mandi"}
   >
     <form onSubmit={handleAddMandi} className="space-y-4">
       <div>
         <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Mandi Name</label>
         <input type="text" value={addMandiModal.name} onChange={e => setAddMandiModal({...addMandiModal, name: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" required />
       </div>
       <div className="flex items-center gap-2">
         <input type="checkbox" id="mandiStatus" checked={addMandiModal.isActive} onChange={e => setAddMandiModal({...addMandiModal, isActive: e.target.checked})} className="w-4 h-4" />
         <label htmlFor="mandiStatus" className="text-sm text-[var(--text-main)]">Active Status</label>
       </div>
       <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)] mt-4">
         <button type="button" onClick={() => setAddMandiModal({...addMandiModal, isOpen: false})} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)]">Cancel</button>
         <button type="submit" className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold hover:bg-[#cc7000] transition-colors">{addMandiModal.id ? "Update Mandi" : "Add Mandi"}</button>
       </div>
     </form>
   </CustomModal>

 <CustomModal 
    isOpen={addSupplierModal.isOpen} 
    onClose={() => setAddSupplierModal({ ...addSupplierModal, isOpen: false })}
    title="Add New Arthiya"
  >
    <form onSubmit={handleAddSupplier} className="space-y-4">
      {!activePlant && user?.role === 'SUPER_ADMIN' && (
        <div>
          <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Select Mill</label>
          <select value={addSupplierModal.plantId} onChange={e => setAddSupplierModal({...addSupplierModal, plantId: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" required>
            <option value="">Select Mill</option>
            {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
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
        <select value={addSupplierModal.mandi} onChange={e => setAddSupplierModal({...addSupplierModal, mandi: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]">
          <option value="">Select Mandi</option>
          {mandis.filter((m: any) => m.isActive).map((m: any) => (
            <option key={m.id} value={m.name}>{m.name}</option>
          ))}
        </select>
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

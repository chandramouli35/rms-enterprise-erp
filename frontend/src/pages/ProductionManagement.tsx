import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
 Plus, Play, AlertCircle, Package, Search, Calendar, ChevronDown, 
 Settings, Download, Printer, PieChart as PieChartIcon, CheckCircle
} from 'lucide-react';
import api from '../api/axios';
import { usePlantStore } from '../store/plantStore';
import { 
 PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from 'recharts';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import { useIntermillStore } from '../store/intermillStore';
import { useAuthStore } from '../store/authStore';
import { IntermillProcessing } from './IntermillProcessing';
import { DailyStockReport } from '../components/Production/DailyStockReport';
import { ShiftWiseReport } from '../components/Production/ShiftWiseReport';

const INTERMILL_ITEMS = [
  'R. Bran', 'K. Phuck', 'Broken Rice', 'Nakku 1', 'Nakku 2', 
  'Rejection', 'Final Rice', 'Mansoori', 'Wand', 'Parmal', 'FRK'
];
export const ProductionManagement = () => {
 const activePlant = usePlantStore(state => state.activePlant);
 const [productionType, setProductionType] = useState('Rice Milling');
 const [searchParams] = useSearchParams();
 const activeTab = searchParams.get('tab') || 'batch_creation';
 
 const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<any>(null);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [currentStock, setCurrentStock] = useState<Record<string, number>>({});

  // Intermill States
  const { createBatch: createIntermillBatch, batches: intermillBatches, fetchBatches: fetchIntermillBatches, approveBatch: approveIntermillBatch } = useIntermillStore();
  const user = useAuthStore(state => state.user);
  const [products, setProducts] = useState<any[]>([]);
  const [intermillData, setIntermillData] = useState({ rawMaterialId: '', inputBags: '' });
  const [selectedOutputs, setSelectedOutputs] = useState<Record<string, boolean>>({});
  const [outputQuantities, setOutputQuantities] = useState<Record<string, string>>({});

 const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', status: '' });
 
 const generateBatchNo = () => `BATCH-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

 const [formData, setFormData] = useState({
 batchNo: generateBatchNo(),
 date: new Date().toISOString().split('T')[0],
 shift: 'Day Shift',
 productionLine: 'Line 1',
 paddyType: 'PR-11 (Steam)',
 variety: 'Sugandha',
 paddySource: '250.000',
 paddyUsedQty: '',
 moisture: '',
  additionalOutputs: {
    'R. Bran': { produced: '', reused: '' },
    'K. Phuck': { produced: '', reused: '' },
    'Broken Rice': { produced: '', reused: '' },
    'Nakku 1': { produced: '', reused: '' },
    'Nakku 2': { produced: '', reused: '' },
    'Rejection': { produced: '', reused: '' },
    'Final Rice': { produced: '', reused: '' },
    'Mansoori': { produced: '', reused: '' },
    'Wand': { produced: '', reused: '', wandProduced: '' },
    'Parmal': { produced: '', reused: '' },
    'FRK': { produced: '', reused: '' },
    'Dry Paddy': { produced: '', reused: '' }
  },
  remarks: 'Steam paddy batch for production.',
  stackInputs: [] as { stackNo: string, bags: string, isDirectUnload: boolean }[],
  paddyDryingTargetStack: '',
  isDryPaddyOutput: false,
  rawMaterial: 'Paddy',
 });

 const [analysisFormData, setAnalysisFormData] = useState<any>({
   paddyMoisture: '', khanjanBroken: '', polisher1: '', polisher2: '', 
   polisher3: '', polisher4: '', pamalaBroken: '', finalBroken: '', 
   riceMoisture: '', damagePercent: '', discolourPercent: '', frkPercent: ''
 });

 
  const fetchCurrentStock = async () => {
    if (!activePlant?.id) return;
    try {
      const res = await api.get('/inventory/byproducts');
      setCurrentStock(res.data);
    } catch (error) {
      console.error('Error fetching byproducts stock:', error);
    }
  };

  const fetchMetrics = async () => {
 if (!activePlant?.id) return;
 try {
 const res = await api.get(`/production/metrics?plantId=${activePlant.id}`);
 setMetricsData(res.data);
 } catch (error) {
 console.error('Error fetching metrics', error);
 }
 };

  const fetchBatches = async () => {
    if (!activePlant?.id) return;
    try {
      setLoading(true);
      const query = new URLSearchParams({ plantId: activePlant.id });
      if (filters.dateFrom) query.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) query.append('dateTo', filters.dateTo);
      if (filters.status) query.append('status', filters.status);
      
      const res = await api.get(`/production/batches?${query.toString()}`);
      const fetchedBatches = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setBatches(fetchedBatches);
      if (fetchedBatches.length > 0 && !selectedBatchId) {
        setSelectedBatchId(fetchedBatches[0].id);
      }
    } catch (error) {
      console.error('Error fetching batches', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!selectedBatchId) {
      setNotification({ message: 'Please select a batch first', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const difference1To4 = 
        (analysisFormData.polisher1 && analysisFormData.polisher4) 
        ? Math.abs(Number(analysisFormData.polisher1) - Number(analysisFormData.polisher4)).toFixed(2)
        : null;

      const dataToSave = {
        ...analysisFormData,
        difference1To4
      };

      await api.post(`/production/batches/${selectedBatchId}/analysis`, dataToSave);
      setNotification({ message: 'Batch analysis saved successfully', type: 'success' });
      fetchBatches();
    } catch (error: any) {
      console.error('Error saving batch analysis:', error);
      setNotification({ message: error.response?.data?.message || 'Failed to save analysis', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBatchId && batches.length > 0) {
      const b = batches.find(b => b.id === selectedBatchId) || null;
      setSelectedBatchDetails(b);
      if (b?.batchAnalysis) {
        setAnalysisFormData({
          paddyMoisture: b.batchAnalysis.paddyMoisture || '',
          khanjanBroken: b.batchAnalysis.khanjanBroken || '',
          polisher1: b.batchAnalysis.polisher1 || '',
          polisher2: b.batchAnalysis.polisher2 || '',
          polisher3: b.batchAnalysis.polisher3 || '',
          polisher4: b.batchAnalysis.polisher4 || '',
          pamalaBroken: b.batchAnalysis.pamalaBroken || '',
          finalBroken: b.batchAnalysis.finalBroken || '',
          riceMoisture: b.batchAnalysis.riceMoisture || '',
          damagePercent: b.batchAnalysis.damagePercent || '',
          discolourPercent: b.batchAnalysis.discolourPercent || '',
          frkPercent: b.batchAnalysis.frkPercent || ''
        });
      } else {
        setAnalysisFormData({
          paddyMoisture: '', khanjanBroken: '', polisher1: '', polisher2: '', 
          polisher3: '', polisher4: '', pamalaBroken: '', finalBroken: '', 
          riceMoisture: '', damagePercent: '', discolourPercent: '', frkPercent: ''
        });
      }
    } else {
      setSelectedBatchDetails(null);
      setAnalysisFormData({
        paddyMoisture: '', khanjanBroken: '', polisher1: '', polisher2: '', 
        polisher3: '', polisher4: '', pamalaBroken: '', finalBroken: '', 
        riceMoisture: '', damagePercent: '', discolourPercent: '', frkPercent: ''
      });
    }
  }, [selectedBatchId, batches]);

  useEffect(() => {
    if (activePlant?.id) {
      fetchMetrics();
      fetchBatches();
      fetchProducts();
      fetchIntermillBatches();
    }
  }, [activePlant?.id, filters.dateFrom, filters.dateTo, filters.status]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/api/products');
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching products', error);
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
 const { name, value } = e.target;
 setFormData(prev => ({ ...prev, [name]: value }));
 };

   const handleAdditionalOutputChange = (key: string, field: string, value: string) => {
    setFormData(prev => {
      let finalValue = value;
      
      // Validation logic for reused bags
      if (field === 'reused') {
        const reusedVal = Number(value) || 0;
        const producedVal = Number(prev.additionalOutputs[key as keyof typeof prev.additionalOutputs].produced) || 0;
        const availableStock = currentStock[key] || 0;
        
        // Capping logic: cannot reuse more than produced + available stock
        const maxAvailable = producedVal + availableStock;
        if (reusedVal > maxAvailable) {
          finalValue = String(maxAvailable);
          setNotification({ message: `Cannot reuse more than ${maxAvailable} bags of ${key} (Produced: ${producedVal} + Stock: ${availableStock})`, type: 'error' });
        }
      }

      return {
        ...prev,
        additionalOutputs: {
          ...prev.additionalOutputs,
          [key]: {
            ...prev.additionalOutputs[key as keyof typeof prev.additionalOutputs],
            [field]: finalValue
          }
        }
      };
    });
  };

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

 useEffect(() => {
 if (notification) {
 const timer = setTimeout(() => setNotification(null), 3000);
 return () => clearTimeout(timer);
 }
 }, [notification]);

 const handleCreateBatch = async () => {
 if (!activePlant?.id) return;
 try {
 setLoading(true);
 const payload = {
 plantId: activePlant.id,
 batchNo: formData.batchNo,
 date: new Date(formData.date).toISOString(),
 shift: formData.shift,
 productionLine: formData.productionLine,
 paddyType: formData.paddyType,
 variety: formData.variety,
 paddySource: formData.paddySource,
 paddyUsedQty: Number(formData.paddyUsedQty) || 0,
 moisture: formData.moisture ? Number(formData.moisture) : undefined,
    additionalOutputs: Object.fromEntries(
      Object.entries(formData.additionalOutputs).map(([k, v]) => [
        k,
        { 
          produced: Number(v.produced) || 0, 
          reused: Number(v.reused) || 0, 
          wandProduced: Number((v as any).wandProduced) || 0, 
          moisture: (v as any).moisture ? Number((v as any).moisture) : undefined, 
          targetStack: (v as any).targetStack || undefined 
        }
      ])
    ),
    remarks: formData.remarks,
    productionType,
    stackInputs: formData.stackInputs,
    paddyDryingTargetStack: formData.paddyDryingTargetStack
 };
 
 await api.post('/production/batches', payload);
 setNotification({ message: 'Batch created successfully', type: 'success' });
 
 fetchBatches();
   fetchMetrics();
   fetchCurrentStock();
 
      setFormData(prev => ({
      ...prev,
      batchNo: generateBatchNo(),
      paddyUsedQty: '',
      moisture: '',
      additionalOutputs: {
        'R. Bran': { produced: '', reused: '' },
        'K. Phuck': { produced: '', reused: '' },
        'Broken Rice': { produced: '', reused: '' },
        'Nakku 1': { produced: '', reused: '' },
        'Nakku 2': { produced: '', reused: '' },
        'Rejection': { produced: '', reused: '' },
        'Final Rice': { produced: '', reused: '' },
        'Mansoori': { produced: '', reused: '' },
        'Wand': { produced: '', reused: '', wandProduced: '' },
        'Parmal': { produced: '', reused: '' },
        'FRK': { produced: '', reused: '' },
        'Dry Paddy': { produced: '', reused: '' }
      },
      stackInputs: [],
      paddyDryingTargetStack: '',
      isDryPaddyOutput: false,
    }));
 } catch (error) {
 console.error('Error creating batch', error);
 setNotification({ message: 'Failed to create batch', type: 'error' });
 } finally {
 setLoading(false);
 }
 };

  const handleCreateIntermillBatch = async () => {
    if (!activePlant?.id) return;
    
    if (!intermillData.rawMaterialId || !intermillData.inputBags) {
      alert('Please enter input material details');
      return;
    }
    
    const outputIds = Object.keys(selectedOutputs).filter(id => selectedOutputs[id]);
    if (outputIds.length === 0) {
      alert('Please select at least one expected output');
      return;
    }

    // Wastage validation
    const totalInput = Number(intermillData.inputBags);
    const totalOutput = outputIds.reduce((sum, id) => sum + Number(outputQuantities[id] || 0), 0);
    const difference = totalInput - totalOutput;
    const wastagePercent = (difference / totalInput) * 100;
    
    if (wastagePercent > 2) {
      alert(`Wastage exceeds 2% limit (${wastagePercent.toFixed(2)}%). Admin Approval Required. Batch will be saved as Pending Approval.`);
    }

    try {
      setLoading(true);
      const outputs = outputIds.map(id => ({
        productId: id,
        outputBags: outputQuantities[id] || '0'
      }));

      await createIntermillBatch({
        batchNo: formData.batchNo,
        shift: formData.shift,
        date: formData.date,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        rawMaterialId: intermillData.rawMaterialId,
        inputBags: intermillData.inputBags,
        outputs,
        plantId: activePlant.id,
        status: wastagePercent > 2 ? 'Pending Approval' : 'Completed',
        wastagePercent
      });
      alert(wastagePercent > 2 ? 'Batch saved and pending admin approval.' : 'Intermill Batch created successfully');
      
      setFormData(prev => ({...prev, batchNo: generateBatchNo()}));
      setIntermillData({ rawMaterialId: '', inputBags: '' });
      setSelectedOutputs({});
      setOutputQuantities({});
      fetchBatches();
      fetchIntermillBatches();
    } catch (error) {
      console.error('Error creating batch', error);
      alert('Failed to create batch');
    } finally {
      setLoading(false);
    }
  };
 
 const metrics = [
 { title: 'Batches Today', value: metricsData?.batchesToday || '0', label: 'Total Batches', icon: Package, color: 'text-blue-500' },
 { title: 'Total Paddy Used', value: `${metricsData?.totalPaddyUsed?.toFixed(3) || '0.000'} MT`, label: 'Today', icon: Play, color: 'text-green-500' },
 { title: 'Total Rice Produced', value: `${metricsData?.totalRiceProduced?.toFixed(3) || '0.000'} MT`, label: 'Today', icon: Package, color: 'text-purple-500' },
 { title: 'Average Yield', value: `${metricsData?.avgYield || '0.00'} %`, label: 'Today', icon: PieChartIcon, color: 'text-amber-500' },
 { title: 'Total Process Loss', value: `${metricsData?.totalProcessLoss?.toFixed(3) || '0.000'} MT`, label: 'Today', icon: AlertCircle, color: 'text-red-500' },
 { title: 'By-products Total', value: `${metricsData?.totalByProducts?.toFixed(3) || '0.000'} MT`, label: 'Today', icon: Settings, color: 'text-teal-500' }
 ];

 const today = new Date();
 today.setHours(0,0,0,0);
 const batchesToday = batches.filter(b => new Date(b.date) >= today);
 
 let cleaning = 0, drying = 0, husking = 0, polishing = 0, broken = 0;
 batchesToday.forEach(b => {
 if(b.processLoss) {
 cleaning += b.processLoss.cleaningLoss || 0;
 drying += b.processLoss.dryingLoss || 0;
 husking += b.processLoss.huskingLoss || 0;
 polishing += b.processLoss.polishingLoss || 0;
 broken += b.processLoss.brokenLoss || 0;
 }
 });

 const processLossData = [
 { name: 'Cleaning Loss', value: cleaning, color: '#3b82f6' },
 { name: 'Drying Loss', value: drying, color: '#22c55e' },
 { name: 'Husking Loss', value: husking, color: '#eab308' },
 { name: 'Polishing Loss', value: polishing, color: '#a855f7' },
 { name: 'Broken Loss', value: broken, color: '#ef4444' }
 ].filter(d => d.value > 0);
 const totalProcessLoss = processLossData.reduce((acc, curr) => acc + curr.value, 0);

 const byProducts = batchesToday.flatMap(b => b.byProducts || []);
 const totalByProducts = byProducts.reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0);

  const selectedBatch = selectedBatchDetails; 
  
  const yieldBreakdownData = selectedBatch?.yieldReport ? [
    { name: 'Rice (Head)', value: selectedBatch.yieldReport.headRicePercent || 0, color: '#22c55e' },
    { name: 'Rice (Broken)', value: selectedBatch.yieldReport.brokenRicePercent || 0, color: '#eab308' },
    { name: 'Bran', value: selectedBatch.yieldReport.branPercent || 0, color: '#f97316' },
    { name: 'Husk', value: selectedBatch.yieldReport.huskPercent || 0, color: '#8b5cf6' },
    { name: 'Process Loss', value: selectedBatch.yieldReport.lossPercent || 0, color: '#ef4444' }
  ].filter(d => d.value > 0) : [];

 return (
 <div className="flex flex-col h-full bg-[var(--bg-base)] text-[var(--text-muted)] relative">
 {/* Custom Toast Notification */}
 {notification && (
 <div className={`absolute top-6 right-6 z-50 px-4 py-3 rounded shadow-lg border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
 notification.type === 'success' ? 'bg-[var(--bg-panel)] border-green-500/30 text-green-400' : 'bg-[var(--bg-panel)] border-red-500/30 text-red-400'
 }`}>
 {notification.type === 'success' ? <Package size={18} /> : <AlertCircle size={18} />}
 <span className="font-medium text-sm">{notification.message}</span>
 </div>
 )}

 {/* Header & Tabs */}
 <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-panel)]">
 <div className="flex items-center gap-2">
 <Package size={16} className="text-[#e67e00]" />
 <h1 className="text-sm font-semibold text-[var(--text-muted)]">Production Management</h1>
 </div>
 </div>



 <div className="flex-1 overflow-y-auto p-6 space-y-6">
 
 {/* Top Metric Cards */}
 <div className="grid grid-cols-6 gap-4">
 {metrics.map((m, i) => (
 <div key={i} className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle)] flex flex-col justify-between">
 <div className="flex items-center gap-2 text-sm text-[var(--text-muted-alt)] mb-2">
 <m.icon size={16} className={m.color} />
 <span className="font-semibold text-xs uppercase tracking-wider">{m.title}</span>
 </div>
 <div>
 <div className="text-2xl font-bold text-[var(--text-main)]">{m.value}</div>
 <div className="text-xs text-[var(--text-muted-alt)] mt-1">{m.label}</div>
 </div>
 </div>
 ))}
 </div>

 {/* Tab Content */}
  {activeTab === 'batch_creation' && (
  <div className="flex flex-col gap-6 flex-1">
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

 {/* 1. Batch Creation Container */}
 <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col h-full">
 <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
 <h2 className="text-lg font-bold text-[var(--text-main)]">1. Batch Creation</h2>
 <div className="flex bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded overflow-hidden">
  <button 
    onClick={() => setProductionType('Paddy Drying')}
    className={`px-4 py-1.5 text-sm font-bold transition-colors border-r border-[var(--border-subtle)] ${productionType === 'Paddy Drying' ? 'bg-[#e67e00] text-black' : 'text-[var(--text-muted-alt)] hover:text-[var(--text-main)]'}`}
  >
    Paddy Drying
  </button>
  <button 
    onClick={() => setProductionType('Rice Milling')}
    className={`px-4 py-1.5 text-sm font-bold transition-colors border-r border-[var(--border-subtle)] ${productionType === 'Rice Milling' ? 'bg-[#e67e00] text-black' : 'text-[var(--text-muted-alt)] hover:text-[var(--text-main)]'}`}
  >
    Rice Milling
  </button>
  <button 
    onClick={() => setProductionType('Intermill Processing')}
    className={`px-4 py-1.5 text-sm font-bold transition-colors ${productionType === 'Intermill Processing' ? 'bg-[#e67e00] text-black' : 'text-[var(--text-muted-alt)] hover:text-[var(--text-main)]'}`}
  >
    Inter-Mill Processing
  </button>
 </div>
 </div>
 <div className="space-y-4 flex-1">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Batch No. <span className="text-red-500">*</span></label>
 <input type="text" name="batchNo" value={formData.batchNo} onChange={handleInputChange} placeholder="Enter Batch No." className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none" />
 </div>
 <div>
 <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Batch Date <span className="text-red-500">*</span></label>
 <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none " />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Shift <span className="text-red-500">*</span></label>
  <select name="shift" value={formData.shift} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none">
    <option value="Day Shift">Day Shift</option>
    <option value="Night Shift">Night Shift</option>
  </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Production Line <span className="text-red-500">*</span></label>
  <select name="productionLine" value={formData.productionLine} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none">
    <option value="Line 1">Line 1</option>
    <option value="Line 2">Line 2</option>
  </select>
 </div>
 </div>
 </div>

 {(productionType === 'Rice Milling' || productionType === 'Paddy Drying') && (
   <div className="col-span-2 bg-[var(--bg-panel-alt)] p-4 rounded-lg border border-[var(--border-subtle)] mb-4 mt-4">
      <h4 className="font-bold text-[var(--text-main)] mb-4">Input Material (Paddy Stack Selection)</h4>
      {formData.stackInputs.map((stack, idx) => (
         <div key={idx} className="flex gap-4 mb-3 items-center">
            <div className="flex-1">
               <input type="text" placeholder="Stack No." value={stack.stackNo} onChange={(e) => {
                  const newInputs = [...formData.stackInputs];
                  newInputs[idx].stackNo = e.target.value;
                  setFormData(prev => ({...prev, stackInputs: newInputs}));
               }} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none" />
            </div>
            
            <label className="flex items-center gap-2 text-sm text-[var(--text-main)]">
               <input type="checkbox" checked={stack.isDirectUnload} onChange={(e) => {
                 const newInputs = [...formData.stackInputs];
                 newInputs[idx].isDirectUnload = e.target.checked;
                 if(e.target.checked) newInputs[idx].bags = '';
                 setFormData(prev => ({...prev, stackInputs: newInputs}));
               }} className="accent-[#e67e00] w-4 h-4 bg-[var(--bg-panel)] border-[var(--border-subtle)]" /> Direct Unload
            </label>

            {!stack.isDirectUnload && (
               <div className="flex-1">
                 <input type="number" placeholder="Bags Consumed" value={stack.bags} onChange={(e) => {
                    const newInputs = [...formData.stackInputs];
                    newInputs[idx].bags = e.target.value;
                    setFormData(prev => ({...prev, stackInputs: newInputs}));
                 }} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none" />
               </div>
            )}
            
            <button onClick={() => {
               const newInputs = formData.stackInputs.filter((_, i) => i !== idx);
               setFormData(prev => ({...prev, stackInputs: newInputs}));
            }} className="text-red-500 font-bold hover:text-red-400 px-2 text-lg" title="Remove">&times;</button>
         </div>
      ))}
      {formData.stackInputs.length === 0 && (
         <p className="text-xs text-[var(--text-muted-alt)] mb-2 italic">No stacks added. Please add at least one stack.</p>
      )}
      <button onClick={() => setFormData(prev => ({...prev, stackInputs: [...prev.stackInputs, {stackNo: '', bags: '', isDirectUnload: false}]}))} className="text-sm font-bold text-[#e67e00] hover:underline mt-1">+ Add Stack No.</button>
   </div>
 )}

 {productionType === 'Paddy Drying' && (
  <div className="grid grid-cols-1 gap-4">
    <div>
      <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Expected Outcome <span className="text-red-500">*</span></label>
      <input type="text" value="Dry Paddy" disabled className="w-full bg-[var(--bg-panel-hover)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] text-sm cursor-not-allowed opacity-70" />
    </div>
    <div>
      <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Target Stack No. (Routing to) <span className="text-red-500">*</span></label>
      <input type="text" name="paddyDryingTargetStack" value={formData.paddyDryingTargetStack || ''} onChange={handleInputChange} placeholder="e.g. 101" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none" />
    </div>
    <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--border-subtle)]">
      <button onClick={() => setFormData(prev => ({...prev, paddyDryingTargetStack: '', batchNo: generateBatchNo()}))} className="flex-1 py-2 bg-[var(--bg-panel-alt)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-main)] rounded font-bold text-sm transition-colors border border-[var(--border-subtle)]">Reset</button>
      <button onClick={handleCreateBatch} disabled={loading} className="flex-[2] py-2 bg-[#e67e00] hover:bg-[#cc7000] text-black rounded font-bold text-sm transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50">
        {loading ? 'Creating...' : 'Create Batch'}
      </button>
    </div>
  </div>
 )}

 {productionType === 'Rice Milling' && (
  <>
   <div className="grid grid-cols-2 gap-4">
   <div>
   <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Paddy Type <span className="text-red-500">*</span></label>
    <select name="paddyType" value={formData.paddyType} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none">
      <option value="PR-11 (Steam)">PR-11 (Steam)</option>
      <option value="Raw">Raw</option>
    </select>
   </div>
   <div>
   <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Variety</label>
   <input type="text" name="variety" value={formData.variety} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none" />
   </div>
   </div>
   <div className="grid grid-cols-2 gap-4">
   <div>
   <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Paddy Source</label>
   <input type="text" name="paddySource" value={formData.paddySource} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none" />
   </div>
   <div>
    <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Moisture (%) *</label>
    <input 
      type="number"
      step="0.1" 
      value={formData.moisture} 
      onChange={e => setFormData({...formData, moisture: e.target.value})}
      required
      className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm focus:border-amber-500 focus:outline-none text-[var(--text-main)]" 
      placeholder="e.g. 14.5" 
    />
   </div>
   
   </div>
 
 <div className="col-span-2 mt-4 pt-4 border-t border-[var(--border-subtle)]">
  <h3 className="text-sm font-bold text-[var(--text-main)] mb-3">Additional Outputs (Bags)</h3>
  <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-[var(--bg-panel-alt)] mb-4">
    <table className="w-full table-fixed text-left text-xs">
      <thead className="bg-[var(--glass-bg)] border-b border-[var(--border-subtle)]">
        <tr>
          <th className="px-4 py-2 font-medium text-[var(--text-muted-alt)] w-[15%]">Output Name</th>
          <th className="px-2 py-2 font-medium text-[var(--text-muted-alt)] w-[12%]">Current Stock</th>
          <th className="px-1 py-2 font-medium text-[var(--text-muted-alt)] w-[25%]"></th>
          <th className="px-2 py-2 font-medium text-[var(--text-muted-alt)] w-[24%]">Produced (Bags)</th>
          <th className="px-2 py-2 font-medium text-[var(--text-muted-alt)] w-[24%]">Self Consumed (Bags)</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border-subtle-alt)]">
        <tr className="hover:bg-[var(--glass-bg)]">
          <td className="px-4 py-2.5 font-medium text-[var(--text-main)]">R. Bran</td>
          <td className="px-4 py-2.5 font-bold text-[#e67e00]">
            <span title="Available in Warehouse">{currentStock['R. Bran'] || 0}</span>
          </td>
          <td className="px-4 py-2"></td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['R. Bran'].produced} onChange={(e) => handleAdditionalOutputChange('R. Bran', 'produced', e.target.value)} placeholder="Enter produced bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['R. Bran'].reused} onChange={(e) => handleAdditionalOutputChange('R. Bran', 'reused', e.target.value)} placeholder="Enter reused bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
        </tr>
        <tr className="hover:bg-[var(--glass-bg)]">
          <td className="px-4 py-2.5 font-medium text-[var(--text-main)]">K. Phuck</td>
          <td className="px-4 py-2.5 font-bold text-[#e67e00]">
            <span title="Available in Warehouse">{currentStock['K. Phuck'] || 0}</span>
          </td>
          <td className="px-4 py-2"></td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['K. Phuck'].produced} onChange={(e) => handleAdditionalOutputChange('K. Phuck', 'produced', e.target.value)} placeholder="Enter produced bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['K. Phuck'].reused} onChange={(e) => handleAdditionalOutputChange('K. Phuck', 'reused', e.target.value)} placeholder="Enter reused bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
        </tr>
        <tr className="hover:bg-[var(--glass-bg)]">
          <td className="px-4 py-2.5 font-medium text-[var(--text-main)]">Broken Rice</td>
          <td className="px-4 py-2.5 font-bold text-[#e67e00]">
            <span title="Available in Warehouse">{currentStock['Broken Rice'] || 0}</span>
          </td>
          <td className="px-4 py-2"></td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Broken Rice'].produced} onChange={(e) => handleAdditionalOutputChange('Broken Rice', 'produced', e.target.value)} placeholder="Enter produced bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Broken Rice'].reused} onChange={(e) => handleAdditionalOutputChange('Broken Rice', 'reused', e.target.value)} placeholder="Enter reused bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
        </tr>
        <tr className="hover:bg-[var(--glass-bg)]">
          <td className="px-4 py-2.5 font-medium text-[var(--text-main)]">Nakku 1</td>
          <td className="px-4 py-2.5 font-bold text-[#e67e00]">
            <span title="Available in Warehouse">{currentStock['Nakku 1'] || 0}</span>
          </td>
          <td className="px-4 py-2"></td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Nakku 1'].produced} onChange={(e) => handleAdditionalOutputChange('Nakku 1', 'produced', e.target.value)} placeholder="Enter produced bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Nakku 1'].reused} onChange={(e) => handleAdditionalOutputChange('Nakku 1', 'reused', e.target.value)} placeholder="Enter reused bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
        </tr>
        <tr className="hover:bg-[var(--glass-bg)]">
          <td className="px-4 py-2.5 font-medium text-[var(--text-main)]">Nakku 2</td>
          <td className="px-4 py-2.5 font-bold text-[#e67e00]">
            <span title="Available in Warehouse">{currentStock['Nakku 2'] || 0}</span>
          </td>
          <td className="px-4 py-2"></td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Nakku 2'].produced} onChange={(e) => handleAdditionalOutputChange('Nakku 2', 'produced', e.target.value)} placeholder="Enter produced bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Nakku 2'].reused} onChange={(e) => handleAdditionalOutputChange('Nakku 2', 'reused', e.target.value)} placeholder="Enter reused bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
        </tr>
        <tr className="hover:bg-[var(--glass-bg)]">
          <td className="px-4 py-2.5 font-medium text-[var(--text-main)]">Rejection</td>
          <td className="px-4 py-2.5 font-bold text-[#e67e00]">
            <span title="Available in Warehouse">{currentStock['Rejection'] || 0}</span>
          </td>
          <td className="px-4 py-2"></td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Rejection'].produced} onChange={(e) => handleAdditionalOutputChange('Rejection', 'produced', e.target.value)} placeholder="Enter produced bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Rejection'].reused} onChange={(e) => handleAdditionalOutputChange('Rejection', 'reused', e.target.value)} placeholder="Enter reused bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
        </tr>
        <tr className="hover:bg-[var(--glass-bg)]">
          <td className="px-4 py-2.5 font-medium text-[var(--text-main)]">Final Rice</td>
          <td className="px-4 py-2.5 font-bold text-[#e67e00]">
            <span title="Available in Warehouse">{currentStock['Final Rice'] || 0}</span>
          </td>
          <td className="px-4 py-2"></td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Final Rice'].produced} onChange={(e) => handleAdditionalOutputChange('Final Rice', 'produced', e.target.value)} placeholder="Enter produced bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Final Rice'].reused} onChange={(e) => handleAdditionalOutputChange('Final Rice', 'reused', e.target.value)} placeholder="Enter reused bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
        </tr>
        <tr className="hover:bg-[var(--glass-bg)]">
          <td className="px-4 py-2.5 font-medium text-[var(--text-main)]">Mansoori</td>
          <td className="px-4 py-2.5 font-bold text-[#e67e00]">
            <span title="Available in Warehouse">{currentStock['Mansoori'] || 0}</span>
          </td>
          <td className="px-4 py-2"></td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Mansoori'].produced} onChange={(e) => handleAdditionalOutputChange('Mansoori', 'produced', e.target.value)} placeholder="Enter consumed bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Mansoori'].reused} onChange={(e) => handleAdditionalOutputChange('Mansoori', 'reused', e.target.value)} placeholder="Enter reused bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
        </tr>
        <tr className="hover:bg-[var(--glass-bg)]">
          <td className="px-4 py-2.5 font-medium text-[var(--text-main)]">Wand</td>
          <td className="px-4 py-2.5 font-bold text-[#e67e00]">
            <span title="Available in Warehouse">{currentStock['Wand'] || 0}</span>
          </td>
          <td className="px-1 py-2">
            <input type="number" min="0" value={(formData.additionalOutputs['Wand'] as any).wandProduced || ''} onChange={(e) => handleAdditionalOutputChange('Wand', 'wandProduced', e.target.value)} placeholder="Enter produced bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Wand'].produced} onChange={(e) => handleAdditionalOutputChange('Wand', 'produced', e.target.value)} placeholder="Enter consumed bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Wand'].reused} onChange={(e) => handleAdditionalOutputChange('Wand', 'reused', e.target.value)} placeholder="Enter reused bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
        </tr>
        <tr className="hover:bg-[var(--glass-bg)]">
          <td className="px-4 py-2.5 font-medium text-[var(--text-main)]">Parmal</td>
          <td className="px-4 py-2.5 font-bold text-[#e67e00]">
            <span title="Available in Warehouse">{currentStock['Parmal'] || 0}</span>
          </td>
          <td className="px-4 py-2"></td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Parmal'].produced} onChange={(e) => handleAdditionalOutputChange('Parmal', 'produced', e.target.value)} placeholder="Enter consumed bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Parmal'].reused} onChange={(e) => handleAdditionalOutputChange('Parmal', 'reused', e.target.value)} placeholder="Enter reused bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
        </tr>
        <tr className="hover:bg-[var(--glass-bg)]">
          <td className="px-4 py-2.5 font-medium text-[var(--text-main)]">FRK</td>
          <td className="px-4 py-2.5 font-bold text-[#e67e00]">
            <span title="Available in Warehouse">{currentStock['FRK'] || 0}</span>
          </td>
          <td className="px-4 py-2"></td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['FRK'].produced} onChange={(e) => handleAdditionalOutputChange('FRK', 'produced', e.target.value)} placeholder="Enter consumed bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['FRK'].reused} onChange={(e) => handleAdditionalOutputChange('FRK', 'reused', e.target.value)} placeholder="Enter reused bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
        </tr>
        <tr className="hover:bg-[var(--glass-bg)]">
          <td className="px-4 py-2.5 font-medium text-[var(--text-main)]">Dry Paddy</td>
          <td className="px-4 py-2.5 font-bold text-[#e67e00]">
            <span title="Available in Warehouse">{currentStock['Dry Paddy'] || 0}</span>
          </td>
          <td className="px-4 py-2">
            <div className="flex gap-2">
               <input type="number" step="0.1" value={(formData.additionalOutputs['Dry Paddy'] as any).moisture || ''} onChange={(e) => handleAdditionalOutputChange('Dry Paddy', 'moisture', e.target.value)} placeholder="Moisture %" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
               <input type="text" value={(formData.additionalOutputs['Dry Paddy'] as any).targetStack || ''} onChange={(e) => handleAdditionalOutputChange('Dry Paddy', 'targetStack', e.target.value)} placeholder="Stack No." className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
            </div>
          </td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Dry Paddy'].produced} onChange={(e) => handleAdditionalOutputChange('Dry Paddy', 'produced', e.target.value)} placeholder="Enter produced bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
          <td className="px-4 py-2">
            <input type="number" min="0" value={formData.additionalOutputs['Dry Paddy'].reused} onChange={(e) => handleAdditionalOutputChange('Dry Paddy', 'reused', e.target.value)} placeholder="Enter reused bags" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
  </>
 )}
 {productionType === 'Intermill Processing' && (
  <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
    <div className="bg-[var(--bg-base)] p-4 rounded-lg border border-[var(--border-subtle)] mb-6">
      <h4 className="font-bold text-[var(--text-main)] mb-4">Input Material</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Raw Material</label>
          <select value={intermillData.rawMaterialId} onChange={e => setIntermillData({...intermillData, rawMaterialId: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]">
            <option value="">Select Material...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Input Quantity (Bags)</label>
          <input type="number" value={intermillData.inputBags} onChange={e => setIntermillData({...intermillData, inputBags: e.target.value})} placeholder="e.g. 100" className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" />
        </div>
      </div>
    </div>

    {products.find(p => p.id === intermillData.rawMaterialId)?.name?.toLowerCase().includes('paddy') && (
         <div className="bg-[var(--bg-base)] p-4 rounded-lg border border-[var(--border-subtle)] mb-6">
            <h4 className="font-bold text-[var(--text-main)] mb-4">Input Material (Paddy Stack Selection)</h4>
            {formData.stackInputs.map((stack, idx) => (
               <div key={idx} className="flex gap-4 mb-3 items-center">
                  <div className="flex-1">
                     <input type="text" placeholder="Stack No." value={stack.stackNo} onChange={(e) => {
                        const newInputs = [...formData.stackInputs];
                        newInputs[idx].stackNo = e.target.value;
                        setFormData(prev => ({...prev, stackInputs: newInputs}));
                     }} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none" />
                  </div>
                  
                  <label className="flex items-center gap-2 text-sm text-[var(--text-main)]">
                     <input type="checkbox" checked={stack.isDirectUnload} onChange={(e) => {
                       const newInputs = [...formData.stackInputs];
                       newInputs[idx].isDirectUnload = e.target.checked;
                       if(e.target.checked) newInputs[idx].bags = '';
                       setFormData(prev => ({...prev, stackInputs: newInputs}));
                     }} className="accent-[#e67e00] w-4 h-4 bg-[var(--bg-panel)] border-[var(--border-subtle)]" /> Direct Unload
                  </label>
      
                  {!stack.isDirectUnload && (
                     <div className="flex-1">
                       <input type="number" placeholder="Bags Consumed" value={stack.bags} onChange={(e) => {
                          const newInputs = [...formData.stackInputs];
                          newInputs[idx].bags = e.target.value;
                          setFormData(prev => ({...prev, stackInputs: newInputs}));
                       }} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none" />
                     </div>
                  )}
                  
                  <button onClick={() => {
                     const newInputs = formData.stackInputs.filter((_, i) => i !== idx);
                     setFormData(prev => ({...prev, stackInputs: newInputs}));
                  }} className="text-red-500 font-bold hover:text-red-400 px-2 text-lg" title="Remove">&times;</button>
               </div>
            ))}
            {formData.stackInputs.length === 0 && (
               <p className="text-xs text-[var(--text-muted-alt)] mb-2 italic">No stacks added. Please add at least one stack.</p>
            )}
            <button onClick={() => setFormData(prev => ({...prev, stackInputs: [...prev.stackInputs, {stackNo: '', bags: '', isDirectUnload: false}]}))} className="text-sm font-bold text-[#e67e00] hover:underline mt-1">+ Add Stack No.</button>
         </div>
      )}

    <div className="bg-[var(--bg-base)] p-4 rounded-lg border border-[var(--border-subtle)] mb-6">
      <h4 className="font-bold text-[var(--text-main)] mb-4">Select Expected Output Products</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {INTERMILL_ITEMS.map(item => (
          <label key={item} className="flex items-center gap-2 text-sm text-[var(--text-main)]">
            <input 
              type="checkbox" 
              checked={!!selectedOutputs[item]} 
              onChange={e => {
                if (e.target.checked) {
                  setSelectedOutputs({...selectedOutputs, [item]: true});
                  setOutputQuantities({...outputQuantities, [item]: ''});
                } else {
                  const newSelected = {...selectedOutputs};
                  delete newSelected[item];
                  setSelectedOutputs(newSelected);
                  
                  const newQuantities = {...outputQuantities};
                  delete newQuantities[item];
                  setOutputQuantities(newQuantities);
                }
              }} 
              className="accent-[#e67e00] w-4 h-4 bg-[var(--bg-panel)] border-[var(--border-subtle)]" 
            />
            {item}
          </label>
        ))}
      </div>
    </div>

    {Object.keys(selectedOutputs).some(id => selectedOutputs[id]) && intermillData.rawMaterialId && intermillData.inputBags && (
      <div className="bg-[var(--bg-base)] p-4 rounded-lg border border-[var(--border-subtle)] mb-6 overflow-x-auto">
        <h4 className="font-bold text-[var(--text-main)] mb-6 text-center">Output Processing Details</h4>
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start justify-center py-4">
          
          {/* Left Side: Input */}
          <div className="bg-[#e67e00]/20 border border-[#e67e00]/50 p-4 rounded-xl flex flex-col items-center justify-center min-w-[150px] shadow-lg shadow-amber-500/10">
            <span className="text-xs text-[var(--text-muted-alt)] mb-1">Raw Material</span>
            <span className="font-bold text-[#e67e00] text-center mb-2">
              {products.find(p => p.id === intermillData.rawMaterialId)?.name || intermillData.rawMaterialId}
            </span>
            <span className="bg-[#e67e00] text-black text-xs font-bold px-2 py-1 rounded">
              {intermillData.inputBags} Bags
            </span>
          </div>

          {/* Lines */}
          <div className="hidden md:flex flex-col justify-center text-[var(--border-subtle)] font-light -mx-2 h-full py-4 relative min-h-[100px]">
            <svg width="40" height="100%" style={{ minHeight: '100px' }} className="stroke-[var(--border-subtle)]">
               <path d="M 0 50% L 40 50%" strokeWidth="2" fill="none" />
            </svg>
          </div>

          {/* Right Side: Outputs */}
          <div className="flex flex-col gap-3 justify-center">
            {Object.keys(selectedOutputs).filter(id => selectedOutputs[id]).map(id => (
              <div key={id} className="flex items-center gap-4 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] p-2 rounded-lg min-w-[250px]">
                <p className="flex-1 font-medium text-[var(--text-main)]">{id}</p>
                <input 
                  type="number" 
                  placeholder="0" 
                  value={outputQuantities[id] || ''}
                  onChange={e => setOutputQuantities({...outputQuantities, [id]: e.target.value})}
                  className="w-24 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-sm text-[var(--text-main)] text-right focus:border-[#e67e00] outline-none"
                />
                <span className="text-xs text-[var(--text-muted-alt)]">Bags</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Calculates Block */}
        <div className="mt-8 border-t border-[var(--border-subtle)] pt-6 flex justify-center">
          <div className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg p-5 min-w-[300px]">
            <h4 className="text-sm font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-[#e67e00] rounded-full"></div> System Calculates
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted-alt)]">Total Input</span>
                <span className="font-bold text-[var(--text-main)]">{intermillData.inputBags} Bags</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted-alt)]">Total Output</span>
                <span className="font-bold text-[var(--text-main)]">
                  {Object.keys(selectedOutputs).filter(id => selectedOutputs[id]).reduce((sum, id) => sum + (Number(outputQuantities[id]) || 0), 0)} Bags
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--border-subtle)] pt-2 mt-2">
                <span className="text-[var(--text-muted-alt)]">Process Loss</span>
                <span className="font-bold text-red-500">
                  {Math.max(0, Number(intermillData.inputBags) - Object.keys(selectedOutputs).filter(id => selectedOutputs[id]).reduce((sum, id) => sum + (Number(outputQuantities[id]) || 0), 0))} Bags
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted-alt)]">Yield %</span>
                <span className="font-bold text-green-500">
                  {(Number(intermillData.inputBags) > 0 ? (Object.keys(selectedOutputs).filter(id => selectedOutputs[id]).reduce((sum, id) => sum + (Number(outputQuantities[id]) || 0), 0) / Number(intermillData.inputBags)) * 100 : 0).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    )}
   </div>
  )}
  <div className="col-span-2">
    <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Remarks</label>
    <textarea rows={2} name="remarks" value={formData.remarks} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none"></textarea>
  </div>
  <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--border-subtle)]">
    <button onClick={() => setFormData(prev => ({...prev, paddyUsedQty: '', moisture: '', batchNo: generateBatchNo(), additionalOutputs: { 'R. Bran': { produced: '', reused: '' }, 'K. Phuck': { produced: '', reused: '' }, 'Broken Rice': { produced: '', reused: '' }, 'Nakku 1': { produced: '', reused: '' }, 'Nakku 2': { produced: '', reused: '' }, 'Rejection': { produced: '', reused: '' }, 'Final Rice': { produced: '', reused: '' }, 'Mansoori': { produced: '', reused: '' }, 'Wand': { produced: '', reused: '', wandProduced: '' }, 'Parmal': { produced: '', reused: '' }, 'FRK': { produced: '', reused: '' } }}))} className="flex-1 py-2 bg-[var(--bg-panel-alt)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-main)] rounded font-bold text-sm transition-colors border border-[var(--border-subtle)]">Reset</button>
    <button onClick={productionType === 'Rice Milling' ? handleCreateBatch : handleCreateIntermillBatch} disabled={loading} className="flex-[2] py-2 bg-[#e67e00] hover:bg-[#cc7000] text-black rounded font-bold text-sm transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50">
      {loading ? 'Creating...' : 'Create Batch'}
    </button>
  </div>
</div>

{/* 2. Batch Summary Container */}
 {/* <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col h-full">
 <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
 <h2 className="text-lg font-bold text-[var(--text-main)]">2. Batch Summary</h2>
          {batches.length > 0 ? (
            <select id="batchSummarySelect" name="batchSummarySelect" autoComplete="off" data-lpignore="true" value={selectedBatchId || ''} onChange={e => setSelectedBatchId(e.target.value)} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs px-2 py-1 rounded text-[var(--text-main)] outline-none focus:border-[#e67e00]">
              {batches.map(b => (
   <option key={b.id} value={b.id}>{b.batchNo}</option>
 ))}
 </select>
 ) : (
 <span className="text-xs text-[var(--text-muted-alt)]">No batches</span>
 )}
 </div>
 
 {selectedBatch ? (
 <div className="space-y-4 text-sm flex-1 bg-[var(--bg-base)] border border-[var(--border-subtle-alt)] rounded-xl p-4">
 <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-2">
 <span className="text-[var(--text-muted-alt)]">Batch No.</span>
 <span className="font-mono font-medium text-[var(--text-main)]">{selectedBatch.batchNo}</span>
 </div>
 <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-2">
 <span className="text-[var(--text-muted-alt)]">Start Time</span>
 <span className="text-[var(--text-main)]">{new Date(selectedBatch.startTime || selectedBatch.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
 </div>
 <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-2">
 <span className="text-[var(--text-muted-alt)]">Status</span>
 <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">{selectedBatch.status}</span>
 </div>
 <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-2">
 <span className="text-[var(--text-muted-alt)]">Paddy Used</span>
 <span className="text-[var(--text-main)]">{selectedBatch.paddyUsedQty?.toFixed(3) || '0.000'} MT</span>
 </div>
 <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-2">
 <span className="text-[var(--text-muted-alt)]">Rice Produced</span>
 <span className="text-[var(--text-main)]">{selectedBatch.riceProducedQty?.toFixed(3) || '0.000'} MT</span>
 </div>
 <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-2">
 <span className="text-[var(--text-muted-alt)]">By-products</span>
 <span className="text-[var(--text-main)]">{(selectedBatch.byProducts?.reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0) || 0).toFixed(3)} MT</span>
 </div>
 <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-2">
 <span className="text-[var(--text-muted-alt)]">Process Loss</span>
 <span className="text-[var(--text-main)]">{(selectedBatch.processLoss?.totalLoss || 0).toFixed(3)} MT</span>
 </div>
 <div className="flex justify-between pt-1 items-center">
 <span className="font-bold text-[var(--text-main)] text-base">Yield</span>
 <span className="font-bold text-green-500 text-base">
 {selectedBatch.yieldReport?.overallRecovery?.toFixed(2) || '0.00'} %
 </span>
 </div>
 </div>
 ) : (
 <div className="flex-1 flex items-center justify-center text-center text-[var(--text-muted-alt)] py-10">Select or create a batch to view summary</div>
 )}
 </div> */}

 {/* 2. Batch Analysis Container (Replaces Batch Summary) */}
 <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col h-full overflow-y-auto">
   <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
     <h2 className="text-lg font-bold text-[var(--text-main)]">2. Batch Analysis</h2>
     {batches.length > 0 ? (
       <select id="batchAnalysisSelect" name="batchAnalysisSelect" autoComplete="off" data-lpignore="true" value={selectedBatchId || ''} onChange={e => setSelectedBatchId(e.target.value)} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs px-2 py-1 rounded text-[var(--text-main)] outline-none focus:border-[#e67e00]">
         <option value="">Select Batch...</option>
         {batches.map(b => (
           <option key={b.id} value={b.id}>{b.batchNo}</option>
         ))}
       </select>
     ) : (
       <span className="text-xs text-[var(--text-muted-alt)]">No batches</span>
     )}
   </div>
   
   <div className="space-y-4 text-sm flex-1">
     <div className="grid grid-cols-2 gap-3">
       <div>
         <label className="block text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">Paddy Moisture</label>
         <input type="number" step="0.1" disabled={!selectedBatchId} placeholder="e.g. 14.05%" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)] focus:border-[#e67e00] outline-none disabled:opacity-50" value={analysisFormData.paddyMoisture} onChange={e => setAnalysisFormData({...analysisFormData, paddyMoisture: e.target.value})} />
       </div>
         <div>
           <label className="block text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">Khanjan Broken</label>
           <input type="number" step="0.1" disabled={!selectedBatchId} placeholder="e.g. 2.5" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)] focus:border-[#e67e00] outline-none disabled:opacity-50" value={analysisFormData.khanjanBroken} onChange={e => setAnalysisFormData({...analysisFormData, khanjanBroken: e.target.value})} />
         </div>
         <div>
           <label className="block text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">Polisher 1 (%)</label>
           <input type="number" step="0.1" disabled={!selectedBatchId} placeholder="e.g. 12.5%" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)] focus:border-[#e67e00] outline-none disabled:opacity-50" value={analysisFormData.polisher1} onChange={e => setAnalysisFormData({...analysisFormData, polisher1: e.target.value})} />
         </div>
         <div>
           <label className="block text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">Polisher 2 (%)</label>
           <input type="number" step="0.1" disabled={!selectedBatchId} placeholder="e.g. 12.5%" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)] focus:border-[#e67e00] outline-none disabled:opacity-50" value={analysisFormData.polisher2} onChange={e => setAnalysisFormData({...analysisFormData, polisher2: e.target.value})} />
         </div>
         <div>
           <label className="block text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">Polisher 3 (%)</label>
           <input type="number" step="0.1" disabled={!selectedBatchId} placeholder="e.g. 12.5%" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)] focus:border-[#e67e00] outline-none disabled:opacity-50" value={analysisFormData.polisher3} onChange={e => setAnalysisFormData({...analysisFormData, polisher3: e.target.value})} />
         </div>
         <div>
           <label className="block text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">Polisher 4 (%)</label>
           <input type="number" step="0.1" disabled={!selectedBatchId} placeholder="e.g. 12.5%" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)] focus:border-[#e67e00] outline-none disabled:opacity-50" value={analysisFormData.polisher4} onChange={e => setAnalysisFormData({...analysisFormData, polisher4: e.target.value})} />
         </div>
         <div className="col-span-2">
           <label className="block text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">Difference 1-4 (%)</label>
           <div className={`w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs font-bold ${!selectedBatchId ? 'opacity-50 text-[var(--text-muted)]' : 'text-amber-500'}`}>
             {(analysisFormData.polisher1 && analysisFormData.polisher4) ? Math.abs(Number(analysisFormData.polisher1) - Number(analysisFormData.polisher4)).toFixed(2) : '-'}
           </div>
         </div>
         <div>
           <label className="block text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">Pamala Broken</label>
           <input type="number" step="0.1" disabled={!selectedBatchId} placeholder="e.g. 2.5" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)] focus:border-[#e67e00] outline-none disabled:opacity-50" value={analysisFormData.pamalaBroken} onChange={e => setAnalysisFormData({...analysisFormData, pamalaBroken: e.target.value})} />
         </div>
         <div>
           <label className="block text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">Final Broken</label>
           <input type="number" step="0.1" disabled={!selectedBatchId} placeholder="e.g. 2.5" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)] focus:border-[#e67e00] outline-none disabled:opacity-50" value={analysisFormData.finalBroken} onChange={e => setAnalysisFormData({...analysisFormData, finalBroken: e.target.value})} />
         </div>
         <div>
           <label className="block text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">Rice Moisture</label>
           <input type="number" step="0.1" disabled={!selectedBatchId} placeholder="e.g. 12.0%" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)] focus:border-[#e67e00] outline-none disabled:opacity-50" value={analysisFormData.riceMoisture} onChange={e => setAnalysisFormData({...analysisFormData, riceMoisture: e.target.value})} />
         </div>
         <div>
           <label className="block text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">Damage %</label>
           <input type="number" step="0.1" disabled={!selectedBatchId} placeholder="e.g. 1.5%" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)] focus:border-[#e67e00] outline-none disabled:opacity-50" value={analysisFormData.damagePercent} onChange={e => setAnalysisFormData({...analysisFormData, damagePercent: e.target.value})} />
         </div>
         <div>
           <label className="block text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">Discolour %</label>
           <input type="number" step="0.1" disabled={!selectedBatchId} placeholder="e.g. 0.5%" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)] focus:border-[#e67e00] outline-none disabled:opacity-50" value={analysisFormData.discolourPercent} onChange={e => setAnalysisFormData({...analysisFormData, discolourPercent: e.target.value})} />
         </div>
         <div>
           <label className="block text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">FRK %</label>
           <input type="number" step="0.1" disabled={!selectedBatchId} placeholder="e.g. 1.0%" className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)] focus:border-[#e67e00] outline-none disabled:opacity-50" value={analysisFormData.frkPercent} onChange={e => setAnalysisFormData({...analysisFormData, frkPercent: e.target.value})} />
         </div>
       </div>
       <button onClick={handleSaveAnalysis} disabled={loading || !selectedBatchId} className="w-full mt-4 py-2 bg-[#e67e00] hover:bg-[#cc7000] text-black rounded font-bold text-sm transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50">
         {loading ? 'Saving...' : 'Save Analysis'}
       </button>
       {!selectedBatchId && (
         <p className="text-[10px] text-center text-[var(--text-muted-alt)] mt-2">Create and select a batch to fill analysis</p>
       )}
     </div>
 </div>
 </div>

{false && (
  <>
  {/* Bottom Row: Yield Breakdown */}
  <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col w-full">
 <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
 <h2 className="text-lg font-bold text-[var(--text-main)]">3. Yield Breakdown</h2>
          {batches.length > 0 && (
            <select id="yieldBreakdownSelect" name="yieldBreakdownSelect" autoComplete="off" data-lpignore="true" value={selectedBatchId || ''} onChange={e => setSelectedBatchId(e.target.value)} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs px-2 py-1 rounded text-[var(--text-main)] outline-none focus:border-[#e67e00]">
              {batches.map(b => (
   <option key={b.id} value={b.id}>{b.batchNo}</option>
 ))}
 </select>
 )}
 </div>
 
 {selectedBatch ? (
 <div className="flex flex-col lg:flex-row items-center gap-10 bg-[var(--bg-base)] border border-[var(--border-subtle-alt)] rounded-xl p-6">
 {yieldBreakdownData.length > 0 ? (
 <>
 {/* Donut Chart (Left Side) */}
 <div className="w-full lg:w-1/3 h-64 relative">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={yieldBreakdownData}
 cx="50%"
 cy="50%"
 innerRadius={70}
 outerRadius={95}
 paddingAngle={2}
 dataKey="value"
 stroke="none"
 >
 {yieldBreakdownData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
 </PieChart>
 </ResponsiveContainer>
 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
 <span className="text-3xl font-bold text-[var(--text-main)]">{selectedBatch.yieldReport?.overallRecovery?.toFixed(2)}%</span>
 <span className="text-[11px] text-[var(--text-muted-alt)] uppercase tracking-wider mt-1">Overall Yield</span>
 </div>
 </div>
 
 {/* Legend (Right Side) */}
 <div className="w-full lg:w-2/3 flex flex-col gap-3">
 {yieldBreakdownData.map((item, i) => {
 const qty = ((item.value / 100) * (selectedBatch.paddyUsedQty || 0)).toFixed(3);
 return (
 <div key={i} className="flex items-center justify-between border-b border-[var(--border-subtle-alt)] pb-3 last:border-0">
 <div className="flex items-center gap-3">
 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
 <span className="text-[var(--text-muted)] font-medium text-sm">{item.name}</span>
 </div>
 <div className="flex items-center gap-8">
 <span className="text-[var(--text-muted-alt)] font-mono text-sm w-20 text-right">{qty} MT</span>
 <span className="font-bold text-[var(--text-main)] text-sm w-16 text-right">{item.value.toFixed(2)}%</span>
 </div>
 </div>
 );
 })}
 </div>
 </>
 ) : (
 <div className="flex flex-col items-center justify-center gap-2 flex-1 text-[var(--text-muted-alt)] py-12">
   <p>No yield data yet.</p>
   <p className="text-xs opacity-60">Register output above to calculate yield.</p>
 </div>
 )}
 </div>
 ) : (
 <div className="flex-1 flex items-center justify-center text-center text-[var(--text-muted-alt)] py-12">Select or create a batch to view breakdown</div>
 )}
 
  <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex justify-end">
    <button className="flex items-center gap-2 border border-[var(--border-subtle)] text-[var(--text-main)] hover:bg-[var(--glass-bg)] px-4 py-2 rounded font-medium text-sm transition-colors">
      <Printer size={16} /> Print Batch Report
    </button>
  </div>
</div>
</>
)}
</div>
)}

{activeTab === 'production_tracking' && (
 <div className="grid grid-cols-1 gap-6">
 {/* 2. Production Tracking */}
 <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col">
 <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
 <h2 className="text-lg font-bold text-[var(--text-main)]">2. Production Tracking</h2>
 <div className="flex gap-2 items-center">
  <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({...f, dateFrom: e.target.value}))} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs px-2 py-1 rounded text-[var(--text-main)]" />
  <span className="text-xs text-[var(--text-muted-alt)]">to</span>
  <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({...f, dateTo: e.target.value}))} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs px-2 py-1 rounded text-[var(--text-main)]" />
  <select value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs px-2 py-1 rounded text-[var(--text-main)]">
  <option value="">All Batches</option>
  <option value="In Progress">In Progress</option>
  <option value="Completed">Completed</option>
  </select>
  <button onClick={() => {
    const data = batches.map(b => ({
      BatchNo: b.batchNo,
      StartTime: new Date(b.startTime || b.createdAt).toLocaleString(),
      PaddyUsed: b.paddyUsedQty?.toFixed(3),
      RiceProduced: b.riceProducedQty?.toFixed(3),
      Status: b.status,
      Progress: b.progress
    }));
    exportToPDF('Production Batches', ['Batch No.', 'Start Time', 'Paddy Used (MT)', 'Rice Produced (MT)', 'Status', 'Progress (%)'], data.map(d => Object.values(d)), 'production_batches.pdf');
  }} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-2 py-1 rounded text-xs flex gap-1 items-center font-bold">
    <Download size={14} /> PDF
  </button>
  <button onClick={() => {
    const data = batches.map(b => ({
      BatchNo: b.batchNo,
      StartTime: new Date(b.startTime || b.createdAt).toLocaleString(),
      PaddyUsed: b.paddyUsedQty?.toFixed(3),
      RiceProduced: b.riceProducedQty?.toFixed(3),
      Status: b.status,
      Progress: b.progress
    }));
    exportToExcel(data, 'production_batches.xlsx');
  }} className="bg-green-500/10 text-green-500 hover:bg-green-500/20 px-2 py-1 rounded text-xs flex gap-1 items-center font-bold">
    <Download size={14} /> Excel
  </button>
 </div>
 </div>
 <div className="flex-1 overflow-auto">
 <table className="w-full text-xs">
 <thead>
 <tr className="text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)]">
 <th className="pb-2 text-left">Batch No.</th>
 <th className="pb-2 text-left">Start Time</th>
 <th className="pb-2 text-right">Paddy (MT)</th>
 <th className="pb-2 text-right">Rice (MT)</th>
 <th className="pb-2 text-center">Status</th>
 <th className="pb-2 text-center">Progress</th>
 </tr>
 </thead>
 <tbody>
 {batches.length === 0 && (
 <tr><td colSpan={6} className="py-4 text-center text-[var(--text-muted-alt)]">No batches found</td></tr>
 )}
 {batches.map((b, i) => (
 <tr key={i} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)]">
 <td className="py-3 font-mono">{b.batchNo}</td>
 <td className="py-3">{new Date(b.startTime || b.createdAt).toLocaleString()}</td>
 <td className="py-3 text-right font-medium">{b.paddyUsedQty?.toFixed(3) || '0.000'}</td>
 <td className="py-3 text-right font-medium">{b.riceProducedQty?.toFixed(3) || '0.000'}</td>
 <td className="py-3 text-center">
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${b.status === 'In Progress' ? 'bg-blue-900/50 text-blue-400' : 'bg-green-900/50 text-green-400'}`}>
 {b.status || 'In Progress'}
 </span>
 </td>
 <td className="py-3">
 <div className="flex items-center gap-2">
 <div className="w-full h-1.5 bg-[var(--bg-panel-hover)] rounded-full overflow-hidden">
 <div className="h-full bg-[#e67e00]" style={{ width: `${b.progress || 0}%` }}></div>
 </div>
 <span className="text-[10px]">{b.progress || 0}%</span>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--border-subtle)]">
 <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] p-2 rounded text-center">
 <div className="text-[10px] text-[var(--text-muted-alt)] uppercase">Total Paddy</div>
 <div className="font-bold text-sm">{metricsData?.totalPaddyUsed?.toFixed(3) || '0.000'} MT</div>
 </div>
 <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] p-2 rounded text-center">
 <div className="text-[10px] text-[var(--text-muted-alt)] uppercase">Total Rice</div>
 <div className="font-bold text-sm">{metricsData?.totalRiceProduced?.toFixed(3) || '0.000'} MT</div>
 </div>
 <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] p-2 rounded text-center">
 <div className="text-[10px] text-[var(--text-muted-alt)] uppercase">Avg Yield</div>
 <div className="font-bold text-sm text-[#e67e00]">{metricsData?.avgYield || '0.00'} %</div>
 </div>
 </div>
 </div>
 </div>
 )}

 {activeTab === 'process_loss' && (
 <div className="grid grid-cols-1 gap-6">
 {/* 3. Process Loss */}
 <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col">
 <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
 <h2 className="text-lg font-bold text-[var(--text-main)]">3. Process Loss</h2>
 <select className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs px-2 py-1 rounded text-[var(--text-main)]">
 <option>Today</option>
 </select>
 </div>
 
 <div className="grid grid-cols-2 gap-4 flex-1">
 <div className="flex flex-col text-xs">
 <div className="flex justify-between text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)] pb-1 mb-2">
 <span>Loss Type</span>
 <span>Qty (MT)</span>
 </div>
 {processLossData.length === 0 && (
 <div className="text-center text-[var(--text-muted-alt)] py-4">No process loss data for today.</div>
 )}
 {processLossData.map((loss, i) => (
 <div key={i} className="flex justify-between py-1.5 border-b border-[var(--border-subtle-alt)]">
 <span className="flex items-center gap-1">
 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: loss.color }}></div>
 {loss.name}
 </span>
 <span className="font-medium">{loss.value.toFixed(3)}</span>
 </div>
 ))}
 <div className="flex justify-between py-2 font-bold text-red-400 mt-auto border-t border-[var(--border-subtle)]">
 <span>Total</span>
 <span>{totalProcessLoss.toFixed(3)} MT</span>
 </div>
 </div>
 <div className="h-full flex items-center justify-center">
 {processLossData.length > 0 ? (
 <ResponsiveContainer width="100%" height="100%" minHeight={150}>
 <PieChart>
 <Pie
 data={processLossData}
 cx="50%"
 cy="50%"
 innerRadius={40}
 outerRadius={60}
 paddingAngle={2}
 dataKey="value"
 >
 {processLossData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} itemStyle={{ color: '#fff' }} />
 </PieChart>
 </ResponsiveContainer>
 ) : (
 <div className="text-[var(--text-muted-alt)]">No Chart Data</div>
 )}
 </div>
 </div>
 </div>
 </div>
 )}

 {activeTab === 'intermill_history' && (
  <div className="grid grid-cols-1 gap-6">
    <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
        <h2 className="text-lg font-bold text-[var(--text-main)]">Intermill Batch History</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[var(--bg-panel-alt)] border-b border-[var(--border-subtle)]">
            <tr>
              <th className="p-3 text-[var(--text-muted-alt)] font-medium">Batch No</th>
              <th className="p-3 text-[var(--text-muted-alt)] font-medium">Date / Shift</th>
              <th className="p-3 text-[var(--text-muted-alt)] font-medium">Input Material</th>
              <th className="p-3 text-[var(--text-muted-alt)] font-medium">Input Bags</th>
              <th className="p-3 text-[var(--text-muted-alt)] font-medium">Status</th>
              <th className="p-3 text-[var(--text-muted-alt)] font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {intermillBatches.map((batch: any) => (
              <tr key={batch.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-panel-hover)]">
                <td className="p-3 text-[var(--text-main)] font-medium">{batch.batchNo}</td>
                <td className="p-3 text-[var(--text-main)]">{new Date(batch.date).toLocaleDateString()} / {batch.shift}</td>
                <td className="p-3 text-[var(--text-main)]">{batch.rawMaterial?.name}</td>
                <td className="p-3 text-[var(--text-main)]">{batch.inputBags}</td>
                <td className="p-3">
                  {batch.status === 'COMPLETED' ? (
                    <span className="flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-1 rounded w-max"><CheckCircle className="w-4 h-4"/> Completed</span>
                  ) : (
                    <span className="flex items-center gap-1 text-orange-500 bg-orange-500/10 px-2 py-1 rounded w-max"><AlertCircle className="w-4 h-4"/> Pending Approval</span>
                  )}
                </td>
                <td className="p-3">
                  {batch.status === 'PENDING_APPROVAL' && user?.role === 'Admin' && (
                    <button onClick={() => approveIntermillBatch(batch.id)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs font-bold">Approve</button>
                  )}
                </td>
              </tr>
            ))}
            {intermillBatches.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[var(--text-muted)]">No intermill batches found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
 )}

 {activeTab === 'daily_stock_report' && <DailyStockReport />}
 {activeTab === 'shift_wise_report' && <ShiftWiseReport />}

 {activeTab === 'by-products' && (
 <div className="grid grid-cols-1 gap-6">
 {/* 4. By-products */}
 <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5">
 <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
 <h2 className="text-lg font-bold text-[var(--text-main)]">4. By-products</h2>
 <select className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs px-2 py-1 rounded text-[var(--text-main)]">
 <option>Today</option>
 </select>
 </div>
 <table className="w-full text-sm text-left">
 <thead>
 <tr className="text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)]">
 <th className="pb-2 font-medium">By-product</th>
 <th className="pb-2 font-medium">Quantity</th>
 <th className="pb-2 font-medium">Unit</th>
 <th className="pb-2 font-medium">Utilization</th>
 <th className="pb-2 font-medium">Remarks</th>
 </tr>
 </thead>
 <tbody>
 {byProducts.length === 0 && (
 <tr><td colSpan={5} className="py-4 text-center text-[var(--text-muted-alt)]">No by-products data for today</td></tr>
 )}
 {byProducts.map((p: any, i: number) => (
 <tr key={i} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)]">
 <td className="py-3 font-medium text-[var(--text-main)]">{p.name}</td>
 <td className="py-3">{p.quantity?.toFixed(3)}</td>
 <td className="py-3">{p.unit || 'MT'}</td>
 <td className="py-3 text-xs text-[var(--text-muted-alt)]">{p.utilization}</td>
 <td className="py-3 text-xs text-[var(--text-muted-alt)]">{p.remarks}</td>
 </tr>
 ))}
 </tbody>
 </table>
 <div className="mt-4 flex justify-between items-center text-sm">
 <div className="font-bold text-red-400">Total By-products: {totalByProducts.toFixed(3)} MT</div>
 <button className="text-[#e67e00] font-medium hover:underline text-xs">View All By-products →</button>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 );
};

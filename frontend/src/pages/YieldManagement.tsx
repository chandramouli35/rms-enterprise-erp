import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { 
 Calculator, LineChart, FileText, Download, TrendingUp, TrendingDown, 
 Target, Search, Calendar, Package, Droplet, Printer, Activity, Truck, Wheat, Percent
} from 'lucide-react';
import { 
 LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
 BarChart, Bar, AreaChart, Area, Cell
} from 'recharts';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import { usePlantStore } from '../store/plantStore';
import { useAuthStore } from '../store/authStore';
import { StockHealthReport } from '../components/Yield/StockHealthReport';
import { ConsignmentDispatchReport } from '../components/Yield/ConsignmentDispatchReport';
import { YieldMillCompare } from '../components/Yield/YieldMillCompare';
import { MillYieldBenchmarks } from '../components/Production/MillYieldBenchmarks';

export const YieldManagement = () => {
 const activePlant = usePlantStore(state => state.activePlant);
 const { user } = useAuthStore();
 const role = user?.role || '';
 const isAdminRole = role === 'ADMIN';
 const isSuperAdmin = role === 'SUPER_ADMIN';
 const canSeeBenchmarks = isSuperAdmin || isAdminRole;
 const [searchParams, setSearchParams] = useSearchParams();
 const activeTab = searchParams.get('tab') || (isAdminRole ? 'mill_yield_benchmarks' : 'yield_from_rice');

 useEffect(() => {
   // ADMIN: only Mill Yield Benchmarks — lock to that tab
   if (isAdminRole && activeTab !== 'mill_yield_benchmarks') {
     setSearchParams({ tab: 'mill_yield_benchmarks' }, { replace: true });
     return;
   }
   // Non-admin cannot open benchmarks
   if (activeTab === 'mill_yield_benchmarks' && !canSeeBenchmarks) {
     setSearchParams({ tab: 'yield_from_rice' }, { replace: true });
   }
 }, [activeTab, isAdminRole, canSeeBenchmarks, setSearchParams]);
 
 const [metricsData, setMetricsData] = useState<any>({});
 const [yieldTrendData, setYieldTrendData] = useState<any[]>([]);
 const [plantYieldData, setPlantYieldData] = useState<any[]>([]);
 const [batchYieldData, setBatchYieldData] = useState<any[]>([]);
 const [historicalReports, setHistoricalReports] = useState<any[]>([]);
 const [batches, setBatches] = useState<any[]>([]);
 const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
 
 useEffect(() => {
   if (notification) {
     const timer = setTimeout(() => setNotification(null), 3000);
     return () => clearTimeout(timer);
   }
 }, [notification]);

 const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', variety: '' });
 const [calcBatchInfo, setCalcBatchInfo] = useState<{batchNo: string, variety: string, date?: string}>({ batchNo: '', variety: '', date: '' });

 const [calcData, setCalcData] = useState({
   paddy: '',
   headRice: '',
   brokenRice: '',
   bran: '',
   husk: '',
   loss: ''
 });

 const handleCalcChange = (field: string, value: string) => {
   setCalcData(prev => ({ ...prev, [field]: value === '' ? '' : Number(value) }));
 };

 const calcTotalOutput = Number(calcData.headRice) + Number(calcData.brokenRice) + Number(calcData.bran) + Number(calcData.husk) + Number(calcData.loss);
 const calcRecovery = Number(calcData.paddy) > 0 ? ((calcTotalOutput / Number(calcData.paddy)) * 100) : 0;
 const calcStrokeOffset = 125 - (125 * (calcRecovery / 100));

 const fetchHistorical = async () => {
   try {
     const query = new URLSearchParams({ plantId: activePlant?.id || 'global' });
     if (filters.dateFrom) query.append('dateFrom', filters.dateFrom);
     if (filters.dateTo) query.append('dateTo', filters.dateTo);
     if (filters.variety) query.append('variety', filters.variety);
     
     const res = await api.get(`/yield/historical?${query.toString()}`);
     setHistoricalReports(res.data);
   } catch(e) {}
 };

  useEffect(() => {
    const plantId = activePlant?.id || 'global';
    
    if (activeTab === 'yield_calculator') {
      const fetchBatchesOnly = async () => {
        try {
          const batchesRes = await api.get(
            `/production/batches?plantId=${plantId}&limit=1000`,
          );
          const fetched = Array.isArray(batchesRes.data)
            ? batchesRes.data
            : batchesRes.data?.data || [];
          setBatches(fetched);
        } catch (err) {
          console.error("Failed to fetch batches data", err);
          setBatches([]);
        }
      };
      fetchBatchesOnly();
    }
    
    if (activeTab === 'yield_analytics') {
      const fetchAnalyticsOnly = async () => {
        try {
          const analyticsRes = await api.get(`/yield/analytics?plantId=${plantId}`);
          setMetricsData(analyticsRes.data.metrics || {});
          setYieldTrendData(analyticsRes.data.chartData || []);
          setPlantYieldData(analyticsRes.data.chartData || []);
          setBatchYieldData(analyticsRes.data.chartData || []);
        } catch (err) {
          console.error("Failed to fetch yield analytics", err);
        }
      };
      fetchAnalyticsOnly();
    }
    
    if (activeTab === 'historical_reports') {
      fetchHistorical();
    }
  }, [activePlant?.id, activeTab, filters.dateFrom, filters.dateTo]);

  // Auto-select first batch if available and not selected
  useEffect(() => {
    if (Array.isArray(batches) && batches.length > 0 && !calcBatchInfo.batchNo) {
      setCalcBatchInfo({ batchNo: batches[0].batchNo, variety: batches[0].variety, date: batches[0].date });
    }
  }, [batches]);

  const handleCalculateYield = async () => {
    if (!calcBatchInfo.batchNo) {
      setNotification({ message: 'Please select a batch first', type: 'error' });
      return;
    }
    
    if (!calcData.paddy || !calcData.headRice) {
      setNotification({ message: 'Please enter at least Paddy Used and Head Rice quantities', type: 'error' });
      return;
    }

    try {
      const payload = {
        batchNo: calcBatchInfo.batchNo,
        riceProduced: Number(calcData.headRice) + Number(calcData.brokenRice || 0),
        overallRecovery: calcRecovery,
        headRicePercent: Number(calcData.headRice) / Number(calcData.paddy) * 100,
        brokenRicePercent: Number(calcData.brokenRice) / Number(calcData.paddy) * 100,
        branPercent: Number(calcData.bran) / Number(calcData.paddy) * 100,
        huskPercent: Number(calcData.husk) / Number(calcData.paddy) * 100,
        lossPercent: Number(calcData.loss) / Number(calcData.paddy) * 100
      };
     await api.post(`/yield/calculator/save?plantId=${activePlant?.id || ''}`, payload);
     setNotification({ message: 'Yield calculation saved successfully!', type: 'success' });
     setCalcData({ paddy: '', headRice: '', brokenRice: '', bran: '', husk: '', loss: '' });
   } catch(e) {
     console.error(e);
     setNotification({ message: 'Failed to save yield calculation', type: 'error' });
   }
 };

 const metrics = [
 { title: 'Paddy Used (MT)', value: metricsData.paddyUsed || '0.000', unit: 'MT', trend: metricsData.paddyTrend || '0.00%', isUp: true, icon: Package, color: 'text-green-500' },
 { title: 'Rice Produced (MT)', value: metricsData.riceProduced || '0.000', unit: 'MT', trend: metricsData.riceTrend || '0.00%', isUp: true, icon: Package, color: 'text-blue-500' },
 { title: 'Head Rice (%)', value: metricsData.headRice || '0.00%', unit: '', trend: metricsData.headRiceTrend || '0.00%', isUp: true, icon: Droplet, color: 'text-purple-500' },
 { title: 'Broken Rice (%)', value: metricsData.brokenRice || '0.00%', unit: '', trend: metricsData.brokenRiceTrend || '0.00%', isUp: false, icon: Package, color: 'text-amber-500' },
 { title: 'Overall Recovery (%)', value: metricsData.overallRecovery || '0.00%', unit: '', trend: metricsData.recoveryTrend || '0.00%', isUp: true, icon: LineChart, color: 'text-teal-500' },
 { title: 'Yield Target Achievement', value: metricsData.targetAchievement || '0.00%', unit: '', trend: metricsData.targetTrend || '0.00%', isUp: true, icon: Target, color: 'text-orange-500' },
 ];

 const tabs = isAdminRole
  ? [{ id: 'mill_yield_benchmarks', label: 'Mill Yield Benchmarks', icon: Percent }]
  : [
      ...(canSeeBenchmarks ? [{ id: 'mill_yield_benchmarks', label: 'Mill Yield Benchmarks', icon: Percent }] : []),
      { id: 'yield_from_rice', label: 'Yield from Rice', icon: Package },
      { id: 'yield_from_paddy', label: 'Yield from Paddy', icon: Wheat },
      { id: 'stock_health', label: 'Stock Health Report', icon: Activity },
      { id: 'consignment_dispatch', label: 'Consignment Dispatch', icon: Truck },
      { id: 'yield_calculator', label: 'Yield Calculator', icon: Calculator },
      { id: 'yield_analytics', label: 'Yield Analytics', icon: LineChart },
      { id: 'historical_reports', label: 'Historical Yield Reports', icon: FileText },
    ];

 return (
 <div className="flex flex-col h-full bg-[var(--bg-base)] text-[var(--text-muted)]">
   {/* Custom Toast Notification */}
   {notification && (
     <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3 z-50 animate-in fade-in slide-in-from-top-2 ${
       notification.type === 'success' ? 'bg-[var(--bg-panel)] border-green-500/30 text-green-400' : 'bg-[var(--bg-panel)] border-red-500/30 text-red-400'
     }`}>
       <span className="font-medium text-sm">{notification.message}</span>
     </div>
   )}

 {/* Header & Tabs */}
 <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-panel)]">
 <div className="flex items-center gap-2">
 <h1 className="text-sm font-semibold text-[var(--text-muted)]">Yield Management</h1>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto p-6 space-y-6">
 
 {/* Top Metric Cards (hidden on Stock Health — its own table is the focus) */}
 {activeTab !== 'stock_health' && activeTab !== 'consignment_dispatch' && activeTab !== 'yield_from_rice' && activeTab !== 'yield_from_paddy' && activeTab !== 'mill_yield_benchmarks' && (
 <div className="grid grid-cols-6 gap-4">
 {metrics.map((m, i) => (
 <div key={i} className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle)] flex flex-col justify-between shadow-lg shadow-black/20">
 <div className="flex items-center gap-2 text-sm mb-2">
 <div className={`p-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--border-subtle)] ${m.color}`}>
 <m.icon size={18} />
 </div>
 <span className="font-semibold text-[11px] text-[var(--text-muted-alt)] uppercase tracking-wider">{m.title}</span>
 </div>
 <div className="mt-1">
 <div className="text-xl font-bold text-[var(--text-main)] flex items-baseline gap-1">
 {m.value}
 {m.unit && <span className="text-[10px] text-[var(--text-muted-alt)] font-normal">{m.unit}</span>}
 </div>
 <div className={`text-xs mt-2 flex items-center gap-1 font-medium ${m.isUp ? 'text-green-500' : 'text-red-500'}`}>
 {m.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
 {m.trend} <span className="text-[var(--text-muted-alt)] font-normal">vs last period</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}



 {/* Tab 1: Yield Calculator */}
 {activeTab === 'yield_calculator' && (
   <div className="max-w-4xl mx-auto w-full">
     <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-6 md:p-8 shadow-lg shadow-black/20 flex flex-col">
     <h2 className="text-xl font-bold text-[var(--text-main)] mb-6">Yield Calculator</h2>
     <div className="space-y-6">
     <div className="grid grid-cols-2 gap-6">
     <div>
     <label className="block text-xs uppercase font-bold text-[var(--text-muted-alt)] mb-2">Batch No.</label>
     <select id="calcBatchSelect" name="calcBatchSelect" autoComplete="off" data-lpignore="true" value={calcBatchInfo.batchNo} onChange={async (e) => {
       const selectedBatchNo = e.target.value;
       const selectedBatch = Array.isArray(batches)
         ? batches.find((b) => b.batchNo === selectedBatchNo)
         : undefined;
       if (selectedBatch) {
         try {
           const res = await api.get(`/production/batches/${selectedBatch.id}`);
           const fullBatch = res.data;
           setCalcBatchInfo({ 
             batchNo: fullBatch.batchNo, 
             variety: fullBatch.variety,
             date: fullBatch.date ? new Date(fullBatch.date).toISOString().split('T')[0] : ''
           });
           setCalcData(prev => ({ ...prev, paddy: String(fullBatch.paddyUsedQty || '') }));
         } catch (err) {
           console.error("Failed to fetch batch details", err);
         }
       } else {
         setCalcBatchInfo({ batchNo: '', variety: '', date: '' });
         setCalcData(prev => ({ ...prev, paddy: '' }));
       }
     }} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none">
     <option value="">Select Batch...</option>
     {Array.isArray(batches) &&
       batches.map((b) => (
       <option key={b.id} value={b.batchNo}>{b.batchNo}</option>
     ))}
     </select>
     </div>
     <div>
     <label className="block text-xs uppercase font-bold text-[var(--text-muted-alt)] mb-2">Date</label>
     <input type="date" value={calcBatchInfo.date || ''} readOnly className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none opacity-80 cursor-not-allowed" />
     </div>
     </div>
     <div>
     <label className="block text-xs uppercase font-bold text-[var(--text-muted-alt)] mb-2">Variety</label>
     <input type="text" value={calcBatchInfo.variety || ''} readOnly placeholder="Auto-filled from batch" className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-main)] focus:border-[#e67e00] outline-none opacity-80 cursor-not-allowed" />
     </div>
     </div>

     <div className="mt-8 flex-1 flex flex-col">
     <div className="flex text-xs uppercase font-bold text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)] pb-3 mb-4">
     <span className="flex-1">Description</span>
     <span className="w-32 text-right">Quantity (MT)</span>
     <span className="w-32 text-right">% of Paddy</span>
     </div>
     
     <div className="space-y-4 flex-1">
     <div className="flex items-center text-base">
     <span className="flex-1 font-medium text-[var(--text-muted)]">Paddy Input</span>
     <input type="number" min="0" value={calcData.paddy} onChange={(e) => handleCalcChange('paddy', e.target.value)} className="w-32 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-[var(--text-main)] text-right outline-none focus:border-blue-500" />
     <span className="w-32 text-right text-[var(--text-muted-alt)] font-medium">100.00%</span>
     </div>
     <div className="flex items-center text-base">
     <span className="flex-1 font-medium text-[var(--text-muted)]">Head Rice</span>
     <input type="number" min="0" value={calcData.headRice} onChange={(e) => handleCalcChange('headRice', e.target.value)} className="w-32 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-green-400 text-right outline-none font-bold focus:border-green-500" />
     <span className="w-32 text-right text-green-400 font-bold">{Number(calcData.paddy) > 0 ? ((Number(calcData.headRice) / Number(calcData.paddy)) * 100).toFixed(2) : '0.00'}%</span>
     </div>
     <div className="flex items-center text-base">
     <span className="flex-1 font-medium text-[var(--text-muted)]">Broken Rice</span>
     <input type="number" min="0" value={calcData.brokenRice} onChange={(e) => handleCalcChange('brokenRice', e.target.value)} className="w-32 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-[var(--text-main)] text-right outline-none focus:border-blue-500" />
     <span className="w-32 text-right text-[var(--text-muted-alt)] font-medium">{Number(calcData.paddy) > 0 ? ((Number(calcData.brokenRice) / Number(calcData.paddy)) * 100).toFixed(2) : '0.00'}%</span>
     </div>
     <div className="flex items-center text-base">
     <span className="flex-1 font-medium text-[var(--text-muted)]">Bran</span>
     <input type="number" min="0" value={calcData.bran} onChange={(e) => handleCalcChange('bran', e.target.value)} className="w-32 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-[var(--text-main)] text-right outline-none focus:border-blue-500" />
     <span className="w-32 text-right text-[var(--text-muted-alt)] font-medium">{Number(calcData.paddy) > 0 ? ((Number(calcData.bran) / Number(calcData.paddy)) * 100).toFixed(2) : '0.00'}%</span>
     </div>
     <div className="flex items-center text-base">
     <span className="flex-1 font-medium text-[var(--text-muted)]">Husk</span>
     <input type="number" min="0" value={calcData.husk} onChange={(e) => handleCalcChange('husk', e.target.value)} className="w-32 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-[var(--text-main)] text-right outline-none focus:border-blue-500" />
     <span className="w-32 text-right text-[var(--text-muted-alt)] font-medium">{Number(calcData.paddy) > 0 ? ((Number(calcData.husk) / Number(calcData.paddy)) * 100).toFixed(2) : '0.00'}%</span>
     </div>
     <div className="flex items-center text-base">
     <span className="flex-1 font-medium text-[var(--text-muted)]">Loss / Others</span>
     <input type="number" min="0" value={calcData.loss} onChange={(e) => handleCalcChange('loss', e.target.value)} className="w-32 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-red-400 text-right outline-none focus:border-red-500" />
     <span className="w-32 text-right text-red-400 font-medium">{Number(calcData.paddy) > 0 ? ((Number(calcData.loss) / Number(calcData.paddy)) * 100).toFixed(2) : '0.00'}%</span>
     </div>
     </div>

     <div className="mt-8 pt-6 border-t border-[var(--border-subtle)]">
     <div className="flex justify-between items-center mb-4">
     <span className="text-[var(--text-muted-alt)] font-medium">Total Output</span>
     <span className="text-xl font-bold text-[var(--text-main)]">{calcTotalOutput.toFixed(3)} MT</span>
     </div>
     <div className="flex justify-between items-center">
     <span className="text-[var(--text-muted-alt)] font-medium">Overall Recovery</span>
     <div className="flex items-center gap-4">
     <span className="text-2xl font-bold text-green-400">{calcRecovery.toFixed(2)}%</span>
     <div className="w-12 h-12 relative flex items-center justify-center">
     <svg className="absolute inset-0 w-full h-full transform -rotate-90">
     <circle cx="24" cy="24" r="20" fill="none" stroke="#222" strokeWidth="4" />
     <circle cx="24" cy="24" r="20" fill="none" stroke="#22c55e" strokeWidth="4" strokeDasharray="125" strokeDashoffset={Math.max(0, calcStrokeOffset)} strokeLinecap="round" className="transition-all duration-500 ease-in-out" />
     </svg>
     <span className="text-xs font-bold text-[var(--text-main)] z-10">{Math.round(calcRecovery)}%</span>
     </div>
     </div>
     </div>
     </div>

     <div className="flex gap-4 mt-8">
     <button onClick={() => setCalcData({ paddy: '', headRice: '', brokenRice: '', bran: '', husk: '', loss: '' })} className="flex-1 py-3 bg-[var(--bg-panel-alt)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-main)] rounded-xl font-bold transition-colors border border-[var(--border-subtle)]">Reset</button>
     <button onClick={handleCalculateYield} className="flex-[2] py-3 bg-[#e67e00] hover:bg-[#cc7000] text-black rounded-xl font-bold transition-colors shadow-lg shadow-amber-500/20">Calculate & Save Yield</button>
     </div>
     </div>
     </div>
   </div>
 )}

 {/* Tab 2: Yield Analytics */}
 {activeTab === 'yield_analytics' && (
   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
     {/* Analytics Charts (8 cols) */}
     <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
       {/* Grid 1: Line Chart */}
       <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col h-72">
       <div className="flex items-center justify-between mb-4">
       <h3 className="text-sm font-bold text-[var(--text-main)]">Yield Trend (%) - Last 12 Months</h3>
       <select className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] text-[10px] px-2 py-1 rounded text-[var(--text-main)]">
       <option>Last 12 Months</option>
       </select>
       </div>
       <div className="flex-1 w-full min-h-0">
       <ResponsiveContainer width="100%" height="100%">
       <RechartsLineChart data={yieldTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
       <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
       <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
       <YAxis stroke="#666" fontSize={10} domain={['dataMin - 2', 'dataMax + 2']} tickLine={false} axisLine={false} />
       <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
       <Line type="monotone" dataKey="yield" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#121212' }} activeDot={{ r: 6 }} />
       </RechartsLineChart>
       </ResponsiveContainer>
       </div>
       </div>

       {/* Grid 3: Vertical Bar Chart */}
       <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col h-72">
       <div className="flex items-center justify-between mb-4">
       <h3 className="text-sm font-bold text-[var(--text-main)]">Plant Wise Average Yield (%)</h3>
       <select className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] text-[10px] px-2 py-1 rounded text-[var(--text-main)]">
       <option>This Month</option>
       </select>
       </div>
       <div className="flex-1 w-full min-h-0">
       <ResponsiveContainer width="100%" height="100%">
       <BarChart data={plantYieldData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
       <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
       <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
       <YAxis stroke="#666" fontSize={10} domain={[50, 75]} tickLine={false} axisLine={false} />
       <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '12px' }} itemStyle={{ color: '#fff' }} cursor={{fill: '#222'}} />
       <Bar dataKey="yield" radius={[4, 4, 0, 0]}>
       {plantYieldData.map((entry, index) => (
       <Cell key={`cell-${index}`} fill={entry.color} />
       ))}
       </Bar>
       </BarChart>
       </ResponsiveContainer>
       </div>
       </div>

       {/* Grid 2: Horizontal Bar Chart */}
       <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col h-72">
       <div className="flex items-center justify-between mb-4">
       <h3 className="text-sm font-bold text-[var(--text-main)]">Batch Wise Yield (%) - Top 6</h3>
       <select className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] text-[10px] px-2 py-1 rounded text-[var(--text-main)]">
       <option>This Month</option>
       </select>
       </div>
       <div className="flex-1 w-full min-h-0">
       <ResponsiveContainer width="100%" height="100%">
       <BarChart data={batchYieldData} layout="vertical" margin={{ top: 5, right: 20, left: 25, bottom: 5 }}>
       <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={true} vertical={false} />
       <XAxis type="number" min="0" stroke="#666" fontSize={10} domain={[50, 70]} tickLine={false} axisLine={false} />
       <YAxis dataKey="name" type="category" stroke="#999" fontSize={9} tickLine={false} axisLine={false} />
       <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '12px' }} itemStyle={{ color: '#fff' }} cursor={{fill: '#222'}} />
       <Bar dataKey="yield" radius={[0, 4, 4, 0]} barSize={12}>
       {batchYieldData.map((entry, index) => (
       <Cell key={`cell-${index}`} fill={entry.color} />
       ))}
       </Bar>
       </BarChart>
       </ResponsiveContainer>
       </div>
       </div>

       {/* Grid 4: Area Chart */}
       <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col h-72">
       <div className="flex items-center justify-between mb-4">
       <h3 className="text-sm font-bold text-[var(--text-main)]">Overall Recovery Trend (%)</h3>
       <select className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] text-[10px] px-2 py-1 rounded text-[var(--text-main)]">
       <option>Last 12 Months</option>
       </select>
       </div>
       <div className="flex-1 w-full min-h-0">
       <ResponsiveContainer width="100%" height="100%">
       <AreaChart data={yieldTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
       <defs>
       <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
       <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
       <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
       </linearGradient>
       </defs>
       <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
       <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
       <YAxis stroke="#666" fontSize={10} domain={['dataMin - 2', 'dataMax + 2']} tickLine={false} axisLine={false} />
       <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
       <Area type="monotone" dataKey="yield" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorYield)" />
       </AreaChart>
       </ResponsiveContainer>
       </div>
       </div>
     </div>

     {/* Insights (4 cols) */}
     <div className="lg:col-span-4 flex flex-col gap-4">
       {/* Card 1: Batch Summary */}
       <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-lg shadow-black/20">
       <div className="flex items-center justify-between mb-4">
       <h3 className="font-bold text-[var(--text-main)] text-sm">Batch Summary <span className="text-[var(--text-muted-alt)] font-normal">({metricsData.latestBatch || 'No Batch Data'})</span></h3>
       <Printer size={14} className="text-[var(--text-muted-alt)] cursor-pointer hover:text-[var(--text-main)]" />
       </div>
       <div className="space-y-2 text-xs">
       <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1">
       <span className="text-[var(--text-muted-alt)]">Batch No.</span><span className="font-mono text-[var(--text-main)]">{metricsData.latestBatch || '-'}</span>
       </div>
       <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1">
       <span className="text-[var(--text-muted-alt)]">Start Time</span><span className="text-[var(--text-main)]">{metricsData.batchStart || '-'}</span>
       </div>
       <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1">
       <span className="text-[var(--text-muted-alt)]">End Time</span><span className="text-[var(--text-main)]">{metricsData.batchEnd || '-'}</span>
       </div>
       <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1">
       <span className="text-[var(--text-muted-alt)]">Paddy Used</span><span className="text-[var(--text-main)] font-medium">{metricsData.batchPaddy || '0.000'} MT</span>
       </div>
       <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1">
       <span className="text-[var(--text-muted-alt)]">Rice Produced</span><span className="text-blue-400 font-medium">{metricsData.batchRice || '0.000'} MT</span>
       </div>
       <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1">
       <span className="text-[var(--text-muted-alt)]">By-products</span><span className="text-[var(--text-main)]">{metricsData.batchByProducts || '0.000'} MT</span>
       </div>
       <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1">
       <span className="text-[var(--text-muted-alt)]">Loss / Others</span><span className="text-red-400">{metricsData.batchLoss || '0.000'} MT</span>
       </div>
       <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1 pt-1">
       <span className="text-[var(--text-muted-alt)] font-bold">Overall Recovery</span><span className="text-green-400 font-bold">{metricsData.batchRecovery || '0.00'}%</span>
       </div>
       <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1">
       <span className="text-[var(--text-muted-alt)]">Yield Target</span><span className="text-[var(--text-main)]">{metricsData.batchTarget || '0.00'}%</span>
       </div>
       <div className="flex justify-between pt-1">
       <span className="text-[var(--text-muted-alt)]">Achievement</span><span className="text-[#e67e00] font-bold">{metricsData.batchAchievement || '0.00'}%</span>
       </div>
       </div>
       </div>

       {/* Card 2: Management Insights */}
       <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-lg shadow-black/20">
       <h3 className="font-bold text-[var(--text-main)] text-sm mb-4 flex items-center gap-2">
       <Target size={14} className="text-[#e67e00]" /> Management Insights
       </h3>
       <div className="space-y-3">
       <div className="flex items-center justify-between bg-[var(--bg-panel-alt)] p-2.5 rounded-lg border border-[var(--border-subtle-alt)]">
       <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
       <div className="p-1 bg-green-500/20 text-green-500 rounded"><TrendingUp size={12} /></div>
       Best Performing Plant
       </div>
       <span className="font-bold text-green-500 text-sm">{metricsData.bestPlant || '-'}</span>
       </div>
       <div className="flex items-center justify-between bg-[var(--bg-panel-alt)] p-2.5 rounded-lg border border-[var(--border-subtle-alt)]">
       <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
       <div className="p-1 bg-blue-500/20 text-blue-500 rounded"><TrendingUp size={12} /></div>
       Highest Yield
       </div>
       <span className="font-bold text-blue-400 text-sm">{metricsData.highestYield || '0.00'}%</span>
       </div>
       <div className="flex items-center justify-between bg-[var(--bg-panel-alt)] p-2.5 rounded-lg border border-[var(--border-subtle-alt)]">
       <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
       <div className="p-1 bg-red-500/20 text-red-500 rounded"><TrendingDown size={12} /></div>
       Lowest Yield
       </div>
       <span className="font-bold text-red-400 text-sm">{metricsData.lowestYield || '0.00'}%</span>
       </div>
       <div className="flex items-center justify-between bg-[var(--bg-panel-alt)] p-2.5 rounded-lg border border-[var(--border-subtle-alt)]">
       <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
       <div className="p-1 bg-gray-500/20 text-[var(--text-muted-alt)] rounded"><LineChart size={12} /></div>
       Average Yield (All Plants)
       </div>
       <span className="font-bold text-[var(--text-main)] text-sm">{metricsData.averageYield || '0.00'}%</span>
       </div>
       </div>
       </div>

       {/* Card 3: AI Prediction Engine */}
       <div className="bg-gradient-to-br from-[#162016] to-[#0d160d] border border-green-500/30 rounded-xl p-5 shadow-lg shadow-green-900/10">
       <div className="flex items-center justify-between mb-2">
       <h3 className="font-bold text-green-400 text-sm flex items-center gap-2">
       AI Prediction
       </h3>
       <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold uppercase">Beta</span>
       </div>
       <p className="text-xs text-[var(--text-muted-alt)] mb-3">Expected Yield for Next Batch</p>
       
       <div className="flex items-end justify-between mb-4">
       <span className="text-3xl font-bold text-[var(--text-main)]">{metricsData.predictedYield || '0.00'}%</span>
       <LineChart size={32} className="text-green-500/50" />
       </div>
       
       <div className="text-xs text-[var(--text-muted-alt)] mb-2 font-medium uppercase tracking-wider">Based on</div>
       <ul className="space-y-1.5">
       <li className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
       <div className="w-3 h-3 rounded-full bg-green-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div></div>
       Moisture Content
       </li>
       <li className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
       <div className="w-3 h-3 rounded-full bg-green-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div></div>
       Variety Performance
       </li>
       <li className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
       <div className="w-3 h-3 rounded-full bg-green-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div></div>
       Historical Data
       </li>
       <li className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
       <div className="w-3 h-3 rounded-full bg-green-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div></div>
       Season Trend
       </li>
       </ul>
       </div>
     </div>
   </div>
 )}

 {/* Tab 3: Historical Reports Ledger */}
 {activeTab === 'historical_reports' && (
   <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col shadow-lg shadow-black/20">
   <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-subtle)]">
   <h2 className="text-lg font-bold text-[var(--text-main)]">Historical Yield Reports</h2>
   
   <div className="flex items-center gap-3">
   <div className="flex items-center gap-2 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5">
   <Calendar size={14} className="text-[var(--text-muted-alt)]" />
   <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({...f, dateFrom: e.target.value}))} className="bg-transparent text-xs text-[var(--text-main)] outline-none w-24" />
   <span className="text-[var(--text-muted-alt)] text-xs">to</span>
   <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({...f, dateTo: e.target.value}))} className="bg-transparent text-xs text-[var(--text-main)] outline-none w-24" />
   </div>
   
   <div className="flex items-center gap-2 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5">
   <span className="text-xs text-[var(--text-muted-alt)]">Variety</span>
   <select value={filters.variety} onChange={e => setFilters(f => ({...f, variety: e.target.value}))} className="bg-transparent text-xs text-[var(--text-main)] outline-none">
   <option value="">All Varieties</option>
   <option value="Sugandha">Sugandha</option>
   <option value="Sharbati">Sharbati</option>
   </select>
   </div>
   
   <button onClick={() => setFilters({ dateFrom: '', dateTo: '', variety: '' })} className="bg-transparent border border-[var(--border-subtle)] text-[var(--text-main)] hover:bg-[var(--glass-bg)] px-4 py-1.5 rounded-lg text-xs font-medium">Reset</button>
   
   <div className="h-6 w-px bg-[var(--glass-bg)] mx-1"></div>
   
    <button onClick={async () => {
       try {
         const query = new URLSearchParams();
         query.append('plantId', activePlant?.id || 'global');
         if (filters.dateFrom) query.append('startDate', filters.dateFrom);
         if (filters.dateTo) query.append('endDate', filters.dateTo);
         if (filters.variety) query.append('variety', filters.variety);
         query.append('limit', '1000000');
         query.append('page', '1');
         
         const res = await api.get(`/yield/historical?${query.toString()}`);
         const historyData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
         
         const exportData = historyData.map((r: any, i: number) => ({
           '#': i + 1,
           'Date': new Date(r.createdAt).toLocaleDateString(),
           'Batch No.': r.batch?.batchNo || '-',
           'Plant': activePlant?.name || 'Unknown',
           'Variety': r.batch?.variety || '-',
           'Paddy Used (MT)': r.batch?.paddyUsedQty || 0,
           'Rice Produced (MT)': r.batch?.riceProducedQty || 0,
           'Head Rice (%)': r.headRicePercent || 0,
           'Broken Rice (%)': r.brokenRicePercent || 0,
           'By-Products (MT)': (r.batch?.paddyUsedQty ? (((r.branPercent || 0) + (r.huskPercent || 0)) / 100 * r.batch.paddyUsedQty) : 0).toFixed(3),
           'Loss (MT)': (r.batch?.paddyUsedQty ? ((r.lossPercent || 0) / 100 * r.batch.paddyUsedQty) : 0).toFixed(3),
           'Overall Recovery (%)': r.overallRecovery || 0
         }));
         exportToExcel(exportData, 'historical_yield.xlsx');
       } catch (error) {
         console.error('Failed to export all records', error);
       }
     }} className="flex items-center gap-1.5 text-green-400 border border-green-500/30 hover:bg-green-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
    <Download size={14} /> Excel
    </button>
     <button onClick={async () => {
       try {
         const query = new URLSearchParams();
         query.append('plantId', activePlant?.id || 'global');
         if (filters.dateFrom) query.append('startDate', filters.dateFrom);
         if (filters.dateTo) query.append('endDate', filters.dateTo);
         if (filters.variety) query.append('variety', filters.variety);
         query.append('limit', '1000000');
         query.append('page', '1');
         
         const res = await api.get(`/yield/historical?${query.toString()}`);
         const historyData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
         
         const exportData = historyData.map((r: any, i: number) => ({
           '#': i + 1,
           'Date': new Date(r.createdAt).toLocaleDateString(),
           'Batch No.': r.batch?.batchNo || '-',
           'Plant': activePlant?.name || 'Unknown',
           'Variety': r.batch?.variety || '-',
           'Paddy Used (MT)': r.batch?.paddyUsedQty || 0,
           'Rice Produced (MT)': r.batch?.riceProducedQty || 0,
           'Head Rice (%)': r.headRicePercent || 0,
           'Broken Rice (%)': r.brokenRicePercent || 0,
           'By-Products (MT)': (r.batch?.paddyUsedQty ? (((r.branPercent || 0) + (r.huskPercent || 0)) / 100 * r.batch.paddyUsedQty) : 0).toFixed(3),
           'Loss (MT)': (r.batch?.paddyUsedQty ? ((r.lossPercent || 0) / 100 * r.batch.paddyUsedQty) : 0).toFixed(3),
           'Overall Recovery (%)': r.overallRecovery || 0
         }));
         if (exportData.length > 0) {
           exportToPDF('Historical Yield Reports', Object.keys(exportData[0]), exportData.map((d: any) => Object.values(d)), 'historical_yield.pdf');
         }
       } catch (error) {
         console.error('Failed to export all records', error);
       }
     }} className="flex items-center gap-1.5 text-red-400 border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
     <FileText size={14} /> PDF
     </button>
   </div>
   </div>
   
   <div className="overflow-x-auto">
   <table className="w-full text-xs text-left">
   <thead>
   <tr className="text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)] uppercase font-medium bg-[var(--bg-panel-hover)]">
   <th className="p-3">#</th>
   <th className="p-3">Date</th>
   <th className="p-3">Batch No.</th>
   <th className="p-3">Plant</th>
   <th className="p-3">Variety</th>
     
   <th className="p-3 text-right">Paddy Used (MT)</th>
     <th className="p-3 text-right">Rice Produced (MT)</th>
     <th className="p-3 text-right">Head Rice (%)</th>
     <th className="p-3 text-right">Broken Rice (%)</th>
     <th className="p-3 text-right">By-Products (MT)</th>
     <th className="p-3 text-right">Loss (MT)</th>
     <th className="p-3 text-right">Overall Recovery (%)</th>
     <th className="p-3 text-right text-blue-400 whitespace-nowrap bg-[var(--glass-bg)]">R. Bran Prod. (Bags)</th>
     <th className="p-3 text-right text-amber-500 whitespace-nowrap bg-[var(--glass-bg)]">R. Bran Reused (Bags)</th>
     <th className="p-3 text-right text-blue-400 whitespace-nowrap bg-[var(--glass-bg)]">K. Phuck Prod. (Bags)</th>
     <th className="p-3 text-right text-amber-500 whitespace-nowrap bg-[var(--glass-bg)]">K. Phuck Reused (Bags)</th>
     <th className="p-3 text-right text-blue-400 whitespace-nowrap bg-[var(--glass-bg)]">Broken Rice Prod. (Bags)</th>
     <th className="p-3 text-right text-amber-500 whitespace-nowrap bg-[var(--glass-bg)]">Broken Rice Reused (Bags)</th>
     <th className="p-3 text-right text-blue-400 whitespace-nowrap bg-[var(--glass-bg)]">Nakku 1 Prod. (Bags)</th>
     <th className="p-3 text-right text-amber-500 whitespace-nowrap bg-[var(--glass-bg)]">Nakku 1 Reused (Bags)</th>
     <th className="p-3 text-right text-blue-400 whitespace-nowrap bg-[var(--glass-bg)]">Nakku 2 Prod. (Bags)</th>
     <th className="p-3 text-right text-amber-500 whitespace-nowrap bg-[var(--glass-bg)]">Nakku 2 Reused (Bags)</th>
     <th className="p-3 text-right text-blue-400 whitespace-nowrap bg-[var(--glass-bg)]">Rejection Prod. (Bags)</th>
     <th className="p-3 text-right text-amber-500 whitespace-nowrap bg-[var(--glass-bg)]">Rejection Reused (Bags)</th>
     <th className="p-3 text-right text-blue-400 whitespace-nowrap bg-[var(--glass-bg)]">Final Rice Prod. (Bags)</th>
     <th className="p-3 text-right text-amber-500 whitespace-nowrap bg-[var(--glass-bg)]">Final Rice Reused (Bags)</th>
     <th className="p-3 text-right text-blue-400 whitespace-nowrap bg-[var(--glass-bg)]">Mansoori Prod. (Bags)</th>
     <th className="p-3 text-right text-amber-500 whitespace-nowrap bg-[var(--glass-bg)]">Mansoori Reused (Bags)</th>
     <th className="p-3 text-right text-blue-400 whitespace-nowrap bg-[var(--glass-bg)]">Wand Prod. (Bags)</th>
     <th className="p-3 text-right text-amber-500 whitespace-nowrap bg-[var(--glass-bg)]">Wand Reused (Bags)</th>
     <th className="p-3 text-right text-blue-400 whitespace-nowrap bg-[var(--glass-bg)]">Parmal Prod. (Bags)</th>
     <th className="p-3 text-right text-amber-500 whitespace-nowrap bg-[var(--glass-bg)]">Parmal Reused (Bags)</th>
     <th className="p-3 text-right text-blue-400 whitespace-nowrap bg-[var(--glass-bg)]">FRK Prod. (Bags)</th>
     <th className="p-3 text-right text-amber-500 whitespace-nowrap bg-[var(--glass-bg)]">FRK Reused (Bags)</th>
     </tr>
   </thead>
   <tbody>
   {historicalReports.map((r, i) => (
      <tr key={i} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)]">
        <td className="p-3 text-[var(--text-muted-alt)] whitespace-nowrap">{i + 1}</td>
        <td className="p-3 text-[var(--text-muted)] whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
        <td className="p-3 font-mono font-medium text-[var(--text-main)] whitespace-nowrap">{r.batch?.batchNo}</td>
        <td className="p-3 text-[var(--text-muted)] whitespace-nowrap">{r.plantId}</td>
        <td className="p-3 text-[var(--text-muted)] whitespace-nowrap">{r.batch?.variety}</td>
        <td className="p-3 text-right font-medium text-[var(--text-muted)] whitespace-nowrap">{r.batch?.paddyUsedQty?.toFixed(3) || '0.000'}</td>
        <td className="p-3 text-right font-medium text-blue-400 whitespace-nowrap">{r.batch?.riceProducedQty?.toFixed(3) || '0.000'}</td>
        <td className="p-3 text-right font-medium text-green-400 whitespace-nowrap">{r.headRicePercent?.toFixed(2)}%</td>
        <td className="p-3 text-right font-medium text-amber-500 whitespace-nowrap">{r.brokenRicePercent?.toFixed(2)}%</td>
        <td className="p-3 text-right text-[var(--text-muted)] whitespace-nowrap">{(r.batch?.paddyUsedQty ? (((r.branPercent || 0) + (r.huskPercent || 0)) / 100 * r.batch.paddyUsedQty) : 0).toFixed(3)}</td>
        <td className="p-3 text-right text-red-400 whitespace-nowrap">{(r.batch?.paddyUsedQty ? ((r.lossPercent || 0) / 100 * r.batch.paddyUsedQty) : 0).toFixed(3)}</td>
        <td className="p-3 text-right font-bold text-[var(--text-main)] whitespace-nowrap">{r.overallRecovery?.toFixed(2)}%</td>
        <td className="p-3 text-right font-medium text-blue-400 bg-[var(--glass-bg)]">{r.batch?.rBranBags || 0}</td>
        <td className="p-3 text-right font-medium text-amber-500 bg-[var(--glass-bg)]">{r.batch?.rBranReused || 0}</td>
        <td className="p-3 text-right font-medium text-blue-400 bg-[var(--glass-bg)]">{r.batch?.kPhuckBags || 0}</td>
        <td className="p-3 text-right font-medium text-amber-500 bg-[var(--glass-bg)]">{r.batch?.kPhuckReused || 0}</td>
        <td className="p-3 text-right font-medium text-blue-400 bg-[var(--glass-bg)]">{r.batch?.brokenRiceBags || 0}</td>
        <td className="p-3 text-right font-medium text-amber-500 bg-[var(--glass-bg)]">{r.batch?.brokenRiceReused || 0}</td>
        <td className="p-3 text-right font-medium text-blue-400 bg-[var(--glass-bg)]">{r.batch?.nakku1Bags || 0}</td>
        <td className="p-3 text-right font-medium text-amber-500 bg-[var(--glass-bg)]">{r.batch?.nakku1Reused || 0}</td>
        <td className="p-3 text-right font-medium text-blue-400 bg-[var(--glass-bg)]">{r.batch?.nakku2Bags || 0}</td>
        <td className="p-3 text-right font-medium text-amber-500 bg-[var(--glass-bg)]">{r.batch?.nakku2Reused || 0}</td>
        <td className="p-3 text-right font-medium text-blue-400 bg-[var(--glass-bg)]">{r.batch?.rejectionBags || 0}</td>
        <td className="p-3 text-right font-medium text-amber-500 bg-[var(--glass-bg)]">{r.batch?.rejectionReused || 0}</td>
        <td className="p-3 text-right font-medium text-blue-400 bg-[var(--glass-bg)]">{r.batch?.finalRiceBags || 0}</td>
        <td className="p-3 text-right font-medium text-amber-500 bg-[var(--glass-bg)]">{r.batch?.finalRiceReused || 0}</td>
        <td className="p-3 text-right font-medium text-blue-400 bg-[var(--glass-bg)]">{r.batch?.mansooriBags || 0}</td>
        <td className="p-3 text-right font-medium text-amber-500 bg-[var(--glass-bg)]">{r.batch?.mansooriReused || 0}</td>
        <td className="p-3 text-right font-medium text-blue-400 bg-[var(--glass-bg)]">{r.batch?.wandBags || 0}</td>
        <td className="p-3 text-right font-medium text-amber-500 bg-[var(--glass-bg)]">{r.batch?.wandReused || 0}</td>
        <td className="p-3 text-right font-medium text-blue-400 bg-[var(--glass-bg)]">{r.batch?.parmalBags || 0}</td>
        <td className="p-3 text-right font-medium text-amber-500 bg-[var(--glass-bg)]">{r.batch?.parmalReused || 0}</td>
        <td className="p-3 text-right font-medium text-blue-400 bg-[var(--glass-bg)]">{r.batch?.frkBags || 0}</td>
        <td className="p-3 text-right font-medium text-amber-500 bg-[var(--glass-bg)]">{r.batch?.frkReused || 0}</td>

      </tr>
    ))}
     </tbody>
   </table>
   </div>
   
   <div className="flex items-center justify-between mt-4 text-xs text-[var(--text-muted-alt)]">
   <span>Showing {historicalReports.length} records</span>
   <div className="flex gap-1">
   <button className="px-2 py-1 rounded hover:bg-[var(--glass-bg)]">&lt;</button>
   <button className="px-2 py-1 rounded bg-[#e67e00] text-black font-bold">1</button>
   <button className="px-2 py-1 rounded hover:bg-[var(--glass-bg)]">&gt;</button>
   </div>
   </div>
   </div>
 )}

 {activeTab === 'mill_yield_benchmarks' && <MillYieldBenchmarks />}
 {activeTab === 'stock_health' && <StockHealthReport />}
 {activeTab === 'consignment_dispatch' && <ConsignmentDispatchReport />}
 {activeTab === 'yield_from_rice' && <YieldMillCompare basis="rice" />}
 {activeTab === 'yield_from_paddy' && <YieldMillCompare basis="paddy" />}

 </div>
 </div>
 );
};

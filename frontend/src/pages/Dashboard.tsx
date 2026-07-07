import React, { useEffect, useState } from 'react';
import { usePlantStore } from '../store/plantStore';
import { CustomModal } from '../components/CustomModal';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { 
 BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
 LineChart, Line, PieChart, Pie, Legend
} from 'recharts';
import { 
 Wheat, Factory, Percent, Package, Truck, 
 Calendar, Filter, Clock, AlertTriangle, Zap, CheckCircle2,
 ChevronDown, X
} from 'lucide-react';

const renderCustomLegend = (props: any) => {
 const { payload } = props;
 return (
 <ul className="grid grid-cols-2 gap-x-4 gap-y-3 justify-center text-xs mt-2 px-2">
 {payload.map((entry: any, index: number) => {
 return (
 <li key={`item-${index}`} className="flex items-center gap-2">
 <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }}></span>
 <div className="flex flex-col">
 <p className="text-[var(--text-muted)] font-medium leading-tight truncate w-[85px]" title={entry.value}>{entry.value}</p>
 <p className="text-[var(--text-muted-alt)] text-[10px]">{entry.payload?.value?.toLocaleString() || 0} MT</p>
 </div>
 </li>
 );
 })}
 </ul>
 );
};

export const Dashboard: React.FC = () => {
 const activePlant = usePlantStore(state => state.activePlant);
 const navigate = useNavigate();
 
 const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
 
 const [metrics, setMetrics] = useState<any>(null);
 const [barData, setBarData] = useState<any[]>([]);
 const [lineData, setLineData] = useState<any[]>([]);
 const [pieData, setPieData] = useState<any[]>([]);
 const [activities, setActivities] = useState<any[]>([]);
 const [alerts, setAlerts] = useState<any[]>([]);
 const [today, setToday] = useState<any>(null);
 
 const [loading, setLoading] = useState(true);
 const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', content: '' });

 const [globalFilter, setGlobalFilter] = useState('This Month');
 const [procurementFilter, setProcurementFilter] = useState('This Month');
 const [yieldFilter, setYieldFilter] = useState('This Month');
 const [stockFilter, setStockFilter] = useState('All Items');

 const handleGlobalFilterChange = (filter: string) => {
 setGlobalFilter(filter);
 setProcurementFilter(filter);
 setYieldFilter(filter);
 };

 useEffect(() => {
 const fetchDashboardData = async () => {
 if (!activePlant) return;
 
 try {
 setLoading(true);
 const [
 metricsRes, barRes, lineRes, pieRes, actRes, alertsRes, todayRes
 ] = await Promise.all([
 api.get(`/dashboard/metrics/${activePlant.id}?filter=${globalFilter}`),
 api.get(`/dashboard/procurement-chart?filter=${procurementFilter}`),
 api.get(`/dashboard/yield-trend/${activePlant.id}?filter=${yieldFilter}`),
 api.get(`/dashboard/stock-donut/${activePlant.id}?filter=${stockFilter}`),
 api.get(`/dashboard/recent-activities/${activePlant.id}`),
 api.get(`/dashboard/alerts/${activePlant.id}`),
 api.get(`/dashboard/today-summary/${activePlant.id}`)
 ]);

 setMetrics(metricsRes.data);
 setBarData(barRes.data);
 setLineData(lineRes.data);
 setPieData(pieRes.data);
 setActivities(actRes.data);
 setAlerts(alertsRes.data);
 setToday(todayRes.data);
 } catch (err) {
 console.error('Failed to fetch dashboard data', err);
 } finally {
 setLoading(false);
 }
 };

 fetchDashboardData();
 }, [activePlant, globalFilter, procurementFilter, yieldFilter, stockFilter]);

 if (!activePlant) {
 return <div className="p-8 text-center text-[var(--text-muted-alt)]">Please select a plant to view the dashboard.</div>;
 }

 return (
 <div className="space-y-6 max-w-7xl mx-auto text-[var(--text-muted)] bg-[var(--bg-base)] min-h-screen">
 
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-panel)] mb-6 rounded-xl">
 <div className="flex items-center gap-2">
 <h1 className="text-sm font-semibold text-[var(--text-muted)]">Dashboard</h1>
 </div>
 <div className="flex items-center gap-3 scale-90 origin-right">
 <div className="flex bg-[var(--bg-base)] rounded-md p-0.5 border border-[var(--border-subtle)]">
 {['Today', 'This Week', 'This Month'].map(f => (
 <button 
 key={f}
 onClick={() => handleGlobalFilterChange(f)}
 className={`px-4 py-1.5 text-xs font-bold rounded-sm transition-colors ${
 globalFilter === f ? 'bg-[#e67e00] text-black' : 'text-[var(--text-muted-alt)] hover:text-[var(--text-main)] hover:bg-[var(--glass-bg)]'
 }`}
 > {f}
 </button>
 ))}
 <button onClick={() => setModalConfig({ isOpen: true, title: 'Custom Date', content: 'Custom date picker integration is coming soon.' })} className="px-4 py-1.5 text-xs font-bold rounded-sm hover:bg-[var(--glass-bg)] text-[var(--text-muted-alt)] flex items-center gap-1">Custom <ChevronDown size={14}/></button>
 </div>
 <button onClick={() => setModalConfig({ isOpen: true, title: 'Advanced Filters', content: 'The advanced global filters panel is under construction.' })} className="p-1.5 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-md text-[var(--text-muted-alt)] hover:text-[var(--text-main)]">
 <Filter size={16} />
 </button>
 </div>
 </div>

 {loading ? (
 <div className="flex items-center justify-center h-64 text-amber-500">Loading dashboard...</div>
 ) : (
 <>
 {/* Tier 1: KPI Stats Row */}
 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
 <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
 <div className="flex items-center gap-3 mb-3">
 <div className="p-2 rounded-lg bg-amber-500/10 text-[#e67e00] border border-amber-500/20"><Wheat size={20} /></div>
 <h3 className="text-[var(--text-muted-alt)] font-medium text-sm">Total Paddy Procured</h3>
 </div>
 <p className="text-2xl font-bold text-[var(--text-main)] mb-1">{metrics?.procurementMT?.toLocaleString() || 0} <span className="text-sm text-[var(--text-muted-alt)] font-normal">MT</span></p>
 <p className="text-xs text-green-400">{metrics?.procurementTrend}</p>
 </div>
 
 <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
 <div className="flex items-center gap-3 mb-3">
 <div className="p-2 rounded-lg bg-amber-500/10 text-[#e67e00] border border-amber-500/20"><Factory size={20} /></div>
 <h3 className="text-[var(--text-muted-alt)] font-medium text-sm">Total Production</h3>
 </div>
 <p className="text-2xl font-bold text-[var(--text-main)] mb-1">{metrics?.productionMT?.toLocaleString() || 0} <span className="text-sm text-[var(--text-muted-alt)] font-normal">MT</span></p>
 <p className="text-xs text-green-400">{metrics?.productionTrend}</p>
 </div>

 <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
 <div className="flex items-center gap-3 mb-3">
 <div className="p-2 rounded-lg bg-amber-500/10 text-[#e67e00] border border-amber-500/20"><Percent size={20} /></div>
 <h3 className="text-[var(--text-muted-alt)] font-medium text-sm">Average Yield</h3>
 </div>
 <p className="text-2xl font-bold text-[var(--text-main)] mb-1">{metrics?.averageYield || 0} <span className="text-sm text-[var(--text-muted-alt)] font-normal">%</span></p>
 <p className="text-xs text-green-400">{metrics?.yieldTrend}</p>
 </div>

 <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
 <div className="flex items-center gap-3 mb-3">
 <div className="p-2 rounded-lg bg-amber-500/10 text-[#e67e00] border border-amber-500/20"><Package size={20} /></div>
 <h3 className="text-[var(--text-muted-alt)] font-medium text-sm">Total Stock (All Items)</h3>
 </div>
 <p className="text-2xl font-bold text-[var(--text-main)] mb-1">{metrics?.inventoryMT?.toLocaleString() || 0} <span className="text-sm text-[var(--text-muted-alt)] font-normal">MT</span></p>
 <p className="text-xs text-green-400">{metrics?.inventoryTrend}</p>
 </div>

 <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
 <div className="flex items-center gap-3 mb-3">
 <div className="p-2 rounded-lg bg-amber-500/10 text-[#e67e00] border border-amber-500/20"><Truck size={20} /></div>
 <h3 className="text-[var(--text-muted-alt)] font-medium text-sm">Total Dispatch</h3>
 </div>
 <p className="text-2xl font-bold text-[var(--text-main)] mb-1">{metrics?.dispatchMT?.toLocaleString() || 0} <span className="text-sm text-[var(--text-muted-alt)] font-normal">MT</span></p>
 <p className="text-xs text-green-400">{metrics?.dispatchTrend}</p>
 </div>
 </div>

 {/* Tier 2: Chart Matrix */}
 <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
 <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] lg:col-span-4">
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-[var(--text-main)] font-semibold">Plant Wise Paddy Procurement (MT)</h3>
 <div className="relative">
 <select 
 value={procurementFilter}
 onChange={(e) => setProcurementFilter(e.target.value)}
 className="text-xs text-[var(--text-muted-alt)] flex items-center gap-1 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] px-2 py-1 rounded appearance-none pr-6 cursor-pointer focus:outline-none"
 >
 <option value="Today">Today</option>
 <option value="This Week">This Week</option>
 <option value="This Month">This Month</option>
 <option value="This Year">This Year</option>
 </select>
 <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted-alt)] pointer-events-none" />
 </div>
 </div>
 <div className="h-64">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f1f" />
 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
 <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
 <RechartsTooltip cursor={{fill: "#1f1f1f", opacity: 0.4}} contentStyle={{backgroundColor: "#121212", borderColor: "#1f1f1f", color: "#fff"}} itemStyle={{color: "#fff"}} />
 <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={28}>
 {barData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill="#e67e00" />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>

 <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] lg:col-span-3">
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-[var(--text-main)] font-semibold">Yield Trend (%)</h3>
 <div className="relative">
 <select 
 value={yieldFilter}
 onChange={(e) => setYieldFilter(e.target.value)}
 className="text-xs text-[var(--text-muted-alt)] flex items-center gap-1 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] px-2 py-1 rounded appearance-none pr-6 cursor-pointer focus:outline-none"
 >
 <option value="Today">Today</option>
 <option value="This Week">This Week</option>
 <option value="This Month">This Month</option>
 </select>
 <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted-alt)] pointer-events-none" />
 </div>
 </div>
 <div className="h-64">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f1f" />
 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
 <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} domain={[50, 80]} />
 <RechartsTooltip contentStyle={{backgroundColor: "#121212", borderColor: "#1f1f1f", color: "#fff"}} itemStyle={{color: "#fff"}} />
 <Line 
 type="monotone" 
 dataKey="value" 
 stroke="#e67e00" 
 strokeWidth={2.5} 
 dot={{ 
 r: 2.5, 
 fill: '#121212', 
 stroke: '#e67e00', 
 strokeWidth: 1.5 
 }} 
 activeDot={{ 
 r: 6, 
 fill: '#e67e00', 
 stroke: '#121212', 
 strokeWidth: 2 
 }} 
 />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </div>

 <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] lg:col-span-3">
 <div className="flex justify-between items-center mb-2">
 <h3 className="text-[var(--text-main)] font-semibold">Stock Overview (MT)</h3>
 <div className="relative">
 <select 
 value={stockFilter}
 onChange={(e) => setStockFilter(e.target.value)}
 className="text-xs text-[var(--text-muted-alt)] flex items-center gap-1 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] px-2 py-1 rounded appearance-none pr-6 cursor-pointer focus:outline-none"
 >
 <option value="All Items">All Items</option>
 <option value="PADDY">Paddy</option>
 <option value="HEAD_RICE">Head Rice</option>
 <option value="BROKEN_RICE">Broken Rice</option>
 </select>
 <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted-alt)] pointer-events-none" />
 </div>
 </div>
 <div className="flex flex-col items-center pb-2">
 <div className="w-full h-48 mt-6">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie data={pieData} cx="50%" cy="50%" innerRadius="65%" outerRadius="90%" paddingAngle={2} dataKey="value" stroke="none">
 {pieData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color || "#e67e00"} />
 ))}
 </Pie>
 <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#fff" className="text-sm font-bold">
 <tspan x="50%" dy="-5">{metrics?.inventoryMT?.toLocaleString() || 0}</tspan>
 <tspan x="50%" dy="20" fill="#9ca3af" fontSize="10">MT</tspan>
 </text>
 </PieChart>
 </ResponsiveContainer>
 </div>
 <div className="w-full">
 <Legend content={renderCustomLegend} />
 </div>
 </div>
 </div>
 </div>

 {/* Tier 3: Real-Time Plant Operations Panels */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-[var(--text-main)] font-semibold">Recent Activities</h3>
 <button onClick={() => navigate('/users', { state: { defaultTab: 'Audit Access' } })} className="text-xs text-[#e67e00] hover:text-[#e67e00] transition-colors">View All</button>
 </div>
 <div className="space-y-6">
 {activities.length === 0 ? <p className="text-[var(--text-muted-alt)] text-sm">No recent activities.</p> : activities.map((act, i) => (
 <div key={i} className="flex items-start gap-4">
 <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 outline outline-4 outline-[#15171e] ${
 act.type === 'Stock' ? 'bg-blue-500/20 text-blue-400' :
 act.type === 'Production' ? 'bg-green-500/20 text-green-400' :
 'bg-yellow-500/20 text-yellow-400'
 }`}>
 {act.type === 'Stock' ? <Wheat size={16}/> : act.type === 'Production' ? <Factory size={16}/> : <CheckCircle2 size={16}/>}
 </div>
 <div className="flex-1 pb-4">
 <div className="flex justify-between items-start">
 <div>
 <h4 className="text-sm font-medium text-[var(--text-main)]">{act.title}</h4>
 <p className="text-xs text-[var(--text-muted-alt)] mt-1">{act.details}</p>
 </div>
 <span className="text-xs text-[var(--text-muted-alt)] whitespace-nowrap ml-2">{act.time}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-[var(--text-main)] font-semibold">Alerts & Notifications</h3>
 <button onClick={() => setIsAlertsModalOpen(true)} className="text-xs text-[#e67e00] hover:text-[#e67e00] transition-colors">View All</button>
 </div>
 <div className="space-y-4">
 {alerts.length === 0 ? <p className="text-[var(--text-muted-alt)] text-sm">No active alerts.</p> : alerts.map((alert, i) => (
 <div key={i} className={`flex gap-4 p-3 rounded-lg border ${alert.type === 'LowStock' ? 'border-red-500/20 bg-red-500/5' : 'border-yellow-500/20 bg-yellow-500/5'}`}>
 <AlertTriangle className={alert.type === 'LowStock' ? 'text-red-500' : 'text-yellow-500'} size={18} />
 <div className="flex-1">
 <div className="flex justify-between items-start">
 <h4 className={`text-sm font-medium ${alert.type === 'LowStock' ? 'text-red-500' : 'text-yellow-500'}`}>{alert.title}</h4>
 <span className="text-xs text-[var(--text-muted-alt)]">{alert.time}</span>
 </div>
 <p className="text-xs text-[var(--text-muted-alt)] mt-1">{alert.details}</p>
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
 <h3 className="text-[var(--text-main)] font-semibold mb-6">Today's Summary</h3>
 <div className="space-y-4">
 <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle-alt)]">
 <div className="flex items-center gap-3">
 <div className="text-blue-400"><Wheat size={18} /></div>
 <span className="text-sm text-[var(--text-muted)]">Paddy Procured</span>
 </div>
 <span className="text-sm font-semibold text-[var(--text-main)]">{today?.paddyProcured || 0} MT</span>
 </div>
 <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle-alt)]">
 <div className="flex items-center gap-3">
 <div className="text-green-400"><Factory size={18} /></div>
 <span className="text-sm text-[var(--text-muted)]">Production</span>
 </div>
 <span className="text-sm font-semibold text-[var(--text-main)]">{today?.production || 0} MT</span>
 </div>
 <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle-alt)]">
 <div className="flex items-center gap-3">
 <div className="text-yellow-400"><Percent size={18} /></div>
 <span className="text-sm text-[var(--text-muted)]">Average Yield</span>
 </div>
 <span className="text-sm font-semibold text-[var(--text-main)]">{today?.averageYield || 0} %</span>
 </div>
 <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle-alt)]">
 <div className="flex items-center gap-3">
 <div className="text-purple-400"><Truck size={18} /></div>
 <span className="text-sm text-[var(--text-muted)]">Dispatch</span>
 </div>
 <span className="text-sm font-semibold text-[var(--text-main)]">{today?.dispatch || 0} MT</span>
 </div>
 <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle-alt)]">
 <div className="flex items-center gap-3">
 <div className="text-orange-400"><Zap size={18} /></div>
 <span className="text-sm text-[var(--text-muted)]">Power Consumption</span>
 </div>
 <span className="text-sm font-semibold text-[var(--text-main)]">{today?.powerConsumption || 0} Units</span>
 </div>
 <div className="flex justify-between items-center py-2">
 <div className="flex items-center gap-3">
 <div className="text-cyan-400"><CheckCircle2 size={18} /></div>
 <span className="text-sm text-[var(--text-muted)]">Active Gate Pass</span>
 </div>
 <span className="text-sm font-semibold text-[var(--text-main)]">{today?.activeGatePasses || 0}</span>
 </div>
 </div>
 </div>
 </div>
 </>
 )}

 <CustomModal 
 isOpen={modalConfig.isOpen} 
 onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
 title={modalConfig.title}
 footer={
 <button 
 onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
 className="px-4 py-2 bg-[#e67e00] text-[var(--text-main)] rounded-lg text-sm font-medium hover:bg-[#cc7000] transition-colors"
 >
 Got it
 </button>
 }
 >
 <p className="text-[var(--text-muted)] leading-relaxed">{modalConfig.content}</p>
 </CustomModal>

 {/* Alerts Modal Overlay */}
 {isAlertsModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
 <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
 <div className="flex justify-between items-center p-5 border-b border-[var(--border-subtle)]">
 <h2 className="text-lg font-bold text-[var(--text-main)]">Active System Alerts</h2>
 <button 
 onClick={() => setIsAlertsModalOpen(false)}
 className="text-[var(--text-muted-alt)] hover:text-[#e67e00] transition-colors"
 >
 <X size={20} />
 </button>
 </div>
 <div className="p-5 max-h-[450px] overflow-y-auto space-y-4">
 {alerts.length === 0 ? <p className="text-[var(--text-muted-alt)] text-sm">No active alerts.</p> : alerts.map((alert, i) => (
 <div key={i} className={`flex gap-4 p-4 rounded-lg border ${alert.type === 'LowStock' ? 'border-red-500/20 bg-red-500/5' : 'border-yellow-500/20 bg-yellow-500/5'}`}>
 <AlertTriangle className={alert.type === 'LowStock' ? 'text-red-500' : 'text-yellow-500'} size={20} />
 <div className="flex-1">
 <div className="flex justify-between items-start">
 <h4 className={`text-sm font-medium ${alert.type === 'LowStock' ? 'text-red-500' : 'text-yellow-500'}`}>{alert.title}</h4>
 <span className="text-xs text-[var(--text-muted-alt)]">{alert.time}</span>
 </div>
 <p className="text-xs text-[var(--text-muted-alt)] mt-1.5">{alert.details}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

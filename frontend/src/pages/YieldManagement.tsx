import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
 Calculator, LineChart, FileText, Download, TrendingUp, TrendingDown, 
 ArrowUpRight, Target, Search, Calendar, ChevronDown, Package, Droplet, Clock, Printer
} from 'lucide-react';
import { 
 LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
 BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';

export const YieldManagement = () => {
 const [searchParams] = useSearchParams();
 const activeTab = searchParams.get('tab') || 'yield_calculator';
 
 const metrics = [
 { title: 'Paddy Used (MT)', value: '1,250.450', unit: 'MT', trend: '+8.45%', isUp: true, icon: Package, color: 'text-green-500' },
 { title: 'Rice Produced (MT)', value: '812.320', unit: 'MT', trend: '+7.62%', isUp: true, icon: Package, color: 'text-blue-500' },
 { title: 'Head Rice (%)', value: '62.45%', unit: '', trend: '+2.15%', isUp: true, icon: Droplet, color: 'text-purple-500' },
 { title: 'Broken Rice (%)', value: '8.35%', unit: '', trend: '-0.35%', isUp: false, icon: Package, color: 'text-amber-500' },
 { title: 'Overall Recovery (%)', value: '64.80%', unit: '', trend: '+1.85%', isUp: true, icon: LineChart, color: 'text-teal-500' },
 { title: 'Yield Target Achievement', value: '98.20%', unit: '', trend: '+3.20%', isUp: true, icon: Target, color: 'text-orange-500' },
 ];

 const yieldTrendData = [
 { name: 'Jun', yield: 60 }, { name: 'Jul', yield: 62 }, { name: 'Aug', yield: 58 },
 { name: 'Sep', yield: 64 }, { name: 'Oct', yield: 61 }, { name: 'Nov', yield: 63 },
 { name: 'Dec', yield: 59 }, { name: 'Jan', yield: 65 }, { name: 'Feb', yield: 60 },
 { name: 'Mar', yield: 62 }, { name: 'Apr', yield: 64 }, { name: 'May', yield: 64.8 }
 ];

 const plantYieldData = [
 { name: 'Plant 1', yield: 64.80, color: '#3b82f6' },
 { name: 'Plant 2', yield: 63.20, color: '#22c55e' },
 { name: 'Plant 3', yield: 67.80, color: '#f59e0b' },
 { name: 'Plant 4', yield: 62.10, color: '#a855f7' },
 { name: 'Plant 5', yield: 61.40, color: '#ef4444' },
 ];

 const batchYieldData = [
 { name: 'BATCH-2025-001', yield: 64.80, color: '#3b82f6' },
 { name: 'BATCH-2025-002', yield: 65.10, color: '#22c55e' },
 { name: 'BATCH-2025-003', yield: 66.30, color: '#f59e0b' },
 { name: 'BATCH-2025-004', yield: 62.90, color: '#a855f7' },
 { name: 'BATCH-2025-005', yield: 63.70, color: '#06b6d4' },
 { name: 'BATCH-2025-006', yield: 61.80, color: '#ef4444' },
 ];

 const historicalReports = [
 { date: '15/05/2025', batchNo: 'BATCH-2025-001', plant: 'Plant 1', variety: 'Swarna', paddy: 100.000, rice: 70.000, headRice: 62.00, broken: 8.00, byProducts: 26.000, loss: 2.000, recovery: 98.00 },
 { date: '15/05/2025', batchNo: 'BATCH-2025-002', plant: 'Plant 1', variety: 'IR-64', paddy: 95.500, rice: 63.000, headRice: 61.50, broken: 8.20, byProducts: 24.800, loss: 1.700, recovery: 97.80 },
 { date: '14/05/2025', batchNo: 'BATCH-2025-003', plant: 'Plant 2', variety: 'Swarna', paddy: 110.000, rice: 74.000, headRice: 63.80, broken: 8.40, byProducts: 28.000, loss: 2.000, recovery: 98.20 },
 { date: '14/05/2025', batchNo: 'BATCH-2025-004', plant: 'Plant 1', variety: 'IR-64', paddy: 98.000, rice: 61.000, headRice: 60.50, broken: 8.10, byProducts: 25.000, loss: 1.900, recovery: 96.70 },
 { date: '13/05/2025', batchNo: 'BATCH-2025-005', plant: 'Plant 3', variety: 'MTU-7029', paddy: 105.000, rice: 69.500, headRice: 64.20, broken: 7.90, byProducts: 25.600, loss: 2.000, recovery: 98.60 },
 ];

 return (
 <div className="flex flex-col h-full bg-[var(--bg-base)] text-[var(--text-muted)]">
 {/* Header & Tabs */}
 <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-panel)]">
 <div className="flex items-center gap-2">
 <h1 className="text-sm font-semibold text-[var(--text-muted)]">Yield Management</h1>
 </div>
 </div>



 <div className="flex-1 overflow-y-auto p-6 space-y-6">
 
 {/* Top Metric Cards */}
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

 {/* Main Workspace */}
 <div className="grid grid-cols-12 gap-6">
 
 {/* Left Column: Yield Calculator (3 cols) */}
 <div className="col-span-3 flex flex-col gap-4 h-[600px]">
 <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-lg shadow-black/20 flex flex-col h-full">
 <h2 className="text-lg font-bold text-[var(--text-main)] mb-4">Yield Calculator</h2>
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">Batch No.</label>
 <select className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none">
 <option>BATCH-2025-001</option>
 </select>
 </div>
 <div>
 <label className="block text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">Date</label>
 <input type="date" value="2025-05-15" className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none " />
 </div>
 </div>
 <div>
 <label className="block text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">Variety</label>
 <select className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none">
 <option>Swarna</option>
 </select>
 </div>
 </div>

 <div className="mt-6 flex-1 flex flex-col">
 <div className="flex text-[10px] uppercase font-bold text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)] pb-2 mb-2">
 <span className="flex-1">Description</span>
 <span className="w-24 text-right">Quantity (MT)</span>
 <span className="w-24 text-right">% of Paddy</span>
 </div>
 
 <div className="space-y-3 flex-1">
 <div className="flex items-center text-sm">
 <span className="flex-1 text-[var(--text-muted)]">Paddy Input</span>
 <input type="text" value="100.000" readOnly className="w-24 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)] text-right outline-none" />
 <span className="w-24 text-right text-[var(--text-muted-alt)] font-medium">100.00%</span>
 </div>
 <div className="flex items-center text-sm">
 <span className="flex-1 text-[var(--text-muted)]">Head Rice</span>
 <input type="text" value="62.000" readOnly className="w-24 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1 text-green-400 text-right outline-none font-bold" />
 <span className="w-24 text-right text-green-400 font-bold">62.00%</span>
 </div>
 <div className="flex items-center text-sm">
 <span className="flex-1 text-[var(--text-muted)]">Broken Rice</span>
 <input type="text" value="8.000" readOnly className="w-24 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)] text-right outline-none" />
 <span className="w-24 text-right text-[var(--text-muted-alt)] font-medium">8.00%</span>
 </div>
 <div className="flex items-center text-sm">
 <span className="flex-1 text-[var(--text-muted)]">Bran</span>
 <input type="text" value="10.000" readOnly className="w-24 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)] text-right outline-none" />
 <span className="w-24 text-right text-[var(--text-muted-alt)] font-medium">10.00%</span>
 </div>
 <div className="flex items-center text-sm">
 <span className="flex-1 text-[var(--text-muted)]">Husk</span>
 <input type="text" value="18.000" readOnly className="w-24 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)] text-right outline-none" />
 <span className="w-24 text-right text-[var(--text-muted-alt)] font-medium">18.00%</span>
 </div>
 <div className="flex items-center text-sm">
 <span className="flex-1 text-[var(--text-muted)]">Loss / Others</span>
 <input type="text" value="2.000" readOnly className="w-24 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1 text-red-400 text-right outline-none" />
 <span className="w-24 text-right text-red-400 font-medium">2.00%</span>
 </div>
 </div>

 <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
 <div className="flex justify-between items-center mb-2">
 <span className="text-[var(--text-muted-alt)] text-sm">Total Output</span>
 <span className="font-bold text-[var(--text-main)]">98.000 MT</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-[var(--text-muted-alt)] text-sm">Overall Recovery</span>
 <div className="flex items-center gap-3">
 <span className="text-xl font-bold text-green-400">98.00%</span>
 <div className="w-10 h-10 rounded-full border-4 border-[#222] relative flex items-center justify-center">
 <svg className="absolute inset-0 w-full h-full transform -rotate-90">
 <circle cx="20" cy="20" r="16" fill="none" stroke="#22c55e" strokeWidth="4" strokeDasharray="100" strokeDashoffset="2" />
 </svg>
 <span className="text-[10px] font-bold text-[var(--text-main)] z-10">98%</span>
 </div>
 </div>
 </div>
 </div>

 <div className="flex gap-2 mt-6">
 <button className="flex-1 py-2.5 bg-[var(--bg-panel-alt)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-main)] rounded-lg font-bold text-sm transition-colors border border-[var(--border-subtle)]">Reset</button>
 <button className="flex-[2] py-2.5 bg-[#e67e00] hover:bg-[#cc7000] text-black rounded-lg font-bold text-sm transition-colors shadow-lg shadow-amber-500/20">Calculate Yield</button>
 </div>
 </div>
 </div>
 </div>

 {/* Center Column: Yield Analytics (6 cols) */}
 <div className="col-span-6 grid grid-cols-2 gap-4 h-[600px] overflow-y-auto">
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
 <XAxis type="number" stroke="#666" fontSize={10} domain={[50, 70]} tickLine={false} axisLine={false} />
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

 {/* Right Column: Insights & Summary (3 cols) */}
 <div className="col-span-3 flex flex-col gap-4 h-[600px] overflow-y-auto pr-1">
 
 {/* Card 1: Batch Summary */}
 <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-lg shadow-black/20">
 <div className="flex items-center justify-between mb-4">
 <h3 className="font-bold text-[var(--text-main)] text-sm">Batch Summary <span className="text-[var(--text-muted-alt)] font-normal">(BATCH-2025-001)</span></h3>
 <Printer size={14} className="text-[var(--text-muted-alt)] cursor-pointer hover:text-[var(--text-main)]" />
 </div>
 <div className="space-y-2 text-xs">
 <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1">
 <span className="text-[var(--text-muted-alt)]">Batch No.</span><span className="font-mono text-[var(--text-main)]">BATCH-2025-001</span>
 </div>
 <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1">
 <span className="text-[var(--text-muted-alt)]">Start Time</span><span className="text-[var(--text-main)]">15/05/2025 09:10 AM</span>
 </div>
 <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1">
 <span className="text-[var(--text-muted-alt)]">End Time</span><span className="text-[var(--text-main)]">15/05/2025 02:45 PM</span>
 </div>
 <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1">
 <span className="text-[var(--text-muted-alt)]">Paddy Used</span><span className="text-[var(--text-main)] font-medium">100.000 MT</span>
 </div>
 <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1">
 <span className="text-[var(--text-muted-alt)]">Rice Produced</span><span className="text-blue-400 font-medium">70.000 MT</span>
 </div>
 <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1">
 <span className="text-[var(--text-muted-alt)]">By-products</span><span className="text-[var(--text-main)]">26.000 MT</span>
 </div>
 <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1">
 <span className="text-[var(--text-muted-alt)]">Loss / Others</span><span className="text-red-400">2.000 MT</span>
 </div>
 <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1 pt-1">
 <span className="text-[var(--text-muted-alt)] font-bold">Overall Recovery</span><span className="text-green-400 font-bold">98.00%</span>
 </div>
 <div className="flex justify-between border-b border-[var(--border-subtle-alt)] pb-1">
 <span className="text-[var(--text-muted-alt)]">Yield Target</span><span className="text-[var(--text-main)]">65.00%</span>
 </div>
 <div className="flex justify-between pt-1">
 <span className="text-[var(--text-muted-alt)]">Achievement</span><span className="text-[#e67e00] font-bold">151.00%</span>
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
 <span className="font-bold text-green-500 text-sm">Plant 3</span>
 </div>
 <div className="flex items-center justify-between bg-[var(--bg-panel-alt)] p-2.5 rounded-lg border border-[var(--border-subtle-alt)]">
 <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
 <div className="p-1 bg-blue-500/20 text-blue-500 rounded"><TrendingUp size={12} /></div>
 Highest Yield
 </div>
 <span className="font-bold text-blue-400 text-sm">67.80%</span>
 </div>
 <div className="flex items-center justify-between bg-[var(--bg-panel-alt)] p-2.5 rounded-lg border border-[var(--border-subtle-alt)]">
 <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
 <div className="p-1 bg-red-500/20 text-red-500 rounded"><TrendingDown size={12} /></div>
 Lowest Yield
 </div>
 <span className="font-bold text-red-400 text-sm">61.40%</span>
 </div>
 <div className="flex items-center justify-between bg-[var(--bg-panel-alt)] p-2.5 rounded-lg border border-[var(--border-subtle-alt)]">
 <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
 <div className="p-1 bg-gray-500/20 text-[var(--text-muted-alt)] rounded"><LineChart size={12} /></div>
 Average Yield (All Plants)
 </div>
 <span className="font-bold text-[var(--text-main)] text-sm">65.40%</span>
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
 <span className="text-3xl font-bold text-[var(--text-main)]">66.90%</span>
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

 {/* Bottom Row: Historical Reports Ledger */}
 <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col mt-6 shadow-lg shadow-black/20">
 <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-subtle)]">
 <h2 className="text-lg font-bold text-[var(--text-main)]">Historical Yield Reports</h2>
 
 <div className="flex items-center gap-3">
 <div className="flex items-center gap-2 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5">
 <Calendar size={14} className="text-[var(--text-muted-alt)]" />
 <span className="text-xs text-[var(--text-main)]">01/04/2025 - 15/05/2025</span>
 </div>
 
 <div className="flex items-center gap-2 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5">
 <span className="text-xs text-[var(--text-muted-alt)]">Plant</span>
 <select className="bg-transparent text-xs text-[var(--text-main)] outline-none">
 <option>All Plants</option>
 </select>
 </div>

 <div className="flex items-center gap-2 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5">
 <span className="text-xs text-[var(--text-muted-alt)]">Variety</span>
 <select className="bg-transparent text-xs text-[var(--text-main)] outline-none">
 <option>All Varieties</option>
 </select>
 </div>

 <div className="flex items-center gap-2 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5">
 <Search size={14} className="text-[var(--text-muted-alt)]" />
 <input type="text" placeholder="Batch" className="bg-transparent text-xs text-[var(--text-main)] outline-none w-24" />
 </div>
 
 <button className="bg-[#e67e00] text-black px-4 py-1.5 rounded-lg text-xs font-bold">Search</button>
 <button className="bg-transparent border border-[var(--border-subtle)] text-[var(--text-main)] hover:bg-[var(--glass-bg)] px-4 py-1.5 rounded-lg text-xs font-medium">Reset</button>
 
 <div className="h-6 w-px bg-[var(--glass-bg)] mx-1"></div>
 
 <button className="flex items-center gap-1.5 text-green-400 border border-green-500/30 hover:bg-green-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
 <Download size={14} /> Export Excel
 </button>
 <button className="flex items-center gap-1.5 text-red-400 border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
 <FileText size={14} /> Export PDF
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
 <th className="p-3 text-right">By-products (MT)</th>
 <th className="p-3 text-right">Loss (MT)</th>
 <th className="p-3 text-right">Overall Recovery (%)</th>
 </tr>
 </thead>
 <tbody>
 {historicalReports.map((r, i) => (
 <tr key={i} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)]">
 <td className="p-3 text-[var(--text-muted-alt)]">{i + 1}</td>
 <td className="p-3 text-[var(--text-muted)]">{r.date}</td>
 <td className="p-3 font-mono font-medium text-[var(--text-main)]">{r.batchNo}</td>
 <td className="p-3 text-[var(--text-muted)]">{r.plant}</td>
 <td className="p-3 text-[var(--text-muted)]">{r.variety}</td>
 <td className="p-3 text-right font-medium text-[var(--text-muted)]">{r.paddy.toFixed(3)}</td>
 <td className="p-3 text-right font-medium text-blue-400">{r.rice.toFixed(3)}</td>
 <td className="p-3 text-right font-medium text-green-400">{r.headRice.toFixed(2)}%</td>
 <td className="p-3 text-right font-medium text-amber-500">{r.broken.toFixed(2)}%</td>
 <td className="p-3 text-right text-[var(--text-muted-alt)]">{r.byProducts.toFixed(3)}</td>
 <td className="p-3 text-right text-red-400">{r.loss.toFixed(3)}</td>
 <td className="p-3 text-right font-bold text-[var(--text-main)]">{r.recovery.toFixed(2)}%</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 
 <div className="flex items-center justify-between mt-4 text-xs text-[var(--text-muted-alt)]">
 <span>Showing 1 to 5 of 25 records</span>
 <div className="flex gap-1">
 <button className="px-2 py-1 rounded hover:bg-[var(--glass-bg)]">&lt;</button>
 <button className="px-2 py-1 rounded bg-[#e67e00] text-black font-bold">1</button>
 <button className="px-2 py-1 rounded hover:bg-[var(--glass-bg)]">2</button>
 <button className="px-2 py-1 rounded hover:bg-[var(--glass-bg)]">3</button>
 <button className="px-2 py-1 rounded hover:bg-[var(--glass-bg)]">4</button>
 <button className="px-2 py-1 rounded hover:bg-[var(--glass-bg)]">5</button>
 <button className="px-2 py-1 rounded hover:bg-[var(--glass-bg)]">&gt;</button>
 </div>
 </div>
 </div>

 </div>
 </div>
 );
};

import React, { useState } from 'react';
import { 
  Package, Search, Filter, Plus, ArrowRightLeft, Settings2, Download, 
  Warehouse, FileText, AlertCircle, TrendingUp, AlertTriangle, Layers
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { usePlantStore } from '../store/plantStore';

export const InventoryManagement = () => {
  const activePlant = usePlantStore(state => state.activePlant);
  const [activeGodown, setActiveGodown] = useState('all');

  const inventorySummary = [
    { label: 'Total Paddy Stock', value: '3,450.50', unit: 'MT', icon: Package, color: 'text-amber-500' },
    { label: 'Total Rice Stock', value: '1,280.25', unit: 'MT', icon: Package, color: 'text-blue-500' },
    { label: 'Total By-products', value: '450.80', unit: 'MT', icon: Layers, color: 'text-purple-500' },
    { label: 'Total Asset Value', value: '₹ 8,45,20,000', unit: '', icon: TrendingUp, color: 'text-green-500' }
  ];

  const stockCompositionData = [
    { name: 'Swarna (Paddy)', value: 45, color: '#f59e0b' },
    { name: 'IR-64 (Paddy)', value: 25, color: '#eab308' },
    { name: 'Head Rice', value: 15, color: '#3b82f6' },
    { name: 'Broken Rice', value: 5, color: '#8b5cf6' },
    { name: 'Bran & Husk', value: 10, color: '#06b6d4' }
  ];

  const godownStockData = [
    { name: 'Godown A', Paddy: 1200, Rice: 400, ByProducts: 100 },
    { name: 'Godown B', Paddy: 1800, Rice: 600, ByProducts: 150 },
    { name: 'Godown C', Paddy: 450, Rice: 280, ByProducts: 200 }
  ];

  const masterStockList = [
    { id: 'INV-001', itemType: 'PADDY', variety: 'Swarna', godown: 'Godown A', total: 1200.50, usable: 1100.00, reserved: 100.00, damaged: 0.50, lastUpdate: 'Today, 10:30 AM' },
    { id: 'INV-002', itemType: 'PADDY', variety: 'IR-64', godown: 'Godown B', total: 1800.00, usable: 1650.00, reserved: 150.00, damaged: 0.00, lastUpdate: 'Today, 09:15 AM' },
    { id: 'INV-003', itemType: 'RICE', variety: 'Swarna (Head)', godown: 'Godown C', total: 400.25, usable: 380.25, reserved: 20.00, damaged: 0.00, lastUpdate: 'Yesterday, 04:45 PM' },
    { id: 'INV-004', itemType: 'RICE', variety: 'IR-64 (Head)', godown: 'Godown A', total: 250.00, usable: 250.00, reserved: 0.00, damaged: 0.00, lastUpdate: '14/05/2025' },
    { id: 'INV-005', itemType: 'BY_PRODUCT', variety: 'Rice Bran', godown: 'Godown B', total: 150.80, usable: 150.80, reserved: 0.00, damaged: 0.00, lastUpdate: '14/05/2025' },
    { id: 'INV-006', itemType: 'BY_PRODUCT', variety: 'Husk', godown: 'Godown C', total: 200.00, usable: 195.00, reserved: 0.00, damaged: 5.00, lastUpdate: '13/05/2025' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-gray-200">
      {/* Header & Quick Actions */}
      <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Inventory & Warehouse Management
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Monitor stock levels, multi-godown allocations, and financial asset value</p>
        </div>
        <div className="flex gap-3">
           <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-white/10 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-black/20">
             <Settings2 size={16} /> Adjust Stock
           </button>
           <button className="flex items-center gap-2 px-4 py-2 bg-[#e67e00] hover:bg-[#cc7000] text-black rounded-lg font-bold text-sm transition-colors shadow-lg shadow-[#e67e00]/20">
             <ArrowRightLeft size={16} /> Internal Transfer
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Top Summary Row */}
        <div className="grid grid-cols-4 gap-6">
          {inventorySummary.map((m, i) => (
            <div key={i} className="bg-[#121212] p-5 rounded-xl border border-white/10 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-xs text-gray-400 uppercase tracking-wider">{m.label}</span>
                <div className={`p-2 rounded-lg bg-white/5 border border-white/10 ${m.color}`}>
                  <m.icon size={18} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                 <span className="text-2xl font-bold text-white">{m.value}</span>
                 {m.unit && <span className="text-sm font-medium text-gray-500">{m.unit}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard Visualizations */}
        <div className="grid grid-cols-12 gap-6">
          {/* Stock Composition (Pie Chart) */}
          <div className="col-span-4 bg-[#121212] border border-white/10 rounded-xl p-5 shadow-lg shadow-black/20 h-80 flex flex-col">
            <h3 className="font-bold text-white text-sm mb-4">Global Stock Composition</h3>
            <div className="flex-1 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockCompositionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stockCompositionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <Package size={24} className="text-gray-500 mb-1" />
                <span className="text-[10px] text-gray-400 font-bold">INVENTORY</span>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-2 text-[10px]">
                {stockCompositionData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-white/5 pb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-gray-400 truncate">{item.name}</span>
                    </div>
                    <span className="font-bold text-white">{item.value}%</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Godown Wise Distribution (Bar Chart) */}
          <div className="col-span-8 bg-[#121212] border border-white/10 rounded-xl p-5 shadow-lg shadow-black/20 h-80 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-sm">Godown-Wise Stock Distribution (MT)</h3>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#f59e0b] rounded-sm"></div> <span className="text-gray-400">Paddy</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#3b82f6] rounded-sm"></div> <span className="text-gray-400">Rice</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#a855f7] rounded-sm"></div> <span className="text-gray-400">By-products</span></div>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0">
               <ResponsiveContainer width="100%" height="100%">
                <BarChart data={godownStockData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="name" stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '12px' }} itemStyle={{ color: '#fff' }} cursor={{fill: '#1a1a1a'}} />
                  <Bar dataKey="Paddy" stackId="a" fill="#f59e0b" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Rice" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="ByProducts" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Master Stock Data Grid */}
        <div className="bg-[#121212] border border-white/10 rounded-xl flex flex-col shadow-lg shadow-black/20">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Warehouse size={18} className="text-[#e67e00]" /> Master Stock Register
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5">
                <Search size={14} className="text-gray-500" />
                <input type="text" placeholder="Search Item, Variety..." className="bg-transparent text-xs text-white outline-none w-48" />
              </div>
              <select className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none">
                <option>All Item Types</option>
                <option>PADDY</option>
                <option>RICE</option>
                <option>BY_PRODUCT</option>
              </select>
              <select className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none" value={activeGodown} onChange={(e) => setActiveGodown(e.target.value)}>
                <option value="all">All Godowns</option>
                <option value="Godown A">Godown A</option>
                <option value="Godown B">Godown B</option>
                <option value="Godown C">Godown C</option>
              </select>
              <button className="bg-[#1a1a1a] hover:bg-[#222] border border-white/10 text-white p-1.5 rounded-lg transition-colors">
                <Filter size={16} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-400 border-b border-white/10 uppercase font-medium bg-[#161616] text-xs">
                  <th className="p-4">Item Code</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Variety</th>
                  <th className="p-4">Godown</th>
                  <th className="p-4 text-right">Usable (MT)</th>
                  <th className="p-4 text-right">Reserved (MT)</th>
                  <th className="p-4 text-right">Damaged (MT)</th>
                  <th className="p-4 text-right bg-white/5 font-bold">Total Stock (MT)</th>
                  <th className="p-4 text-center">Last Update</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {masterStockList.filter(s => activeGodown === 'all' || s.godown === activeGodown).map((item, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 font-mono font-medium text-white">{item.id}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        item.itemType === 'PADDY' ? 'bg-amber-900/50 text-amber-400' :
                        item.itemType === 'RICE' ? 'bg-blue-900/50 text-blue-400' :
                        'bg-purple-900/50 text-purple-400'
                      }`}>
                        {item.itemType}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gray-300">{item.variety}</td>
                    <td className="p-4 text-gray-300">{item.godown}</td>
                    <td className="p-4 text-right font-medium text-green-400">{item.usable.toFixed(2)}</td>
                    <td className="p-4 text-right font-medium text-blue-400">{item.reserved.toFixed(2)}</td>
                    <td className="p-4 text-right font-medium text-red-400">{item.damaged.toFixed(2)}</td>
                    <td className="p-4 text-right font-bold text-white bg-white/5">{item.total.toFixed(2)}</td>
                    <td className="p-4 text-center text-xs text-gray-500">{item.lastUpdate}</td>
                    <td className="p-4 text-center">
                      <button className="text-gray-400 hover:text-white transition-colors" title="View Audit Ledger">
                        <FileText size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

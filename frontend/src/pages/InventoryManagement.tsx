import React, { useState, useEffect } from 'react';
import { 
  Package, Search, Filter, Plus, ArrowRightLeft, Settings2, Download, 
  Warehouse, FileText, AlertCircle, TrendingUp, AlertTriangle, Layers,
  HelpCircle, Settings, ClipboardList, Database
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import { usePlantStore } from '../store/plantStore';
import { inventoryApi } from '../api/inventory';
import api from '../api/axios';
import { StockReport } from './StockReport';
import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { id: 'PADDY', label: 'Paddy Stock' },
  { id: 'RICE', label: 'Rice Stock' },
  { id: 'BRAN', label: 'Bran Stock' },
  { id: 'HUSK', label: 'Husk Stock' },
  { id: 'FINISHED_GOODS', label: 'Finished Goods' },
  { id: 'CONSUMABLES', label: 'Consumables Inventory' }
];

export const InventoryManagement = () => {
  const activePlant = usePlantStore(state => state.activePlant);
  const [activeGodown, setActiveGodown] = useState('all');
  
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'PADDY';
  
  const [showStockReport, setShowStockReport] = useState(false);
  const [globalMetrics, setGlobalMetrics] = useState<any>(null);
  const [tabMetrics, setTabMetrics] = useState<any[]>([]);
  const [compositionData, setCompositionData] = useState<any[]>([]);
  const [godownData, setGodownData] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', variety: '', search: '' });

  useEffect(() => {
    fetchDashboard();
    fetchInventoryList();
  }, [activePlant, activeTab, activeGodown, filters]);

  const fetchDashboard = async () => {
    try {
      setDashboardLoading(true);
      const res = await inventoryApi.getDashboardSummary({ itemType: activeTab });
      setGlobalMetrics(res.data.globalMetrics);
      setTabMetrics(res.data.tabMetrics);
      
      const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#eab308'];
      const comp = res.data.stockComposition.map((c: any, i: number) => ({ ...c, color: colors[i % colors.length] }));
      setCompositionData(comp);
      
      setGodownData(res.data.godownStockData);
    } catch (err) {
      console.error(err);
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchInventoryList = async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.getInventoryList({
        itemType: activeTab,
        godown: activeGodown === 'all' ? undefined : activeGodown,
        search: filters.search,
        category: filters.category,
        variety: filters.variety
      });
      setInventoryList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderGlobalMetrics = () => {
    if (!globalMetrics) return <div className="py-4 text-center text-[var(--text-muted-alt)]">Loading Global Stats...</div>;
    
    const metricConfigs = [
      { key: 'PADDY', label: 'Paddy Stock', unit: 'MT', icon: '🌾', color: 'text-green-500', bg: 'bg-green-500/10' },
      { key: 'RICE', label: 'Rice Stock', unit: 'MT', icon: '🍚', color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { key: 'BRAN', label: 'Bran Stock', unit: 'MT', icon: '🍂', color: 'text-purple-500', bg: 'bg-purple-500/10' },
      { key: 'HUSK', label: 'Husk Stock', unit: 'MT', icon: '🟡', color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { key: 'FINISHED_GOODS', label: 'Finished Goods', unit: 'MT', icon: '📦', color: 'text-teal-500', bg: 'bg-teal-500/10' },
      { key: 'CONSUMABLES', label: 'Consumables', unit: 'Qty', icon: '🛒', color: 'text-rose-500', bg: 'bg-rose-500/10' },
    ];
  
    return (
      <div className="grid grid-cols-6 gap-4 mb-4">
        {metricConfigs.map(m => {
          const data = globalMetrics[m.key] || { total: 0, value: 0 };
          return (
            <div key={m.key} className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] p-4 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${m.bg}`}>{m.icon}</div>
                <div className={`font-bold text-xs ${m.color}`}>{m.label}</div>
              </div>
              <div>
                <div className="font-bold text-xl text-[var(--text-main)] mb-1">
                  {data.total.toLocaleString('en-IN', {minimumFractionDigits: 3, maximumFractionDigits: 3})} <span className="text-[10px] text-[var(--text-muted)] font-normal">{m.unit}</span>
                </div>
                <div className="text-[10px] text-[var(--text-muted-alt)] font-medium">
                  ₹ {data.value.toLocaleString('en-IN')} <br/> <span className="font-normal opacity-75">Stock Value</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTabBar = () => (
    <div className="flex border-b border-[var(--border-subtle)] mb-6 overflow-x-auto no-scrollbar">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => {
            navigate(`/inventory?tab=${tab.id}`);
          }}
          className={`px-6 py-3 font-semibold text-sm whitespace-nowrap transition-colors ${
            activeTab === tab.id
              ? 'border-b-2 border-blue-500 text-[var(--text-main)]'
              : 'text-[var(--text-muted-alt)] hover:text-[var(--text-main)]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  const renderTabOverview = () => {
    const currentTabLabel = TABS.find(t => t.id === activeTab)?.label || 'Stock';
    
    return (
      <div className="col-span-12 md:col-span-5 lg:col-span-5 space-y-6">
        <div>
          <h3 className="font-bold text-[var(--text-main)] text-sm mb-3">{currentTabLabel} Overview</h3>
          <div className="grid grid-cols-4 gap-3">
            {tabMetrics.map((m, i) => (
              <div key={i} className="bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border-subtle)] text-center shadow-sm">
                <div className="text-[10px] font-bold text-[var(--text-muted)] mb-1">{m.label}</div>
                <div className={`font-bold text-lg ${
                  m.type === 'TOTAL' ? 'text-[var(--text-main)]' : 
                  m.type === 'USABLE' ? 'text-green-500' :
                  m.type === 'RESERVED' ? 'text-amber-500' : 'text-red-500'
                }`}>
                  {m.value} <span className="text-[10px] text-[var(--text-muted)] font-normal">{m.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
  
        <div>
          <h3 className="font-bold text-[var(--text-main)] text-sm mb-3">{currentTabLabel.split(' ')[0]} in Godowns</h3>
          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-sm h-64 overflow-y-auto">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-[var(--bg-panel-hover)] text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)] sticky top-0 z-10">
                <tr>
                  <th className="p-3">Godown</th>
                  <th className="p-3">Variety</th>
                  <th className="p-3 text-right">Stock (MT)</th>
                  <th className="p-3 text-right">Usable</th>
                  <th className="p-3 text-right">Reserved</th>
                  <th className="p-3 text-right">Damaged</th>
                </tr>
              </thead>
              <tbody>
                {godownData.length > 0 ? godownData.map((g, i) => (
                  <tr key={i} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)]">
                    <td className="p-3 font-medium text-[var(--text-main)]">{g.godown}</td>
                    <td className="p-3 text-[var(--text-muted)]">{g.variety}</td>
                    <td className="p-3 text-right font-bold text-[var(--text-main)]">{g.stock.toFixed(3)}</td>
                    <td className="p-3 text-right text-green-500">{g.usable.toFixed(3)}</td>
                    <td className="p-3 text-right text-amber-500">{g.reserved.toFixed(3)}</td>
                    <td className="p-3 text-right text-red-500">{g.damaged.toFixed(3)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-[var(--text-muted-alt)]">No Godown Data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderCompositionChart = () => {
    return (
      <div className="col-span-12 md:col-span-4 lg:col-span-4 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm flex flex-col h-full">
        <h3 className="font-bold text-[var(--text-main)] text-sm mb-4 text-center">Stock Composition (MT)</h3>
        <div className="flex-1 min-h-[160px] max-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={compositionData}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {compositionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '11px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-4 text-[10px]">
          {compositionData.map((c, i) => (
            <div key={i} className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }}></div>
                <span className="text-[var(--text-muted-alt)] truncate">{c.name} Stock</span>
              </div>
              <span className="font-bold text-[var(--text-main)] pl-3.5">{c.value.toFixed(3)} MT</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStockAlerts = () => {
    const alerts: any[] = [];
    if (inventoryList && inventoryList.length > 0) {
      inventoryList.forEach(item => {
        if (item.quantity < 20) {
          alerts.push({ type: 'Low Stock Alert', desc: `${item.variety || item.itemType} in ${item.godown || 'Warehouse'} is low`, val: `Current: ${item.quantity.toFixed(3)} ${item.unit || 'MT'}`, time: 'Just now', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' });
        } else if (item.quantity < 50) {
          alerts.push({ type: 'Reorder Alert', desc: `${item.variety || item.itemType} is below reorder level`, val: `Current: ${item.quantity.toFixed(3)} ${item.unit || 'MT'}`, time: 'Recently', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' });
        }
      });
    }

    if (alerts.length === 0) {
      alerts.push({ type: 'All Good', desc: 'Stock levels are healthy across all godowns.', val: '', time: 'Now', icon: HelpCircle, color: 'text-blue-500', bg: 'bg-blue-500/10' });
    }

    return (
      <div className="col-span-12 md:col-span-3 lg:col-span-3 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[var(--text-main)] text-sm">Stock Alerts</h3>
          <button className="text-[10px] text-blue-500 hover:underline">View All</button>
        </div>
        <div className="space-y-4 flex-1 overflow-y-auto pr-2 no-scrollbar">
          {alerts.slice(0, 5).map((a, i) => {
            const Icon = a.icon;
            return (
              <div key={i} className="flex gap-3">
                <div className={`p-2 rounded-full shrink-0 h-min ${a.bg} ${a.color}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold ${a.color}`}>{a.type}</span>
                    <span className="text-[9px] text-[var(--text-muted-alt)]">{a.time}</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-main)] mt-0.5">{a.desc}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{a.val}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStockDetails = () => (
    <div className="col-span-12 lg:col-span-9 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col shadow-sm">
      <div className="p-4 border-b border-[var(--border-subtle)]">
        <h3 className="font-bold text-[var(--text-main)] text-sm mb-3">Stock Details</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filters.category} onChange={e => setFilters(f => ({...f, category: e.target.value}))} className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-main)] outline-none min-w-[120px]">
            <option value="">All Categories</option>
            <option value="PADDY">Paddy</option>
            <option value="RICE">Rice</option>
          </select>
          <select className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-main)] outline-none min-w-[120px]" value={activeGodown} onChange={(e) => setActiveGodown(e.target.value)}>
            <option value="all">All Godowns</option>
            <option value="Godown A">Godown A</option>
            <option value="Godown B">Godown B</option>
            <option value="Godown C">Godown C</option>
            <option value="Godown D">Godown D</option>
          </select>
          <select value={filters.variety} onChange={e => setFilters(f => ({...f, variety: e.target.value}))} className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-main)] outline-none min-w-[120px]">
            <option value="">All Varieties</option>
            <option value="Sugandha">Sugandha</option>
            <option value="Sharbati">Sharbati</option>
          </select>
          <div className="flex-1"></div>
          <div className="flex items-center gap-2 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5">
            <Search size={14} className="text-[var(--text-muted-alt)]" />
            <input type="text" value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} placeholder="Search Item / Godown" className="bg-transparent text-xs text-[var(--text-main)] outline-none w-40" />
          </div>
          <button onClick={async () => {
            try {
              const res = await api.get('/inventory', {
                params: {
                  itemType: activeTab,
                  godown: activeGodown === 'all' ? undefined : activeGodown,
                  search: filters.search,
                  category: filters.category,
                  variety: filters.variety,
                  limit: 1000000,
                  page: 1
                }
              });
              const inventoryData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
              const data = inventoryData.map((i: any) => ({
                Item: i.variety || i.itemType,
                Category: i.itemType,
                Godown: i.godown,
                Stock: i.quantity,
                Usable: i.usable,
                Reserved: i.reserved,
                Damaged: i.damaged,
                Value: i.stockValue
              }));
              exportToExcel(data, 'inventory_stock.xlsx');
            } catch (error) {
              console.error('Failed to export all records', error);
            }
          }} className="bg-transparent border border-green-500/50 text-green-500 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold">
            <Download size={14} /> Excel
          </button>
          <button onClick={async () => {
            try {
              const res = await api.get('/inventory', {
                params: {
                  itemType: activeTab,
                  godown: activeGodown === 'all' ? undefined : activeGodown,
                  search: filters.search,
                  category: filters.category,
                  variety: filters.variety,
                  limit: 1000000,
                  page: 1
                }
              });
              const inventoryData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
              const data = inventoryData.map((i: any) => ({
                Item: i.variety || i.itemType,
                Category: i.itemType,
                Godown: i.godown,
                Stock: i.quantity,
                Usable: i.usable,
                Reserved: i.reserved,
                Damaged: i.damaged,
                Value: i.stockValue
              }));
              exportToPDF('Inventory Stock List', Object.keys(data[0]), data.map((d: any) => Object.values(d)), 'inventory_stock.pdf');
            } catch (error) {
              console.error('Failed to export all records', error);
            }
          }} className="bg-transparent border border-red-500/50 text-red-500 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold">
            <Download size={14} /> PDF
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] text-left">
          <thead className="bg-[var(--bg-panel-hover)] text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)]">
            <tr>
              <th className="p-3">Item Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Variety / Type</th>
              <th className="p-3">Godown</th>
              <th className="p-3 text-right">Stock (MT/Qty)</th>
              <th className="p-3 text-right">Usable Stock</th>
              <th className="p-3 text-right">Reserved Stock</th>
              <th className="p-3 text-right">Damaged / Rejected</th>
              <th className="p-3 text-center">Unit</th>
              <th className="p-3 text-right">Stock Value (₹)</th>
              <th className="p-3 text-right">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="p-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div></td></tr>
            ) : inventoryList.length > 0 ? (
              inventoryList.map((item, i) => (
                <tr key={item.id} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)]">
                  <td className="p-3 font-medium text-[var(--text-main)] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    {item.variety || item.itemType}
                  </td>
                  <td className="p-3 text-[var(--text-muted)]">{item.itemType}</td>
                  <td className="p-3 text-[var(--text-muted)]">{item.variety || '-'}</td>
                  <td className="p-3 text-[var(--text-muted)]">{item.godown || '-'}</td>
                  <td className="p-3 text-right font-bold text-[var(--text-main)]">{item.quantity.toFixed(3)}</td>
                  <td className="p-3 text-right text-green-500 font-medium">{(item.usable || 0).toFixed(3)}</td>
                  <td className="p-3 text-right text-amber-500 font-medium">{(item.reserved || 0).toFixed(3)}</td>
                  <td className="p-3 text-right text-red-500 font-medium">{(item.damaged || 0).toFixed(3)}</td>
                  <td className="p-3 text-center text-[var(--text-muted-alt)]">{item.unit || 'MT'}</td>
                  <td className="p-3 text-right text-[var(--text-muted)]">{(item.stockValue || 0).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right text-[var(--text-muted-alt)]">Today 11:20 AM</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={11} className="p-8 text-center text-[var(--text-muted-alt)]">No items found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted-alt)]">
        <span>Showing 1 to {inventoryList.length} of {inventoryList.length} records</span>
        <div className="flex items-center gap-1">
          <button className="px-2 py-1 rounded bg-[var(--bg-panel-hover)]">&lt;</button>
          <button className="px-2 py-1 rounded bg-blue-600 text-white">1</button>
          <button className="px-2 py-1 rounded bg-[var(--bg-panel-hover)]">2</button>
          <button className="px-2 py-1 rounded bg-[var(--bg-panel-hover)]">3</button>
          <button className="px-2 py-1 rounded bg-[var(--bg-panel-hover)]">&gt;</button>
        </div>
      </div>
    </div>
  );

  const renderInventoryValueAndActions = () => {
    let rawMaterials = 0, wip = 0, fg = 0, consumables = 0, total = 0;
    
    if (globalMetrics) {
      rawMaterials = (globalMetrics.PADDY?.value || 0);
      wip = (globalMetrics.RICE?.value || 0) + (globalMetrics.BRAN?.value || 0) + (globalMetrics.HUSK?.value || 0);
      fg = (globalMetrics.FINISHED_GOODS?.value || 0);
      consumables = (globalMetrics.CONSUMABLES?.value || 0);
      total = rawMaterials + wip + fg + consumables;
    }

    const calcPercent = (val: number) => total > 0 ? ((val / total) * 100).toFixed(2) : '0.00';

    return (
      <div className="col-span-12 lg:col-span-3 space-y-6">
        {/* Inventory Value Summary */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-[var(--text-main)] text-sm">Inventory Value Summary</h3>
            <Database size={16} className="text-green-500" />
          </div>
          <div className="text-[10px] text-[var(--text-muted-alt)] mb-1">Total Inventory Value</div>
          <div className="text-2xl font-bold text-green-500 mb-6">₹ {total.toLocaleString('en-IN')}</div>

          <div className="space-y-4 text-[11px]">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[var(--text-muted)]">Raw Materials (Paddy)</span>
                <span className="text-[var(--text-main)] font-medium">₹ {rawMaterials.toLocaleString('en-IN')} <span className="text-[var(--text-muted-alt)]">({calcPercent(rawMaterials)}%)</span></span>
              </div>
              <div className="h-1.5 w-full bg-[var(--bg-panel-hover)] rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${calcPercent(rawMaterials)}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[var(--text-muted)]">Work in Progress</span>
                <span className="text-[var(--text-main)] font-medium">₹ {wip.toLocaleString('en-IN')} <span className="text-[var(--text-muted-alt)]">({calcPercent(wip)}%)</span></span>
              </div>
              <div className="h-1.5 w-full bg-[var(--bg-panel-hover)] rounded-full overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${calcPercent(wip)}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[var(--text-muted)]">Finished Goods</span>
                <span className="text-[var(--text-main)] font-medium">₹ {fg.toLocaleString('en-IN')} <span className="text-[var(--text-muted-alt)]">({calcPercent(fg)}%)</span></span>
              </div>
              <div className="h-1.5 w-full bg-[var(--bg-panel-hover)] rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${calcPercent(fg)}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[var(--text-muted)]">Consumables</span>
                <span className="text-[var(--text-main)] font-medium">₹ {consumables.toLocaleString('en-IN')} <span className="text-[var(--text-muted-alt)]">({calcPercent(consumables)}%)</span></span>
              </div>
              <div className="h-1.5 w-full bg-[var(--bg-panel-hover)] rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{ width: `${calcPercent(consumables)}%` }}></div></div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-[var(--text-main)] text-sm mb-4">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-3">
            <button className="flex flex-col items-center justify-center p-3 border border-[var(--border-subtle)] rounded-xl hover:bg-[var(--bg-panel-hover)] transition-colors">
              <div className="w-8 h-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-2"><Plus size={16} /></div>
              <span className="text-[10px] font-medium text-[var(--text-main)] text-center">Add Stock</span>
            </button>
            <button className="flex flex-col items-center justify-center p-3 border border-[var(--border-subtle)] rounded-xl hover:bg-[var(--bg-panel-hover)] transition-colors">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2"><ArrowRightLeft size={16} /></div>
              <span className="text-[10px] font-medium text-[var(--text-main)] text-center">Stock Transfer</span>
            </button>
            <button className="flex flex-col items-center justify-center p-3 border border-[var(--border-subtle)] rounded-xl hover:bg-[var(--bg-panel-hover)] transition-colors">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2"><Settings2 size={16} /></div>
              <span className="text-[10px] font-medium text-[var(--text-main)] text-center">Stock Adjustment</span>
            </button>
            <button className="flex flex-col items-center justify-center p-3 border border-[var(--border-subtle)] rounded-xl hover:bg-[var(--bg-panel-hover)] transition-colors">
              <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mb-2"><ClipboardList size={16} /></div>
              <span className="text-[10px] font-medium text-[var(--text-main)] text-center">Stock Count</span>
            </button>
            <button className="flex flex-col items-center justify-center p-3 border border-[var(--border-subtle)] rounded-xl hover:bg-[var(--bg-panel-hover)] transition-colors">
              <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-2"><Settings size={16} /></div>
              <span className="text-[10px] font-medium text-[var(--text-main)] text-center">Reorder Settings</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] text-[var(--text-muted)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-panel)] z-10">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)]">Inventory Management</h1>
          <span className="text-xs text-[var(--text-muted-alt)] mt-1 block">Manage all types of inventory across your plants</span>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-[var(--bg-panel-hover)] border border-blue-500/50 text-blue-500 rounded-lg font-semibold text-xs transition-colors">
            <ArrowRightLeft size={16} /> Stock Transfer
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-[var(--bg-panel-hover)] border border-green-500/50 text-green-500 rounded-lg font-semibold text-xs transition-colors">
            <Settings2 size={16} /> Adjust Stock
          </button>
          <button onClick={() => setShowStockReport(true)} className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-[var(--bg-panel-hover)] border border-[var(--border-subtle)] text-[var(--text-main)] rounded-lg font-semibold text-xs transition-colors">
            <FileText size={16} /> Stock Report
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pt-6">
        {dashboardLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <div className="text-[var(--text-muted-alt)] font-medium">Loading Dashboard Data...</div>
          </div>
        ) : (
          <>
            {renderGlobalMetrics()}
            
            <div className="grid grid-cols-12 gap-6 mb-6">
              {renderTabOverview()}
              {renderCompositionChart()}
              {renderStockAlerts()}
            </div>

            <div className="grid grid-cols-12 gap-6">
              {renderStockDetails()}
              {renderInventoryValueAndActions()}
            </div>
          </>
        )}
      </div>

      {showStockReport && <StockReport onClose={() => setShowStockReport(false)} />}
    </div>
  );
};

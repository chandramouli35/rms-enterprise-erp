import React from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { powerManagementApi } from '../api/powerManagement';
import { 
  Battery, Zap, Activity, AlertTriangle, Settings, Power, 
  ArrowUpRight, ArrowDownRight, Clock, Gauge, Sliders, Server, HardDrive, Filter, Calendar, Info, Database
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';

export function PowerManagement() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'overview';
  const queryClient = useQueryClient();

  // --- API Queries ---
  const { data: dashboard, isLoading: loadingDash } = useQuery({
    queryKey: ['powerDashboard'],
    queryFn: powerManagementApi.getDashboard,
  });

  const { data: sources, isLoading: loadingSources } = useQuery({
    queryKey: ['powerSources'],
    queryFn: powerManagementApi.getSources,
    enabled: currentTab === 'generator',
  });

  const { data: trendData, isLoading: loadingTrend } = useQuery({
    queryKey: ['powerTrend'],
    queryFn: powerManagementApi.getTrend,
    enabled: currentTab === 'analytics',
  });

  const { data: loadData, isLoading: loadingLoad } = useQuery({
    queryKey: ['powerLoad'],
    queryFn: powerManagementApi.getLoadDistribution,
    enabled: currentTab === 'load',
  });

  const { data: alerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ['powerAlerts'],
    queryFn: powerManagementApi.getAlerts,
    enabled: currentTab === 'alerts',
  });

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['powerSettings'],
    queryFn: powerManagementApi.getSettings,
    enabled: currentTab === 'settings',
  });

  const seedMutation = useMutation({
    mutationFn: powerManagementApi.seedData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['powerDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['powerSources'] });
      queryClient.invalidateQueries({ queryKey: ['powerTrend'] });
      queryClient.invalidateQueries({ queryKey: ['powerLoad'] });
      queryClient.invalidateQueries({ queryKey: ['powerAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['powerSettings'] });
    }
  });

  if (loadingDash || (currentTab === 'generator' && loadingSources) || (currentTab === 'analytics' && loadingTrend) || (currentTab === 'load' && loadingLoad) || (currentTab === 'alerts' && loadingAlerts) || (currentTab === 'settings' && loadingSettings)) {
    return <div className="flex items-center justify-center h-full text-[var(--text-muted)]">Loading Power Management Data...</div>;
  }

  // Fallback safe data
  const kpis = dashboard?.kpis || { totalConsumption: 0, dgGenerated: 0, totalCost: 0, outages: 0 };
  const overview = dashboard?.overview || { currentLoad: 0, totalCapacity: 1000, loadPercentage: 0, voltageAvg: 0, frequencyAvg: 0 };
  const gridPowerUsed = kpis.totalConsumption - kpis.dgGenerated;

  // --- Reusable Renders ---
  const renderKPIs = () => (
    <div className="flex items-stretch gap-4 mb-6">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex-1 flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-500 text-white rounded-full">
            <Zap size={16} />
          </div>
          <span className="text-sm font-semibold text-[var(--text-main)]">Total Power</span>
        </div>
        <div className="text-2xl font-bold text-[var(--text-main)] mb-1">
          {kpis.totalConsumption.toLocaleString()} <span className="text-sm font-medium text-[var(--text-muted)]">kWh</span>
        </div>
        <div className="text-xs font-semibold text-blue-500">Today's Consumption</div>
      </div>
      
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex-1 flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-500 text-white rounded-full">
            <Battery size={16} />
          </div>
          <span className="text-sm font-semibold text-[var(--text-main)]">DG Generated</span>
        </div>
        <div className="text-2xl font-bold text-[var(--text-main)] mb-1">
          {kpis.dgGenerated.toLocaleString()} <span className="text-sm font-medium text-[var(--text-muted)]">kWh</span>
        </div>
        <div className="text-xs font-semibold text-green-500">From Generator</div>
      </div>

      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex-1 flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-500 text-white rounded-full">
            <Activity size={16} />
          </div>
          <span className="text-sm font-semibold text-[var(--text-main)]">Grid Used</span>
        </div>
        <div className="text-2xl font-bold text-[var(--text-main)] mb-1">
          {gridPowerUsed.toLocaleString()} <span className="text-sm font-medium text-[var(--text-muted)]">kWh</span>
        </div>
        <div className="text-xs font-semibold text-purple-500">From Mains</div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex-1 flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-amber-500 text-white rounded-full">
            <span className="font-bold">&#8377;</span>
          </div>
          <span className="text-sm font-semibold text-[var(--text-main)]">Power Cost Today</span>
        </div>
        <div className="text-2xl font-bold text-[var(--text-main)] mb-1">&#8377; {kpis.totalCost.toLocaleString()}</div>
        <div className="text-xs font-semibold text-amber-500">Estimated based on tariffs</div>
      </div>

      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex-1 flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-500 text-white rounded-full">
            <AlertTriangle size={16} />
          </div>
          <span className="text-sm font-semibold text-[var(--text-main)]">Power Outage</span>
        </div>
        <div className="text-2xl font-bold text-[var(--text-main)] mb-1">{kpis.outages}m</div>
        <div className="text-xs font-semibold text-red-500">Total downtime today</div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)]">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)]">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
            <Zap size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-main)]">Power Management</h1>
            <p className="text-sm text-[var(--text-muted)]">Monitor and manage electrical usage, generators, and loads</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-base)] text-[var(--text-main)]"
          >
            <Database size={16} /> Seed Mock Data
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        
        {/* We render the KPIs globally across all tabs as they are high level stats */}
        {renderKPIs()}

        {/* Tab 1: Power Overview Container */}
        {currentTab === 'overview' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6 flex max-w-4xl">
            <div className="flex-1 border-r border-[var(--border-subtle)] pr-6 mr-6 flex flex-col items-center justify-center">
              <h3 className="text-lg font-bold text-[var(--text-main)] w-full text-left mb-6">Power Overview</h3>
              {/* Fake Gauge Chart using nested divs */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-48">
                  <svg viewBox="0 0 100 50" className="w-full overflow-visible">
                    {/* Background Arc */}
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--border-subtle)" strokeWidth="12" strokeLinecap="round" />
                    {/* Colored Arc representing Load Percentage (green to yellow to red) */}
                    <path 
                      d="M 10 50 A 40 40 0 0 1 90 50" 
                      fill="none" 
                      stroke="url(#gauge-gradient)" 
                      strokeWidth="12" 
                      strokeLinecap="round" 
                      strokeDasharray="125" 
                      strokeDashoffset={125 - (125 * Math.min(overview.loadPercentage, 100) / 100)} 
                    />
                    <defs>
                      <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="50%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                    {/* Needle */}
                    <g transform={`translate(50, 50) rotate(${(overview.loadPercentage / 100) * 180 - 90})`}>
                      <polygon points="-3,0 3,0 0,-35" fill="var(--text-main)" />
                      <circle cx="0" cy="0" r="4" fill="var(--text-main)" />
                    </g>
                  </svg>
                </div>
                <div className="text-center flex flex-col mt-4">
                  <span className="text-xs text-[var(--text-muted)] font-medium">Current Load</span>
                  <span className="text-3xl font-bold text-[var(--text-main)]">{Math.round(overview.loadPercentage)}%</span>
                  <span className="text-[10px] text-[var(--text-muted)]">of Total Capacity</span>
                </div>
              </div>
              <p className="text-sm font-semibold text-[var(--text-main)] mb-6">{overview.currentLoad} kW / {overview.totalCapacity} kW</p>
              
              <div className="w-full bg-green-500/10 border border-green-500/20 text-green-600 rounded-lg py-2 flex items-center justify-center gap-2 text-sm font-bold">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Power Status: Normal
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[var(--text-muted-alt)] text-sm font-medium">
                  <Activity size={16} /> Current Load
                </div>
                <span className="font-bold text-[var(--text-main)] text-sm">{overview.currentLoad} kW</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[var(--text-muted-alt)] text-sm font-medium">
                  <Server size={16} /> Total Capacity
                </div>
                <span className="font-bold text-[var(--text-main)] text-sm">{overview.totalCapacity} kW</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[var(--text-muted-alt)] text-sm font-medium">
                  <Zap size={16} /> Voltage (Avg.)
                </div>
                <span className="font-bold text-[var(--text-main)] text-sm">{overview.voltageAvg} V</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[var(--text-muted-alt)] text-sm font-medium">
                  <Gauge size={16} /> Frequency (Avg.)
                </div>
                <span className="font-bold text-[var(--text-main)] text-sm">{overview.frequencyAvg} Hz</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[var(--text-muted-alt)] text-sm font-medium">
                  <Sliders size={16} /> Power Factor
                </div>
                <span className="font-bold text-[var(--text-main)] text-sm">0.92</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Generator & Power Sources */}
        {currentTab === 'generator' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6">Generator & Power Sources</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-[var(--text-muted)] uppercase border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Source Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Current Output</th>
                    <th className="px-4 py-3">Today's Runtime</th>
                    <th className="px-4 py-3">Fuel Level</th>
                  </tr>
                </thead>
                <tbody>
                  {sources?.map((gen: any) => (
                    <tr key={gen.id} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--bg-base)] transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-bold text-[var(--text-main)]">{gen.sourceName}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{gen.description}</div>
                      </td>
                      <td className="px-4 py-4 text-[var(--text-muted-alt)] font-medium">{gen.type}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                          gen.status === 'Running' || gen.status === 'Active' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                          gen.status === 'Standby' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                          'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                        }`}>
                          {gen.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold text-[var(--text-main)]">{gen.currentOutput} kW</td>
                      <td className="px-4 py-4 text-[var(--text-muted-alt)]">{gen.runtime || '-'}</td>
                      <td className="px-4 py-4 w-32">
                        {gen.fuelLevel !== null ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-[var(--text-main)]">{gen.fuelLevel}%</span>
                            </div>
                            <div className="w-full bg-[var(--border-subtle)] rounded-full h-1.5">
                              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${gen.fuelLevel}%` }}></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sources?.length === 0 && (
                <div className="py-8 text-center text-[var(--text-muted)]">No sources found. Seed data first.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Load Distribution */}
        {currentTab === 'load' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6 max-w-2xl">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6">Load Distribution</h3>
            {loadData && loadData.length > 0 ? (
              <div className="flex items-center">
                <div className="relative w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={loadData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="loadValue"
                        stroke="none"
                      >
                        {loadData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.colorHex} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-[var(--text-muted)] font-medium">Total Load</span>
                    <span className="text-lg font-bold text-[var(--text-main)]">{overview.currentLoad} kW</span>
                  </div>
                </div>
                <div className="flex-1 ml-8 space-y-4">
                  {loadData.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.colorHex }}></div>
                        <span className="text-[var(--text-main)] font-semibold">{item.sectionName}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="font-bold text-[var(--text-main)]">{item.loadValue} kW</span>
                        <span className="text-[var(--text-muted)] font-medium w-12 text-right">{item.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-[var(--text-muted)]">No load data.</div>
            )}
          </div>
        )}

        {/* Tab 4: Consumption Analytics */}
        {currentTab === 'analytics' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6">Today's Consumption Trend (kWh)</h3>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGrid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', borderRadius: '8px', color: 'var(--text-main)' }} />
                  <Area type="monotone" name="Grid Power" dataKey="grid" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorGrid)" />
                  <Area type="monotone" name="Generator" dataKey="generator" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorGen)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {(!trendData || trendData.length === 0) && (
              <div className="text-center text-[var(--text-muted)] mt-2">No trend data available for today.</div>
            )}
          </div>
        )}

        {/* Tab 5: Power Alerts */}
        {currentTab === 'alerts' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6 max-w-2xl">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6">Recent Power Alerts</h3>
            <div className="space-y-4">
              {alerts?.length > 0 ? alerts.map((alert: any) => (
                <div key={alert.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-[var(--bg-base)] transition-colors border border-transparent hover:border-[var(--border-subtle)]">
                  <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    alert.type === 'success' ? 'bg-green-500 text-white' :
                    alert.type === 'warning' ? 'bg-amber-500 text-white' :
                    alert.type === 'error' ? 'bg-red-500 text-white' :
                    'bg-blue-500 text-white'
                  }`}>
                    {alert.type === 'success' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    {alert.type === 'warning' && <AlertTriangle size={14} />}
                    {alert.type === 'error' && <Activity size={14} />}
                    {alert.type === 'info' && <span className="font-bold text-xs">i</span>}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-[var(--text-main)] mb-0.5">{alert.title}</h4>
                    <p className="text-xs text-[var(--text-muted)]">{alert.description}</p>
                  </div>
                  <div className="text-xs font-semibold text-[var(--text-muted-alt)] whitespace-nowrap">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )) : (
                <div className="text-[var(--text-muted)]">No recent alerts.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Power Settings */}
        {currentTab === 'settings' && settings && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6 max-w-4xl">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6">Power Settings</h3>
            
            <div className="grid grid-cols-2 gap-8">
              {/* Alert Thresholds */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" /> Alert Thresholds
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[var(--text-muted-alt)]">High Load Warning</span>
                        <span className="font-bold text-[var(--text-main)]">{settings.highLoadWarning}%</span>
                      </div>
                      <input type="range" className="w-full h-2 bg-[var(--border-subtle)] rounded-lg appearance-none cursor-pointer accent-amber-500" defaultValue={settings.highLoadWarning} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[var(--text-muted-alt)]">Critical Load Alert</span>
                        <span className="font-bold text-[var(--text-main)]">{settings.criticalLoadAlert}%</span>
                      </div>
                      <input type="range" className="w-full h-2 bg-[var(--border-subtle)] rounded-lg appearance-none cursor-pointer accent-red-500" defaultValue={settings.criticalLoadAlert} />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  <h4 className="text-sm font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                    <Battery size={16} className="text-blue-500" /> Generator Auto-Start
                  </h4>
                  <div className="flex items-center justify-between p-3 border border-[var(--border-subtle)] rounded-lg mb-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-main)]">Auto-start on Grid Failure</p>
                      <p className="text-xs text-[var(--text-muted)]">Automatically start DG Set if Main Grid drops.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={settings.autoStartGenerator} className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--border-subtle)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* General Configurations */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                    <Sliders size={16} className="text-green-500" /> Tariff Configuration
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Grid Power Rate (&#8377;/kWh)</label>
                      <input type="number" defaultValue={settings.gridPowerRate} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Diesel Cost (&#8377;/Litre)</label>
                      <input type="number" defaultValue={settings.dieselCost} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  <button className="w-full py-2 bg-amber-500 text-black font-bold text-sm rounded-lg hover:bg-amber-600 transition-colors">
                    Save Power Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

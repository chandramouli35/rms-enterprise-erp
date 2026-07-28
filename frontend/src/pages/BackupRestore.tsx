import React from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Database, HardDrive, ShieldCheck, Clock, Calendar, 
  Search, Download, Trash, RefreshCw, Archive, Settings,
  CheckCircle, AlertCircle, Info, FileText, Server, Lock
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function BackupRestore() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'overview';

  // --- Dummy Data ---
  const backupList = [
    { id: 'BKP250522001', name: 'Full Backup', type: 'Full', date: '22 May 2025, 10:30 AM', size: '18.45 GB', status: 'Successful' },
    { id: 'BKP250521001', name: 'Daily Backup', type: 'Incremental', date: '21 May 2025, 02:00 AM', size: '4.12 GB', status: 'Successful' },
    { id: 'BKP250520001', name: 'Daily Backup', type: 'Incremental', date: '20 May 2025, 02:00 AM', size: '4.08 GB', status: 'Successful' },
    { id: 'BKP250519001', name: 'Daily Backup', type: 'Incremental', date: '19 May 2025, 02:00 AM', size: '3.95 GB', status: 'Successful' },
    { id: 'BKP250518001', name: 'Weekly Backup', type: 'Full', date: '18 May 2025, 02:00 AM', size: '17.82 GB', status: 'Successful' },
    { id: 'BKP250511001', name: 'Weekly Backup', type: 'Full', date: '11 May 2025, 02:00 AM', size: '17.16 GB', status: 'Successful' },
    { id: 'BKP250501001', name: 'Monthly Backup', type: 'Full', date: '01 May 2025, 02:00 AM', size: '15.90 GB', status: 'Successful' },
  ];

  const scheduledBackups = [
    { name: 'Daily Backup', type: 'Incremental', frequency: 'Daily', time: '02:00 AM', status: true },
    { name: 'Weekly Backup', type: 'Full', frequency: 'Weekly (Sun)', time: '02:00 AM', status: true },
    { name: 'Monthly Backup', type: 'Full', frequency: 'Monthly (1st)', time: '02:00 AM', status: true },
    { name: 'Pre-Update Backup', type: 'Full', frequency: 'Before Update', time: '-', status: true },
  ];

  const storageUsageData = [
    { name: 'Backup Files', value: 125.68, percentage: '25.14%', color: '#3b82f6' },
    { name: 'Database Files', value: 210.36, percentage: '42.07%', color: '#22c55e' },
    { name: 'Logs & Reports', value: 86.40, percentage: '17.28%', color: '#eab308' },
    { name: 'Others', value: 77.56, percentage: '15.51%', color: '#a855f7' },
  ];

  const recentActivity = [
    { title: 'Backup Completed Successfully', desc: 'Full Backup - BKP250522001', time: '22 May 2025, 10:30 AM', type: 'success' },
    { title: 'Scheduled Backup Started', desc: 'Incremental Backup - BKP250521001', time: '22 May 2025, 02:00 AM', type: 'info' },
    { title: 'Backup Completed Successfully', desc: 'Incremental Backup - BKP250521001', time: '21 May 2025, 02:15 AM', type: 'success' },
    { title: 'Backup Verification Warning', desc: 'Some minor issues found in log files', time: '20 May 2025, 02:10 AM', type: 'warning' },
    { title: 'Backup Completed Successfully', desc: 'Incremental Backup - BKP250520001', time: '20 May 2025, 02:08 AM', type: 'success' },
  ];

  // --- Reusable Renders ---
  const renderKPIs = () => (
    <div className="flex items-stretch gap-4 mb-6">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex-1 flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-500 text-white rounded-full">
            <Database size={16} />
          </div>
          <span className="text-sm font-semibold text-[var(--text-main)]">Total Backups</span>
        </div>
        <div className="text-2xl font-bold text-[var(--text-main)] mb-1">32</div>
        <div className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1">
          <span className="text-green-500 font-bold">&uarr; 5</span> this month
        </div>
      </div>
      
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex-1 flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-500 text-white rounded-full">
            <Archive size={16} />
          </div>
          <span className="text-sm font-semibold text-[var(--text-main)]">Last Backup</span>
        </div>
        <div className="text-2xl font-bold text-[var(--text-main)] mb-1">22 May 2025</div>
        <div className="text-xs font-semibold text-green-500">10:30 AM (Successful)</div>
      </div>

      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex-1 flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-500 text-white rounded-full">
            <Clock size={16} />
          </div>
          <span className="text-sm font-semibold text-[var(--text-main)]">Next Scheduled Backup</span>
        </div>
        <div className="text-2xl font-bold text-[var(--text-main)] mb-1">23 May 2025</div>
        <div className="text-xs font-semibold text-blue-500">02:00 AM (Scheduled)</div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex-1 flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-amber-500 text-white rounded-full">
            <HardDrive size={16} />
          </div>
          <span className="text-sm font-semibold text-[var(--text-main)]">Total Backup Size</span>
        </div>
        <div className="text-2xl font-bold text-[var(--text-main)] mb-1">125.68 GB</div>
        <div className="text-xs font-semibold text-[var(--text-muted)]">Compressed</div>
      </div>

      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex-1 flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-500 text-white rounded-full">
            <ShieldCheck size={16} />
          </div>
          <span className="text-sm font-semibold text-[var(--text-main)]">Backup Status</span>
        </div>
        <div className="text-2xl font-bold text-green-500 mb-1">Healthy</div>
        <div className="text-xs font-semibold text-[var(--text-muted)]">All systems normal</div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)]">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)]">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
            <Database size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-main)]">Backup and Restore</h1>
            <p className="text-sm text-[var(--text-muted)]">Manage your system backups, schedules, and data restoration</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-base)] text-[var(--text-main)]">
            <Calendar size={16} /> 22 May, 2025 - 22 May, 2025
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-base)] text-[var(--text-main)]">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        
        {/* Render KPIs globally across all tabs */}
        {renderKPIs()}

        {/* Tab 1: Backup List */}
        {currentTab === 'overview' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6 max-w-5xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[var(--text-main)]">Backup List</h3>
              <div className="flex items-center gap-3">
                <select className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none">
                  <option>All Types</option>
                  <option>Full Backup</option>
                  <option>Incremental Backup</option>
                </select>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
                  <input 
                    type="text" 
                    placeholder="Search backups..." 
                    className="pl-9 pr-4 py-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none text-[var(--text-main)]"
                  />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-[var(--text-muted)] uppercase border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Backup ID</th>
                    <th className="px-4 py-3">Backup Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 rounded-tr-lg text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {backupList.map((bkp, idx) => (
                    <tr key={idx} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--bg-base)] transition-colors">
                      <td className="px-4 py-4 font-semibold text-[var(--text-main)]">{bkp.id}</td>
                      <td className="px-4 py-4 text-[var(--text-muted-alt)]">{bkp.name}</td>
                      <td className="px-4 py-4 text-[var(--text-muted-alt)]">{bkp.type}</td>
                      <td className="px-4 py-4 text-[var(--text-muted-alt)]">{bkp.date}</td>
                      <td className="px-4 py-4 font-semibold text-[var(--text-main)]">{bkp.size}</td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-500 border border-green-500/20">
                          {bkp.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-[var(--text-muted)]">
                          <button className="p-1.5 hover:bg-[var(--border-subtle)] rounded border border-transparent hover:border-[var(--border-subtle)] transition-colors" title="Download">
                            <Download size={14} />
                          </button>
                          <button className="p-1.5 hover:bg-[var(--border-subtle)] rounded border border-transparent hover:border-[var(--border-subtle)] transition-colors" title="Delete">
                            <Trash size={14} />
                          </button>
                          <button className="p-1.5 hover:bg-[var(--border-subtle)] rounded border border-transparent hover:border-[var(--border-subtle)] transition-colors">
                            ...
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex items-center justify-between text-sm text-[var(--text-muted)]">
              <span>Showing 1 to 7 of 32 entries</span>
              <div className="flex gap-1">
                <button className="px-3 py-1 border border-[var(--border-subtle)] rounded hover:bg-[var(--bg-base)]">&lt;</button>
                <button className="px-3 py-1 bg-blue-600 text-white rounded">1</button>
                <button className="px-3 py-1 border border-[var(--border-subtle)] rounded hover:bg-[var(--bg-base)]">2</button>
                <button className="px-3 py-1 border border-[var(--border-subtle)] rounded hover:bg-[var(--bg-base)]">3</button>
                <button className="px-3 py-1 border border-[var(--border-subtle)] rounded hover:bg-[var(--bg-base)]">&gt;</button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Manual Backup & Quick Restore */}
        {currentTab === 'restore' && (
          <div className="flex gap-6 max-w-4xl">
            {/* Manual Backup Container */}
            <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6 flex-1">
              <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">Manual Backup</h3>
              <p className="text-sm text-[var(--text-muted)] mb-6">Create a new backup of your system data.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">Backup Type</label>
                  <select className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option>Full Backup</option>
                    <option>Incremental Backup</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">Include Data</label>
                  <select className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option>All Modules</option>
                    <option>Finance Only</option>
                    <option>Inventory Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">Description (Optional)</label>
                  <input type="text" placeholder="Enter backup description..." className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors mt-2">
                  <Database size={16} /> Create Backup Now
                </button>
              </div>
            </div>

            {/* Quick Restore Container */}
            <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6 flex-1 h-fit">
              <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">Quick Restore</h3>
              <p className="text-sm text-[var(--text-muted)] mb-6">Restore your system from existing backup.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">Select Backup</label>
                  <select className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option>Select a backup to restore</option>
                    <option>BKP250522001 (Full Backup) - 22 May 2025</option>
                    <option>BKP250518001 (Weekly Backup) - 18 May 2025</option>
                  </select>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg p-3 text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>Warning: Restoring a backup will overwrite all current data. Make sure you have backed up any recent changes before proceeding.</span>
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
                  <RefreshCw size={16} /> Restore Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Scheduled Backups */}
        {currentTab === 'scheduled' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6 max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[var(--text-main)]">Scheduled Backups</h3>
              <button className="text-blue-500 text-sm font-semibold border border-blue-500 rounded-lg px-3 py-1.5 hover:bg-blue-500/10 transition-colors">
                Manage Schedule
              </button>
            </div>
            
            <table className="w-full text-sm text-left mb-6">
              <thead className="text-xs text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="px-2 py-3">Backup Name</th>
                  <th className="px-2 py-3">Type</th>
                  <th className="px-2 py-3">Frequency</th>
                  <th className="px-2 py-3">Time</th>
                  <th className="px-2 py-3">Status</th>
                  <th className="px-2 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {scheduledBackups.map((sch, idx) => (
                  <tr key={idx} className="border-b border-[var(--border-subtle-alt)]">
                    <td className="px-2 py-4 font-semibold text-[var(--text-main)]">{sch.name}</td>
                    <td className="px-2 py-4 text-[var(--text-muted-alt)]">{sch.type}</td>
                    <td className="px-2 py-4 text-[var(--text-muted-alt)]">{sch.frequency}</td>
                    <td className="px-2 py-4 text-[var(--text-muted-alt)]">{sch.time}</td>
                    <td className="px-2 py-4">
                      <div className="w-8 h-4 bg-green-500 rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    </td>
                    <td className="px-2 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-[var(--text-muted)]">
                        <button className="hover:text-blue-500"><Settings size={14} /></button>
                        <button className="hover:text-red-500"><Trash size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-lg p-3 text-xs flex items-center gap-2">
              <Info size={14} /> Scheduled Backups help you keep your data safe automatically.
            </div>
          </div>
        )}

        {/* Tab 4: Backup Settings (Custom UI based on research/best practices) */}
        {currentTab === 'settings' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6 max-w-4xl">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6">Backup Settings</h3>
            
            <div className="grid grid-cols-2 gap-8">
              {/* Retention Policy */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                    <Calendar size={16} className="text-blue-500" /> Retention Policy
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-[var(--bg-base)] p-3 border border-[var(--border-subtle)] rounded-lg">
                      <span className="text-sm text-[var(--text-muted-alt)] font-medium">Keep Daily Backups For</span>
                      <select className="bg-transparent border-none text-sm font-bold text-[var(--text-main)] focus:outline-none cursor-pointer">
                        <option>7 Days</option>
                        <option>14 Days</option>
                        <option>30 Days</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between bg-[var(--bg-base)] p-3 border border-[var(--border-subtle)] rounded-lg">
                      <span className="text-sm text-[var(--text-muted-alt)] font-medium">Keep Weekly Backups For</span>
                      <select className="bg-transparent border-none text-sm font-bold text-[var(--text-main)] focus:outline-none cursor-pointer">
                        <option>4 Weeks</option>
                        <option>8 Weeks</option>
                        <option>12 Weeks</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  <h4 className="text-sm font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                    <Lock size={16} className="text-green-500" /> Security
                  </h4>
                  <div className="flex items-center justify-between p-3 border border-[var(--border-subtle)] rounded-lg mb-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-main)]">Encrypt Backups</p>
                      <p className="text-xs text-[var(--text-muted)]">Use AES-256 encryption for all data.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--border-subtle)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Storage Destination */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                    <Server size={16} className="text-purple-500" /> Storage Destination
                  </h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 border border-blue-500 bg-blue-500/5 rounded-lg cursor-pointer">
                      <input type="radio" name="storage" className="accent-blue-500" defaultChecked />
                      <div>
                        <p className="text-sm font-bold text-[var(--text-main)]">Cloud Storage (AWS S3)</p>
                        <p className="text-xs text-[var(--text-muted)]">Primary remote backup</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-[var(--border-subtle)] hover:bg-[var(--bg-base)] transition-colors rounded-lg cursor-pointer">
                      <input type="radio" name="storage" className="accent-blue-500" />
                      <div>
                        <p className="text-sm font-bold text-[var(--text-main)]">Local Storage Network</p>
                        <p className="text-xs text-[var(--text-muted)]">\\SERVER-NAS\Backups</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Storage Usage */}
        {currentTab === 'storage' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6 max-w-2xl">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6">Storage Usage</h3>
            <div className="flex items-center">
              <div className="relative w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={storageUsageData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {storageUsageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">Total Used</span>
                  <span className="text-base font-bold text-[var(--text-main)] leading-tight">125.68 GB</span>
                  <span className="text-[10px] text-[var(--text-muted)]">of 500 GB<br/>(25.14%)</span>
                </div>
              </div>
              <div className="flex-1 ml-8 space-y-4">
                {storageUsageData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                      <span className="text-[var(--text-main)] font-semibold">{item.name}</span>
                    </div>
                    <span className="text-[var(--text-muted-alt)] font-medium text-right">{item.value} GB ({item.percentage})</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--text-muted-alt)]">Total Storage: 500 GB</span>
              <button className="text-blue-500 text-sm font-semibold border border-blue-500 rounded-lg px-4 py-1.5 hover:bg-blue-500/10 transition-colors flex items-center gap-2">
                <HardDrive size={14} /> Manage Storage
              </button>
            </div>
          </div>
        )}

        {/* Tab 6: Recent Backup Activity */}
        {currentTab === 'history' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6 max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[var(--text-main)]">Recent Backup Activity</h3>
              <button className="text-blue-500 text-sm font-semibold hover:text-blue-600 transition-colors">View All Logs</button>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-4 p-3 rounded-lg hover:bg-[var(--bg-base)] transition-colors border border-transparent hover:border-[var(--border-subtle)]">
                  <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    activity.type === 'success' ? 'bg-green-500 text-white' :
                    activity.type === 'warning' ? 'bg-amber-500 text-white' :
                    activity.type === 'error' ? 'bg-red-500 text-white' :
                    'bg-blue-500 text-white'
                  }`}>
                    {activity.type === 'success' && <CheckCircle size={14} />}
                    {activity.type === 'warning' && <AlertCircle size={14} />}
                    {activity.type === 'info' && <span className="font-bold text-xs">i</span>}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-[var(--text-main)] mb-0.5">{activity.title}</h4>
                    <p className="text-xs text-[var(--text-muted)]">{activity.desc}</p>
                  </div>
                  <div className="text-xs font-semibold text-[var(--text-muted-alt)] whitespace-nowrap">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

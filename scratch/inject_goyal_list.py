import re
import os

file_path = 'frontend/src/pages/GoyalAgroForm.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = content.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { Eye, X, Search, Calendar, FileText, Plus } from 'lucide-react';")

# 2. Add State and Fetcher before `const handleInputChange`
state_code = """
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('form');
  const [logsList, setLogsList] = useState<any[]>([]);
  const [isListLoading, setIsListLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchLogs = async () => {
    if (!activePlantId) return;
    try {
      setIsListLoading(true);
      const res = await api.get('/api/dryer-work/goyal-agro', {
        headers: { 'x-plant-id': activePlantId }
      });
      setLogsList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsListLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'list') {
      fetchLogs();
    }
  }, [activeTab, activePlantId]);
"""

content = content.replace("  const handleInputChange = (field: string, value: string) => {", state_code + "\n  const handleInputChange = (field: string, value: string) => {")

# 3. Wrap return statement start
return_start = """  return (
    <form onSubmit={handleSubmit} className="w-full mx-auto font-sans flex flex-col gap-2">"""

wrapper_start = """  return (
    <div className="w-full mx-auto flex flex-col gap-4 relative">
      <div className="flex gap-2 border-b border-[var(--border-subtle)] pb-2">
        <button onClick={() => setActiveTab('form')} className={`px-4 py-2 font-bold rounded-t-lg flex items-center gap-2 ${activeTab === 'form' ? 'bg-[#e67e00]/20 text-[#e67e00] border-b-2 border-[#e67e00]' : 'text-[var(--text-muted-alt)] hover:bg-[var(--bg-panel-hover)]'}`}>
          <Plus size={16} /> New Entry
        </button>
        <button onClick={() => setActiveTab('list')} className={`px-4 py-2 font-bold rounded-t-lg flex items-center gap-2 ${activeTab === 'list' ? 'bg-[#e67e00]/20 text-[#e67e00] border-b-2 border-[#e67e00]' : 'text-[var(--text-muted-alt)] hover:bg-[var(--bg-panel-hover)]'}`}>
          <FileText size={16} /> List View
        </button>
      </div>

      {activeTab === 'form' ? (
        <form onSubmit={handleSubmit} className="w-full mx-auto font-sans flex flex-col gap-2">"""

content = content.replace(return_start, wrapper_start)

# 4. Wrap return statement end
return_end = """    </form>
  );
}"""

wrapper_end = """    </form>
      ) : (
        <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[var(--text-main)]">
              <thead className="bg-black/40 border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="p-3 font-bold text-xs uppercase tracking-wider text-[var(--text-muted-alt)]">Date</th>
                  <th className="p-3 font-bold text-xs uppercase tracking-wider text-[var(--text-muted-alt)]">Dryer Work</th>
                  <th className="p-3 font-bold text-xs uppercase tracking-wider text-[var(--text-muted-alt)]">Created At</th>
                  <th className="p-3 font-bold text-xs uppercase tracking-wider text-center text-[var(--text-muted-alt)]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {isListLoading ? (
                  <tr><td colSpan={4} className="p-4 text-center text-white/50">Loading logs...</td></tr>
                ) : logsList.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-white/50">No records found</td></tr>
                ) : logsList.map(log => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 whitespace-nowrap">{new Date(log.date).toLocaleDateString()}</td>
                    <td className="p-3 whitespace-nowrap">{log.dryerWork || '-'}</td>
                    <td className="p-3 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="p-3 whitespace-nowrap text-center">
                      <button type="button" onClick={() => setSelectedLog(log)} className="p-1 text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center justify-center">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* POPUP MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[var(--border-subtle)] rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden relative">
            <div className="flex justify-between items-center p-4 border-b border-[var(--border-subtle)] bg-black/40">
              <h2 className="text-xl font-black tracking-wider flex items-center gap-2">
                GOYAL AGRO <span className="text-[#e67e00]">DETAILS</span>
              </h2>
              <button type="button" onClick={() => setSelectedLog(null)} className="text-white/50 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-4 overflow-y-auto overflow-x-auto custom-scrollbar flex-1">
              <div className="flex gap-4 mb-4">
                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg">
                  <span className="text-[10px] uppercase text-white/50 block">Date</span>
                  <span className="font-bold">{new Date(selectedLog.date).toLocaleDateString()}</span>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg">
                  <span className="text-[10px] uppercase text-white/50 block">Work</span>
                  <span className="font-bold">{selectedLog.dryerWork || '-'}</span>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg">
                  <span className="text-[10px] uppercase text-white/50 block">Series</span>
                  <span className="font-bold">{selectedLog.series || '-'}</span>
                </div>
              </div>

              <div className="bg-[#0f1115] border border-white/10 rounded-xl overflow-hidden min-w-[700px]">
                <table className="w-full border-collapse">
                  <thead className="bg-[#181a1f] border-b border-white/10">
                    <tr>
                      <th className="p-1 w-6 border-r border-white/10"></th>
                      <th className="p-2 text-xs font-bold text-center border-r border-white/10 tracking-widest uppercase text-white/80">Hodi Katai M/c</th>
                      <th colSpan={3} className="p-0 border-r border-white/10">
                        <div className="border-b border-white/10 p-1 text-center text-xs font-bold tracking-widest text-[#e67e00] uppercase">Day Shift</div>
                        <div className="flex text-[10px] font-bold text-white/50 uppercase">
                          <div className="flex-1 p-1 border-r border-white/10 text-center">D1</div>
                          <div className="flex-1 p-1 border-r border-white/10 text-center">D2</div>
                          <div className="w-24 p-1 text-center">Bin Load</div>
                        </div>
                      </th>
                      <th colSpan={3} className="p-0">
                        <div className="border-b border-white/10 p-1 text-center text-xs font-bold tracking-widest text-indigo-400 uppercase">Night Shift</div>
                        <div className="flex text-[10px] font-bold text-white/50 uppercase">
                          <div className="flex-1 p-1 border-r border-white/10 text-center">D1</div>
                          <div className="flex-1 p-1 border-r border-white/10 text-center">D2</div>
                          <div className="w-24 p-1 text-center">Bin Load</div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-sm">
                    {/* Render rows 1-15 */}
                    {Array.from({ length: 15 }).map((_, i) => (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="p-1 text-center text-white/30 font-mono text-xs border-r border-white/10">{i + 1}</td>
                        <td className="p-1 text-center border-r border-white/10 text-white/90">{selectedLog.hodiKataiMc?.[i] || ''}</td>
                        {/* Day Shift D1 */}
                        {i === 0 && <td rowSpan={2} className="p-1 border-r border-white/10 align-top"><div className="flex flex-col gap-1"><span className="text-[10px] text-white/40">Heat</span><span>{selectedLog.d1HeatDay}</span><span className="text-[10px] text-white/40">M/c</span><span>{selectedLog.d1McDay}</span></div></td>}
                        {i === 2 && <td className="p-1 border-r border-white/10"><span className="text-[10px] text-white/40">L</span> {selectedLog.d1LoadTimeDay}</td>}
                        {i === 3 && <td className="p-1 border-r border-white/10"><span className="text-[10px] text-white/40">UL</span> {selectedLog.d1UnloadTimeDay}</td>}
                        {i === 4 && <td className="p-1 border-r border-white/10 text-green-400">{selectedLog.d1HoursDay}</td>}
                        {[1,5,6,7,8,9,10,11,12,13,14].includes(i) && <td className="p-1 border-r border-white/10 bg-black/20"></td>}
                        
                        {/* Day Shift D2 */}
                        {i === 0 && <td rowSpan={2} className="p-1 border-r border-white/10 align-top"><div className="flex flex-col gap-1"><span className="text-[10px] text-white/40">Heat</span><span>{selectedLog.d2HeatDay}</span><span className="text-[10px] text-white/40">M/c</span><span>{selectedLog.d2McDay}</span></div></td>}
                        {i === 2 && <td className="p-1 border-r border-white/10"><span className="text-[10px] text-white/40">L</span> {selectedLog.d2LoadTimeDay}</td>}
                        {i === 3 && <td className="p-1 border-r border-white/10"><span className="text-[10px] text-white/40">UL</span> {selectedLog.d2UnloadTimeDay}</td>}
                        {i === 4 && <td className="p-1 border-r border-white/10 text-green-400">{selectedLog.d2HoursDay}</td>}
                        {[1,5,6,7,8,9,10,11,12,13,14].includes(i) && <td className="p-1 border-r border-white/10 bg-black/20"></td>}
                        
                        {/* Day Shift Bin Load */}
                        {i < 7 ? <td className="p-1 text-center border-r border-white/10 bg-amber-500/5">{selectedLog[`binLoad${i+1}Day`]}</td> : <td className="border-r border-white/10 bg-black/20"></td>}
                        
                        {/* Night Shift D1 */}
                        {i === 0 && <td rowSpan={2} className="p-1 border-r border-white/10 align-top"><div className="flex flex-col gap-1"><span className="text-[10px] text-white/40">Heat</span><span>{selectedLog.d1HeatNight}</span><span className="text-[10px] text-white/40">M/c</span><span>{selectedLog.d1McNight}</span></div></td>}
                        {i === 2 && <td className="p-1 border-r border-white/10"><span className="text-[10px] text-white/40">L</span> {selectedLog.d1LoadTimeNight}</td>}
                        {i === 3 && <td className="p-1 border-r border-white/10"><span className="text-[10px] text-white/40">UL</span> {selectedLog.d1UnloadTimeNight}</td>}
                        {i === 4 && <td className="p-1 border-r border-white/10 text-indigo-300">{selectedLog.d1HoursNight}</td>}
                        {[1,5,6,7,8,9,10,11,12,13,14].includes(i) && <td className="p-1 border-r border-white/10 bg-black/20"></td>}
                        
                        {/* Night Shift D2 */}
                        {i === 0 && <td rowSpan={2} className="p-1 border-r border-white/10 align-top"><div className="flex flex-col gap-1"><span className="text-[10px] text-white/40">Heat</span><span>{selectedLog.d2HeatNight}</span><span className="text-[10px] text-white/40">M/c</span><span>{selectedLog.d2McNight}</span></div></td>}
                        {i === 2 && <td className="p-1 border-r border-white/10"><span className="text-[10px] text-white/40">L</span> {selectedLog.d2LoadTimeNight}</td>}
                        {i === 3 && <td className="p-1 border-r border-white/10"><span className="text-[10px] text-white/40">UL</span> {selectedLog.d2UnloadTimeNight}</td>}
                        {i === 4 && <td className="p-1 border-r border-white/10 text-indigo-300">{selectedLog.d2HoursNight}</td>}
                        {[1,5,6,7,8,9,10,11,12,13,14].includes(i) && <td className="p-1 border-r border-white/10 bg-black/20"></td>}
                        
                        {/* Night Shift Bin Load */}
                        {i < 5 ? <td className="p-1 text-center bg-indigo-500/5">{selectedLog[`binLoad${i+1}Night`]}</td> : <td className="bg-black/20"></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="bg-white/5 p-3 rounded border border-white/10 flex-1 min-w-[150px]">
                  <span className="text-[10px] text-white/40 uppercase block mb-1">F/M Sign</span>
                  <span className="font-mono text-sm text-[#e67e00]">{selectedLog.fmSign || '-'}</span>
                </div>
                <div className="bg-white/5 p-3 rounded border border-white/10 flex-1 min-w-[150px]">
                  <span className="text-[10px] text-white/40 uppercase block mb-1">Day Oil Man</span>
                  <span className="font-mono text-sm">{selectedLog.dayOilManSign || '-'}</span>
                </div>
                <div className="bg-white/5 p-3 rounded border border-white/10 flex-1 min-w-[150px]">
                  <span className="text-[10px] text-white/40 uppercase block mb-1">Day Munim</span>
                  <span className="font-mono text-sm">{selectedLog.dayMunimSign || '-'}</span>
                </div>
                <div className="bg-white/5 p-3 rounded border border-white/10 flex-1 min-w-[150px]">
                  <span className="text-[10px] text-white/40 uppercase block mb-1">Night Oil Man</span>
                  <span className="font-mono text-sm">{selectedLog.nightOilManSign || '-'}</span>
                </div>
                <div className="bg-white/5 p-3 rounded border border-white/10 flex-1 min-w-[150px]">
                  <span className="text-[10px] text-white/40 uppercase block mb-1">Night Munim</span>
                  <span className="font-mono text-sm">{selectedLog.nightMunimSign || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}"""

content = content.replace(return_end, wrapper_end)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected list view and popup details successfully.")

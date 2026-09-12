import React, { useState, useEffect } from 'react';
import { Eye, X, Search, Calendar, FileText, Plus } from 'lucide-react';
import api from '../api/axios';
import { usePlantStore } from '../store/plantStore';

export default function RajoaAgroForm() {
  const activePlant = usePlantStore(state => state.activePlant);
  const activePlantId = activePlant?.id || '';

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    dryerWork: '',
    hodiKataiMc: Array(15).fill(''),
    
    d1HeatDay: '', d1McDay: '', d1LoadTimeDay: '', d1UnloadTimeDay: '', d1HoursDay: '',
    d2HeatDay: '', d2McDay: '', d2LoadTimeDay: '', d2UnloadTimeDay: '', d2HoursDay: '',

    d1HeatNight: '', d1McNight: '', d1LoadTimeNight: '', d1UnloadTimeNight: '', d1HoursNight: '',
    d2HeatNight: '', d2McNight: '', d2LoadTimeNight: '', d2UnloadTimeNight: '', d2HoursNight: '',

    binLoadDayCells: Array(6).fill(''),
    binUnloadCells: Array(6).fill(''),
    
    fmSign: '', dayOilManSign: '', dayMunimSign: '', nightOilManSign: '', nightMunimSign: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('form');
  const [logsList, setLogsList] = useState<any[]>([]);
  const [isListLoading, setIsListLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [workFilter, setWorkFilter] = useState('');

  const filteredLogs = logsList.filter(log => {
    const matchesDate = dateFilter ? new Date(log.date).toISOString().startsWith(dateFilter) : true;
    const matchesWork = workFilter ? (log.dryerWork || '').toLowerCase().includes(workFilter.toLowerCase()) : true;
    return matchesDate && matchesWork;
  });

  const fetchLogs = async () => {
    if (!activePlantId) return;
    try {
      setIsListLoading(true);
      const res = await api.get('/api/dryer-work/rajoa-agro', {
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleHodiChange = (index: number, value: string) => {
    const newHodi = [...formData.hodiKataiMc];
    newHodi[index] = value;
    setFormData(prev => ({ ...prev, hodiKataiMc: newHodi }));
  };

  const handleBinLoadDay = (index: number, value: string) => {
    const newArr = [...formData.binLoadDayCells];
    newArr[index] = value;
    setFormData(prev => ({ ...prev, binLoadDayCells: newArr }));
  };

  const handleBinUnload = (index: number, value: string) => {
    const newArr = [...formData.binUnloadCells];
    newArr[index] = value;
    setFormData(prev => ({ ...prev, binUnloadCells: newArr }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!activePlantId) return alert('Select a plant first');
    setIsLoading(true);
    
    // Map the array fields back to the schema fields
    const payload = {
      ...formData,
      binLoad6Day: formData.binLoadDayCells[0],
      binLoad1Day: formData.binLoadDayCells[1],
      binLoad5Day: formData.binLoadDayCells[2],
      binLoad2Day: formData.binLoadDayCells[3],
      binLoad4Day: formData.binLoadDayCells[4],
      binLoad3Day: formData.binLoadDayCells[5],
      
      binUnload6: formData.binUnloadCells[0],
      binUnload1: formData.binUnloadCells[1],
      binUnload5: formData.binUnloadCells[2],
      binUnload2: formData.binUnloadCells[3],
      binUnload4: formData.binUnloadCells[4],
      binUnload3: formData.binUnloadCells[5],
    };

    try {
      await api.post('/api/dryer-work/rajoa-agro', payload, {
        headers: { 'x-plant-id': activePlantId }
      });
      alert('Log saved successfully!');
      setActiveTab('list');
    } catch (err) {
      console.error(err);
      alert('Failed to save log');
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
        <form onSubmit={handleSubmit} className="w-full mx-auto font-sans flex flex-col gap-2">
      
      {/* HEADER CARD */}
      <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] p-2 shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-[#e67e00]"></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-black text-white tracking-wider flex items-center gap-3">
              RAJOA AGRO
              <span className="px-3 py-1 bg-[#e67e00]/20 text-[#e67e00] text-xs uppercase tracking-widest rounded-full border border-[#e67e00]/30">Dryer Log</span>
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-[var(--text-muted-alt)] font-bold">Work</span>
              <input 
                type="text" 
                value={formData.dryerWork} 
                onChange={e => handleInputChange('dryerWork', e.target.value)} 
                placeholder="Enter dryer work..."
                className="w-32 bg-transparent text-white outline-none focus:border-b border-[#e67e00] transition-all" 
              />
            </div>
            <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-[var(--text-muted-alt)] font-bold">Date</span>
              <input 
                type="date" 
                value={formData.date} 
                onChange={e => handleInputChange('date', e.target.value)} 
                className="w-36 bg-transparent text-white outline-none [color-scheme:dark]" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* DATA GRID */}
      <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-subtle)] shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[var(--bg-base)] border-b-2 border-[var(--border-subtle)]">
                <th className="px-1 py-1 text-center text-xs font-bold text-[var(--text-muted)] uppercase w-10">#</th>
                <th className="px-1 py-1 text-xs font-bold text-[var(--text-muted)] uppercase border-r border-[var(--border-subtle)] w-64">Hodi Katai M/C</th>
                <th className="p-0 text-xs font-bold text-[#e67e00] uppercase border-r border-[var(--border-subtle)] w-48 align-top text-center">
                  <div className="flex flex-col w-full h-full justify-between">
                    <span className="text-sm py-1 border-b border-[var(--border-subtle)]">D1</span>
                    <span className="text-[10px] py-1 opacity-90 tracking-wide">HEAT & M/c</span>
                  </div>
                </th>
                <th className="p-0 text-xs font-bold text-[#e67e00] uppercase border-r border-[var(--border-subtle)] w-48 align-top text-center">
                  <div className="flex flex-col w-full h-full justify-between">
                    <span className="text-sm py-1 border-b border-[var(--border-subtle)]">D2</span>
                    <span className="text-[10px] py-1 opacity-90 tracking-wide">HEAT & M/c</span>
                  </div>
                </th>
                <th className="px-1 py-1 text-xs font-bold text-[var(--text-muted)] uppercase border-r border-[var(--border-subtle)] w-32 text-center" colSpan={2}>Bin Load</th>
                <th className="px-1 py-1 text-xs font-bold text-[var(--text-muted)] uppercase w-48">Signatures</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              
              {/* Row 1 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">1</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[0]} onChange={e=>handleHodiChange(0,e.target.value)} className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Heat</span><input value={formData.d1HeatDay} onChange={e=>handleInputChange('d1HeatDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Heat</span><input value={formData.d2HeatDay} onChange={e=>handleInputChange('d2HeatDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] w-16"><div className="flex h-full items-center justify-center px-1"><span className="text-amber-500 font-bold text-sm w-4">6</span><input value={formData.binLoadDayCells[0]} onChange={e=>handleBinLoadDay(0,e.target.value)} className="w-8 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] w-16"><div className="flex h-full items-center justify-center px-1"><input value={formData.binLoadDayCells[1]} onChange={e=>handleBinLoadDay(1,e.target.value)} className="w-8 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none" /><span className="text-amber-500 font-bold text-sm w-4 ml-1">1</span></div></td>
                <td className="p-0 h-7 bg-[var(--bg-base)]/50"></td>
              </tr>
              {/* Row 2 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">2</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[1]} onChange={e=>handleHodiChange(1,e.target.value)} className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">M/c</span><input value={formData.d1McDay} onChange={e=>handleInputChange('d1McDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">M/c</span><input value={formData.d2McDay} onChange={e=>handleInputChange('d2McDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] bg-[var(--bg-base)]/50" colSpan={2}></td>
                <td className="p-0 h-7 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/30 text-center" rowSpan={3}>
                    <span className="text-[var(--text-muted-alt)] text-[10px] font-bold uppercase tracking-wider block">F/M sign</span>
                    <input value={formData.fmSign} onChange={e=>handleInputChange('fmSign',e.target.value)} className="w-full bg-transparent text-center text-white outline-none" />
                </td>
              </tr>
              {/* Row 3 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">3</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[2]} onChange={e=>handleHodiChange(2,e.target.value)} className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Load Time</span><input value={formData.d1LoadTimeDay} onChange={e=>handleInputChange('d1LoadTimeDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Load Time</span><input value={formData.d2LoadTimeDay} onChange={e=>handleInputChange('d2LoadTimeDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] w-16"><div className="flex h-full items-center justify-center px-1"><span className="text-amber-500 font-bold text-sm w-4">5</span><input value={formData.binLoadDayCells[2]} onChange={e=>handleBinLoadDay(2,e.target.value)} className="w-8 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] w-16"><div className="flex h-full items-center justify-center px-1"><input value={formData.binLoadDayCells[3]} onChange={e=>handleBinLoadDay(3,e.target.value)} className="w-8 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none" /><span className="text-amber-500 font-bold text-sm w-4 ml-1">2</span></div></td>
              </tr>
              {/* Row 4 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">4</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[3]} onChange={e=>handleHodiChange(3,e.target.value)} className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Unload</span><input value={formData.d1UnloadTimeDay} onChange={e=>handleInputChange('d1UnloadTimeDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Unload</span><input value={formData.d2UnloadTimeDay} onChange={e=>handleInputChange('d2UnloadTimeDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] bg-[var(--bg-base)]/50" colSpan={2}></td>
              </tr>
              {/* Row 5 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">5</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[4]} onChange={e=>handleHodiChange(4,e.target.value)} className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Hours</span><input value={formData.d1HoursDay} onChange={e=>handleInputChange('d1HoursDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Hours</span><input value={formData.d2HoursDay} onChange={e=>handleInputChange('d2HoursDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] w-16"><div className="flex h-full items-center justify-center px-1"><span className="text-amber-500 font-bold text-sm w-4">4</span><input value={formData.binLoadDayCells[4]} onChange={e=>handleBinLoadDay(4,e.target.value)} className="w-8 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] w-16"><div className="flex h-full items-center justify-center px-1"><input value={formData.binLoadDayCells[5]} onChange={e=>handleBinLoadDay(5,e.target.value)} className="w-8 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none" /><span className="text-amber-500 font-bold text-sm w-4 ml-1">3</span></div></td>
                <td className="p-0 h-7 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/30 text-center" rowSpan={3}>
                    <span className="text-[var(--text-muted-alt)] text-[10px] font-bold uppercase tracking-wider block">Day Oil man sign</span>
                    <input value={formData.dayOilManSign} onChange={e=>handleInputChange('dayOilManSign',e.target.value)} className="w-full bg-transparent text-center text-white outline-none" />
                </td>
              </tr>

              {/* Rows 6-8 */}
              {[6,7,8].map((row, idx) => (
                <tr key={row} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">{row}</td>
                  <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[row-1]} onChange={e=>handleHodiChange(row-1,e.target.value)} className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                  <td className="p-0 h-7 border-r border-[var(--border-subtle)] bg-[var(--bg-base)]/50" colSpan={2}></td>
                  <td className="p-0 h-7 border-r border-[var(--border-subtle)] bg-[var(--bg-base)]/50" colSpan={2}></td>
                  {idx === 2 && (
                    <td className="p-0 h-7 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/30 text-center" rowSpan={2}>
                        <span className="text-[var(--text-muted-alt)] text-[10px] font-bold uppercase tracking-wider block">Day Munim sign</span>
                        <input value={formData.dayMunimSign} onChange={e=>handleInputChange('dayMunimSign',e.target.value)} className="w-full bg-transparent text-center text-white outline-none" />
                    </td>
                  )}
                </tr>
              ))}

              {/* Row 9 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">9</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[8]} onChange={e=>handleHodiChange(8,e.target.value)} className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] bg-[var(--bg-base)]/50" colSpan={2}></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] bg-[var(--bg-base)] text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]" colSpan={2}>
                  BIN UNLOAD
                </td>
              </tr>

              {/* Row 10 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">10</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[9]} onChange={e=>handleHodiChange(9,e.target.value)} className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] bg-[var(--bg-base)]/50" colSpan={2}></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] w-16"><div className="flex h-full items-center justify-center px-1"><span className="text-amber-500 font-bold text-sm w-4">6</span><input value={formData.binUnloadCells[0]} onChange={e=>handleBinUnload(0,e.target.value)} className="w-8 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] w-16"><div className="flex h-full items-center justify-center px-1"><input value={formData.binUnloadCells[1]} onChange={e=>handleBinUnload(1,e.target.value)} className="w-8 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none" /><span className="text-amber-500 font-bold text-sm w-4 ml-1">1</span></div></td>
                <td className="p-0 h-7 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/30 text-center" rowSpan={3}>
                    <span className="text-[var(--text-muted-alt)] text-[10px] font-bold uppercase tracking-wider block">Night Oil man sign</span>
                    <input value={formData.nightOilManSign} onChange={e=>handleInputChange('nightOilManSign',e.target.value)} className="w-full bg-transparent text-center text-white outline-none" />
                </td>
              </tr>

              {/* Row 11 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">11</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[10]} onChange={e=>handleHodiChange(10,e.target.value)} className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Heat</span><input value={formData.d1HeatNight} onChange={e=>handleInputChange('d1HeatNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Heat</span><input value={formData.d2HeatNight} onChange={e=>handleInputChange('d2HeatNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] bg-[var(--bg-base)]/50" colSpan={2}></td>
              </tr>

              {/* Row 12 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">12</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[11]} onChange={e=>handleHodiChange(11,e.target.value)} className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">M/c</span><input value={formData.d1McNight} onChange={e=>handleInputChange('d1McNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">M/c</span><input value={formData.d2McNight} onChange={e=>handleInputChange('d2McNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] w-16"><div className="flex h-full items-center justify-center px-1"><span className="text-amber-500 font-bold text-sm w-4">5</span><input value={formData.binUnloadCells[2]} onChange={e=>handleBinUnload(2,e.target.value)} className="w-8 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] w-16"><div className="flex h-full items-center justify-center px-1"><input value={formData.binUnloadCells[3]} onChange={e=>handleBinUnload(3,e.target.value)} className="w-8 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none" /><span className="text-amber-500 font-bold text-sm w-4 ml-1">2</span></div></td>
              </tr>

              {/* Row 13 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">13</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[12]} onChange={e=>handleHodiChange(12,e.target.value)} className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Load Time</span><input value={formData.d1LoadTimeNight} onChange={e=>handleInputChange('d1LoadTimeNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Load Time</span><input value={formData.d2LoadTimeNight} onChange={e=>handleInputChange('d2LoadTimeNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] bg-[var(--bg-base)]/50" colSpan={2}></td>
                <td className="p-0 h-7 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/30 text-center" rowSpan={3}>
                    <span className="text-[var(--text-muted-alt)] text-[10px] font-bold uppercase tracking-wider block">Night Munim sign</span>
                    <input value={formData.nightMunimSign} onChange={e=>handleInputChange('nightMunimSign',e.target.value)} className="w-full bg-transparent text-center text-white outline-none" />
                </td>
              </tr>

              {/* Row 14 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">14</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[13]} onChange={e=>handleHodiChange(13,e.target.value)} className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Unload</span><input value={formData.d1UnloadTimeNight} onChange={e=>handleInputChange('d1UnloadTimeNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Unload</span><input value={formData.d2UnloadTimeNight} onChange={e=>handleInputChange('d2UnloadTimeNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] w-16"><div className="flex h-full items-center justify-center px-1"><span className="text-amber-500 font-bold text-sm w-4">4</span><input value={formData.binUnloadCells[4]} onChange={e=>handleBinUnload(4,e.target.value)} className="w-8 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] w-16"><div className="flex h-full items-center justify-center px-1"><input value={formData.binUnloadCells[5]} onChange={e=>handleBinUnload(5,e.target.value)} className="w-8 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none" /><span className="text-amber-500 font-bold text-sm w-4 ml-1">3</span></div></td>
              </tr>

              {/* Row 15 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">15</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[14]} onChange={e=>handleHodiChange(14,e.target.value)} className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Hours</span><input value={formData.d1HoursNight} onChange={e=>handleInputChange('d1HoursNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Hours</span><input value={formData.d2HoursNight} onChange={e=>handleInputChange('d2HoursNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] bg-[var(--bg-base)]/50" colSpan={2}></td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button 
          type="submit" 
          disabled={isLoading}
          className="px-8 py-2.5 bg-[#e67e00] text-white font-bold rounded-lg shadow-lg hover:bg-[#cc7000] disabled:opacity-50 transition-all flex items-center gap-2"
        >
          {isLoading ? 'SAVING...' : 'SAVE RECORD'}
        </button>
      </div>
    </form>
      ) : (
        <div className="w-full h-full flex flex-col bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-md">
          {/* Filters */}
          <div className="p-4 border-b border-[var(--border-subtle)] flex flex-wrap gap-4 items-center bg-black/20">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[var(--text-muted-alt)]" />
              <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-sm text-white outline-none focus:border-[#e67e00]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Search size={16} className="text-[var(--text-muted-alt)]" />
              <input 
                type="text" 
                placeholder="Filter by work..."
                value={workFilter}
                onChange={(e) => setWorkFilter(e.target.value)}
                className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-sm text-white outline-none focus:border-[#e67e00] min-w-[200px]"
              />
            </div>
            {(dateFilter || workFilter) && (
              <button 
                onClick={() => { setDateFilter(''); setWorkFilter(''); }}
                className="text-xs text-[var(--text-muted)] hover:text-white underline underline-offset-2 ml-auto"
              >
                Clear Filters
              </button>
            )}
          </div>
          
          {isListLoading ? (
            <div className="p-8 text-center text-[var(--text-muted)] animate-pulse">Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)]">No logs found.</div>
          ) : (
            <div className="overflow-x-auto w-full custom-scrollbar flex-1">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-base)] border-b border-[var(--border-subtle)] sticky top-0">
                  <tr>
                    <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Date</th>
                    <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Dryer Work</th>
                    <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Created At</th>
                    <th className="p-4 text-xs font-bold text-[var(--text-muted)] uppercase text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-sm text-white font-medium">{new Date(log.date).toLocaleDateString()}</td>
                      <td className="p-4 text-sm text-[var(--text-muted-alt)]">{log.dryerWork || '-'}</td>
                      <td className="p-4 text-sm text-[var(--text-muted-alt)]">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => setSelectedLog(log)} className="p-2 bg-[#e67e00]/10 text-[#e67e00] rounded hover:bg-[#e67e00]/20 transition-colors inline-block" title="View Details">
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* DETAILS POPUP MODAL (Reuse grid read-only) */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-panel)] w-full max-w-5xl max-h-[90vh] rounded-2xl border border-[var(--border-subtle)] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="text-[#e67e00]" />
                Rajoa Agro Log - {new Date(selectedLog.date).toLocaleDateString()}
              </h2>
              <button onClick={() => setSelectedLog(null)} className="p-2 text-[var(--text-muted)] hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-[var(--bg-base)]">
              {/* Read-only Data Grid */}
              <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-[var(--bg-base)] border-b-2 border-[var(--border-subtle)]">
                      <th className="px-1 py-1 text-center text-xs font-bold text-[var(--text-muted)] uppercase w-10">#</th>
                      <th className="px-1 py-1 text-xs font-bold text-[var(--text-muted)] uppercase border-r border-[var(--border-subtle)] w-64">Hodi Katai M/C</th>
                      <th className="p-0 text-xs font-bold text-[#e67e00] uppercase border-r border-[var(--border-subtle)] w-48 align-top text-center"><div className="flex flex-col w-full h-full justify-between"><span className="text-sm py-1 border-b border-[var(--border-subtle)]">D1</span><span className="text-[10px] py-1 opacity-90 tracking-wide">HEAT & M/c</span></div></th>
                      <th className="p-0 text-xs font-bold text-[#e67e00] uppercase border-r border-[var(--border-subtle)] w-48 align-top text-center"><div className="flex flex-col w-full h-full justify-between"><span className="text-sm py-1 border-b border-[var(--border-subtle)]">D2</span><span className="text-[10px] py-1 opacity-90 tracking-wide">HEAT & M/c</span></div></th>
                      <th className="px-1 py-1 text-xs font-bold text-[var(--text-muted)] uppercase border-r border-[var(--border-subtle)] w-32 text-center" colSpan={2}>Bin Load</th>
                      <th className="px-1 py-1 text-xs font-bold text-[var(--text-muted)] uppercase w-48">Signatures</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {/* Read-only Row 1 */}
                    <tr>
                      <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">1</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]">{selectedLog.hodiKataiMc?.[0]}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">Heat</span>{selectedLog.d1HeatDay}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">Heat</span>{selectedLog.d2HeatDay}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)] text-center"><span className="text-amber-500 mr-1">6</span>{selectedLog.binLoad6Day}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)] text-center">{selectedLog.binLoad1Day}<span className="text-amber-500 ml-1">1</span></td>
                      <td className="p-1 bg-[var(--bg-base)]/50"></td>
                    </tr>
                    {/* Read-only Row 2 */}
                    <tr>
                      <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">2</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]">{selectedLog.hodiKataiMc?.[1]}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">M/c</span>{selectedLog.d1McDay}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">M/c</span>{selectedLog.d2McDay}</td>
                      <td className="p-1 bg-[var(--bg-base)]/50 border-r border-[var(--border-subtle)]" colSpan={2}></td>
                      <td className="p-1 text-xs text-white border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/30 text-center" rowSpan={3}>
                        <span className="text-[var(--text-muted-alt)] text-[10px] block">F/M sign</span>
                        {selectedLog.fmSign}
                      </td>
                    </tr>
                    {/* Read-only Row 3 */}
                    <tr>
                      <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">3</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]">{selectedLog.hodiKataiMc?.[2]}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">Load</span>{selectedLog.d1LoadTimeDay}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">Load</span>{selectedLog.d2LoadTimeDay}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)] text-center"><span className="text-amber-500 mr-1">5</span>{selectedLog.binLoad5Day}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)] text-center">{selectedLog.binLoad2Day}<span className="text-amber-500 ml-1">2</span></td>
                    </tr>
                    {/* Read-only Row 4 */}
                    <tr>
                      <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">4</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]">{selectedLog.hodiKataiMc?.[3]}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">Unload</span>{selectedLog.d1UnloadTimeDay}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">Unload</span>{selectedLog.d2UnloadTimeDay}</td>
                      <td className="p-1 bg-[var(--bg-base)]/50 border-r border-[var(--border-subtle)]" colSpan={2}></td>
                    </tr>
                    {/* Read-only Row 5 */}
                    <tr>
                      <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">5</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]">{selectedLog.hodiKataiMc?.[4]}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">Hours</span>{selectedLog.d1HoursDay}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">Hours</span>{selectedLog.d2HoursDay}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)] text-center"><span className="text-amber-500 mr-1">4</span>{selectedLog.binLoad4Day}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)] text-center">{selectedLog.binLoad3Day}<span className="text-amber-500 ml-1">3</span></td>
                      <td className="p-1 text-xs text-white border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/30 text-center" rowSpan={3}>
                        <span className="text-[var(--text-muted-alt)] text-[10px] block">Day Oil man sign</span>
                        {selectedLog.dayOilManSign}
                      </td>
                    </tr>
                    {/* Read-only Rows 6-8 */}
                    {[6,7,8].map((row, idx) => (
                      <tr key={row}>
                        <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">{row}</td>
                        <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]">{selectedLog.hodiKataiMc?.[row-1]}</td>
                        <td className="p-1 bg-[var(--bg-base)]/50 border-r border-[var(--border-subtle)]" colSpan={2}></td>
                        <td className="p-1 bg-[var(--bg-base)]/50 border-r border-[var(--border-subtle)]" colSpan={2}></td>
                        {idx === 2 && (
                          <td className="p-1 text-xs text-white border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/30 text-center" rowSpan={2}>
                            <span className="text-[var(--text-muted-alt)] text-[10px] block">Day Munim sign</span>
                            {selectedLog.dayMunimSign}
                          </td>
                        )}
                      </tr>
                    ))}
                    {/* Read-only Row 9 */}
                    <tr>
                      <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">9</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]">{selectedLog.hodiKataiMc?.[8]}</td>
                      <td className="p-1 bg-[var(--bg-base)]/50 border-r border-[var(--border-subtle)]" colSpan={2}></td>
                      <td className="p-1 bg-[var(--bg-base)] text-center text-[10px] font-bold text-[var(--text-muted)] border-r border-[var(--border-subtle)]" colSpan={2}>BIN UNLOAD</td>
                    </tr>
                    {/* Read-only Row 10 */}
                    <tr>
                      <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">10</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]">{selectedLog.hodiKataiMc?.[9]}</td>
                      <td className="p-1 bg-[var(--bg-base)]/50 border-r border-[var(--border-subtle)]" colSpan={2}></td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)] text-center"><span className="text-amber-500 mr-1">6</span>{selectedLog.binUnload6}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)] text-center">{selectedLog.binUnload1}<span className="text-amber-500 ml-1">1</span></td>
                      <td className="p-1 text-xs text-white border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/30 text-center" rowSpan={3}>
                        <span className="text-[var(--text-muted-alt)] text-[10px] block">Night Oil man sign</span>
                        {selectedLog.nightOilManSign}
                      </td>
                    </tr>
                    {/* Read-only Row 11 */}
                    <tr>
                      <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">11</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]">{selectedLog.hodiKataiMc?.[10]}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">Heat</span>{selectedLog.d1HeatNight}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">Heat</span>{selectedLog.d2HeatNight}</td>
                      <td className="p-1 bg-[var(--bg-base)]/50 border-r border-[var(--border-subtle)]" colSpan={2}></td>
                    </tr>
                    {/* Read-only Row 12 */}
                    <tr>
                      <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">12</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]">{selectedLog.hodiKataiMc?.[11]}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">M/c</span>{selectedLog.d1McNight}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">M/c</span>{selectedLog.d2McNight}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)] text-center"><span className="text-amber-500 mr-1">5</span>{selectedLog.binUnload5}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)] text-center">{selectedLog.binUnload2}<span className="text-amber-500 ml-1">2</span></td>
                    </tr>
                    {/* Read-only Row 13 */}
                    <tr>
                      <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">13</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]">{selectedLog.hodiKataiMc?.[12]}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">Load</span>{selectedLog.d1LoadTimeNight}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">Load</span>{selectedLog.d2LoadTimeNight}</td>
                      <td className="p-1 bg-[var(--bg-base)]/50 border-r border-[var(--border-subtle)]" colSpan={2}></td>
                      <td className="p-1 text-xs text-white border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/30 text-center" rowSpan={3}>
                        <span className="text-[var(--text-muted-alt)] text-[10px] block">Night Munim sign</span>
                        {selectedLog.nightMunimSign}
                      </td>
                    </tr>
                    {/* Read-only Row 14 */}
                    <tr>
                      <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">14</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]">{selectedLog.hodiKataiMc?.[13]}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">Unload</span>{selectedLog.d1UnloadTimeNight}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">Unload</span>{selectedLog.d2UnloadTimeNight}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)] text-center"><span className="text-amber-500 mr-1">4</span>{selectedLog.binUnload4}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)] text-center">{selectedLog.binUnload3}<span className="text-amber-500 ml-1">3</span></td>
                    </tr>
                    {/* Read-only Row 15 */}
                    <tr>
                      <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">15</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]">{selectedLog.hodiKataiMc?.[14]}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">Hours</span>{selectedLog.d1HoursNight}</td>
                      <td className="p-1 text-xs text-white border-r border-[var(--border-subtle)]"><span className="text-[var(--text-muted-alt)] mr-2">Hours</span>{selectedLog.d2HoursNight}</td>
                      <td className="p-1 bg-[var(--bg-base)]/50 border-r border-[var(--border-subtle)]" colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

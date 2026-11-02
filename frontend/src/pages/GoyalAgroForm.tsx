import React, { useState, useEffect } from 'react';
import { Eye, X, Search, Calendar, FileText, Plus } from 'lucide-react';
import api from '../api/axios';
import { usePlantStore } from '../store/plantStore';
import { useAuthStore } from '../store/authStore';
import { hasModulePermission } from '../utils/modulePermissions';

export default function GoyalAgroForm() {
  const activePlant = usePlantStore(state => state.activePlant);
  const activePlantId = activePlant?.id || '';
  useAuthStore((s) => s.user);
  const canAddLog = hasModulePermission('Dryer Work', 'canAdd', 'GOYAL AGRO');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    dryerWork: '',
    hodiKataiMc: Array(15).fill(''),
    
    d1HeatDay: '', d1McDay: '', d1LoadTimeDay: '', d1UnloadTimeDay: '', d1HoursDay: '',
    d2HeatDay: '', d2McDay: '', d2LoadTimeDay: '', d2UnloadTimeDay: '', d2HoursDay: '',

    d1HeatNight: '', d1McNight: '', d1LoadTimeNight: '', d1UnloadTimeNight: '', d1HoursNight: '',
    d2HeatNight: '', d2McNight: '', d2LoadTimeNight: '', d2UnloadTimeNight: '', d2HoursNight: '',

    // Using an array for bin load/unload cells to match the physical grid exactly
    binLoadDayCells: Array(7).fill(''),
    binLoadNightCells: Array(5).fill(''),
    binUnloadCells: Array(3).fill(''),
    
    // Signatures
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

  const handleBinLoadNight = (index: number, value: string) => {
    const newArr = [...formData.binLoadNightCells];
    newArr[index] = value;
    setFormData(prev => ({ ...prev, binLoadNightCells: newArr }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddLog) {
      alert('Not allowed. Turn on Add for Dryer Work → GOYAL AGRO, then log in again.');
      return;
    }
    if (isLoading) return;
    if (!activePlantId) return alert('Select a plant first');
    setIsLoading(true);
    
    // Map the array fields back to the schema fields
    const payload = {
      ...formData,
      binLoad3Day: formData.binLoadDayCells[0],
      binLoad2Day: formData.binLoadDayCells[2],
      binLoad1Day: formData.binLoadDayCells[4],
      binLoad3Night: formData.binLoadNightCells[0],
      binLoad2Night: formData.binLoadNightCells[2],
      binLoad1Night: formData.binLoadNightCells[4],
    };

    try {
      await api.post('/api/dryer-work/goyal-agro', payload, {
        headers: { 'x-plant-id': activePlantId }
      });
      alert('Log saved successfully!');
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
              GOYAL AGRO
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
          <table className="w-full text-left border-collapse min-w-[600px]">
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
                <th className="px-1 py-1 text-xs font-bold text-[var(--text-muted)] uppercase border-r border-[var(--border-subtle)] w-24 text-center">Bin Load</th>
                <th className="px-1 py-1 text-xs font-bold text-[var(--text-muted)] uppercase w-48">Signatures</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              
              {/* === DAY SHIFT SECTION === */}
              {/* Row 1 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">1</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[0]} onChange={e=>handleHodiChange(0,e.target.value)} placeholder="Enter M/C..." className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Heat</span><input value={formData.d1HeatDay} onChange={e=>handleInputChange('d1HeatDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Heat</span><input value={formData.d2HeatDay} onChange={e=>handleInputChange('d2HeatDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center justify-center px-4 focus-within:bg-white/[0.05] transition-colors"><span className="text-amber-500 font-bold text-base w-6">3</span><input value={formData.binLoadDayCells[0]} onChange={e=>handleBinLoadDay(0,e.target.value)} className="w-20 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none focus:border-amber-500" /></div></td>
                <td className="p-0"></td>
              </tr>
              {/* Row 2 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">2</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[1]} onChange={e=>handleHodiChange(1,e.target.value)} placeholder="Enter M/C..." className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">M/c</span><input value={formData.d1McDay} onChange={e=>handleInputChange('d1McDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">M/c</span><input value={formData.d2McDay} onChange={e=>handleInputChange('d2McDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.binLoadDayCells[1]} onChange={e=>handleBinLoadDay(1,e.target.value)} className="w-full h-full p-1 text-center text-xs bg-transparent text-white outline-none focus:bg-white/[0.05] transition-colors" /></td>
                <td className="p-0 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/30" rowSpan={3}>
                  <div className="flex flex-col h-full p-2 focus-within:bg-white/[0.05] transition-colors">
                    <span className="text-[var(--text-muted-alt)] text-xs font-bold uppercase tracking-wider mb-1">F/M Sign</span>
                    <textarea value={formData.fmSign} onChange={e=>handleInputChange('fmSign',e.target.value)} className="flex-1 w-full bg-transparent text-white outline-none resize-none" placeholder="Signature..." />
                  </div>
                </td>
              </tr>
              {/* Row 3 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">3</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[2]} onChange={e=>handleHodiChange(2,e.target.value)} placeholder="Enter M/C..." className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Load Time</span><input value={formData.d1LoadTimeDay} onChange={e=>handleInputChange('d1LoadTimeDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Load Time</span><input value={formData.d2LoadTimeDay} onChange={e=>handleInputChange('d2LoadTimeDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center justify-center px-4 focus-within:bg-white/[0.05] transition-colors"><span className="text-amber-500 font-bold text-base w-6">2</span><input value={formData.binLoadDayCells[2]} onChange={e=>handleBinLoadDay(2,e.target.value)} className="w-20 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none focus:border-amber-500" /></div></td>
              </tr>
              {/* Row 4 */}
              <tr className="group hover:bg-white/[0.02] transition-colors border-b border-[var(--border-subtle)]">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">4</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[3]} onChange={e=>handleHodiChange(3,e.target.value)} placeholder="Enter M/C..." className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Unload Time</span><input value={formData.d1UnloadTimeDay} onChange={e=>handleInputChange('d1UnloadTimeDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Unload Time</span><input value={formData.d2UnloadTimeDay} onChange={e=>handleInputChange('d2UnloadTimeDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.binLoadDayCells[3]} onChange={e=>handleBinLoadDay(3,e.target.value)} className="w-full h-full p-1 text-center text-xs bg-transparent text-white outline-none focus:bg-white/[0.05] transition-colors" /></td>
              </tr>
              {/* Row 5 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">5</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[4]} onChange={e=>handleHodiChange(4,e.target.value)} placeholder="Enter M/C..." className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Hours</span><input value={formData.d1HoursDay} onChange={e=>handleInputChange('d1HoursDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-[#e67e00]/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Hours</span><input value={formData.d2HoursDay} onChange={e=>handleInputChange('d2HoursDay',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center justify-center px-4 focus-within:bg-white/[0.05] transition-colors"><span className="text-amber-500 font-bold text-base w-6">1</span><input value={formData.binLoadDayCells[4]} onChange={e=>handleBinLoadDay(4,e.target.value)} className="w-20 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none focus:border-amber-500" /></div></td>
                <td className="p-0 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/30" rowSpan={3}>
                  <div className="flex flex-col h-full p-2 focus-within:bg-white/[0.05] transition-colors">
                    <span className="text-[var(--text-muted-alt)] text-xs font-bold uppercase tracking-wider mb-1">Day Oil man sign</span>
                    <textarea value={formData.dayOilManSign} onChange={e=>handleInputChange('dayOilManSign',e.target.value)} className="flex-1 w-full bg-transparent text-white outline-none resize-none" placeholder="Signature..." />
                  </div>
                </td>
              </tr>

              {/* === BLANK MIDDLE SECTION (Rows 6-10) === */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">6</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[5]} onChange={e=>handleHodiChange(5,e.target.value)} placeholder="Enter M/C..." className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] bg-[var(--bg-base)]/50" colSpan={2} rowSpan={5}>
                  <div className="flex items-center justify-center h-full w-full opacity-10 pointer-events-none">
                    <span className="text-4xl font-black rotate-[-15deg] tracking-widest uppercase">Goyal Agro</span>
                  </div>
                </td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.binLoadDayCells[5]} onChange={e=>handleBinLoadDay(5,e.target.value)} className="w-full h-full p-1 text-center text-xs bg-transparent text-white outline-none focus:bg-white/[0.05] transition-colors" /></td>
              </tr>
              <tr className="group hover:bg-white/[0.02] transition-colors border-b border-[var(--border-subtle)]">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">7</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[6]} onChange={e=>handleHodiChange(6,e.target.value)} placeholder="Enter M/C..." className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.binLoadDayCells[6]} onChange={e=>handleBinLoadDay(6,e.target.value)} className="w-full h-full p-1 text-center text-xs bg-transparent text-white outline-none focus:bg-white/[0.05] transition-colors" /></td>
              </tr>
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">8</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[7]} onChange={e=>handleHodiChange(7,e.target.value)} placeholder="Enter M/C..." className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)] text-center text-[#e67e00] font-black tracking-widest uppercase bg-[#e67e00]/5" rowSpan={3}>
                  BIN UNLOAD
                </td>
                <td className="p-0 border-b-2 border-b-[var(--border-subtle)] bg-[var(--bg-base)]/30" rowSpan={3}>
                  <div className="flex flex-col h-full p-2 focus-within:bg-white/[0.05] transition-colors">
                    <span className="text-[var(--text-muted-alt)] text-xs font-bold uppercase tracking-wider mb-1">Day Munim sign</span>
                    <textarea value={formData.dayMunimSign} onChange={e=>handleInputChange('dayMunimSign',e.target.value)} className="flex-1 w-full bg-transparent text-white outline-none resize-none" placeholder="Signature..." />
                  </div>
                </td>
              </tr>
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">9</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[8]} onChange={e=>handleHodiChange(8,e.target.value)} placeholder="Enter M/C..." className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
              </tr>
              <tr className="group hover:bg-white/[0.02] transition-colors border-b-2 border-[var(--border-subtle)]">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">10</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[9]} onChange={e=>handleHodiChange(9,e.target.value)} placeholder="Enter M/C..." className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
              </tr>

              {/* === NIGHT SHIFT SECTION === */}
              {/* Row 11 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">11</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[10]} onChange={e=>handleHodiChange(10,e.target.value)} placeholder="Enter M/C..." className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-indigo-500/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Heat</span><input value={formData.d1HeatNight} onChange={e=>handleInputChange('d1HeatNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-indigo-500/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Heat</span><input value={formData.d2HeatNight} onChange={e=>handleInputChange('d2HeatNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center justify-center px-4 focus-within:bg-white/[0.05] transition-colors"><span className="text-amber-500 font-bold text-base w-6">3</span><input value={formData.binLoadNightCells[0]} onChange={e=>handleBinLoadNight(0,e.target.value)} className="w-20 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none focus:border-amber-500" /></div></td>
                <td className="p-0 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/30" rowSpan={3}>
                  <div className="flex flex-col h-full p-2 focus-within:bg-white/[0.05] transition-colors">
                    <span className="text-[var(--text-muted-alt)] text-xs font-bold uppercase tracking-wider mb-1">Night Oil man sign</span>
                    <textarea value={formData.nightOilManSign} onChange={e=>handleInputChange('nightOilManSign',e.target.value)} className="flex-1 w-full bg-transparent text-white outline-none resize-none" placeholder="Signature..." />
                  </div>
                </td>
              </tr>
              {/* Row 12 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">12</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[11]} onChange={e=>handleHodiChange(11,e.target.value)} placeholder="Enter M/C..." className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-indigo-500/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">M/c</span><input value={formData.d1McNight} onChange={e=>handleInputChange('d1McNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-indigo-500/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">M/c</span><input value={formData.d2McNight} onChange={e=>handleInputChange('d2McNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.binLoadNightCells[1]} onChange={e=>handleBinLoadNight(1,e.target.value)} className="w-full h-full p-1 text-center text-xs bg-transparent text-white outline-none focus:bg-white/[0.05] transition-colors" /></td>
              </tr>
              {/* Row 13 */}
              <tr className="group hover:bg-white/[0.02] transition-colors border-b border-[var(--border-subtle)]">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">13</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[12]} onChange={e=>handleHodiChange(12,e.target.value)} placeholder="Enter M/C..." className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-indigo-500/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Load Time</span><input value={formData.d1LoadTimeNight} onChange={e=>handleInputChange('d1LoadTimeNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-indigo-500/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Load Time</span><input value={formData.d2LoadTimeNight} onChange={e=>handleInputChange('d2LoadTimeNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center justify-center px-4 focus-within:bg-white/[0.05] transition-colors"><span className="text-amber-500 font-bold text-base w-6">2</span><input value={formData.binLoadNightCells[2]} onChange={e=>handleBinLoadNight(2,e.target.value)} className="w-20 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none focus:border-amber-500" /></div></td>
              </tr>
              {/* Row 14 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs">14</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[13]} onChange={e=>handleHodiChange(13,e.target.value)} placeholder="Enter M/C..." className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-indigo-500/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Unload Time</span><input value={formData.d1UnloadTimeNight} onChange={e=>handleInputChange('d1UnloadTimeNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-indigo-500/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Unload Time</span><input value={formData.d2UnloadTimeNight} onChange={e=>handleInputChange('d2UnloadTimeNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.binLoadNightCells[3]} onChange={e=>handleBinLoadNight(3,e.target.value)} className="w-full h-full p-1 text-center text-xs bg-transparent text-white outline-none focus:bg-white/[0.05] transition-colors" /></td>
                <td className="p-0 bg-[var(--bg-base)]/30" rowSpan={2}>
                  <div className="flex flex-col h-full p-2 focus-within:bg-white/[0.05] transition-colors">
                    <span className="text-[var(--text-muted-alt)] text-xs font-bold uppercase tracking-wider mb-1">Night Munim sign</span>
                    <textarea value={formData.nightMunimSign} onChange={e=>handleInputChange('nightMunimSign',e.target.value)} className="flex-1 w-full bg-transparent text-white outline-none resize-none" placeholder="Signature..." />
                  </div>
                </td>
              </tr>
              {/* Row 15 */}
              <tr className="group hover:bg-white/[0.02] transition-colors">
                <td className="p-1 text-center text-[var(--text-muted-alt)] font-mono text-xs rounded-bl-lg">15</td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><input value={formData.hodiKataiMc[14]} onChange={e=>handleHodiChange(14,e.target.value)} placeholder="Enter M/C..." className="w-full h-full p-1 bg-transparent text-xs text-white outline-none focus:bg-[#e67e00]/10 transition-colors" /></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-indigo-500/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Hours</span><input value={formData.d1HoursNight} onChange={e=>handleInputChange('d1HoursNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center px-2 focus-within:bg-indigo-500/10 transition-colors"><span className="text-[var(--text-muted-alt)] w-16 text-xs font-medium">Hours</span><input value={formData.d2HoursNight} onChange={e=>handleInputChange('d2HoursNight',e.target.value)} className="flex-1 bg-transparent text-white outline-none" /></div></td>
                <td className="p-0 h-7 border-r border-[var(--border-subtle)]"><div className="flex h-full items-center justify-center px-4 focus-within:bg-white/[0.05] transition-colors"><span className="text-amber-500 font-bold text-base w-6">1</span><input value={formData.binLoadNightCells[4]} onChange={e=>handleBinLoadNight(4,e.target.value)} className="w-20 bg-transparent border-b border-[var(--border-subtle)] text-center text-white outline-none focus:border-amber-500" /></div></td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end mt-1">
        {canAddLog ? (
        <button type="submit" disabled={isLoading} className="bg-[#e67e00] hover:bg-amber-600 text-white px-4 py-1.5 rounded text-xs font-bold shadow transition-all hover:-translate-y-1 flex items-center gap-1">
          {isLoading ? 'Saving...' : 'Save Log'}
        </button>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">Add is required to save this dryer log.</p>
        )}
      </div>

    </form>
      ) : (
        <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-md flex flex-col h-full">
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
          
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm text-[var(--text-main)]">
              <thead className="bg-black/40 border-b border-[var(--border-subtle)] sticky top-0">
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
                ) : filteredLogs.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-white/50">No records found</td></tr>
                ) : filteredLogs.map(log => (
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
}

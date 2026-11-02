import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import StackHistoryModal from './StackHistoryModal';
import { Layers } from 'lucide-react';
import { usePlantStore } from '../store/plantStore';
import { useUiStore } from '../store/uiStore';
import { hasModulePermission } from '../utils/modulePermissions';

interface PaddyStack {
  id: string;
  stackNo: string;
  status: string;
  totalBags: number;
  totalWeight: number;
  averageMoisture: number;
  isNewAClass: boolean;
}

interface StackLayoutViewProps {
  plantId: string;
}

export default function StackLayoutView({ plantId }: StackLayoutViewProps) {
  const activePlant = usePlantStore(state => state.activePlant);
  const canAddLoose = hasModulePermission('Procurement', 'canAdd', 'Paddy Inward');
  const isBeasAgro = activePlant?.name?.toLowerCase().includes('beas agro');
  const [stacks, setStacks] = useState<PaddyStack[]>([]);
  const [activeTrucks, setActiveTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStack, setSelectedStack] = useState<string | null>(null);
  const [looseOpen, setLooseOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [unloaders, setUnloaders] = useState<{ id: string; name: string }[]>([]);
  const [looseLeft, setLooseLeft] = useState<number | null>(null);
  const [savingLoose, setSavingLoose] = useState(false);
  const [looseForm, setLooseForm] = useState({
    bags: '',
    bagClass: 'A_CLASS',
    stackNo: '',
    unloaderName: '',
  });

  const loadLooseLeft = () => {
    if (!plantId) return;
    api
      .get(`/api/procurement/stack/loose-paddy/today?plantId=${plantId}`)
      .then((res) => setLooseLeft(Number(res.data?.remaining ?? 15)))
      .catch(() => setLooseLeft(null));
  };

  const chooseStack = (stackNo: string) => {
    if (picking) {
      setLooseForm((f) => ({ ...f, stackNo }));
      setPicking(false);
      useUiStore.getState().addToast(`Stack ${stackNo} selected`, 'success');
      return true;
    }
    return false;
  };

  const fetchStacks = () => {
    setLoading(true);
    Promise.all([
      api.get(`/api/procurement/stack/layout?plantId=${plantId}`),
      api.get(`/api/procurement/stack/active-trucks?plantId=${plantId}`)
    ]).then(([stacksRes, trucksRes]) => {
      setStacks(stacksRes.data);
      setActiveTrucks(trucksRes.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStacks();
  }, [plantId]);

  const generateMainStacks = () => {
    const arr = [];
    for (let col = 1; col <= 7; col++) {
      for (let row = 8; row >= 1; row--) {
        const stackNum = (col - 1) * 8 + row;
        arr.push(stackNum.toString());
      }
    }
    return arr;
  };

  const getMoistureColor = (moisture: number, status: string, bags: number) => {
    if (status === 'COMPLETED' || status === 'EMPTY' || bags <= 0) return 'bg-gray-800 border-gray-600 text-gray-500 opacity-60';
    // Continuous bands (Feedback 47) — no gap between 16–17
    if (moisture >= 20.1) return 'bg-red-500/20 border-red-500 text-red-100';
    if (moisture >= 18.1) return 'bg-yellow-500/20 border-yellow-500 text-yellow-100';
    if (moisture >= 16.1) return 'bg-green-500/20 border-green-500 text-green-100';
    if (moisture >= 14) return 'bg-blue-500/20 border-blue-500 text-blue-100';
    return 'bg-[var(--bg-panel-hover)] border-[var(--border-subtle)] text-[var(--text-main)]';
  };

  const renderBeasStack = (stackNo: string) => {
    const data = stacks.find(s => s.stackNo === stackNo);
    const isOccupied = !!data && data.status !== 'EMPTY' && data.totalBags > 0;
    
    const colorClass = isOccupied 
      ? getMoistureColor(data.averageMoisture, data.status, data.totalBags)
      : 'bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-panel-alt)]';

    return (
      <div 
        key={stackNo} 
        className="relative flex flex-col items-center cursor-pointer"
        onClick={() => {
          if (chooseStack(stackNo)) return;
          if (isOccupied) setSelectedStack(stackNo);
        }}
      >
        <span className="text-[10px] font-bold text-[var(--text-muted-alt)] mb-1">{stackNo}</span>
        <div
          className={`relative h-10 w-12 rounded flex flex-col items-center justify-center text-[10px] font-bold transition-all border-2 ${colorClass} ${isOccupied ? 'hover:scale-105 shadow-sm' : 'opacity-40'}`}
        >
          {data?.isNewAClass && isOccupied && (
            <div className="absolute top-0 left-0 text-[8px] font-bold text-[#e67e00]">N*</div>
          )}
          <span>{data ? data.totalBags : '—'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)]/50">
        <div className="flex items-center gap-2">
          <Layers className="text-[#e67e00]" size={20} />
          <h2 className="text-lg font-semibold text-[var(--text-main)]">Plant Layout & Stack View</h2>
          <button
            type="button"
            onClick={() => {
              setLooseOpen((v) => !v);
              setPicking(false);
              loadLooseLeft();
              api
                .get(`/api/procurement/unloaders/${plantId}`)
                .then((res) => setUnloaders(Array.isArray(res.data) ? res.data : []))
                .catch(() => setUnloaders([]));
            }}
            className="ml-3 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black px-3 py-1.5 rounded"
          >
            Add Loose Paddy Bags
          </button>
        </div>
        
        <div className="flex items-center gap-4 text-xs font-medium bg-[var(--bg-app)] p-2 rounded-lg border border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500/50 border border-blue-500"></div> 14–16%</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500/50 border border-green-500"></div> 16.1–18%</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-500/50 border border-yellow-500"></div> 18.1–20%</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/50 border border-red-500"></div> 20.1%+</div>
        </div>
      </div>

      {looseOpen && (
        <form
          className="px-4 py-3 border-b border-[var(--border-subtle)] bg-amber-400/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!/^\d+$/.test(looseForm.bags) || Number(looseForm.bags) <= 0) {
              useUiStore.getState().addToast('Bags must be a whole number', 'error');
              return;
            }
            if (!looseForm.stackNo.trim()) {
              useUiStore.getState().addToast('Stack No. is required', 'error');
              return;
            }
            if (!looseForm.unloaderName) {
              useUiStore.getState().addToast('Unloader Name is required', 'error');
              return;
            }
            setSavingLoose(true);
            try {
              await api.post('/api/procurement/stack/loose-paddy', {
                plantId,
                bags: Number(looseForm.bags),
                bagClass: looseForm.bagClass,
                stackNo: looseForm.stackNo.trim(),
                unloaderName: looseForm.unloaderName,
              });
              useUiStore.getState().addToast('Loose Paddy bags added to the stack count', 'success');
              setLooseForm({ bags: '', bagClass: 'A_CLASS', stackNo: '', unloaderName: '' });
              setPicking(false);
              loadLooseLeft();
              fetchStacks();
            } catch (err: any) {
              useUiStore.getState().addToast(err?.response?.data?.message || 'Could not add loose bags', 'error');
            } finally {
              setSavingLoose(false);
            }
          }}
        >
          <label className="text-xs text-[var(--text-muted-alt)]">
            Bags
            <input
              className="mt-1 w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)]"
              value={looseForm.bags}
              onChange={(e) => setLooseForm((f) => ({ ...f, bags: e.target.value.replace(/\D/g, '') }))}
              placeholder="0"
            />
          </label>
          <label className="text-xs text-[var(--text-muted-alt)]">
            Bag Class
            <select
              className="mt-1 w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)]"
              value={looseForm.bagClass}
              onChange={(e) => setLooseForm((f) => ({ ...f, bagClass: e.target.value }))}
            >
              <option value="A_CLASS">A Class</option>
              <option value="B_CLASS">B Class</option>
            </select>
          </label>
          <label className="text-xs text-[var(--text-muted-alt)] lg:col-span-2">
            Stack No.
            <div className="mt-1 flex gap-2">
              <input
                className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)]"
                value={looseForm.stackNo}
                onChange={(e) => setLooseForm((f) => ({ ...f, stackNo: e.target.value }))}
                placeholder="Type or pick from drawing"
              />
              <button
                type="button"
                onClick={() => setPicking((v) => !v)}
                className={`px-2 rounded text-xs font-bold whitespace-nowrap ${picking ? 'bg-[#e67e00] text-black' : 'border border-[var(--border-subtle)] text-[var(--text-main)]'}`}
              >
                {picking ? 'Click a stack' : 'From drawing'}
              </button>
            </div>
          </label>
          <label className="text-xs text-[var(--text-muted-alt)]">
            Unloader Name
            <select
              className="mt-1 w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)]"
              value={looseForm.unloaderName}
              onChange={(e) => setLooseForm((f) => ({ ...f, unloaderName: e.target.value }))}
            >
              <option value="">Select unloader</option>
              {unloaders.map((u) => (
                <option key={u.id || u.name} value={u.name}>{u.name}</option>
              ))}
            </select>
          </label>
          {canAddLoose && <div>
            <button
              type="submit"
              disabled={savingLoose}
              className="w-full bg-[#e67e00] text-black font-bold text-sm rounded px-3 py-2 disabled:opacity-50"
            >
              {savingLoose ? 'Saving…' : 'Submit'}
            </button>
            <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">
              Count only, no weight. {looseLeft == null ? 'Daily limit 15 bags.' : `${looseLeft} of 15 bags left today.`}
            </p>
          </div>}
        </form>
      )}

      <div className="p-6 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-48 text-[var(--text-muted-alt)]">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#e67e00] mr-3"></div>
            Loading plant layout...
          </div>
        ) : isBeasAgro ? (
          <div className="overflow-x-auto bg-[var(--bg-base)] rounded-xl border border-[var(--border-subtle)]">
            <div className="relative min-w-[1150px] h-[950px] mx-auto bg-[var(--bg-panel-alt)] shadow-inner overflow-hidden scale-90 origin-top-left xl:scale-100 xl:origin-center">
              {/* A Label and Main Grid 7 cols x 8 rows */}
              <div className="absolute left-[240px] top-6 font-bold text-xl text-[var(--text-muted)] tracking-widest">A</div>
              <div className="absolute left-10 top-14 grid grid-flow-col grid-rows-8 gap-x-6 gap-y-3">
                {generateMainStacks().map(s => renderBeasStack(s))}
              </div>

              {/* Attached Structure: Mistry Room, Empty Space, Labour Room */}
              <div className="absolute left-[112px] top-[640px] flex">
                <div className="flex flex-col">
                  <div className="w-[336px] h-[50px] border-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase bg-[var(--bg-base)]">
                    Mistry Room
                  </div>
                  <div className="w-[336px] h-[150px] border-x-2 border-b-2 border-[var(--border-subtle-alt)] bg-transparent">
                  </div>
                </div>
                <div className="w-[60px] h-[200px] border-y-2 border-r-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase bg-[var(--bg-base)]">
                  <span className="-rotate-90 whitespace-nowrap">Labour Room</span>
                </div>
              </div>

              {/* Office - Middle right */}
              <div className="absolute left-[560px] top-[680px] w-[100px] h-[100px] border-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase bg-[var(--bg-base)]">
                Office
              </div>

              {/* Kanda - Vertical to the right of Office */}
              <div className="absolute left-[680px] top-[680px] w-[60px] h-[150px] border-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase bg-[var(--bg-base)]">
                <span className="-rotate-90 whitespace-nowrap">Kanda</span>
              </div>

              {/* Droll, Shaller, Rice Room - Vertical column far right */}
              <div className="absolute left-[950px] top-[300px] flex flex-col border-2 border-[var(--border-subtle-alt)] bg-[var(--bg-base)]">
                <div className="w-[80px] h-[80px] border-b-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] uppercase"><span className="-rotate-90 whitespace-nowrap">Droll</span></div>
                <div className="w-[80px] h-[100px] border-b-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] uppercase"><span className="-rotate-90 whitespace-nowrap">Shaller</span></div>
                <div className="w-[80px] h-[120px] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] uppercase"><span className="-rotate-90 whitespace-nowrap">Rice Room</span></div>
              </div>

              {/* B Label and Top Right Stacks (3x3 grid) */}
              <div className="absolute left-[900px] top-6 font-bold text-xl text-[var(--text-muted)] tracking-widest">B</div>
              <div className="absolute left-[850px] top-14 grid grid-cols-3 gap-x-6 gap-y-3">
                {[
                  '8', '5', '2',
                  '9', '6', '3',
                  null, '7', '4'
                ].map((stackNo, i) => (
                  stackNo ? renderBeasStack(stackNo) : <div key={`empty-${i}`} className="w-12 h-10"></div>
                ))}
              </div>

              {/* Stack 10 (2198) - right of main grid */}
              <div className="absolute left-[544px] top-[56px] flex flex-col items-center">
                {renderBeasStack('10')}
              </div>

              {/* Stack 1 (1280) - to the right of Droll Room */}
              <div className="absolute left-[1050px] top-[310px] flex flex-col items-center">
                {renderBeasStack('1')}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {/* Render actual active stacks */}
            {stacks.map((stack) => {
              const isCrossed = stack.status === 'EMPTY' || stack.totalBags <= 0;
              const colorClass = getMoistureColor(stack.averageMoisture, stack.status, stack.totalBags);
              
              return (
                <div 
                  key={stack.id}
                  onClick={() => {
                    if (chooseStack(stack.stackNo)) return;
                    setSelectedStack(stack.stackNo);
                  }}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-transform hover:scale-105 ${colorClass}`}
                >
                  {/* Cross out if empty */}
                  {isCrossed && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-full h-0.5 bg-gray-500 rotate-45 absolute"></div>
                      <div className="w-full h-0.5 bg-gray-500 -rotate-45 absolute"></div>
                    </div>
                  )}

                  {/* New Class A Indicator */}
                  {stack.isNewAClass && !isCrossed && (
                    <div className="absolute top-1 left-2 text-xs font-bold text-[#e67e00]">
                      N*
                    </div>
                  )}

                  <span className="text-lg font-black tracking-wider mb-1 z-10">{stack.stackNo}</span>
                  <div className="flex flex-col items-center text-xs opacity-90 z-10">
                    <span>{stack.totalBags} bags</span>
                    {stack.averageMoisture > 0 && <span>{stack.averageMoisture.toFixed(1)}% Mo</span>}
                  </div>
                </div>
              );
            })}
            
            {/* Render Empty Placeholders to visually simulate a physical plant grid layout */}
            {Array.from({ length: Math.max(0, 24 - stacks.length) }).map((_, i) => (
              <div 
                key={`empty-slot-${i}`}
                className="relative flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-panel-hover)] opacity-40 select-none"
              >
                <span className="text-sm font-medium text-[var(--text-muted-alt)] mb-1">Empty Plot</span>
                <span className="text-[10px] text-[var(--text-muted-alt)]">Available</span>
              </div>
            ))}
          </div>
        )}

        {/* Active Unloading Trucks Downside Strips */}
        {!loading && activeTrucks.length > 0 && (
          <div className="mt-8 border-t border-[var(--border-subtle)] pt-6">
            <h3 className="text-sm font-bold text-[var(--text-main)] mb-4">Actively Unloading Trucks</h3>
            <div className="flex flex-col gap-3">
              {activeTrucks.map((truck, idx) => {
                const mo = truck.quality?.moisture || 0;
                const moColor = mo >= 20.1 ? 'text-red-500' : mo >= 18.1 ? 'text-yellow-500' : mo >= 17 ? 'text-green-500' : mo >= 14 ? 'text-blue-500' : 'text-[var(--text-main)]';
                return (
                  <div key={truck.id || idx} className="flex items-center justify-between p-3 bg-[var(--bg-panel-hover)] border border-[var(--border-subtle)] rounded-lg hover:border-[#e67e00] transition-colors cursor-pointer" onClick={() => setSelectedStack(truck.paddyInwardDetails?.stackNo)}>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--text-muted-alt)] uppercase">Stack No</span>
                        <span className="font-bold text-lg text-[var(--text-main)]">{truck.paddyInwardDetails?.stackNo || '-'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--text-muted-alt)] uppercase">Truck No</span>
                        <span className="font-medium text-sm text-[var(--text-main)]">{truck.truckNo}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--text-muted-alt)] uppercase">Supplier</span>
                        <span className="font-medium text-sm text-[var(--text-main)] truncate max-w-[150px]">{truck.supplier?.name || '-'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-[var(--text-muted-alt)] uppercase">Moisture</span>
                        <span className={`font-bold text-sm ${moColor}`}>{mo}%</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-[var(--text-muted-alt)] uppercase">Bags (A Class)</span>
                        <span className="font-bold text-sm text-[var(--text-main)]">{truck.paddyInwardDetails?.bagsRecAtMill || 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <StackHistoryModal 
        isOpen={!!selectedStack} 
        onClose={() => setSelectedStack(null)} 
        stackNo={selectedStack || ''} 
        plantId={plantId}
        onStackCompleted={fetchStacks}
      />
    </div>
  );
}

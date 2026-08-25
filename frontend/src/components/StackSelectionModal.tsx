import React, { useState } from 'react';
import { X, Info, Plus, AlertTriangle } from 'lucide-react';
import { CustomModal } from './CustomModal';

interface StackData {
  moisture: number;
  bags: number;
  type: string;
  capacity: number;
  maxMoisture: number;
  minMoisture: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (stack: string, bagType: string) => void;
  occupiedStacks: Record<string, StackData>;
  currentMoisture?: number;
}

export default function StackSelectionModal({ isOpen, onClose, onSelect, occupiedStacks, currentMoisture = 0 }: Props) {
  const [hoveredStack, setHoveredStack] = useState<string | null>(null);
  const [initStack, setInitStack] = useState<string | null>(null);
  const [initForm, setInitForm] = useState({ moistureRange: 'Medium', bagType: 'NEW' });
  const [confirmStack, setConfirmStack] = useState<{ stack: string, warning: string, type: string, bags: number } | null>(null);

  // Make sections dynamic so "Add Stack" can increase the count
  const [sections, setSections] = useState([
    { name: 'Section A', prefix: 'A', count: 20 },
    { name: 'Section B', prefix: 'B', count: 20 },
    { name: 'Section C', prefix: 'C', count: 16 },
  ]);

  if (!isOpen) return null;

  const handleAddStack = (sectionName: string) => {
    // In a real app, this should trigger an API call and an Admin notification
    alert(`Admin Notification: A new stack was added to ${sectionName} beyond standard limit.`);
    setSections(prev => prev.map(sec => 
      sec.name === sectionName ? { ...sec, count: sec.count + 1 } : sec
    ));
  };

  const getMoistureColor = (moisture?: number) => {
    if (moisture === undefined) return 'bg-blue-900/20 border-blue-500/30 text-blue-300'; // Available
    if (moisture > 20) return 'bg-red-400/50 border-red-500/80 text-white'; // Light Red
    if (moisture >= 18 && moisture <= 20) return 'bg-yellow-400/50 border-yellow-500/80 text-white'; // Light Yellow
    if (moisture >= 14.5 && moisture < 18) return 'bg-green-400/50 border-green-500/80 text-white'; // Light Green
    return 'bg-green-700/80 border-green-900/80 text-white'; // Dark Green
  };

  const handleStackClick = (stack: string) => {
    const isOccupied = !!occupiedStacks[stack];
    if (isOccupied) {
      const stackData = occupiedStacks[stack];
      
      // Determine categories
      const getCat = (m: number) => {
        if (m > 20) return 'High';
        if (m >= 18) return 'Medium';
        if (m >= 14.5) return 'Low';
        return 'Dryer';
      };

      const stackCat = getCat(stackData.moisture);
      const truckCat = getCat(currentMoisture);
      
      let warning = '';
      if (currentMoisture > 0 && stackCat !== truckCat) {
        warning = `\n\n⚠️ WARNING: MISMATCH DETECTED ⚠️\nYou are assigning ${truckCat} moisture paddy (${currentMoisture}%) to a ${stackCat} moisture stack (${stackData.moisture}%).\nThis is against standard handling practices.`;
      }

      const msg = `Stack ${stack} is active with ${stackData.bags} bags (${stackData.type}).${warning}\n\nDo you want to assign this inward entry to this stack?`;
      
      setConfirmStack({
        stack,
        warning,
        type: stackData.type,
        bags: stackData.bags
      });
    } else {
      setInitStack(stack);
    }
  };

  const handleConfirmAssignment = () => {
    if (confirmStack) {
      onSelect(confirmStack.stack, confirmStack.type);
      setConfirmStack(null);
    }
  };

  const handleInitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initStack) {
      onSelect(initStack, initForm.bagType);
      setInitStack(null);
    }
  };

  const generateMainStacks = () => {
    const stacks = [];
    for (let col = 1; col <= 7; col++) {
      for (let row = 8; row >= 1; row--) {
        const stackNum = (col - 1) * 8 + row;
        stacks.push(stackNum.toString());
      }
    }
    return stacks;
  };

  const renderStack = (stack: string) => {
    const data = occupiedStacks[stack];
    const isOccupied = !!data;
    
    const colorClass = isOccupied 
      ? getMoistureColor(data?.moisture)
      : 'bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-panel-alt)]'; // Available

    return (
      <div 
        key={stack} 
        className="relative flex flex-col items-center"
        onMouseEnter={() => setHoveredStack(stack)}
        onMouseLeave={() => setHoveredStack(null)}
      >
        <span className="text-[10px] font-bold text-[var(--text-muted-alt)] mb-1">{stack}</span>
        <button
          type="button"
          onClick={() => handleStackClick(stack)}
          className={`relative h-10 w-12 rounded flex flex-col items-center justify-center text-[10px] font-bold transition-all border-2 ${colorClass} hover:scale-105 shadow-sm`}
        >
          <span>{data ? data.capacity || 2467 : 2467}</span>
          {data && (
            <span className="absolute bottom-0 text-[7.5px] bg-black/70 px-1 rounded truncate w-full">{data.type}</span>
          )}
        </button>

        {hoveredStack === stack && data && (
          <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-gray-900 border border-gray-700 rounded p-2 text-xs text-white shadow-xl pointer-events-none">
            <div className="font-bold border-b border-gray-700 pb-1 mb-1 text-center">{stack} Details</div>
            <div className="flex justify-between"><span>Max Moisture:</span> <span>{data.maxMoisture}%</span></div>
            <div className="flex justify-between"><span>Min Moisture:</span> <span>{data.minMoisture}%</span></div>
            <div className="flex justify-between"><span>Avg Moisture:</span> <span>{data.moisture}%</span></div>
            <div className="flex justify-between"><span>Bags:</span> <span>{data.bags} / {data.capacity}</span></div>
            <div className="flex justify-between"><span>Type:</span> <span>{data.type} Bags</span></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] shadow-2xl w-full max-w-6xl flex flex-col my-auto">
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">Yard Map - Stack Selection</h2>
            <div className="text-xs text-[var(--text-muted)] mt-2 flex flex-wrap gap-4 items-center">
              <span className="font-semibold text-white">Legend:</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-400"></span> &gt;20% (High)</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-yellow-400"></span> 18-20% (Medium)</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-400"></span> 14.5-18% (Low)</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-700"></span> &lt;14.5% (Dryer)</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-blue-900 border border-blue-500"></span> Available</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-[var(--bg-base)] rounded-full text-[var(--text-muted)] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-x-auto bg-[var(--bg-base)]">
          <div className="border-2 border-[var(--border-subtle)] rounded-lg relative min-w-[1150px] h-[950px] mx-auto bg-[var(--bg-panel-alt)] shadow-inner overflow-hidden">
            
            {/* A Label and Main Grid 7 cols x 8 rows */}
            <div className="absolute left-[240px] top-6 font-bold text-xl text-[var(--text-muted)] tracking-widest">A</div>
            <div className="absolute left-10 top-14 grid grid-flow-col grid-rows-8 gap-x-6 gap-y-3">
              {generateMainStacks().map(s => renderStack(s))}
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
                { no: '8', cap: '1262' }, { no: '5', cap: '2467' }, { no: '2', cap: '2467' },
                { no: '9', cap: '2467' }, { no: '6', cap: '2467' }, { no: '3', cap: '2467' },
                null,                     { no: '7', cap: '2467' }, { no: '4', cap: '2467' }
              ].map((stack, i) => (
                stack ? (
                  <div key={i} className="flex flex-col items-center opacity-70">
                    <span className="text-[10px] font-bold text-[var(--text-muted-alt)] mb-1">{stack.no}</span>
                    <div className="border-2 border-[var(--border-subtle)] rounded text-[10px] font-bold w-12 h-10 flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-muted)]">{stack.cap}</div>
                  </div>
                ) : (
                  <div key={i} className="w-12 h-10"></div>
                )
              ))}
            </div>

            {/* Stack 10 (2198) - right of main grid */}
            <div className="absolute left-[544px] top-[56px] flex flex-col items-center">
              <span className="text-[10px] font-bold text-[var(--text-muted-alt)] mb-1">10</span>
              <div className="border-2 border-[var(--border-subtle)] rounded text-[10px] font-bold bg-[var(--bg-base)] text-[var(--text-main)] w-12 h-10 flex items-center justify-center">2198</div>
            </div>

            {/* Stack 1 (1280) - to the right of Droll Room */}
            <div className="absolute left-[1050px] top-[310px] opacity-70 flex flex-col items-center">
              <span className="text-[10px] font-bold text-[var(--text-muted-alt)] mb-1">1</span>
              <div className="border-2 border-[var(--border-subtle)] rounded text-[9px] font-bold w-12 h-10 flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-muted)]">1280</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stack Initialization Modal */}
      <CustomModal 
        isOpen={!!initStack} 
        onClose={() => setInitStack(null)} 
        title={`Start New Stack: ${initStack}`}
      >
        <form onSubmit={handleInitSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Expected Moisture Range</label>
            <select 
              value={initForm.moistureRange} 
              onChange={e => setInitForm({...initForm, moistureRange: e.target.value})}
              className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
            >
              <option value="High">High (&gt;20%)</option>
              <option value="Medium">Medium (18-20%)</option>
              <option value="Low">Low (14.5-18%)</option>
              <option value="Dryer">Dryer (&lt;14.5%)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Bag Type</label>
            <select 
              value={initForm.bagType} 
              onChange={e => setInitForm({...initForm, bagType: e.target.value})}
              className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
            >
              <option value="NEW">New Bags</option>
              <option value="OLD">Old Bags</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setInitStack(null)} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors shadow-lg">Confirm & Start Stack</button>
          </div>
        </form>
      </CustomModal>

      {/* Confirmation Modal */}
      <CustomModal
        isOpen={!!confirmStack}
        onClose={() => setConfirmStack(null)}
        title="Confirm Stack Assignment"
      >
        {confirmStack && (
          <div className="space-y-4">
            <p className="text-[var(--text-main)]">
              Stack <strong className="text-blue-400">{confirmStack.stack}</strong> is active with <strong>{confirmStack.bags}</strong> bags ({confirmStack.type}).
            </p>
            {confirmStack.warning && (
              <div className="bg-red-500/10 border border-red-500/30 rounded p-3 flex gap-3 items-start">
                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
                <p className="text-red-400 text-sm whitespace-pre-line leading-relaxed">{confirmStack.warning.replace('\n\n⚠️ WARNING: MISMATCH DETECTED ⚠️\n', '')}</p>
              </div>
            )}
            <p className="text-[var(--text-muted)] text-sm">Do you want to assign this inward entry to this stack?</p>
            
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setConfirmStack(null)} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
              <button type="button" onClick={handleConfirmAssignment} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors shadow-lg">Confirm Assignment</button>
            </div>
          </div>
        )}
      </CustomModal>
    </div>
  );
}

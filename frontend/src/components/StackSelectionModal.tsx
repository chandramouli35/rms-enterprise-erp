import React, { useState } from 'react';
import { X, Info, Plus } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (stack: string) => void;
  occupiedStacks: string[];
}

// Mock Stack Data for Demonstration of Colors & Tooltips
const MOCK_STACK_DATA: Record<string, { moisture: number, bags: number, type: 'NEW' | 'OLD', capacity: number, maxMoisture: number, minMoisture: number }> = {
  'A1': { moisture: 21, bags: 1200, type: 'OLD', capacity: 2467, maxMoisture: 22, minMoisture: 20 },
  'A5': { moisture: 19, bags: 2400, type: 'NEW', capacity: 2467, maxMoisture: 19.5, minMoisture: 18.5 },
  'B2': { moisture: 16, bags: 500, type: 'NEW', capacity: 2467, maxMoisture: 16.5, minMoisture: 15.8 },
  'C10': { moisture: 13, bags: 2467, type: 'OLD', capacity: 2467, maxMoisture: 14, minMoisture: 12.5 },
};

export default function StackSelectionModal({ isOpen, onClose, onSelect, occupiedStacks }: Props) {
  const [hoveredStack, setHoveredStack] = useState<string | null>(null);
  const [initStack, setInitStack] = useState<string | null>(null);
  const [initForm, setInitForm] = useState({ moistureRange: 'Medium', bagType: 'NEW' });

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
    const isOccupied = occupiedStacks.includes(stack) || MOCK_STACK_DATA[stack];
    if (isOccupied) {
      alert(`Stack History for ${stack}\nWill display ledger details here.`);
    } else {
      setInitStack(stack);
    }
  };

  const handleInitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initStack) {
      onSelect(initStack);
      setInitStack(null);
    }
  };

  const renderStack = (stack: string) => {
    const data = MOCK_STACK_DATA[stack];
    const isOccupied = occupiedStacks.includes(stack) || !!data;
    // For dynamically occupied stacks (via props), we don't have moisture data yet, so we show it as standard OCC
    const colorClass = isOccupied && !data 
      ? 'bg-gray-700/50 border-gray-500/80 text-gray-300 cursor-not-allowed' 
      : getMoistureColor(data?.moisture);

    return (
      <div 
        key={stack} 
        className="relative"
        onMouseEnter={() => setHoveredStack(stack)}
        onMouseLeave={() => setHoveredStack(null)}
      >
        <button
          type="button"
          onClick={() => handleStackClick(stack)}
          className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded flex flex-col items-center justify-center text-[11px] font-bold transition-all border ${colorClass} hover:scale-105 shadow-sm`}
        >
          <span>{stack}</span>
          {data && (
            <span className="text-[8px] bg-black/50 px-1 rounded mt-1">{data.type}</span>
          )}
          {isOccupied && !data && (
            <span className="text-[8px] bg-black/50 px-1 rounded mt-1">OCC</span>
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
          <div className="border-2 border-[var(--border-subtle)] p-8 rounded-lg relative min-w-[900px] w-full max-w-5xl mx-auto bg-[var(--bg-panel-alt)] flex flex-col gap-8 shadow-inner">
            
            {sections.map(section => (
              <div key={section.name} className="bg-black/20 p-4 rounded-xl border border-white/5 shadow-inner">
                <div className="text-sm text-[var(--text-muted-alt)] mb-4 uppercase tracking-widest font-bold flex justify-between items-center border-b border-white/10 pb-2">
                  <span>{section.name}</span>
                  <button 
                    type="button" 
                    onClick={() => handleAddStack(section.name)} 
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs px-2 py-1 bg-blue-900/30 rounded border border-blue-500/30 hover:border-blue-400 transition-colors"
                  >
                    <Plus size={14} /> Add Stack
                  </button>
                </div>
                <div className="grid grid-cols-10 gap-3">
                  {Array.from({ length: section.count }, (_, i) => `${section.prefix}${i + 1}`).map(renderStack)}
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>

      {/* Stack Initialization Modal */}
      {initStack && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-4">Start New Stack: {initStack}</h3>
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
                <button type="button" onClick={() => setInitStack(null)} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)]">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Confirm & Start Stack</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

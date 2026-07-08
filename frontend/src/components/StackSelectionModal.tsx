import React from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (stack: string) => void;
  occupiedStacks: string[];
}

export default function StackSelectionModal({ isOpen, onClose, onSelect, occupiedStacks }: Props) {
  if (!isOpen) return null;

  const mainStacks = Array.from({ length: 56 }, (_, i) => (i + 1).toString());
  const gridBStacks = Array.from({ length: 6 }, (_, i) => `Grid b - ${i + 1}`);

  const renderStack = (stack: string, label: string) => {
    const isOccupied = occupiedStacks.includes(stack);
    return (
      <button
        type="button"
        key={stack}
        disabled={isOccupied}
        onClick={() => onSelect(stack)}
        className={`h-10 w-10 sm:h-11 sm:w-11 rounded flex items-center justify-center text-[11px] font-bold transition-all ${
          isOccupied 
            ? 'bg-red-900/50 border border-red-500/50 text-red-300 cursor-not-allowed opacity-60' 
            : 'bg-blue-900/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600 hover:text-white cursor-pointer hover:scale-110 shadow-sm'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] shadow-2xl w-full max-w-5xl flex flex-col my-auto">
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">Yard Map - Stack Selection</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-4">
              <span>Select an available stack.</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500/60 border border-red-500"></span> Occupied</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500/40 border border-blue-500"></span> Available</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-[var(--bg-base)] rounded-full text-[var(--text-muted)] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-x-auto bg-[var(--bg-base)]">
          {/* Blueprint Layout Container */}
          <div className="border-2 border-[var(--border-subtle)] p-8 rounded-lg relative min-w-[850px] w-full max-w-4xl mx-auto bg-[var(--bg-panel-alt)] flex gap-12 shadow-inner">
            
            {/* Left Column (Rooms) */}
            <div className="flex flex-col gap-4 w-56">
              <div className="h-40 border border-dashed border-gray-600/50 rounded flex items-center justify-center text-gray-500/70 font-bold uppercase tracking-wider text-sm bg-gray-900/20">
                Mistry Room
              </div>
              <div className="h-16 border border-dashed border-gray-600/50 rounded flex items-center justify-center text-gray-500/70 font-bold uppercase tracking-wider text-sm bg-gray-900/20">
                Labour Room
              </div>
              
              <div className="h-24 mt-12 border border-dashed border-gray-600/50 rounded flex items-center justify-center text-gray-500/70 font-bold uppercase tracking-wider text-sm bg-gray-900/20">
                Office
              </div>
              
              <div className="flex gap-4 mt-8">
                <div className="h-20 w-16 border border-dashed border-gray-600/50 rounded flex flex-col items-center justify-center text-gray-500/70 font-bold uppercase tracking-wider text-xs bg-gray-900/20">
                  <span>G</span><span>A</span><span>T</span><span>E</span>
                </div>
                <div className="h-20 flex-1 border border-dashed border-gray-600/50 rounded flex items-center justify-center text-gray-500/70 font-bold uppercase tracking-wider text-sm bg-gray-900/20">
                  Kanda
                </div>
              </div>
              
              <div className="flex mt-8 text-xs text-center border border-dashed border-gray-600/50 rounded overflow-hidden bg-gray-900/20">
                <div className="flex-1 border-r border-dashed border-gray-600/50 py-3 text-gray-500/70 font-bold uppercase">Rice Room</div>
                <div className="flex-1 border-r border-dashed border-gray-600/50 py-3 text-gray-500/70 font-bold uppercase">Shaller</div>
                <div className="flex-1 py-3 text-gray-500/70 font-bold uppercase">Drali</div>
              </div>
            </div>

            {/* Right Column (Stacks) */}
            <div className="flex-1 flex flex-col justify-between items-end gap-16 py-4">
              
              {/* Main Grid (8 columns, 7 rows) */}
              <div className="grid grid-cols-8 gap-2.5">
                {mainStacks.map(num => renderStack(num, num))}
              </div>

              {/* Grid B */}
              <div className="flex flex-col items-center mr-8 bg-black/20 p-4 rounded-xl border border-white/5 shadow-inner">
                <div className="grid grid-cols-3 gap-2.5">
                  {gridBStacks.map((id, index) => renderStack(id, (index + 1).toString()))}
                </div>
                <div className="text-xs text-[var(--text-muted-alt)] mt-3 uppercase tracking-widest font-bold">Grid B</div>
              </div>
              
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

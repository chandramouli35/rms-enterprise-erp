import React, { useEffect, useState } from 'react';
import api from '../api/axios';

interface PaddyStackMapProps {
  onSelectStack: (stackNo: string) => void;
  selectedStack: string;
  plantId: string;
}

export const PaddyStackMap: React.FC<PaddyStackMapProps> = ({ onSelectStack, selectedStack, plantId }) => {
  const [occupiedStacks, setOccupiedStacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOccupied = async () => {
      try {
        if (!plantId) return;
        const res = await api.get(`/api/procurement/occupied-stacks/${plantId}`);
        const raw = res.data;
        // API returns a map keyed by stackNo; keep array form for older shapes
        setOccupiedStacks(
          Array.isArray(raw)
            ? raw
            : Object.keys(raw || {}).map((stackNo) => ({ stackNo, ...(raw[stackNo] || {}) })),
        );
      } catch (error) {
        console.error('Failed to fetch occupied stacks', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOccupied();
  }, [plantId]);

  // Main stacks from 1 to 56
  // Col 1: 8..1
  // Col 2: 16..9
  // Col 7: 56..49
  const generateMainStacks = () => {
    const stacks = [];
    for (let col = 1; col <= 7; col++) {
      for (let row = 8; row >= 1; row--) {
        const stackNum = (col - 1) * 8 + row;
        stacks.push({ num: stackNum, col, row });
      }
    }
    return stacks;
  };

  const getStackStatus = (stackNum: string) => {
    const stack = occupiedStacks.find(
      (s) => s.stackNo === stackNum || s.inwardDetails?.stackNo === stackNum,
    );
    return stack ? 'occupied' : 'empty';
  };

  const renderStack = (stackNum: number) => {
    const status = getStackStatus(stackNum.toString());
    const isSelected = selectedStack === stackNum.toString();
    const capacity = 2467;

    let bgColor = 'bg-[var(--bg-base)] hover:bg-[var(--bg-panel-alt)]';
    let borderColor = 'border-[var(--border-subtle)]';
    let textColor = 'text-[var(--text-main)]';

    if (isSelected) {
      bgColor = 'bg-blue-500/20';
      borderColor = 'border-blue-500';
    } else if (status === 'occupied') {
      bgColor = 'bg-amber-500/20';
      borderColor = 'border-amber-500';
      textColor = 'text-amber-500';
    }

    return (
      <button
        key={stackNum}
        type="button"
        onClick={() => onSelectStack(stackNum.toString())}
        className={`relative flex flex-col items-center justify-center h-10 w-12 rounded border-2 transition-colors cursor-pointer ${bgColor} ${borderColor}`}
        title={`Stack ${stackNum}`}
      >
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[var(--text-muted-alt)] bg-[var(--bg-panel)] px-1 rounded-sm shadow-sm border border-[var(--border-subtle)]">
          {stackNum}
        </span>
        <span className={`text-[10px] font-bold ${textColor}`}>{capacity}</span>
      </button>
    );
  };

  return (
    <div className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-4 overflow-x-auto relative">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-sm text-[var(--text-main)]">Paddy Inward Stacks Layout</h3>
        <div className="flex gap-4 text-[10px] font-bold">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[var(--bg-base)] border-2 border-[var(--border-subtle)]"></div> Available</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-500/20 border-2 border-amber-500"></div> Occupied</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500/20 border-2 border-blue-500"></div> Selected</div>
        </div>
      </div>

      <div className="min-w-[1050px] h-[750px] relative border-2 border-[var(--border-subtle-alt)] bg-[var(--bg-base)] rounded-lg p-6">
        
        {/* Main Grid 7 cols x 8 rows */}
        <div className="absolute left-10 top-[160px] grid grid-flow-col grid-rows-8 gap-x-8 gap-y-6">
          {generateMainStacks().map(s => renderStack(s.num))}
        </div>

        {/* Mistry Room */}
        <div className="absolute left-[620px] top-[260px] w-[70px] h-[450px] border-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase writing-vertical-rl -rotate-180">
          Mistry Room
        </div>

        {/* Labour Room */}
        <div className="absolute left-[720px] bottom-10 w-[280px] h-[300px] border-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase">
          Labour Room
        </div>

        {/* Office */}
        <div className="absolute left-[720px] top-[250px] w-[160px] h-[120px] border-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase">
          Office
        </div>

        {/* Kanda */}
        <div className="absolute left-[720px] top-[100px] w-[120px] h-[100px] border-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase writing-vertical-rl -rotate-180">
          Kanda
        </div>

        {/* Gate */}
        <div className="absolute right-0 top-[100px] w-[25px] h-[80px] border-y-2 border-l-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] uppercase writing-vertical-rl -rotate-180 bg-[var(--bg-panel)]">
          Gate
        </div>

        {/* Rooms Top Right (Droll, Shaller, Rice Room) */}
        <div className="absolute left-[520px] top-6 flex border-2 border-[var(--border-subtle-alt)] -rotate-[8deg] origin-top-left">
          <div className="w-[100px] h-[60px] border-r-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] uppercase">Droll</div>
          <div className="w-[120px] h-[60px] border-r-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] uppercase">Shaller</div>
          <div className="w-[160px] h-[60px] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] uppercase">Rice Room</div>
        </div>

        {/* Top Left Stacks (extra) */}
        <div className="absolute left-[280px] top-12">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-[var(--text-muted-alt)] mb-1">10</span>
            <div className="border-2 border-[var(--border-subtle)] p-2 rounded text-[10px] font-bold bg-[var(--bg-panel-alt)] w-12 text-center h-10 flex items-center justify-center">2198</div>
          </div>
        </div>
        
        {/* Top far left Stacks */}
        <div className="absolute left-10 top-12 grid grid-cols-4 gap-4">
            <div className="border-2 border-[var(--border-subtle)] rounded text-[9px] font-bold text-center w-12 h-10 flex items-center justify-center bg-[var(--bg-panel-alt)]">2467</div>
            <div className="border-2 border-[var(--border-subtle)] rounded text-[9px] font-bold text-center w-12 h-10 flex items-center justify-center bg-[var(--bg-panel-alt)]">2467</div>
            <div className="border-2 border-[var(--border-subtle)] rounded text-[9px] font-bold text-center w-12 h-10 flex items-center justify-center bg-[var(--bg-panel-alt)]">2467</div>
            <div className="border-2 border-[var(--border-subtle)] rounded text-[9px] font-bold text-center w-12 h-10 flex items-center justify-center bg-[var(--bg-panel-alt)]">2467</div>
            <div className="border-2 border-[var(--border-subtle)] rounded text-[9px] font-bold text-center w-12 h-10 flex items-center justify-center bg-[var(--bg-panel-alt)]">2467</div>
            <div className="border-2 border-[var(--border-subtle)] rounded text-[9px] font-bold text-center w-12 h-10 flex items-center justify-center bg-[var(--bg-panel-alt)]">2467</div>
            <div className="border-2 border-[var(--border-subtle)] rounded text-[9px] font-bold text-center w-12 h-10 flex items-center justify-center bg-[var(--bg-panel-alt)]">1280</div>
        </div>
      </div>
    </div>
  );
};

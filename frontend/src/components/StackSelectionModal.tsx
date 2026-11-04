import React, { useEffect, useMemo, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { CustomModal } from './CustomModal';
import api from '../api/axios';
import { useSubmitLock } from '../hooks/useSubmitLock';
import { groupStacksBySection } from '../utils/stackSections';

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
  /** Feedback 33 — stack drawing belongs to current mill */
  plantName?: string;
  plantId?: string;
}

export default function StackSelectionModal({
  isOpen,
  onClose,
  onSelect,
  occupiedStacks,
  currentMoisture = 0,
  plantName = '',
  plantId = '',
}: Props) {
  const [hoveredStack, setHoveredStack] = useState<string | null>(null);
  const [initStack, setInitStack] = useState<string | null>(null);
  const [initForm, setInitForm] = useState({ moistureRange: 'Medium', bagType: 'NEW' });
  const [confirmStack, setConfirmStack] = useState<{ stack: string; warning: string; type: string; bags: number } | null>(null);
  const [layoutStacks, setLayoutStacks] = useState<string[]>([]);
  const initLock = useSubmitLock();
  const confirmLock = useSubmitLock();

  const isBeas = /beas/i.test(plantName || '');
  const isRajoa = /rajoa/i.test(plantName || '');

  useEffect(() => {
    if (!isOpen || !plantId || isBeas || isRajoa) return;
    api
      .get(`/api/procurement/stack/layout?plantId=${plantId}`)
      .then((res) => {
        const nos = (res.data || []).map((s: any) => String(s.stackNo)).filter(Boolean);
        setLayoutStacks(nos);
      })
      .catch(() => setLayoutStacks([]));
  }, [isOpen, plantId, isBeas, isRajoa]);

  const plantStackList = useMemo(() => {
    const fromOcc = Object.keys(occupiedStacks || {});
    const merged = Array.from(new Set([...layoutStacks, ...fromOcc]));
    merged.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (merged.length > 0) return merged;
    // Fallback numbered plots for mills without Beas drawing / empty layout
    return Array.from({ length: 32 }, (_, i) => String(i + 1));
  }, [layoutStacks, occupiedStacks]);

  /** Temporary: show stack nos grouped under Section A / B / C… */
  const plantStackSections = useMemo(
    () => groupStacksBySection(plantStackList),
    [plantStackList],
  );

  if (!isOpen) return null;

  const getMoistureColor = (moisture?: number) => {
    if (moisture === undefined) return 'bg-blue-900/20 border-blue-500/30 text-blue-300';
    if (moisture > 20) return 'bg-red-400/50 border-red-500/80 text-white';
    if (moisture >= 18 && moisture <= 20) return 'bg-yellow-400/50 border-yellow-500/80 text-white';
    if (moisture >= 14.5 && moisture < 18) return 'bg-green-400/50 border-green-500/80 text-white';
    return 'bg-green-700/80 border-green-900/80 text-white';
  };

  const handleStackClick = (stack: string) => {
    const isOccupied = !!occupiedStacks[stack];
    if (isOccupied) {
      const stackData = occupiedStacks[stack];
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
      setConfirmStack({
        stack,
        warning,
        type: stackData.type,
        bags: stackData.bags,
      });
    } else {
      setInitStack(stack);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!confirmStack) return;
    await confirmLock.wrapSubmit(async () => {
      onSelect(confirmStack.stack, confirmStack.type);
      setConfirmStack(null);
    });
  };

  const handleInitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initStack) return;
    await initLock.wrapSubmit(async () => {
      onSelect(initStack, initForm.bagType);
      setInitStack(null);
    });
  };

  const generateMainStacks = () => {
    const stacks = [];
    for (let col = 1; col <= 7; col++) {
      for (let row = 8; row >= 1; row--) {
        stacks.push(String((col - 1) * 8 + row));
      }
    }
    return stacks;
  };

  const renderStack = (stack: string) => {
    const data = occupiedStacks[stack];
    const isOccupied = !!data;
    const colorClass = isOccupied
      ? getMoistureColor(data?.moisture)
      : 'bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-panel-alt)]';

    return (
      <div
        key={stack}
        className="relative flex flex-col items-center"
        onMouseEnter={() => setHoveredStack(stack)}
      >
        <span className="text-xs font-black text-[var(--text-main)] mb-1 tracking-wide">
          {stack}
        </span>
        <button
          type="button"
          onClick={() => handleStackClick(stack)}
          className={`relative h-10 w-12 rounded flex flex-col items-center justify-center text-[10px] font-bold transition-all border-2 ${colorClass} hover:scale-105 shadow-sm`}
        >
          <span>{data ? data.capacity || data.bags || '—' : '—'}</span>
          {data && (
            <span className="absolute bottom-0 text-[7.5px] bg-black/70 px-1 rounded truncate w-full">{data.type}</span>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-hidden">
      {/* Flex column + max height: only the map scrolls; summary footer stays fully visible */}
      <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] shadow-2xl w-full max-w-6xl max-h-[min(92vh,920px)] flex flex-col overflow-hidden">
        <div className="shrink-0 p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">
              Yard Map — {plantName || 'Current Mill'}
            </h2>
            <p className="text-xs text-[var(--text-muted-alt)] mt-1">
              {isBeas
                ? 'Beas Agro yard drawing (mill-specific)'
                : isRajoa
                  ? 'Rajoa Agro yard drawing (mill-specific)'
                  : `Plant-scoped stack selection for ${plantName || 'this mill'} (occupancy from this plant only)`}
            </p>
            <div className="text-xs text-[var(--text-muted)] mt-2 flex flex-wrap gap-4 items-center">
              <span className="font-semibold text-white">Legend:</span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-red-400"></span> &gt;20% (High)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-yellow-400"></span> 18-20% (Medium)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-green-400"></span> 14.5-18% (Low)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-green-700"></span> &lt;14.5% (Dryer)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-blue-900 border border-blue-500"></span> Available
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-base)] rounded-full text-[var(--text-muted)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div
          className="flex-1 min-h-0 p-6 overflow-x-auto overflow-y-auto bg-[var(--bg-base)]"
          onMouseLeave={() => setHoveredStack(null)}
        >
          {isBeas ? (
            <div className="border-2 border-[var(--border-subtle)] rounded-lg relative min-w-[1150px] h-[950px] mx-auto bg-[var(--bg-panel-alt)] shadow-inner overflow-visible">
              <div className="absolute left-[240px] top-6 font-bold text-xl text-[var(--text-muted)] tracking-widest">A</div>
              <div className="absolute left-10 top-14 grid grid-flow-col grid-rows-8 gap-x-6 gap-y-3">
                {generateMainStacks().map((s) => renderStack(s))}
              </div>
              <div className="absolute left-[112px] top-[640px] flex">
                <div className="flex flex-col">
                  <div className="w-[336px] h-[50px] border-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase bg-[var(--bg-base)]">
                    Mistry Room
                  </div>
                  <div className="w-[336px] h-[150px] border-x-2 border-b-2 border-[var(--border-subtle-alt)] bg-transparent" />
                </div>
                <div className="w-[60px] h-[200px] border-y-2 border-r-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase bg-[var(--bg-base)]">
                  <span className="-rotate-90 whitespace-nowrap">Labour Room</span>
                </div>
              </div>
              <div className="absolute left-[560px] top-[680px] w-[100px] h-[100px] border-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase bg-[var(--bg-base)]">
                Office
              </div>
              <div className="absolute left-[680px] top-[680px] w-[60px] h-[150px] border-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] tracking-widest uppercase bg-[var(--bg-base)]">
                <span className="-rotate-90 whitespace-nowrap">Kanda</span>
              </div>
              <div className="absolute left-[950px] top-[300px] flex flex-col border-2 border-[var(--border-subtle-alt)] bg-[var(--bg-base)]">
                <div className="w-[80px] h-[80px] border-b-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] uppercase">
                  <span className="-rotate-90 whitespace-nowrap">Droll</span>
                </div>
                <div className="w-[80px] h-[100px] border-b-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] uppercase">
                  <span className="-rotate-90 whitespace-nowrap">Shaller</span>
                </div>
                <div className="w-[80px] h-[120px] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] uppercase">
                  <span className="-rotate-90 whitespace-nowrap">Rice Room</span>
                </div>
              </div>
            </div>
          ) : isRajoa ? (
            <div className="border-2 border-[var(--border-subtle)] rounded-lg p-4 min-w-[720px] mx-auto bg-[var(--bg-panel-alt)] shadow-inner">
              <div className="mb-3 font-bold text-lg text-[var(--text-muted)] tracking-widest">
                RAJOA AGRO — YARD (section-wise)
              </div>
              <div className="space-y-5 mb-6">
                {groupStacksBySection(
                  Array.from({ length: 24 }, (_, i) => String(i + 1)),
                ).map(({ section, stacks }) => (
                  <div key={section}>
                    <div className="mb-2 flex items-center gap-2 border-b border-[var(--border-subtle)] pb-1">
                      <span className="text-xs font-black uppercase tracking-widest text-amber-500">
                        {section}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted-alt)]">
                        Stack Nos {stacks[0]}
                        {stacks.length > 1 ? `–${stacks[stacks.length - 1]}` : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-8 gap-3">
                      {stacks.map((s) => renderStack(s))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-20 border-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] uppercase bg-[var(--bg-base)]">
                  Weighbridge
                </div>
                <div className="h-20 border-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] uppercase bg-[var(--bg-base)]">
                  Godown
                </div>
                <div className="h-20 border-2 border-[var(--border-subtle-alt)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] uppercase bg-[var(--bg-base)]">
                  Dryer Bay
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--bg-panel-alt)]">
              <div className="mb-3 text-sm font-bold text-[var(--text-main)]">
                {plantName || 'Mill'} — Select stack (section-wise)
              </div>
              <div className="space-y-5">
                {plantStackSections.map(({ section, stacks }) => (
                  <div key={section}>
                    <div className="mb-2 flex items-center gap-2 border-b border-[var(--border-subtle)] pb-1">
                      <span className="text-xs font-black uppercase tracking-widest text-amber-500">
                        {section}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted-alt)]">
                        Stack Nos {stacks[0]}
                        {stacks.length > 1 ? `–${stacks[stacks.length - 1]}` : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                      {stacks.map((s) => renderStack(s))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 z-20 border-t border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 py-3 text-sm text-[var(--text-main)] min-h-[3.5rem] shadow-[0_-4px_12px_rgba(0,0,0,0.12)]">
          {hoveredStack && occupiedStacks[hoveredStack] ? (
            <div className="flex flex-wrap gap-x-6 gap-y-1 items-center">
              <span className="font-bold">{hoveredStack} summary</span>
              <span>Avg Moisture: {occupiedStacks[hoveredStack].moisture}%</span>
              <span>Bags: {occupiedStacks[hoveredStack].bags}</span>
              <span>Type: {occupiedStacks[hoveredStack].type} Bags</span>
            </div>
          ) : (
            <span className="text-[var(--text-muted-alt)] text-xs">
              Hover a stack to see moisture / bags summary (always visible while scrolling the map)
            </span>
          )}
        </div>
      </div>

      <CustomModal isOpen={!!initStack} onClose={() => setInitStack(null)} title={`Start New Stack: ${initStack}`}>
        <form onSubmit={handleInitSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Expected Moisture Range</label>
            <select
              value={initForm.moistureRange}
              onChange={(e) => setInitForm({ ...initForm, moistureRange: e.target.value })}
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
              onChange={(e) => setInitForm({ ...initForm, bagType: e.target.value })}
              className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
            >
              <option value="NEW">New Bags</option>
              <option value="OLD">Old Bags</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setInitStack(null)} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={initLock.pending} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50">
              {initLock.pending ? 'Starting…' : 'Confirm & Start Stack'}
            </button>
          </div>
        </form>
      </CustomModal>

      <CustomModal isOpen={!!confirmStack} onClose={() => setConfirmStack(null)} title="Confirm Stack Assignment">
        {confirmStack && (
          <div className="space-y-4">
            <p className="text-[var(--text-main)]">
              Stack <strong className="text-blue-400">{confirmStack.stack}</strong> is active with <strong>{confirmStack.bags}</strong> bags (
              {confirmStack.type}).
            </p>
            {confirmStack.warning && (
              <div className="bg-red-500/10 border border-red-500/30 rounded p-3 flex gap-3 items-start">
                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
                <p className="text-red-400 text-sm whitespace-pre-line leading-relaxed">
                  {confirmStack.warning.replace('\n\n⚠️ WARNING: MISMATCH DETECTED ⚠️\n', '')}
                </p>
              </div>
            )}
            <p className="text-[var(--text-muted)] text-sm">Do you want to assign this inward entry to this stack?</p>
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setConfirmStack(null)} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleConfirmAssignment} disabled={confirmLock.pending} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50">
                {confirmLock.pending ? 'Confirming…' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        )}
      </CustomModal>
    </div>
  );
}

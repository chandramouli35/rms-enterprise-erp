import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import StackHistoryModal from './StackHistoryModal';
import { Layers } from 'lucide-react';

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
  const [stacks, setStacks] = useState<PaddyStack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStack, setSelectedStack] = useState<string | null>(null);

  const fetchStacks = () => {
    setLoading(true);
    api.get(`/api/procurement/stack/layout?plantId=${plantId}`)
      .then(res => setStacks(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStacks();
  }, [plantId]);

  const getMoistureColor = (moisture: number, status: string, bags: number) => {
    if (status === 'COMPLETED' || status === 'EMPTY' || bags <= 0) return 'bg-gray-800 border-gray-600 text-gray-500 opacity-60';
    
    if (moisture >= 20.1) return 'bg-red-500/20 border-red-500 text-red-100'; // Red
    if (moisture >= 18.1 && moisture <= 20) return 'bg-yellow-500/20 border-yellow-500 text-yellow-100'; // Yellow
    if (moisture >= 17 && moisture <= 18) return 'bg-green-500/20 border-green-500 text-green-100'; // Green
    if (moisture >= 14 && moisture <= 16) return 'bg-blue-500/20 border-blue-500 text-blue-100'; // Blue
    
    return 'bg-[var(--bg-panel-hover)] border-[var(--border-subtle)] text-[var(--text-main)]'; // Default
  };

  return (
    <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)]/50">
        <div className="flex items-center gap-2">
          <Layers className="text-[#e67e00]" size={20} />
          <h2 className="text-lg font-semibold text-[var(--text-main)]">Plant Layout & Stack View</h2>
        </div>
        
        <div className="flex items-center gap-4 text-xs font-medium bg-[var(--bg-app)] p-2 rounded-lg border border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500/50 border border-blue-500"></div> 14-16%</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500/50 border border-green-500"></div> 17-18%</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-500/50 border border-yellow-500"></div> 18.1-20%</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/50 border border-red-500"></div> 20.1%+</div>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-48 text-[var(--text-muted-alt)]">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#e67e00] mr-3"></div>
            Loading plant layout...
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {stacks.map((stack) => {
              const isCrossed = stack.status === 'EMPTY' || stack.totalBags <= 0;
              const colorClass = getMoistureColor(stack.averageMoisture, stack.status, stack.totalBags);
              
              return (
                <div 
                  key={stack.id}
                  onClick={() => setSelectedStack(stack.stackNo)}
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
            
            {stacks.length === 0 && (
              <div className="col-span-full py-12 text-center text-[var(--text-muted)] border-2 border-dashed border-[var(--border-subtle)] rounded-xl">
                No active stacks found in the plant.
              </div>
            )}
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

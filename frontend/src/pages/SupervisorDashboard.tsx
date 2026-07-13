import React from 'react';
import { Factory, Percent, CheckCircle2, Zap, Truck, Users, AlertTriangle } from 'lucide-react';

export const SupervisorDashboard = ({ metrics, alerts, today }: any) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Daily Shift Wise Production */}
        <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-[#e67e00] border border-amber-500/20"><Factory size={20} /></div>
            <h3 className="text-[var(--text-muted-alt)] font-medium text-sm">Shift Production (Prev Day)</h3>
          </div>
          <p className="text-2xl font-bold text-[var(--text-main)] mb-1">{metrics?.productionMT?.toLocaleString() || '120.5'} <span className="text-sm text-[var(--text-muted-alt)] font-normal">MT</span></p>
          <p className="text-xs text-green-400">+5% vs last shift</p>
        </div>

        {/* Quantity & Quality */}
        <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-[#e67e00] border border-amber-500/20"><Percent size={20} /></div>
            <h3 className="text-[var(--text-muted-alt)] font-medium text-sm">Avg Yield (Prev Day)</h3>
          </div>
          <p className="text-2xl font-bold text-[var(--text-main)] mb-1">{metrics?.averageYield || '67.2'} <span className="text-sm text-[var(--text-muted-alt)] font-normal">%</span></p>
          <p className="text-xs text-green-400">Target Met</p>
        </div>

        {/* Expenses (Mock) */}
        <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20"><AlertTriangle size={20} /></div>
            <h3 className="text-[var(--text-muted-alt)] font-medium text-sm">Expenses (Pending)</h3>
          </div>
          <p className="text-2xl font-bold text-[var(--text-main)] mb-1">₹45,000</p>
          <p className="text-xs text-[var(--text-muted-alt)]">Under review</p>
        </div>

        {/* Power Supply (Mock) */}
        <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20"><Zap size={20} /></div>
            <h3 className="text-[var(--text-muted-alt)] font-medium text-sm">Power Supply</h3>
          </div>
          <p className="text-xl font-bold text-[var(--text-main)] mb-1">Stable</p>
          <p className="text-xs text-green-400">23.5 hours up</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
          <h3 className="text-[var(--text-main)] font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="text-[#e67e00]" size={18} /> Sodawise Hisab / GP Procurement
          </h3>
          <div className="text-sm text-[var(--text-muted)] space-y-3">
            <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
              <span>Today's Total Procured:</span>
              <span className="font-bold text-[var(--text-main)]">{metrics?.procurementMT || '85.2'} MT</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
              <span>Gate Passes Issued:</span>
              <span className="font-bold text-[var(--text-main)]">12</span>
            </div>
            <div className="flex justify-between">
              <span>Pending Hisabs:</span>
              <span className="font-bold text-red-400">3</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] space-y-6">
          <div>
            <h3 className="text-[var(--text-main)] font-semibold mb-4 flex items-center gap-2">
              <Users className="text-[#e67e00]" size={18} /> Labour Overview
            </h3>
            <div className="text-sm text-[var(--text-muted)] space-y-2">
              <div className="flex justify-between"><span>Active Shifts:</span> <span>2</span></div>
              <div className="flex justify-between"><span>Total Labourers:</span> <span>45</span></div>
            </div>
          </div>
          <div>
            <h3 className="text-[var(--text-main)] font-semibold mb-4 flex items-center gap-2">
              <Truck className="text-[#e67e00]" size={18} /> Weight Management
            </h3>
            <div className="text-sm text-[var(--text-muted)] space-y-2">
              <div className="flex justify-between"><span>Vehicles Weighed:</span> <span>18</span></div>
              <div className="flex justify-between"><span>Average Wait Time:</span> <span>12m</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
        <h3 className="text-[var(--text-main)] font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="text-amber-500" size={18} /> Important Reminders
        </h3>
        <ul className="space-y-3 text-sm text-[var(--text-muted)]">
          <li className="flex gap-2 items-start bg-amber-500/5 p-3 rounded border border-amber-500/10">
            <CheckCircle2 size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-500 block">Daily Evening Report</span>
              Please ensure all shift logs are submitted by 6:00 PM.
            </div>
          </li>
          <li className="flex gap-2 items-start bg-blue-500/5 p-3 rounded border border-blue-500/10">
            <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-blue-500 block">Fumigation / Pest Control</span>
              Monthly scheduled fumigation is due in 3 days for Godown 2.
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};

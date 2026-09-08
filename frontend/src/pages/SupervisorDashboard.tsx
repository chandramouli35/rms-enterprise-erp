import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, Percent, CheckCircle2, Zap, Truck, Users, AlertTriangle, ClipboardList } from 'lucide-react';

export const SupervisorDashboard = ({ metrics, alerts, today }: any) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => navigate('/yield?tab=consignment_dispatch')}
          className="p-5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-left hover:bg-amber-500/20 transition"
        >
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="text-amber-400" size={22} />
            <h3 className="text-[var(--text-main)] font-semibold">Consignment Dispatch Details</h3>
          </div>
          <p className="text-xs text-[var(--text-muted-alt)]">
            Dedicated entry for supervisors — fill after GP report.
          </p>
        </button>
        <button
          type="button"
          onClick={() => navigate('/gate-pass?tab=transfer_management')}
          className="p-5 rounded-xl border border-purple-500/40 bg-purple-500/10 text-left hover:bg-purple-500/20 transition"
        >
          <div className="flex items-center gap-3 mb-2">
            <Truck className="text-purple-400" size={22} />
            <h3 className="text-[var(--text-main)] font-semibold">Transfer Entry Management</h3>
          </div>
          <p className="text-xs text-[var(--text-muted-alt)]">
            Confirm pending transfer tickets and view (T) GPs.
          </p>
        </button>
      </div>

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
          {(() => {
            const reminders = [];
            const now = new Date();
            const hour = now.getHours();
            const dayOfMonth = now.getDate();
            const dayOfWeek = now.getDay();

            // Daily Evening Report
            if (hour >= 18) {
              reminders.push({ id: 1, color: 'red', title: 'Daily Evening Report', text: 'Evening report is overdue! Please submit immediately.' });
            } else if (hour >= 14) {
              reminders.push({ id: 1, color: 'amber', title: 'Daily Evening Report', text: 'Please ensure all shift logs are submitted by 6:00 PM today.' });
            } else {
              reminders.push({ id: 1, color: 'blue', title: 'Daily Evening Report', text: 'Evening report is due today by 6:00 PM.' });
            }

            // Weekly Truck Maintenance (e.g., Every Friday = 5)
            if (dayOfWeek === 4) {
              reminders.push({ id: 2, color: 'amber', title: 'Truck Maintenance', text: 'Weekly truck maintenance is due tomorrow.' });
            } else if (dayOfWeek === 5) {
              reminders.push({ id: 2, color: 'red', title: 'Truck Maintenance', text: 'Weekly truck maintenance is due TODAY.' });
            }

            // Fortnightly Pest Control (e.g., 1st and 15th of the month)
            if (dayOfMonth === 14 || dayOfMonth === 15) {
              reminders.push({ id: 3, color: dayOfMonth === 15 ? 'red' : 'amber', title: 'Pest Control', text: `Fortnightly pest control is due on the 15th${dayOfMonth === 15 ? ' (TODAY)' : ''}.` });
            } else if (dayOfMonth === 30 || dayOfMonth === 31 || dayOfMonth === 1) {
              reminders.push({ id: 3, color: dayOfMonth === 1 ? 'red' : 'amber', title: 'Pest Control', text: `Fortnightly pest control is due on the 1st${dayOfMonth === 1 ? ' (TODAY)' : ''}.` });
            }

            // Monthly Fumigation (e.g., 5th of every month)
            if (dayOfMonth >= 1 && dayOfMonth <= 5) {
              reminders.push({ id: 4, color: dayOfMonth === 5 ? 'red' : 'blue', title: 'Fumigation Cycle', text: `Monthly scheduled fumigation is due on the 5th${dayOfMonth === 5 ? ' (TODAY)' : ` (in ${5 - dayOfMonth} days)`}.` });
            }

            if (reminders.length === 0) {
              return <li className="text-[var(--text-muted-alt)] italic">No urgent reminders right now.</li>;
            }

            return reminders.map(r => (
              <li key={r.id} className={`flex gap-2 items-start bg-${r.color}-500/5 p-3 rounded border border-${r.color}-500/10`}>
                <CheckCircle2 size={16} className={`text-${r.color}-500 shrink-0 mt-0.5`} />
                <div>
                  <span className={`font-semibold text-${r.color}-500 block`}>{r.title}</span>
                  {r.text}
                </div>
              </li>
            ));
          })()}
        </ul>
      </div>
    </div>
  );
};

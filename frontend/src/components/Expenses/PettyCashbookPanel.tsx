import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { expensesApi } from '../../api/expenses';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { hasModulePermission } from '../../utils/modulePermissions';

const todayStr = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const fmtMoney = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtDash = (n: number | null | undefined) =>
  n == null || n === 0 ? '—' : fmtMoney(n);

type View = 'day' | 'range' | 'compact' | 'tickets' | 'chart';

export const PettyCashbookPanel: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const addToast = useUiStore((s) => s.addToast);
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const canAddTicket = isAdmin && hasModulePermission('Expenses', 'canAdd', 'Petty Cashbook');
  const canEditTicket = isAdmin && hasModulePermission('Expenses', 'canEdit', 'Petty Cashbook');

  const [plants, setPlants] = useState<any[]>([]);
  const [plantId, setPlantId] = useState('');
  const [view, setView] = useState<View>('day');
  const [date, setDate] = useState(todayStr());
  const [from, setFrom] = useState(daysAgo(9));
  const [to, setTo] = useState(todayStr());
  const [dayData, setDayData] = useState<any>(null);
  const [rangePages, setRangePages] = useState<any[]>([]);
  const [compact, setCompact] = useState<any>(null);
  const [chart, setChart] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Ticket raise form
  const [ticketEntryId, setTicketEntryId] = useState('');
  const [ticketSupervisor, setTicketSupervisor] = useState('');
  const [ticketNote, setTicketNote] = useState('');
  const [ticketOpen, setTicketOpen] = useState(false);

  useEffect(() => {
    api
      .get('/plants')
      .then((res) => setPlants(Array.isArray(res.data) ? res.data : res.data?.data || []))
      .catch(() => setPlants([]));
  }, []);

  const selectedMill = plants.find((p) => p.id === plantId);

  const load = useCallback(async () => {
    if (!plantId && view !== 'chart' && view !== 'tickets') {
      setDayData(null);
      setRangePages([]);
      setCompact(null);
      return;
    }
    setLoading(true);
    try {
      if (view === 'day' && plantId) {
        const res = await expensesApi.dayBook(plantId, date);
        setDayData(res.data);
      } else if (view === 'range' && plantId) {
        const res = await expensesApi.dayBooks(plantId, from, to);
        setRangePages(res.data?.pages || []);
      } else if (view === 'compact' && plantId) {
        const res = await expensesApi.compactSummary(plantId, from, to);
        setCompact(res.data);
      } else if (view === 'chart') {
        const res = await expensesApi.millWiseChart(from, to);
        setChart(res.data);
      } else if (view === 'tickets') {
        const [t, s] = await Promise.all([
          expensesApi.listTickets(plantId || undefined),
          isAdmin ? expensesApi.listSupervisors() : Promise.resolve({ data: [] }),
        ]);
        setTickets(Array.isArray(t.data) ? t.data : []);
        setSupervisors(Array.isArray(s.data) ? s.data : []);
      }
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [plantId, view, date, from, to, addToast, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const maxChart = useMemo(() => {
    const vals = (chart?.series || []).map((s: any) => s.totalExpenses || 0);
    return Math.max(1, ...vals);
  }, [chart]);

  const printRange = () => window.print();

  const raiseTicket = async () => {
    if (!canAddTicket) {
      addToast('Not allowed. Turn on Add for Expenses → Petty Cashbook, then log in again.', 'error');
      return;
    }
    if (!plantId || !ticketSupervisor) {
      addToast('Select mill and supervisor', 'error');
      return;
    }
    try {
      await expensesApi.createTicket({
        plantId,
        date,
        expenseEntryId: ticketEntryId || undefined,
        section: 'Expense',
        raisedToUserId: ticketSupervisor,
        note: ticketNote || undefined,
      });
      addToast('Ticket raised — supervisor notified', 'success');
      setTicketOpen(false);
      setTicketEntryId('');
      setTicketNote('');
      setView('tickets');
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to raise ticket', 'error');
    }
  };

  const setTicketStatus = async (id: string, status: string) => {
    if (!canEditTicket) {
      addToast('Not allowed. Turn on Edit for Expenses → Petty Cashbook, then log in again.', 'error');
      return;
    }
    try {
      await expensesApi.updateTicket(id, status);
      addToast(`Ticket marked ${status}`, 'success');
      await load();
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Update failed', 'error');
    }
  };

  const DayBookTable = ({ book }: { book: any }) => {
    if (!book) return null;
    const dr = book.drSide || [];
    const cr = book.crSide || [];
    const rows = Math.max(dr.length, cr.length + 1);
    return (
      <div className="print-page mb-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden break-after-page">
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex flex-wrap justify-between gap-2 text-sm">
          <span className="font-semibold text-[var(--text-main)]">
            Mill Name: {book.plant?.name}
          </span>
          <span className="font-bold text-amber-400">Petty Cash Book</span>
          <span className="text-[var(--text-muted)]">Date: {book.date}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-xs">
            <thead>
              <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                <th colSpan={2} className="px-3 py-2 text-center border-r border-[var(--border-subtle)]">
                  Dr. side
                </th>
                <th colSpan={5} className="px-3 py-2 text-center">
                  Cr. side
                </th>
              </tr>
              <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                <th className="px-3 py-1.5">Party Name</th>
                <th className="px-3 py-1.5 text-right border-r border-[var(--border-subtle)]">
                  Amount
                </th>
                <th className="px-3 py-1.5">G.P. / W.O. No.</th>
                <th className="px-3 py-1.5">Party Name</th>
                <th className="px-3 py-1.5">Item</th>
                <th className="px-3 py-1.5 text-right">Amount</th>
                <th className="px-3 py-1.5">By</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, i) => {
                const d = dr[i];
                const c = cr[i];
                return (
                  <tr
                    key={i}
                    className="border-b border-[var(--border-subtle-alt)] text-[var(--text-main)]"
                  >
                    <td className="px-3 py-1.5 font-medium">
                      {d?.label || ''}
                      {d?.kind === 'FUND' && canAddTicket && (
                        <button
                          type="button"
                          className="ml-2 text-[10px] text-amber-400 hover:underline print:hidden"
                          onClick={async () => {
                            setTicketEntryId('');
                            if (!supervisors.length) {
                              try {
                                const s = await expensesApi.listSupervisors();
                                setSupervisors(Array.isArray(s.data) ? s.data : []);
                              } catch {
                                /* ignore */
                              }
                            }
                            setTicketOpen(true);
                          }}
                        >
                          Ticket
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right border-r border-[var(--border-subtle)]">
                      {d ? fmtMoney(d.amount) : ''}
                    </td>
                    <td className="px-3 py-1.5">{c?.gpWo || ''}</td>
                    <td className="px-3 py-1.5">
                      {c?.partyName || ''}
                      {c?.id && canAddTicket && (
                        <button
                          type="button"
                          className="ml-2 text-[10px] text-amber-400 hover:underline print:hidden"
                          onClick={async () => {
                            setTicketEntryId(c.id);
                            if (!supervisors.length) {
                              try {
                                const s = await expensesApi.listSupervisors();
                                setSupervisors(Array.isArray(s.data) ? s.data : []);
                              } catch {
                                /* ignore */
                              }
                            }
                            setTicketOpen(true);
                          }}
                        >
                          Ticket
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-1.5">{c?.item || ''}</td>
                    <td className="px-3 py-1.5 text-right">{c ? fmtMoney(c.amount) : ''}</td>
                    <td className="px-3 py-1.5">{c?.by || ''}</td>
                  </tr>
                );
              })}
              <tr className="font-semibold text-[var(--text-main)] bg-[var(--bg-base)]">
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right border-r border-[var(--border-subtle)] text-amber-400">
                  {fmtMoney(book.drTotal)}
                </td>
                <td colSpan={3} className="px-3 py-2" />
                <td className="px-3 py-2 text-right text-amber-400">{fmtMoney(book.crTotal)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-[10px] text-[var(--text-muted)] flex flex-wrap gap-4">
          <span>Total Funds Added: {fmtMoney(book.totalFunds)}</span>
          <span>Total Expenses: {fmtMoney(book.totalExpenses)}</span>
          <span>
            Add Funds today: {book.hasAddFunds ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <h2 className="text-xl font-bold text-[var(--text-main)]">Petty Cashbook</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Daily Dr/Cr book — closing balance carries to next day’s opening.
        </p>
      </div>

      <div className="print:hidden flex flex-wrap gap-2 items-end">
        <label className="text-xs text-[var(--text-muted)]">
          Select Mill
          <select
            value={plantId}
            onChange={(e) => setPlantId(e.target.value)}
            className="mt-1 block min-w-[200px] bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
          >
            <option value="">Select mill…</option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-1">
          {(
            [
              ['day', 'Day Book'],
              ['range', 'Date-wise'],
              ['compact', 'Compact'],
              ['tickets', 'Tickets'],
              ['chart', 'Mill Chart'],
            ] as [View, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setView(k)}
              className={`px-3 py-2 rounded text-xs font-semibold ${
                view === k
                  ? 'bg-amber-500 text-black'
                  : 'border border-[var(--border-subtle)] text-[var(--text-muted)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {view === 'day' && (
          <label className="text-xs text-[var(--text-muted)]">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-2 text-sm text-[var(--text-main)]"
            />
          </label>
        )}
        {(view === 'range' || view === 'compact' || view === 'chart') && (
          <>
            <label className="text-xs text-[var(--text-muted)]">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-2 text-sm text-[var(--text-main)]"
              />
            </label>
            <label className="text-xs text-[var(--text-muted)]">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-2 text-sm text-[var(--text-main)]"
              />
            </label>
            {view === 'compact' && (
              <button
                type="button"
                className="px-3 py-2 text-xs border border-[var(--border-subtle)] rounded text-[var(--text-muted)]"
                onClick={() => {
                  setFrom(daysAgo(9));
                  setTo(todayStr());
                }}
              >
                Last 10 days
              </button>
            )}
          </>
        )}
        {view === 'range' && (
          <button
            type="button"
            onClick={printRange}
            className="px-3 py-2 rounded bg-amber-500 text-black text-xs font-semibold"
          >
            Print all pages
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : view === 'day' ? (
        !plantId ? (
          <p className="text-sm text-[var(--text-muted)]">Select a mill.</p>
        ) : (
          <DayBookTable book={dayData} />
        )
      ) : view === 'range' ? (
        !plantId ? (
          <p className="text-sm text-[var(--text-muted)]">Select a mill.</p>
        ) : rangePages.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No pages in range.</p>
        ) : (
          <div className="space-y-4">
            {rangePages.map((p) => (
              <DayBookTable key={p.date} book={p} />
            ))}
          </div>
        )
      ) : view === 'compact' ? (
        !plantId ? (
          <p className="text-sm text-[var(--text-muted)]">Select a mill.</p>
        ) : (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex flex-wrap justify-between text-sm">
              <span className="font-semibold text-[var(--text-main)]">
                Mill Name: {compact?.plant?.name || selectedMill?.name}
              </span>
              <span className="font-bold text-amber-400">Compact Expense summary</span>
              <span className="text-[var(--text-muted)]">
                From: {compact?.from} · To: {compact?.to}
              </span>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 p-4">
              <div className="text-xs text-[var(--text-muted)]">
                Total Funds Added
                <p className="text-lg font-bold text-[var(--text-main)]">
                  {fmtMoney(compact?.totals?.totalFunds)}
                </p>
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                Total Expenses Made
                <p className="text-lg font-bold text-[var(--text-main)]">
                  {fmtMoney(compact?.totals?.totalExpenses)}
                </p>
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                Closing Balance
                <p className="text-lg font-bold text-amber-400">
                  {fmtMoney(compact?.totals?.closingBalance)}
                </p>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  <th className="px-4 py-2">A Date</th>
                  <th className="px-4 py-2 text-right">B Opening</th>
                  <th className="px-4 py-2 text-right">C Add Funds</th>
                  <th className="px-4 py-2 text-right">D Expenses</th>
                  <th className="px-4 py-2 text-right">E Balance (B+C−D)</th>
                </tr>
              </thead>
              <tbody>
                {(compact?.rows || []).map((r: any) => (
                  <tr
                    key={r.date}
                    className="border-b border-[var(--border-subtle-alt)] text-[var(--text-main)]"
                  >
                    <td className="px-4 py-2">
                      {r.date}
                      {r.hadAddFunds && (
                        <span className="ml-2 text-[10px] text-emerald-400">+Funds</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">{fmtMoney(r.openingBalance)}</td>
                    <td className="px-4 py-2 text-right">{fmtDash(r.addFundsDisplay)}</td>
                    <td className="px-4 py-2 text-right">{fmtMoney(r.expenses)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-amber-400">
                      {fmtMoney(r.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : view === 'chart' ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 space-y-3">
          <p className="text-sm font-semibold text-[var(--text-main)]">
            Mill-wise Expenses ({from} → {to})
          </p>
          {(chart?.series || []).map((s: any) => (
            <div key={s.plantId} className="space-y-1">
              <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>{s.plantName}</span>
                <span className="text-[var(--text-main)] font-semibold">
                  {fmtMoney(s.totalExpenses)}
                </span>
              </div>
              <div className="h-3 rounded bg-[var(--bg-base)] overflow-hidden">
                <div
                  className="h-full bg-amber-500/80"
                  style={{ width: `${(s.totalExpenses / maxChart) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] font-semibold text-[var(--text-main)]">
              Ticket Raise — updates
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Ticket No.</th>
                  <th className="px-3 py-2">Mill</th>
                  <th className="px-3 py-2">Raised to</th>
                  <th className="px-3 py-2">Raised For</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-[var(--text-muted)]">
                      No tickets yet.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-[var(--border-subtle-alt)] text-[var(--text-main)]"
                    >
                      <td className="px-3 py-2">
                        {t.date ? new Date(t.date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2">{t.ticketNo}</td>
                      <td className="px-3 py-2">{t.plant?.name || '—'}</td>
                      <td className="px-3 py-2">{t.raisedToName || '—'}</td>
                      <td className="px-3 py-2">{t.section}</td>
                      <td className="px-3 py-2">
                        {t.status === 'OK' || t.status === 'CLOSED' ? t.status : '—'}
                      </td>
                      <td className="px-3 py-2 text-right space-x-2">
                        {canEditTicket && t.status !== 'OK' && (
                          <button
                            type="button"
                            className="text-xs text-emerald-400 hover:underline"
                            onClick={() => setTicketStatus(t.id, 'OK')}
                          >
                            Mark OK
                          </button>
                        )}
                        {canEditTicket && t.status !== 'CLOSED' && (
                          <button
                            type="button"
                            className="text-xs text-amber-400 hover:underline"
                            onClick={() => setTicketStatus(t.id, 'CLOSED')}
                          >
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ticketOpen && canAddTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:hidden">
          <div className="w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5 space-y-3">
            <h3 className="font-bold text-[var(--text-main)]">Raise Ticket</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Mill: {selectedMill?.name} · Date: {date}
              {ticketEntryId ? ` · Entry ${ticketEntryId.slice(0, 8)}…` : ''}
            </p>
            <label className="text-xs text-[var(--text-muted)] block">
              Raised to (Supervisor)
              <select
                value={ticketSupervisor}
                onChange={(e) => setTicketSupervisor(e.target.value)}
                className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
              >
                <option value="">Select supervisor…</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.username}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[var(--text-muted)] block">
              Note
              <textarea
                value={ticketNote}
                onChange={(e) => setTicketNote(e.target.value)}
                rows={3}
                className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTicketOpen(false)}
                className="px-3 py-2 text-sm border border-[var(--border-subtle)] rounded text-[var(--text-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={raiseTicket}
                className="px-3 py-2 text-sm rounded bg-amber-500 text-black font-semibold"
              >
                Raise Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { Fingerprint, Plus, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import { expensesApi } from '../../api/expenses';
import { biometricService } from '../../services/biometricService';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { useSubmitLock } from '../../hooks/useSubmitLock';
import { hasModulePermission } from '../../utils/modulePermissions';

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtMoney = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

type ExpenseLine = {
  key: string;
  partyId: string;
  partyNotApplicable: boolean;
  itemsBought: string;
  itemsNotApplicable: boolean;
  amount: string;
  gpNo: string;
  gpNotApplicable: boolean;
  workOrderNo: string;
  workOrderNotApplicable: boolean;
};

const newLine = (): ExpenseLine => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  partyId: '',
  partyNotApplicable: false,
  itemsBought: '',
  itemsNotApplicable: false,
  amount: '',
  gpNo: '',
  gpNotApplicable: false,
  workOrderNo: '',
  workOrderNotApplicable: false,
});

/** Mill-wise Expense Details — form appears after mill is selected. */
export const ExpenseEntryPanel: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const addToast = useUiStore((s) => s.addToast);
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const canAddExpense = hasModulePermission('Expenses', 'canAdd', 'Expenses');
  const submitLock = useSubmitLock();

  const [plants, setPlants] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [plantId, setPlantId] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [date, setDate] = useState(todayStr());
  const [lines, setLines] = useState<ExpenseLine[]>([newLine()]);
  const [biometricData, setBiometricData] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (isAdmin) return;
    setDate(todayStr());
    const t = setInterval(() => setDate(todayStr()), 60_000);
    return () => clearInterval(t);
  }, [isAdmin, plantId]);

  const loadPlants = useCallback(async () => {
    try {
      const res = await api.get('/plants');
      setPlants(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setPlants([]);
    }
  }, []);

  const loadParties = useCallback(async () => {
    try {
      const res = await expensesApi.partyOptions();
      setParties(Array.isArray(res.data) ? res.data : []);
    } catch {
      setParties([]);
    }
  }, []);

  const loadRows = useCallback(async () => {
    if (!plantId) {
      setRows([]);
      return;
    }
    try {
      const res = await expensesApi.listExpenses(plantId);
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to load expenses', 'error');
    }
  }, [plantId, addToast]);

  useEffect(() => {
    loadPlants();
    loadParties();
  }, [loadPlants, loadParties]);

  useEffect(() => {
    loadRows();
    setLines([newLine()]);
    setBiometricData('');
    if (!isAdmin) setDate(todayStr());
  }, [loadRows, isAdmin]);

  const selectedMill = plants.find((p) => p.id === plantId);

  const updateLine = (key: string, patch: Partial<ExpenseLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const addMore = () => setLines((prev) => [...prev, newLine()]);

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  };

  const scanFingerprint = async () => {
    setScanning(true);
    try {
      const xml = await biometricService.captureAndVerifyLoggedInUser();
      setBiometricData(xml);
      addToast('Fingerprint captured', 'success');
    } catch (err: any) {
      setBiometricData('');
      addToast(err?.message || 'Fingerprint scan failed', 'error');
    } finally {
      setScanning(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddExpense) {
      addToast('Not allowed. Turn on Add for Expenses → Expenses, then log in again.', 'error');
      return;
    }
    if (!plantId) {
      addToast('Select a mill', 'error');
      return;
    }
    if (!biometricData) {
      addToast('Scan fingerprint before submit', 'error');
      return;
    }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const amt = parseFloat(l.amount);
      if (!(amt > 0)) {
        addToast(`Line ${i + 1}: enter a valid amount`, 'error');
        return;
      }
      if (l.partyNotApplicable && l.itemsNotApplicable) {
        addToast(
          `Line ${i + 1}: Party Name and/or Items required — both cannot be N/A`,
          'error',
        );
        return;
      }
      if (l.gpNotApplicable && l.workOrderNotApplicable) {
        addToast(
          `Line ${i + 1}: GP No. and/or Work Order required — both cannot be N/A`,
          'error',
        );
        return;
      }
      if (!l.partyNotApplicable && !l.partyId) {
        addToast(`Line ${i + 1}: select Party from Master or Not Applicable`, 'error');
        return;
      }
      if (!l.itemsNotApplicable && !l.itemsBought.trim()) {
        addToast(`Line ${i + 1}: Items / Service or Not Applicable`, 'error');
        return;
      }
      if (!l.gpNotApplicable && !l.gpNo.trim()) {
        addToast(`Line ${i + 1}: GP No. or Not Applicable`, 'error');
        return;
      }
      if (!l.workOrderNotApplicable && !l.workOrderNo.trim()) {
        addToast(`Line ${i + 1}: Work order No. or Not Applicable`, 'error');
        return;
      }
    }
    if (submitLock.pending) return;
    await submitLock.wrapSubmit(async () => {
      try {
        const res = await expensesApi.createExpenses({
          plantId,
          date: isAdmin ? date : undefined,
          biometricData,
          lines: lines.map((l) => ({
            partyId: l.partyNotApplicable ? undefined : l.partyId,
            partyNotApplicable: l.partyNotApplicable,
            itemsBought: l.itemsBought.trim() || undefined,
            itemsNotApplicable: l.itemsNotApplicable,
            amount: parseFloat(l.amount),
            gpNo: l.gpNo.trim() || undefined,
            gpNotApplicable: l.gpNotApplicable,
            workOrderNo: l.workOrderNo.trim() || undefined,
            workOrderNotApplicable: l.workOrderNotApplicable,
          })),
        });
        addToast(
          `Expense submitted (${res.data?.count || lines.length} line(s))`,
          'success',
        );
        setLines([newLine()]);
        setBiometricData('');
        if (!isAdmin) setDate(todayStr());
        await loadRows();
      } catch (err: any) {
        addToast(err?.response?.data?.message || 'Submit failed', 'error');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">Expenses</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Select a mill to open the Expense Details Form. Multiple submissions per day are
          allowed. Party from Master posts to that party’s ledger.
        </p>
      </div>

      <label className="text-xs text-[var(--text-muted)] inline-block">
        Select Mill
        <select
          value={plantId}
          onChange={(e) => setPlantId(e.target.value)}
          className="mt-1 block min-w-[220px] bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
        >
          <option value="">Select mill…</option>
          {plants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {!plantId ? (
        <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-panel)] p-8 text-center text-sm text-[var(--text-muted)]">
          Select a mill to display the Expense Details Form.
        </div>
      ) : (
        <>
          {canAddExpense && (
          <form
            onSubmit={submit}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 space-y-4"
          >
            <p className="text-sm font-semibold text-[var(--text-main)]">
              Expense Details — {selectedMill?.name}
            </p>

            <label className="text-xs text-[var(--text-muted)] block max-w-xs">
              Date
              <input
                type="date"
                required
                value={date}
                max={todayStr()}
                readOnly={!isAdmin}
                onChange={(e) => isAdmin && setDate(e.target.value)}
                className={`mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)] ${
                  !isAdmin ? 'opacity-80 cursor-not-allowed' : ''
                }`}
              />
              <span className="text-[10px] text-[var(--text-muted-alt)]">
                {isAdmin ? 'Admin may backdate' : 'Auto date (today)'}
              </span>
            </label>

            {lines.map((line, idx) => (
              <div
                key={line.key}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400">
                    Entry {idx + 1}
                  </span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-red-400"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="text-xs text-[var(--text-muted)] sm:col-span-2">
                    Party Name (Master)
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <select
                        value={line.partyId}
                        disabled={line.partyNotApplicable}
                        onChange={(e) => updateLine(line.key, { partyId: e.target.value })}
                        className="flex-1 min-w-[180px] bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)] disabled:opacity-50"
                      >
                        <option value="">Select party…</option>
                        {parties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {p.type ? ` (${p.type})` : ''}
                          </option>
                        ))}
                      </select>
                      <label className="inline-flex items-center gap-2 cursor-pointer text-[var(--text-main)] whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={line.partyNotApplicable}
                          disabled={line.itemsNotApplicable}
                          onChange={(e) =>
                            updateLine(line.key, {
                              partyNotApplicable: e.target.checked,
                              partyId: e.target.checked ? '' : line.partyId,
                            })
                          }
                          className="accent-amber-500"
                        />
                        Not Applicable
                      </label>
                    </div>
                  </div>

                  <div className="text-xs text-[var(--text-muted)] sm:col-span-2">
                    Items Bought / Service Availed
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <input
                        value={line.itemsBought}
                        disabled={line.itemsNotApplicable}
                        onChange={(e) =>
                          updateLine(line.key, { itemsBought: e.target.value })
                        }
                        placeholder="Manual entry"
                        className="flex-1 min-w-[160px] bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)] disabled:opacity-50"
                      />
                      <label className="inline-flex items-center gap-2 cursor-pointer text-[var(--text-main)] whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={line.itemsNotApplicable}
                          disabled={line.partyNotApplicable}
                          onChange={(e) =>
                            updateLine(line.key, {
                              itemsNotApplicable: e.target.checked,
                              itemsBought: e.target.checked ? '' : line.itemsBought,
                            })
                          }
                          className="accent-amber-500"
                        />
                        Not Applicable
                      </label>
                    </div>
                  </div>

                  <label className="text-xs text-[var(--text-muted)]">
                    Amount
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={line.amount}
                      onChange={(e) => updateLine(line.key, { amount: e.target.value })}
                      className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
                    />
                  </label>

                  <div className="text-xs text-[var(--text-muted)]">
                    GP No.
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <input
                        value={line.gpNo}
                        disabled={line.gpNotApplicable}
                        onChange={(e) => updateLine(line.key, { gpNo: e.target.value })}
                        placeholder="Manual"
                        className="flex-1 min-w-[100px] bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)] disabled:opacity-50"
                      />
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--text-main)] whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={line.gpNotApplicable}
                          disabled={line.workOrderNotApplicable}
                          onChange={(e) =>
                            updateLine(line.key, {
                              gpNotApplicable: e.target.checked,
                              gpNo: e.target.checked ? '' : line.gpNo,
                            })
                          }
                          className="accent-amber-500"
                        />
                        N/A
                      </label>
                    </div>
                  </div>

                  <div className="text-xs text-[var(--text-muted)] sm:col-span-2">
                    Work order No.
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <input
                        value={line.workOrderNo}
                        disabled={line.workOrderNotApplicable}
                        onChange={(e) =>
                          updateLine(line.key, { workOrderNo: e.target.value })
                        }
                        placeholder="Manual"
                        className="flex-1 min-w-[140px] bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)] disabled:opacity-50"
                      />
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--text-main)] whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={line.workOrderNotApplicable}
                          disabled={line.gpNotApplicable}
                          onChange={(e) =>
                            updateLine(line.key, {
                              workOrderNotApplicable: e.target.checked,
                              workOrderNo: e.target.checked ? '' : line.workOrderNo,
                            })
                          }
                          className="accent-amber-500"
                        />
                        N/A
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addMore}
              className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:underline"
            >
              <Plus size={14} /> Add More
            </button>

            <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <label className="text-xs text-[var(--text-muted)] flex-1 min-w-[200px]">
                Fingerprint
                <div className="mt-1 flex gap-2">
                  <input
                    type="password"
                    readOnly
                    value={biometricData ? 'Captured ✓' : ''}
                    placeholder="Scan fingerprint…"
                    className="flex-1 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
                  />
                  <button
                    type="button"
                    onClick={scanFingerprint}
                    disabled={scanning}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-500 text-black text-xs font-bold disabled:opacity-60"
                  >
                    <Fingerprint size={14} />
                    {scanning ? 'Scanning…' : 'Scan'}
                  </button>
                </div>
              </label>
              <button
                type="submit"
                disabled={submitLock.pending || !biometricData}
                className="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                <Fingerprint size={14} />
                {submitLock.pending ? 'Submitting…' : 'Submit with Fingerprint'}
              </button>
            </div>
          </form>
          )}
          {!canAddExpense && (
            <p className="text-sm text-[var(--text-muted)]">
              This role can view Expenses. Add is required to submit an expense.
            </p>
          )}

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] font-semibold text-[var(--text-main)]">
              Recent expenses — {selectedMill?.name}
            </div>
            {rows.length === 0 ? (
              <p className="p-6 text-sm text-[var(--text-muted)]">No expenses yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Party</th>
                      <th className="px-3 py-2">Items / Service</th>
                      <th className="px-3 py-2">GP No.</th>
                      <th className="px-3 py-2">Work Order</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-[var(--border-subtle-alt)] text-[var(--text-main)]"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.date ? new Date(r.date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {r.partyNotApplicable ? 'N/A' : r.partyName || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {r.itemsNotApplicable ? 'N/A' : r.itemsBought || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {r.gpNotApplicable ? 'N/A' : r.gpNo || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {r.workOrderNotApplicable ? 'N/A' : r.workOrderNo || '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-amber-400">
                          {fmtMoney(r.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

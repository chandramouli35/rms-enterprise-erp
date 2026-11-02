import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { expensesApi } from '../../api/expenses';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { hasModulePermission } from '../../utils/modulePermissions';

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtMoney = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const AddFundsPanel: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const addToast = useUiStore((s) => s.addToast);
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const canAddFunds = isAdmin && hasModulePermission('Expenses', 'canAdd', 'Add Funds');

  const [plants, setPlants] = useState<any[]>([]);
  const [plantId, setPlantId] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [amount, setAmount] = useState('');
  const [toName, setToName] = useState('');

  const loadPlants = useCallback(async () => {
    try {
      const res = await api.get('/plants');
      setPlants(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setPlants([]);
    }
  }, []);

  const loadRows = useCallback(async () => {
    if (!plantId) {
      setRows([]);
      return;
    }
    try {
      const res = await expensesApi.listFunds(plantId);
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to load funds', 'error');
    }
  }, [plantId, addToast]);

  useEffect(() => {
    loadPlants();
  }, [loadPlants]);

  useEffect(() => {
    loadRows();
    setFormOpen(false);
  }, [loadRows]);

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-8 text-center text-sm text-[var(--text-muted)]">
        Supervisor cannot add funds. Only Admin can use Add Funds.
      </div>
    );
  }

  const selectedMill = plants.find((p) => p.id === plantId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddFunds) {
      addToast('Not allowed. Turn on Add for Expenses → Add Funds, then log in again.', 'error');
      return;
    }
    if (!plantId) {
      addToast('Select a mill', 'error');
      return;
    }
    const amt = parseFloat(amount);
    if (!(amt > 0)) {
      addToast('Enter a valid amount', 'error');
      return;
    }
    if (!toName.trim()) {
      addToast('"To" is required', 'error');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      await expensesApi.createFund({
        plantId,
        date,
        amount: amt,
        toName: toName.trim(),
      });
      addToast('Funds added successfully', 'success');
      setAmount('');
      setToName('');
      setDate(todayStr());
      setFormOpen(false);
      await loadRows();
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Submit failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">Add Funds</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Admin only — multiple entries per day and backdates allowed.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-[var(--text-muted)]">
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
        {canAddFunds && plantId && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400"
          >
            Add Funds
          </button>
        )}
      </div>

      {canAddFunds && formOpen && plantId && (
        <form
          onSubmit={submit}
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 grid sm:grid-cols-2 gap-3"
        >
          <p className="sm:col-span-2 text-sm font-semibold text-[var(--text-main)]">
            Add Fund — {selectedMill?.name}
          </p>
          <label className="text-xs text-[var(--text-muted)]">
            Date
            <input
              type="date"
              required
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
            />
            <span className="text-[10px] text-[var(--text-muted-alt)]">
              Backdate available to Admin only
            </span>
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Amount
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
            />
          </label>
          <label className="text-xs text-[var(--text-muted)] sm:col-span-2">
            To
            <input
              required
              value={toName}
              onChange={(e) => setToName(e.target.value)}
              placeholder="Recipient / account"
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
            />
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Submitting…' : 'Submit'}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-sm text-[var(--text-muted)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {plantId && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] font-semibold text-[var(--text-main)]">
            Fund entries — {selectedMill?.name}
          </div>
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-[var(--text-muted)]">No fund entries yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">To</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--border-subtle-alt)] text-[var(--text-main)]"
                  >
                    <td className="px-4 py-2">
                      {r.date ? new Date(r.date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2">{r.toName}</td>
                    <td className="px-4 py-2 text-right font-semibold text-amber-400">
                      {fmtMoney(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

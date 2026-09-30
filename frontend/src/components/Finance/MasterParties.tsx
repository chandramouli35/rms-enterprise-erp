import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Search } from 'lucide-react';
import { financeMasterApi } from '../../api/financeMaster';
import { useUiStore } from '../../store/uiStore';
import { hasFinancePermission } from '../../utils/financePermissions';

type MasterRow = {
  id: string;
  name: string;
  isCustomer: boolean;
  isSupplier: boolean;
  isActive: boolean;
  type: string;
};

const emptyForm = () => ({
  name: '',
  isCustomer: false,
  isSupplier: false,
});

export const MasterParties: React.FC = () => {
  const addToast = useUiStore((s) => s.addToast);
  const canAdd = hasFinancePermission('Master', 'canAdd');
  const canEdit = hasFinancePermission('Master', 'canEdit');

  const [rows, setRows] = useState<MasterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [q, setQ] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeMasterApi.list({
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        q: q.trim() || undefined,
      });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to load masters', 'error');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, q, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const typeLabel = () => {
    if (form.isCustomer && form.isSupplier) return 'Both';
    if (form.isCustomer) return 'Customer';
    if (form.isSupplier) return 'Supplier';
    return '—';
  };

  const startEdit = (r: MasterRow) => {
    setEditId(r.id);
    setForm({
      name: r.name,
      isCustomer: r.isCustomer,
      isSupplier: r.isSupplier,
    });
  };

  const resetForm = () => {
    setEditId(null);
    setForm(emptyForm());
  };

  const requestSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      addToast('Party Name is required', 'error');
      return;
    }
    if (!form.isCustomer && !form.isSupplier) {
      addToast('Mark as Customer, Supplier, or Both', 'error');
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        isCustomer: form.isCustomer,
        isSupplier: form.isSupplier,
      };
      if (editId) {
        await financeMasterApi.update(editId, payload);
        addToast(`Master updated: ${payload.name} (${typeLabel()})`, 'success');
      } else {
        await financeMasterApi.create(payload);
        addToast(`Master created: ${payload.name} (${typeLabel()})`, 'success');
      }
      setConfirmOpen(false);
      resetForm();
      await load();
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r: MasterRow) => {
    if (!canEdit) return;
    try {
      await financeMasterApi.update(r.id, { isActive: !r.isActive });
      addToast(
        `${r.name} marked ${r.isActive ? 'Inactive' : 'Active'}`,
        'success',
      );
      await load();
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Status update failed', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">Master</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Register parties globally for all mills — Customer, Supplier, or Both. Admin only.
        </p>
      </div>

      {(canAdd || (canEdit && editId)) && (
        <form
          onSubmit={requestSave}
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 space-y-3"
        >
          <p className="text-sm font-semibold text-[var(--text-main)]">
            {editId ? 'Edit Master' : 'Create Master'}
          </p>
          <label className="block text-xs text-[var(--text-muted)]">
            Party Name <span className="text-amber-400">*</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Enter party name"
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
            />
          </label>
          <div className="text-xs text-[var(--text-muted)]">
            Party Type <span className="text-amber-400">*</span>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer text-[var(--text-main)]">
                <input
                  type="checkbox"
                  checked={form.isCustomer}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isCustomer: e.target.checked }))
                  }
                  className="accent-amber-500"
                />
                Customer
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer text-[var(--text-main)]">
                <input
                  type="checkbox"
                  checked={form.isSupplier}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isSupplier: e.target.checked }))
                  }
                  className="accent-amber-500"
                />
                Supplier
              </label>
            </div>
            <p className="mt-1 text-[10px] text-[var(--text-muted-alt)]">
              Select one or both. Both appears in Sales and Purchase dropdowns.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400"
            >
              {editId ? 'Update' : 'Save'}
            </button>
            {editId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-sm text-[var(--text-muted)]"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex flex-wrap gap-2 items-end">
          <label className="text-[10px] text-[var(--text-muted)]">
            Filter by Type
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mt-0.5 block bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)]"
            >
              <option value="ALL">All</option>
              <option value="CUSTOMER">Customers Only</option>
              <option value="SUPPLIER">Suppliers Only</option>
            </select>
          </label>
          <label className="text-[10px] text-[var(--text-muted)] flex-1 min-w-[180px]">
            Search Party Name
            <div className="mt-0.5 flex items-center gap-2 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1.5">
              <Search size={12} className="text-[var(--text-muted-alt)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Party name…"
                className="w-full bg-transparent outline-none text-xs text-[var(--text-main)]"
              />
            </div>
          </label>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">No masters found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-xs">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--border-subtle-alt)] text-[var(--text-main)]"
                >
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2">{r.type}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs font-semibold ${
                        r.isActive ? 'text-emerald-400' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(r)}
                          className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(r)}
                          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:underline"
                        >
                          {r.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5 shadow-xl">
            <h3 className="text-lg font-bold text-[var(--text-main)]">Confirm Master</h3>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Please confirm the following party details:
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-muted)]">Party Name</dt>
                <dd className="font-semibold text-[var(--text-main)]">{form.name.trim()}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-muted)]">Party Type</dt>
                <dd className="font-semibold text-amber-400">{typeLabel()}</dd>
              </div>
            </dl>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-sm text-[var(--text-muted)]"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

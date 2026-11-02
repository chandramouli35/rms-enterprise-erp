import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { usePlantStore } from '../store/plantStore';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { biometricService } from '../services/biometricService';
import { hasModulePermission } from '../utils/modulePermissions';

const isAdminRole = (role?: string) => role === 'SUPER_ADMIN' || role === 'ADMIN';

export const LabourWorkOrder: React.FC = () => {
  const activePlant = usePlantStore((s) => s.activePlant);
  const user = useAuthStore((s) => s.user);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'entry';
  const plantId = activePlant?.id || '';
  const admin = isAdminRole(user?.role);
  const canAdd = hasModulePermission('Labour Work Order', 'canAdd');
  const canEdit = hasModulePermission('Labour Work Order', 'canEdit');

  return (
    <div className="p-4 md:p-6 text-[var(--text-main)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold">Labour Work Order</h1>
          <p className="text-xs text-[var(--text-muted-alt)]">
            {activePlant?.name || 'Select a mill'} · mill-wise work done, rates, and party bill
          </p>
        </div>
        <div className="flex gap-2">
          {[
            ['entry', 'New Entry'],
            ['report', 'Work-Done Report'],
            ['rates', 'Rates'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setParams({ tab: id })}
              className={`px-3 py-1.5 rounded text-sm font-medium border ${
                tab === id
                  ? 'bg-[#e67e00] text-white border-[#e67e00]'
                  : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {!plantId ? (
        <p className="text-sm text-amber-400">Select a mill at the top of the page.</p>
      ) : tab === 'rates' ? (
        <RatesTab plantId={plantId} admin={admin} canAdd={canAdd} canEdit={canEdit} />
      ) : tab === 'report' ? (
        <ReportTab plantId={plantId} />
      ) : (
        <EntryTab plantId={plantId} role={user?.role} canAdd={canAdd} canEdit={canEdit} />
      )}
    </div>
  );
};

function EntryTab({
  plantId,
  role,
  canAdd,
  canEdit,
}: {
  plantId: string;
  role?: string;
  canAdd: boolean;
  canEdit: boolean;
}) {
  const addToast = useUiStore((s) => s.addToast);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [passes, setPasses] = useState<any[]>([]);
  const [backdate, setBackdate] = useState('off');
  const [link, setLink] = useState<'GP' | 'INTERMILL'>('GP');
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [fingerprint, setFingerprint] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    labourPartyId: '',
    gatePassId: '',
    itemId: '',
    quantity: '',
    note: '',
    date: '',
  });

  useEffect(() => {
    setTaskIds([]);
    api.get('/api/labour-work/catalog', { params: { plantId } }).then((r) => setCatalog(r.data || []));
    api.get('/api/labour-work/parties', { params: { plantId } }).then((r) => setParties(r.data || []));
    api.get('/api/labour-work/gate-passes', { params: { plantId } }).then((r) => setPasses(r.data || []));
    api.get('/api/labour-work/settings').then((r) => setBackdate(r.data?.backdate || 'off'));
  }, [plantId]);

  const item = catalog.find((c) => c.id === form.itemId);
  const tasks = item?.tasks || [];
  const nowLabel = new Date().toLocaleString();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdd) {
      addToast('Not allowed. Turn on Add for Labour Work Order, then log in again.', 'error');
      return;
    }
    setSaving(true);
    try {
      let fingerprintToken = '';
      if (fingerprint) {
        const isSupervisor = role === 'SUPERVISOR';
        fingerprintToken = isSupervisor
          ? await biometricService.captureAndVerifyLoggedInUser()
          : 'ADMIN_BYPASS';
      }
      const res = await api.post('/api/labour-work/orders', {
        plantId,
        labourPartyId: form.labourPartyId,
        intermill: link === 'INTERMILL',
        gatePassId: link === 'GP' ? form.gatePassId : undefined,
        itemId: form.itemId,
        taskIds,
        quantity: Number(form.quantity),
        note: form.note,
        date: backdate === 'on' ? form.date : undefined,
        updateWithFingerprint: fingerprint,
        fingerprintToken,
      });
      addToast(`Work Order No. ${res.data.workOrderNo} saved`, 'success');
      setForm({ labourPartyId: '', gatePassId: '', itemId: '', quantity: '', note: '', date: '' });
      setTaskIds([]);
      setFingerprint(false);
    } catch (err: any) {
      addToast(String(err?.response?.data?.message || 'Could not save work order'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
      <Field label="Work Order No.">
        <input readOnly value="Auto on submit" className={inputCls} />
      </Field>
      <Field label="Date & Time">
        {backdate === 'on' ? (
          <input
            type="datetime-local"
            className={inputCls}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        ) : (
          <input readOnly value={nowLabel} className={inputCls} />
        )}
      </Field>
      <Field label="Labour Party">
        <select
          required
          className={inputCls}
          value={form.labourPartyId}
          onChange={(e) => setForm({ ...form, labourPartyId: e.target.value })}
        >
          <option value="">Select</option>
          {parties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Link">
        <div className="flex gap-2">
          <button
            type="button"
            className={link === 'GP' ? onBtn : offBtn}
            onClick={() => setLink('GP')}
          >
            GP No.
          </button>
          <button
            type="button"
            className={link === 'INTERMILL' ? onBtn : offBtn}
            onClick={() => setLink('INTERMILL')}
          >
            Inter-Mill Movement
          </button>
        </div>
      </Field>
      {link === 'GP' ? (
        <Field label="GP No.">
          <select
            required
            className={inputCls}
            value={form.gatePassId}
            onChange={(e) => setForm({ ...form, gatePassId: e.target.value })}
          >
            <option value="">Select GP cut at this mill</option>
            {passes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.qrCode || p.id.slice(0, 8)} · {p.passType} · {p.vehicleNo}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label="Inter-Mill Movement">
          <input readOnly value="Ticked — stock is not changed" className={inputCls} />
        </Field>
      )}
      <Field label="Item">
        <select
          required
          className={inputCls}
          value={form.itemId}
          onChange={(e) => {
            setForm({ ...form, itemId: e.target.value });
            setTaskIds([]);
          }}
        >
          <option value="">Select</option>
          {catalog.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Select Task">
        <div className="flex flex-wrap gap-2">
          {tasks.length === 0 && <span className="text-xs text-[var(--text-muted-alt)]">Choose an item first</span>}
          {tasks.map((t: any) => (
            <label key={t.id} className="flex items-center gap-1.5 text-sm border border-[var(--border-subtle)] rounded px-2 py-1">
              <input
                type="checkbox"
                checked={taskIds.includes(t.id)}
                onChange={(e) =>
                  setTaskIds((prev) =>
                    e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id),
                  )
                }
              />
              {t.name}
            </label>
          ))}
        </div>
      </Field>
      <Field label="Pcs / Bags">
        <input
          required
          inputMode="numeric"
          className={inputCls}
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value.replace(/[^\d]/g, '') })}
        />
      </Field>
      <Field label="Note">
        <input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </Field>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" checked={fingerprint} onChange={(e) => setFingerprint(e.target.checked)} />
        Update with Fingerprint
      </label>
      {canEdit && (
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={backdate === 'on'}
            onChange={async (e) => {
              if (!canEdit) return;
              const next = e.target.checked ? 'on' : 'off';
              await api.put('/api/labour-work/settings', { backdate: next });
              setBackdate(next);
            }}
          />
          Allow back-date entry (global setting). Off keeps the entry at the current time.
        </label>
      )}
      {canAdd && (
      <div>
        <button disabled={saving} className="bg-[#e67e00] text-white px-4 py-2 rounded font-medium">
          {saving ? 'Saving…' : 'Submit'}
        </button>
      </div>
      )}
      {!canAdd && (
        <p className="text-xs text-[var(--text-muted-alt)] md:col-span-2">
          This role can view Labour Work Order. Add is required to submit a work order.
        </p>
      )}
    </form>
  );
}

function ReportTab({ plantId }: { plantId: string }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [partyId, setPartyId] = useState('');
  const [parties, setParties] = useState<any[]>([]);
  const [data, setData] = useState<any>({ parties: [], total: 0 });

  const load = () => {
    api
      .get('/api/labour-work/orders', { params: { plantId, date, labourPartyId: partyId || undefined } })
      .then((r) => setData(r.data));
  };

  useEffect(() => {
    api.get('/api/labour-work/parties', { params: { plantId } }).then((r) => setParties(r.data || []));
  }, [plantId]);

  useEffect(() => {
    load();
  }, [plantId, date, partyId]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        <select className={inputCls} value={partyId} onChange={(e) => setPartyId(e.target.value)}>
          <option value="">All parties</option>
          {parties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      {(data.parties || []).map((group: any) => (
        <div key={group.labourPartyName} className="mb-6">
          <h2 className="font-bold text-sm mb-2">
            {group.labourPartyName} · {group.amount.toFixed(2)}
          </h2>
          <div className="overflow-x-auto border border-[var(--border-subtle)] rounded">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-panel-hover)] text-left">
                <tr>
                  {['Work Order Bill No.', 'Date', 'GP', 'Item', 'Task', 'Qty', 'Rate', 'Amount', 'Fingerprint', 'Note'].map((h) => (
                    <th key={h} className="p-2 font-medium text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-[var(--border-subtle)]">
                    <td className="p-2 font-mono">{r.billNo}</td>
                    <td className="p-2">{new Date(r.date).toLocaleString()}</td>
                    <td className="p-2">{r.mode === 'INTERMILL' ? 'Inter-mill' : r.gpNo || '—'}</td>
                    <td className="p-2">{r.itemName}</td>
                    <td className="p-2">{r.taskName}</td>
                    <td className="p-2 text-right">{r.quantity}</td>
                    <td className="p-2 text-right font-mono">{Number(r.rate).toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">{Number(r.amount).toFixed(2)}</td>
                    <td className="p-2">{r.fingerprintName || '—'}</td>
                    <td className="p-2">{r.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p className="text-sm font-bold">Day total {Number(data.total || 0).toFixed(2)}</p>
    </div>
  );
}

function RatesTab({
  plantId,
  admin,
  canAdd,
  canEdit,
}: {
  plantId: string;
  admin: boolean;
  canAdd: boolean;
  canEdit: boolean;
}) {
  const addToast = useUiStore((s) => s.addToast);
  const [parties, setParties] = useState<any[]>([]);
  const [partyId, setPartyId] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [product, setProduct] = useState('');
  const [taskName, setTaskName] = useState('');
  const [itemId, setItemId] = useState('');

  const load = () => {
    api
      .get('/api/labour-work/rates', { params: { plantId, labourPartyId: partyId || undefined } })
      .then((r) => {
        setRows(r.data || []);
        const next: Record<string, string> = {};
        (r.data || []).forEach((row: any) => {
          next[row.taskId] = String(partyId ? row.partyRate ?? row.millRate : row.millRate);
        });
        setDraft(next);
      });
  };

  useEffect(() => {
    api.get('/api/labour-work/parties', { params: { plantId } }).then((r) => setParties(r.data || []));
  }, [plantId]);

  useEffect(() => {
    load();
  }, [plantId, partyId]);

  const save = async () => {
    if (!canEdit) {
      addToast('Not allowed. Turn on Edit for Labour Work Order, then log in again.', 'error');
      return;
    }
    try {
      await api.put('/api/labour-work/rates', {
        plantId,
        labourPartyId: partyId || '',
        updates: rows
          .filter((row) => !row.ratesManualOnly || admin)
          .map((row) => ({ taskId: row.taskId, rate: Number(draft[row.taskId] || 0) })),
      });
      addToast('Rates saved for this mill', 'success');
      load();
    } catch (err: any) {
      addToast(String(err?.response?.data?.message || 'Could not save rates'), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm">Rate for</span>
        <select className={inputCls} value={partyId} onChange={(e) => setPartyId(e.target.value)}>
          <option value="">Mill default</option>
          {parties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {canEdit && (
        <button type="button" onClick={save} className="bg-[#e67e00] text-white px-3 py-1.5 rounded text-sm">
          Save rates
        </button>
        )}
      </div>
      <div className="overflow-x-auto border border-[var(--border-subtle)] rounded">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-panel-hover)] text-left">
            <tr>
              <th className="p-2">Item</th>
              <th className="p-2">Task</th>
              <th className="p-2">Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.taskId} className="border-t border-[var(--border-subtle)]">
                <td className="p-2">{row.itemName}</td>
                <td className="p-2">{row.taskName}</td>
                <td className="p-2">
                  <input
                    className="w-28 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1"
                    value={draft[row.taskId] ?? ''}
                    disabled={!canEdit || (row.ratesManualOnly && !admin)}
                    onChange={(e) => setDraft({ ...draft, [row.taskId]: e.target.value })}
                  />
                  {row.ratesManualOnly && !admin && (
                    <span className="ml-2 text-[10px] text-amber-400">Admin only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canAdd && (
        <div className="border border-[var(--border-subtle)] rounded p-3 space-y-2 max-w-xl">
          <h3 className="font-bold text-sm">Add product or task</h3>
          <div className="flex gap-2">
            <input className={inputCls} placeholder="New product" value={product} onChange={(e) => setProduct(e.target.value)} />
            <button
              type="button"
              className="px-3 py-1.5 border rounded text-sm"
              onClick={async () => {
                if (!canAdd || !product.trim()) return;
                await api.post('/api/labour-work/items', { name: product.trim() });
                setProduct('');
                load();
              }}
            >
              Add product
            </button>
          </div>
          <div className="flex gap-2">
            <select className={inputCls} value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">Item for new task</option>
              {[...new Map(rows.map((r) => [r.itemId, r.itemName])).entries()].map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <input className={inputCls} placeholder="New task" value={taskName} onChange={(e) => setTaskName(e.target.value)} />
            <button
              type="button"
              className="px-3 py-1.5 border rounded text-sm"
              onClick={async () => {
                if (!canAdd || !itemId || !taskName.trim()) return;
                await api.post('/api/labour-work/tasks', { itemId, name: taskName.trim() });
                setTaskName('');
                load();
              }}
            >
              Add task
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="block text-xs text-[var(--text-muted-alt)] mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm outline-none focus:border-[#e67e00]';
const onBtn = 'px-3 py-1.5 rounded bg-[#e67e00] text-white text-sm';
const offBtn = 'px-3 py-1.5 rounded border border-[var(--border-subtle)] text-sm';

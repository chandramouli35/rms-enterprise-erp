import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { financeSodaApi } from '../../api/financeSoda';
import { productsApi } from '../../api/products';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';

const todayStr = () => new Date().toISOString().slice(0, 10);

export const SodaDeals: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const addToast = useUiStore((s) => s.addToast);
  const role = user?.role;

  const [reportType, setReportType] = useState<'SALE' | 'PURCHASE'>('SALE');
  const [plants, setPlants] = useState<any[]>([]);
  const [sodas, setSodas] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [partyOpts, setPartyOpts] = useState<{ parties: any[]; plants: any[] }>({ parties: [], plants: [] });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);
  const [millSearch, setMillSearch] = useState('');
  const [millDropOpen, setMillDropOpen] = useState(false);
  const millDropRef = useRef<HTMLDivElement>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [itemDropOpen, setItemDropOpen] = useState(false);
  const itemDropRef = useRef<HTMLDivElement>(null);
  const [partySearch, setPartySearch] = useState('');
  const [partyDropOpen, setPartyDropOpen] = useState(false);
  const partyDropRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    date: todayStr(),
    sodaType: 'SALE' as 'SALE' | 'PURCHASE',
    millIds: [] as string[],
    itemId: '',
    partyKind: 'PARTY' as 'PARTY' | 'PLANT',
    partyId: '',
    partyPlantId: '',
    isShift: false,
    rate: '',
    quantity: '',
    note: '',
    nextNumber: 0,
  });

  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';

  const load = async () => {
    setLoading(true);
    try {
      const [sodaRes, prodRes] = await Promise.all([
        financeSodaApi.list(), // all types — historical default
        productsApi.listAll(),
      ]);
      setPlants(sodaRes.data.plants || []);
      setSodas(sodaRes.data.sodas || []);
      const plist = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data || [];
      setProducts(plist);
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to load sodas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (millDropRef.current && !millDropRef.current.contains(t)) setMillDropOpen(false);
      if (itemDropRef.current && !itemDropRef.current.contains(t)) setItemDropOpen(false);
      if (partyDropRef.current && !partyDropRef.current.contains(t)) setPartyDropOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const openAdd = async () => {
    const sodaType = reportType;
    try {
      const [nextRes, opts] = await Promise.all([
        financeSodaApi.nextNumber(sodaType),
        financeSodaApi.partyOptions(),
      ]);
      setPartyOpts(opts.data);
      setForm({
        date: todayStr(),
        sodaType,
        millIds: [],
        itemId: '',
        partyKind: 'PARTY',
        partyId: '',
        partyPlantId: '',
        isShift: false,
        rate: '',
        quantity: '',
        note: '',
        nextNumber: nextRes.data.next,
      });
      setMillSearch('');
      setMillDropOpen(false);
      setItemSearch('');
      setItemDropOpen(false);
      setPartySearch('');
      setPartyDropOpen(false);
      setShowForm(true);
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to open form', 'error');
    }
  };

  const refreshPartyOpts = async (millIds: string[]) => {
    const opts = await financeSodaApi.partyOptions(millIds.length > 1 ? millIds : []);
    setPartyOpts(opts.data);
  };

  const toggleMill = (id: string) => {
    setForm((f) => {
      const millIds = f.millIds.includes(id) ? f.millIds.filter((x) => x !== id) : [...f.millIds, id];
      refreshPartyOpts(millIds);
      // clear plant party if multi
      const next = { ...f, millIds };
      if (millIds.length > 1 && f.partyKind === 'PLANT') {
        next.partyKind = 'PARTY';
        next.partyPlantId = '';
      }
      return next;
    });
  };

  const validate = () => {
    if (!form.date) return 'Date is required';
    if (new Date(form.date) > new Date(todayStr() + 'T23:59:59')) return 'Future dates not allowed';
    if (!form.millIds.length) return 'Select at least one mill';
    if (!form.itemId) return 'Item is required';
    if (form.partyKind === 'PARTY' && !form.partyId) return 'Party is required';
    if (form.partyKind === 'PLANT' && !form.partyPlantId) return 'Party mill is required';
    if (form.millIds.length > 1 && form.partyKind === 'PLANT') return 'Multi-mill: Party cannot be a Main Mill';
    if (form.isShift) {
      if (form.millIds.length !== 1) return 'Shift requires exactly one mill';
      if (form.partyKind !== 'PLANT' || !form.partyPlantId) return 'Shift requires another mill as Party';
    } else if (!(parseFloat(form.rate) > 0)) return 'Rate must be > 0';
    if (!(parseInt(form.quantity, 10) > 0)) return 'Count must be an integer > 0';
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) {
      addToast(err, 'error');
      return;
    }
    setConfirmOpen(false);
    try {
      await financeSodaApi.create({
        date: form.date,
        sodaType: form.sodaType,
        millIds: form.millIds,
        itemId: form.itemId,
        partyId: form.partyKind === 'PARTY' ? form.partyId : undefined,
        partyPlantId: form.partyKind === 'PLANT' ? form.partyPlantId : undefined,
        isShift: form.isShift,
        rate: form.isShift ? undefined : form.rate,
        quantity: form.quantity,
        note: form.note,
      });
      addToast('Soda saved', 'success');
      setShowForm(false);
      setReportType(form.sodaType);
      await load();
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Save failed', 'error');
      // keep form open with values (cancel of confirm already kept form)
    }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    try {
      await financeSodaApi.update(editRow.id, { quantity: editRow.quantity, note: editRow.note });
      addToast('Soda updated', 'success');
      setEditRow(null);
      await load();
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Update failed', 'error');
    }
  };

  const setPayStatus = async (id: string, paymentStatus: string) => {
    try {
      await financeSodaApi.paymentStatus(id, paymentStatus);
      addToast('Payment status updated', 'success');
      await load();
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Update failed', 'error');
    }
  };

  const filtered = useMemo(() => sodas.filter((s) => s.sodaType === reportType), [sodas, reportType]);

  const filteredMills = useMemo(() => {
    const q = millSearch.trim().toLowerCase();
    if (!q) return plants;
    return plants.filter((p) => p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q));
  }, [plants, millSearch]);

  const filteredProducts = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name?.toLowerCase().includes(q));
  }, [products, itemSearch]);

  const partyChoices = form.partyKind === 'PARTY' ? partyOpts.parties : partyOpts.plants;
  const filteredParties = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    if (!q) return partyChoices;
    return partyChoices.filter((p) => p.name?.toLowerCase().includes(q));
  }, [partyChoices, partySearch]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">Deals / Soda Record</h2>
          <p className="text-sm text-[var(--text-muted)]">Sale &amp; Purchase soda orders with mill quota tracking</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400"
        >
          + Add Soda
        </button>
      </div>

      <div className="flex gap-2">
        {(['SALE', 'PURCHASE'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setReportType(t)}
            className={`px-3 py-1.5 rounded text-sm font-medium border ${
              reportType === t
                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
            }`}
          >
            {t === 'SALE' ? 'Sale Soda Report' : 'Purchase Soda Report'}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto border border-[var(--border-subtle)] rounded-xl">
        <table className="min-w-full text-xs text-left">
          <thead className="bg-[var(--bg-panel-alt)] text-[var(--text-muted)]">
            <tr>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Item</th>
              <th className="px-2 py-2">Party</th>
              <th className="px-2 py-2">Rate</th>
              <th className="px-2 py-2">Count</th>
              <th className="px-2 py-2">{reportType === 'SALE' ? 'Sale Order No.' : 'Purchase Order No.'}</th>
              {plants.map((p) => (
                <th key={p.id} className="px-2 py-2 whitespace-nowrap">{p.name}</th>
              ))}
              <th className="px-2 py-2">Soda Status</th>
              <th className="px-2 py-2">Payment</th>
              <th className="px-2 py-2">Payment Status</th>
              <th className="px-2 py-2">Note</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={12 + plants.length} className="p-6 text-center text-[var(--text-muted)]">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={12 + plants.length} className="p-6 text-center text-[var(--text-muted)]">
                  No soda records yet. Click Add Soda.
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id} className="border-t border-[var(--border-subtle)] text-[var(--text-main)]">
                <td className="px-2 py-2 whitespace-nowrap">{new Date(s.date).toLocaleDateString('en-GB')}</td>
                <td className="px-2 py-2">{s.itemName}</td>
                <td className="px-2 py-2">{s.partyName}</td>
                <td className="px-2 py-2">{s.isShift ? 'Shift' : s.rate}</td>
                <td className="px-2 py-2">{s.quantity}</td>
                <td className="px-2 py-2 font-mono">{s.sodaNumber}</td>
                {plants.map((p) => {
                  const selected = (s.millIds || []).includes(p.id);
                  const count = s.millCounts?.[p.id] ?? 0;
                  return (
                    <td
                      key={p.id}
                      className={`px-2 py-2 text-center ${selected ? 'bg-amber-500/20 font-bold text-amber-400' : 'text-[var(--text-muted)]'}`}
                    >
                      {selected ? count : 0}
                    </td>
                  );
                })}
                <td className="px-2 py-2">{s.sodaStatus}</td>
                <td className="px-2 py-2">{Number(s.paymentAmount ?? 0).toLocaleString('en-IN')}</td>
                <td className="px-2 py-2">
                  {isAdmin ? (
                    <select
                      value={s.paymentStatus}
                      onChange={(e) => setPayStatus(s.id, e.target.value)}
                      className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-1 py-0.5"
                    >
                      <option value="CLEAR">Clear</option>
                      <option value="UNDERWAY">Underway</option>
                      <option value="NOT_CLEAR">Not Clear</option>
                    </select>
                  ) : (
                    ({ CLEAR: 'Clear', UNDERWAY: 'Underway', NOT_CLEAR: 'Not Clear' } as any)[s.paymentStatus] ||
                    s.paymentStatus
                  )}
                </td>
                <td className="px-2 py-2 max-w-[120px] truncate" title={s.note || ''}>
                  {s.note || '—'}
                </td>
                <td className="px-2 py-2">
                  {isAdmin && !s.isCompleted && (
                    <button
                      type="button"
                      className="text-amber-400 underline"
                      onClick={() => setEditRow({ id: s.id, quantity: s.quantity, note: s.note || '' })}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Soda modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] p-5 space-y-3">
            <h3 className="text-lg font-bold text-[var(--text-main)]">Add Soda</h3>

            <label className="block text-xs text-[var(--text-muted)]">
              Date
              <input
                type="date"
                value={form.date}
                max={todayStr()}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              />
            </label>

            <label className="block text-xs text-[var(--text-muted)]">
              Soda Type
              <select
                value={form.sodaType}
                onChange={async (e) => {
                  const sodaType = e.target.value as 'SALE' | 'PURCHASE';
                  const next = await financeSodaApi.nextNumber(sodaType);
                  setForm({ ...form, sodaType, nextNumber: next.data.next });
                }}
                className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              >
                <option value="SALE">Sale</option>
                <option value="PURCHASE">Purchase</option>
              </select>
            </label>

            <div className="text-xs text-[var(--text-muted)]" ref={millDropRef}>
              Mill Selection (search + multi-select)
              <div className="relative mt-1">
                <button
                  type="button"
                  onClick={() => setMillDropOpen((o) => !o)}
                  className="w-full min-h-[40px] flex items-center justify-between gap-2 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-left text-sm text-[var(--text-main)] hover:border-amber-500/50"
                >
                  <span className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                    {form.millIds.length === 0 ? (
                      <span className="text-[var(--text-muted)]">Select mill(s)…</span>
                    ) : (
                      plants
                        .filter((p) => form.millIds.includes(p.id))
                        .map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[11px] font-medium"
                          >
                            <span className="truncate">{p.name}</span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMill(p.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleMill(p.id);
                                }
                              }}
                              className="hover:text-amber-200"
                              title="Remove"
                            >
                              <X size={12} />
                            </span>
                          </span>
                        ))
                    )}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-[var(--text-muted-alt)] transition-transform ${millDropOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {millDropOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)]">
                      <Search size={14} className="text-[var(--text-muted-alt)] shrink-0" />
                      <input
                        type="text"
                        autoFocus
                        value={millSearch}
                        onChange={(e) => setMillSearch(e.target.value)}
                        placeholder="Quick search mills…"
                        className="w-full bg-transparent outline-none text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                      />
                    </div>
                    <ul className="max-h-48 overflow-y-auto py-1">
                      {filteredMills.length === 0 ? (
                        <li className="px-3 py-2 text-[var(--text-muted)] italic text-sm">No mills match</li>
                      ) : (
                        filteredMills.map((p) => {
                          const checked = form.millIds.includes(p.id);
                          return (
                            <li key={p.id}>
                              <label
                                className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm text-[var(--text-main)] hover:bg-amber-500/10 ${
                                  checked ? 'bg-amber-500/5' : ''
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleMill(p.id)}
                                  className="accent-amber-500"
                                />
                                <span className="truncate">{p.name}</span>
                              </label>
                            </li>
                          );
                        })
                      )}
                    </ul>
                    {form.millIds.length > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--border-subtle)] text-[11px]">
                        <span className="text-[var(--text-muted)]">{form.millIds.length} selected</span>
                        <button
                          type="button"
                          className="text-amber-400 hover:underline"
                          onClick={() => setMillDropOpen(false)}
                        >
                          Done
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-[var(--text-muted)]" ref={itemDropRef}>
              Item Selection
              <div className="relative mt-1">
                <button
                  type="button"
                  onClick={() => setItemDropOpen((o) => !o)}
                  className="w-full min-h-[40px] flex items-center justify-between gap-2 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-left text-sm text-[var(--text-main)] hover:border-amber-500/50"
                >
                  <span className="truncate flex-1 min-w-0">
                    {(() => {
                      const hit = products.find((p) => p.id === form.itemId);
                      if (hit?.name) return hit.name;
                      return <span className="text-[var(--text-muted)]">Select item…</span>;
                    })()}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-[var(--text-muted-alt)] transition-transform ${itemDropOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {itemDropOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)]">
                      <Search size={14} className="text-[var(--text-muted-alt)] shrink-0" />
                      <input
                        type="text"
                        autoFocus
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        placeholder="Quick search items…"
                        className="w-full bg-transparent outline-none text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                      />
                    </div>
                    <ul className="max-h-48 overflow-y-auto py-1">
                      {filteredProducts.length === 0 ? (
                        <li className="px-3 py-2 text-[var(--text-muted)] italic text-sm">No items match</li>
                      ) : (
                        filteredProducts.map((p) => {
                          const selected = form.itemId === p.id;
                          return (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setForm({ ...form, itemId: p.id });
                                  setItemSearch('');
                                  setItemDropOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm text-[var(--text-main)] hover:bg-amber-500/10 ${
                                  selected ? 'bg-amber-500/10 text-amber-400' : ''
                                }`}
                              >
                                {p.name}
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-[var(--text-muted)]">
                Party type
                <select
                  value={form.partyKind}
                  disabled={form.millIds.length > 1}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      partyKind: e.target.value as any,
                      partyId: '',
                      partyPlantId: '',
                    });
                    setPartySearch('');
                    setPartyDropOpen(false);
                  }}
                  className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                >
                  <option value="PARTY">Client / Party</option>
                  <option value="PLANT" disabled={form.millIds.length > 1}>
                    Mill (inter-mill)
                  </option>
                </select>
              </label>
              <div className="text-xs text-[var(--text-muted)]" ref={partyDropRef}>
                Party
                <div className="relative mt-1">
                  <button
                    type="button"
                    onClick={() => setPartyDropOpen((o) => !o)}
                    className="w-full min-h-[40px] flex items-center justify-between gap-2 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-left text-sm text-[var(--text-main)] hover:border-amber-500/50"
                  >
                    <span className="truncate flex-1 min-w-0">
                      {(() => {
                        const selectedId = form.partyKind === 'PARTY' ? form.partyId : form.partyPlantId;
                        const hit = partyChoices.find((p) => p.id === selectedId);
                        if (hit?.name) return hit.name;
                        return <span className="text-[var(--text-muted)]">Select party…</span>;
                      })()}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-[var(--text-muted-alt)] transition-transform ${partyDropOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {partyDropOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)]">
                        <Search size={14} className="text-[var(--text-muted-alt)] shrink-0" />
                        <input
                          type="text"
                          autoFocus
                          value={partySearch}
                          onChange={(e) => setPartySearch(e.target.value)}
                          placeholder="Quick search party…"
                          className="w-full bg-transparent outline-none text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                        />
                      </div>
                      <ul className="max-h-48 overflow-y-auto py-1">
                        {filteredParties.length === 0 ? (
                          <li className="px-3 py-2 text-[var(--text-muted)] italic text-sm">No parties match</li>
                        ) : (
                          filteredParties.map((p) => {
                            const selectedId = form.partyKind === 'PARTY' ? form.partyId : form.partyPlantId;
                            const selected = selectedId === p.id;
                            return (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setForm({
                                      ...form,
                                      ...(form.partyKind === 'PARTY'
                                        ? { partyId: p.id, partyPlantId: '' }
                                        : { partyPlantId: p.id, partyId: '' }),
                                    });
                                    setPartySearch('');
                                    setPartyDropOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm text-[var(--text-main)] hover:bg-amber-500/10 ${
                                    selected ? 'bg-amber-500/10 text-amber-400' : ''
                                  }`}
                                >
                                  {p.name}
                                </button>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {form.partyKind === 'PARTY' && (
              <button
                type="button"
                className="text-xs text-amber-400 underline"
                onClick={async () => {
                  const name = window.prompt('New party name');
                  if (!name?.trim()) return;
                  try {
                    const res = await financeSodaApi.createParty({ name: name.trim() });
                    await refreshPartyOpts(form.millIds);
                    setForm((f) => ({ ...f, partyId: res.data.id }));
                    addToast('Party created', 'success');
                  } catch (e: any) {
                    addToast(e?.response?.data?.message || 'Failed', 'error');
                  }
                }}
              >
                + Add new party
              </button>
            )}

            <div className="text-xs text-[var(--text-muted)] space-y-2">
              <div>Rate</div>
              <div className="flex gap-4 text-[var(--text-main)]">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!form.isShift}
                    onChange={() => setForm({ ...form, isShift: false })}
                  />
                  Numeric (₹ / unit)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.isShift}
                    onChange={() => setForm({ ...form, isShift: true, rate: '' })}
                  />
                  Shift (inter-mill mirror)
                </label>
              </div>
            </div>

            {!form.isShift && (
              <label className="block text-xs text-[var(--text-muted)]">
                Rate amount
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                />
              </label>
            )}

            <label className="block text-xs text-[var(--text-muted)]">
              Count / Quantity (trucks)
              <input
                type="number"
                min="1"
                step="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              />
            </label>

            <label className="block text-xs text-[var(--text-muted)]">
              Soda Number (auto)
              <input
                readOnly
                value={form.nextNumber || '—'}
                className="mt-1 w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-muted)]"
              />
            </label>

            <label className="block text-xs text-[var(--text-muted)]">
              Note
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
                className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-[var(--text-muted)]">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const err = validate();
                  if (err) addToast(err, 'error');
                  else setConfirmOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm"
              >
                Save &amp; Generate Soda
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 max-w-sm w-full space-y-3">
            <p className="text-[var(--text-main)] font-medium">Confirm save this Soda entry?</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 text-sm"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="px-4 py-2 rounded bg-amber-500 text-black font-semibold text-sm" onClick={submit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 w-full max-w-sm space-y-3">
            <h3 className="font-bold text-[var(--text-main)]">Edit Soda (count / note)</h3>
            <label className="block text-xs text-[var(--text-muted)]">
              Count
              <input
                type="number"
                min="1"
                value={editRow.quantity}
                onChange={(e) => setEditRow({ ...editRow, quantity: e.target.value })}
                className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              />
            </label>
            <label className="block text-xs text-[var(--text-muted)]">
              Note
              <textarea
                value={editRow.note}
                onChange={(e) => setEditRow({ ...editRow, note: e.target.value })}
                className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditRow(null)} className="text-sm text-[var(--text-muted)]">
                Cancel
              </button>
              <button type="button" onClick={saveEdit} className="px-3 py-1.5 rounded bg-amber-500 text-black text-sm font-semibold">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

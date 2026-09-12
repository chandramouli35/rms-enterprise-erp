import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { financeLedgerApi } from '../../api/financeLedger';
import { useUiStore } from '../../store/uiStore';
import { hasFinancePermission } from '../../utils/financePermissions';

const fmtMoney = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

type EntryType = 'RECEIPT' | 'PAYMENT';

export const PaymentEntry: React.FC<{ entryType: EntryType }> = ({ entryType }) => {
  const addToast = useUiStore((s) => s.addToast);
  const isReceipt = entryType === 'RECEIPT';
  const title = isReceipt ? 'Payment Received' : 'Payment Paid';
  const amountLabel = isReceipt ? 'Amount' : 'Amount Paid';
  const subModule = isReceipt ? 'Payment Received' : 'Payment Paid';
  const canAdd = hasFinancePermission(subModule, 'canAdd');

  const [parties, setParties] = useState<any[]>([]);
  const [sodas, setSodas] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [partyKey, setPartyKey] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [partyOpen, setPartyOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [financeSodaId, setFinanceSodaId] = useState('');
  const [saving, setSaving] = useState(false);
  const partyRef = useRef<HTMLDivElement>(null);

  const selectedParty = parties.find((p) => p.key === partyKey);

  const loadParties = useCallback(async () => {
    try {
      const res = await financeLedgerApi.partyOptions();
      setParties(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to load parties', 'error');
    }
  }, [addToast]);

  const loadRows = useCallback(async () => {
    try {
      const res = await financeLedgerApi.payments(entryType);
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to load payments', 'error');
    }
  }, [entryType, addToast]);

  useEffect(() => {
    loadParties();
    loadRows();
  }, [loadParties, loadRows]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (partyRef.current && !partyRef.current.contains(e.target as Node)) setPartyOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!partyKey) {
      setSodas([]);
      setFinanceSodaId('');
      return;
    }
    financeLedgerApi
      .sodas(partyKey, isReceipt ? 'SALE' : 'PURCHASE')
      .then((res) => setSodas(Array.isArray(res.data) ? res.data : []))
      .catch(() => setSodas([]));
    setFinanceSodaId('');
  }, [partyKey, isReceipt]);

  const filteredParties = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    if (!q) return parties;
    return parties.filter((p) => p.name?.toLowerCase().includes(q));
  }, [parties, partySearch]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyKey) {
      addToast('Select a party', 'error');
      return;
    }
    const amt = parseFloat(amount);
    if (!(amt > 0)) {
      addToast('Enter a valid amount', 'error');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      await financeLedgerApi.createPayment({
        entryType,
        partyKey,
        date,
        narration: narration.trim() || undefined,
        amount: amt,
        notes: notes.trim() || undefined,
        financeSodaId: financeSodaId || undefined,
      });
      addToast(`${title} saved — party ledger updated`, 'success');
      setAmount('');
      setNarration('');
      setNotes('');
      setFinanceSodaId('');
      await loadRows();
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-main)]">{title}</h2>
        <p className="text-sm text-[var(--text-muted)]">
          {isReceipt
            ? 'Add funds / incoming payments — credits the party ledger'
            : 'Outgoing payments made to parties — debits the party ledger'}
        </p>
      </div>

      {canAdd ? (
      <form
        onSubmit={submit}
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 grid sm:grid-cols-2 gap-3"
      >
        <div className="text-xs text-[var(--text-muted)] sm:col-span-2" ref={partyRef}>
          Party Name
          <div className="relative mt-1">
            <button
              type="button"
              onClick={() => {
                setPartyOpen((o) => !o);
                setPartySearch('');
              }}
              className="w-full min-h-[40px] flex items-center justify-between gap-2 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-left text-sm text-[var(--text-main)] hover:border-amber-500/50"
            >
              <span className={`truncate ${partyKey ? '' : 'text-[var(--text-muted)]'}`}>
                {selectedParty?.name || 'Select party…'}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                {partyKey && (
                  <span
                    role="button"
                    tabIndex={0}
                    className="p-0.5 text-amber-400"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setPartyKey('');
                    }}
                  >
                    <X size={14} />
                  </span>
                )}
                <ChevronDown size={16} className={partyOpen ? 'rotate-180' : ''} />
              </span>
            </button>
            {partyOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)]">
                  <Search size={14} className="text-[var(--text-muted-alt)]" />
                  <input
                    autoFocus
                    value={partySearch}
                    onChange={(e) => setPartySearch(e.target.value)}
                    placeholder="Search party…"
                    className="w-full bg-transparent outline-none text-sm text-[var(--text-main)]"
                  />
                </div>
                <ul className="max-h-48 overflow-y-auto py-1">
                  {filteredParties.map((p) => (
                    <li key={p.key}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-[var(--text-main)] hover:bg-amber-500/10"
                        onClick={() => {
                          setPartyKey(p.key);
                          setPartyOpen(false);
                        }}
                      >
                        {p.name}
                        <span className="text-[10px] text-[var(--text-muted)] ml-2">{p.kind}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <label className="text-xs text-[var(--text-muted)]">
          Date
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
          />
        </label>

        <label className="text-xs text-[var(--text-muted)]">
          {amountLabel}
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
          Narration
          <input
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder={isReceipt ? 'Payment received…' : 'Payment paid…'}
            className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
          />
        </label>

        <label className="text-xs text-[var(--text-muted)]">
          Soda / Deal (optional)
          <select
            value={financeSodaId}
            onChange={(e) => setFinanceSodaId(e.target.value)}
            disabled={!partyKey}
            className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
          >
            <option value="">— Unallocated —</option>
            {sodas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-[var(--text-muted)]">
          Notes
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : `Save ${title}`}
          </button>
        </div>
      </form>
      ) : (
        <p className="text-sm text-[var(--text-muted)] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4">
          View only — you need Add permission to log {title.toLowerCase()}.
        </p>
      )}

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] font-semibold text-[var(--text-main)]">
          Recent {title.toLowerCase()}
        </div>
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">No entries yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Party</th>
                <th className="px-4 py-2">Narration</th>
                <th className="px-4 py-2">Soda</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border-subtle-alt)] text-[var(--text-main)]">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.date ? new Date(r.date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2">{r.partyName}</td>
                  <td className="px-4 py-2 text-[var(--text-muted)]">{r.narration || '—'}</td>
                  <td className="px-4 py-2">
                    {r.sodaNumber != null
                      ? `${r.sodaType === 'SALE' ? 'SO' : 'PO'}-${String(r.sodaNumber).padStart(2, '0')}`
                      : '—'}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-green-400">
                    {fmtMoney(r.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

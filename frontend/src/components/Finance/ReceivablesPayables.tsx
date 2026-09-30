import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Download, RefreshCw, Search } from 'lucide-react';
import { financeLedgerApi } from '../../api/financeLedger';
import { useUiStore } from '../../store/uiStore';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { hasFinancePermission } from '../../utils/financePermissions';

const fmtMoney = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

type Kind = 'RECEIVABLES' | 'PAYABLES';

export const ReceivablesPayables: React.FC<{ kind: Kind }> = ({ kind }) => {
  const addToast = useUiStore((s) => s.addToast);
  const [data, setData] = useState<any>({ parties: [], totals: {}, labels: {} });
  const [loading, setLoading] = useState(false);
  const [owingOnly, setOwingOnly] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [partyKey, setPartyKey] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [statement, setStatement] = useState<any>(null);
  const [stmtLoading, setStmtLoading] = useState(false);

  const title = kind === 'RECEIVABLES' ? 'Receivables' : 'Payables';
  const labels = data.labels || {};
  const subLabel = kind === 'RECEIVABLES' ? 'Receivables' : 'Payables';
  const canSync = hasFinancePermission(subLabel, 'canEdit');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeLedgerApi.outstanding(kind, owingOnly);
      setData(res.data);
    } catch (e: any) {
      addToast(e?.response?.data?.message || `Failed to load ${title}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [kind, owingOnly, addToast, title]);

  useEffect(() => {
    load();
    setPartyKey('');
    setStatement(null);
    setExpanded({});
  }, [load]);

  const loadStatement = useCallback(
    async (key: string) => {
      if (!key) return;
      setStmtLoading(true);
      try {
        const res = await financeLedgerApi.statement({
          partyKey: key,
          from: from || undefined,
          to: to || undefined,
          q: q || undefined,
        });
        setStatement(res.data);
        setPartyKey(key);
      } catch (e: any) {
        addToast(e?.response?.data?.message || 'Failed to load ledger', 'error');
      } finally {
        setStmtLoading(false);
      }
    },
    [from, to, q, addToast],
  );

  useEffect(() => {
    if (partyKey) loadStatement(partyKey);
  }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const parties = data.parties || [];

  const exportStatementExcel = () => {
    if (!statement?.lines?.length) {
      addToast('No ledger lines to export', 'error');
      return;
    }
    exportToExcel(
      statement.lines.map((r: any) => ({
        Date: r.date ? new Date(r.date).toLocaleDateString() : '',
        'Soda / Deal No.': r.sodaDealNo,
        Mill: r.millName,
        Type: r.transactionType,
        Narration: r.narration,
        Debit: r.debit,
        Credit: r.credit,
        Balance: r.runningBalance,
      })),
      `Party_Ledger_${statement.partyName}_${Date.now()}.xlsx`,
    );
  };

  const exportStatementPdf = () => {
    if (!statement?.lines?.length) {
      addToast('No ledger lines to export', 'error');
      return;
    }
    exportToPDF(
      `Party Ledger — ${statement.partyName}`,
      ['Date', 'Soda/Deal', 'Mill', 'Type', 'Narration', 'Debit', 'Credit', 'Balance'],
      statement.lines.map((r: any) => [
        r.date ? new Date(r.date).toLocaleDateString() : '',
        r.sodaDealNo,
        r.millName,
        r.transactionType,
        r.narration || '',
        fmtMoney(r.debit),
        fmtMoney(r.credit),
        fmtMoney(r.runningBalance),
      ]),
      `Party_Ledger_${statement.partyName}_${Date.now()}.pdf`,
    );
  };

  const backfill = async () => {
    try {
      const res = await financeLedgerApi.backfill();
      addToast(`Ledger backfill: ${res.data.synced}/${res.data.scanned} lines`, 'success');
      await load();
      if (partyKey) await loadStatement(partyKey);
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Backfill failed', 'error');
    }
  };

  const stmtLines = statement?.lines || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">{title}</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {kind === 'RECEIVABLES'
              ? 'Parties who owe the firm (Sale billed − Payment Received)'
              : 'Parties the firm owes (Purchase billed − Payment Paid)'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={owingOnly}
              onChange={(e) => setOwingOnly(e.target.checked)}
              className="accent-amber-500"
            />
            {kind === 'RECEIVABLES' ? 'Owing only' : 'Payable only'}
          </label>
          {canSync && (
          <button
            type="button"
            onClick={backfill}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:bg-[var(--glass-bg)]"
          >
            <RefreshCw size={14} /> Sync ledger from reports
          </button>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: labels.billed || 'Billed', value: data.totals?.totalBilled },
          { label: labels.settled || 'Settled', value: data.totals?.totalSettled },
          { label: labels.outstanding || 'Outstanding', value: data.totals?.outstanding, accent: true },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 py-3"
          >
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{c.label}</p>
            <p className={`text-lg font-bold mt-1 ${c.accent ? 'text-amber-400' : 'text-[var(--text-main)]'}`}>
              {fmtMoney(c.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] font-semibold text-[var(--text-main)]">
          By party
        </div>
        {loading ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">Loading…</p>
        ) : parties.length === 0 ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">
            No {title.toLowerCase()} yet. Submit Sale/Purchase Gate Passes, then Sync ledger.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-xs">
                <th className="px-4 py-2 w-8" />
                <th className="px-4 py-2">Party</th>
                <th className="px-4 py-2 text-right">{labels.billed || 'Billed'}</th>
                <th className="px-4 py-2 text-right">{labels.settled || 'Settled'}</th>
                <th className="px-4 py-2 text-right">{labels.outstanding || 'Outstanding'}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {parties.map((p: any) => {
                const open = !!expanded[p.partyKey];
                return (
                  <React.Fragment key={p.partyKey}>
                    <tr className="border-b border-[var(--border-subtle-alt)] text-[var(--text-main)]">
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="p-1 text-[var(--text-muted)] hover:text-amber-400"
                          onClick={() =>
                            setExpanded((e) => ({ ...e, [p.partyKey]: !e[p.partyKey] }))
                          }
                        >
                          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-2 font-medium">{p.partyName}</td>
                      <td className="px-4 py-2 text-right">{fmtMoney(p.totalBilled)}</td>
                      <td className="px-4 py-2 text-right">{fmtMoney(p.totalSettled)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-amber-400">
                        {fmtMoney(p.outstanding)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          className="text-xs text-amber-400 hover:underline"
                          onClick={() => loadStatement(p.partyKey)}
                        >
                          Ledger
                        </button>
                      </td>
                    </tr>
                    {open &&
                      (p.sodas || []).map((s: any) => (
                        <tr
                          key={s.financeSodaId}
                          className="border-b border-[var(--border-subtle-alt)] bg-[var(--bg-base)] text-xs text-[var(--text-muted)]"
                        >
                          <td />
                          <td className="px-4 py-1.5 pl-8">
                            Soda {String(s.sodaNumber).padStart(2, '0')}
                            {s.itemName ? ` · ${s.itemName}` : ''}
                          </td>
                          <td className="px-4 py-1.5 text-right">{fmtMoney(s.billed)}</td>
                          <td className="px-4 py-1.5 text-right">{fmtMoney(s.settled)}</td>
                          <td className="px-4 py-1.5 text-right text-amber-400/90">
                            {fmtMoney(s.outstanding)}
                          </td>
                          <td />
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Party statement */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-[var(--text-main)]">Party Ledger</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {statement?.partyName
                ? `${statement.partyName} · Closing ${fmtMoney(statement.closingBalance)}`
                : 'Select Ledger on a party row'}
            </p>
          </div>
          {statement && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportStatementExcel}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded border border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)]"
              >
                <Download size={12} /> Excel
              </button>
              <button
                type="button"
                onClick={exportStatementPdf}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded border border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)]"
              >
                <Download size={12} /> PDF
              </button>
            </div>
          )}
        </div>
        <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-[var(--border-subtle)]">
          <label className="text-[10px] text-[var(--text-muted)]">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-0.5 block bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)]"
            />
          </label>
          <label className="text-[10px] text-[var(--text-muted)]">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-0.5 block bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-main)]"
            />
          </label>
          <label className="text-[10px] text-[var(--text-muted)] flex-1 min-w-[160px]">
            Search
            <div className="mt-0.5 flex items-center gap-2 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1.5">
              <Search size={12} className="text-[var(--text-muted-alt)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Soda, mill, type…"
                className="w-full bg-transparent outline-none text-xs text-[var(--text-main)]"
              />
            </div>
          </label>
          {partyKey && (
            <button
              type="button"
              onClick={() => loadStatement(partyKey)}
              className="self-end px-3 py-1.5 rounded bg-amber-500 text-black text-xs font-semibold"
            >
              Apply
            </button>
          )}
        </div>
        {stmtLoading ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">Loading ledger…</p>
        ) : !statement ? (
          <p className="p-8 text-center text-sm text-[var(--text-muted)]">
            Open a party ledger to see Date · Soda · Mill · Type · Debit · Credit · Balance
          </p>
        ) : stmtLines.length === 0 ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">No lines in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-xs">
              <thead>
                <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Soda / Deal No.</th>
                  <th className="px-3 py-2">Mill</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Narration</th>
                  <th className="px-3 py-2 text-right">Debit</th>
                  <th className="px-3 py-2 text-right">Credit</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {(statement.sodaGroups?.length
                  ? statement.sodaGroups
                  : [{ label: null, lines: stmtLines }]
                ).map((g: any, gi: number) => (
                  <React.Fragment key={g.sodaDealNo || g.label || gi}>
                    {g.label && (
                      <tr className="bg-[var(--bg-base)] border-b border-[var(--border-subtle)]">
                        <td
                          colSpan={8}
                          className="px-3 py-1.5 text-[11px] font-semibold text-amber-400"
                        >
                          {g.label}
                          {g.totalDebit != null && (
                            <span className="ml-2 font-normal text-[var(--text-muted)]">
                              Dr {fmtMoney(g.totalDebit)} · Cr {fmtMoney(g.totalCredit)}
                            </span>
                          )}
                        </td>
                      </tr>
                    )}
                    {(g.lines || []).map((r: any) => (
                      <tr
                        key={r.id}
                        className="border-b border-[var(--border-subtle-alt)] text-[var(--text-main)]"
                      >
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          {r.date ? new Date(r.date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-1.5 font-medium">{r.sodaDealNo || '—'}</td>
                        <td className="px-3 py-1.5">{r.millName}</td>
                        <td className="px-3 py-1.5">{r.transactionType}</td>
                        <td className="px-3 py-1.5 text-[var(--text-muted)] max-w-[220px] truncate">
                          {r.narration || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {r.debit ? fmtMoney(r.debit) : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {r.credit ? fmtMoney(r.credit) : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold text-amber-400">
                          {fmtMoney(r.runningBalance)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Download, Printer, Search, X } from 'lucide-react';
import { junctionApi } from '../../api/junction';
import { useUiStore } from '../../store/uiStore';
import { exportToExcel } from '../../utils/exportUtils';

const fmt = (n: number | null | undefined, d = 3) =>
  n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toFixed(d);

const fmtMoney = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const payLabel = (s: string) =>
  ({ CLEAR: 'Clear', UNDERWAY: 'Underway', NOT_CLEAR: 'Not Clear' } as Record<string, string>)[s] ||
  s;

const statusClass = (s: string) =>
  ({
    CLEAR: 'text-green-400 bg-green-500/10',
    UNDERWAY: 'text-amber-400 bg-amber-500/10',
    NOT_CLEAR: 'text-red-400/90 bg-red-500/10',
  } as Record<string, string>)[s] || 'text-[var(--text-muted)] bg-[var(--glass-bg)]';

const emptyData = {
  parties: [] as any[],
  sodas: [] as any[],
  rows: [] as any[],
  sections: [] as any[],
  summaries: [] as any[],
  grandTotal: 0,
  hasFilter: false,
  summaryLabel: 'Total Receivables',
};

const lineToExport = (r: any) => ({
  Mill: r.plantName,
  'A Soda Date': r.sodaDate ? new Date(r.sodaDate).toLocaleDateString() : '',
  'B Item': r.itemName,
  'C Party': r.partyName,
  'D Rate': r.isShift ? 'Shift' : r.rate,
  'E Qty': r.quantity,
  'F Order No': r.sodaNumber,
  'G Bill No': r.billNo,
  'H S.No': r.serialNo,
  'I GP Date': r.gpDate ? new Date(r.gpDate).toLocaleDateString() : '',
  'J Truck No': r.truckNo,
  'K GP': r.gpNo,
  'L Bags': r.bags,
  'M Bag Type': r.bagType,
  'N Bag Wt Consideration': r.bagWeightConsideration ? 'Yes' : 'No',
  'O Oil Result': r.oilResult,
  'P Oil After Cut': r.oilResultAfterCut,
  'Q Net Wt Mill': r.netWeightMill,
  'R Net Wt Party': r.netWeightParty,
  'S Lower Wt': r.lowerWeight,
  'T Wt Diff': r.weightDifference,
  'U Wt/Bag': r.weightPerBag,
  'V Rate': r.rateV,
  'W Bill Amount': r.billAmount,
  'X CD%': r.cdPercent,
  'Y Net Payment': r.netPayment,
  'Z Payment Status': payLabel(r.paymentStatus),
  'AA Note': r.note,
});

const summaryExportRow = (s: any, label: string) => ({
  Mill: '',
  'A Soda Date': '',
  'B Item': '',
  'C Party': s.partyName,
  'D Rate': '',
  'E Qty': '',
  'F Order No': s.sodaNumber,
  'G Bill No': '',
  'H S.No': '',
  'I GP Date': '',
  'J Truck No': '',
  'K GP': '',
  'L Bags': '',
  'M Bag Type': '',
  'N Bag Wt Consideration': '',
  'O Oil Result': '',
  'P Oil After Cut': '',
  'Q Net Wt Mill': '',
  'R Net Wt Party': '',
  'S Lower Wt': '',
  'T Wt Diff': '',
  'U Wt/Bag': '',
  'V Rate': '',
  'W Bill Amount': '',
  'X CD%': '',
  'Y Net Payment': s.totalNetPayment,
  'Z Payment Status': `Soda No. ${String(s.sodaNumber).padStart(2, '0')} — ${label}`,
  'AA Note': '',
});

export const JunctionReport: React.FC = () => {
  const addToast = useUiStore((s) => s.addToast);
  const [reportType, setReportType] = useState<'SALE' | 'PURCHASE'>('SALE');
  const [partyKey, setPartyKey] = useState('');
  const [financeSodaId, setFinanceSodaId] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [sodaSearch, setSodaSearch] = useState('');
  const [partyOpen, setPartyOpen] = useState(false);
  const [sodaOpen, setSodaOpen] = useState(false);
  const [data, setData] = useState<any>(emptyData);
  const [loading, setLoading] = useState(false);
  const partyRef = useRef<HTMLDivElement>(null);
  const sodaRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await junctionApi.report({
        reportType,
        partyKey: partyKey || undefined,
        financeSodaId: financeSodaId || undefined,
      });
      setData({ ...emptyData, ...res.data });
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to load junction report', 'error');
    } finally {
      setLoading(false);
    }
  }, [reportType, partyKey, financeSodaId, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!partyKey && !financeSodaId) return;
    const t = setInterval(() => load(), 8000);
    return () => clearInterval(t);
  }, [load, partyKey, financeSodaId]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (partyRef.current && !partyRef.current.contains(t)) setPartyOpen(false);
      if (sodaRef.current && !sodaRef.current.contains(t)) setSodaOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filteredParties = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    const list = data.parties || [];
    if (!q) return list;
    return list.filter((p: any) => p.name?.toLowerCase().includes(q));
  }, [data.parties, partySearch]);

  const filteredSodas = useMemo(() => {
    const q = sodaSearch.trim().toLowerCase();
    const list = data.sodas || [];
    if (!q) return list;
    return list.filter(
      (s: any) =>
        s.label?.toLowerCase().includes(q) ||
        String(s.sodaNumber).includes(q) ||
        s.partyName?.toLowerCase().includes(q) ||
        payLabel(s.paymentStatus).toLowerCase().includes(q),
    );
  }, [data.sodas, sodaSearch]);

  const selectedPartyName =
    (data.parties || []).find((p: any) => p.key === partyKey)?.name ||
    (data.sodas || []).find((s: any) => s.id === financeSodaId)?.partyName ||
    '';

  const selectedSoda = (data.sodas || []).find((s: any) => s.id === financeSodaId);

  const sections: any[] = data.sections?.length
    ? data.sections
    : (data.summaries || []).map((s: any) => ({
        ...s,
        rows: (data.rows || []).filter((r: any) => r.financeSodaId === s.financeSodaId),
      }));

  const orderLabel = reportType === 'SALE' ? 'Sale Order No.' : 'Purchase Order No.';
  const title = reportType === 'SALE' ? 'Sale Junction Sheet' : 'Purchase Junction Sheet';
  const summaryLabel =
    data.summaryLabel || (reportType === 'SALE' ? 'Total Receivables' : 'Total Payables');

  const clearFilters = () => {
    setPartyKey('');
    setFinanceSodaId('');
    setPartySearch('');
    setSodaSearch('');
  };

  const handleExport = () => {
    if (!data.hasFilter || (!sections.length && !data.rows?.length)) {
      addToast('Nothing to export — select Party or Soda first', 'error');
      return;
    }
    const out: any[] = [];
    for (const sec of sections) {
      for (const r of sec.rows || []) out.push(lineToExport(r));
      out.push(summaryExportRow(sec, summaryLabel));
    }
    out.push({
      ...summaryExportRow(
        { sodaNumber: '', partyName: selectedPartyName, totalNetPayment: data.grandTotal },
        `Grand ${summaryLabel}`,
      ),
      'Z Payment Status': `Grand ${summaryLabel}`,
    });
    exportToExcel(out, `${title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
    addToast('Exported', 'success');
  };

  const renderDataRow = (r: any) => (
    <tr key={r.id} className="border-b border-[var(--border-subtle-alt)] text-[var(--text-main)]">
      <td className="px-2 py-1.5 font-medium whitespace-nowrap">{r.plantName}</td>
      <td className="px-2 py-1.5 whitespace-nowrap">
        {r.sodaDate ? new Date(r.sodaDate).toLocaleDateString() : '—'}
      </td>
      <td className="px-2 py-1.5">{r.itemName}</td>
      <td className="px-2 py-1.5">{r.partyName}</td>
      <td className="px-2 py-1.5">{r.isShift ? 'Shift' : fmt(r.rate, 2)}</td>
      <td className="px-2 py-1.5">{r.quantity}</td>
      <td className="px-2 py-1.5 font-semibold">{r.sodaNumber}</td>
      <td className="px-2 py-1.5">{r.billNo || '—'}</td>
      <td className="px-2 py-1.5 text-amber-400 font-bold">{String(r.serialNo).padStart(2, '0')}</td>
      <td className="px-2 py-1.5 whitespace-nowrap">
        {r.gpDate ? new Date(r.gpDate).toLocaleDateString() : '—'}
      </td>
      <td className="px-2 py-1.5">{r.truckNo}</td>
      <td className="px-2 py-1.5">{r.gpNo}</td>
      <td className="px-2 py-1.5">{r.bags}</td>
      <td className="px-2 py-1.5">{r.bagType || '—'}</td>
      <td className="px-2 py-1.5">{r.bagWeightConsideration ? 'Yes' : 'No'}</td>
      <td className="px-2 py-1.5">{fmt(r.oilResult, 2)}</td>
      <td className="px-2 py-1.5">{fmt(r.oilResultAfterCut, 2)}</td>
      <td className="px-2 py-1.5">{fmt(r.netWeightMill)}</td>
      <td className="px-2 py-1.5">{fmt(r.netWeightParty)}</td>
      <td className="px-2 py-1.5 font-semibold text-amber-400">{fmt(r.lowerWeight)}</td>
      <td className="px-2 py-1.5">
        {r.weightDifference > 0 ? '+' : ''}
        {fmt(r.weightDifference)}
      </td>
      <td className="px-2 py-1.5">{fmt(r.weightPerBag)}</td>
      <td className="px-2 py-1.5">{fmt(r.rateV, 2)}</td>
      <td className="px-2 py-1.5">{fmtMoney(r.billAmount)}</td>
      <td className="px-2 py-1.5">{fmt(r.cdPercent, 2)}</td>
      <td className="px-2 py-1.5 font-semibold text-green-400">{fmtMoney(r.netPayment)}</td>
      <td className="px-2 py-1.5">
        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] ${statusClass(r.paymentStatus)}`}>
          {payLabel(r.paymentStatus)}
        </span>
      </td>
      <td className="px-2 py-1.5">{r.note || '—'}</td>
    </tr>
  );

  return (
    <div className="space-y-3 junction-report-print">
      {/* Compact toolbar — sheet is the hero */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h2 className="text-lg font-bold text-[var(--text-main)] shrink-0">Junction Report</h2>
          <div className="flex rounded-lg border border-[var(--border-subtle)] overflow-hidden text-sm">
            {(['SALE', 'PURCHASE'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setReportType(t);
                  clearFilters();
                  setPartyOpen(false);
                  setSodaOpen(false);
                }}
                className={`px-3 py-1.5 font-semibold ${
                  reportType === t
                    ? 'bg-amber-500 text-black'
                    : 'text-[var(--text-muted)] hover:bg-[var(--glass-bg)]'
                }`}
              >
                {t === 'SALE' ? 'Sale' : 'Purchase'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:bg-[var(--glass-bg)]"
          >
            <Download size={14} /> Export
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:bg-[var(--glass-bg)]"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Linked searchable filters — same pattern as Soda Deals */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-3 print:hidden">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="text-xs text-[var(--text-muted)]" ref={partyRef}>
            Party Name
            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => {
                  setPartyOpen((o) => !o);
                  setSodaOpen(false);
                  setPartySearch('');
                }}
                className="w-full min-h-[40px] flex items-center justify-between gap-2 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-left text-sm text-[var(--text-main)] hover:border-amber-500/50"
              >
                <span className={`truncate ${partyKey ? '' : 'text-[var(--text-muted)]'}`}>
                  {selectedPartyName || 'Select party…'}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  {partyKey && (
                    <span
                      role="button"
                      tabIndex={0}
                      title="Clear party"
                      className="p-0.5 rounded hover:bg-amber-500/20 text-amber-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPartyKey('');
                        setFinanceSodaId('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          setPartyKey('');
                          setFinanceSodaId('');
                        }
                      }}
                    >
                      <X size={14} />
                    </span>
                  )}
                  <ChevronDown
                    size={16}
                    className={`text-[var(--text-muted-alt)] transition-transform ${partyOpen ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>
              {partyOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)]">
                    <Search size={14} className="text-[var(--text-muted-alt)] shrink-0" />
                    <input
                      autoFocus
                      value={partySearch}
                      onChange={(e) => setPartySearch(e.target.value)}
                      placeholder="Search party…"
                      className="w-full bg-transparent outline-none text-sm text-[var(--text-main)]"
                    />
                  </div>
                  <ul className="max-h-52 overflow-y-auto py-1">
                    {filteredParties.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-[var(--text-muted)] italic">No parties</li>
                    ) : (
                      filteredParties.map((p: any) => (
                        <li key={p.key}>
                          <button
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-500/10 ${
                              partyKey === p.key ? 'bg-amber-500/10 text-amber-400' : 'text-[var(--text-main)]'
                            }`}
                            onClick={() => {
                              setPartyKey(p.key);
                              setFinanceSodaId((id) => {
                                const hit = (data.sodas || []).find((s: any) => s.id === id);
                                return hit && hit.partyKey === p.key ? id : '';
                              });
                              setPartyOpen(false);
                              setPartySearch('');
                            }}
                          >
                            <span className="block truncate font-medium">{p.name}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">{p.sodaCount} soda(s)</span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-[var(--text-muted)]" ref={sodaRef}>
            Soda Number <span className="font-normal opacity-70">(all statuses)</span>
            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => {
                  setSodaOpen((o) => !o);
                  setPartyOpen(false);
                  setSodaSearch('');
                }}
                className="w-full min-h-[40px] flex items-center justify-between gap-2 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-left text-sm text-[var(--text-main)] hover:border-amber-500/50"
              >
                <span className={`truncate min-w-0 ${financeSodaId ? '' : 'text-[var(--text-muted)]'}`}>
                  {selectedSoda ? selectedSoda.label : 'Select soda…'}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  {financeSodaId && (
                    <span
                      role="button"
                      tabIndex={0}
                      title="Clear soda"
                      className="p-0.5 rounded hover:bg-amber-500/20 text-amber-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFinanceSodaId('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          setFinanceSodaId('');
                        }
                      }}
                    >
                      <X size={14} />
                    </span>
                  )}
                  <ChevronDown
                    size={16}
                    className={`text-[var(--text-muted-alt)] transition-transform ${sodaOpen ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>
              {sodaOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)]">
                    <Search size={14} className="text-[var(--text-muted-alt)] shrink-0" />
                    <input
                      autoFocus
                      value={sodaSearch}
                      onChange={(e) => setSodaSearch(e.target.value)}
                      placeholder="Search soda / item / status…"
                      className="w-full bg-transparent outline-none text-sm text-[var(--text-main)]"
                    />
                  </div>
                  <ul className="max-h-52 overflow-y-auto py-1">
                    {filteredSodas.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-[var(--text-muted)] italic">No sodas</li>
                    ) : (
                      filteredSodas.map((s: any) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-500/10 ${
                              financeSodaId === s.id
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'text-[var(--text-main)]'
                            }`}
                            onClick={() => {
                              setFinanceSodaId(s.id);
                              if (s.partyKey) setPartyKey(s.partyKey);
                              setSodaOpen(false);
                              setSodaSearch('');
                            }}
                          >
                            <span className="block truncate font-medium">{s.label}</span>
                            <span className="flex items-center gap-2 mt-0.5">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[9px] ${statusClass(s.paymentStatus)}`}
                              >
                                {payLabel(s.paymentStatus)}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)]">{s.lineCount} line(s)</span>
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-[var(--text-muted)]">
          Linked filters — Party narrows sodas; picking a soda sets the party. Sheet spans all mills.
        </p>
      </div>

      <div className="hidden print:block text-lg font-bold mb-2">
        {title}
        {selectedPartyName ? ` — Party Name: ${selectedPartyName}` : ''}
      </div>

      {/* Sheet — primary surface */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-x-auto min-h-[360px]">
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-[var(--text-main)]">{title}</h3>
            {selectedPartyName && (
              <p className="text-xs text-[var(--text-muted)]">Party Name: {selectedPartyName}</p>
            )}
          </div>
          {data.hasFilter && (
            <div className="text-sm font-semibold text-green-400">
              {summaryLabel}: {fmtMoney(data.grandTotal)}
            </div>
          )}
        </div>

        {loading && !data.hasFilter ? (
          <p className="p-8 text-sm text-[var(--text-muted)]">Loading…</p>
        ) : !data.hasFilter ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <p className="text-sm font-medium text-[var(--text-main)]">
              Choose a Party or Soda above to build the junction sheet
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md">
              A–AA lines from every mill appear here, ordered by soda no. and serial.
            </p>
          </div>
        ) : sections.length === 0 ? (
          <p className="p-8 text-sm text-[var(--text-muted)]">No sodas match this filter.</p>
        ) : sections.every((s) => !(s.rows || []).length) ? (
          <p className="p-8 text-sm text-[var(--text-muted)]">
            No report lines for this filter (sodas without submitted Gate Passes).
          </p>
        ) : (
          <table className="min-w-[2200px] w-full text-[10px]">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] text-left">
                <th className="px-2 py-2">Mill</th>
                <th className="px-2 py-2">A Soda Date</th>
                <th className="px-2 py-2">B Item</th>
                <th className="px-2 py-2">C Party</th>
                <th className="px-2 py-2">D Rate</th>
                <th className="px-2 py-2">E Qty</th>
                <th className="px-2 py-2">F {orderLabel}</th>
                <th className="px-2 py-2">G Bill No.</th>
                <th className="px-2 py-2">H S.No</th>
                <th className="px-2 py-2">I Date</th>
                <th className="px-2 py-2">J Truck No.</th>
                <th className="px-2 py-2">K GP</th>
                <th className="px-2 py-2">L Bags</th>
                <th className="px-2 py-2">M Bag Type</th>
                <th className="px-2 py-2">N Bag Wt</th>
                <th className="px-2 py-2">O Oil</th>
                <th className="px-2 py-2">P After Cut</th>
                <th className="px-2 py-2">Q Mill Wt</th>
                <th className="px-2 py-2">R Party Wt</th>
                <th className="px-2 py-2">S Lower</th>
                <th className="px-2 py-2">T Diff</th>
                <th className="px-2 py-2">U /Bag</th>
                <th className="px-2 py-2">V Rate</th>
                <th className="px-2 py-2">W Bill Amt</th>
                <th className="px-2 py-2">X CD%</th>
                <th className="px-2 py-2">Y Net Payment</th>
                <th className="px-2 py-2">Z Status</th>
                <th className="px-2 py-2">AA Note</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((sec) => (
                <React.Fragment key={sec.financeSodaId}>
                  {(sec.rows || []).map(renderDataRow)}
                  <tr className="bg-amber-500/10 border-b border-[var(--border-subtle)] font-semibold">
                    <td className="px-2 py-2 text-[var(--text-main)]" colSpan={6}>
                      Soda No. {String(sec.sodaNumber).padStart(2, '0')}
                      <span className="text-[var(--text-muted)] font-normal text-[10px] ml-2">
                        {sec.itemName} · {payLabel(sec.paymentStatus)}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-amber-400">{sec.sodaNumber}</td>
                    <td className="px-2 py-2" colSpan={18} />
                    <td className="px-2 py-2 text-green-400 whitespace-nowrap">
                      {summaryLabel} {fmtMoney(sec.totalNetPayment)}
                    </td>
                    <td className="px-2 py-2" colSpan={2} />
                  </tr>
                </React.Fragment>
              ))}
              <tr className="bg-[var(--bg-base)] border-t-2 border-amber-500/40 font-bold">
                <td className="px-2 py-3 text-[var(--text-main)]" colSpan={25}>
                  Grand {summaryLabel}
                  {selectedPartyName ? ` — ${selectedPartyName}` : ''}
                </td>
                <td className="px-2 py-3 text-amber-400 whitespace-nowrap">{fmtMoney(data.grandTotal)}</td>
                <td className="px-2 py-3" colSpan={2} />
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .junction-report-print, .junction-report-print * { visibility: visible; }
          .junction-report-print { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

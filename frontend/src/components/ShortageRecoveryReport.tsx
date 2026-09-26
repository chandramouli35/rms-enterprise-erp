import React, { useState, useEffect, useMemo } from 'react';
import { Download, TrendingUp, TrendingDown, Printer } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import api from '../api/axios';
import { exportToExcel } from '../utils/exportUtils';
import { useAuthStore } from '../store/authStore';

const CHART_COLORS = ['#e67e00', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#14b8a6'];

type ViewMode = 'ledger' | 'daily';
type LedgerMode = 'mandi' | 'artia';

type TrendInfo = { name: string; increasing: boolean; deltaQtl: number; totalQtl: number };

type BalSlice = { balanceQtl: number; balanceBags: number };

function dayBefore(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function indexBalances(rows: any[]) {
  const byArtiaMandi: Record<string, BalSlice> = {};
  const byArtiaKey: Record<string, BalSlice> = {};
  const byArtiaName: Record<string, BalSlice> = {};
  const byMandi: Record<string, BalSlice> = {};

  rows.forEach((b) => {
    const qtl = Number(b.balanceQtl) || 0;
    const bags = Number(b.balanceBags) || 0;
    const artia = b.artia || 'Walk-in';
    const mandi = b.mandi || '-';
    const artiaKey = `${b.supplierId || artia}`;

    const amKey = `${artia}|${mandi}`;
    if (!byArtiaMandi[amKey]) byArtiaMandi[amKey] = { balanceQtl: 0, balanceBags: 0 };
    byArtiaMandi[amKey].balanceQtl += qtl;
    byArtiaMandi[amKey].balanceBags += bags;

    if (!byArtiaKey[artiaKey]) byArtiaKey[artiaKey] = { balanceQtl: 0, balanceBags: 0 };
    byArtiaKey[artiaKey].balanceQtl += qtl;
    byArtiaKey[artiaKey].balanceBags += bags;

    if (!byArtiaName[artia]) byArtiaName[artia] = { balanceQtl: 0, balanceBags: 0 };
    byArtiaName[artia].balanceQtl += qtl;
    byArtiaName[artia].balanceBags += bags;

    if (!byMandi[mandi]) byMandi[mandi] = { balanceQtl: 0, balanceBags: 0 };
    byMandi[mandi].balanceQtl += qtl;
    byMandi[mandi].balanceBags += bags;
  });

  const roundMap = (m: Record<string, BalSlice>) => {
    Object.keys(m).forEach((k) => {
      m[k].balanceQtl = parseFloat(m[k].balanceQtl.toFixed(2));
      m[k].balanceBags = parseFloat(m[k].balanceBags.toFixed(2));
    });
    return m;
  };

  return {
    byArtiaMandi: roundMap(byArtiaMandi),
    byArtiaKey: roundMap(byArtiaKey),
    byArtiaName: roundMap(byArtiaName),
    byMandi: roundMap(byMandi),
  };
}

function TrendBadge({ trend }: { trend?: TrendInfo | null }) {
  if (!trend) return null;
  const up = trend.increasing;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
        up ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
      }`}
      title={`14-day trend: ${up ? 'increasing' : 'decreasing'} (${trend.deltaQtl > 0 ? '+' : ''}${trend.deltaQtl} qtl)`}
    >
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? 'Increasing' : 'Decreasing'}
      {` ${trend.deltaQtl > 0 ? '+' : ''}${trend.deltaQtl} qtl`}
    </span>
  );
}

export default function ShortageRecoveryReport({ activePlant }: { activePlant: any }) {
  const user = useAuthStore((s) => s.user);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const [view, setView] = useState<ViewMode>('daily');
  const [ledgerMode, setLedgerMode] = useState<LedgerMode>('artia');
  const [selectedArtiaKey, setSelectedArtiaKey] = useState('');
  const [selectedMandi, setSelectedMandi] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [daily, setDaily] = useState<any>(null);
  const [trend, setTrend] = useState<any>(null);
  const [entityTrend, setEntityTrend] = useState<any>(null);
  const [openingBalances, setOpeningBalances] = useState<any[]>([]);
  const [closingBalances, setClosingBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: monthStart,
    dateTo: today,
    reportDate: today,
  });

  const fetchLedger = async () => {
    const params = new URLSearchParams();
    if (activePlant?.id) params.append('plantId', activePlant.id);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    const res = await api.get(`/api/procurement/reports/shortage-summary?${params.toString()}`);
    setData(Array.isArray(res.data) ? res.data : []);
  };

  const [submitting, setSubmitting] = useState(false);

  const fetchDaily = async () => {
    const res = await api.get(`/api/procurement/reports/shortage-daily?date=${filters.reportDate}`);
    setDaily(res.data);
  };

  const handleSubmitDaily = async () => {
    setSubmitting(true);
    try {
      await api.post('/api/procurement/reports/shortage-daily/submit', {
        date: filters.reportDate,
        plantId: 'global',
        submittedBy: user?.username || 'Supervisor',
        source: 'MANUAL',
      });
      await fetchDaily();
    } catch (err) {
      console.error('Submit daily shortage failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchTrend = async () => {
    const res = await api.get('/api/procurement/reports/shortage-mill-trend?days=14');
    setTrend(res.data);
  };

  const fetchEntityTrend = async () => {
    const params = new URLSearchParams();
    params.append('groupBy', ledgerMode);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (!filters.dateFrom && !filters.dateTo) params.append('days', '14');
    const res = await api.get(`/api/procurement/reports/shortage-entity-trend?${params.toString()}`);
    setEntityTrend(res.data);
  };

  const fetchBalances = async () => {
    const closingAsOf = filters.dateTo || today;
    // Opening = balance at start of Start Date = till-date as of day before Start Date
    const openingAsOf = filters.dateFrom ? dayBefore(filters.dateFrom) : null;

    const closingRes = await api.get(
      `/api/procurement/reports/shortage-artia-balances?asOf=${closingAsOf}`,
    );
    setClosingBalances(Array.isArray(closingRes.data) ? closingRes.data : []);

    if (openingAsOf) {
      const openingRes = await api.get(
        `/api/procurement/reports/shortage-artia-balances?asOf=${openingAsOf}`,
      );
      setOpeningBalances(Array.isArray(openingRes.data) ? openingRes.data : []);
    } else {
      setOpeningBalances([]);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const jobs: Promise<any>[] = [fetchTrend()];
      if (view === 'ledger') {
        jobs.push(fetchLedger());
        jobs.push(fetchEntityTrend());
        jobs.push(fetchBalances());
      }
      if (view === 'daily') jobs.push(fetchDaily());
      await Promise.all(jobs);
    } catch (err) {
      console.error('Shortage report fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [activePlant, filters, view, ledgerMode]);

  const handlePunchRecovery = async (detailsId: string, value: string) => {
    const val = parseFloat(value);
    if (isNaN(val) || !detailsId) return;
    try {
      await api.patch(`/api/procurement/inward-details/${detailsId}/shortage-recovery`, {
        shortageRecoveryQtl: val,
      });
      fetchLedger();
      fetchBalances();
    } catch (err) {
      console.error('Error updating shortage recovery', err);
    }
  };

  const recoveryByDetails = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((row) => {
      if (!row.detailsId) return;
      if (row.direction === 'CREDIT') {
        map[row.detailsId] = (map[row.detailsId] || 0) + (Number(row.amountQtl) || 0);
      }
    });
    return map;
  }, [data]);

  /** Client-side date range safety net (applies to Mandi & Artia views). */
  const rangedData = useMemo(() => {
    if (!filters.dateFrom && !filters.dateTo) return data;
    const fromMs = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : null;
    const toMs = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`).getTime() : null;
    return data.filter((row) => {
      const t = new Date(row.date).getTime();
      if (Number.isNaN(t)) return false;
      if (fromMs != null && t < fromMs) return false;
      if (toMs != null && t > toMs) return false;
      return true;
    });
  }, [data, filters.dateFrom, filters.dateTo]);

  const dateRangeLabel =
    filters.dateFrom || filters.dateTo
      ? `${filters.dateFrom || '…'} → ${filters.dateTo || '…'}`
      : 'All dates';

  const openingAsOfLabel = filters.dateFrom
    ? dayBefore(filters.dateFrom)
    : null;
  const closingAsOfLabel = filters.dateTo || today;

  const trendByName = useMemo(() => {
    const map: Record<string, TrendInfo> = {};
    (entityTrend?.trends || []).forEach((t: TrendInfo) => {
      map[t.name] = t;
    });
    return map;
  }, [entityTrend]);

  const openingIdx = useMemo(() => indexBalances(openingBalances), [openingBalances]);
  const closingIdx = useMemo(() => indexBalances(closingBalances), [closingBalances]);

  const artiaClusters = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        artia: string;
        mandis: Set<string>;
        entries: any[];
        debitQtl: number;
        creditQtl: number;
      }
    >();
    rangedData.forEach((row) => {
      const artia = row.supplierName || 'Walk-in';
      const mandi = row.mandiName || '-';
      const key = `${row.supplierId || artia}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          artia,
          mandis: new Set(),
          entries: [],
          debitQtl: 0,
          creditQtl: 0,
        });
      }
      const g = map.get(key)!;
      g.mandis.add(mandi);
      g.entries.push(row);
      const amt = Number(row.amountQtl) || 0;
      if (row.direction === 'CREDIT') g.creditQtl += amt;
      else g.debitQtl += amt;
    });

    // Include artias that have opening/closing balance even with no period entries
    const ensureKey = (key: string, artia: string, mandi?: string) => {
      if (!map.has(key)) {
        map.set(key, {
          key,
          artia,
          mandis: new Set(),
          entries: [],
          debitQtl: 0,
          creditQtl: 0,
        });
      }
      if (mandi) map.get(key)!.mandis.add(mandi);
    };
    [...openingBalances, ...closingBalances].forEach((b) => {
      const artia = b.artia || 'Walk-in';
      ensureKey(`${b.supplierId || artia}`, artia, b.mandi || '-');
    });

    return Array.from(map.values())
      .map((g) => {
        const open =
          openingIdx.byArtiaKey[g.key] ||
          openingIdx.byArtiaName[g.artia] ||
          { balanceQtl: 0, balanceBags: 0 };
        const close =
          closingIdx.byArtiaKey[g.key] ||
          closingIdx.byArtiaName[g.artia] ||
          { balanceQtl: 0, balanceBags: 0 };

        // If no opening snapshot (no Start Date), opening = 0
        const openingQtl = filters.dateFrom ? open.balanceQtl : 0;
        const openingBags = filters.dateFrom ? open.balanceBags : 0;
        let closingQtl = close.balanceQtl;
        let closingBags = close.balanceBags;
        // Fallback: opening + period net when closing API empty
        if (!closingQtl && !closingBags && (g.debitQtl || g.creditQtl || openingQtl)) {
          closingQtl = parseFloat((openingQtl + g.debitQtl - g.creditQtl).toFixed(2));
        }

        return {
          ...g,
          mandiList: Array.from(g.mandis).sort(),
          debitQtl: parseFloat(g.debitQtl.toFixed(2)),
          creditQtl: parseFloat(g.creditQtl.toFixed(2)),
          openingQtl: parseFloat(Number(openingQtl).toFixed(2)),
          openingBags: parseFloat(Number(openingBags).toFixed(2)),
          closingQtl: parseFloat(Number(closingQtl).toFixed(2)),
          closingBags: parseFloat(Number(closingBags).toFixed(2)),
          // keep pending alias = closing for older UI bits
          pendingQtl: parseFloat(Number(closingQtl).toFixed(2)),
          pendingBags: parseFloat(Number(closingBags).toFixed(2)),
          trend: trendByName[g.artia],
        };
      })
      .filter(
        (g) =>
          g.entries.length > 0 ||
          Math.abs(g.openingQtl) > 0.001 ||
          Math.abs(g.closingQtl) > 0.001,
      )
      .sort((a, b) => a.artia.localeCompare(b.artia));
  }, [
    rangedData,
    openingBalances,
    closingBalances,
    openingIdx,
    closingIdx,
    trendByName,
    filters.dateFrom,
  ]);

  /** Artia picker — options from date-ranged ledger + opening/closing. */
  const artiaOptions = useMemo(() => {
    return artiaClusters.map((c) => ({
      key: c.key,
      artia: c.artia,
      pendingQtl: c.closingQtl,
      pendingBags: c.closingBags,
      openingQtl: c.openingQtl,
      closingQtl: c.closingQtl,
      mandis: c.mandiList,
    }));
  }, [artiaClusters]);

  const selectedArtiaDetail = useMemo(() => {
    if (!selectedArtiaKey) return null;
    const cluster = artiaClusters.find((c) => c.key === selectedArtiaKey);
    if (cluster) {
      const balanceRows = closingBalances.filter(
        (b) =>
          `${b.supplierId || b.artia}` === selectedArtiaKey ||
          b.artia === cluster.artia,
      );
      const openingRows = openingBalances.filter(
        (b) =>
          `${b.supplierId || b.artia}` === selectedArtiaKey ||
          b.artia === cluster.artia,
      );
      return { ...cluster, balanceRows, openingRows };
    }
    const opt = artiaOptions.find((o) => o.key === selectedArtiaKey);
    if (!opt) return null;
    const balanceRows = closingBalances.filter(
      (b) => `${b.supplierId || b.artia}` === selectedArtiaKey || b.artia === opt.artia,
    );
    const openingRows = openingBalances.filter(
      (b) => `${b.supplierId || b.artia}` === selectedArtiaKey || b.artia === opt.artia,
    );
    return {
      key: opt.key,
      artia: opt.artia,
      mandis: new Set(opt.mandis),
      mandiList: opt.mandis,
      entries: [] as any[],
      debitQtl: 0,
      creditQtl: 0,
      openingQtl: opt.openingQtl || 0,
      openingBags: 0,
      closingQtl: opt.closingQtl || 0,
      closingBags: 0,
      pendingQtl: opt.closingQtl || 0,
      pendingBags: 0,
      trend: trendByName[opt.artia],
      balanceRows,
      openingRows,
    };
  }, [
    selectedArtiaKey,
    artiaClusters,
    artiaOptions,
    closingBalances,
    openingBalances,
    trendByName,
  ]);

  const displayedArtiaClusters = useMemo(() => {
    if (!selectedArtiaKey) return artiaClusters;
    return selectedArtiaDetail ? [selectedArtiaDetail] : [];
  }, [selectedArtiaKey, artiaClusters, selectedArtiaDetail]);

  const mandiClusters = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        mandi: string;
        entries: any[];
        debitQtl: number;
        creditQtl: number;
        artias: Set<string>;
      }
    >();
    rangedData.forEach((row) => {
      const mandi = row.mandiName || 'Unknown Mandi';
      if (!map.has(mandi)) {
        map.set(mandi, {
          key: mandi,
          mandi,
          entries: [],
          debitQtl: 0,
          creditQtl: 0,
          artias: new Set(),
        });
      }
      const g = map.get(mandi)!;
      g.entries.push(row);
      g.artias.add(row.supplierName || 'Walk-in');
      const amt = Number(row.amountQtl) || 0;
      if (row.direction === 'CREDIT') g.creditQtl += amt;
      else g.debitQtl += amt;
    });

    [...openingBalances, ...closingBalances].forEach((b) => {
      const mandi = b.mandi || '-';
      if (!map.has(mandi)) {
        map.set(mandi, {
          key: mandi,
          mandi,
          entries: [],
          debitQtl: 0,
          creditQtl: 0,
          artias: new Set(),
        });
      }
      map.get(mandi)!.artias.add(b.artia || 'Walk-in');
    });

    return Array.from(map.values())
      .map((g) => {
        const open = openingIdx.byMandi[g.mandi] || { balanceQtl: 0, balanceBags: 0 };
        const close = closingIdx.byMandi[g.mandi] || { balanceQtl: 0, balanceBags: 0 };
        const openingQtl = filters.dateFrom ? open.balanceQtl : 0;
        const openingBags = filters.dateFrom ? open.balanceBags : 0;
        let closingQtl = close.balanceQtl;
        let closingBags = close.balanceBags;
        if (!closingQtl && !closingBags && (g.debitQtl || g.creditQtl || openingQtl)) {
          closingQtl = parseFloat((openingQtl + g.debitQtl - g.creditQtl).toFixed(2));
        }
        return {
          ...g,
          artiaList: Array.from(g.artias).sort(),
          debitQtl: parseFloat(g.debitQtl.toFixed(2)),
          creditQtl: parseFloat(g.creditQtl.toFixed(2)),
          openingQtl: parseFloat(Number(openingQtl).toFixed(2)),
          openingBags: parseFloat(Number(openingBags).toFixed(2)),
          closingQtl: parseFloat(Number(closingQtl).toFixed(2)),
          closingBags: parseFloat(Number(closingBags).toFixed(2)),
          pendingQtl: parseFloat(Number(closingQtl).toFixed(2)),
          pendingBags: parseFloat(Number(closingBags).toFixed(2)),
          trend: trendByName[g.mandi],
        };
      })
      .filter(
        (g) =>
          g.entries.length > 0 ||
          Math.abs(g.openingQtl) > 0.001 ||
          Math.abs(g.closingQtl) > 0.001,
      )
      .sort((a, b) => a.mandi.localeCompare(b.mandi));
  }, [
    rangedData,
    openingBalances,
    closingBalances,
    openingIdx,
    closingIdx,
    trendByName,
    filters.dateFrom,
  ]);

  const displayedMandiClusters = useMemo(() => {
    if (!selectedMandi) return mandiClusters;
    return mandiClusters.filter((c) => c.mandi === selectedMandi);
  }, [mandiClusters, selectedMandi]);

  useEffect(() => {
    if (selectedArtiaKey && !artiaOptions.some((o) => o.key === selectedArtiaKey)) {
      setSelectedArtiaKey('');
    }
  }, [artiaOptions, selectedArtiaKey]);

  useEffect(() => {
    if (selectedMandi && !mandiClusters.some((c) => c.mandi === selectedMandi)) {
      setSelectedMandi('');
    }
  }, [mandiClusters, selectedMandi]);

  const handleExport = () => {
    if (view === 'daily' && daily?.columns) {
      const exportData: any[] = [];
      daily.columns.forEach((col: any) => {
        col.rows.forEach((r: any) => {
          exportData.push({
            Date: daily.date,
            Mill: col.label,
            'S.No': r.sno,
            Artia: r.artia,
            Mandi: r.mandi,
            'Shortage Quintals': r.shortageQtl,
            'Shortage Bags': r.shortageBags,
          });
        });
        exportData.push({
          Date: daily.date,
          Mill: col.label,
          'S.No': '',
          Artia: 'TOTAL',
          Mandi: '',
          'Shortage Quintals': col.totalQtl,
          'Shortage Bags': col.totalBags,
        });
      });
      exportToExcel(exportData, `Shortage_Daily_${daily.date}`);
      return;
    }

    if (view === 'ledger' && ledgerMode === 'artia') {
      const exportData: any[] = [];
      artiaClusters.forEach((c) => {
        c.entries.forEach((row) => {
          exportData.push({
            Artia: c.artia,
            Mandi: row.mandiName,
            Date: new Date(row.date).toLocaleDateString(),
            Mill: row.millName,
            Truck: row.truckNo,
            Type: row.entryType || row.direction,
            'Amount Qtl': row.amountQtl,
            Narration: row.shortageNarration,
            'Opening Qtl': c.openingQtl,
            'Closing Qtl': c.closingQtl ?? c.pendingQtl,
            Trend: c.trend
              ? `${c.trend.increasing ? 'Increasing' : 'Decreasing'} (${c.trend.deltaQtl})`
              : '',
          });
        });
      });
      exportToExcel(exportData, `Shortage_Artia_Wise`);
      return;
    }

    if (view === 'ledger' && ledgerMode === 'mandi') {
      const exportData: any[] = [];
      displayedMandiClusters.forEach((c) => {
        c.entries.forEach((row) => {
          exportData.push({
            Mandi: c.mandi,
            Artia: row.supplierName,
        Date: new Date(row.date).toLocaleDateString(),
        Mill: row.millName,
        Truck: row.truckNo,
            Type: row.entryType || row.direction,
        'Amount Qtl': row.amountQtl,
        Narration: row.shortageNarration,
            'Opening Qtl': c.openingQtl,
            'Closing Qtl': c.closingQtl ?? c.pendingQtl,
            Trend: c.trend
              ? `${c.trend.increasing ? 'Increasing' : 'Decreasing'} (${c.trend.deltaQtl})`
              : '',
          });
        });
      });
      exportToExcel(exportData, `Shortage_Mandi_Wise`);
      return;
    }
  };

  const esc = (v: any) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const formatTrendLabel = (t?: TrendInfo | null) => {
    if (!t) return '—';
    return `${t.increasing ? 'Increasing' : 'Decreasing'} (${t.deltaQtl > 0 ? '+' : ''}${t.deltaQtl} qtl)`;
  };

  const entryTableRowsHtml = (entries: any[], cols: ('artia' | 'mandi')[]) =>
    entries
      .map((row) => {
        const cells = [
          `<td>${esc(new Date(row.date).toLocaleDateString())}</td>`,
          `<td>${esc(row.millName)}</td>`,
          cols.includes('artia') ? `<td>${esc(row.supplierName)}</td>` : '',
          cols.includes('mandi') ? `<td>${esc(row.mandiName)}</td>` : '',
          `<td>${esc(row.millGp)}</td>`,
          `<td>${esc(row.truckNo)}</td>`,
          `<td>${esc(row.entryType || row.direction)}</td>`,
          `<td class="num">${Number(row.amountQtl || 0).toFixed(2)}</td>`,
          `<td class="num">${Number(row.amountBags || 0).toFixed(2)}</td>`,
          `<td>${esc(row.shortageNarration || '-')}</td>`,
        ]
          .filter(Boolean)
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

  /** Print all clusters in one document (Artia-wise full detail, or Mandi-wise with every Artia under each Mandi). */
  const handlePrint = () => {
    if (view !== 'ledger') return;

    const plantLabel = activePlant?.name || 'All Plants';
    const rangeLabel = dateRangeLabel;
    const printedAt = new Date().toLocaleString();

    const styles = `
      @page { size: A4 landscape; margin: 10mm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; padding: 12px; }
      h1 { font-size: 16px; margin: 0 0 4px; }
      .meta { font-size: 11px; color: #555; margin-bottom: 14px; }
      .cluster { border: 1px solid #ccc; border-radius: 6px; margin-bottom: 14px; page-break-inside: avoid; overflow: hidden; }
      .cluster-h { background: #fff7ed; border-bottom: 2px solid #e67e00; padding: 8px 10px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
      .cluster-h.mandi { background: #eff6ff; border-bottom-color: #3b82f6; }
      .cluster-h h2 { font-size: 13px; margin: 0; }
      .cluster-h .sub { font-size: 10px; color: #666; margin-top: 2px; }
      .stats { text-align: right; font-size: 11px; }
      .stats strong { color: #b45309; }
      .artia-block { border-top: 1px dashed #ddd; }
      .artia-h { background: #f9fafb; padding: 6px 10px; font-weight: 700; font-size: 11px; border-bottom: 1px solid #e5e7eb; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 4px 6px; text-align: left; vertical-align: top; }
      th { background: #f3f4f6; font-size: 9px; text-transform: uppercase; color: #555; }
      td.num { text-align: right; font-family: ui-monospace, monospace; }
      .foot { background: #f9fafb; font-weight: 700; }
      .empty { text-align: center; padding: 24px; color: #888; }
      @media print { body { padding: 0; } .cluster { break-inside: avoid; } }
    `;

    let bodyHtml = '';

    if (ledgerMode === 'artia') {
      const clustersToPrint =
        selectedArtiaKey && selectedArtiaDetail
          ? [selectedArtiaDetail]
          : artiaClusters;
      if (!clustersToPrint.length) {
        bodyHtml = `<p class="empty">No Artia-wise shortage entries to print.</p>`;
      } else {
        bodyHtml = clustersToPrint
          .map((c) => {
            const trend = formatTrendLabel(c.trend);
            return `
            <div class="cluster">
              <div class="cluster-h">
                <div>
                  <h2>Artia: ${esc(c.artia)}</h2>
                  <div class="sub">Mandi: ${esc(c.mandiList.join(', ') || '—')} · Trend: ${esc(trend)}</div>
                </div>
                <div class="stats">
                  Opening ${Number(c.openingQtl || 0).toFixed(2)} · Debit ${c.debitQtl.toFixed(2)} · Credit ${c.creditQtl.toFixed(2)}<br/>
                  <strong>Closing: ${Number(c.closingQtl ?? c.pendingQtl).toFixed(2)} qtl${
                    c.closingBags || c.pendingBags
                      ? ` / ${Number(c.closingBags ?? c.pendingBags).toFixed(2)} bags`
                      : ''
                  }</strong>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Mill</th><th>Mandi</th><th>Mill GP</th><th>Truck</th>
                    <th>Type</th><th>Qtl</th><th>Bags</th><th>Narration</th>
                  </tr>
                </thead>
                <tbody>
                  ${entryTableRowsHtml(c.entries, ['mandi']) || '<tr><td colspan="9" class="empty">No entries</td></tr>'}
                  <tr class="foot">
                    <td colspan="6" style="text-align:right">Opening ${Number(c.openingQtl || 0).toFixed(2)} → Closing</td>
                    <td class="num">${Number(c.closingQtl ?? c.pendingQtl).toFixed(2)}</td>
                    <td colspan="2">as of ${esc(closingAsOfLabel)}</td>
                  </tr>
                </tbody>
              </table>
            </div>`;
          })
          .join('');
      }
    } else {
      // Mandi-wise: every Artia under that Mandi included (respects date range + Mandi select)
      const clustersToPrint = displayedMandiClusters;
      if (!clustersToPrint.length) {
        bodyHtml = `<p class="empty">No Mandi-wise shortage entries to print for ${esc(dateRangeLabel)}.</p>`;
      } else {
        bodyHtml = clustersToPrint
          .map((c) => {
            const byArtia = new Map<string, any[]>();
            c.entries.forEach((row: any) => {
              const name = row.supplierName || 'Walk-in';
              if (!byArtia.has(name)) byArtia.set(name, []);
              byArtia.get(name)!.push(row);
            });
            // Ensure every artia listed on the cluster appears even if somehow empty
            c.artiaList.forEach((name: string) => {
              if (!byArtia.has(name)) byArtia.set(name, []);
            });
            const artiaBlocks = Array.from(byArtia.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([artiaName, entries]) => {
                let debit = 0;
                let credit = 0;
                entries.forEach((row) => {
                  const amt = Number(row.amountQtl) || 0;
                  if (row.direction === 'CREDIT') credit += amt;
                  else debit += amt;
                });
                const balKey = `${artiaName}|${c.mandi}`;
                const openBal = openingIdx.byArtiaMandi[balKey];
                const closeBal = closingIdx.byArtiaMandi[balKey];
                const opening = openBal ? openBal.balanceQtl : 0;
                const closing = closeBal
                  ? closeBal.balanceQtl
                  : parseFloat((opening + debit - credit).toFixed(2));
                const artiaTrend = trendByName[artiaName];
                return `
                <div class="artia-block">
                  <div class="artia-h">
                    Artia: ${esc(artiaName)}
                    · Opening ${Number(opening).toFixed(2)}
                    · Debit ${debit.toFixed(2)} · Credit ${credit.toFixed(2)}
                    · Closing ${Number(closing).toFixed(2)} qtl
                    · Trend: ${esc(formatTrendLabel(artiaTrend))}
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th><th>Mill</th><th>Mill GP</th><th>Truck</th>
                        <th>Type</th><th>Qtl</th><th>Bags</th><th>Narration</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${entryTableRowsHtml(entries, []) || '<tr><td colspan="8" class="empty">No entries</td></tr>'}
                    </tbody>
                  </table>
                </div>`;
              })
              .join('');

            return `
            <div class="cluster">
              <div class="cluster-h mandi">
                <div>
                  <h2>Mandi: ${esc(c.mandi)}</h2>
                  <div class="sub">
                    All Artias (${c.artiaList.length}): ${esc(c.artiaList.join(', ') || '—')}
                    · Mandi trend: ${esc(formatTrendLabel(c.trend))}
                  </div>
                </div>
                <div class="stats">
                  Opening ${Number(c.openingQtl || 0).toFixed(2)} · Debit ${c.debitQtl.toFixed(2)} · Credit ${c.creditQtl.toFixed(2)}<br/>
                  <strong>Closing: ${Number(c.closingQtl ?? c.pendingQtl).toFixed(2)} qtl${
                    c.closingBags || c.pendingBags
                      ? ` / ${Number(c.closingBags ?? c.pendingBags).toFixed(2)} bags`
                      : ''
                  }</strong>
                </div>
              </div>
              ${artiaBlocks}
              <table>
                <tbody>
                  <tr class="foot">
                    <td style="padding:6px 10px;text-align:right">
                      Opening ${Number(c.openingQtl || 0).toFixed(2)} → Closing ${Number(c.closingQtl ?? c.pendingQtl).toFixed(2)} qtl
                      (as of ${esc(closingAsOfLabel)})
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>`;
          })
          .join('');
      }
    }

    const title =
      ledgerMode === 'artia'
        ? 'Shortage Report — Artia wise (all detail)'
        : 'Shortage Report — Mandi wise (all Artias per Mandi)';

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${esc(title)}</title>
<style>${styles}</style></head><body>
  <h1>${esc(title)}</h1>
  <div class="meta">Plant: ${esc(plantLabel)} · Period: ${esc(rangeLabel)} · Printed: ${esc(printedAt)}</div>
  ${bodyHtml}
</body></html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    }
  };

  const renderEntryRows = (entries: any[], showArtia: boolean, showMandi: boolean) =>
    entries.map((row, idx) => (
      <tr key={row.id || idx} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-muted)]">
        <td className="px-3 py-2 text-sm whitespace-nowrap">
          {new Date(row.date).toLocaleDateString()}
        </td>
        <td className="px-3 py-2 text-sm">{row.millName}</td>
        {showArtia && <td className="px-3 py-2 text-sm font-medium">{row.supplierName}</td>}
        {showMandi && <td className="px-3 py-2 text-sm">{row.mandiName}</td>}
        <td className="px-3 py-2 text-xs font-mono">{row.millGp}</td>
        <td className="px-3 py-2 text-sm font-mono">{row.truckNo}</td>
        <td className="px-3 py-2 text-xs">
          <span
            className={`px-1.5 py-0.5 rounded font-bold ${
              row.direction === 'CREDIT'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-red-500/15 text-red-400'
            }`}
          >
            {row.entryType || row.direction}
          </span>
        </td>
        <td className="px-3 py-2 text-sm text-right font-mono">
          {Number(row.amountQtl || 0).toFixed(2)}
        </td>
        <td className="px-3 py-2 text-sm text-right font-mono">
          {Number(row.amountBags || 0).toFixed(2)}
        </td>
        <td className="px-3 py-2">
          {row.direction === 'DEBIT' && row.detailsId ? (
            <input
              type="number"
              step="0.01"
              key={`${row.detailsId}-${recoveryByDetails[row.detailsId] || 0}`}
              defaultValue={recoveryByDetails[row.detailsId] || 0}
              onBlur={(e) => {
                if (parseFloat(e.target.value) !== (recoveryByDetails[row.detailsId] || 0)) {
                  handlePunchRecovery(row.detailsId, e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="w-24 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1 text-right outline-none focus:border-[#e67e00]"
              title="Total recovery for this inward (auto credits + manual)"
            />
          ) : (
            <span className="text-[var(--text-muted-alt)] text-xs">—</span>
          )}
        </td>
        <td
          className="px-3 py-2 text-xs text-[var(--text-main)] font-medium max-w-[220px]"
          title={row.shortageNarration}
        >
          {row.shortageNarration || '-'}
        </td>
      </tr>
    ));

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-main)]">Shortage Report</h2>
          <p className="text-xs text-[var(--text-muted-alt)]">
            Daily consolidated · Mandi and Artia wise (evening submit / 7:05 PM cron / GP finalize)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {view === 'daily' && (
            <button
              onClick={handleSubmitDaily}
              disabled={submitting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              title="Freeze / submit evening daily shortage report"
            >
              {submitting ? 'Submitting...' : 'Submit Daily Report'}
            </button>
          )}
          {view === 'ledger' && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-main)] px-3 py-1.5 rounded-lg text-sm font-medium hover:border-[#e67e00] transition-colors"
              title={
                ledgerMode === 'artia'
                  ? 'Print all Artia-wise detail in one document'
                  : 'Print Mandi-wise report including every Artia under each Mandi'
              }
            >
              <Printer size={16} />
              Print
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-[#e67e00] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#cc7000] transition-colors"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['daily', 'Daily Consolidated'],
            ['ledger', 'Mandi and Artia wise'],
          ] as [ViewMode, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
              view === key
                ? 'bg-[#e67e00]/15 border-[#e67e00] text-[#e67e00]'
                : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        {view === 'daily' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-muted-alt)]">As of / Report Date</label>
            <input
              type="date"
              value={filters.reportDate}
              onChange={(e) => setFilters((p) => ({ ...p, reportDate: e.target.value }))}
              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-main)] px-3 py-1.5 rounded text-sm outline-none focus:border-[#e67e00]"
            />
          </div>
        )}
        {view === 'ledger' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted-alt)]">View as</label>
              <div className="flex gap-1">
                {(
                  [
                    ['artia', 'Artia wise'],
                    ['mandi', 'Mandi wise'],
                  ] as [LedgerMode, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setLedgerMode(key);
                      if (key !== 'artia') setSelectedArtiaKey('');
                      if (key !== 'mandi') setSelectedMandi('');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                      ledgerMode === key
                        ? 'bg-[#e67e00] border-[#e67e00] text-white'
                        : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {ledgerMode === 'artia' && (
              <div className="flex flex-col gap-1 min-w-[220px]">
                <label className="text-xs text-[var(--text-muted-alt)]">Select Artia</label>
                <select
                  value={selectedArtiaKey}
                  onChange={(e) => setSelectedArtiaKey(e.target.value)}
                  className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-main)] px-3 py-1.5 rounded text-sm outline-none focus:border-[#e67e00] min-w-[220px]"
                >
                  <option value="">All Artias</option>
                  {artiaOptions.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.artia}
                      {o.closingQtl || o.pendingQtl
                        ? ` (close ${Number(o.closingQtl || o.pendingQtl).toFixed(2)} qtl)`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {ledgerMode === 'mandi' && (
              <div className="flex flex-col gap-1 min-w-[220px]">
                <label className="text-xs text-[var(--text-muted-alt)]">Select Mandi</label>
                <select
                  value={selectedMandi}
                  onChange={(e) => setSelectedMandi(e.target.value)}
                  className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-main)] px-3 py-1.5 rounded text-sm outline-none focus:border-[#e67e00] min-w-[220px]"
                >
                  <option value="">All Mandis</option>
                  {mandiClusters.map((c) => (
                    <option key={c.key} value={c.mandi}>
                      {c.mandi}
                      {c.closingQtl || c.pendingQtl
                        ? ` (close ${Number(c.closingQtl ?? c.pendingQtl).toFixed(2)} qtl)`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted-alt)]">
                Start Date / Closing Date
              </label>
              <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
                className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-main)] px-3 py-1.5 rounded text-sm outline-none focus:border-[#e67e00]"
                  title="Start Date — opening balance as of start of this day"
              />
                <span className="text-[var(--text-muted-alt)] text-xs">to</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
                className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-main)] px-3 py-1.5 rounded text-sm outline-none focus:border-[#e67e00]"
                  title="Closing Date — closing balance as of end of this day"
                />
                {(filters.dateFrom || filters.dateTo) && (
                  <button
                    type="button"
                    onClick={() => setFilters((p) => ({ ...p, dateFrom: '', dateTo: '' }))}
                    className="text-xs text-[var(--text-muted)] hover:text-[#e67e00] underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-[10px] text-[var(--text-muted-alt)]">
                Opening = as of start of Start Date
                {openingAsOfLabel ? ` (snapshot ${openingAsOfLabel})` : ''}
                {' · '}
                Closing = as of Closing Date ({closingAsOfLabel})
              </p>
            </div>
          </>
        )}
      </div>

      {/* Trend summary chips for Mandi / Artia wise */}
      {view === 'ledger' && (entityTrend?.trends?.length > 0) && (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-3">
          <h3 className="text-xs font-bold uppercase text-[var(--text-muted-alt)] mb-2">
            {ledgerMode === 'artia' ? 'Artia' : 'Mandi'} Shortage Trend
            <span className="normal-case font-normal ml-2">({dateRangeLabel})</span>
          </h3>
            <div className="flex flex-wrap gap-2">
            {(entityTrend.trends as TrendInfo[])
              .filter((t) => Math.abs(t.deltaQtl) > 0.001 || t.totalQtl > 0)
              .slice(0, 24)
              .map((t) => (
                <span
                  key={t.name}
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border ${
                    t.increasing
                      ? 'bg-red-500/10 border-red-500/20 text-red-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {t.increasing ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {t.name}: {t.deltaQtl > 0 ? '+' : ''}
                  {t.deltaQtl} qtl
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Shortage details tables first */}
      <div className="flex-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-sm relative min-h-[280px]">
        {loading && (
          <div className="absolute inset-0 bg-[var(--bg-panel)]/50 flex items-center justify-center z-10">
            <div className="w-8 h-8 border-4 border-[#e67e00] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {view === 'daily' && daily && (
          <div className="overflow-x-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[var(--text-main)]">
                Daily Consolidated — {daily.date}
                <span className="text-xs text-[var(--text-muted-alt)] font-normal ml-2">
                  {daily.fromSnapshot
                    ? `Submitted ${daily.submittedAt ? new Date(daily.submittedAt).toLocaleString() : ''} (${daily.source || 'snapshot'})`
                    : `Live preview — submit evening report to freeze`}
                </span>
              </p>
              <p className="text-sm font-bold text-[#e67e00]">
                Grand: {daily.grandTotalQtl} qtl / {daily.grandTotalBags} bags
              </p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {(daily.columns || []).map((col: any) => (
                <div key={col.key} className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                  <div className="bg-[#e67e00]/10 px-3 py-2 border-b border-[var(--border-subtle)]">
                    <h4 className="font-bold text-sm text-[#e67e00]">{col.label}</h4>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)]">
                        <th className="px-2 py-1.5 text-left">S.No</th>
                        <th className="px-2 py-1.5 text-left">Artia</th>
                        <th className="px-2 py-1.5 text-left">Mandi</th>
                        <th className="px-2 py-1.5 text-right">Qtl</th>
                        <th className="px-2 py-1.5 text-right">Bags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {col.rows.map((r: any) => (
                        <tr key={`${col.key}-${r.sno}`} className="border-b border-[var(--border-subtle-alt)]">
                          <td className="px-2 py-1.5 text-[var(--text-muted-alt)]">{r.sno}</td>
                          <td className="px-2 py-1.5 font-medium text-[var(--text-main)]">{r.artia}</td>
                          <td className="px-2 py-1.5 text-[var(--text-muted)]">{r.mandi}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-red-400">
                            {Number(r.shortageQtl).toFixed(2)}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">
                            {Number(r.shortageBags).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {col.rows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-2 py-4 text-center text-[var(--text-muted-alt)] text-xs">
                            No shortage balance
                          </td>
                        </tr>
                      )}
                      <tr className="bg-[var(--bg-panel-hover)] font-bold">
                        <td colSpan={3} className="px-2 py-2 text-right text-[var(--text-main)]">
                          Total
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-[#e67e00]">
                          {Number(col.totalQtl).toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-[#e67e00]">
                          {Number(col.totalBags).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'ledger' && ledgerMode === 'artia' && (
          <div className="overflow-y-auto p-4 space-y-4 max-h-[70vh]">
            {selectedArtiaDetail && (
              <div className="border border-[#e67e00]/40 rounded-xl p-4 bg-[#e67e00]/5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted-alt)]">Selected Artia</p>
                  <h3 className="text-lg font-bold text-[#e67e00]">{selectedArtiaDetail.artia}</h3>
                  <p className="text-xs text-[var(--text-muted-alt)] mt-1">
                    Mandi: {selectedArtiaDetail.mandiList.join(', ') || '—'}
                  </p>
                  <div className="mt-2">
                    <TrendBadge trend={selectedArtiaDetail.trend} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted-alt)]">
                    Opening Balance
                    {filters.dateFrom ? ` (${filters.dateFrom})` : ''}
                  </p>
                  <p className="text-xl font-bold font-mono text-[var(--text-main)]">
                    {Number(selectedArtiaDetail.openingQtl || 0).toFixed(2)}{' '}
                    <span className="text-sm font-semibold">qtl</span>
                  </p>
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mt-2">
                    Closing Balance
                    {` (${closingAsOfLabel})`}
                  </p>
                  <p className="text-2xl font-bold font-mono text-red-400">
                    {Number(selectedArtiaDetail.closingQtl ?? selectedArtiaDetail.pendingQtl).toFixed(2)}{' '}
                    <span className="text-sm font-semibold">qtl</span>
                  </p>
                  {(selectedArtiaDetail.closingBags || selectedArtiaDetail.pendingBags) ? (
                    <p className="text-sm font-mono text-[var(--text-muted)]">
                      {Number(selectedArtiaDetail.closingBags ?? selectedArtiaDetail.pendingBags).toFixed(2)} bags
                    </p>
                  ) : null}
                  <p className="text-[11px] text-[var(--text-muted-alt)] mt-1">
                    Period Debit {selectedArtiaDetail.debitQtl.toFixed(2)} · Credit{' '}
                    {selectedArtiaDetail.creditQtl.toFixed(2)}
                  </p>
                </div>
                {selectedArtiaDetail.balanceRows?.length > 0 && (
                  <div className="w-full overflow-x-auto">
                    <p className="text-[10px] uppercase font-bold text-[var(--text-muted-alt)] mb-1">
                      Closing by Mill / Mandi (as of {closingAsOfLabel})
                    </p>
                    <table className="w-full text-sm min-w-max">
              <thead>
                        <tr className="text-[10px] uppercase text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)]">
                          <th className="px-2 py-1 text-left">Mill</th>
                          <th className="px-2 py-1 text-left">Mandi</th>
                          <th className="px-2 py-1 text-right">Debit</th>
                          <th className="px-2 py-1 text-right">Credit</th>
                          <th className="px-2 py-1 text-right">Closing Qtl</th>
                          <th className="px-2 py-1 text-right">Closing Bags</th>
                </tr>
              </thead>
              <tbody>
                        {selectedArtiaDetail.balanceRows.map((b: any, i: number) => (
                          <tr key={i} className="border-b border-[var(--border-subtle-alt)]">
                            <td className="px-2 py-1">{b.millName}</td>
                            <td className="px-2 py-1">{b.mandi}</td>
                            <td className="px-2 py-1 text-right font-mono text-red-400">
                              {Number(b.shortageQtl || 0).toFixed(2)}
                            </td>
                            <td className="px-2 py-1 text-right font-mono text-emerald-400">
                              {Number(b.recoveryQtl || 0).toFixed(2)}
                            </td>
                            <td className="px-2 py-1 text-right font-mono font-bold">
                              {Number(b.balanceQtl || 0).toFixed(2)}
                            </td>
                            <td className="px-2 py-1 text-right font-mono">
                              {Number(b.balanceBags || 0).toFixed(2)}
                            </td>
                  </tr>
                ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {!selectedArtiaKey && artiaOptions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {artiaOptions.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setSelectedArtiaKey(o.key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-subtle)] hover:border-[#e67e00] hover:text-[#e67e00] transition-colors text-left"
                  >
                    <span className="block">{o.artia}</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      Open {Number(o.openingQtl || 0).toFixed(2)} → Close{' '}
                      <span className="text-red-400">{Number(o.closingQtl || o.pendingQtl || 0).toFixed(2)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {displayedArtiaClusters.length === 0 && !loading && (
              <p className="text-center text-[var(--text-muted-alt)] py-8">
                {selectedArtiaKey
                  ? 'No shortage ledger entries for this Artia in the selected date range. Opening/closing balances are shown above.'
                  : 'No shortage entries for the selected filters. Pick an Artia above to view balances.'}
              </p>
            )}
            {displayedArtiaClusters.map((cluster) => (
              <div
                key={cluster.key}
                className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-panel)]"
              >
                <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[#e67e00]/10 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-[var(--text-main)] text-sm">
                      Artia: <span className="text-[#e67e00]">{cluster.artia}</span>
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted-alt)] mt-0.5">
                      Mandi: {cluster.mandiList.join(', ') || '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <TrendBadge trend={cluster.trend} />
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-[var(--text-muted-alt)]">Opening</p>
                      <p className="text-sm font-bold font-mono text-[var(--text-main)]">
                        {Number(cluster.openingQtl || 0).toFixed(2)} qtl
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-[var(--text-muted-alt)]">Closing</p>
                      <p className="text-sm font-bold font-mono text-red-400">
                        {Number(cluster.closingQtl ?? cluster.pendingQtl).toFixed(2)} qtl
                        {(cluster.closingBags || cluster.pendingBags) ? (
                          <span className="text-[var(--text-muted)] font-normal ml-1">
                            / {Number(cluster.closingBags ?? cluster.pendingBags).toFixed(2)} bags
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {!selectedArtiaKey && (
                      <button
                        type="button"
                        onClick={() => setSelectedArtiaKey(cluster.key)}
                        className="text-xs font-bold text-[#e67e00] hover:underline"
                      >
                        View only this Artia
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-max">
                    <thead>
                      <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-subtle)] text-[10px] uppercase text-[var(--text-muted-alt)]">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Mill</th>
                        <th className="px-3 py-2">Mandi</th>
                        <th className="px-3 py-2">Mill GP</th>
                        <th className="px-3 py-2">Truck</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2 text-right">Qtl</th>
                        <th className="px-3 py-2 text-right">Bags</th>
                        <th className="px-3 py-2">Recovery</th>
                        <th className="px-3 py-2">Narration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cluster.entries.length > 0 ? (
                        renderEntryRows(cluster.entries, false, true)
                      ) : (
                        <tr>
                          <td colSpan={10} className="px-3 py-4 text-center text-[var(--text-muted-alt)] text-xs">
                            No ledger entries in this date range
                    </td>
                  </tr>
                )}
                      <tr className="bg-[var(--bg-panel-hover)] font-semibold text-sm">
                        <td colSpan={6} className="px-3 py-2 text-right text-[var(--text-muted)]">
                          Opening {Number(cluster.openingQtl || 0).toFixed(2)} · Debit{' '}
                          {cluster.debitQtl.toFixed(2)} · Credit {cluster.creditQtl.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[#e67e00]">
                          {Number(cluster.closingQtl ?? cluster.pendingQtl).toFixed(2)}
                        </td>
                        <td colSpan={3} className="px-3 py-2 text-xs text-[var(--text-muted-alt)]">
                          Closing as of {closingAsOfLabel}
                        </td>
                      </tr>
              </tbody>
            </table>
                </div>
              </div>
            ))}
            {selectedArtiaKey && (
              <button
                type="button"
                onClick={() => setSelectedArtiaKey('')}
                className="text-sm font-semibold text-[#e67e00] hover:underline"
              >
                ← Show all Artias
              </button>
            )}
          </div>
        )}

        {view === 'ledger' && ledgerMode === 'mandi' && (
          <div className="overflow-y-auto p-4 space-y-4 max-h-[70vh]">
            {displayedMandiClusters.length === 0 && !loading && (
              <p className="text-center text-[var(--text-muted-alt)] py-8">
                No shortage entries for the selected date range
                {selectedMandi ? ` / Mandi (${selectedMandi})` : ''}.
              </p>
            )}
            {displayedMandiClusters.map((cluster) => (
              <div
                key={cluster.key}
                className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-panel)]"
              >
                <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-blue-500/10 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-[var(--text-main)] text-sm">
                      Mandi: <span className="text-blue-400">{cluster.mandi}</span>
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted-alt)] mt-0.5">
                      Artias: {cluster.artiaList.join(', ') || '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <TrendBadge trend={cluster.trend} />
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-[var(--text-muted-alt)]">Opening</p>
                      <p className="text-sm font-bold font-mono text-[var(--text-main)]">
                        {Number(cluster.openingQtl || 0).toFixed(2)} qtl
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-[var(--text-muted-alt)]">Closing</p>
                      <p className="text-sm font-bold font-mono text-red-400">
                        {Number(cluster.closingQtl ?? cluster.pendingQtl).toFixed(2)} qtl
                        {(cluster.closingBags || cluster.pendingBags) ? (
                          <span className="text-[var(--text-muted)] font-normal ml-1">
                            / {Number(cluster.closingBags ?? cluster.pendingBags).toFixed(2)} bags
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-max">
              <thead>
                      <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-subtle)] text-[10px] uppercase text-[var(--text-muted-alt)]">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Mill</th>
                        <th className="px-3 py-2">Artia</th>
                        <th className="px-3 py-2">Mill GP</th>
                        <th className="px-3 py-2">Truck</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2 text-right">Qtl</th>
                        <th className="px-3 py-2 text-right">Bags</th>
                        <th className="px-3 py-2">Recovery</th>
                        <th className="px-3 py-2">Narration</th>
                </tr>
              </thead>
              <tbody>
                      {renderEntryRows(cluster.entries, true, false)}
                      <tr className="bg-[var(--bg-panel-hover)] font-semibold text-sm">
                        <td colSpan={6} className="px-3 py-2 text-right text-[var(--text-muted)]">
                          Opening {Number(cluster.openingQtl || 0).toFixed(2)} · Debit{' '}
                          {cluster.debitQtl.toFixed(2)} · Credit {cluster.creditQtl.toFixed(2)}
                    </td>
                        <td className="px-3 py-2 text-right font-mono text-[#e67e00]">
                          {Number(cluster.closingQtl ?? cluster.pendingQtl).toFixed(2)}
                    </td>
                        <td colSpan={3} className="px-3 py-2 text-xs text-[var(--text-muted-alt)]">
                          Closing as of {closingAsOfLabel}
                    </td>
                  </tr>
              </tbody>
            </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mill shortage trend graph — below tables */}
      {trend?.series?.length > 0 && (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-[var(--text-main)]">Mill Shortage Trend (14 days)</h3>
            <div className="flex flex-wrap gap-2">
              {(trend.trends || []).map((t: any) => (
                <span
                  key={t.mill}
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                    t.increasing ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
                  }`}
                >
                  {t.increasing ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {t.mill}: {t.deltaQtl > 0 ? '+' : ''}
                  {t.deltaQtl} qtl
                </span>
              ))}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                {(trend.mills || []).map((mill: string, i: number) => (
                  <Line
                    key={mill}
                    type="monotone"
                    dataKey={mill}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

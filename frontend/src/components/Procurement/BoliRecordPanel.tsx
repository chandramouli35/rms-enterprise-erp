import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Edit,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
} from "lucide-react";
import api from "../../api/axios";
import { usePlantStore } from "../../store/plantStore";
import { useUiStore } from "../../store/uiStore";
import { useAuthStore } from "../../store/authStore";
import { useMandiStore } from "../../store/mandiStore";
import { biometricService } from "../../services/biometricService";
import { hasModulePermission } from "../../utils/modulePermissions";
import Pagination from "../Pagination";
import Combobox from "../Combobox";
import { CustomModal } from "../CustomModal";
import { exportStyledExcel, boldColorStyle, formatExcelDate, priceStatusFontColor } from "../../utils/exportUtils";
import { useSubmitLock } from "../../hooks/useSubmitLock";

/** Hide faker / Latin placeholder notes left in seed or test data */
function displayNote(note?: string | null): string {
  const n = String(note || "").trim();
  if (!n) return "";
  if (/(iusto|lusto|quasi|quia sint|nobis veri|ipsum|dolor sit)/i.test(n))
    return "";
  return n;
}

type Props = {
  suppliers: any[];
  fetchSuppliers: (plantId?: string) => void;
  onOpenEstimate: (preset?: any) => void;
  onEditEstimate: (sodaOrRow: any) => void;
  refreshKey?: number;
};

/**
 * Feedback 32 — Boli Record register (Table 01) + Add Final Boli section.
 */
export default function BoliRecordPanel({
  suppliers,
  fetchSuppliers,
  onOpenEstimate,
  onEditEstimate,
  refreshKey = 0,
}: Props) {
  const activePlant = usePlantStore((s) => s.activePlant);
  const user = useAuthStore((s) => s.user);
  const isSupervisor = /SUPERVISOR/i.test(
    String((user as any)?.role?.name || user?.role || ""),
  );
  const isAdmin = /SUPER_ADMIN|PLANT_MANAGER|ADMIN/i.test(
    String(user?.role || ""),
  );
  /** Supervisor Boli Record must not show Payment / Final Hisab */
  const hidePaymentHisab = isSupervisor && !isAdmin;
  const canAddBoli = hasModulePermission("Procurement", "canAdd", "Boli Record");
  const canEditBoli = hasModulePermission("Procurement", "canEdit", "Boli Record");
  const boliTableColSpan = hidePaymentHisab ? 15 : 17;
  const { mandis } = useMandiStore();

  const [filters, setFilters] = useState({
    supplierId: "",
    mandi: "",
    dateFrom: "",
    dateTo: "",
  });
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [priceRecords, setPriceRecords] = useState<{
    summary: {
      overpricedCount: number;
      underpricedCount: number;
      overpricedDeltaSum: number;
      underpricedDeltaSum: number;
    };
    byMandi: any[];
    overpriced: any[];
    underpriced: any[];
  } | null>(null);
  const [priceTab, setPriceTab] = useState<"overpriced" | "underpriced">(
    "overpriced",
  );
  const [purchaseTrends, setPurchaseTrends] = useState<{
    overall: any;
    byArtia: any[];
    byMandi: any[];
    byDay?: any[];
  } | null>(null);
  const [trendTab, setTrendTab] = useState<"artia" | "mandi">("artia");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [openBolis, setOpenBolis] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [finalForm, setFinalForm] = useState({
    boliId: "",
    supervisorName: "",
    artiaBillChecked: "No" as "Yes" | "No",
    /** Final Bags per boli line — all siblings under same Boli No. (can be > 4) */
    finalBagsById: {} as Record<string, string>,
    biometricData: "",
  });
  const [finalSaving, setFinalSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const selectedOpen = useMemo(
    () => openBolis.find((b) => b.id === finalForm.boliId) || null,
    [openBolis, finalForm.boliId],
  );

  /** One dropdown option per Boli No. (soda) — prefer a line that still needs Final Bags */
  const openBoliOptions = useMemo(() => {
    const bySoda = new Map<string, any>();
    for (const b of openBolis) {
      const key = b.sodaId || b.id;
      const existing = bySoda.get(key);
      if (!existing) {
        bySoda.set(key, b);
        continue;
      }
      // Prefer a line that still needs Final Bags as the select value
      if (existing.needsFinal === false && b.needsFinal !== false) {
        bySoda.set(key, b);
      }
    }
    return [...bySoda.values()].sort((a, b) =>
      String(a.boliNo || "").localeCompare(String(b.boliNo || "")),
    );
  }, [openBolis]);

  /** All lines for selected Boli No. — no 4-cap, no empty padding to multiples of 4 */
  const finalBoliLines = useMemo(() => {
    if (!selectedOpen) return [];
    return openBolis
      .filter((b) => b.sodaId === selectedOpen.sodaId)
      .sort((a, b) => {
        const seqA = Number(a.lineSeq) || 0;
        const seqB = Number(b.lineSeq) || 0;
        if (seqA && seqB && seqA !== seqB) return seqA - seqB;
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        if (tA !== tB) return tA - tB;
        return 0;
      });
  }, [selectedOpen, openBolis]);

  const [adminRates, setAdminRates] = useState<any[]>([]);
  const [adminRateForm, setAdminRateForm] = useState({
    id: "",
    date: new Date().toISOString().split("T")[0],
    mandi: "",
    todayRate: "",
    mcPoint: "",
  });
  const [adminRateSaving, setAdminRateSaving] = useState(false);

  const fetchAdminRates = async () => {
    if (!activePlant?.id || !isAdmin) return;
    try {
      // Full rate history (not limited to Table 01 date filters)
      const res = await api.get(`/api/procurement/mandi-daily-rates`, {
        params: { plantId: activePlant.id },
      });
      setAdminRates(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchAdminRates();
  }, [activePlant?.id, refreshKey, isAdmin]);

  const saveAdminRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || adminRateSaving) return;
    if (!adminRateForm.mandi || !adminRateForm.todayRate) {
      useUiStore
        .getState()
        .addToast("Mandi and Today Rate are required", "error");
      return;
    }
    setAdminRateSaving(true);
    try {
      const res = await api.post(`/api/procurement/mandi-daily-rates`, {
        id: adminRateForm.id || undefined,
        plantId: activePlant?.id,
        date: adminRateForm.date,
        mandi: adminRateForm.mandi,
        todayRate: parseFloat(adminRateForm.todayRate),
        mcPoint:
          adminRateForm.mcPoint === ""
            ? null
            : parseFloat(adminRateForm.mcPoint),
      });
      const corrected = res.data?.corrected;
      const n = corrected?.sodasUpdated ?? 0;
      useUiStore
        .getState()
        .addToast(
          n > 0
            ? `Rate saved — corrected ${n} purchase(s) for that day (payment still on Govt Rate)`
            : "Rate saved to history",
          "success",
        );
      setAdminRateForm({
        id: "",
        date: new Date().toISOString().split("T")[0],
        mandi: "",
        todayRate: "",
        mcPoint: "",
      });
      fetchAdminRates();
      fetchRows();
    } catch (err: any) {
      useUiStore
        .getState()
        .addToast(
          err.response?.data?.message || "Failed to save Today Rate",
          "error",
        );
    } finally {
      setAdminRateSaving(false);
    }
  };

  const deleteAdminRate = async (id: string) => {
    if (!isAdmin) return;
    if (!window.confirm("Delete this Mandi Today Rate row?")) return;
    try {
      await api.delete(`/api/procurement/mandi-daily-rates/${id}`);
      fetchAdminRates();
    } catch (err: any) {
      useUiStore
        .getState()
        .addToast(err.response?.data?.message || "Delete failed", "error");
    }
  };

  const resetFinalForm = () =>
    setFinalForm({
      boliId: "",
      supervisorName: "",
      artiaBillChecked: "No",
      finalBagsById: {},
      biometricData: "",
    });

  const fetchRows = async (opts?: { silent?: boolean }) => {
    if (!activePlant?.id) return;
    if (!opts?.silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      if (filters.mandi) params.append("mandi", filters.mandi);
      if (filters.supplierId) params.append("supplierId", filters.supplierId);
      params.append("page", String(page));
      params.append("limit", String(pageSize));
      const res = await api.get(
        `/api/procurement/boli-records/${activePlant.id}?${params}`,
      );
      setRows(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (e) {
      console.error(e);
      if (!opts?.silent) {
        useUiStore.getState().addToast("Failed to load Boli records", "error");
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const fetchPriceRecords = async () => {
    if (!activePlant?.id) return;
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      if (filters.mandi) params.append("mandi", filters.mandi);
      if (filters.supplierId) params.append("supplierId", filters.supplierId);
      const res = await api.get(
        `/api/procurement/boli-price-records/${activePlant.id}?${params}`,
      );
      setPriceRecords(res.data || null);
    } catch (e) {
      console.error(e);
      setPriceRecords(null);
    }
  };

  const fetchPurchaseTrends = async () => {
    if (!activePlant?.id) return;
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      if (filters.mandi) params.append("mandi", filters.mandi);
      if (filters.supplierId) params.append("supplierId", filters.supplierId);
      const res = await api.get(
        `/api/procurement/boli-purchase-trends/${activePlant.id}?${params}`,
      );
      setPurchaseTrends(res.data || null);
    } catch (e) {
      console.error(e);
      setPurchaseTrends(null);
    }
  };

  const refreshBoliLive = async (silent = true) => {
    await Promise.all([
      fetchRows({ silent }),
      fetchPriceRecords(),
      fetchPurchaseTrends(),
      fetchOpenBolis(),
      isAdmin ? fetchAdminRates() : Promise.resolve(),
    ]);
    setLastSyncedAt(new Date());
  };

  const fetchOpenBolis = async () => {
    if (!activePlant?.id) return;
    try {
      const res = await api.get(
        `/api/procurement/bolis/open-for-final/${activePlant.id}`,
      );
      setOpenBolis(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSupervisors = async () => {
    if (!activePlant?.id) return;
    try {
      const res = await api.get(
        `/api/procurement/supervisors/${activePlant.id}`,
      );
      setSupervisors(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  /** Keep latest refresh fn for interval (avoids stale filters/page) */
  const refreshLiveRef = useRef(refreshBoliLive);
  refreshLiveRef.current = refreshBoliLive;

  useEffect(() => {
    refreshBoliLive(false);
  }, [activePlant?.id, filters, page, pageSize, refreshKey]);

  // Realtime: poll every 3s + refresh when tab becomes visible again
  useEffect(() => {
    if (!activePlant?.id) return;

    const tick = () => {
      if (document.visibilityState === "hidden") return;
      refreshLiveRef.current(true);
    };

    const id = window.setInterval(tick, 3000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refreshLiveRef.current(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [activePlant?.id]);

  useEffect(() => {
    fetchOpenBolis();
    fetchSupervisors();
    if (activePlant?.id) fetchSuppliers(activePlant.id);
  }, [activePlant?.id, refreshKey]);

  const dayHighlights = purchaseTrends?.byDay || [];

  const resolvePriceStatus = (item: any): "OVERPRICED" | "UNDERPRICED" | "AT_BASE" | null => {
    if (item.priceStatus === "OVERPRICED" || item.priceStatus === "UNDERPRICED" || item.priceStatus === "AT_BASE") {
      return item.priceStatus;
    }
    if (item.baseBoliRate == null || item.rate == null) return null;
    const delta = Number(item.rate) - Number(item.baseBoliRate);
    if (delta > 0) return "OVERPRICED";
    if (delta < 0) return "UNDERPRICED";
    return "AT_BASE";
  };

  const exportAll = async (mode: "excel" | "print" = "excel") => {
    if (!activePlant?.id) return;
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      if (filters.mandi) params.append("mandi", filters.mandi);
      if (filters.supplierId) params.append("supplierId", filters.supplierId);
      params.append("page", "1");
      params.append("limit", "1000000");
      const res = await api.get(
        `/api/procurement/boli-records/${activePlant.id}?${params}`,
      );
      const list: any[] = res.data?.data || [];
      if (mode === "print") {
        // Sort date-wise (then party / boli) to match register reading order
        const sorted = [...list].sort((a, b) => {
          const da = new Date(a.date).getTime();
          const db = new Date(b.date).getTime();
          if (da !== db) return da - db;
          const pa = String(a.partyName || "").localeCompare(String(b.partyName || ""));
          if (pa !== 0) return pa;
          return String(a.boliNo || "").localeCompare(String(b.boliNo || ""));
        });

        const artiaLabel =
          filters.supplierId
            ? suppliers.find((s) => s.id === filters.supplierId)?.name ||
              filters.supplierId
            : "All";
        const mandiLabel = filters.mandi || "All";
        const rangeLabel = `${filters.dateFrom || "…"} to ${filters.dateTo || "…"}`;

        let lastDate = "";
        let lastParty = "";
        const bodyRows: string[] = [];

        for (const item of sorted) {
          const dateKey = item.date
            ? new Date(item.date).toLocaleDateString()
            : "—";
          if (dateKey !== lastDate) {
            lastDate = dateKey;
            lastParty = "";
            bodyRows.push(`
              <tr class="date-band">
                <td colspan="${hidePaymentHisab ? 14 : 16}"><strong>Date: ${dateKey}</strong></td>
              </tr>`);
          }

          const showParty = item.partyName !== lastParty;
          lastParty = item.partyName;

          const rateHtml = `<span style="color:#e67e00;font-weight:700">${item.rate ?? "-"}</span>`;

          const hisab = Number(item.finalHisabAmt) || 0;
          const hisabHtml =
            hisab > 0
              ? `<span style="color:#ef4444;font-weight:700">↑ ₹${hisab.toFixed(2)}</span>`
              : hisab < 0
                ? `<span style="color:#22c55e;font-weight:700">↓ ₹${Math.abs(hisab).toFixed(2)}</span>`
                : "₹0.00";

          const completeHtml = item.isCompleted
            ? `<span style="color:#22c55e;font-weight:700">✓ Done</span>`
            : item.isCancelled
              ? `<span style="color:#888">Cancelled</span>`
              : `<span style="color:#888">Underway</span>`;

          const partyCell = showParty
            ? `${item.partyName || ""}${
                item.mandi
                  ? `<div style="font-size:10px;color:#888">${item.mandi}</div>`
                  : ""
              }`
            : "";

          const rowClass = item.isCancelled ? "cancelled" : "";

          bodyRows.push(`
            <tr class="${rowClass}">
              <td>${partyCell}</td>
              <td>${dateKey}</td>
              <td class="boli-no">${item.boliNo || "-"}</td>
              <td>${item.moisture ?? "-"}</td>
              <td>${item.mcDeduction != null ? `₹${Number(item.mcDeduction).toFixed(2)}` : "—"}</td>
              <td>${item.estimatedBags ?? "-"}</td>
              <td style="font-weight:700">${item.finalBags ?? "—"}</td>
              <td>${item.todayRate != null ? item.todayRate : "—"}</td>
              <td>${item.baseBoliRate != null ? Number(item.baseBoliRate).toFixed(2) : "—"}</td>
              <td>${rateHtml}</td>
              ${
                hidePaymentHisab
                  ? ""
                  : `<td>${item.payment != null ? `₹${Number(item.payment).toFixed(2)}` : "—"}</td>
              <td>${hisabHtml}</td>`
              }
              <td>${item.bagsReceived ?? 0}</td>
              <td>${item.balanceBags != null ? item.balanceBags : "—"}</td>
              <td style="text-align:center">${completeHtml}</td>
              <td>${displayNote(item.note) || ""}</td>
            </tr>`);
        }

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Boli Record — ${activePlant.name || ""}</title>
<style>
  @page { size: landscape; margin: 10mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; padding: 12px; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  .meta { font-size: 11px; color: #555; margin-bottom: 12px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border-bottom: 1px solid #ddd; padding: 5px 6px; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; color: #555; font-weight: 700; }
  tr.date-band td { background: #fff7ed; border-bottom: 2px solid #e67e00; padding-top: 10px; color: #e67e00; }
  tr.cancelled { opacity: 0.55; }
  .boli-no { color: #e67e00; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 600; }
  @media print {
    body { padding: 0; }
    th { background: #f3f4f6 !important; }
    tr.date-band td { background: #fff7ed !important; }
  }
</style></head><body>
  <h1>Boli Record — ${activePlant.name || ""}</h1>
  <div class="meta">Artia: ${artiaLabel} · Mandi: ${mandiLabel} · ${rangeLabel}</div>
  <table>
    <thead>
      <tr>
        <th>Party Name</th>
        <th>Date</th>
        <th>Boli No.</th>
        <th>M/C</th>
        <th>MC Deduct</th>
        <th>Est. Bags</th>
        <th>Final Bags</th>
        <th>Today Rate</th>
        <th>Base Boli</th>
        <th>Price (Boli Rate)</th>
        ${hidePaymentHisab ? "" : "<th>Payment</th><th>Final Hisab</th>"}
        <th>Received</th>
        <th>Balance</th>
        <th>Complete</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows.join("") || `<tr><td colspan="${hidePaymentHisab ? 14 : 16}" style="text-align:center;padding:24px;color:#888">No boli records found.</td></tr>`}
    </tbody>
  </table>
</body></html>`;
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(html);
          w.document.close();
          w.focus();
          w.print();
        }
        return;
      }
      const excelRows = list.map((item: any) => {
        const status = resolvePriceStatus(item);
        const delta =
          item.rateVsBase != null
            ? Number(item.rateVsBase)
            : item.baseBoliRate != null && item.rate != null
              ? Number(item.rate) - Number(item.baseBoliRate)
              : null;
        const row: Record<string, any> = {
          partyName: item.partyName || "",
          date: formatExcelDate(item.date),
          boliNo: item.boliNo || "",
          moisture: item.moisture ?? "",
          mcDeduction:
            item.mcDeduction != null ? Number(item.mcDeduction) : "",
          estimatedBags: item.estimatedBags ?? "",
          finalBags: item.finalBags ?? "",
          todayRate: item.todayRate ?? "",
          baseBoliRate:
            item.baseBoliRate != null ? Number(item.baseBoliRate) : "",
          rate: item.rate ?? "",
          priceStatus:
            status === "OVERPRICED"
              ? `↑ Overpriced${delta != null ? ` (+${delta})` : ""}`
              : status === "UNDERPRICED"
                ? `↓ Underpriced${delta != null ? ` (${delta})` : ""}`
                : status === "AT_BASE"
                  ? "= Base"
                  : "",
          _status: status,
          bagsReceived: item.bagsReceived ?? 0,
          balanceBags: item.balanceBags ?? "",
          complete: item.isCompleted
            ? "✓ Done"
            : item.isCancelled
              ? "Cancelled"
              : "Underway",
          note: displayNote(item.note),
          mandi: item.mandi || "",
          supervisorName: item.supervisorName || "",
        };
        if (!hidePaymentHisab) {
          row.payment =
            item.payment != null ? Number(item.payment) : "";
          row.finalHisabAmt =
            item.finalHisabAmt != null ? Number(item.finalHisabAmt) : "";
          row._hisab = Number(item.finalHisabAmt) || 0;
        }
        return row;
      });

      const cols: any[] = [
        { key: "partyName", header: "Party Name" },
        { key: "date", header: "Date" },
        {
          key: "boliNo",
          header: "Boli No.",
          styleFor: () => boldColorStyle("E67E00"),
        },
        { key: "moisture", header: "M/C" },
        { key: "mcDeduction", header: "MC Deduct" },
        { key: "estimatedBags", header: "Est. Bags" },
        { key: "finalBags", header: "Final Bags" },
        { key: "todayRate", header: "Today Rate" },
        { key: "baseBoliRate", header: "Base Boli" },
        {
          key: "rate",
          header: "Rate",
          styleFor: (row: any) =>
            boldColorStyle(priceStatusFontColor(row._status)),
        },
        {
          key: "priceStatus",
          header: "Status",
          styleFor: (row: any) =>
            boldColorStyle(priceStatusFontColor(row._status)),
        },
      ];
      if (!hidePaymentHisab) {
        cols.push(
          { key: "payment", header: "Payment" },
          {
            key: "finalHisabAmt",
            header: "Final Hisab",
            styleFor: (row: any) => {
              const h = Number(row._hisab) || 0;
              if (h > 0) return boldColorStyle("EF4444");
              if (h < 0) return boldColorStyle("22C55E");
              return undefined;
            },
          },
        );
      }
      cols.push(
        { key: "bagsReceived", header: "Received" },
        { key: "balanceBags", header: "Balance" },
        {
          key: "complete",
          header: "Complete",
          styleFor: (row: any) =>
            row.complete?.startsWith("✓")
              ? boldColorStyle("22C55E")
              : undefined,
        },
        { key: "note", header: "Note" },
        { key: "mandi", header: "Mandi" },
        { key: "supervisorName", header: "Supervisor" },
      );

      exportStyledExcel(excelRows, cols, "Boli_Record_Full", "Boli Record");
    } catch (e) {
      console.error(e);
      useUiStore
        .getState()
        .addToast(mode === "print" ? "Print failed" : "Export failed", "error");
    }
  };

  const canEditRow = (row: any) => {
    if (!canEditBoli) return false;
    if (isAdmin) return true;
    if (!isSupervisor) return false;
    const d = new Date(row.date);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const [adminEdit, setAdminEdit] = useState<{
    isOpen: boolean;
    row: any | null;
    payment: string;
    note: string;
    finalBags: string;
  }>({ isOpen: false, row: null, payment: "", note: "", finalBags: "" });
  const adminEditLock = useSubmitLock();

  const openAdminEdit = (row: any) => {
    setAdminEdit({
      isOpen: true,
      row,
      payment: row.payment != null ? String(row.payment) : "",
      note: displayNote(row.note),
      finalBags: row.finalBags != null ? String(row.finalBags) : "",
    });
  };

  const saveAdminEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEdit.row?.boliId) return;
    await adminEditLock.wrapSubmit(async () => {
      try {
        await api.put(
          `/api/procurement/bolis/${adminEdit.row.boliId}/admin-table01`,
          {
            payment:
              adminEdit.payment === ""
                ? undefined
                : parseFloat(adminEdit.payment),
            note: adminEdit.note,
            finalBags:
              adminEdit.finalBags === ""
                ? undefined
                : parseInt(adminEdit.finalBags, 10),
          },
        );
        useUiStore.getState().addToast("Table 01 row updated", "success");
        setAdminEdit({
          isOpen: false,
          row: null,
          payment: "",
          note: "",
          finalBags: "",
        });
        await fetchRows();
      } catch (err: any) {
        useUiStore
          .getState()
          .addToast(
            err.response?.data?.message || "Admin update failed",
            "error",
          );
      }
    });
  };

  const seasonStartStr = () => {
    const ref = new Date();
    const y = ref.getMonth() >= 9 ? ref.getFullYear() : ref.getFullYear() - 1;
    return `${y}-10-01`;
  };

  const todayStr = () => new Date().toISOString().slice(0, 10);

  const scanFingerprint = async () => {
    setScanning(true);
    try {
      const xml = await biometricService.captureAndVerifyLoggedInUser();
      setFinalForm((f) => ({ ...f, biometricData: xml }));
      useUiStore.getState().addToast("Fingerprint captured", "success");
    } catch (e: any) {
      useUiStore
        .getState()
        .addToast(e.message || "This fingerprint does not exist", "error");
    } finally {
      setScanning(false);
    }
  };

  const submitFinalBoli = async (e: React.FormEvent) => {
    e.preventDefault();
    if (finalSaving) return;
    if (finalForm.artiaBillChecked !== "Yes") {
      useUiStore
        .getState()
        .addToast("Set Artia Bill Checked And Matched to Yes", "error");
      return;
    }
    if (!finalForm.boliId) {
      useUiStore.getState().addToast("Select a Boli No. first", "error");
      return;
    }
    if (!finalForm.biometricData) {
      useUiStore.getState().addToast("Fingerprint required", "error");
      return;
    }

    const toSubmit = finalBoliLines
      .filter((b: any) => b && b.needsFinal !== false)
      .map((b: any) => ({
        id: b.id,
        boliNo: b.boliNo,
        bags: String(finalForm.finalBagsById[b.id] ?? "").trim(),
      }))
      .filter((x) => x.bags !== "");

    if (!toSubmit.length) {
      useUiStore
        .getState()
        .addToast("Enter Final Bags on at least one line", "error");
      return;
    }
    for (const row of toSubmit) {
      if (/[.]/.test(row.bags) || !/^\d{1,3}$/.test(row.bags)) {
        useUiStore
          .getState()
          .addToast(
            `Final Bags for ${row.boliNo || "line"} must be a whole number (max 999)`,
            "error",
          );
        return;
      }
    }

    setFinalSaving(true);
    try {
      for (const row of toSubmit) {
        await api.put(`/api/procurement/bolis/${row.id}/final`, {
          artiaBillChecked: true,
          finalBags: parseInt(row.bags, 10),
          supervisorName:
            finalForm.supervisorName || selectedOpen?.supervisorName,
          biometricData: finalForm.biometricData,
        });
      }
      const cancelledN = toSubmit.filter((r) => parseInt(r.bags, 10) === 0)
        .length;
      const submittedN = toSubmit.length - cancelledN;
      useUiStore
        .getState()
        .addToast(
          cancelledN && !submittedN
            ? cancelledN === 1
              ? "Boli cancelled (Final Bags = 0)"
              : `${cancelledN} bolis cancelled (Final Bags = 0)`
            : cancelledN
              ? `${submittedN} submitted, ${cancelledN} cancelled (Bags = 0)`
              : toSubmit.length === 1
                ? "Final Boli submitted"
                : `${toSubmit.length} Final Boli lines submitted`,
          "success",
        );
      resetFinalForm();
      await fetchRows();
      await fetchOpenBolis();
    } catch (err: any) {
      useUiStore
        .getState()
        .addToast(
          err.response?.data?.message || "Failed to submit Final Boli",
          "error",
        );
    } finally {
      setFinalSaving(false);
    }
  };

  const cancelEntireSoda = async () => {
    if (!selectedOpen?.sodaId || cancelling) return;
    if (
      !window.confirm(
        `Cancel entire soda for ${selectedOpen.artiaName}? Open bolis will be set to Bags = 0, hidden from Paddy Inward, and kept on Boli Record.`,
      )
    ) {
      return;
    }
    setCancelling(true);
    try {
      const res = await api.put(
        `/api/procurement/soda-pending/${selectedOpen.sodaId}/cancel`,
      );
      useUiStore
        .getState()
        .addToast(
          `Soda cancelled (${res.data?.cancelled ?? ""} boli)`,
          "success",
        );
      resetFinalForm();
      await fetchRows();
      await fetchOpenBolis();
    } catch (err: any) {
      useUiStore
        .getState()
        .addToast(
          err.response?.data?.message || "Failed to cancel soda",
          "error",
        );
    } finally {
      setCancelling(false);
    }
  };

  const billYes = finalForm.artiaBillChecked === "Yes";

  // Group rows visually by Artia (cluster-wise)
  let lastParty = "";

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)] gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
          <Package className="text-[#e67e00]" /> 3. Boli Record
          {lastSyncedAt && (
            <span className="text-[10px] font-normal text-green-400/90 ml-1">
              ● Live
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {!isSupervisor && (
            <>
              <button
                onClick={() => exportAll("excel")}
                className="flex items-center gap-2 bg-[#107c41] text-white px-5 py-2.5 rounded-lg hover:bg-[#1f8c51] transition-colors text-base font-bold"
              >
                <Download size={20} /> Export All
              </button>
              <button
                onClick={() => exportAll("print")}
                className="flex items-center gap-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-main)] px-5 py-2.5 rounded-lg text-base font-bold"
              >
                <Printer size={20} /> Print All
              </button>
            </>
          )}
          {activePlant && canAddBoli && (
            <button
              onClick={() => onOpenEstimate()}
              className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-orange-500/20"
            >
              + Add Estimate Purchase
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[var(--bg-base)] p-4 space-y-4">
        {/* Filters: Artia → Mandi → From/To */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
              Artia (Supplier) Name
            </label>
            <Combobox
              name="supplierIdFilter"
              value={filters.supplierId}
              onChange={(e: any) => {
                setPage(1);
                const supplierId = e.target.value;
                setFilters((f) => ({
                  ...f,
                  supplierId,
                  // Feedback 32 — Artia select shows from first entry of the season
                  ...(supplierId
                    ? {
                        dateFrom:
                          f.dateFrom && f.dateFrom !== todayStr()
                            ? f.dateFrom
                            : seasonStartStr(),
                        dateTo: f.dateTo || todayStr(),
                      }
                    : {}),
                }));
                // Feedback 32 — show all bolis for selected Artia (no page hide)
                if (supplierId) setPageSize(100000);
                else setPageSize(50);
              }}
              options={suppliers}
              valueKey="id"
              placeholder="All Artias"
              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm min-w-[180px]"
            />
          </div>
          <div>
            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
              Mandi
            </label>
            <select
              value={filters.mandi}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, mandi: e.target.value }));
              }}
              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm"
            >
              <option value="">All Mandis</option>
              {mandis
                .filter((m: any) => m.isActive)
                .map((m: any) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, dateFrom: e.target.value }));
              }}
              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm"
            />
          </div>
          <div>
            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => {
                setPage(1);
                setFilters((f) => ({ ...f, dateTo: e.target.value }));
              }}
              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-main)] text-sm"
            />
          </div>
          <button
            onClick={() => {
              setPage(1);
              setFilters({
                supplierId: "",
                mandi: "",
                dateFrom: "",
                dateTo: "",
              });
            }}
            className="bg-[var(--bg-panel-hover)] text-[var(--text-main)] px-3 py-1.5 rounded border border-[var(--border-subtle)] text-sm"
          >
            Clear
          </button>
        </div>

        {isAdmin && canEditBoli && (
          <div className="rounded-xl border border-[#e67e00]/30 bg-[var(--bg-panel-alt)] p-4 space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-main)]">
              Admin — Mandi Base Rates (Today Rate / M/C Point)
            </h3>
            <p className="text-[10px] text-[var(--text-muted-alt)]">
              <b>Today Rate</b> = mandi base rate (e.g. 2200). <b>M/C Point</b>{" "}
              = ₹ monetary impact per 1% moisture (e.g. 50).{" "}
              <b>Rate history</b> is kept for every punched Date + Mandi.
              Back-date entries are allowed — saving immediately corrects that
              day's Estimate / Boli Today Rate data. Payment difference stays on{" "}
              <b>Govt. Paddy Rate only</b> (never Mandi Today Rate). Previous
              rate continues until a new date is punched.
            </p>
            <form
              onSubmit={saveAdminRate}
              className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end"
            >
              <div>
                <label className="block text-[10px] text-[var(--text-muted-alt)] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={adminRateForm.date}
                  onChange={(e) =>
                    setAdminRateForm((f) => ({ ...f, date: e.target.value }))
                  }
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted-alt)] mb-1">
                  Mandi
                </label>
                <select
                  value={adminRateForm.mandi}
                  onChange={(e) =>
                    setAdminRateForm((f) => ({ ...f, mandi: e.target.value }))
                  }
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)]"
                  required
                >
                  <option value="">Select Mandi</option>
                  {mandis
                    .filter((m: any) => m.isActive)
                    .map((m: any) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted-alt)] mb-1">
                  Today Rate
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={adminRateForm.todayRate}
                  onChange={(e) =>
                    setAdminRateForm((f) => ({
                      ...f,
                      todayRate: e.target.value,
                    }))
                  }
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted-alt)] mb-1">
                  M/C Point (₹ / 1% moisture)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={adminRateForm.mcPoint}
                  onChange={(e) =>
                    setAdminRateForm((f) => ({
                      ...f,
                      mcPoint: e.target.value,
                    }))
                  }
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)]"
                  placeholder="e.g. 50"
                  title="Monetary impact per 1% moisture. Example: Base rate 2200, M/C Point 50"
                />
              </div>
              <button
                type="submit"
                disabled={adminRateSaving}
                className="bg-[#e67e00] text-black px-3 py-1.5 rounded font-bold text-sm disabled:opacity-50"
              >
                {adminRateSaving
                  ? "Saving…"
                  : adminRateForm.id
                    ? "Update"
                    : "Add"}
              </button>
            </form>
            <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase text-[var(--text-muted-alt)] text-left border-b border-[var(--border-subtle)]">
                    <th className="p-2">Date</th>
                    <th className="p-2">Mandi</th>
                    <th className="p-2">Today Rate</th>
                    <th className="p-2">M/C Point (₹/1%)</th>
                    <th className="p-2">Punched</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminRates.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-4 text-center text-[var(--text-muted-alt)] text-xs"
                      >
                        No rate history yet. Add Date / Mandi / Today Rate / M/C
                        Point above (back-dates allowed).
                      </td>
                    </tr>
                  )}
                  {adminRates.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-[var(--border-subtle)]/50"
                    >
                      <td className="p-2">
                        {new Date(r.date).toLocaleDateString()}
                      </td>
                      <td className="p-2">{r.mandi}</td>
                      <td className="p-2 font-bold text-[#e67e00]">
                        {r.todayRate}
                      </td>
                      <td className="p-2">{r.mcPoint ?? "—"}</td>
                      <td className="p-2 text-[10px] text-[var(--text-muted-alt)]">
                        {r.updatedAt
                          ? new Date(r.updatedAt).toLocaleString()
                          : r.createdAt
                            ? new Date(r.createdAt).toLocaleString()
                            : "—"}
                      </td>
                      <td className="p-2 text-right space-x-2">
                        <button
                          type="button"
                          className="text-amber-400 text-xs font-bold"
                          onClick={() =>
                            setAdminRateForm({
                              id: r.id,
                              date: new Date(r.date)
                                .toISOString()
                                .split("T")[0],
                              mandi: r.mandi,
                              todayRate: String(r.todayRate ?? ""),
                              mcPoint:
                                r.mcPoint != null ? String(r.mcPoint) : "",
                            })
                          }
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-400 text-xs font-bold"
                          onClick={() => deleteAdminRate(r.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Table 01 — mill-wise Boli Record (no row divider lines; F32 Pg.2/3) */}
        <div className="overflow-x-auto rounded-lg bg-[var(--bg-panel-alt)]">
          <table className="w-full border-collapse text-[var(--text-muted)] text-sm min-w-[1100px]">
            <thead>
              <tr className="uppercase text-[var(--text-muted-alt)] text-[10px] text-left border-b border-[var(--border-subtle)]">
                <th className="p-2 font-semibold">Party Name</th>
                <th className="p-2 font-semibold">Date</th>
                <th className="p-2 font-semibold">Boli No.</th>
                <th className="p-2 font-semibold">M/C</th>
                <th className="p-2 font-semibold">MC Deduct</th>
                <th className="p-2 font-semibold">Est. Bags</th>
                <th className="p-2 font-semibold">Final Bags</th>
                <th className="p-2 font-semibold">Today Rate</th>
                <th className="p-2 font-semibold">Base Boli</th>
                <th className="p-2 font-semibold">Price (Boli Rate)</th>
                {!hidePaymentHisab && (
                  <>
                    <th className="p-2 font-semibold">Payment</th>
                    <th className="p-2 font-semibold">Final Hisab</th>
                  </>
                )}
                <th className="p-2 font-semibold">Received</th>
                <th className="p-2 font-semibold">Balance</th>
                <th className="p-2 font-semibold">Complete</th>
                <th className="p-2 font-semibold">Note</th>
                <th className="p-2 font-semibold text-right">Edit</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={boliTableColSpan}
                    className="p-6 text-center text-[var(--text-muted-alt)]"
                  >
                    Loading…
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((r) => {
                  const showCluster = r.partyName !== lastParty;
                  lastParty = r.partyName;
                  return (
                    <tr
                      key={r.boliId}
                      className={`hover:bg-[var(--glass-bg)]/60 ${
                        r.isCancelled ? "opacity-50" : ""
                      } ${showCluster ? "pt-1" : ""}`}
                    >
                      <td className="p-2 font-medium text-[var(--text-main)]">
                        {showCluster ? r.partyName : ""}
                        {r.mandi && showCluster ? (
                          <div className="text-[10px] text-[var(--text-muted-alt)]">
                            {r.mandi}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-2">
                        {new Date(r.date).toLocaleDateString()}
                      </td>
                      <td className="p-2 font-mono text-xs text-[#e67e00]">
                        {r.boliNo || "-"}
                      </td>
                      <td className="p-2">{r.moisture ?? "-"}</td>
                      <td
                        className="p-2 font-mono text-xs"
                        title="(Current M/C − Benchmark) × M/C Point"
                      >
                        {r.mcDeduction != null
                          ? `₹${Number(r.mcDeduction).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="p-2">{r.estimatedBags ?? "-"}</td>
                      <td className="p-2 font-bold text-[var(--text-main)]">
                        {r.finalBags ?? "—"}
                      </td>
                      <td className="p-2 text-[var(--text-muted)]">
                        {r.todayRate != null ? r.todayRate : "—"}
                      </td>
                      <td
                        className="p-2 font-mono text-xs"
                        title="Today Rate − M/C Deduction"
                      >
                        {r.baseBoliRate != null
                          ? Number(r.baseBoliRate).toFixed(2)
                          : "—"}
                      </td>
                      <td className="p-2 font-bold text-[#e67e00]">
                        {r.rate ?? "-"}
                      </td>
                      {!hidePaymentHisab && (
                        <>
                      <td className="p-2">
                        {r.payment != null
                          ? `₹${Number(r.payment).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="p-2">
                        {Number(r.finalHisabAmt) > 0 ? (
                          <span className="text-red-500 font-bold inline-flex items-center gap-1">
                            <ArrowUpRight size={12} /> ₹
                            {Number(r.finalHisabAmt).toFixed(2)}
                          </span>
                        ) : Number(r.finalHisabAmt) < 0 ? (
                          <span className="text-green-500 font-bold inline-flex items-center gap-1">
                            <ArrowDownRight size={12} /> ₹
                            {Math.abs(Number(r.finalHisabAmt)).toFixed(2)}
                          </span>
                        ) : (
                          <span>₹0</span>
                        )}
                      </td>
                        </>
                      )}
                      <td className="p-2">{r.bagsReceived ?? 0}</td>
                      <td className="p-2">
                        {r.balanceBags != null ? r.balanceBags : "—"}
                      </td>
                      <td className="p-2 text-center">
                        {r.isCompleted ? (
                          <span className="text-green-500 text-xs font-bold">
                            ✓ Done
                          </span>
                        ) : r.isCancelled ? (
                          <span className="text-[var(--text-muted-alt)] text-xs">
                            Cancelled
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted-alt)] text-xs">
                            Underway
                          </span>
                        )}
                      </td>
                      <td className="p-2 max-w-[120px] truncate">
                        {displayNote(r.note) || ""}
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-1">
                          {isAdmin && canEditBoli && (
                            <button
                              onClick={() => openAdminEdit(r)}
                              className="text-[#e67e00] hover:text-orange-400 text-[10px] font-bold px-1"
                              title="Admin edit Payment / Note / Final Bags"
                            >
                              Admin
                            </button>
                          )}
                          {canEditRow(r) ? (
                            <button
                              onClick={() => onEditEstimate(r)}
                              className="text-blue-400 hover:text-blue-300"
                              title="Edit estimate"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          ) : !isAdmin ? (
                            <span className="text-[10px] text-[var(--text-muted-alt)]">
                              Locked
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={boliTableColSpan}
                    className="p-6 text-center text-[var(--text-muted-alt)]"
                  >
                    No boli records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!filters.supplierId ? (
          <Pagination
            currentPage={page}
            totalItems={total}
            itemsPerPage={pageSize}
            onPageChange={setPage}
            pageSizeOptions={[10, 50, 100]}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        ) : (
          <p className="text-xs text-[var(--text-muted-alt)] py-2">
            Showing all {total} boli(s) for selected Artia (no pagination).
          </p>
        )}

        {/* Moisture & Boli Rate highlights — highest / lowest of each day */}
        {dayHighlights.length > 0 && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel-alt)] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-main)]">
                  Moisture &amp; Boli Rate Highlights
                </h3>
                <p className="text-[10px] text-[var(--text-muted-alt)]">
                  Highest and lowest moisture of the day alongside highest and
                  lowest Boli rates.
                </p>
              </div>
              {lastSyncedAt && (
                <span className="text-[10px] text-[var(--text-muted-alt)]">
                  Live · updated {lastSyncedAt.toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {dayHighlights.map((d: any) => (
                <div
                  key={d.date}
                  className="min-w-[220px] flex-shrink-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3 text-xs space-y-2"
                >
                  <div className="font-bold text-[#e67e00]">
                    {d.date
                      ? new Date(d.date + "T00:00:00").toLocaleDateString()
                      : "—"}
                    <span className="ml-2 font-normal text-[var(--text-muted-alt)]">
                      {d.count} line{d.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded border border-red-500/30 bg-red-500/10 p-2">
                      <div className="text-[10px] text-red-400/80 uppercase">
                        High Rate
                      </div>
                      <div className="text-red-400 font-bold text-sm">
                        ₹{d.highRate}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted-alt)] truncate">
                        {d.highRateBoliNo || "—"}
                      </div>
                    </div>
                    <div className="rounded border border-green-500/30 bg-green-500/10 p-2">
                      <div className="text-[10px] text-green-400/80 uppercase">
                        Low Rate
                      </div>
                      <div className="text-green-400 font-bold text-sm">
                        ₹{d.lowRate}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted-alt)] truncate">
                        {d.lowRateBoliNo || "—"}
                      </div>
                    </div>
                    <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2">
                      <div className="text-[10px] text-amber-400/80 uppercase">
                        High M/C
                      </div>
                      <div className="text-amber-300 font-bold text-sm">
                        {d.highMoisture}%
                      </div>
                      <div className="text-[10px] text-[var(--text-muted-alt)] truncate">
                        {d.highMoistureBoliNo || "—"}
                      </div>
                    </div>
                    <div className="rounded border border-sky-500/30 bg-sky-500/10 p-2">
                      <div className="text-[10px] text-sky-400/80 uppercase">
                        Low M/C
                      </div>
                      <div className="text-sky-300 font-bold text-sm">
                        {d.lowMoisture}%
                      </div>
                      <div className="text-[10px] text-[var(--text-muted-alt)] truncate">
                        {d.lowMoistureBoliNo || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Purchase Trends — High & Low (Artia-wise / Mandi-wise) */}
        {purchaseTrends && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel-alt)] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-main)]">
                  Purchase Trends (High &amp; Low)
                </h3>
                <p className="text-[10px] text-[var(--text-muted-alt)]">
                  Artia-wise and Mandi-wise high / low Boli purchase rates for
                  the selected filters.
                </p>
              </div>
              {purchaseTrends.overall?.count > 0 && (
                <div className="flex gap-3 text-xs">
                  <span className="px-2 py-1 rounded bg-red-500/15 text-red-400 font-bold">
                    Overall High ₹{purchaseTrends.overall.high}
                  </span>
                  <span className="px-2 py-1 rounded bg-green-500/15 text-green-400 font-bold">
                    Overall Low ₹{purchaseTrends.overall.low}
                  </span>
                  <span className="px-2 py-1 rounded border border-[var(--border-subtle)] text-[var(--text-muted-alt)]">
                    Avg ₹{purchaseTrends.overall.avg} ·{" "}
                    {purchaseTrends.overall.count} lines
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTrendTab("artia")}
                className={`px-3 py-1.5 rounded text-xs font-bold border ${
                  trendTab === "artia"
                    ? "bg-[#e67e00]/20 border-[#e67e00]/50 text-[#e67e00]"
                    : "border-[var(--border-subtle)] text-[var(--text-muted-alt)]"
                }`}
              >
                Artia-wise ({purchaseTrends.byArtia?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setTrendTab("mandi")}
                className={`px-3 py-1.5 rounded text-xs font-bold border ${
                  trendTab === "mandi"
                    ? "bg-[#e67e00]/20 border-[#e67e00]/50 text-[#e67e00]"
                    : "border-[var(--border-subtle)] text-[var(--text-muted-alt)]"
                }`}
              >
                Mandi-wise ({purchaseTrends.byMandi?.length || 0})
              </button>
              <button
                type="button"
                className="ml-auto flex items-center gap-2 bg-[#e67e00] text-black px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-orange-500/20 hover:bg-[#f08c1a]"
                onClick={() => {
                  const list =
                    trendTab === "artia"
                      ? purchaseTrends.byArtia
                      : purchaseTrends.byMandi;
                  if (!list?.length) {
                    useUiStore
                      .getState()
                      .addToast("No trend rows to export", "error");
                    return;
                  }
                  if (trendTab === "artia") {
                    exportStyledExcel(
                      list.map((a: any) => ({
                        partyName: a.partyName || "",
                        mandi: a.mandi || "",
                        highRate: a.high ?? "",
                        highDate: formatExcelDate(a.highDate),
                        highBoliNo: a.highBoliNo || "",
                        lowMoisture: a.lowMoisture ?? "",
                        lowRate: a.low ?? "",
                        lowDate: formatExcelDate(a.lowDate),
                        lowBoliNo: a.lowBoliNo || "",
                        highMoisture: a.highMoisture ?? "",
                        avg: a.avg ?? "",
                        spread: a.spread ?? "",
                        lines: a.count ?? "",
                        bags: a.bags ?? "",
                      })),
                      [
                        { key: "partyName", header: "Artia" },
                        { key: "mandi", header: "Mandi" },
                        {
                          key: "highRate",
                          header: "High Rate",
                          styleFor: () => boldColorStyle("EF4444"),
                        },
                        { key: "highDate", header: "High Date" },
                        { key: "highBoliNo", header: "High Boli No." },
                        { key: "lowMoisture", header: "Lowest Moisture" },
                        {
                          key: "lowRate",
                          header: "Low Rate",
                          styleFor: () => boldColorStyle("22C55E"),
                        },
                        { key: "lowDate", header: "Low Date" },
                        { key: "lowBoliNo", header: "Low Boli No." },
                        { key: "highMoisture", header: "Highest Moisture" },
                        { key: "avg", header: "Avg" },
                        { key: "spread", header: "Spread" },
                        { key: "lines", header: "Lines" },
                        { key: "bags", header: "Bags" },
                      ],
                      "Purchase_Trends_Artia",
                      "Artia Trends",
                    );
                  } else {
                    exportStyledExcel(
                      list.map((m: any) => ({
                        mandi: m.mandi || "",
                        highRate: m.high ?? "",
                        highDate: formatExcelDate(m.highDate),
                        highBoliNo: m.highBoliNo || "",
                        lowMoisture: m.lowMoisture ?? "",
                        lowRate: m.low ?? "",
                        lowDate: formatExcelDate(m.lowDate),
                        lowBoliNo: m.lowBoliNo || "",
                        highMoisture: m.highMoisture ?? "",
                        avg: m.avg ?? "",
                        spread: m.spread ?? "",
                        lines: m.count ?? "",
                        bags: m.bags ?? "",
                      })),
                      [
                        { key: "mandi", header: "Mandi" },
                        {
                          key: "highRate",
                          header: "High Rate",
                          styleFor: () => boldColorStyle("EF4444"),
                        },
                        { key: "highDate", header: "High Date" },
                        { key: "highBoliNo", header: "High Boli No." },
                        { key: "lowMoisture", header: "Lowest Moisture" },
                        {
                          key: "lowRate",
                          header: "Low Rate",
                          styleFor: () => boldColorStyle("22C55E"),
                        },
                        { key: "lowDate", header: "Low Date" },
                        { key: "lowBoliNo", header: "Low Boli No." },
                        { key: "highMoisture", header: "Highest Moisture" },
                        { key: "avg", header: "Avg" },
                        { key: "spread", header: "Spread" },
                        { key: "lines", header: "Lines" },
                        { key: "bags", header: "Bags" },
                      ],
                      "Purchase_Trends_Mandi",
                      "Mandi Trends",
                    );
                  }
                }}
              >
                <Download size={18} /> Export {trendTab} Excel
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] max-h-72 overflow-y-auto">
              {trendTab === "artia" ? (
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-[var(--bg-panel-alt)]">
                    <tr className="text-[10px] uppercase text-[var(--text-muted-alt)] text-left border-b border-[var(--border-subtle)]">
                      <th className="p-2">Artia</th>
                      <th className="p-2">Mandi</th>
                      <th className="p-2 text-red-400">High</th>
                      <th className="p-2">High Date / Boli</th>
                      <th className="p-2 text-sky-400">Lowest Moisture</th>
                      <th className="p-2 text-green-400">Low</th>
                      <th className="p-2">Low Date / Boli</th>
                      <th className="p-2 text-sky-400">Highest Moisture</th>
                      <th className="p-2">Avg</th>
                      <th className="p-2">Spread</th>
                      <th className="p-2">Lines</th>
                      <th className="p-2">Bags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(purchaseTrends.byArtia || []).length === 0 && (
                      <tr>
                        <td
                          colSpan={12}
                          className="p-4 text-center text-[var(--text-muted-alt)]"
                        >
                          No Artia purchase trends in this filter range.
                        </td>
                      </tr>
                    )}
                    {(purchaseTrends.byArtia || []).map((a: any) => (
                      <tr
                        key={a.supplierId || a.partyName}
                        className="border-b border-[var(--border-subtle)]/40"
                      >
                        <td className="p-2 font-medium text-[var(--text-main)]">
                          {a.partyName}
                        </td>
                        <td className="p-2 text-[var(--text-muted-alt)]">
                          {a.mandi}
                        </td>
                        <td className="p-2 text-red-400 font-bold">
                          ₹{a.high}
                        </td>
                        <td className="p-2 text-[10px] text-[var(--text-muted-alt)]">
                          {a.highDate
                            ? new Date(a.highDate).toLocaleDateString()
                            : "—"}
                          {a.highBoliNo ? ` · ${a.highBoliNo}` : ""}
                        </td>
                        <td className="p-2 text-sky-300 font-bold">
                          {a.lowMoisture != null ? `${a.lowMoisture}%` : "—"}
                        </td>
                        <td className="p-2 text-green-400 font-bold">
                          ₹{a.low}
                        </td>
                        <td className="p-2 text-[10px] text-[var(--text-muted-alt)]">
                          {a.lowDate
                            ? new Date(a.lowDate).toLocaleDateString()
                            : "—"}
                          {a.lowBoliNo ? ` · ${a.lowBoliNo}` : ""}
                        </td>
                        <td className="p-2 text-sky-300 font-bold">
                          {a.highMoisture != null ? `${a.highMoisture}%` : "—"}
                        </td>
                        <td className="p-2">₹{a.avg}</td>
                        <td className="p-2">₹{a.spread}</td>
                        <td className="p-2">{a.count}</td>
                        <td className="p-2">{a.bags}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-[var(--bg-panel-alt)]">
                    <tr className="text-[10px] uppercase text-[var(--text-muted-alt)] text-left border-b border-[var(--border-subtle)]">
                      <th className="p-2">Mandi</th>
                      <th className="p-2 text-red-400">High</th>
                      <th className="p-2">High Date / Boli</th>
                      <th className="p-2 text-sky-400">Lowest Moisture</th>
                      <th className="p-2 text-green-400">Low</th>
                      <th className="p-2">Low Date / Boli</th>
                      <th className="p-2 text-sky-400">Highest Moisture</th>
                      <th className="p-2">Avg</th>
                      <th className="p-2">Spread</th>
                      <th className="p-2">Lines</th>
                      <th className="p-2">Bags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(purchaseTrends.byMandi || []).length === 0 && (
                      <tr>
                        <td
                          colSpan={11}
                          className="p-4 text-center text-[var(--text-muted-alt)]"
                        >
                          No Mandi purchase trends in this filter range.
                        </td>
                      </tr>
                    )}
                    {(purchaseTrends.byMandi || []).map((m: any) => (
                      <tr
                        key={m.mandi}
                        className="border-b border-[var(--border-subtle)]/40"
                      >
                        <td className="p-2 font-medium text-[var(--text-main)]">
                          {m.mandi}
                        </td>
                        <td className="p-2 text-red-400 font-bold">
                          ₹{m.high}
                        </td>
                        <td className="p-2 text-[10px] text-[var(--text-muted-alt)]">
                          {m.highDate
                            ? new Date(m.highDate).toLocaleDateString()
                            : "—"}
                          {m.highBoliNo ? ` · ${m.highBoliNo}` : ""}
                        </td>
                        <td className="p-2 text-sky-300 font-bold">
                          {m.lowMoisture != null ? `${m.lowMoisture}%` : "—"}
                        </td>
                        <td className="p-2 text-green-400 font-bold">
                          ₹{m.low}
                        </td>
                        <td className="p-2 text-[10px] text-[var(--text-muted-alt)]">
                          {m.lowDate
                            ? new Date(m.lowDate).toLocaleDateString()
                            : "—"}
                          {m.lowBoliNo ? ` · ${m.lowBoliNo}` : ""}
                        </td>
                        <td className="p-2 text-sky-300 font-bold">
                          {m.highMoisture != null ? `${m.highMoisture}%` : "—"}
                        </td>
                        <td className="p-2">₹{m.avg}</td>
                        <td className="p-2">₹{m.spread}</td>
                        <td className="p-2">{m.count}</td>
                        <td className="p-2">{m.bags}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Mandi-wise / Artia-wise Overpriced & Underpriced logs */}
        {priceRecords && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel-alt)] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-main)]">
                  Mandi-wise Price Records
                </h3>
                <p className="text-[10px] text-[var(--text-muted-alt)]">
                  Overpriced / Underpriced purchases vs Base Boli Rate, tracked
                  separately per Mandi and Artia.
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-red-500/15 text-red-400 font-bold">
                  ↑ Overpriced {priceRecords.summary.overpricedCount} (Δ ₹
                  {priceRecords.summary.overpricedDeltaSum})
                </span>
                <span className="px-2 py-1 rounded bg-green-500/15 text-green-400 font-bold">
                  ↓ Underpriced {priceRecords.summary.underpricedCount} (Δ ₹
                  {priceRecords.summary.underpricedDeltaSum})
                </span>
              </div>
            </div>

            {priceRecords.byMandi.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase text-[var(--text-muted-alt)] text-left border-b border-[var(--border-subtle)]">
                      <th className="p-2">Mandi</th>
                      <th className="p-2">Artia</th>
                      <th className="p-2 text-red-400">Overpriced #</th>
                      <th className="p-2 text-sky-400">Moisture</th>
                      <th className="p-2 text-red-400">Over Δ</th>
                      <th className="p-2 text-green-400">Underpriced #</th>
                      <th className="p-2 text-green-400">Under Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceRecords.byMandi.flatMap((m: any) =>
                      (m.artias || []).map((a: any) => (
                        <tr
                          key={`${m.mandi}-${a.supplierId || a.partyName}`}
                          className="border-b border-[var(--border-subtle)]/40"
                        >
                          <td className="p-2 font-medium">{m.mandi}</td>
                          <td className="p-2">{a.partyName}</td>
                          <td className="p-2 text-red-400 font-bold">
                            {a.overpricedCount}
                          </td>
                          <td className="p-2 text-sky-300 font-bold">
                            {a.overpricedMoistureMin == null
                              ? "—"
                              : a.overpricedMoistureMin === a.overpricedMoistureMax
                                ? `${a.overpricedMoistureMin}%`
                                : `${a.overpricedMoistureMin}–${a.overpricedMoistureMax}%`}
                          </td>
                          <td className="p-2 text-red-400">
                            {a.overpricedDeltaSum
                              ? `+${a.overpricedDeltaSum}`
                              : "0"}
                          </td>
                          <td className="p-2 text-green-400 font-bold">
                            {a.underpricedCount}
                          </td>
                          <td className="p-2 text-green-400">
                            {a.underpricedDeltaSum || 0}
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPriceTab("overpriced")}
                className={`px-3 py-1.5 rounded text-xs font-bold border ${
                  priceTab === "overpriced"
                    ? "bg-red-500/20 border-red-500/50 text-red-400"
                    : "border-[var(--border-subtle)] text-[var(--text-muted-alt)]"
                }`}
              >
                Overpriced log ({priceRecords.overpriced.length})
              </button>
              <button
                type="button"
                onClick={() => setPriceTab("underpriced")}
                className={`px-3 py-1.5 rounded text-xs font-bold border ${
                  priceTab === "underpriced"
                    ? "bg-green-500/20 border-green-500/50 text-green-400"
                    : "border-[var(--border-subtle)] text-[var(--text-muted-alt)]"
                }`}
              >
                Underpriced log ({priceRecords.underpriced.length})
              </button>
              <button
                type="button"
                className="ml-auto flex items-center gap-2 bg-[#e67e00] text-black px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-orange-500/20 hover:bg-[#f08c1a]"
                onClick={() => {
                  const list =
                    priceTab === "overpriced"
                      ? priceRecords.overpriced
                      : priceRecords.underpriced;
                  if (!list.length) {
                    useUiStore
                      .getState()
                      .addToast("No rows to export", "error");
                    return;
                  }
                  const isOver = priceTab === "overpriced";
                  exportStyledExcel(
                    list.map((item: any) => ({
                      mandi: item.mandi || "",
                      partyName: item.partyName || "",
                      date: formatExcelDate(item.date),
                      boliNo: item.boliNo || "",
                      baseBoliRate:
                        item.baseBoliRate != null
                          ? Number(item.baseBoliRate)
                          : "",
                      rate: item.rate ?? "",
                      status: isOver ? "↑ Overpriced" : "↓ Underpriced",
                      vsBase:
                        item.rateVsBase != null
                          ? isOver
                            ? `+${item.rateVsBase}`
                            : item.rateVsBase
                          : "",
                      bags: item.estimatedBags ?? "",
                    })),
                    [
                      { key: "mandi", header: "Mandi" },
                      { key: "partyName", header: "Artia" },
                      { key: "date", header: "Date" },
                      {
                        key: "boliNo",
                        header: "Boli No.",
                        styleFor: () => boldColorStyle("E67E00"),
                      },
                      { key: "baseBoliRate", header: "Base Boli" },
                      {
                        key: "rate",
                        header: "Rate",
                        styleFor: () =>
                          boldColorStyle(isOver ? "EF4444" : "22C55E"),
                      },
                      {
                        key: "status",
                        header: "Status",
                        styleFor: () =>
                          boldColorStyle(isOver ? "EF4444" : "22C55E"),
                      },
                      {
                        key: "vsBase",
                        header: "Vs Base",
                        styleFor: () =>
                          boldColorStyle(isOver ? "EF4444" : "22C55E"),
                      },
                      { key: "bags", header: "Bags" },
                    ],
                    `Mandi_${priceTab}_purchases`,
                    isOver ? "Overpriced" : "Underpriced",
                  );
                }}
              >
                <Download size={18} /> Export {priceTab} Excel
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] max-h-64 overflow-y-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-[var(--bg-panel-alt)]">
                  <tr className="text-[10px] uppercase text-[var(--text-muted-alt)] text-left border-b border-[var(--border-subtle)]">
                    <th className="p-2">Mandi</th>
                    <th className="p-2">Artia</th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Boli No.</th>
                    <th className="p-2">Base</th>
                    <th className="p-2">Rate</th>
                    <th className="p-2">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {(priceTab === "overpriced"
                    ? priceRecords.overpriced
                    : priceRecords.underpriced
                  ).length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-4 text-center text-[var(--text-muted-alt)]"
                      >
                        No {priceTab} purchases in this filter range.
                      </td>
                    </tr>
                  )}
                  {(priceTab === "overpriced"
                    ? priceRecords.overpriced
                    : priceRecords.underpriced
                  ).map((r: any) => (
                    <tr
                      key={r.id || `${r.boliId}-${r.date}`}
                      className="border-b border-[var(--border-subtle)]/40"
                    >
                      <td className="p-2">{r.mandi || "—"}</td>
                      <td className="p-2">{r.partyName || "—"}</td>
                      <td className="p-2">
                        {r.date
                          ? new Date(r.date).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="p-2 font-mono text-[#e67e00]">
                        {r.boliNo || "—"}
                      </td>
                      <td className="p-2">{r.baseBoliRate ?? "—"}</td>
                      <td
                        className={`p-2 font-bold ${
                          priceTab === "overpriced"
                            ? "text-red-500"
                            : "text-green-500"
                        }`}
                      >
                        {priceTab === "overpriced" ? "↑ " : "↓ "}
                        {r.rate ?? "—"}
                      </td>
                      <td
                        className={`p-2 ${
                          priceTab === "overpriced"
                            ? "text-red-400"
                            : "text-green-400"
                        }`}
                      >
                        {r.rateVsBase != null
                          ? priceTab === "overpriced"
                            ? `+${r.rateVsBase}`
                            : r.rateVsBase
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Final Boli — Feedback 32 Pg.2 */}
        <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-panel-alt)]">
          <div className="px-4 py-2 border-b border-[var(--border-subtle)] font-bold text-sm text-[#e67e00] bg-[#e67e00]/10">
            Add Final Boli
          </div>
          <form onSubmit={submitFinalBoli} className="p-4 space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[var(--text-muted-alt)] mb-1">
                  Boli No. (Dropdown)
                </label>
                <select
                  value={finalForm.boliId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const b = openBolis.find((x) => x.id === id);
                    // Auto-fetch all estimate details for this Boli No.
                    setFinalForm((f) => ({
                      ...f,
                      boliId: id,
                      supervisorName:
                        b?.supervisorName ||
                        (isSupervisor ? user?.username : "") ||
                        "",
                      artiaBillChecked: "No",
                      finalBagsById: {},
                      biometricData: "",
                    }));
                  }}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                >
                  <option value="">Select Boli No.</option>
                  {openBoliOptions.map((b) => (
                    <option key={b.sodaId || b.id} value={b.id}>
                      {b.boliNo} — {b.artiaName}
                      {b.date
                        ? ` (${new Date(b.date).toLocaleDateString()})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted-alt)] mb-1">
                  Artia Name (Auto-fetch)
                </label>
                <input
                  readOnly
                  tabIndex={-1}
                  value={selectedOpen?.artiaName || ""}
                  placeholder="—"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] opacity-80 cursor-default"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted-alt)] mb-1">
                  Mandi Name (Auto-fetch)
                </label>
                <input
                  readOnly
                  tabIndex={-1}
                  value={selectedOpen?.mandi || ""}
                  placeholder="—"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] opacity-80 cursor-default"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted-alt)] mb-1">
                  Supervisor
                </label>
                {isSupervisor || !isAdmin ? (
                  <input
                    readOnly
                    tabIndex={-1}
                    value={
                      selectedOpen?.supervisorName ||
                      finalForm.supervisorName ||
                      user?.username ||
                      ""
                    }
                    placeholder="—"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] opacity-80 cursor-default"
                  />
                ) : (
                  <select
                    value={finalForm.supervisorName}
                    onChange={(e) =>
                      setFinalForm((f) => ({
                        ...f,
                        supervisorName: e.target.value,
                      }))
                    }
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                  >
                    <option value="">Select Supervisor</option>
                    {selectedOpen?.supervisorName && (
                      <option value={selectedOpen.supervisorName}>
                        {selectedOpen.supervisorName}
                      </option>
                    )}
                    {supervisors.map((s) => (
                      <option key={s.id} value={s.username}>
                        {s.username}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-[var(--text-muted-alt)] mb-1">
                  Artia Bill Checked And Matched of this Boli
                </label>
                <div className="flex gap-4 py-2">
                  {(["Yes", "No"] as const).map((v) => (
                    <label
                      key={v}
                      className="flex items-center gap-2 cursor-pointer text-[var(--text-main)]"
                    >
                      <input
                        type="radio"
                        name="artiaBillChecked"
                        checked={finalForm.artiaBillChecked === v}
                        onChange={() =>
                          setFinalForm((f) => ({
                            ...f,
                            artiaBillChecked: v,
                            ...(v === "No"
                              ? { finalBagsById: {}, biometricData: "" }
                              : {}),
                          }))
                        }
                        className="accent-[#e67e00]"
                      />
                      {v}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* All lines for selected Boli No. (can be > 4) — M/C | Estimate Bags | Rate | Final Bags */}
            {(() => {
              if (!selectedOpen) {
                return (
                  <p className="text-xs text-[var(--text-muted-alt)] px-1">
                    Select a Boli No. to see all lines for that soda.
                  </p>
                );
              }
              if (!finalBoliLines.length) {
                return (
                  <p className="text-xs text-[var(--text-muted-alt)] px-1">
                    No open lines for this Boli No.
                  </p>
                );
              }
              return (
                <div className="overflow-x-auto rounded-lg bg-[var(--bg-base)] px-1 py-2">
                  <table className="w-full text-sm border-separate border-spacing-0">
                    <thead>
                      <tr className="text-[var(--text-muted-alt)] text-[11px] uppercase tracking-wide">
                        <th className="font-medium text-left px-3 py-2 w-10">
                          #
                        </th>
                        <th className="font-medium text-left px-3 py-2">
                          Boli No.
                        </th>
                        <th className="font-medium text-left px-3 py-2">
                          M/C
                        </th>
                        <th className="font-medium text-left px-3 py-2">
                          Estimate Bags
                        </th>
                        <th className="font-medium text-left px-3 py-2">
                          Price (Boli Rate)
                        </th>
                        <th className="font-medium text-left px-3 py-2">
                          Final Bags{" "}
                          <span className="text-red-500 normal-case">*</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {finalBoliLines.map((line: any, idx: number) => {
                        const bagsCancelled =
                          line.isCancelled ||
                          (!Number.isNaN(Number(line.estimatedBags)) &&
                            Number(line.estimatedBags) === 0);
                        const alreadyFinal =
                          line.needsFinal === false || line.finalBags != null;
                        const locked =
                          !billYes || bagsCancelled || alreadyFinal;
                        return (
                          <tr
                            key={line.id}
                            className="border-t border-[var(--border-subtle)]/40"
                          >
                            <td className="px-3 py-1.5 text-[var(--text-muted-alt)] text-xs">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-1.5 align-middle text-[var(--text-muted)] text-xs">
                              {line.boliNo || "-"}
                            </td>
                            <td className="px-3 py-1.5 align-middle">
                              <input
                                readOnly
                                tabIndex={-1}
                                title="Auto-fetched from Estimate Purchase"
                                value={
                                  bagsCancelled
                                    ? ""
                                    : line.moisture != null &&
                                        line.moisture !== ""
                                      ? String(line.moisture)
                                      : ""
                                }
                                placeholder={
                                  bagsCancelled ? "Cancelled" : "Auto"
                                }
                                className="w-full min-w-[5rem] bg-transparent border-0 px-0 py-1 text-[var(--text-main)] opacity-90 cursor-default outline-none"
                              />
                            </td>
                            <td className="px-3 py-1.5 align-middle">
                              <input
                                readOnly
                                tabIndex={-1}
                                title="Auto-fetched from Estimate Purchase"
                                value={
                                  bagsCancelled
                                    ? ""
                                    : line.estimatedBags != null &&
                                        line.estimatedBags !== ""
                                      ? String(line.estimatedBags)
                                      : ""
                                }
                                placeholder={bagsCancelled ? "" : "Auto"}
                                className="w-full min-w-[5rem] bg-transparent border-0 px-0 py-1 text-[var(--text-main)] opacity-90 cursor-default outline-none"
                              />
                            </td>
                            <td className="px-3 py-1.5 align-middle">
                              <input
                                readOnly
                                tabIndex={-1}
                                title="Boli Rate (Price) from Estimate Purchase"
                                value={
                                  bagsCancelled
                                    ? ""
                                    : line.rate != null && line.rate !== ""
                                      ? String(line.rate)
                                      : ""
                                }
                                placeholder={bagsCancelled ? "" : "Auto"}
                                className="w-full min-w-[5rem] bg-transparent border-0 px-0 py-1 text-[var(--text-main)] font-bold opacity-90 cursor-default outline-none"
                              />
                            </td>
                            <td className="px-3 py-1.5 align-middle">
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={3}
                                disabled={locked}
                                title={
                                  bagsCancelled
                                    ? "Cancelled (Bags = 0) — Final Bags not applicable"
                                    : alreadyFinal
                                      ? "Final Bags already submitted"
                                      : billYes
                                        ? hidePaymentHisab
                                          ? "Enter Final Bags (max 999)"
                                          : "Enter Final Bags (max 999). Payment = (Govt − Boli Rate) × (Final Bags × 0.375)"
                                        : "Set Artia Bill Checked = Yes to enable"
                                }
                                value={
                                  bagsCancelled
                                    ? ""
                                    : alreadyFinal
                                      ? String(line.finalBags ?? "")
                                      : finalForm.finalBagsById[line.id] || ""
                                }
                                onChange={(e) => {
                                  if (!line?.id || locked) return;
                                  const raw = e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 3);
                                  setFinalForm((f) => ({
                                    ...f,
                                    finalBagsById: {
                                      ...f.finalBagsById,
                                      [line.id]: raw,
                                    },
                                  }));
                                }}
                                placeholder={
                                  bagsCancelled
                                    ? "—"
                                    : alreadyFinal
                                      ? "Done"
                                      : billYes
                                        ? "Manual"
                                        : "Locked"
                                }
                                className={`w-full min-w-[6rem] bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-[var(--text-main)] outline-none focus:border-[#e67e00] ${
                                  locked ? "opacity-40 cursor-not-allowed" : ""
                                }`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="text-[10px] text-[var(--text-muted-alt)] px-3 pt-1">
                    All lines for this Boli No. are listed (can be more than 4).
                    {hidePaymentHisab
                      ? " Enter Final Bags when Artia Bill is checked."
                      : " Payment after Final Bags = (Govt Rate − Boli Rate) × (Final Bags × 0.375), shown per line on Boli Record."}
                  </p>
                </div>
              );
            })()}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={scanFingerprint}
                disabled={scanning || !billYes || !selectedOpen}
                className="px-3 py-2 rounded border border-[var(--border-subtle)] text-sm disabled:opacity-40"
              >
                {scanning
                  ? "Scanning…"
                  : finalForm.biometricData
                    ? "Fingerprint ✓"
                    : "Scan Fingerprint"}
              </button>
              {canEditBoli && (
                <button
                  type="submit"
                  disabled={!billYes || !selectedOpen || finalSaving}
                  className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {finalSaving ? "Submitting…" : "Submit with Fingerprint"}
                </button>
              )}
              {selectedOpen && canEditBoli && (
                <button
                  type="button"
                  onClick={cancelEntireSoda}
                  disabled={cancelling}
                  className="px-3 py-2 rounded border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/10 disabled:opacity-40"
                  title="Cancel entire soda — Bags set to 0; hidden from Paddy Inward; kept on Boli Record"
                >
                  {cancelling ? "Cancelling…" : "Cancel entire Soda"}
                </button>
              )}
            </div>
            {selectedOpen && (
              <p className="text-[10px] text-[var(--text-muted-alt)]">
                To cancel: use <b>Cancel entire Soda</b>, or enter Final Bags{" "}
                <b>0</b> on a line then submit. Cancelled bolis (Bags = 0) stay
                on Boli Record (Mandi / Artia) and do not appear in Paddy
                Inward. Cancel is blocked in Add Estimate Purchase.
              </p>
            )}
          </form>
        </div>
      </div>

      <CustomModal
        isOpen={adminEdit.isOpen}
        onClose={() =>
          setAdminEdit({
            isOpen: false,
            row: null,
            payment: "",
            note: "",
            finalBags: "",
          })
        }
        title="Admin Edit — Table 01"
      >
        {adminEdit.row && (
          <form onSubmit={saveAdminEdit} className="space-y-3">
            <p className="text-xs text-[var(--text-muted-alt)]">
              Boli {adminEdit.row.boliNo} · {adminEdit.row.partyName}
            </p>
            <div>
              <label className="block text-xs text-[var(--text-muted-alt)] mb-1">
                Final Bags
              </label>
              <input
                type="number"
                min="0"
                max="999"
                step="1"
                value={adminEdit.finalBags}
                onChange={(e) =>
                  setAdminEdit((s) => ({ ...s, finalBags: e.target.value }))
                }
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted-alt)] mb-1">
                Payment (H)
              </label>
              <input
                type="number"
                step="0.01"
                value={adminEdit.payment}
                onChange={(e) =>
                  setAdminEdit((s) => ({ ...s, payment: e.target.value }))
                }
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              />
              <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">
                Leave blank to auto-calc from Final Bags × 0.375 × (Govt −
                Rate). Final Hisab = total Payment for this Boli No.
              </p>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted-alt)] mb-1">
                Note
              </label>
              <textarea
                value={adminEdit.note}
                onChange={(e) =>
                  setAdminEdit((s) => ({ ...s, note: e.target.value }))
                }
                rows={2}
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setAdminEdit({
                    isOpen: false,
                    row: null,
                    payment: "",
                    note: "",
                    finalBags: "",
                  })
                }
                className="px-3 py-2 text-[var(--text-muted-alt)]"
              >
                Cancel
              </button>
              {canEditBoli && (
                <button
                  type="submit"
                  disabled={adminEditLock.pending}
                  className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold disabled:opacity-50"
                >
                  {adminEditLock.pending ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          </form>
        )}
      </CustomModal>
    </div>
  );
}

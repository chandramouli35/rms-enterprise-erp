import React, { useEffect, useMemo, useState } from "react";
import { Download, Fingerprint, Printer, Send, Truck } from "lucide-react";
import api from "../../api/axios";
import { exportToExcel } from "../../utils/exportUtils";
import { useUiStore } from "../../store/uiStore";
import { useAuthStore } from "../../store/authStore";
import { biometricService } from "../../services/biometricService";

type DaySheet = {
  date: string;
  millName: string;
  rows: any[];
  totals: { trucks: number; aClass: number; bClass: number; totalBags: number };
  submitted?: boolean;
  submittedAt?: string | null;
  unloaderSigned?: boolean;
  supervisorSigned?: boolean;
  unloaderSignedBy?: string | null;
  supervisorSignedBy?: string | null;
};

type UnloaderSheet = {
  unloaderName: string;
  days: DaySheet[];
  totalTrucks: number;
};

type SigState = {
  unloaderFp?: string;
  supervisorFp?: string;
  unloaderName?: string;
  supervisorName?: string;
  submitting?: boolean;
  scanning?: "unloader" | "supervisor" | null;
};

type ViewMode = "daily" | "range";

const cell = (v: any) =>
  v == null || v === "" || (typeof v === "number" && Number.isNaN(v)) ? "-" : v;

const PRINT_STYLES = `
  body{font-family:sans-serif;font-size:10px;color:#111;margin:12px}
  table{border-collapse:collapse;width:100%;margin-bottom:6px}
  th,td{border:1px solid #333;padding:3px 4px;text-align:center;vertical-align:middle}
  th{background:#f5f5f5;font-size:9px;font-weight:700}
  .left{text-align:left}
  h1{font-size:15px;margin:0 0 6px}
  h2{font-size:13px;margin:14px 0 4px}
  .hdr{display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;font-size:12px;font-weight:700}
  .meta{color:#444;margin-bottom:10px}
  .sig{display:flex;justify-content:space-around;margin-top:22px;font-size:11px}
  .sheet{page-break-inside:avoid;margin-bottom:20px}
  .day{margin-bottom:14px}
`;

function dayTableHtml(day: DaySheet, unloaderName: string): string {
  const body = day.rows
    .map(
      (r) => `<tr>
      <td>${cell(r.unloaderTruckCount)}</td>
      <td>${cell(r.rstNo)}</td>
      <td>${cell(r.millGp)}</td>
      <td>${cell(r.timeIn)}</td>
      <td>${cell(r.timeOut)}</td>
      <td>${cell(r.stackMain)}</td>
      <td>${cell(r.stackPart)}</td>
      <td>${cell(r.stackNo)}</td>
      <td>${cell(r.hoodi)}</td>
      <td class="left">${cell(r.truckNo)}</td>
      <td class="left">${cell(r.partyName)}</td>
      <td class="left">${cell(r.mandi)}</td>
      <td>${cell(r.moisture)}</td>
      <td>${cell(r.aClass)}</td>
      <td>${cell(r.bClass)}</td>
      <td><b>${cell(r.totalBags)}</b></td>
      <td>${cell(r.labourParty)}</td>
    </tr>`,
    )
    .join("");

  return `
  <div class="day">
    <div class="hdr">
      <span>Mill Name: ${cell(day.millName)}</span>
      <span>Unloader Name: ${cell(unloaderName)}</span>
      <span>Date: ${cell(day.date)}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th rowspan="2">A<br/>Unloader<br/>Truck count</th>
          <th rowspan="2">B<br/>RST No.</th>
          <th rowspan="2">C<br/>Mill.GP</th>
          <th rowspan="2">D<br/>Time in</th>
          <th rowspan="2">E<br/>Time out</th>
          <th colspan="2">Stack Type</th>
          <th rowspan="2">H<br/>Stack No.</th>
          <th rowspan="2">I<br/>Hoodi</th>
          <th rowspan="2">J<br/>Truck No.</th>
          <th rowspan="2">K<br/>Party Name</th>
          <th rowspan="2">L<br/>Mandi</th>
          <th rowspan="2">M<br/>M/C</th>
          <th colspan="3">Bardana</th>
          <th rowspan="2">Q<br/>Labour Party</th>
        </tr>
        <tr>
          <th>F Main</th>
          <th>G Part</th>
          <th>N A class</th>
          <th>O B class</th>
          <th>P Total</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
      <tfoot>
        <tr>
          <td><b>${day.totals.trucks}</b></td>
          <td colspan="12" style="text-align:left"><b>Total</b></td>
          <td><b>${day.totals.aClass}</b></td>
          <td><b>${day.totals.bClass}</b></td>
          <td><b>${day.totals.totalBags}</b></td>
          <td>-</td>
        </tr>
      </tfoot>
    </table>
    <div class="sig">
      <span>Unloader sign: ${
        day.unloaderSigned
          ? `✓ ${day.unloaderSignedBy || ""}`
          : "________________"
      }</span>
      <span>Supervisor Sign: ${
        day.supervisorSigned
          ? `✓ ${day.supervisorSignedBy || ""}`
          : "________________"
      }</span>
    </div>
  </div>`;
}

function openPrintWindow(title: string, bodyHtml: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(
    `<html><head><title>${title}</title><style>${PRINT_STYLES}</style></head><body>${bodyHtml}</body></html>`,
  );
  w.document.close();
  w.focus();
  w.print();
}

/**
 * Feedback 39 — Loader & Unloader report (A–Q template from Paddy Inward).
 */
export default function LoaderUnloaderReport({
  activePlant,
}: {
  activePlant: any;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const user = useAuthStore((s) => s.user);
  const toast = useUiStore((s) => s.addToast);
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [dailyDate, setDailyDate] = useState(today);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [unloaderFilter, setUnloaderFilter] = useState("");
  const [unloadersList, setUnloadersList] = useState<string[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sigs, setSigs] = useState<Record<string, SigState>>({});

  const effectiveFrom = viewMode === "daily" ? dailyDate : dateFrom;
  const effectiveTo = viewMode === "daily" ? dailyDate : dateTo;
  const isSingleDay = effectiveFrom === effectiveTo;
  const rangeLabel = isSingleDay
    ? effectiveFrom
    : `${effectiveFrom} → ${effectiveTo}`;

  const dayKey = (unloader: string, date: string) => `${unloader}|${date}`;

  const loadUnloaders = async () => {
    if (!activePlant?.id) return;
    try {
      const res = await api.get(`/api/procurement/unloaders/${activePlant.id}`);
      const names = (Array.isArray(res.data) ? res.data : [])
        .map((u: any) =>
          typeof u === "string" ? u : u?.name || u?.username || "",
        )
        .filter(Boolean);
      setUnloadersList([...new Set(names as string[])].sort());
    } catch {
      /* optional */
    }
  };

  const load = async () => {
    if (!activePlant?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        plantId: activePlant.id,
        dateFrom: effectiveFrom,
        dateTo: effectiveTo,
      });
      if (unloaderFilter.trim())
        params.append("unloaderName", unloaderFilter.trim());
      const res = await api.get(
        `/api/procurement/reports/loader-unloader?${params.toString()}`,
      );
      setData(res.data);
    } catch (e: any) {
      toast(
        e?.response?.data?.message || "Failed to load unloader report",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnloaders();
  }, [activePlant?.id]);

  useEffect(() => {
    load();
  }, [activePlant?.id, effectiveFrom, effectiveTo, unloaderFilter, viewMode]);

  const sheets: UnloaderSheet[] = data?.unloaders || [];

  const flatExport = useMemo(() => {
    const out: any[] = [];
    for (const u of sheets) {
      for (const day of u.days) {
        for (const r of day.rows) {
          out.push({
            "Mill Name": cell(day.millName),
            "Unloader Name": cell(u.unloaderName),
            Date: cell(day.date),
            "A Unloader Truck count": cell(r.unloaderTruckCount),
            "B RST No.": cell(r.rstNo),
            "C Mill.GP": cell(r.millGp),
            "D Time in": cell(r.timeIn),
            "E Time out": cell(r.timeOut),
            "F Main": cell(r.stackMain),
            "G Part": cell(r.stackPart),
            "H Stack No.": cell(r.stackNo),
            "I Hoodi": cell(r.hoodi),
            "J Truck No.": cell(r.truckNo),
            "K Party Name": cell(r.partyName),
            "L Mandi": cell(r.mandi),
            "M M/C": cell(r.moisture),
            "N A class": cell(r.aClass),
            "O B class": cell(r.bClass),
            "P Total": cell(r.totalBags),
            "Q Labour Party": cell(r.labourParty),
          });
        }
        out.push({
          "Mill Name": cell(day.millName),
          "Unloader Name": cell(u.unloaderName),
          Date: cell(day.date),
          "A Unloader Truck count": day.totals.trucks,
          "B RST No.": "TOTAL",
          "C Mill.GP": "-",
          "D Time in": "-",
          "E Time out": "-",
          "F Main": "-",
          "G Part": "-",
          "H Stack No.": "-",
          "I Hoodi": "-",
          "J Truck No.": "-",
          "K Party Name": "-",
          "L Mandi": "-",
          "M M/C": "-",
          "N A class": day.totals.aClass,
          "O B class": day.totals.bClass,
          "P Total": day.totals.totalBags,
          "Q Labour Party": "-",
        });
      }
    }
    return out;
  }, [sheets]);

  const printSheets = (target: UnloaderSheet[], title: string) => {
    if (!target.length) {
      toast("Nothing to print for this selection", "error");
      return;
    }
    const body = `
      <h1>${title}</h1>
      <div class="meta">${activePlant?.name || "Mill"} · ${rangeLabel}${
        unloaderFilter ? ` · Unloader: ${unloaderFilter}` : " · All unloaders"
      }</div>
      ${target
        .map(
          (u) => `
        <div class="sheet">
          <h2>${u.unloaderName} · ${u.totalTrucks} truck(s) · ${u.days.length} day(s)</h2>
          ${u.days.map((d) => dayTableHtml(d, u.unloaderName)).join("")}
        </div>`,
        )
        .join("")}`;
    openPrintWindow(`Loader_Unloader_${effectiveFrom}_${effectiveTo}`, body);
  };

  const printAll = () => {
    if (unloaderFilter && sheets.length === 1) {
      printSheets(
        sheets,
        `Loader & Unloader — ${unloaderFilter} (${rangeLabel})`,
      );
      return;
    }
    printSheets(
      sheets,
      isSingleDay
        ? "Loader & Unloader — Daily (all unloaders)"
        : "Loader & Unloader — Date range (all unloaders)",
    );
  };

  const printOneUnloader = (u: UnloaderSheet) =>
    printSheets([u], `Loader & Unloader — ${u.unloaderName} (${rangeLabel})`);

  const downloadExcel = () => {
    if (!flatExport.length) {
      toast("Nothing to download for this selection", "error");
      return;
    }
    const scope = unloaderFilter
      ? unloaderFilter.replace(/\s+/g, "_")
      : "All_Unloaders";
    exportToExcel(
      flatExport,
      `Loader_Unloader_${scope}_${effectiveFrom}_${effectiveTo}.xlsx`,
    );
    toast("Report downloaded", "success");
  };

  const scanFp = async (
    key: string,
    which: "unloader" | "supervisor",
    defaultName: string,
  ) => {
    setSigs((prev) => ({
      ...prev,
      [key]: { ...prev[key], scanning: which },
    }));
    try {
      const xml = await biometricService.captureFingerprint();
      setSigs((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          scanning: null,
          ...(which === "unloader"
            ? {
                unloaderFp: xml,
                unloaderName: prev[key]?.unloaderName || defaultName,
              }
            : {
                supervisorFp: xml,
                supervisorName:
                  prev[key]?.supervisorName || user?.username || "",
              }),
        },
      }));
      toast(
        which === "unloader"
          ? "Unloader fingerprint punched"
          : "Supervisor fingerprint punched",
        "success",
      );
    } catch (err: any) {
      const isAdmin =
        user?.role === "SUPER_ADMIN" || user?.role === "PLANT_MANAGER";
      if (isAdmin) {
        setSigs((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            scanning: null,
            ...(which === "unloader"
              ? {
                  unloaderFp: "ADMIN_BYPASS",
                  unloaderName: prev[key]?.unloaderName || defaultName,
                }
              : {
                  supervisorFp: "ADMIN_BYPASS",
                  supervisorName:
                    prev[key]?.supervisorName || user?.username || "",
                }),
          },
        }));
        toast("Admin bypass fingerprint (scanner unavailable)", "success");
      } else {
        setSigs((prev) => ({
          ...prev,
          [key]: { ...prev[key], scanning: null },
        }));
        toast(err?.message || "Fingerprint capture failed", "error");
      }
    }
  };

  const submitDay = async (unloaderName: string, day: DaySheet) => {
    const key = dayKey(unloaderName, day.date);
    const st = sigs[key] || {};
    if (!st.unloaderFp) {
      toast("Punch Unloader signature first", "error");
      return;
    }
    if (!st.supervisorFp) {
      toast("Punch Supervisor signature first", "error");
      return;
    }
    setSigs((prev) => ({
      ...prev,
      [key]: { ...prev[key], submitting: true },
    }));
    try {
      await api.post("/api/procurement/reports/loader-unloader/submit", {
        plantId: activePlant.id,
        date: day.date,
        unloaderName,
        unloaderBiometricData: st.unloaderFp,
        supervisorBiometricData: st.supervisorFp,
        unloaderSignedBy: st.unloaderName || unloaderName,
        supervisorSignedBy: st.supervisorName || user?.username || "",
      });
      toast(
        `Report for ${unloaderName} submitted to Admin (${day.date})`,
        "success",
      );
      setSigs((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      await load();
    } catch (e: any) {
      toast(e?.response?.data?.message || "Submit failed", "error");
      setSigs((prev) => ({
        ...prev,
        [key]: { ...prev[key], submitting: false },
      }));
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 loader-unloader-report">
      <div className="flex flex-wrap items-start justify-between gap-3 no-print">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Truck className="text-[#e67e00]" size={22} />
            Loader &amp; Unloader
          </h2>
          <p className="text-xs text-[var(--text-muted-alt)] mt-1 max-w-3xl">
            From Paddy Inward detail (A–Q). Main/Part rows go on that
            unloader&apos;s sheet. Empty cells show (-). Stack No. or Hoodi. P =
            N + O. Filter one unloader + date range to print/download that set
            in one go.
            {data?.generatedAt
              ? ` · Generated ${new Date(data.generatedAt).toLocaleString()}`
              : ""}
          </p>
        </div>
      </div>

      <div className="no-print flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3">
        <div className="flex rounded-lg overflow-hidden border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => {
              setViewMode("daily");
              setDailyDate(dateFrom);
            }}
            className={`px-3 py-1.5 text-sm font-semibold ${
              viewMode === "daily"
                ? "bg-[#e67e00] text-black"
                : "bg-[var(--bg-panel)] text-[var(--text-muted)]"
            }`}
          >
            Daily Report
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("range");
              setDateFrom(dailyDate);
              setDateTo(dailyDate);
            }}
            className={`px-3 py-1.5 text-sm font-semibold ${
              viewMode === "range"
                ? "bg-[#e67e00] text-black"
                : "bg-[var(--bg-panel)] text-[var(--text-muted)]"
            }`}
          >
            Date Range
          </button>
        </div>

        {viewMode === "daily" ? (
          <label className="text-[10px] uppercase text-[var(--text-muted-alt)]">
            Date
            <input
              type="date"
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value)}
              className="ml-1 block bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)]"
            />
          </label>
        ) : (
          <>
            <label className="text-[10px] uppercase text-[var(--text-muted-alt)]">
              From
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="ml-1 block bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)]"
              />
            </label>
            <label className="text-[10px] uppercase text-[var(--text-muted-alt)]">
              To
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="ml-1 block bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)]"
              />
            </label>
          </>
        )}

        <label className="text-[10px] uppercase text-[var(--text-muted-alt)]">
          Specific unloader
          <select
            value={unloaderFilter}
            onChange={(e) => setUnloaderFilter(e.target.value)}
            className="ml-1 block min-w-[160px] bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)]"
          >
            <option value="">All unloaders</option>
            {unloadersList.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={printAll}
          disabled={!sheets.length}
          className="flex items-center gap-2 px-3 py-1.5 border border-[var(--border-subtle)] rounded text-sm disabled:opacity-50"
        >
          <Printer size={16} />
          {unloaderFilter
            ? "Print this unloader (all days)"
            : "Print all unloaders"}
        </button>
        <button
          type="button"
          onClick={downloadExcel}
          disabled={!flatExport.length}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#e67e00] text-black rounded text-sm font-bold disabled:opacity-50"
        >
          <Download size={16} /> Download Excel
        </button>
      </div>

      <div className="no-print grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["Unloaders", data?.unloaderCount],
          ["Trucks unloaded", data?.totalTrucks],
          ["Still unloading (excluded)", data?.excludedIncompleteCount ?? 0],
          [viewMode === "daily" ? "Daily date" : "From", effectiveFrom],
          [
            viewMode === "daily" ? "Mode" : "To",
            viewMode === "daily" ? "Daily" : effectiveTo,
          ],
        ].map(([label, val]) => (
          <div
            key={String(label)}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3"
          >
            <p className="text-[10px] uppercase text-[var(--text-muted-alt)]">
              {label}
            </p>
            <p className="text-lg font-bold text-[var(--text-main)]">
              {loading ? "…" : (val ?? "—")}
            </p>
          </div>
        ))}
      </div>

      {loading && (
        <p className="text-sm text-[var(--text-muted-alt)]">Loading report…</p>
      )}

      {!loading && sheets.length === 0 && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] p-8 text-center text-[var(--text-muted-alt)] text-sm">
          No completed unload records for this{" "}
          {viewMode === "daily" ? "day" : "date range"}
          {unloaderFilter ? ` / ${unloaderFilter}` : ""}. Incomplete trucks are
          excluded from the unloading list count.
        </div>
      )}

      {sheets.map((u) => (
        <section
          key={u.unloaderName}
          className="unloader-sheet border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-panel)]"
        >
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[#e67e00]/10 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-[var(--text-main)] text-base">
                {u.unloaderName}
              </h3>
              <p className="text-[10px] text-[var(--text-muted-alt)]">
                {u.totalTrucks} truck(s) · {u.days.length} day
                {u.days.length === 1 ? "" : "s"} · {rangeLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => printOneUnloader(u)}
              className="no-print text-xs px-2 py-1 border border-[var(--border-subtle)] rounded flex items-center gap-1"
            >
              <Printer size={12} /> Print this unloader
            </button>
          </div>

          <div className="p-4 space-y-8">
            {u.days.map((day) => {
              const key = dayKey(u.unloaderName, day.date);
              const st = sigs[key] || {};
              return (
                <div key={day.date}>
                  <div className="flex flex-wrap justify-between gap-2 text-xs font-bold text-[var(--text-main)] mb-2">
                    <span>Mill Name: {cell(day.millName)}</span>
                    <span>Unloader Name: {cell(u.unloaderName)}</span>
                    <span>
                      Date: {cell(day.date)}
                      {day.submitted ? (
                        <span className="ml-2 text-green-600">· Submitted</span>
                      ) : (
                        <span className="ml-2 text-amber-600">
                          · Pending submit
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-[var(--text-muted)] min-w-[1200px] border-collapse">
                      <thead>
                        <tr className="border border-[var(--border-subtle)]">
                          <th
                            rowSpan={2}
                            className="p-1 border border-[var(--border-subtle)]"
                          >
                            A<br />
                            Truck #
                          </th>
                          <th
                            rowSpan={2}
                            className="p-1 border border-[var(--border-subtle)]"
                          >
                            B<br />
                            RST
                          </th>
                          <th
                            rowSpan={2}
                            className="p-1 border border-[var(--border-subtle)]"
                          >
                            C<br />
                            Mill GP
                          </th>
                          <th
                            rowSpan={2}
                            className="p-1 border border-[var(--border-subtle)]"
                          >
                            D<br />
                            In
                          </th>
                          <th
                            rowSpan={2}
                            className="p-1 border border-[var(--border-subtle)]"
                          >
                            E<br />
                            Out
                          </th>
                          <th
                            colSpan={2}
                            className="p-1 border border-[var(--border-subtle)] text-center"
                          >
                            Stack Type
                          </th>
                          <th
                            rowSpan={2}
                            className="p-1 border border-[var(--border-subtle)]"
                          >
                            H<br />
                            Stack No.
                          </th>
                          <th
                            rowSpan={2}
                            className="p-1 border border-[var(--border-subtle)]"
                          >
                            I<br />
                            Hoodi
                          </th>
                          <th
                            rowSpan={2}
                            className="p-1 border border-[var(--border-subtle)]"
                          >
                            J<br />
                            Truck No.
                          </th>
                          <th
                            rowSpan={2}
                            className="p-1 border border-[var(--border-subtle)]"
                          >
                            K<br />
                            Party
                          </th>
                          <th
                            rowSpan={2}
                            className="p-1 border border-[var(--border-subtle)]"
                          >
                            L<br />
                            Mandi
                          </th>
                          <th
                            rowSpan={2}
                            className="p-1 border border-[var(--border-subtle)]"
                          >
                            M<br />
                            M/C
                          </th>
                          <th
                            colSpan={3}
                            className="p-1 border border-[var(--border-subtle)] text-center"
                          >
                            Bardana
                          </th>
                          <th
                            rowSpan={2}
                            className="p-1 border border-[var(--border-subtle)]"
                          >
                            Q<br />
                            Labour
                          </th>
                        </tr>
                        <tr className="border border-[var(--border-subtle)]">
                          <th className="p-1 border border-[var(--border-subtle)]">
                            F Main
                          </th>
                          <th className="p-1 border border-[var(--border-subtle)]">
                            G Part
                          </th>
                          <th className="p-1 border border-[var(--border-subtle)]">
                            N A
                          </th>
                          <th className="p-1 border border-[var(--border-subtle)]">
                            O B
                          </th>
                          <th className="p-1 border border-[var(--border-subtle)]">
                            P Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.rows.map((r, i) => (
                          <tr
                            key={`${r.truckNo}-${i}`}
                            className="border-b border-[var(--border-subtle)]/60 text-center"
                          >
                            <td className="p-1 font-mono text-[#e67e00]">
                              {cell(r.unloaderTruckCount)}
                            </td>
                            <td className="p-1">{cell(r.rstNo)}</td>
                            <td className="p-1">{cell(r.millGp)}</td>
                            <td className="p-1">{cell(r.timeIn)}</td>
                            <td className="p-1">{cell(r.timeOut)}</td>
                            <td className="p-1">{cell(r.stackMain)}</td>
                            <td className="p-1">{cell(r.stackPart)}</td>
                            <td className="p-1">{cell(r.stackNo)}</td>
                            <td className="p-1">{cell(r.hoodi)}</td>
                            <td className="p-1 text-left font-medium text-[var(--text-main)]">
                              {cell(r.truckNo)}
                            </td>
                            <td className="p-1 text-left">
                              {cell(r.partyName)}
                            </td>
                            <td className="p-1 text-left">{cell(r.mandi)}</td>
                            <td className="p-1">{cell(r.moisture)}</td>
                            <td className="p-1">{cell(r.aClass)}</td>
                            <td className="p-1">{cell(r.bClass)}</td>
                            <td className="p-1 font-bold text-[var(--text-main)]">
                              {cell(r.totalBags)}
                            </td>
                            <td className="p-1">{cell(r.labourParty)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold text-[var(--text-main)] text-center border-t border-[var(--border-subtle)]">
                          <td className="p-1.5">{day.totals.trucks}</td>
                          <td className="p-1.5 text-left" colSpan={12}>
                            Total
                          </td>
                          <td className="p-1.5">{day.totals.aClass}</td>
                          <td className="p-1.5">{day.totals.bClass}</td>
                          <td className="p-1.5">{day.totals.totalBags}</td>
                          <td className="p-1.5">-</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex justify-around mt-5 text-xs text-[var(--text-muted-alt)]">
                    <span>
                      Unloader sign:{" "}
                      {day.unloaderSigned || st.unloaderFp
                        ? `✓ ${day.unloaderSignedBy || st.unloaderName || u.unloaderName}`
                        : "________________"}
                    </span>
                    <span>
                      Supervisor Sign:{" "}
                      {day.supervisorSigned || st.supervisorFp
                        ? `✓ ${day.supervisorSignedBy || st.supervisorName || ""}`
                        : "________________"}
                    </span>
                  </div>

                  {!day.submitted && day.totals.trucks > 0 && (
                    <div className="no-print mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3 flex flex-wrap gap-3 items-end">
                      <label className="text-[10px] uppercase text-[var(--text-muted-alt)]">
                        Unloader name
                        <input
                          value={st.unloaderName ?? u.unloaderName}
                          onChange={(e) =>
                            setSigs((prev) => ({
                              ...prev,
                              [key]: {
                                ...prev[key],
                                unloaderName: e.target.value,
                              },
                            }))
                          }
                          className="ml-1 block bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)] min-w-[140px]"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={st.scanning === "unloader"}
                        onClick={() => scanFp(key, "unloader", u.unloaderName)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border ${
                          st.unloaderFp
                            ? "border-green-600 text-green-700"
                            : "border-[var(--border-subtle)]"
                        }`}
                      >
                        <Fingerprint size={14} />
                        {st.scanning === "unloader"
                          ? "Scanning…"
                          : st.unloaderFp
                            ? "Unloader punched"
                            : "Punch Unloader"}
                      </button>
                      <label className="text-[10px] uppercase text-[var(--text-muted-alt)]">
                        Supervisor name
                        <input
                          value={st.supervisorName ?? user?.username ?? ""}
                          onChange={(e) =>
                            setSigs((prev) => ({
                              ...prev,
                              [key]: {
                                ...prev[key],
                                supervisorName: e.target.value,
                              },
                            }))
                          }
                          className="ml-1 block bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)] min-w-[140px]"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={st.scanning === "supervisor"}
                        onClick={() =>
                          scanFp(key, "supervisor", user?.username || "")
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border ${
                          st.supervisorFp
                            ? "border-green-600 text-green-700"
                            : "border-[var(--border-subtle)]"
                        }`}
                      >
                        <Fingerprint size={14} />
                        {st.scanning === "supervisor"
                          ? "Scanning…"
                          : st.supervisorFp
                            ? "Supervisor punched"
                            : "Punch Supervisor"}
                      </button>
                      <button
                        type="button"
                        disabled={
                          st.submitting || !st.unloaderFp || !st.supervisorFp
                        }
                        onClick={() => submitDay(u.unloaderName, day)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-[#e67e00] text-black disabled:opacity-50"
                      >
                        <Send size={14} />
                        {st.submitting ? "Submitting…" : "Submit to Admin"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

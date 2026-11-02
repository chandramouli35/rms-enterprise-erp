import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users,
  Package,
  ShieldCheck,
  FileText,
  Search,
  Plus,
  Calendar,
  ChevronDown,
  Download,
  Printer,
  Settings,
  Upload,
  Edit,
  Layers,
  ScanBarcode,
  X,
  AlertTriangle,
  Trash,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  CheckCircle2,
  Fingerprint,
  Check,
} from "lucide-react";
import BoliCompletionTable from "../components/Procurement/BoliCompletionTable";
import BoliRecordPanel from "../components/Procurement/BoliRecordPanel";
import InwardListReport from "../components/Procurement/InwardListReport";
import DailyInwardSummary from "../components/Procurement/DailyInwardSummary";
import MandiBalanceDashboard from "../components/Procurement/MandiBalanceDashboard";
import LoaderUnloaderReport from "../components/Procurement/LoaderUnloaderReport";
import api from "../api/axios";
import ShortageRecoveryReport from "../components/ShortageRecoveryReport";
import StackToHoodiTransfer from "../components/StackToHoodiTransfer";
import DryerBharaiToStackTransfer from "../components/DryerBharaiToStackTransfer";
import DailyHoodiReport from "../components/DailyHoodiReport";
import StackLayoutView from "../components/StackLayoutView";

/** Feedback 52 — point weight = bags × (net ÷ total bags to 4 decimals), then 2 decimals. */
function unloadPointWeight(form: any, pointBags: number): string {
  const bags =
    (parseFloat(String(form?.origAClass || "")) || 0) +
    (parseFloat(String(form?.origBClass || "")) || 0) +
    (parseFloat(String(form?.shortageAClass || "")) || 0) +
    (parseFloat(String(form?.shortageBClass || "")) || 0);
  const net =
    parseFloat(String(form?.netWtMill || form?.netWeightWb || "")) || 0;
  if (!(bags > 0) || !(pointBags > 0) || !(net > 0)) return "";
  const avg = Number((net / bags).toFixed(4));
  return (avg * pointBags).toFixed(2);
}
import { CustomModal } from "../components/CustomModal";
import { usePlantStore } from "../store/plantStore";
import { useUiStore } from "../store/uiStore";
import { useAuthStore } from "../store/authStore";
import { useMandiStore } from "../store/mandiStore";
import { biometricService } from "../services/biometricService";
import StackSelectionModal from "../components/StackSelectionModal";
import Pagination from "../components/Pagination";
import { exportToExcel } from "../utils/exportUtils";
import Combobox from "../components/Combobox";
import { useSubmitLock } from "../hooks/useSubmitLock";
import { hasModulePermission } from "../utils/modulePermissions";

/** Bag counts: leading/lone 0 disappears (96 not 096). */
function wholeCountNoLeadingZero(raw: string): string {
  const digits = String(raw ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n === 0) return "";
  return String(n);
}

/** Moisture etc.: 018.5 → 18.5; lone 0 disappears; "0." kept so 0.5 can be typed. */
function decimalNoLeadingZero(raw: string): string {
  let s = String(raw ?? "").replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
  }
  if (!s || s === "0") return "";
  const [intPart, frac] = s.split(".");
  let i = (intPart || "").replace(/^0+(?=\d)/, "");
  if (frac !== undefined) return `${i || "0"}.${frac}`;
  return i;
}

function hideZeroDisplay(v: any): string {
  if (v === null || v === undefined || v === "" || v === 0 || v === "0")
    return "";
  return String(v);
}

export const ProcurementManagement = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get("tab") || "supplier_master";
  const activePlant = usePlantStore((state) => state.activePlant);
  const setActivePlant = usePlantStore((state) => state.setActivePlant);
  const user = useAuthStore((state) => state.user);
  const hasBackdatePermission =
    user?.role === "SUPER_ADMIN" ||
    (user?.backdatePermissionUntil &&
      new Date(user.backdatePermissionUntil) > new Date());
  const hasManualWeighbridgePermission =
    user?.role === "SUPER_ADMIN" ||
    (user?.manualWeighbridgeUntil &&
      new Date(user.manualWeighbridgeUntil) > new Date());
  /** Mill-wise only — do NOT unlock via SUPER_ADMIN or client Auto Update never appears ON */
  const plantAllowsManualPaddy = !!activePlant?.allowManualDateTimePaddyInward;
  const autoUpdateDateTime = !plantAllowsManualPaddy;
  const canManualDateTime = plantAllowsManualPaddy;
  /**
   * Auto Update Date & Time only locks Date/Time fields.
   * Weighbridge Gross/Tare may be manually punched in both Auto Update ON and OFF modes.
   * Net at Mill still auto-calcs from Gross − Tare; Fetch WB remains available.
   */
  const canManualWeighbridgePunch =
    autoUpdateDateTime || canManualDateTime || hasManualWeighbridgePermission;
  const isSupervisor = /SUPERVISOR/i.test(
    String((user as any)?.role?.name || user?.role || ""),
  );
  /** Local calendar today (avoid UTC shift for date max checks) */
  const todayLocal = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  /** Supervisor must not see Payment / Diff / Final Hisab on Purchase Register */
  const hidePaymentHisab = isSupervisor;
  const isAdmin =
    user?.role === "SUPER_ADMIN" || user?.role === "PLANT_MANAGER";
  const canSavePaddyInward =
    hasModulePermission("Procurement", "canAdd", "Paddy Inward") ||
    hasModulePermission("Procurement", "canEdit", "Paddy Inward");
  const canAddSupplier = hasModulePermission(
    "Procurement",
    "canAdd",
    "Supplier Master",
  );
  const canEditSupplier = hasModulePermission(
    "Procurement",
    "canEdit",
    "Supplier Master",
  );
  const canAddBoli = hasModulePermission("Procurement", "canAdd", "Boli Record");
  const canEditBoli = hasModulePermission(
    "Procurement",
    "canEdit",
    "Boli Record",
  );
  const canEditQuality = hasModulePermission(
    "Procurement",
    "canEdit",
    "Quality Inspection",
  );
  const canEditSettings = hasModulePermission(
    "Procurement",
    "canEdit",
    "Global Settings (Govt Rate)",
  );
  const canQuickAddFleet =
    hasModulePermission("Staff Management", "canAdd") ||
    hasModulePermission("Procurement", "canAdd") ||
    hasModulePermission("Gate Pass", "canAdd");
  const canQuickAddPahunch =
    hasModulePermission("Staff Management", "canAdd") ||
    hasModulePermission("Procurement", "canAdd");
  const canSettleHisab =
    (user?.role === "SUPER_ADMIN" ||
      user?.role === "ADMIN" ||
      user?.role === "PLANT_MANAGER") &&
    hasModulePermission("Procurement", "canEdit", "Boli Record");
  const canAddMandi =
    isAdmin && hasModulePermission("Procurement", "canAdd", "Mandi Master");
  const canEditMandi =
    isAdmin && hasModulePermission("Procurement", "canEdit", "Mandi Master");
  const canDeleteMandi =
    isAdmin && hasModulePermission("Procurement", "canDelete", "Mandi Master");
  const canManageMandi = canAddMandi || canEditMandi || canDeleteMandi;
  const [category, setCategory] = useState<"OPERATIONAL" | "NON_OPERATIONAL">(
    "OPERATIONAL",
  );

  const { mandis, fetchMandis, createMandi, updateMandi, deleteMandi } =
    useMandiStore();

  const [plants, setPlants] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [labours, setLabours] = useState<any[]>([]);
  /** Combined names for Allocate Unloader / Part Unloader (staff + labour + plant users) */
  const [unloaderOptions, setUnloaderOptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const res = await api.get("/plants");
        setPlants(res.data);
        if (activePlant?.id && Array.isArray(res.data)) {
          const fresh = res.data.find((p: any) => p.id === activePlant.id);
          if (
            fresh &&
            (!!fresh.allowManualDateTimePaddyInward !==
              !!activePlant.allowManualDateTimePaddyInward ||
              !!fresh.allowManualDateTimeGateIn !==
                !!activePlant.allowManualDateTimeGateIn ||
              !!fresh.allowManualDateTimeGateOut !==
                !!activePlant.allowManualDateTimeGateOut ||
              !!fresh.allowManualDateTimeStackTransfer !==
                !!activePlant.allowManualDateTimeStackTransfer)
          ) {
            setActivePlant(fresh);
          }
        }
      } catch (error) {
        console.error("Failed to fetch plants", error);
      }
    };
    // Need plant list for mill pickers (settings, supplier, etc.)
    if (
      !activePlant ||
      user?.role === "SUPER_ADMIN" ||
      activeTab === "global_settings" ||
      activeTab === "paddy_inward"
    )
      fetchPlants();
  }, [activePlant?.id, user?.role, activeTab]);

  const defaultFormData = {
    plantId: activePlant?.id || "",
    supplierId: "",
    purchaseType: "PADDY_BOLI",
    netWeight: 0,
    ratePerQuintal: 0,
    transportCharges: 0,
    otherCharges: 0,
    moisture: 0,
    bugs: 0,
    gpNo: "",
    mandiEgpNo: "",
    egpLate: false,
    rstNo: "",
    mandiParchiNo: "",
    pahunchPersonName: "",
    safaiType: "Good",
    allocationType: "Hoodi",
    originalBardanaClass: "A_Class",
    agencyGpBardanaClass: "A_Class",
    bagsRecAtMill: 0,
    gatePassId: "",
    weighbridgeId: "",
    category: "OPERATIONAL",
    baseRate: 0,
    finalRate: 0,
    arhtiaCorrection: 0,
    nextDayCorrection: 0,
    amount: 0,
    deductions: 0,
    netAmount: 0,
    balanceShortageArhtia: 0,
  };

  const [formData, setFormData] = useState<any>(defaultFormData);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  /** Only Admin-approved Arthiya for operational forms (inward, boli, etc.) */
  const activeSuppliers = suppliers.filter(
    (s) => !s.status || s.status === "ACTIVE",
  );
  const [pahunchs, setPahunchs] = useState<any[]>([]);
  const [sodaPending, setSodaPending] = useState<any[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [inwardList, setInwardList] = useState<any[]>([]);
  const [inwardTotalItems, setInwardTotalItems] = useState(0);
  const [inwardCurrentPage, setInwardCurrentPage] = useState(1);

  const [viewInwardModal, setViewInwardModal] = useState<any>(null);
  const [listFilters, setListFilters] = useState({
    dateFrom: "",
    dateTo: "",
    mandi: "",
    supplierId: "",
    activeReportTab: "",
  });

  const [recentPurchasesTotalItems, setRecentPurchasesTotalItems] = useState(0);
  const [recentPurchasesCurrentPage, setRecentPurchasesCurrentPage] =
    useState(1);

  const [sodaPendingTotalItems, setSodaPendingTotalItems] = useState(0);
  const [paddyStockReportData, setPaddyStockReportData] = useState<any[]>([]);
  const [paddyStackDocRows, setPaddyStackDocRows] = useState<any[]>([]);
  const [paddyStackDryerDetail, setPaddyStackDryerDetail] = useState<any[]>([]);
  const [sodaPendingCurrentPage, setSodaPendingCurrentPage] = useState(1);
  /** Saved drafts shown on Paddy Inward so supervisors can reopen & confirm after unload */
  const [draftInwards, setDraftInwards] = useState<any[]>([]);
  const [showDraftList, setShowDraftList] = useState(true);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const addSupplierLock = useSubmitLock();
  const addMandiLock = useSubmitLock();
  const inspectLock = useSubmitLock();
  const settleHisabLock = useSubmitLock();
  const [isPaddyPurchaseSaving, setIsPaddyPurchaseSaving] = useState(false);
  const paddyPurchaseSavingRef = useRef(false);
  const [isScanningFingerprint, setIsScanningFingerprint] = useState(false);

  // Stack Selection State
  const [isStackModalOpen, setIsStackModalOpen] = useState(false);
  const [occupiedStacks, setOccupiedStacks] = useState<Record<string, any>>({});

  // Inward Form States
  const [unrecoveredShortagesCount, setUnrecoveredShortagesCount] = useState(0);
  /** Till-date Artia shortage balance (confirmed entries only) — Ref table "Total shortage of Artia" */
  const [artiaTillDateShortage, setArtiaTillDateShortage] = useState({
    qtl: 0,
    bags: 0,
  });

  const refreshArtiaTillDateShortage = async (
    supplierId?: string,
    plantId?: string,
  ) => {
    const sid = supplierId || "";
    const pid = plantId || activePlant?.id || "";
    if (!sid || !pid) {
      setArtiaTillDateShortage({ qtl: 0, bags: 0 });
      return;
    }
    try {
      const res = await api.get(
        "/api/procurement/reports/shortage-artia-balances",
      );
      const rows = Array.isArray(res.data) ? res.data : [];
      const match = rows.filter(
        (r: any) => r.supplierId === sid && r.plantId === pid,
      );
      const qtl = match.reduce(
        (s: number, r: any) => s + (Number(r.balanceQtl) || 0),
        0,
      );
      const bags = match.reduce(
        (s: number, r: any) => s + (Number(r.balanceBags) || 0),
        0,
      );
      setArtiaTillDateShortage({
        qtl: parseFloat(qtl.toFixed(3)),
        bags: parseFloat(bags.toFixed(2)),
      });
    } catch (error) {
      console.error("Failed to fetch Artia till-date shortage", error);
      setArtiaTillDateShortage({ qtl: 0, bags: 0 });
    }
  };

  useEffect(() => {
    if (isSupervisor && activePlant) {
      const fetchShortages = async () => {
        try {
          const res = await api.get(
            `/api/procurement/reports/shortage-summary?plantId=${activePlant.id}`,
          );
          // Aggregate ledger lines per inward; count inwards with positive net balance
          const byDetails: Record<string, number> = {};
          (res.data || []).forEach((r: any) => {
            const id = r.detailsId || r.id;
            byDetails[id] =
              (byDetails[id] || 0) + (Number(r.netShortageQtl) || 0);
          });
          const unrecovered = Object.values(byDetails).filter(
            (net) => net > 0.001,
          );
          setUnrecoveredShortagesCount(unrecovered.length);
        } catch (error) {
          console.error("Failed to fetch shortage summary", error);
        }
      };
      fetchShortages();
    }
  }, [isSupervisor, activePlant]);

  const defaultInwardFormData = {
    id: "",
    gpNo: "",
    date: "",
    timeIn: "",
    timeOut: "",
    gpCompleteDate: "",
    entryCompletionAt: "",
    entryMadeByName: "",
    entryMadeByUserId: "",
    truckNo: "",
    mandiEgpNo: "",
    egpLate: false,
    rstNo: "",
    mandiParchiNo: "",
    supplierId: "",
    mandi: "",
    pahunchPersonName: "",
    mandiType: "",
    boliRate: "",
    boliChecklist: false,
    moisture: "",
    safai: "",
    mandiIntimation: "",
    remarks: "",
    allocationType: "",
    origBagsRec: "",
    origAClass: "",
    origBClass: "",
    origAClassAg: "",
    origBClassAg: "",
    shortageAClass: "",
    shortageBClass: "",
    qualityCutType: "NONE",
    qualityCutValue: 0,
    qualityCutReason: "",
    qualityCutQtl: 0,
    agencyBagsRec: 0,
    agencyAClass: 0,
    agencyBClass: 0,
    agencyAClassAg: 0,
    agencyBClassAg: 0,
    netWtMill: 0,
    reqNetWt: 0,
    netWtParty: 0,
    netWtDiff: 0,
    grossWeight: "",
    tareWeight: "",
    netWeightWb: "",
    shortageType: "",
    updateShortageReg: "",
    allocatedUnloader: "",
    unloaderTruckCount: 0,
    stackNo: "",
    hoodiUpload: "",
    allocateUnloader: "",
    partUnloaderName: "",
    partUnloaderTruckCount: "",
    bagsInPartStack: "",
    partStackNo: "",
    driverName: "",
    mobileNumber: "",
    // Signatures
    driverSign: "",
    unloaderSign: "",
    pahunchPersonSign: "",
    // Biometric Data
    biometricData: "",
    bhariVideoUpload: "",
    khaliVideoUpload: "",
    meterNotWorking: false,
    informBaujiBagsLess: false,
    informBaujiExcessWeight: false,

    // NEW FIELDS FROM FORM IMAGE
    previousTruckReading: "",
    newTruckReading: "",
    kmsDriven: "",
    partyName: "",
    paddyBoliRecord: "Not applicable",
    mainUnloaderTruckCount: "",
    bagsInMainStack: "",
    secondPartStackNo: "",
    bagsInSecondPartStack: "",
    partIsHoodi: false,
    noPartStack: false,
    showThirdPartStack: false,
    thirdPartUnloaderName: "",
    thirdPartUnloaderTruckCount: "",
    thirdPartStackNo: "",
    bagsInThirdPartStack: "",
    thirdPartIsHoodi: false,
    unloaderInitials: "",
    unloaderName: "",
    unloadingEndTime: "",
    unloadingStartTime: "",
    unloadingFinishTime: "",
    labour: "",
    /** Feedback 39 — Hold (Section 4 Unloading Management) */
    isHold: false,
    holdReason: "",
    heldAt: "",
    cutToBeAddedInShortage: false,
    totalBagsReceived: "",
    bagsRecLessThanAgencyGp: false,
    plusWtConsiderInShortageRecovery: false,
    unloaderSignAndStamp: false,
    pahunchPersonSignAndStamp: false,
    discrepancy: "",
    autoNarration: true,
    shortageNarration: "",
  };

  const [inwardFormData, setInwardFormData] = useState<any>(
    defaultInwardFormData,
  );

  useEffect(() => {
    refreshArtiaTillDateShortage(inwardFormData.supplierId, activePlant?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inwardFormData.supplierId, activePlant?.id]);

  // Track Boli bags input from supervisor
  const [boliInputs, setBoliInputs] = useState<Record<string, string>>({});

  // Plant Procurement Settings
  const [plantSettings, setPlantSettings] = useState({
    govtRate: "",
    benchmarkMoisture: "",
    safaiCut: "",
    processingCut: "",
    wastageBagWeight: "",
    allowManualDateTimePaddyInward: false,
    allowManualDateTimeGateIn: false,
    allowManualDateTimeGateOut: false,
    allowManualDateTimeStackTransfer: false,
  });
  const [isEditingSettings, setIsEditingSettings] = useState<boolean>(false);

  useEffect(() => {
    if (activePlant) {
      setPlantSettings({
        govtRate:
          activePlant.govtRate != null ? String(activePlant.govtRate) : "",
        benchmarkMoisture:
          activePlant.benchmarkMoisture != null
            ? String(activePlant.benchmarkMoisture)
            : "17",
        safaiCut:
          activePlant.safaiCut != null ? String(activePlant.safaiCut) : "2",
        processingCut:
          activePlant.processingCut != null
            ? String(activePlant.processingCut)
            : "4",
        wastageBagWeight:
          activePlant.wastageBagWeight != null
            ? String(activePlant.wastageBagWeight)
            : String(activePlant.standardBagWeight || 0.382),
        allowManualDateTimePaddyInward: !!(
          activePlant.allowManualDateTimePaddyInward ??
          activePlant.allowManualDateTime
        ),
        allowManualDateTimeGateIn: !!(
          activePlant.allowManualDateTimeGateIn ??
          activePlant.allowManualDateTime
        ),
        allowManualDateTimeGateOut: !!(
          activePlant.allowManualDateTimeGateOut ??
          activePlant.allowManualDateTime
        ),
        allowManualDateTimeStackTransfer:
          !!activePlant.allowManualDateTimeStackTransfer,
      });
    }
  }, [activePlant]);

  const handleUpdateSettings = async () => {
    if (!activePlant) {
      useUiStore.getState().addToast("No active plant selected", "error");
      return;
    }
    try {
      const numOr = (raw: string, fallback: number) => {
        if (raw === "" || raw == null) return fallback;
        const n = parseFloat(raw);
        return Number.isFinite(n) ? n : fallback;
      };
      const payload = {
        govtRate: numOr(plantSettings.govtRate, 0),
        // Allow 0 — do not use `||` (0 is falsy and was resetting to defaults)
        benchmarkMoisture: numOr(plantSettings.benchmarkMoisture, 17),
        safaiCut: numOr(plantSettings.safaiCut, 2),
        processingCut: numOr(plantSettings.processingCut, 4),
        wastageBagWeight: numOr(plantSettings.wastageBagWeight, 0.382),
        allowManualDateTimePaddyInward:
          !!plantSettings.allowManualDateTimePaddyInward,
        allowManualDateTimeGateIn: !!plantSettings.allowManualDateTimeGateIn,
        allowManualDateTimeGateOut: !!plantSettings.allowManualDateTimeGateOut,
        allowManualDateTimeStackTransfer:
          !!plantSettings.allowManualDateTimeStackTransfer,
      };
      await api.put(`/plants/${activePlant.id}`, payload);
      setIsEditingSettings(false);
      const { setActivePlant } = usePlantStore.getState();
      setActivePlant({ ...activePlant, ...payload });
      setPlantSettings({
        govtRate: payload.govtRate.toString(),
        benchmarkMoisture: payload.benchmarkMoisture.toString(),
        safaiCut: payload.safaiCut.toString(),
        processingCut: payload.processingCut.toString(),
        wastageBagWeight: payload.wastageBagWeight.toString(),
        allowManualDateTimePaddyInward: payload.allowManualDateTimePaddyInward,
        allowManualDateTimeGateIn: payload.allowManualDateTimeGateIn,
        allowManualDateTimeGateOut: payload.allowManualDateTimeGateOut,
        allowManualDateTimeStackTransfer:
          payload.allowManualDateTimeStackTransfer,
      });
      useUiStore
        .getState()
        .addToast("Plant Settings updated successfully", "success");
    } catch (err) {
      console.error("Failed to update plant settings", err);
      useUiStore
        .getState()
        .addToast("Failed to update Plant Settings", "error");
    }
  };

  /** Auto Update Date & Time ON when mill does not allow manual paddy inward date/time */
  // (autoUpdateDateTime / canManualDateTime derived from plant flag above)

  const applySupervisorFingerprintStamps = (prev: any, xml: string) => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().slice(0, 5);
    return {
      ...prev,
      biometricData: xml,
      // Entry Completion is always the fingerprint moment (separate from GP Complete)
      entryCompletionAt: now.toISOString(),
      entryMadeByName:
        user?.username || user?.email || prev.entryMadeByName || "",
      entryMadeByUserId: user?.id || prev.entryMadeByUserId || "",
      // When Auto Update ON: also punch GP Complete Date & Time Out
      ...(autoUpdateDateTime
        ? { gpCompleteDate: dateStr, timeOut: timeStr }
        : {}),
    };
  };

  useEffect(() => {
    if (autoUpdateDateTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0];
        const timeStr = now.toTimeString().slice(0, 5);
        setInwardFormData((prev: any) => ({
          ...prev,
          // Auto Update: keep Date & Time In current until draft/confirm; GP Complete set on fingerprint
          date: dateStr,
          timeIn: timeStr,
        }));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [autoUpdateDateTime]);

  // Gross / Tare → Net WB + Net at Mill (mill weights are weighbridge-only)
  useEffect(() => {
    const g = parseFloat(inwardFormData.grossWeight);
    const t = parseFloat(inwardFormData.tareWeight);
    if (!Number.isFinite(g) || !Number.isFinite(t)) return;
    const net = (g - t).toFixed(3);
    setInwardFormData((prev: any) => {
      if (String(prev.netWeightWb) === net && String(prev.netWtMill) === net) {
        return prev;
      }
      return {
        ...prev,
        netWeightWb: net,
        netWtMill: net,
      };
    });
  }, [inwardFormData.grossWeight, inwardFormData.tareWeight]);

  /** Auto-capture Gross / Tare / Net at Mill from weighbridge when truck is selected */
  const fetchWeighbridgeForTruck = async (truckNo: string, silent = false) => {
    if (!truckNo) return;
    try {
      const pid = activePlant?.id || "global";
      const res = await api.get(
        `/api/weighbridge/latest/${pid}/${encodeURIComponent(truckNo)}`,
      );
      const wb = res.data;
      if (!wb) {
        if (!silent)
          useUiStore
            .getState()
            .addToast("No weighbridge reading found for this truck", "error");
        return;
      }
      const gross = wb.grossWeight != null ? Number(wb.grossWeight) : null;
      const tare = wb.tareWeight != null ? Number(wb.tareWeight) : null;
      const netFromWb =
        wb.netWeight != null
          ? Number(wb.netWeight)
          : gross != null && tare != null
            ? gross - tare
            : null;
      setInwardFormData((prev: any) => ({
        ...prev,
        ...(gross != null ? { grossWeight: String(gross) } : {}),
        ...(tare != null ? { tareWeight: String(tare) } : {}),
        ...(netFromWb != null
          ? {
              netWtMill: Number(netFromWb.toFixed(3)),
              netWeightWb: netFromWb.toFixed(3),
            }
          : {}),
      }));
      setInwardErrors((prev: any) => ({
        ...prev,
        netWtMill: "",
        grossWeight: "",
        tareWeight: "",
      }));
      if (!silent) {
        useUiStore
          .getState()
          .addToast(
            `Gross / Tare / Net Mill fetched from weighbridge (${wb.source || "API"})`,
            "success",
          );
      }
    } catch (e: any) {
      if (!silent) {
        useUiStore
          .getState()
          .addToast(
            e?.response?.data?.message || "Weighbridge fetch failed",
            "error",
          );
      }
    }
  };

  useEffect(() => {
    const truck = String(inwardFormData.truckNo || "").trim();
    if (!truck) return;
    const t = window.setTimeout(() => {
      fetchWeighbridgeForTruck(truck, true);
    }, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inwardFormData.truckNo, activePlant?.id]);

  // Hoodi allocation cannot be N.A.
  useEffect(() => {
    if (
      inwardFormData.allocationType === "Hoodi" &&
      inwardFormData.hoodiUpload === "N.A."
    ) {
      setInwardFormData((prev: any) => ({ ...prev, hoodiUpload: "" }));
    }
  }, [inwardFormData.allocationType, inwardFormData.hoodiUpload]);

  useEffect(() => {
    // Auto calculate Required Net Wt and Shortage
    const origA = parseFloat(inwardFormData.origAClass) || 0;
    const origB = parseFloat(inwardFormData.origBClass) || 0;
    const shortA = parseFloat(inwardFormData.shortageAClass) || 0;
    const shortB = parseFloat(inwardFormData.shortageBClass) || 0;
    // Feedback 49: Required = (Arthia Parchi / Agency bags + Shortage bags) × mandi std 0.381 or 0.382
    const agencyA = parseFloat(inwardFormData.origAClassAg) || 0;
    const agencyB = parseFloat(inwardFormData.origBClassAg) || 0;

    const selectedPlant = plants.find((p) => p.id === activePlant?.id);
    const bagWt = selectedPlant?.standardBagWeight || 0.382;
    const agencyTotal = agencyA + agencyB;
    const shortTotal = shortA + shortB;
    const req = ((agencyTotal + shortTotal) * bagWt).toFixed(3);

    const actualWt = parseFloat(inwardFormData.netWtMill) || 0;
    const netDiff = parseFloat(req) - actualWt;

    const qualityCutType = inwardFormData.qualityCutType || "NONE";
    const qualityCutValue = parseFloat(inwardFormData.qualityCutValue) || 0;
    let qualityCutQtl = 0;
    if (qualityCutType === "BAGS") {
      qualityCutQtl = qualityCutValue * bagWt;
    } else if (qualityCutType === "PERCENTAGE") {
      qualityCutQtl = (actualWt * qualityCutValue) / 100;
    }

    const shortageQtlRaw = netDiff + qualityCutQtl;
    // Feedback 34 — Section 5 shortage bags received reduce Artia liability
    const shortageBagsRec =
      (parseFloat(inwardFormData.shortageAClass) || 0) +
      (parseFloat(inwardFormData.shortageBClass) || 0);
    const shortageBagsCredit = shortageBagsRec * bagWt;
    const excessBaujiCredit =
      inwardFormData.informBaujiExcessWeight && netDiff < 0
        ? Math.abs(netDiff)
        : 0;
    const recoveryPreview = shortageBagsCredit + excessBaujiCredit;
    const netArtiaShortage = shortageQtlRaw - recoveryPreview;
    const shortageQtl = Math.max(0, netArtiaShortage).toFixed(2);
    const shortageBags = (parseFloat(shortageQtl) / bagWt).toFixed(2);

    // Feedback 34 — Auto Narration preview (same formats as shortage report)
    const narrations: string[] = [];
    const agencyBags = agencyA + agencyB;
    const millExcl = origA + origB;
    const bagsLess = Math.max(0, agencyBags - millExcl);
    if (qualityCutType === "BAGS" && qualityCutValue > 0) {
      narrations.push(`${qualityCutValue} Bags Quality Cut`);
    } else if (qualityCutType === "PERCENTAGE" && qualityCutValue > 0) {
      narrations.push(`${qualityCutValue}% Quality Cut`);
    }
    if (bagsLess > 0 && !inwardFormData.informBaujiBagsLess) {
      narrations.push(`${bagsLess} Bags Shortage`);
    }
    // Weight Shortage only for residual shortfall not already covered by bags-less
    const bagsLessQtlCovered =
      bagsLess > 0 && !inwardFormData.informBaujiBagsLess
        ? bagsLess * bagWt
        : 0;
    const residualWtShortage = Math.max(0, netDiff - bagsLessQtlCovered);
    if (residualWtShortage > 0.0005) {
      narrations.push("Weight Shortage");
    } else if (netDiff > 0 && inwardFormData.informBaujiBagsLess) {
      // Bags-less handled via Bauji; still record any pure weight shortage flag if netDiff>0
      narrations.push("Weight Shortage");
    }
    if (shortageBagsRec > 0) {
      narrations.push(`${shortageBagsRec} Bags Shortage Received`);
    }
    if (inwardFormData.informBaujiExcessWeight && netDiff < 0) {
      narrations.push("Excess Weight Received");
    }
    const autoNarrationText = narrations.join("; ");

    // Feedback 33 — Section 8 shortage breakdown (Ref table 01)
    const bdQualityQtl = qualityCutQtl;
    const bdQualityBags =
      qualityCutType === "BAGS"
        ? qualityCutValue
        : bagWt > 0
          ? qualityCutQtl / bagWt
          : 0;

    // Shortage by Weight:
    // - mill < required → positive residual (or full netDiff if Bauji bags-less)
    // - mill > required + Inform Bauji excess → NEGATIVE difference
    // - mill > required without Bauji → 0 (excess not shown in shortage)
    let bdWeightQtl = 0;
    if (netDiff < 0 && inwardFormData.informBaujiExcessWeight) {
      bdWeightQtl = netDiff; // negative excess against shortage
    } else if (residualWtShortage > 0.0005) {
      bdWeightQtl = residualWtShortage;
    } else if (netDiff > 0 && inwardFormData.informBaujiBagsLess) {
      bdWeightQtl = netDiff;
    }
    const bdWeightBags = bagWt > 0 ? bdWeightQtl / bagWt : 0;

    // Shortage by Bags: only when bags less AND Bauji NOT marked
    const showBagsShortage =
      bagsLess > 0 && !inwardFormData.informBaujiBagsLess;
    const bdBagsQtl = showBagsShortage ? bagsLess * bagWt : 0;
    const bdBagsBags = showBagsShortage ? bagsLess : 0;

    const bdTruckTotalQtl = bdQualityQtl + bdWeightQtl + bdBagsQtl;
    const bdTruckTotalBags =
      bagWt > 0
        ? bdTruckTotalQtl / bagWt
        : bdQualityBags + bdWeightBags + bdBagsBags;

    setInwardFormData((prev: any) => ({
      ...prev,
      reqNetWt: req,
      netWtDiff: Number.isFinite(netDiff) ? netDiff.toFixed(3) : prev.netWtDiff,
      qualityCutQtl,
      actualShortageQtl: parseFloat(shortageQtlRaw.toFixed(2)),
      shortageBagsCreditQtl: parseFloat(shortageBagsCredit.toFixed(3)),
      // Current truck net contribution to Artia (preview) — not till-date balance
      artiaNetShortageQtl: parseFloat(netArtiaShortage.toFixed(2)),
      shortageQtl: shortageQtl,
      shortageBags: parseFloat(shortageBags) > 0 ? shortageBags : "0.00",
      autoNarrationText,
      // Section 8 Ref breakdown
      bdQualityCutQtl: parseFloat(bdQualityQtl.toFixed(3)),
      bdQualityCutBags: parseFloat(bdQualityBags.toFixed(2)),
      bdWeightShortageQtl: parseFloat(bdWeightQtl.toFixed(3)),
      bdWeightShortageBags: parseFloat(bdWeightBags.toFixed(2)),
      bdBagsShortageQtl: parseFloat(bdBagsQtl.toFixed(3)),
      bdBagsShortageBags: parseFloat(bdBagsBags.toFixed(2)),
      bdTruckTotalQtl: parseFloat(bdTruckTotalQtl.toFixed(3)),
      bdTruckTotalBags: parseFloat(bdTruckTotalBags.toFixed(2)),
      ...(prev.autoNarration !== false
        ? { shortageNarration: autoNarrationText }
        : {}),
      ...(netDiff >= 0 ? { informBaujiExcessWeight: false } : {}),
      // Clear Inform Bauji unless shortfall exceeds 10% of Agency GP bags
      ...(() => {
        const agencyTotalBags = agencyA + agencyB;
        const millExcl = origA + origB;
        const thresholdMet =
          agencyTotalBags > 0 && millExcl < agencyTotalBags * 0.9;
        if (!thresholdMet) {
          return { informBaujiBagsLess: false, bagsRecLessThanAgencyGp: false };
        }
        return {};
      })(),
      requiredAgencyBags: agencyA + agencyB,
      bagsShortfallPct:
        agencyA + agencyB > 0
          ? parseFloat(
              (
                (Math.max(0, agencyA + agencyB - (origA + origB)) /
                  (agencyA + agencyB)) *
                100
              ).toFixed(1),
            )
          : 0,
    }));
  }, [
    inwardFormData.origAClass,
    inwardFormData.origBClass,
    inwardFormData.shortageAClass,
    inwardFormData.shortageBClass,
    inwardFormData.origAClassAg,
    inwardFormData.origBClassAg,
    inwardFormData.netWtMill,
    inwardFormData.qualityCutType,
    inwardFormData.qualityCutValue,
    inwardFormData.informBaujiExcessWeight,
    inwardFormData.informBaujiBagsLess,
    inwardFormData.autoNarration,
    activePlant,
    plants,
  ]);
  const [dhanakLots, setDhanakLots] = useState([
    { id: 1, dhankNo: "1", bags: "", moisture: "", bardanaClass: "" },
  ]);

  const [inwardErrors, setInwardErrors] = useState<Record<string, string>>({});

  /** Plant standard bag weight (Qtl) — used for Quality Cut bags ↔ quintal */
  const plantBagWt =
    plants.find((p) => p.id === activePlant?.id)?.standardBagWeight || 0.382;

  /** Live Quality Cut (bags or %) → Qtl/Bags for Section 8 table 01 */
  const liveQualityCut = (() => {
    const type = inwardFormData.qualityCutType || "NONE";
    const val = parseFloat(String(inwardFormData.qualityCutValue)) || 0;
    const actualWt = parseFloat(String(inwardFormData.netWtMill)) || 0;
    if (type === "BAGS" && val > 0) {
      const qtl = val * plantBagWt;
      return {
        type,
        value: val,
        qtl,
        bags: val,
        label: `${val} Bags`,
        narration: `${val} Bags Quality Cut`,
      };
    }
    if (type === "PERCENTAGE" && val > 0) {
      const qtl = (actualWt * val) / 100;
      const bags = plantBagWt > 0 ? qtl / plantBagWt : 0;
      return {
        type,
        value: val,
        qtl,
        bags,
        label: `${val}%`,
        narration: `${val}% Quality Cut`,
        needsNetWt: actualWt <= 0,
      };
    }
    return {
      type,
      value: 0,
      qtl: 0,
      bags: 0,
      label: "",
      narration: "",
      needsNetWt: false,
    };
  })();

  const handleInwardChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    let nextValue = type === "checkbox" ? checked : value;

    // Bardana bag counts: figure starts from the number, not a leading 0 (e.g. 638 not 0638)
    const bardanaCountFields = new Set([
      "origAClass",
      "origBClass",
      "origAClassAg",
      "origBClassAg",
      "shortageAClass",
      "shortageBClass",
      "origBagsRec",
      "agencyBagsRec",
      "agencyAClass",
      "agencyBClass",
      "agencyAClassAg",
      "agencyBClassAg",
    ]);
    if (bardanaCountFields.has(name) && typeof nextValue === "string") {
      nextValue = wholeCountNoLeadingZero(nextValue);
    }

    // Supervisor: never allow future dates; backdate only when Auto Update Date & Time is OFF
    if (
      isSupervisor &&
      (name === "date" || name === "gpCompleteDate") &&
      typeof nextValue === "string" &&
      nextValue
    ) {
      if (nextValue > todayLocal) {
        useUiStore
          .getState()
          .addToast("Future dates are not allowed for supervisors", "error");
        nextValue = todayLocal;
      }
      if (!canManualDateTime && nextValue < todayLocal) {
        useUiStore
          .getState()
          .addToast(
            "Backdated entries are only allowed when Auto Update Date & Time is OFF for this mill",
            "error",
          );
        nextValue = todayLocal;
      }
    }

    setInwardFormData((prev: any) => {
      const next: any = {
        ...prev,
        [name]: nextValue,
      };
      // Quality Cut type switch — clear cut value when None; keep live recalc via useEffect
      if (name === "qualityCutType") {
        if (value === "NONE") {
          next.qualityCutValue = 0;
          next.qualityCutQtl = 0;
          next.qualityCutReason = "";
        }
      }
      // Default Party Name from selected Artia when empty or still matching previous supplier
      if (name === "supplierId") {
        const selected = suppliers.find((s: any) => s.id === value);
        const prevSupplier = suppliers.find(
          (s: any) => s.id === prev.supplierId,
        );
        if (
          selected &&
          (!prev.partyName || prev.partyName === prevSupplier?.name)
        ) {
          next.partyName = selected.name || "";
        }
        if (selected?.mandi && !prev.mandi) next.mandi = selected.mandi;
      }
      return next;
    });
    if (inwardErrors[name]) {
      setInwardErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleDhanakChange = (index: number, field: string, value: any) => {
    let next = value;
    if (field === "bags") next = wholeCountNoLeadingZero(String(value ?? ""));
    if (field === "moisture") next = decimalNoLeadingZero(String(value ?? ""));
    const newLots = [...dhanakLots];
    newLots[index] = { ...newLots[index], [field]: next };
    setDhanakLots(newLots);
  };

  /** Dhank No. = running S.No. (auto when supervisor adds a row) */
  const addDhanakRow = () => {
    const nextNo = String(dhanakLots.length + 1);
    setDhanakLots([
      ...dhanakLots,
      {
        id: Date.now(),
        dhankNo: nextNo,
        bags: "",
        moisture: "",
        bardanaClass: "",
      },
    ]);
  };

  // Modal States
  const [addSupplierModal, setAddSupplierModal] = useState({
    isOpen: false,
    name: "",
    firmNames: "",
    mandi: "",
    contact: "",
    plantId: "",
    biometricData: "",
  });
  const [isScanningSupplierFp, setIsScanningSupplierFp] = useState(false);
  const [addMandiModal, setAddMandiModal] = useState({
    isOpen: false,
    id: "",
    name: "",
    isActive: true,
  });
  const [inspectModal, setInspectModal] = useState({
    isOpen: false,
    batchId: "",
    moisture: 0,
    broken: 0,
    discoloration: 0,
    foreignMatter: 0,
  });

  const emptyPaddyPurchaseModal = () => ({
    isOpen: false,
    id: "",
    plantId: "",
    supplierId: "",
    riceCategory: "ANY",
    date: new Date().toISOString().split("T")[0],
    bolis: [
      { moisture: "", bags: "", rate: "", todayRate: "" },
      { moisture: "", bags: "", rate: "", todayRate: "" },
      { moisture: "", bags: "", rate: "", todayRate: "" },
      { moisture: "", bags: "", rate: "", todayRate: "" },
    ],
    govtRate: "",
    todayRate: "",
    mcPoint: "",
    diff: "",
    payment: "",
    note: "",
    finalHisabAmt: "",
    supervisorName: "",
    supervisorUserId: "",
    biometricData: "",
  });

  const [paddyPurchaseModal, setPaddyPurchaseModal] = useState<any>(
    emptyPaddyPurchaseModal(),
  );
  const [viewBolisModal, setViewBolisModal] = useState<any>({
    isOpen: false,
    bolis: [],
    partyMandi: "",
    date: "",
  });
  const [boliRecordRefreshKey, setBoliRecordRefreshKey] = useState(0);
  const [plantSupervisors, setPlantSupervisors] = useState<any[]>([]);

  const isPaddyBlock1Valid =
    paddyPurchaseModal.plantId &&
    paddyPurchaseModal.supplierId &&
    paddyPurchaseModal.date;

  /** Auto-fill Today Rate + M/C Point from Admin Mandi Daily Rate (date + Artia mandi) */
  React.useEffect(() => {
    const run = async () => {
      if (!paddyPurchaseModal.isOpen) return;
      const plantId = paddyPurchaseModal.plantId || activePlant?.id;
      const date = paddyPurchaseModal.date;
      const supplier = suppliers.find(
        (s: any) => s.id === paddyPurchaseModal.supplierId,
      );
      const mandi = supplier?.mandi;
      if (!plantId || !date || !mandi) return;
      try {
        const res = await api.get(`/api/procurement/mandi-daily-rates/lookup`, {
          params: { plantId, date, mandi },
        });
        const row = res.data;
        if (!row) return;
        const todayRate =
          row.todayRate != null ? String(row.todayRate) : "";
        const mcPoint = row.mcPoint != null ? String(row.mcPoint) : "";
        setPaddyPurchaseModal((prev: any) => ({
          ...prev,
          todayRate,
          mcPoint,
          bolis: (prev.bolis || []).map((b: any) => ({
            ...b,
            // Re-apply effective bulletin rate when Date / Mandi changes
            // (includes carried-forward prior Mandi rate until a new one is punched)
            todayRate: todayRate || b.todayRate,
          })),
        }));
      } catch {
        /* no Mandi rate punched yet (and no prior rate to carry forward) */
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    paddyPurchaseModal.isOpen,
    paddyPurchaseModal.plantId,
    paddyPurchaseModal.supplierId,
    paddyPurchaseModal.date,
    suppliers,
    activePlant?.id,
  ]);


  const fetchPlantSupervisors = async (plantId?: string) => {
    const pid = plantId || activePlant?.id;
    if (!pid) return;
    try {
      const res = await api.get(`/api/procurement/supervisors/${pid}`);
      setPlantSupervisors(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const openEstimatePurchase = () => {
    const millId = activePlant?.id || "";
    setPaddyPurchaseModal({
      ...emptyPaddyPurchaseModal(),
      isOpen: true,
      plantId: millId,
      govtRate:
        activePlant?.govtRate != null ? String(activePlant.govtRate) : "",
      supervisorName: isSupervisor ? user?.username || "" : "",
      bolis: [
        { moisture: "", bags: "", rate: "", todayRate: "" },
        { moisture: "", bags: "", rate: "", todayRate: "" },
        { moisture: "", bags: "", rate: "", todayRate: "" },
        { moisture: "", bags: "", rate: "", todayRate: "" },
      ],
      diff: "",
      finalHisabAmt: "",
      note: "",
      todayRate: "",
      mcPoint: "",
    });
    if (millId) {
      fetchSuppliers(millId);
      fetchPlantSupervisors(millId);
    }
  };

  const focusNextBoliField = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    col: "moisture" | "bags" | "todayRate" | "rate",
  ) => {
    const cols: Array<"moisture" | "bags" | "todayRate" | "rate"> = [
      "moisture",
      "bags",
      "rate",
    ];
    const colIdx = cols.indexOf(col);
    const rowCount = paddyPurchaseModal.bolis?.length ?? 0;
    const key = e.key;
    const code = e.code;
    const goNext =
      key === "Enter" ||
      key === "ArrowRight" ||
      code === "Enter" ||
      code === "NumpadEnter" ||
      code === "ArrowRight";
    const goPrev = key === "ArrowLeft" || code === "ArrowLeft";

    if (!goNext && !goPrev) return;

    const focusCell = (r: number, c: (typeof cols)[number]) => {
      const root =
        (e.currentTarget as HTMLElement).closest("form") ||
        (e.currentTarget as HTMLElement).closest("[data-boli-grid]") ||
        document;
      const el = root.querySelector(
        `[data-boli-cell="${r}-${c}"]`,
      ) as HTMLInputElement | null;
      if (!el) return;
      el.focus();
      try {
        el.select();
      } catch {
        /* number inputs */
      }
    };

    e.preventDefault();
    e.stopPropagation();

    if (goNext) {
      let nextCol = colIdx + 1;
      let nextRow = rowIndex;
      if (nextCol > 3) {
        nextCol = 0;
        nextRow = rowIndex + 1;
      }
      if (nextRow >= rowCount) {
        setPaddyPurchaseModal((prev: any) => ({
          ...prev,
          bolis: [
            ...(prev.bolis || []),
            { moisture: "", bags: "", todayRate: "", rate: "" },
          ],
        }));
        // Wait for new row DOM, then focus Moisture of that row
        requestAnimationFrame(() => {
          window.setTimeout(() => focusCell(nextRow, cols[nextCol]), 30);
        });
      } else {
        focusCell(nextRow, cols[nextCol]);
      }
    } else {
      let prevCol = colIdx - 1;
      let prevRow = rowIndex;
      if (prevCol < 0) {
        prevCol = 3;
        prevRow = rowIndex - 1;
      }
      if (prevRow < 0) return;
      focusCell(prevRow, cols[prevCol]);
    }
  };

  const openEditEstimate = async (row: any) => {
    try {
      const sodaId = row.sodaId || row.id;
      const res = await api.get(
        `/api/procurement/soda-pending/detail/${sodaId}`,
      );
      const p = res.data;
      // Skip Bags=0 / cancelled bolis — those columns are Final Bags only
      const activeBolis = (p.bolis || []).filter(
        (b: any) => !b.isCancelled && Number(b.bags) !== 0,
      );
      const bolis =
        activeBolis.length > 0
          ? activeBolis.map((b: any) => ({
              id: b.id,
              boliNo: b.boliNo,
              moisture: b.moisture ?? "",
              bags: b.bags ?? "",
              todayRate:
                b.todayRate != null
                  ? String(b.todayRate)
                  : p.todayRate != null
                    ? String(p.todayRate)
                    : "",
              rate: b.rate ?? "",
            }))
          : p.bolis?.length
            ? [{ moisture: "", bags: "", todayRate: "", rate: "" }]
            : [
                {
                  moisture: p.mc || "",
                  bags: p.bags || "",
                  todayRate: p.todayRate != null ? String(p.todayRate) : "",
                  rate: p.rate || "",
                },
              ];
      while (bolis.length < 4)
        bolis.push({ moisture: "", bags: "", todayRate: "", rate: "" });
      const cleanNote = (() => {
        const n = String(p.note || "").trim();
        if (!n) return "";
        if (/(iusto|lusto|quasi|quia sint|nobis veri|ipsum|dolor sit)/i.test(n))
          return "";
        return n;
      })();
      setPaddyPurchaseModal({
        isOpen: true,
        id: p.id,
        plantId: p.plantId || activePlant?.id || "",
        supplierId: p.supplierId,
        riceCategory: p.riceCategory || "ANY",
        date: new Date(p.date).toISOString().split("T")[0],
        bolis,
        diff: p.diff || "",
        payment: p.payment || "",
        note: cleanNote,
        finalHisabAmt: p.finalHisabAmt || "",
        govtRate: p.govtRate != null ? String(p.govtRate) : "",
        todayRate: p.todayRate != null ? String(p.todayRate) : "",
        mcPoint: p.mcPoint != null ? String(p.mcPoint) : "",
        supervisorName:
          p.supervisorName || (isSupervisor ? user?.username : "") || "",
        supervisorUserId: p.supervisorUserId || "",
        biometricData: "",
      });
      fetchSuppliers(p.plantId || activePlant?.id);
      fetchPlantSupervisors(p.plantId || activePlant?.id);
    } catch (e: any) {
      useUiStore
        .getState()
        .addToast(
          e.response?.data?.message || "Failed to load estimate",
          "error",
        );
    }
  };

  const handlePaddyPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paddyPurchaseSavingRef.current || isPaddyPurchaseSaving) return;
    const boliAllowed = paddyPurchaseModal.id ? canEditBoli : canAddBoli;
    if (!boliAllowed) {
      useUiStore
        .getState()
        .addToast(
          "This role cannot save a Boli Record. Add or Edit is required.",
          "error",
        );
      return;
    }

    const selectedPlantId = paddyPurchaseModal.plantId || activePlant?.id;
    if (!selectedPlantId) {
      useUiStore
        .getState()
        .addToast("Rice mill is required (assigned plant missing)", "error");
      return;
    }
    if (!paddyPurchaseModal.supervisorName) {
      useUiStore.getState().addToast("Supervisor Name is required", "error");
      return;
    }
    if (!paddyPurchaseModal.biometricData) {
      useUiStore.getState().addToast("Fingerprint is required", "error");
      return;
    }

    // Skip completely empty rows; allow fewer than 4 filled
    const filledBolis = (paddyPurchaseModal.bolis || []).filter(
      (b: any) =>
        String(b.moisture || "").trim() !== "" ||
        String(b.bags || "").trim() !== "" ||
        String(b.rate || "").trim() !== "",
    );
    if (filledBolis.length === 0) {
      useUiStore.getState().addToast("Enter at least one Boli row", "error");
      return;
    }
    for (const b of filledBolis) {
      if (b.bags !== "" && /[.]/.test(String(b.bags))) {
        useUiStore
          .getState()
          .addToast(
            isSupervisor
              ? "Bags must be whole numbers (no decimals)."
              : "Bags must be whole numbers (no decimals). Use 0 to cancel a boli.",
            "error",
          );
        return;
      }
      if (b.rate !== "" && /[.]/.test(String(b.rate))) {
        useUiStore
          .getState()
          .addToast("Rate must be a whole number (no decimals)", "error");
        return;
      }
      const bags = parseInt(String(b.bags), 10);
      if (!Number.isFinite(bags) || bags < 0 || bags > 999) {
        useUiStore.getState().addToast("Bags must be 0–999", "error");
        return;
      }
      // Supervisors: cancel only from Final Boli — block bags=0 here
      if (isSupervisor && bags === 0) {
        useUiStore
          .getState()
          .addToast(
            "Cannot cancel in Estimate Purchase. Use Cancel in Add Final Boli.",
            "error",
          );
        return;
      }
      const mStr = String(b.moisture ?? "").trim();
      if (mStr !== "" && !/^\d{1,2}(\.\d{1,2})?$/.test(mStr)) {
        useUiStore
          .getState()
          .addToast(
            "Moisture must be max 2 digits with up to 2 decimals",
            "error",
          );
        return;
      }
    }

    // Feedback 32 — lock only after validation so early returns don't block future submits
    paddyPurchaseSavingRef.current = true;

    const isEdit = !!paddyPurchaseModal.id;
    const payload = {
      ...paddyPurchaseModal,
      bolis: filledBolis,
      plantId: selectedPlantId,
      updatePlantGovtRate: user?.role === "SUPER_ADMIN",
    };

    setIsPaddyPurchaseSaving(true);
    setPaddyPurchaseModal(emptyPaddyPurchaseModal());

    try {
      if (isEdit) {
        await api.put(`/api/procurement/soda-pending/${payload.id}`, payload);
        useUiStore.getState().addToast("Estimate Purchase updated", "success");
      } else {
        await api.post("/api/procurement/soda-pending", payload);
        useUiStore.getState().addToast("Estimate Purchase created", "success");
      }
      await fetchSodaPending();
      await fetchRecentPurchases();
      setBoliRecordRefreshKey((k) => k + 1);
    } catch (error: any) {
      console.error("Failed to save purchase", error);
      const msg = error.response?.data?.message || "Failed to save purchase";
      useUiStore.getState().addToast(msg, "error");
    } finally {
      paddyPurchaseSavingRef.current = false;
      setIsPaddyPurchaseSaving(false);
    }
  };
  const [settleHisabModal, setSettleHisabModal] = useState<{
    isOpen: boolean;
    hisab: any;
    payment: string;
    note: string;
    finalHisabAmt: string;
  }>({
    isOpen: false,
    hisab: null,
    payment: "",
    note: "",
    finalHisabAmt: "",
  });

  useEffect(() => {
    if (activePlant?.id) {
      setFormData((prev: any) => ({ ...prev, plantId: activePlant?.id }));
    }
    const fetchData = async () => {
      fetchRecentPurchases();
      fetchSuppliers();
      fetchSodaPending();
      fetchMandis();

      const fetchMasterData = async () => {
        try {
          const res = await api.get("/api/master-data/trucks");
          setTrucks(res.data);
        } catch (e) {
          console.error("Failed to fetch trucks", e);
        }
        try {
          const res = await api.get("/api/master-data/drivers");
          setDrivers(res.data);
        } catch (e) {
          console.error("Failed to fetch drivers", e);
        }
        try {
          const res = await api.get("/api/master-data/staff");
          setStaff(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
          console.error("Failed to fetch staff", e);
        }
        try {
          const res = await api.get("/api/master-data/labour");
          const rows = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.data)
              ? res.data.data
              : [];
          setLabours(rows);
        } catch (e) {
          console.error("Failed to fetch labour", e);
        }
        try {
          const pid = activePlant?.id;
          if (pid) {
            const res = await api.get(`/api/procurement/unloaders/${pid}`);
            setUnloaderOptions(Array.isArray(res.data) ? res.data : []);
          } else {
            setUnloaderOptions([]);
          }
        } catch (e) {
          console.error("Failed to fetch unloaders", e);
          setUnloaderOptions([]);
        }
        try {
          const res = await api.get("/api/master-data/pahunch");
          setPahunchs(res.data);
        } catch (e) {
          console.error("Failed to fetch pahunchs", e);
        }
      };

      fetchMasterData();
    };
    if (activeTab !== "inward_register") {
      fetchData();
    }
  }, [activePlant?.id, activeTab, listFilters.dateFrom, listFilters.dateTo]);

  const handleMasterDataBlur = async (
    e: React.FocusEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target;
    if (!value) return;

    try {
      if (name === "truckNo" && canQuickAddFleet && !trucks.find((t) => t.truckNumber === value)) {
        await api.post("/api/master-data/trucks", { truckNumber: value });
        const res = await api.get("/api/master-data/trucks");
        setTrucks(res.data);
      } else if (
        name === "driverName" &&
        canQuickAddFleet &&
        !drivers.find((d) => d.name === value)
      ) {
        await api.post("/api/master-data/drivers", {
          name: value,
          phone:
            inwardFormData.driverMobile || inwardFormData.driverNumber || "",
        });
        const res = await api.get("/api/master-data/drivers");
        setDrivers(res.data);
      } else if (
        (name === "pahunchPersonName" || name === "pahunchPerson") &&
        canQuickAddPahunch &&
        !pahunchs.find((p) => p.name === value)
      ) {
        await api.post("/api/master-data/pahunch", { name: value });
        const res = await api.get("/api/master-data/pahunch");
        setPahunchs(res.data);
      }
      // Add similar for labour, etc if needed.
    } catch (err) {
      console.error("Auto-save failed:", err);
    }
  };

  // Dedicated useEffect for lists to respect pagination
  useEffect(() => {
    if (activeTab === "inward_register") {
      fetchInwardList();
    }
  }, [activePlant?.id, activeTab, listFilters, inwardCurrentPage]);

  useEffect(() => {
    if (activeTab === "paddy_inward") {
      fetchRecentPurchases();
      fetchDraftInwards();
      fetchSodaPending({ forInward: true });
      const pid = activePlant?.id;
      if (pid) {
        api
          .get(`/api/procurement/unloaders/${pid}`)
          .then((res) =>
            setUnloaderOptions(Array.isArray(res.data) ? res.data : []),
          )
          .catch(() => setUnloaderOptions([]));
      }
    }
  }, [
    activePlant?.id,
    activeTab,
    listFilters.dateFrom,
    listFilters.dateTo,
    recentPurchasesCurrentPage,
    inwardFormData.supplierId,
  ]);

  useEffect(() => {
    if (activeTab === "soda_pending") {
      fetchSodaPending();
    }
  }, [
    activePlant?.id,
    activeTab,
    listFilters.dateFrom,
    listFilters.dateTo,
    sodaPendingCurrentPage,
  ]);

  // Realtime: keep Estimate Purchase / Paddy Inward boli list current
  useEffect(() => {
    if (
      activeTab !== "paddy_purchase" &&
      activeTab !== "soda_pending" &&
      activeTab !== "paddy_inward"
    )
      return;
    if (!activePlant?.id) return;
    const tick = () => {
      if (document.visibilityState === "hidden") return;
      fetchSodaPending({ forInward: activeTab === "paddy_inward" });
    };
    const id = window.setInterval(tick, 3000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [activeTab, activePlant?.id, inwardFormData.supplierId]);

  const handleViewInward = async (inward: any) => {
    try {
      const res = await api.get(`/api/procurement/inward-details/${inward.id}`);
      setViewInwardModal(res.data);
    } catch (error) {
      console.error("Failed to fetch inward details", error);
      useUiStore.getState().addToast("Failed to load inward details", "error");
    }
  };

  const toTimeInput = (v: any) => {
    if (!v) return "";
    if (typeof v === "string" && /^\d{1,2}:\d{2}/.test(v)) return v.slice(0, 5);
    try {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toTimeString().slice(0, 5);
    } catch {
      /* ignore */
    }
    return "";
  };

  /** Feedback 33 — reopen draft inward into the form for unload / confirm */
  const handleContinueDraft = async (inward: any) => {
    try {
      const res = await api.get(`/api/procurement/inward-details/${inward.id}`);
      const batch = res.data;
      const d = batch.paddyInwardDetails || {};
      const q = batch.quality || {};
      setInwardFormData({
        ...defaultInwardFormData,
        id: batch.id,
        gpNo: d.gpNo || "",
        date:
          d.entryDate ||
          (batch.createdAt
            ? new Date(batch.createdAt).toISOString().split("T")[0]
            : ""),
        timeIn: d.timeIn || "",
        timeOut: d.timeOut || "",
        gpCompleteDate: d.gpCompleteDate || "",
        entryCompletionAt: d.entryCompletionAt || "",
        entryMadeByName: d.entryMadeByName || "",
        entryMadeByUserId: d.entryMadeByUserId || "",
        truckNo: d.truckNo || "",
        mandiEgpNo: d.egpLate ? d.mandiEgNo || "" : d.mandiEgNo || "",
        egpLate: !!d.egpLate,
        rstNo: d.rstNo || "",
        mandiParchiNo: d.mandiParchiNo || "",
        supplierId: batch.supplierId || "",
        partyName: d.partyName || batch.supplier?.name || "",
        mandi: d.mandi || "",
        pahunchPersonName: d.pahunchPersonName || "",
        mandiType: d.mandiType || "",
        boliRate: d.boliRate ?? "",
        moisture: d.moisture ?? q.moisture ?? "",
        safai: d.safaiType || "",
        remarks: d.remarks || "",
        discrepancy: d.discrepancy || "",
        mandiIntimation: d.mandiQualityAlert
          ? "Yes"
          : d.intimationToMandi
            ? "N.A."
            : "",
        allocationType: d.allocationType || "",
        hoodiUpload: d.isUploadedToHoodiRegister
          ? "Yes"
          : d.allocationType === "Hoodi"
            ? ""
            : "",
        allocateUnloader: d.allocateUnloader || d.unloaderName || "",
        mainUnloaderTruckCount: d.mainUnloaderTruckCount ?? "",
        stackNo: d.stackNo || "",
        bagsInMainStack: d.bagsInMainStack ?? "",
        partUnloaderName: d.partUnloaderName || "",
        partUnloaderTruckCount: d.partUnloaderTruckCount ?? "",
        secondPartStackNo: d.secondPartStackNo || "",
        bagsInSecondPartStack: d.bagsInSecondPartStack ?? "",
        partIsHoodi: !!d.partIsHoodi,
        showThirdPartStack: !!(
          d.thirdPartUnloaderName ||
          d.thirdPartStackNo ||
          d.thirdPartIsHoodi ||
          (d.bagsInThirdPartStack != null && Number(d.bagsInThirdPartStack) > 0)
        ),
        thirdPartUnloaderName: d.thirdPartUnloaderName || "",
        thirdPartUnloaderTruckCount: d.thirdPartUnloaderTruckCount ?? "",
        thirdPartStackNo: d.thirdPartStackNo || "",
        bagsInThirdPartStack: d.bagsInThirdPartStack ?? "",
        thirdPartIsHoodi: !!d.thirdPartIsHoodi,
        isHold: !!d.isHold,
        holdReason: d.holdReason || "",
        heldAt: d.heldAt || "",
        // Only auto-tick when unload was started and part columns were left blank
        noPartStack: Boolean(
          (d.allocateUnloader ||
            d.unloaderName ||
            d.stackNo ||
            (d.bagsInMainStack != null && Number(d.bagsInMainStack) > 0)) &&
          !d.secondPartStackNo &&
          !d.partIsHoodi &&
          !(
            d.bagsInSecondPartStack != null &&
            Number(d.bagsInSecondPartStack) > 0
          ) &&
          !d.partUnloaderName,
        ),
        labour: d.labourType || "",
        unloadingStartTime: toTimeInput(d.unloadingStartTime),
        unloadingFinishTime: toTimeInput(d.unloadingEndTime),
    origAClass:
      d.aClassReceived && Number(d.aClassReceived) !== 0
        ? d.aClassReceived
        : "",
    origBClass:
      d.bClassReceived && Number(d.bClassReceived) !== 0
        ? d.bClassReceived
        : "",
    shortageAClass:
      d.shortageAClass && Number(d.shortageAClass) !== 0
        ? d.shortageAClass
        : "",
    shortageBClass:
      d.shortageBClass && Number(d.shortageBClass) !== 0
        ? d.shortageBClass
        : "",
    origAClassAg:
      d.aClassGiven && Number(d.aClassGiven) !== 0 ? d.aClassGiven : "",
    origBClassAg:
      d.bClassGiven && Number(d.bClassGiven) !== 0 ? d.bClassGiven : "",
        qualityCutType: d.qualityCutType || "",
        qualityCutValue: d.qualityCutValue ?? 0,
        qualityCutReason: d.qualityCutReason || "",
        qualityCutQtl: d.qualityCutQtl ?? 0,
        grossWeight: d.grossWeight ?? "",
        tareWeight: d.tareWeight ?? "",
        netWeightWb: d.netWeightWb ?? "",
        netWtMill: d.netWtAtMill ?? 0,
        reqNetWt: d.requiredNetWt ?? 0,
        netWtDiff: d.netWtDifference ?? 0,
        netWtParty: d.netWtAtParty ?? 0,
        driverName: d.driverName || "",
        mobileNumber: d.driverMobileNumber || "",
        bhariVideoUpload: d.bhariVideoUrl || "",
        khaliVideoUpload: d.khaliVideoUrl || "",
        meterNotWorking: !!d.meterNotWorking,
        newTruckReading: d.newTruckReading ?? "",
        informBaujiBagsLess: !!d.informBaujiBagsLess,
        informBaujiExcessWeight: !!d.informBaujiExcessWeight,
        bagsRecLessThanAgencyGp: !!d.bagsRecLessThanAgencyGp,
        biometricData: batch.biometricData || "",
        autoNarration: true,
        shortageNarration: d.shortageNarration || "",
      });
      navigate("/procurement?tab=paddy_inward");
      setViewInwardModal(null);
      setShowDraftList(true);
      useUiStore
        .getState()
        .addToast("Draft loaded — complete unload and confirm", "success");
      // Scroll form into view after draft hydrate
      requestAnimationFrame(() => {
        document
          .querySelector("[data-paddy-inward-form]")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (error) {
      console.error("Failed to continue draft", error);
      useUiStore.getState().addToast("Failed to load draft inward", "error");
    }
  };

  const fetchInwardList = async () => {
    try {
      const pid = activePlant?.id || "global";
      const params = new URLSearchParams();
      if (listFilters.dateFrom) params.append("dateFrom", listFilters.dateFrom);
      if (listFilters.dateTo) params.append("dateTo", listFilters.dateTo);
      if (listFilters.mandi) params.append("mandi", listFilters.mandi);
      if (listFilters.supplierId)
        params.append("supplierId", listFilters.supplierId);
      params.append("page", inwardCurrentPage.toString());
      params.append("limit", "10");
      const res = await api.get(
        `/api/procurement/inwards/${pid}?${params.toString()}`,
      );
      if (res.data && Array.isArray(res.data.data)) {
        setInwardList(res.data.data);
        setInwardTotalItems(res.data.total || 0);
      } else {
        setInwardList(res.data); // Fallback for transition
        setInwardTotalItems(res.data.length || 0);
      }
    } catch (error) {
      console.error("Failed to fetch inward list", error);
    }
  };

  const openDraftModal = async () => {
    setDraftModalOpen(true);
    setShowDraftList(true);
    setDraftsLoading(true);
    await fetchDraftInwards();
    setDraftsLoading(false);
  };

  const fetchDraftInwards = async () => {
    try {
      const pid = activePlant?.id || "global";
      let rows: any[] = [];
      try {
        const res = await api.get(`/api/procurement/drafts/${pid}`);
        rows = Array.isArray(res.data) ? res.data : res.data?.data || [];
      } catch {
        // Fallback: filter plant inwards by DRAFT/PENDING
        const res = await api.get(`/api/procurement/inwards/${pid}`, {
          params: { page: 1, limit: 100 },
        });
        const all = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        rows = all
          .filter((r: any) =>
            ["DRAFT", "PENDING"].includes(r.status || r.batchStatus),
          )
          .map((r: any) => ({
            id: r.id,
            status: r.status || r.batchStatus || "DRAFT",
            date: r.date || r.entryDate || "",
            timeIn: r.timeIn,
            truckNo: r.truckNo || r.vehicleNo || "-",
            millGp: r.gpNo || r.millGp || "-",
            agencyGp: r.mandiEgNo || r.agencyGp || "-",
            rstNo: r.rstNo || "-",
            mandi: r.mandi || "-",
            partyName:
              r.partyName || r.supplier || r.supplierDetails?.name || "-",
            pahunchPersonName: r.pahunchPersonName || "-",
            grossWeight: r.grossWeight ?? r.grossWt ?? null,
            moisture: r.moisture ?? null,
          }));
      }
      setDraftInwards(rows);
      return rows;
    } catch (error) {
      console.error("Failed to fetch draft inwards", error);
      setDraftInwards([]);
      useUiStore.getState().addToast("Failed to load saved drafts", "error");
      return [];
    }
  };

  const fetchRecentPurchases = async () => {
    try {
      const pid = activePlant?.id || "global";
      const params = new URLSearchParams();
      if (listFilters.dateFrom) params.append("dateFrom", listFilters.dateFrom);
      if (listFilters.dateTo) params.append("dateTo", listFilters.dateTo);
      params.append("page", recentPurchasesCurrentPage.toString());
      params.append("limit", "10");
      const res = await api.get(
        `/api/procurement/recent/${pid}?${params.toString()}`,
      );
      if (res.data && Array.isArray(res.data.data)) {
        setRecentPurchases(res.data.data);
        setRecentPurchasesTotalItems(res.data.total || 0);
      } else {
        setRecentPurchases(res.data);
        setRecentPurchasesTotalItems(res.data.length || 0);
      }
    } catch (error) {
      console.error("Error fetching recent purchases", error);
    }
  };

  const fetchSuppliers = async (plantIdOverride?: string) => {
    try {
      const pid = plantIdOverride || activePlant?.id;
      const res = await api.get(`/api/procurement/suppliers`, {
        params: pid ? { plantId: pid } : {},
      });
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error fetching suppliers", error);
    }
  };

  const fetchPaddyStockReport = async () => {
    try {
      const pid = activePlant?.id;
      if (!pid) {
        setPaddyStackDocRows([]);
        setPaddyStackDryerDetail([]);
        setPaddyStockReportData([]);
        return;
      }
      const [docRes, stockRes] = await Promise.all([
        api.get(`/api/procurement/paddy-stack-documentation`, {
          params: { plantId: pid },
        }),
        api.get(`/api/procurement/reports/paddy-stock?plantId=${pid}`),
      ]);
      setPaddyStackDocRows(
        Array.isArray(docRes.data?.rows) ? docRes.data.rows : [],
      );
      setPaddyStackDryerDetail(
        Array.isArray(docRes.data?.dryerBharaiDetail)
          ? docRes.data.dryerBharaiDetail
          : [],
      );
      setPaddyStockReportData(
        Array.isArray(stockRes.data) ? stockRes.data : [],
      );
    } catch (error) {
      console.error("Failed to fetch paddy stock report", error);
      useUiStore
        .getState()
        .addToast("Failed to load paddy stock report", "error");
    }
  };

  useEffect(() => {
    if (
      activeTab === "reports" &&
      listFilters.activeReportTab === "paddy_stack"
    ) {
      fetchPaddyStockReport();
    }
  }, [activePlant?.id, activeTab, listFilters.activeReportTab]);

  const fetchSodaPending = async (opts?: { forInward?: boolean }) => {
    try {
      const pid = activePlant?.id || "global";
      const forInward =
        opts?.forInward === true || activeTab === "paddy_inward";
      const params = new URLSearchParams();
      if (forInward) {
        // Paddy Inward must show live Boli Record (Final Bags / Bags Rec),
        // not a paged/date-filtered snapshot from another tab.
        if (inwardFormData.supplierId) {
          params.append("supplierId", inwardFormData.supplierId);
        }
        params.append("page", "1");
        params.append("limit", "1000");
      } else {
        if (listFilters.dateFrom) params.append("dateFrom", listFilters.dateFrom);
        if (listFilters.dateTo) params.append("dateTo", listFilters.dateTo);
        if (listFilters.supplierId)
          params.append("supplierId", listFilters.supplierId);
        if (listFilters.mandi) params.append("mandi", listFilters.mandi);
        params.append("page", sodaPendingCurrentPage.toString());
        params.append("limit", "10");
      }
      const res = await api.get(
        `/api/procurement/soda-pending/${pid}?${params.toString()}`,
      );
      if (res.data && Array.isArray(res.data.data)) {
        setSodaPending(res.data.data);
        setSodaPendingTotalItems(res.data.total || 0);
      } else {
        setSodaPending(res.data);
        setSodaPendingTotalItems(res.data.length || 0);
      }
    } catch (error) {
      console.error("Error fetching soda pending", error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const calculateTotal = () => {
    const netWt = parseFloat(formData.netWeight) || 0;
    const rate = parseFloat(formData.ratePerQuintal) || 0;
    const trans = parseFloat(formData.transportCharges) || 0;
    const other = parseFloat(formData.otherCharges) || 0;
    const baseAmt = netWt * 10 * rate;
    return (baseAmt + trans + other).toFixed(2);
  };

  const handleSubmitPurchase = async () => {
    try {
      setIsSubmitting(true);
      await api.post("/api/procurement/save-purchase", {
        ...formData,
        category,
      });
      useUiStore
        .getState()
        .addToast("Purchase Entry Saved successfully", "success");
      setFormData({ ...defaultFormData, plantId: activePlant?.id || "" });
    } catch (error) {
      console.error("Failed to save purchase", error);
      useUiStore
        .getState()
        .addToast("Failed to save purchase. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSupplierModal.name) return;
    const supplierPlantId = addSupplierModal.plantId || activePlant?.id;
    if (!supplierPlantId) {
      useUiStore
        .getState()
        .addToast("Select a mill before adding Arthiya", "error");
      return;
    }
    if (isSupervisor && !addSupplierModal.biometricData) {
      useUiStore
        .getState()
        .addToast(
          "Scan your fingerprint to submit Arthiya for Admin approval",
          "error",
        );
      return;
    }
    await addSupplierLock.wrapSubmit(async () => {
      try {
        await api.post("/api/procurement/suppliers", {
          name: addSupplierModal.name,
          contact: addSupplierModal.contact,
          firmNames: addSupplierModal.firmNames
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          mandi: addSupplierModal.mandi,
          plantId: supplierPlantId,
          ...(addSupplierModal.biometricData
            ? { biometricData: addSupplierModal.biometricData }
            : {}),
        });
        setAddSupplierModal({
          isOpen: false,
          name: "",
          firmNames: "",
          mandi: "",
          contact: "",
          plantId: "",
          biometricData: "",
        });
        fetchSuppliers(supplierPlantId);
        useUiStore
          .getState()
          .addToast(
            isSupervisor
              ? "Arthiya sent to Admin for confirmation"
              : "Arthiya added for this mill",
            "success",
          );
      } catch (error: any) {
        console.error("Failed to add supplier", error);
        useUiStore
          .getState()
          .addToast(
            error?.response?.data?.message || "Failed to add Arthiya",
            "error",
          );
      }
    });
  };

  const handleScanSupplierFingerprint = async () => {
    setIsScanningSupplierFp(true);
    try {
      const xml = await biometricService.captureAndVerifyLoggedInUser();
      setAddSupplierModal((prev) => ({ ...prev, biometricData: xml }));
      useUiStore.getState().addToast("Fingerprint matched", "success");
    } catch (err: any) {
      useUiStore
        .getState()
        .addToast(err?.message || "Fingerprint scan failed", "error");
    } finally {
      setIsScanningSupplierFp(false);
    }
  };

  const handleApproveSupplier = async (id: string) => {
    if (!canEditSupplier) return;
    try {
      await api.put(`/api/procurement/suppliers/${id}/approve`);
      useUiStore.getState().addToast("Arthiya approved", "success");
      fetchSuppliers();
    } catch (error: any) {
      useUiStore
        .getState()
        .addToast(
          error?.response?.data?.message || "Failed to approve Arthiya",
          "error",
        );
    }
  };

  const handleRejectSupplier = async (id: string) => {
    if (!canEditSupplier) return;
    if (
      !window.confirm(
        "Decline and remove this Arthiya application?",
      )
    )
      return;
    try {
      await api.put(`/api/procurement/suppliers/${id}/reject`);
      useUiStore.getState().addToast("Arthiya application declined", "success");
      fetchSuppliers();
    } catch (error: any) {
      useUiStore
        .getState()
        .addToast(
          error?.response?.data?.message || "Failed to decline Arthiya",
          "error",
        );
    }
  };

  const handleToggleMandiStatus = async (m: any) => {
    if (!canManageMandi) {
      useUiStore
        .getState()
        .addToast("Only Admin can change Mandi status", "error");
      return;
    }
    try {
      await updateMandi(m.id, { name: m.name, isActive: !m.isActive });
      useUiStore
        .getState()
        .addToast(
          `Mandi ${m.name} marked as ${!m.isActive ? "Active" : "Inactive"}`,
          "success",
        );
      fetchMandis();
    } catch (error) {
      console.error("Failed to toggle status", error);
    }
  };

  const handleDeleteMandi = async (id: string) => {
    if (!canManageMandi) {
      useUiStore
        .getState()
        .addToast("Only Admin can delete Mandis", "error");
      return;
    }
    if (window.confirm("Are you sure you want to delete this Mandi?")) {
      try {
        await deleteMandi(id);
        useUiStore.getState().addToast("Mandi deleted successfully", "success");
        fetchMandis();
      } catch (error) {
        console.error("Failed to delete mandi", error);
      }
    }
  };

  const handleAddMandi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageMandi) {
      useUiStore
        .getState()
        .addToast("Only Admin can add or edit Mandis", "error");
      return;
    }
    if (!addMandiModal.name) return;
    await addMandiLock.wrapSubmit(async () => {
      try {
        if (addMandiModal.id) {
          await updateMandi(addMandiModal.id, {
            name: addMandiModal.name,
            isActive: addMandiModal.isActive,
          });
          useUiStore
            .getState()
            .addToast("Mandi updated successfully", "success");
        } else {
          await createMandi({
            name: addMandiModal.name,
            isActive: addMandiModal.isActive,
          });
          useUiStore.getState().addToast("Mandi added successfully", "success");
        }
        setAddMandiModal({ isOpen: false, id: "", name: "", isActive: true });
        fetchMandis();
      } catch (error: any) {
        console.error("Failed to save mandi", error);
        useUiStore
          .getState()
          .addToast(
            error?.response?.data?.message || "Failed to save Mandi",
            "error",
          );
      }
    });
  };

  const openStackModal = async () => {
    const selectedPlantId = activePlant?.id;
    if (!selectedPlantId) {
      useUiStore
        .getState()
        .addToast(
          "Please select a plant at the top of the page first.",
          "error",
        );
      return;
    }
    try {
      const res = await api.get(
        `/api/procurement/occupied-stacks/${selectedPlantId}`,
      );
      setOccupiedStacks(res.data);
    } catch (err) {
      console.error("Failed to fetch occupied stacks", err);
    }
    setIsStackModalOpen(true);
  };
  const handleInwardSubmit = async (
    status: string = "CONFIRMED",
    overrides: Record<string, any> = {},
  ): Promise<boolean> => {
    if (isSubmitting) return false;
    if (!canSavePaddyInward) {
      useUiStore
        .getState()
        .addToast(
          "This role cannot save Paddy Inward. Add or Edit is required on Procurement → Paddy Inward.",
          "error",
        );
      return false;
    }
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().slice(0, 5);

    // Punch date / time defaults
    let working = { ...inwardFormData, ...overrides };
    // Feedback 39 — Hold saves as Pending Draft; Confirm still allowed to complete a held entry
    let effectiveStatus =
      working.isHold && status !== "CONFIRMED" ? "DRAFT" : status;
    let punched = false;
    if (effectiveStatus === "DRAFT") {
      if (!working.date) {
        working.date = dateStr;
        punched = true;
      }
      if (!working.timeIn) {
        working.timeIn = timeStr;
        punched = true;
      }
    }
    // Auto Update ON: only keep fingerprint stamps — never invent GP Complete without biometric
    // Auto Update OFF: never invent values — supervisor must enter manually
    if (effectiveStatus === "CONFIRMED" && autoUpdateDateTime) {
      if (!working.biometricData) {
        useUiStore
          .getState()
          .addToast(
            "Supervisor fingerprint is required to stamp GP Complete Date & Time Out and Entry Completion.",
            "error",
          );
        return false;
      }
      if (!working.entryCompletionAt) {
        working.entryCompletionAt = now.toISOString();
        punched = true;
      }
      if (!working.gpCompleteDate) {
        working.gpCompleteDate = dateStr;
        punched = true;
      }
      if (!working.timeOut) {
        working.timeOut = timeStr;
        punched = true;
      }
      if (!working.entryMadeByName) {
        working.entryMadeByName = user?.username || user?.email || "";
        punched = true;
      }
    }
    if (punched) {
      setInwardFormData((prev: any) => ({
        ...prev,
        date: working.date,
        timeIn: working.timeIn,
        timeOut: working.timeOut,
        gpCompleteDate: working.gpCompleteDate,
        entryCompletionAt: working.entryCompletionAt || prev.entryCompletionAt,
      }));
    }

    const draftRequired = [
      "gpNo",
      "date",
      "timeIn",
      "truckNo",
      "newTruckReading",
      "supplierId",
      "mandiParchiNo",
      "mandiEgpNo",
      "mandiType",
      "rstNo",
      "moisture",
      "safai",
      "mandiIntimation",
      "remarks",
      "bhariVideoUpload",
      "grossWeight",
    ];
    const confirmRequired = [
      "gpNo",
      "date",
      "timeIn",
      "timeOut",
      "gpCompleteDate",
      "truckNo",
      "newTruckReading",
      "supplierId",
      "mandiParchiNo",
      "mandiEgpNo",
      "mandiType",
      "rstNo",
      "moisture",
      "safai",
      "mandiIntimation",
      "remarks",
      "bhariVideoUpload",
      "khaliVideoUpload",
      "allocationType",
      "hoodiUpload",
      "allocateUnloader",
      "stackNo",
      "bagsInMainStack",
      ...(working.noPartStack
        ? []
        : [
            "partUnloaderName",
            ...(working.partIsHoodi ? [] : ["secondPartStackNo"]),
            "bagsInSecondPartStack",
          ]),
      "labour",
      "unloadingStartTime",
      "unloadingFinishTime",
      "netWtMill",
      "netWtDiff",
      "netWtParty",
      "discrepancy",
      "grossWeight",
      "driverName",
      "mobileNumber",
    ];

    let requiredFields =
      working.isHold && effectiveStatus === "DRAFT"
        ? (["truckNo", "allocateUnloader", "date", "timeIn"] as string[])
        : effectiveStatus === "DRAFT"
          ? [...draftRequired]
          : [...confirmRequired];
    if (working.egpLate) {
      requiredFields = requiredFields.filter((f) => f !== "mandiEgpNo");
    }
    if (
      effectiveStatus !== "DRAFT" &&
      working.showThirdPartStack &&
      !(working.isHold && effectiveStatus === "DRAFT")
    ) {
      requiredFields.push("thirdPartUnloaderName", "bagsInThirdPartStack");
      if (!working.thirdPartIsHoodi) requiredFields.push("thirdPartStackNo");
    }

    let hasError = false;
    const newErrors: Record<string, string> = {};

    // Supervisor date rules: no future dates; backdate only when Auto Update Date & Time is OFF
    if (isSupervisor) {
      const entryDate = String(working.date || "").slice(0, 10);
      const completeDate = String(working.gpCompleteDate || "").slice(0, 10);
      if (entryDate && entryDate > todayLocal) {
        newErrors.date = "Future dates are not allowed for supervisors";
        hasError = true;
      } else if (
        entryDate &&
        entryDate < todayLocal &&
        !canManualDateTime
      ) {
        newErrors.date =
          "Backdated entries require Auto Update Date & Time OFF for this mill";
        hasError = true;
      }
      if (completeDate && completeDate > todayLocal) {
        newErrors.gpCompleteDate =
          "Future dates are not allowed for supervisors";
        hasError = true;
      } else if (
        completeDate &&
        completeDate < todayLocal &&
        !canManualDateTime
      ) {
        newErrors.gpCompleteDate =
          "Backdated entries require Auto Update Date & Time OFF for this mill";
        hasError = true;
      }
    }

    if (working.isHold && !String(working.holdReason || "").trim()) {
      newErrors.holdReason = "Hold reason is required";
      hasError = true;
    }

    requiredFields.forEach((field) => {
      if (!working[field] && working[field] !== 0) {
        newErrors[field] = "This field is mandatory";
        hasError = true;
      }
    });

    if (effectiveStatus === "CONFIRMED") {
      const millBagsTotal =
        (parseFloat(String(working.origAClass ?? "")) || 0) +
        (parseFloat(String(working.origBClass ?? "")) || 0) +
        (parseFloat(String(working.shortageAClass ?? "")) || 0) +
        (parseFloat(String(working.shortageBClass ?? "")) || 0);
      if (millBagsTotal <= 0) {
        newErrors.origBClass = "Enter Bardana bags (figure starts from the number, not 0)";
        hasError = true;
      }
    }

    // pahunchPerson OR pahunchPersonName (not required when placing Hold pause)
    if (
      !(working.isHold && effectiveStatus === "DRAFT") &&
      !(working.pahunchPerson || working.pahunchPersonName)
    ) {
      newErrors.pahunchPersonName = "This field is mandatory";
      hasError = true;
    }

    if (effectiveStatus === "CONFIRMED") {
      if (working.allocationType === "Hoodi" && working.hoodiUpload !== "Yes") {
        newErrors.hoodiUpload = "Hoodi upload must be Yes";
        hasError = true;
      }
      // F39 Time Tracking — chronological sequence + min gaps (no QR/phone):
      // 1. In Time → 2. Unload Start (≥5m) → 3. Unload Finish (≥30m) → 4. Out Time (≥5m)
      const toMs = (dateVal: string, timeVal: string) => {
        if (!dateVal || !timeVal) return null;
        const raw = String(timeVal).trim();
        if (raw.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(raw)) {
          const ms = new Date(raw).getTime();
          return Number.isFinite(ms) ? ms : null;
        }
        const ms = new Date(
          `${String(dateVal).slice(0, 10)}T${raw.slice(0, 5)}:00`,
        ).getTime();
        return Number.isFinite(ms) ? ms : null;
      };
      const entryDate = String(working.date || "").slice(0, 10);
      const outDate = String(
        working.gpCompleteDate || working.date || "",
      ).slice(0, 10);
      const inMs = toMs(entryDate, working.timeIn);
      const startMs = toMs(entryDate, working.unloadingStartTime);
      const finishMs = toMs(entryDate, working.unloadingFinishTime);
      const outMs = toMs(outDate, working.timeOut);

      if (
        inMs != null &&
        startMs != null &&
        finishMs != null &&
        outMs != null
      ) {
        if (startMs < inMs) {
          newErrors.unloadingStartTime =
            "Unload Start must be after Paddy Inward (In Time)";
          hasError = true;
        } else if ((startMs - inMs) / 60000 < 5) {
          newErrors.unloadingStartTime =
            "Min 5 minutes after In Time (Paddy Inward → Unloader Allotment)";
          hasError = true;
        }
        if (finishMs < inMs) {
          newErrors.unloadingFinishTime =
            "Unload Finish cannot be before Paddy Inward (In Time)";
          hasError = true;
        }
        if (finishMs < startMs) {
          newErrors.unloadingFinishTime =
            "Unload Finish cannot be before Unload Start Time";
          hasError = true;
        } else if ((finishMs - startMs) / 60000 < 30) {
          newErrors.unloadingFinishTime =
            "Min 30 minutes after Unload Start (Allotment → Finish)";
          hasError = true;
        }
        if (outMs < finishMs) {
          newErrors.timeOut =
            "Out Time (Net Weight) cannot be before Unload Finish";
          hasError = true;
        } else if ((outMs - finishMs) / 60000 < 5) {
          newErrors.timeOut =
            "Min 5 minutes after Unload Finish (Finish → Net Weight Out)";
          hasError = true;
        }
        // Keep overall In → Out floor from earlier feedback (≥30m); F39 chain is usually ≥40m
        if (outMs >= inMs && (outMs - inMs) / 60000 < 30) {
          newErrors.timeOut =
            "Minimum 30-minute gap required between Date & Time In and GP Complete / Time Out";
          newErrors.gpCompleteDate = newErrors.timeOut;
          hasError = true;
        }
      } else if (
        working.date &&
        working.timeIn &&
        working.gpCompleteDate &&
        working.timeOut
      ) {
        // Fallback if unload times missing from toMs — keep prior In/Out checks
        const fallbackIn = toMs(entryDate, working.timeIn);
        const fallbackOut = toMs(outDate, working.timeOut);
        if (fallbackIn != null && fallbackOut != null) {
          if (fallbackOut < fallbackIn) {
            newErrors.gpCompleteDate =
              "GP Complete Date & Time Out cannot be prior to Date & Time In";
            newErrors.timeOut = newErrors.gpCompleteDate;
            hasError = true;
          } else if ((fallbackOut - fallbackIn) / 60000 < 30) {
            newErrors.gpCompleteDate =
              "Minimum 30-minute gap required between Date & Time In and GP Complete / Time Out";
            newErrors.timeOut = newErrors.gpCompleteDate;
            hasError = true;
          }
        }
      }
      // F39 Entry & Linkage — bags for Unloader 1 (+ Unloader 2 if part stack)
      const mainBags = parseFloat(String(working.bagsInMainStack ?? "")) || 0;
      const partBags = working.noPartStack
        ? 0
        : parseFloat(String(working.bagsInSecondPartStack ?? "")) || 0;
      const thirdBags = working.showThirdPartStack
        ? parseFloat(String(working.bagsInThirdPartStack ?? "")) || 0
        : 0;
      const millBags =
        parseFloat(String(working.bagsRecAtMill ?? "")) ||
        (parseFloat(String(working.origAClass ?? "")) || 0) +
          (parseFloat(String(working.origBClass ?? "")) || 0);
      const splitBags = mainBags + partBags + thirdBags;
      if (millBags > 0 && splitBags > 0) {
        if (Math.abs(splitBags - millBags) > 0.01) {
          newErrors.bagsInMainStack = `Unloader bags (Main ${mainBags}${
            working.noPartStack ? "" : ` + Part ${partBags}`
          }${
            working.showThirdPartStack ? ` + 3rd ${thirdBags}` : ""
          } = ${splitBags}) must match Bags Rec. @ Mill (${millBags})`;
          hasError = true;
        }
      }
      if (
        !working.noPartStack &&
        !String(working.partUnloaderName || "").trim()
      ) {
        newErrors.partUnloaderName =
          "Select Part Unloader (Unloader 2) for part stack";
        hasError = true;
      }
    }

    if (hasError) {
      setInwardErrors(newErrors);
      useUiStore
        .getState()
        .addToast("Please fill all the mandatory fields", "error");
      return false;
    }

    const selectedPlantId = activePlant?.id;
    if (!selectedPlantId) {
      useUiStore
        .getState()
        .addToast(
          "Please select a plant at the top of the page first.",
          "error",
        );
      return false;
    }
    try {
      setIsSubmitting(true);

      // Refresh unloader truck serials before confirm (backend also assigns on CONFIRMED)
      let truckCounts: {
        mainUnloaderTruckCount?: string | number;
        partUnloaderTruckCount?: string | number;
        thirdPartUnloaderTruckCount?: string | number;
      } = {};
      if (effectiveStatus === "CONFIRMED" && selectedPlantId) {
        try {
          if (working.allocateUnloader) {
            const mainRes = await api.get(
              `/api/procurement/unloader-truck-count`,
              {
                params: {
                  plantId: selectedPlantId,
                  unloaderName: working.allocateUnloader,
                  kind: "main",
                  date: working.date || undefined,
                  excludeBatchId: working.id || undefined,
                },
              },
            );
            truckCounts.mainUnloaderTruckCount = mainRes.data?.nextCount;
          }
          if (working.partUnloaderName && !working.noPartStack) {
            const partRes = await api.get(
              `/api/procurement/unloader-truck-count`,
              {
                params: {
                  plantId: selectedPlantId,
                  unloaderName: working.partUnloaderName,
                  kind: "part",
                  date: working.date || undefined,
                  excludeBatchId: working.id || undefined,
                },
              },
            );
            truckCounts.partUnloaderTruckCount = partRes.data?.nextCount;
          }
          if (working.thirdPartUnloaderName && working.showThirdPartStack) {
            const thirdRes = await api.get(
              `/api/procurement/unloader-truck-count`,
              {
                params: {
                  plantId: selectedPlantId,
                  unloaderName: working.thirdPartUnloaderName,
                  kind: "third",
                  date: working.date || undefined,
                  excludeBatchId: working.id || undefined,
                },
              },
            );
            truckCounts.thirdPartUnloaderTruckCount = thirdRes.data?.nextCount;
          }
        } catch {
          /* backend will still assign on confirm */
        }
      }

      const parsedOrigA = parseFloat(working.origAClass as any) || 0;
      const parsedOrigB = parseFloat(working.origBClass as any) || 0;
      const parsedShortageA = parseFloat(working.shortageAClass as any) || 0;
      const parsedShortageB = parseFloat(working.shortageBClass as any) || 0;
      const computedBagsRecAtMill =
        parsedOrigA + parsedOrigB + parsedShortageA + parsedShortageB;

      const parsedOrigAAg = parseFloat(working.origAClassAg as any) || 0;
      const parsedOrigBAg = parseFloat(working.origBClassAg as any) || 0;
      const computedBagsAtAgencyGp = parsedOrigAAg + parsedOrigBAg;

      const payload = {
        ...formData,
        ...working,
        ...(effectiveStatus === "CONFIRMED"
          ? truckCounts
          : {
              // F39 — do not credit / persist serial during active unload or draft
              mainUnloaderTruckCount: null,
              partUnloaderTruckCount: null,
              unloaderTruckCount: null,
            }),
        id: working.id || undefined,
        shortageQtl: working.actualShortageQtl,
        bagsRecAtMill: computedBagsRecAtMill,
        bagsAtAgencyGp: working.egpLate ? 0 : computedBagsAtAgencyGp,
        egpLate: !!working.egpLate,
        showThirdPartStack: !!working.showThirdPartStack,
        ...(working.showThirdPartStack
          ? {
              thirdPartIsHoodi: !!working.thirdPartIsHoodi,
              thirdPartStackNo: working.thirdPartIsHoodi
                ? ""
                : working.thirdPartStackNo,
            }
          : {
              thirdPartUnloaderName: "",
              thirdPartUnloaderTruckCount: null,
              thirdPartStackNo: "",
              bagsInThirdPartStack: null,
              thirdPartIsHoodi: false,
            }),
        boliInputs,
        category,
        plantId: selectedPlantId,
        status: effectiveStatus,
        isHold: !!working.isHold,
        holdReason: working.isHold
          ? String(working.holdReason || "").trim()
          : working.holdReason || "",
        heldAt: working.isHold
          ? working.heldAt || new Date().toISOString()
          : working.heldAt || null,
        standardBagWeight:
          plants.find((p) => p.id === selectedPlantId)?.standardBagWeight ||
          activePlant?.standardBagWeight ||
          0.382,
        entryMadeByName:
          working.entryMadeByName || user?.username || user?.email || undefined,
        entryMadeByUserId: working.entryMadeByUserId || user?.id || undefined,
        ...(working.noPartStack
          ? {
              partUnloaderName: "",
              partUnloaderTruckCount: null,
              secondPartStackNo: "",
              bagsInSecondPartStack: null,
              partStackNo: "",
              bagsInPartStack: null,
              partIsHoodi: false,
            }
          : {
              partIsHoodi: !!working.partIsHoodi,
              secondPartStackNo: working.partIsHoodi
                ? ""
                : working.secondPartStackNo,
            }),
      };

      const res = await api.post("/api/procurement/save-purchase", payload);
      useUiStore
        .getState()
        .addToast(
          working.isHold
            ? "Paddy Inward put on Hold (Pending Draft)"
            : `Paddy Inward Saved as ${effectiveStatus}`,
          "success",
        );
      if (effectiveStatus === "CONFIRMED") {
        // Real-time Artia till-date shortage after fingerprint submit
        await refreshArtiaTillDateShortage(working.supplierId, selectedPlantId);
      }
      if (effectiveStatus === "DRAFT") {
        // Keep form open with id so supervisor can continue after unload
        setInwardFormData({
          ...working,
          id: res.data?.id || working.id,
          isHold: !!working.isHold,
          heldAt: working.isHold
            ? working.heldAt || new Date().toISOString()
            : working.heldAt,
        });
        setShowDraftList(true);
        await fetchDraftInwards();
        setDraftModalOpen(true);
      } else {
        setInwardFormData({ ...defaultInwardFormData });
        setBoliInputs({});
        fetchDraftInwards();
      }
      fetchSodaPending();
      fetchRecentPurchases();
      fetchInwardList();
      return true;
    } catch (error: any) {
      console.error("Failed to save inward", error);
      useUiStore
        .getState()
        .addToast(
          error?.response?.data?.message || "Failed to save inward data.",
          "error",
        );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    await inspectLock.wrapSubmit(async () => {
      try {
        await api.post(`/api/procurement/quality/${inspectModal.batchId}`, {
          moisture: parseFloat(inspectModal.moisture as any),
          broken: parseFloat(inspectModal.broken as any),
          discoloration: parseFloat(inspectModal.discoloration as any),
          foreignMatter: parseFloat(inspectModal.foreignMatter as any),
          status: "COMPLETED",
        });
        setInspectModal({
          isOpen: false,
          batchId: "",
          moisture: 0,
          broken: 0,
          discoloration: 0,
          foreignMatter: 0,
        });
        fetchRecentPurchases();
      } catch (error) {
        console.error("Failed to update quality", error);
      }
    });
  };

  const handleSettleHisabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSettleHisab) {
      useUiStore.getState().addToast(
        "Not allowed. Turn on Edit for Procurement → Boli Record, then log in again.",
        "error",
      );
      return;
    }
    if (!settleHisabModal.hisab) return;
    await settleHisabLock.wrapSubmit(async () => {
      try {
        await api.post("/api/procurement/settle-hisab", {
          id: settleHisabModal.hisab.id,
          payment: parseFloat(settleHisabModal.payment) || 0,
          note: settleHisabModal.note,
          finalHisabAmt: parseFloat(settleHisabModal.finalHisabAmt) || 0,
        });
        setSettleHisabModal({ ...settleHisabModal, isOpen: false });
        fetchSodaPending();
      } catch (error) {
        console.error("Settle Hisab failed", error);
        useUiStore.getState().addToast("Failed to settle hisab", "error");
      }
    });
  };

  const filteredSodaPending = sodaPending.filter((p) => {
    let matches = true;
    if (listFilters.supplierId)
      matches = matches && p.supplierId === listFilters.supplierId;
    if (listFilters.mandi)
      matches =
        matches &&
        p.partyMandi?.toLowerCase().includes(listFilters.mandi.toLowerCase());
    return matches;
  });

  const dailyStats = React.useMemo(() => {
    const stats: Record<
      string,
      {
        maxRate: number;
        minRate: number;
        totalBags: number;
        purchases: number;
        govtRate: number;
        overPricedValue: number;
      }
    > = {};

    filteredSodaPending.forEach((p: any) => {
      const d = new Date(p.date).toLocaleDateString();
      const govtRate = parseFloat(p.govtRate) || activePlant?.govtRate || 0;
      if (!stats[d]) {
        stats[d] = {
          maxRate: 0,
          minRate: Infinity,
          totalBags: 0,
          purchases: 0,
          govtRate,
          overPricedValue: 0,
        };
      }

      const processRate = (rate: number, bags: number, moisture: number) => {
        if (rate > 0) {
          if (rate > stats[d].maxRate) stats[d].maxRate = rate;
          if (rate < stats[d].minRate) stats[d].minRate = rate;
          if (stats[d].govtRate > 0) {
            const bMoisture = activePlant?.benchmarkMoisture ?? 17;
            const safaiCut = activePlant?.safaiCut ?? 2;
            const procCut = activePlant?.processingCut ?? 4;
            const mCut = moisture > bMoisture ? moisture - bMoisture : 0;
            const totalCut = mCut + safaiCut + procCut;
            const requiredRate =
              stats[d].govtRate - stats[d].govtRate * (totalCut / 100);

            if (rate > requiredRate) {
              stats[d].overPricedValue += (rate - requiredRate) * bags;
            }
          }
        }
      };

      if (p.bolis && p.bolis.length > 0) {
        p.bolis.forEach((b: any) => {
          processRate(
            parseFloat(b.rate) || 0,
            parseFloat(b.bags) || 0,
            parseFloat(b.moisture || p.mc) || 0,
          );
          stats[d].totalBags += parseFloat(b.bags) || 0;
        });
        stats[d].purchases += p.bolis.length;
      } else {
        processRate(
          parseFloat(p.rate) || 0,
          parseFloat(p.bags) || 0,
          parseFloat(p.mc) || 0,
        );
        stats[d].totalBags += parseFloat(p.bags) || 0;
        stats[d].purchases += 1;
      }
    });

    Object.keys(stats).forEach((k) => {
      if (stats[k].minRate === Infinity) stats[k].minRate = 0;
    });
    return Object.entries(stats).map(([date, data]) => ({ date, ...data }));
  }, [filteredSodaPending, activePlant]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)]">
      {/* Header & Category Toggle */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-panel)]">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-[#e67e00]" />
          <h1 className="text-sm font-semibold text-[var(--text-muted)]">
            Procurement Module
          </h1>
        </div>

        <div className="flex bg-[var(--bg-base)] rounded-md p-0.5 border border-[var(--border-subtle-alt)] scale-90 origin-right">
          <button
            className={`px-4 py-1.5 rounded-sm font-bold text-xs transition-colors ${category === "OPERATIONAL" ? "bg-[#e67e00] text-black" : "text-[var(--text-muted-alt)] hover:text-[var(--text-muted)]"}`}
            onClick={() => setCategory("OPERATIONAL")}
          >
            Operational
          </button>
          <button
            className={`px-4 py-1.5 rounded-sm font-bold text-xs transition-colors ${category === "NON_OPERATIONAL" ? "bg-[#e67e00] text-black" : "text-[var(--text-muted-alt)] hover:text-[var(--text-muted)]"}`}
            onClick={() => setCategory("NON_OPERATIONAL")}
          >
            Non-Operational
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto p-6">
        {/* TAB: MANDI MASTER */}
        {activeTab === "mandi_master" && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)]">
              <div className="flex justify-between items-center mb-6 w-full">
                <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-main)]">
                  <Users className="text-[#e67e00]" /> Mandi Master
                </h2>
                {canAddMandi ? (
                  <button
                    onClick={() =>
                      setAddMandiModal({
                        isOpen: true,
                        id: "",
                        name: "",
                        isActive: true,
                      })
                    }
                    className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-orange-500/20"
                  >
                    + Add Mandi
                  </button>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">
                    Only Admin can add Mandis
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-[var(--bg-base)] p-6">
              <table className="w-full border-collapse text-[var(--text-muted)] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] uppercase text-[var(--text-muted-alt)] text-left">
                    <th className="p-3">Name</th>
                    <th className="p-3">Status</th>
                    {(canEditMandi || canDeleteMandi) && (
                      <th className="p-3">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {mandis.map((m: any) => (
                    <tr
                      key={m.id}
                      className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-panel)]"
                    >
                      <td className="p-3 font-medium text-[var(--text-main)]">
                        {m.name}
                      </td>
                      <td className="p-3">
                        {canEditMandi ? (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={m.isActive}
                              onChange={() => handleToggleMandiStatus(m)}
                            />
                            <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                          </label>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              m.isActive
                                ? "bg-green-900/50 text-green-400"
                                : "bg-gray-700/50 text-gray-400"
                            }`}
                          >
                            {m.isActive ? "Active" : "Inactive"}
                          </span>
                        )}
                      </td>
                      {(canEditMandi || canDeleteMandi) && (
                        <td className="p-3 flex gap-2">
                          {canEditMandi && (
                            <button
                              onClick={() =>
                                setAddMandiModal({
                                  isOpen: true,
                                  id: m.id,
                                  name: m.name,
                                  isActive: m.isActive,
                                })
                              }
                              className="text-amber-500 hover:text-amber-400 p-1 bg-amber-500/10 rounded"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                          {canDeleteMandi && (
                            <button
                              onClick={() => handleDeleteMandi(m.id)}
                              className="text-red-500 hover:text-red-400 p-1 bg-red-500/10 rounded"
                            >
                              <Trash size={14} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 1: SUPPLIER MASTER */}
        {activeTab === "supplier_master" && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-main)]">
                  <Users className="text-[#e67e00]" /> Arthiya Master
                  {activePlant && (
                    <span className="text-sm font-medium text-[var(--text-muted)]">
                      ({activePlant.name})
                    </span>
                  )}
                </h2>
                {canAddSupplier && (
                  <button
                    onClick={() =>
                      setAddSupplierModal({
                        isOpen: true,
                        name: "",
                        firmNames: "",
                        mandi: "",
                        contact: "",
                        plantId: activePlant?.id || "",
                        biometricData: "",
                      })
                    }
                    className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-orange-500/20"
                  >
                    + {isSupervisor ? "Add Arthiya (Admin Approval)" : "Add Arthiya"}
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-[var(--bg-base)] p-6">
              <table className="w-full border-collapse text-[var(--text-muted)] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] uppercase text-[var(--text-muted-alt)] text-left">
                    <th className="p-3">Name</th>
                    <th className="p-3">Mill</th>
                    <th className="p-3">Firm Names</th>
                    <th className="p-3">Mandi</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">Status</th>
                    {canEditSupplier && (
                      <th className="p-3 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)]"
                    >
                      <td className="p-3 font-medium text-[var(--text-main)]">
                        {s.name}
                      </td>
                      <td className="p-3 text-[var(--text-main)]">
                        {s.plant?.name || activePlant?.name || "—"}
                      </td>
                      <td className="p-3">
                        {s.firmNames && s.firmNames.length > 0
                          ? s.firmNames.join(", ")
                          : "-"}
                      </td>
                      <td className="p-3">{s.mandi || "-"}</td>
                      <td className="p-3">{s.contact || "-"}</td>
                      <td className="p-3">
                        {s.status === "PENDING_APPROVAL" ? (
                          <span className="px-2 py-1 rounded bg-yellow-900/50 text-yellow-400 text-xs font-bold">
                            Pending Admin
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded bg-green-900/50 text-green-400 text-xs font-bold">
                            Active
                          </span>
                        )}
                      </td>
                      {canEditSupplier && (
                        <td className="p-3 text-right">
                          {s.status === "PENDING_APPROVAL" && (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleApproveSupplier(s.id)}
                                className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded"
                                title="Approve"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectSupplier(s.id)}
                                className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded"
                                title="Decline"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {suppliers.length === 0 && (
                    <tr>
                      <td
                        colSpan={canEditSupplier ? 7 : 6}
                        className="p-6 text-center text-[var(--text-muted-alt)]"
                      >
                        No Arthiya found for this mill. Add one for the selected
                        mill.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: BOLI RECORD (Feedback 32) */}
        {activeTab === "paddy_purchase" && (
          <BoliRecordPanel
            suppliers={activeSuppliers}
            fetchSuppliers={fetchSuppliers}
            onOpenEstimate={openEstimatePurchase}
            onEditEstimate={openEditEstimate}
            refreshKey={boliRecordRefreshKey}
          />
        )}

        {/* View Bolis Modal */}
        {viewBolisModal.isOpen && viewBolisModal.soda && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-panel)] rounded-xl w-full max-w-4xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-main)]">
                    Bolis Breakdown & Completion
                  </h3>
                  <p className="text-xs text-[var(--text-muted-alt)] mt-1">
                    {viewBolisModal.partyMandi} -{" "}
                    {new Date(viewBolisModal.date).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setViewBolisModal({ isOpen: false, soda: null })
                  }
                  className="text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 overflow-auto max-h-[70vh]">
                <BoliCompletionTable
                  sodaPending={[viewBolisModal.soda]}
                  supplierId={viewBolisModal.soda.supplierId}
                  boliInputs={boliInputs}
                  setBoliInputs={setBoliInputs}
                  onSodaComplete={fetchSodaPending}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PADDY INWARD (GOODS RECEIPT) */}
        {activeTab === "paddy_inward" && (
          <div className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-2xl flex flex-col h-full overflow-y-auto">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between gap-3 mb-3 border-b border-[var(--border-subtle-alt)] pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[#e67e00] text-[10px] bg-[#e67e00]/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                  {activePlant?.name || "MILL"}
                </span>
                <h1 className="text-base font-bold text-[var(--text-muted)] shrink-0">
                  Paddy Inward (Goods Receipt)
                </h1>
                {inwardFormData.id && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 shrink-0">
                    Editing Draft
                  </span>
                )}
                <p className="text-[var(--text-muted-alt)] text-xs border-l border-[var(--border-subtle)] pl-3 hidden lg:block truncate">
                  Procurement &gt; Paddy Inward
                </p>
              </div>
              <button
                type="button"
                onClick={() => openDraftModal()}
                className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm shadow-md"
              >
                <FileText size={16} />
                Saved Drafts / Hold
                <span className="bg-black/20 px-1.5 py-0.5 rounded text-xs">
                  {draftInwards.length}
                </span>
              </button>
            </div>

            {(!!inwardFormData.informBaujiBagsLess ||
              !!inwardFormData.bagsRecLessThanAgencyGp ||
              !!inwardFormData.informBaujiExcessWeight) && (
              <div className="mb-4 flex flex-wrap gap-2 items-center rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Flagged entry
                </span>
                {(!!inwardFormData.informBaujiBagsLess ||
                  !!inwardFormData.bagsRecLessThanAgencyGp) && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500 text-black">
                    Sec 5 · Lower Bag Count Consideration
                  </span>
                )}
                {!!inwardFormData.informBaujiExcessWeight && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-500 text-white">
                    Sec 6 · Excess Weight Consideration
                  </span>
                )}
              </div>
            )}

            <div
              data-paddy-inward-form
              className="grid grid-cols-12 gap-6 flex-1"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const target = e.target as HTMLElement;
                if (
                  target.tagName === "TEXTAREA" ||
                  target.tagName === "BUTTON"
                )
                  return;
                e.preventDefault();
                const root = e.currentTarget as HTMLElement;
                const focusable = Array.from(
                  root.querySelectorAll<HTMLElement>(
                    'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select:not([disabled]), textarea:not([disabled])',
                  ),
                ).filter((el) => el.offsetParent !== null);
                const idx = focusable.indexOf(target);
                if (idx >= 0 && idx < focusable.length - 1)
                  focusable[idx + 1].focus();
              }}
            >
              {/* LEFT COLUMN */}
              <div className="col-span-12 xl:col-span-7 space-y-6">
                {/* 1. Basic Information */}
                <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-visible relative z-10">
                  <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm flex flex-wrap items-center justify-between gap-2">
                    <span>1. Basic Information</span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        autoUpdateDateTime
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                      title={
                        autoUpdateDateTime
                          ? "Auto Update ON — Date & Time In lock; Time Out stamps on fingerprint. Change in Plant Settings."
                          : "Auto Update OFF — Manual Date/Time allowed for this mill. Change in Plant Settings."
                      }
                    >
                      Auto Update Date &amp; Time:{" "}
                      {autoUpdateDateTime ? "ON" : "OFF"}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4 text-sm">
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        GP No. <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="gpNo"
                        value={inwardFormData.gpNo}
                        onChange={handleInwardChange}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                        placeholder="1-1000/Sept/25"
                      />
                      {inwardErrors.gpNo && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.gpNo}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-[11px] mb-1 truncate">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={inwardFormData.date}
                        onChange={handleInwardChange}
                        disabled={!canManualDateTime}
                        max={isSupervisor ? todayLocal : undefined}
                        title={
                          isSupervisor
                            ? canManualDateTime
                              ? "Backdate allowed (Auto Update OFF). Future dates blocked."
                              : "Auto Update ON — date locked to today"
                            : undefined
                        }
                        className={`w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none ${canManualDateTime ? "focus:border-[#e67e00]" : "opacity-70 cursor-not-allowed"}`}
                      />
                      {inwardErrors.date && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.date}
                        </span>
                      )}
                      {isSupervisor && canManualDateTime && (
                        <p className="text-[10px] text-amber-400 mt-1">
                          Auto Update OFF — you may backdate; future dates are
                          not allowed.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Time In <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        name="timeIn"
                        value={inwardFormData.timeIn}
                        onChange={handleInwardChange}
                        disabled={!canManualDateTime}
                        className={`w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none ${canManualDateTime ? "focus:border-[#e67e00]" : "opacity-70 cursor-not-allowed"}`}
                      />
                      {inwardErrors.timeIn && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.timeIn}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Truck No. <span className="text-red-500">*</span>
                      </label>
                      <Combobox
                        name="truckNo"
                        value={inwardFormData.truckNo}
                        onChange={handleInwardChange}
                        onBlur={handleMasterDataBlur}
                        options={trucks}
                        className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                        placeholder="Select or enter truck no"
                      />
                      {inwardErrors.truckNo && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.truckNo}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1 flex items-center justify-between">
                        <span>
                          New Truck Reading{" "}
                          <span className="text-red-500">*</span>
                        </span>
                        <label
                          className="flex items-center gap-1 text-[10px] text-red-400 cursor-pointer"
                          title="Notify admin that meter is not working"
                        >
                          <input
                            type="checkbox"
                            name="meterNotWorking"
                            checked={inwardFormData.meterNotWorking || false}
                            onChange={(e) => {
                              setInwardFormData((p: any) => ({
                                ...p,
                                meterNotWorking: e.target.checked,
                              }));
                            }}
                            className="accent-red-500"
                          />
                          Meter Not Working
                        </label>
                      </label>
                      <input
                        type="number"
                        name="newTruckReading"
                        value={inwardFormData.newTruckReading}
                        onChange={handleInwardChange}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                        placeholder="0"
                      />
                      {inwardErrors.newTruckReading && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.newTruckReading}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Party / Supplier Name{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <Combobox
                        name="supplierId"
                        value={inwardFormData.supplierId}
                        onChange={handleInwardChange}
                        options={activeSuppliers}
                        valueKey="id"
                        selectOnly
                        placeholder="Select Supplier"
                        className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                      />
                      {inwardErrors.supplierId && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.supplierId}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Mandi Parchi No. <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="mandiParchiNo"
                        value={inwardFormData.mandiParchiNo}
                        onChange={handleInwardChange}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                        placeholder="PRC-12345"
                      />
                      {inwardErrors.mandiParchiNo && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.mandiParchiNo}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="block text-[var(--text-muted-alt)] text-xs">
                          Mandi e-GP / Bill No.{" "}
                          {!inwardFormData.egpLate && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!inwardFormData.egpLate}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setInwardFormData((prev: any) => ({
                                ...prev,
                                egpLate: on,
                              }));
                              if (on) {
                                setInwardErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.mandiEgpNo;
                                  return next;
                                });
                              }
                            }}
                            className="accent-[#e67e00] w-4 h-4"
                          />
                          e-GP Late
                        </label>
                      </div>
                      <input
                        type="text"
                        name="mandiEgpNo"
                        value={inwardFormData.mandiEgpNo}
                        onChange={handleInwardChange}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                        placeholder={
                          inwardFormData.egpLate
                            ? "Not required when e-GP Late"
                            : "EGP-458796"
                        }
                      />
                      {inwardErrors.mandiEgpNo && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.mandiEgpNo}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Mandi Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="mandiType"
                        value={inwardFormData.mandiType}
                        onChange={handleInwardChange}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                      >
                        <option value="">Select Mandi Type</option>
                        <option value="Control">Control</option>
                        <option value="Boli">Boli</option>
                      </select>
                      {inwardErrors.mandiType && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.mandiType}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        RST No. <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="rstNo"
                        value={inwardFormData.rstNo}
                        onChange={handleInwardChange}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                        placeholder="RST-7485963"
                      />
                      {inwardErrors.rstNo && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.rstNo}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1 flex items-center gap-2">
                        Supervisor <span className="text-red-500">*</span>
                      </label>
                      <Combobox
                        name="pahunchPersonName"
                        value={inwardFormData.pahunchPersonName}
                        onChange={handleInwardChange}
                        options={pahunchs}
                        selectOnly
                        listMaxHeightClass="max-h-48"
                        className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                        placeholder="Select Supervisor"
                      />
                      {inwardErrors.pahunchPersonName && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.pahunchPersonName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Quality Details */}
                <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
                  <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">
                    2. Quality Details
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Moisture (%) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        name="moisture"
                        value={inwardFormData.moisture}
                        onChange={handleInwardChange}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                        max="100"
                        step="0.01"
                      />
                      {inwardErrors.moisture && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.moisture}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="col-span-1 sm:col-span-1">
                        <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                          Safai <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-4 mt-2">
                          <label className="flex items-center gap-1 text-[var(--text-main)]">
                            <input
                              type="radio"
                              name="safai"
                              value="Good"
                              checked={inwardFormData.safai === "Good"}
                              onChange={handleInwardChange}
                              className="accent-blue-500"
                            />{" "}
                            Good
                          </label>
                          <label className="flex items-center gap-1 text-[var(--text-main)]">
                            <input
                              type="radio"
                              name="safai"
                              value="Patal"
                              checked={inwardFormData.safai === "Patal"}
                              onChange={handleInwardChange}
                              className="accent-blue-500"
                            />{" "}
                            Patal
                          </label>
                        </div>
                        {inwardErrors.safai && (
                          <span className="text-red-500 text-[10px] mt-1 block">
                            {inwardErrors.safai}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        If Not As Per Standards (Mandi Intimation given or not){" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="flex flex-wrap items-center gap-4">
                          <label className="flex items-center gap-1 text-[var(--text-main)]">
                            <input
                              type="radio"
                              name="mandiIntimation"
                              value="N.A."
                              checked={
                                inwardFormData.mandiIntimation === "N.A."
                              }
                              onChange={handleInwardChange}
                              className="accent-blue-500"
                            />{" "}
                            N.A.
                          </label>
                          <label className="flex items-center gap-1 text-red-400 font-medium text-xs">
                            <input
                              type="radio"
                              name="mandiIntimation"
                              value="Yes"
                              checked={inwardFormData.mandiIntimation === "Yes"}
                              onChange={handleInwardChange}
                              className="accent-red-500"
                            />{" "}
                            Incoming quality/standard is not as per requirement
                          </label>
                        </div>
                        {inwardErrors.mandiIntimation && (
                          <span className="text-red-500 text-[10px] mt-1 block">
                            {inwardErrors.mandiIntimation}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Remarks <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="remarks"
                        value={inwardFormData.remarks}
                        onChange={handleInwardChange}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                        rows={2}
                      ></textarea>
                      {inwardErrors.remarks && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.remarks}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Vehicle Verification */}
                <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
                  <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">
                    3. Vehicle Verification
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Bhari (Loaded) Video Upload{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-4 py-2">
                        <label className="flex items-center gap-1 text-[var(--text-main)]">
                          <input
                            type="checkbox"
                            name="bhariVideoUpload"
                            checked={inwardFormData.bhariVideoUpload === "Yes"}
                            onChange={(e) =>
                              handleInwardChange({
                                target: {
                                  name: "bhariVideoUpload",
                                  value: e.target.checked ? "Yes" : "",
                                },
                              } as any)
                            }
                            className="accent-blue-500"
                          />{" "}
                          Yes Done
                        </label>
                      </div>
                      {inwardErrors.bhariVideoUpload && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.bhariVideoUpload}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Unloading Management */}
                <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-visible relative z-[5]">
                  <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">
                    4. Unloading Management
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4 text-sm">
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Allocation Type <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2 min-w-0">
                        <select
                          name="allocationType"
                          value={inwardFormData.allocationType}
                          onChange={(e) => {
                            handleInwardChange(e);
                            if (
                              e.target.value === "Hoodi" &&
                              inwardFormData.hoodiUpload === "N.A."
                            ) {
                              setInwardFormData((prev: any) => ({
                                ...prev,
                                allocationType: "Hoodi",
                                hoodiUpload: "",
                              }));
                            }
                          }}
                          className="w-full min-w-[9.5rem] bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                        >
                          <option value="" disabled>
                            Select Allocation Type
                          </option>
                          <option value="Hoodi">Hoodi</option>
                          <option value="Stacking">Stacking</option>
                        </select>
                        {inwardFormData.allocationType === "Hoodi" && (
                          <label className="flex items-center gap-1 text-[10px] text-gray-500 font-medium whitespace-nowrap whitespace-nowrap cursor-pointer">
                            <input
                              type="checkbox"
                              name="informBauji"
                              checked={inwardFormData.informBauji || false}
                              onChange={(e) =>
                                setInwardFormData((prev: any) => ({
                                  ...prev,
                                  informBauji: e.target.checked,
                                }))
                              }
                              className="accent-[#e67e00]"
                            />
                            Inform Bauji
                          </label>
                        )}
                      </div>
                      {inwardErrors.allocationType && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.allocationType}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Upload @ Hoodi Reg.{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-4 mt-2">
                        {inwardFormData.allocationType !== "Hoodi" && (
                          <label className="flex items-center gap-1 text-[var(--text-main)]">
                            <input
                              type="radio"
                              name="hoodiUpload"
                              value="N.A."
                              checked={inwardFormData.hoodiUpload === "N.A."}
                              onClick={() => {
                                if (inwardFormData.hoodiUpload === "N.A.") {
                                  setInwardFormData((prev: any) => ({
                                    ...prev,
                                    hoodiUpload: "",
                                  }));
                                }
                              }}
                              onChange={handleInwardChange}
                              className="accent-blue-500"
                            />{" "}
                            N.A.
                          </label>
                        )}
                        <label className="flex items-center gap-1 text-[var(--text-main)]">
                          <input
                            type="radio"
                            name="hoodiUpload"
                            value="Yes"
                            checked={inwardFormData.hoodiUpload === "Yes"}
                            onClick={() => {
                              // Tap again to deselect (esp. when Hoodi is selected)
                              if (inwardFormData.hoodiUpload === "Yes") {
                                setInwardFormData((prev: any) => ({
                                  ...prev,
                                  hoodiUpload: "",
                                }));
                              }
                            }}
                            onChange={handleInwardChange}
                            className="accent-blue-500"
                          />{" "}
                          Yes
                        </label>
                      </div>
                      {inwardErrors.hoodiUpload && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.hoodiUpload}
                        </span>
                      )}
                    </div>

                    {/* Row 1: Main Unloader */}
                    <div className="col-span-1 sm:col-span-2 2xl:col-span-4 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                          Allocate Main Unloader{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <Combobox
                          name="allocateUnloader"
                          value={inwardFormData.allocateUnloader}
                          onChange={async (e: any) => {
                            if (inwardFormData.isHold) return;
                            handleInwardChange(e);
                            const name = e?.target?.value;
                            if (!name || !activePlant?.id) return;
                            try {
                              const res = await api.get(
                                `/api/procurement/unloader-truck-count`,
                                {
                                  params: {
                                    plantId: activePlant.id,
                                    unloaderName: name,
                                    kind: "main",
                                    date: inwardFormData.date || undefined,
                                    excludeBatchId:
                                      inwardFormData.id || undefined,
                                  },
                                },
                              );
                              setInwardFormData((prev: any) => ({
                                ...prev,
                                allocateUnloader: name,
                                mainUnloaderTruckCount: String(
                                  res.data?.nextCount ?? "",
                                ),
                              }));
                            } catch {
                              /* keep manual */
                            }
                          }}
                          options={
                            unloaderOptions.length > 0
                              ? unloaderOptions
                              : [
                                  ...staff.filter((s: any) =>
                                    /UNLOADER/i.test(s.role || ""),
                                  ),
                                  ...staff.filter(
                                    (s: any) => !/UNLOADER/i.test(s.role || ""),
                                  ),
                                  ...labours,
                                ]
                          }
                          selectOnly
                          listMaxHeightClass="max-h-48"
                          className={`bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00] ${
                            inwardFormData.isHold
                              ? "opacity-60 pointer-events-none"
                              : ""
                          }`}
                          placeholder="Select Unloader"
                        />
                        {inwardFormData.isHold && (
                          <span className="text-amber-400 text-[10px] mt-1 block">
                            Unloader locked while on Hold
                          </span>
                        )}
                        {inwardErrors.allocateUnloader && (
                          <span className="text-red-500 text-[10px] mt-1 block">
                            {inwardErrors.allocateUnloader}
                          </span>
                        )}
                        {unloaderOptions.length === 0 &&
                          staff.length === 0 &&
                          labours.length === 0 && (
                            <span className="text-[10px] text-amber-500 mt-1 block">
                              No unloaders found. Add under Staff Management →
                              UNLOADER, or create a plant user.
                            </span>
                          )}
                      </div>
                      <div>
                        <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                          Unloader Initials
                        </label>
                        <input
                          type="text"
                          name="unloaderInitials"
                          maxLength={6}
                          value={inwardFormData.unloaderInitials || ""}
                          onChange={handleInwardChange}
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00] uppercase"
                          placeholder="e.g. RK"
                        />
                      </div>
                      <div>
                        <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                          Main Unloader Truck Count
                          <span className="block text-[10px] font-normal opacity-80">
                            Preview only — credited on Confirm (Net Weight
                            complete), not during unload
                          </span>
                        </label>
                        <input
                          type="number"
                          name="mainUnloaderTruckCount"
                          value={inwardFormData.mainUnloaderTruckCount}
                          readOnly
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none opacity-90"
                          placeholder="After confirm"
                          title="Serial is generated only when Net Weight Paddy Inward is submitted"
                        />
                        {inwardErrors.mainUnloaderTruckCount && (
                          <span className="text-red-500 text-[10px] mt-1 block">
                            {inwardErrors.mainUnloaderTruckCount}
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="block text-[var(--text-muted-alt)] text-xs mb-1 flex items-center justify-between">
                          <span>
                            Main Stack No.{" "}
                            <span className="text-red-500">*</span>
                          </span>{" "}
                          <ScanBarcode size={14} className="text-[#e67e00]" />
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              name="stackNo"
                              value={inwardFormData.stackNo}
                              onChange={handleInwardChange}
                              className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 pl-8 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                              placeholder="Scan / select stack..."
                            />
                            <ScanBarcode
                              size={16}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={openStackModal}
                            className="px-3 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-[var(--text-main)] hover:bg-[var(--glass-bg)]"
                            title="Select stack drawing (current mill)"
                          >
                            <Layers size={16} />
                          </button>
                        </div>
                        {inwardErrors.stackNo && (
                          <span className="text-red-500 text-[10px] mt-1 block">
                            {inwardErrors.stackNo}
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                          Bags in Main Stack (Unloader 1){" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="bagsInMainStack"
                          value={inwardFormData.bagsInMainStack}
                          onChange={handleInwardChange}
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                          placeholder="0"
                        />
                        {inwardErrors.bagsInMainStack && (
                          <span className="text-red-500 text-[10px] mt-1 block">
                            {inwardErrors.bagsInMainStack}
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                          Net weight of Main Stack
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={unloadPointWeight(
                            inwardFormData,
                            parseFloat(String(inwardFormData.bagsInMainStack || "")) || 0,
                          )}
                          className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-amber-400 font-mono outline-none opacity-90"
                          placeholder="Auto (bags × avg wt)"
                          title="Bags × average bag weight (net ÷ total bags, 4 decimals), stored to 2 decimals"
                        />
                      </div>
                    </div>

                    {/* Row 2: Part Unloader / No Part Stack */}
                    <div className="col-span-1 sm:col-span-2 2xl:col-span-4">
                      <label className="inline-flex items-center gap-2 text-sm text-[var(--text-main)] mb-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!inwardFormData.noPartStack}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setInwardFormData((prev: any) => ({
                              ...prev,
                              noPartStack: on,
                              ...(on
                                ? {
                                    partUnloaderName: "",
                                    partUnloaderTruckCount: "",
                                    secondPartStackNo: "",
                                    bagsInSecondPartStack: "",
                                    partIsHoodi: false,
                                  }
                                : {}),
                            }));
                            if (on) {
                              setInwardErrors((prev) => {
                                const next = { ...prev };
                                delete next.secondPartStackNo;
                                delete next.bagsInSecondPartStack;
                                delete next.partUnloaderName;
                                delete next.partUnloaderTruckCount;
                                return next;
                              });
                            }
                          }}
                          className="accent-[#e67e00] w-4 h-4"
                        />
                        <span className="font-medium">No Part Stack</span>
                        <span className="text-[10px] text-[var(--text-muted-alt)]">
                          (skip part stack — no mandatory error on submit)
                        </span>
                      </label>
                    </div>
                    {!inwardFormData.noPartStack && (
                      <div className="col-span-1 sm:col-span-2 2xl:col-span-4 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                            Part Unloader (Unloader 2){" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <Combobox
                            name="partUnloaderName"
                            value={inwardFormData.partUnloaderName || ""}
                            onChange={async (e: any) => {
                              if (inwardFormData.isHold) return;
                              handleInwardChange(e);
                              const name = e?.target?.value;
                              if (!name || !activePlant?.id) return;
                              try {
                                const res = await api.get(
                                  `/api/procurement/unloader-truck-count`,
                                  {
                                    params: {
                                      plantId: activePlant.id,
                                      unloaderName: name,
                                      kind: "part",
                                      date: inwardFormData.date || undefined,
                                      excludeBatchId:
                                        inwardFormData.id || undefined,
                                    },
                                  },
                                );
                                setInwardFormData((prev: any) => ({
                                  ...prev,
                                  partUnloaderName: name,
                                  partUnloaderTruckCount: String(
                                    res.data?.nextCount ?? "",
                                  ),
                                }));
                              } catch {
                                /* keep manual */
                              }
                            }}
                            options={
                              unloaderOptions.length > 0
                                ? unloaderOptions
                                : [...staff, ...labours]
                            }
                            selectOnly
                            listMaxHeightClass="max-h-48"
                            className={`bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00] ${
                              inwardFormData.isHold
                                ? "opacity-60 pointer-events-none"
                                : ""
                            }`}
                            placeholder="Select Part Unloader"
                          />
                          {inwardErrors.partUnloaderName && (
                            <span className="text-red-500 text-[10px] mt-1 block">
                              {inwardErrors.partUnloaderName}
                            </span>
                          )}
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                            Part Unloader Truck Count
                            <span className="block text-[10px] font-normal opacity-80">
                              Preview only — credited on Confirm, not during
                              unload
                            </span>
                          </label>
                          <input
                            type="number"
                            name="partUnloaderTruckCount"
                            value={inwardFormData.partUnloaderTruckCount}
                            readOnly
                            className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none opacity-90"
                            placeholder="After confirm"
                            title="Serial credited only when Net Weight Paddy Inward is submitted"
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                            Part Stack No.{" "}
                            {!inwardFormData.partIsHoodi && (
                            <span className="text-red-500">*</span>
                            )}
                          </label>
                          <div className="flex items-center gap-2">
                          <input
                            type="text"
                            name="secondPartStackNo"
                              value={
                                inwardFormData.partIsHoodi
                                  ? ""
                                  : inwardFormData.secondPartStackNo
                              }
                            onChange={handleInwardChange}
                              disabled={!!inwardFormData.partIsHoodi}
                              className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00] disabled:opacity-50"
                            placeholder="Stack No."
                          />
                            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-main)] whitespace-nowrap cursor-pointer shrink-0 px-2 py-2 rounded border border-[var(--border-subtle)]">
                              <input
                                type="checkbox"
                                checked={!!inwardFormData.partIsHoodi}
                                onChange={(e) => {
                                  const on = e.target.checked;
                                  setInwardFormData((prev: any) => ({
                                    ...prev,
                                    partIsHoodi: on,
                                    ...(on ? { secondPartStackNo: "" } : {}),
                                  }));
                                  if (on) {
                                    setInwardErrors((prev) => {
                                      const next = { ...prev };
                                      delete next.secondPartStackNo;
                                      return next;
                                    });
                                  }
                                }}
                                className="accent-[#e67e00] w-4 h-4"
                              />
                              Hoodi
                            </label>
                          </div>
                          {inwardErrors.secondPartStackNo && (
                            <span className="text-red-500 text-[10px] mt-1 block">
                              {inwardErrors.secondPartStackNo}
                            </span>
                          )}
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                            Bags in Part Stack (Unloader 2){" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            name="bagsInSecondPartStack"
                            value={inwardFormData.bagsInSecondPartStack}
                            onChange={handleInwardChange}
                            className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                            placeholder="0"
                          />
                          {inwardErrors.bagsInSecondPartStack && (
                            <span className="text-red-500 text-[10px] mt-1 block">
                              {inwardErrors.bagsInSecondPartStack}
                            </span>
                          )}
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                            Net weight of Part Stack
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={unloadPointWeight(
                              inwardFormData,
                              parseFloat(String(inwardFormData.bagsInSecondPartStack || "")) || 0,
                            )}
                            className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-amber-400 font-mono outline-none opacity-90"
                            placeholder="Auto (bags × avg wt)"
                            title="Bags × average bag weight (net ÷ total bags, 4 decimals), stored to 2 decimals"
                          />
                          <p className="text-[10px] text-[var(--text-muted-alt)] mt-0.5">
                            Average bag weight to 4 decimals, then × bags, shown to 2 decimals
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="col-span-1 sm:col-span-2 2xl:col-span-4">
                      {!inwardFormData.showThirdPartStack ? (
                        <button
                          type="button"
                          onClick={() =>
                            setInwardFormData((prev: any) => ({
                              ...prev,
                              showThirdPartStack: true,
                            }))
                          }
                          className="text-xs font-bold text-[#e67e00] border border-[#e67e00]/40 rounded px-3 py-1.5 hover:bg-[#e67e00]/10"
                        >
                          Add Part Stack
                        </button>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                          <div className="sm:col-span-2 2xl:col-span-4 flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                              3rd Part Stack
                            </span>
                            <button
                              type="button"
                              className="text-[10px] text-[var(--text-muted-alt)] underline"
                              onClick={() =>
                                setInwardFormData((prev: any) => ({
                                  ...prev,
                                  showThirdPartStack: false,
                                  thirdPartUnloaderName: "",
                                  thirdPartUnloaderTruckCount: "",
                                  thirdPartStackNo: "",
                                  bagsInThirdPartStack: "",
                                  thirdPartIsHoodi: false,
                                }))
                              }
                            >
                              Remove
                            </button>
                          </div>
                          <div>
                            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                              Unloader 3 <span className="text-red-500">*</span>
                            </label>
                            <Combobox
                              name="thirdPartUnloaderName"
                              value={inwardFormData.thirdPartUnloaderName || ""}
                              onChange={async (e: any) => {
                                if (inwardFormData.isHold) return;
                                handleInwardChange(e);
                                const name = e?.target?.value;
                                if (!name || !activePlant?.id) return;
                                try {
                                  const res = await api.get(
                                    `/api/procurement/unloader-truck-count`,
                                    {
                                      params: {
                                        plantId: activePlant.id,
                                        unloaderName: name,
                                        kind: "third",
                                        date: inwardFormData.date || undefined,
                                        excludeBatchId:
                                          inwardFormData.id || undefined,
                                      },
                                    },
                                  );
                                  setInwardFormData((prev: any) => ({
                                    ...prev,
                                    thirdPartUnloaderName: name,
                                    thirdPartUnloaderTruckCount: String(
                                      res.data?.nextCount ?? "",
                                    ),
                                  }));
                                } catch {
                                  /* keep manual */
                                }
                              }}
                              options={
                                unloaderOptions.length > 0
                                  ? unloaderOptions
                                  : [
                                      ...staff.filter((s: any) =>
                                        /UNLOADER/i.test(s.role || ""),
                                      ),
                                      ...staff.filter(
                                        (s: any) =>
                                          !/UNLOADER/i.test(s.role || ""),
                                      ),
                                      ...labours,
                                    ]
                              }
                              selectOnly
                              listMaxHeightClass="max-h-48"
                              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                              placeholder="Select Unloader"
                            />
                            {inwardErrors.thirdPartUnloaderName && (
                              <span className="text-red-500 text-[10px] mt-1 block">
                                {inwardErrors.thirdPartUnloaderName}
                              </span>
                            )}
                          </div>
                          <div>
                            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                              Truck count
                            </label>
                            <input
                              type="number"
                              name="thirdPartUnloaderTruckCount"
                              value={inwardFormData.thirdPartUnloaderTruckCount || ""}
                              readOnly
                              className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none opacity-90"
                              placeholder="After confirm"
                              title="Serial credited only when Net Weight Paddy Inward is submitted"
                            />
                          </div>
                          <div>
                            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                              Part Stack No.{" "}
                              {!inwardFormData.thirdPartIsHoodi && (
                                <span className="text-red-500">*</span>
                              )}
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                name="thirdPartStackNo"
                                value={
                                  inwardFormData.thirdPartIsHoodi
                                    ? ""
                                    : inwardFormData.thirdPartStackNo || ""
                                }
                                onChange={handleInwardChange}
                                disabled={!!inwardFormData.thirdPartIsHoodi}
                                className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00] disabled:opacity-50"
                                placeholder="Stack No."
                              />
                              <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-main)] whitespace-nowrap cursor-pointer shrink-0 px-2 py-2 rounded border border-[var(--border-subtle)]">
                                <input
                                  type="checkbox"
                                  checked={!!inwardFormData.thirdPartIsHoodi}
                                  onChange={(e) =>
                                    setInwardFormData((prev: any) => ({
                                      ...prev,
                                      thirdPartIsHoodi: e.target.checked,
                                      ...(e.target.checked
                                        ? { thirdPartStackNo: "" }
                                        : {}),
                                    }))
                                  }
                                  className="accent-[#e67e00] w-4 h-4"
                                />
                                Hoodi
                              </label>
                            </div>
                            {inwardErrors.thirdPartStackNo && (
                              <span className="text-red-500 text-[10px] mt-1 block">
                                {inwardErrors.thirdPartStackNo}
                              </span>
                            )}
                          </div>
                          <div>
                            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                              Bags in Part Stack (Unloader 3){" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              name="bagsInThirdPartStack"
                              value={inwardFormData.bagsInThirdPartStack || ""}
                              onChange={handleInwardChange}
                              className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                              placeholder="0"
                            />
                            {inwardErrors.bagsInThirdPartStack && (
                              <span className="text-red-500 text-[10px] mt-1 block">
                                {inwardErrors.bagsInThirdPartStack}
                              </span>
                            )}
                          </div>
                          <div>
                            <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                              Net weight of 3rd Part Stack
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={unloadPointWeight(
                                inwardFormData,
                                parseFloat(String(inwardFormData.bagsInThirdPartStack || "")) || 0,
                              )}
                              className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-amber-400 font-mono outline-none opacity-90"
                              placeholder="Auto (bags × avg wt)"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Unloading Start Time{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        name="unloadingStartTime"
                        value={inwardFormData.unloadingStartTime || ""}
                        onChange={handleInwardChange}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                      />
                      <p className="text-[10px] text-[var(--text-muted-alt)] mt-0.5">
                        Sequence: In → Start (min +5m) → Finish (min +30m) → Out
                        (min +5m)
                      </p>
                      {inwardErrors.unloadingStartTime && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.unloadingStartTime}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Unloading Finish Time{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        name="unloadingFinishTime"
                        value={inwardFormData.unloadingFinishTime || ""}
                        onChange={handleInwardChange}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                      />
                      <p className="text-[10px] text-[var(--text-muted-alt)] mt-0.5">
                        Must not be before In Time or Unload Start
                      </p>
                      {inwardErrors.unloadingFinishTime && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.unloadingFinishTime}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Labour Name <span className="text-red-500">*</span>
                      </label>
                      <Combobox
                        name="labour"
                        value={inwardFormData.labour}
                        onChange={handleInwardChange}
                        onBlur={handleMasterDataBlur}
                        options={labours}
                        valueKey="name"
                        listMaxHeightClass="max-h-48"
                        className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                        placeholder="Select labour name"
                      />
                      {labours.length === 0 && (
                        <p className="text-[10px] text-amber-500 mt-1">
                          No labour in master — add via Staff Management → Add
                          Staff → Labour
                        </p>
                      )}
                      {inwardErrors.labour && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.labour}
                        </span>
                      )}
                    </div>

                    {/* Feedback 39 — Hold (frees unloader for another truck; vehicle stays blocked) */}
                    <div className="col-span-1 sm:col-span-2 2xl:col-span-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                      <label className="flex items-start gap-2 text-sm text-[var(--text-main)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!inwardFormData.isHold}
                          disabled={!!inwardFormData.isHold || !canSavePaddyInward}
                          onChange={async (e) => {
                            if (!e.target.checked) return; // permanent — no deselection
                            const ok = window.confirm(
                              "Place this truck on Hold?\n\n" +
                                "• Entry will be saved under Pending Draft\n" +
                                "• Unloader can start another truck\n" +
                                "• This vehicle cannot get a duplicate entry while on Hold\n" +
                                "• Hold cannot be unchecked — resume from Saved Drafts to complete",
                            );
                            if (!ok) return;
                            const reason = window.prompt(
                              "Enter Hold reason (required):",
                              inwardFormData.holdReason || "",
                            );
                            if (reason == null) return; // cancelled prompt
                            if (!String(reason).trim()) {
                              useUiStore
                                .getState()
                                .addToast("Hold reason is required", "error");
                              return;
                            }
                            const heldAt =
                              inwardFormData.heldAt || new Date().toISOString();
                            // Persist first — UI Hold state is set only after successful save
                            const saved = await handleInwardSubmit("DRAFT", {
                              isHold: true,
                              holdReason: String(reason).trim(),
                              heldAt,
                            });
                            if (!saved) return;
                          }}
                          className="mt-0.5 accent-amber-500"
                        />
                        <span>
                          <span className="font-bold text-amber-400">Hold</span>
                          <span className="block text-[10px] text-[var(--text-muted-alt)]">
                            {inwardFormData.isHold
                              ? "Hold is permanent (cannot uncheck). Unloader locked. Complete from Draft Entries → Complete Hold → Confirm."
                              : "Confirm + reason saves to Pending Draft and frees the unloader for another truck (this vehicle stays blocked)."}
                          </span>
                        </span>
                      </label>
                      {inwardFormData.isHold && (
                        <div>
                          <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                            Hold reason <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="holdReason"
                            value={inwardFormData.holdReason || ""}
                            readOnly={!!inwardFormData.isHold}
                            onChange={handleInwardChange}
                            className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-amber-500 opacity-90"
                            placeholder="Why is this truck on Hold?"
                          />
                          {inwardErrors.holdReason && (
                            <span className="text-red-500 text-[10px] mt-1 block">
                              {inwardErrors.holdReason}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {inwardFormData.id && (
                      <div className="col-span-1 sm:col-span-2 2xl:col-span-4">
                        <div className="bg-[#e67e00]/10 p-3 rounded-lg border border-[#e67e00]/30 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="font-bold text-[#e67e00] text-xs">
                              UNLOADING START VERIFICATION
                            </div>
                            <label className="flex items-center gap-2 text-sm text-[var(--text-main)]">
                              <input
                                type="checkbox"
                                checked={inwardFormData.loadedVideoVerified}
                                onChange={(e) =>
                                  setInwardFormData((prev: any) => ({
                                    ...prev,
                                    loadedVideoVerified: e.target.checked,
                                  }))
                                }
                                className="accent-[#e67e00] w-4 h-4"
                              />
                              Loaded Truck Video Captured & Verified
                            </label>
                            <div>
                              <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                                Supervisor PIN
                              </label>
                              <input
                                type="password"
                                name="startPin"
                                placeholder="Supervisor PIN (1234)"
                                value={inwardFormData.startPin || ""}
                                onChange={handleInwardChange}
                                className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-sm outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="font-bold text-[#e67e00] text-xs">
                              UNLOADING FINISH VERIFICATION
                            </div>
                            <label className="flex items-center gap-2 text-sm text-[var(--text-main)]">
                              <input
                                type="checkbox"
                                checked={inwardFormData.emptyVideoVerified}
                                onChange={(e) =>
                                  setInwardFormData((prev: any) => ({
                                    ...prev,
                                    emptyVideoVerified: e.target.checked,
                                  }))
                                }
                                className="accent-[#e67e00] w-4 h-4"
                              />
                              Empty Truck Video Captured & Verified
                            </label>
                            <div>
                              <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                                Supervisor PIN
                              </label>
                              <input
                                type="password"
                                name="finishPin"
                                placeholder="Supervisor PIN (1234)"
                                value={inwardFormData.finishPin || ""}
                                onChange={handleInwardChange}
                                className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-sm outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pending Bolis & Quality Cut (Supervisor Input) */}
                <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[#e67e00]/30 overflow-hidden mt-6">
                  <div className="bg-[#e67e00]/10 px-4 py-2 border-b border-[#e67e00]/20 text-[#e67e00] font-bold text-sm flex items-center justify-between">
                    <span>Pending Bolis (Selected Arthia)</span>
                  </div>
                  <div className="p-4">
                    <BoliCompletionTable
                      sodaPending={sodaPending}
                      supplierId={inwardFormData.supplierId}
                      boliInputs={boliInputs}
                      setBoliInputs={setBoliInputs}
                      onSodaComplete={fetchSodaPending}
                      editable={inwardFormData.mandiType === "Boli"}
                    />
                  </div>

                  <div className="bg-[var(--bg-base)] rounded border border-[var(--border-subtle)] p-3">
                    <h4 className="text-xs font-bold text-[var(--text-muted-alt)] mb-2 uppercase">
                      Quality Cut
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      <div className="sm:col-span-5">
                        <label className="block text-[var(--text-muted-alt)] text-[10px] mb-1">
                          Cut Type
                        </label>
                        <div className="flex flex-wrap items-center gap-3 py-1">
                          <label className="flex items-center gap-1 text-[var(--text-main)] text-sm cursor-pointer whitespace-nowrap">
                            <input
                              type="radio"
                              name="qualityCutType"
                              value="NONE"
                              checked={inwardFormData.qualityCutType === "NONE"}
                              onChange={handleInwardChange}
                              className="accent-[#e67e00]"
                            />
                            None
                          </label>
                          <label className="flex items-center gap-1 text-[var(--text-main)] text-sm cursor-pointer whitespace-nowrap">
                            <input
                              type="radio"
                              name="qualityCutType"
                              value="BAGS"
                              checked={inwardFormData.qualityCutType === "BAGS"}
                              onChange={handleInwardChange}
                              className="accent-[#e67e00]"
                            />
                            Bags
                          </label>
                          <label className="flex items-center gap-1 text-[var(--text-main)] text-sm cursor-pointer whitespace-nowrap">
                            <input
                              type="radio"
                              name="qualityCutType"
                              value="PERCENTAGE"
                              checked={
                                inwardFormData.qualityCutType === "PERCENTAGE"
                              }
                              onChange={handleInwardChange}
                              className="accent-[#e67e00]"
                            />
                            %age
                          </label>
                        </div>
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[var(--text-muted-alt)] text-[10px] mb-1">
                          Cut{" "}
                          {inwardFormData.qualityCutType === "PERCENTAGE"
                            ? "(%)"
                            : inwardFormData.qualityCutType === "BAGS"
                              ? "(Bags)"
                              : ""}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            name="qualityCutValue"
                            value={inwardFormData.qualityCutValue}
                            onChange={handleInwardChange}
                            disabled={
                              !inwardFormData.qualityCutType ||
                              inwardFormData.qualityCutType === "NONE"
                            }
                            className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)] outline-none disabled:opacity-50 pr-16"
                          />
                          {inwardFormData.qualityCutType === "BAGS" &&
                            liveQualityCut.qtl > 0 && (
                              <span className="absolute right-2 top-1.5 text-[10px] font-bold text-orange-400 flex items-center h-5">
                                {liveQualityCut.qtl.toFixed(2)} Qtl
                              </span>
                            )}
                          {inwardFormData.qualityCutType === "PERCENTAGE" &&
                            liveQualityCut.value > 0 && (
                              <span className="absolute right-2 top-1.5 text-[10px] font-bold text-orange-400 flex items-center h-5">
                                {liveQualityCut.needsNetWt
                                  ? "Wait for Net Wt"
                                  : `${liveQualityCut.qtl.toFixed(2)} Qtl`}
                              </span>
                            )}
                        </div>
                        {(inwardFormData.qualityCutType === "BAGS" ||
                          inwardFormData.qualityCutType === "PERCENTAGE") && (
                          <p className="text-[10px] text-orange-400 mt-1 font-medium">
                            Cut in quintals: {liveQualityCut.qtl.toFixed(3)} Qtl
                            {liveQualityCut.label
                              ? ` (${liveQualityCut.label})`
                              : ""}
                            {inwardFormData.qualityCutType === "BAGS"
                              ? ` · ${plantBagWt} Qtl/bag`
                              : ""}
                            {liveQualityCut.needsNetWt
                              ? " — enter Net Wt at Mill for % cut"
                              : ""}
                          </p>
                        )}
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[var(--text-muted-alt)] text-[10px] mb-1">
                          Reason
                        </label>
                        <input
                          type="text"
                          name="qualityCutReason"
                          value={inwardFormData.qualityCutReason}
                          onChange={handleInwardChange}
                          disabled={inwardFormData.qualityCutType === "NONE"}
                          className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-main)] outline-none disabled:opacity-50"
                          placeholder="e.g. High Moisture"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="col-span-12 xl:col-span-5 space-y-6">
                {/* 5. Bardana Details & 6. Weight Details */}
                <div className="flex flex-col gap-6 mt-6">
                  {/* 5. Bardana */}
                  {(() => {
                    const lowerBagFlag =
                      !!inwardFormData.informBaujiBagsLess ||
                      !!inwardFormData.bagsRecLessThanAgencyGp;
                    return (
                  <div
                    className={`bg-[var(--bg-panel-alt)] rounded-xl overflow-hidden border ${
                      lowerBagFlag
                        ? "border-amber-500 ring-2 ring-amber-500/40 shadow-[0_0_0_1px_rgba(245,158,11,0.25)]"
                        : "border-[var(--border-subtle-alt)]"
                    }`}
                  >
                    <div
                      className={`px-4 py-2 border-b font-bold text-sm flex flex-wrap items-center justify-between gap-2 ${
                        lowerBagFlag
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                          : "bg-blue-900/10 border-[var(--border-subtle-alt)] text-blue-400"
                      }`}
                    >
                      <span>5. Bardana Details</span>
                      {lowerBagFlag && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500 text-black">
                          FLAG · Lower Bag Count Consideration
                        </span>
                      )}
                    </div>
                    <div className={`p-4 ${lowerBagFlag ? "bg-amber-500/5" : ""}`}>
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="text-[var(--text-muted-alt)] text-xs border-b border-[var(--border-subtle)]">
                            <th className="pb-2 font-medium w-1/3"></th>
                            <th
                              className="pb-2 font-medium text-center"
                              colSpan={2}
                            >
                              Original Bardana
                            </th>
                            <th
                              className="pb-2 font-medium text-center text-[#e67e00]"
                              colSpan={2}
                            >
                              Shortage Received
                            </th>
                            <th className="pb-2 font-medium text-center text-right">
                              Total Bags
                            </th>
                          </tr>
                          <tr className="text-[var(--text-muted-alt)] text-xs border-b border-[var(--border-subtle)]">
                            <th className="pb-2 font-medium"></th>
                            <th className="pb-2 font-medium">A Class</th>
                            <th className="pb-2 font-medium">B Class</th>
                            <th className="pb-2 font-medium text-[#e67e00]">
                              A Class
                            </th>
                            <th className="pb-2 font-medium text-[#e67e00]">
                              B Class
                            </th>
                            <th className="pb-2 font-medium text-right"></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-[var(--border-subtle-alt)]">
                            <td className="py-3 text-[var(--text-muted)] font-medium">
                              Bags Rec. @ Mill
                            </td>
                            <td className="py-3">
                              <input
                                type="number"
                                min="0"
                                name="origAClass"
                                value={
                                  inwardFormData.origAClass === 0 ||
                                  inwardFormData.origAClass === "0"
                                    ? ""
                                    : inwardFormData.origAClass ?? ""
                                }
                                onChange={handleInwardChange}
                                className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)]"
                              />
                              {inwardErrors.origAClass && (
                                <span className="text-red-500 text-[10px] mt-1 block">
                                  {inwardErrors.origAClass}
                                </span>
                              )}
                            </td>
                            <td className="py-3">
                              <input
                                type="number"
                                min="0"
                                name="origBClass"
                                value={
                                  inwardFormData.origBClass === 0 ||
                                  inwardFormData.origBClass === "0"
                                    ? ""
                                    : inwardFormData.origBClass ?? ""
                                }
                                onChange={handleInwardChange}
                                className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)]"
                              />
                              {inwardErrors.origBClass && (
                                <span className="text-red-500 text-[10px] mt-1 block">
                                  {inwardErrors.origBClass}
                                </span>
                              )}
                            </td>
                            <td className="py-3">
                              <input
                                type="number"
                                min="0"
                                name="shortageAClass"
                                value={
                                  inwardFormData.shortageAClass === 0 ||
                                  inwardFormData.shortageAClass === "0"
                                    ? ""
                                    : inwardFormData.shortageAClass ?? ""
                                }
                                onChange={handleInwardChange}
                                className="w-16 bg-[var(--bg-base)] border border-[#e67e00]/50 rounded px-2 py-1 text-[var(--text-main)]"
                              />
                              {inwardErrors.shortageAClass && (
                                <span className="text-red-500 text-[10px] mt-1 block">
                                  {inwardErrors.shortageAClass}
                                </span>
                              )}
                            </td>
                            <td className="py-3">
                              <input
                                type="number"
                                min="0"
                                name="shortageBClass"
                                value={
                                  inwardFormData.shortageBClass === 0 ||
                                  inwardFormData.shortageBClass === "0"
                                    ? ""
                                    : inwardFormData.shortageBClass ?? ""
                                }
                                onChange={handleInwardChange}
                                className="w-16 bg-[var(--bg-base)] border border-[#e67e00]/50 rounded px-2 py-1 text-[var(--text-main)]"
                              />
                              {inwardErrors.shortageBClass && (
                                <span className="text-red-500 text-[10px] mt-1 block">
                                  {inwardErrors.shortageBClass}
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-right font-bold text-[var(--text-main)]">
                              {(parseFloat(inwardFormData.origAClass) || 0) +
                                (parseFloat(inwardFormData.origBClass) || 0) +
                                (parseFloat(inwardFormData.shortageAClass) ||
                                  0) +
                                (parseFloat(inwardFormData.shortageBClass) ||
                                  0)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 text-[var(--text-muted)] font-medium">
                              {inwardFormData.egpLate
                                ? "Arthia Parchi bags"
                                : "Bags @ Agency GP"}
                            </td>
                            <td className="py-3">
                              <input
                                type="number"
                                min="0"
                                name="origAClassAg"
                                value={
                                  inwardFormData.origAClassAg === 0 ||
                                  inwardFormData.origAClassAg === "0"
                                    ? ""
                                    : inwardFormData.origAClassAg ?? ""
                                }
                                onChange={handleInwardChange}
                                className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)]"
                              />
                              {inwardErrors.origAClassAg && (
                                <span className="text-red-500 text-[10px] mt-1 block">
                                  {inwardErrors.origAClassAg}
                                </span>
                              )}
                            </td>
                            <td className="py-3">
                              <input
                                type="number"
                                min="0"
                                name="origBClassAg"
                                value={
                                  inwardFormData.origBClassAg === 0 ||
                                  inwardFormData.origBClassAg === "0"
                                    ? ""
                                    : inwardFormData.origBClassAg ?? ""
                                }
                                onChange={handleInwardChange}
                                className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)]"
                              />
                              {inwardErrors.origBClassAg && (
                                <span className="text-red-500 text-[10px] mt-1 block">
                                  {inwardErrors.origBClassAg}
                                </span>
                              )}
                            </td>
                            <td
                              className="py-3 text-center text-gray-500"
                              colSpan={2}
                            >
                              -
                            </td>
                            <td className="py-3 text-right font-bold text-[var(--text-main)]">
                              {(parseFloat(inwardFormData.origAClassAg) || 0) +
                                (parseFloat(inwardFormData.origBClassAg) || 0)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      {inwardFormData.egpLate && (
                        <p className="text-[11px] text-amber-400 mt-2">
                          e-GP Late: these bags are Arthia Parchi bags. They are
                          used for required weight and are not counted as Agency
                          GP bags. Agency GP number is not required.
                        </p>
                      )}
                      {(() => {
                        const millExclShortage =
                          (parseFloat(inwardFormData.origAClass) || 0) +
                          (parseFloat(inwardFormData.origBClass) || 0);
                        const agencyBags =
                          (parseFloat(inwardFormData.origAClassAg) || 0) +
                          (parseFloat(inwardFormData.origBClassAg) || 0);
                        const bagsLess = Math.max(0, agencyBags - millExclShortage);
                        // Client Feedback: Inform Bauji only when mill bags < 90% of Agency GP
                        // (shortfall > 10% of Required Agency Bags). Below that = normal bags shortage.
                        const thresholdMet =
                          agencyBags > 0 && millExclShortage < agencyBags * 0.9;
                        const bagsLessEnabled = bagsLess > 0 && thresholdMet;
                        const shortfallPct =
                          agencyBags > 0
                            ? ((bagsLess / agencyBags) * 100).toFixed(1)
                            : "0";
                        return (
                          <div className="mt-3 space-y-2">
                            {bagsLess > 0 && !thresholdMet && (
                              <p className="text-[10px] text-amber-400/90 leading-snug">
                                Bags short by {bagsLess} ({shortfallPct}% of Agency GP) —
                                within 10%. Use normal Shortage by Bags. Inform Bauji is
                                only allowed when shortfall exceeds 10% of Agency GP bags.
                              </p>
                            )}
                            {thresholdMet && (
                              <p className="text-[10px] text-red-400/90 leading-snug">
                                Shortfall {shortfallPct}% of Agency GP bags (&gt; 10%) —
                                Admin will be notified. You may select Inform Bauji.
                              </p>
                            )}
                            <label
                              className={`flex items-start gap-2 text-xs ${bagsLessEnabled ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
                            >
                              <input
                                type="checkbox"
                                name="informBaujiBagsLess"
                                disabled={!bagsLessEnabled}
                                checked={
                                  !!inwardFormData.informBaujiBagsLess ||
                                  !!inwardFormData.bagsRecLessThanAgencyGp
                                }
                                onChange={(e) =>
                                  setInwardFormData((prev: any) => ({
                                    ...prev,
                                    informBaujiBagsLess: e.target.checked,
                                    bagsRecLessThanAgencyGp: e.target.checked,
                                  }))
                                }
                                className="accent-red-500 w-4 h-4 mt-0.5 shrink-0"
                              />
                              <span className="leading-snug">
                                <span className="block text-gray-400 font-normal">
                                  Entry as per weight, Bags Received less than
                                  Agency GP
                                </span>
                                <span
                                  className={
                                    bagsLessEnabled
                                      ? "text-red-500 font-semibold"
                                      : "text-gray-500 font-semibold"
                                  }
                                >
                                  Inform Bauji
                                </span>
                              </span>
                            </label>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                    );
                  })()}

                  {/* 6. Weight Details */}
                  {(() => {
                    const excessWtFlag = !!inwardFormData.informBaujiExcessWeight;
                    return (
                  <div
                    className={`bg-[var(--bg-panel-alt)] rounded-xl overflow-hidden flex flex-col border ${
                      excessWtFlag
                        ? "border-rose-500 ring-2 ring-rose-500/40 shadow-[0_0_0_1px_rgba(244,63,94,0.25)]"
                        : "border-[var(--border-subtle-alt)]"
                    }`}
                  >
                    <div
                      className={`px-4 py-2 border-b font-bold text-sm flex flex-wrap items-center justify-between gap-2 ${
                        excessWtFlag
                          ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                          : "bg-blue-900/10 border-[var(--border-subtle-alt)] text-blue-400"
                      }`}
                    >
                      <span>6. Weight Details</span>
                      <div className="flex items-center gap-2">
                        {excessWtFlag && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500 text-white">
                            FLAG · Excess Weight Consideration
                          </span>
                        )}
                      <button
                        type="button"
                        onClick={() => {
                          if (!inwardFormData.truckNo) {
                            useUiStore
                              .getState()
                              .addToast("Select truck number first", "error");
                            return;
                          }
                          fetchWeighbridgeForTruck(
                            inwardFormData.truckNo,
                            false,
                          );
                        }}
                        className="text-[10px] font-bold uppercase tracking-wide text-[#e67e00] hover:text-white transition-colors flex items-center gap-1"
                        title="Re-fetch Gross / Tare / Net Mill from weighbridge"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Fetch WB
                      </button>
                    </div>
                    </div>
                    <div className={`p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 content-start ${excessWtFlag ? "bg-rose-500/5" : ""}`}>
                      <p className="sm:col-span-2 text-[10px] text-[var(--text-muted-alt)] -mt-1 mb-1">
                        Gross and Tare can be{" "}
                        <span className="text-[var(--text-main)] font-medium">
                          fetched from weighbridge
                        </span>{" "}
                        or{" "}
                        <span className="text-[var(--text-main)] font-medium">
                          punched manually
                        </span>
                        {autoUpdateDateTime
                          ? " (allowed even when Auto Update Date & Time is ON)"
                          : " (Auto Update Date & Time is OFF — Date/Time fields are also manual)"}
                        . Net at Mill = Gross − Tare. Only{" "}
                        <span className="text-[var(--text-main)] font-medium">
                          Net Wt. at Party
                        </span>{" "}
                        is always typed separately.
                      </p>
                      <div>
                        <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                          Gross Weight (Qtl){" "}
                          <span className="text-red-500">*</span>
                          <span className="ml-1 text-[10px] opacity-70">
                            {canManualWeighbridgePunch
                              ? "(weighbridge / manual)"
                              : "(weighbridge)"}
                          </span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          name="grossWeight"
                          value={inwardFormData.grossWeight}
                          readOnly={!canManualWeighbridgePunch}
                          onChange={
                            canManualWeighbridgePunch
                              ? handleInwardChange
                              : undefined
                          }
                          title={
                            canManualWeighbridgePunch
                              ? "Fetch from weighbridge or punch manually"
                              : "Auto-fetched from mill weighbridge"
                          }
                          className={`w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none ${
                            canManualWeighbridgePunch
                              ? "focus:border-[#e67e00]"
                              : "opacity-90 cursor-not-allowed"
                          }`}
                        />
                        {inwardErrors.grossWeight && (
                          <span className="text-red-500 text-[10px] mt-1 block">
                            {inwardErrors.grossWeight}
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                          Tare Weight (Qtl)
                          <span className="ml-1 text-[10px] opacity-70">
                            {canManualWeighbridgePunch
                              ? "(weighbridge / manual)"
                              : "(weighbridge)"}
                          </span>
                        </label>
                        <div className="flex gap-2 items-start">
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            name="tareWeight"
                            value={inwardFormData.tareWeight}
                            readOnly={!canManualWeighbridgePunch}
                            onChange={
                              canManualWeighbridgePunch
                                ? handleInwardChange
                                : undefined
                            }
                            title={
                              canManualWeighbridgePunch
                                ? "Fetch from weighbridge or punch manually"
                                : "Auto-fetched from mill weighbridge"
                            }
                            className={`flex-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none ${
                              canManualWeighbridgePunch
                                ? "focus:border-[#e67e00]"
                                : "opacity-90 cursor-not-allowed"
                            }`}
                          />
                          <button
                            type="button"
                            title="Supervisor fingerprint during tare — stamps Entry Completion (and GP Complete when Auto Update ON)"
                            onClick={async () => {
                              try {
                                const xml =
                                  await biometricService.captureAndVerifyLoggedInUser();
                                setInwardFormData((p: any) =>
                                  applySupervisorFingerprintStamps(p, xml),
                                );
                                useUiStore
                                  .getState()
                                  .addToast(
                                    autoUpdateDateTime
                                      ? "Tare fingerprint — GP Complete & Entry Completion stamped"
                                      : "Tare fingerprint — Entry Completion stamped",
                                    "success",
                                  );
                              } catch (e: any) {
                                useUiStore
                                  .getState()
                                  .addToast(e.message, "error");
                              }
                            }}
                            className={`shrink-0 px-2.5 py-2 rounded border text-xs font-bold flex items-center gap-1 ${
                              inwardFormData.biometricData
                                ? "bg-green-900/20 border-green-500/40 text-green-400"
                                : "bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
                            }`}
                          >
                            <ShieldCheck size={14} />
                            {inwardFormData.biometricData ? "OK" : "Scan"}
                          </button>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">
                          Supervisor fingerprint at tare stamps Entry Completion
                          {autoUpdateDateTime
                            ? " + GP Complete Date & Time Out"
                            : ""}
                          .
                        </p>
                      </div>
                      <div>
                        <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                          Net Weight (WB) : (Qtl)
                          <span className="ml-1 text-[10px] opacity-70">
                            (Gross − Tare)
                          </span>
                        </label>
                        <input
                          type="number"
                          name="netWeightWb"
                          value={inwardFormData.netWeightWb}
                          readOnly
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none opacity-70 cursor-not-allowed"
                          title="Gross − Tare from weighbridge"
                        />
                      </div>
                      <div>
                        <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                          Required Nt Wt. : (Qtl)
                          <span className="block text-[10px] opacity-80">
                            (agency + shortage bags)
                          </span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          name="reqNetWt"
                          value={inwardFormData.reqNetWt}
                          disabled
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none opacity-70 cursor-not-allowed"
                          title="Auto calculated"
                        />
                      </div>
                      <div>
                        <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                          <span>
                            Net Wt. at Mill : (Qtl){" "}
                            <span className="text-red-500">*</span>
                            <span className="ml-1 text-[10px] opacity-70">
                              (weighbridge)
                            </span>
                          </span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          name="netWtMill"
                          value={inwardFormData.netWtMill}
                          readOnly
                          title="Gross − Tare (auto). Gross/Tare may be fetched or punched manually."
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] font-bold outline-none opacity-90 cursor-not-allowed"
                        />
                        {inwardErrors.netWtMill && (
                          <span className="text-red-500 text-[10px] mt-1 block">
                            {inwardErrors.netWtMill}
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="block text-[var(--text-main)] font-bold text-xs mb-1">
                          Net Wt. Difference : (Qtl){" "}
                          <span className="text-red-500">*</span>
                          <span className="ml-1 text-[10px] font-normal opacity-70">
                            (auto)
                          </span>
                        </label>
                        <input
                          type="number"
                          name="netWtDiff"
                          value={inwardFormData.netWtDiff}
                          readOnly
                          title="Auto: Required Net Wt − Net at Mill"
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-blue-400 font-bold outline-none opacity-90 cursor-not-allowed"
                        />
                        {inwardErrors.netWtDiff && (
                          <span className="text-red-500 text-[10px] mt-1 block">
                            {inwardErrors.netWtDiff}
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                          Net Wt. at Party : (Qtl){" "}
                          <span className="text-red-500">*</span>
                          <span className="ml-1 text-[10px] text-[#e67e00]">
                            (manual entry)
                          </span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          name="netWtParty"
                          value={inwardFormData.netWtParty}
                          onChange={handleInwardChange}
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                        />
                        {inwardErrors.netWtParty && (
                          <span className="text-red-500 text-[10px] mt-1 block">
                            {inwardErrors.netWtParty}
                          </span>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <label
                          className={`flex items-start gap-2 text-xs ${parseFloat(inwardFormData.netWtDiff) < 0 ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
                        >
                          <input
                            type="checkbox"
                            name="informBaujiExcessWeight"
                            disabled={
                              !(parseFloat(inwardFormData.netWtDiff) < 0)
                            }
                            checked={!!inwardFormData.informBaujiExcessWeight}
                            onChange={(e) =>
                              setInwardFormData((prev: any) => ({
                                ...prev,
                                informBaujiExcessWeight: e.target.checked,
                              }))
                            }
                            className="accent-red-500 w-4 h-4 mt-0.5 shrink-0"
                          />
                          <span className="leading-snug">
                            {/* Lead line — light grey; Inform Bauji — red */}
                            <span className="block text-gray-400 font-normal">
                              Excess Weight Received Against Shortage
                            </span>
                            <span
                              className={
                                parseFloat(inwardFormData.netWtDiff) < 0
                                  ? "text-red-500 font-semibold"
                                  : "text-gray-500 font-semibold"
                              }
                            >
                              Inform Bauji
                            </span>
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                    );
                  })()}
                </div>

                {/* 7. Dhank / Lot Details */}
                <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
                  <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">
                    7. Dhank / Lot Details
                  </div>
                  <div className="p-4">
                    <table className="w-full text-sm text-center">
                      <thead>
                        <tr className="text-[var(--text-muted-alt)] text-xs border-b border-[var(--border-subtle)] uppercase font-medium bg-[var(--bg-base)]">
                          <th className="py-2">Dhank No.</th>
                          <th className="py-2">Bags</th>
                          <th className="py-2">Moisture (%)</th>
                          <th className="py-2">Bardana Class</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dhanakLots.map((lot, idx) => (
                          <tr
                            key={lot.id}
                            className="border-b border-[var(--border-subtle-alt)]"
                          >
                            <td className="py-2">
                              <input
                                type="text"
                                value={
                                  lot.dhankNo ||
                                  (lot as any).sNo ||
                                  String(idx + 1)
                                }
                                readOnly
                                className="w-20 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)] text-xs opacity-90 cursor-not-allowed"
                                title="Auto Dhank No. = running S.No. when row is added"
                              />
                            </td>
                            <td className="py-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={hideZeroDisplay(lot.bags)}
                                onChange={(e) =>
                                  handleDhanakChange(
                                    idx,
                                    "bags",
                                    e.target.value,
                                  )
                                }
                                className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)] text-xs"
                              />
                            </td>
                            <td className="py-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={hideZeroDisplay(lot.moisture)}
                                onChange={(e) =>
                                  handleDhanakChange(
                                    idx,
                                    "moisture",
                                    e.target.value,
                                  )
                                }
                                className="w-16 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)] text-xs"
                              />
                            </td>
                            <td className="py-2">
                              <select
                                value={lot.bardanaClass}
                                onChange={(e) =>
                                  handleDhanakChange(
                                    idx,
                                    "bardanaClass",
                                    e.target.value,
                                  )
                                }
                                className="w-24 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-1 py-1 text-[var(--text-main)] text-xs"
                              >
                                <option value="">Select</option>
                                <option value="A_Class">A Class</option>
                                <option value="B_Class">B Class</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold bg-[var(--bg-panel)]">
                          <td className="py-3 text-right pr-4 text-[var(--text-main)]">
                            TOTAL
                          </td>
                          <td className="py-3 text-[var(--text-main)]">
                            {dhanakLots.reduce(
                              (acc, lot) =>
                                acc + (parseInt(lot.bags as any) || 0),
                              0,
                            )}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tbody>
                    </table>
                    <button
                      onClick={addDhanakRow}
                      className="mt-3 text-blue-400 text-sm font-bold flex items-center gap-1 hover:text-blue-300"
                    >
                      <Plus size={14} /> Add Row
                    </button>
                  </div>
                </div>

                {/* 8. Shortage Management */}
                <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
                  <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">
                    8. Shortage Management
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                    <div className="col-span-2 bg-red-900/10 border border-red-500/20 p-3 rounded-lg space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <span className="text-red-400 font-bold block">
                            Calculated Shortage
                          </span>
                          <span className="text-[10px] text-[var(--text-muted-alt)]">
                            Based on Standard Bag Weight (
                            {plants.find((p) => p.id === activePlant?.id)
                              ?.standardBagWeight || 0.382}{" "}
                            Qtl)
                          </span>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] text-right space-y-0.5">
                          <div>
                            Required Weight:{" "}
                            <span className="font-mono text-[var(--text-main)]">
                              {Number(inwardFormData.reqNetWt || 0).toFixed(3)} Qtl
                            </span>
                          </div>
                          <div>
                            Required Agency Bags:{" "}
                            <span className="font-mono text-[var(--text-main)]">
                              {Number(
                                inwardFormData.requiredAgencyBags ??
                                  (parseFloat(inwardFormData.origAClassAg) ||
                                    0) +
                                    (parseFloat(inwardFormData.origBClassAg) ||
                                      0),
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Feedback 33 — Ref table: quality cut / weight / bags separately */}
                      <div className="overflow-x-auto rounded-lg border border-red-500/20 bg-[var(--bg-base)]/40">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-red-500/20 text-[var(--text-muted-alt)]">
                              <th className="text-left px-3 py-2 font-medium">
                                Calculated Shortage
                              </th>
                              <th className="text-right px-3 py-2 font-medium w-28">
                                Qtl
                              </th>
                              <th className="text-right px-3 py-2 font-medium w-28">
                                Bags
                              </th>
                            </tr>
                          </thead>
                          <tbody className="text-[var(--text-main)] font-mono">
                            <tr className="border-b border-[var(--border-subtle)]">
                              <td className="px-3 py-2 font-sans">
                                Quality Cut Shortage
                                {liveQualityCut.label ? (
                                  <span className="block text-[10px] text-orange-400 font-medium mt-0.5">
                                    {liveQualityCut.narration}
                                    {liveQualityCut.needsNetWt
                                      ? " (waiting for Net Wt at Mill)"
                                      : ""}
                                  </span>
                                ) : (
                                  <span className="block text-[10px] text-[var(--text-muted-alt)] font-normal mt-0.5">
                                    From Quality Cut (Bags or %age) — live
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right text-orange-300">
                                {liveQualityCut.qtl.toFixed(3)}
                              </td>
                              <td className="px-3 py-2 text-right text-orange-300">
                                {liveQualityCut.bags.toFixed(2)}
                              </td>
                            </tr>
                            <tr className="border-b border-[var(--border-subtle)]">
                              <td className="px-3 py-2 font-sans">
                                Shortage by weight
                                {Number(
                                  inwardFormData.bdWeightShortageQtl || 0,
                                ) < -0.0005 ? (
                                  <span className="block text-[10px] text-emerald-400 font-medium mt-0.5">
                                    Excess vs Required Weight{" "}
                                    {Number(inwardFormData.reqNetWt || 0).toFixed(3)}{" "}
                                    Qtl (Inform Bauji) — negative
                                  </span>
                                ) : Number(
                                    inwardFormData.bdWeightShortageQtl || 0,
                                  ) > 0.0005 ? (
                                  <span className="block text-[10px] text-[var(--text-muted-alt)] font-normal mt-0.5">
                                    Relative to Required Weight{" "}
                                    {Number(inwardFormData.reqNetWt || 0).toFixed(3)}{" "}
                                    Qtl · Mill Net{" "}
                                    {Number(inwardFormData.netWtMill || 0).toFixed(3)}{" "}
                                    Qtl
                                  </span>
                                ) : (
                                  <span className="block text-[10px] text-[var(--text-muted-alt)] font-normal mt-0.5">
                                    vs Required Weight{" "}
                                    {Number(inwardFormData.reqNetWt || 0).toFixed(3)}{" "}
                                    Qtl
                                  </span>
                                )}
                              </td>
                              <td
                                className={`px-3 py-2 text-right ${
                                  Number(
                                    inwardFormData.bdWeightShortageQtl || 0,
                                  ) < 0
                                    ? "text-emerald-400"
                                    : ""
                                }`}
                              >
                                {Number(
                                  inwardFormData.bdWeightShortageQtl || 0,
                                ).toFixed(3)}
                              </td>
                              <td
                                className={`px-3 py-2 text-right ${
                                  Number(
                                    inwardFormData.bdWeightShortageBags || 0,
                                  ) < 0
                                    ? "text-emerald-400"
                                    : ""
                                }`}
                              >
                                {Number(
                                  inwardFormData.bdWeightShortageBags || 0,
                                ).toFixed(2)}
                              </td>
                            </tr>
                            <tr className="border-b border-[var(--border-subtle)]">
                              <td className="px-3 py-2 font-sans">
                                Shortage by bags
                                {inwardFormData.informBaujiBagsLess ||
                                inwardFormData.bagsRecLessThanAgencyGp ? (
                                  <span className="block text-[10px] text-amber-400 font-medium mt-0.5">
                                    Hidden — Bags less than Agency GP, Inform
                                    Bauji (entry as per weight)
                                  </span>
                                ) : Number(
                                    inwardFormData.bdBagsShortageBags || 0,
                                  ) > 0 ? (
                                  <span className="block text-[10px] text-[var(--text-muted-alt)] font-normal mt-0.5">
                                    Relative to Required Agency Bags{" "}
                                    {Number(
                                      inwardFormData.requiredAgencyBags ??
                                        (parseFloat(
                                          inwardFormData.origAClassAg,
                                        ) || 0) +
                                          (parseFloat(
                                            inwardFormData.origBClassAg,
                                          ) || 0),
                                    )}{" "}
                                    − Mill bags (excl. shortage) · × {plantBagWt}{" "}
                                    Qtl
                                  </span>
                                ) : (
                                  <span className="block text-[10px] text-[var(--text-muted-alt)] font-normal mt-0.5">
                                    vs Required Agency Bags{" "}
                                    {Number(
                                      inwardFormData.requiredAgencyBags ??
                                        (parseFloat(
                                          inwardFormData.origAClassAg,
                                        ) || 0) +
                                          (parseFloat(
                                            inwardFormData.origBClassAg,
                                          ) || 0),
                                    )}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {Number(
                                  inwardFormData.bdBagsShortageQtl || 0,
                                ).toFixed(3)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {Number(
                                  inwardFormData.bdBagsShortageBags || 0,
                                ).toFixed(2)}
                              </td>
                            </tr>
                            <tr className="border-b border-red-500/30 bg-red-900/10 font-bold">
                              <td className="px-3 py-2 font-sans text-red-300">
                                Total shortage of this truck
                                <span className="block text-[10px] text-red-300/70 font-normal mt-0.5">
                                  Quality cut + Weight + Bags
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right text-red-300">
                                {(
                                  liveQualityCut.qtl +
                                  Number(
                                    inwardFormData.bdWeightShortageQtl || 0,
                                  ) +
                                  Number(inwardFormData.bdBagsShortageQtl || 0)
                                ).toFixed(3)}
                              </td>
                              <td className="px-3 py-2 text-right text-red-300">
                                {(() => {
                                  const qtl =
                                    liveQualityCut.qtl +
                                    Number(
                                      inwardFormData.bdWeightShortageQtl || 0,
                                    ) +
                                    Number(
                                      inwardFormData.bdBagsShortageQtl || 0,
                                    );
                                  return plantBagWt > 0
                                    ? (qtl / plantBagWt).toFixed(2)
                                    : (
                                        liveQualityCut.bags +
                                        Number(
                                          inwardFormData.bdWeightShortageBags ||
                                            0,
                                        ) +
                                        Number(
                                          inwardFormData.bdBagsShortageBags ||
                                            0,
                                        )
                                      ).toFixed(2);
                                })()}
                              </td>
                            </tr>
                            <tr className="bg-amber-900/10 font-bold">
                              <td className="px-3 py-2 font-sans text-amber-300">
                                Total shortage of Artia
                                <span className="block text-[10px] text-amber-300/70 font-normal mt-0.5">
                                  Till-date balance for selected Artia
                                  (confirmed entries) — not this truck alone
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right text-amber-300">
                                {inwardFormData.supplierId
                                  ? artiaTillDateShortage.qtl.toFixed(3)
                                  : "—"}
                              </td>
                              <td className="px-3 py-2 text-right text-amber-300">
                                {inwardFormData.supplierId
                                  ? artiaTillDateShortage.bags.toFixed(2)
                                  : "—"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Removed Shortage Received / Occurred as per feedback */}
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Update in Shortage Register
                      </label>
                      <div className="flex items-center gap-4 mt-2">
                        <label className="flex items-center gap-1 text-[var(--text-main)]">
                          <input
                            type="radio"
                            name="updateShortageReg"
                            value="Yes"
                            checked={inwardFormData.updateShortageReg === "Yes"}
                            onChange={handleInwardChange}
                            className="accent-blue-500"
                          />{" "}
                          Yes
                        </label>
                        <label className="flex items-center gap-1 text-[var(--text-main)]">
                          <input
                            type="radio"
                            name="updateShortageReg"
                            value="N/A"
                            checked={inwardFormData.updateShortageReg === "N/A"}
                            onChange={handleInwardChange}
                            className="accent-blue-500"
                          />{" "}
                          N/A
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                          Total shortage of Artia (Qtl) — till date
                        </label>
                        <input
                          type="text"
                          value={
                            inwardFormData.supplierId
                              ? artiaTillDateShortage.qtl.toFixed(2)
                              : "—"
                          }
                          disabled
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none opacity-70 cursor-not-allowed font-bold text-red-400"
                        />
                        <span className="text-[10px] text-[var(--text-muted-alt)] mt-1 block">
                          Confirmed ledger balance for selected Artia. This
                          truck preview:{" "}
                          {Number(
                            inwardFormData.artiaNetShortageQtl ??
                              inwardFormData.shortageQtl ??
                              0,
                          ).toFixed(2)}{" "}
                          Qtl
                        </span>
                        {(parseFloat(inwardFormData.shortageBagsCreditQtl) ||
                          0) > 0 && (
                          <span className="text-[10px] text-emerald-400 mt-1 block">
                            This truck includes −
                            {Number(
                              inwardFormData.shortageBagsCreditQtl,
                            ).toFixed(2)}{" "}
                            qtl for shortage bags received
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                          Total shortage of Artia (Bags) — till date
                        </label>
                        <input
                          type="text"
                          value={
                            inwardFormData.supplierId
                              ? artiaTillDateShortage.bags.toFixed(2)
                              : "—"
                          }
                          disabled
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none opacity-70 cursor-not-allowed font-bold text-red-400"
                        />
                      </div>
                    </div>

                    {/* Feedback 34 — Auto Narration option in Shortage section */}
                    <div className="col-span-2 mt-2 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)]">
                      <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)] cursor-pointer">
                        <input
                          type="checkbox"
                          name="autoNarration"
                          checked={inwardFormData.autoNarration !== false}
                          onChange={(e) =>
                            setInwardFormData((prev: any) => ({
                              ...prev,
                              autoNarration: e.target.checked,
                              ...(e.target.checked
                                ? {
                                    shortageNarration:
                                      prev.autoNarrationText ||
                                      prev.shortageNarration ||
                                      "",
                                  }
                                : {}),
                            }))
                          }
                          className="accent-[#e67e00] w-4 h-4"
                        />
                        Auto Narration
                      </label>
                      <p className="text-[10px] text-[var(--text-muted-alt)] mt-1 mb-2">
                        When ON, narration is built automatically for the
                        shortage report (Weight Shortage, Bags Shortage, Quality
                        Cut, Shortage Received, Excess Weight Received).
                      </p>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Narration (appears as last column in Shortage Report)
                      </label>
                      <textarea
                        name="shortageNarration"
                        value={inwardFormData.shortageNarration || ""}
                        onChange={handleInwardChange}
                        disabled={inwardFormData.autoNarration !== false}
                        rows={2}
                        className={`w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] text-sm outline-none focus:border-[#e67e00] ${
                          inwardFormData.autoNarration !== false
                            ? "opacity-70 cursor-not-allowed"
                            : ""
                        }`}
                        placeholder="Auto narration will appear here"
                      />
                    </div>

                    {inwardFormData.actualShortageQtl < 0 && (
                      <div className="col-span-2 mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2 text-emerald-500 font-bold mb-3">
                          <CheckCircle2 size={18} />
                          <span>Plus Weight (Excess) Detected</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mb-3">
                          {inwardFormData.informBaujiExcessWeight
                            ? "Inform Bauji is checked — this excess will be applied as Shortage Recovery against the Artia."
                            : "Tick “Excess Weight Received, Inform Bauji” in Weight Details to apply this excess as Shortage Recovery. Excess bags alone are not added to shortage."}
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-[var(--bg-panel)] p-3 rounded border border-[var(--border-subtle)]">
                            <label className="block text-[10px] text-[var(--text-muted-alt)] uppercase tracking-wider mb-1">
                              {inwardFormData.informBaujiExcessWeight
                                ? "Artia Net Recovery (Qtl)"
                                : "Excess Weight (Qtl)"}
                            </label>
                            <div
                              className={`font-mono font-bold text-lg ${inwardFormData.informBaujiExcessWeight ? "text-emerald-400" : "text-[var(--text-muted)]"}`}
                            >
                              {Math.abs(
                                inwardFormData.actualShortageQtl,
                              ).toFixed(2)}{" "}
                              Qtl
                            </div>
                          </div>
                          <div className="bg-[var(--bg-panel)] p-3 rounded border border-[var(--border-subtle)]">
                            <label className="block text-[10px] text-[var(--text-muted-alt)] uppercase tracking-wider mb-1">
                              {inwardFormData.informBaujiExcessWeight
                                ? "Artia Net Recovery (Bags)"
                                : "Excess (Bags)"}
                            </label>
                            <div
                              className={`font-mono font-bold text-lg ${inwardFormData.informBaujiExcessWeight ? "text-emerald-400" : "text-[var(--text-muted)]"}`}
                            >
                              {(
                                Math.abs(inwardFormData.actualShortageQtl) /
                                (plants.find((p) => p.id === activePlant?.id)
                                  ?.standardBagWeight || 0.382)
                              ).toFixed(2)}{" "}
                              Bags
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="col-span-2">
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Any Discrepancy / Point Raise{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="discrepancy"
                        value={inwardFormData.discrepancy}
                        onChange={handleInwardChange}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none"
                        rows={2}
                      ></textarea>
                      {inwardErrors.discrepancy && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.discrepancy}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 9. GP Complete Date & Time Out — below Shortage Management */}
                <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
                  <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm flex flex-wrap items-center justify-between gap-2">
                    <span>9. GP Complete Date &amp; Time Out</span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        autoUpdateDateTime
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      Auto Update Date &amp; Time:{" "}
                      {autoUpdateDateTime ? "ON" : "OFF"}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        GP Complete Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="gpCompleteDate"
                        value={inwardFormData.gpCompleteDate}
                        onChange={handleInwardChange}
                        disabled={autoUpdateDateTime}
                        max={isSupervisor ? todayLocal : undefined}
                        className={`w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none ${!autoUpdateDateTime ? "focus:border-[#e67e00]" : "opacity-70 cursor-not-allowed"}`}
                      />
                      {inwardErrors.gpCompleteDate && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.gpCompleteDate}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Time Out <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        name="timeOut"
                        value={inwardFormData.timeOut}
                        onChange={handleInwardChange}
                        disabled={autoUpdateDateTime}
                        className={`w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none ${!autoUpdateDateTime ? "focus:border-[#e67e00]" : "opacity-70 cursor-not-allowed"}`}
                      />
                      {inwardErrors.timeOut && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.timeOut}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Entry Completion Date &amp; Time
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={
                          inwardFormData.entryCompletionAt
                            ? new Date(
                                inwardFormData.entryCompletionAt,
                              ).toLocaleString()
                            : ""
                        }
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none opacity-70 cursor-not-allowed"
                        placeholder="Set on supervisor fingerprint (tare / confirm)"
                      />
                      <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">
                        Separate from GP Complete — stamped when supervisor
                        scans fingerprint at tare / confirm.
                      </p>
                      {inwardFormData.entryMadeByName && (
                        <p className="text-[11px] text-emerald-400 mt-2">
                          Stamped by <b>{inwardFormData.entryMadeByName}</b>
                          {inwardFormData.entryCompletionAt
                            ? ` at ${new Date(inwardFormData.entryCompletionAt).toLocaleString()}`
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  {autoUpdateDateTime && (
                    <p className="px-4 pb-3 text-[10px] text-[var(--text-muted-alt)]">
                      Auto Update ON: Date &amp; Time In and GP Complete Date
                      &amp; Time Out are locked. GP Complete + Time Out punch on
                      supervisor fingerprint; Entry Completion is always the
                      fingerprint timestamp. Weighbridge Gross/Tare may still be
                      punched manually or fetched.
                    </p>
                  )}
                </div>

                {/* Vehicle Verification (Empty) — Feedback 33: after Section 8 */}
                <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
                  <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">
                    Vehicle Verification (Empty)
                  </div>
                  <div className="p-4 text-sm">
                    <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                      Khali (Empty) Video Upload{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-4 py-2">
                      <label className="flex items-center gap-1 text-[var(--text-main)]">
                        <input
                          type="checkbox"
                          name="khaliVideoUpload"
                          checked={inwardFormData.khaliVideoUpload === "Yes"}
                          onChange={(e) =>
                            handleInwardChange({
                              target: {
                                name: "khaliVideoUpload",
                                value: e.target.checked ? "Yes" : "",
                              },
                            } as any)
                          }
                          className="accent-blue-500"
                        />{" "}
                        Yes Done
                      </label>
                    </div>
                    {inwardErrors.khaliVideoUpload && (
                      <span className="text-red-500 text-[10px] mt-1 block">
                        {inwardErrors.khaliVideoUpload}
                      </span>
                    )}
                  </div>
                </div>

                {/* 10. Driver Information */}
                <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
                  <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm">
                    10. Driver Information
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1 flex items-center gap-2">
                        Driver Name <span className="text-red-500">*</span>
                      </label>
                      <Combobox
                        name="driverName"
                        value={inwardFormData.driverName}
                        onChange={(e: any) => {
                          handleInwardChange(e);
                          const match = drivers.find(
                            (d: any) => d.name === e.target.value,
                          );
                          if (match && match.phone) {
                            setInwardFormData((prev: any) => ({
                              ...prev,
                              mobileNumber: match.phone,
                            }));
                          }
                        }}
                        onBlur={handleMasterDataBlur}
                        options={drivers}
                        className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none"
                        placeholder="Select or enter driver name"
                      />
                      {inwardErrors.driverName && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.driverName}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted-alt)] text-xs mb-1">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        title="10 digit mobile number"
                        name="mobileNumber"
                        value={inwardFormData.mobileNumber}
                        onChange={handleInwardChange}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none"
                      />
                      {inwardErrors.mobileNumber && (
                        <span className="text-red-500 text-[10px] mt-1 block">
                          {inwardErrors.mobileNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 11. Authentication (Biometric) */}
                <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle-alt)] overflow-hidden">
                  <div className="bg-blue-900/10 px-4 py-2 border-b border-[var(--border-subtle-alt)] text-blue-400 font-bold text-sm flex items-center justify-between">
                    <span>11. Authentication (Biometric)</span>
                    {inwardFormData.shortageRecoveryOpt === "Yes" && (
                      <span className="text-red-400 text-xs flex items-center gap-1">
                        <AlertTriangle size={14} /> High Risk: 2 Punches
                        Required
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-4 text-sm">
                    {/* First Punch - Supervisor */}
                    <div className="flex flex-wrap gap-6 items-center justify-between p-3 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                      <div className="flex items-center gap-3 flex-wrap flex-1">
                        <div className="w-24 text-[var(--text-muted-alt)] font-medium text-xs">
                          Supervisor
                        </div>
                        {inwardFormData.biometricData ? (
                          <div className="text-green-400 font-bold bg-green-900/10 border border-green-900/20 px-3 py-1.5 rounded flex items-center gap-2">
                            <ShieldCheck size={16} /> Authenticated
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const xml =
                                    await biometricService.captureAndVerifyLoggedInUser();
                                  setInwardFormData((p: any) =>
                                    applySupervisorFingerprintStamps(p, xml),
                                  );
                                  useUiStore
                                    .getState()
                                    .addToast(
                                      autoUpdateDateTime
                                        ? "Fingerprint captured — GP Complete & Entry Completion stamped"
                                        : "Fingerprint Captured Successfully",
                                      "success",
                                    );
                                } catch (e: any) {
                                  useUiStore
                                    .getState()
                                    .addToast(e.message, "error");
                                }
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 rounded px-4 py-1.5 text-sm font-bold flex items-center gap-2 transition-colors"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
                                />
                              </svg>
                              Scan Fingerprint
                            </button>
                            <span className="text-xs text-[var(--text-muted-alt)]">
                              Place finger on device
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right min-w-[120px]">
                        <div className="text-[var(--text-muted-alt)] text-[11px] uppercase tracking-wider mb-0.5">
                          Entry Completion
                        </div>
                        <div className="text-[var(--text-main)] font-medium">
                          {inwardFormData.entryCompletionAt
                            ? new Date(
                                inwardFormData.entryCompletionAt,
                              ).toLocaleString()
                            : "-"}
                        </div>
                      </div>
                    </div>

                    {/* Second Punch - Head Supervisor (Conditional) */}
                    {inwardFormData.shortageRecoveryOpt === "Yes" && (
                      <div className="flex flex-wrap gap-6 items-center justify-between p-3 rounded bg-red-900/10 border border-red-500/20">
                        <div className="flex items-center gap-3 flex-wrap flex-1">
                          <div className="w-24 text-red-400 font-medium text-xs">
                            Head Supervisor
                          </div>
                          {inwardFormData.headBiometricData ? (
                            <div className="text-green-400 font-bold bg-green-900/10 border border-green-900/20 px-3 py-1.5 rounded flex items-center gap-2">
                              <ShieldCheck size={16} /> Authenticated
                            </div>
                          ) : (
                            <div className="flex gap-2 items-center">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const xml =
                                      await biometricService.captureAndVerifyLoggedInUser();
                                    setInwardFormData((p: any) => ({
                                      ...p,
                                      headBiometricData: xml,
                                    }));
                                    useUiStore
                                      .getState()
                                      .addToast(
                                        "Head Supervisor Fingerprint Captured Successfully",
                                        "success",
                                      );
                                  } catch (e: any) {
                                    useUiStore
                                      .getState()
                                      .addToast(e.message, "error");
                                  }
                                }}
                                className="bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-500/50 rounded px-4 py-1.5 text-sm font-bold flex items-center gap-2 transition-colors"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
                                  />
                                </svg>
                                Scan Fingerprint
                              </button>
                              <span className="text-xs text-red-400/70">
                                Place finger on device
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-right min-w-[120px]">
                          <div className="text-[var(--text-muted-alt)] text-[11px] uppercase tracking-wider mb-0.5">
                            Date & Time
                          </div>
                          <div className="text-[var(--text-main)] font-medium">
                            {inwardFormData.headBiometricData
                              ? new Date().toLocaleString()
                              : "-"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            {/* Bottom Actions */}
            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setInwardFormData(defaultInwardFormData)}
                className="px-6 py-2.5 border border-[var(--border-subtle)] rounded-lg text-[var(--text-main)] font-bold hover:bg-[var(--glass-bg)]"
              >
                Cancel
              </button>
              {canSavePaddyInward ? (
                <>
                  <button
                    onClick={() => handleInwardSubmit("DRAFT")}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-[var(--bg-panel)] border border-blue-500/30 text-blue-400 rounded-lg font-bold hover:bg-blue-900/20 disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save Draft"}
                  </button>
                  <button
                    onClick={() => {
                      if (!inwardFormData.biometricData) {
                        alert("Supervisor Biometric Verification is required.");
                        return;
                      }
                      if (
                        inwardFormData.shortageRecoveryOpt === "Yes" &&
                        !inwardFormData.headBiometricData
                      ) {
                        alert(
                          "Head Supervisor Biometric Verification is required for Shortage Recovery.",
                        );
                        return;
                      }
                      handleInwardSubmit("CONFIRMED");
                    }}
                    disabled={isSubmitting}
                    className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-[var(--text-main)] rounded-lg font-bold shadow-lg shadow-green-600/20 disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save & Confirm"}
                  </button>
                </>
              ) : (
                <p className="text-sm text-[var(--text-muted-alt)] self-center">
                  This role can view Paddy Inward. Add or Edit is required to save.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Saved Drafts modal — outside tab gates so it opens from Paddy Inward */}
        <CustomModal
          isOpen={draftModalOpen}
          onClose={() => setDraftModalOpen(false)}
          title={`Pending Draft / Hold (${draftInwards.length})`}
          maxWidthClass="max-w-6xl"
          footer={
            <button
              type="button"
              onClick={() => setDraftModalOpen(false)}
              className="px-5 py-2.5 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] text-[var(--text-main)] rounded-lg font-bold"
            >
              Close
            </button>
          }
        >
          {draftsLoading ? (
            <p className="text-sm text-[var(--text-muted-alt)] py-8 text-center">
              Loading drafts…
            </p>
          ) : draftInwards.length === 0 ? (
            <p className="text-sm text-[var(--text-muted-alt)] py-8 text-center">
              No saved drafts for this plant. Fill draft mandatory fields and
              click <b>Save Draft</b>.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs border-collapse min-w-[900px]">
                <thead className="bg-[var(--bg-panel-alt)] text-[var(--text-muted-alt)] uppercase tracking-wider">
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="px-3 py-2.5 text-left font-medium">#</th>
                    <th className="px-3 py-2.5 text-left font-medium">Date</th>
                    <th className="px-3 py-2.5 text-left font-medium">
                      Time In
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium">
                      Truck No
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium">
                      Mill GP
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium">
                      Agency E-GP
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium">RST</th>
                    <th className="px-3 py-2.5 text-left font-medium">Mandi</th>
                    <th className="px-3 py-2.5 text-left font-medium">
                      Party / Artia
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium">
                      Supervisor
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Gross Wt
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Moisture
                    </th>
                    <th className="px-3 py-2.5 text-center font-medium">
                      Status
                    </th>
                    <th className="px-3 py-2.5 text-center font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {draftInwards.map((row, idx) => {
                    const isActive = inwardFormData.id === row.id;
                    return (
                      <tr
                        key={row.id}
                        className={`border-t border-[var(--border-subtle)] hover:bg-amber-500/10 ${
                          isActive ? "bg-amber-500/15" : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-[var(--text-muted-alt)]">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-main)] whitespace-nowrap">
                          {row.date || "-"}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-main)] whitespace-nowrap">
                          {row.timeIn || "-"}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-[var(--text-main)]">
                          {row.truckNo || "-"}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-main)]">
                          {row.millGp || "-"}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-main)]">
                          {row.agencyGp || "-"}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-main)]">
                          {row.rstNo || "-"}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-main)]">
                          {row.mandi || "-"}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-main)]">
                          {row.partyName || row.artiaName || "-"}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-main)]">
                          {row.pahunchPersonName || "-"}
                        </td>
                        <td className="px-3 py-2 font-mono text-right text-[var(--text-main)]">
                          {row.grossWeight ?? "-"}
                        </td>
                        <td className="px-3 py-2 font-mono text-right text-[var(--text-main)]">
                          {row.moisture ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.isHold ? (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300"
                              title={row.holdReason || "On Hold"}
                            >
                              HOLD
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                              {row.status || "DRAFT"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={async () => {
                              setDraftModalOpen(false);
                              await handleContinueDraft(row);
                              if (row.isHold) {
                                useUiStore
                                  .getState()
                                  .addToast(
                                    "Hold entry loaded — complete Net Weight and Confirm. Unloader is locked.",
                                    "info",
                                  );
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold"
                          >
                            <Edit size={12} />
                            {row.isHold ? "Complete Hold" : "Continue"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CustomModal>

        {/* TAB: STACK TO HOODI */}
        {activeTab === "stack_to_hoodi" && (
          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-sm">
            <StackToHoodiTransfer />
          </div>
        )}

        {/* TAB: DRYER BHARAI TO STACK */}
        {activeTab === "dryer_bharai_to_stack" && (
          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-sm">
            <DryerBharaiToStackTransfer />
          </div>
        )}

        {/* TAB: INWARD REGISTER — Feedback 35 dual Govt/Mill lists */}
        {activeTab === "inward_register" && (
          <>
            <InwardListReport
              activePlant={activePlant}
              suppliers={activeSuppliers}
              onView={handleViewInward}
              onContinueDraft={handleContinueDraft}
            />
            {viewInwardModal && (
              <CustomModal
                isOpen={!!viewInwardModal}
                onClose={() => setViewInwardModal(null)}
                title="Full Inward Details"
              >
                <div className="space-y-6 max-h-[75vh] overflow-y-auto px-2">
                  <div className="bg-[var(--bg-base)] p-5 rounded-lg border border-[var(--border-subtle)] shadow-inner">
                    <h3 className="text-sm font-bold text-[#e67e00] mb-4 pb-2 border-b border-[var(--border-subtle)] uppercase tracking-wider">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
                      <div>
                        <p className="text-[var(--text-muted-alt)] text-xs">
                          Purchase No
                        </p>
                        <p className="font-bold text-[var(--text-main)] font-mono">
                          {viewInwardModal.id?.substring(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted-alt)] text-xs">
                          Date
                        </p>
                        <p className="font-bold text-[var(--text-main)]">
                          {viewInwardModal.createdAt
                            ? new Date(
                                viewInwardModal.createdAt,
                              ).toLocaleDateString()
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted-alt)] text-xs">
                          Supplier
                        </p>
                        <p className="font-bold text-[var(--text-main)]">
                          {viewInwardModal.supplier?.name || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted-alt)] text-xs">
                          GP No
                        </p>
                        <p className="font-bold text-[var(--text-main)]">
                          {viewInwardModal.paddyInwardDetails?.gpNo || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted-alt)] text-xs">
                          Mandi EG No
                        </p>
                        <p className="font-bold text-[var(--text-main)]">
                          {viewInwardModal.paddyInwardDetails?.mandiEgNo || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted-alt)] text-xs">
                          Mandi
                        </p>
                        <p className="font-bold text-[var(--text-main)]">
                          {viewInwardModal.paddyInwardDetails?.mandi || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[var(--text-muted-alt)] text-xs">
                          Vehicle / Truck No
                        </p>
                        <p className="font-bold text-[var(--text-main)]">
                          {viewInwardModal.weighbridge?.vehicleNo ||
                            viewInwardModal.paddyInwardDetails?.truckNo ||
                            "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  {viewInwardModal.status === "DRAFT" && (
                    <button
                      onClick={() => handleContinueDraft(viewInwardModal)}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold shadow-lg"
                    >
                      Continue Draft
                    </button>
                  )}
                  <button
                    onClick={() => setViewInwardModal(null)}
                    className="px-5 py-2.5 bg-[#e67e00] hover:bg-[#cc7000] text-white rounded-lg font-bold shadow-lg"
                  >
                    Close
                  </button>
                </div>
              </CustomModal>
            )}
          </>
        )}

        {/* TAB: LOADER & UNLOADER — Feedback 39 system report */}
        {activeTab === "loader_unloader" && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 overflow-auto">
            <LoaderUnloaderReport activePlant={activePlant} />
          </div>
        )}

        {/* TAB: PLANT SETTINGS (GOVT RATE) */}
        {activeTab === "global_settings" && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col h-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Settings className="text-[#e67e00]" /> Plant Settings
                </h2>
                <p className="text-xs text-[var(--text-muted-alt)] mt-1">
                  Configure variables for the selected mill
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-[var(--bg-base)] p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* General Procurement Settings */}
                <div className="bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                  <div className="bg-amber-500/10 px-5 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2">
                    <FileText size={18} className="text-amber-500" />
                    <h3 className="font-bold text-[var(--text-main)]">
                      Procurement Defaults
                    </h3>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Procurement Cut Settings */}
                    <div className="col-span-1 md:col-span-2 bg-[var(--bg-panel-alt)] rounded-xl border border-[var(--border-subtle)] p-6 mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                          <Settings className="w-4 h-4 text-amber-500" />
                          Procurement & Cut Configurations
                        </h4>
                        {!isEditingSettings && canEditSettings && (
                          <button
                            onClick={() => setIsEditingSettings(true)}
                            className="text-amber-500 hover:text-amber-400 px-3 py-1 bg-amber-500/10 rounded font-bold text-xs"
                          >
                            Edit Settings
                          </button>
                        )}
                      </div>

                      {!isEditingSettings ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="sm:col-span-2 lg:col-span-4">
                            <p className="text-xs text-[var(--text-muted-alt)] mb-1">
                              Mill
                            </p>
                            {user?.role === "SUPER_ADMIN" ||
                            plants.length > 1 ? (
                              <select
                                value={activePlant?.id || ""}
                                onChange={(e) => {
                                  const plant = plants.find(
                                    (p: any) => p.id === e.target.value,
                                  );
                                  if (plant) {
                                    setActivePlant(plant);
                                    setIsEditingSettings(false);
                                  }
                                }}
                                className="w-full max-w-md bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-amber-500"
                              >
                                <option value="" disabled>
                                  Select mill…
                                </option>
                                {(plants.length
                                  ? plants
                                  : activePlant
                                    ? [activePlant]
                                    : []
                                ).map((p: any) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <p className="text-xl font-bold text-[var(--text-main)]">
                                {activePlant?.name || "No mill assigned"}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-muted-alt)] mb-1">
                              Govt Purchase Rate
                            </p>
                            <p className="text-xl font-bold text-[var(--text-main)]">
                              ₹{plantSettings.govtRate || "0.00"}
                              <span className="text-xs text-[var(--text-muted)] font-normal ml-1">
                                / Qtl
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-muted-alt)] mb-1">
                              Benchmark Moisture
                            </p>
                            <p className="text-xl font-bold text-[var(--text-main)]">
                              {plantSettings.benchmarkMoisture !== ""
                                ? plantSettings.benchmarkMoisture
                                : "17"}
                              %
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-muted-alt)] mb-1">
                              Safai Cut
                            </p>
                            <p className="text-xl font-bold text-[var(--text-main)]">
                              {plantSettings.safaiCut !== ""
                                ? plantSettings.safaiCut
                                : "2"}
                              %
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-muted-alt)] mb-1">
                              Safai / Patal bag weight
                            </p>
                            <p className="text-xl font-bold text-[var(--text-main)]">
                              {plantSettings.wastageBagWeight !== ""
                                ? plantSettings.wastageBagWeight
                                : "0.382"}
                              <span className="text-xs text-[var(--text-muted)] font-normal ml-1">
                                qtl / bag
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-muted-alt)] mb-1">
                              Processing Cut
                            </p>
                            <p className="text-xl font-bold text-[var(--text-main)]">
                              {plantSettings.processingCut !== ""
                                ? plantSettings.processingCut
                                : "4"}
                              %
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-muted-alt)] mb-1">
                              Paddy Inward — Auto Update Date/Time
                            </p>
                            <p
                              className={`text-xl font-bold ${
                                !plantSettings.allowManualDateTimePaddyInward
                                  ? "text-emerald-400"
                                  : "text-amber-400"
                              }`}
                            >
                              {!plantSettings.allowManualDateTimePaddyInward
                                ? "ON"
                                : "OFF"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-muted-alt)] mb-1">
                              Gate In — Auto Update Date/Time
                            </p>
                            <p
                              className={`text-xl font-bold ${
                                !plantSettings.allowManualDateTimeGateIn
                                  ? "text-emerald-400"
                                  : "text-amber-400"
                              }`}
                            >
                              {!plantSettings.allowManualDateTimeGateIn
                                ? "ON"
                                : "OFF"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-muted-alt)] mb-1">
                              Gate Out — Auto Update Date/Time
                            </p>
                            <p
                              className={`text-xl font-bold ${
                                !plantSettings.allowManualDateTimeGateOut
                                  ? "text-emerald-400"
                                  : "text-amber-400"
                              }`}
                            >
                              {!plantSettings.allowManualDateTimeGateOut
                                ? "ON"
                                : "OFF"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-muted-alt)] mb-1">
                              Stack / Hoodi Transfer — Auto Update
                            </p>
                            <p
                              className={`text-xl font-bold ${
                                !plantSettings.allowManualDateTimeStackTransfer
                                  ? "text-emerald-400"
                                  : "text-amber-400"
                              }`}
                            >
                              {!plantSettings.allowManualDateTimeStackTransfer
                                ? "ON"
                                : "OFF"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="col-span-1 sm:col-span-2 lg:col-span-4">
                            <label className="text-xs text-[var(--text-muted-alt)] mb-1 block">
                              Mill
                            </label>
                            {user?.role === "SUPER_ADMIN" ||
                            plants.length > 1 ? (
                              <select
                                value={activePlant?.id || ""}
                                onChange={(e) => {
                                  const plant = plants.find(
                                    (p: any) => p.id === e.target.value,
                                  );
                                  if (plant) setActivePlant(plant);
                                }}
                                className="w-full max-w-md bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-amber-500"
                              >
                                <option value="" disabled>
                                  Select mill…
                                </option>
                                {(plants.length
                                  ? plants
                                  : activePlant
                                    ? [activePlant]
                                    : []
                                ).map((p: any) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={activePlant?.name || ""}
                                readOnly
                                className="w-full max-w-md bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] opacity-80"
                              />
                            )}
                          </div>
                          <div>
                            <label className="text-xs text-[var(--text-muted-alt)] mb-1 block">
                              Govt Rate (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={plantSettings.govtRate}
                              onChange={(e) =>
                                setPlantSettings({
                                  ...plantSettings,
                                  govtRate: e.target.value,
                                })
                              }
                              className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[var(--text-muted-alt)] mb-1 block">
                              Benchmark Moisture (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={plantSettings.benchmarkMoisture}
                              onChange={(e) =>
                                setPlantSettings({
                                  ...plantSettings,
                                  benchmarkMoisture: e.target.value,
                                })
                              }
                              className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[var(--text-muted-alt)] mb-1 block">
                              Safai Cut (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={plantSettings.safaiCut}
                              onChange={(e) =>
                                setPlantSettings({
                                  ...plantSettings,
                                  safaiCut: e.target.value,
                                })
                              }
                              className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[var(--text-muted-alt)] mb-1 block">
                              Safai / Patal average bag weight (Qtl)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={plantSettings.wastageBagWeight}
                              onChange={(e) =>
                                setPlantSettings({
                                  ...plantSettings,
                                  wastageBagWeight: e.target.value,
                                })
                              }
                              className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[var(--text-muted-alt)] mb-1 block">
                              Processing Cut (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={plantSettings.processingCut}
                              onChange={(e) =>
                                setPlantSettings({
                                  ...plantSettings,
                                  processingCut: e.target.value,
                                })
                              }
                              className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-4">
                            <div>
                              <p className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wide">
                                Auto Update Date &amp; Time (mill-wise ON/OFF)
                              </p>
                              <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">
                                When Auto Update is <b>ON</b>, Date/Time fields
                                are locked and stamp on fingerprint. When{" "}
                                <b>OFF</b>, supervisors may enter Date/Time
                                manually for that form. For Stack ↔ Hoodi /
                                Dryer Bharai, OFF also allows punching Gross/Tare
                                manually; ON requires Fetch WB or a pending truck.
                                Paddy Inward Gross/Tare can always be punched or
                                fetched.
                              </p>
                            </div>

                            {(
                              [
                                {
                                  key: "allowManualDateTimePaddyInward",
                                  label: "Paddy Inward",
                                },
                                {
                                  key: "allowManualDateTimeGateIn",
                                  label: "Gate In",
                                },
                                {
                                  key: "allowManualDateTimeGateOut",
                                  label: "Gate Out",
                                },
                                {
                                  key: "allowManualDateTimeStackTransfer",
                                  label: "Stack ↔ Hoodi / Dryer Bharai Transfer",
                                },
                              ] as const
                            ).map((row) => {
                              const manualOn = !!(plantSettings as any)[
                                row.key
                              ];
                              const autoOn = !manualOn;
                              return (
                                <div
                                  key={row.key}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] px-4 py-3"
                                >
                                  <div>
                                    <div className="text-sm font-medium text-[var(--text-main)]">
                                      {row.label}
                                    </div>
                                    <div className="text-[10px] text-[var(--text-muted-alt)]">
                                      Auto Update Date &amp; Time:{" "}
                                      <span
                                        className={
                                          autoOn
                                            ? "text-emerald-400 font-bold"
                                            : "text-amber-400 font-bold"
                                        }
                                      >
                                        {autoOn ? "ON" : "OFF"}
                                      </span>
                                      {manualOn
                                        ? " (manual entry allowed)"
                                        : " (locked / auto stamp)"}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={autoOn}
                                    title="Toggle Auto Update Date & Time"
                                    onClick={() =>
                                      setPlantSettings({
                                        ...plantSettings,
                                        [row.key]: autoOn,
                                      })
                                    }
                                    className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors ${
                                      autoOn ? "bg-emerald-500" : "bg-gray-600"
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                        autoOn
                                          ? "translate-x-8"
                                          : "translate-x-1"
                                      }`}
                                    />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex justify-end gap-3 mt-2">
                            <button
                              onClick={() => setIsEditingSettings(false)}
                              className="bg-[var(--bg-panel)] hover:bg-[var(--glass-bg)] border border-[var(--border-subtle)] text-[var(--text-main)] px-4 py-2 rounded-lg font-bold text-sm transition-all"
                            >
                              Cancel
                            </button>
                            {canEditSettings && (
                              <button
                                onClick={handleUpdateSettings}
                                className="bg-amber-500 hover:bg-amber-600 text-black px-6 py-2 rounded-lg font-bold shadow-md text-sm transition-all"
                              >
                                Save Changes
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      <p className="text-[10px] text-[var(--text-muted-alt)] mt-4 pt-3 border-t border-[var(--border-subtle)]">
                        These settings are applied globally to this active plant
                        and directly affect the Overpriced Purchase Tagging
                        algorithms.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: QUALITY INSPECTION DESK */}
        {activeTab === "quality_inspection" && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)]">
              <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                <ShieldCheck className="text-[#e67e00]" /> Quality Inspection
                Desk
              </h2>
              <button
                onClick={async () => {
                  try {
                    const params = new URLSearchParams();
                    params.append("limit", "1000000");
                    params.append("page", "1");
                    const pid = activePlant?.id || "global";

                    const res = await api.get(
                      `/api/procurement/recent/${pid}?${params.toString()}`,
                    );
                    const data = Array.isArray(res.data)
                      ? res.data
                      : res.data?.data || [];
                    const pendingItems = data.filter(
                      (p: any) =>
                        p.qcStatus === "PENDING" || p.qcStatus === "Pending",
                    );

                    const exportData = pendingItems.map((item: any) => ({
                      "Purchase No": item.purchaseNo,
                      Date: item.date,
                      Supplier: item.supplierName || item.supplier,
                      "Net Wt": item.netWeight,
                      Moisture: item.moisture,
                      "QC Status": item.qcStatus,
                    }));
                    exportToExcel(exportData, `Quality_Inspection_Full`);
                  } catch (error) {
                    console.error("Failed to export all records", error);
                  }
                }}
                className="flex items-center gap-2 bg-[#107c41] text-white px-3 py-1.5 rounded hover:bg-[#1f8c51] transition-colors text-sm font-medium"
              >
                <Download size={16} /> Export All to Excel
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-[var(--bg-base)] p-6">
              <table className="w-full border-collapse text-[var(--text-muted)] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] uppercase text-[var(--text-muted-alt)] text-left">
                    <th className="p-3">Purchase No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Supplier</th>
                    <th className="p-3">Net Wt</th>
                    <th className="p-3">Moisture</th>
                    <th className="p-3">QC Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPurchases
                    .filter(
                      (p) =>
                        p.qcStatus === "PENDING" || p.qcStatus === "Pending",
                    )
                    .map((p, i) => (
                      <tr
                        key={i}
                        className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)]"
                      >
                        <td className="p-3 font-mono text-xs">
                          {p.purchaseNo}
                        </td>
                        <td className="p-3">{p.date}</td>
                        <td className="p-3 font-bold text-[var(--text-main)]">
                          {p.supplier}
                        </td>
                        <td className="p-3 text-right">{p.netWeight} MT</td>
                        <td className="p-3 text-right">{p.moisture}%</td>
                        <td className="p-3">
                          <span className="px-2 py-1 rounded bg-yellow-900/50 text-yellow-400 text-xs font-bold">
                            Pending
                          </span>
                        </td>
                        <td className="p-3">
                          {canEditQuality && (
                            <button
                              onClick={() =>
                                setInspectModal({
                                  isOpen: true,
                                  batchId: p.purchaseNo,
                                  moisture: p.moisture || 0,
                                  broken: p.broken || 0,
                                  discoloration: 0,
                                  foreignMatter: 0,
                                })
                              }
                              className="bg-[#e67e00] text-black px-3 py-1 rounded text-xs font-bold"
                            >
                              Inspect
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  {recentPurchases.filter(
                    (p) => p.qcStatus === "PENDING" || p.qcStatus === "Pending",
                  ).length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-6 text-center text-[var(--text-muted-alt)]"
                      >
                        No pending inspections.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <Pagination
                currentPage={recentPurchasesCurrentPage}
                totalItems={recentPurchasesTotalItems}
                onPageChange={setRecentPurchasesCurrentPage}
              />
            </div>
          </div>
        )}

        {/* TAB 4: SODA PENDING */}
        {activeTab === "purchase_register" && (
          <div className="flex flex-col gap-6 h-full overflow-y-auto">
            {/* Hisab / Paddy Soda Pending */}
            <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col shrink-0">
              <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)]">
                <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  <FileText className="text-[#e67e00]" /> Hisab / Paddy Soda
                  Pending
                </h2>
                <button
                  onClick={async () => {
                    try {
                      const params = new URLSearchParams();
                      if (listFilters.dateFrom)
                        params.append("dateFrom", listFilters.dateFrom);
                      if (listFilters.dateTo)
                        params.append("dateTo", listFilters.dateTo);
                      if (listFilters.mandi)
                        params.append("mandi", listFilters.mandi);
                      if (listFilters.supplierId)
                        params.append("supplierId", listFilters.supplierId);
                      params.append("limit", "1000000");
                      params.append("page", "1");
                      const pid = activePlant?.id || "global";

                      const res = await api.get(
                        `/api/procurement/soda-pending/${pid}?${params.toString()}`,
                      );
                      const data = Array.isArray(res.data)
                        ? res.data
                        : res.data?.data || [];

                      const exportData = data.map((item: any) => {
                        const row: Record<string, any> = {
                        Party: item.partyMandi,
                        Date: item.date,
                        Bags: item.bags,
                        "Govt Rate": item.govtRate,
                        Rate: item.rate,
                        };
                        if (!hidePaymentHisab) {
                          row.Diff = item.diff;
                          row.Payment = item.payment;
                          row["Final Hisab Amt"] = item.finalHisabAmt;
                        }
                        return row;
                      });
                      exportToExcel(exportData, "Soda_Pending_Full.xlsx");
                    } catch (error) {
                      console.error("Failed to export all records", error);
                    }
                  }}
                  className="text-blue-500 hover:text-blue-400 text-xs font-bold flex items-center gap-1 bg-[var(--bg-base)] px-2 py-1 rounded border border-[var(--border-subtle)]"
                >
                  <Download size={14} /> Export
                </button>
              </div>

              <div className="flex-1 overflow-auto bg-[var(--bg-panel)] rounded-b-xl">
                <table className="w-full border-collapse text-[var(--text-muted)] text-sm">
                  <thead>
                    <tr className="bg-[var(--bg-panel-alt)] font-bold uppercase text-xs text-[var(--text-muted-alt)]">
                      <th className="border-b border-[var(--border-subtle)] p-3 text-left font-medium">
                        Party - Supplier
                      </th>
                      <th className="border-b border-[var(--border-subtle)] p-3 text-left font-medium">
                        Date
                      </th>
                      <th className="border-b border-[var(--border-subtle)] p-3 text-right font-medium">
                        Mc
                      </th>
                      <th className="border-b border-[var(--border-subtle)] p-3 text-right font-medium">
                        Bags
                      </th>
                      <th className="border-b border-[var(--border-subtle)] p-3 text-right font-medium">
                        Govt Rate
                      </th>
                      <th className="border-b border-[var(--border-subtle)] p-3 text-right font-medium">
                        Rate
                      </th>
                      {!hidePaymentHisab && (
                        <>
                      <th className="border-b border-[var(--border-subtle)] p-3 text-right font-medium">
                        Diff
                      </th>
                      <th className="border-b border-[var(--border-subtle)] p-3 text-right font-medium">
                        Payment
                      </th>
                        </>
                      )}
                      <th className="border-b border-[var(--border-subtle)] p-3 text-left font-medium">
                        Note
                      </th>
                      {!hidePaymentHisab && (
                      <th className="border-b border-[var(--border-subtle)] p-3 text-right text-[#e67e00] font-bold">
                        Final Hisab Amt
                      </th>
                      )}
                      <th className="border-b border-[var(--border-subtle)] p-3 text-center font-medium">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSodaPending.map((p, i) => (
                      <tr
                        key={p.id}
                        className={`border-b border-[var(--border-subtle-alt)] transition-colors hover:bg-[var(--glass-bg)] ${i % 2 === 0 ? "bg-[var(--bg-panel)]" : "bg-[var(--bg-panel-hover)]"}`}
                      >
                        <td className="p-3 font-medium text-[var(--text-main)]">
                          {p.partyMandi}
                        </td>
                        <td className="p-3">
                          {new Date(p.date).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          {p.bolis?.length ? (
                            <button
                              onClick={() =>
                                setViewBolisModal({
                                  isOpen: true,
                                  bolis: p.bolis,
                                  partyMandi: p.partyMandi,
                                  date: p.date,
                                })
                              }
                              className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/30"
                            >
                              View {p.bolis.length} Bolis
                            </button>
                          ) : (
                            p.mc
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-[var(--text-muted)]">
                          {p.bolis?.length ? "-" : p.bags}
                        </td>
                        <td className="p-3 text-right text-[var(--text-muted)]">
                          {p.govtRate || "-"}
                        </td>
                        <td className="p-3 text-right font-bold text-[var(--text-muted)]">
                          {p.bolis?.length ? "-" : p.rate}
                        </td>
                        {!hidePaymentHisab && (
                          <>
                        <td className="p-3 text-right text-red-400 font-medium">
                          {p.diff}
                        </td>
                        <td className="p-3 text-right">{p.payment}</td>
                          </>
                        )}
                        <td className="p-3 text-[var(--text-muted-alt)]">
                          {p.note}
                        </td>
                        {!hidePaymentHisab && (
                        <td className="p-3 text-right font-bold text-[#e67e00]">
                          {p.finalHisabAmt}
                        </td>
                        )}
                        <td className="p-3 text-center">
                          {canSettleHisab ? (
                            <button
                              onClick={() =>
                                setSettleHisabModal({
                                  isOpen: true,
                                  hisab: p,
                                  payment: p.payment?.toString() || "",
                                  note: p.note || "",
                                  finalHisabAmt:
                                    p.finalHisabAmt?.toString() || "",
                                })
                              }
                              className="px-3 py-1 bg-[#e67e00] hover:bg-[#cc7000] text-black rounded font-bold text-xs transition-colors"
                            >
                              Settle
                            </button>
                          ) : (
                            <span
                              className="text-[10px] text-[var(--text-muted-alt)]"
                              title="Hisab from Final Bags (Table 01)"
                            >
                              View only
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredSodaPending.length === 0 && (
                      <tr>
                        <td
                          colSpan={hidePaymentHisab ? 8 : 11}
                          className="p-6 text-center text-[var(--text-muted-alt)] font-medium italic border-b border-[var(--border-subtle-alt)]"
                        >
                          No outstanding pending Hisabs found. Try adding a Boli
                          purchase!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <Pagination
                  currentPage={sodaPendingCurrentPage}
                  totalItems={sodaPendingTotalItems}
                  onPageChange={setSodaPendingCurrentPage}
                />
              </div>
            </div>
          </div>
        )}
        {activeTab === "reports" && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col min-h-0 shadow-2xl">
            <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel-hover)]">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  <FileText className="text-[#e67e00]" /> Reports
                </h2>
                <p className="text-xs text-[var(--text-muted-alt)] mt-1">
                  View various procurement reports
                </p>

                {isSupervisor && unrecoveredShortagesCount > 0 && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} />
                      <span>
                        You have{" "}
                        <strong>
                          {unrecoveredShortagesCount} unrecovered shortage(s)
                        </strong>
                        . Please check the <strong>Shortage Recovery</strong>{" "}
                        tab.
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setListFilters((prev) => ({
                          ...prev,
                          activeReportTab: "shortage_recovery",
                        }))
                      }
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors"
                    >
                      View Now
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-col p-6 bg-[var(--bg-base)]">
              {/* 
        IMPORTANT: DO NOT REMOVE THIS LOGIC.
        By default, no report tab is selected/opened when the Reports section is loaded.
        Data should only be shown when a specific report tab is explicitly clicked by the user.
        Please keep this empty default state for future modifications!
     */}

              {/* Reports Inner Navigation */}
              <div className="flex border-b border-[var(--border-subtle)] mb-6">
                {[
                  "shortage_recovery",
                  "daily_inward_summary",
                  "mandi_balance",
                  "hoodi_report",
                  "paddy_stack",
                  "stack_layout",
                ].map((reportTab) => (
                  <button
                    key={reportTab}
                    onClick={() =>
                      setListFilters((prev) => ({
                        ...prev,
                        activeReportTab: reportTab,
                      }))
                    }
                    className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
                      listFilters.activeReportTab === reportTab
                        ? "border-[#e67e00] text-[#e67e00]"
                        : "border-transparent text-[var(--text-muted-alt)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    {reportTab
                      .split("_")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}
                  </button>
                ))}
              </div>

              {/* Reports Content */}
              <div
                className={`flex-1 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] p-6 flex flex-col overflow-auto min-h-0 min-w-0 ${!listFilters.activeReportTab ? "items-center justify-center" : ""}`}
              >
                {!listFilters.activeReportTab ? (
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-[#e67e00]/10 text-[#e67e00] rounded-full flex items-center justify-center">
                      <FileText size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-main)]">
                      Select a Report
                    </h3>
                    <p className="text-[var(--text-muted-alt)] mt-2 max-w-md mx-auto">
                      Please click on one of the report tabs above to view its
                      data.
                    </p>
                  </div>
                ) : listFilters.activeReportTab === "shortage_recovery" ? (
                  <ShortageRecoveryReport activePlant={activePlant} />
                ) : listFilters.activeReportTab === "daily_inward_summary" ? (
                  <DailyInwardSummary activePlant={activePlant} />
                ) : listFilters.activeReportTab === "mandi_balance" ? (
                  <MandiBalanceDashboard />
                ) : listFilters.activeReportTab === "hoodi_report" ? (
                  <DailyHoodiReport />
                ) : listFilters.activeReportTab === "stack_layout" ? (
                  <StackLayoutView plantId={activePlant?.id || ""} />
                ) : listFilters.activeReportTab === "paddy_stack" ? (
                  <div
                    className="w-full flex flex-col h-full"
                    id="paddy-stack-print-root"
                  >
                    <div className="flex justify-between items-center mb-4 print:mb-2">
                      <h3 className="text-lg font-bold text-[var(--text-main)]">
                        Paddy Stock Documentation
                        {activePlant?.name ? (
                          <span className="text-sm font-normal text-[var(--text-muted-alt)] ml-2">
                            — {activePlant.name}
                          </span>
                        ) : null}
                      </h3>
                      <div className="flex gap-2 print:hidden">
                        <button
                          type="button"
                          onClick={() => fetchPaddyStockReport()}
                          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-panel-alt)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-main)] rounded border border-[var(--border-subtle)] text-sm transition-colors"
                          title="Reload from mill stack data"
                        >
                          Refresh
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const root = document.getElementById(
                              "paddy-stack-print-root",
                            );
                            if (!root) {
                              window.print();
                              return;
                            }
                            const win = window.open(
                              "",
                              "_blank",
                              "noopener,noreferrer,width=1100,height=800",
                            );
                            if (!win) {
                              useUiStore
                                .getState()
                                .addToast(
                                  "Pop-up blocked — allow pop-ups to print",
                                  "error",
                                );
                              return;
                            }
                            win.document
                              .write(`<!DOCTYPE html><html><head><title>Paddy Stack — ${activePlant?.name || "Mill"}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:16px;color:#111}
  h3{margin:0 0 12px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #ccc;padding:8px;text-align:left}
  th{background:#f3f4f6}
  .no-print{display:none!important}
  @media print{button{display:none!important}}
</style></head><body>`);
                            const clone = root.cloneNode(true) as HTMLElement;
                            clone
                              .querySelectorAll(".print\\:hidden, button")
                              .forEach((el) => el.remove());
                            win.document.write(clone.innerHTML);
                            win.document.write("</body></html>");
                            win.document.close();
                            win.focus();
                            setTimeout(() => {
                              win.print();
                              win.close();
                            }, 250);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-panel-alt)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-main)] rounded border border-[var(--border-subtle)] text-sm transition-colors"
                        >
                          <Printer size={16} /> Print
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const headers = [
                              "Date",
                              "Op bal",
                              "At Stack",
                              "Dryer Bharai",
                              "Total",
                              "Hoodi Katai",
                              "Out",
                              "Cl stock",
                              "Stack no. in use",
                            ];
                            const rows =
                              paddyStackDocRows.length > 0
                                ? paddyStackDocRows.map((r: any) => [
                                    r.date,
                                    r.opBal,
                                    r.atStack,
                                    r.dryerBharai,
                                    r.total,
                                    r.hoodiKatai,
                                    r.out,
                                    r.clStock,
                                    r.stacksInUse,
                                  ])
                                : [["", "0", "0", "0", "0", "0", "0", "0", ""]];
                            const csv = [headers, ...rows]
                              .map((r) =>
                                r
                                  .map(
                                    (c) =>
                                      `"${String(c ?? "").replace(/"/g, '""')}"`,
                                  )
                                  .join(","),
                              )
                              .join("\n");
                            const blob = new Blob([csv], {
                              type: "text/csv;charset=utf-8;",
                            });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `paddy-stack-${activePlant?.code || activePlant?.name || "mill"}.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                            useUiStore
                              .getState()
                              .addToast("Paddy Stack CSV exported", "success");
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-[#e67e00] hover:bg-[#cc7000] text-black rounded border border-[#e67e00]/40 text-sm font-bold transition-colors"
                        >
                          <Download size={16} /> Export
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[var(--bg-panel-hover)] border-b border-[var(--border-subtle)]">
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]"></th>
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                              A
                            </th>
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                              B
                            </th>
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                              C
                            </th>
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                              D
                            </th>
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                              E
                            </th>
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                              F
                            </th>
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                              G
                            </th>
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)]">
                              H
                            </th>
                          </tr>
                          <tr className="bg-[var(--bg-panel-hover)] border-b border-[var(--border-subtle)]">
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                              Date
                            </th>
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                              Op bal
                            </th>
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                              At Stack
                            </th>
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                              Dryer Bharai
                            </th>
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                              Total
                              <br />
                              <span className="text-xs text-[var(--text-muted-alt)] font-normal">
                                =A+B+C
                              </span>
                            </th>
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                              Hoodi Katai
                            </th>
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                              Out
                            </th>
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                              Cl stock
                              <br />
                              <span className="text-xs text-[var(--text-muted-alt)] font-normal">
                                =D-(E+F)
                              </span>
                            </th>
                            <th className="p-3 text-sm font-semibold text-[var(--text-main)]">
                              Stack no. in use
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {paddyStackDocRows.length === 0 ? (
                            <tr className="border-b border-[var(--border-subtle)]">
                              <td
                                colSpan={9}
                                className="p-4 text-center text-sm text-[var(--text-muted-alt)]"
                              >
                                No stack documentation for this mill yet.
                              </td>
                            </tr>
                          ) : (
                            paddyStackDocRows.map((r: any) => (
                              <tr
                                key={r.date}
                                className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-panel-hover)] transition-colors"
                              >
                                <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                                  {r.date}
                                </td>
                                <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                                  {r.opBal}
                                </td>
                                <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                                  {r.atStack}
                                </td>
                                <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                                  {r.dryerBharai}
                                </td>
                                <td className="p-3 text-sm font-bold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                                  {r.total}
                                </td>
                                <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                                  {r.hoodiKatai}
                                </td>
                                <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                                  {r.out}
                                </td>
                                <td className="p-3 text-sm font-bold text-[#e67e00] border-r border-[var(--border-subtle)]">
                                  {r.clStock}
                                </td>
                                <td className="p-3 text-sm text-[var(--text-main)]">
                                  {r.stacksInUse}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    {paddyStackDryerDetail.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-bold text-[var(--text-main)] mb-2">
                          Today&apos;s Dryer Bharai to Stack
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="bg-[var(--bg-panel-hover)] border-b border-[var(--border-subtle)]">
                                <th className="p-3 font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                                  Stack No.
                                </th>
                                <th className="p-3 font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                                  Bags
                                </th>
                                <th className="p-3 font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                                  Moisture
                                </th>
                                <th className="p-3 font-semibold text-[var(--text-main)] border-r border-[var(--border-subtle)]">
                                  Net Weight (MT)
                                </th>
                                <th className="p-3 font-semibold text-[var(--text-main)]">
                                  RST No.
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {paddyStackDryerDetail.map((d: any) => (
                                <tr
                                  key={d.id}
                                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-panel-hover)]"
                                >
                                  <td className="p-3 border-r border-[var(--border-subtle)]">
                                    {d.stackNo}
                                  </td>
                                  <td className="p-3 border-r border-[var(--border-subtle)] font-mono">
                                    {d.bags}
                                  </td>
                                  <td className="p-3 border-r border-[var(--border-subtle)]">
                                    {d.moisture != null ? `${d.moisture}%` : "—"}
                                  </td>
                                  <td className="p-3 border-r border-[var(--border-subtle)] font-mono">
                                    {d.netWeight != null
                                      ? Number(d.netWeight).toFixed(3)
                                      : "—"}
                                  </td>
                                  <td className="p-3 font-mono">{d.rstNo || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center w-full h-full flex flex-col justify-center items-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-[#e67e00]/10 text-[#e67e00] rounded-full flex items-center justify-center">
                      <FileText size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-main)]">
                      {listFilters.activeReportTab
                        .split("_")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}{" "}
                      Report
                    </h3>
                    <p className="text-[var(--text-muted-alt)] mt-2 max-w-md mx-auto">
                      This report is currently being developed. Data
                      visualization and export options will appear here once
                      ready.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      <CustomModal
        isOpen={paddyPurchaseModal.isOpen}
        onClose={() => {
          if (isPaddyPurchaseSaving) return;
          setPaddyPurchaseModal(emptyPaddyPurchaseModal());
        }}
        title={
          paddyPurchaseModal.id
            ? "Edit Estimate Purchase"
            : "Add Estimate Purchase"
        }
      >
        <form onSubmit={handlePaddyPurchaseSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                Rice Mill
              </label>
              {isSupervisor || (activePlant && user?.role !== "SUPER_ADMIN") ? (
                <div className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] font-medium">
                  {activePlant?.name || "Assigned mill"}
                  <input
                    type="hidden"
                    value={paddyPurchaseModal.plantId || activePlant?.id || ""}
                    readOnly
                  />
                </div>
              ) : (
                <select
                  value={paddyPurchaseModal.plantId}
                  onChange={(e) => {
                    const plantId = e.target.value;
                    setPaddyPurchaseModal({
                      ...paddyPurchaseModal,
                      plantId,
                      supplierId: "",
                    });
                    if (plantId) {
                      fetchSuppliers(plantId);
                      fetchPlantSupervisors(plantId);
                    }
                  }}
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                  required
                >
                  <option value="">Select Plant</option>
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                Party - Arthiya
              </label>
              <Combobox
                name="supplierId"
                value={paddyPurchaseModal.supplierId}
                onChange={(e: any) =>
                  setPaddyPurchaseModal({
                    ...paddyPurchaseModal,
                    supplierId: e.target.value,
                  })
                }
                options={activeSuppliers}
                valueKey="id"
                placeholder="Select Arthiya (this mill)"
                className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                Date
              </label>
              <input
                type="date"
                value={paddyPurchaseModal.date}
                onChange={(e) =>
                  setPaddyPurchaseModal({
                    ...paddyPurchaseModal,
                    date: e.target.value,
                  })
                }
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                M/C Point (₹ / 1% moisture)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paddyPurchaseModal.mcPoint || ""}
                readOnly
                title="From Admin Mandi Base Rates — ₹ impact per 1% moisture (e.g. base 2200, M/C Point 50)"
                placeholder="From Admin bulletin"
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] opacity-80 cursor-not-allowed"
              />
              <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">
                Auto-filled from Admin Mandi rate for this Date + Mandi.
              </p>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                Supervisor Name
              </label>
              <select
                value={paddyPurchaseModal.supervisorName || ""}
                onChange={(e) => {
                  const name = e.target.value;
                  const match = plantSupervisors.find(
                    (s) => s.username === name,
                  );
                  setPaddyPurchaseModal({
                    ...paddyPurchaseModal,
                    supervisorName: name,
                    supervisorUserId: match?.id || "",
                  });
                }}
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                required
              >
                <option value="">Select Supervisor</option>
                {isSupervisor ? (
                  user?.username ? (
                    <option value={user.username}>{user.username}</option>
                  ) : null
                ) : (
                  plantSupervisors.map((s) => (
                    <option key={s.id} value={s.username}>
                      {s.username}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div
              className={`col-span-2 border border-[var(--border-subtle)] rounded p-4 space-y-4 transition-opacity duration-300 ${!isPaddyBlock1Valid ? "opacity-40 pointer-events-none" : ""}`}
            >
              {String(paddyPurchaseModal.note || "").startsWith("TEMP:") && (
                <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  Temporary sample Boli rows are pre-filled for testing. Edit or
                  clear before saving a real estimate.
                </div>
              )}
              <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-[var(--text-main)]">
                  Boli Details (leave unused rows empty
                  {!isSupervisor ? "; use 0 bags to cancel" : ""})
                </h3>
                <span className="text-[10px] text-[var(--text-muted-alt)]">
                  {isSupervisor
                    ? "← → or Enter → next column · Cancel soda only in Add Final Boli"
                    : "← → or Enter → next column (Rate → next Boli row)"}
                </span>
              </div>
              <div data-boli-grid className="space-y-4">
                {paddyPurchaseModal.bolis.map((boli: any, index: number) => {
                  const bagsCancelled = String(boli.bags ?? "").trim() === "0";
                  return (
                    <div
                      key={index}
                      className="grid grid-cols-2 sm:grid-cols-3 gap-2 items-end"
                    >
                      <div>
                        {!bagsCancelled && (
                          <label className="block text-xs text-[var(--text-muted-alt)] mb-1">
                            Moisture (Mc)
                          </label>
                        )}
                        <input
                          type="text"
                          inputMode="decimal"
                          data-boli-cell={`${index}-moisture`}
                          value={bagsCancelled ? "" : boli.moisture}
                          disabled={bagsCancelled}
                          onKeyDown={(e) =>
                            focusNextBoliField(e, index, "moisture")
                          }
                          onChange={(e) => {
                            const newBolis = [...paddyPurchaseModal.bolis];
                            newBolis[index].moisture = e.target.value;
                            setPaddyPurchaseModal({
                              ...paddyPurchaseModal,
                              bolis: newBolis,
                            });
                          }}
                          placeholder={bagsCancelled ? "Cancelled" : undefined}
                          className={`w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-[var(--text-main)] text-sm ${
                            bagsCancelled ? "opacity-40 cursor-not-allowed" : ""
                          }`}
                        />
                      </div>
                      <div>
                        {!bagsCancelled && (
                          <label className="block text-xs text-[var(--text-muted-alt)] mb-1">
                            {isSupervisor ? "Bags" : "Bags (0=cancel)"}
                          </label>
                        )}
                        <input
                          type="text"
                          inputMode="numeric"
                          data-boli-cell={`${index}-bags`}
                          value={boli.bags}
                          onKeyDown={(e) =>
                            focusNextBoliField(e, index, "bags")
                          }
                          onChange={(e) => {
                            const newBolis = [...paddyPurchaseModal.bolis];
                            newBolis[index].bags = e.target.value;
                            const totalBags = newBolis.reduce(
                              (s, b) => s + (parseFloat(b.bags) || 0),
                              0,
                            );
                            const finalAmt = (
                              totalBags *
                              0.375 *
                              (parseFloat(paddyPurchaseModal.diff) || 0)
                            ).toFixed(2);
                            setPaddyPurchaseModal({
                              ...paddyPurchaseModal,
                              bolis: newBolis,
                              finalHisabAmt: finalAmt,
                            });
                          }}
                          className={`w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-[var(--text-main)] text-sm ${
                            bagsCancelled ? "opacity-50" : ""
                          }`}
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          {!bagsCancelled && (
                            <label className="block text-xs text-[var(--text-muted-alt)] mb-1">
                              Price (Boli Rate)
                            </label>
                          )}
                          <input
                            type="text"
                            inputMode="decimal"
                            data-boli-cell={`${index}-rate`}
                            value={bagsCancelled ? "" : boli.rate}
                            disabled={bagsCancelled}
                            onKeyDown={(e) =>
                              focusNextBoliField(e, index, "rate")
                            }
                            onChange={(e) => {
                              const newBolis = [...paddyPurchaseModal.bolis];
                              newBolis[index].rate = e.target.value;
                              const r = parseFloat(e.target.value) || 0;
                              const g =
                                parseFloat(paddyPurchaseModal.govtRate) || 0;

                              let diff = paddyPurchaseModal.diff;
                              if (index === 0 && g && r) {
                                diff = (g - r).toFixed(2);
                              }

                              const totalBags = newBolis.reduce(
                                (s, b) => s + (parseFloat(b.bags) || 0),
                                0,
                              );
                              const finalAmt = (
                                totalBags *
                                0.375 *
                                (parseFloat(diff) || 0)
                              ).toFixed(2);

                              setPaddyPurchaseModal({
                                ...paddyPurchaseModal,
                                bolis: newBolis,
                                diff,
                                finalHisabAmt: finalAmt,
                              });
                            }}
                            className={`w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm font-bold text-[var(--text-main)] ${
                              bagsCancelled
                                ? "opacity-40 cursor-not-allowed"
                                : ""
                            }`}
                          />
                        </div>
                        {paddyPurchaseModal.bolis.length > 1 &&
                          !bagsCancelled && (
                            <button
                              type="button"
                              onClick={() => {
                                const newBolis =
                                  paddyPurchaseModal.bolis.filter(
                                    (_: any, i: number) => i !== index,
                                  );
                                const totalBags = newBolis.reduce(
                                  (s: number, b: any) =>
                                    s + (parseFloat(b.bags) || 0),
                                  0,
                                );
                                const finalAmt = (
                                  totalBags *
                                  0.375 *
                                  (parseFloat(paddyPurchaseModal.diff) || 0)
                                ).toFixed(2);
                                setPaddyPurchaseModal({
                                  ...paddyPurchaseModal,
                                  bolis: newBolis,
                                  finalHisabAmt: finalAmt,
                                });
                              }}
                              className="mb-0.5 px-2 py-1.5 text-red-400 hover:bg-red-400/10 rounded"
                            >
                              ✕
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end mt-2 pt-2 border-t border-[var(--border-subtle-alt)]">
                <button
                  type="button"
                  onClick={() => {
                    setPaddyPurchaseModal({
                      ...paddyPurchaseModal,
                      bolis: [
                        ...paddyPurchaseModal.bolis,
                        {
                          moisture: "",
                          bags: "",
                          todayRate: paddyPurchaseModal.todayRate || "",
                          rate: "",
                        },
                      ],
                    });
                  }}
                  className="text-xs bg-[var(--bg-panel)] text-[#e67e00] px-3 py-1 rounded font-bold border border-[#e67e00]/30 hover:bg-[#e67e00]/10 transition-colors"
                >
                  + Add Boli
                </button>
              </div>
            </div>

            {!isSupervisor && (
              <>
                <div>
                  <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                    Govt Rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paddyPurchaseModal.govtRate || ""}
                    onChange={(e) => {
                      const govtRate = e.target.value;
                      const g = parseFloat(govtRate) || 0;
                      const firstRate =
                        parseFloat(paddyPurchaseModal.bolis[0]?.rate) || 0;
                      const diff =
                        g && firstRate
                          ? (g - firstRate).toFixed(2)
                          : paddyPurchaseModal.diff;

                      const totalBags = paddyPurchaseModal.bolis.reduce(
                        (s: number, b: any) => s + (parseFloat(b.bags) || 0),
                        0,
                      );
                      const finalAmt = (
                        totalBags *
                        0.375 *
                        (parseFloat(diff) || 0)
                      ).toFixed(2);

                      setPaddyPurchaseModal({
                        ...paddyPurchaseModal,
                        govtRate,
                        diff,
                        finalHisabAmt: finalAmt,
                      });
                    }}
                    className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                    Diff (Govt − Boli Rate)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paddyPurchaseModal.diff}
                    readOnly
                    title="Payment difference is always Govt. Paddy Rate − Boli Rate"
                    className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] opacity-80 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">
                    Payment difference uses Govt. Paddy Rate only (not Mandi
                    Today Rate).
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                    Payment
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paddyPurchaseModal.payment}
                    onChange={(e) =>
                      setPaddyPurchaseModal({
                        ...paddyPurchaseModal,
                        payment: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                    Final Hisab Amt
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paddyPurchaseModal.finalHisabAmt}
                    onChange={(e) =>
                      setPaddyPurchaseModal({
                        ...paddyPurchaseModal,
                        finalHisabAmt: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                  />
                  {paddyPurchaseModal.bolis.length > 0 &&
                    paddyPurchaseModal.diff && (
                      <div className="mt-2 text-xs text-[var(--text-muted)] bg-blue-900/10 p-2 rounded border border-blue-900/20 text-blue-400">
                        <span className="font-semibold block mb-1">
                          Payment note (Feedback 32):
                        </span>
                        Payment &amp; Final Hisab use <b>Final Bags</b> after
                        Add Final Boli:
                        <br />
                        Payment = (Govt − Boli Rate) × (Final Bags × 0.375)
                        <br />
                        e.g. (2441 − 2100) × (120 × 0.375) = 15,345 per line.
                        Final Hisab = total Payment for that Boli No. Estimate
                        bags are not used for Payment.
                      </div>
                    )}
                </div>
              </>
            )}
            <div className="col-span-2">
              <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                Note
              </label>
              <input
                type="text"
                value={paddyPurchaseModal.note}
                onChange={(e) =>
                  setPaddyPurchaseModal({
                    ...paddyPurchaseModal,
                    note: e.target.value,
                  })
                }
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              />
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-[var(--border-subtle)] mt-4">
            <button
              type="button"
              disabled={isPaddyPurchaseSaving || isScanningFingerprint}
              onClick={async () => {
                setIsScanningFingerprint(true);
                try {
                  const xml = await biometricService.captureAndVerifyLoggedInUser();
                  setPaddyPurchaseModal((prev: any) => ({
                    ...prev,
                    biometricData: xml,
                  }));
                  useUiStore
                    .getState()
                    .addToast("Fingerprint captured", "success");
                } catch (err: any) {
                  useUiStore
                    .getState()
                    .addToast(
                      err.message || "This fingerprint does not exist",
                      "error",
                    );
                } finally {
                  setIsScanningFingerprint(false);
                }
              }}
              className="px-4 py-2 border border-[var(--border-subtle)] rounded text-sm text-[var(--text-main)] disabled:opacity-50"
            >
              {isScanningFingerprint
                ? "Scanning…"
                : paddyPurchaseModal.biometricData
                  ? "Fingerprint ✓"
                  : "Scan Fingerprint"}
            </button>
            <button
              type="button"
              onClick={() => setPaddyPurchaseModal(emptyPaddyPurchaseModal())}
              className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)]"
              disabled={isPaddyPurchaseSaving}
            >
              Cancel
            </button>
            {(paddyPurchaseModal.id ? canEditBoli : canAddBoli) && (
              <button
                type="submit"
                disabled={isPaddyPurchaseSaving}
                className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold hover:bg-[#cc7000] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPaddyPurchaseSaving
                  ? "Saving…"
                  : paddyPurchaseModal.id
                    ? "Update with Fingerprint"
                    : "Submit with Fingerprint"}
              </button>
            )}
          </div>
        </form>
      </CustomModal>

      <CustomModal
        isOpen={addMandiModal.isOpen}
        onClose={() => setAddMandiModal({ ...addMandiModal, isOpen: false })}
        title={addMandiModal.id ? "Edit Mandi" : "Add New Mandi"}
      >
        <form onSubmit={handleAddMandi} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
              Mandi Name
            </label>
            <input
              type="text"
              value={addMandiModal.name}
              onChange={(e) =>
                setAddMandiModal({ ...addMandiModal, name: e.target.value })
              }
              className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="mandiStatus"
              checked={addMandiModal.isActive}
              onChange={(e) =>
                setAddMandiModal({
                  ...addMandiModal,
                  isActive: e.target.checked,
                })
              }
              className="w-4 h-4"
            />
            <label
              htmlFor="mandiStatus"
              className="text-sm text-[var(--text-main)]"
            >
              Active Status
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)] mt-4">
            <button
              type="button"
              onClick={() =>
                setAddMandiModal({ ...addMandiModal, isOpen: false })
              }
              className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMandiLock.pending}
              className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold hover:bg-[#cc7000] transition-colors disabled:opacity-50"
            >
              {addMandiLock.pending
                ? "Saving..."
                : addMandiModal.id
                  ? "Update Mandi"
                  : "Add Mandi"}
            </button>
          </div>
        </form>
      </CustomModal>

      <CustomModal
        isOpen={addSupplierModal.isOpen}
        onClose={() =>
          setAddSupplierModal({
            isOpen: false,
            name: "",
            firmNames: "",
            mandi: "",
            contact: "",
            plantId: "",
            biometricData: "",
          })
        }
        title={
          isSupervisor
            ? "Add New Arthiya (needs Admin confirmation)"
            : "Add New Arthiya"
        }
      >
        <form onSubmit={handleAddSupplier} className="space-y-4">
          {activePlant && user?.role !== "SUPER_ADMIN" ? (
            <div>
              <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                Mill
              </label>
              <div className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] font-medium">
                {activePlant.name}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                Select Mill
              </label>
              <select
                value={addSupplierModal.plantId || activePlant?.id || ""}
                onChange={(e) =>
                  setAddSupplierModal({
                    ...addSupplierModal,
                    plantId: e.target.value,
                  })
                }
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                required
              >
                <option value="">Select Mill</option>
                {(plants.length
                  ? plants
                  : activePlant
                    ? [activePlant]
                    : []
                ).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
              Arthiya Name
            </label>
            <input
              type="text"
              value={addSupplierModal.name}
              onChange={(e) =>
                setAddSupplierModal({
                  ...addSupplierModal,
                  name: e.target.value,
                })
              }
              className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
              Firm Names (comma separated)
            </label>
            <input
              type="text"
              value={addSupplierModal.firmNames}
              onChange={(e) =>
                setAddSupplierModal({
                  ...addSupplierModal,
                  firmNames: e.target.value,
                })
              }
              className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              placeholder="E.g. Balaji Traders, Shivam Rice"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
              Mandi
            </label>
            <select
              value={addSupplierModal.mandi}
              onChange={(e) =>
                setAddSupplierModal({
                  ...addSupplierModal,
                  mandi: e.target.value,
                })
              }
              className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
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
            <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
              Contact Details
            </label>
            <input
              type="tel"
              pattern="[0-9]{10}"
              maxLength={10}
              title="10 digit mobile number"
              value={addSupplierModal.contact}
              onChange={(e) =>
                setAddSupplierModal({
                  ...addSupplierModal,
                  contact: e.target.value,
                })
              }
              className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
            />
          </div>
          {isSupervisor && (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3 space-y-2">
              <label className="block text-sm text-[var(--text-muted-alt)]">
                Supervisor fingerprint (match){" "}
                <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-[var(--text-muted)]">
                Scan your enrolled finger. Entry goes to Admin for confirmation
                before this Arthiya can be used on forms.
              </p>
              <button
                type="button"
                onClick={handleScanSupplierFingerprint}
                disabled={isScanningSupplierFp}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors ${
                  addSupplierModal.biometricData
                    ? "bg-green-600/20 text-green-400 border border-green-600/40"
                    : "bg-[#e67e00]/15 text-[#e67e00] border border-[#e67e00]/40 hover:bg-[#e67e00]/25"
                }`}
              >
                <Fingerprint size={18} />
                {isScanningSupplierFp
                  ? "Scanning…"
                  : addSupplierModal.biometricData
                    ? "Fingerprint matched — Scan again"
                    : "Scan Fingerprint"}
              </button>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)] mt-4">
            <button
              type="button"
              onClick={() =>
                setAddSupplierModal({
                  isOpen: false,
                  name: "",
                  firmNames: "",
                  mandi: "",
                  contact: "",
                  plantId: "",
                  biometricData: "",
                })
              }
              className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                addSupplierLock.pending ||
                (isSupervisor && !addSupplierModal.biometricData)
              }
              className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold hover:bg-[#cc7000] transition-colors disabled:opacity-50"
            >
              {addSupplierLock.pending
                ? "Saving..."
                : isSupervisor
                  ? "Submit for Admin Approval"
                  : "Add Arthiya"}
            </button>
          </div>
        </form>
      </CustomModal>

      <CustomModal
        isOpen={inspectModal.isOpen}
        onClose={() => setInspectModal({ ...inspectModal, isOpen: false })}
        title="Quality Inspection"
      >
        <form onSubmit={handleInspect} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                Moisture (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={inspectModal.moisture}
                onChange={(e) =>
                  setInspectModal({
                    ...inspectModal,
                    moisture: e.target.value as any,
                  })
                }
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                Broken (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={inspectModal.broken}
                onChange={(e) =>
                  setInspectModal({
                    ...inspectModal,
                    broken: e.target.value as any,
                  })
                }
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                Discoloration (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={inspectModal.discoloration}
                onChange={(e) =>
                  setInspectModal({
                    ...inspectModal,
                    discoloration: e.target.value as any,
                  })
                }
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                Foreign Matter (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={inspectModal.foreignMatter}
                onChange={(e) =>
                  setInspectModal({
                    ...inspectModal,
                    foreignMatter: e.target.value as any,
                  })
                }
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)] mt-4">
            <button
              type="button"
              onClick={() =>
                setInspectModal({ ...inspectModal, isOpen: false })
              }
              className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)]"
            >
              Cancel
            </button>
            {canEditQuality && (
              <button
                type="submit"
                disabled={inspectLock.pending}
                className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold hover:bg-[#cc7000] transition-colors disabled:opacity-50"
              >
                {inspectLock.pending ? "Submitting..." : "Complete Inspection"}
              </button>
            )}
          </div>
        </form>
      </CustomModal>

      <CustomModal
        isOpen={settleHisabModal.isOpen}
        onClose={() =>
          setSettleHisabModal({ ...settleHisabModal, isOpen: false })
        }
        title="Settle Hisab (Final Settlement)"
      >
        {settleHisabModal.hisab && (
          <form onSubmit={handleSettleHisabSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div className="text-[var(--text-muted-alt)]">
                Party / Mandi:{" "}
                <span className="text-[var(--text-main)] font-bold">
                  {settleHisabModal.hisab.partyMandi}
                </span>
              </div>
              <div className="text-[var(--text-muted-alt)]">
                Bags:{" "}
                <span className="text-[var(--text-main)] font-bold">
                  {settleHisabModal.hisab.bags}
                </span>
              </div>
              <div className="text-[var(--text-muted-alt)]">
                Rate:{" "}
                <span className="text-[var(--text-main)] font-bold">
                  {settleHisabModal.hisab.rate}
                </span>
              </div>
              <div className="text-[var(--text-muted-alt)]">
                Difference:{" "}
                <span className="text-red-400 font-bold">
                  {settleHisabModal.hisab.diff}
                </span>
              </div>
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                  Payment
                </label>
                <input
                  type="number"
                  min="0"
                  value={settleHisabModal.payment}
                  onChange={(e) =>
                    setSettleHisabModal({
                      ...settleHisabModal,
                      payment: e.target.value,
                    })
                  }
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                  placeholder="Enter payment amount"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                  Final Hisab Amount
                </label>
                <input
                  type="number"
                  min="0"
                  value={settleHisabModal.finalHisabAmt}
                  onChange={(e) =>
                    setSettleHisabModal({
                      ...settleHisabModal,
                      finalHisabAmt: e.target.value,
                    })
                  }
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                  placeholder="Enter final amount"
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                  Notes
                </label>
                <textarea
                  value={settleHisabModal.note}
                  onChange={(e) =>
                    setSettleHisabModal({
                      ...settleHisabModal,
                      note: e.target.value,
                    })
                  }
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] outline-none focus:border-[#e67e00]"
                  rows={2}
                  placeholder="Add any settlement notes"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)] mt-4">
              <button
                type="button"
                onClick={() =>
                  setSettleHisabModal({ ...settleHisabModal, isOpen: false })
                }
                className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)]"
              >
                Cancel
              </button>
              {canSettleHisab && (
              <button
                type="submit"
                disabled={settleHisabLock.pending}
                className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold hover:bg-[#cc7000] transition-colors disabled:opacity-50"
              >
                {settleHisabLock.pending ? "Submitting..." : "Settle Hisab"}
              </button>
              )}
            </div>
          </form>
        )}
      </CustomModal>

      <StackSelectionModal
        isOpen={isStackModalOpen}
        onClose={() => setIsStackModalOpen(false)}
        onSelect={(stack, bagType) => {
          setInwardFormData((prev: any) => ({
            ...prev,
            stackNo: stack,
            bagType,
          }));
          setIsStackModalOpen(false);
        }}
        occupiedStacks={occupiedStacks}
        currentMoisture={parseFloat(inwardFormData.moisture) || 0}
        plantName={activePlant?.name || ""}
        plantId={activePlant?.id || ""}
      />
    </div>
  );
};

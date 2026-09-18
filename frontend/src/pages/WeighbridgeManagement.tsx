import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Eye,
  Settings,
  History,
  Scale,
  ShieldCheck,
  Save,
  Download,
  Settings2,
  Shield,
  Calendar,
  MapPin,
  RefreshCw,
  Edit3,
  Link2Off,
  Plug,
  Unplug,
} from "lucide-react";
import { usePlantStore } from "../store/plantStore";
import api from "../api/axios";
import { CustomModal } from "../components/CustomModal";
import Combobox from "../components/Combobox";
import { useSubmitLock } from "../hooks/useSubmitLock";
import {
  connectWebSerialWeighbridge,
  FIXED_WEIGHBRIDGE,
  isSecureWeighbridgeContext,
  isWebSerialSupported,
  fixedSerialOptions,
} from "../utils/webSerialWeighbridge";

export const WeighbridgeManagement = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "capture";
  const activePlant = usePlantStore((state) => state.activePlant);

  const [localPlantId, setLocalPlantId] = useState("");
  const [localPlantName, setLocalPlantName] = useState("");
  const plantId = activePlant?.id || localPlantId;

  // Tab 1: Dynamic State
  const [vehicleNo, setVehicleNo] = useState("");
  const [transType, setTransType] = useState("Inward");
  const [driverName, setDriverName] = useState("");
  const [materialType, setMaterialType] = useState("Paddy");
  const [supplier, setSupplier] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [gatePassId, setGatePassId] = useState("");

  // Supervisor Features: Gate Pass + Soda linking
  const [pendingSodas, setPendingSodas] = useState<any[]>([]);
  const [selectedSodaId, setSelectedSodaId] = useState<string>("");
  const [bagsReceived, setBagsReceived] = useState<string>("");
  const [qualityCutType, setQualityCutType] = useState<string>("BAGS");
  const [qualityCutValue, setQualityCutValue] = useState<string>("");
  const [qualityCutReason, setQualityCutReason] = useState<string>("");

  const [weightData, setWeightData] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastReading, setLastReading] = useState<string>("-");
  const [tareWeight, setTareWeight] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("Not Connected");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [webSerialConnected, setWebSerialConnected] = useState(false);
  const [webSerialBusy, setWebSerialBusy] = useState(false);
  const [webSerialPortLabel, setWebSerialPortLabel] = useState("");
  const webSerialDisconnectRef = useRef<null | (() => Promise<void>)>(null);
  const lastLivePostRef = useRef(0);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
  }>({ isOpen: false, title: "", content: null });

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualWeightInput, setManualWeightInput] = useState("");

  // Tab 2: History State
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState(
    "All Transaction Types",
  );
  const [historyMaterialFilter, setHistoryMaterialFilter] =
    useState("All Materials");
  const [historySupplierFilter, setHistorySupplierFilter] =
    useState("All Suppliers");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");

  useEffect(() => {
    const pid = activePlant?.id || "global";
    const fetchPendingSodas = async () => {
      try {
        const res = await api.get(`/api/procurement/soda-pending/${pid}`);
        setPendingSodas(
          Array.isArray(res.data) ? res.data : res.data?.data || [],
        );
      } catch (err) {
        console.error(err);
      }
    };
    fetchPendingSodas();
  }, [activePlant?.id, activeTab]);

  useEffect(() => {
    if (!selectedSodaId && pendingSodas.length > 0) {
      setSelectedSodaId(pendingSodas[0].id);
    }
  }, [pendingSodas]);

  useEffect(() => {
    if (activeTab === "history") {
      const pid = activePlant?.id || "global";
      const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
          const res = await api.get(`/api/weighbridge/history/${pid}`);
          setHistoryData(res.data);
        } catch (error) {
          console.error("Failed to fetch history", error);
        } finally {
          setIsLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [activeTab, activePlant?.id]);

  const uniqueTransactionTypes = [
    "All Transaction Types",
    ...Array.from(
      new Set(historyData.map((item) => item.transactionType).filter(Boolean)),
    ),
  ];
  const uniqueMaterials = [
    "All Materials",
    ...Array.from(
      new Set(historyData.map((item) => item.materialType).filter(Boolean)),
    ),
  ];
  const uniqueSuppliers = [
    "All Suppliers",
    ...Array.from(
      new Set(historyData.map((item) => item.supplierName).filter(Boolean)),
    ),
  ];

  const filteredHistory = historyData.filter((item) => {
    const searchLower = historySearch.toLowerCase();
    const matchSearch =
      !historySearch ||
      item.vehicleNo?.toLowerCase().includes(searchLower) ||
      item.challanNo?.toLowerCase().includes(searchLower) ||
      item.supplierName?.toLowerCase().includes(searchLower);

    const matchType =
      historyTypeFilter === "All Transaction Types" ||
      item.transactionType === historyTypeFilter;
    const matchMaterial =
      historyMaterialFilter === "All Materials" ||
      item.materialType === historyMaterialFilter;
    const matchSupplier =
      historySupplierFilter === "All Suppliers" ||
      item.supplierName === historySupplierFilter;

    // Date filter
    let matchDate = true;
    if (historyStartDate || historyEndDate) {
      const itemDate = new Date(item.createdAt);
      itemDate.setHours(0, 0, 0, 0);

      if (historyStartDate) {
        const start = new Date(historyStartDate);
        start.setHours(0, 0, 0, 0);
        if (itemDate < start) matchDate = false;
      }
      if (historyEndDate) {
        const end = new Date(historyEndDate);
        end.setHours(0, 0, 0, 0);
        if (itemDate > end) matchDate = false;
      }
    }

    return (
      matchSearch && matchType && matchMaterial && matchSupplier && matchDate
    );
  });

  const handleExportCSV = () => {
    if (filteredHistory.length === 0) return;

    const headers = [
      "Date",
      "Type",
      "Vehicle No",
      "Material",
      "Supplier",
      "Gross Wt",
      "Tare Wt",
      "Net Wt",
      "Challan",
      "Driver",
    ];
    const rows = filteredHistory.map((row) => [
      new Date(row.createdAt).toLocaleString(),
      row.transactionType || "",
      row.vehicleNo || "",
      row.materialType || "",
      row.supplierName || "",
      row.grossWeight || 0,
      row.tareWeight || 0,
      row.netWeight || 0,
      row.challanNo || "",
      row.driverName || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `weighbridge_history_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewDetails = (row: any) => {
    setModalConfig({
      isOpen: true,
      title: "Transaction Summary",
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle-alt)] pb-4">
            <div>
              <p className="text-xs text-[var(--text-muted-alt)] uppercase tracking-wider mb-1">
                Vehicle No
              </p>
              <p className="text-xl font-bold text-[var(--text-main)] uppercase">
                {row.vehicleNo}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--text-muted-alt)] uppercase tracking-wider mb-1">
                Date & Time
              </p>
              <p className="text-sm font-medium text-[var(--text-muted)]">
                {new Date(row.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle-alt)]">
              <p className="text-xs text-[var(--text-muted-alt)] uppercase tracking-wider mb-1">
                Transaction Type
              </p>
              <span
                className={`px-2 py-1 rounded text-xs font-medium border inline-block mt-1 ${row.transactionType === "Inward" ? "text-green-400 bg-green-400/10 border-green-400/20" : row.transactionType === "Outward" ? "text-red-400 bg-red-400/10 border-red-400/20" : "text-[var(--text-muted-alt)] bg-gray-400/10 border-gray-400/20"}`}
              >
                {row.transactionType || "UNKNOWN"}
              </span>
            </div>
            <div className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle-alt)]">
              <p className="text-xs text-[var(--text-muted-alt)] uppercase tracking-wider mb-1">
                Challan No
              </p>
              <p className="text-sm font-medium text-[var(--text-main)]">
                {row.challanNo || "-"}
              </p>
            </div>
            <div className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle-alt)]">
              <p className="text-xs text-[var(--text-muted-alt)] uppercase tracking-wider mb-1">
                Material
              </p>
              <p className="text-sm font-medium text-[var(--text-main)]">
                {row.materialType || "-"}
              </p>
            </div>
            <div className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle-alt)]">
              <p className="text-xs text-[var(--text-muted-alt)] uppercase tracking-wider mb-1">
                Supplier
              </p>
              <p
                className="text-sm font-medium text-[var(--text-main)] truncate"
                title={row.supplierName}
              >
                {row.supplierName || "-"}
              </p>
            </div>
          </div>

          <div className="bg-[var(--bg-panel)] p-5 rounded-xl border border-[var(--border-subtle-alt)] shadow-inner">
            <h4 className="text-xs text-[var(--text-muted-alt)] uppercase tracking-wider mb-4 border-b border-[var(--border-subtle-alt)] pb-2">
              Weight Details
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-[var(--text-muted-alt)] mb-1">
                  Gross Wt
                </p>
                <p className="text-lg font-semibold text-[var(--text-main)]">
                  {row.grossWeight?.toLocaleString() || 0}{" "}
                  <span className="text-xs text-[var(--text-muted-alt)] font-normal">
                    kg
                  </span>
                </p>
              </div>
              <div className="text-center border-l border-[var(--border-subtle-alt)]">
                <p className="text-xs text-[var(--text-muted-alt)] mb-1">
                  Tare Wt
                </p>
                <p className="text-lg font-semibold text-[var(--text-muted)]">
                  {row.tareWeight?.toLocaleString() || 0}{" "}
                  <span className="text-xs text-[var(--text-muted-alt)] font-normal">
                    kg
                  </span>
                </p>
              </div>
              <div className="text-center border-l border-[var(--border-subtle-alt)]">
                <p className="text-xs text-amber-500/70 mb-1">Net Wt</p>
                <p className="text-xl font-bold text-amber-500">
                  {row.netWeight?.toLocaleString() || 0}{" "}
                  <span className="text-xs text-amber-500/50 font-normal">
                    kg
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-[var(--text-muted-alt)] bg-[var(--bg-panel)] px-4 py-3 rounded-xl border border-[var(--border-subtle-alt)]">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted-alt)]">Driver:</span>
              <span className="text-[var(--text-main)] font-medium">
                {row.driverName || "-"}
              </span>
            </div>
          </div>
        </div>
      ),
    });
  };

  // Tab 3: Settings State
  const [settings, setSettings] = useState({
    indicatorModel: "Essae - DS2520",
    connectionType: "Serial Port (COM)",
    port: FIXED_WEIGHBRIDGE.port,
    baudRate: String(FIXED_WEIGHBRIDGE.baudRate),
    dataBits: "8",
    stopBits: "1",
    parity: "None",
    weightUnit: "Kilogram (kg)",
    autoCapture: true,
    autoSave: true,
    autoTare: false,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const saveTransactionLock = useSubmitLock();
  const [testSuccess, setTestSuccess] = useState(false);

  useEffect(() => {
    if (activeTab === "settings") {
      const pid = activePlant?.id || "global";
      const fetchSettings = async () => {
        try {
          const res = await api.get(`/api/weighbridge/settings/${pid}`);
          if (res.data) {
            setSettings((prev) => ({
              ...prev,
              ...res.data,
              port: FIXED_WEIGHBRIDGE.port,
              baudRate: String(FIXED_WEIGHBRIDGE.baudRate),
              dataBits: "8",
              stopBits: "1",
              parity: "None",
            }));
          }
        } catch (error) {
          console.error("Failed to fetch settings", error);
        }
      };
      fetchSettings();
    }
  }, [activeTab, activePlant?.id]);

  /** Load settings + real hardware connection status (never assume Connected) */
  const refreshConnectionStatus = async () => {
    const pid = activePlant?.id || "global";
    try {
      const [settingsRes, statusRes] = await Promise.all([
        api.get(`/api/weighbridge/settings/${pid}`),
        api.get(`/api/weighbridge/connection-status/${pid}`),
      ]);
      if (settingsRes.data) {
        setSettings((prev) => ({
          ...prev,
          ...settingsRes.data,
          // Locked mill profile — do not let saved/other values change connect behavior
          port: FIXED_WEIGHBRIDGE.port,
          baudRate: String(FIXED_WEIGHBRIDGE.baudRate),
          dataBits: "8",
          stopBits: "1",
          parity: "None",
        }));
      }
      const st = statusRes.data;
      setConnectionStatus(st?.connected ? "Connected" : "Not Connected");
      setConnectionMessage(st?.message || "");
      if (!st?.connected) {
        setIsStreaming(false);
      }
    } catch (error) {
      console.error("Failed to refresh weighbridge connection status", error);
      setConnectionStatus("Not Connected");
      setConnectionMessage(
        "Unable to verify weighbridge connection. Device is treated as not connected.",
      );
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    if (activeTab === "capture" || activeTab === "settings") {
      refreshConnectionStatus();
    }
  }, [activeTab, activePlant?.id]);

  /** Poll server live weight only when this browser is NOT driving Web Serial. */
  useEffect(() => {
    if (activeTab !== "capture") return;
    if (webSerialConnected) return;
    const pid = activePlant?.id;
    if (!pid || pid === "global") return;

    let cancelled = false;
    const tick = async () => {
      try {
        const res = await api.get(`/api/weighbridge/live/${pid}`);
        if (cancelled) return;
        const live = res.data;
        if (live?.connected && live.weightKg != null) {
          setConnectionStatus("Connected");
          setConnectionMessage(live.message || "");
          setIsStreaming(true);
          setWeightData((prev: any) => ({
            vehicleNo: prev?.vehicleNo || vehicleNo || "LIVE",
            grossWeight: Number(live.weightKg),
            tareWeight: prev?.tareWeight,
            netWeight: prev?.netWeight,
            source: live.source || "live",
            status: live.stable === false ? "Unstable" : "Stable",
          }));
          setLastReading(
            live.at
              ? new Date(live.at).toLocaleString()
              : new Date().toLocaleString(),
          );
        } else {
          setConnectionStatus("Not Connected");
          setConnectionMessage(
            live?.message ||
              "Click Connect Indicator on this weighbridge PC (Chrome / Edge).",
          );
          setIsStreaming(false);
        }
      } catch {
        if (!cancelled) {
          setConnectionStatus("Not Connected");
          setIsStreaming(false);
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activePlant?.id, webSerialConnected]);

  useEffect(() => {
    return () => {
      webSerialDisconnectRef.current?.().catch(() => undefined);
    };
  }, []);

  const applyLiveWeight = (weightKg: number, source: string) => {
    setConnectionStatus("Connected");
    setIsStreaming(true);
    setWeightData((prev: any) => ({
      vehicleNo: prev?.vehicleNo || vehicleNo || "LIVE",
      grossWeight: weightKg,
      tareWeight: prev?.tareWeight,
      netWeight: prev?.netWeight,
      source,
      status: "Stable",
    }));
    setLastReading(new Date().toLocaleString());
  };

  const postLiveToServer = async (weightKg: number, raw?: string) => {
    const pid = activePlant?.id;
    if (!pid || pid === "global") return;
    const now = Date.now();
    if (now - lastLivePostRef.current < 700) return;
    lastLivePostRef.current = now;
    try {
      await api.post(`/api/weighbridge/live/${pid}`, {
        weightKg,
        port: FIXED_WEIGHBRIDGE.port,
        baudRate: FIXED_WEIGHBRIDGE.baudRate,
        stable: true,
        raw,
      });
    } catch {
      /* non-blocking — local Capture still works */
    }
  };

  const handleConnectIndicator = async () => {
    if (!activePlant?.id) {
      setModalConfig({
        isOpen: true,
        title: "Select Plant",
        content: "Select the mill plant first, then connect the indicator.",
      });
      return;
    }
    if (!isWebSerialSupported()) {
      setModalConfig({
        isOpen: true,
        title: "Browser Not Supported",
        content:
          "Use Google Chrome or Microsoft Edge on the weighbridge PC. Firefox and Safari cannot open the COM port from the browser.",
      });
      return;
    }
    if (!isSecureWeighbridgeContext()) {
      setModalConfig({
        isOpen: true,
        title: "HTTPS Required",
        content:
          "Chrome only allows serial access on HTTPS (or localhost). Open RMS with https:// on this PC.",
      });
      return;
    }

    setWebSerialBusy(true);
    try {
      await webSerialDisconnectRef.current?.();
      webSerialDisconnectRef.current = null;

      const serialOptions = fixedSerialOptions();
      const session = await connectWebSerialWeighbridge({
        serialOptions,
        onWeight: (weightKg, raw) => {
          applyLiveWeight(weightKg, "web_serial");
          postLiveToServer(weightKg, raw);
        },
        onError: (message) => {
          setConnectionMessage(message);
          setModalConfig({
            isOpen: true,
            title: "Indicator Read Error",
            content: message,
          });
        },
        onDisconnected: () => {
          setWebSerialConnected(false);
          setWebSerialPortLabel("");
          webSerialDisconnectRef.current = null;
          setConnectionStatus("Not Connected");
          setIsStreaming(false);
          setConnectionMessage("Indicator disconnected.");
        },
      });

      webSerialDisconnectRef.current = session.disconnect;
      setWebSerialConnected(true);
      setWebSerialPortLabel(FIXED_WEIGHBRIDGE.port);
      setConnectionStatus("Connected");
      setConnectionMessage(
        `Connected ${FIXED_WEIGHBRIDGE.port} @ ${FIXED_WEIGHBRIDGE.baudRate} baud. Leave this tab open.`,
      );
      setIsStreaming(true);
      if (session.usedPicker) {
        setModalConfig({
          isOpen: true,
          title: "Allow COM4 once",
          content:
            "If Chrome asked for a port, choose COM4 only. Next time Connect will use COM4 @ 2400 automatically with no selection.",
        });
      }
    } catch (err: any) {
      const msg =
        err?.name === "NotFoundError"
          ? "Please choose COM4 in the browser list (one time only)."
          : err?.message || "Could not open COM4.";
      setModalConfig({ isOpen: true, title: "Connect Failed", content: msg });
    } finally {
      setWebSerialBusy(false);
    }
  };

  const handleDisconnectIndicator = async () => {
    setWebSerialBusy(true);
    try {
      await webSerialDisconnectRef.current?.();
    } finally {
      webSerialDisconnectRef.current = null;
      setWebSerialConnected(false);
      setWebSerialPortLabel("");
      setConnectionStatus("Not Connected");
      setIsStreaming(false);
      setConnectionMessage("Indicator disconnected.");
      setWebSerialBusy(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!activePlant) return;
    setIsSavingSettings(true);
    try {
      await api.put(`/api/weighbridge/settings/${activePlant.id}`, {
        ...settings,
        port: FIXED_WEIGHBRIDGE.port,
        baudRate: String(FIXED_WEIGHBRIDGE.baudRate),
        dataBits: "8",
        stopBits: "1",
        parity: "None",
      });
      setSettings((prev) => ({
        ...prev,
        port: FIXED_WEIGHBRIDGE.port,
        baudRate: String(FIXED_WEIGHBRIDGE.baudRate),
        dataBits: "8",
        stopBits: "1",
        parity: "None",
      }));
      setModalConfig({
        isOpen: true,
        title: "Settings Saved",
        content: `Saved. Live connect is fixed to ${FIXED_WEIGHBRIDGE.port} @ ${FIXED_WEIGHBRIDGE.baudRate} baud.`,
      });
    } catch (error) {
      console.error("Failed to save settings", error);
      setModalConfig({
        isOpen: true,
        title: "Error",
        content: "Failed to save settings. Please try again.",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSettingChange = (field: string, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const fetchLiveWeight = async () => {
    const pid = activePlant?.id;
    // Prefer physical COM Bridge live feed when available
    if (pid && pid !== "global") {
      try {
        const liveRes = await api.get(`/api/weighbridge/live/${pid}`);
        if (liveRes.data?.connected && liveRes.data.weightKg != null) {
          setIsStreaming(true);
          setConnectionStatus("Connected");
          setWeightData({
            vehicleNo: vehicleNo || "LIVE",
            grossWeight: Number(liveRes.data.weightKg),
            source: "com_bridge",
            status: "Stable",
          });
          setLastReading(
            liveRes.data.at
              ? new Date(liveRes.data.at).toLocaleString()
              : new Date().toLocaleString(),
          );
          return;
        }
      } catch {
        /* fall through to gate-pass stream */
      }
    }
    if (!vehicleNo) {
      setModalConfig({
        isOpen: true,
        title: "Validation Error",
        content:
          "Please enter a Vehicle No. (or start the COM Bridge for live weight).",
      });
      return;
    }
    try {
      // Fallback: punched GP weights — not physical COM.
      setIsStreaming(true);
      const res = await api.get(`/api/weighbridge/stream/${vehicleNo}`);
      setWeightData(res.data);
      setLastReading(new Date().toLocaleString());
    } catch (error: any) {
      console.error(error);
      setIsStreaming(false);
      setModalConfig({
        isOpen: true,
        title: "Error",
        content:
          error.response?.data?.message ||
          "Failed to stream weight. Start the COM Bridge, or enter a vehicle with an active INWARD pass.",
      });
    }
  };

  const fetchGatePassDetails = async () => {
    if (!gatePassId) {
      setModalConfig({
        isOpen: true,
        title: "Validation Error",
        content: "Please enter a Gate Pass ID / QR.",
      });
      return;
    }
    try {
      const res = await api.get(`/api/gate-pass/scan/${gatePassId}`);
      if (res.data) {
        if (res.data.plantId && !activePlant) {
          setLocalPlantId(res.data.plantId);
          setLocalPlantName(res.data.plant?.name || "Unknown Plant");
        }
        if (res.data.vehicleNo) setVehicleNo(res.data.vehicleNo);
        if (res.data.driverName) setDriverName(res.data.driverName);
        if (res.data.material || res.data.purpose)
          setMaterialType(res.data.material || res.data.purpose || "Paddy");
        if (res.data.supplier?.name) setSupplier(res.data.supplier.name);
        setTransType(res.data.type === "OUTWARD" ? "Outward" : "Inward");
      }
    } catch (error: any) {
      console.error(error);
      setModalConfig({
        isOpen: true,
        title: "Error",
        content:
          error.response?.data?.message || "Failed to fetch gate pass details.",
      });
    }
  };

  const handleSaveTransaction = async () => {
    if (!weightData || !plantId) {
      setModalConfig({
        isOpen: true,
        title: "Error",
        content:
          "No weight data or plant context found. Please ensure a plant is selected and weight is captured.",
      });
      return;
    }
    await saveTransactionLock.wrapSubmit(async () => {
      try {
        await api.post(`/api/weighbridge/save-transaction`, {
          plantId,
          vehicleNo: vehicleNo || weightData.vehicleNo,
          transactionType: transType,
          driverName,
          materialType,
          supplierName: supplier,
          challanNo,
          remarks,
          gatePassId,
          grossWeight: weightData.grossWeight,
          tareWeight: tareWeight,
          netWeight: weightData.grossWeight - tareWeight,
          sodaPendingId: selectedSodaId || undefined,
          qualityCutType: qualityCutValue ? qualityCutType : undefined,
          qualityCutValue: qualityCutValue
            ? parseFloat(qualityCutValue)
            : undefined,
          qualityCutReason: qualityCutReason || undefined,
          bagsReceived: bagsReceived ? parseFloat(bagsReceived) : undefined,
        });
        setModalConfig({
          isOpen: true,
          title: "Success",
          content: "Transaction saved successfully!",
        });
        setIsStreaming(false);
      } catch (error: any) {
        console.error("Failed to save transaction", error);
        setModalConfig({
          isOpen: true,
          title: "Error",
          content:
            error.response?.data?.message || "Failed to save transaction.",
        });
      }
    });
  };

  const handleReset = () => {
    setVehicleNo("");
    setTransType("Inward");
    setDriverName("");
    setMaterialType("Paddy");
    setSupplier("");
    setChallanNo("");
    setRemarks("");
    setGatePassId("");
    setWeightData(null);
    setIsStreaming(false);
    setLastReading("-");
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestSuccess(false);
    try {
      const pid = activePlant?.id || "global";
      const res = await api.get(`/api/weighbridge/connection-status/${pid}`);
      const st = res.data;
      setConnectionStatus(st?.connected ? "Connected" : "Not Connected");
      setConnectionMessage(st?.message || "");
      if (st?.connected) {
        setTestSuccess(true);
        setTimeout(() => setTestSuccess(false), 3000);
        setModalConfig({
          isOpen: true,
          title: "Connection Successful",
          content: `Physical weighbridge connected on ${st.port || "COM"} @ ${st.baudRate || "-"} baud.`,
        });
      } else {
        setIsStreaming(false);
        setModalConfig({
          isOpen: true,
          title: "Not Connected",
          content:
            st?.message ||
            "Physical weighbridge indicator is not connected. Test the COM port in PuTTY first, then integrate the live feed.",
        });
      }
    } catch (error: any) {
      setConnectionStatus("Not Connected");
      setIsStreaming(false);
      setModalConfig({
        isOpen: true,
        title: "Connection Test Failed",
        content:
          error?.response?.data?.message ||
          "Could not reach weighbridge connection status. Device remains Not Connected.",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const currentWeight = weightData ? weightData.grossWeight : 0;

  const handleTare = () => {
    if (currentWeight > 0) {
      setTareWeight(currentWeight);
      setModalConfig({
        isOpen: true,
        title: "Tare Captured",
        content: `Tare weight set to ${currentWeight} kg.`,
      });
    } else {
      setModalConfig({
        isOpen: true,
        title: "Error",
        content: "Cannot tare 0 kg. Ensure scale is active.",
      });
    }
  };

  const handleCaptureWt = () => {
    if (currentWeight > 0) {
      setIsStreaming(false);
      setWeightData({
        vehicleNo: vehicleNo || "CAPTURED-ENTRY",
        grossWeight: currentWeight,
      });
      setModalConfig({
        isOpen: true,
        title: "Weight Captured",
        content: `Gross weight locked at ${currentWeight} kg. You can now save the transaction.`,
      });
    } else {
      setModalConfig({
        isOpen: true,
        title: "Error",
        content: "No weight to capture.",
      });
    }
  };

  const handleManual = () => {
    setIsManualModalOpen(true);
    setManualWeightInput("");
  };

  // SVG Gauge Calculations
  const maxWeight = 20000;
  const percentage = Math.min(Math.max(currentWeight / maxWeight, 0), 1);
  const angle = percentage * 180;
  const arcLength = Math.PI * 80; // 251.32
  const dashOffset = arcLength - percentage * arcLength;
  const netWeight = currentWeight > 0 ? currentWeight - tareWeight : 0;

  return (
    <div className="flex flex-col h-full text-[var(--text-main)] bg-[var(--bg-base)]">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-panel)] mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-[var(--text-muted)]">
            Weighbridge Management
          </h1>
        </div>
        <div className="text-xs text-[var(--text-muted-alt)] flex items-center gap-1">
          <MapPin size={12} /> {activePlant?.name || "Main Plant"}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* ======================================================================
 TAB 1: CAPTURE
 ====================================================================== */}
        {activeTab === "capture" && (
          <div className="space-y-10">
            {/* SECTION 1: Form + Weight Captured */}
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-[var(--text-main)] mb-4">
                Weight Capture
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Container 1: Form */}
                <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] shadow-2xl p-5 flex flex-col">
                  <div className="space-y-4 flex-1">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">
                        Transaction Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="transType"
                        value={transType}
                        onChange={(e) => setTransType(e.target.value)}
                        className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500"
                      >
                        <option value="Inward">Inward</option>
                        <option value="Outward">Outward</option>
                      </select>
                    </div>

                    <div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">
                          Gate Pass ID / QR
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={gatePassId}
                            onChange={(e) => setGatePassId(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && fetchGatePassDetails()
                            }
                            placeholder="e.g. GIN-2026-00004"
                            className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg pl-3 pr-10 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500 uppercase"
                          />
                          <button
                            onClick={fetchGatePassDetails}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted-alt)] hover:text-amber-500 hover:bg-amber-500/10 rounded transition-colors"
                          >
                            <Search size={16} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">
                          Vehicle No. <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={vehicleNo}
                            onChange={(e) => setVehicleNo(e.target.value)}
                            placeholder="e.g. PB10AB1234"
                            className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500 uppercase"
                          />
                        </div>
                      </div>
                    </div>

                    {!activePlant && (
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">
                          Plant
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={
                            localPlantName || "Auto-populated from Gate Pass"
                          }
                          className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-muted-alt)] focus:outline-none cursor-not-allowed"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">
                        Driver Name
                      </label>
                      <input
                        type="text"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">
                        Material Type
                      </label>
                      <select
                        name="materialType"
                        value={materialType}
                        onChange={(e) => setMaterialType(e.target.value)}
                        className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500"
                      >
                        <option value="">Select Material</option>
                        <option value="Paddy">Paddy</option>
                        <option value="Rice">Rice</option>
                        <option value="Bran">Bran</option>
                        <option value="Husk">Husk</option>
                      </select>
                    </div>

                    <div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">
                          Party / Supplier
                        </label>
                        <Combobox
                          name="supplier"
                          value={supplier}
                          onChange={(e: any) => {
                            setSupplier(e.target.value);
                            setSelectedSodaId("");
                            setBagsReceived("");
                          }}
                          options={
                            transType === "Inward"
                              ? Array.from(
                                  new Set(
                                    pendingSodas
                                      .map((s) => s.partyMandi)
                                      .filter(Boolean),
                                  ),
                                ).map((s) => ({
                                  id: s as string,
                                  name: s as string,
                                }))
                              : [
                                  {
                                    id: "Ganga Traders",
                                    name: "Ganga Traders",
                                  },
                                  {
                                    id: "Sharma Rice Traders",
                                    name: "Sharma Rice Traders",
                                  },
                                  {
                                    id: "Kisan Supply Co.",
                                    name: "Kisan Supply Co.",
                                  },
                                ]
                          }
                          valueKey="id"
                          placeholder="Select Party / Supplier"
                          className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {transType === "Inward" && supplier && (
                        <div className="col-span-1 md:col-span-2 mt-2 bg-[var(--bg-base)] p-4 rounded-lg border border-[var(--border-subtle)] shadow-inner">
                          <h4 className="text-sm font-semibold text-[var(--text-main)] mb-3 flex items-center gap-2">
                            <Settings size={14} className="text-amber-500" />{" "}
                            Pending Sodas for {supplier}
                          </h4>
                          <div className="max-h-48 overflow-y-auto custom-scrollbar border border-[var(--border-subtle-alt)] rounded">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[var(--bg-panel)] sticky top-0 border-b border-[var(--border-subtle)]">
                                <tr>
                                  <th className="p-2 font-medium text-[var(--text-muted-alt)]">
                                    Select
                                  </th>
                                  <th className="p-2 font-medium text-[var(--text-muted-alt)]">
                                    Date
                                  </th>
                                  <th className="p-2 font-medium text-[var(--text-muted-alt)]">
                                    Crop / Variety
                                  </th>
                                  <th className="p-2 font-medium text-[var(--text-muted-alt)]">
                                    Predet. Bags
                                  </th>
                                  <th className="p-2 font-medium text-[var(--text-muted-alt)]">
                                    Moisture
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {pendingSodas
                                  .filter((s) => s.partyMandi === supplier)
                                  .map((soda) => (
                                    <tr
                                      key={soda.id}
                                      className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)] transition-colors"
                                    >
                                      <td className="p-2 text-center">
                                        <input
                                          type="radio"
                                          name="soda"
                                          value={soda.id}
                                          checked={selectedSodaId === soda.id}
                                          onChange={() =>
                                            setSelectedSodaId(soda.id)
                                          }
                                          className="accent-amber-500"
                                        />
                                      </td>
                                      <td className="p-2 text-[var(--text-muted)]">
                                        {new Date(
                                          soda.date,
                                        ).toLocaleDateString()}
                                      </td>
                                      <td className="p-2 font-medium text-[var(--text-main)]">
                                        {soda.cropType}{" "}
                                        {soda.variety
                                          ? `- ${soda.variety}`
                                          : ""}
                                      </td>
                                      <td className="p-2 text-[var(--text-main)]">
                                        {soda.bags}
                                      </td>
                                      <td className="p-2 text-[var(--text-muted)]">
                                        {soda.moisture}
                                      </td>
                                    </tr>
                                  ))}
                                {pendingSodas.filter(
                                  (s) => s.partyMandi === supplier,
                                ).length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={5}
                                      className="p-4 text-center text-[var(--text-muted-alt)] italic"
                                    >
                                      No pending sodas found for this supplier.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {selectedSodaId && (
                            <div className="mt-4 pt-4 border-t border-[var(--border-subtle-alt)]">
                              <div className="max-w-xs">
                                <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">
                                  Bags Received{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={bagsReceived}
                                  onChange={(e) =>
                                    setBagsReceived(e.target.value)
                                  }
                                  className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500"
                                  placeholder="Enter bags received..."
                                />
                              </div>

                              {(() => {
                                const selectedSoda = pendingSodas.find(
                                  (s) => s.id === selectedSodaId,
                                );
                                if (!selectedSoda || !bagsReceived) return null;

                                const predeterminedBags = parseFloat(
                                  selectedSoda.bags || "0",
                                );
                                const received = parseFloat(bagsReceived);

                                if (isNaN(predeterminedBags) || isNaN(received))
                                  return null;

                                const diff = received - predeterminedBags;
                                const percentageDiff =
                                  (Math.abs(diff) / predeterminedBags) * 100;

                                if (percentageDiff > 2) {
                                  return (
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-red-500/5 p-4 rounded-lg border border-red-500/20">
                                      <div className="col-span-1 sm:col-span-3 flex items-center gap-2 text-red-500 font-medium text-xs">
                                        <Shield size={14} /> Difference &gt; 2%
                                        ({percentageDiff.toFixed(1)}%). Quality
                                        cut required.
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">
                                          Cut Type
                                        </label>
                                        <select
                                          value={qualityCutType}
                                          onChange={(e) =>
                                            setQualityCutType(e.target.value)
                                          }
                                          className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-red-500"
                                        >
                                          <option value="BAGS">By Bags</option>
                                          <option value="PERCENTAGE">
                                            By Percentage
                                          </option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">
                                          Cut Value{" "}
                                          {qualityCutType === "PERCENTAGE"
                                            ? "(%)"
                                            : "(Bags)"}
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          value={qualityCutValue}
                                          onChange={(e) =>
                                            setQualityCutValue(e.target.value)
                                          }
                                          className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-red-500"
                                          placeholder="e.g. 1.5"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">
                                          Reason
                                        </label>
                                        <input
                                          type="text"
                                          value={qualityCutReason}
                                          onChange={(e) =>
                                            setQualityCutReason(e.target.value)
                                          }
                                          className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-red-500"
                                          placeholder="Reason..."
                                        />
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">
                        Challan No.
                      </label>
                      <input
                        type="text"
                        value={challanNo}
                        onChange={(e) => setChallanNo(e.target.value)}
                        className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">
                        Remarks
                      </label>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        rows={2}
                        className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500 resize-none"
                      ></textarea>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={handleReset}
                      className="flex-1 border border-[var(--border-subtle)] hover:border-[var(--border-subtle)] hover:bg-[var(--glass-bg)] text-[var(--text-muted)] px-3 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleSaveTransaction}
                      disabled={saveTransactionLock.pending}
                      className="flex-[2] bg-blue-600 hover:bg-blue-500 text-[var(--text-main)] px-3 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Save size={16} />{" "}
                      {saveTransactionLock.pending
                        ? "Saving..."
                        : "Save Transaction"}
                    </button>
                  </div>
                </div>

                {/* Container 2: Weight Captured */}
                <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] shadow-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-medium text-[var(--text-main)]">
                        Weight Captured
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${connectionStatus === "Connected" && isStreaming ? "bg-green-500" : "bg-gray-500"}`}
                        ></span>
                        <span
                          className={`text-xs font-medium ${connectionStatus === "Connected" && isStreaming ? "text-green-500" : "text-[var(--text-muted-alt)]"}`}
                        >
                          {connectionStatus === "Connected" && isStreaming
                            ? "Stable"
                            : "Offline"}
                        </span>
                      </div>
                    </div>

                    <div className="text-center py-6">
                      <div className="text-5xl font-black text-[var(--text-main)] tabular-nums tracking-tight">
                        {currentWeight.toLocaleString()}{" "}
                        <span className="text-2xl text-[var(--text-muted-alt)] font-medium ml-1">
                          kg
                        </span>
                      </div>
                      <div className="text-blue-500 font-medium mt-2">
                        Gross Weight
                      </div>
                      <div className="text-[var(--text-muted-alt)] text-xs mt-3">
                        Last Updated: {lastReading}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="border border-[var(--border-subtle)] rounded-lg p-3 text-center bg-[var(--bg-panel)]">
                        <div className="text-xs text-[var(--text-muted-alt)] mb-1">
                          Tare Weight
                        </div>
                        <div className="text-xl font-bold text-[var(--text-main)]">
                          {tareWeight.toLocaleString()}{" "}
                          <span className="text-sm text-[var(--text-muted-alt)]">
                            kg
                          </span>
                        </div>
                      </div>
                      <div className="border border-green-500/30 rounded-lg p-3 text-center bg-green-500/5">
                        <div className="text-xs text-green-500 mb-1">
                          Net Weight
                        </div>
                        <div className="text-xl font-bold text-green-500">
                          {netWeight.toLocaleString()}{" "}
                          <span className="text-sm opacity-70">kg</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-5">
                    <button
                      onClick={handleTare}
                      className="flex flex-col items-center justify-center gap-1.5 border border-[var(--border-subtle)] hover:border-[var(--border-subtle)] hover:bg-[var(--glass-bg)] rounded-lg py-2 transition-colors"
                    >
                      <Scale
                        size={14}
                        className="text-[var(--text-muted-alt)]"
                      />
                      <span className="text-[11px] font-medium text-[var(--text-muted)]">
                        Tare
                      </span>
                    </button>
                    <button
                      onClick={handleCaptureWt}
                      className="flex flex-col items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 rounded-lg py-2 shadow-lg shadow-green-600/20 transition-colors"
                    >
                      <ShieldCheck
                        size={14}
                        className="text-[var(--text-main)]"
                      />
                      <span className="text-[11px] font-medium text-[var(--text-main)]">
                        Capture Wt
                      </span>
                    </button>
                    <button
                      onClick={handleManual}
                      className="flex flex-col items-center justify-center gap-1.5 border border-[var(--border-subtle)] hover:border-[var(--border-subtle)] hover:bg-[var(--glass-bg)] rounded-lg py-2 transition-colors"
                    >
                      <Edit3
                        size={14}
                        className="text-[var(--text-muted-alt)]"
                      />
                      <span className="text-[11px] font-medium text-[var(--text-muted)]">
                        Manual
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Gauge + Status */}
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-[var(--text-main)] mb-4">
                Live Weight Indicator
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Container 3: Gauge */}
                <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] shadow-2xl p-5 flex flex-col items-center justify-center relative">
                  <div className="relative mt-8">
                    <svg
                      width="240"
                      height="140"
                      viewBox="0 0 200 120"
                      className="drop-shadow-2xl"
                    >
                      <defs>
                        <linearGradient
                          id="gaugeGradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop offset="0%" stopColor="#22c55e" />
                          <stop offset="50%" stopColor="#eab308" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                        <filter
                          id="glow"
                          x="-20%"
                          y="-20%"
                          width="140%"
                          height="140%"
                        >
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite
                            in="SourceGraphic"
                            in2="blur"
                            operator="over"
                          />
                        </filter>
                      </defs>
                      {/* Background Arc */}
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="#1f2937"
                        strokeWidth="14"
                        strokeLinecap="round"
                      />

                      {/* Value Arc (Dynamic with Dasharray) */}
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="url(#gaugeGradient)"
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={arcLength}
                        strokeDashoffset={dashOffset}
                        filter="url(#glow)"
                        style={{
                          transition:
                            "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      />

                      {/* Ticks & Labels */}
                      <text
                        x="20"
                        y="118"
                        fill="#6b7280"
                        fontSize="8"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        0
                      </text>
                      <text
                        x="60"
                        y="42"
                        fill="#6b7280"
                        fontSize="8"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        5000
                      </text>
                      <text
                        x="100"
                        y="12"
                        fill="#6b7280"
                        fontSize="8"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        10000
                      </text>
                      <text
                        x="140"
                        y="42"
                        fill="#6b7280"
                        fontSize="8"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        15000
                      </text>
                      <text
                        x="180"
                        y="118"
                        fill="#6b7280"
                        fontSize="8"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        20000
                      </text>

                      {/* Needle */}
                      <g
                        style={{
                          transform: `rotate(${angle - 90}deg)`,
                          transformOrigin: "100px 100px",
                          transition:
                            "transform 1s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      >
                        {/* Needle Body */}
                        <polygon
                          points="97,100 103,100 100,30"
                          fill="#e5e7eb"
                        />
                        {/* Center Hub */}
                        <circle
                          cx="100"
                          cy="100"
                          r="8"
                          fill="#1f2937"
                          stroke="#e5e7eb"
                          strokeWidth="2"
                        />
                        <circle cx="100" cy="100" r="3" fill="#22c55e" />
                      </g>
                    </svg>
                  </div>

                  <div className="text-center mt-2">
                    <div className="text-3xl font-black text-green-500 tabular-nums tracking-tight">
                      {currentWeight.toLocaleString()}{" "}
                      <span className="text-lg opacity-80 font-medium ml-1">
                        kg
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <span
                        className={`h-2 w-2 rounded-full ${connectionStatus === "Connected" && isStreaming ? "bg-green-500" : "bg-gray-500"}`}
                      ></span>
                      <span
                        className={`text-xs font-medium ${connectionStatus === "Connected" && isStreaming ? "text-green-500" : "text-[var(--text-muted-alt)]"}`}
                      >
                        {connectionStatus === "Connected" && isStreaming
                          ? "Stable"
                          : "Offline"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Container 4: Weighbridge Status */}
                <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] shadow-2xl p-5 flex flex-col">
                  <h3 className="text-sm font-semibold text-[var(--text-main)] mb-4">
                    Weighbridge Status
                  </h3>

                  <div className="space-y-4 flex-1">
                    <div className="flex justify-between items-center text-sm border-b border-[var(--border-subtle-alt)] pb-2">
                      <span className="text-[var(--text-muted-alt)]">
                        Connection Status
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium border ${
                          connectionStatus === "Connected"
                            ? "text-green-500 bg-green-500/10 border-green-500/20"
                            : "text-red-400 bg-red-500/10 border-red-500/20"
                        }`}
                      >
                        {connectionStatus}
                      </span>
                    </div>
                    {connectionMessage && connectionStatus !== "Connected" && (
                      <p className="text-[10px] text-amber-500/90 leading-snug -mt-2">
                        {connectionMessage}
                      </p>
                    )}
                    <div className="flex justify-between items-center text-sm border-b border-[var(--border-subtle-alt)] pb-2">
                      <span className="text-[var(--text-muted-alt)]">
                        Port / IP
                      </span>
                      <span className="text-[var(--text-main)] font-medium">
                        {FIXED_WEIGHBRIDGE.port}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-[var(--border-subtle-alt)] pb-2">
                      <span className="text-[var(--text-muted-alt)]">
                        Baud Rate / Speed
                      </span>
                      <span className="text-[var(--text-main)] font-medium">
                        {FIXED_WEIGHBRIDGE.baudRate}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-[var(--border-subtle-alt)] pb-2">
                      <span className="text-[var(--text-muted-alt)]">
                        Indicator Model
                      </span>
                      <span className="text-[var(--text-main)] font-medium">
                        {settings.indicatorModel || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-[var(--border-subtle-alt)] pb-2">
                      <span className="text-[var(--text-muted-alt)]">
                        Last Reading
                      </span>
                      <span className="text-[var(--text-main)] font-medium">
                        {lastReading}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--text-muted-alt)]">
                        Status
                      </span>
                      <span
                        className={`${connectionStatus === "Connected" && isStreaming ? "text-green-500" : "text-[var(--text-muted-alt)]"} font-medium`}
                      >
                        {connectionStatus === "Connected" && isStreaming
                          ? "Stable"
                          : "Offline"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[var(--border-subtle-alt)] space-y-2">
                    {webSerialConnected ? (
                      <button
                        type="button"
                        disabled={webSerialBusy}
                        onClick={handleDisconnectIndicator}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-600/90 hover:bg-red-500 disabled:opacity-50 text-[var(--text-main)] rounded-lg text-sm font-medium transition-colors"
                      >
                        <Unplug size={16} />{" "}
                        {webSerialBusy
                          ? "Disconnecting…"
                          : "Disconnect Indicator"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={webSerialBusy}
                        onClick={handleConnectIndicator}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[var(--text-main)] rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-600/20"
                      >
                        <Plug size={16} />{" "}
                        {webSerialBusy
                          ? "Connecting…"
                          : `Connect ${FIXED_WEIGHBRIDGE.port} @ ${FIXED_WEIGHBRIDGE.baudRate}`}
                      </button>
                    )}
                    <p className="text-[10px] text-[var(--text-muted-alt)] leading-snug">
                      {webSerialConnected
                        ? `Live on ${FIXED_WEIGHBRIDGE.port} @ ${FIXED_WEIGHBRIDGE.baudRate}. Keep this tab open.`
                        : isWebSerialSupported()
                          ? `Fixed profile ${FIXED_WEIGHBRIDGE.port} @ ${FIXED_WEIGHBRIDGE.baudRate}. First click may ask Chrome to allow COM4 once; after that no selection.`
                          : "Use Chrome or Edge on the weighbridge PC to connect the indicator."}
                    </p>
                    <button
                      type="button"
                      onClick={refreshConnectionStatus}
                      className="flex items-center justify-center gap-2 w-full py-2 border border-[var(--border-subtle)] hover:bg-[var(--bg-base)] text-[var(--text-muted)] rounded-lg text-sm font-medium transition-colors"
                    >
                      <RefreshCw size={16} /> Refresh Status
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================
 TAB 2: HISTORY
 ====================================================================== */}
        {activeTab === "history" && (
          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] shadow-2xl p-6">
            <div className="flex flex-wrap items-center gap-4 mb-6 border-b border-[var(--border-subtle-alt)] pb-6">
              <div className="flex items-center bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2">
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  className="bg-transparent border-none text-sm text-[var(--text-muted)] focus:outline-none w-[110px] "
                />
                <span className="text-[var(--text-muted-alt)] mx-2">To</span>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  className="bg-transparent border-none text-sm text-[var(--text-muted)] focus:outline-none w-[110px] "
                />
              </div>

              <select
                value={historyTypeFilter}
                onChange={(e) => setHistoryTypeFilter(e.target.value)}
                className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500"
              >
                {uniqueTransactionTypes.map((type) => (
                  <option key={type as string} value={type as string}>
                    {type as string}
                  </option>
                ))}
              </select>

              <select
                value={historyMaterialFilter}
                onChange={(e) => setHistoryMaterialFilter(e.target.value)}
                className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500"
              >
                {uniqueMaterials.map((mat) => (
                  <option key={mat as string} value={mat as string}>
                    {mat as string}
                  </option>
                ))}
              </select>

              <Combobox
                name="historySupplierFilter"
                value={historySupplierFilter}
                onChange={(e: any) => setHistorySupplierFilter(e.target.value)}
                options={uniqueSuppliers.map((sup) => ({
                  id: sup as string,
                  name: sup as string,
                }))}
                valueKey="id"
                placeholder="All Suppliers"
                className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500"
              />

              <div className="relative flex-1 min-w-[250px]">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted-alt)]"
                />
                <input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  type="text"
                  placeholder="Search Vehicle No. / Challan No. / Supplier"
                  className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                onClick={handleExportCSV}
                className="bg-blue-600 hover:bg-blue-500 text-[var(--text-main)] px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20 text-sm flex items-center gap-2"
              >
                <Download size={16} /> Export
              </button>
            </div>

            {/* Enterprise Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[var(--bg-panel-hover)] text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Date & Time</th>
                    <th className="px-4 py-3 font-medium">Transaction Type</th>
                    <th className="px-4 py-3 font-medium">Vehicle No.</th>
                    <th className="px-4 py-3 font-medium">Material</th>
                    <th className="px-4 py-3 font-medium">Supplier</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Gross Wt (kg)
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      Tare Wt (kg)
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      Net Wt (kg)
                    </th>
                    <th className="px-4 py-3 font-medium">Challan No.</th>
                    <th className="px-4 py-3 font-medium">Driver Name</th>
                    <th className="px-4 py-3 font-medium">Created By</th>
                    <th className="px-4 py-3 font-medium text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[var(--text-muted)]">
                  {isLoadingHistory ? (
                    <tr>
                      <td
                        colSpan={13}
                        className="px-4 py-8 text-center text-[var(--text-muted-alt)]"
                      >
                        Loading history...
                      </td>
                    </tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={13}
                        className="px-4 py-8 text-center text-[var(--text-muted-alt)]"
                      >
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((row, idx) => (
                      <tr
                        key={row.id}
                        className="hover:bg-[var(--glass-bg)] transition-colors"
                      >
                        <td className="px-4 py-3">{idx + 1}</td>
                        <td className="px-4 py-3 text-[var(--text-muted-alt)]">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium border ${row.transactionType === "Inward" ? "text-green-400 bg-green-400/10 border-green-400/20" : row.transactionType === "Outward" ? "text-red-400 bg-red-400/10 border-red-400/20" : "text-[var(--text-muted-alt)] bg-gray-400/10 border-gray-400/20"}`}
                          >
                            {row.transactionType || "UNKNOWN"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--text-main)] uppercase">
                          {row.vehicleNo}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted-alt)]">
                          {row.materialType || "-"}
                        </td>
                        <td className="px-4 py-3">{row.supplierName || "-"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {row.grossWeight?.toLocaleString() || "-"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--text-muted-alt)]">
                          {row.tareWeight?.toLocaleString() || "-"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-500">
                          {row.netWeight?.toLocaleString() || "-"}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted-alt)]">
                          {row.challanNo || "-"}
                        </td>
                        <td className="px-4 py-3">{row.driverName || "-"}</td>
                        <td className="px-4 py-3 text-[var(--text-muted-alt)]">
                          -
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleViewDetails(row)}
                            className="text-[var(--text-muted-alt)] hover:text-amber-500 transition-colors p-1 rounded-md hover:bg-amber-500/10"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Pagination */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border-subtle-alt)]">
              <div className="text-sm text-[var(--text-muted-alt)]">
                Showing 1 to {filteredHistory.length} of{" "}
                {filteredHistory.length} records
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="p-2 border border-[var(--border-subtle)] rounded hover:bg-[var(--glass-bg)] text-[var(--text-muted-alt)] disabled:opacity-50"
                  disabled
                >
                  &larr;
                </button>
                <button className="w-8 h-8 flex items-center justify-center border border-blue-600 bg-blue-600/20 text-blue-500 rounded font-medium">
                  1
                </button>
                <button
                  className="p-2 border border-[var(--border-subtle)] rounded hover:bg-[var(--glass-bg)] text-[var(--text-muted-alt)] disabled:opacity-50"
                  disabled
                >
                  &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================
 TAB 3: SETTINGS
 ====================================================================== */}
        {activeTab === "settings" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] shadow-2xl p-8">
              <h2 className="text-xl font-semibold text-[var(--text-main)] mb-8 border-b border-[var(--border-subtle-alt)] pb-4">
                Integration Settings
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1.5">
                    Weighbridge Indicator Model
                  </label>
                  <select
                    value={settings.indicatorModel}
                    onChange={(e) =>
                      handleSettingChange("indicatorModel", e.target.value)
                    }
                    className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 appearance-none"
                  >
                    <option>Essae - DS2520</option>
                    <option>Mettler Toledo - IND231</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1.5">
                    Connection Type
                  </label>
                  <select
                    value={settings.connectionType}
                    onChange={(e) =>
                      handleSettingChange("connectionType", e.target.value)
                    }
                    className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 appearance-none"
                  >
                    <option>Serial Port (COM)</option>
                    <option>TCP/IP Network</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1.5">
                      Port (fixed)
                    </label>
                    <input
                      type="text"
                      value={FIXED_WEIGHBRIDGE.port}
                      disabled
                      className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm text-[var(--text-main)] opacity-70 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1.5">
                      Baud Rate (fixed)
                    </label>
                    <input
                      type="text"
                      value={String(FIXED_WEIGHBRIDGE.baudRate)}
                      disabled
                      className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm text-[var(--text-main)] opacity-70 cursor-not-allowed"
                    />
                  </div>
                </div>
                <p className="text-xs text-amber-500/90 -mt-2">
                  Locked for this mill: {FIXED_WEIGHBRIDGE.port} @{" "}
                  {FIXED_WEIGHBRIDGE.baudRate} (verified in PuTTY). No daily
                  port/baud selection.
                </p>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1.5">
                      Data Bits
                    </label>
                    <select
                      value={settings.dataBits}
                      onChange={(e) =>
                        handleSettingChange("dataBits", e.target.value)
                      }
                      className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 appearance-none"
                    >
                      <option>8</option>
                      <option>7</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1.5">
                      Stop Bits
                    </label>
                    <select
                      value={settings.stopBits}
                      onChange={(e) =>
                        handleSettingChange("stopBits", e.target.value)
                      }
                      className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 appearance-none"
                    >
                      <option>1</option>
                      <option>2</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1.5">
                      Parity
                    </label>
                    <select
                      value={settings.parity}
                      onChange={(e) =>
                        handleSettingChange("parity", e.target.value)
                      }
                      className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 appearance-none"
                    >
                      <option>None</option>
                      <option>Odd</option>
                      <option>Even</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1.5">
                    Weight Unit
                  </label>
                  <select
                    value={settings.weightUnit}
                    onChange={(e) =>
                      handleSettingChange("weightUnit", e.target.value)
                    }
                    className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 appearance-none"
                  >
                    <option>Kilogram (kg)</option>
                    <option>Tonne (t)</option>
                  </select>
                </div>

                {/* Toggles */}
                <div className="space-y-4 pt-6 border-t border-[var(--border-subtle-alt)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          handleSettingChange(
                            "autoCapture",
                            !settings.autoCapture,
                          )
                        }
                        className={`w-11 h-6 rounded-full transition-colors relative ${settings.autoCapture ? "bg-green-500" : "bg-gray-600"}`}
                      >
                        <span
                          className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.autoCapture ? "translate-x-5" : "translate-x-0"}`}
                        ></span>
                      </button>
                      <span className="text-sm font-medium text-[var(--text-main)]">
                        Auto Capture Stable Weight
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[var(--text-muted-alt)]">
                        Stable Range (kg)
                      </span>
                      <input
                        type="text"
                        defaultValue="10"
                        className="w-16 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-center py-1 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-12">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          handleSettingChange("autoSave", !settings.autoSave)
                        }
                        className={`w-11 h-6 rounded-full transition-colors relative ${settings.autoSave ? "bg-green-500" : "bg-gray-600"}`}
                      >
                        <span
                          className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.autoSave ? "translate-x-5" : "translate-x-0"}`}
                        ></span>
                      </button>
                      <span className="text-sm font-medium text-[var(--text-main)]">
                        Auto Save After Capture
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          handleSettingChange("autoTare", !settings.autoTare)
                        }
                        className={`w-11 h-6 rounded-full transition-colors relative ${settings.autoTare ? "bg-green-500" : "bg-gray-600"}`}
                      >
                        <span
                          className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.autoTare ? "translate-x-5" : "translate-x-0"}`}
                        ></span>
                      </button>
                      <span className="text-sm font-medium text-[var(--text-main)]">
                        Auto Tare After Save
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-8 mt-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleTestConnection}
                      disabled={isTestingConnection}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-[var(--text-main)] px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20 text-sm flex items-center gap-2"
                    >
                      <Settings2 size={16} />{" "}
                      {isTestingConnection ? "Testing…" : "Test Connection"}
                    </button>
                    {testSuccess && (
                      <div className="flex items-center gap-2 text-green-400 text-sm font-medium bg-green-400/10 px-3 py-2 rounded-lg border border-green-400/20">
                        <Shield size={16} /> Connection Successful
                      </div>
                    )}
                    {connectionStatus === "Not Connected" && !testSuccess && (
                      <div className="flex items-center gap-2 text-red-400 text-sm font-medium bg-red-400/10 px-3 py-2 rounded-lg border border-red-400/20">
                        <Link2Off size={16} /> Not Connected
                      </div>
                    )}
                  </div>
                  <button
                    disabled={isSavingSettings}
                    onClick={handleSaveSettings}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-[var(--text-main)] px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20 text-sm flex items-center gap-2"
                  >
                    <Save size={16} />{" "}
                    {isSavingSettings ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <CustomModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title}
        footer={
          <button
            onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
            className="px-4 py-2 bg-blue-600 text-[var(--text-main)] hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
          >
            Okay
          </button>
        }
      >
        {typeof modalConfig.content === "string" ? (
          <p className="text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap">
            {modalConfig.content}
          </p>
        ) : (
          modalConfig.content
        )}
      </CustomModal>

      {/* Manual Entry Modal */}
      <CustomModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Manual Weight Entry"
        footer={
          <>
            <button
              onClick={() => setIsManualModalOpen(false)}
              className="px-4 py-2 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--glass-bg)] rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const weight = parseInt(manualWeightInput, 10);
                if (!isNaN(weight) && weight > 0) {
                  setWeightData({
                    vehicleNo: vehicleNo || "MANUAL-ENTRY",
                    grossWeight: weight,
                  });
                  setIsStreaming(false);
                  setLastReading(
                    new Date().toLocaleString() + " (Manual Override)",
                  );
                  setIsManualModalOpen(false);
                } else {
                  setModalConfig({
                    isOpen: true,
                    title: "Invalid Input",
                    content:
                      "Please enter a valid numeric weight greater than 0.",
                  });
                }
              }}
              className="px-4 py-2 bg-blue-600 text-[var(--text-main)] hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
            >
              Confirm Weight
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-sm text-amber-500">
              <strong>Note:</strong> Manual entry overrides the live weighbridge
              feed. This action will be flagged in the audit logs.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1.5">
              Gross Weight (kg) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={manualWeightInput}
              onChange={(e) => setManualWeightInput(e.target.value)}
              className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-main)] focus:outline-none focus:border-amber-500 font-medium text-lg"
              placeholder="e.g. 15000"
              autoFocus
            />
          </div>
        </div>
      </CustomModal>
    </div>
  );
};

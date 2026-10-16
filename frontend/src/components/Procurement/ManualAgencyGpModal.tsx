import React, { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import api from "../../api/axios";
import { useUiStore } from "../../store/uiStore";
import { useAuthStore } from "../../store/authStore";
import { biometricService } from "../../services/biometricService";
import { CustomModal } from "../CustomModal";

type Props = {
  open: boolean;
  onClose: () => void;
  plantId: string;
  suppliers: any[];
  mandis: any[];
  onSaved: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);

/** Feedback 48 — Direct / manual Agency GP */
export default function ManualAgencyGpModal({
  open,
  onClose,
  plantId,
  suppliers,
  mandis,
  onSaved,
}: Props) {
  const toast = useUiStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);
  const isAdmin = /SUPER_ADMIN|PLANT_MANAGER|ADMIN/i.test(String(user?.role || ""));
  const [trucks, setTrucks] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [fp, setFp] = useState("");
  const [form, setForm] = useState({
    date: today(),
    agencyGp: "",
    truckNo: "",
    arthiaId: "",
    partyName: "",
    mandi: "",
    bagsClass: "A_CLASS",
    bags: "",
  });

  useEffect(() => {
    if (!open) return;
    setFp("");
    setForm({
      date: today(),
      agencyGp: "",
      truckNo: "",
      arthiaId: "",
      partyName: "",
      mandi: "",
      bagsClass: "A_CLASS",
      bags: "",
    });
    api
      .get("/api/master-data/trucks/all", { headers: { "x-plant-id": plantId } })
      .then((res) => setTrucks(Array.isArray(res.data) ? res.data : res.data?.data || []))
      .catch(() => setTrucks([]));
  }, [open, plantId]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const scan = async () => {
    setScanning(true);
    try {
      const xml = await biometricService.captureAndVerifyLoggedInUser();
      setFp(xml);
      toast("Fingerprint captured", "success");
    } catch (e: any) {
      toast(e?.message || "Fingerprint failed", "error");
    } finally {
      setScanning(false);
    }
  };

  const submit = async () => {
    if (!plantId || plantId === "global") {
      toast("Select a mill first", "error");
      return;
    }
    if (!form.agencyGp.trim()) return toast("Agency GP is required", "error");
    if (!form.truckNo) return toast("Truck No. is required", "error");
    if (!form.arthiaId) return toast("Arthia Name is required", "error");
    if (!form.partyName) return toast("Party Name is required", "error");
    if (!form.mandi) return toast("Mandi is required", "error");
    if (!/^\d+$/.test(form.bags) || Number(form.bags) <= 0)
      return toast("Bags must be a whole number greater than 0", "error");
    if (!isAdmin && !fp) return toast("Supervisor fingerprint is required", "error");
    const arthia = suppliers.find((s) => s.id === form.arthiaId);
    setSaving(true);
    try {
      await api.post("/api/procurement/reports/manual-agency-gp", {
        plantId,
        date: form.date,
        agencyGp: form.agencyGp.trim(),
        truckNo: form.truckNo,
        arthiaId: form.arthiaId,
        arthiaName: arthia?.name || "",
        partyName: form.partyName,
        mandi: form.mandi,
        bagsClass: form.bagsClass,
        bags: Number(form.bags),
        biometricData: fp || (isAdmin ? "ADMIN_BYPASS" : ""),
      });
      toast("Direct Agency GP submitted. Admin notified.", "success");
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e?.response?.data?.message || "Submit failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const field = "w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]";

  return (
    <CustomModal isOpen={open} onClose={onClose} title="Direct Agency GP" maxWidthClass="max-w-lg">
      <div className="space-y-3">
        <p className="text-[11px] text-[var(--text-muted-alt)]">
          Manual entry. A yellow dot marks this row on the Govt Inward List. Agency GP numbers cannot be repeated.
        </p>
        <label className="block text-xs text-[var(--text-muted-alt)]">
          Date
          <input type="date" className={field} value={form.date} onChange={(e) => set("date", e.target.value)} />
        </label>
        <label className="block text-xs text-[var(--text-muted-alt)]">
          Agency GP
          <input className={field} value={form.agencyGp} onChange={(e) => set("agencyGp", e.target.value)} />
        </label>
        <label className="block text-xs text-[var(--text-muted-alt)]">
          Truck No.
          <select className={field} value={form.truckNo} onChange={(e) => set("truckNo", e.target.value)}>
            <option value="">Select truck</option>
            {trucks.map((t) => {
              const no = t.truckNumber || t.vehicleNo || t.number || "";
              return (
                <option key={t.id || no} value={no}>
                  {no}
                </option>
              );
            })}
          </select>
        </label>
        <label className="block text-xs text-[var(--text-muted-alt)]">
          Arthia Name
          <select className={field} value={form.arthiaId} onChange={(e) => set("arthiaId", e.target.value)}>
            <option value="">Select arthia</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-[var(--text-muted-alt)]">
          Party Name
          <select className={field} value={form.partyName} onChange={(e) => set("partyName", e.target.value)}>
            <option value="">Select party</option>
            {suppliers.map((s) => (
              <option key={`p-${s.id}`} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-[var(--text-muted-alt)]">
          Mandi
          <select className={field} value={form.mandi} onChange={(e) => set("mandi", e.target.value)}>
            <option value="">Select mandi</option>
            {mandis
              .filter((m: any) => m.isActive !== false)
              .map((m: any) => (
                <option key={m.id || m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-[var(--text-muted-alt)]">
            Bags Class
            <select className={field} value={form.bagsClass} onChange={(e) => set("bagsClass", e.target.value)}>
              <option value="A_CLASS">A Class</option>
              <option value="B_CLASS">B Class</option>
            </select>
          </label>
          <label className="block text-xs text-[var(--text-muted-alt)]">
            Bags
            <input
              type="number"
              min="1"
              step="1"
              className={field}
              value={form.bags}
              onChange={(e) => set("bags", e.target.value.replace(/\D/g, ""))}
            />
          </label>
        </div>
        {!isAdmin && (
        <div className="flex items-center justify-between gap-2 rounded border border-[var(--border-subtle)] p-2">
          <span className="text-xs text-[var(--text-muted)]">
            Supervisor fingerprint must match this login{" "}
            {fp ? <span className="text-green-400">matched</span> : <span className="text-red-400">required</span>}
          </span>
          <button
            type="button"
            onClick={scan}
            disabled={scanning}
            className="flex items-center gap-1 px-3 py-1.5 rounded border border-[var(--border-subtle)] text-xs"
          >
            <Fingerprint size={14} /> {scanning ? "Scanning…" : "Scan"}
          </button>
        </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded border border-[var(--border-subtle)]">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="px-3 py-1.5 text-sm rounded bg-yellow-400 text-black font-bold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Submit"}
          </button>
        </div>
      </div>
    </CustomModal>
  );
}

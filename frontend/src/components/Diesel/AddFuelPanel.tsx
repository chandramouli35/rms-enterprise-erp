import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Fingerprint, Plus } from 'lucide-react';
import api from '../../api/axios';
import { dieselApi } from '../../api/diesel';
import { biometricService } from '../../services/biometricService';
import { useUiStore } from '../../store/uiStore';
import { useSubmitLock } from '../../hooks/useSubmitLock';
import { hasDieselPermission } from '../../utils/dieselPermissions';

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 3 });

export const AddFuelPanel: React.FC = () => {
  const addToast = useUiStore((s) => s.addToast);
  const submitLock = useSubmitLock();
  const canAdd = hasDieselPermission('Add Fuel', 'canAdd');

  const [formOpen, setFormOpen] = useState(false);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [driverOpts, setDriverOpts] = useState<{ staff: any[]; drivers: any[] }>({
    staff: [],
    drivers: [],
  });

  const [date] = useState(todayStr());
  const [truckId, setTruckId] = useState('');
  const [plantId, setPlantId] = useState('');
  const [slipNo, setSlipNo] = useState('');
  const [newReading, setNewReading] = useState('');
  const [dieselQty, setDieselQty] = useState('');
  const [rate, setRate] = useState('');
  const [partyId, setPartyId] = useState('');
  const [driverKey, setDriverKey] = useState(''); // staff:id | driver:id
  const [meta, setMeta] = useState<any>(null);
  const [biometricData, setBiometricData] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastHint, setLastHint] = useState('');

  const loadMasters = useCallback(async () => {
    try {
      const [t, partiesRes, d, plantsRes] = await Promise.all([
        dieselApi.trucks(),
        dieselApi.parties(),
        dieselApi.drivers(),
        api.get('/plants'),
      ]);
      setTrucks(Array.isArray(t.data) ? t.data : []);
      setParties(Array.isArray(partiesRes.data) ? partiesRes.data : []);
      setDriverOpts({
        staff: d.data?.staff || [],
        drivers: d.data?.drivers || [],
      });
      setPlants(Array.isArray(plantsRes.data) ? plantsRes.data : plantsRes.data?.data || []);
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to load masters', 'error');
    }
  }, [addToast]);

  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  useEffect(() => {
    if (!truckId) {
      setMeta(null);
      setLastHint('');
      return;
    }
    dieselApi
      .lastForTruck(truckId)
      .then((res) => {
        setMeta(res.data);
        const le = res.data?.lastEntry;
        if (le) {
          setLastHint(
            `Last: ${le.plantName || '—'} · Pump ${le.partyName || '—'} · By ${le.submittedByName || '—'}`,
          );
        } else {
          setLastHint('First entry for this vehicle (Old Reading = 0)');
        }
      })
      .catch(() => setMeta(null));
  }, [truckId]);

  const oldReading = meta?.oldReading ?? 0;
  const oldAverage = meta?.oldAverage ?? 0;
  const truckType = meta?.truckType || '—';
  const readingUnit = meta?.readingUnit || 'KM';
  const oldSlip = meta?.oldSlipNo ?? 0;

  const qty = parseFloat(dieselQty);
  const nr = parseFloat(newReading);
  const rt = parseFloat(rate);
  const totalRun =
    Number.isFinite(nr) && nr > oldReading ? Math.round((nr - oldReading) * 1000) / 1000 : null;
  const calcAvg =
    totalRun != null && qty > 0 ? Math.round((totalRun / qty) * 1000) / 1000 : null;
  const amount = qty > 0 && rt > 0 ? Math.round(qty * rt * 1000) / 1000 : null;

  const driverOptions = useMemo(() => {
    return [
      ...driverOpts.staff.map((s) => ({
        key: `staff:${s.id}`,
        label: `${s.name} (Staff${s.role ? ` · ${s.role}` : ''})`,
      })),
      ...driverOpts.drivers.map((d) => ({
        key: `driver:${d.id}`,
        label: `${d.name} (Driver)`,
      })),
    ];
  }, [driverOpts]);

  const scan = async () => {
    setScanning(true);
    try {
      const xml = await biometricService.captureAndVerifyLoggedInUser();
      setBiometricData(xml);
      addToast('Fingerprint captured', 'success');
    } catch (e: any) {
      setBiometricData('');
      addToast(e?.message || 'Scan failed', 'error');
    } finally {
      setScanning(false);
    }
  };

  const resetForm = () => {
    setTruckId('');
    setPlantId('');
    setSlipNo('');
    setNewReading('');
    setDieselQty('');
    setRate('');
    setPartyId('');
    setDriverKey('');
    setBiometricData('');
    setMeta(null);
    setLastHint('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!truckId || !plantId) {
      addToast('Select truck and mill', 'error');
      return;
    }
    if (!biometricData) {
      addToast('Scan fingerprint before submit', 'error');
      return;
    }
    if (!(parseInt(slipNo, 10) > oldSlip)) {
      addToast(`Slip No. must be > ${oldSlip}`, 'error');
      return;
    }
    if (!(nr > oldReading)) {
      addToast(`New Reading must be > ${oldReading}`, 'error');
      return;
    }
    if (!(qty > 0) || !(rt > 0)) {
      addToast('Diesel Quantity and Rate must be > 0', 'error');
      return;
    }
    if (!partyId) {
      addToast('Select Party / Pump', 'error');
      return;
    }
    if (!driverKey) {
      addToast('Select Driver', 'error');
      return;
    }

    const [kind, id] = driverKey.split(':');
    await submitLock.wrapSubmit(async () => {
      try {
        await dieselApi.createEntry({
          date,
          truckId,
          plantId,
          slipNo: parseInt(slipNo, 10),
          newReading: nr,
          dieselQty: qty,
          rate: rt,
          partyId,
          driverStaffId: kind === 'staff' ? id : undefined,
          driverMasterId: kind === 'driver' ? id : undefined,
          biometricData,
        });
        addToast('Fuel entry saved', 'success');
        resetForm();
        setFormOpen(false);
      } catch (err: any) {
        addToast(err?.response?.data?.message || 'Save failed', 'error');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">Add Fuel</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Truck diesel / refueling entry — fingerprint required.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setFormOpen(true);
          }}
          disabled={!canAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> Add Fuel
        </button>
      </div>

      {!canAdd ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-6 text-sm text-[var(--text-muted)]">
          View only — you need Add permission on Add Fuel to submit refueling entries.
        </div>
      ) : !formOpen ? (
        <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-panel)] p-8 text-center text-sm text-[var(--text-muted)]">
          Tap <span className="text-amber-400 font-semibold">+ Add Fuel</span> to open the
          Truck Diesel / Refueling Entry Form.
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 grid sm:grid-cols-2 gap-3"
        >
          <p className="sm:col-span-2 text-sm font-semibold text-[var(--text-main)]">
            Truck Diesel / Refueling Entry
          </p>

          <label className="text-xs text-[var(--text-muted)]">
            Date
            <input
              type="date"
              value={date}
              readOnly
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)] opacity-80"
            />
          </label>

          <label className="text-xs text-[var(--text-muted)]">
            Truck Number
            <select
              required
              value={truckId}
              onChange={(e) => setTruckId(e.target.value)}
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
            >
              <option value="">Select truck…</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.truckNumber} ({t.vehicleType} · {t.readingUnit})
                </option>
              ))}
            </select>
          </label>

          {truckId && (
            <div className="sm:col-span-2 text-[10px] text-[var(--text-muted-alt)] -mt-1">
              {lastHint}
            </div>
          )}

          <label className="text-xs text-[var(--text-muted)]">
            Mill Name
            <select
              required
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
            >
              <option value="">Select mill…</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-[var(--text-muted)]">
            Slip No. <span className="text-[10px]">(must be &gt; {oldSlip})</span>
            <input
              type="number"
              required
              min={oldSlip + 1}
              value={slipNo}
              onChange={(e) => setSlipNo(e.target.value)}
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
            />
          </label>

          <label className="text-xs text-[var(--text-muted)]">
            Truck Type
            <input
              readOnly
              value={truckType}
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)] opacity-80"
            />
          </label>

          <label className="text-xs text-[var(--text-muted)]">
            Old Reading ({readingUnit})
            <input
              readOnly
              value={fmt(oldReading)}
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)] opacity-80"
            />
          </label>

          <label className="text-xs text-[var(--text-muted)]">
            Old Average ({readingUnit}/L)
            <input
              readOnly
              value={fmt(oldAverage)}
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)] opacity-80"
            />
          </label>

          <label className="text-xs text-[var(--text-muted)]">
            New Truck Reading ({readingUnit})
            <input
              type="number"
              step="0.001"
              required
              value={newReading}
              onChange={(e) => setNewReading(e.target.value)}
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
            />
          </label>

          <label className="text-xs text-[var(--text-muted)]">
            Diesel Quantity (L)
            <input
              type="number"
              step="0.001"
              min="0.001"
              required
              value={dieselQty}
              onChange={(e) => setDieselQty(e.target.value)}
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
            />
          </label>

          <label className="text-xs text-[var(--text-muted)]">
            Total Run (auto)
            <input
              readOnly
              value={totalRun == null ? '—' : fmt(totalRun)}
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)] opacity-80"
            />
          </label>

          <label className="text-xs text-[var(--text-muted)]">
            Calculated Average (auto)
            <input
              readOnly
              value={calcAvg == null ? '—' : fmt(calcAvg)}
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-amber-400 font-semibold opacity-90"
            />
          </label>

          <label className="text-xs text-[var(--text-muted)]">
            Rate (₹)
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
            />
          </label>

          <label className="text-xs text-[var(--text-muted)]">
            Amount (auto)
            <input
              readOnly
              value={amount == null ? '—' : fmt(amount)}
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-amber-400 font-semibold opacity-90"
            />
          </label>

          <label className="text-xs text-[var(--text-muted)]">
            Party Name (Pump / Master)
            <select
              required
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
            >
              <option value="">Select party…</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-[var(--text-muted)]">
            Driver Name
            <select
              required
              value={driverKey}
              onChange={(e) => setDriverKey(e.target.value)}
              className="mt-1 w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
            >
              <option value="">Select driver…</option>
              {driverOptions.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2 flex flex-wrap items-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <label className="text-xs text-[var(--text-muted)] flex-1 min-w-[200px]">
              Fingerprint
              <div className="mt-1 flex gap-2">
                <input
                  type="password"
                  readOnly
                  value={biometricData ? 'Captured ✓' : ''}
                  placeholder="Scan fingerprint…"
                  className="flex-1 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-main)]"
                />
                <button
                  type="button"
                  onClick={scan}
                  disabled={scanning}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-500 text-black text-xs font-bold disabled:opacity-60"
                >
                  <Fingerprint size={14} />
                  {scanning ? 'Scanning…' : 'Scan'}
                </button>
              </div>
            </label>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
              className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-sm text-[var(--text-muted)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLock.pending || !biometricData}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold disabled:opacity-60"
            >
              <Fingerprint size={14} />
              {submitLock.pending ? 'Saving…' : 'Submit with Fingerprint'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

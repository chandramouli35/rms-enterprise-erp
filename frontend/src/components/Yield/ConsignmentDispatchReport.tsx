import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw, Download } from 'lucide-react';
import api from '../../api/axios';
import { usePlantStore } from '../../store/plantStore';
import { biometricService } from '../../services/biometricService';
import { toast } from 'react-hot-toast';
import { exportToExcel } from '../../utils/exportUtils';
import { useSubmitLock } from '../../hooks/useSubmitLock';

const emptyForm = {
  id: '',
  date: new Date().toISOString().slice(0, 10),
  isNilDay: false,
  gatePassId: '',
  gatePassIds: [] as string[],
  fciGpNo: '',
  consignmentNo: '',
  mainBags: '',
  shortageBags: '',
  fciMoisture: '',
  fciDamage: '',
  fciDiscolour: '',
  fciBroken: '',
  fciDepoWeight: '',
  fciPortalWeight: '',
  submittedBy: '',
  biometricData: '',
  acknowledgeGpReminder: false,
};

export const ConsignmentDispatchReport: React.FC<{ promptOpen?: boolean; onPromptClose?: () => void }> = ({
  promptOpen,
  onPromptClose,
}) => {
  const activePlant = usePlantStore((s) => s.activePlant);
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalMainBags: 0, wagonsDelivery: 0 });
  const [gatePasses, setGatePasses] = useState<any[]>([]);
  const [gpReportReady, setGpReportReady] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  /** Fields already filled — locked on tap-to-fill (Feedback 19) */
  const [lockedFields, setLockedFields] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [gpReminder, setGpReminder] = useState(false);
  const modalOnly = !!promptOpen;
  const submitLock = useSubmitLock();

  const plantId = activePlant?.id || '';

  const fetchList = async () => {
    if (!plantId) return;
    setLoading(true);
    try {
      const res = await api.get('/yield/consignment-dispatch', { params: { plantId } });
      setRows(res.data.rows || []);
      setSummary(res.data.summary || { totalMainBags: 0, wagonsDelivery: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [plantId]);

  useEffect(() => {
    if (promptOpen) {
      setFormOpen(true);
      // Do NOT force GP reminder after successful finalize — only when date check fails
    }
  }, [promptOpen]);

  const loadGps = async (date: string) => {
    if (!plantId || !date) return;
    try {
      const res = await api.get('/yield/consignment-dispatch/gate-passes', {
        params: { plantId, date },
      });
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : payload?.gatePasses || [];
      setGatePasses(list);
      setGpReportReady(payload?.gpReportReady !== false);
      if (payload?.gpReportReady === false) {
        setGpReminder(true);
      }
    } catch {
      setGatePasses([]);
      setGpReportReady(false);
      setGpReminder(true);
    }
  };

  useEffect(() => {
    if (form.date) loadGps(form.date);
  }, [form.date, plantId]);

  const onSelectGp = (id: string) => {
    const gp = gatePasses.find((g) => g.id === id);
    setForm((prev) => ({
      ...prev,
      gatePassId: id,
      mainBags: String(gp?.mainBags || gp?.noOfBags || ''),
      shortageBags: String(gp?.shortageBags || ''),
    }));
  };

  const submit = async () => {
    if (!form.isNilDay && !gpReportReady && !form.acknowledgeGpReminder) {
      toast.error('GP report not finalized for this date. Acknowledge the reminder to continue (max 1 backdate).');
      setGpReminder(true);
      return;
    }
    if (!form.biometricData) {
      toast.error('Fingerprint required');
      return;
    }
    await submitLock.wrapSubmit(async () => {
    try {
      await api.post(
        '/yield/consignment-dispatch',
        {
          ...form,
          mainBags: form.mainBags ? Number(form.mainBags) : 0,
          shortageBags: form.shortageBags ? Number(form.shortageBags) : 0,
          fciMoisture: form.fciMoisture !== '' ? Number(form.fciMoisture) : null,
          fciDamage: form.fciDamage !== '' ? Number(form.fciDamage) : null,
          fciDiscolour: form.fciDiscolour !== '' ? Number(form.fciDiscolour) : null,
          fciBroken: form.fciBroken !== '' ? Number(form.fciBroken) : null,
          fciDepoWeight: form.fciDepoWeight !== '' ? Number(form.fciDepoWeight) : null,
          fciPortalWeight: form.fciPortalWeight !== '' ? Number(form.fciPortalWeight) : null,
          id: form.id || undefined,
        },
        { params: { plantId } },
      );
      toast.success('Consignment Dispatch submitted');
      setFormOpen(false);
      setForm(emptyForm);
      setLockedFields({});
      onPromptClose?.();
      fetchList();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Submit failed');
    }
    });
  };

  const openFill = (row?: any) => {
    if (row) {
      const next = {
        ...emptyForm,
        id: row.id,
        date: row.date ? new Date(row.date).toISOString().slice(0, 10) : emptyForm.date,
        gatePassId: row.gatePassId || '',
        gatePassIds: row.extraGatePassIds
          ? (() => {
              try {
                const parsed = typeof row.extraGatePassIds === 'string'
                  ? JSON.parse(row.extraGatePassIds)
                  : row.extraGatePassIds;
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            })()
          : [],
        fciGpNo: row.fciGpNo || '',
        consignmentNo: row.consignmentNo || '',
        mainBags: String(row.mainBags ?? ''),
        shortageBags: String(row.shortageBags ?? ''),
        fciMoisture: row.fciMoisture != null ? String(row.fciMoisture) : '',
        fciDamage: row.fciDamage != null ? String(row.fciDamage) : '',
        fciDiscolour: row.fciDiscolour != null ? String(row.fciDiscolour) : '',
        fciBroken: row.fciBroken != null ? String(row.fciBroken) : '',
        fciDepoWeight: row.fciDepoWeight != null ? String(row.fciDepoWeight) : '',
        fciPortalWeight: row.fciPortalWeight != null ? String(row.fciPortalWeight) : '',
        submittedBy: row.submittedBy || '',
      };
      // Lock any field that already has a value — fill only blanks
      const locks: Record<string, boolean> = {};
      for (const key of [
        'date',
        'fciGpNo',
        'consignmentNo',
        'mainBags',
        'shortageBags',
        'fciMoisture',
        'fciDamage',
        'fciDiscolour',
        'fciBroken',
        'fciDepoWeight',
        'fciPortalWeight',
        'submittedBy',
      ] as const) {
        const v = (next as any)[key];
        locks[key] = v !== '' && v != null;
      }
      if (row.gatePassId || (next.gatePassIds && next.gatePassIds.length)) locks.gatePassIds = true;
      setLockedFields(locks);
      setForm(next);
    } else {
      setLockedFields({});
      setForm(emptyForm);
    }
    setFormOpen(true);
  };

  const fieldClass = (key: string) =>
    `w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm ${
      lockedFields[key] ? 'opacity-60 cursor-not-allowed' : ''
    }`;

  const formModal = formOpen ? (
    <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3 shadow-2xl">
        <h3 className="font-bold text-[var(--text-main)]">
          {modalOnly ? 'Fill Consignment Dispatch Details' : 'Consignment Dispatch Entry'}
        </h3>
        {form.id && Object.keys(lockedFields).some((k) => lockedFields[k]) && (
          <p className="text-[10px] text-[var(--text-muted-alt)]">
            Pre-filled fields are locked — only blank fields can be edited.
          </p>
        )}
        {!gpReportReady && !form.acknowledgeGpReminder && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs">
            Reminder: GP report does not appear finalized for this date. Fill GP report first, or cancel this reminder to allow max one backdate entry.
            <button
              type="button"
              className="block mt-2 underline"
              onClick={() => setForm((f) => ({ ...f, acknowledgeGpReminder: true }))}
            >
              Cancel reminder / continue with backdate
            </button>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-yellow-500">
          <input
            type="checkbox"
            checked={form.isNilDay}
            disabled={!!form.id}
            onChange={(e) => setForm({ ...form, isNilDay: e.target.checked, biometricData: form.biometricData })}
          />
          Today No Consignment dispatch
        </label>
        <div>
          <label className="text-xs text-[var(--text-muted-alt)]">Date (today or 1 backdate)</label>
          <input
            type="date"
            value={form.date}
            disabled={!!lockedFields.date}
            min={(() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              return d.toISOString().slice(0, 10);
            })()}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setForm({ ...form, date: e.target.value, acknowledgeGpReminder: false })}
            className={fieldClass('date')}
          />
        </div>
        {!form.isNilDay && (
          <>
            <div>
              <label className="text-xs text-[var(--text-muted-alt)]">Mark GP (multi-select for multiple FCI / trucks)</label>
              <select
                multiple
                disabled={!!lockedFields.gatePassIds}
                value={form.gatePassIds?.length ? form.gatePassIds : form.gatePassId ? [form.gatePassId] : []}
                onChange={(e) => {
                  const ids = Array.from(e.target.selectedOptions).map((o) => o.value);
                  const selected = gatePasses.filter((g) => ids.includes(g.id));
                  const main = selected.reduce((s, g) => s + (Number(g.mainBags) || Number(g.noOfBags) || 0), 0);
                  const short = selected.reduce((s, g) => s + (Number(g.shortageBags) || 0), 0);
                  setForm((prev) => ({
                    ...prev,
                    gatePassIds: ids,
                    gatePassId: ids[0] || '',
                    mainBags: lockedFields.mainBags ? prev.mainBags : String(main || ''),
                    shortageBags: lockedFields.shortageBags ? prev.shortageBags : String(short || ''),
                  }));
                }}
                className={`${fieldClass('gatePassIds')} min-h-[88px]`}
              >
                {gatePasses.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.qrCode} — {g.vehicleNo} (Main {g.mainBags || g.noOfBags || 0})
                    {g.partyName || g.supplier?.name ? ` · ${g.partyName || g.supplier?.name}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">
                Hold Ctrl/Cmd to select multiple GPs in one consignment entry (bags sum). Or create separate rows with same Consignment No (max 580).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[var(--text-muted-alt)]">FCI GP No. (comma-separate multiple)</label>
                <input
                  value={form.fciGpNo}
                  disabled={!!lockedFields.fciGpNo}
                  onChange={(e) => setForm({ ...form, fciGpNo: e.target.value })}
                  placeholder="FCI-1, FCI-2"
                  className={fieldClass('fciGpNo')}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted-alt)]">Consignment No.</label>
                <input
                  value={form.consignmentNo}
                  disabled={!!lockedFields.consignmentNo}
                  onChange={(e) => setForm({ ...form, consignmentNo: e.target.value })}
                  className={fieldClass('consignmentNo')}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted-alt)]">Bags (auto)</label>
                <input
                  value={form.mainBags}
                  disabled={!!lockedFields.mainBags}
                  onChange={(e) => setForm({ ...form, mainBags: e.target.value })}
                  className={fieldClass('mainBags')}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted-alt)]">Shortage Bags (auto)</label>
                <input
                  value={form.shortageBags}
                  disabled={!!lockedFields.shortageBags}
                  onChange={(e) => setForm({ ...form, shortageBags: e.target.value })}
                  className={fieldClass('shortageBags')}
                />
              </div>
              {['fciMoisture', 'fciDamage', 'fciDiscolour', 'fciBroken', 'fciDepoWeight', 'fciPortalWeight'].map(
                (k) => (
                  <div key={k}>
                    <label className="text-xs text-[var(--text-muted-alt)]">{k.replace('fci', 'FCI ')}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(form as any)[k]}
                      disabled={!!lockedFields[k]}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      className={fieldClass(k)}
                    />
                  </div>
                ),
              )}
            </div>
          </>
        )}
        <div>
          <label className="text-xs text-[var(--text-muted-alt)]">Supervisor Name</label>
          <input
            value={form.submittedBy}
            disabled={!!lockedFields.submittedBy}
            onChange={(e) => setForm({ ...form, submittedBy: e.target.value })}
            className={fieldClass('submittedBy')}
          />
        </div>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Fingerprint…"
            value={form.biometricData}
            onChange={(e) => setForm({ ...form, biometricData: e.target.value })}
            className="flex-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            className="px-3 py-2 bg-amber-500 text-black text-xs font-bold rounded-lg"
            onClick={async () => {
              try {
                const xml = await biometricService.captureFingerprint();
                setForm((p) => ({ ...p, biometricData: xml }));
                toast.success('Fingerprint captured');
              } catch (err: any) {
                toast.error(err?.message || 'Scan failed');
              }
            }}
          >
            Scan
          </button>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => {
              setFormOpen(false);
              setLockedFields({});
              onPromptClose?.();
            }}
            className="px-4 py-2 border border-[var(--border-subtle)] rounded-lg text-sm"
          >
            Cancel
          </button>
          <button onClick={submit} disabled={submitLock.pending} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {submitLock.pending ? 'Submitting...' : 'Submit with Fingerprint'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (modalOnly) {
    return formModal;
  }

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-main)]">Consignment Dispatch Details</h2>
          <p className="text-xs text-[var(--text-muted-alt)]">
            Mill-wise · Fill after GP report · Wagons = Main bags ÷ 580
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchList} className="px-3 py-1.5 border border-[var(--border-subtle)] rounded-lg text-xs flex items-center gap-1">
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() =>
              exportToExcel(
                rows.map((r) => ({
                  Date: r.date,
                  'GP No': r.gpNo,
                  'FCI Slip': r.fciGpNo,
                  Consignment: r.consignmentNo,
                  'Depo Details': r.depoDetails,
                  Main: r.mainBags,
                  Shortage: r.shortageBags,
                  'Wt Mill': r.netWeightMill,
                  'FCI Depo Wt': r.fciDepoWeight,
                  'FCI Portal Wt': r.fciPortalWeight,
                  Moisture: r.fciMoisture,
                  Damage: r.fciDamage,
                  Discolour: r.fciDiscolour,
                  Broken: r.fciBroken,
                })),
                'consignment_dispatch.xlsx',
              )
            }
            className="px-3 py-1.5 border border-green-500/40 text-green-500 rounded-lg text-xs flex items-center gap-1"
          >
            <Download size={14} /> Excel
          </button>
          <button
            onClick={() => openFill()}
            className="px-3 py-1.5 bg-amber-500 text-black rounded-lg text-xs font-bold flex items-center gap-1"
          >
            <Plus size={14} /> Add More
          </button>
        </div>
      </div>

      <div className="mx-5 mt-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 flex flex-wrap gap-6 items-center">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">Dispatch Delivery Status</div>
          <div className="text-2xl font-bold text-[var(--text-main)] mt-1">
            {summary.wagonsDelivery} <span className="text-sm font-normal text-[var(--text-muted-alt)]">wagons</span>
          </div>
        </div>
        <div className="text-sm text-[var(--text-muted-alt)]">
          Total Main bags <strong className="text-[var(--text-main)]">{summary.totalMainBags}</strong> ÷ 580 ={' '}
          <strong className="text-[var(--text-main)]">{summary.wagonsDelivery}</strong> wagon consignments
        </div>
      </div>

      {gpReminder && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm flex flex-col gap-2">
          <span>
            Protocol: fill GP report first. If GP report was not made for the selected day, finish it or acknowledge to allow max one backdate entry.
          </span>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setForm((f) => ({ ...f, acknowledgeGpReminder: true }));
                setGpReminder(false);
                toast('Backdate entry allowed (max 1 day).', { icon: 'ℹ️' });
              }}
              className="underline text-xs"
            >
              Cancel reminder / continue
            </button>
            <button onClick={() => setGpReminder(false)} className="underline text-xs">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-[var(--bg-panel-alt)] text-[10px] uppercase text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)]">
              <th className="px-3 py-3 text-left">Date</th>
              <th className="px-3 py-3 text-left">GP No</th>
              <th className="px-3 py-3 text-left">FCI Slip</th>
              <th className="px-3 py-3 text-left">Consignment No</th>
              <th className="px-3 py-3 text-left">Depo Details</th>
              <th className="px-3 py-3 text-right">Main</th>
              <th className="px-3 py-3 text-right">Shortage</th>
              <th className="px-3 py-3 text-right">Wt Mill</th>
              <th className="px-3 py-3 text-right">FCI Depo</th>
              <th className="px-3 py-3 text-right">FCI Portal</th>
              <th className="px-3 py-3 text-right">Moisture</th>
              <th className="px-3 py-3 text-right">Damage</th>
              <th className="px-3 py-3 text-right">Discolour</th>
              <th className="px-3 py-3 text-right">Broken</th>
              <th className="px-3 py-3 text-left">Sign</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {loading ? (
              <tr>
                <td colSpan={15} className="py-8 text-center text-[var(--text-muted-alt)]">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-8 text-center text-[var(--text-muted-alt)]">
                  No consignment entries (nil days hidden)
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-[var(--glass-bg)] cursor-pointer"
                  onClick={() => openFill(r)}
                  title="Tap to fill unfilled fields"
                >
                  <td className="px-3 py-2">{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2">{r.gpNo || '—'}</td>
                  <td className="px-3 py-2">{r.fciGpNo || '—'}</td>
                  <td className="px-3 py-2">{r.consignmentNo || '—'}</td>
                  <td className="px-3 py-2">{r.depoDetails || '—'}</td>
                  <td className="px-3 py-2 text-right">{r.mainBags}</td>
                  <td className="px-3 py-2 text-right">{r.shortageBags}</td>
                  <td className="px-3 py-2 text-right">{r.netWeightMill ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{r.fciDepoWeight ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{r.fciPortalWeight ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{r.fciMoisture ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{r.fciDamage ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{r.fciDiscolour ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{r.fciBroken ?? '—'}</td>
                  <td className="px-3 py-2">{r.submittedBy || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formModal}
    </div>
  );
};


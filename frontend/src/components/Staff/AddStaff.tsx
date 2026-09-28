import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePlantStore } from '../../store/plantStore';
import api from '../../api/axios';
import { UserPlus, Fingerprint, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubmitLock } from '../../hooks/useSubmitLock';
import { biometricService } from '../../services/biometricService';
import { useUiStore } from '../../store/uiStore';

type StaffCategory = 'DRIVER' | 'LABOUR' | 'PAHUNCH' | 'UNLOADER';

export const AddStaff: React.FC = () => {
  const { activePlant } = usePlantStore();
  const activePlantId = activePlant?.id;
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [category, setCategory] = useState<StaffCategory>('DRIVER');
  const [error, setError] = useState('');
  const submitLock = useSubmitLock();
  const [scanningSlot, setScanningSlot] = useState<1 | 2 | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    age: '',
    type: '',
    firmName: '',
    fingerprint1: '',
    fingerprint2: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const captureFingerprint = async (slot: 1 | 2) => {
    setScanningSlot(slot);
    setError('');
    try {
      const { pidData } = await biometricService.captureForEnrollment({
        otherPidData:
          slot === 1 ? [formData.fingerprint2] : [formData.fingerprint1],
      });
      setFormData(prev => ({
        ...prev,
        ...(slot === 1 ? { fingerprint1: pidData } : { fingerprint2: pidData }),
      }));
      useUiStore.getState().addToast(`Fingerprint ${slot} captured`, 'success');
    } catch (err: any) {
      const msg = err?.message || 'This fingerprint is already registered';
      setError(msg);
      useUiStore.getState().addToast(msg, 'error');
    } finally {
      setScanningSlot(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (category !== 'DRIVER' && !activePlantId && user?.role !== 'SUPER_ADMIN') {
      setError('Please select a plant before adding this staff category.');
      return;
    }

    if (category === 'UNLOADER' && (!formData.fingerprint1 || !formData.fingerprint2)) {
      setError('Unloader registration requires two fingerprint scans (Finger 1 and Finger 2).');
      return;
    }

    await submitLock.wrapSubmit(async () => {
    try {
      if (category === 'DRIVER') {
        const ageVal = formData.age ? parseInt(formData.age) : undefined;
        if (ageVal && (ageVal < 18 || ageVal > 100)) {
          throw new Error('Age must be between 18 and 100.');
        }
        await api.post('/api/master-data/drivers', {
          name: formData.name,
          phone: formData.contact,
          age: ageVal
        }, {
          headers: { 'x-plant-id': activePlantId }
        });
      } else if (category === 'LABOUR') {
        await api.post('/api/master-data/labour', {
          name: formData.name,
          type: formData.type,
          contact: formData.contact,
          firmName: formData.firmName
        }, {
          headers: { 'x-plant-id': activePlantId }
        });
      } else if (category === 'PAHUNCH') {
        await api.post('/api/master-data/pahunch', {
          name: formData.name,
          contact: formData.contact || undefined
        }, {
          headers: { 'x-plant-id': activePlantId }
        });
      } else if (category === 'UNLOADER') {
        await api.post('/api/master-data/staff', {
          name: formData.name,
          role: 'UNLOADER',
          phone: formData.contact || undefined,
          fingerprint1: formData.fingerprint1,
          fingerprint2: formData.fingerprint2,
        }, {
          headers: { 'x-plant-id': activePlantId }
        });
      }
      
      alert('Staff member added successfully!');
      navigate('/staff?tab=list&subtab=' + category.toLowerCase());
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || err.message || 'Failed to add staff member.');
    }
    });
  };

  return (
    <div className="p-6 h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-main)] overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <UserPlus className="text-[#e67e00]" /> Add Staff
        </h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-8">
          
          <section>
            <h2 className="text-lg font-semibold border-b border-[var(--border-subtle)] pb-2 mb-4">1. Select Category</h2>
            <div className="flex gap-4">
              {['DRIVER', 'LABOUR', 'PAHUNCH', 'UNLOADER'].map((cat) => (
                <label key={cat} className={`flex-1 cursor-pointer rounded-lg border p-4 transition-all ${category === cat ? 'border-[#e67e00] bg-[#e67e00]/10' : 'border-[var(--border-subtle)] hover:border-[#e67e00]/50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{cat.charAt(0) + cat.slice(1).toLowerCase()}</span>
                    <input
                      type="radio"
                      name="category"
                      value={cat}
                      checked={category === cat}
                      onChange={() => {
                        setCategory(cat as StaffCategory);
                        setFormData(prev => ({ ...prev, fingerprint1: '', fingerprint2: '' }));
                      }}
                      className="accent-[#e67e00]"
                    />
                  </div>
                </label>
              ))}
            </div>
            {category !== 'DRIVER' && !activePlantId && user?.role !== 'SUPER_ADMIN' && (
              <p className="text-amber-500 text-xs mt-2 font-medium">⚠️ Adding this category requires a Plant to be selected.</p>
            )}
            {category === 'DRIVER' && (
              <p className="text-[var(--text-muted)] text-xs mt-2 font-medium">ℹ️ Drivers are global and not bound to a specific plant.</p>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold border-b border-[var(--border-subtle)] pb-2 mb-4">2. Common Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:border-blue-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Contact No. <span className="text-[var(--text-muted-alt)] text-xs">(optional)</span></label>
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:border-blue-500 outline-none transition-colors"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold border-b border-[var(--border-subtle)] pb-2 mb-4">3. Category-Specific Information</h2>
            
            {category === 'DRIVER' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Age</label>
                  <input
                    type="number"
                    name="age"
                    min="18"
                    max="100"
                    value={formData.age}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {category === 'LABOUR' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Type <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Firm Name</label>
                  <input
                    type="text"
                    name="firmName"
                    value={formData.firmName}
                    onChange={handleInputChange}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {category === 'PAHUNCH' && (
              <p className="text-sm text-[var(--text-muted)] italic">No additional information required for Pahunch contractors.</p>
            )}

            {category === 'UNLOADER' && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
                  <Fingerprint size={16} />
                  Fingerprint Registration (2 required)
                </div>
                <p className="text-[11px] text-[var(--text-muted-alt)]">
                  Unloader must enroll two fingers (e.g. left thumb + right thumb). Contact number is optional.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-[var(--text-muted-alt)] uppercase tracking-wide">Finger 1</div>
                    {formData.fingerprint1 ? (
                      <div className="flex items-center gap-2 text-green-400 text-xs font-bold bg-green-900/20 border border-green-500/30 rounded-lg px-3 py-2">
                        <Check size={14} /> Captured
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => captureFingerprint(1)}
                        disabled={scanningSlot !== null}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Fingerprint size={14} /> {scanningSlot === 1 ? 'Scanning...' : 'Scan Finger 1'}
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-[var(--text-muted-alt)] uppercase tracking-wide">Finger 2</div>
                    {formData.fingerprint2 ? (
                      <div className="flex items-center gap-2 text-green-400 text-xs font-bold bg-green-900/20 border border-green-500/30 rounded-lg px-3 py-2">
                        <Check size={14} /> Captured
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => captureFingerprint(2)}
                        disabled={scanningSlot !== null}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Fingerprint size={14} /> {scanningSlot === 2 ? 'Scanning...' : 'Scan Finger 2'}
                      </button>
                    )}
                  </div>
                </div>
                {(formData.fingerprint1 || formData.fingerprint2) && (
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, fingerprint1: '', fingerprint2: '' }))}
                    className="text-[11px] text-[var(--text-muted-alt)] hover:text-red-400 underline"
                  >
                    Clear fingerprints &amp; re-scan
                  </button>
                )}
              </div>
            )}

          </section>

          <div className="flex justify-end mt-8">
            <button
              type="submit"
              disabled={
                submitLock.pending ||
                (category === 'UNLOADER' && (!formData.fingerprint1 || !formData.fingerprint2))
              }
              className="px-6 py-2 bg-[#e67e00] hover:bg-[#cc7000] text-black font-semibold rounded-lg shadow transition-colors disabled:opacity-50"
            >
              {submitLock.pending ? 'Adding...' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

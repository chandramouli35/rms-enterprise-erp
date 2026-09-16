import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { Truck, Plus, Trash2, Check, X, Eye, Fingerprint } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { usePlantStore } from '../store/plantStore';
import Pagination from '../components/Pagination';
import { biometricService } from '../services/biometricService';

function normalizeTruckNumber(raw: string): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

export default function TruckManagement() {
  const user = useAuthStore(state => state.user);
  const activePlant = usePlantStore(state => state.activePlant);
  const activePlantId = activePlant?.id || '';

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'PLANT_MANAGER';
  const isSupervisor = user?.role === 'SUPERVISOR';
  const canApprove = isAdmin;

  const [trucks, setTrucks] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [truckExists, setTruckExists] = useState(false);
  const [checkingTruck, setCheckingTruck] = useState(false);
  const truckCheckSeq = useRef(0);

  const [addModal, setAddModal] = useState<{
    isOpen: boolean;
    truckNumber: string;
    capacity: string;
    image: File | null;
    transportCategory: string;
    biometricData: string;
  }>({
    isOpen: false,
    truckNumber: '',
    capacity: '',
    image: null,
    transportCategory: 'PARTY',
    biometricData: '',
  });

  const truckDuplicateBlocksForm = truckExists;
  const formFieldsDisabled = truckDuplicateBlocksForm;

  const fetchTrucks = async () => {
    setIsLoading(true);
    try {
      const endpoint =
        isAdmin || isSupervisor
          ? '/api/master-data/trucks/all'
          : '/api/master-data/trucks';
      const res = await api.get(`${endpoint}?page=${currentPage}&limit=10`, {
        headers: { 'x-plant-id': activePlantId },
      });
      setTrucks(res.data.data || []);
      setTotalItems(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrucks();
  }, [activePlantId, user?.role, currentPage]);

  // Live duplicate check while typing truck number
  useEffect(() => {
    if (!addModal.isOpen) return;

    const normalized = normalizeTruckNumber(addModal.truckNumber);
    if (!normalized || normalized.length < 4) {
      setTruckExists(false);
      setCheckingTruck(false);
      return;
    }

    const seq = ++truckCheckSeq.current;
    setCheckingTruck(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/api/master-data/trucks/check', {
          params: { truckNumber: normalized },
          headers: { 'x-plant-id': activePlantId },
        });
        if (seq !== truckCheckSeq.current) return;
        setTruckExists(!!res.data?.exists);
      } catch (err) {
        if (seq !== truckCheckSeq.current) return;
        console.error(err);
        setTruckExists(false);
      } finally {
        if (seq === truckCheckSeq.current) setCheckingTruck(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [addModal.isOpen, addModal.truckNumber, activePlantId]);

  const resetAddModal = () => {
    setTruckExists(false);
    setCheckingTruck(false);
    truckCheckSeq.current += 1;
    return {
      isOpen: false,
      truckNumber: '',
      capacity: '',
      image: null,
      transportCategory: 'PARTY',
      biometricData: '',
    };
  };

  const handleAddTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const normalized = normalizeTruckNumber(addModal.truckNumber);
    if (!normalized || normalized.length < 4) {
      alert('Enter a valid truck number (letters and digits only).');
      return;
    }

    if (truckExists) {
      alert('Truck number already exists.');
      return;
    }

    if (isSupervisor && !addModal.biometricData) {
      alert('Fingerprint scan is required to submit a new truck application.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('truckNumber', normalized);
      formData.append('transportCategory', addModal.transportCategory);
      if (addModal.capacity) formData.append('capacity', addModal.capacity);
      if (isAdmin && addModal.image) formData.append('image', addModal.image);
      if (isSupervisor && addModal.biometricData) {
        formData.append('biometricData', addModal.biometricData);
      }

      await api.post('/api/master-data/trucks', formData, {
        headers: {
          'x-plant-id': activePlantId,
          'Content-Type': 'multipart/form-data',
        },
      });

      setAddModal(resetAddModal());
      setToastMessage(
        isSupervisor
          ? 'Truck application sent to Admin for approval!'
          : 'Truck created successfully!',
      );
      setTimeout(() => setToastMessage(''), 3000);
      fetchTrucks();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to add truck';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScanFingerprint = async () => {
    setIsScanning(true);
    try {
      const xml = await biometricService.captureFingerprint();
      setAddModal(prev => ({ ...prev, biometricData: xml }));
    } catch (err: any) {
      alert(err?.message || 'Fingerprint scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!canApprove) return;
    try {
      await api.put(
        `/api/master-data/trucks/${id}/approve`,
        {},
        { headers: { 'x-plant-id': activePlantId } },
      );
      setToastMessage('Truck approved.');
      setTimeout(() => setToastMessage(''), 3000);
      fetchTrucks();
    } catch (err) {
      console.error(err);
      alert('Failed to approve truck');
    }
  };

  const handleReject = async (id: string) => {
    if (!canApprove) return;
    if (!confirm('Are you sure you want to decline and remove this truck application?')) return;
    try {
      await api.put(
        `/api/master-data/trucks/${id}/reject`,
        {},
        { headers: { 'x-plant-id': activePlantId } },
      );
      fetchTrucks();
    } catch (err) {
      console.error(err);
      alert('Failed to decline truck');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Are you sure you want to delete this truck?')) return;
    try {
      await api.delete(`/api/master-data/trucks/${id}`, {
        headers: { 'x-plant-id': activePlantId },
      });
      fetchTrucks();
    } catch (err) {
      console.error(err);
      alert('Failed to delete truck');
    }
  };

  if (!activePlantId && user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-8 text-center text-[var(--text-muted)]">
        Please select a plant first.
      </div>
    );
  }

  const displayTruckNumber = (raw: string) => normalizeTruckNumber(raw) || raw;

  return (
    <div className="p-6 h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-main)] overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="text-[#e67e00]" /> Truck Management
          </h1>
          <p className="text-[var(--text-muted-alt)] text-sm mt-1">
            {isSupervisor
              ? 'Submit new truck applications for admin approval'
              : 'Manage and approve trucks'}
          </p>
        </div>
        <button
          onClick={() =>
            setAddModal({
              isOpen: true,
              truckNumber: '',
              capacity: '',
              image: null,
              transportCategory: 'PARTY',
              biometricData: '',
            })
          }
          className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold shadow hover:bg-[#cc7000] transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> {isSupervisor ? 'Add New Truck Application' : 'Add Truck'}
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--bg-panel-hover)] border-b border-[var(--border-subtle)]">
              <th className="p-4 font-semibold">Truck Number</th>
              <th className="p-4 font-semibold">Category</th>
              <th className="p-4 font-semibold">Capacity (MT)</th>
              <th className="p-4 font-semibold">Status</th>
              {isAdmin && <th className="p-4 font-semibold">View</th>}
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="p-8 text-center text-[var(--text-muted)]">
                  Loading trucks...
                </td>
              </tr>
            ) : trucks.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="p-8 text-center text-[var(--text-muted)]">
                  No trucks found.
                </td>
              </tr>
            ) : (
              trucks.map(truck => (
                <tr
                  key={truck.id}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-panel-hover)]"
                >
                  <td className="p-4 font-mono font-bold">{displayTruckNumber(truck.truckNumber)}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        truck.transportCategory === 'COMPANY'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {truck.transportCategory === 'COMPANY' ? 'Company' : 'Party'}
                    </span>
                  </td>
                  <td className="p-4">{truck.capacity || '-'}</td>
                  <td className="p-4">
                    {truck.isApproved ? (
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">
                        Approved
                      </span>
                    ) : (
                      <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded text-xs font-bold">
                        Pending Admin
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="p-4">
                      {truck.imageUrl ? (
                        <button
                          onClick={() => setPreviewImage(truck.imageUrl)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e67e00]/10 text-[#e67e00] hover:bg-[#e67e00]/20 rounded-md text-sm font-medium transition-colors w-fit"
                          title="View Image"
                        >
                          <Eye size={16} /> View
                        </button>
                      ) : (
                        <span className="text-[var(--text-muted-alt)] text-sm italic">-</span>
                      )}
                    </td>
                  )}
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    {!truck.isApproved && canApprove && (
                      <>
                        <button
                          onClick={() => handleApprove(truck.id)}
                          className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded"
                          title="Approve"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => handleReject(truck.id)}
                          className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded"
                          title="Decline"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(truck.id)}
                        className="p-2 text-[var(--text-muted-alt)] hover:text-red-400 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
      />

      {addModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-[var(--text-main)] mb-4">
              {isSupervisor ? 'Add New Truck Application' : 'Add New Truck'}
            </h2>
            <form onSubmit={handleAddTruck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  Truck Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addModal.truckNumber}
                  onChange={e =>
                    setAddModal({
                      ...addModal,
                      truckNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9\s]/g, ''),
                    })
                  }
                  className={`w-full bg-[var(--bg-panel-alt)] border rounded px-3 py-2 text-[var(--text-main)] font-mono uppercase ${
                    truckExists
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-[var(--border-subtle)]'
                  }`}
                  placeholder="e.g. MH12AB1234"
                  required
                />
                {truckExists ? (
                  <p className="text-red-500 text-xs mt-1 font-medium">
                    Truck number already exists
                  </p>
                ) : checkingTruck && normalizeTruckNumber(addModal.truckNumber).length >= 4 ? (
                  <p className="text-[var(--text-muted-alt)] text-xs mt-1">Checking truck number…</p>
                ) : addModal.truckNumber ? (
                  <p className="text-[var(--text-muted-alt)] text-xs mt-1">
                    Stored as:{' '}
                    <span className="font-mono text-[#e67e00]">
                      {normalizeTruckNumber(addModal.truckNumber)}
                    </span>
                  </p>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  Transport Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={addModal.transportCategory}
                  onChange={e => setAddModal({ ...addModal, transportCategory: e.target.value })}
                  disabled={formFieldsDisabled}
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="PARTY">Party Transport</option>
                  <option value="COMPANY">Company Transport</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                  Capacity (MT){' '}
                  <span className="text-[var(--text-muted-alt)] text-xs">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={addModal.capacity}
                  onChange={e => setAddModal({ ...addModal, capacity: e.target.value })}
                  disabled={formFieldsDisabled}
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="e.g. 25"
                />
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                    Upload Image{' '}
                    <span className="text-[var(--text-muted-alt)] text-xs">(Optional)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={formFieldsDisabled}
                    onChange={e =>
                      setAddModal({
                        ...addModal,
                        image: e.target.files ? e.target.files[0] : null,
                      })
                    }
                    className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-[#e67e00]/20 file:text-[#e67e00] hover:file:bg-[#e67e00]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              )}

              {isSupervisor && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                    Fingerprint <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      readOnly
                      value={addModal.biometricData ? 'Captured' : ''}
                      disabled={formFieldsDisabled}
                      className="flex-1 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] text-sm disabled:opacity-50"
                      placeholder="Scan fingerprint to submit application..."
                    />
                    <button
                      type="button"
                      onClick={handleScanFingerprint}
                      disabled={isScanning || formFieldsDisabled}
                      className="px-3 py-2 bg-[#e67e00] text-black text-xs font-bold rounded-lg flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Fingerprint size={14} />
                      {isScanning ? 'Scanning...' : 'Scan'}
                    </button>
                  </div>
                  {addModal.biometricData && !formFieldsDisabled && (
                    <p className="text-green-500 text-xs mt-1">Fingerprint captured successfully.</p>
                  )}
                </div>
              )}

              {isSupervisor && !formFieldsDisabled && (
                <p className="text-[var(--text-muted-alt)] text-xs bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                  Your application will be sent to Admin for confirmation or decline.
                </p>
              )}

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setAddModal(resetAddModal())}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    formFieldsDisabled ||
                    checkingTruck ||
                    (isSupervisor && !addModal.biometricData)
                  }
                  className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold shadow hover:bg-[#cc7000] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? 'Submitting...'
                    : isSupervisor
                      ? 'Send to Admin'
                      : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center justify-center">
            <button
              className="absolute -top-12 right-0 text-white/70 hover:text-white p-2 transition-colors rounded-full hover:bg-white/10"
              onClick={() => setPreviewImage(null)}
            >
              <X size={32} />
            </button>
            <img
              src={previewImage}
              alt="Truck Document"
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain ring-4 ring-white/10"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-2 z-[70] animate-bounce">
          <Check size={20} />
          <span className="font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

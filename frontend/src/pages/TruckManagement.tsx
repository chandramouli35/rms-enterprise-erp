import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Truck, Plus, Trash2, Check, X, Eye } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { usePlantStore } from '../store/plantStore';
import Pagination from '../components/Pagination';

export default function TruckManagement() {
  const user = useAuthStore(state => state.user);
  const activePlant = usePlantStore(state => state.activePlant);
  const activePlantId = activePlant?.id || '';
  
  const [trucks, setTrucks] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Modal state
  const [addModal, setAddModal] = useState<{isOpen: boolean, truckNumber: string, capacity: string, image: File | null, transportCategory: string}>({ isOpen: false, truckNumber: '', capacity: '', image: null, transportCategory: 'PARTY' });

  const fetchTrucks = async () => {
    // We allow super admin to fetch all trucks even if no plant is selected if the backend supports it, 
    // but for now let's just make sure we don't block if there's no active plant or if there is.
    // Actually, trucks are plant-specific usually, but Super Admin gets all trucks if they call /trucks/all
    setIsLoading(true);
    try {
      // If super admin, fetch all trucks to approve them. Else fetch approved only
      const endpoint = user?.role === 'SUPER_ADMIN' ? '/api/master-data/trucks/all' : '/api/master-data/trucks';
      const res = await api.get(`${endpoint}?page=${currentPage}&limit=10`, {
        headers: { 'x-plant-id': activePlantId }
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

  const handleAddTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('truckNumber', addModal.truckNumber);
      formData.append('transportCategory', addModal.transportCategory);
      if (addModal.capacity) formData.append('capacity', addModal.capacity);
      if (addModal.image) formData.append('image', addModal.image);

      await api.post('/api/master-data/trucks', formData, {
        headers: { 
          'x-plant-id': activePlantId,
          'Content-Type': 'multipart/form-data'
        }
      });
      setAddModal({ isOpen: false, truckNumber: '', capacity: '', image: null, transportCategory: 'PARTY' });
      setToastMessage('Truck created successfully!');
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

  const handleApprove = async (id: string) => {
    if (user?.role !== 'SUPER_ADMIN') return;
    try {
      await api.put(`/api/master-data/trucks/${id}/approve`, {}, {
        headers: { 'x-plant-id': activePlantId }
      });
      fetchTrucks();
    } catch (err) {
      console.error(err);
      alert('Failed to approve truck');
    }
  };

  const handleReject = async (id: string) => {
    if (user?.role !== 'SUPER_ADMIN') return;
    if (!confirm('Are you sure you want to reject and delete this truck?')) return;
    try {
      await api.put(`/api/master-data/trucks/${id}/reject`, {}, {
        headers: { 'x-plant-id': activePlantId }
      });
      fetchTrucks();
    } catch (err) {
      console.error(err);
      alert('Failed to reject truck');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this truck?')) return;
    try {
      await api.delete(`/api/master-data/trucks/${id}`, {
        headers: { 'x-plant-id': activePlantId }
      });
      fetchTrucks();
    } catch (err) {
      console.error(err);
      alert('Failed to delete truck');
    }
  };

  if (!activePlantId && user?.role !== 'SUPER_ADMIN') {
    return <div className="p-8 text-center text-[var(--text-muted)]">Please select a plant first.</div>;
  }

  return (
    <div className="p-6 h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-main)] overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="text-[#e67e00]" /> Truck Management
          </h1>
          <p className="text-[var(--text-muted-alt)] text-sm mt-1">Manage and approve trucks</p>
        </div>
        <button 
          onClick={() => setAddModal({ isOpen: true, truckNumber: '', capacity: '', image: null, transportCategory: 'PARTY' })}
          className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold shadow hover:bg-[#cc7000] transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> Add Truck
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
              <th className="p-4 font-semibold">View</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">Loading trucks...</td>
              </tr>
            ) : trucks.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">No trucks found.</td>
              </tr>
            ) : (
              trucks.map(truck => (
                <tr key={truck.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-panel-hover)]">
                  <td className="p-4 font-mono font-bold">{truck.truckNumber}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${truck.transportCategory === 'COMPANY' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                      {truck.transportCategory === 'COMPANY' ? 'Company' : 'Party'}
                    </span>
                  </td>
                  <td className="p-4">{truck.capacity || '-'}</td>
                  <td className="p-4">
                    {truck.isApproved ? (
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">Approved</span>
                    ) : (
                      <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded text-xs font-bold">Pending</span>
                    )}
                  </td>
                  <td className="p-4">
                    {truck.imageUrl ? (
                      <button 
                        onClick={() => setPreviewImage(truck.imageUrl)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e67e00]/10 text-[#e67e00] hover:bg-[#e67e00]/20 rounded-md text-sm font-medium transition-colors w-fit tooltip-trigger"
                        title="View Image"
                      >
                        <Eye size={16} /> View
                      </button>
                    ) : (
                      <span className="text-[var(--text-muted-alt)] text-sm italic">-</span>
                    )}
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    {!truck.isApproved && user?.role === 'SUPER_ADMIN' && (
                      <>
                        <button onClick={() => handleApprove(truck.id)} className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded tooltip-trigger" title="Approve">
                          <Check size={16} />
                        </button>
                        <button onClick={() => handleReject(truck.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded tooltip-trigger" title="Reject">
                          <X size={16} />
                        </button>
                      </>
                    )}
                    <button onClick={() => handleDelete(truck.id)} className="p-2 text-[var(--text-muted-alt)] hover:text-red-400 rounded transition-colors tooltip-trigger" title="Delete">
                      <Trash2 size={16} />
                    </button>
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

      {/* Add Modal */}
      {addModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-[var(--text-main)] mb-4">Add New Truck</h2>
            <form onSubmit={handleAddTruck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Truck Number <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={addModal.truckNumber} 
                  onChange={e => setAddModal({...addModal, truckNumber: e.target.value.toUpperCase()})}
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] font-mono"
                  placeholder="e.g. MH 12 AB 1234"
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Transport Category <span className="text-red-500">*</span></label>
                <select 
                  value={addModal.transportCategory} 
                  onChange={e => setAddModal({...addModal, transportCategory: e.target.value})}
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                >
                  <option value="PARTY">Party Transport</option>
                  <option value="COMPANY">Company Transport</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Capacity (MT) <span className="text-[var(--text-muted-alt)] text-xs">(Optional)</span></label>
                <input 
                  type="number" 
                  step="0.01"
                  value={addModal.capacity} 
                  onChange={e => setAddModal({...addModal, capacity: e.target.value})}
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                  placeholder="e.g. 25"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Upload Image <span className="text-red-500">*</span></label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => setAddModal({...addModal, image: e.target.files ? e.target.files[0] : null})}
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)] file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-[#e67e00]/20 file:text-[#e67e00] hover:file:bg-[#e67e00]/30 transition-colors"
                  required
                />
                <p className="text-[var(--text-muted-alt)] text-xs mt-1.5 flex items-center gap-1">
                  <span className="text-[#e67e00]">ℹ</span> Supports only image files (JPG, PNG, WebP)
                </p>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setAddModal({...addModal, isOpen: false})} disabled={isSubmitting} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold shadow hover:bg-[#cc7000] transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200"
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-2 z-[70] animate-bounce">
          <Check size={20} />
          <span className="font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

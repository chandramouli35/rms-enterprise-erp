import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Truck, Plus, Trash2, Check, X } from 'lucide-react';
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
  
  // Modal state
  const [addModal, setAddModal] = useState({ isOpen: false, truckNumber: '', capacity: '' });

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
    try {
      await api.post('/api/master-data/trucks', {
        truckNumber: addModal.truckNumber,
        capacity: addModal.capacity ? parseFloat(addModal.capacity) : undefined
      }, {
        headers: { 'x-plant-id': activePlantId }
      });
      setAddModal({ isOpen: false, truckNumber: '', capacity: '' });
      fetchTrucks();
    } catch (err) {
      console.error(err);
      alert('Failed to add truck');
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
          onClick={() => setAddModal({ isOpen: true, truckNumber: '', capacity: '' })}
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
              <th className="p-4 font-semibold">Capacity (MT)</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">Loading trucks...</td>
              </tr>
            ) : trucks.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">No trucks found.</td>
              </tr>
            ) : (
              trucks.map(truck => (
                <tr key={truck.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-panel-hover)]">
                  <td className="p-4 font-mono font-bold">{truck.truckNumber}</td>
                  <td className="p-4">{truck.capacity || '-'}</td>
                  <td className="p-4">
                    {truck.isApproved ? (
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">Approved</span>
                    ) : (
                      <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded text-xs font-bold">Pending</span>
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
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setAddModal({...addModal, isOpen: false})} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold shadow hover:bg-[#cc7000] transition-colors">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

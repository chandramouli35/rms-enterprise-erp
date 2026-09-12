import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Users, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { usePlantStore } from '../store/plantStore';
import Pagination from '../components/Pagination';
import { useSubmitLock } from '../hooks/useSubmitLock';

export default function PahunchManagement() {
  const user = useAuthStore(state => state.user);
  const activePlant = usePlantStore(state => state.activePlant);
  const activePlantId = activePlant?.id || '';
  
  const [Pahunchs, setPahunchs] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal state
  const [addModal, setAddModal] = useState({ isOpen: false, name: '', contact: '' });
  const addPahunchLock = useSubmitLock();

  const fetchPahunchs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/api/master-data/Pahunch?page=${currentPage}&limit=10`, {
        headers: { 'x-plant-id': activePlantId }
      });
      setPahunchs(res.data.data || []);
      setTotalItems(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPahunchs();
  }, [activePlantId, currentPage]);

  const handleAddPahunch = async (e: React.FormEvent) => {
    e.preventDefault();
    await addPahunchLock.wrapSubmit(async () => {
    try {
      await api.post('/api/master-data/pahunch', {
        name: addModal.name,
        contact: addModal.contact
      }, {
        headers: { 'x-plant-id': activePlantId }
      });
      setAddModal({ isOpen: false, name: '', contact: '' });
      fetchPahunchs();
    } catch (err) {
      console.error(err);
      alert('Failed to add Pahunch contractor');
    }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Pahunch contractor?')) return;
    try {
      await api.delete(`/api/master-data/Pahunch/${id}`, {
        headers: { 'x-plant-id': activePlantId }
      });
      fetchPahunchs();
    } catch (err) {
      console.error(err);
      alert('Failed to delete Pahunch contractor');
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
            <Users className="text-[#e67e00]" /> Pahunch Management
          </h1>
          <p className="text-[var(--text-muted-alt)] text-sm mt-1">Manage Pahunch contractors</p>
        </div>
        <button 
          onClick={() => setAddModal({ isOpen: true, name: '', contact: '' })}
          className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold shadow hover:bg-[#cc7000] transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> Add Contractor
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)]">
              <th className="p-4 font-semibold w-1/3">Name</th>
              <th className="p-4 font-semibold w-1/3">Contact No.</th>
              <th className="p-4 font-semibold text-right w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">Loading Pahunchs...</td>
              </tr>
            ) : Pahunchs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">No Pahunchs found.</td>
              </tr>
            ) : (
              Pahunchs.map(Pahunch => (
                <tr key={Pahunch.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-panel-hover)]">
                  <td className="p-4 font-bold">{Pahunch.name}</td>
                  <td className="p-4">{Pahunch.contact || '-'}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDelete(Pahunch.id)} className="p-2 text-[var(--text-muted-alt)] hover:text-red-400 rounded transition-colors tooltip-trigger" title="Delete">
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
            <h2 className="text-xl font-bold text-[var(--text-main)] mb-4">Add Pahunch Contractor</h2>
            <form onSubmit={handleAddPahunch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={addModal.name} 
                  onChange={e => setAddModal({...addModal, name: e.target.value})}
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                  placeholder="e.g. Ramesh Kumar"
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Contact No. <span className="text-[var(--text-muted-alt)] text-xs">(Optional)</span></label>
                <input 
                  type="text" 
                  value={addModal.contact} 
                  onChange={e => setAddModal({...addModal, contact: e.target.value})}
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]"
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setAddModal({...addModal, isOpen: false})} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
                <button type="submit" disabled={addPahunchLock.pending} className="px-4 py-2 bg-[#e67e00] text-black rounded font-bold shadow hover:bg-[#cc7000] transition-colors disabled:opacity-50">{addPahunchLock.pending ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

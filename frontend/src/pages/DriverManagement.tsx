import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Truck, Plus, Trash2, Edit2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { usePlantStore } from '../store/plantStore';

export default function DriverManagement() {
  const user = useAuthStore(state => state.user);
  const activePlant = usePlantStore(state => state.activePlant);
  const activePlantId = activePlant?.id || '';
  
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [addModal, setAddModal] = useState({ isOpen: false, name: '', phone: '', age: '' });
  const [editModal, setEditModal] = useState({ isOpen: false, id: '', name: '', phone: '', age: '' });

  const fetchDrivers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/master-data/drivers', {
        headers: { 'x-plant-id': activePlantId }
      });
      setDrivers(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activePlantId) {
      fetchDrivers();
    }
  }, [activePlantId]);

  const validateForm = (name: string, phone: string, age: string) => {
    if (!/^[A-Za-z\s]+$/.test(name)) {
      alert('Driver Name must contain only letters and spaces.');
      return false;
    }
    if (phone && !/^\d{10}$/.test(phone)) {
      alert('Mobile Number must be exactly 10 digits.');
      return false;
    }
    if (age) {
      const ageNum = parseInt(age);
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
        alert('Age must be between 18 and 100.');
        return false;
      }
    }
    return true;
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(addModal.name, addModal.phone, addModal.age)) return;
    try {
      await api.post('/master-data/drivers', {
        name: addModal.name,
        phone: addModal.phone,
        age: addModal.age ? parseInt(addModal.age) : undefined
      }, {
        headers: { 'x-plant-id': activePlantId }
      });
      setAddModal({ isOpen: false, name: '', phone: '', age: '' });
      fetchDrivers();
    } catch (err) {
      console.error(err);
      alert('Failed to add driver');
    }
  };

  const handleEditDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(editModal.name, editModal.phone, editModal.age)) return;
    try {
      await api.put(`/master-data/drivers/${editModal.id}`, {
        name: editModal.name,
        phone: editModal.phone,
        age: editModal.age ? parseInt(editModal.age) : undefined
      }, {
        headers: { 'x-plant-id': activePlantId }
      });
      setEditModal({ isOpen: false, id: '', name: '', phone: '', age: '' });
      fetchDrivers();
    } catch (err) {
      console.error(err);
      alert('Failed to update driver');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) return;
    try {
      await api.delete(`/master-data/drivers/${id}`, {
        headers: { 'x-plant-id': activePlantId }
      });
      fetchDrivers();
    } catch (err) {
      console.error(err);
      alert('Failed to delete driver');
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
            <Truck className="text-[#e67e00]" /> Driver Management
          </h1>
          <p className="text-[var(--text-muted-alt)] text-sm mt-1">Manage drivers</p>
        </div>
        <button 
          onClick={() => setAddModal({ isOpen: true, name: '', phone: '', age: '' })}
          className="bg-[#e67e00] text-black px-4 py-2 rounded-lg font-bold shadow hover:bg-[#cc7000] transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> Add Driver
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)]">
              <th className="p-4 font-semibold">Driver Name</th>
              <th className="p-4 font-semibold">Mobile Number</th>
              <th className="p-4 font-semibold">Age</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">Loading drivers...</td>
              </tr>
            ) : drivers.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">No drivers found.</td>
              </tr>
            ) : (
              drivers.map(driver => (
                <tr key={driver.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-panel-hover)]">
                  <td className="p-4 font-bold">{driver.name}</td>
                  <td className="p-4">{driver.phone || '-'}</td>
                  <td className="p-4">{driver.age || '-'}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setEditModal({ isOpen: true, id: driver.id, name: driver.name, phone: driver.phone || '', age: driver.age?.toString() || '' })} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(driver.id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {addModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-6 rounded-xl w-full max-w-md border border-[var(--border-subtle)]">
            <h2 className="text-xl font-bold mb-4">Add Driver</h2>
            <form onSubmit={handleAddDriver} className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Driver Name</label>
                <input required type="text" value={addModal.name} onChange={e => setAddModal({...addModal, name: e.target.value.replace(/[^A-Za-z\s]/g, '')})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Mobile Number</label>
                <input required type="text" value={addModal.phone} onChange={e => setAddModal({...addModal, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Age (Optional)</label>
                <input type="number" min="18" max="100" value={addModal.age} onChange={e => setAddModal({...addModal, age: e.target.value})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:border-amber-500" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setAddModal({ ...addModal, isOpen: false })} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
                <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-[var(--text-main)] px-4 py-2 rounded-lg font-medium transition-colors">Add Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-6 rounded-xl w-full max-w-md border border-[var(--border-subtle)]">
            <h2 className="text-xl font-bold mb-4">Edit Driver</h2>
            <form onSubmit={handleEditDriver} className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Driver Name</label>
                <input required type="text" value={editModal.name} onChange={e => setEditModal({...editModal, name: e.target.value.replace(/[^A-Za-z\s]/g, '')})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Mobile Number</label>
                <input required type="text" value={editModal.phone} onChange={e => setEditModal({...editModal, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Age (Optional)</label>
                <input type="number" min="18" max="100" value={editModal.age} onChange={e => setEditModal({...editModal, age: e.target.value})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:border-amber-500" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditModal({ ...editModal, isOpen: false })} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
                <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-[var(--text-main)] px-4 py-2 rounded-lg font-medium transition-colors">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePlantStore } from '../../store/plantStore';
import api from '../../api/axios';
import { UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubmitLock } from '../../hooks/useSubmitLock';

type StaffCategory = 'DRIVER' | 'LABOUR' | 'PAHUNCH' | 'UNLOADER';

export const AddStaff: React.FC = () => {
  const { activePlant } = usePlantStore();
  const activePlantId = activePlant?.id;
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [category, setCategory] = useState<StaffCategory>('DRIVER');
  const [error, setError] = useState('');
  const submitLock = useSubmitLock();

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    age: '',
    type: '',
    firmName: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Plant ID check for non-global staff
    if (category !== 'DRIVER' && !activePlantId && user?.role !== 'SUPER_ADMIN') {
      setError('Please select a plant before adding this staff category.');
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
          phone: formData.contact || undefined
        }, {
          headers: { 'x-plant-id': activePlantId }
        });
      }
      
      alert('Staff member added successfully!');
      navigate('/staff?tab=list&subtab=' + category.toLowerCase());
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to add staff member.');
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
          
          {/* 1. Select Category */}
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
                      onChange={() => setCategory(cat as StaffCategory)}
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

          {/* 2. Common Information */}
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

          {/* 3. Category-Specific Information */}
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
              <p className="text-sm text-[var(--text-muted)] italic">Contact number is optional for Unloaders. No other fields required.</p>
            )}

          </section>

          <div className="flex justify-end mt-8">
            <button
              type="submit"
              disabled={submitLock.pending}
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

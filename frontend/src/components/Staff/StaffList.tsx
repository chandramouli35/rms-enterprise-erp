import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePlantStore } from '../../store/plantStore';
import api from '../../api/axios';
import { Users, Trash2 } from 'lucide-react';
import { hasModulePermission } from '../../utils/modulePermissions';

type FilterType = 'ALL' | 'PAHUNCH' | 'LABOUR' | 'DRIVER' | 'UNLOADER';

export const StaffList: React.FC = () => {
  const { activePlant } = usePlantStore();
  const activePlantId = activePlant?.id;
  const { user } = useAuthStore();
  const canDeleteStaff = hasModulePermission('Staff Management', 'canDelete');
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      let combined: any[] = [];
      const reqHeaders = { 'x-plant-id': activePlantId || '' };

      if (filter === 'ALL' || filter === 'DRIVER') {
        const res = await api.get('/api/master-data/drivers', { headers: reqHeaders });
        const data = res.data || [];
        combined = [...combined, ...data.map((d: any) => ({ ...d, _category: 'DRIVER', contact: d.phone }))];
      }

      if ((filter === 'ALL' || filter === 'LABOUR') && (activePlantId || user?.role === 'SUPER_ADMIN')) {
        const res = await api.get('/api/master-data/labour', { headers: reqHeaders });
        const data = res.data || [];
        combined = [...combined, ...data.map((d: any) => ({ ...d, _category: 'LABOUR' }))];
      }

      if ((filter === 'ALL' || filter === 'PAHUNCH') && (activePlantId || user?.role === 'SUPER_ADMIN')) {
        const res = await api.get('/api/master-data/pahunch', { headers: reqHeaders });
        const data = res.data || [];
        combined = [...combined, ...data.map((d: any) => ({ ...d, _category: 'PAHUNCH' }))];
      }

      if ((filter === 'ALL' || filter === 'UNLOADER') && (activePlantId || user?.role === 'SUPER_ADMIN')) {
        const res = await api.get('/api/master-data/staff', { headers: reqHeaders });
        const data = (res.data || []).filter((s: any) => /UNLOADER/i.test(s.role || ''));
        combined = [
          ...combined,
          ...data.map((d: any) => ({
            ...d,
            _category: 'UNLOADER',
            contact: d.phone || d.contact,
          })),
        ];
      }

      // Sort by newest first
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setStaffList(combined);
    } catch (err) {
      console.error('Failed to fetch staff', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [activePlantId, filter]);

  const handleDelete = async (id: string, category: string) => {
    if (!canDeleteStaff) {
      alert('Not allowed. Turn on Delete for Staff Management, then log in again.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    try {
      const endpoint =
        category === 'DRIVER' ? 'drivers' :
        category === 'UNLOADER' ? 'staff' :
        category.toLowerCase();
      await api.delete(`/api/master-data/${endpoint}/${id}`, {
        headers: { 'x-plant-id': activePlantId || '' }
      });
      fetchStaff();
    } catch (err) {
      console.error(err);
      alert('Failed to delete staff member');
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-main)] overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="text-[#e67e00]" /> Staff List
        </h1>
        <div className="flex bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg p-1">
          {['ALL', 'PAHUNCH', 'LABOUR', 'DRIVER', 'UNLOADER'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as FilterType)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === f
                  ? 'bg-[#e67e00] text-black shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--glass-bg)]'
              }`}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-xl shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-base)] sticky top-0 z-10">
              <th className="p-4 font-semibold text-sm">Name</th>
              <th className="p-4 font-semibold text-sm">Category</th>
              <th className="p-4 font-semibold text-sm">Contact</th>
              <th className="p-4 font-semibold text-sm">Specific Info</th>
              <th className="p-4 font-semibold text-sm">Added On</th>
              <th className="p-4 font-semibold text-sm w-[100px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">Loading staff...</td>
              </tr>
            ) : staffList.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">No staff members found.</td>
              </tr>
            ) : (
              staffList.map((staff) => (
                <tr key={`${staff._category}-${staff.id}`} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-base)] transition-colors">
                  <td className="p-4 text-sm font-medium">{staff.name}</td>
                  <td className="p-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      staff._category === 'DRIVER' ? 'bg-blue-500/20 text-blue-400' :
                      staff._category === 'LABOUR' ? 'bg-purple-500/20 text-purple-400' :
                      staff._category === 'UNLOADER' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {staff._category}
                    </span>
                  </td>
                  <td className="p-4 text-sm">{staff.contact || '-'}</td>
                  <td className="p-4 text-sm text-[var(--text-muted)]">
                    {staff._category === 'DRIVER' && staff.age ? `Age: ${staff.age}` : ''}
                    {staff._category === 'LABOUR' && (
                      <div className="flex flex-col">
                        <span>Type: {staff.type}</span>
                        {staff.firmName && <span className="text-xs">Firm: {staff.firmName}</span>}
                      </div>
                    )}
                    {(staff._category === 'PAHUNCH' || staff._category === 'UNLOADER') && '-'}
                  </td>
                  <td className="p-4 text-sm text-[var(--text-muted)]">{new Date(staff.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-sm text-right">
                    {canDeleteStaff && (
                    <button
                      onClick={() => handleDelete(staff.id, staff._category)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

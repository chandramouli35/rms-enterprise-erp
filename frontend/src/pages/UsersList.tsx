import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export const UsersList: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'WEIGHBRIDGE_OPERATOR', plantIds: [] as string[] });

  useEffect(() => {
    fetchUsers();
    fetchPlants();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlants = async () => {
    try {
      const res = await api.get('/plants');
      setPlants(res.data);
    } catch (err) {
      console.error('Failed to fetch plants', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', formData);
      setIsModalOpen(false);
      setFormData({ username: '', email: '', password: '', role: 'WEIGHBRIDGE_OPERATOR', plantIds: [] });
      fetchUsers(); // Refresh list
    } catch (err) {
      console.error('Failed to create user', err);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-amber-500">User Management</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Create New User
        </button>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading users...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 text-gray-400 font-medium text-sm">User</th>
                <th className="p-4 text-gray-400 font-medium text-sm">Role</th>
                <th className="p-4 text-gray-400 font-medium text-sm">Assigned Plants</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-white">{user.username}</div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                  </td>
                  <td className="p-4"><span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">{user.role}</span></td>
                  <td className="p-4 text-sm text-gray-300">
                    {user.plants && user.plants.length > 0 ? user.plants.join(', ') : 'None'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-6 rounded-xl w-full max-w-md border border-white/10 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New User</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Username</label>
                <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500" placeholder="johndoe" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500" placeholder="john@ricefield.com" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Temporary Password</label>
                <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500">
                  <option value="WEIGHBRIDGE_OPERATOR">Weighbridge Operator</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="PLANT_MANAGER">Plant Manager</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Assign Plants</label>
                <div className="space-y-2 border border-white/10 p-3 rounded-lg bg-[#111]">
                  {plants.map(plant => (
                    <label key={plant.id} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.plantIds.includes(plant.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({...formData, plantIds: [...formData.plantIds, plant.id]});
                          } else {
                            setFormData({...formData, plantIds: formData.plantIds.filter(id => id !== plant.id)});
                          }
                        }}
                        className="rounded text-amber-500 focus:ring-amber-500 bg-black border-gray-600"
                      />
                      <span className="text-sm">{plant.name} <span className="text-gray-500 text-xs">({plant.code})</span></span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

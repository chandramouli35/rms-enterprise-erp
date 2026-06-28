import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import { CustomModal } from '../components/CustomModal';
import { usePlantStore } from '../store/plantStore';
import { 
  Users, Shield, Lock, FileText, Plus, Search, 
  Filter, Edit2, Trash2, ChevronDown, Check,
  UserCheck, UserX, Calendar, Clock, X, Eye, EyeOff
} from 'lucide-react';

export const UsersAndRoles: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.defaultTab || 'Users');
  
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [audit, setAudit] = useState<any>(null);
  const [auditList, setAuditList] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', content: '' });
  
  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ fullName: '', username: '', email: '', password: '', roleId: '', plantId: '' });
  const [showPassword, setShowPassword] = useState(false);

  // Add Role Modal State
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (location.state?.defaultTab) {
      setActiveTab(location.state.defaultTab);
    }
  }, [location.state?.defaultTab]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, auditRes, rolesRes, auditListRes, plantsRes] = await Promise.all([
        api.get('/users-roles/summary-metrics'),
        api.get('/users-roles/list'),
        api.get('/users-roles/audit-summary'),
        api.get('/users-roles/roles'),
        api.get('/users-roles/audit-list'),
        api.get('/plants')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setAudit(auditRes.data);
      setRoles(rolesRes.data);
      setAuditList(auditListRes.data);
      setPlants(plantsRes.data);

      if (rolesRes.data.length > 0) {
        handleRoleSelect(rolesRes.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch user roles data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = async (role: any) => {
    setSelectedRole(role);
    try {
      const res = await api.get(`/users-roles/roles/${role.id}/permissions`);
      setPermissions(res.data);
    } catch (err) {
      console.error('Failed to fetch role permissions', err);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await api.patch(`/users-roles/users/${id}/status`);
      setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u));
      const statsRes = await api.get('/users-roles/summary-metrics');
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const handlePermissionChange = (moduleIndex: number, field: string) => {
    const updated = [...permissions];
    updated[moduleIndex].permissions[field] = !updated[moduleIndex].permissions[field];
    setPermissions(updated);
  };

  const savePermissions = async () => {
    if(!selectedRole) return;
    try {
      await api.post(`/users-roles/roles/${selectedRole.id}/permissions`, { permissions });
      setModalConfig({ isOpen: true, title: 'Success', content: 'Permissions saved successfully!' });
    } catch (err) {
      console.error('Failed to save permissions', err);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users-roles/create', newUserForm);
      setIsAddUserModalOpen(false);
      setModalConfig({ isOpen: true, title: 'Success', content: 'User created successfully!' });
      fetchInitialData();
      setNewUserForm({ fullName: '', username: '', email: '', password: '', roleId: '', plantId: '' });
    } catch (err) {
      console.error('Failed to create user', err);
      setModalConfig({ isOpen: true, title: 'Error', content: 'Failed to create user. Please try again.' });
    }
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users-roles/roles', newRoleForm);
      setIsAddRoleModalOpen(false);
      setModalConfig({ isOpen: true, title: 'Success', content: 'Role created successfully!' });
      
      const rolesRes = await api.get('/users-roles/roles');
      setRoles(rolesRes.data);
      const statsRes = await api.get('/users-roles/summary-metrics');
      setStats(statsRes.data);
      setNewRoleForm({ name: '', description: '' });
    } catch (err) {
      console.error('Failed to create role', err);
      setModalConfig({ isOpen: true, title: 'Error', content: 'Failed to create role. Please try again.' });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-gray-200 bg-[#0a0a0a] min-h-screen">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">User & Role Management</h1>
          <p className="text-gray-400 text-sm">Manage users, roles, permissions and audit access</p>
        </div>
        <div>
          <button 
            onClick={() => setIsAddUserModalOpen(true)}
            className="bg-[#e67e00] hover:bg-[#cc7000] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={18} /> Add New User
          </button>
        </div>
      </div>

      <div className="flex gap-6 border-b border-white/10 pb-2">
        {['Users', 'Roles', 'Permissions', 'Audit Access'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-[#e67e00] text-[#e67e00]' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            {tab === 'Users' && <Users size={16} />}
            {tab === 'Roles' && <Shield size={16} />}
            {tab === 'Permissions' && <Lock size={16} />}
            {tab === 'Audit Access' && <FileText size={16} />}
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-amber-500">Loading Management Data...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl border border-[#1f1f1f] bg-[#121212] flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-400"><Users size={24} /></div>
              <div>
                <h3 className="text-gray-400 font-medium text-sm">Total Users</h3>
                <div className="flex items-end gap-2"><p className="text-2xl font-bold text-white leading-none">{stats?.totalUsers || 0}</p></div>
                <p className="text-xs text-gray-500 mt-1">Users in system</p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-[#1f1f1f] bg-[#121212] flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10 text-[#ffb042]"><UserCheck size={24} /></div>
              <div>
                <h3 className="text-gray-400 font-medium text-sm">Active Users</h3>
                <div className="flex items-end gap-2"><p className="text-2xl font-bold text-white leading-none">{stats?.activeUsers || 0}</p></div>
                <p className="text-xs text-gray-500 mt-1">Currently active</p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-[#1f1f1f] bg-[#121212] flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-400"><UserX size={24} /></div>
              <div>
                <h3 className="text-gray-400 font-medium text-sm">Inactive Users</h3>
                <div className="flex items-end gap-2"><p className="text-2xl font-bold text-white leading-none">{stats?.inactiveUsers || 0}</p></div>
                <p className="text-xs text-gray-500 mt-1">Currently inactive</p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-[#1f1f1f] bg-[#121212] flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10 text-purple-400"><Shield size={24} /></div>
              <div>
                <h3 className="text-gray-400 font-medium text-sm">Total Roles</h3>
                <div className="flex items-end gap-2"><p className="text-2xl font-bold text-white leading-none">{stats?.totalRoles || 0}</p></div>
                <p className="text-xs text-gray-500 mt-1">Defined roles</p>
              </div>
            </div>
          </div>

          {activeTab === 'Users' && (
            <div className="flex flex-col xl:flex-row gap-6">
              <div className="xl:w-[60%] rounded-xl border border-[#1f1f1f] bg-[#121212] flex flex-col">
                <div className="p-5 border-b border-white/5 flex justify-between items-center">
                  <h3 className="text-white font-semibold">Users List</h3>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search users..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[#1a1c23] border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 w-48" 
                      />
                    </div>
                    <select 
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="bg-[#1a1c23] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 flex items-center gap-2 hover:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="All">All Roles</option>
                      {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                    <button onClick={() => setModalConfig({isOpen: true, title: 'Advanced Filters', content: 'Advanced filters coming soon!'})} className="bg-[#1a1c23] border border-white/10 rounded-lg p-1.5 text-gray-400 hover:text-white"><Filter size={16} /></button>
                  </div>
                </div>
                
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#161616] text-slate-300 border-b border-[#1f1f1f]">
                      <tr>
                        <th className="px-3 py-3 font-medium">User Name</th>
                        <th className="px-3 py-3 font-medium">Role</th>
                        <th className="px-3 py-3 font-medium">Plant</th>
                        <th className="px-3 py-3 font-medium">Status</th>
                        <th className="px-3 py-3 font-medium">Last Login</th>
                        <th className="px-3 py-3 font-medium text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(() => {
                        const filteredUsers = users.filter(u => {
                          const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                                (u.fullname && u.fullname.toLowerCase().includes(searchQuery.toLowerCase()));
                          const matchesRole = roleFilter === 'All' || u.role === roleFilter;
                          return matchesSearch && matchesRole;
                        });

                        if (filteredUsers.length === 0) {
                          return <tr><td colSpan={6} className="text-center py-4 text-gray-500">No users found</td></tr>;
                        }

                        return filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <img src={user.avatar} alt="avatar" className="w-7 h-7 rounded-full bg-gray-800" />
                                <span className="font-medium text-white">{user.username}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-[#2a1b08] text-[#ffb042] border-[#442c0e]">{user.role}</span>
                            </td>
                            <td className="px-3 py-3 text-gray-300">{user.plant}</td>
                            <td className="px-3 py-3 cursor-pointer" onClick={() => handleToggleStatus(user.id)}>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${user.status === 'Active' ? 'text-[#ffb042] bg-[#2a1b08] border border-[#442c0e]' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-gray-400">{user.lastLogin}</td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button className="p-1.5 text-gray-400 hover:text-[#e67e00] hover:bg-[#e67e00]/10 rounded transition-colors"><Edit2 size={14} /></button>
                                <button className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="xl:w-[40%] flex flex-col gap-6">
                <div className="p-5 rounded-xl border border-[#1f1f1f] bg-[#121212]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-semibold">Role Details & Permissions</h3>
                    <div className="flex items-center gap-2">
                      <button onClick={savePermissions} className="text-xs bg-[#e67e00] text-white hover:bg-[#cc7000] px-2 py-1 rounded hover:bg-blue-500 transition-colors">Save</button>
                      <span className="text-xs text-gray-400 ml-2">Select Role</span>
                      <select 
                        className="bg-[#1a1c23] border border-white/10 rounded-lg px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                        value={selectedRole?.id || ''}
                        onChange={(e) => {
                          const role = roles.find(r => r.id === e.target.value);
                          if(role) handleRoleSelect(role);
                        }}
                      >
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <h4 className="text-sm font-medium text-white mb-3">Module Permissions</h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-gray-400 border-b border-white/10">
                        <tr>
                          <th className="pb-2 font-medium">Module</th>
                          <th className="pb-2 font-medium text-center">View</th>
                          <th className="pb-2 font-medium text-center">Add</th>
                          <th className="pb-2 font-medium text-center">Edit</th>
                          <th className="pb-2 font-medium text-center">Delete</th>
                          <th className="pb-2 font-medium text-center">Approve</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300">
                        {permissions.length === 0 ? <tr><td colSpan={6} className="text-center py-4 text-gray-500">Select a role to view permissions</td></tr> : permissions.map((module, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5">{module.name}</td>
                            {['view', 'add', 'edit', 'delete', 'approve'].map((action) => (
                               <td key={action} className="py-2.5 text-center">
                                 <input 
                                   type="checkbox" 
                                   checked={module.permissions[action]} 
                                   onChange={() => handlePermissionChange(idx, action)}
                                   className="rounded border-gray-600 text-[#e67e00] bg-[#0a0a0a] focus:ring-[#e67e00] border-[#1f1f1f] focus:ring-offset-[#121212] cursor-pointer" 
                                 />
                               </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-[#1f1f1f] bg-[#121212]">
                  <h3 className="text-white font-semibold mb-4">Audit Access Summary</h3>
                  <div className="grid grid-cols-4 gap-3 mb-5">
                    <div className="p-3 bg-[#1a1c23] rounded-lg border border-white/5 text-center">
                      <div className="flex justify-center text-blue-400 mb-1"><FileText size={18} /></div>
                      <p className="text-xs text-gray-400">Total Logs</p>
                      <p className="font-bold text-white text-lg">{audit?.total || 0}</p>
                    </div>
                    <div className="p-3 bg-[#1a1c23] rounded-lg border border-white/5 text-center">
                      <div className="flex justify-center text-[#ffb042] mb-1"><Calendar size={18} /></div>
                      <p className="text-xs text-gray-400">Today</p>
                      <p className="font-bold text-white text-lg">{audit?.today || 0}</p>
                    </div>
                    <div className="p-3 bg-[#1a1c23] rounded-lg border border-white/5 text-center">
                      <div className="flex justify-center text-yellow-400 mb-1"><Clock size={18} /></div>
                      <p className="text-xs text-gray-400">Last 7d</p>
                      <p className="font-bold text-white text-lg">{audit?.last7Days || 0}</p>
                    </div>
                    <div className="p-3 bg-[#1a1c23] rounded-lg border border-white/5 text-center">
                      <div className="flex justify-center text-red-400 mb-1"><Shield size={18} /></div>
                      <p className="text-xs text-gray-400">Last 30d</p>
                      <p className="font-bold text-white text-lg">{audit?.last30Days || 0}</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveTab('Audit Access')} className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors">
                    <FileText size={16} /> View Audit Logs
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Roles' && (
            <div className="p-6 rounded-xl border border-[#1f1f1f] bg-[#121212]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-semibold text-lg">System Roles</h3>
                <button 
                  onClick={() => setIsAddRoleModalOpen(true)}
                  className="bg-[#1a1c23] border border-white/10 hover:border-white/20 text-gray-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} /> Add Role
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {roles.map(r => (
                  <div key={r.id} className="p-5 rounded-lg bg-[#1a1c23] border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                       <div className="flex items-center gap-2">
                         <Shield size={20} className="text-blue-400" />
                         <h4 className="text-white font-medium">{r.name}</h4>
                       </div>
                       <button className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded transition-colors"><Edit2 size={14}/></button>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">{r.description || 'System role with predefined permissions.'}</p>
                    <button 
                      onClick={() => {
                        handleRoleSelect(r);
                        setActiveTab('Permissions');
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                    >
                      View Permissions &rarr;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Permissions' && (
            <div className="p-6 rounded-xl border border-[#1f1f1f] bg-[#121212]">
               <div className="flex justify-between items-center mb-6 pb-6 border-b border-white/5">
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-1">Master Permission Configuration</h3>
                    <p className="text-sm text-gray-400">Select a role and configure granular access control matrix.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-300">Target Role:</span>
                      <select 
                        className="bg-[#1a1c23] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 shadow-sm"
                        value={selectedRole?.id || ''}
                        onChange={(e) => {
                          const role = roles.find(r => r.id === e.target.value);
                          if(role) handleRoleSelect(role);
                        }}
                      >
                         {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <button onClick={savePermissions} className="bg-[#e67e00] text-white hover:bg-[#cc7000] px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                      <Check size={16} /> Save Changes
                    </button>
                  </div>
               </div>
               
               <div className="overflow-x-auto rounded-lg border border-white/5 bg-[#1a1c23]">
                  <table className="w-full text-left text-sm">
                    <thead className="text-gray-400 border-b border-white/10 bg-[#15171e]/50">
                      <tr>
                        <th className="px-6 py-4 font-medium">Module / Feature</th>
                        <th className="px-6 py-4 font-medium text-center">View</th>
                        <th className="px-6 py-4 font-medium text-center">Add</th>
                        <th className="px-6 py-4 font-medium text-center">Edit</th>
                        <th className="px-6 py-4 font-medium text-center">Delete</th>
                        <th className="px-6 py-4 font-medium text-center">Approve</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      {permissions.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">Loading matrix...</td></tr> : permissions.map((module, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 font-medium">{module.name}</td>
                          {['view', 'add', 'edit', 'delete', 'approve'].map((action) => (
                             <td key={action} className="px-6 py-4 text-center">
                               <input 
                                 type="checkbox" 
                                 checked={module.permissions[action]} 
                                 onChange={() => handlePermissionChange(idx, action)}
                                 className="w-4 h-4 rounded border-gray-600 text-[#e67e00] bg-[#0a0a0a] focus:ring-[#e67e00] border-[#1f1f1f] focus:ring-offset-[#121212] cursor-pointer" 
                               />
                             </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
          )}

          {activeTab === 'Audit Access' && (
            <div className="p-6 rounded-xl border border-[#1f1f1f] bg-[#121212]">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-white font-semibold text-lg">Chronological Log Feed</h3>
                 <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search logs..." className="bg-[#1a1c23] border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 w-64" />
                  </div>
               </div>
               <div className="overflow-x-auto rounded-lg border border-white/5 bg-[#1a1c23]">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#161616] text-slate-300 border-b border-[#1f1f1f]">
                      <tr>
                        <th className="px-6 py-3 font-medium">Timestamp</th>
                        <th className="px-6 py-3 font-medium">User</th>
                        <th className="px-6 py-3 font-medium">Module</th>
                        <th className="px-6 py-3 font-medium">Action</th>
                        <th className="px-6 py-3 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {auditList.length === 0 ? <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No logs found</td></tr> : auditList.map(log => (
                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors text-gray-300">
                          <td className="px-6 py-3 text-gray-400">{new Date(log.time).toLocaleString()}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <img src={log.avatar} alt="avatar" className="w-6 h-6 rounded-full" />
                              <span className="font-medium text-white">{log.user}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3"><span className="px-2 py-1 bg-white/5 rounded text-xs">{log.module}</span></td>
                          <td className="px-6 py-3 text-blue-400">{log.action}</td>
                          <td className="px-6 py-3 text-gray-400">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          )}
        </>
      )}

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#15171e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-[#1a1c23]">
              <h2 className="text-lg font-semibold text-white">Register New User</h2>
              <button onClick={() => setIsAddUserModalOpen(false)} className="text-gray-400 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 text-gray-300">
               {/* Same form as above */}
               <form id="realAddUserForm" onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                    <input type="text" required value={newUserForm.fullName} onChange={e => setNewUserForm({...newUserForm, fullName: e.target.value})} className="w-full bg-[#1a1c23] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="e.g. John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Username / Email</label>
                    <div className="flex gap-3">
                      <input type="text" required value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} className="w-1/2 bg-[#1a1c23] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Username" />
                      <input type="email" required value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} className="w-1/2 bg-[#1a1c23] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Email Address" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Secure Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required 
                        value={newUserForm.password} 
                        onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} 
                        className="w-full bg-[#1a1c23] border border-white/10 rounded-lg px-4 py-2 pr-10 text-sm text-white focus:outline-none focus:border-blue-500" 
                        placeholder="••••••••" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {newUserForm.password.length > 0 && (
                      <div className="mt-2 text-xs flex gap-4">
                        <span className={`flex items-center gap-1 ${newUserForm.password.length >= 8 ? 'text-green-500' : 'text-red-500'}`}>
                          {newUserForm.password.length >= 8 ? <Check size={12}/> : <X size={12}/>} Min 8 chars
                        </span>
                        <span className={`flex items-center gap-1 ${/[A-Z]/.test(newUserForm.password) ? 'text-green-500' : 'text-red-500'}`}>
                          {/[A-Z]/.test(newUserForm.password) ? <Check size={12}/> : <X size={12}/>} 1 Capital
                        </span>
                        <span className={`flex items-center gap-1 ${/[!@#$%^&*(),.?":{}|<>]/.test(newUserForm.password) ? 'text-green-500' : 'text-red-500'}`}>
                          {/[!@#$%^&*(),.?":{}|<>]/.test(newUserForm.password) ? <Check size={12}/> : <X size={12}/>} 1 Special
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Assign Role</label>
                      <select required value={newUserForm.roleId} onChange={e => setNewUserForm({...newUserForm, roleId: e.target.value})} className="w-full bg-[#1a1c23] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none">
                        <option value="" disabled>Select Role...</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Primary Plant</label>
                      <select required value={newUserForm.plantId} onChange={e => setNewUserForm({...newUserForm, plantId: e.target.value})} className="w-full bg-[#1a1c23] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none">
                        <option value="" disabled>Select Plant Context...</option>
                        {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
               </form>
            </div>
            <div className="px-6 py-4 border-t border-white/5 bg-[#1a1c23] flex justify-end gap-3">
              <button onClick={() => setIsAddUserModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button form="realAddUserForm" type="submit" className="px-4 py-2 bg-[#e67e00] text-white hover:bg-[#cc7000] rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Create User</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      {isAddRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#15171e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-[#1a1c23]">
              <h2 className="text-lg font-semibold text-white">Create New Role</h2>
              <button onClick={() => setIsAddRoleModalOpen(false)} className="text-gray-400 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 text-gray-300">
               <form id="addRoleForm" onSubmit={handleAddRole} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Role Name</label>
                    <input type="text" required value={newRoleForm.name} onChange={e => setNewRoleForm({...newRoleForm, name: e.target.value.toUpperCase()})} className="w-full bg-[#1a1c23] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="e.g. DATA_ENTRY" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                    <textarea rows={3} value={newRoleForm.description} onChange={e => setNewRoleForm({...newRoleForm, description: e.target.value})} className="w-full bg-[#1a1c23] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="What does this role do?" />
                  </div>
               </form>
            </div>
            <div className="px-6 py-4 border-t border-white/5 bg-[#1a1c23] flex justify-end gap-3">
              <button onClick={() => setIsAddRoleModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button form="addRoleForm" type="submit" className="px-4 py-2 bg-[#e67e00] text-white hover:bg-[#cc7000] rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Create Role</button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Dialog */}
      <CustomModal 
        isOpen={modalConfig.isOpen} 
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title}
        footer={
          <button 
            onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
            className="px-4 py-2 bg-[#e67e00] text-white hover:bg-[#cc7000] rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Okay
          </button>
        }
      >
        <p className="text-gray-300 leading-relaxed">{modalConfig.content}</p>
      </CustomModal>
    </div>
  );
};

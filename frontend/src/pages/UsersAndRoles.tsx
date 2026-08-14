import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { CustomModal } from '../components/CustomModal';
import { usePlantStore } from '../store/plantStore';
import Pagination from '../components/Pagination';
import { 
 Users, Shield, Lock, FileText, Plus, Search, 
 Filter, Edit2, Trash2, ChevronDown, ChevronRight, Check,
 UserCheck, UserX, Calendar, Clock, X, Eye, EyeOff
} from 'lucide-react';

export const UsersAndRoles: React.FC = () => {
 const location = useLocation();
 const [searchParams, setSearchParams] = useSearchParams();
 const activeTab = searchParams.get('tab') || 'Users';
 
 const [stats, setStats] = useState<any>(null);
 const [users, setUsers] = useState<any[]>([]);
 const [userCurrentPage, setUserCurrentPage] = useState(1);
 const [userTotalItems, setUserTotalItems] = useState(0);
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
  const [newUserForm, setNewUserForm] = useState<{fullName: string, username: string, email: string, password: string, roleId: string, plantIds: string[]}>({ fullName: '', username: '', email: '', password: '', roleId: '', plantIds: [] });
 const [showPassword, setShowPassword] = useState(false);
  const [isAddPlantDropdownOpen, setIsAddPlantDropdownOpen] = useState(false);

 // Add Role Modal State
 const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
 const [newRoleForm, setNewRoleForm] = useState({ name: '', description: '' });

 // Edit User Modal State
 const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
 const [editUserForm, setEditUserForm] = useState<{ id: string, fullName: string, email: string, currentPassword: string, newPassword: string, confirmPassword: string, roleId: string, plantIds: string[] }>({ id: '', fullName: '', email: '', currentPassword: '', newPassword: '', confirmPassword: '', roleId: '', plantIds: [] });
  
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [isEditPlantDropdownOpen, setIsEditPlantDropdownOpen] = useState(false);

  const toggleModule = (moduleName: string) => {
    const next = new Set(expandedModules);
    if (next.has(moduleName)) {
      next.delete(moduleName);
    } else {
      next.add(moduleName);
    }
    setExpandedModules(next);
  };

 useEffect(() => {
    fetchInitialData();
  }, [activeTab, userCurrentPage]);

 useEffect(() => {
 if (location.state?.defaultTab) {
 setSearchParams({ tab: location.state.defaultTab });
 }
 }, [location.state?.defaultTab]);

 const fetchInitialData = async () => {
 try {
 setLoading(true);
 const [statsRes, usersRes, auditRes, rolesRes, auditListRes, plantsRes] = await Promise.all([
 api.get('/users-roles/summary-metrics'),
 api.get(`/users-roles/list?page=${userCurrentPage}&limit=10`),
 api.get('/users-roles/audit-summary'),
 api.get('/users-roles/roles'),
 api.get('/users-roles/audit-list'),
 api.get('/plants')
 ]);
 setStats(statsRes.data);
 setUsers(usersRes.data.data || usersRes.data);
 setUserTotalItems(usersRes.data.total || (usersRes.data.length || 0));
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

 const handlePermissionChange = (moduleIndex: number, field: string, subModuleIndex: number | null = null) => {
 const updated = [...permissions];
 const module = updated[moduleIndex];
 
 if (subModuleIndex === null) {
   const newValue = !module.permissions[field];
   module.permissions[field] = newValue;
   
   if (module.subModules && module.subModules.length > 0) {
     module.subModules.forEach((sub: any) => {
       if (!getNotApplicableActions(sub.name).includes(field)) {
         sub.permissions[field] = newValue;
       }
     });
   }
 } else {
   const sub = module.subModules[subModuleIndex];
   sub.permissions[field] = !sub.permissions[field];
   
   const anyChildChecked = module.subModules.some((s: any) => s.permissions[field]);
   module.permissions[field] = anyChildChecked;
 }
 
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
 setNewUserForm({ fullName: '', username: '', email: '', password: '', roleId: '', plantIds: [] });
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

  const handleEditUserClick = (user: any) => {
    setEditUserForm({
      id: user.id,
      fullName: user.fullname || user.username || '',
      email: user.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      roleId: user.roleId || '',
      plantIds: user.plantAccess?.map((pa: any) => pa.plantId) || []
    });
    setIsEditUserModalOpen(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (editUserForm.newPassword || editUserForm.currentPassword || editUserForm.confirmPassword) {
    if (!editUserForm.currentPassword) {
      setModalConfig({ isOpen: true, title: 'Error', content: 'Current password is required to set a new password.' });
      return;
    }
    if (editUserForm.newPassword !== editUserForm.confirmPassword) {
      setModalConfig({ isOpen: true, title: 'Error', content: 'New password and confirm password do not match.' });
      return;
    }
  }

  try {
  await api.patch(`/users-roles/users/${editUserForm.id}`, editUserForm);
  setIsEditUserModalOpen(false);
  setModalConfig({ isOpen: true, title: 'Success', content: 'User updated successfully!' });
  fetchInitialData();
  } catch (err: any) {
  console.error('Failed to update user', err);
  setModalConfig({ isOpen: true, title: 'Error', content: err.response?.data?.message || 'Failed to update user. Please try again.' });
  }
  };

 const handleDeleteUser = async (id: string) => {
 if(!window.confirm('Are you sure you want to delete this user?')) return;
 try {
 await api.delete(`/users-roles/users/${id}`);
 setModalConfig({ isOpen: true, title: 'Success', content: 'User deleted successfully!' });
 fetchInitialData();
 } catch (err) {
 console.error('Failed to delete user', err);
 setModalConfig({ isOpen: true, title: 'Error', content: 'Failed to delete user. Please try again.' });
 }
 };

    const getNotApplicableActions = (moduleName: string) => {
    const name = moduleName.toLowerCase();
    if (name.includes('dashboard') || name.includes('report') || name.includes('analytics') || name.includes('tracking') || name.includes('qr barcode') || name.includes('summary')) return ['add', 'edit', 'delete', 'approve'];
    if (name.includes('setting')) return ['add', 'delete', 'approve'];
    if (name.includes('product') || name.includes('stock')) return ['approve'];
    return [];
  };

 return (
 <div className="space-y-6 max-w-[1600px] mx-auto text-[var(--text-muted)] bg-[var(--bg-base)] min-h-screen">
 
 <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-panel)] mb-6">
 <div className="flex items-center gap-2">
 <h1 className="text-sm font-semibold text-[var(--text-muted)]">User & Role Management</h1>
 </div>
 <div>
 <button 
 onClick={() => setIsAddUserModalOpen(true)}
 className="bg-[#e67e00] hover:bg-[#cc7000] text-black px-3 py-1.5 rounded-sm font-bold text-xs transition-colors flex items-center gap-1"
 >
 <Plus size={14} /> Add User
 </button>
 </div>
 </div>



 {loading ? (
 <div className="flex justify-center items-center h-64 text-amber-500">Loading Management Data...</div>
 ) : (
 <>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center gap-4">
 <div className="p-3 rounded-full bg-blue-500/10 text-blue-400"><Users size={24} /></div>
 <div>
 <h3 className="text-[var(--text-muted-alt)] font-medium text-sm">Total Users</h3>
 <div className="flex items-end gap-2"><p className="text-2xl font-bold text-[var(--text-main)] leading-none">{stats?.totalUsers || 0}</p></div>
 <p className="text-xs text-[var(--text-muted-alt)] mt-1">Users in system</p>
 </div>
 </div>

 <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center gap-4">
 <div className="p-3 rounded-full bg-green-500/10 text-[#e67e00]"><UserCheck size={24} /></div>
 <div>
 <h3 className="text-[var(--text-muted-alt)] font-medium text-sm">Active Users</h3>
 <div className="flex items-end gap-2"><p className="text-2xl font-bold text-[var(--text-main)] leading-none">{stats?.activeUsers || 0}</p></div>
 <p className="text-xs text-[var(--text-muted-alt)] mt-1">Currently active</p>
 </div>
 </div>

 <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center gap-4">
 <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-400"><UserX size={24} /></div>
 <div>
 <h3 className="text-[var(--text-muted-alt)] font-medium text-sm">Inactive Users</h3>
 <div className="flex items-end gap-2"><p className="text-2xl font-bold text-[var(--text-main)] leading-none">{stats?.inactiveUsers || 0}</p></div>
 <p className="text-xs text-[var(--text-muted-alt)] mt-1">Currently inactive</p>
 </div>
 </div>

 <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center gap-4">
 <div className="p-3 rounded-full bg-purple-500/10 text-purple-400"><Shield size={24} /></div>
 <div>
 <h3 className="text-[var(--text-muted-alt)] font-medium text-sm">Total Roles</h3>
 <div className="flex items-end gap-2"><p className="text-2xl font-bold text-[var(--text-main)] leading-none">{stats?.totalRoles || 0}</p></div>
 <p className="text-xs text-[var(--text-muted-alt)] mt-1">Defined roles</p>
 </div>
 </div>
 </div>

 {activeTab === 'Users' && (
 <div className="flex flex-col gap-6">
 <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] flex flex-col">
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-[var(--text-main)] font-semibold text-lg">Users List</h3>
 <button 
 onClick={() => setIsAddUserModalOpen(true)}
 className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-[var(--border-subtle)] text-[var(--text-muted)] px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
 >
 <Plus size={16} /> Add User
 </button>
 </div>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="relative">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted-alt)]" />
 <input 
 type="text" 
 placeholder="Search users..." 
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg pl-9 pr-4 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 w-48" 
 />
 </div>
 <select 
 value={roleFilter}
 onChange={(e) => setRoleFilter(e.target.value)}
 className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-muted)] flex items-center gap-2 hover:text-[var(--text-main)] focus:outline-none cursor-pointer"
 >
 <option value="All">All Roles</option>
 {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
 </select>
 <button onClick={() => setModalConfig({isOpen: true, title: 'Advanced Filters', content: 'Advanced filters coming soon!'})} className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg p-1.5 text-[var(--text-muted-alt)] hover:text-[var(--text-main)]"><Filter size={16} /></button>
 </div>
 </div>
 
 <div className="overflow-x-auto flex-1">
 <table className="w-full text-left text-xs">
 <thead className="bg-[var(--bg-panel-hover)] text-slate-300 border-b border-[var(--border-subtle)]">
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
 return <tr><td colSpan={6} className="text-center py-4 text-[var(--text-muted-alt)]">No users found</td></tr>;
 }

 return filteredUsers.map((user) => (
 <tr key={user.id} className="hover:bg-[var(--glass-bg)] transition-colors">
 <td className="px-3 py-3">
 <div className="flex items-center gap-2">
 <img src={user.avatar} alt="avatar" className="w-7 h-7 rounded-full bg-[var(--bg-panel-alt)]" />
 <span className="font-medium text-[var(--text-main)]">{user.username}</span>
 </div>
 </td>
 <td className="px-3 py-3">
 <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-500/10 text-[#e67e00] border-amber-500/20">{user.role}</span>
 </td>
 <td className="px-3 py-3 text-[var(--text-muted)]">{user.plant}</td>
 <td className="px-3 py-3 cursor-pointer" onClick={() => handleToggleStatus(user.id)}>
 <span className={`px-2 py-1 rounded text-xs font-medium ${user.status === 'Active' ? 'text-[#e67e00] bg-amber-500/10 border border-amber-500/20' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}>
 {user.status}
 </span>
 </td>
 <td className="px-3 py-3 text-[var(--text-muted-alt)]">{user.lastLogin}</td>
 <td className="px-3 py-3">
 <div className="flex items-center justify-center gap-2">
 <button onClick={() => handleEditUserClick(user)} className="p-1.5 text-[var(--text-muted-alt)] hover:text-[#e67e00] hover:bg-[#e67e00]/10 rounded transition-colors"><Edit2 size={14} /></button>
 <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 text-[var(--text-muted-alt)] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"><Trash2 size={14} /></button>
 </div>
 </td>
 </tr>
 ));
 })()}
 </tbody>
 </table>
 </div>
 </div>
 <Pagination 
   currentPage={userCurrentPage}
   totalItems={userTotalItems}
   onPageChange={setUserCurrentPage}
 />
 </div>
 )}



 {activeTab === 'Roles' && (
 <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-[var(--text-main)] font-semibold text-lg">System Roles</h3>
 <button 
 onClick={() => setIsAddRoleModalOpen(true)}
 className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-[var(--border-subtle)] text-[var(--text-muted)] px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
 >
 <Plus size={16} /> Add Role
 </button>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
 {roles.map(r => (
 <div key={r.id} className="p-5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle-alt)] hover:border-[var(--border-subtle)] transition-colors">
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2">
 <Shield size={20} className="text-blue-400" />
 <h4 className="text-[var(--text-main)] font-medium">{r.name}</h4>
 </div>
 <button className="text-[var(--text-muted-alt)] hover:text-[var(--text-main)] p-1 hover:bg-[var(--glass-bg)] rounded transition-colors"><Edit2 size={14}/></button>
 </div>
 <p className="text-sm text-[var(--text-muted-alt)] mb-4">{r.description || 'System role with predefined permissions.'}</p>
 <button 
 onClick={() => {
 handleRoleSelect(r);
 setSearchParams({tab: 'Permissions'});
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
 <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
 <div className="flex justify-between items-center mb-6 pb-6 border-b border-[var(--border-subtle-alt)]">
 <div>
 <h3 className="text-[var(--text-main)] font-semibold text-lg mb-1">Master Permission Configuration</h3>
 <p className="text-sm text-[var(--text-muted-alt)]">Select a role and configure granular access control matrix.</p>
 </div>
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-3">
 <span className="text-sm font-medium text-[var(--text-muted)]">Target Role:</span>
 <select 
 className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 shadow-sm"
 value={selectedRole?.id || ''}
 onChange={(e) => {
 const role = roles.find(r => r.id === e.target.value);
 if(role) handleRoleSelect(role);
 }}
 >
 {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
 </select>
 </div>
 <button onClick={savePermissions} className="bg-[#e67e00] text-[var(--text-main)] hover:bg-[#cc7000] px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
 <Check size={16} /> Save Changes
 </button>
 </div>
 </div>
 
 <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle-alt)] bg-[var(--bg-panel)]">
 <table className="w-full text-left text-sm">
 <thead className="text-[var(--text-muted-alt)] border-b border-[var(--border-subtle)] bg-[var(--bg-panel)]/50">
 <tr>
 <th className="px-6 py-4 font-medium">Module / Feature</th>
 <th className="px-6 py-4 font-medium text-center">View</th>
 <th className="px-6 py-4 font-medium text-center">Add</th>
 <th className="px-6 py-4 font-medium text-center">Edit</th>
 <th className="px-6 py-4 font-medium text-center">Delete</th>
 <th className="px-6 py-4 font-medium text-center">Approve</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5 text-[var(--text-muted)]">
 {permissions.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-[var(--text-muted-alt)]">Loading matrix...</td></tr> : permissions.map((module, idx) => {
   const isExpanded = expandedModules.has(module.name);
   const hasSubModules = module.subModules && module.subModules.length > 0;
   
   return (
     <React.Fragment key={idx}>
       <tr className="hover:bg-[var(--glass-bg)] transition-colors border-b border-white/5">
         <td className="px-6 py-4 font-medium flex items-center gap-2">
           {hasSubModules ? (
             <button onClick={() => toggleModule(module.name)} className="text-[var(--text-muted-alt)] hover:text-white transition-colors">
               {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
             </button>
           ) : (
             <span className="w-4"></span>
           )}
           {module.name}
         </td>
         {['view', 'add', 'edit', 'delete', 'approve'].map((action) => {
           const isNA = getNotApplicableActions(module.name).includes(action);
           return (
             <td key={action} className="px-6 py-4 text-center">
               {isNA ? (
                 <div title="Not applicable" className="flex justify-center text-[var(--text-muted-alt)]/30 cursor-not-allowed">
                   —
                 </div>
               ) : (
                 <input 
                   type="checkbox" 
                   checked={module.permissions[action]} 
                   onChange={() => handlePermissionChange(idx, action)}
                   className="w-4 h-4 rounded border-gray-600 text-[#e67e00] bg-[var(--bg-base)] focus:ring-[#e67e00] border-[var(--border-subtle)] focus:ring-offset-[#121212] cursor-pointer" 
                 />
               )}
             </td>
           );
         })}
       </tr>
       
       {isExpanded && hasSubModules && module.subModules.map((sub: any, subIdx: number) => (
         <tr key={`${idx}-${subIdx}`} className="bg-[var(--bg-panel)]/30 hover:bg-[var(--glass-bg)] transition-colors text-sm">
           <td className="px-6 py-3 pl-14 text-[var(--text-muted-alt)] flex items-center gap-2 border-l-2 border-transparent">
             <div className="w-1.5 h-1.5 rounded-full bg-[var(--border-subtle)]"></div>
             {sub.name}
           </td>
           {['view', 'add', 'edit', 'delete', 'approve'].map((action) => {
             const isNA = getNotApplicableActions(sub.name).includes(action);
             return (
               <td key={action} className="px-6 py-3 text-center">
                 {isNA ? (
                   <div title="Not applicable" className="flex justify-center text-[var(--text-muted-alt)]/30 cursor-not-allowed text-xs">
                     —
                   </div>
                 ) : (
                   <input 
                     type="checkbox" 
                     checked={sub.permissions[action]} 
                     onChange={() => handlePermissionChange(idx, action, subIdx)}
                     className="w-3.5 h-3.5 rounded border-gray-600 text-[#e67e00] bg-[var(--bg-base)] focus:ring-[#e67e00] border-[var(--border-subtle)] focus:ring-offset-[#121212] cursor-pointer" 
                   />
                 )}
               </td>
             );
           })}
         </tr>
       ))}
     </React.Fragment>
   );
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {activeTab === 'Audit Access' && (
 <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-[var(--text-main)] font-semibold text-lg">Chronological Log Feed</h3>
 <div className="relative">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted-alt)]" />
 <input type="text" placeholder="Search logs..." className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg pl-9 pr-4 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 w-64" />
 </div>
 </div>
 <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle-alt)] bg-[var(--bg-panel)]">
 <table className="w-full text-left text-sm whitespace-nowrap">
 <thead className="bg-[var(--bg-panel-hover)] text-slate-300 border-b border-[var(--border-subtle)]">
 <tr>
 <th className="px-6 py-3 font-medium">Timestamp</th>
 <th className="px-6 py-3 font-medium">User</th>
 <th className="px-6 py-3 font-medium">Module</th>
 <th className="px-6 py-3 font-medium">Action</th>
 <th className="px-6 py-3 font-medium">Details</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {auditList.length === 0 ? <tr><td colSpan={5} className="px-6 py-4 text-center text-[var(--text-muted-alt)]">No logs found</td></tr> : auditList.map(log => (
 <tr key={log.id} className="hover:bg-[var(--glass-bg)] transition-colors text-[var(--text-muted)]">
 <td className="px-6 py-3 text-[var(--text-muted-alt)]">{new Date(log.time).toLocaleString()}</td>
 <td className="px-6 py-3">
 <div className="flex items-center gap-2">
 <img src={log.avatar} alt="avatar" className="w-6 h-6 rounded-full" />
 <span className="font-medium text-[var(--text-main)]">{log.user}</span>
 </div>
 </td>
 <td className="px-6 py-3"><span className="px-2 py-1 bg-[var(--glass-bg)] rounded text-xs">{log.module}</span></td>
 <td className="px-6 py-3 text-blue-400">{log.action}</td>
 <td className="px-6 py-3 text-[var(--text-muted-alt)]">{log.details}</td>
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
 <div className="relative w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-visible">
 <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--border-subtle-alt)] bg-[var(--bg-panel)] rounded-t-2xl">
 <h2 className="text-lg font-semibold text-[var(--text-main)]">Register New User</h2>
 <button onClick={() => setIsAddUserModalOpen(false)} className="text-[var(--text-muted-alt)] hover:text-[var(--text-main)] hover:bg-[var(--glass-bg)] p-1.5 rounded-lg transition-colors">
 <X size={20} />
 </button>
 </div>
 <div className="p-6 text-[var(--text-muted)]">
 {/* Same form as above */}
 <form id="realAddUserForm" onSubmit={handleAddUser} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Full Name</label>
 <input type="text" required value={newUserForm.fullName} onChange={e => setNewUserForm({...newUserForm, fullName: e.target.value})} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500" placeholder="e.g. John Doe" />
 </div>
 <div>
 <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Username</label>
 <input type="text" required value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value, email: e.target.value})} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500" placeholder="Username" />
 </div>
 <div>
 <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Secure Password</label>
 <div className="relative">
 <input 
 type={showPassword ? "text" : "password"} 
 required 
 value={newUserForm.password} 
 onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} 
 className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 pr-10 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500" 
 placeholder="••••••••" 
 />
 <button 
 type="button" 
 onClick={() => setShowPassword(!showPassword)} 
 className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors"
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
 <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Assign Role</label>
 <select required value={newUserForm.roleId} onChange={e => setNewUserForm({...newUserForm, roleId: e.target.value})} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 appearance-none">
 <option value="" disabled>Select Role...</option>
 {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
 </select>
 </div>
 <div className="w-1/2">
   <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Primary Plant</label>
   <div className="relative">
     <div 
       className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-[var(--text-main)] cursor-pointer flex justify-between items-center focus:border-blue-500 hover:border-[var(--border-subtle-alt)] transition-colors"
       onClick={() => setIsAddPlantDropdownOpen(!isAddPlantDropdownOpen)}
     >
       <span className={newUserForm.plantIds.length === 0 ? "text-[var(--text-muted-alt)]" : "flex-1 overflow-x-auto whitespace-nowrap mr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"}>
        {newUserForm.plantIds.length === 0 
          ? "Select Plant Context..." 
          : newUserForm.plantIds.map(id => plants.find(p => p.id === id)?.name).filter(Boolean).join(', ')}
      </span>
       <ChevronDown size={16} className={`text-[var(--text-muted-alt)] transition-transform ${isAddPlantDropdownOpen ? 'rotate-180' : ''}`} />
     </div>
     
     {isAddPlantDropdownOpen && (
       <div className="absolute z-10 top-full mt-1 w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg shadow-lg max-h-[120px] overflow-y-auto">
         {plants.map(p => (
           <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-base)] cursor-pointer border-b border-[var(--border-subtle)] last:border-0">
             <input 
               type="checkbox"
               checked={newUserForm.plantIds.includes(p.id)}
               onChange={(e) => {
                 if (e.target.checked) {
                   setNewUserForm(prev => ({...prev, plantIds: [...prev.plantIds, p.id]}));
                 } else {
                   setNewUserForm(prev => ({...prev, plantIds: prev.plantIds.filter(id => id !== p.id)}));
                 }
               }}
               className="w-4 h-4 text-amber-500 rounded border-[var(--border-subtle)] bg-[var(--bg-base)] focus:ring-amber-500 focus:ring-offset-[var(--bg-panel)]"
             />
             <span className="text-sm text-[var(--text-main)]">{p.name} ({p.code})</span>
           </label>
         ))}
       </div>
     )}
   </div>
   </div>
 </div>
 </form>
 </div>
 <div className="px-6 py-4 border-t border-[var(--border-subtle-alt)] bg-[var(--bg-panel)] flex justify-end gap-3 rounded-b-2xl">
 <button onClick={() => setIsAddUserModalOpen(false)} className="px-4 py-2 text-sm font-medium text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
 <button form="realAddUserForm" type="submit" className="px-4 py-2 bg-[#e67e00] text-[var(--text-main)] hover:bg-[#cc7000] rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Create User</button>
 </div>
 </div>
 </div>
 )}

 {/* Edit User Modal */}
 {isEditUserModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
 <div className="relative w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-visible">
 <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--border-subtle-alt)] bg-[var(--bg-panel)] rounded-t-2xl">
 <h2 className="text-lg font-semibold text-[var(--text-main)]">Edit User</h2>
 <button onClick={() => setIsEditUserModalOpen(false)} className="text-[var(--text-muted-alt)] hover:text-[var(--text-main)] hover:bg-[var(--glass-bg)] p-1.5 rounded-lg transition-colors">
 <X size={20} />
 </button>
 </div>
 <div className="p-6">
 <form id="realEditUserForm" onSubmit={handleEditUserSubmit} className="space-y-4">
 <div>
 <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Full Name</label>
 <input required type="text" value={editUserForm.fullName} onChange={e => setEditUserForm({...editUserForm, fullName: e.target.value})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 transition-colors" placeholder="e.g. John Doe" />
 </div>
 
 <div>
 <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Username</label>
 <input required type="text" value={editUserForm.email} onChange={e => setEditUserForm({...editUserForm, email: e.target.value})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 transition-colors" placeholder="e.g. john" />
 </div>

 <div>
 <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Current Password (Required for changing password)</label>
 <div className="relative">
 <input 
 type={showPassword ? "text" : "password"} 
 value={editUserForm.currentPassword} 
 onChange={e => setEditUserForm({...editUserForm, currentPassword: e.target.value})} 
 className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 pr-10 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 transition-colors" 
 placeholder="Enter current password" 
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">New Password</label>
 <div className="relative">
 <input 
 type={showPassword ? "text" : "password"} 
 value={editUserForm.newPassword} 
 onChange={e => setEditUserForm({...editUserForm, newPassword: e.target.value})} 
 className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 pr-10 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 transition-colors" 
 placeholder="Leave blank to keep current password" 
 />
 <button 
 type="button" 
 onClick={() => setShowPassword(!showPassword)} 
 className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors"
 >
 {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
 </button>
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Confirm New Password</label>
 <div className="relative">
 <input 
 type={showPassword ? "text" : "password"} 
 value={editUserForm.confirmPassword} 
 onChange={e => setEditUserForm({...editUserForm, confirmPassword: e.target.value})} 
 className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 transition-colors" 
 placeholder="Confirm new password" 
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Assign Role</label>
 <select required value={editUserForm.roleId} onChange={e => setEditUserForm({...editUserForm, roleId: e.target.value})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 transition-colors cursor-pointer appearance-none">
 <option value="">Select Role</option>
 {roles.map((r: any) => (
 <option key={r.id} value={r.id}>{r.name}</option>
 ))}
 </select>
 </div>
 <div>
   <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Primary Plant</label>
   <div className="relative">
     <div 
       className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] cursor-pointer flex justify-between items-center focus:border-blue-500 hover:border-[var(--border-subtle-alt)] transition-colors"
       onClick={() => setIsEditPlantDropdownOpen(!isEditPlantDropdownOpen)}
     >
       <span className={editUserForm.plantIds.length === 0 ? "text-[var(--text-muted-alt)]" : "flex-1 overflow-x-auto whitespace-nowrap mr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"}>
        {editUserForm.plantIds.length === 0 
          ? "Select Plant Context..." 
          : editUserForm.plantIds.map(id => plants.find(p => p.id === id)?.name).filter(Boolean).join(', ')}
      </span>
       <ChevronDown size={16} className={`text-[var(--text-muted-alt)] transition-transform ${isEditPlantDropdownOpen ? 'rotate-180' : ''}`} />
     </div>
     
     {isEditPlantDropdownOpen && (
       <div className="absolute z-10 top-full mt-1 w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg shadow-lg max-h-[120px] overflow-y-auto">
         {plants.map(p => (
           <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-base)] cursor-pointer border-b border-[var(--border-subtle)] last:border-0">
             <input 
               type="checkbox"
               checked={editUserForm.plantIds.includes(p.id)}
               onChange={(e) => {
                 if (e.target.checked) {
                   setEditUserForm(prev => ({...prev, plantIds: [...prev.plantIds, p.id]}));
                 } else {
                   setEditUserForm(prev => ({...prev, plantIds: prev.plantIds.filter(id => id !== p.id)}));
                 }
               }}
               className="w-4 h-4 text-amber-500 rounded border-[var(--border-subtle)] bg-[var(--bg-base)] focus:ring-amber-500 focus:ring-offset-[var(--bg-panel)]"
             />
             <span className="text-sm text-[var(--text-main)]">{p.name} ({p.code})</span>
           </label>
         ))}
       </div>
     )}
   </div>
   </div>
 </div>
 </form>
 </div>
 <div className="px-6 py-4 border-t border-[var(--border-subtle-alt)] bg-[var(--bg-panel)] flex justify-end gap-3 rounded-b-2xl">
 <button onClick={() => setIsEditUserModalOpen(false)} className="px-4 py-2 text-sm font-medium text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
 <button form="realEditUserForm" type="submit" className="px-4 py-2 bg-[#e67e00] text-[var(--text-main)] hover:bg-[#cc7000] rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Save Changes</button>
 </div>
 </div>
 </div>
 )}

 {/* Add Role Modal */}
 {isAddRoleModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
 <div className="relative w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-visible">
 <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--border-subtle-alt)] bg-[var(--bg-panel)] rounded-t-2xl">
 <h2 className="text-lg font-semibold text-[var(--text-main)]">Create New Role</h2>
 <button onClick={() => setIsAddRoleModalOpen(false)} className="text-[var(--text-muted-alt)] hover:text-[var(--text-main)] hover:bg-[var(--glass-bg)] p-1.5 rounded-lg transition-colors">
 <X size={20} />
 </button>
 </div>
 <div className="p-6 text-[var(--text-muted)]">
 <form id="addRoleForm" onSubmit={handleAddRole} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Role Name</label>
 <input type="text" required value={newRoleForm.name} onChange={e => setNewRoleForm({...newRoleForm, name: e.target.value.toUpperCase()})} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500" placeholder="e.g. DATA_ENTRY" />
 </div>
 <div>
 <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Description</label>
 <textarea rows={3} value={newRoleForm.description} onChange={e => setNewRoleForm({...newRoleForm, description: e.target.value})} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500" placeholder="What does this role do?" />
 </div>
 </form>
 </div>
 <div className="px-6 py-4 border-t border-[var(--border-subtle-alt)] bg-[var(--bg-panel)] flex justify-end gap-3 rounded-b-2xl">
 <button onClick={() => setIsAddRoleModalOpen(false)} className="px-4 py-2 text-sm font-medium text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
 <button form="addRoleForm" type="submit" className="px-4 py-2 bg-[#e67e00] text-[var(--text-main)] hover:bg-[#cc7000] rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Create Role</button>
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
 className="px-4 py-2 bg-[#e67e00] text-[var(--text-main)] hover:bg-[#cc7000] rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
 >
 Okay
 </button>
 }
 >
 <p className="text-[var(--text-muted)] leading-relaxed">{modalConfig.content}</p>
 </CustomModal>
 </div>
 );
};

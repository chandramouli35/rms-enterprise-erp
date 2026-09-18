import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { CustomModal } from '../components/CustomModal';
import { useUiStore } from '../store/uiStore';
import Combobox from '../components/Combobox';
import { usePlantStore } from '../store/plantStore';
import Pagination from '../components/Pagination';
import { biometricService } from '../services/biometricService';
import { 
 Users, Shield, Lock, FileText, Plus, Search, 
 Filter, Edit2, Trash2, ChevronDown, ChevronRight, Check,
 UserCheck, UserX, Calendar, Clock, X, Eye, EyeOff, Fingerprint, ArrowRightLeft
} from 'lucide-react';
import { useSubmitLock } from '../hooks/useSubmitLock';

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
  const [newUserForm, setNewUserForm] = useState<{
    fullName: string;
    username: string;
    email: string;
    password: string;
    roleId: string;
    plantIds: string[];
    fingerprint1: string;
    fingerprint2: string;
    fingerprint1Template: string;
    fingerprint2Template: string;
  }>({
    fullName: '',
    username: '',
    email: '',
    password: '',
    roleId: '',
    plantIds: [],
    fingerprint1: '',
    fingerprint2: '',
    fingerprint1Template: '',
    fingerprint2Template: '',
  });
 const [showPassword, setShowPassword] = useState(false);
  const [isAddPlantDropdownOpen, setIsAddPlantDropdownOpen] = useState(false);
  const addPlantDropdownRef = useRef<HTMLDivElement>(null);
  const editPlantDropdownRef = useRef<HTMLDivElement>(null);
  const [usernameExists, setUsernameExists] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const usernameCheckSeq = useRef(0);

 // Add Role Modal State
 const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
 const [newRoleForm, setNewRoleForm] = useState({ name: '', description: '' });
 const [roleNameExists, setRoleNameExists] = useState(false);
 const [checkingRoleName, setCheckingRoleName] = useState(false);
 const roleNameCheckSeq = useRef(0);

 // Edit User Modal State
 const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
 const [editUserForm, setEditUserForm] = useState<{ id: string, fullName: string, email: string, newPassword: string, confirmPassword: string, roleId: string, plantIds: string[] }>({ id: '', fullName: '', email: '', newPassword: '', confirmPassword: '', roleId: '', plantIds: [] });
  
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [isEditPlantDropdownOpen, setIsEditPlantDropdownOpen] = useState(false);

  // Transfer User (single-mill → new mill account)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    sourceUserId: '',
    sourceUsername: '',
    sourceRoleName: '',
    plantId: '',
    username: '',
    password: '',
    email: '',
    fingerprint1: '',
    fingerprint2: '',
    fingerprint1Template: '',
    fingerprint2Template: '',
  });
  const [showTransferPassword, setShowTransferPassword] = useState(false);

  const permissionsLock = useSubmitLock();
  const addUserLock = useSubmitLock();
  const addRoleLock = useSubmitLock();
  const editUserLock = useSubmitLock();
  const deleteUserLock = useSubmitLock();
  const transferUserLock = useSubmitLock();

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

  // Close plant dropdowns when clicking outside (empty screen / elsewhere)
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        isAddPlantDropdownOpen &&
        addPlantDropdownRef.current &&
        !addPlantDropdownRef.current.contains(t)
      ) {
        setIsAddPlantDropdownOpen(false);
      }
      if (
        isEditPlantDropdownOpen &&
        editPlantDropdownRef.current &&
        !editPlantDropdownRef.current.contains(t)
      ) {
        setIsEditPlantDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [isAddPlantDropdownOpen, isEditPlantDropdownOpen]);

  const selectedAddRole = roles.find((r) => r.id === newUserForm.roleId);
  const isAddSupervisorRole =
    !!selectedAddRole?.name && /supervisor/i.test(String(selectedAddRole.name));
  /** Admins / Superadmins, or roles with "Add more than one mill" permission */
  const roleAllowsMultipleMills = (roleOrName?: any) => {
    if (!roleOrName) return false;
    if (typeof roleOrName === 'object') {
      if (roleOrName.allowsMultipleMills === true) return true;
      roleOrName = roleOrName.name;
    }
    const n = String(roleOrName).trim().toUpperCase().replace(/[\s-]+/g, '_');
    return (
      n === 'SUPER_ADMIN' ||
      n === 'SUPERADMIN' ||
      n === 'ADMIN' ||
      n === 'ADMINISTRATOR'
    );
  };
  const addAllowsMultiMill = roleAllowsMultipleMills(selectedAddRole);
  const selectedEditRole = roles.find((r) => r.id === editUserForm.roleId);
  const editAllowsMultiMill = roleAllowsMultipleMills(selectedEditRole);

  const resetNewUserForm = () => {
    setUsernameExists(false);
    setCheckingUsername(false);
    usernameCheckSeq.current += 1;
    setNewUserForm({
      fullName: '',
      username: '',
      email: '',
      password: '',
      roleId: '',
      plantIds: [],
      fingerprint1: '',
      fingerprint2: '',
      fingerprint1Template: '',
      fingerprint2Template: '',
    });
  };

  // Live username duplicate check (same pattern as truck number)
  useEffect(() => {
    if (!isAddUserModalOpen) return;
    const trimmed = String(newUserForm.username || '').trim();
    if (!trimmed || trimmed.length < 2) {
      setUsernameExists(false);
      setCheckingUsername(false);
      return;
    }
    const seq = ++usernameCheckSeq.current;
    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/users-roles/check-username', {
          params: { username: trimmed },
        });
        if (seq !== usernameCheckSeq.current) return;
        setUsernameExists(!!res.data?.exists);
      } catch (err) {
        if (seq !== usernameCheckSeq.current) return;
        console.error(err);
        setUsernameExists(false);
      } finally {
        if (seq === usernameCheckSeq.current) setCheckingUsername(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [isAddUserModalOpen, newUserForm.username]);

  // Live role name duplicate check
  useEffect(() => {
    if (!isAddRoleModalOpen) return;
    const trimmed = String(newRoleForm.name || '').trim();
    if (!trimmed || trimmed.length < 2) {
      setRoleNameExists(false);
      setCheckingRoleName(false);
      return;
    }
    const seq = ++roleNameCheckSeq.current;
    setCheckingRoleName(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/users-roles/check-role', {
          params: { name: trimmed },
        });
        if (seq !== roleNameCheckSeq.current) return;
        setRoleNameExists(!!res.data?.exists);
      } catch (err) {
        if (seq !== roleNameCheckSeq.current) return;
        console.error(err);
        setRoleNameExists(false);
      } finally {
        if (seq === roleNameCheckSeq.current) setCheckingRoleName(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [isAddRoleModalOpen, newRoleForm.name]);

  const usernameBlocksForm = usernameExists;
  const addUserFieldsDisabled = usernameBlocksForm;
  const roleNameBlocksForm = roleNameExists;

  const captureUserFingerprint = async (slot: 1 | 2) => {
    try {
      const { pidData, isoTemplate } =
        await biometricService.captureForEnrollment();
      setNewUserForm((prev) => ({
        ...prev,
        ...(slot === 1
          ? {
              fingerprint1: pidData,
              fingerprint1Template: isoTemplate || '',
            }
          : {
              fingerprint2: pidData,
              fingerprint2Template: isoTemplate || '',
            }),
      }));
      useUiStore
        .getState()
        .addToast(`Fingerprint ${slot} captured successfully`, 'success');
    } catch (err: any) {
      useUiStore
        .getState()
        .addToast(err?.message || `Fingerprint ${slot} capture failed`, 'error');
    }
  };

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
 await permissionsLock.wrapSubmit(async () => {
 try {
 await api.post(`/users-roles/roles/${selectedRole.id}/permissions`, { permissions });
 setModalConfig({ isOpen: true, title: 'Success', content: 'Permissions saved successfully!' });
 } catch (err) {
 console.error('Failed to save permissions', err);
 }
 });
 };

 const handleAddUser = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newUserForm.roleId) {
   setModalConfig({ isOpen: true, title: 'Role Required', content: 'Please assign a role before creating the user.' });
   return;
 }
 if (!newUserForm.plantIds.length) {
   setModalConfig({
     isOpen: true,
     title: 'Plant Required',
     content: addAllowsMultiMill
       ? 'Select at least one mill under Primary Plant.'
       : 'Select exactly one plant under Primary Plant.',
   });
   return;
 }
 if (!addAllowsMultiMill && newUserForm.plantIds.length > 1) {
   setModalConfig({
     isOpen: true,
     title: 'Mill Allocation',
     content: 'This role can be assigned to only one plant. Admin / Superadmin may select multiple mills.',
   });
   return;
 }
 if (isAddSupervisorRole && (!newUserForm.fingerprint1 || !newUserForm.fingerprint2)) {
   setModalConfig({
     isOpen: true,
     title: 'Fingerprints Required',
     content: 'Supervisor registration requires two fingerprint scans (Finger 1 and Finger 2).',
   });
   return;
 }
 if (usernameExists) {
   setModalConfig({
     isOpen: true,
     title: 'Username Taken',
     content: 'Username already exists. Choose a different username.',
   });
   return;
 }
 await addUserLock.wrapSubmit(async () => {
 try {
 const plantIds = addAllowsMultiMill ? newUserForm.plantIds : newUserForm.plantIds.slice(0, 1);
 await api.post('/users-roles/create', { ...newUserForm, plantIds });
 setIsAddUserModalOpen(false);
 setIsAddPlantDropdownOpen(false);
 setModalConfig({ isOpen: true, title: 'Success', content: 'User created successfully!' });
 fetchInitialData();
 resetNewUserForm();
 } catch (err: any) {
 console.error('Failed to create user', err);
 setModalConfig({
   isOpen: true,
   title: 'Error',
   content: err?.response?.data?.message || 'Failed to create user. Please try again.',
 });
 }
 });
 };

 const handleAddRole = async (e: React.FormEvent) => {
 e.preventDefault();
 if (roleNameExists) {
   setModalConfig({
     isOpen: true,
     title: 'Role Name Taken',
     content: 'Role name already exists. Choose a different name.',
   });
   return;
 }
 await addRoleLock.wrapSubmit(async () => {
 try {
 await api.post('/users-roles/roles', newRoleForm);
 setIsAddRoleModalOpen(false);
 setRoleNameExists(false);
 setCheckingRoleName(false);
 roleNameCheckSeq.current += 1;
 setModalConfig({ isOpen: true, title: 'Success', content: 'Role created successfully!' });
 
 const rolesRes = await api.get('/users-roles/roles');
 setRoles(rolesRes.data);
 const statsRes = await api.get('/users-roles/summary-metrics');
 setStats(statsRes.data);
 setNewRoleForm({ name: '', description: '' });
 } catch (err: any) {
 console.error('Failed to create role', err);
 setModalConfig({
   isOpen: true,
   title: 'Error',
   content: err?.response?.data?.message || 'Failed to create role. Please try again.',
 });
 }
 });
 };

  const handleEditUserClick = (user: any) => {
    const roleName =
      (typeof user.role === 'string' ? user.role : user.role?.name) ||
      roles.find((r) => r.id === user.roleId)?.name;
    const multi = roleAllowsMultipleMills(roleName);
    const allPlantIds: string[] =
      (Array.isArray(user.plantIds) && user.plantIds.length
        ? user.plantIds
        : user.plantAccess?.map((pa: any) => pa.plantId)) ||
      (user.plantId ? [user.plantId] : []);
    setEditUserForm({
      id: user.id,
      fullName: user.fullname || user.username || '',
      email: user.email || '',
      newPassword: '',
      confirmPassword: '',
      roleId: user.roleId || '',
      plantIds: multi ? allPlantIds : allPlantIds.slice(0, 1),
    });
    setIsEditUserModalOpen(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (editUserForm.newPassword || editUserForm.confirmPassword) {
    if (editUserForm.newPassword !== editUserForm.confirmPassword) {
      setModalConfig({ isOpen: true, title: 'Error', content: 'New password and confirm password do not match.' });
      return;
    }
  }

  if (!editUserForm.plantIds.length) {
    setModalConfig({
      isOpen: true,
      title: 'Plant Required',
      content: editAllowsMultiMill
        ? 'Select at least one mill under Primary Plant.'
        : 'Select exactly one plant under Primary Plant.',
    });
    return;
  }
  if (!editAllowsMultiMill && editUserForm.plantIds.length > 1) {
    setModalConfig({
      isOpen: true,
      title: 'Mill Allocation',
      content: 'This role can be assigned to only one plant. Admin / Superadmin may select multiple mills.',
    });
    return;
  }

  await editUserLock.wrapSubmit(async () => {
  try {
  const plantIds = editAllowsMultiMill ? editUserForm.plantIds : editUserForm.plantIds.slice(0, 1);
  await api.patch(`/users-roles/users/${editUserForm.id}`, { ...editUserForm, plantIds });
  setIsEditUserModalOpen(false);
  setModalConfig({ isOpen: true, title: 'Success', content: 'User updated successfully!' });
  fetchInitialData();
  } catch (err: any) {
  console.error('Failed to update user', err);
  setModalConfig({ isOpen: true, title: 'Error', content: err.response?.data?.message || 'Failed to update user. Please try again.' });
  }
  });
  };

  const handleTransferUserClick = (user: any) => {
    const roleName =
      (typeof user.role === 'string' ? user.role : user.role?.name) || '';
    if (roleAllowsMultipleMills(roles.find((r) => r.id === user.roleId) || roleName)) {
      setModalConfig({
        isOpen: true,
        title: 'Use Edit instead',
        content:
          'This role can hold multiple mills. Update Primary Plant on Edit User instead of transferring.',
      });
      return;
    }
    setTransferForm({
      sourceUserId: user.id,
      sourceUsername: user.username,
      sourceRoleName: roleName,
      plantId: '',
      username: '',
      password: '',
      email: '',
      fingerprint1: '',
      fingerprint2: '',
      fingerprint1Template: '',
      fingerprint2Template: '',
    });
    setIsTransferModalOpen(true);
  };

  const captureTransferFingerprint = async (slot: 1 | 2) => {
    try {
      const { pidData, isoTemplate } =
        await biometricService.captureForEnrollment();
      setTransferForm((prev) => ({
        ...prev,
        ...(slot === 1
          ? {
              fingerprint1: pidData,
              fingerprint1Template: isoTemplate || '',
            }
          : {
              fingerprint2: pidData,
              fingerprint2Template: isoTemplate || '',
            }),
      }));
      useUiStore.getState().addToast(`Fingerprint ${slot} captured`, 'success');
    } catch (err: any) {
      useUiStore
        .getState()
        .addToast(err?.message || `Fingerprint ${slot} capture failed`, 'error');
    }
  };

  const handleTransferUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.plantId || !transferForm.username || !transferForm.password) {
      setModalConfig({
        isOpen: true,
        title: 'Missing fields',
        content: 'Destination mill, new User ID and password are required.',
      });
      return;
    }
    const needsFp = /supervisor/i.test(transferForm.sourceRoleName);
    if (needsFp && (!transferForm.fingerprint1 || !transferForm.fingerprint2)) {
      setModalConfig({
        isOpen: true,
        title: 'Fingerprints Required',
        content: 'Supervisor transfer requires two new fingerprint scans.',
      });
      return;
    }
    await transferUserLock.wrapSubmit(async () => {
      try {
        await api.post(`/users-roles/users/${transferForm.sourceUserId}/transfer`, {
          plantId: transferForm.plantId,
          username: transferForm.username,
          password: transferForm.password,
          email: transferForm.email || undefined,
          fingerprint1: transferForm.fingerprint1 || undefined,
          fingerprint2: transferForm.fingerprint2 || undefined,
          fingerprint1Template: transferForm.fingerprint1Template || undefined,
          fingerprint2Template: transferForm.fingerprint2Template || undefined,
        });
        setIsTransferModalOpen(false);
        setModalConfig({
          isOpen: true,
          title: 'Transferred',
          content:
            'New mill account created. Old User ID archived; historical entries and prior fingerprints retained.',
        });
        fetchInitialData();
      } catch (err: any) {
        setModalConfig({
          isOpen: true,
          title: 'Error',
          content: err?.response?.data?.message || 'Transfer failed.',
        });
      }
    });
  };

  const handleDeleteUser = async (id: string) => {
 if(!window.confirm('Are you sure you want to delete this user?')) return;
 await deleteUserLock.wrapSubmit(async () => {
 try {
 await api.delete(`/users-roles/users/${id}`);
 setModalConfig({ isOpen: true, title: 'Success', content: 'User deleted successfully!' });
 fetchInitialData();
 } catch (err) {
 console.error('Failed to delete user', err);
 setModalConfig({ isOpen: true, title: 'Error', content: 'Failed to delete user. Please try again.' });
 }
 });
 };

    const getNotApplicableActions = (moduleName: string) => {
    const name = moduleName.toLowerCase();
    if (name.includes('add more than one mill')) return ['add', 'edit', 'delete', 'approve'];
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
 <Combobox
 name="roleFilter"
 value={roleFilter}
 onChange={(e: any) => setRoleFilter(e.target.value)}
 options={roles}
 valueKey="name"
 placeholder="All Roles"
 className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-muted)] flex items-center gap-2 hover:text-[var(--text-main)] focus:outline-none cursor-pointer"
 />
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
 <button title="Edit" onClick={() => handleEditUserClick(user)} className="p-1.5 text-[var(--text-muted-alt)] hover:text-[#e67e00] hover:bg-[#e67e00]/10 rounded transition-colors"><Edit2 size={14} /></button>
 <button title="Transfer to another mill" onClick={() => handleTransferUserClick(user)} className="p-1.5 text-[var(--text-muted-alt)] hover:text-sky-400 hover:bg-sky-400/10 rounded transition-colors"><ArrowRightLeft size={14} /></button>
 <button title="Delete" onClick={() => handleDeleteUser(user.id)} className="p-1.5 text-[var(--text-muted-alt)] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"><Trash2 size={14} /></button>
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
 <Combobox
 name="selectedRole"
 value={selectedRole?.id || ''}
 onChange={(e: any) => {
 const role = roles.find(r => r.id === e.target.value);
 if(role) handleRoleSelect(role);
 }}
 options={roles}
 valueKey="id"
 placeholder="Select Role"
 listMaxHeightClass="max-h-56"
 className="min-w-[200px] bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 shadow-sm"
 />
 </div>
 <button onClick={savePermissions} disabled={permissionsLock.pending} className="bg-[#e67e00] text-[var(--text-main)] hover:bg-[#cc7000] px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50">
 <Check size={16} /> {permissionsLock.pending ? 'Saving...' : 'Save Changes'}
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
 <div
   className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
   onMouseDown={() => setIsAddPlantDropdownOpen(false)}
 >
 <div
   className="relative w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-visible max-h-[90vh] flex flex-col"
   onMouseDown={(e) => e.stopPropagation()}
 >
 <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--border-subtle-alt)] bg-[var(--bg-panel)] rounded-t-2xl shrink-0">
 <h2 className="text-lg font-semibold text-[var(--text-main)]">Register New User</h2>
 <button onClick={() => { setIsAddUserModalOpen(false); setIsAddPlantDropdownOpen(false); resetNewUserForm(); }} className="text-[var(--text-muted-alt)] hover:text-[var(--text-main)] hover:bg-[var(--glass-bg)] p-1.5 rounded-lg transition-colors">
 <X size={20} />
 </button>
 </div>
 <div className="p-6 text-[var(--text-muted)] overflow-y-auto flex-1">
 <form id="realAddUserForm" onSubmit={handleAddUser} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Full Name</label>
 <input type="text" required value={newUserForm.fullName} onChange={e => setNewUserForm({...newUserForm, fullName: e.target.value})} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500" placeholder="e.g. John Doe" />
 </div>
 <div>
 <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Username</label>
 <input
   type="text"
   required
   value={newUserForm.username}
   onChange={e => setNewUserForm({...newUserForm, username: e.target.value, email: e.target.value})}
   className={`w-full bg-[var(--bg-panel)] border rounded-lg px-4 py-2 text-sm text-[var(--text-main)] focus:outline-none ${
     usernameExists
       ? 'border-red-500 focus:border-red-500'
       : 'border-[var(--border-subtle)] focus:border-blue-500'
   }`}
   placeholder="Username"
 />
 {usernameExists ? (
   <p className="text-red-500 text-xs mt-1 font-medium">Username already exists</p>
 ) : checkingUsername && String(newUserForm.username || '').trim().length >= 2 ? (
   <p className="text-[var(--text-muted-alt)] text-xs mt-1">Checking username…</p>
 ) : null}
 </div>
 <div>
 <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Secure Password</label>
 <div className="relative">
 <input 
 type={showPassword ? "text" : "password"} 
 required 
 value={newUserForm.password} 
 onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} 
 disabled={addUserFieldsDisabled}
 className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 pr-10 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" 
 placeholder="••••••••" 
 />
 <button 
 type="button" 
 onClick={() => setShowPassword(!showPassword)} 
 disabled={addUserFieldsDisabled}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors disabled:opacity-50"
 >
 {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
 </button>
 </div>
 {newUserForm.password.length > 0 && !addUserFieldsDisabled && (
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
 <div className={addUserFieldsDisabled ? 'opacity-50 pointer-events-none' : ''}>
 <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Assign Role</label>
 <Combobox
 name="roleId"
 value={newUserForm.roleId}
 onChange={(e: any) => {
   const nextRoleId = e.target.value;
   const nextRole = roles.find((r) => r.id === nextRoleId);
   const multi = roleAllowsMultipleMills(nextRole);
   setNewUserForm((prev) => ({
     ...prev,
     roleId: nextRoleId,
     plantIds: multi ? prev.plantIds : prev.plantIds.slice(0, 1),
     ...(!/supervisor/i.test(String(nextRole?.name || ''))
       ? {
           fingerprint1: '',
           fingerprint2: '',
           fingerprint1Template: '',
           fingerprint2Template: '',
         }
       : {}),
   }));
 }}
 options={roles}
 valueKey="id"
 placeholder="Select Role..."
 required
 listMaxHeightClass="max-h-36"
 className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500"
 />
 </div>
 <div className={addUserFieldsDisabled ? 'opacity-50 pointer-events-none' : ''}>
   <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">
     Primary Plant{addAllowsMultiMill ? ' (multiple allowed)' : ' (one only)'}
   </label>
   <div className="relative" ref={addPlantDropdownRef}>
     <div 
       className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-[var(--text-main)] cursor-pointer flex justify-between items-center focus:border-blue-500 hover:border-[var(--border-subtle-alt)] transition-colors"
       onClick={() => !addUserFieldsDisabled && setIsAddPlantDropdownOpen(!isAddPlantDropdownOpen)}
     >
       <span className={newUserForm.plantIds.length === 0 ? "text-[var(--text-muted-alt)]" : "flex-1 overflow-x-auto whitespace-nowrap mr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"}>
        {newUserForm.plantIds.length === 0 
          ? (addAllowsMultiMill ? "Select mill(s)..." : "Select one mill...")
          : newUserForm.plantIds.map(id => plants.find(p => p.id === id)?.name).filter(Boolean).join(', ')}
      </span>
       <ChevronDown size={16} className={`text-[var(--text-muted-alt)] transition-transform ${isAddPlantDropdownOpen ? 'rotate-180' : ''}`} />
     </div>
     
     {isAddPlantDropdownOpen && !addUserFieldsDisabled && (
       <div className="absolute z-[100] top-full mt-1 w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg shadow-lg max-h-[140px] overflow-y-auto">
         {plants.map(p => (
           <label key={p.id} className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--bg-base)] cursor-pointer border-b border-[var(--border-subtle)] last:border-0">
             <input 
               type={addAllowsMultiMill ? 'checkbox' : 'radio'}
               name={addAllowsMultiMill ? undefined : 'addPrimaryPlant'}
               checked={newUserForm.plantIds.includes(p.id)}
               onChange={(e) => {
                 if (addAllowsMultiMill) {
                   if (e.target.checked) {
                     setNewUserForm(prev => ({...prev, plantIds: [...prev.plantIds, p.id]}));
                   } else {
                     setNewUserForm(prev => ({...prev, plantIds: prev.plantIds.filter(id => id !== p.id)}));
                   }
                 } else {
                   setNewUserForm(prev => ({...prev, plantIds: [p.id]}));
                   setIsAddPlantDropdownOpen(false);
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
   <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">
     {addAllowsMultiMill
       ? 'Multiple mills allowed (Admin / Superadmin, or role permission "Add more than one mill").'
       : 'This role can be assigned to only one plant. Enable "Add more than one mill" under Permissions to allow more.'}
   </p>
 </div>

 {isAddSupervisorRole && (
   <div className={`rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-3 ${addUserFieldsDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
     <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
       <Fingerprint size={16} />
       Fingerprint Registration (2 required)
     </div>
     <p className="text-[11px] text-[var(--text-muted-alt)]">
       Supervisor must enroll two fingers (e.g. left thumb + right thumb).
     </p>
     <div className="grid grid-cols-2 gap-3">
       <div className="space-y-1.5">
         <div className="text-[11px] text-[var(--text-muted-alt)] uppercase tracking-wide">Finger 1</div>
         {newUserForm.fingerprint1 ? (
           <div className="flex items-center gap-2 text-green-400 text-xs font-bold bg-green-900/20 border border-green-500/30 rounded-lg px-3 py-2">
             <Check size={14} /> Captured
           </div>
         ) : (
           <button
             type="button"
             onClick={() => captureUserFingerprint(1)}
             disabled={addUserFieldsDisabled}
             className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
           >
             <Fingerprint size={14} /> Scan Finger 1
           </button>
         )}
       </div>
       <div className="space-y-1.5">
         <div className="text-[11px] text-[var(--text-muted-alt)] uppercase tracking-wide">Finger 2</div>
         {newUserForm.fingerprint2 ? (
           <div className="flex items-center gap-2 text-green-400 text-xs font-bold bg-green-900/20 border border-green-500/30 rounded-lg px-3 py-2">
             <Check size={14} /> Captured
           </div>
         ) : (
           <button
             type="button"
             onClick={() => captureUserFingerprint(2)}
             disabled={addUserFieldsDisabled}
             className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
           >
             <Fingerprint size={14} /> Scan Finger 2
           </button>
         )}
       </div>
     </div>
     {(newUserForm.fingerprint1 || newUserForm.fingerprint2) && (
       <button
         type="button"
         onClick={() =>
           setNewUserForm((p) => ({
             ...p,
             fingerprint1: '',
             fingerprint2: '',
             fingerprint1Template: '',
             fingerprint2Template: '',
           }))
         }
         disabled={addUserFieldsDisabled}
         className="text-[11px] text-[var(--text-muted-alt)] hover:text-red-400 underline disabled:opacity-50"
       >
         Clear fingerprints &amp; re-scan
       </button>
     )}
   </div>
 )}
 </form>
 </div>
 <div className="px-6 py-4 border-t border-[var(--border-subtle-alt)] bg-[var(--bg-panel)] flex justify-end gap-3 rounded-b-2xl shrink-0">
 <button onClick={() => { setIsAddUserModalOpen(false); setIsAddPlantDropdownOpen(false); resetNewUserForm(); }} className="px-4 py-2 text-sm font-medium text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
 <button form="realAddUserForm" type="submit" disabled={addUserLock.pending || usernameBlocksForm || checkingUsername} className="px-4 py-2 bg-[#e67e00] text-[var(--text-main)] hover:bg-[#cc7000] rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{addUserLock.pending ? 'Creating...' : 'Create User'}</button>
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
 <Combobox
 name="roleId"
 value={editUserForm.roleId}
 onChange={(e: any) => {
   const nextRoleId = e.target.value;
   const nextRole = roles.find((r) => r.id === nextRoleId);
   const multi = roleAllowsMultipleMills(nextRole);
   setEditUserForm((prev) => ({
     ...prev,
     roleId: nextRoleId,
     plantIds: multi ? prev.plantIds : prev.plantIds.slice(0, 1),
   }));
 }}
 options={roles}
 valueKey="id"
 placeholder="Select Role"
 required
 listMaxHeightClass="max-h-36"
 className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 transition-colors"
 />
 </div>
 <div>
   <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
     Primary Plant{editAllowsMultiMill ? ' (multiple)' : ' (one only)'}
   </label>
   <div className="relative" ref={editPlantDropdownRef}>
     <div 
       className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] cursor-pointer flex justify-between items-center focus:border-blue-500 hover:border-[var(--border-subtle-alt)] transition-colors"
       onClick={() => setIsEditPlantDropdownOpen(!isEditPlantDropdownOpen)}
     >
       <span className={editUserForm.plantIds.length === 0 ? "text-[var(--text-muted-alt)]" : "flex-1 overflow-x-auto whitespace-nowrap mr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"}>
        {editUserForm.plantIds.length === 0 
          ? (editAllowsMultiMill ? "Select mill(s)..." : "Select one mill...")
          : editUserForm.plantIds.map(id => plants.find(p => p.id === id)?.name).filter(Boolean).join(', ')}
      </span>
       <ChevronDown size={16} className={`text-[var(--text-muted-alt)] transition-transform ${isEditPlantDropdownOpen ? 'rotate-180' : ''}`} />
     </div>
     
     {isEditPlantDropdownOpen && (
       <div className="absolute z-[100] top-full mt-1 w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg shadow-lg max-h-[120px] overflow-y-auto">
         {plants.map(p => (
           <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-base)] cursor-pointer border-b border-[var(--border-subtle)] last:border-0">
             <input 
               type={editAllowsMultiMill ? 'checkbox' : 'radio'}
               name={editAllowsMultiMill ? undefined : 'editPrimaryPlant'}
               checked={editUserForm.plantIds.includes(p.id)}
               onChange={(e) => {
                 if (editAllowsMultiMill) {
                   if (e.target.checked) {
                     setEditUserForm(prev => ({...prev, plantIds: [...prev.plantIds, p.id]}));
                   } else {
                     setEditUserForm(prev => ({...prev, plantIds: prev.plantIds.filter(id => id !== p.id)}));
                   }
                 } else {
                   setEditUserForm(prev => ({...prev, plantIds: [p.id]}));
                   setIsEditPlantDropdownOpen(false);
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
   <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">
     {editAllowsMultiMill
       ? 'Multiple mills allowed (Admin / Superadmin, or "Add more than one mill" permission).'
       : 'This role can be assigned to only one plant.'}
   </p>
   </div>
 </div>
 </form>
 </div>
 <div className="px-6 py-4 border-t border-[var(--border-subtle-alt)] bg-[var(--bg-panel)] flex justify-end gap-3 rounded-b-2xl">
 <button onClick={() => setIsEditUserModalOpen(false)} className="px-4 py-2 text-sm font-medium text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
 <button form="realEditUserForm" type="submit" disabled={editUserLock.pending} className="px-4 py-2 bg-[#e67e00] text-[var(--text-main)] hover:bg-[#cc7000] rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">{editUserLock.pending ? 'Saving...' : 'Save Changes'}</button>
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
 <button onClick={() => { setIsAddRoleModalOpen(false); setRoleNameExists(false); setCheckingRoleName(false); roleNameCheckSeq.current += 1; setNewRoleForm({ name: '', description: '' }); }} className="text-[var(--text-muted-alt)] hover:text-[var(--text-main)] hover:bg-[var(--glass-bg)] p-1.5 rounded-lg transition-colors">
 <X size={20} />
 </button>
 </div>
 <div className="p-6 text-[var(--text-muted)]">
 <form id="addRoleForm" onSubmit={handleAddRole} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Role Name</label>
 <input
   type="text"
   required
   value={newRoleForm.name}
   onChange={e => setNewRoleForm({...newRoleForm, name: e.target.value.toUpperCase()})}
   className={`w-full bg-[var(--bg-panel)] border rounded-lg px-4 py-2 text-sm text-[var(--text-main)] focus:outline-none ${
     roleNameExists
       ? 'border-red-500 focus:border-red-500'
       : 'border-[var(--border-subtle)] focus:border-blue-500'
   }`}
   placeholder="e.g. DATA_ENTRY"
 />
 {roleNameExists ? (
   <p className="text-red-500 text-xs mt-1 font-medium">Role name already exists</p>
 ) : checkingRoleName && String(newRoleForm.name || '').trim().length >= 2 ? (
   <p className="text-[var(--text-muted-alt)] text-xs mt-1">Checking role name…</p>
 ) : null}
 </div>
 <div>
 <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Description</label>
 <textarea
   rows={3}
   value={newRoleForm.description}
   onChange={e => setNewRoleForm({...newRoleForm, description: e.target.value})}
   disabled={roleNameBlocksForm}
   className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
   placeholder="What does this role do?"
 />
 </div>
 </form>
 </div>
 <div className="px-6 py-4 border-t border-[var(--border-subtle-alt)] bg-[var(--bg-panel)] flex justify-end gap-3 rounded-b-2xl">
 <button onClick={() => { setIsAddRoleModalOpen(false); setRoleNameExists(false); setCheckingRoleName(false); roleNameCheckSeq.current += 1; setNewRoleForm({ name: '', description: '' }); }} className="px-4 py-2 text-sm font-medium text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
 <button form="addRoleForm" type="submit" disabled={addRoleLock.pending || roleNameBlocksForm || checkingRoleName} className="px-4 py-2 bg-[#e67e00] text-[var(--text-main)] hover:bg-[#cc7000] rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{addRoleLock.pending ? 'Creating...' : 'Create Role'}</button>
 </div>
 </div>
 </div>
 )}

 {/* Transfer User Modal */}
 {isTransferModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
 <div className="relative w-full max-w-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-visible">
 <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--border-subtle-alt)] bg-[var(--bg-panel)] rounded-t-2xl">
 <h2 className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
 <ArrowRightLeft size={18} /> Transfer User Across Mills
 </h2>
 <button onClick={() => setIsTransferModalOpen(false)} className="text-[var(--text-muted-alt)] hover:text-[var(--text-main)] hover:bg-[var(--glass-bg)] p-1.5 rounded-lg transition-colors">
 <X size={20} />
 </button>
 </div>
 <div className="p-6 max-h-[70vh] overflow-y-auto">
 <p className="text-xs text-[var(--text-muted-alt)] mb-4">
 Archiving <span className="text-[var(--text-main)] font-medium">{transferForm.sourceUsername}</span> ({transferForm.sourceRoleName}).
 Historical entries and prior fingerprints stay on the archived User ID. Destination mill gets a new User ID, password
 {/supervisor/i.test(transferForm.sourceRoleName) ? ', and two new fingerprints' : ''}.
 </p>
 <form id="transferUserForm" onSubmit={handleTransferUserSubmit} className="space-y-3">
 <div>
 <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Destination Mill *</label>
 <select
 required
 value={transferForm.plantId}
 onChange={(e) => setTransferForm((p) => ({ ...p, plantId: e.target.value }))}
 className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)]"
 >
 <option value="">Select mill...</option>
 {plants.map((p) => (
 <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">New User ID *</label>
 <input
 required
 value={transferForm.username}
 onChange={(e) => setTransferForm((p) => ({ ...p, username: e.target.value }))}
 className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)]"
 placeholder="New login username"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">New Password *</label>
 <div className="relative">
 <input
 required
 type={showTransferPassword ? 'text' : 'password'}
 value={transferForm.password}
 onChange={(e) => setTransferForm((p) => ({ ...p, password: e.target.value }))}
 className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 pr-10 text-sm text-[var(--text-main)]"
 />
 <button type="button" onClick={() => setShowTransferPassword(!showTransferPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted-alt)]">
 {showTransferPassword ? <EyeOff size={16} /> : <Eye size={16} />}
 </button>
 </div>
 </div>
 <div>
 <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Email (optional)</label>
 <input
 type="email"
 value={transferForm.email}
 onChange={(e) => setTransferForm((p) => ({ ...p, email: e.target.value }))}
 className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)]"
 />
 </div>
 {/supervisor/i.test(transferForm.sourceRoleName) && (
 <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
 <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
 <Fingerprint size={16} /> Re-register fingerprints (2)
 </div>
 <div className="grid grid-cols-2 gap-2">
 <button type="button" onClick={() => captureTransferFingerprint(1)} className={`text-xs font-bold rounded-lg px-3 py-2 border ${transferForm.fingerprint1 ? 'text-green-400 border-green-500/30 bg-green-900/20' : 'text-[var(--text-muted-alt)] border-[var(--border-subtle)]'}`}>
 {transferForm.fingerprint1 ? 'Finger 1 ✓' : 'Scan Finger 1'}
 </button>
 <button type="button" onClick={() => captureTransferFingerprint(2)} className={`text-xs font-bold rounded-lg px-3 py-2 border ${transferForm.fingerprint2 ? 'text-green-400 border-green-500/30 bg-green-900/20' : 'text-[var(--text-muted-alt)] border-[var(--border-subtle)]'}`}>
 {transferForm.fingerprint2 ? 'Finger 2 ✓' : 'Scan Finger 2'}
 </button>
 </div>
 </div>
 )}
 </form>
 </div>
 <div className="px-6 py-4 border-t border-[var(--border-subtle-alt)] bg-[var(--bg-panel)] flex justify-end gap-3 rounded-b-2xl">
 <button onClick={() => setIsTransferModalOpen(false)} className="px-4 py-2 text-sm font-medium text-[var(--text-muted-alt)] hover:text-[var(--text-main)]">Cancel</button>
 <button form="transferUserForm" type="submit" disabled={transferUserLock.pending} className="px-4 py-2 bg-[#e67e00] text-[var(--text-main)] rounded-lg text-sm font-medium disabled:opacity-50">
 {transferUserLock.pending ? 'Transferring...' : 'Transfer'}
 </button>
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

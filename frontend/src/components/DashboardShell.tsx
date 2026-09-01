import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { usePlantStore } from '../store/plantStore';
import api from '../api/axios';
import { Sun, Moon, AlertTriangle } from 'lucide-react';

export const DashboardShell: React.FC = () => {
 const { user, logout } = useAuthStore();
 const { sidebarCollapsed, toggleSidebar } = useUiStore();
 const { activePlant, setActivePlant, clearActivePlant } = usePlantStore();
 const navigate = useNavigate();
 const location = useLocation();
 const [plants, setPlants] = useState<any[]>([]);
 const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
 const [showNotifications, setShowNotifications] = useState(false);
 const [unrecoveredShortagesCount, setUnrecoveredShortagesCount] = useState(0);
 
 // Theme state
 const [isDarkMode, setIsDarkMode] = useState(() => {
 return localStorage.getItem('theme') !== 'light';
 });

 useEffect(() => {
 if (isDarkMode) {
 document.documentElement.classList.remove('light-mode');
 localStorage.setItem('theme', 'dark');
 } else {
 document.documentElement.classList.add('light-mode');
 localStorage.setItem('theme', 'light');
 }
 }, [isDarkMode]);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      const fetchPlants = async () => {
        try {
          const res = await api.get('/plants');
          setPlants(res.data);
        } catch (err) {
          console.error('Failed to fetch plants', err);
        }
      };
      fetchPlants();
    }
    
    // Automatically re-fetch user's role permissions on mount to ensure fresh state
    if (user?.role !== 'SUPER_ADMIN' && user?.role) {
      const refreshPermissions = async () => {
        try {
          const res = await api.get(`/auth/me`);
          if (res.data && res.data.role && res.data.role.modulePermissions) {
            useAuthStore.getState().setAuth({
              ...user,
              permissions: res.data.role.modulePermissions
            }, useAuthStore.getState().accessToken!);
          }
        } catch (err) {
          console.error('Failed to refresh permissions', err);
        }
      };
      refreshPermissions();
    }
  }, [user?.role]);

  // Fetch unrecovered shortages for Supervisor Notification Flag
  useEffect(() => {
    if (user?.role && user.role.includes('SUPERVISOR') && activePlant) {
      const fetchShortages = async () => {
        try {
          const res = await api.get(`/api/procurement/reports/shortage-summary?plantId=${activePlant.id}`);
          const unrecovered = res.data.filter((r: any) => r.netShortageQtl > 0);
          setUnrecoveredShortagesCount(unrecovered.length);
        } catch (error) {
          console.error("Failed to fetch shortage summary", error);
        }
      };
      fetchShortages();
    }
  }, [user?.role, activePlant]);

 const handleLogout = () => {
 logout();
 navigate('/login');
 };

 const navItems: any[] = [
 { label: 'Dashboard', href: '/dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', roles: ['SUPER_ADMIN', 'PLANT_MANAGER', 'WEIGHBRIDGE_OPERATOR', 'ACCOUNTANT'] },
 { label: 'Procurement', href: '/procurement', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', roles: ['SUPER_ADMIN', 'PLANT_MANAGER', 'ACCOUNTANT'], subItems: [
      { label: 'Supplier Master', tab: 'supplier_master' },
      { label: 'Mandi Master', tab: 'mandi_master' },
      { label: 'Paddy Purchase & Quality', tab: 'paddy_purchase' },
      { label: 'Paddy Inward', tab: 'paddy_inward' },
      { label: 'Inward List', tab: 'inward_register' },
      { label: 'Global Settings (Govt Rate)', tab: 'global_settings' },
      { label: 'Reports', tab: 'reports' }
    ]},
 { label: 'Production', href: '/production', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', roles: ['SUPER_ADMIN', 'PLANT_MANAGER'], subItems: [
 { label: 'Batch Creation', tab: 'batch_creation' },
 { label: 'Production Tracking', tab: 'production_tracking' },
 { label: 'Daily Stock Report', tab: 'daily_stock_report' },
 { label: 'Shift-Wise Report', tab: 'shift_wise_report' },
 { label: 'Intermill History', tab: 'intermill_history' }
 ]},
 { label: 'Yield Mgmt', href: '/yield', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', roles: ['SUPER_ADMIN', 'PLANT_MANAGER'], subItems: [
 { label: 'Yield Calculator', tab: 'yield_calculator' },
 { label: 'Yield Analytics', tab: 'yield_analytics' },
 { label: 'Historical Reports', tab: 'historical_reports' }
 ]},
 { label: 'Inventory', href: '/inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', roles: ['SUPER_ADMIN', 'PLANT_MANAGER', 'ACCOUNTANT'], subItems: [
 { label: 'Paddy Stock', tab: 'PADDY' },
 { label: 'Rice Stock', tab: 'RICE' },
 { label: 'Bran Stock', tab: 'BRAN' },
 { label: 'Husk Stock', tab: 'HUSK' },
 { label: 'Finished Goods', tab: 'FINISHED_GOODS' },
 { label: 'Consumables Inventory', tab: 'CONSUMABLES' }
 ]},
 { label: 'Transfer', href: '/transfer', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', roles: ['SUPER_ADMIN', 'PLANT_MANAGER'], subItems: [
 { label: 'Transfer Request', tab: 'transfer_request' },
 { label: 'Transfer Tracking', tab: 'transfer_tracking' },
 { label: 'In Transit Stock', tab: 'in_transit_stock' }
 ]},
 { label: 'Weighbridge', href: '/weighbridge', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3', roles: ['SUPER_ADMIN', 'PLANT_MANAGER', 'WEIGHBRIDGE_OPERATOR'], subItems: [
 { label: 'Capture', tab: 'capture' },
 { label: 'History', tab: 'history' },
 { label: 'Settings', tab: 'settings' }
 ]},
 { label: 'Gate Pass', href: '/gate-pass', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z', roles: ['SUPER_ADMIN', 'PLANT_MANAGER', 'WEIGHBRIDGE_OPERATOR'], subItems: [
 { label: 'Create Gate Pass', tab: 'create_pass' },
 { label: 'Report Summary', tab: 'report_summary' },
 { label: 'QR Barcode', tab: 'qr_barcode' },
 { label: 'Duplicate Prevention', tab: 'duplicate_prevention' }
 ]},
//   { label: 'Dispatch', href: '/dispatch', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', roles: ['SUPER_ADMIN', 'PLANT_MANAGER', 'ACCOUNTANT'], subItems: [
//     { label: 'Dispatch Mgmt', tab: 'dispatch_mgmt' },
//     { label: 'Vehicle Allocation', tab: 'vehicle_allocation' },
//     { label: 'Weight Verification', tab: 'weight_verification' },
//     { label: 'Inventory Deduction', tab: 'inventory_deduction' },
//     { label: 'Finance Mgmt', tab: 'finance_management' },
//     { label: 'Utility Mgmt', tab: 'utility_management' }
//   ]},
//   { label: 'Finance', href: '/finance', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', roles: ['SUPER_ADMIN', 'PLANT_MANAGER', 'ACCOUNTANT'], subItems: [
//     { label: 'Purchase Ledger', tab: 'purchase' },
//     { label: 'Sales / Dispatch Ledger', tab: 'sales' },
//     { label: 'Expense Management', tab: 'expense' },
//     { label: 'Cash Book', tab: 'cashbook' },
//     { label: 'Dispatch Outstanding', tab: 'outstanding' }
//   ]},
//   { label: 'Power', href: '/power', icon: 'M13 10V3L4 14h7v7l9-11h-7z', roles: ['SUPER_ADMIN', 'PLANT_MANAGER'], subItems: [
//     { label: 'Power Overview', tab: 'overview' },
//     { label: 'Generator Management', tab: 'generator' },
//     { label: 'Load Management', tab: 'load' },
//     { label: 'Consumption Analytics', tab: 'analytics' },
//     { label: 'Power Alerts', tab: 'alerts' },
//     { label: 'Power Settings', tab: 'settings' }
//   ]},
  { label: 'Staff Management', href: '/staff', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', roles: ['SUPER_ADMIN', 'PLANT_MANAGER', 'GATE_OPERATOR'], subItems: [
    { label: 'Staff List', tab: 'list' },
    { label: 'Add Staff', tab: 'add' },
    { label: 'Truck Management', tab: 'truck' }
  ] },
  { label: 'Dryer Work', href: '/dryer', icon: 'M13 10V3L4 14h7v7l9-11h-7z', roles: ['SUPER_ADMIN', 'PLANT_MANAGER'], subItems: [
    { label: 'GOYAL AGRO', tab: 'goyal_agro' },
    { label: 'RAJOA AGRO', tab: 'rajoa_agro' },
    { label: 'BEAS AGRO', tab: 'beas_agro' }
  ]},
//   { label: 'Backup & Restore', href: '/backup', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4', roles: ['SUPER_ADMIN'], subItems: [
//     { label: 'Backup Overview', tab: 'overview' },
//     { label: 'Restore Data', tab: 'restore' },
//     { label: 'Scheduled Backups', tab: 'scheduled' },
//     { label: 'Backup Settings', tab: 'settings' },
//     { label: 'Storage Management', tab: 'storage' },
//     { label: 'Backup History', tab: 'history' }
//   ]},
 { label: 'Users and Roles', href: '/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', roles: ['SUPER_ADMIN', 'PLANT_MANAGER'], subItems: [
 { label: 'Users', tab: 'Users' },
 { label: 'Roles', tab: 'Roles' },
 { label: 'Permissions', tab: 'Permissions' },
 { label: 'Audit Access', tab: 'Audit Access' }
 ]},
 { label: 'Products', href: '/products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', roles: ['SUPER_ADMIN', 'PLANT_MANAGER'] },
 { label: 'Plants', href: '/plants', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', roles: ['SUPER_ADMIN'] },
 ];

  // Initialize expanded items based on current location
  useEffect(() => {
    const currentNav = navItems.find(n => location.pathname.startsWith(n.href));
    if (currentNav && (currentNav.subItems || currentNav.subGroups)) {
      setExpandedItems(prev => ({ ...prev, [currentNav.label]: true }));
    }
  }, [location.pathname]);

 const toggleExpand = (label: string) => {
 setExpandedItems(prev => ({ ...prev, [label]: !prev[label] }));
 };

 const searchParams = new URLSearchParams(location.search);
 const currentTab = searchParams.get('tab');

  const hasPermission = (itemLabel: string, itemRoles: string[]) => {
    if (user?.role === 'SUPER_ADMIN') return true;
    
    const labelToModule: Record<string, string> = {
      'Users and Roles': 'User Management',
      'Transfer': 'Inventory',
      'Plants': 'Settings',
    };
    
    const moduleName = labelToModule[itemLabel] || itemLabel;
    
    if (user?.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
      // Handle array of strings case
      if (typeof user.permissions[0] === 'string') {
        return user.permissions.some(p => p.toLowerCase() === moduleName.toLowerCase());
      }
      
      const perm = user.permissions.find((p: any) => {
        const pModName = p.moduleName || p.name || '';
        return pModName.toLowerCase() === moduleName.toLowerCase();
      });
      
      if (perm) {
        const allowed = perm.canView === true || perm.view === true || (perm.permissions && perm.permissions.view === true) || String(perm.canView) === 'true' || String(perm.view) === 'true';
        return allowed;
      }
    }
    
    const fallback = itemRoles.includes(user?.role || '');
    return fallback;
  };

  const hasSubPermission = (parentModuleLabel: string, subModuleLabel: string) => {
    if (subModuleLabel === 'Yield Calculator') return false;
    if (subModuleLabel === 'Global Settings (Govt Rate)' && user?.role !== 'SUPER_ADMIN') return false;
    if (subModuleLabel === 'Reports') return true;
    if (user?.role === 'SUPER_ADMIN') return true;
    const labelToModule: Record<string, string> = {
      'Users and Roles': 'User Management',
      'Transfer': 'Inventory',
      'Plants': 'Settings',
    };
    const parentName = labelToModule[parentModuleLabel] || parentModuleLabel;
    
    if (user?.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
      if (typeof user.permissions[0] === 'string') return true;
      
      const perm = user.permissions.find((p: any) => {
        const pModName = p.moduleName || p.name || '';
        const pSubModName = p.subModuleName || '';
        return pModName.toLowerCase() === parentName.toLowerCase() && pSubModName.toLowerCase() === subModuleLabel.toLowerCase();
      });
      
      if (perm) {
        return perm.canView === true || perm.view === true || (perm.permissions && perm.permissions.view === true) || String(perm.canView) === 'true' || String(perm.view) === 'true';
      }
      
      const hasAnySubmodulesForParent = user.permissions.some((p: any) => 
        (p.moduleName || p.name || '').toLowerCase() === parentName.toLowerCase() && p.subModuleName
      );
      if (hasAnySubmodulesForParent) return false;
    }
    
    return true;
  };

  const currentNavItem = navItems.find(item => location.pathname.startsWith(item.href));

 return (
 <div className="flex h-screen bg-[var(--bg-base)] text-[var(--text-muted)] font-sans">
 {/* Sidebar */}
 <aside className={`bg-[var(--bg-base)] border-r border-[var(--border-subtle)] transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} flex flex-col`}>
 <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border-subtle)]">
 <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity">
 <img src="/logo.png" alt="RMS" className="w-8 h-8 rounded-full border border-amber-500/30 flex-shrink-0" />
 {!sidebarCollapsed && <span className="font-bold text-amber-500 tracking-wider">RMS ADMIN</span>}
 </Link>
 <button onClick={toggleSidebar} className="text-[var(--text-muted-alt)] hover:text-[var(--text-main)]">
 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarCollapsed ? "M4 6h16M4 12h16M4 18h16" : "M4 6h16M4 12h8m-8 6h16"} />
 </svg>
 </button>
 </div>

 <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
 {navItems.filter(item => {
    const parentAllowed = hasPermission(item.label, item.roles);
    if (!parentAllowed) return false;
    if (item.subItems) {
      const allowedSubs = item.subItems.filter((sub: any) => hasSubPermission(item.label, sub.label));
      if (allowedSubs.length === 0) return false;
    }
    if (item.subGroups) {
      let hasAnySub = false;
      item.subGroups.forEach((sg: any) => {
        if (sg.items.filter((sub: any) => hasSubPermission(item.label, sub.label)).length > 0) hasAnySub = true;
      });
      if (!hasAnySub) return false;
    }
    return true;
  }).map((item, index) => {
 const isActive = location.pathname.startsWith(item.href);
 const isExpanded = expandedItems[item.label] || false;
 
 return (
 <div key={index} className="flex flex-col">
 {item.subItems || item.subGroups ? (
 <button 
 onClick={() => {
 toggleExpand(item.label);
 if (sidebarCollapsed) toggleSidebar(); 
 if (!isActive) {
    if (item.subItems) {
      const allowedSubs = item.subItems.filter((sub: any) => hasSubPermission(item.label, sub.label));
      if (allowedSubs.length > 0) navigate(`${item.href}?tab=${allowedSubs[0].tab}`);
    } else if (item.subGroups) {
      const firstGroup = item.subGroups.find((sg: any) => sg.items.some((sub: any) => hasSubPermission(item.label, sub.label)));
      if (firstGroup) {
        const allowedSubs = firstGroup.items.filter((sub: any) => hasSubPermission(item.label, sub.label));
        if (allowedSubs.length > 0) navigate(`${item.href}?tab=${allowedSubs[0].tab}`);
      }
    }
  }
 }}
 className={`flex items-center justify-between gap-3 px-3 py-3 rounded-lg transition-colors group ${isActive ? 'bg-amber-500/10 text-amber-500' : 'text-[var(--text-muted-alt)] hover:bg-amber-500/10 hover:text-amber-500'}`}
 >
 <div className="flex items-center gap-3">
 <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
 </svg>
 {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
 </div>
 </button>
 ) : (
 <Link to={item.href} className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group ${isActive ? 'bg-amber-500/10 text-amber-500' : 'text-[var(--text-muted-alt)] hover:bg-amber-500/10 hover:text-amber-500'}`}>
 <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
 </svg>
 {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
 </Link>
 )}
 
 {/* Sub Items (Flat) */}
 {!sidebarCollapsed && item.subItems && isExpanded && (
 <div className="ml-10 mt-1 space-y-1 flex flex-col border-l-2 border-[var(--border-subtle-alt)] pl-2">
 {item.subItems.filter((sub: any) => hasSubPermission(item.label, sub.label)).map((sub: any, subIdx: any) => {
 const isSubActive = isActive && (currentTab === sub.tab || (!currentTab && subIdx === 0));
 return (
 <Link 
 key={subIdx} 
 to={`${item.href}?tab=${sub.tab}`}
 className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${isSubActive ? 'text-amber-500 bg-amber-500/5' : 'text-[var(--text-muted-alt)] hover:text-amber-400 hover:bg-[var(--glass-bg)]'}`}
 >
 {sub.label}
 </Link>
 );
 })}
 </div>
 )}

  {/* Sub Groups (Nested) */}
  {!sidebarCollapsed && item.subGroups && isExpanded && (
    <div className="ml-10 mt-2 space-y-3 flex flex-col border-l-2 border-[var(--border-subtle-alt)] pl-2">
      {item.subGroups.map((group: any, groupIdx: any) => {
        const allowedItems = group.items.filter((sub: any) => hasSubPermission(item.label, sub.label));
        if (allowedItems.length === 0) return null;
        return (
          <div key={groupIdx} className="flex flex-col space-y-1">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-3 mb-1">
              {group.groupLabel}
            </span>
            {allowedItems.map((sub: any, subIdx: any) => {
              const isSubActive = isActive && (currentTab === sub.tab || (!currentTab && groupIdx === 0 && subIdx === 0));
              return (
                <Link 
                  key={subIdx} 
                  to={`${item.href}?tab=${sub.tab}`}
                  className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${isSubActive ? 'text-amber-500 bg-amber-500/5' : 'text-[var(--text-muted-alt)] hover:text-amber-400 hover:bg-[var(--glass-bg)]'}`}
                >
                  {sub.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  )}
 </div>
 );
 })}
 </nav>

 <div className="p-4 border-t border-[var(--border-subtle)]">
 <div className="flex items-center gap-3 mb-4 overflow-hidden whitespace-nowrap">
 <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 flex items-center justify-center text-black font-bold flex-shrink-0">
 {user?.username.charAt(0).toUpperCase()}
 </div>
 {!sidebarCollapsed && (
 <div>
 <p className="font-semibold text-[var(--text-main)] text-sm">{user?.username}</p>
 <p className="text-xs text-amber-500">{user?.role.replace('_', ' ')}</p>
 </div>
 )}
 </div>
          <button onClick={handleLogout} className={`flex items-center gap-2 text-[var(--text-muted-alt)] hover:text-red-400 transition-colors ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
 </aside>

 {/* Main Content */}
 <main className="flex-1 flex flex-col min-w-0">
 <header className="h-12 bg-[var(--bg-base)]/80 backdrop-blur border-b border-[var(--border-subtle)] flex items-center justify-between px-6 gap-4">
 <div className="flex-1 min-w-0">
 {user?.role === 'SUPER_ADMIN' ? (
 <div className="flex items-center gap-3 min-w-0">
 <h2 className="font-semibold text-sm text-[var(--text-muted-alt)] uppercase tracking-wider flex-shrink-0">Context:</h2>
 <select
   className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-main)] focus:outline-none focus:border-[#e67e00] cursor-pointer"
   value={usePlantStore.getState().contextMode === 'compare' ? 'compare' : (activePlant?.id || 'consolidated')}
   onChange={(e) => {
     const val = e.target.value;
     if (val === 'consolidated') {
       usePlantStore.getState().clearActivePlant();
     } else if (val === 'compare') {
       usePlantStore.getState().setContextMode('compare');
     } else {
       const selectedPlant = plants.find(p => p.id === val);
       if (selectedPlant) usePlantStore.getState().setActivePlant(selectedPlant);
     }
   }}
 >
   <option value="consolidated">Consolidated (Default)</option>
   <option value="compare">Mill Name Compare</option>
   <optgroup label="Mill Names">
     {plants.map(p => (
       <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
     ))}
   </optgroup>
 </select>
 </div>
 ) : (
 user?.plantAccess && user.plantAccess.length > 1 ? (
 <div className="flex items-center gap-3">
 <h2 className="font-semibold text-lg text-[var(--text-muted-alt)]">Context:</h2>
 <select 
 className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-main)] focus:outline-none focus:border-amber-500 cursor-pointer"
 value={activePlant?.id || ''}
 onChange={(e) => {
 const selectedAccess = user.plantAccess?.find((pa: any) => pa.plant.id === e.target.value);
 if (selectedAccess) setActivePlant(selectedAccess.plant);
 }}
 >
 {user.plantAccess?.map((pa: any) => (
 <option key={pa.plant.id} value={pa.plant.id}>{pa.plant.name} ({pa.plant.code})</option>
 ))}
 </select>
 </div>
 ) : (
 <h2 className="font-semibold text-lg text-[var(--text-muted-alt)]">
 {activePlant ? `Context: ${activePlant.name} (${activePlant.code})` : 'Global Overview'}
 </h2>
 )
 )}
 </div>
 <div className="flex items-center gap-4">
 <button 
 onClick={() => setIsDarkMode(!isDarkMode)}
 className="relative p-2 text-[var(--text-muted-alt)] hover:text-amber-500 transition-colors bg-[var(--bg-panel-hover)] rounded-full border border-[var(--border-subtle)]"
 title="Toggle Theme"
 >
 {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-blue-500" />}
 </button>
 <div className="relative">
   <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)]">
   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
   {unrecoveredShortagesCount > 0 && (
     <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--bg-base)]"></span>
   )}
   </button>
   {showNotifications && (
     <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-2xl overflow-hidden z-50">
       <div className="p-3 border-b border-[var(--border-subtle)] font-bold text-[var(--text-main)]">Notifications</div>
       <div className="max-h-64 overflow-y-auto">
         {unrecoveredShortagesCount > 0 ? (
           <div className="p-4 border-b border-[var(--border-subtle)] bg-red-500/5 hover:bg-red-500/10 cursor-pointer" onClick={() => { setShowNotifications(false); navigate('/procurement?tab=reports'); }}>
             <div className="flex items-start gap-3">
               <div className="mt-0.5 text-red-500"><AlertTriangle size={18} /></div>
               <div>
                 <h4 className="text-sm font-bold text-red-500">Unrecovered Shortages Detected</h4>
                 <p className="text-xs text-[var(--text-muted)] mt-1">You have {unrecoveredShortagesCount} auto-fetched shortage(s) waiting for recovery punch.</p>
                 <span className="text-[10px] text-red-400 font-semibold mt-2 inline-block uppercase tracking-wider">Click to Resolve</span>
               </div>
             </div>
           </div>
         ) : (
           <div className="p-6 text-center text-sm text-[var(--text-muted-alt)]">No new notifications.</div>
         )}
       </div>
     </div>
   )}
 </div>
 </div>
 </header>
 
 <div className="flex-1 p-4 overflow-y-auto">
 {currentNavItem && !hasPermission(currentNavItem.label, currentNavItem.roles) ? (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
      <div className="text-red-500 mb-4">
        <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Access Denied</h2>
      <p className="text-[var(--text-muted-alt)]">You do not have permission to view the {currentNavItem.label} module.</p>
    </div>
 ) : (
    <Outlet />
 )}
 </div>
 </main>
 </div>
 );
};

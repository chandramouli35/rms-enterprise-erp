import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TruckManagement from './TruckManagement';
import { StaffList } from '../components/Staff/StaffList';
import { AddStaff } from '../components/Staff/AddStaff';

export const StaffManagement = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'list';

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] text-[var(--text-main)]">
      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto">
          {activeTab === 'list' && <StaffList />}
          {activeTab === 'add' && <AddStaff />}
          {activeTab === 'truck' && <TruckManagement />}
        </div>
      </div>
    </div>
  );
};

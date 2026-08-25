import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TruckManagement from './TruckManagement';
import LabourManagement from './LabourManagement';
import PahunchManagement from './PahunchManagement';
import DriverManagement from './DriverManagement';

const TABS = [
  { id: 'pahunch', label: 'Pahunch Management' },
  { id: 'labour', label: 'Labour Management' },
  { id: 'truck', label: 'Truck Management' }
];

export const StaffManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'pahunch';

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] text-[var(--text-main)]">
      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto">
          {activeTab === 'pahunch' && <PahunchManagement />}
          {activeTab === 'labour' && <LabourManagement />}
          {activeTab === 'truck' && <TruckManagement />}
          {activeTab === 'driver' && <DriverManagement />}
        </div>
      </div>
    </div>
  );
};

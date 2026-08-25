import React from 'react';
import { Settings } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { usePlantStore } from '../store/plantStore';
import { useLocation } from 'react-router-dom';

import GoyalAgroForm from './GoyalAgroForm';
import RajoaAgroForm from './RajoaAgroForm';
import BeasAgroForm from './BeasAgroForm';

export default function DryerWork() {
  const user = useAuthStore(state => state.user);
  const activePlant = usePlantStore(state => state.activePlant);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'goyal_agro';

  const TABS = [
    { id: 'goyal_agro', label: 'GOYAL AGRO' },
    { id: 'rajoa_agro', label: 'RAJOA AGRO' },
    { id: 'beas_agro', label: 'BEAS AGRO' }
  ];

  if (!activePlant && user?.role !== 'SUPER_ADMIN') {
    return <div className="p-8 text-center text-[var(--text-muted)]">Please select a plant first.</div>;
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-main)]">
      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Settings className="text-[#e67e00]" /> {TABS.find(t => t.id === activeTab)?.label}
          </h2>
          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] p-6">
            {activeTab === 'goyal_agro' ? (
              <GoyalAgroForm />
            ) : activeTab === 'rajoa_agro' ? (
              <RajoaAgroForm />
            ) : activeTab === 'beas_agro' ? (
              <BeasAgroForm />
            ) : (
              <p className="text-[var(--text-muted)]">Fields for {TABS.find(t => t.id === activeTab)?.label} will go here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

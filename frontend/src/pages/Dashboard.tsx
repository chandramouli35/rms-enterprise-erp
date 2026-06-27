import React, { useEffect, useState } from 'react';
import { usePlantStore } from '../store/plantStore';
import api from '../api/axios';

export const Dashboard: React.FC = () => {
  const activePlant = usePlantStore(state => state.activePlant);
  const [summary, setSummary] = useState({
    activeUsers: 0,
    procurementMT: 0,
    inventoryMT: 0,
    gatePasses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!activePlant) return;
      try {
        setLoading(true);
        // x-plant-id is automatically injected by the axios interceptor
        const res = await api.get('/dashboard/summary');
        setSummary(res.data);
      } catch (err) {
        console.error('Failed to fetch dashboard summary', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSummary();
  }, [activePlant]); // Refetch when the active plant changes

  if (!activePlant) {
    return <div className="p-8 text-center text-gray-500">Please select a plant to view the dashboard.</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-amber-500">Overview: {activePlant.name}</h1>
      
      {loading ? (
        <div className="text-gray-400">Loading metrics...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="glass-panel p-6 rounded-xl">
              <h3 className="text-gray-400 font-medium mb-2">Paddy Inventory</h3>
              <p className="text-3xl font-bold">{summary.inventoryMT.toLocaleString()} <span className="text-sm text-gray-500 font-normal">MT</span></p>
           </div>
           <div className="glass-panel p-6 rounded-xl">
              <h3 className="text-gray-400 font-medium mb-2">Procured Today</h3>
              <p className="text-3xl font-bold">{summary.procurementMT.toLocaleString()} <span className="text-sm text-gray-500 font-normal">MT</span></p>
           </div>
           <div className="glass-panel p-6 rounded-xl">
              <h3 className="text-gray-400 font-medium mb-2">Gate Passes</h3>
              <p className="text-3xl font-bold text-amber-500">{summary.gatePasses}</p>
           </div>
           <div className="glass-panel p-6 rounded-xl">
              <h3 className="text-gray-400 font-medium mb-2">Active Users</h3>
              <p className="text-3xl font-bold text-blue-400">{summary.activeUsers}</p>
           </div>
        </div>
      )}
    </div>
  );
};

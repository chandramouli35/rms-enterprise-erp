import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axios';
import { usePlantStore } from '../store/plantStore';
import { toast } from 'react-hot-toast';

export const PurchaseRegister: React.FC = () => {
  const activePlantId = usePlantStore(state => state.activePlant?.id);
  const [gatePasses, setGatePasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!activePlantId) return;
    try {
      setLoading(true);
      // Let's just fetch gate-passes. In a real app we'd have a specific report endpoint
      // but gate-passes with includes is good enough for now.
      const { data } = await axiosInstance.get('/gate-passes');
      // For the report, we want to fetch details. We should ideally hit an endpoint.
      // But we can just use the gate passes list. To get weights, we need to extend the backend endpoint.
      // Assuming backend `/gate-passes` returns everything or we can use it.
      setGatePasses(data);
    } catch (err: any) {
      toast.error('Failed to load purchase register');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activePlantId]);

  const handleExport = () => {
    // Basic CSV generation
    const headers = ['Gate Pass ID', 'Vehicle Number', 'Supplier Name', 'Status', 'Date'];
    const rows = gatePasses.map(gp => [
      gp.passNumber,
      gp.vehicleNumber,
      gp.supplier?.name || gp.source,
      gp.status,
      new Date(gp.createdAt).toLocaleString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "purchase_register.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-100">Purchase Register</h2>
        <button
          onClick={handleExport}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          <span>Export CSV</span>
        </button>
      </div>

      <div className="glass-panel overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="p-4 font-semibold text-gray-300">Gate Pass ID</th>
                <th className="p-4 font-semibold text-gray-300">Vehicle</th>
                <th className="p-4 font-semibold text-gray-300">Supplier</th>
                <th className="p-4 font-semibold text-gray-300">Status</th>
                <th className="p-4 font-semibold text-gray-300">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
              ) : gatePasses.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-400">No records found</td></tr>
              ) : (
                gatePasses.map((gp) => (
                  <tr key={gp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono text-amber-500">{gp.passNumber}</td>
                    <td className="p-4 font-medium text-white">{gp.vehicleNumber}</td>
                    <td className="p-4">{gp.supplier?.name || gp.source}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-white/10 border border-white/20 text-gray-300">
                        {gp.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-400">{new Date(gp.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axios';
import { usePlantStore } from '../store/plantStore';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import { Pagination } from '../components/Pagination';

export const PurchaseRegister: React.FC = () => {
  const activePlantId = usePlantStore(state => state.activePlant?.id);
  const user = useAuthStore(state => state.user);
  const [gatePasses, setGatePasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [plants, setPlants] = useState<any[]>([]);
  const [filterPlantId, setFilterPlantId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    if (activePlantId && !filterPlantId) setFilterPlantId(activePlantId);
  }, [activePlantId]);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      // In a real app we might paginate plants too, but for the dropdown we need a bulk list
      axiosInstance.get('/plants', { params: { limit: 1000 } }).then(res => setPlants(res.data.data || res.data || [])).catch(() => {});
    }
  }, [user]);

  const loadData = async () => {
    const targetPlantId = filterPlantId || activePlantId;
    if (!targetPlantId) return;
    try {
      setLoading(true);
      // Let's just fetch gate-passes. In a real app we'd have a specific report endpoint
      // but gate-passes with includes is good enough for now.
      const { data } = await axiosInstance.get('/gate-passes', {
        headers: { 'x-plant-id': targetPlantId },
        params: { page, limit, search: searchTerm }
      });
      setGatePasses(data.data || []);
      setTotalRecords(data.meta?.total || 0);
      setTotalPages(data.meta?.totalPages || 0);
    } catch (err: any) {
      toast.error('Failed to load purchase register');
      setGatePasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (filterPlantId || activePlantId) {
        loadData();
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [filterPlantId, activePlantId, page, limit, searchTerm]);

  const handleExport = async () => {
    const targetPlantId = filterPlantId || activePlantId;
    if (!targetPlantId) return;
    
    try {
      const toastId = toast.loading('Generating Export...');
      const { data } = await axiosInstance.get('/gate-passes', {
        headers: { 'x-plant-id': targetPlantId },
        params: { limit: 10000, search: searchTerm } // Fetch a large chunk for export
      });
      const exportData = data.data || [];
      
      const headers = ['Gate Pass ID', 'Vehicle Number', 'Supplier Name', 'Status', 'Date'];
      const rows = exportData.map((gp: any) => [
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
    toast.success('Export downloaded successfully', { id: toastId });
    } catch (err) {
      toast.error('Failed to generate export');
    }
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

      <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input
            type="text"
            placeholder="Search Pass ID, Vehicle, or Supplier..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-amber-500"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>
        {user?.role === 'SUPER_ADMIN' && (
          <div className="w-full sm:w-64">
            <select
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
              value={filterPlantId}
              onChange={(e) => setFilterPlantId(e.target.value)}
            >
              {plants.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
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
                <tr><td colSpan={5} className="p-4 text-center text-gray-400">No matching records found</td></tr>
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
        
        <Pagination 
          currentPage={page}
          totalPages={totalPages}
          totalRecords={totalRecords}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
        />
      </div>
    </div>
  );
};

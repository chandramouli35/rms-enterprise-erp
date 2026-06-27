import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axios';
import { usePlantStore } from '../store/plantStore';
import { toast } from 'react-hot-toast';

export const GatePassesList: React.FC = () => {
  const activePlantId = usePlantStore(state => state.activePlant?.id);
  const [gatePasses, setGatePasses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    driverName: '',
    driverLicense: '',
    source: 'FARMER',
    supplierId: '',
    estimatedBags: ''
  });

  const loadData = async () => {
    if (!activePlantId) return;
    try {
      setLoading(true);
      const [gpRes, supRes] = await Promise.all([
        axiosInstance.get('/gate-passes'),
        axiosInstance.get('/suppliers')
      ]);
      setGatePasses(gpRes.data);
      setSuppliers(supRes.data);
    } catch (err: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activePlantId]);

  // Honeywell Scanner Listener
  useEffect(() => {
    let buffer = '';
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Enter') {
        if (buffer.length > 5) {
          handleScan(buffer);
        }
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timeout);
        timeout = setTimeout(() => { buffer = ''; }, 100); // 100ms timeout for rapid scan
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePlantId]);

  const handleScan = async (barcode: string) => {
    setScannedBarcode(barcode);
    try {
      const { data } = await axiosInstance.get(`/gate-passes/scan/${barcode}`);
      toast.success(`Scanned: ${data.vehicleNumber} (${data.status})`);
      // Could open a modal here with the gate pass details
    } catch (err) {
      toast.error(`Barcode not found: ${barcode}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/gate-passes', formData);
      toast.success('Gate Pass generated');
      setShowModal(false);
      setFormData({ vehicleNumber: '', driverName: '', driverLicense: '', source: 'FARMER', supplierId: '', estimatedBags: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate Gate Pass');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Gate Passes</h2>
          <p className="text-sm text-gray-400 mt-1">Ready for barcode scan (ensure you are not focused on an input)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          New Gate Pass
        </button>
      </div>

      {scannedBarcode && (
        <div className="bg-emerald-900/40 border border-emerald-500/50 p-4 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-emerald-400 text-sm font-semibold">Last Scanned Barcode</span>
            <p className="text-white text-lg">{scannedBarcode}</p>
          </div>
          <button onClick={() => setScannedBarcode('')} className="text-gray-400 hover:text-white">Clear</button>
        </div>
      )}

      <div className="glass-panel overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="p-4 font-semibold text-gray-300">Pass No</th>
                <th className="p-4 font-semibold text-gray-300">Vehicle</th>
                <th className="p-4 font-semibold text-gray-300">Source</th>
                <th className="p-4 font-semibold text-gray-300">Status</th>
                <th className="p-4 font-semibold text-gray-300">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
              ) : gatePasses.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-400">No gate passes generated</td></tr>
              ) : (
                gatePasses.map((gp) => (
                  <tr key={gp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                    <td className="p-4 font-mono text-amber-500">{gp.passNumber}</td>
                    <td className="p-4 font-medium text-white">{gp.vehicleNumber}</td>
                    <td className="p-4">
                      {gp.source} {gp.supplier ? `(${gp.supplier.name})` : ''}
                    </td>
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

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold mb-4 text-amber-500">Generate Gate Pass</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Vehicle Number</label>
                  <input
                    type="text" required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Estimated Bags</label>
                  <input
                    type="number"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                    value={formData.estimatedBags}
                    onChange={(e) => setFormData({ ...formData, estimatedBags: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Driver Name</label>
                  <input
                    type="text" required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Driver License</label>
                  <input
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                    value={formData.driverLicense}
                    onChange={(e) => setFormData({ ...formData, driverLicense: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Source Type</label>
                <select
                  className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value, supplierId: '' })}
                >
                  <option value="FARMER">FARMER</option>
                  <option value="MANDI">MANDI (Commission Agent)</option>
                  <option value="VENDOR">VENDOR</option>
                </select>
              </div>

              {formData.source !== 'FARMER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Select Supplier</label>
                  <select
                    required
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  >
                    <option value="">-- Select --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Generate Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

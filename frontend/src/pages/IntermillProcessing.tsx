import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { usePlantStore } from '../store/plantStore';
import { useIntermillStore } from '../store/intermillStore';
import { useAuthStore } from '../store/authStore';
import api from '../api/axios';
import { getUnitLabel } from '../constants/quantityUnits';

export const IntermillProcessing = () => {
  const activePlant = usePlantStore(state => state.activePlant);
  const user = useAuthStore(state => state.user);
  const { batches, fetchBatches, createBatch, approveBatch, loading } = useIntermillStore();
  const [products, setProducts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    shift: 'Day',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    rawMaterialId: '',
    inputBags: ''
  });
  
  // Output State
  const [selectedOutputs, setSelectedOutputs] = useState<Record<string, boolean>>({});
  const [outputQuantities, setOutputQuantities] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchBatches();
    fetchProducts();
  }, [activePlant]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/api/products');
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching products', error);
    }
  };

  const calculateWastage = () => {
    const input = Number(formData.inputBags) || 0;
    const output = Object.values(outputQuantities).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
    return input - output;
  };

  const handleSubmit = async () => {
    if (!formData.rawMaterialId || !formData.inputBags) return alert('Please fill in raw material details');
    
    const outputs = Object.keys(selectedOutputs)
      .filter(id => selectedOutputs[id])
      .map(id => ({
        productId: id,
        outputBags: outputQuantities[id] || '0'
      }));
      
    if (outputs.length === 0) return alert('Please select at least one output');

    try {
      await createBatch({
        batchNo: `IB-${Date.now()}`,
        ...formData,
        outputs,
        plantId: activePlant?.id
      });
      setIsModalOpen(false);
      
      // Reset form
      setFormData({
        shift: 'Day',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        rawMaterialId: '',
        inputBags: ''
      });
      setSelectedOutputs({});
      setOutputQuantities({});
      
      alert('Batch created successfully');
    } catch (error) {
      alert('Error creating batch');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-[var(--text-main)]">Intermill Processing Batches</h2>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold">
          <Plus className="w-4 h-4" /> Create New Batch
        </button>
      </div>

      <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[var(--bg-panel-alt)] border-b border-[var(--border-subtle)]">
              <tr>
                <th className="p-3 text-[var(--text-muted-alt)] font-medium">Batch No</th>
                <th className="p-3 text-[var(--text-muted-alt)] font-medium">Date / Shift</th>
                <th className="p-3 text-[var(--text-muted-alt)] font-medium">Input Material</th>
                <th className="p-3 text-[var(--text-muted-alt)] font-medium">Input Bags</th>
                <th className="p-3 text-[var(--text-muted-alt)] font-medium">Status</th>
                <th className="p-3 text-[var(--text-muted-alt)] font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => (
                <tr key={batch.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-panel-hover)]">
                  <td className="p-3 text-[var(--text-main)] font-medium">{batch.batchNo}</td>
                  <td className="p-3 text-[var(--text-main)]">{new Date(batch.date).toLocaleDateString()} / {batch.shift}</td>
                  <td className="p-3 text-[var(--text-main)]">{batch.rawMaterial?.name}</td>
                  <td className="p-3 text-[var(--text-main)]">{batch.inputBags}</td>
                  <td className="p-3">
                    {batch.status === 'COMPLETED' ? (
                      <span className="flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-1 rounded w-max"><CheckCircle className="w-4 h-4"/> Completed</span>
                    ) : (
                      <span className="flex items-center gap-1 text-orange-500 bg-orange-500/10 px-2 py-1 rounded w-max"><AlertCircle className="w-4 h-4"/> Pending Approval</span>
                    )}
                  </td>
                  <td className="p-3">
                    {batch.status === 'PENDING_APPROVAL' && user?.role === 'Admin' && (
                      <button onClick={() => approveBatch(batch.id)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs font-bold">Approve</button>
                    )}
                  </td>
                </tr>
              ))}
              {batches.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--text-muted)]">No intermill batches found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-6">Create Intermill Batch</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Shift</label>
                <select name="shift" value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]">
                  <option value="Day">Day</option>
                  <option value="Night">Night</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Date</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Start Time</label>
                <input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">End Time</label>
                <input type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" />
              </div>
            </div>

            <div className="bg-[var(--bg-base)] p-4 rounded-lg border border-[var(--border-subtle)] mb-6">
              <h4 className="font-bold text-[var(--text-main)] mb-4">Input Material</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Raw Material</label>
                  <select value={formData.rawMaterialId} onChange={e => setFormData({...formData, rawMaterialId: e.target.value})} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]">
                    <option value="">Select Material...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({getUnitLabel(p.quantityFormat)})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Input Quantity (Bags)</label>
                  <input type="number" value={formData.inputBags} onChange={e => setFormData({...formData, inputBags: e.target.value})} placeholder="e.g. 100" className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-main)]" />
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-base)] p-4 rounded-lg border border-[var(--border-subtle)] mb-6">
              <h4 className="font-bold text-[var(--text-main)] mb-4">Select Output Products</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {products.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-[var(--text-main)]">
                    <input type="checkbox" checked={!!selectedOutputs[p.id]} onChange={e => setSelectedOutputs({...selectedOutputs, [p.id]: e.target.checked})} className="accent-blue-500 w-4 h-4" />
                    {p.name} <span className="text-[var(--text-muted-alt)]">({getUnitLabel(p.quantityFormat)})</span>
                  </label>
                ))}
              </div>
            </div>

            {Object.keys(selectedOutputs).some(id => selectedOutputs[id]) && formData.inputBags && (
              <div className="bg-[var(--bg-base)] p-4 rounded-lg border border-[var(--border-subtle)] mb-6 overflow-x-auto">
                <h4 className="font-bold text-[var(--text-main)] mb-6 text-center">Output Processing Tree</h4>
                <div className="flex items-center justify-center min-w-[600px] gap-8 py-4">
                  
                  {/* Left Side: Input */}
                  <div className="flex flex-col items-center">
                    <div className="bg-blue-600/20 border border-blue-500/50 p-4 rounded-xl text-center min-w-[140px]">
                      <p className="font-bold text-blue-400 mb-1">{products.find(p => p.id === formData.rawMaterialId)?.name || 'Raw Material'}</p>
                      <p className="text-2xl font-bold text-[var(--text-main)]">{formData.inputBags} <span className="text-sm font-normal text-[var(--text-muted)]">Bags</span></p>
                    </div>
                  </div>

                  {/* Lines */}
                  <div className="flex flex-col justify-center h-full gap-2 relative w-16">
                    {Object.keys(selectedOutputs).filter(id => selectedOutputs[id]).map((id, index) => (
                      <div key={index} className="w-full h-px bg-[var(--border-subtle)] absolute left-0" style={{ top: `${(index + 1) * (100 / (Object.keys(selectedOutputs).filter(id => selectedOutputs[id]).length + 1))}%` }} />
                    ))}
                    <div className="w-px bg-[var(--border-subtle)] absolute left-0 top-[10%] bottom-[10%]" />
                  </div>

                  {/* Right Side: Outputs */}
                  <div className="flex flex-col gap-4">
                    {Object.keys(selectedOutputs).filter(id => selectedOutputs[id]).map(id => (
                      <div key={id} className="flex items-center gap-4 bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] p-2 rounded-lg">
                        <p className="font-medium text-[var(--text-main)] w-32 truncate">{products.find(p => p.id === id)?.name}</p>
                        <input 
                          type="number" 
                          placeholder="Bags" 
                          value={outputQuantities[id] || ''}
                          onChange={e => setOutputQuantities({...outputQuantities, [id]: e.target.value})}
                          className="w-24 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-sm text-[var(--text-main)] text-center"
                        />
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-main)]">Cancel</button>
              <button onClick={handleSubmit} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg">Create Batch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

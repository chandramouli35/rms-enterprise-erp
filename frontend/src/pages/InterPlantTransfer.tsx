import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ArrowRightLeft, Plus, CheckCircle, Truck, 
  Search, ChevronRight, XCircle, FileText, Download
} from 'lucide-react';
import api from '../api/axios';
import { usePlantStore } from '../store/plantStore';
import { useUiStore } from '../store/uiStore';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';

export const InterPlantTransfer = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'transfer_request';
  const activePlant = usePlantStore((state) => state.activePlant);
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    total: 0,
    approved: 0,
    approvedValue: 0,
    inTransit: 0,
    inTransitValue: 0,
    delivered: 0,
    deliveredValue: 0,
    cancelled: 0,
    cancelledValue: 0,
    inTransitQuantity: 0,
    delayedTransfers: 0,
  });

  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', status: '' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);

  const [formData, setFormData] = useState({
    fromPlantId: '',
    toPlantId: '',
    date: new Date().toISOString().split('T')[0],
    item: 'Paddy',
    variety: '',
    quantity: '',
    estimatedValue: '',
    expectedDelivery: '',
    vehicleNo: '',
    driverName: '',
    remarks: '',
  });

  const [plants, setPlants] = useState<any[]>([]);

  const fetchPlants = async () => {
    try {
      const res = await api.get('/plants');
      setPlants(res.data);
      if (activePlant) {
        setFormData(prev => ({ ...prev, fromPlantId: activePlant.id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransfersAndMetrics = async () => {
    if (!activePlant) return;
    try {
      const query = new URLSearchParams({ plantId: activePlant.id });
      if (filters.dateFrom) query.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) query.append('dateTo', filters.dateTo);
      if (filters.status) query.append('status', filters.status);

      const [transfersRes, metricsRes] = await Promise.all([
        api.get(`/transfer?${query.toString()}`),
        api.get(`/transfer/metrics?plantId=${activePlant.id}`)
      ]);
      setTransfers(transfersRes.data);
      setMetrics(metricsRes.data);
    } catch (error) {
      console.error('Failed to fetch transfers:', error);
    }
  };

  useEffect(() => {
    fetchPlants();
  }, [activePlant]);

  useEffect(() => {
    fetchTransfersAndMetrics();
    const interval = setInterval(fetchTransfersAndMetrics, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [activePlant, filters]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitRequest = async () => {
    try {
      setLoading(true);
      await api.post('/transfer', {
        ...formData,
        quantity: Number(formData.quantity),
        estimatedValue: formData.estimatedValue ? Number(formData.estimatedValue) : undefined,
      });
      setIsModalOpen(false);
      fetchTransfersAndMetrics();
      setFormData({
        fromPlantId: activePlant ? activePlant.id : '',
        toPlantId: '',
        date: new Date().toISOString().split('T')[0],
        item: 'Paddy',
        variety: '',
        quantity: '',
        estimatedValue: '',
        expectedDelivery: '',
        vehicleNo: '',
        driverName: '',
        remarks: '',
      });
    } catch (error) {
      console.error('Failed to create transfer', error);
      useUiStore.getState().addToast('Error creating transfer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/transfer/${id}/status`, { status });
      fetchTransfersAndMetrics();
      if (selectedTransfer && selectedTransfer.id === id) {
        setSelectedTransfer({ ...selectedTransfer, status });
      }
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const getPlantName = (id: string) => plants.find(p => p.id === id)?.name || 'Unknown';

  const inTransitTransfers = transfers.filter(t => t.status === 'In Transit' || t.status === 'Dispatched');

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] text-[var(--text-muted)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-panel)] mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-[var(--text-muted)]">Inter-Plant Stock Transfer</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        
        {/* Tab 1: Transfer Request */}
        {activeTab === 'transfer_request' && (
          <div className="flex flex-col gap-6">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-lg shadow-black/20 flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><FileText size={20} /></div>
                  <span className="text-sm font-medium text-[var(--text-muted-alt)]">Total Requests</span>
                </div>
                <div>
                  <span className="text-3xl font-bold text-[var(--text-main)]">{metrics.total}</span>
                  <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">This Period</p>
                </div>
              </div>
              <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-lg shadow-black/20 flex flex-col justify-between border-t-2 border-t-green-500">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/10 rounded-full text-green-400"><CheckCircle size={20} /></div>
                  <span className="text-sm font-medium text-[var(--text-muted-alt)]">Approved</span>
                </div>
                <div>
                  <span className="text-3xl font-bold text-[var(--text-main)]">{metrics.approved}</span>
                  <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">{formatCurrency(metrics.approvedValue)} Value</p>
                </div>
              </div>
              <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-lg shadow-black/20 flex flex-col justify-between border-t-2 border-t-orange-500">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-500/10 rounded-full text-orange-400"><Truck size={20} /></div>
                  <span className="text-sm font-medium text-[var(--text-muted-alt)]">In Transit</span>
                </div>
                <div>
                  <span className="text-3xl font-bold text-[var(--text-main)]">{metrics.inTransit}</span>
                  <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">{formatCurrency(metrics.inTransitValue)} Value</p>
                </div>
              </div>
              <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-lg shadow-black/20 flex flex-col justify-between border-t-2 border-t-purple-500">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><CheckCircle size={20} /></div>
                  <span className="text-sm font-medium text-[var(--text-muted-alt)]">Delivered</span>
                </div>
                <div>
                  <span className="text-3xl font-bold text-[var(--text-main)]">{metrics.delivered}</span>
                  <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">{formatCurrency(metrics.deliveredValue)} Value</p>
                </div>
              </div>
              <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-lg shadow-black/20 flex flex-col justify-between border-t-2 border-t-red-500">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-500/10 rounded-full text-red-400"><XCircle size={20} /></div>
                  <span className="text-sm font-medium text-[var(--text-muted-alt)]">Cancelled</span>
                </div>
                <div>
                  <span className="text-3xl font-bold text-[var(--text-main)]">{metrics.cancelled}</span>
                  <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">{formatCurrency(metrics.cancelledValue)} Value</p>
                </div>
              </div>
            </div>

            {/* Table Area */}
            <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col shadow-lg shadow-black/20 flex-1 min-h-[500px]">
              <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--text-main)]">Recent Transfer Requests</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({...f, dateFrom: e.target.value}))} className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] text-xs px-2 py-1 rounded text-[var(--text-main)]" />
                    <span className="text-xs text-[var(--text-muted-alt)]">to</span>
                    <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({...f, dateTo: e.target.value}))} className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] text-xs px-2 py-1 rounded text-[var(--text-main)]" />
                    <select value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))} className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] text-xs px-2 py-1 rounded text-[var(--text-main)]">
                      <option value="">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Dispatched">Dispatched</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <button onClick={() => {
                    const data = transfers.map(t => ({
                      RequestNo: t.requestNo,
                      Date: new Date(t.date).toLocaleDateString(),
                      FromPlant: getPlantName(t.fromPlantId),
                      ToPlant: getPlantName(t.toPlantId),
                      Item: t.item,
                      Quantity: t.quantity,
                      Status: t.status
                    }));
                    exportToPDF('Transfer Requests', Object.keys(data[0]), data.map(d => Object.values(d)), 'transfer_requests.pdf');
                  }} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-2 py-1 rounded text-xs flex gap-1 items-center font-bold">
                    <FileText size={14} /> PDF
                  </button>
                  <button onClick={() => {
                    const data = transfers.map(t => ({
                      RequestNo: t.requestNo,
                      Date: new Date(t.date).toLocaleDateString(),
                      FromPlant: getPlantName(t.fromPlantId),
                      ToPlant: getPlantName(t.toPlantId),
                      Item: t.item,
                      Quantity: t.quantity,
                      Status: t.status
                    }));
                    exportToExcel(data, 'transfer_requests.xlsx');
                  }} className="bg-green-500/10 text-green-500 hover:bg-green-500/20 px-2 py-1 rounded text-xs flex gap-1 items-center font-bold">
                    <Download size={14} /> Excel
                  </button>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-[#e67e00] hover:bg-[#cc7000] text-black px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-amber-500/20"
                  >
                    <Plus size={16} /> Create Request
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                  <thead className="sticky top-0 bg-[var(--bg-panel-hover)] z-10 shadow-sm border-b border-[var(--border-subtle)]">
                    <tr className="text-[var(--text-muted-alt)] uppercase font-medium text-xs">
                      <th className="p-4">Request No.</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">From Plant</th>
                      <th className="p-4">To Plant</th>
                      <th className="p-4">Item (Variety)</th>
                      <th className="p-4 text-right">Quantity (MT)</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4">Expected Delivery</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((item, i) => (
                      <tr key={item.id} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)]">
                        <td className="p-4 font-mono font-medium text-[var(--text-main)]">{item.requestNo}</td>
                        <td className="p-4 text-[var(--text-muted)]">{new Date(item.date).toLocaleDateString('en-GB')}</td>
                        <td className="p-4 text-[var(--text-muted)]">{getPlantName(item.fromPlantId)}</td>
                        <td className="p-4 text-[var(--text-muted)]">{getPlantName(item.toPlantId)}</td>
                        <td className="p-4 font-medium text-[var(--text-muted)]">{item.item} {item.variety ? `(${item.variety})` : ''}</td>
                        <td className="p-4 text-right font-bold text-[var(--text-main)]">{item.quantity.toFixed(3)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                            item.status === 'In Transit' || item.status === 'Dispatched' ? 'bg-blue-900/50 text-blue-400 border border-blue-500/20' :
                            item.status === 'Delivered' || item.status === 'Completed' ? 'bg-green-900/50 text-green-400 border border-green-500/20' :
                            item.status === 'Cancelled' ? 'bg-red-900/50 text-red-400 border border-red-500/20' :
                            'bg-orange-900/50 text-orange-400 border border-orange-500/20'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-[var(--text-muted-alt)]">{item.expectedDelivery ? new Date(item.expectedDelivery).toLocaleDateString('en-GB') : '-'}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => { setSelectedTransfer(item); setSearchParams({tab: 'transfer_tracking'}); }} className="text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {transfers.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-[var(--text-muted-alt)]">No transfer requests found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Transfer Tracking */}
        {activeTab === 'transfer_tracking' && (
          <div className="flex flex-col gap-6">
            <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-lg shadow-black/20 flex flex-col min-h-[500px]">
              
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-6 mb-8">
                <h2 className="text-xl font-bold text-[var(--text-main)]">Transfer Tracking</h2>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-[var(--text-muted-alt)]">Select Transfer:</span>
                  <select 
                    className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none min-w-[200px]"
                    value={selectedTransfer?.id || ''}
                    onChange={(e) => setSelectedTransfer(transfers.find(t => t.id === e.target.value))}
                  >
                    <option value="">Select...</option>
                    {transfers.map(t => (
                      <option key={t.id} value={t.id}>{t.requestNo} ({t.status})</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedTransfer ? (
                <>
                  {/* Timeline */}
                  <div className="flex justify-between items-start relative px-10 my-8">
                    {/* Progress Background */}
                    <div className="absolute top-4 left-16 right-16 h-1 bg-[var(--bg-panel-hover)] -z-10">
                      <div className={`h-full bg-[#e67e00] transition-all duration-500 ${
                        selectedTransfer.status === 'Approved' ? 'w-[0%]' :
                        selectedTransfer.status === 'Dispatched' ? 'w-[25%]' :
                        selectedTransfer.status === 'In Transit' ? 'w-[50%]' :
                        selectedTransfer.status === 'Delivered' ? 'w-[75%]' :
                        selectedTransfer.status === 'Completed' ? 'w-[100%]' : 'w-0'
                      }`}></div>
                    </div>

                    {[
                      { label: 'Request Created', date: selectedTransfer.createdAt, statusList: ['Approved', 'Dispatched', 'In Transit', 'Delivered', 'Completed'] },
                      { label: 'Approved', date: selectedTransfer.createdAt, statusList: ['Approved', 'Dispatched', 'In Transit', 'Delivered', 'Completed'] },
                      { label: 'Dispatched', date: selectedTransfer.dispatchedOn, statusList: ['Dispatched', 'In Transit', 'Delivered', 'Completed'] },
                      { label: 'In Transit', date: selectedTransfer.dispatchedOn, statusList: ['In Transit', 'Delivered', 'Completed'] },
                      { label: 'Delivered', date: selectedTransfer.receivedOn, statusList: ['Delivered', 'Completed'] },
                      { label: 'Completed', date: selectedTransfer.receivedOn, statusList: ['Completed'] },
                    ].map((step, idx) => {
                      const isCompleted = step.statusList.includes(selectedTransfer.status);
                      const isCurrent = step.label === selectedTransfer.status || (step.label === 'In Transit' && selectedTransfer.status === 'Dispatched');

                      return (
                        <div key={idx} className="flex flex-col items-center gap-3 w-1/6">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-lg ${
                            isCompleted || isCurrent ? 'bg-[#e67e00] text-black shadow-amber-500/20' : 'bg-[var(--bg-panel-alt)] border-2 border-[var(--border-subtle)] text-[var(--text-muted-alt)]'
                          }`}>
                            {(isCompleted || isCurrent) ? <CheckCircle size={16} /> : <div className="w-2 h-2 rounded-full bg-gray-500"></div>}
                          </div>
                          <div className="text-center">
                            <div className={`text-sm font-bold ${isCompleted || isCurrent ? 'text-[var(--text-main)]' : 'text-[var(--text-muted-alt)]'}`}>{step.label}</div>
                            {step.date && (isCompleted || isCurrent) && (
                              <div className="text-[10px] text-[var(--text-muted-alt)] mt-1">
                                {new Date(step.date).toLocaleDateString('en-GB')} {new Date(step.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Details Card */}
                  <div className="bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-xl p-6 mt-12">
                    <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 border-b border-[var(--border-subtle)] pb-3">Transfer Details - {selectedTransfer.requestNo}</h3>
                    
                    <div className="grid grid-cols-3 gap-8 text-sm">
                      <div className="space-y-4">
                        <div>
                          <p className="text-[var(--text-muted-alt)] mb-1">From Plant</p>
                          <p className="text-[var(--text-main)] font-medium">{getPlantName(selectedTransfer.fromPlantId)}</p>
                        </div>
                        <div>
                          <p className="text-[var(--text-muted-alt)] mb-1">To Plant</p>
                          <p className="text-[var(--text-main)] font-medium">{getPlantName(selectedTransfer.toPlantId)}</p>
                        </div>
                        <div>
                          <p className="text-[var(--text-muted-alt)] mb-1">Item / Material</p>
                          <p className="text-[var(--text-main)] font-medium">{selectedTransfer.item}</p>
                        </div>
                        <div>
                          <p className="text-[var(--text-muted-alt)] mb-1">Variety</p>
                          <p className="text-[var(--text-main)] font-medium">{selectedTransfer.variety || '-'}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-[var(--text-muted-alt)] mb-1">Quantity (MT)</p>
                          <p className="text-[var(--text-main)] font-medium">{selectedTransfer.quantity.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-[var(--text-muted-alt)] mb-1">Vehicle No.</p>
                          <p className="text-[var(--text-main)] font-medium">{selectedTransfer.vehicleNo || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[var(--text-muted-alt)] mb-1">Driver Name</p>
                          <p className="text-[var(--text-main)] font-medium">{selectedTransfer.driverName || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[var(--text-muted-alt)] mb-1">Dispatched Date & Time</p>
                          <p className="text-[var(--text-main)] font-medium">{selectedTransfer.dispatchedOn ? new Date(selectedTransfer.dispatchedOn).toLocaleString() : '-'}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-[var(--text-muted-alt)] mb-1">Expected Delivery Date</p>
                          <p className="text-[var(--text-main)] font-medium">{selectedTransfer.expectedDelivery ? new Date(selectedTransfer.expectedDelivery).toLocaleDateString('en-GB') : '-'}</p>
                        </div>
                        <div>
                          <p className="text-[var(--text-muted-alt)] mb-1">Estimated Value (₹)</p>
                          <p className="text-[var(--text-main)] font-medium">{formatCurrency(selectedTransfer.estimatedValue || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[var(--text-muted-alt)] mb-1">Remarks</p>
                          <p className="text-[var(--text-main)] font-medium">{selectedTransfer.remarks || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-8 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-[var(--text-muted-alt)]">Current Status:</span>
                        <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-bold uppercase">
                          {selectedTransfer.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {selectedTransfer.status === 'Approved' && (
                          <button onClick={() => updateStatus(selectedTransfer.id, 'Dispatched')} className="bg-[#e67e00] text-black px-4 py-2 rounded font-bold text-sm">
                            Mark Dispatched
                          </button>
                        )}
                        {(selectedTransfer.status === 'Dispatched' || selectedTransfer.status === 'In Transit') && (
                          <button onClick={() => updateStatus(selectedTransfer.id, 'Delivered')} className="bg-green-500 text-black px-4 py-2 rounded font-bold text-sm">
                            Mark Delivered
                          </button>
                        )}
                        <span className="text-[var(--text-muted-alt)] text-xs ml-4 border-l border-[var(--border-subtle)] pl-4">Last Updated: {new Date(selectedTransfer.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted-alt)]">
                  <ArrowRightLeft size={48} className="mb-4 opacity-20" />
                  <p>Select a transfer request to view tracking details.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: In Transit Stock */}
        {activeTab === 'in_transit_stock' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-[var(--bg-panel)] border border-blue-500/30 rounded-xl p-5 shadow-lg flex items-center gap-4">
                <div className="p-4 bg-blue-500/10 rounded-full text-blue-400"><Truck size={24} /></div>
                <div>
                  <p className="text-sm font-medium text-blue-400 mb-1">Total In Transit</p>
                  <span className="text-2xl font-bold text-[var(--text-main)]">{metrics.inTransit}</span>
                  <span className="text-xs text-[var(--text-muted-alt)] ml-2">Transfers</span>
                </div>
              </div>
              <div className="bg-[var(--bg-panel)] border border-green-500/30 rounded-xl p-5 shadow-lg flex items-center gap-4">
                <div className="p-4 bg-green-500/10 rounded-full text-green-400"><ArrowRightLeft size={24} /></div>
                <div>
                  <p className="text-sm font-medium text-green-400 mb-1">Total Quantity</p>
                  <span className="text-2xl font-bold text-[var(--text-main)]">{metrics.inTransitQuantity.toFixed(3)} <span className="text-sm font-normal text-[var(--text-muted-alt)]">MT</span></span>
                </div>
              </div>
              <div className="bg-[var(--bg-panel)] border border-orange-500/30 rounded-xl p-5 shadow-lg flex items-center gap-4">
                <div className="p-4 bg-orange-500/10 rounded-full text-orange-400"><FileText size={24} /></div>
                <div>
                  <p className="text-sm font-medium text-orange-400 mb-1">Total Value</p>
                  <span className="text-2xl font-bold text-[var(--text-main)]">{formatCurrency(metrics.inTransitValue)}</span>
                </div>
              </div>
              <div className="bg-[var(--bg-panel)] border border-red-500/30 rounded-xl p-5 shadow-lg flex items-center gap-4">
                <div className="p-4 bg-red-500/10 rounded-full text-red-400"><XCircle size={24} /></div>
                <div>
                  <p className="text-sm font-medium text-red-400 mb-1">Delayed</p>
                  <span className="text-2xl font-bold text-[var(--text-main)]">{metrics.delayedTransfers}</span>
                  <span className="text-xs text-[var(--text-muted-alt)] ml-2">Transfers</span>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col shadow-lg shadow-black/20 flex-1 min-h-[500px]">
              <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--text-main)]">In Transit Stock</h2>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                  <thead className="sticky top-0 bg-[var(--bg-panel-hover)] z-10 shadow-sm border-b border-[var(--border-subtle)]">
                    <tr className="text-[var(--text-muted-alt)] font-medium text-xs">
                      <th className="p-4">Transfer No.</th>
                      <th className="p-4">From Plant</th>
                      <th className="p-4">To Plant</th>
                      <th className="p-4">Item</th>
                      <th className="p-4 text-right">Quantity (MT)</th>
                      <th className="p-4">Dispatched On</th>
                      <th className="p-4">Expected Delivery</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inTransitTransfers.map((item) => (
                      <tr key={item.id} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)]">
                        <td className="p-4 font-mono font-medium text-[var(--text-main)]">{item.requestNo}</td>
                        <td className="p-4 text-[var(--text-muted)]">{getPlantName(item.fromPlantId)}</td>
                        <td className="p-4 text-[var(--text-muted)]">{getPlantName(item.toPlantId)}</td>
                        <td className="p-4 font-medium text-[var(--text-muted)]">{item.item}</td>
                        <td className="p-4 text-right font-bold text-[var(--text-main)]">{item.quantity.toFixed(3)}</td>
                        <td className="p-4 text-[var(--text-muted-alt)]">{item.dispatchedOn ? new Date(item.dispatchedOn).toLocaleDateString('en-GB') : '-'}</td>
                        <td className="p-4 text-[var(--text-muted-alt)]">{item.expectedDelivery ? new Date(item.expectedDelivery).toLocaleDateString('en-GB') : '-'}</td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-blue-900/50 text-blue-400 border border-blue-500/20">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {inTransitTransfers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-[var(--text-muted-alt)]">No active stock in transit.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-2xl shadow-black max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-[var(--text-main)]">Create Transfer Request</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted-alt)] mb-1.5">From Plant <span className="text-red-500">*</span></label>
                  <select name="fromPlantId" value={formData.fromPlantId} onChange={handleInputChange} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none">
                    <option value="">Select Plant</option>
                    {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted-alt)] mb-1.5">To Plant <span className="text-red-500">*</span></label>
                  <select name="toPlantId" value={formData.toPlantId} onChange={handleInputChange} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none">
                    <option value="">Select Plant</option>
                    {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted-alt)] mb-1.5">Transfer Date <span className="text-red-500">*</span></label>
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none " />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted-alt)] mb-1.5">Expected Delivery Date</label>
                  <input type="date" name="expectedDelivery" value={formData.expectedDelivery} onChange={handleInputChange} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none " />
                </div>
                
                <div className="col-span-2 border-t border-[var(--border-subtle-alt)] pt-6 mt-2">
                  <h3 className="text-sm font-bold text-[var(--text-main)] mb-4">Item Details</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted-alt)] mb-1.5">Item / Material <span className="text-red-500">*</span></label>
                      <select name="item" value={formData.item} onChange={handleInputChange} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none">
                        <option>Paddy</option>
                        <option>Rice</option>
                        <option>Rice (Broken)</option>
                        <option>Bran</option>
                        <option>Husk</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted-alt)] mb-1.5">Variety</label>
                      <input type="text" name="variety" value={formData.variety} onChange={handleInputChange} placeholder="e.g. Swarna" className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted-alt)] mb-1.5">Quantity (MT) <span className="text-red-500">*</span></label>
                      <input type="number" min="0" name="quantity" value={formData.quantity} onChange={handleInputChange} placeholder="0.000" className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none"  />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted-alt)] mb-1.5">Estimated Value (₹)</label>
                      <input type="number" min="0" name="estimatedValue" value={formData.estimatedValue} onChange={handleInputChange} placeholder="2500000" className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none"  />
                    </div>
                  </div>
                </div>

                <div className="col-span-2 border-t border-[var(--border-subtle-alt)] pt-6 mt-2">
                  <h3 className="text-sm font-bold text-[var(--text-main)] mb-4">Logistics (Optional)</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted-alt)] mb-1.5">Vehicle No.</label>
                      <input type="text" name="vehicleNo" value={formData.vehicleNo} onChange={handleInputChange} placeholder="e.g. HR-38-XY-1234" className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted-alt)] mb-1.5">Driver Name</label>
                      <input type="text" name="driverName" value={formData.driverName} onChange={handleInputChange} placeholder="e.g. Rajesh Kumar" className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-[var(--text-muted-alt)] mb-1.5">Remarks</label>
                      <textarea rows={2} name="remarks" value={formData.remarks} onChange={handleInputChange} className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-main)] text-sm focus:border-[#e67e00] outline-none"></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border-subtle)] flex justify-end gap-3 shrink-0 bg-[var(--bg-base)]">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-[var(--bg-panel-alt)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-main)] rounded-lg font-bold text-sm transition-colors border border-[var(--border-subtle)]">Cancel</button>
              <button onClick={handleSubmitRequest} disabled={loading || !formData.fromPlantId || !formData.toPlantId || !formData.quantity} className="px-6 py-2.5 bg-[#e67e00] hover:bg-[#cc7000] text-black rounded-lg font-bold text-sm transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50">
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

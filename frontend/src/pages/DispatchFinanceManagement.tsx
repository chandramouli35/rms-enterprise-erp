import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Truck, CheckCircle2, Factory, TrendingUp, TrendingDown, Eye, Plus, Scale, PackageMinus, Settings, Activity, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { usePlantStore } from '../store/plantStore';
import { dispatchFinanceApi } from '../api/dispatchFinance';

export function DispatchFinanceManagement() {
  const { user } = useAuthStore();
  const { activePlant } = usePlantStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState('dispatch');

  const [metrics, setMetrics] = useState({ totalToday: 0, completed: 0, inTransit: 0, pending: 0 });
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [vehicleStats, setVehicleStats] = useState({ allocatedVehicles: 0, availableVehicles: 0, gatePassGenerated: 0, pendingGatePass: 0 });
  const [financeOverview, setFinanceOverview] = useState({ todaysSales: 0, todaysCollection: 0, outstandingAmount: 0, pendingInvoices: 0, recentTransactions: [] });
  const [utilities, setUtilities] = useState({ powerStatus: 'Normal', lastBackup: '', databaseSize: 0, systemUptime: '' });

  // Modals state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isGatePassModalOpen, setIsGatePassModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  
  const [selectedDispatch, setSelectedDispatch] = useState<any>(null);
  const [selectedWeightTx, setSelectedWeightTx] = useState<any>(null);
  const [dispatchForm, setDispatchForm] = useState({ partyName: '', item: 'PADDY', quantity: '', date: '' });
  const [gatePassForm, setGatePassForm] = useState({ dispatchId: '', vehicleNo: '', driverName: '', contactNo: '' });
  const [weightForm, setWeightForm] = useState({ tareWeight: '', grossWeight: '', netWeight: '' });

  const [weightVerifications, setWeightVerifications] = useState([]);
  const [inventoryDeductions, setInventoryDeductions] = useState([]);

  const refreshData = () => {
    const targetPlantId = activePlant ? activePlant.id : 'all';
    
    // Always fetch metrics and finance overview because they are used in the top KPI cards across all tabs
    dispatchFinanceApi.getDispatchMetrics(targetPlantId).then(setMetrics).catch(console.error);
    dispatchFinanceApi.getFinanceOverview(targetPlantId).then(setFinanceOverview).catch(console.error);

    // Fetch tab-specific data based on the current tab
    if (currentTab === 'dispatch_mgmt') {
      dispatchFinanceApi.getAllDispatches(targetPlantId).then(setDispatches).catch(console.error);
    } else if (currentTab === 'vehicle_allocation') {
      dispatchFinanceApi.getVehicleAllocationStats(targetPlantId).then(setVehicleStats).catch(console.error);
      dispatchFinanceApi.getAllDispatches(targetPlantId).then(setDispatches).catch(console.error);
    } else if (currentTab === 'weight_verification') {
      dispatchFinanceApi.getWeightVerifications(targetPlantId).then(setWeightVerifications).catch(console.error);
    } else if (currentTab === 'inventory_deduction') {
      dispatchFinanceApi.getInventoryDeductions(targetPlantId).then(setInventoryDeductions).catch(console.error);
    } else if (currentTab === 'utility_management') {
      dispatchFinanceApi.getSystemUtilities(targetPlantId).then(setUtilities).catch(console.error);
    }
  };

  useEffect(() => {
    refreshData();
  }, [activePlant, currentTab]);

  // Fetch dispatches when Gate Pass Modal opens so the dropdown is populated
  useEffect(() => {
    if (isGatePassModalOpen) {
      const targetPlantId = activePlant ? activePlant.id : 'all';
      dispatchFinanceApi.getAllDispatches(targetPlantId).then(setDispatches).catch(console.error);
    }
  }, [isGatePassModalOpen, activePlant]);

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlant) {
      alert('You cannot create a dispatch in Consolidated view. Please select a specific plant first.');
      return;
    }
    try {
      await dispatchFinanceApi.createDispatch(activePlant.id, dispatchForm);
      setIsDispatchModalOpen(false);
      setDispatchForm({ partyName: '', item: 'PADDY', quantity: '', date: '' });
      refreshData();
    } catch (err: any) {
      console.error('Failed to create dispatch', err);
      alert('Failed to create dispatch: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleGenerateGatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlant) {
      alert('You cannot generate a gate pass in Consolidated view. Please select a specific plant first.');
      return;
    }
    try {
      await dispatchFinanceApi.generateGatePass(activePlant.id, gatePassForm);
      setIsGatePassModalOpen(false);
      setGatePassForm({ dispatchId: '', vehicleNo: '', driverName: '', contactNo: '' });
      refreshData();
    } catch (err: any) {
      console.error('Failed to generate gate pass', err);
      alert('Failed to generate gate pass: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleReadWeighbridge = async () => {
    if (!activePlant) return;
    try {
      const data = await dispatchFinanceApi.readWeighbridge(activePlant.id);
      
      // If we already have Tare, then it's a Gross weight reading
      if (weightForm.tareWeight && !weightForm.grossWeight) {
        const gross = data.weight;
        const tare = parseFloat(weightForm.tareWeight);
        setWeightForm({
          ...weightForm,
          grossWeight: String(gross),
          netWeight: String(gross - tare > 0 ? (gross - tare) / 1000 : 0) // Convert kg to MT for net weight
        });
      } else {
        // First reading is Tare
        setWeightForm({
          ...weightForm,
          tareWeight: String(data.weight)
        });
      }
    } catch (err) {
      console.error('Failed to read from weighbridge', err);
      alert('Failed to communicate with physical weighbridge indicator.');
    }
  };

  const handleSubmitWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlant) return;
    try {
      await dispatchFinanceApi.createWeightEntry(activePlant.id, {
        transactionId: selectedWeightTx.id,
        tareWeight: parseFloat(weightForm.tareWeight),
        grossWeight: parseFloat(weightForm.grossWeight),
        netWeight: parseFloat(weightForm.netWeight)
      });
      setIsWeightModalOpen(false);
      setWeightForm({ tareWeight: '', grossWeight: '', netWeight: '' });
      setSelectedWeightTx(null);
      refreshData();
    } catch (err: any) {
      console.error('Failed to submit weight', err);
      alert('Failed to submit weight: ' + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      setCurrentTab(tab);
    } else {
      if (location.pathname.includes('/finance')) {
        navigate('/finance?tab=finance_dashboard', { replace: true });
      } else {
        navigate('/dispatch?tab=dispatch_mgmt', { replace: true });
      }
    }
  }, [location.search, navigate]);

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[var(--bg-base)]">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50/10 border border-blue-200/20 rounded-2xl p-4 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Truck size={20} />
            </div>
            <h3 className="text-sm font-medium text-[var(--text-muted)]">Today's Dispatch</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-[var(--text-main)]">{metrics.totalToday}</span>
            <span className="text-sm text-[var(--text-muted-alt)] mb-1">MT</span>
          </div>
          <p className="text-xs text-green-500 mt-2 flex items-center gap-1"><TrendingUp size={12}/> +0% vs yesterday</p>
        </div>
        
        <div className="bg-emerald-50/10 border border-emerald-200/20 rounded-2xl p-4 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Truck size={20} />
            </div>
            <h3 className="text-sm font-medium text-[var(--text-muted)]">Pending Dispatch</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-[var(--text-main)]">{metrics.pending}</span>
            <span className="text-sm text-[var(--text-muted-alt)] mb-1">MT</span>
          </div>
          <p className="text-xs text-[var(--text-muted-alt)] mt-2">0 Vehicles Pending</p>
        </div>

        <div className="bg-amber-50/10 border border-amber-200/20 rounded-2xl p-4 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Scale size={20} />
            </div>
            <h3 className="text-sm font-medium text-[var(--text-muted)]">Today's Outward Weight</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-[var(--text-main)]">120.45</span>
            <span className="text-sm text-[var(--text-muted-alt)] mb-1">MT</span>
          </div>
          <p className="text-xs text-[var(--text-muted-alt)] mt-2">Completed</p>
        </div>

        <div className="bg-purple-50/10 border border-purple-200/20 rounded-2xl p-4 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center font-bold">
              ₹
            </div>
            <h3 className="text-sm font-medium text-[var(--text-muted)]">Today's Sales Value</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-[var(--text-main)]">₹ {financeOverview.todaysSales.toLocaleString()}</span>
          </div>
          <p className="text-xs text-green-500 mt-2 flex items-center gap-1"><TrendingUp size={12}/> +0% vs yesterday</p>
        </div>

        <div className="bg-rose-50/10 border border-rose-200/20 rounded-2xl p-4 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
              <Factory size={20} />
            </div>
            <h3 className="text-sm font-medium text-[var(--text-muted)]">Dispatch Outstanding</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-[var(--text-main)]">₹ {financeOverview.outstandingAmount.toLocaleString()}</span>
          </div>
          <p className="text-xs text-[var(--text-muted-alt)] mt-2">Active</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {currentTab === 'dispatch_mgmt' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden flex flex-col h-[500px]">
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel)]">
              <h2 className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
                <Truck className="text-[var(--text-muted)]" size={20} />
                Dispatch Management
              </h2>
              <button onClick={() => setIsDispatchModalOpen(true)} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-amber-500/20">
                <Plus size={16} /> New Dispatch
              </button>
            </div>
            
            {/* Header Cards */}
            <div className="grid grid-cols-4 gap-4 p-6 border-b border-[var(--border-subtle-alt)]">
               <div className="text-center p-3 border border-blue-200/20 rounded-lg">
                  <p className="text-xs text-[var(--text-muted-alt)] mb-1">Total Today</p>
                  <p className="text-2xl font-bold text-blue-500">{metrics.totalToday} <span className="text-sm">MT</span></p>
               </div>
               <div className="text-center p-3 border border-emerald-200/20 rounded-lg">
                  <p className="text-xs text-[var(--text-muted-alt)] mb-1">Completed</p>
                  <p className="text-2xl font-bold text-emerald-500">{metrics.completed} <span className="text-sm">MT</span></p>
               </div>
               <div className="text-center p-3 border border-[var(--border-subtle)] rounded-lg">
                  <p className="text-xs text-[var(--text-muted-alt)] mb-1">In Transit</p>
                  <p className="text-2xl font-bold text-[var(--text-main)]">{metrics.inTransit} <span className="text-sm">MT</span></p>
               </div>
               <div className="text-center p-3 border border-amber-200/20 rounded-lg">
                  <p className="text-xs text-[var(--text-muted-alt)] mb-1">Pending</p>
                  <p className="text-2xl font-bold text-amber-500">{metrics.pending} <span className="text-sm">MT</span></p>
               </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[var(--bg-base)] text-[var(--text-muted-alt)] sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 font-medium rounded-l-lg">Dispatch No.</th>
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium">Party Name</th>
                    <th className="py-3 px-4 font-medium">Item</th>
                    <th className="py-3 px-4 font-medium">Quantity (MT)</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Vehicle No.</th>
                    <th className="py-3 px-4 font-medium rounded-r-lg text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle-alt)]">
                  {dispatches.length > 0 ? (
                    dispatches.map((d: any) => (
                      <tr key={d.id} className="hover:bg-[var(--bg-base)] transition-colors">
                        <td className="py-3 px-4 text-[var(--text-main)]">{d.dispatchNo}</td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">{new Date(d.date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-[var(--text-main)]">{d.partyName}</td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">{d.item}</td>
                        <td className="py-3 px-4 text-[var(--text-main)] font-medium">{d.quantity.toFixed(3)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            d.status === 'Completed' ? 'bg-green-500/20 text-green-400' :
                            d.status === 'In Transit' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">{d.vehicleNo || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => { setSelectedDispatch(d); setIsViewModalOpen(true); }} className="text-blue-500 hover:text-blue-400"><Eye size={16} className="mx-auto"/></button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[var(--text-muted-alt)]">
                        No dispatches found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <button className="border border-[var(--border-subtle)] hover:bg-[var(--bg-base)] text-[var(--text-main)] px-4 py-2 rounded-lg text-sm font-medium">
                View All Dispatch
              </button>
            </div>
          </div>
        )}

        {currentTab === 'vehicle_allocation' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
                <Truck size={20} className="text-[var(--text-muted)]"/> Vehicle Allocation & Gate Pass
              </h2>
              <button onClick={() => setIsGatePassModalOpen(true)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-emerald-500/20">
                <Plus size={16}/> Generate Gate Pass
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-[var(--bg-base)] rounded-lg border border-[var(--border-subtle-alt)]">
                <span className="text-sm font-medium text-[var(--text-muted)] flex items-center gap-3"><Truck size={16}/> Allocated Vehicles</span>
                <span className="font-bold text-[var(--text-main)]">{vehicleStats.allocatedVehicles}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[var(--bg-base)] rounded-lg border border-[var(--border-subtle-alt)]">
                <span className="text-sm font-medium text-[var(--text-muted)] flex items-center gap-3"><Truck size={16}/> Available Vehicles</span>
                <span className="font-bold text-[var(--text-main)]">{vehicleStats.availableVehicles}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[var(--bg-base)] rounded-lg border border-[var(--border-subtle-alt)]">
                <span className="text-sm font-medium text-[var(--text-muted)] flex items-center gap-3"><span className="font-bold">₹</span> Gate Pass Generated</span>
                <span className="font-bold text-[var(--text-main)]">{vehicleStats.gatePassGenerated}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[var(--bg-base)] rounded-lg border border-[var(--border-subtle-alt)]">
                <span className="text-sm font-medium text-[var(--text-muted)] flex items-center gap-3"><Activity size={16}/> Pending Gate Pass</span>
                <span className="font-bold text-amber-500">{vehicleStats.pendingGatePass}</span>
              </div>
            </div>
              
            {/* Recently Allocated Vehicles Table */}
              <div className="mt-8 border border-[var(--border-subtle-alt)] rounded-xl overflow-hidden">
                <div className="bg-[var(--bg-base)] px-4 py-3 border-b border-[var(--border-subtle-alt)]">
                  <h3 className="text-sm font-semibold text-[var(--text-main)]">Recently Allocated Vehicles</h3>
                </div>
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[var(--bg-base)] text-[var(--text-muted)] sticky top-0">
                      <tr>
                        <th className="py-2 px-4 font-medium">Vehicle No</th>
                        <th className="py-2 px-4 font-medium">Driver</th>
                        <th className="py-2 px-4 font-medium">Dispatch No</th>
                        <th className="py-2 px-4 font-medium">Material</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle-alt)]">
                      {dispatches.filter((d: any) => d.gatePass).length > 0 ? (
                        dispatches.filter((d: any) => d.gatePass).map((d: any) => (
                          <tr key={d.id} className="hover:bg-[var(--bg-base)] transition-colors">
                            <td className="py-2 px-4 font-medium text-emerald-400">{d.gatePass.vehicleNo}</td>
                            <td className="py-2 px-4 text-[var(--text-main)]">{d.gatePass.driverName || 'N/A'}</td>
                            <td className="py-2 px-4 text-[var(--text-muted)]">{d.dispatchNo}</td>
                            <td className="py-2 px-4 text-[var(--text-muted)]">{d.item} ({d.quantity} MT)</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-[var(--text-muted)]">No allocated vehicles found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            <div className="mt-6 flex gap-4">
              <button onClick={() => setIsGatePassModalOpen(true)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium flex justify-center items-center gap-2">
                <Truck size={16}/> Allocate Vehicle
              </button>
            </div>
          </div>
        )}

        {currentTab === 'weight_verification' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <Scale size={20} className="text-[var(--text-muted)]"/> Weight Verification (OUTWARD)
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[var(--bg-base)] text-[var(--text-muted)]">
                  <tr>
                    <th className="py-2 px-4 font-medium">Vehicle No</th>
                    <th className="py-2 px-4 font-medium">Dispatch No</th>
                    <th className="py-2 px-4 font-medium">Material</th>
                    <th className="py-2 px-4 font-medium">Tare Weight</th>
                    <th className="py-2 px-4 font-medium">Gross Weight</th>
                    <th className="py-2 px-4 font-medium">Status</th>
                    <th className="py-2 px-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle-alt)]">
                  {weightVerifications.length > 0 ? (
                    weightVerifications.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-[var(--bg-base)] transition-colors">
                        <td className="py-3 px-4 font-medium text-[var(--text-main)]">{tx.vehicleNo}</td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">{tx.gatePass?.dispatch?.dispatchNo || 'N/A'}</td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">{tx.materialType}</td>
                        <td className="py-3 px-4 text-[var(--text-main)]">{tx.tareWeight || '--'} kg</td>
                        <td className="py-3 px-4 text-[var(--text-main)]">{tx.grossWeight || '--'} kg</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${tx.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {tx.status !== 'COMPLETED' && (
                            <button 
                              onClick={() => {
                                setSelectedWeightTx(tx);
                                setWeightForm({
                                  tareWeight: tx.tareWeight || '',
                                  grossWeight: tx.grossWeight || '',
                                  netWeight: tx.netWeight || ''
                                });
                                setIsWeightModalOpen(true);
                              }}
                              className="text-blue-500 hover:text-blue-400 text-xs border border-blue-500/30 px-2 py-1 rounded"
                            >
                              Record Weight
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-[var(--text-muted)]">No outward vehicles found at weighbridge.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {currentTab === 'inventory_deduction' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <PackageMinus size={20} className="text-[var(--text-muted)]"/> Inventory Deduction Ledger
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[var(--bg-base)] text-[var(--text-muted)]">
                  <tr>
                    <th className="py-2 px-4 font-medium">Date</th>
                    <th className="py-2 px-4 font-medium">Item Type</th>
                    <th className="py-2 px-4 font-medium">Quantity Deducted</th>
                    <th className="py-2 px-4 font-medium">Reference</th>
                    <th className="py-2 px-4 font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle-alt)]">
                  {inventoryDeductions.length > 0 ? (
                    inventoryDeductions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-[var(--bg-base)] transition-colors">
                        <td className="py-3 px-4 font-medium text-[var(--text-main)]">
                          {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-main)] font-semibold">{tx.itemType}</td>
                        <td className="py-3 px-4 text-red-400 font-bold">-{tx.quantity} MT</td>
                        <td className="py-3 px-4 text-blue-400">{tx.reference || '--'}</td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">{tx.remarks || '--'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[var(--text-muted)]">No recent inventory deductions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {currentTab === 'finance_management' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <span className="font-bold">₹</span> Finance Overview
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--text-muted)]">Today's Sales</span>
                <span className="font-bold text-[var(--text-main)]">₹ {financeOverview.todaysSales?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--text-muted)]">Today's Collection</span>
                <span className="font-bold text-emerald-500">₹ {financeOverview.todaysCollection?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--text-muted)]">Outstanding Amount</span>
                <span className="font-bold text-rose-500">₹ {financeOverview.outstandingAmount?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--text-muted)]">Pending Invoices</span>
                <span className="font-bold text-amber-500">{financeOverview.pendingInvoices || 0}</span>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-semibold text-[var(--text-main)] mb-4">Recent Transactions</h3>
              <div className="space-y-3">
                {financeOverview.recentTransactions && financeOverview.recentTransactions.length > 0 ? (
                  financeOverview.recentTransactions.map((tx: any) => (
                    <div key={tx.id} className="flex justify-between items-center p-3 bg-[var(--bg-base)] rounded-lg border border-[var(--border-subtle)]">
                      <div>
                        <div className="text-sm font-medium text-[var(--text-main)]">{tx.partyName || 'Unknown Party'}</div>
                        <div className="text-xs text-[var(--text-muted)]">{tx.type} • {tx.referenceNo}</div>
                      </div>
                      <div className={`font-bold ${tx.type === 'SALE' ? 'text-[var(--text-main)]' : 'text-emerald-500'}`}>
                        {tx.type === 'SALE' ? '+' : '-'} ₹{tx.amount?.toLocaleString() || 0}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-[var(--text-muted)] text-center py-4">No recent transactions.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentTab === 'utility_management' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-[var(--text-main)] mb-6 flex items-center gap-2">
              <Settings size={20} className="text-[var(--text-muted)]"/> Utility & System
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--text-muted)]">Power Status</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${utilities.powerStatus === 'Normal' ? 'bg-green-500/20 text-green-400' : 'bg-rose-500/20 text-rose-400'}`}>{utilities.powerStatus}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--text-muted)]">Last Backup</span>
                <span className="font-bold text-[var(--text-main)]">{utilities.lastBackup ? new Date(utilities.lastBackup).toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--text-muted)]">Database Size</span>
                <span className="font-bold text-[var(--text-main)]">{utilities.databaseSize}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--text-muted)]">System Uptime</span>
                <span className="font-bold text-[var(--text-main)]">{utilities.systemUptime}</span>
              </div>
            </div>
            <div className="mt-8">
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium">
                System Utilities
              </button>
            </div>
          </div>
        )}
        
        {currentTab === 'finance_dashboard' && (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-12 text-center">
            <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">Finance Dashboard</h2>
            <p className="text-[var(--text-muted-alt)]">This section is currently empty and will be built out shortly.</p>
          </div>
        )}
      </div>

      {/* New Dispatch Modal */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-subtle)] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-main)]">New Dispatch Order</h2>
              <button onClick={() => setIsDispatchModalOpen(false)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateDispatch} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Date</label>
                <input 
                  type="date" 
                  value={dispatchForm.date}
                  onChange={e => setDispatchForm({...dispatchForm, date: e.target.value})}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Party Name *</label>
                <input 
                  required
                  type="text" 
                  value={dispatchForm.partyName}
                  onChange={e => setDispatchForm({...dispatchForm, partyName: e.target.value})}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  placeholder="e.g. Acme Traders"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Item / Product *</label>
                <select 
                  required
                  value={dispatchForm.item}
                  onChange={e => setDispatchForm({...dispatchForm, item: e.target.value})}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                >
                  <option value="PADDY">PADDY</option>
                  <option value="RICE">RICE</option>
                  <option value="BRAN">BRAN</option>
                  <option value="HUSK">HUSK</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Quantity (MT) *</label>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  value={dispatchForm.quantity}
                  onChange={e => setDispatchForm({...dispatchForm, quantity: e.target.value})}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsDispatchModalOpen(false)} className="px-4 py-2 text-[var(--text-muted)] hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors">
                  Create Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Gate Pass Modal */}
      {isGatePassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-subtle)] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-main)]">Generate Gate Pass</h2>
              <button onClick={() => setIsGatePassModalOpen(false)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleGenerateGatePass} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Select Pending Dispatch *</label>
                <select 
                  required
                  value={gatePassForm.dispatchId}
                  onChange={e => setGatePassForm({...gatePassForm, dispatchId: e.target.value})}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="">-- Select Dispatch --</option>
                  {/* @ts-ignore */}
                  {dispatches.filter(d => d.status === 'Pending' && !d.gatePassId).map(d => (
                    <option key={d.id} value={d.id}>
                      {d.dispatchNo} - {d.partyName} ({d.item})
                    </option>
                  ))}
                </select>
                {/* @ts-ignore */}
                {dispatches.filter(d => d.status === 'Pending' && !d.gatePassId).length === 0 && (
                  <p className="text-xs text-amber-500 mt-1">No pending dispatches found. Create one first.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Vehicle No. *</label>
                <input 
                  required
                  type="text" 
                  value={gatePassForm.vehicleNo}
                  onChange={e => setGatePassForm({...gatePassForm, vehicleNo: e.target.value})}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none uppercase"
                  placeholder="e.g. MH12AB1234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Driver Name</label>
                <input 
                  type="text" 
                  value={gatePassForm.driverName}
                  onChange={e => setGatePassForm({...gatePassForm, driverName: e.target.value})}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="Driver's Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Contact No.</label>
                <input 
                  type="tel" 
                  value={gatePassForm.contactNo}
                  onChange={e => setGatePassForm({...gatePassForm, contactNo: e.target.value})}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="10-digit mobile number"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsGatePassModalOpen(false)} className="px-4 py-2 text-[var(--text-muted)] hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-lg transition-colors">
                  Generate Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Dispatch Modal */}
      {isViewModalOpen && selectedDispatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-panel)] rounded-xl w-full max-w-lg border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-[var(--border-subtle)]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Truck className="text-blue-500" /> Dispatch Details
              </h2>
              <button onClick={() => setIsViewModalOpen(false)} className="text-[var(--text-muted)] hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[var(--text-muted)] block mb-1">Dispatch No</span>
                  <span className="font-medium text-white">{selectedDispatch.dispatchNo}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block mb-1">Date</span>
                  <span className="font-medium text-white">{new Date(selectedDispatch.date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block mb-1">Party Name</span>
                  <span className="font-medium text-white">{selectedDispatch.partyName}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block mb-1">Item</span>
                  <span className="font-medium text-white">{selectedDispatch.item}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block mb-1">Quantity (MT)</span>
                  <span className="font-medium text-white">{selectedDispatch.quantity}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block mb-1">Status</span>
                  <span className={`font-medium ${selectedDispatch.status === 'Completed' ? 'text-emerald-400' : selectedDispatch.status === 'In Transit' ? 'text-amber-400' : 'text-blue-400'}`}>
                    {selectedDispatch.status}
                  </span>
                </div>
              </div>

              {selectedDispatch.gatePass ? (
                <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <h3 className="font-semibold text-emerald-400 mb-3 flex items-center gap-2"><CheckCircle2 size={16}/> Gate Pass Generated</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[var(--text-muted)] block mb-1">Vehicle No</span>
                      <span className="text-white">{selectedDispatch.gatePass.vehicleNo}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block mb-1">Driver Name</span>
                      <span className="text-white">{selectedDispatch.gatePass.driverName || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 flex items-center gap-2">
                  <Activity size={16}/> No gate pass generated yet.
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-base)] flex justify-end">
              <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] text-white font-medium rounded-lg transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weight Entry Modal */}
      {isWeightModalOpen && selectedWeightTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-subtle)] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2"><Scale size={18}/> Live Weighbridge</h2>
              <button onClick={() => setIsWeightModalOpen(false)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitWeight} className="p-6 space-y-6">
              <div className="bg-black border border-[var(--border-subtle)] rounded-lg p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                <span className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> Indicator Connected</span>
                <button type="button" onClick={handleReadWeighbridge} className="text-4xl font-bold font-mono text-white tracking-wider flex items-baseline gap-2 mb-2 hover:scale-105 transition-transform">
                  {weightForm.tareWeight && weightForm.grossWeight ? weightForm.grossWeight : weightForm.tareWeight ? weightForm.tareWeight : '00000'} <span className="text-lg text-[var(--text-muted)]">kg</span>
                </button>
                <p className="text-xs text-[var(--text-muted)]">Click weight to capture from Serial Port</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Tare Weight (kg)</label>
                    <input 
                      readOnly
                      type="text" 
                      value={weightForm.tareWeight}
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Gross Weight (kg)</label>
                    <input 
                      readOnly
                      type="text" 
                      value={weightForm.grossWeight}
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-main)] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted-alt)] mb-1">Calculated Net Weight (MT)</label>
                  <input 
                    readOnly
                    type="text" 
                    value={weightForm.netWeight}
                    className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-emerald-400 font-bold outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border-subtle-alt)]">
                <button type="button" onClick={() => setIsWeightModalOpen(false)} className="px-4 py-2 text-[var(--text-muted)] hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={!weightForm.tareWeight || !weightForm.grossWeight} className="px-6 py-2 bg-blue-600 disabled:opacity-50 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors">
                  Finalize Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

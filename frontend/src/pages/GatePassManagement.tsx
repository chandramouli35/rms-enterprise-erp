import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Truck, LogIn, LogOut, QrCode, ShieldAlert, ShieldCheck, ArrowUp, ArrowDown, Search, Eye, RefreshCw, Plus, Printer, CheckCircle2, Download } from 'lucide-react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { QRCodeCanvas } from 'qrcode.react';
import { usePlantStore } from '../store/plantStore';
import { CustomModal } from '../components/CustomModal';
import { useUiStore } from '../store/uiStore';

const API_URL = 'http://localhost:3000/api';

export const GatePassManagement = () => {
 const [searchParams] = useSearchParams();
 const activeTab = searchParams.get('tab') || 'gate_in';
 const activePlant = usePlantStore(state => state.activePlant);
 const [suppliers, setSuppliers] = useState<any[]>([]);
 const [recentEntries, setRecentEntries] = useState<any[]>([]);
 const [duplicateLogs, setDuplicateLogs] = useState<any[]>([]);
 const [analytics, setAnalytics] = useState<any>({
 totalGateIn: 0,
 totalGateOut: 0,
 qrScanned: 0,
 duplicatesBlocked: 0,
 activeGatePass: 0
 });
 
 // Form State
 const defaultFormData = {
 plantId: activePlant?.id || '',
 entryDateTime: new Date().toISOString().substring(0, 16),
 gate: 'Main Gate',
 vehicleNo: '',
 vehicleType: 'Truck',
 driverName: '',
 driverMobile: '',
 purpose: 'Paddy Purchase',
 supplierId: '',
 challanNo: '',
 noOfBags: '',
 grossWeight: '',
 tareWeight: '',
 netWeight: 0,
 remarks: '',
 scanQr: ''
 };
 const [formData, setFormData] = useState(defaultFormData);
 const [generatedPass, setGeneratedPass] = useState<any>(null);

 const [viewPassModalOpen, setViewPassModalOpen] = useState(false);
 const [selectedPass, setSelectedPass] = useState<any>(null);

 // Scanner State
 const [isScannerActive, setIsScannerActive] = useState(false);
 const [scannedData, setScannedData] = useState('');
 const [isScanning, setIsScanning] = useState(false);

 const handleScannerInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
 if (e.key === 'Enter') {
 setIsScanning(true);
 
 try {
 // Extract pass ID from the scanned text
 // Example text: "Gate Pass : GIN-2026-00001\nVehicle : ..."
 const match = scannedData.match(/Gate Pass : (G(?:IN|OUT)-\d+-\d+)/);
 let passId = scannedData.trim();
 
 if (match && match[1]) {
 passId = match[1];
 }

 const response = await axios.get(`http://localhost:3000/api/gate-pass/scan/${passId}`);
 
 if (response.data) {
 // Pass found, show the details modal
 setSelectedPass(response.data);
 setViewPassModalOpen(true);
 }
 } catch (error: any) {
 if (error.response?.status === 404) {
 useUiStore.getState().addToast('Gate pass not found in the system. It may be invalid or from another plant.', 'error');
 } else {
 useUiStore.getState().addToast('Failed to verify gate pass. Please check your connection.', 'error');
 }
 } finally {
 setIsScanning(false);
 setScannedData(''); // Reset for next scan
 }
 }
 };

 const handlePrint = () => {
 if (!selectedPass) return;
 const qrCanvas = document.getElementById('modal-qr') as HTMLCanvasElement;
 const qrDataUrl = qrCanvas ? qrCanvas.toDataURL() : '';
 
 const printContent = `
 <html>
 <head>
 <title>Gate Pass - ${selectedPass.qrCode}</title>
 <style>
 body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #000; }
 .pass-container { max-width: 400px; margin: 0 auto; border: 2px solid #333; padding: 20px; border-radius: 12px; }
 .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
 .header h2 { margin: 0 0 5px 0; font-size: 24px; }
 .header p { margin: 0; font-weight: bold; font-size: 14px; text-transform: uppercase; border: 2px solid #000; display: inline-block; padding: 4px 8px; border-radius: 4px; }
 .details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
 .label { font-size: 11px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
 .value { font-size: 14px; font-weight: bold; }
 .qr-code { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px dashed #ccc; }
 .qr-code img { max-width: 120px; }
 .qr-label { font-size: 12px; font-weight: bold; margin-top: 10px; }
 .footer { margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
 .sign { border-top: 1px solid #000; width: 100px; text-align: center; padding-top: 5px; font-size: 10px; font-weight: bold; }
 </style>
 </head>
 <body>
 <div class="pass-container">
 <div class="header">
 <h2>RICE MILL</h2>
 <p>GATE ${activeTab === 'gate_in' ? 'IN' : 'OUT'} PASS</p>
 </div>
 <div class="details">
 <div><div class="label">Pass No.</div><div class="value">${selectedPass.qrCode}</div></div>
 <div><div class="label">Date & Time</div><div class="value">${new Date(selectedPass.createdAt).toLocaleString()}</div></div>
 <div><div class="label">Vehicle No.</div><div class="value">${selectedPass.vehicleNo}</div></div>
 <div><div class="label">Vehicle Type</div><div class="value">${selectedPass.vehicleType || 'N/A'}</div></div>
 <div><div class="label">Driver Name</div><div class="value">${selectedPass.driverName}</div></div>
 <div><div class="label">Material</div><div class="value">${selectedPass.material || selectedPass.purpose || 'N/A'}</div></div>
 <div><div class="label">Gross Weight</div><div class="value">${selectedPass.grossWeight ? selectedPass.grossWeight + ' MT' : 'N/A'}</div></div>
 <div><div class="label">Tare Weight</div><div class="value">${selectedPass.tareWeight ? selectedPass.tareWeight + ' MT' : 'N/A'}</div></div>
 <div><div class="label">Net Weight</div><div class="value">${selectedPass.netWeight ? selectedPass.netWeight + ' MT' : 'N/A'}</div></div>
 <div><div class="label">Remarks</div><div class="value">${selectedPass.remarks || 'None'}</div></div>
 </div>
 <div class="qr-code">
 ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" />` : ''}
 <div class="qr-label">Scan at Gate ${activeTab === 'gate_in' ? 'Out' : 'In'}</div>
 </div>
 <div class="footer">
 <div class="sign">Authorized Sign</div>
 <div class="sign">Driver Sign</div>
 </div>
 </div>
 <script>
 window.onload = function() {
 window.print();
 setTimeout(function() { window.close(); }, 500);
 }
 </script>
 </body>
 </html>
 `;
 const printWindow = window.open('', '_blank');
 if (printWindow) {
 printWindow.document.write(printContent);
 printWindow.document.close();
 }
 };

 const handleDownload = () => {
 if (!selectedPass) return;
 
 // Convert the data we need to CSV
 const headers = ['Pass No', 'Entry Time', 'Vehicle No', 'Vehicle Type', 'Driver Name', 'Driver Mobile', 'Supplier', 'Material', 'Gross Weight', 'Tare Weight', 'Net Weight', 'No of Bags', 'Remarks'];
 const row = [
 selectedPass.qrCode,
 new Date(selectedPass.createdAt).toLocaleString(),
 selectedPass.vehicleNo,
 selectedPass.vehicleType || 'N/A',
 selectedPass.driverName,
 selectedPass.contactNo || 'N/A',
 selectedPass.supplier?.name || 'N/A',
 selectedPass.material || selectedPass.purpose || 'N/A',
 selectedPass.grossWeight || 0,
 selectedPass.tareWeight || 0,
 selectedPass.netWeight || 0,
 selectedPass.noOfBags || 0,
 selectedPass.remarks || 'None'
 ];
 
 const csvContent = headers.join(',') + '\n' + row.map(v => `"${v}"`).join(',');
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const link = document.createElement('a');
 const url = URL.createObjectURL(blob);
 link.setAttribute('href', url);
 link.setAttribute('download', `gate_pass_${selectedPass.qrCode}.csv`);
 link.style.visibility = 'hidden';
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 useEffect(() => {
 if (activePlant?.id) {
 setFormData(prev => ({ ...prev, plantId: activePlant.id }));
 fetchData();
 }
 }, [activePlant, activeTab]);

 const fetchData = async () => {
 if (!activePlant?.id) return;
 try {
 const [resAnalytics, resRecent, resSuppliers, resLogs] = await Promise.all([
 axios.get(`${API_URL}/gate-pass/analytics/${activePlant.id}`),
 axios.get(`${API_URL}/gate-pass/recent/${activePlant.id}?type=${activeTab === 'gate_in' ? 'INWARD' : 'OUTWARD'}`),
 axios.get(`${API_URL}/procurement/suppliers`),
 axios.get(`${API_URL}/gate-pass/duplicate-logs/${activePlant.id}`)
 ]);
 setAnalytics(resAnalytics.data);
 setRecentEntries(resRecent.data);
 setSuppliers(resSuppliers.data);
 setDuplicateLogs(resLogs.data.slice(0, 3)); // Show top 3 recent logs
 } catch (error) {
 console.error('Failed to fetch gate pass data:', error);
 }
 };

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
 const { name, value } = e.target;
 setFormData(prev => {
 const updated = { ...prev, [name]: value };
 if (name === 'grossWeight' || name === 'tareWeight') {
 const gross = name === 'grossWeight' ? parseFloat(value) || 0 : parseFloat(prev.grossWeight as any) || 0;
 const tare = name === 'tareWeight' ? parseFloat(value) || 0 : parseFloat(prev.tareWeight as any) || 0;
 updated.netWeight = gross - tare;
 }
 return updated;
 });
 };

 const handleReset = () => {
 setFormData({ ...defaultFormData, plantId: activePlant?.id || '' });
 setGeneratedPass(null);
 };

 const handleGeneratePass = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!formData.plantId) return;
 try {
 const type = activeTab === 'gate_in' ? 'INWARD' : 'OUTWARD';
 const response = await axios.post(`${API_URL}/gate-pass/generate`, {
 ...formData,
 passType: type,
 grossWeight: formData.grossWeight ? parseFloat(formData.grossWeight as any) : null,
 tareWeight: formData.tareWeight ? parseFloat(formData.tareWeight as any) : null,
 netWeight: formData.netWeight ? parseFloat(formData.netWeight as any) : null,
 noOfBags: formData.noOfBags ? parseInt(formData.noOfBags as any) : null
 });

 const pass = response.data;
 const supplierName = suppliers.find(s => s.id === pass.supplierId)?.name || 'N/A';

 setGeneratedPass({
 passNo: pass.qrCode, // Use the generated qrCode (which includes prefix-year-seq)
 qrCode: pass.qrCode,
 date: new Date(pass.createdAt).toLocaleString(),
 vehicleNo: pass.vehicleNo,
 vehicleType: pass.vehicleType,
 supplier: supplierName,
 material: pass.material,
 netWeight: pass.netWeight || 0,
 noOfBags: pass.noOfBags || '0'
 });
 
 // Refresh Data
 fetchData();
 
 // Reset form but keep plant ID
 setFormData({ ...defaultFormData, plantId: activePlant?.id || '' });
 } catch (error: any) {
 if (error.response?.status === 409) {
 useUiStore.getState().addToast(error.response.data.message || 'Vehicle already has an active pass.', 'error');
 } else {
 useUiStore.getState().addToast('Failed to generate gate pass', 'error');
 }
 console.error('Error generating pass', error);
 }
 };

 const activeCount = analytics.activeGatePass || 0;
 const chartData: any[] = activeCount > 0 ? [
 { name: 'Waiting for Tare Wt', value: Math.ceil(activeCount * 0.5), color: '#e67e00' },
 { name: 'Loading / Unloading', value: Math.floor(activeCount * 0.3), color: '#3b82f6' },
 { name: 'In Transit', value: activeCount - Math.ceil(activeCount * 0.5) - Math.floor(activeCount * 0.3), color: '#22c55e' }
 ].filter(d => d.value > 0) : [
 { name: 'No Vehicles', value: 1, color: '#1a1a1a', isPlaceholder: true }
 ];

 return (
 <div className="flex flex-col h-full text-[var(--text-main)]">
 <div className="grid grid-cols-5 gap-4 mb-6 flex-shrink-0">
 <div className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle-alt)] flex flex-col justify-center">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-blue-500/10 rounded-lg"><LogIn size={20} className="text-blue-500" /></div>
 <p className="text-[var(--text-muted-alt)] text-sm font-medium">Total Gate In</p>
 </div>
 <div className="flex items-end justify-between">
 <div>
 <h3 className="text-3xl font-bold">{analytics.totalGateIn}</h3>
 <p className="text-[var(--text-muted-alt)] text-xs mt-1">Today</p>
 </div>
 <div className="flex items-center text-green-500 text-sm font-medium">
 <ArrowUp size={14} className="mr-1" /> 12% <span className="text-[var(--text-muted-alt)] ml-1 text-xs">vs yesterday</span>
 </div>
 </div>
 </div>

 <div className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle-alt)] flex flex-col justify-center">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-green-500/10 rounded-lg"><LogOut size={20} className="text-green-500" /></div>
 <p className="text-[var(--text-muted-alt)] text-sm font-medium">Total Gate Out</p>
 </div>
 <div className="flex items-end justify-between">
 <div>
 <h3 className="text-3xl font-bold">{analytics.totalGateOut}</h3>
 <p className="text-[var(--text-muted-alt)] text-xs mt-1">Today</p>
 </div>
 <div className="flex items-center text-green-500 text-sm font-medium">
 <ArrowUp size={14} className="mr-1" /> 8% <span className="text-[var(--text-muted-alt)] ml-1 text-xs">vs yesterday</span>
 </div>
 </div>
 </div>

 <div className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle-alt)] flex flex-col justify-center">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-amber-500/10 rounded-lg"><QrCode size={20} className="text-amber-500" /></div>
 <p className="text-[var(--text-muted-alt)] text-sm font-medium">QR / Barcode Scanned</p>
 </div>
 <div className="flex items-end justify-between">
 <div>
 <h3 className="text-3xl font-bold">{analytics.qrScanned}</h3>
 <p className="text-[var(--text-muted-alt)] text-xs mt-1">Today</p>
 </div>
 <div className="flex items-center text-amber-500 text-sm font-medium">
 <ArrowUp size={14} className="mr-1" /> 15% <span className="text-[var(--text-muted-alt)] ml-1 text-xs">vs yesterday</span>
 </div>
 </div>
 </div>

 <div className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle-alt)] flex flex-col justify-center">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-purple-500/10 rounded-lg"><ShieldAlert size={20} className="text-purple-500" /></div>
 <p className="text-[var(--text-muted-alt)] text-sm font-medium">Duplicate Blocked</p>
 </div>
 <div className="flex items-end justify-between">
 <div>
 <h3 className="text-3xl font-bold">{analytics.duplicatesBlocked}</h3>
 <p className="text-[var(--text-muted-alt)] text-xs mt-1">Today</p>
 </div>
 <div className="flex items-center text-red-500 text-sm font-medium">
 <ArrowDown size={14} className="mr-1" /> 20% <span className="text-[var(--text-muted-alt)] ml-1 text-xs">vs yesterday</span>
 </div>
 </div>
 </div>

 <div className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle-alt)] flex flex-col justify-center">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-blue-500/10 rounded-lg"><ShieldCheck size={20} className="text-blue-500" /></div>
 <p className="text-[var(--text-muted-alt)] text-sm font-medium">Active Gate Pass</p>
 </div>
 <div className="flex items-end justify-between">
 <div>
 <h3 className="text-3xl font-bold text-blue-400">{analytics.activeGatePass}</h3>
 <p className="text-[var(--text-muted-alt)] text-xs mt-1">In Campus</p>
 </div>
 </div>
 </div>
 </div>



 {/* DYNAMIC WORKSPACE */}
 <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col space-y-6 pb-6">
 
 {(activeTab === 'gate_in' || activeTab === 'gate_out') && (
 <div className="grid grid-cols-12 gap-6">
 
 {/* COLUMN 1: FORM (33%) -> approx 4 cols out of 12 */}
 <div className="col-span-12 lg:col-span-4 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] p-5">
 <h2 className="text-lg font-semibold mb-4 text-[var(--text-main)]">Create Gate {activeTab === 'gate_in' ? 'In' : 'Out'} Pass</h2>
 <form onSubmit={handleGeneratePass} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Entry Date & Time <span className="text-red-500">*</span></label>
 <input type="datetime-local" name="entryDateTime" value={formData.entryDateTime} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none css-color-scheme-dark" required />
 </div>
 <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Gate <span className="text-red-500">*</span></label>
 <select name="gate" value={formData.gate} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none appearance-none">
 <option value="Main Gate">Main Gate</option>
 <option value="Gate 2">Gate 2</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Vehicle No. <span className="text-red-500">*</span></label>
 <input type="text" name="vehicleNo" placeholder="e.g. UP32 AB 1234" value={formData.vehicleNo} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none uppercase" required />
 </div>
 <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Vehicle Type <span className="text-red-500">*</span></label>
 <select name="vehicleType" value={formData.vehicleType} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none appearance-none">
 <option value="Truck">Truck</option>
 <option value="Tractor">Tractor</option>
 <option value="Mini Truck">Mini Truck</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Driver Name <span className="text-red-500">*</span></label>
 <input type="text" name="driverName" value={formData.driverName} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" required />
 </div>
 <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Driver Mobile</label>
 <input type="text" name="driverMobile" value={formData.driverMobile} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Purpose / Material <span className="text-red-500">*</span></label>
 <select name="purpose" value={formData.purpose} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none appearance-none">
 <option value="Paddy Purchase">Paddy Purchase</option>
 <option value="Dispatch">Dispatch</option>
 <option value="Inter-Plant">Inter-Plant</option>
 </select>
 </div>
 <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">{activeTab === 'gate_in' ? 'From (Supplier / Party)' : 'To (Party)'} <span className="text-red-500">*</span></label>
 <select name="supplierId" value={formData.supplierId} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none appearance-none" required>
 <option value="">Select Account</option>
 {suppliers.map(s => (
 <option key={s.id} value={s.id}>{s.name}</option>
 ))}
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Challan / Ref No.</label>
 <input type="text" name="challanNo" value={formData.challanNo} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
 </div>
 <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">No. of Bags</label>
 <input type="number" name="noOfBags" value={formData.noOfBags} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" min="0" />
 </div>
 </div>

 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium truncate">Gross Wt (MT)</label>
 <input type="number" step="0.001" name="grossWeight" value={formData.grossWeight} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" min="0" />
 </div>
 <div>
 <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium truncate">Tare Wt (MT)</label>
 <input type="number" step="0.001" name="tareWeight" value={formData.tareWeight} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" min="0" />
 </div>
 <div>
 <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium truncate">Net Wt (MT)</label>
 <div className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] font-medium bg-opacity-50 text-center">
 {formData.netWeight.toFixed(3)}
 </div>
 </div>
 </div>

 <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Remarks</label>
 <textarea name="remarks" value={formData.remarks} onChange={handleInputChange} rows={2} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none resize-none"></textarea>
 </div>

 <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Scan QR / Barcode (Optional)</label>
 <div className="relative">
 <input type="text" name="scanQr" placeholder="Scan or Enter QR / Barcode" value={formData.scanQr} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 pr-10 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
 <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 p-1 hover:bg-blue-500/10 rounded">
 <QrCode size={16} />
 </button>
 </div>
 </div>

 <div className="flex items-center gap-3 pt-2">
 <button type="button" onClick={handleReset} className="px-6 py-2.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--glass-bg)] font-medium text-sm transition">
 Reset
 </button>
 <button type="submit" className="flex-1 bg-[#e67e00] hover:bg-[#d67500] text-black font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2">
 <CheckCircle2 size={18} /> Generate Gate {activeTab === 'gate_in' ? 'In' : 'Out'} Pass
 </button>
 </div>
 </form>
 </div>

 {/* COLUMN 2: RECENT ENTRIES GRID (38%) -> approx 5 cols out of 12 */}
 <div className="col-span-12 lg:col-span-5 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] p-5 flex flex-col">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-semibold text-[var(--text-main)]">Recent Gate {activeTab === 'gate_in' ? 'In' : 'Out'} Entries</h2>
 <button className="text-blue-500 text-sm font-medium hover:text-blue-400">View All</button>
 </div>
 
 <div className="overflow-x-auto flex-1">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-[var(--border-subtle)]">
 <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)]">Pass No.</th>
 <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)]">Entry Time</th>
 <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)]">Vehicle No.</th>
 <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)]">{activeTab === 'gate_in' ? 'From / Supplier' : 'To / Party'}</th>
 <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)]">Material</th>
 <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] text-right">Net Wt (MT)</th>
 <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] text-center">Status</th>
 <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] text-center">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {recentEntries.length > 0 ? recentEntries.map((row, i) => (
 <tr key={i} className="hover:bg-[var(--glass-bg)] group">
 <td className="py-3 text-xs font-medium text-[var(--text-muted)]">{row.qrCode}</td>
 <td className="py-3 text-[11px] text-[var(--text-muted-alt)]">{new Date(row.createdAt).toLocaleString()}</td>
 <td className="py-3 text-xs font-medium text-[var(--text-muted)]">{row.vehicleNo}</td>
 <td className="py-3 text-[11px] text-[var(--text-muted-alt)] truncate max-w-[100px]">{row.supplier?.name || 'N/A'}</td>
 <td className="py-3 text-[11px] text-[var(--text-muted-alt)]">{row.material || row.purpose}</td>
 <td className="py-3 text-xs font-medium text-[var(--text-muted)] text-right">{row.netWeight ? Number(row.netWeight).toFixed(3) : '-'}</td>
 <td className="py-3 text-center">
 <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${row.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
 {row.status}
 </span>
 </td>
 <td className="py-3 text-center">
 <button onClick={() => { setSelectedPass(row); setViewPassModalOpen(true); }} className="text-blue-500/50 group-hover:text-blue-500 transition"><Eye size={14} /></button>
 </td>
 </tr>
 )) : (
 <tr>
 <td colSpan={8} className="py-8 text-center text-sm text-[var(--text-muted-alt)]">No recent entries found.</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
 <p className="text-xs text-[var(--text-muted-alt)]">Showing {recentEntries.length > 0 ? 1 : 0} to {recentEntries.length} of {recentEntries.length} entries</p>
 <div className="flex items-center space-x-1">
 <button className="px-2.5 py-1 rounded bg-[var(--glass-bg)] border border-[var(--border-subtle)] text-[var(--text-muted-alt)] hover:bg-[var(--glass-bg)] text-sm">&lt;</button>
 <button className="px-2.5 py-1 rounded bg-blue-600 text-[var(--text-main)] font-medium text-sm">1</button>
 <button className="px-2.5 py-1 rounded bg-[var(--glass-bg)] border border-[var(--border-subtle)] text-[var(--text-muted-alt)] hover:bg-[var(--glass-bg)] text-sm">2</button>
 <button className="px-2.5 py-1 rounded bg-[var(--glass-bg)] border border-[var(--border-subtle)] text-[var(--text-muted-alt)] hover:bg-[var(--glass-bg)] text-sm">3</button>
 <span className="text-gray-600 px-1">...</span>
 <button className="px-2.5 py-1 rounded bg-[var(--glass-bg)] border border-[var(--border-subtle)] text-[var(--text-muted-alt)] hover:bg-[var(--glass-bg)] text-sm">10</button>
 <button className="px-2.5 py-1 rounded bg-[var(--glass-bg)] border border-[var(--border-subtle)] text-[var(--text-muted-alt)] hover:bg-[var(--glass-bg)] text-sm">&gt;</button>
 </div>
 </div>
 </div>

 {/* COLUMN 3: PREVIEW VOUCHER (29%) -> approx 3 cols out of 12 */}
 <div className="col-span-12 lg:col-span-3 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] p-5 flex flex-col">
 <h2 className="text-lg font-semibold mb-4 text-[var(--text-main)]">Gate {activeTab === 'gate_in' ? 'In' : 'Out'} Pass Preview</h2>
 
 <div className="bg-white rounded-xl flex-1 flex flex-col text-black shadow-lg overflow-hidden relative">
 {/* Voucher Header */}
 <div className="p-4 border-b-2 border-gray-100 flex items-start justify-between">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-[var(--text-main)] font-bold italic">R</div>
 <div>
 <h3 className="font-bold text-sm leading-tight text-gray-800">RICE MILL</h3>
 <p className="text-[9px] text-[var(--text-muted-alt)] uppercase font-semibold">Management System</p>
 </div>
 </div>
 <div className={`px-2 py-1 border-2 rounded text-[10px] font-bold uppercase ${activeTab === 'gate_in' ? 'border-green-600 text-green-600' : 'border-blue-600 text-blue-600'}`}>
 GATE {activeTab === 'gate_in' ? 'IN' : 'OUT'} PASS
 </div>
 </div>

 {/* Voucher Body */}
 <div className="p-4 flex-1 flex flex-col">
 {generatedPass ? (
 <>
 <div className="grid grid-cols-2 gap-y-4 mb-4">
 <div>
 <p className="text-[10px] text-[var(--text-muted-alt)] uppercase font-semibold mb-0.5">Pass No.</p>
 <p className="font-bold text-sm">{generatedPass.passNo}</p>
 </div>
 <div>
 <p className="text-[10px] text-[var(--text-muted-alt)] uppercase font-semibold mb-0.5">Date & Time</p>
 <p className="font-bold text-sm">{generatedPass.date}</p>
 </div>
 <div>
 <p className="text-[10px] text-[var(--text-muted-alt)] uppercase font-semibold mb-0.5">Vehicle No.</p>
 <p className="font-bold text-sm">{generatedPass.vehicleNo || 'N/A'}</p>
 </div>
 <div>
 <p className="text-[10px] text-[var(--text-muted-alt)] uppercase font-semibold mb-0.5">Vehicle Type</p>
 <p className="font-bold text-sm">{generatedPass.vehicleType || 'N/A'}</p>
 </div>
 <div>
 <p className="text-[10px] text-[var(--text-muted-alt)] uppercase font-semibold mb-0.5">{activeTab === 'gate_in' ? 'From / Supplier' : 'To / Party'}</p>
 <p className="font-bold text-sm">{generatedPass.supplier || 'N/A'}</p>
 </div>
 <div>
 <p className="text-[10px] text-[var(--text-muted-alt)] uppercase font-semibold mb-0.5">Material</p>
 <p className="font-bold text-sm">{generatedPass.material || 'N/A'}</p>
 </div>
 <div>
 <p className="text-[10px] text-[var(--text-muted-alt)] uppercase font-semibold mb-0.5">Net Wt (MT)</p>
 <p className="font-bold text-sm">{Number(generatedPass.netWeight).toFixed(3)}</p>
 </div>
 <div>
 <p className="text-[10px] text-[var(--text-muted-alt)] uppercase font-semibold mb-0.5">No. of Bags</p>
 <p className="font-bold text-sm">{generatedPass.noOfBags || 'N/A'}</p>
 </div>
 </div>

 <div className="mt-auto pt-4 border-t border-dashed border-gray-300 flex items-center justify-between">
 <div className="p-2 bg-gray-50 rounded-lg">
 <QRCodeCanvas 
 value={`Gate Pass : ${generatedPass.passNo}\nVehicle : ${generatedPass.vehicleNo || 'N/A'}\nDriver : ${generatedPass.driverName || 'N/A'}\nMaterial : ${generatedPass.material || 'N/A'}\nSupplier : ${generatedPass.supplier || 'N/A'}\nDate : ${generatedPass.date}\nType : ${activeTab === 'gate_in' ? 'INWARD' : 'OUTWARD'}`} 
 size={64} 
 level="M" 
 />
 </div>
 <div className="text-right flex-1 pl-4">
 <p className="text-[11px] text-[var(--text-muted-alt)] font-medium leading-tight">Scan at Gate {activeTab === 'gate_in' ? 'Out' : 'In'}<br/>for verification</p>
 </div>
 </div>
 </>
 ) : (
 <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg m-2">
 <p className="text-[var(--text-muted-alt)] font-medium text-sm tracking-wider">AWAITING GENERATION</p>
 </div>
 )}
 </div>

 {/* Voucher Footer */}
 <div className="bg-gray-50 p-3 border-t border-gray-100 flex items-center justify-between">
 <div className="flex items-center gap-1.5">
 <CheckCircle2 size={16} className="text-green-600" />
 <div>
 <p className="text-[10px] font-bold text-green-700">Authorized {activeTab === 'gate_in' ? 'Entry' : 'Exit'}</p>
 <p className="text-[8px] text-[var(--text-muted-alt)]">Valid for today only</p>
 </div>
 </div>
 <div className="border-b border-gray-400 w-24 text-right pb-1">
 <span className="text-[8px] text-[var(--text-muted-alt)] uppercase">Authorised Sign</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* BOTTOM DASHBOARD PANEL ROW */}
 {(activeTab === 'gate_in' || activeTab === 'gate_out') && (
 <div className="grid grid-cols-2 gap-6 mt-2">
 {/* LEFT: IN CAMPUS STATUS DONUT */}
 <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] p-5 flex flex-col">
 <div className="flex items-center justify-between mb-2">
 <h2 className="text-lg font-semibold text-[var(--text-main)]">In Campus / In Transit Status</h2>
 <button className="text-blue-500 text-sm font-medium hover:text-blue-400">View All</button>
 </div>
 <div className="flex-1 flex items-center">
 <div className="h-48 w-48 relative">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
 {chartData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip 
 contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
 itemStyle={{ color: '#fff' }}
 />
 </PieChart>
 </ResponsiveContainer>
 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
 <span className="text-xs text-[var(--text-muted-alt)] font-medium">Total</span>
 <span className="text-2xl font-bold text-[var(--text-main)]">{analytics.activeGatePass || 0}</span>
 <span className="text-[10px] text-[var(--text-muted-alt)]">Vehicles</span>
 </div>
 </div>
 <div className="flex-1 pl-8 space-y-4">
 {chartData.map((entry, index) => (
 <div key={index} className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
 <span className="text-sm text-[var(--text-muted)] font-medium">{entry.name}</span>
 </div>
 <div className="text-right">
 <span className="text-sm font-bold text-[var(--text-main)] block">{entry.isPlaceholder ? 0 : entry.value}</span>
 <span className="text-[10px] text-[var(--text-muted-alt)]">{entry.isPlaceholder ? '0.00' : (analytics.activeGatePass > 0 ? ((entry.value / analytics.activeGatePass) * 100).toFixed(2) : 0)}%</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="mt-4 pt-4 border-t border-[var(--border-subtle-alt)] text-center">
 <button className="text-blue-500 border border-blue-500/30 hover:bg-blue-500/10 px-4 py-1.5 rounded-lg text-sm font-medium transition w-full flex items-center justify-center gap-2">
 <Search size={16} /> View All In Campus Vehicles
 </button>
 </div>
 </div>

 {/* RIGHT: DUPLICATE PREVENTION ALERTS */}
 <div className="bg-[#1a1011] rounded-xl border border-[#3a1d20] p-5 flex flex-col relative overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[80px] rounded-full pointer-events-none"></div>
 
 <div className="flex items-center justify-between mb-4 relative z-10">
 <h2 className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
 <ShieldAlert className="text-red-500" size={20} /> Duplicate Prevention Alerts
 </h2>
 <button className="text-blue-500 text-sm font-medium hover:text-blue-400">View All</button>
 </div>

 <div className="flex-1 space-y-3 relative z-10">
 {duplicateLogs.length === 0 ? (
 <div className="text-center text-[var(--text-muted-alt)] text-sm py-4">No recent blocked attempts</div>
 ) : duplicateLogs.map((log: any, i: number) => (
 <div key={log.id || i} className="flex gap-4 p-3 rounded-lg border border-red-900/30 bg-red-950/20 items-start">
 <div className="mt-0.5 bg-red-500/20 p-1.5 rounded text-red-400">
 <ShieldCheck size={14} />
 </div>
 <div className="flex-1">
 <p className="text-sm font-semibold text-red-200">Vehicle: {log.vehicleNo}</p>
 <p className="text-xs text-red-400/70 mt-0.5">{log.reason}</p>
 </div>
 <div className="text-right min-w-[60px]">
 <p className="text-xs font-medium text-[var(--text-muted-alt)]">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
 <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-wider">Blocked</p>
 </div>
 </div>
 ))}
 </div>
 <div className="mt-4 pt-4 border-t border-red-900/30 text-center relative z-10">
 <button className="text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 px-4 py-1.5 rounded-lg text-sm font-medium transition w-full">
 View All Alerts
 </button>
 </div>
 </div>
 </div>
 )}

 {/* PLACEHOLDER TABS */}
 {activeTab === 'qr_barcode' && (
 <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-subtle)] rounded-xl bg-[var(--glass-bg)] py-20 relative overflow-hidden">
 {!isScannerActive ? (
 <>
 <div className="p-6 bg-amber-500/10 rounded-full mb-4">
 <QrCode size={48} className="text-amber-500" />
 </div>
 <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Hardware Scanner Mode</h2>
 <p className="text-[var(--text-muted-alt)] text-center max-w-md">Connect your barcode scanner or use the camera to scan entry/exit tickets quickly.</p>
 <button onClick={() => setIsScannerActive(true)} className="mt-6 bg-[#e67e00] text-black px-6 py-2.5 rounded-lg font-bold hover:bg-[#d67500] transition-colors">
 Initialize Scanner
 </button>
 </>
 ) : (
 <div className="flex flex-col items-center justify-center w-full max-w-lg animate-in fade-in zoom-in duration-300">
 <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
 {/* Scanning laser animation */}
 <div className="absolute inset-0 border-4 border-amber-500/30 rounded-3xl overflow-hidden">
 <div className="w-full h-1 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,1)] absolute top-0 left-0 animate-[scan_2s_ease-in-out_infinite]"></div>
 </div>
 <QrCode size={64} className="text-[var(--text-main)]/20" />
 {isScanning && (
 <div className="absolute inset-0 bg-amber-500/20 backdrop-blur-sm flex items-center justify-center rounded-3xl">
 <RefreshCw className="animate-spin text-amber-500" size={32} />
 </div>
 )}
 </div>
 
 <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">{isScanning ? 'Processing Scan...' : 'Scanner Ready'}</h2>
 <p className="text-[var(--text-muted-alt)] text-center mb-6">Aim your scanner at the QR code and scan.</p>
 
 <div className="w-full relative">
 <input 
 type="text" 
 autoFocus
 value={scannedData}
 onChange={(e) => setScannedData(e.target.value)}
 onKeyDown={handleScannerInput}
 placeholder="Scanner input will appear here..." 
 className="w-full bg-[var(--bg-panel)] border border-amber-500/50 rounded-lg px-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-all"
 disabled={isScanning}
 />
 <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
 <span className="flex h-2.5 w-2.5">
 <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-green-400 opacity-75"></span>
 <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
 </span>
 <span className="text-xs text-green-500 font-medium uppercase">Active</span>
 </div>
 </div>

 <button onClick={() => { setIsScannerActive(false); setScannedData(''); }} className="mt-8 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] underline text-sm transition-colors">
 Cancel & Return
 </button>
 </div>
 )}
 
 {/* Custom Tailwind Animation for the laser line */}
 <style>{`
 @keyframes scan {
 0%, 100% { transform: translateY(0); }
 50% { transform: translateY(184px); }
 }
 `}</style>
 </div>
 )}

 {activeTab === 'duplicate_prevention' && (
 <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-subtle)] rounded-xl bg-[var(--glass-bg)] py-20">
 <div className="p-6 bg-red-500/10 rounded-full mb-4">
 <ShieldAlert size={48} className="text-red-500" />
 </div>
 <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Security & Audit Logs</h2>
 <p className="text-[var(--text-muted-alt)] text-center max-w-md">Detailed history of all blocked duplicate attempts and security overrides.</p>
 <button className="mt-6 bg-[var(--glass-bg)] text-[var(--text-main)] px-6 py-2.5 rounded-lg font-medium border border-[var(--border-subtle)] hover:bg-white/20">View Full Audit Trail</button>
 </div>
 )}

 </div>
 
 {/* FOOTER MESSAGE */}
 <div className="mt-auto pt-4 border-t border-[var(--border-subtle)] flex-shrink-0 flex items-center gap-2 text-[var(--text-muted-alt)] text-xs">
 <ShieldCheck size={14} className="text-blue-500" />
 <span className="font-medium text-[var(--text-muted)]">Note:</span> All gate movements are monitored. Duplicate entries are automatically blocked to ensure data accuracy and security.
 </div>

 <CustomModal isOpen={viewPassModalOpen} onClose={() => setViewPassModalOpen(false)} title={`Gate ${activeTab === 'gate_in' ? 'In' : 'Out'} Pass Details`}>
 {selectedPass && (
 <div className="space-y-4">
 <div className="flex flex-col md:flex-row gap-6 items-start">
 <div className="flex-1 grid grid-cols-2 gap-4">
 <div>
 <p className="text-xs text-[var(--text-muted-alt)] font-medium">Pass No.</p>
 <p className="font-semibold text-[var(--text-main)]">{selectedPass.qrCode}</p>
 </div>
 <div>
 <p className="text-xs text-[var(--text-muted-alt)] font-medium">Entry Time</p>
 <p className="font-semibold text-[var(--text-main)]">{new Date(selectedPass.createdAt).toLocaleString()}</p>
 </div>
 <div>
 <p className="text-xs text-[var(--text-muted-alt)] font-medium">Vehicle No.</p>
 <p className="font-semibold text-[var(--text-main)]">{selectedPass.vehicleNo}</p>
 </div>
 <div>
 <p className="text-xs text-[var(--text-muted-alt)] font-medium">Vehicle Type</p>
 <p className="font-semibold text-[var(--text-main)]">{selectedPass.vehicleType || 'N/A'}</p>
 </div>
 <div>
 <p className="text-xs text-[var(--text-muted-alt)] font-medium">Driver Name</p>
 <p className="font-semibold text-[var(--text-main)]">{selectedPass.driverName}</p>
 </div>
 <div>
 <p className="text-xs text-[var(--text-muted-alt)] font-medium">Driver Mobile</p>
 <p className="font-semibold text-[var(--text-main)]">{selectedPass.contactNo || 'N/A'}</p>
 </div>
 <div>
 <p className="text-xs text-[var(--text-muted-alt)] font-medium">{activeTab === 'gate_in' ? 'Supplier' : 'Party'}</p>
 <p className="font-semibold text-[var(--text-main)]">{selectedPass.supplier?.name || 'N/A'}</p>
 </div>
 <div>
 <p className="text-xs text-[var(--text-muted-alt)] font-medium">Material / Purpose</p>
 <p className="font-semibold text-[var(--text-main)]">{selectedPass.material || selectedPass.purpose}</p>
 </div>
 <div>
 <p className="text-xs text-[var(--text-muted-alt)] font-medium">Gross Weight</p>
 <p className="font-semibold text-[var(--text-main)]">{selectedPass.grossWeight ? `${Number(selectedPass.grossWeight).toFixed(3)} MT` : 'N/A'}</p>
 </div>
 <div>
 <p className="text-xs text-[var(--text-muted-alt)] font-medium">Tare Weight</p>
 <p className="font-semibold text-[var(--text-main)]">{selectedPass.tareWeight ? `${Number(selectedPass.tareWeight).toFixed(3)} MT` : 'N/A'}</p>
 </div>
 <div>
 <p className="text-xs text-[var(--text-muted-alt)] font-medium">Net Weight</p>
 <p className="font-semibold text-[var(--text-main)] text-[#e67e00]">{selectedPass.netWeight ? `${Number(selectedPass.netWeight).toFixed(3)} MT` : 'N/A'}</p>
 </div>
 <div>
 <p className="text-xs text-[var(--text-muted-alt)] font-medium">No. of Bags</p>
 <p className="font-semibold text-[var(--text-main)]">{selectedPass.noOfBags || 'N/A'}</p>
 </div>
 <div className="col-span-2">
 <p className="text-xs text-[var(--text-muted-alt)] font-medium">Remarks</p>
 <p className="font-semibold text-[var(--text-main)]">{selectedPass.remarks || 'None'}</p>
 </div>
 </div>
 
 <div className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col items-center justify-center shrink-0 w-full md:w-48 self-stretch">
 <div className="bg-white p-2 rounded-lg mb-3">
 <QRCodeCanvas 
 id="modal-qr" 
 value={`Gate Pass : ${selectedPass.qrCode}\nVehicle : ${selectedPass.vehicleNo || 'N/A'}\nDriver : ${selectedPass.driverName || 'N/A'}\nMaterial : ${selectedPass.material || selectedPass.purpose || 'N/A'}\nSupplier : ${selectedPass.supplier?.name || 'N/A'}\nDate : ${new Date(selectedPass.createdAt).toLocaleString()}\nType : ${activeTab === 'gate_in' ? 'INWARD' : 'OUTWARD'}`} 
 size={120} 
 level="M" 
 />
 </div>
 <p className="text-xs text-[var(--text-muted-alt)] text-center uppercase tracking-wider font-semibold">Verification QR</p>
 <p className="text-[10px] text-[var(--text-muted-alt)] text-center mt-1">Scan for pass validity</p>
 </div>
 </div>
 
 <div className="flex justify-end pt-4 border-t border-[var(--border-subtle)] gap-3">
 <button onClick={handleDownload} className="px-4 py-2 bg-[var(--glass-bg)] border border-[var(--border-subtle)] hover:bg-[var(--glass-bg)] text-[var(--text-main)] rounded-lg transition flex items-center gap-2">
 <Download size={16} /> Download
 </button>
 <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-[var(--text-main)] rounded-lg transition flex items-center gap-2">
 <Printer size={16} /> Print Pass
 </button>
 <button onClick={() => setViewPassModalOpen(false)} className="px-4 py-2 border border-[var(--border-subtle)] rounded-lg text-[var(--text-main)] hover:bg-[var(--glass-bg)] transition">Close</button>
 </div>
 </div>
 )}
 </CustomModal>

 </div>
 );
};

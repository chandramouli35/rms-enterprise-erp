// import React, { useState, useEffect } from 'react';
// import { useSearchParams } from 'react-router-dom';
// import { Truck, LogIn, LogOut, QrCode, ShieldAlert, ShieldCheck, ArrowUp, ArrowDown, Search, Eye, RefreshCw, Plus, Printer, CheckCircle2, Download, CheckCircle, AlertTriangle } from 'lucide-react';
// import api from '../api/axios';
// import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
// import { QRCodeCanvas } from 'qrcode.react';
// import { usePlantStore } from '../store/plantStore';
// import { CustomModal } from '../components/CustomModal';
// import { useUiStore } from '../store/uiStore';
// import Pagination from '../components/Pagination';
// import Combobox from '../components/Combobox';

// import toast from 'react-hot-toast';

// const API_URL = 'http://localhost:3000/api';

// const generateQrDataString = (pass: any, plants: any[], activeTab: string) => {
//   if (!pass) return '';
//   let qrText = '';

//   // Determine if this is an inward pass flow
//   const isInward = pass.passType === 'INWARD' || (pass.qrCode && pass.qrCode.startsWith('GIN'));
//   const plantName = plants.find(p => p.id === pass.plantId)?.name || 'Unknown Plant';

//   const basePass = pass.relatedInwardPass ? pass.relatedInwardPass : pass;

//   if (isInward || pass.relatedInwardPass) {
//     qrText += `=== STEP 1: GATE IN ===\n`;
//     qrText += `Pass: ${basePass.qrCode}\n`;
//     qrText += `Plant: ${plantName}\n`;
//     qrText += `Date: ${new Date(basePass.createdAt).toLocaleString()}\n`;
//     qrText += `Type: ${basePass.passType || 'INWARD'}\n`;
//     qrText += `Gate: ${basePass.gate || 'Main Gate'}\n`;
//     qrText += `Vehicle: ${basePass.vehicleNo || 'N/A'}\n`;
//     qrText += `Vehicle Type: ${basePass.vehicleType || 'N/A'}\n`;
//     qrText += `Driver: ${basePass.driverName || 'N/A'} (${basePass.contactNo || basePass.driverMobile || 'N/A'})\n`;
//     qrText += `Purpose: ${basePass.purpose || 'N/A'}\n`;
//     qrText += `Supplier/Party: ${basePass.supplier?.name || 'N/A'} (GST: ${basePass.gstNo || 'N/A'})\n`;
//     qrText += `Material: ${basePass.material || 'N/A'}\n`;
//     qrText += `Challan No: ${basePass.challanNo || 'N/A'}\n`;
//     qrText += `Sauda No: ${basePass.sodaNo || 'N/A'}\n`;
//     qrText += `Bags: ${basePass.noOfBags || 'N/A'}\n`;
//     qrText += `Empty Video: ${basePass.emptyVideoTime || 'N/A'}\n`;
//     qrText += `Loaded Video: ${basePass.loadedVideoTime || 'N/A'}\n`;
//     qrText += `Gross Wt: ${basePass.grossWeight || 0} MT\n`;
//     qrText += `Tare Wt: ${basePass.tareWeight || 0} MT\n`;
//     qrText += `Net Wt: ${basePass.netWeight || 0} MT\n`;
//     qrText += `Remarks: ${basePass.remarks || 'None'}\n\n`;

//     if (pass.latestWeighbridge && pass.latestWeighbridge.grossWeight) {
//       qrText += `=== STEP 2: WEIGHBRIDGE (GROSS) ===\n`;
//       qrText += `Ticket: ${pass.latestWeighbridge.ticketNo || 'N/A'}\n`;
//       qrText += `Gross: ${pass.latestWeighbridge.grossWeight} MT\n`;
//       qrText += `Time: ${new Date(pass.latestWeighbridge.createdAt).toLocaleString()}\n\n`;
//     }

//     /* 
//     if (basePass.procurementBatch?.quality) {
//       qrText += `=== STEP 3: QUALITY CONTROL ===\n`;
//       qrText += `Moisture: ${basePass.procurementBatch.quality.moisture || 0}%\n`;
//       qrText += `Broken: ${basePass.procurementBatch.quality.broken || 0}%\n`;
//       qrText += `Discoloration: ${basePass.procurementBatch.quality.discoloration || 0}%\n`;
//       qrText += `Foreign: ${basePass.procurementBatch.quality.foreignMatter || 0}%\n\n`;
//     }
//     */

//     if (pass.latestWeighbridge && pass.latestWeighbridge.tareWeight) {
//       qrText += `=== STEP 3: WEIGHBRIDGE (TARE) ===\n`;
//       qrText += `Tare: ${pass.latestWeighbridge.tareWeight} MT\n`;
//       qrText += `Net: ${pass.latestWeighbridge.netWeight} MT\n`;
//       qrText += `Time: ${new Date(pass.latestWeighbridge.updatedAt || pass.latestWeighbridge.createdAt).toLocaleString()}\n\n`;
//     }
//   }

//   if (pass.passType === 'OUTWARD' || (pass.qrCode && pass.qrCode.startsWith('GOUT'))) {
//     qrText += `=== STEP 4: GATE OUT ===\n`;
//     qrText += `Pass: ${pass.qrCode}\n`;
//     qrText += `Date: ${new Date(pass.createdAt).toLocaleString()}\n`;
//     qrText += `Purpose: ${pass.purpose || 'N/A'}\n`;
//     qrText += `Party: ${pass.supplier?.name || 'N/A'} (GST: ${pass.gstNo || 'N/A'})\n`;
//     qrText += `Challan: ${pass.challanNo || 'N/A'}\n`;
//     qrText += `Remarks: ${pass.remarks || 'None'}\n`;
//   }

//   return qrText.trim();
// };

// export const GatePassManagement = () => {
//  const [searchParams, setSearchParams] = useSearchParams();
//  const activeTab = searchParams.get('tab') || 'gate_in';
//  const activePlant = usePlantStore(state => state.activePlant);
//   const [passCategory, setPassCategory] = useState<'INWARD' | 'OUTWARD' | null>(null);
//   const [tableFilter, setTableFilter] = useState<'INWARD' | 'OUTWARD' | 'ACTIVE'>('INWARD');
//  const [trucks, setTrucks] = useState<any[]>([]);
//   const [drivers, setDrivers] = useState<any[]>([]);
//   const [suppliers, setSuppliers] = useState<any[]>([]);
//   const [stockMap, setStockMap] = useState<Record<string, number>>({});
//   const [plants, setPlants] = useState<any[]>([]);
//  const [recentEntries, setRecentEntries] = useState<any[]>([]);
//  const [currentPage, setCurrentPage] = useState(1);
//  const [totalItems, setTotalItems] = useState(0);
//  const [duplicateLogs, setDuplicateLogs] = useState<any[]>([]);
//  const [analytics, setAnalytics] = useState<any>({
//  totalGateIn: 0,
//  totalGateOut: 0,
//  qrScanned: 0,
//  duplicatesBlocked: 0,
//  activeGatePass: 0
//  });
 
//  // Form State
//  const defaultFormData = {
//   plantId: activePlant?.id || '',
//   entryDateTime: new Date().toISOString().substring(0, 16),
//   passNo: '',
//   previousTruckReading: '',
//   newTruckReading: '',
//   gate: 'Main Gate',
//  vehicleNo: '',
//  vehicleType: 'Truck',
//  driverName: '',
//  driverMobile: '',
//  purpose: 'Not Applicable',
//  supplierId: '',
//  material: 'PADDY',
//  challanNo: '',
//  noOfBags: '',
//  weightInputType: 'GROSS',
//  grossWeight: '',
//  tareWeight: '',
//  netWeight: 0,
//  emptyVideoTime: '',
//  loadedVideoTime: '',
//  gstNo: '',
//  ntWtParty: '',
//  sodaNo: '',
//  remarks: '',
//  scanQr: '',
//  mandiType: 'Control',
//  boliRate: '',
//  boliChecklist: false,
//   isCompleteDateNA: false,
//   weighbridgeActive: true,
//   items: [{ itemName: '', quantity: '', unit: 'Quintal' }],
//   mainBags: '',
//   shortageBags: '',
//   isDraft: false,
//   rstNo: '',
//   isTransfer: false,
//   deliveryAtId: '',
//   actualDispatchPlantId: ''
//  };
//  const [formData, setFormData] = useState(defaultFormData);
 
//   // Auto-select first options for dynamic dropdowns if not already selected
//   useEffect(() => {
//     if (activePlant) {
//        api.get(`/api/inventory/byproducts`).then(res => setStockMap(res.data)).catch(console.error);
//     }
//   }, [activePlant]);

//   useEffect(() => {
//     setFormData((prev: any) => {
//       let updated = false;
//       const next = { ...prev };
      
//       if (!next.supplierId && suppliers.length > 0) {
//         next.supplierId = suppliers[0].id;
//         updated = true;
//       }
      
//       return updated ? next : prev;
//     });
//   }, [suppliers]);
  
//   const [generatedPass, setGeneratedPass] = useState<any>(null);

//   const handleCategorySelect = (cat: 'INWARD' | 'OUTWARD') => {
//     if (window.confirm(`You have selected Gate Pass ${cat === 'INWARD' ? 'In' : 'Out'} (Confirm) / Not`)) {
//       setPassCategory(cat);
//     }
//   };


//   const [reportFinalizeModalOpen, setReportFinalizeModalOpen] = useState(false);
//   const [reportFinalizeForm, setReportFinalizeForm] = useState({
//     manualMatchConfirmed: false,
//     supervisorName: '',
//     biometricData: ''
//   });

//  const [viewPassModalOpen, setViewPassModalOpen] = useState(false);
//  const [selectedPass, setSelectedPass] = useState<any>(null);

//  const [isScannerActive, setIsScannerActive] = useState(false);
//  const [scannedData, setScannedData] = useState('');
//  const [isScanning, setIsScanning] = useState(false);

//  // Transfer Management State
//  const [transferTickets, setTransferTickets] = useState<any[]>([]);
//  const [transferStatusFilter, setTransferStatusFilter] = useState('all');
//  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
//  const [selectedTicket, setSelectedTicket] = useState<any>(null);
//  const [confirmForm, setConfirmForm] = useState({ supervisorName: '', recipientPlantId: '', biometricData: '' });

//  const handleViewPass = async (qrCode: string) => {
//      try {
//        const res = await api.get(`/api/gate-pass/scan/${qrCode}`);
//        if (res.data) {
//          setSelectedPass(res.data);
//          setViewPassModalOpen(true);
//        }
//      } catch (error) {
//        console.error('Failed to fetch full pass details', error);
//        useUiStore.getState().addToast('Failed to fetch pass details.', 'error');
//      }
//    };

//  const handleScannerInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
//  if (e.key === 'Enter') {
//  setIsScanning(true);
 
//  try {
//  // Extract pass ID from the scanned text
//  // Example text: "Gate Pass : GIN-2026-00001\nVehicle : ..."
//  const match = scannedData.match(/Gate Pass : (G(?:IN|OUT)-\d+-\d+)/);
//  let passId = scannedData.trim();
 
//  if (match && match[1]) {
//  passId = match[1];
//  }

//  const response = await api.get(`/api/gate-pass/scan/${passId}`);
 
//  if (response.data) {
//  // Pass found, show the details modal
//  setSelectedPass(response.data);
//  setViewPassModalOpen(true);
//  }
//  } catch (error: any) {
//  if (error.response?.status === 404) {
//  useUiStore.getState().addToast('Gate pass not found in the system. It may be invalid or from another plant.', 'error');
//  } else {
//  useUiStore.getState().addToast('Failed to verify gate pass. Please check your connection.', 'error');
//  }
//  } finally {
//  setIsScanning(false);
//  setScannedData(''); // Reset for next scan
//  }
//  }
//  };

//  const handlePrint = () => {
//  if (!selectedPass) return;
//  const qrCanvas = document.getElementById('modal-qr') as HTMLCanvasElement;
//  const qrDataUrl = qrCanvas ? qrCanvas.toDataURL() : '';
 
//  const printContent = `
//  <html>
//  <head>
//  <title>Gate Pass - ${selectedPass.qrCode}</title>
//  <style>
//  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #000; }
//  .pass-container { max-width: 400px; margin: 0 auto; border: 2px solid #333; padding: 20px; border-radius: 12px; }
//  .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
//  .header h2 { margin: 0 0 5px 0; font-size: 24px; }
//  .header p { margin: 0; font-weight: bold; font-size: 14px; text-transform: uppercase; border: 2px solid #000; display: inline-block; padding: 4px 8px; border-radius: 4px; }
//  .details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
//  .label { font-size: 11px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
//  .value { font-size: 14px; font-weight: bold; }
//  .qr-code { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px dashed #ccc; }
//  .qr-code img { max-width: 120px; }
//  .qr-label { font-size: 12px; font-weight: bold; margin-top: 10px; }
//  .footer { margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
//  .sign { border-top: 1px solid #000; width: 100px; text-align: center; padding-top: 5px; font-size: 10px; font-weight: bold; }
//  </style>
//  </head>
//  <body>
//  <div class="pass-container">
//  <div class="header">
//  <h2>RICE MILL</h2>
//  <p>GATE ${passCategory === 'INWARD' ? 'IN' : 'OUT'} PASS</p>
//  </div>
//  <div class="details">
//  <div><div class="label">Pass No.</div><div class="value">${selectedPass.qrCode}</div></div>
//  <div><div class="label">Date & Time</div><div class="value">${new Date(selectedPass.createdAt).toLocaleString()}</div></div>
//  <div><div class="label">Vehicle No.</div><div class="value">${selectedPass.vehicleNo}</div></div>
//  <div><div class="label">Vehicle Type</div><div class="value">${selectedPass.vehicleType || 'N/A'}</div></div>
//  <div><div class="label">Driver Name</div><div class="value">${selectedPass.driverName}</div></div>
//  <div><div class="label">Material</div><div class="value">${selectedPass.material || selectedPass.purpose || 'N/A'}</div></div>
//  <div><div class="label">Gross Weight</div><div class="value">${selectedPass.grossWeight ? selectedPass.grossWeight + ' MT' : 'N/A'}</div></div>
//  <div><div class="label">Tare Weight</div><div class="value">${selectedPass.tareWeight ? selectedPass.tareWeight + ' MT' : 'N/A'}</div></div>
//  <div><div class="label">Net Weight</div><div class="value">${selectedPass.netWeight ? selectedPass.netWeight + ' MT' : 'N/A'}</div></div>
//  <div><div class="label">Remarks</div><div class="value">${selectedPass.remarks || 'None'}</div></div>
//  ${selectedPass.procurementBatch?.quality ? `
//   <div style="grid-column: span 2; margin-top: 10px; border-top: 1px solid #ccc; padding-top: 10px;">
//   <div style="font-weight: bold; font-size: 12px; margin-bottom: 5px;">Quality & Weighbridge Info</div>
//   <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
//   <div><div class="label">Moisture</div><div class="value">${selectedPass.procurementBatch.quality.moisture || 0}%</div></div>
//   <div><div class="label">Broken</div><div class="value">${selectedPass.procurementBatch.quality.broken || 0}%</div></div>
//   <div><div class="label">Discoloration</div><div class="value">${selectedPass.procurementBatch.quality.discoloration || 0}%</div></div>
//   <div><div class="label">Foreign Matter</div><div class="value">${selectedPass.procurementBatch.quality.foreignMatter || 0}%</div></div>
//   </div>
//   </div>
//   ` : ''}
//  </div>
//  <div class="qr-code">
//  ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" />` : ''}
//  <div class="qr-label">Scan at Gate ${passCategory === 'INWARD' ? 'Out' : 'In'}</div>
//  </div>
//  <div class="footer">
//  <div class="sign">Authorized Sign</div>
//  <div class="sign">Driver Sign</div>
//  </div>
//  </div>
//  <script>
//  window.onload = function() {
//  window.print();
//  setTimeout(function() { window.close(); }, 500);
//  }
//  </script>
//  </body>
//  </html>
//  `;
//  const printWindow = window.open('', '_blank');
//  if (printWindow) {
//  printWindow.document.write(printContent);
//  printWindow.document.close();
//  }
//  };

//   const handleDownload = async () => {
//     if (activeTab === 'report_summary') {
//     try {
//       const pid = activePlant?.id || 'global';
//       const res = await api.get(`/api/gatepass/recent/${pid}?limit=1000000&status=all`);
//       const allEntries = res.data.data || [];
//       if (allEntries.length === 0) return;
//       const headers = ['S.No.', 'Type', 'Empty Video Time', 'Loaded Video Time', 'GP No', 'Truck No', 'Party', 'Item', 'Bags', 'Net Weight', 'Soda No.', 'Note'];
//       const rows = allEntries.map((entry: any, idx: number) => [
//       idx + 1,
//       entry.passType,
//       entry.emptyVideoTime || '',
//       entry.loadedVideoTime || '',
//       entry.qrCode,
//       entry.vehicleNo,
//       entry.supplier?.name || '',
//       entry.material || entry.purpose || '',
//       entry.noOfBags || '',
//       entry.netWeight || '',
//       entry.sodaNo || '',
//       entry.remarks || ''
//       ]);
//       const csvContent = headers.join(',') + '\n' + rows.map((r: any) => r.map((v: any) => `"${v}"`).join(',')).join('\n');
//       const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//       const link = document.createElement('a');
//       const url = URL.createObjectURL(blob);
//       link.setAttribute('href', url);
//       link.setAttribute('download', `gate_pass_report_${new Date().getTime()}.csv`);
//       link.style.visibility = 'hidden';
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//     } catch (error) {
//       console.error('Failed to export all records', error);
//     }
//     return;
//     }

//   if (!selectedPass) return;
  
//   // Convert the data we need to CSV
//   const headers = ['Pass No', 'Entry Time', 'Vehicle No', 'Vehicle Type', 'Driver Name', 'Driver Mobile', 'Supplier', 'Material', 'Gross Weight', 'Tare Weight', 'Net Weight', 'No of Bags', 'Remarks'];
//   const row = [
//   selectedPass.qrCode,
//   new Date(selectedPass.createdAt).toLocaleString(),
//   selectedPass.vehicleNo,
//   selectedPass.vehicleType || 'N/A',
//   selectedPass.driverName,
//   selectedPass.contactNo || 'N/A',
//   selectedPass.supplier?.name || 'N/A',
//   selectedPass.material || selectedPass.purpose || 'N/A',
//   selectedPass.grossWeight || 0,
//   selectedPass.tareWeight || 0,
//   selectedPass.netWeight || 0,
//   selectedPass.noOfBags || 0,
//   selectedPass.remarks || 'None'
//   ];
  
//   const csvContent = headers.join(',') + '\n' + row.map(v => `"${v}"`).join(',');
//   const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//  const link = document.createElement('a');
//  const url = URL.createObjectURL(blob);
//  link.setAttribute('href', url);
//  link.setAttribute('download', `gate_pass_${selectedPass.qrCode}.csv`);
//  link.style.visibility = 'hidden';
//  document.body.appendChild(link);
//  link.click();
//  document.body.removeChild(link);
//  };

//   useEffect(() => {
//     const pid = activePlant?.id || 'global';
//     setFormData(prev => ({ ...prev, plantId: pid }));
//     fetchData();
//   }, [activePlant, activeTab, currentPage]);

//   const fetchData = async () => {
//     const pid = activePlant?.id || 'global';
    
//     try {
//       const resPlants = await api.get('/plants');
//       setPlants(resPlants.data);
//     } catch (error) {
//       console.error('Failed to fetch plants:', error);
//     }

//     // Fetch suppliers independently so dropdown always populates even if analytics fail
//     try {
//       const resSuppliers = await api.get(`/api/procurement/suppliers`);
//       setSuppliers(resSuppliers.data);
//     } catch (error) {
//       console.error('Failed to fetch suppliers:', error);
//     }

//     try {
//       const resTrucks = await api.get(`/api/master-data/trucks/all`, { headers: { 'x-plant-id': pid } });
//       setTrucks(Array.isArray(resTrucks.data) ? resTrucks.data : (resTrucks.data?.data || []));
//     } catch (error) {
//       console.error('Failed to fetch trucks:', error);
//     }

//     try {
//       const resDrivers = await api.get('/api/master-data/drivers');
//       setDrivers(resDrivers.data);
//     } catch (error) {
//       console.error('Failed to fetch drivers:', error);
//     }

//     // Fetch other data independently using allSettled so one failure doesn't block the rest
//     try {
//       const [analyticsRes, recentRes, logsRes] = await Promise.allSettled([
//         api.get(`/api/gate-pass/analytics/${pid}`),
//         api.get(`/api/gate-pass/recent/${pid}?type=${activeTab === 'report_summary' ? 'ALL' : tableFilter}&page=${currentPage}&limit=10${activeTab === 'report_summary' ? '&status=COMPLETED' : ''}`),
//         api.get(`/api/gate-pass/duplicate-logs/${pid}`)
//       ]);
      
//       if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
//       if (recentRes.status === 'fulfilled') {
//         setRecentEntries(recentRes.value.data.data || []);
//         setTotalItems(recentRes.value.data.total || 0);
//       }
//       if (logsRes.status === 'fulfilled') setDuplicateLogs(logsRes.value.data.slice(0, 3));
//     } catch (error) {
//       console.error('Failed to fetch gate pass data:', error);
//     }
//     };

//   const handleFinalizeReport = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!reportFinalizeForm.manualMatchConfirmed) {
//       toast.error('You must confirm that the digital report matches the manual records.');
//       return;
//     }
//     if (!reportFinalizeForm.biometricData) {
//       toast.error('Biometric signature is required.');
//       return;
//     }
//     try {
//       const pid = activePlant?.id || 'global';
//       await api.post(`/api/gate-pass/report/finalize/${pid}`, reportFinalizeForm);
//       toast.success('Daily Gate Pass Report finalized successfully!');
//       setReportFinalizeModalOpen(false);
//       // Reload report
//       const res = await api.get(`/api/gate-pass/recent/${pid}?type=ALL&page=${currentPage}&limit=10&status=COMPLETED`);
//       setRecentEntries(res.data.data || []);
//       setTotalItems(res.data.total || 0);
//     } catch (error: any) {
//       toast.error(error.response?.data?.message || 'Failed to finalize report');
//     }
//   };

//   const handleMasterDataBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     if (!value) return;
//     try {
//       if (name === 'vehicleNo' && !trucks.find(t => t.truckNumber === value)) {
//         await api.post('/api/master-data/trucks', { truckNumber: value });
//         const res = await api.get('/api/master-data/trucks');
//         setTrucks(res.data);
//       } else if (name === 'driverName' && !drivers.find(d => d.name === value)) {
//         await api.post('/api/master-data/drivers', { name: value, phone: formData.driverMobile || '' });
//         const res = await api.get('/api/master-data/drivers');
//         setDrivers(res.data);
//       }
//     } catch (err) {
//       console.error('Auto-save failed:', err);
//     }
//   };

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
//   let { name, value, type } = e.target;
//   let finalValue: any = value;
  
//   if (type === 'checkbox') {
//     finalValue = (e.target as HTMLInputElement).checked;
//   }
  
//   if (name === 'driverMobile') {
//     finalValue = value.replace(/[^0-9]/g, '');
//   }
  
//   setFormData(prev => {
//   const updated = { ...prev, [name]: finalValue };
//  if (name === 'grossWeight' || name === 'tareWeight') {
//  const gross = name === 'grossWeight' ? parseFloat(value) || 0 : parseFloat(prev.grossWeight as any) || 0;
//  const tare = name === 'tareWeight' ? parseFloat(value) || 0 : parseFloat(prev.tareWeight as any) || 0;
//  updated.netWeight = gross - tare;
//  }
//  return updated;
//  });
//  };

//  const handleReset = () => {
//  setFormData({ ...defaultFormData, plantId: activePlant?.id || '' });
//  setGeneratedPass(null);
//  };

//  const handleItemChange = (index: number, field: string, value: string) => {
//    const newItems = [...formData.items];
//    newItems[index] = { ...newItems[index], [field]: value };
//    setFormData(prev => ({ ...prev, items: newItems }));
//  };
//  const addItem = () => {
//    setFormData(prev => ({ ...prev, items: [...prev.items, { itemName: '', quantity: '', unit: 'Quintal' }] }));
//  };
//  const removeItem = (index: number) => {
//    const newItems = formData.items.filter((_, i) => i !== index);
//    setFormData(prev => ({ ...prev, items: newItems }));
//  };

//   const isBlock1Valid = formData.vehicleNo && formData.vehicleType && formData.driverName;
//   const isBlock2Valid = isBlock1Valid && formData.purpose && formData.material && formData.supplierId;

//   const handleGeneratePass = async (e: React.FormEvent) => {
//   e.preventDefault();
//   if (formData.plantId === 'global' || !formData.plantId) {
//     useUiStore.getState().addToast('Please select a specific plant to generate a Gate Pass.', 'error');
//     return;
//   }
//   try {
//   const type = passCategory;
  
//   // Calculate bags correctly based on pass type
//   const mainBagsNum = parseInt(formData.mainBags as any) || 0;
//   const shortageBagsNum = parseInt(formData.shortageBags as any) || 0;
//   const computedNoOfBags = type === 'OUTWARD' 
//     ? (mainBagsNum + shortageBagsNum > 0 ? mainBagsNum + shortageBagsNum : null)
//     : (formData.noOfBags ? parseInt(formData.noOfBags as any) : null);

//   const response = await api.post(`/api/gate-pass/generate`, {
//   ...formData,
//   passType: type,
//   grossWeight: formData.weightInputType === 'GROSS' && formData.grossWeight ? parseFloat(formData.grossWeight as any) : null,
//   tareWeight: formData.weightInputType === 'TARE' && formData.tareWeight ? parseFloat(formData.tareWeight as any) : null,
//   netWeight: formData.netWeight ? parseFloat(formData.netWeight as any) : null,
//   noOfBags: computedNoOfBags,
//   mandiType: formData.purpose === 'Paddy Purchase' ? formData.mandiType : undefined,
//   boliRate: formData.purpose === 'Paddy Purchase' && formData.mandiType === 'Boli' ? parseFloat(formData.boliRate as any) : undefined,
//   boliChecklist: formData.purpose === 'Paddy Purchase' && formData.mandiType === 'Boli' ? formData.boliChecklist : undefined,
//   rstNo: formData.rstNo,
//   isCompleteDateNA: formData.isCompleteDateNA,
//   weighbridgeActive: formData.weighbridgeActive,
//   mainBags: mainBagsNum,
//   shortageBags: shortageBagsNum,
//   isDraft: formData.isDraft,
//   isTransfer: formData.isTransfer,
//   deliveryAtId: formData.isTransfer ? formData.deliveryAtId : undefined,
//   items: formData.items
//   });

//  const pass = response.data;
//  const supplierName = suppliers.find(s => s.id === pass.supplierId)?.name || 'N/A';

//  setGeneratedPass({
//  passNo: pass.qrCode, // Use the generated qrCode (which includes prefix-year-seq)
//  qrCode: pass.qrCode,
//  date: new Date(pass.createdAt).toLocaleString(),
//  vehicleNo: pass.vehicleNo,
//  vehicleType: pass.vehicleType,
//  supplier: supplierName,
//  material: pass.material,
//  netWeight: pass.netWeight || 0,
//  noOfBags: pass.noOfBags || '0',
//  procurementBatch: pass.procurementBatch
//  });
 
//  // Refresh Data
//  fetchData();
 
//  // Reset form but keep plant ID
//  setFormData({ ...defaultFormData, plantId: activePlant?.id || '' });
//  } catch (error: any) {
//  if (error.response?.status === 409) {
//  useUiStore.getState().addToast(error.response.data.message || 'Vehicle already has an active pass.', 'error');
//  } else {
//  useUiStore.getState().addToast('Failed to generate gate pass', 'error');
//  }
//  console.error('Error generating pass', error);
//  }
//  };

//  const activeCount = analytics.activeGatePass || 0;
//  const chartData: any[] = activeCount > 0 ? [
//  { name: 'Waiting for Tare Wt', value: Math.ceil(activeCount * 0.5), color: '#e67e00' },
//  { name: 'Loading / Unloading', value: Math.floor(activeCount * 0.3), color: '#3b82f6' },
//  { name: 'In Transit', value: activeCount - Math.ceil(activeCount * 0.5) - Math.floor(activeCount * 0.3), color: '#22c55e' }
//  ].filter(d => d.value > 0) : [
//  { name: 'No Vehicles', value: 1, color: '#1a1a1a', isPlaceholder: true }
//  ];

//  return (
//  <div className="flex flex-col h-full text-[var(--text-main)]">
//  <div className="grid grid-cols-5 gap-4 mb-6 flex-shrink-0">
//  <div className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle-alt)] flex flex-col justify-center">
//  <div className="flex items-center gap-3 mb-2">
//  <div className="p-2 bg-blue-500/10 rounded-lg"><LogIn size={20} className="text-blue-500" /></div>
//  <p className="text-[var(--text-muted-alt)] text-sm font-medium">Total Gate In</p>
//  </div>
//  <div className="flex items-end justify-between">
//  <div>
//  <h3 className="text-3xl font-bold">{analytics.totalGateIn}</h3>
//  <p className="text-[var(--text-muted-alt)] text-xs mt-1">Today</p>
//  </div>
//  <div className="flex items-center text-green-500 text-sm font-medium">
//  <ArrowUp size={14} className="mr-1" /> 12% <span className="text-[var(--text-muted-alt)] ml-1 text-xs">vs yesterday</span>
//  </div>
//  </div>
//  </div>

//  <div className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle-alt)] flex flex-col justify-center">
//  <div className="flex items-center gap-3 mb-2">
//  <div className="p-2 bg-green-500/10 rounded-lg"><LogOut size={20} className="text-green-500" /></div>
//  <p className="text-[var(--text-muted-alt)] text-sm font-medium">Total Gate Out</p>
//  </div>
//  <div className="flex items-end justify-between">
//  <div>
//  <h3 className="text-3xl font-bold">{analytics.totalGateOut}</h3>
//  <p className="text-[var(--text-muted-alt)] text-xs mt-1">Today</p>
//  </div>
//  <div className="flex items-center text-green-500 text-sm font-medium">
//  <ArrowUp size={14} className="mr-1" /> 8% <span className="text-[var(--text-muted-alt)] ml-1 text-xs">vs yesterday</span>
//  </div>
//  </div>
//  </div>

//  <div className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle-alt)] flex flex-col justify-center">
//  <div className="flex items-center gap-3 mb-2">
//  <div className="p-2 bg-amber-500/10 rounded-lg"><QrCode size={20} className="text-amber-500" /></div>
//  <p className="text-[var(--text-muted-alt)] text-sm font-medium">QR / Barcode Scanned</p>
//  </div>
//  <div className="flex items-end justify-between">
//  <div>
//  <h3 className="text-3xl font-bold">{analytics.qrScanned}</h3>
//  <p className="text-[var(--text-muted-alt)] text-xs mt-1">Today</p>
//  </div>
//  <div className="flex items-center text-amber-500 text-sm font-medium">
//  <ArrowUp size={14} className="mr-1" /> 15% <span className="text-[var(--text-muted-alt)] ml-1 text-xs">vs yesterday</span>
//  </div>
//  </div>
//  </div>

//  <div className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle-alt)] flex flex-col justify-center">
//  <div className="flex items-center gap-3 mb-2">
//  <div className="p-2 bg-purple-500/10 rounded-lg"><ShieldAlert size={20} className="text-purple-500" /></div>
//  <p className="text-[var(--text-muted-alt)] text-sm font-medium">Duplicate Blocked</p>
//  </div>
//  <div className="flex items-end justify-between">
//  <div>
//  <h3 className="text-3xl font-bold">{analytics.duplicatesBlocked}</h3>
//  <p className="text-[var(--text-muted-alt)] text-xs mt-1">Today</p>
//  </div>
//  <div className="flex items-center text-red-500 text-sm font-medium">
//  <ArrowDown size={14} className="mr-1" /> 20% <span className="text-[var(--text-muted-alt)] ml-1 text-xs">vs yesterday</span>
//  </div>
//  </div>
//  </div>

//  <div 
//     onClick={() => { setSearchParams({ tab: 'report_summary' }); setTableFilter('ACTIVE'); }}
//     className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle-alt)] flex flex-col justify-center cursor-pointer hover:bg-[var(--glass-bg)] transition-colors relative overflow-hidden group"
//   >
//   <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
//   <div className="flex items-center gap-3 mb-2 relative z-10">
//   <div className="p-2 bg-blue-500/10 rounded-lg"><ShieldCheck size={20} className="text-blue-500" /></div>
//   <p className="text-[var(--text-muted-alt)] text-sm font-medium">Active Gate Pass</p>
//   </div>
//   <div className="flex items-end justify-between relative z-10">
//   <div>
//   <h3 className="text-3xl font-bold text-blue-400">{analytics.activeGatePass}</h3>
//   <p className="text-[var(--text-muted-alt)] text-xs mt-1">Click to view Active GPs</p>
//   </div>
//   <div className="flex items-center text-blue-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
//     <Eye size={16} className="mr-1" /> View All
//   </div>
//   </div>
//   </div>
//  </div>



//  {/* DYNAMIC WORKSPACE */}
//  <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col space-y-6 pb-6">
 
//  {(activeTab === 'create_pass' || activeTab === 'gate_in' || activeTab === 'gate_out') && (
//  <div className="grid grid-cols-12 gap-6">
 
//  {/* COLUMN 1: FORM (42%) -> 5 cols out of 12 */}
//  <div className="col-span-12 lg:col-span-5 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] p-5">
//  <div className="flex items-center justify-between mb-4">
//     <h2 className="text-lg font-semibold text-[var(--text-main)]">Create Gate Pass</h2>
//     <div className="flex bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg p-0.5">
//       <button type="button" onClick={() => handleCategorySelect('INWARD')} className={`px-3 py-1 text-xs font-medium rounded-md transition ${passCategory === 'INWARD' ? 'bg-[#e67e00] text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>Gate In</button>
//       <button type="button" onClick={() => handleCategorySelect('OUTWARD')} className={`px-3 py-1 text-xs font-medium rounded-md transition ${passCategory === 'OUTWARD' ? 'bg-[#e67e00] text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>Gate Out</button>
//     </div>
//   </div>

//   {/* Transfer Entry Toggle */}
//   {passCategory && (
//     <div className="mb-4 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 flex items-center justify-between">
//       <div>
//         <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
//           <RefreshCw size={14} /> Transfer Entry
//         </h3>
//         <p className="text-xs text-[var(--text-muted-alt)] mt-0.5">Generate a transfer on behalf of another mill.</p>
//       </div>
//       <label className="relative inline-flex items-center cursor-pointer">
//         <input type="checkbox" name="isTransfer" className="sr-only peer" checked={formData.isTransfer} onChange={(e) => setFormData(prev => ({...prev, isTransfer: e.target.checked, purpose: e.target.checked ? 'Transfer Entry' : prev.purpose}))} />
//         <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
//       </label>
//     </div>
//   )}

//  <form onSubmit={handleGeneratePass} className={`space-y-4 transition-opacity duration-300 ${!passCategory ? 'opacity-40 pointer-events-none' : ''}`}>
//   <div className="grid grid-cols-2 gap-4">
//   {/* Removed Plant Dropdown per requirement (Default to Supervisor Mill) */}
//   <div>
//  <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Entry Date & Time <span className="text-red-500">*</span></label>
//  <input type="datetime-local" name="entryDateTime" value={formData.entryDateTime} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none css-color-scheme-dark" required />
//  </div>
//  <div>
//  <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">GP No. (Optional Override)</label>
//  <input type="text" name="passNo" placeholder="Auto Generated" value={formData.passNo} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
//  </div>
//  <div>
//  <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Gate <span className="text-red-500">*</span></label>
//  <select name="gate" value={formData.gate} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none appearance-none">
//  <option value="Main Gate">Main Gate</option>
//  <option value="Gate 2">Gate 2</option>
//  </select>
//  </div>
//  </div>

//  <div className="grid grid-cols-2 gap-4">
//  <div>
//  <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Vehicle No. <span className="text-red-500">*</span></label>
//   <Combobox
//     name="vehicleNo"
//     value={formData.vehicleNo}
//     onChange={handleInputChange}
//     onBlur={handleMasterDataBlur}
//     options={trucks}
//     className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"
//     placeholder="Select or enter vehicle no"
//     required
//   />
//  </div>
//  {trucks.find(t => t.truckNumber === formData.vehicleNo)?.transportCategory === 'COMPANY' && (
//    <>
//      <div>
//        <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Previous Truck Reading</label>
//        <input type="number" name="previousTruckReading" value={formData.previousTruckReading} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
//      </div>
//      <div>
//        <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">New Truck Reading</label>
//        <input type="number" name="newTruckReading" value={formData.newTruckReading} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
//      </div>
//    </>
//  )}
//  <div>
//  <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Vehicle Type <span className="text-red-500">*</span></label>
//  <select name="vehicleType" value={formData.vehicleType} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none appearance-none">
//  <option value="Truck">Truck</option>
//  <option value="Tractor">Tractor</option>
//  <option value="Mini Truck">Mini Truck</option>
//  </select>
//  </div>
//  </div>

//  <div className="grid grid-cols-2 gap-4">
//  <div>
//  <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Driver Name <span className="text-red-500">*</span></label>
//  <Combobox
//     name="driverName"
//     value={formData.driverName}
//     onChange={(e: any) => {
//       handleInputChange(e);
//       const match = drivers.find(d => d.name === e.target.value);
//       if (match && match.phone) {
//         setFormData(prev => ({...prev, driverMobile: match.phone}));
//       }
//     }}
//     onBlur={handleMasterDataBlur}
//     options={drivers}
//     placeholder="Select or type Driver"
//     className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"
//     required
//   />
//  </div>
//  <div>
//  <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Driver Mobile</label>
//  <input type="tel" maxLength={10} name="driverMobile" value={formData.driverMobile} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
//  </div>
//  </div>

//   <div className={`space-y-4 transition-opacity duration-300 ${!isBlock1Valid ? 'opacity-40 pointer-events-none' : ''}`}>
//    <div className="grid grid-cols-3 gap-4 items-end">
//   <div>
//   <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Purpose <span className="text-red-500">*</span></label>
//   <select name="purpose" value={formData.purpose} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none appearance-none" disabled={formData.isTransfer}>
//    <option value="Intermill">Intermill</option>
//    <option value="Not Applicable">Not Applicable</option>
//   </select>
//   </div>
//   {/* Item / Product dropdown removed in favor of Dynamic Items Section */}
//   <div className={formData.isTransfer ? "col-span-1" : "col-span-2"}>
//   <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium truncate">
//     {formData.isTransfer ? 'Recipient Mill (Party)' : (passCategory === 'INWARD' ? 'From (Supplier / Party)' : 'To (Party)')} <span className="text-red-500">*</span>
//   </label>
//   <Combobox
//     name="supplierId"
//     value={formData.supplierId}
//     onChange={handleInputChange}
//     options={suppliers}
//     valueKey="id"
//     placeholder="Select Account"
//     className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"
//     required
//   />
//  </div>
//  {formData.isTransfer && (
//    <div className="col-span-1">
//      <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium truncate">Delivery At <span className="text-red-500">*</span></label>
//      <Combobox
//       name="deliveryAtId"
//       value={formData.deliveryAtId}
//       onChange={handleInputChange}
//       options={suppliers}
//       valueKey="id"
//       placeholder="Select Depo/Mill"
//       className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"
//       required
//     />
//    </div>
//  )}
//  </div>

//   {/* Dynamic Items Entry */}
//   <div className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] p-4 rounded-lg space-y-3 mt-4">
//     <div className="flex items-center justify-between">
//       <label className="block text-sm text-[var(--text-main)] font-semibold">Items <span className="text-red-500">*</span></label>
//       <button type="button" onClick={addItem} className="text-[#e67e00] text-xs font-bold hover:underline flex items-center gap-1">
//         <Plus size={14} /> Add Item
//       </button>
//     </div>
//     {formData.items.map((item, index) => (
//       <div key={index} className="grid grid-cols-12 gap-3 items-end">
//         <div className="col-span-5">
//           <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium">Item Name</label>
//           <select value={item.itemName} onChange={(e) => handleItemChange(index, 'itemName', e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none appearance-none" required>
//             <option value="">Select...</option>
//             <option value="PADDY">PADDY {stockMap['PADDY'] !== undefined ? `[Available: ${stockMap['PADDY']}]` : ''}</option>
//             <option value="RICE">RICE {stockMap['RICE'] !== undefined ? `[Available: ${stockMap['RICE']}]` : ''}</option>
//             <option value="BRAN">BRAN {stockMap['BRAN'] !== undefined ? `[Available: ${stockMap['BRAN']}]` : ''}</option>
//             <option value="HUSK">HUSK {stockMap['HUSK'] !== undefined ? `[Available: ${stockMap['HUSK']}]` : ''}</option>
//             <option value="BROKEN">BROKEN {stockMap['BROKEN'] !== undefined ? `[Available: ${stockMap['BROKEN']}]` : ''}</option>
//             <option value="OTHER">OTHER</option>
//           </select>
//         </div>
//         <div className="col-span-3">
//           <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium">Quantity</label>
//           <input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" required />
//         </div>
//         <div className="col-span-3">
//           <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium">Unit</label>
//           <select value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none appearance-none">
//             <option value="Quintal">Quintal</option>
//             <option value="Bags">Bags</option>
//           </select>
//         </div>
//         <div className="col-span-1 pb-1 flex justify-center">
//           {formData.items.length > 1 && (
//             <button type="button" onClick={() => removeItem(index)} className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-md transition-colors">
//               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
//             </button>
//           )}
//         </div>
//       </div>
//     ))}
//   </div>

//  {formData.purpose === 'Paddy Purchase' && (
//    <div className="bg-[var(--glass-bg)] border border-[#e67e00]/30 rounded-lg p-4 space-y-4">
//      <div className="grid grid-cols-2 gap-4">
//        <div>
//          <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Mandi Type <span className="text-red-500">*</span></label>
//          <select name="mandiType" value={formData.mandiType} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none appearance-none">
//            <option value="Control">Control</option>
//            <option value="Boli">Boli</option>
//          </select>
//        </div>
//        {formData.mandiType === 'Boli' && (
//          <div>
//            <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Boli Rate (₹) <span className="text-red-500">*</span></label>
//            <input type="number" step="0.01" name="boliRate" value={formData.boliRate} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" required />
//          </div>
//        )}
//      </div>
//      {formData.mandiType === 'Boli' && (
//        <div className="flex items-start gap-2 pt-2 border-t border-[var(--border-subtle)]">
//          <input type="checkbox" id="boliChecklist" name="boliChecklist" checked={formData.boliChecklist} onChange={handleInputChange} className="mt-1" required />
//          <label htmlFor="boliChecklist" className="text-sm text-[var(--text-main)]">Has the Artia entered the required Boli records into the system before issuing this Gate Pass? <span className="text-red-500">*</span></label>
//        </div>
//      )}
//    </div>
//  )}

//   <div className="grid grid-cols-3 gap-4">
//    <div>
//    <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Challan / Ref No.</label>
//    <input type="text" name="challanNo" value={formData.challanNo} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
//    </div>
//    <div>
//    <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">RST No.</label>
//    <input type="text" name="rstNo" value={formData.rstNo} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
//    </div>
   
//    {passCategory !== 'OUTWARD' && (
//      <div>
//      <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">No. of Bags / Qty</label>
//      <input type="number" min="0" name="noOfBags" value={formData.noOfBags} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"  />
//      </div>
//    )}
//   </div>

//   {passCategory === 'OUTWARD' && (
//     <div className="grid grid-cols-3 gap-4 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
//       <div>
//         <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Main Bags</label>
//         <input type="number" min="0" name="mainBags" value={formData.mainBags} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
//       </div>
//       <div>
//         <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Shortage Bags</label>
//         <input type="number" min="0" name="shortageBags" value={formData.shortageBags} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
//       </div>
//       <div>
//         <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Total Bags</label>
//         <input type="number" value={(Number(formData.mainBags) || 0) + (Number(formData.shortageBags) || 0)} disabled className="w-full bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none font-bold text-center" />
//       </div>
//     </div>
//   )}

//  <div className="grid grid-cols-2 gap-4">
//  <div>
//  <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">GST No.</label>
//  <input type="text" name="gstNo" value={formData.gstNo} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" placeholder="Enter GST Number" />
//  </div>
//  <div>
//  <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Sauda / Contract No.</label>
//  <input type="text" name="sodaNo" value={formData.sodaNo} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
//  </div>
//  </div>

//   <div className="grid grid-cols-2 gap-3 items-end">
//   <div>
//   <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium truncate">Empty Video Time</label>
//   <input type="time" name="emptyVideoTime" value={formData.emptyVideoTime} onChange={handleInputChange} disabled={formData.isCompleteDateNA} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none disabled:opacity-50" />
//   </div>
//   <div>
//   <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium truncate">Loaded Video Time</label>
//   <input type="time" name="loadedVideoTime" value={formData.loadedVideoTime} onChange={handleInputChange} disabled={formData.isCompleteDateNA} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none disabled:opacity-50" />
//   </div>
//   </div>
//   <div className="mt-1">
//     <label className="flex items-center gap-1.5 text-xs text-yellow-500/80 cursor-pointer w-max">
//       <input type="checkbox" name="isCompleteDateNA" checked={formData.isCompleteDateNA} onChange={(e) => setFormData(prev => ({...prev, isCompleteDateNA: e.target.checked}))} className="accent-yellow-500" /> Timestamps N/A
//     </label>
//   </div>
//  </div>

//  <div className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] p-3 rounded-lg">
//   <div className="flex items-center gap-4 mb-3">
//   <label className="text-xs text-[var(--text-muted-alt)] font-medium">Use Weighbridge:</label>
//   <div className="flex items-center gap-4">
//     <label className="flex items-center gap-1.5 text-sm cursor-pointer">
//       <input type="radio" name="useWeighbridge" checked={formData.weighbridgeActive} onChange={() => setFormData(prev => ({...prev, weighbridgeActive: true}))} className="accent-[#e67e00]" /> Yes
//     </label>
//     <label className="flex items-center gap-1.5 text-sm cursor-pointer">
//       <input type="radio" name="useWeighbridge" checked={!formData.weighbridgeActive} onChange={() => setFormData(prev => ({...prev, weighbridgeActive: false}))} className="accent-[#e67e00]" /> No
//     </label>
//   </div>
//   </div>
//  </div>

//   <div className={`space-y-4 transition-opacity duration-300 ${!isBlock2Valid ? 'opacity-40 pointer-events-none' : ''}`}>
//   {formData.weighbridgeActive && (
//     <>
//       <div className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] p-3 rounded-lg mt-3 mb-3">
//         <label className="text-xs text-[var(--text-muted-alt)] font-medium">Weight Entry Mode:</label>
//         <div className="flex items-center gap-4 mt-2">
//           <label className="flex items-center gap-1.5 text-sm cursor-pointer">
//           <input type="radio" name="weightInputType" value="GROSS" checked={formData.weightInputType === 'GROSS'} onChange={handleInputChange} className="accent-[#e67e00]" /> Gross Weight
//           </label>
//           <label className="flex items-center gap-1.5 text-sm cursor-pointer">
//           <input type="radio" name="weightInputType" value="TARE" checked={formData.weightInputType === 'TARE'} onChange={handleInputChange} className="accent-[#e67e00]" /> Tare Weight
//           </label>
//         </div>
//       </div>
//       <div className="grid grid-cols-2 gap-3">
//       {formData.weightInputType === 'GROSS' ? (
//       <div>
//       <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium truncate">Gross Wt (MT)</label>
//       <input type="number" min="0" step="0.001" name="grossWeight" value={formData.grossWeight} onChange={handleInputChange} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle-alt)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"  />
//       </div>
//       ) : (
//       <div>
//       <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium truncate">Tare Wt (MT)</label>
//       <input type="number" min="0" step="0.001" name="tareWeight" value={formData.tareWeight} onChange={handleInputChange} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle-alt)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"  />
//       </div>
//       )}
//       <div>
//       <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium truncate">Net Wt (MT)</label>
//       <div className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle-alt)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] font-medium bg-opacity-50 flex items-center h-[38px]">
//       {formData.netWeight.toFixed(3)}
//       </div>
//       </div>
//       <div>
//       <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium truncate">Net Wt at Party (MT)</label>
//       <input type="number" min="0" step="0.001" name="ntWtParty" value={formData.ntWtParty} onChange={handleInputChange} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle-alt)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"  />
//       </div>
//       </div>
//     </>
//   )}
//   </div>

//  <div>
//  <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Remarks</label>
//  <textarea name="remarks" value={formData.remarks} onChange={handleInputChange} rows={2} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none resize-none"></textarea>
//  </div>

//  <div>
//  <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Scan QR / Barcode (Optional)</label>
//  <div className="relative">
//  <input type="text" name="scanQr" placeholder="Scan or Enter QR / Barcode" value={formData.scanQr} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 pr-10 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
//  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 p-1 hover:bg-blue-500/10 rounded">
//  <QrCode size={16} />
//  </button>
//  </div>
//  </div>

//  <div className="flex items-center gap-3 pt-2">
//   <label className="flex items-center gap-1.5 text-sm cursor-pointer mr-auto text-yellow-500">
//     <input type="checkbox" name="isDraft" checked={formData.isDraft} onChange={(e) => setFormData(prev => ({...prev, isDraft: e.target.checked}))} className="accent-yellow-500" /> Save as Draft
//   </label>
//  <button type="button" onClick={handleReset} className="px-6 py-2.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--glass-bg)] font-medium text-sm transition">
//  Reset
//  </button>
//  <button type="submit" className="flex-1 bg-[#e67e00] hover:bg-[#d67500] text-black font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2">
//  <CheckCircle2 size={18} /> {formData.isDraft ? 'Save Draft' : `Generate Gate ${passCategory === 'INWARD' ? 'In' : 'Out'} Pass`}
//  </button>
//  </div>
//  </form>
//  </div>

//  {/* COLUMN 2: RECENT ENTRIES GRID (100% -> 12 cols out of 12) */}
//  <div className="col-span-12 lg:col-span-7 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] p-5 flex flex-col">
//  <div className="flex items-center justify-between mb-4">
//  <h2 className="text-lg font-semibold text-[var(--text-main)]">Recent Gate {passCategory === 'INWARD' ? 'In' : 'Out'} Entries</h2>
//  <button className="text-blue-500 text-sm font-medium hover:text-blue-400">View All</button>
//  </div>
 
//  <div className="overflow-x-auto flex-1">
//  <table className="w-full text-left border-collapse">
//  <thead>
//  <tr className="border-b border-[var(--border-subtle)]">
//  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)]">Pass No.</th>
//  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)]">Entry Time</th>
//  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)]">Vehicle No.</th>
//  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)]">{tableFilter === 'OUTWARD' ? 'To / Party' : 'From / Supplier'}</th>
//  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)]">Material</th>
//  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] text-right">Net Wt (MT)</th>
//  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] text-center">Status</th>
//  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] text-center">Action</th>
//  </tr>
//  </thead>
//  <tbody className="divide-y divide-white/5">
//  {recentEntries.length > 0 ? recentEntries.map((row, i) => (
//  <tr key={i} className="hover:bg-[var(--glass-bg)] group">
//  <td className="py-3 text-xs font-medium text-[var(--text-muted)]">{row.qrCode}</td>
//  <td className="py-3 text-[11px] text-[var(--text-muted-alt)]">{new Date(row.createdAt).toLocaleString()}</td>
//  <td className="py-3 text-xs font-medium text-[var(--text-muted)]">{row.vehicleNo}</td>
//  <td className="py-3 text-[11px] text-[var(--text-muted-alt)] truncate max-w-[100px]">{row.supplier?.name || 'N/A'}</td>
//  <td className="py-3 text-[11px] text-[var(--text-muted-alt)]">{row.material || row.purpose}</td>
//  <td className="py-3 text-xs font-medium text-[var(--text-muted)] text-right">{row.netWeight ? Number(row.netWeight).toFixed(3) : '-'}</td>
//  <td className="py-3 text-center">
//  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${row.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
//  {row.status}
//  </span>
//  </td>
//  <td className="py-3 text-center">
//  <button onClick={() => handleViewPass(row.qrCode)} className="text-blue-500/50 group-hover:text-blue-500 transition"><Eye size={14} /></button>
//  </td>
//  </tr>
//  )) : (
//  <tr>
//  <td colSpan={8} className="py-8 text-center text-sm text-[var(--text-muted-alt)]">No recent entries found.</td>
//  </tr>
//  )}
//  </tbody>
//  </table>
//  </div>

//  {/* Pagination */}
//  <Pagination 
//    currentPage={currentPage}
//    totalItems={totalItems}
//    onPageChange={setCurrentPage}
//  />
//  </div>
//  </div>
//  )}

//  {/* ===== TRANSFER ENTRY MANAGEMENT TAB ===== */}
//  {activeTab === 'transfer_management' && (
//    <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] p-5">
//      <div className="flex items-center justify-between mb-4">
//        <h2 className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
//          <RefreshCw size={20} className="text-purple-400" /> Transfer Entry Management
//        </h2>
//        <div className="flex items-center gap-2">
//          <select
//            value={transferStatusFilter}
//            onChange={(e) => setTransferStatusFilter(e.target.value)}
//            className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-main)] outline-none appearance-none"
//          >
//            <option value="all">All Status</option>
//            <option value="PENDING_CONFIRMATION">Pending</option>
//            <option value="CLOSED">Closed</option>
//            <option value="ESCALATED">Escalated</option>
//          </select>
//          <button onClick={fetchTransferTickets} className="p-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition">
//            <RefreshCw size={16} />
//          </button>
//        </div>
//      </div>

//      <div className="overflow-x-auto">
//        <table className="w-full text-left">
//          <thead>
//            <tr className="border-b border-white/10">
//              <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">S.No</th>
//              <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Type</th>
//              <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">GP No.</th>
//              <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Truck No.</th>
//              <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Recipient Mill</th>
//              <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Delivery At</th>
//              <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Items</th>
//              <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Quantity</th>
//              <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Net Weight</th>
//              <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Status</th>
//              <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Supervisor</th>
//              <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Actions</th>
//            </tr>
//          </thead>
//          <tbody className="divide-y divide-white/5">
//            {transferTickets.length > 0 ? transferTickets.map((ticket: any, i: number) => (
//              <tr key={ticket.id} className="hover:bg-[var(--glass-bg)] group">
//                <td className="py-3 text-xs text-[var(--text-muted)]">{i + 1}</td>
//                <td className="py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400">Transfer</span></td>
//                <td className="py-3 text-xs font-medium text-[var(--text-main)]">
//                  {ticket.originalGp?.qrCode} <span className="text-purple-400 font-bold">(T)</span>
//                  {ticket.autoGpIn && (
//                    <><br/><span className="text-green-400 text-[10px]">{ticket.autoGpIn.qrCode} (T) In</span></>
//                  )}
//                  {ticket.autoGpOut && (
//                    <><br/><span className="text-amber-400 text-[10px]">{ticket.autoGpOut.qrCode} (T) Out</span></>
//                  )}
//                </td>
//                <td className="py-3 text-xs text-[var(--text-muted)]">{ticket.originalGp?.vehicleNo}</td>
//                <td className="py-3 text-xs text-[var(--text-muted)]">{ticket.recipientPlant?.name || 'Pending'}</td>
//                <td className="py-3 text-xs text-[var(--text-muted)]">{ticket.deliveryAtName}</td>
//                <td className="py-3 text-xs text-[var(--text-muted)]">{ticket.originalGp?.items?.map((it: any) => it.itemName).join(', ') || ticket.originalGp?.material || '-'}</td>
//                <td className="py-3 text-xs text-[var(--text-muted)]">{ticket.originalGp?.noOfBags || '-'}</td>
//                <td className="py-3 text-xs font-medium text-[var(--text-main)]">{ticket.originalGp?.netWeight ? Number(ticket.originalGp.netWeight).toFixed(3) : '-'}</td>
//                <td className="py-3">
//                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
//                    ticket.status === 'PENDING_CONFIRMATION' ? 'bg-amber-500/10 text-amber-400' :
//                    ticket.status === 'CLOSED' ? 'bg-green-500/10 text-green-500' :
//                    'bg-red-500/10 text-red-500'
//                  }`}>{ticket.status}</span>
//                </td>
//                <td className="py-3 text-xs text-[var(--text-muted)]">
//                  {ticket.originalGp?.completedBySupervisor || '-'}
//                  {ticket.autoGpIn?.completedBySupervisor && (<><br/><span className="text-green-400">{ticket.autoGpIn.completedBySupervisor}</span></>)}
//                </td>
//                <td className="py-3">
//                  <div className="flex items-center gap-1">
//                    {ticket.status === 'PENDING_CONFIRMATION' && (
//                      <button
//                        onClick={() => { setSelectedTicket(ticket); setConfirmModalOpen(true); }}
//                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold transition"
//                      >Confirm</button>
//                    )}
//                    {ticket.status === 'CLOSED' && ticket.autoGpOutId && (
//                      <button
//                        onClick={() => handlePrintConsignment(ticket.autoGpOutId)}
//                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold transition flex items-center gap-1"
//                      ><Printer size={10} /> Consignment</button>
//                    )}
//                  </div>
//                </td>
//              </tr>
//            )) : (
//              <tr>
//                <td colSpan={12} className="py-8 text-center text-sm text-[var(--text-muted-alt)]">No transfer tickets found.</td>
//              </tr>
//            )}
//          </tbody>
//        </table>
//      </div>
//    </div>
//  )}

//  {/* Transfer Confirmation Modal */}
//  <CustomModal isOpen={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} title="Confirm Transfer Entry">
//    <div className="space-y-4 p-4">
//      {selectedTicket && (
//        <>
//          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
//            <p className="text-sm text-purple-400 font-semibold">Transfer GP: {selectedTicket.originalGp?.qrCode} (T)</p>
//            <p className="text-xs text-[var(--text-muted-alt)] mt-1">Delivery At: {selectedTicket.deliveryAtName}</p>
//            <p className="text-xs text-[var(--text-muted-alt)]">Items: {selectedTicket.originalGp?.items?.map((it: any) => `${it.itemName} (${it.quantity} ${it.unit})`).join(', ')}</p>
//            <p className="text-xs text-[var(--text-muted-alt)]">Net Weight: {selectedTicket.originalGp?.netWeight} MT</p>
//          </div>
//          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-sm text-amber-500 font-medium">
//            Confirming this ticket will auto-generate GP In and GP Out entries for the Recipient Mill with identical items, quantity, and weight.
//          </div>
//          <div>
//            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Recipient Plant (Mill)</label>
//            <select
//              value={confirmForm.recipientPlantId}
//              onChange={(e) => setConfirmForm(prev => ({ ...prev, recipientPlantId: e.target.value }))}
//              className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none appearance-none"
//              required
//            >
//              <option value="">Select Plant...</option>
//              {plants.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
//            </select>
//          </div>
//          <div>
//            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Supervisor Name (Accepting)</label>
//            <input
//              type="text"
//              value={confirmForm.supervisorName}
//              onChange={(e) => setConfirmForm(prev => ({ ...prev, supervisorName: e.target.value }))}
//              className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none"
//              placeholder="Enter supervisor name"
//              required
//            />
//          </div>
//          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
//            <button onClick={() => setConfirmModalOpen(false)} className="px-4 py-2 bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg text-sm font-medium hover:bg-[var(--glass-bg-hover)] transition">Cancel</button>
//            <button
//              onClick={handleConfirmTransfer}
//              disabled={!confirmForm.supervisorName || !confirmForm.recipientPlantId}
//              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-green-500/20"
//            >Confirm & Generate GPs</button>
//          </div>
//        </>
//      )}
//    </div>
//  </CustomModal>

//  {/* BOTTOM DASHBOARD PANEL ROW */}
//  {(activeTab === 'create_pass' || activeTab === 'gate_in' || activeTab === 'gate_out') && (
//  <div className="grid grid-cols-2 gap-6 mt-2">
//  {/* LEFT: IN CAMPUS STATUS DONUT */}
//  <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] p-5 flex flex-col">
//  <div className="flex items-center justify-between mb-2">
//  <h2 className="text-lg font-semibold text-[var(--text-main)]">In Campus / In Transit Status</h2>
//  <button className="text-blue-500 text-sm font-medium hover:text-blue-400">View All</button>
//  </div>
//  <div className="flex-1 flex items-center">
//  <div className="h-48 w-48 relative">
//  <ResponsiveContainer width="100%" height="100%">
//  <PieChart>
//  <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
//  {chartData.map((entry, index) => (
//  <Cell key={`cell-${index}`} fill={entry.color} />
//  ))}
//  </Pie>
//  <Tooltip 
//  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
//  itemStyle={{ color: '#fff' }}
//  />
//  </PieChart>
//  </ResponsiveContainer>
//  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
//  <span className="text-xs text-[var(--text-muted-alt)] font-medium">Total</span>
//  <span className="text-2xl font-bold text-[var(--text-main)]">{analytics.activeGatePass || 0}</span>
//  <span className="text-[10px] text-[var(--text-muted-alt)]">Vehicles</span>
//  </div>
//  </div>
//  <div className="flex-1 pl-8 space-y-4">
//  {chartData.map((entry, index) => (
//  <div key={index} className="flex items-center justify-between">
//  <div className="flex items-center gap-2">
//  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
//  <span className="text-sm text-[var(--text-muted)] font-medium">{entry.name}</span>
//  </div>
//  <div className="text-right">
//  <span className="text-sm font-bold text-[var(--text-main)] block">{entry.isPlaceholder ? 0 : entry.value}</span>
//  <span className="text-[10px] text-[var(--text-muted-alt)]">{entry.isPlaceholder ? '0.00' : (analytics.activeGatePass > 0 ? ((entry.value / analytics.activeGatePass) * 100).toFixed(2) : 0)}%</span>
//  </div>
//  </div>
//  ))}
//  </div>
//  </div>
//  <div className="mt-4 pt-4 border-t border-[var(--border-subtle-alt)] text-center">
//  <button className="text-blue-500 border border-blue-500/30 hover:bg-blue-500/10 px-4 py-1.5 rounded-lg text-sm font-medium transition w-full flex items-center justify-center gap-2">
//  <Search size={16} /> View All In Campus Vehicles
//  </button>
//  </div>
//  </div>

//  {/* RIGHT: DUPLICATE PREVENTION ALERTS */}
//  <div className="bg-[#1a1011] rounded-xl border border-[#3a1d20] p-5 flex flex-col relative overflow-hidden">
//  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[80px] rounded-full pointer-events-none"></div>
 
//  <div className="flex items-center justify-between mb-4 relative z-10">
//  <h2 className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
//  <ShieldAlert className="text-red-500" size={20} /> Duplicate Prevention Alerts
//  </h2>
//  <button className="text-blue-500 text-sm font-medium hover:text-blue-400">View All</button>
//  </div>

//  <div className="flex-1 space-y-3 relative z-10">
//  {duplicateLogs.length === 0 ? (
//  <div className="text-center text-[var(--text-muted-alt)] text-sm py-4">No recent blocked attempts</div>
//  ) : duplicateLogs.map((log: any, i: number) => (
//  <div key={log.id || i} className="flex gap-4 p-3 rounded-lg border border-red-900/30 bg-red-950/20 items-start">
//  <div className="mt-0.5 bg-red-500/20 p-1.5 rounded text-red-400">
//  <ShieldCheck size={14} />
//  </div>
//  <div className="flex-1">
//  <p className="text-sm font-semibold text-red-200">Vehicle: {log.vehicleNo}</p>
//  <p className="text-xs text-red-400/70 mt-0.5">{log.reason}</p>
//  </div>
//  <div className="text-right min-w-[60px]">
//  <p className="text-xs font-medium text-[var(--text-muted-alt)]">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
//  <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-wider">Blocked</p>
//  </div>
//  </div>
//  ))}
//  </div>
//  <div className="mt-4 pt-4 border-t border-red-900/30 text-center relative z-10">
//  <button className="text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 px-4 py-1.5 rounded-lg text-sm font-medium transition w-full">
//  View All Alerts
//  </button>
//  </div>
//  </div>
//  </div>
//  )}

//   {/* REPORT SUMMARY TAB */}
//   {activeTab === 'report_summary' && (
//   <div className="flex-1 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] p-5 overflow-x-auto">
//   <div className="flex items-center justify-between mb-6">
//   <h2 className="text-xl font-bold text-[var(--text-main)]">Gate Pass In / Out Report Summary</h2>
//   <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--glass-bg-hover)] transition-colors text-sm font-medium">
//   <Download size={16} /> Export CSV
//   </button>
//   </div>
//   <table className="w-full text-left border-collapse whitespace-nowrap">
//   <thead>
//   <tr className="border-b border-[var(--border-subtle-alt)]">
//   <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">S.No.</th>
//   <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Date & Time</th>
//   <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Type</th>
//   <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">GP No.</th>
//   <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Vehicle No.</th>
//   <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Party</th>
//   <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Item</th>
//   <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Bags</th>
//   <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Net Wt</th>
//   <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Nt Wt Party</th>
//   <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">GP Status</th>
//   <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Soda No.</th>
//   <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Note</th>
//   <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Supervisor Sign</th>
//   </tr>
//   </thead>
//   <tbody>
//   {recentEntries.length === 0 ? (
//   <tr>
//   <td colSpan={13} className="py-8 text-center text-[var(--text-muted-alt)]">No records found</td>
//   </tr>
//   ) : recentEntries.map((entry, idx) => (
//   <tr key={entry.id} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)] transition-colors">
//   <td className="py-3 text-sm">{idx + 1}</td>
//   <td className="py-3 text-[11px] font-medium text-[var(--text-muted-alt)]">{new Date(entry.createdAt).toLocaleString()}</td>
//   <td className="py-3 text-sm">
//   <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${entry.passType === 'INWARD' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
//   {entry.passType}
//   </span>
//   </td>
//   <td className="py-3 text-sm font-medium">{entry.qrCode}</td>
//   <td className="py-3 text-sm font-medium">{entry.vehicleNo}</td>
//   <td className="py-3 text-sm max-w-[150px] truncate">{entry.supplier?.name || '-'} {entry.gstNo ? `(GST: ${entry.gstNo})` : ''}</td>
//   <td className="py-3 text-sm">{entry.items?.length > 0 ? entry.items.map((i: any) => i.itemName).join(', ') : entry.material || entry.purpose || '-'}</td>
//   <td className="py-3 text-sm">
//     {entry.items?.length > 0 
//       ? entry.items.map((i: any) => `${i.quantity} ${i.unit}`).join(', ') 
//       : (
//           entry.passType === 'OUTWARD' && entry.shortageBags > 0
//           ? `${entry.mainBags} + ${entry.shortageBags} = ${entry.mainBags + entry.shortageBags} Bags`
//           : (entry.noOfBags ? `${entry.noOfBags} Bags` : '-')
//         )
//     }
//   </td>
//   <td className="py-3 text-sm font-bold text-[#e67e00]">{entry.weighbridgeActive ? (entry.netWeight ? `${Number(entry.netWeight).toFixed(3)} MT` : '-') : 'N/A'}</td>
//   <td className="py-3 text-sm font-bold text-blue-400">{entry.ntWtParty ? `${Number(entry.ntWtParty).toFixed(3)} MT` : '-'}</td>
//   <td className="py-3 text-sm">
//   <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${entry.isDraft ? 'bg-yellow-500/20 text-yellow-500' : entry.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>
//   {entry.isDraft ? 'DRAFT' : entry.status}
//   </span>
//   </td>
//   <td className="py-3 text-sm">{entry.sodaNo || '-'}</td>
//   <td className="py-3 text-sm text-[var(--text-muted-alt)] truncate max-w-[120px]">{entry.remarks || '-'}</td>
//   <td className="py-3 text-sm font-medium text-[var(--text-main)]">{entry.completedBySupervisor || '-'}</td>
//   </tr>
//   ))}
//   </tbody>
//   </table>
  
//   {/* Report Closure Action */}
//   <div className="mt-6 flex justify-end">
//     <button 
//       onClick={() => setReportFinalizeModalOpen(true)}
//       className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
//     >
//       <CheckCircle size={18} />
//       Finalize Daily Report
//     </button>
//   </div>

//   {/* Pagination */}
//   <Pagination 
//     currentPage={currentPage}
//     totalItems={totalItems}
//     onPageChange={setCurrentPage}
//   />
//   </div>
//   )}

//  {/* PLACEHOLDER TABS */}
//  {activeTab === 'qr_barcode' && (
//  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-subtle)] rounded-xl bg-[var(--glass-bg)] py-20 relative overflow-hidden">
//  {!isScannerActive ? (
//  <>
//  <div className="p-6 bg-amber-500/10 rounded-full mb-4">
//  <QrCode size={48} className="text-amber-500" />
//  </div>
//  <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Hardware Scanner Mode</h2>
//  <p className="text-[var(--text-muted-alt)] text-center max-w-md">Connect your barcode scanner or use the camera to scan entry/exit tickets quickly.</p>
//  <button onClick={() => setIsScannerActive(true)} className="mt-6 bg-[#e67e00] text-black px-6 py-2.5 rounded-lg font-bold hover:bg-[#d67500] transition-colors">
//  Initialize Scanner
//  </button>
//  </>
//  ) : (
//  <div className="flex flex-col items-center justify-center w-full max-w-lg animate-in fade-in zoom-in duration-300">
//  <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
//  {/* Scanning laser animation */}
//  <div className="absolute inset-0 border-4 border-amber-500/30 rounded-3xl overflow-hidden">
//  <div className="w-full h-1 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,1)] absolute top-0 left-0 animate-[scan_2s_ease-in-out_infinite]"></div>
//  </div>
//  <QrCode size={64} className="text-[var(--text-main)]/20" />
//  {isScanning && (
//  <div className="absolute inset-0 bg-amber-500/20 backdrop-blur-sm flex items-center justify-center rounded-3xl">
//  <RefreshCw className="animate-spin text-amber-500" size={32} />
//  </div>
//  )}
//  </div>
 
//  <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">{isScanning ? 'Processing Scan...' : 'Scanner Ready'}</h2>
//  <p className="text-[var(--text-muted-alt)] text-center mb-6">Aim your scanner at the QR code and scan.</p>
 
//  <div className="w-full relative">
//  <input 
//  type="text" 
//  autoFocus
//  value={scannedData}
//  onChange={(e) => setScannedData(e.target.value)}
//  onKeyDown={handleScannerInput}
//  placeholder="Scanner input will appear here..." 
//  className="w-full bg-[var(--bg-panel)] border border-amber-500/50 rounded-lg px-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-all"
//  disabled={isScanning}
//  />
//  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
//  <span className="flex h-2.5 w-2.5">
//  <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-green-400 opacity-75"></span>
//  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
//  </span>
//  <span className="text-xs text-green-500 font-medium uppercase">Active</span>
//  </div>
//  </div>

//  <button onClick={() => { setIsScannerActive(false); setScannedData(''); }} className="mt-8 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] underline text-sm transition-colors">
//  Cancel & Return
//  </button>
//  </div>
//  )}
 
//  {/* Custom Tailwind Animation for the laser line */}
//  <style>{`
//  @keyframes scan {
//  0%, 100% { transform: translateY(0); }
//  50% { transform: translateY(184px); }
//  }
//  `}</style>
//  </div>
//  )}

//  {activeTab === 'duplicate_prevention' && (
//  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-subtle)] rounded-xl bg-[var(--glass-bg)] py-20">
//  <div className="p-6 bg-red-500/10 rounded-full mb-4">
//  <ShieldAlert size={48} className="text-red-500" />
//  </div>
//  <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Security & Audit Logs</h2>
//  <p className="text-[var(--text-muted-alt)] text-center max-w-md">Detailed history of all blocked duplicate attempts and security overrides.</p>
//  <button className="mt-6 bg-[var(--glass-bg)] text-[var(--text-main)] px-6 py-2.5 rounded-lg font-medium border border-[var(--border-subtle)] hover:bg-white/20">View Full Audit Trail</button>
//  </div>
//  )}

//  </div>
 
//  {/* FOOTER MESSAGE */}
//  <div className="mt-auto pt-4 border-t border-[var(--border-subtle)] flex-shrink-0 flex items-center gap-2 text-[var(--text-muted-alt)] text-xs">
//  <ShieldCheck size={14} className="text-blue-500" />
//  <span className="font-medium text-[var(--text-muted)]">Note:</span> All gate movements are monitored. Duplicate entries are automatically blocked to ensure data accuracy and security.
//  </div>

//  <CustomModal isOpen={viewPassModalOpen} onClose={() => setViewPassModalOpen(false)} title={`Gate ${passCategory === 'INWARD' ? 'In' : 'Out'} Pass Details`}>
//  {selectedPass && (
//  <div className="space-y-4">
//  <div className="flex flex-col md:flex-row gap-6 items-start">
//  <div className="flex-1 grid grid-cols-2 gap-4">
//  <div>
//  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Pass No.</p>
//  <p className="font-semibold text-[var(--text-main)]">{selectedPass.qrCode}</p>
//  </div>
//  <div>
//  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Entry Time</p>
//  <p className="font-semibold text-[var(--text-main)]">{new Date(selectedPass.createdAt).toLocaleString()}</p>
//  </div>
//  <div>
//  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Vehicle No.</p>
//  <p className="font-semibold text-[var(--text-main)]">{selectedPass.vehicleNo}</p>
//  </div>
//  <div>
//  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Vehicle Type</p>
//  <p className="font-semibold text-[var(--text-main)]">{selectedPass.vehicleType || 'N/A'}</p>
//  </div>
//  <div>
//  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Driver Name</p>
//  <p className="font-semibold text-[var(--text-main)]">{selectedPass.driverName}</p>
//  </div>
//  <div>
//  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Driver Mobile</p>
//  <p className="font-semibold text-[var(--text-main)]">{selectedPass.contactNo || 'N/A'}</p>
//  </div>
//  <div>
//  <p className="text-xs text-[var(--text-muted-alt)] font-medium">{passCategory === 'INWARD' ? 'Supplier' : 'Party'}</p>
//  <p className="font-semibold text-[var(--text-main)]">{selectedPass.supplier?.name || 'N/A'}</p>
//  </div>
//  <div>
//  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Material / Purpose</p>
//  <p className="font-semibold text-[var(--text-main)]">{selectedPass.material || selectedPass.purpose}</p>
//  </div>
//  <div>
//  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Gross Weight</p>
//  <p className="font-semibold text-[var(--text-main)]">{selectedPass.grossWeight ? `${Number(selectedPass.grossWeight).toFixed(3)} MT` : 'N/A'}</p>
//  </div>
//  <div>
//  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Tare Weight</p>
//  <p className="font-semibold text-[var(--text-main)]">{selectedPass.tareWeight ? `${Number(selectedPass.tareWeight).toFixed(3)} MT` : 'N/A'}</p>
//  </div>
//  <div>
//  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Net Weight</p>
//  <p className="font-semibold text-[var(--text-main)] text-[#e67e00]">{selectedPass.netWeight ? `${Number(selectedPass.netWeight).toFixed(3)} MT` : 'N/A'}</p>
//  </div>
//  <div>
//  <p className="text-xs text-[var(--text-muted-alt)] font-medium">No. of Bags</p>
//  <p className="font-semibold text-[var(--text-main)]">{selectedPass.noOfBags || 'N/A'}</p>
//  </div>
//  <div className="col-span-2">
//  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Remarks</p>
//  <p className="font-semibold text-[var(--text-main)]">{selectedPass.remarks || 'None'}</p>
//  </div>
  
//   {selectedPass.latestWeighbridge && (
//   <>
//   <div className="col-span-2 mt-2 pt-2 border-t border-[var(--border-subtle-alt)]">
//   <p className="text-sm text-[#e67e00] font-bold mb-2">Weighbridge Data</p>
//   </div>
//   <div>
//   <p className="text-xs text-[var(--text-muted-alt)] font-medium">Gross Weight</p>
//   <p className="font-semibold text-[var(--text-main)]">{selectedPass.latestWeighbridge.grossWeight || 'N/A'} MT</p>
//   </div>
//   <div>
//   <p className="text-xs text-[var(--text-muted-alt)] font-medium">Tare Weight</p>
//   <p className="font-semibold text-[var(--text-main)]">{selectedPass.latestWeighbridge.tareWeight || 'N/A'} MT</p>
//   </div>
//   <div>
//   <p className="text-xs text-[var(--text-muted-alt)] font-medium">Net Weight</p>
//   <p className="font-semibold text-[#e67e00]">{selectedPass.latestWeighbridge.netWeight || 'N/A'} MT</p>
//   </div>
//   </>
//   )}

//   {/* Additional Info from Procurement Batch */}
//   {selectedPass.procurementBatch?.quality && (
//   <>
//   <div className="col-span-2 mt-2 pt-2 border-t border-[var(--border-subtle-alt)]">
//   <p className="text-sm text-[#e67e00] font-bold mb-2">Quality Info</p>
//   </div>
//   <div>
//   <p className="text-xs text-[var(--text-muted-alt)] font-medium">Moisture</p>
//   <p className="font-semibold text-[var(--text-main)]">{selectedPass.procurementBatch.quality.moisture || 0}%</p>
//   </div>
//   <div>
//   <p className="text-xs text-[var(--text-muted-alt)] font-medium">Broken</p>
//   <p className="font-semibold text-[var(--text-main)]">{selectedPass.procurementBatch.quality.broken || 0}%</p>
//   </div>
//   <div>
//   <p className="text-xs text-[var(--text-muted-alt)] font-medium">Discoloration</p>
//   <p className="font-semibold text-[var(--text-main)]">{selectedPass.procurementBatch.quality.discoloration || 0}%</p>
//   </div>
//   <div>
//   <p className="text-xs text-[var(--text-muted-alt)] font-medium">Foreign Matter</p>
//   <p className="font-semibold text-[var(--text-main)]">{selectedPass.procurementBatch.quality.foreignMatter || 0}%</p>
//   </div>
//   </>
//   )}
//  </div>
 
//  <div className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col items-center justify-center shrink-0 w-full md:w-48 self-stretch">
//  <div className="bg-white p-2 rounded-lg mb-3">
//  <QRCodeCanvas 
//    id="modal-qr" 
//    value={generateQrDataString(selectedPass, plants, activeTab)}
//    size={160} 
//    level="L" 
//  />
//  </div>
//  <p className="text-xs text-[var(--text-muted-alt)] text-center uppercase tracking-wider font-semibold">Verification QR</p>
//  <p className="text-[10px] text-[var(--text-muted-alt)] text-center mt-1">Scan for pass validity</p>
//  </div>
//  </div>
 
//  <div className="flex justify-end pt-4 border-t border-[var(--border-subtle)] gap-3">
//  <button onClick={handleDownload} className="px-4 py-2 bg-[var(--glass-bg)] border border-[var(--border-subtle)] hover:bg-[var(--glass-bg)] text-[var(--text-main)] rounded-lg transition flex items-center gap-2">
//  <Download size={16} /> Download
//  </button>
//  <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-[var(--text-main)] rounded-lg transition flex items-center gap-2">
//  <Printer size={16} /> Print Pass
//  </button>
//  <button onClick={() => setViewPassModalOpen(false)} className="px-4 py-2 border border-[var(--border-subtle)] rounded-lg text-[var(--text-main)] hover:bg-[var(--glass-bg)] transition">Close</button>
//  </div>
//  </div>
//  )}
//  </CustomModal>

//   {/* Report Finalize Modal */}
//   <CustomModal isOpen={reportFinalizeModalOpen} onClose={() => setReportFinalizeModalOpen(false)} title="Finalize Daily Gate Pass Report">
//     <form onSubmit={handleFinalizeReport} className="space-y-6 p-4">
//       <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg flex gap-3">
//         <AlertTriangle className="text-amber-500 shrink-0" size={20} />
//         <div className="text-sm text-amber-500 font-medium">
//           Finalizing the report will close all currently ACTIVE Gate Passes for today. This action requires a physical manual GP check and supervisor biometric signature.
//         </div>
//       </div>

//       <div className="flex items-start gap-3 bg-[var(--glass-bg)] p-4 rounded-lg border border-[var(--border-subtle)]">
//         <input 
//           type="checkbox" 
//           id="manualMatch"
//           checked={reportFinalizeForm.manualMatchConfirmed}
//           onChange={(e) => setReportFinalizeForm(prev => ({ ...prev, manualMatchConfirmed: e.target.checked }))}
//           className="mt-1 w-5 h-5 accent-green-500 rounded cursor-pointer"
//         />
//         <label htmlFor="manualMatch" className="text-[var(--text-main)] text-sm leading-snug cursor-pointer font-medium">
//           I hereby confirm that the digital Gate Pass report matches perfectly with the physical/manual Gate Pass records for today.
//         </label>
//       </div>

//       <div className="grid grid-cols-2 gap-4">
//         <div>
//           <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Supervisor Name</label>
//           <input 
//             type="text"
//             required
//             value={reportFinalizeForm.supervisorName}
//             onChange={(e) => setReportFinalizeForm(prev => ({ ...prev, supervisorName: e.target.value }))}
//             className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"
//             placeholder="Enter your name"
//           />
//         </div>
//         <div>
//           <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Biometric Signature (XML/PID)</label>
//           <input 
//             type="password"
//             required
//             value={reportFinalizeForm.biometricData}
//             onChange={(e) => setReportFinalizeForm(prev => ({ ...prev, biometricData: e.target.value }))}
//             className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"
//             placeholder="Scan fingerprint..."
//           />
//         </div>
//       </div>

//       <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
//         <button type="button" onClick={() => setReportFinalizeModalOpen(false)} className="px-4 py-2 bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg text-sm font-medium hover:bg-[var(--glass-bg-hover)] transition">Cancel</button>
//         <button type="submit" disabled={!reportFinalizeForm.manualMatchConfirmed || !reportFinalizeForm.biometricData} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/20">Finalize & Sign</button>
//       </div>
//     </form>
//   </CustomModal>

//  </div>
//  );
// };


import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Truck, LogIn, LogOut, QrCode, ShieldAlert, ShieldCheck, ArrowUp, ArrowDown, Search, Eye, RefreshCw, Plus, Printer, CheckCircle2, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../api/axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { QRCodeCanvas } from 'qrcode.react';
import { usePlantStore } from '../store/plantStore';
import { CustomModal } from '../components/CustomModal';
import { useUiStore } from '../store/uiStore';
import Pagination from '../components/Pagination';
import Combobox from '../components/Combobox';
import { ConsignmentDispatchReport } from '../components/Yield/ConsignmentDispatchReport';
import { productsApi } from '../api/products';
import { DEFAULT_QUANTITY_UNITS, getUnitLabel, productFormatToUnit, getGatePassUnitOptions } from '../constants/quantityUnits';
import type { QuantityUnit } from '../constants/quantityUnits';
import { biometricService } from '../services/biometricService';

import toast from 'react-hot-toast';

const API_URL = 'http://localhost:3000/api';

const generateQrDataString = (pass: any, plants: any[], activeTab: string) => {
  if (!pass) return '';
  let qrText = '';

  // Determine if this is an inward pass flow
  const isInward = pass.passType === 'INWARD' || (pass.qrCode && pass.qrCode.startsWith('GIN'));
  const plantName = plants.find(p => p.id === pass.plantId)?.name || 'Unknown Plant';

  const basePass = pass.relatedInwardPass ? pass.relatedInwardPass : pass;

  if (isInward || pass.relatedInwardPass) {
    qrText += `=== STEP 1: GATE IN ===\n`;
    qrText += `Pass: ${basePass.qrCode}\n`;
    qrText += `Plant: ${plantName}\n`;
    qrText += `Date: ${new Date(basePass.createdAt).toLocaleString()}\n`;
    qrText += `Type: ${basePass.passType || 'INWARD'}\n`;
    qrText += `Gate: ${basePass.gate || 'Main Gate'}\n`;
    qrText += `Vehicle: ${basePass.vehicleNo || 'N/A'}\n`;
    qrText += `Vehicle Type: ${basePass.vehicleType || 'N/A'}\n`;
    qrText += `Driver: ${basePass.driverName || 'N/A'} (${basePass.contactNo || basePass.driverMobile || 'N/A'})\n`;
    qrText += `Purpose: ${basePass.purpose || 'N/A'}\n`;
    qrText += `Supplier/Party: ${basePass.supplier?.name || 'N/A'} (GST: ${basePass.gstNo || 'N/A'})\n`;
    qrText += `Material: ${basePass.material || 'N/A'}\n`;
    qrText += `Challan No: ${basePass.challanNo || 'N/A'}\n`;
    qrText += `Sauda No: ${basePass.sodaNo || 'N/A'}\n`;
    qrText += `Bags: ${basePass.noOfBags || 'N/A'}\n`;
    qrText += `Empty Video: ${basePass.emptyVideoTime || 'N/A'}\n`;
    qrText += `Loaded Video: ${basePass.loadedVideoTime || 'N/A'}\n`;
    qrText += `Gross Wt: ${basePass.grossWeight || 0} MT\n`;
    qrText += `Tare Wt: ${basePass.tareWeight || 0} MT\n`;
    qrText += `Net Wt: ${basePass.netWeight || 0} MT\n`;
    qrText += `Remarks: ${basePass.remarks || 'None'}\n\n`;

    if (pass.latestWeighbridge && pass.latestWeighbridge.grossWeight) {
      qrText += `=== STEP 2: WEIGHBRIDGE (GROSS) ===\n`;
      qrText += `Ticket: ${pass.latestWeighbridge.ticketNo || 'N/A'}\n`;
      qrText += `Gross: ${pass.latestWeighbridge.grossWeight} MT\n`;
      qrText += `Time: ${new Date(pass.latestWeighbridge.createdAt).toLocaleString()}\n\n`;
    }

    /* 
    if (basePass.procurementBatch?.quality) {
      qrText += `=== STEP 3: QUALITY CONTROL ===\n`;
      qrText += `Moisture: ${basePass.procurementBatch.quality.moisture || 0}%\n`;
      qrText += `Broken: ${basePass.procurementBatch.quality.broken || 0}%\n`;
      qrText += `Discoloration: ${basePass.procurementBatch.quality.discoloration || 0}%\n`;
      qrText += `Foreign: ${basePass.procurementBatch.quality.foreignMatter || 0}%\n\n`;
    }
    */

    if (pass.latestWeighbridge && pass.latestWeighbridge.tareWeight) {
      qrText += `=== STEP 3: WEIGHBRIDGE (TARE) ===\n`;
      qrText += `Tare: ${pass.latestWeighbridge.tareWeight} MT\n`;
      qrText += `Net: ${pass.latestWeighbridge.netWeight} MT\n`;
      qrText += `Time: ${new Date(pass.latestWeighbridge.updatedAt || pass.latestWeighbridge.createdAt).toLocaleString()}\n\n`;
    }
  }

  if (pass.passType === 'OUTWARD' || (pass.qrCode && pass.qrCode.startsWith('GOUT'))) {
    qrText += `=== STEP 4: GATE OUT ===\n`;
    qrText += `Pass: ${pass.qrCode}\n`;
    qrText += `Date: ${new Date(pass.createdAt).toLocaleString()}\n`;
    qrText += `Purpose: ${pass.purpose || 'N/A'}\n`;
    qrText += `Party: ${pass.supplier?.name || 'N/A'} (GST: ${pass.gstNo || 'N/A'})\n`;
    qrText += `Challan: ${pass.challanNo || 'N/A'}\n`;
    qrText += `Remarks: ${pass.remarks || 'None'}\n`;
  }

  return qrText.trim();
};

export const GatePassManagement = () => {
 const [searchParams, setSearchParams] = useSearchParams();
 const activeTab = searchParams.get('tab') || 'gate_in';
 const activePlant = usePlantStore(state => state.activePlant);
  const [passCategory, setPassCategory] = useState<'INWARD' | 'OUTWARD' | null>(null);
  const [tableFilter, setTableFilter] = useState<'INWARD' | 'OUTWARD' | 'ACTIVE'>('INWARD');
  const [reportStatus, setReportStatus] = useState<'COMPLETED' | 'ACTIVE'>('COMPLETED');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closePassId, setClosePassId] = useState<string | null>(null);
  const [closeForm, setCloseForm] = useState({ supervisorName: '', biometricData: '', isCompleteDateNA: false });
  const [lastFinalizeInfo, setLastFinalizeInfo] = useState<{ supervisorName: string; submittedAt: string } | null>(null);
  const [suggestedSeq, setSuggestedSeq] = useState<{ nextSeq: number; nextRst: number } | null>(null);
 const [trucks, setTrucks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [quantityUnits, setQuantityUnits] = useState<QuantityUnit[]>(DEFAULT_QUANTITY_UNITS);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [plants, setPlants] = useState<any[]>([]);
 const [recentEntries, setRecentEntries] = useState<any[]>([]);
 const [currentPage, setCurrentPage] = useState(1);
 const [totalItems, setTotalItems] = useState(0);
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
  passNo: '',
  previousTruckReading: '',
  newTruckReading: '',
  gate: 'Main Gate',
 vehicleNo: '',
 vehicleType: 'Truck',
 driverName: '',
 driverMobile: '',
 purpose: 'Not Applicable',
 supplierId: '',
 material: 'PADDY',
 challanNo: '',
 noOfBags: '',
 weightInputType: 'GROSS',
 grossWeight: '',
 tareWeight: '',
 netWeight: 0,
 emptyVideoTime: '',
 loadedVideoTime: '',
 gstNo: '',
 ntWtParty: '',
 sodaNo: '',
 remarks: '',
 scanQr: '',
 mandiType: 'Control',
 boliRate: '',
 boliChecklist: false,
  isCompleteDateNA: false,
  weighbridgeActive: true,
  items: [{ itemName: '', quantity: '', unit: 'Quintal', productId: '' }],
  mainBags: '',
  shortageBags: '',
  isDraft: false,
  rstNo: '',
  isTransfer: false,
  deliveryAtId: '',
  recipientPlantId: '',
  supervisorName: '',
  actualDispatchPlantId: ''
};
 const [formData, setFormData] = useState(defaultFormData);
 
  // Auto-select first options for dynamic dropdowns if not already selected
  useEffect(() => {
    productsApi.listUnits().then((res) => {
      if (Array.isArray(res.data) && res.data.length > 0) {
        setQuantityUnits(res.data);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (activePlant) {
       api.get(`/api/inventory/byproducts`).then(res => setStockMap(res.data)).catch(console.error);
       api.get('/api/gate-pass/product-options', { params: { plantId: activePlant.id } })
         .then(res => setProducts(Array.isArray(res.data) ? res.data : []))
         .catch(console.error);
    }
  }, [activePlant]);

  useEffect(() => {
    setFormData((prev: any) => {
      let updated = false;
      const next = { ...prev };
      
      if (!next.supplierId && suppliers.length > 0) {
        next.supplierId = suppliers[0].id;
        updated = true;
      }
      
      return updated ? next : prev;
    });
  }, [suppliers]);
  
  const [generatedPass, setGeneratedPass] = useState<any>(null);

  const handleCategorySelect = (cat: 'INWARD' | 'OUTWARD') => {
    if (window.confirm(`You have selected Gate Pass ${cat === 'INWARD' ? 'In' : 'Out'} (Confirm) / Not`)) {
      setPassCategory(cat);
    }
  };


  const [reportFinalizeModalOpen, setReportFinalizeModalOpen] = useState(false);
  const [reportFinalizeForm, setReportFinalizeForm] = useState({
    manualMatchConfirmed: false,
    supervisorName: '',
    biometricData: ''
  });

 const [viewPassModalOpen, setViewPassModalOpen] = useState(false);
 const [selectedPass, setSelectedPass] = useState<any>(null);

 const [isScannerActive, setIsScannerActive] = useState(false);
 const [scannedData, setScannedData] = useState('');
 const [isScanning, setIsScanning] = useState(false);

 // Transfer Management State
 const [transferTickets, setTransferTickets] = useState<any[]>([]);
 const [transferStatusFilter, setTransferStatusFilter] = useState('all');
 const [transferFirmFilter, setTransferFirmFilter] = useState('');
 const [transferRecipientFilter, setTransferRecipientFilter] = useState('');
 const [transferDeliveryFilter, setTransferDeliveryFilter] = useState('');
 const [transferGpFilter, setTransferGpFilter] = useState('');
 const [transferTruckFilter, setTransferTruckFilter] = useState('');
 const [transferItemFilter, setTransferItemFilter] = useState('');
 const [transferSupervisorFilter, setTransferSupervisorFilter] = useState('');
 const [transferNoteFilter, setTransferNoteFilter] = useState('');
 const [confirmModalOpen, setConfirmModalOpen] = useState(false);
 const [selectedTicket, setSelectedTicket] = useState<any>(null);
 const [confirmForm, setConfirmForm] = useState({ supervisorName: '', recipientPlantId: '', biometricData: '' });
 const [consignmentPromptOpen, setConsignmentPromptOpen] = useState(false);

 const fetchTransferTickets = async () => {
   const pid = activePlant?.id || 'global';
   try {
     const res = await api.get(`/api/gate-pass/transfers/${pid}`, {
       params: transferStatusFilter !== 'all' ? { status: transferStatusFilter } : {}
     });
     setTransferTickets(Array.isArray(res.data) ? res.data : (res.data?.data || []));
   } catch (error) {
     console.error('Failed to fetch transfer tickets:', error);
     useUiStore.getState().addToast('Failed to fetch transfer tickets.', 'error');
   }
 };

 useEffect(() => {
   if (activeTab === 'transfer_management') {
     fetchTransferTickets();
   }
 }, [activeTab, activePlant, transferStatusFilter]);

 const handleConfirmTransfer = async () => {
   if (!selectedTicket) return;
   if (!confirmForm.biometricData) {
     useUiStore.getState().addToast('Fingerprint is required to confirm transfer.', 'error');
     return;
   }
   if (
     activePlant?.id &&
     activePlant.id !== 'global' &&
     selectedTicket.recipientPlantId &&
     activePlant.id !== selectedTicket.recipientPlantId
   ) {
     useUiStore.getState().addToast('Switch to the Recipient Mill plant context before confirming.', 'error');
     return;
   }
   try {
     await api.post(`/api/gate-pass/transfer/${selectedTicket.id}/confirm`, {
       recipientPlantId: selectedTicket.recipientPlantId || confirmForm.recipientPlantId,
       supervisorName: confirmForm.supervisorName,
       biometricData: confirmForm.biometricData,
       confirmingPlantId: activePlant?.id || 'global',
     });
     useUiStore.getState().addToast('Transfer confirmed and GP entries generated.', 'success');
     setConfirmModalOpen(false);
     setSelectedTicket(null);
     setConfirmForm({ supervisorName: '', recipientPlantId: '', biometricData: '' });
     fetchTransferTickets();
     // Feedback 21: Recipient mill fills Consignment Dispatch on receive/confirm date
     setConsignmentPromptOpen(true);
     useUiStore.getState().addToast('Fill Consignment Dispatch for this transfer receive date.', 'info');
   } catch (error: any) {
     console.error('Failed to confirm transfer:', error);
     useUiStore.getState().addToast(error?.response?.data?.message || 'Failed to confirm transfer.', 'error');
   }
 };

 const handlePrintConsignment = async (gpOutId: string) => {
   if (!gpOutId) return;
   const pid = activePlant?.id || 'global';
   try {
     const res = await api.get(`/api/gate-pass/consignment/${gpOutId}/${pid}`);
     const { consignmentData } = res.data || {};
     const printWindow = window.open('', '_blank');
     if (printWindow && consignmentData) {
       const itemsList = (consignmentData.items || [])
         .map((it: any) => `${it.itemName} (${it.quantity} ${it.unit})`)
         .join(', ');
       printWindow.document.write(`
         <html>
           <head><title>Consignment - ${consignmentData.gpNo || ''}</title></head>
           <body style="font-family: sans-serif; padding: 24px;">
             <h2>Consignment Note</h2>
             <p><strong>GP No:</strong> ${consignmentData.gpNo || '-'}</p>
             <p><strong>Original Dispatch GP:</strong> ${consignmentData.originalDispatchGpNo || '-'}</p>
             <p><strong>From Mill:</strong> ${consignmentData.fromMill || '-'}</p>
             <p><strong>Delivery At:</strong> ${consignmentData.toDeliveryAt || '-'}</p>
             <p><strong>Truck No:</strong> ${consignmentData.truckNo || '-'}</p>
             <p><strong>Driver Name:</strong> ${consignmentData.driverName || '-'}</p>
             <p><strong>Items:</strong> ${itemsList || '-'}</p>
             <p><strong>No. of Bags:</strong> ${consignmentData.noOfBags || '-'}</p>
             <p><strong>Net Weight:</strong> ${consignmentData.netWeight || '-'}</p>
             <p><strong>Supervisor:</strong> ${consignmentData.supervisorName || '-'}</p>
             <p><strong>Date:</strong> ${consignmentData.date ? new Date(consignmentData.date).toLocaleString() : '-'}</p>
           </body>
         </html>
       `);
       printWindow.document.close();
       printWindow.print();
     }
   } catch (error: any) {
     console.error('Failed to fetch consignment details:', error);
     useUiStore.getState().addToast(error?.response?.data?.message || 'Failed to load consignment for printing.', 'error');
   }
 };

 const handleViewPass = async (qrCode: string) => {
     try {
       const res = await api.get(`/api/gate-pass/scan/${qrCode}`);
       if (res.data) {
         setSelectedPass(res.data);
         setViewPassModalOpen(true);
       }
     } catch (error) {
       console.error('Failed to fetch full pass details', error);
       useUiStore.getState().addToast('Failed to fetch pass details.', 'error');
     }
   };

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

 const response = await api.get(`/api/gate-pass/scan/${passId}`);
 
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
 <p>GATE ${passCategory === 'INWARD' ? 'IN' : 'OUT'} PASS</p>
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
 ${selectedPass.procurementBatch?.quality ? `
  <div style="grid-column: span 2; margin-top: 10px; border-top: 1px solid #ccc; padding-top: 10px;">
  <div style="font-weight: bold; font-size: 12px; margin-bottom: 5px;">Quality & Weighbridge Info</div>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
  <div><div class="label">Moisture</div><div class="value">${selectedPass.procurementBatch.quality.moisture || 0}%</div></div>
  <div><div class="label">Broken</div><div class="value">${selectedPass.procurementBatch.quality.broken || 0}%</div></div>
  <div><div class="label">Discoloration</div><div class="value">${selectedPass.procurementBatch.quality.discoloration || 0}%</div></div>
  <div><div class="label">Foreign Matter</div><div class="value">${selectedPass.procurementBatch.quality.foreignMatter || 0}%</div></div>
  </div>
  </div>
  ` : ''}
 </div>
 <div class="qr-code">
 ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" />` : ''}
 <div class="qr-label">Scan at Gate ${passCategory === 'INWARD' ? 'Out' : 'In'}</div>
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

  const handleDownload = async () => {
    if (activeTab === 'report_summary') {
    try {
      const pid = activePlant?.id || 'global';
      const res = await api.get(`/api/gate-pass/recent/${pid}?limit=1000000&status=all`);
      const allEntries = res.data.data || [];
      if (allEntries.length === 0) return;
      const headers = ['S.No.', 'Type', 'Empty Video Time', 'Loaded Video Time', 'GP No', 'Truck No', 'Party', 'Item', 'Quantity', 'Net Weight at Mill', 'Net Weight at Party', 'Soda No.', 'Supervisor Sign', 'Note'];
      const rows = allEntries.map((entry: any, idx: number) => [
      idx + 1,
      entry.passType,
      entry.emptyVideoTime || '',
      entry.loadedVideoTime || '',
      entry.qrCode,
      entry.vehicleNo,
      entry.supplier?.name || '',
      entry.items?.length > 0 ? entry.items.map((i: any) => i.itemName).join(', ') : (entry.material || entry.purpose || ''),
      entry.passType === 'OUTWARD' && (entry.mainBags || entry.shortageBags)
        ? `${entry.mainBags || 0} + ${entry.shortageBags || 0} = ${(entry.mainBags || 0) + (entry.shortageBags || 0)} Bags`
        : (entry.items?.length > 0 ? entry.items.map((i: any) => `${i.quantity} ${i.unit}`).join(', ') : (entry.noOfBags || '')),
      entry.weighbridgeActive ? (entry.netWeight ?? '') : 'N/A',
      entry.weighbridgeActive ? (entry.ntWtParty ?? 'N/A') : 'N/A',
      entry.sodaNo || '',
      entry.completedBySupervisor || '',
      entry.remarks || ''
      ]);
      const csvContent = headers.join(',') + '\n' + rows.map((r: any) => r.map((v: any) => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `gate_pass_report_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export all records', error);
    }
    return;
    }

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
    const pid = activePlant?.id || 'global';
    setFormData(prev => ({ ...prev, plantId: pid }));
    fetchData();
  }, [activePlant, activeTab, currentPage, tableFilter, reportStatus, reportDateFrom, reportDateTo]);

  useEffect(() => {
    const loadNextSeq = async () => {
      if (!passCategory || !activePlant?.id) {
        setSuggestedSeq(null);
        return;
      }
      try {
        const res = await api.get(`/api/gate-pass/next-seq/${activePlant.id}/${passCategory}`);
        setSuggestedSeq({ nextSeq: res.data.nextSeq, nextRst: res.data.nextRst });
      } catch {
        setSuggestedSeq(null);
      }
    };
    loadNextSeq();
  }, [passCategory, activePlant?.id, generatedPass]);

  const fetchData = async () => {
    const pid = activePlant?.id || 'global';
    
    try {
      const resPlants = await api.get('/plants');
      setPlants(resPlants.data);
    } catch (error) {
      console.error('Failed to fetch plants:', error);
    }

    // Fetch suppliers independently so dropdown always populates even if analytics fail
    try {
      const resSuppliers = await api.get(`/api/procurement/suppliers`);
      setSuppliers(resSuppliers.data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }

    try {
      const resTrucks = await api.get(`/api/master-data/trucks/all`, { headers: { 'x-plant-id': pid } });
      setTrucks(Array.isArray(resTrucks.data) ? resTrucks.data : (resTrucks.data?.data || []));
    } catch (error) {
      console.error('Failed to fetch trucks:', error);
    }

    try {
      const resDrivers = await api.get('/api/master-data/drivers');
      setDrivers(resDrivers.data);
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    }

    // Report: COMPLETED by default (exclude ACTIVE); Active box uses ACTIVE
    let statusParam = '';
    if (activeTab === 'report_summary') {
      statusParam = `&status=${reportStatus}`;
      if (reportDateFrom) statusParam += `&dateFrom=${reportDateFrom}`;
      if (reportDateTo) statusParam += `&dateTo=${reportDateTo}`;
    }

    try {
      const [analyticsRes, recentRes, logsRes] = await Promise.allSettled([
        api.get(`/api/gate-pass/analytics/${pid}`),
        api.get(`/api/gate-pass/recent/${pid}?type=${activeTab === 'report_summary' ? 'ALL' : tableFilter}&page=${currentPage}&limit=10${statusParam}`),
        api.get(`/api/gate-pass/duplicate-logs/${pid}`)
      ]);
      
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
      if (recentRes.status === 'fulfilled') {
        setRecentEntries(recentRes.value.data.data || []);
        setTotalItems(recentRes.value.data.total || 0);
      }
      if (logsRes.status === 'fulfilled') setDuplicateLogs(logsRes.value.data.slice(0, 3));
    } catch (error) {
      console.error('Failed to fetch gate pass data:', error);
    }
    };

  const handleFinalizeReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportFinalizeForm.manualMatchConfirmed) {
      toast.error('You must confirm that the digital report matches the manual records.');
      return;
    }
    if (!reportFinalizeForm.biometricData) {
      toast.error('Biometric signature is required.');
      return;
    }
    try {
      const pid = activePlant?.id || 'global';
      const res = await api.post(`/api/gate-pass/report/finalize/${pid}`, reportFinalizeForm);
      setLastFinalizeInfo({
        supervisorName: res.data?.supervisorName || reportFinalizeForm.supervisorName,
        submittedAt: res.data?.submittedAt || new Date().toISOString(),
      });
      toast.success(`Report finalized by ${res.data?.supervisorName || reportFinalizeForm.supervisorName}. Closed ${res.data?.closedCount ?? 0} active pass(es).`);
      setReportFinalizeModalOpen(false);
      setReportStatus('COMPLETED');
      fetchData();
      // Feedback 19: prompt consignment details after GP report
      setConsignmentPromptOpen(true);
      setSearchParams({ tab: 'create_pass' }); // stay in GP; prompt handled via toast + navigate hint
      toast('Please fill Consignment Dispatch details (Yield → Consignment Dispatch).', { icon: '📋' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to finalize report');
    }
  };

  const handleCloseGatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closePassId) return;
    if (!closeForm.biometricData) {
      toast.error('Fingerprint / biometric is required to close the Gate Pass.');
      return;
    }
    try {
      await api.post(`/api/gate-pass/${closePassId}/complete`, closeForm);
      toast.success('Gate Pass closed successfully.');
      setCloseModalOpen(false);
      setClosePassId(null);
      setCloseForm({ supervisorName: '', biometricData: '', isCompleteDateNA: false });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to close Gate Pass');
    }
  };

  const handleMasterDataBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (!value) return;
    try {
      if (name === 'vehicleNo' && !trucks.find(t => t.truckNumber === value)) {
        await api.post('/api/master-data/trucks', { truckNumber: value });
        const res = await api.get('/api/master-data/trucks');
        setTrucks(res.data);
      } else if (name === 'driverName' && !drivers.find(d => d.name === value)) {
        await api.post('/api/master-data/drivers', { name: value, phone: formData.driverMobile || '' });
        const res = await api.get('/api/master-data/drivers');
        setDrivers(res.data);
      }
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  let { name, value, type } = e.target;
  let finalValue: any = value;
  
  if (type === 'checkbox') {
    finalValue = (e.target as HTMLInputElement).checked;
  }
  
  if (name === 'driverMobile') {
    finalValue = value.replace(/[^0-9]/g, '');
  }
  
  setFormData(prev => {
  const updated = { ...prev, [name]: finalValue };
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

 const LEGACY_STOCK_UNITS: Record<string, string> = {
   PADDY: 'QTL',
   RICE: 'QTL',
   BRAN: 'QTL',
   HUSK: 'QTL',
   BROKEN: 'QTL',
   OTHER: 'QTL',
 };

 const handleItemChange = (index: number, field: string, value: string) => {
   const newItems = [...formData.items];
   const updated = { ...newItems[index], [field]: value };

   if (field === 'itemName') {
     const product = products.find((p) => p.name === value);
     if (product) {
       // Feedback 23: auto-display product quantity format (e.g. Rubber Roll → Nos)
       updated.unit = productFormatToUnit(product.quantityFormat, quantityUnits);
       updated.productId = product.id;
     } else {
       // Legacy stock items (PADDY/RICE/…) default to Quintal
       const stockDefaults: Record<string, string> = {
         PADDY: 'Quintal',
         RICE: 'Quintal',
         BRAN: 'Quintal',
         HUSK: 'Quintal',
         BROKEN: 'Quintal',
         OTHER: 'Quintal',
       };
       updated.unit = stockDefaults[value] || 'Quintal';
       updated.productId = '';
     }
   }

   newItems[index] = updated;
   setFormData(prev => ({ ...prev, items: newItems }));
 };
 const addItem = () => {
   setFormData(prev => ({ ...prev, items: [...prev.items, { itemName: '', quantity: '', unit: 'Quintal', productId: '' }] }));
 };
 const removeItem = (index: number) => {
   const newItems = formData.items.filter((_, i) => i !== index);
   setFormData(prev => ({ ...prev, items: newItems }));
 };

  const isBlock1Valid = formData.vehicleNo && formData.vehicleType && formData.driverName;
  const isBlock2Valid = isBlock1Valid && formData.purpose && formData.material && (
    formData.isTransfer ? formData.recipientPlantId && formData.deliveryAtId : formData.supplierId
  );

  const handleGeneratePass = async (e: React.FormEvent) => {
  e.preventDefault();
  if (formData.plantId === 'global' || !formData.plantId) {
    useUiStore.getState().addToast('Please select a specific plant to generate a Gate Pass.', 'error');
    return;
  }
  if (formData.isTransfer && !formData.supervisorName) {
    useUiStore.getState().addToast('Supervisor name is required for Transfer Entry.', 'error');
    return;
  }
  try {
  const type = passCategory;
  
  // Calculate bags correctly based on pass type
  const mainBagsNum = parseInt(formData.mainBags as any) || 0;
  const shortageBagsNum = parseInt(formData.shortageBags as any) || 0;
  const computedNoOfBags = type === 'OUTWARD' 
    ? (mainBagsNum + shortageBagsNum > 0 ? mainBagsNum + shortageBagsNum : null)
    : (formData.noOfBags ? parseInt(formData.noOfBags as any) : null);

  const response = await api.post(`/api/gate-pass/generate`, {
  ...formData,
  passType: type,
  gpStartDate: formData.entryDateTime || new Date().toISOString(),
  grossWeight: formData.weighbridgeActive && formData.grossWeight ? parseFloat(formData.grossWeight as any) : null,
  tareWeight: formData.weighbridgeActive && formData.tareWeight ? parseFloat(formData.tareWeight as any) : null,
  netWeight: formData.weighbridgeActive && formData.netWeight ? parseFloat(formData.netWeight as any) : null,
  ntWtParty: formData.weighbridgeActive && formData.ntWtParty ? parseFloat(formData.ntWtParty as any) : null,
  noOfBags: computedNoOfBags,
  mandiType: formData.purpose === 'Paddy Purchase' ? formData.mandiType : undefined,
  boliRate: formData.purpose === 'Paddy Purchase' && formData.mandiType === 'Boli' ? parseFloat(formData.boliRate as any) : undefined,
  boliChecklist: formData.purpose === 'Paddy Purchase' && formData.mandiType === 'Boli' ? formData.boliChecklist : undefined,
  rstNo: formData.rstNo,
  isCompleteDateNA: formData.isCompleteDateNA,
  weighbridgeActive: formData.weighbridgeActive,
  mainBags: mainBagsNum,
  shortageBags: shortageBagsNum,
  isDraft: formData.isDraft,
  isTransfer: formData.isTransfer,
  deliveryAtId: formData.isTransfer ? formData.deliveryAtId : undefined,
  recipientPlantId: formData.isTransfer ? formData.recipientPlantId : undefined,
  completedBySupervisor: formData.isTransfer ? formData.supervisorName : undefined,
  supervisorName: formData.isTransfer ? formData.supervisorName : undefined,
  items: formData.items
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
 noOfBags: pass.noOfBags || '0',
 procurementBatch: pass.procurementBatch
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

 <div 
    onClick={() => { setSearchParams({ tab: 'report_summary' }); setReportStatus('ACTIVE'); setCurrentPage(1); }}
    className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle-alt)] flex flex-col justify-center cursor-pointer hover:bg-[var(--glass-bg)] transition-colors relative overflow-hidden group"
  >
  <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
  <div className="flex items-center gap-3 mb-2 relative z-10">
  <div className="p-2 bg-blue-500/10 rounded-lg"><ShieldCheck size={20} className="text-blue-500" /></div>
  <p className="text-[var(--text-muted-alt)] text-sm font-medium">Active Gate Pass</p>
  </div>
  <div className="flex items-end justify-between relative z-10">
  <div>
  <h3 className="text-3xl font-bold text-blue-400">{analytics.activeGatePass}</h3>
  <p className="text-[var(--text-muted-alt)] text-xs mt-1">Click to view Active GPs</p>
  </div>
  <div className="flex items-center text-blue-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
    <Eye size={16} className="mr-1" /> View All
  </div>
  </div>
  </div>
 </div>



 {/* DYNAMIC WORKSPACE */}
 <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col space-y-6 pb-6">
 
 {(activeTab === 'create_pass' || activeTab === 'gate_in' || activeTab === 'gate_out') && (
 <div className="grid grid-cols-12 gap-6">
 
 {/* COLUMN 1: FORM (42%) -> 5 cols out of 12 */}
 <div className="col-span-12 lg:col-span-5 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] p-5">
 <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-semibold text-[var(--text-main)]">Create Gate Pass</h2>
    <div className="flex bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg p-0.5">
      <button type="button" onClick={() => handleCategorySelect('INWARD')} className={`px-3 py-1 text-xs font-medium rounded-md transition ${passCategory === 'INWARD' ? 'bg-[#e67e00] text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>Gate In</button>
      <button type="button" onClick={() => handleCategorySelect('OUTWARD')} className={`px-3 py-1 text-xs font-medium rounded-md transition ${passCategory === 'OUTWARD' ? 'bg-[#e67e00] text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>Gate Out</button>
    </div>
  </div>

  {/* Transfer Entry Toggle */}
  {passCategory && (
    <div className="mb-4 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
          <RefreshCw size={14} /> Transfer Entry
        </h3>
        <p className="text-xs text-[var(--text-muted-alt)] mt-0.5">Generate a transfer on behalf of another mill.</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" name="isTransfer" className="sr-only peer" checked={formData.isTransfer} onChange={(e) => setFormData(prev => ({...prev, isTransfer: e.target.checked, purpose: e.target.checked ? 'Transfer Entry' : prev.purpose}))} />
        <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
      </label>
    </div>
  )}

 <form onSubmit={handleGeneratePass} className={`space-y-4 transition-opacity duration-300 ${!passCategory ? 'opacity-40 pointer-events-none' : ''}`}>
  <div className="grid grid-cols-2 gap-4">
  {/* Removed Plant Dropdown per requirement (Default to Supervisor Mill) */}
  <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Entry Date & Time (Auto Punch) <span className="text-red-500">*</span></label>
 <input type="datetime-local" name="entryDateTime" value={formData.entryDateTime} readOnly className="w-full bg-[var(--bg-panel-hover)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none cursor-default" required />
 </div>
 <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">GP No. (Optional Override)</label>
 <input type="text" name="passNo" placeholder={suggestedSeq ? `Next: ${passCategory === 'INWARD' ? 'GIN' : 'GOUT'}-${new Date().getFullYear()}-${String(suggestedSeq.nextSeq).padStart(4, '0')}` : 'Auto Generated'} value={formData.passNo} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
 {suggestedSeq && (
   <p className="text-[10px] text-blue-400 mt-1">Chronology: next sequence #{suggestedSeq.nextSeq}</p>
 )}
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
  <Combobox
    name="vehicleNo"
    value={formData.vehicleNo}
    onChange={handleInputChange}
    onBlur={handleMasterDataBlur}
    options={trucks}
    className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"
    placeholder="Select or enter vehicle no"
    required
  />
 </div>
 {trucks.find(t => t.truckNumber === formData.vehicleNo)?.transportCategory === 'COMPANY' && (
   <>
     <div>
       <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Previous Truck Reading</label>
       <input type="number" name="previousTruckReading" value={formData.previousTruckReading} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
     </div>
     <div>
       <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">New Truck Reading</label>
       <input type="number" name="newTruckReading" value={formData.newTruckReading} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
     </div>
   </>
 )}
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
 <Combobox
    name="driverName"
    value={formData.driverName}
    onChange={(e: any) => {
      handleInputChange(e);
      const match = drivers.find(d => d.name === e.target.value);
      if (match && match.phone) {
        setFormData(prev => ({...prev, driverMobile: match.phone}));
      }
    }}
    onBlur={handleMasterDataBlur}
    options={drivers}
    placeholder="Select or type Driver"
    className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"
    required
  />
 </div>
 <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Driver Mobile</label>
 <input type="tel" maxLength={10} name="driverMobile" value={formData.driverMobile} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
 </div>
 </div>

  <div className={`space-y-4 transition-opacity duration-300 ${!isBlock1Valid ? 'opacity-40 pointer-events-none' : ''}`}>
   <div className="grid grid-cols-3 gap-4 items-end">
  <div>
  <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Purpose <span className="text-red-500">*</span></label>
  <select name="purpose" value={formData.purpose} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none appearance-none" disabled={formData.isTransfer}>
   <option value="Transfer Entry">Transfer Entry</option>
   <option value="Not Applicable">Not Applicable</option>
   <option value="Paddy Purchase">Paddy Purchase</option>
  </select>
  </div>
  {/* Item / Product dropdown removed in favor of Dynamic Items Section */}
  <div className={formData.isTransfer ? "col-span-1" : "col-span-2"}>
  <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium truncate">
    {formData.isTransfer ? 'Recipient Mill (Party)' : (passCategory === 'INWARD' ? 'From (Supplier / Party)' : 'To (Party)')} <span className="text-red-500">*</span>
  </label>
  {formData.isTransfer ? (
    <select
      name="recipientPlantId"
      value={formData.recipientPlantId}
      onChange={handleInputChange}
      className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none appearance-none"
      required
    >
      <option value="">Select Recipient Mill…</option>
      {plants.filter((p: any) => p.id !== activePlant?.id).map((p: any) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  ) : (
  <Combobox
    name="supplierId"
    value={formData.supplierId}
    onChange={handleInputChange}
    options={suppliers}
    valueKey="id"
    placeholder="Select Account"
    className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"
    required
  />
  )}
 </div>
 {formData.isTransfer && (
   <div className="col-span-1">
     <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium truncate">Delivery At <span className="text-red-500">*</span></label>
     <Combobox
      name="deliveryAtId"
      value={formData.deliveryAtId}
      onChange={handleInputChange}
      options={suppliers}
      valueKey="id"
      placeholder="Select Depo/Mill"
      className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"
      required
    />
   </div>
 )}
 {formData.isTransfer && (
   <div className="col-span-3">
     <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Creating Supervisor Sign <span className="text-red-500">*</span></label>
     <input
       name="supervisorName"
       value={formData.supervisorName}
       onChange={handleInputChange}
       required
       placeholder="Supervisor who creates this Transfer GP"
       className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none"
     />
   </div>
 )}
 </div>

  {/* Dynamic Items Entry */}
  <div className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] p-4 rounded-lg space-y-3 mt-4">
    <div className="flex items-center justify-between">
      <label className="block text-sm text-[var(--text-main)] font-semibold">Items <span className="text-red-500">*</span></label>
      <button type="button" onClick={addItem} className="text-[#e67e00] text-xs font-bold hover:underline flex items-center gap-1">
        <Plus size={14} /> Add Item
      </button>
    </div>
    {formData.items.map((item, index) => (
      <div key={index} className="grid grid-cols-12 gap-3 items-end">
        <div className="col-span-5">
          <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium">Item Name</label>
          <select value={item.itemName} onChange={(e) => handleItemChange(index, 'itemName', e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none appearance-none" required>
            <option value="">Select...</option>
            {products.length > 0 && (
              <optgroup label="Products">
                {products.map((product) => (
                  <option key={product.id} value={product.name}>
                    {product.availableStock != null
                      ? `(${product.availableStock} ${getUnitLabel(product.quantityFormat, quantityUnits)}) ${product.name}`
                      : product.name}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Stock Items">
              <option value="PADDY">{stockMap['PADDY'] !== undefined ? `(${stockMap['PADDY']}) PADDY` : 'PADDY'}</option>
              <option value="RICE">{stockMap['RICE'] !== undefined ? `(${stockMap['RICE']}) RICE` : 'RICE'}</option>
              <option value="BRAN">{stockMap['BRAN'] !== undefined ? `(${stockMap['BRAN']}) BRAN` : 'BRAN'}</option>
              <option value="HUSK">{stockMap['HUSK'] !== undefined ? `(${stockMap['HUSK']}) HUSK` : 'HUSK'}</option>
              <option value="BROKEN">{stockMap['BROKEN'] !== undefined ? `(${stockMap['BROKEN']}) BROKEN` : 'BROKEN'}</option>
              <option value="OTHER">OTHER</option>
            </optgroup>
          </select>
        </div>
        <div className="col-span-3">
          <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium">Quantity</label>
          <input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" required />
        </div>
        <div className="col-span-3">
          <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium">Unit</label>
          <select
            value={item.unit || 'Quintal'}
            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
            className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none appearance-none"
          >
            {getGatePassUnitOptions(quantityUnits).map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          {item.productId && (
            <p className="text-[9px] text-blue-400 mt-0.5">
              Auto from product: {productFormatToUnit(products.find((p) => p.id === item.productId)?.quantityFormat, quantityUnits)}
            </p>
          )}
        </div>
        <div className="col-span-1 pb-1 flex justify-center">
          {formData.items.length > 1 && (
            <button type="button" onClick={() => removeItem(index)} className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-md transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          )}
        </div>
      </div>
    ))}
  </div>

 {formData.purpose === 'Paddy Purchase' && (
   <div className="bg-[var(--glass-bg)] border border-[#e67e00]/30 rounded-lg p-4 space-y-4">
     <div className="grid grid-cols-2 gap-4">
       <div>
         <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Mandi Type <span className="text-red-500">*</span></label>
         <select name="mandiType" value={formData.mandiType} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none appearance-none">
           <option value="Control">Control</option>
           <option value="Boli">Boli</option>
         </select>
       </div>
       {formData.mandiType === 'Boli' && (
         <div>
           <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Boli Rate (₹) <span className="text-red-500">*</span></label>
           <input type="number" step="0.01" name="boliRate" value={formData.boliRate} onChange={handleInputChange} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" required />
         </div>
       )}
     </div>
     {formData.mandiType === 'Boli' && (
       <div className="flex items-start gap-2 pt-2 border-t border-[var(--border-subtle)]">
         <input type="checkbox" id="boliChecklist" name="boliChecklist" checked={formData.boliChecklist} onChange={handleInputChange} className="mt-1" required />
         <label htmlFor="boliChecklist" className="text-sm text-[var(--text-main)]">Has the Artia entered the required Boli records into the system before issuing this Gate Pass? <span className="text-red-500">*</span></label>
       </div>
     )}
   </div>
 )}

  <div className="grid grid-cols-3 gap-4">
   <div>
   <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Challan / Ref No.</label>
   <input type="text" name="challanNo" value={formData.challanNo} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
   </div>
   <div>
   <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">RST No.</label>
   <input type="text" name="rstNo" placeholder={suggestedSeq?.nextRst ? `Suggested: ${suggestedSeq.nextRst}` : ''} value={formData.rstNo} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
   {suggestedSeq?.nextRst != null && (
     <p className="text-[10px] text-blue-400 mt-1">Plant chronology: next RST {suggestedSeq.nextRst}</p>
   )}
   </div>
   
   {passCategory !== 'OUTWARD' && (
     <div>
     <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">No. of Bags / Qty</label>
     <input type="number" min="0" name="noOfBags" value={formData.noOfBags} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"  />
     </div>
   )}
  </div>

  {passCategory === 'OUTWARD' && (
    <div className="grid grid-cols-3 gap-4 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
      <div>
        <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Main Bags</label>
        <input type="number" min="0" name="mainBags" value={formData.mainBags} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Shortage Bags</label>
        <input type="number" min="0" name="shortageBags" value={formData.shortageBags} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Total Bags</label>
        <input type="number" value={(Number(formData.mainBags) || 0) + (Number(formData.shortageBags) || 0)} disabled className="w-full bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none font-bold text-center" />
      </div>
    </div>
  )}

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">GST No.</label>
 <input type="text" name="gstNo" value={formData.gstNo} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" placeholder="Enter GST Number" />
 </div>
 <div>
 <label className="block text-xs text-[var(--text-muted-alt)] mb-1 font-medium">Sauda / Contract No.</label>
 <input type="text" name="sodaNo" value={formData.sodaNo} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
 </div>
 </div>

  <div className="grid grid-cols-2 gap-3 items-end">
  <div>
  <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium truncate">Empty Video Time</label>
  <input type="time" name="emptyVideoTime" value={formData.emptyVideoTime} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
  </div>
  <div>
  <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium truncate">Loaded Video Time</label>
  <input type="time" name="loadedVideoTime" value={formData.loadedVideoTime} onChange={handleInputChange} className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none" />
  </div>
  </div>
  <div className="mt-1">
    <label className="flex items-center gap-1.5 text-xs text-yellow-500/80 cursor-pointer w-max">
      <input type="checkbox" name="isCompleteDateNA" checked={formData.isCompleteDateNA} onChange={(e) => setFormData(prev => ({...prev, isCompleteDateNA: e.target.checked}))} className="accent-yellow-500" /> GP Complete Date &amp; Time — Not Applicable
    </label>
  </div>
 </div>

 <div className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] p-3 rounded-lg">
  <div className="flex items-center gap-4 mb-3">
  <label className="text-xs text-[var(--text-muted-alt)] font-medium">Use Weighbridge:</label>
  <div className="flex items-center gap-4">
    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
      <input type="radio" name="useWeighbridge" checked={formData.weighbridgeActive} onChange={() => setFormData(prev => ({...prev, weighbridgeActive: true}))} className="accent-[#e67e00]" /> Yes
    </label>
    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
      <input type="radio" name="useWeighbridge" checked={!formData.weighbridgeActive} onChange={() => setFormData(prev => ({...prev, weighbridgeActive: false}))} className="accent-[#e67e00]" /> No
    </label>
  </div>
  </div>
 </div>

  <div className={`space-y-4 transition-opacity duration-300 ${!isBlock2Valid ? 'opacity-40 pointer-events-none' : ''}`}>
  {formData.weighbridgeActive && (
    <>
      <div className="grid grid-cols-2 gap-3 mt-3">
      <div>
      <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium truncate">Gross Wt (Qtl)</label>
      <input type="number" min="0" step="0.001" name="grossWeight" value={formData.grossWeight} onChange={handleInputChange} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle-alt)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"  />
      </div>
      <div>
      <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium truncate">Tare Wt (Qtl)</label>
      <input type="number" min="0" step="0.001" name="tareWeight" value={formData.tareWeight} onChange={handleInputChange} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle-alt)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"  />
      </div>
      <div>
      <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium truncate">Net Wt at Mill (Qtl)</label>
      <div className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle-alt)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] font-medium bg-opacity-50 flex items-center h-[38px]">
      {Number(formData.netWeight || 0).toFixed(3)}
      </div>
      </div>
      <div>
      <label className="block text-[11px] text-[var(--text-muted-alt)] mb-1 font-medium truncate">Net Wt at Party (Qtl)</label>
      <input type="number" min="0" step="0.001" name="ntWtParty" value={formData.ntWtParty} onChange={handleInputChange} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle-alt)] rounded-lg px-2 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"  />
      </div>
      </div>
    </>
  )}
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
  <label className="flex items-center gap-1.5 text-sm cursor-pointer mr-auto text-yellow-500">
    <input type="checkbox" name="isDraft" checked={formData.isDraft} onChange={(e) => setFormData(prev => ({...prev, isDraft: e.target.checked}))} className="accent-yellow-500" /> Save as Draft
  </label>
 <button type="button" onClick={handleReset} className="px-6 py-2.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--glass-bg)] font-medium text-sm transition">
 Reset
 </button>
 <button type="submit" className="flex-1 bg-[#e67e00] hover:bg-[#d67500] text-black font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2">
 <CheckCircle2 size={18} /> {formData.isDraft ? 'Save Draft' : `Generate Gate ${passCategory === 'INWARD' ? 'In' : 'Out'} Pass`}
 </button>
 </div>
 </form>
 </div>

 {/* COLUMN 2: RECENT ENTRIES GRID (100% -> 12 cols out of 12) */}
 <div className="col-span-12 lg:col-span-7 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] p-5 flex flex-col">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-semibold text-[var(--text-main)]">Recent Gate {passCategory === 'INWARD' ? 'In' : 'Out'} Entries</h2>
 <button className="text-blue-500 text-sm font-medium hover:text-blue-400">View All</button>
 </div>
 
 <div className="overflow-x-auto flex-1">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-[var(--border-subtle)]">
 <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)]">Pass No.</th>
 <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)]">Entry Time</th>
 <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)]">Vehicle No.</th>
 <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)]">{tableFilter === 'OUTWARD' ? 'To / Party' : 'From / Supplier'}</th>
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
 <div className="flex items-center justify-center gap-2">
 <button onClick={() => handleViewPass(row.qrCode)} className="text-blue-500/50 group-hover:text-blue-500 transition" title="View"><Eye size={14} /></button>
 {row.status === 'ACTIVE' && (
   <button
     onClick={() => { setClosePassId(row.id); setCloseModalOpen(true); }}
     className="text-green-500/70 hover:text-green-400 text-[10px] font-bold uppercase"
     title="Close with fingerprint"
   >
     Close
   </button>
 )}
 </div>
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
 <Pagination 
   currentPage={currentPage}
   totalItems={totalItems}
   onPageChange={setCurrentPage}
 />
 </div>
 </div>
 )}

 {/* ===== TRANSFER ENTRY MANAGEMENT TAB ===== */}
 {activeTab === 'transfer_management' && (
   <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] p-5">
     <div className="flex items-center justify-between mb-4">
       <h2 className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
         <RefreshCw size={20} className="text-purple-400" /> Transfer Entry Management
       </h2>
       <div className="flex items-center gap-2 flex-wrap">
         <select
           value={transferStatusFilter}
           onChange={(e) => setTransferStatusFilter(e.target.value)}
           className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-main)] outline-none appearance-none"
         >
           <option value="all">All Status</option>
           <option value="PENDING_CONFIRMATION">Pending</option>
           <option value="CLOSED">Closed</option>
           <option value="ESCALATED">Escalated</option>
         </select>
         <input
           placeholder="Filter Firm…"
           value={transferFirmFilter}
           onChange={(e) => setTransferFirmFilter(e.target.value)}
           className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm w-32 outline-none"
         />
         <input
           placeholder="GP No…"
           value={transferGpFilter}
           onChange={(e) => setTransferGpFilter(e.target.value)}
           className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm w-24 outline-none"
         />
         <input
           placeholder="Truck No…"
           value={transferTruckFilter}
           onChange={(e) => setTransferTruckFilter(e.target.value)}
           className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm w-28 outline-none"
         />
         <input
           placeholder="Recipient Mill…"
           value={transferRecipientFilter}
           onChange={(e) => setTransferRecipientFilter(e.target.value)}
           className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm w-36 outline-none"
         />
         <input
           placeholder="Delivery At…"
           value={transferDeliveryFilter}
           onChange={(e) => setTransferDeliveryFilter(e.target.value)}
           className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm w-32 outline-none"
         />
         <input
           placeholder="Items…"
           value={transferItemFilter}
           onChange={(e) => setTransferItemFilter(e.target.value)}
           className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm w-28 outline-none"
         />
         <input
           placeholder="Supervisor…"
           value={transferSupervisorFilter}
           onChange={(e) => setTransferSupervisorFilter(e.target.value)}
           className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm w-28 outline-none"
         />
         <input
           placeholder="Note…"
           value={transferNoteFilter}
           onChange={(e) => setTransferNoteFilter(e.target.value)}
           className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm w-28 outline-none"
         />
         <button onClick={fetchTransferTickets} className="p-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition">
           <RefreshCw size={16} />
         </button>
       </div>
     </div>

     <div className="overflow-x-auto">
       <table className="w-full text-left">
         <thead>
           <tr className="border-b border-white/10">
             <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">S.No</th>
             <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Firm</th>
             <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Type</th>
             <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">GP No.</th>
             <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Truck No.</th>
             <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Recipient Mill</th>
             <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Delivery At</th>
             <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Items</th>
             <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Quantity</th>
             <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Net Weight</th>
             <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Status</th>
             <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Supervisor</th>
             <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Note</th>
             <th className="py-3 text-xs font-semibold text-[var(--text-muted-alt)] uppercase tracking-wider">Actions</th>
           </tr>
         </thead>
         <tbody className="divide-y divide-white/5">
           {(() => {
             const filtered = transferTickets.filter((ticket: any) => {
               const firm = (ticket.dispatchPlant?.name || activePlant?.name || '').toLowerCase();
               const recip = (ticket.recipientPlant?.name || '').toLowerCase();
               const deliv = (ticket.deliveryAtName || '').toLowerCase();
               const gp = [
                 ticket.originalGp?.qrCode,
                 ticket.autoGpIn?.qrCode,
                 ticket.autoGpOut?.qrCode,
               ]
                 .filter(Boolean)
                 .join(' ')
                 .toLowerCase();
               const truck = (ticket.originalGp?.vehicleNo || '').toLowerCase();
               const items = (
                 ticket.originalGp?.items?.map((it: any) => it.itemName).join(' ') ||
                 ticket.originalGp?.material ||
                 ''
               ).toLowerCase();
               const supervisors = [
                 ticket.completedBySupervisor,
                 ticket.confirmedBySupervisor,
                 ticket.originalGp?.supervisorName,
               ]
                 .filter(Boolean)
                 .join(' ')
                 .toLowerCase();
               const note = (ticket.deliveryAtName || ticket.note || '').toLowerCase();
               if (transferFirmFilter && !firm.includes(transferFirmFilter.toLowerCase())) return false;
               if (transferRecipientFilter && !recip.includes(transferRecipientFilter.toLowerCase())) return false;
               if (transferDeliveryFilter && !deliv.includes(transferDeliveryFilter.toLowerCase())) return false;
               if (transferGpFilter && !gp.includes(transferGpFilter.toLowerCase())) return false;
               if (transferTruckFilter && !truck.includes(transferTruckFilter.toLowerCase())) return false;
               if (transferItemFilter && !items.includes(transferItemFilter.toLowerCase())) return false;
               if (transferSupervisorFilter && !supervisors.includes(transferSupervisorFilter.toLowerCase()))
                 return false;
               if (transferNoteFilter && !note.includes(transferNoteFilter.toLowerCase())) return false;
               return true;
             });
             return filtered.length > 0 ? filtered.map((ticket: any, i: number) => (
             <tr key={ticket.id} className="hover:bg-[var(--glass-bg)] group">
               <td className="py-3 text-xs text-[var(--text-muted)]">{i + 1}</td>
               <td className="py-3 text-xs text-[var(--text-muted)]">{ticket.dispatchPlant?.name || activePlant?.name || '-'}</td>
               <td className="py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400">Transfer</span></td>
               <td className="py-3 text-xs font-medium text-[var(--text-main)]">
                 {(() => {
                   const pid = activePlant?.id;
                   const isGlobal = !pid || pid === 'global';
                   const isDispatch = pid === ticket.dispatchPlantId;
                   const isRecipient = pid === ticket.recipientPlantId;
                   // Feedback 21: dispatch = original (T) only; recipient = In+Out; admin/global = all
                   if (isRecipient && !isGlobal) {
                     return (
                       <>
                         {ticket.autoGpIn ? (
                           <span className="text-green-400 text-[10px]">{ticket.autoGpIn.qrCode} (T) In</span>
                         ) : (
                           <span className="text-[var(--text-muted)] text-[10px]">Pending confirm</span>
                         )}
                         {ticket.autoGpOut && (
                           <>
                             <br />
                             <span className="text-amber-400 text-[10px]">{ticket.autoGpOut.qrCode} (T) Out</span>
                           </>
                         )}
                       </>
                     );
                   }
                   if (isDispatch && !isGlobal) {
                     return (
                       <>
                         {ticket.originalGp?.qrCode} <span className="text-purple-400 font-bold">(T)</span>
                       </>
                     );
                   }
                   return (
                     <>
                       {ticket.originalGp?.qrCode} <span className="text-purple-400 font-bold">(T)</span>
                       {ticket.autoGpIn && (
                         <>
                           <br />
                           <span className="text-green-400 text-[10px]">{ticket.autoGpIn.qrCode} (T) In</span>
                         </>
                       )}
                       {ticket.autoGpOut && (
                         <>
                           <br />
                           <span className="text-amber-400 text-[10px]">{ticket.autoGpOut.qrCode} (T) Out</span>
                         </>
                       )}
                     </>
                   );
                 })()}
               </td>
               <td className="py-3 text-xs text-[var(--text-muted)]">{ticket.originalGp?.vehicleNo}</td>
               <td className="py-3 text-xs text-[var(--text-muted)]">{ticket.recipientPlant?.name || 'Pending'}</td>
               <td className="py-3 text-xs text-[var(--text-muted)]">{ticket.deliveryAtName}</td>
               <td className="py-3 text-xs text-[var(--text-muted)]">{ticket.originalGp?.items?.map((it: any) => it.itemName).join(', ') || ticket.originalGp?.material || '-'}</td>
               <td className="py-3 text-xs text-[var(--text-muted)]">{ticket.originalGp?.noOfBags || '-'}</td>
               <td className="py-3 text-xs font-medium text-[var(--text-main)]">{ticket.originalGp?.netWeight ? Number(ticket.originalGp.netWeight).toFixed(3) : '-'}</td>
               <td className="py-3">
                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                   ticket.status === 'PENDING_CONFIRMATION' ? 'bg-amber-500/10 text-amber-400' :
                   ticket.status === 'CLOSED' ? 'bg-green-500/10 text-green-500' :
                   'bg-red-500/10 text-red-500'
                 }`}>{ticket.status}</span>
               </td>
               <td className="py-3 text-xs text-[var(--text-muted)]">
                 {ticket.originalGp?.completedBySupervisor || '-'}
                 {ticket.autoGpIn?.completedBySupervisor && (<><br/><span className="text-green-400">{ticket.autoGpIn.completedBySupervisor}</span></>)}
               </td>
               <td className="py-3 text-xs text-[var(--text-muted)] max-w-[120px] truncate" title={ticket.deliveryAtName}>
                 {ticket.deliveryAtName || '-'}
               </td>
               <td className="py-3">
                 <div className="flex items-center gap-1">
                   {ticket.status === 'PENDING_CONFIRMATION' &&
                     (!activePlant?.id ||
                       activePlant.id === 'global' ||
                       activePlant.id === ticket.recipientPlantId) && (
                     <button
                       onClick={() => {
                         setSelectedTicket(ticket);
                         setConfirmForm((prev) => ({
                           ...prev,
                           recipientPlantId: ticket.recipientPlantId || '',
                         }));
                         setConfirmModalOpen(true);
                       }}
                       className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold transition"
                     >Confirm</button>
                   )}
                   {ticket.status === 'CLOSED' && ticket.autoGpOutId && (
                     <button
                       onClick={() => handlePrintConsignment(ticket.autoGpOutId)}
                       className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold transition flex items-center gap-1"
                     ><Printer size={10} /> Consignment</button>
                   )}
                 </div>
               </td>
             </tr>
           )) : (
             <tr>
               <td colSpan={14} className="py-8 text-center text-sm text-[var(--text-muted-alt)]">No transfer tickets found.</td>
             </tr>
           );
           })()}
         </tbody>
       </table>
     </div>
   </div>
 )}

 {/* Transfer Confirmation Modal */}
 <CustomModal isOpen={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} title="Confirm Transfer Entry">
   <div className="space-y-4 p-4">
     {selectedTicket && (
       <>
         <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
           <p className="text-sm text-purple-400 font-semibold">Transfer GP: {selectedTicket.originalGp?.qrCode} (T)</p>
           <p className="text-xs text-[var(--text-muted-alt)] mt-1">Delivery At: {selectedTicket.deliveryAtName}</p>
           <p className="text-xs text-[var(--text-muted-alt)]">Items: {selectedTicket.originalGp?.items?.map((it: any) => `${it.itemName} (${it.quantity} ${it.unit})`).join(', ')}</p>
           <p className="text-xs text-[var(--text-muted-alt)]">Net Weight: {selectedTicket.originalGp?.netWeight} MT</p>
         </div>
         <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-sm text-amber-500 font-medium">
           Confirming this ticket will auto-generate GP In and GP Out entries for the Recipient Mill with identical items, quantity, and weight.
         </div>
         <div>
           <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Recipient Plant (Mill)</label>
           <input
             type="text"
             readOnly
             value={selectedTicket.recipientPlant?.name || 'Recipient mill'}
             className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none opacity-80"
           />
           <p className="text-[10px] text-[var(--text-muted-alt)] mt-1">
             Fixed on the transfer ticket — only this mill can confirm. Switch plant context to the recipient if needed.
           </p>
         </div>
         <div>
           <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Supervisor Name (Accepting)</label>
           <input
             type="text"
             value={confirmForm.supervisorName}
             onChange={(e) => setConfirmForm(prev => ({ ...prev, supervisorName: e.target.value }))}
             className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none"
             placeholder="Enter supervisor name"
             required
           />
         </div>
         <div>
           <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Fingerprint</label>
           <div className="flex gap-2">
             <input
               type="password"
               value={confirmForm.biometricData}
               onChange={(e) => setConfirmForm(prev => ({ ...prev, biometricData: e.target.value }))}
               className="flex-1 bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm outline-none"
               placeholder="Scan fingerprint..."
             />
             <button
               type="button"
               onClick={async () => {
                 try {
                   const xml = await biometricService.captureFingerprint();
                   setConfirmForm(prev => ({ ...prev, biometricData: xml }));
                   toast.success('Fingerprint captured');
                 } catch (err: any) {
                   toast.error(err?.message || 'Scan failed');
                 }
               }}
               className="px-3 py-2 bg-amber-500 text-black text-xs font-bold rounded-lg"
             >
               Scan
             </button>
           </div>
         </div>
         <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
           <button onClick={() => setConfirmModalOpen(false)} className="px-4 py-2 bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg text-sm font-medium hover:bg-[var(--glass-bg-hover)] transition">Cancel</button>
           <button
             onClick={handleConfirmTransfer}
             disabled={!confirmForm.supervisorName || !confirmForm.recipientPlantId || !confirmForm.biometricData}
             className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-green-500/20"
           >Confirm & Generate GPs</button>
         </div>
       </>
     )}
   </div>
 </CustomModal>

 {/* BOTTOM DASHBOARD PANEL ROW */}
 {(activeTab === 'create_pass' || activeTab === 'gate_in' || activeTab === 'gate_out') && (
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

  {/* REPORT SUMMARY TAB */}
  {activeTab === 'report_summary' && (
  <div className="flex-1 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle-alt)] p-5 overflow-x-auto">
  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
  <h2 className="text-xl font-bold text-[var(--text-main)]">
    Gate Pass In / Out Report Summary
    {reportStatus === 'ACTIVE' && <span className="ml-2 text-sm font-medium text-blue-400">(Active GPs)</span>}
  </h2>
  <div className="flex items-center gap-2 flex-wrap">
    <button onClick={() => { setReportStatus('COMPLETED'); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${reportStatus === 'COMPLETED' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-[var(--border-subtle)] text-[var(--text-muted)]'}`}>Completed</button>
    <button onClick={() => { setReportStatus('ACTIVE'); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${reportStatus === 'ACTIVE' ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'border-[var(--border-subtle)] text-[var(--text-muted)]'}`}>Active</button>
    <input type="date" value={reportDateFrom} onChange={(e) => setReportDateFrom(e.target.value)} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-main)]" title="From date" />
    <input type="date" value={reportDateTo} onChange={(e) => setReportDateTo(e.target.value)} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-main)]" title="To date" />
    <select
      className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-main)]"
      value={activePlant?.id || ''}
      onChange={(e) => {
        const p = plants.find((x: any) => x.id === e.target.value);
        if (p) usePlantStore.getState().setActivePlant(p);
      }}
      title="Mill-wise navigation"
    >
      <option value="">All / Current Mill</option>
      {plants.map((p: any) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
    <div className="flex items-center gap-1">
      {plants.slice(0, 6).map((p: any) => (
        <button
          key={p.id}
          type="button"
          onClick={() => {
            usePlantStore.getState().setActivePlant(p);
            setCurrentPage(1);
          }}
          className={`px-2 py-1 rounded text-[10px] font-semibold border ${
            activePlant?.id === p.id
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--glass-bg)]'
          }`}
          title={`Open report for ${p.name}`}
        >
          {p.name}
        </button>
      ))}
    </div>
    <button onClick={() => window.print()} className="flex items-center gap-1 px-3 py-1.5 bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg text-xs font-medium"><Printer size={14} /> Print</button>
    <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--glass-bg-hover)] transition-colors text-sm font-medium">
    <Download size={16} /> Export CSV
    </button>
  </div>
  </div>
  {lastFinalizeInfo && (
    <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-400">
      Last report closed by <strong>{lastFinalizeInfo.supervisorName}</strong> at {new Date(lastFinalizeInfo.submittedAt).toLocaleString()} (fingerprint verified).
    </div>
  )}
  <table className="w-full text-left border-collapse whitespace-nowrap">
  <thead>
  <tr className="border-b border-[var(--border-subtle-alt)]">
  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">S.No.</th>
  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Type</th>
  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Empty Video</th>
  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Loaded Video</th>
  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">GP No.</th>
  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Truck No.</th>
  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Party</th>
  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Items</th>
  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Quantity</th>
  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Net Wt at Mill</th>
  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Net Wt at Party</th>
  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Soda No.</th>
  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Supervisor Sign</th>
  <th className="pb-3 text-xs font-medium text-[var(--text-muted-alt)] uppercase">Note</th>
  </tr>
  </thead>
  <tbody>
  {recentEntries.length === 0 ? (
  <tr>
  <td colSpan={14} className="py-8 text-center text-[var(--text-muted-alt)]">No records found</td>
  </tr>
  ) : recentEntries.map((entry, idx) => (
  <tr key={entry.id} className="border-b border-[var(--border-subtle-alt)] hover:bg-[var(--glass-bg)] transition-colors">
  <td className="py-3 text-sm">{idx + 1}</td>
  <td className="py-3 text-sm">
  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${entry.passType === 'INWARD' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
  {entry.passType}
  </span>
  </td>
  <td className="py-3 text-[11px] text-[var(--text-muted-alt)]">{entry.emptyVideoTime || '-'}</td>
  <td className="py-3 text-[11px] text-[var(--text-muted-alt)]">{entry.loadedVideoTime || '-'}</td>
  <td className="py-3 text-sm font-medium">
    {entry.qrCode}{entry.gpSuffix ? <span className="text-purple-400 font-bold"> {entry.gpSuffix}</span> : ''}
  </td>
  <td className="py-3 text-sm font-medium">{entry.vehicleNo}</td>
  <td className="py-3 text-sm max-w-[150px] truncate">
    {entry.isTransfer
      ? (entry.partyName || entry.supplier?.name || plants.find((p: any) => p.id === entry.transferRecipientPlantId)?.name || '-')
      : (entry.supplier?.name || entry.partyName || '-')}
    {entry.gstNo ? ` (GST: ${entry.gstNo})` : ''}
  </td>
  <td className="py-3 text-sm">{entry.items?.length > 0 ? entry.items.map((i: any) => i.itemName).join(', ') : entry.material || entry.purpose || '-'}</td>
  <td className="py-3 text-sm">
    {entry.passType === 'OUTWARD' && ((entry.mainBags || 0) > 0 || (entry.shortageBags || 0) > 0)
      ? `${entry.mainBags || 0} + ${entry.shortageBags || 0} = ${(entry.mainBags || 0) + (entry.shortageBags || 0)} Bags`
      : entry.items?.length > 0
        ? entry.items.map((i: any) => `${i.quantity} ${i.unit === 'QTL' ? 'Quintal' : i.unit}`).join(', ')
        : (entry.noOfBags ? `${entry.noOfBags} Bags` : '-')
    }
  </td>
  <td className="py-3 text-sm font-bold text-[#e67e00]">{entry.weighbridgeActive ? (entry.netWeight != null ? `${Number(entry.netWeight).toFixed(3)} Qtl` : '-') : 'N/A'}</td>
  <td className="py-3 text-sm font-bold text-blue-400">{entry.weighbridgeActive ? (entry.ntWtParty != null ? `${Number(entry.ntWtParty).toFixed(3)} Qtl` : 'N/A') : 'N/A'}</td>
  <td className="py-3 text-sm">{entry.sodaNo || '-'}</td>
  <td className="py-3 text-sm font-medium text-[var(--text-main)]">{entry.completedBySupervisor || '-'}</td>
  <td className="py-3 text-sm text-[var(--text-muted-alt)] truncate max-w-[120px]" title={entry.isTransfer ? (entry.deliveryAtNote || entry.remarks || '') : (entry.remarks || '')}>
    {entry.isTransfer ? (entry.deliveryAtNote || entry.remarks || '-') : (entry.remarks || '-')}
  </td>
  </tr>
  ))}
  </tbody>
  </table>
  
  {/* Report Closure Action */}
  <div className="mt-6 flex justify-end">
    <button 
      onClick={() => setReportFinalizeModalOpen(true)}
      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
    >
      <CheckCircle size={18} />
      Finalize Daily Report
    </button>
  </div>

  {/* Pagination */}
  <Pagination 
    currentPage={currentPage}
    totalItems={totalItems}
    onPageChange={setCurrentPage}
  />
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

 <CustomModal isOpen={viewPassModalOpen} onClose={() => setViewPassModalOpen(false)} title={`Gate ${passCategory === 'INWARD' ? 'In' : 'Out'} Pass Details`}>
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
 <p className="text-xs text-[var(--text-muted-alt)] font-medium">{passCategory === 'INWARD' ? 'Supplier' : 'Party'}</p>
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
  
  {selectedPass.latestWeighbridge && (
  <>
  <div className="col-span-2 mt-2 pt-2 border-t border-[var(--border-subtle-alt)]">
  <p className="text-sm text-[#e67e00] font-bold mb-2">Weighbridge Data</p>
  </div>
  <div>
  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Gross Weight</p>
  <p className="font-semibold text-[var(--text-main)]">{selectedPass.latestWeighbridge.grossWeight || 'N/A'} MT</p>
  </div>
  <div>
  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Tare Weight</p>
  <p className="font-semibold text-[var(--text-main)]">{selectedPass.latestWeighbridge.tareWeight || 'N/A'} MT</p>
  </div>
  <div>
  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Net Weight</p>
  <p className="font-semibold text-[#e67e00]">{selectedPass.latestWeighbridge.netWeight || 'N/A'} MT</p>
  </div>
  </>
  )}

  {/* Additional Info from Procurement Batch */}
  {selectedPass.procurementBatch?.quality && (
  <>
  <div className="col-span-2 mt-2 pt-2 border-t border-[var(--border-subtle-alt)]">
  <p className="text-sm text-[#e67e00] font-bold mb-2">Quality Info</p>
  </div>
  <div>
  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Moisture</p>
  <p className="font-semibold text-[var(--text-main)]">{selectedPass.procurementBatch.quality.moisture || 0}%</p>
  </div>
  <div>
  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Broken</p>
  <p className="font-semibold text-[var(--text-main)]">{selectedPass.procurementBatch.quality.broken || 0}%</p>
  </div>
  <div>
  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Discoloration</p>
  <p className="font-semibold text-[var(--text-main)]">{selectedPass.procurementBatch.quality.discoloration || 0}%</p>
  </div>
  <div>
  <p className="text-xs text-[var(--text-muted-alt)] font-medium">Foreign Matter</p>
  <p className="font-semibold text-[var(--text-main)]">{selectedPass.procurementBatch.quality.foreignMatter || 0}%</p>
  </div>
  </>
  )}
 </div>
 
 <div className="bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col items-center justify-center shrink-0 w-full md:w-48 self-stretch">
 <div className="bg-white p-2 rounded-lg mb-3">
 <QRCodeCanvas 
   id="modal-qr" 
   value={generateQrDataString(selectedPass, plants, activeTab)}
   size={160} 
   level="L" 
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

  {/* Report Finalize Modal */}
  <CustomModal isOpen={reportFinalizeModalOpen} onClose={() => setReportFinalizeModalOpen(false)} title="Finalize Daily Gate Pass Report">
    <form onSubmit={handleFinalizeReport} className="space-y-6 p-4">
      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg flex gap-3">
        <AlertTriangle className="text-amber-500 shrink-0" size={20} />
        <div className="text-sm text-amber-500 font-medium">
          Finalizing the report will close all currently ACTIVE Gate Passes for today. This action requires a physical manual GP check and supervisor biometric signature.
        </div>
      </div>

      <div className="flex items-start gap-3 bg-[var(--glass-bg)] p-4 rounded-lg border border-[var(--border-subtle)]">
        <input 
          type="checkbox" 
          id="manualMatch"
          checked={reportFinalizeForm.manualMatchConfirmed}
          onChange={(e) => setReportFinalizeForm(prev => ({ ...prev, manualMatchConfirmed: e.target.checked }))}
          className="mt-1 w-5 h-5 accent-green-500 rounded cursor-pointer"
        />
        <label htmlFor="manualMatch" className="text-[var(--text-main)] text-sm leading-snug cursor-pointer font-medium">
          I hereby confirm that the digital Gate Pass report matches perfectly with the physical/manual Gate Pass records for today.
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Supervisor Name</label>
          <input 
            type="text"
            required
            value={reportFinalizeForm.supervisorName}
            onChange={(e) => setReportFinalizeForm(prev => ({ ...prev, supervisorName: e.target.value }))}
            className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"
            placeholder="Enter your name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Biometric Signature (Fingerprint)</label>
          <div className="flex gap-2">
            <input 
              type="password"
              required
              value={reportFinalizeForm.biometricData}
              onChange={(e) => setReportFinalizeForm(prev => ({ ...prev, biometricData: e.target.value }))}
              className="flex-1 bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-main)] focus:border-blue-500 outline-none"
              placeholder="Scan fingerprint..."
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  const xml = await biometricService.captureFingerprint();
                  setReportFinalizeForm(prev => ({ ...prev, biometricData: xml }));
                  toast.success('Fingerprint captured');
                } catch (err: any) {
                  toast.error(err?.message || 'Fingerprint capture failed');
                }
              }}
              className="px-3 py-2 bg-amber-500 text-black text-xs font-bold rounded-lg"
            >
              Scan
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
        <button type="button" onClick={() => setReportFinalizeModalOpen(false)} className="px-4 py-2 bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg text-sm font-medium hover:bg-[var(--glass-bg-hover)] transition">Cancel</button>
        <button type="submit" disabled={!reportFinalizeForm.manualMatchConfirmed || !reportFinalizeForm.biometricData} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/20">Finalize & Sign</button>
      </div>
    </form>
  </CustomModal>

  {consignmentPromptOpen && (
    <ConsignmentDispatchReport
      promptOpen={consignmentPromptOpen}
      onPromptClose={() => setConsignmentPromptOpen(false)}
    />
  )}

  <CustomModal isOpen={closeModalOpen} onClose={() => setCloseModalOpen(false)} title="Close Gate Pass (Fingerprint Required)">
    <form onSubmit={handleCloseGatePass} className="space-y-4 p-1">
      <p className="text-sm text-[var(--text-muted-alt)]">Closing a Gate Pass updates inventory and records the supervisor biometric signature.</p>
      <div>
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Supervisor Name</label>
        <input
          type="text"
          required
          value={closeForm.supervisorName}
          onChange={(e) => setCloseForm(prev => ({ ...prev, supervisorName: e.target.value }))}
          className="w-full bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-main)] outline-none"
          placeholder="Enter supervisor name"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Fingerprint</label>
        <div className="flex gap-2">
          <input
            type="password"
            required
            value={closeForm.biometricData}
            onChange={(e) => setCloseForm(prev => ({ ...prev, biometricData: e.target.value }))}
            className="flex-1 bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 text-sm outline-none"
            placeholder="Scan fingerprint..."
          />
          <button
            type="button"
            onClick={async () => {
              try {
                const xml = await biometricService.captureFingerprint();
                setCloseForm(prev => ({ ...prev, biometricData: xml }));
                toast.success('Fingerprint captured');
              } catch (err: any) {
                toast.error(err?.message || 'Fingerprint capture failed');
              }
            }}
            className="px-3 py-2 bg-amber-500 text-black text-xs font-bold rounded-lg"
          >
            Scan
          </button>
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-yellow-500 cursor-pointer">
        <input type="checkbox" checked={closeForm.isCompleteDateNA} onChange={(e) => setCloseForm(prev => ({ ...prev, isCompleteDateNA: e.target.checked }))} className="accent-yellow-500" />
        GP Complete Date &amp; Time — Not Applicable
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => setCloseModalOpen(false)} className="px-4 py-2 border border-[var(--border-subtle)] rounded-lg text-sm">Cancel</button>
        <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">Close &amp; Sign</button>
      </div>
    </form>
  </CustomModal>

 </div>
 );
};
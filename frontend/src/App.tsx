import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { DashboardShell } from './components/DashboardShell';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Dashboard } from './pages/Dashboard';
import { UsersList } from './pages/UsersList';
import { PlantsList } from './pages/PlantsList';
import { SuppliersList } from './pages/SuppliersList';
import { GatePassesList } from './pages/GatePassesList';
import { Weighbridge } from './pages/Weighbridge';
import { QualityControl } from './pages/QualityControl';
import { PurchaseRegister } from './pages/PurchaseRegister';
import MillingDashboard from './pages/MillingDashboard';
import YieldAnalytics from './pages/YieldAnalytics';
import InventoryMatrix from './pages/InventoryMatrix';
import PlantTransfers from './pages/PlantTransfers';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<UsersList />} />
            <Route path="plants" element={<PlantsList />} />
            <Route path="suppliers" element={<SuppliersList />} />
            <Route path="gate-passes" element={<GatePassesList />} />
            <Route path="weighbridge" element={<Weighbridge />} />
            <Route path="quality-control" element={<QualityControl />} />
            <Route path="reports/purchase-register" element={<PurchaseRegister />} />
            <Route path="milling" element={<MillingDashboard />} />
            <Route path="yield" element={<YieldAnalytics />} />
            <Route path="inventory" element={<InventoryMatrix />} />
            <Route path="transfers" element={<PlantTransfers />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;

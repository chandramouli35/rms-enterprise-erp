import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { DashboardShell } from './components/DashboardShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastContainer } from './components/ToastContainer';

import { Dashboard } from './pages/Dashboard';
import { UsersAndRoles } from './pages/UsersAndRoles';
import { PlantsList } from './pages/PlantsList';
import { ProcurementManagement } from './pages/ProcurementManagement';
import { WeighbridgeManagement } from './pages/WeighbridgeManagement';
import { GatePassManagement } from './pages/GatePassManagement';
import { ProductionManagement } from './pages/ProductionManagement';
import { YieldManagement } from './pages/YieldManagement';
import { InventoryManagement } from './pages/InventoryManagement';
import { InterPlantTransfer } from './pages/InterPlantTransfer';
import { ProductManagement } from './pages/ProductManagement';
import { DispatchFinanceManagement } from './pages/DispatchFinanceManagement';
import { FinanceManagement } from './pages/FinanceManagement';
import { PowerManagement } from './pages/PowerManagement';
import { BackupRestore } from './pages/BackupRestore';

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<UsersAndRoles />} />
            <Route path="plants" element={<PlantsList />} />
            <Route path="procurement" element={<ProcurementManagement />} />
            <Route path="production" element={<ProductionManagement />} />
            <Route path="yield" element={<YieldManagement />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="transfer" element={<InterPlantTransfer />} />
            <Route path="weighbridge" element={<WeighbridgeManagement />} />
            <Route path="gate-pass" element={<GatePassManagement />} />
            <Route path="products" element={<ProductManagement />} />
            <Route path="dispatch" element={<DispatchFinanceManagement />} />
            <Route path="finance" element={<FinanceManagement />} />
            <Route path="power" element={<PowerManagement />} />
            <Route path="backup" element={<BackupRestore />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

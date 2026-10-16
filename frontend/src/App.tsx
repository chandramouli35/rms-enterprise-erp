import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { DashboardShell } from './components/DashboardShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastContainer } from './components/ToastContainer';
import { Landing } from './pages/Landing';

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
import { FinanceManagement } from './pages/FinanceManagement';
import { ExpensesManagement } from './pages/ExpensesManagement';
import { TrucksDieselManagement } from './pages/TrucksDieselManagement';
import { StaffManagement } from './pages/StaffManagement';
import DryerWork from './pages/DryerWork';
import { LabourWorkOrder } from './pages/LabourWorkOrder';
import { CmsMonitoring } from './pages/CmsMonitoring';

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
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
            <Route path="finance" element={<FinanceManagement />} />
            <Route path="expenses" element={<ExpensesManagement />} />
            <Route path="diesel" element={<TrucksDieselManagement />} />
            <Route path="cms" element={<CmsMonitoring />} />
            {/* Milestone 4 remainder — redirect until enabled */}
            <Route path="dispatch" element={<Navigate to="/dashboard" replace />} />
            <Route path="power" element={<Navigate to="/dashboard" replace />} />
            <Route path="backup" element={<Navigate to="/dashboard" replace />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="dryer" element={<DryerWork />} />
            <Route path="labour-work" element={<LabourWorkOrder />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

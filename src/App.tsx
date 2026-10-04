import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import NetworkInvestigation from './pages/NetworkInvestigation';
import SuspiciousAccounts from './pages/SuspiciousAccounts';
import Investigations from './pages/Investigations';
import InvestigationDetails from './pages/InvestigationDetails';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<DashboardLayout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="transactions" element={<Transactions />} />
                    <Route path="network" element={<NetworkInvestigation />} />
                    <Route path="accounts" element={<SuspiciousAccounts />} />
                    <Route path="investigations" element={<Investigations />} />
                    <Route path="investigations/:id" element={<InvestigationDetails />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="settings" element={<Settings />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;

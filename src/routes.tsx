import { useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { AppLayout } from './components/Layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { ExpensesPage } from './pages/ExpensesPage';
import { BillsPage } from './pages/BillsPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { LoansPage } from './pages/LoansPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { DocumentsPage } from './pages/DocumentsPage';
import { FamilyPage } from './pages/FamilyPage';
import { SettingsPage } from './pages/SettingsPage';
import { MonthlyBudget } from './pages/MonthlyBudget';

type Route = 'dashboard' | 'monthlyBudget' | 'expenses' | 'bills' | 'subscriptions' | 'loans' | 'maintenance' | 'documents' | 'family' | 'settings';

export const navigate = {
  to: (_route: Route) => {},
};

let setRouteGlobal: (r: Route) => void = () => {};

export function AppRoutes() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState<Route>('dashboard');

  useEffect(() => {
    setRouteGlobal = setRoute;
    navigate.to = setRoute;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const pages: Record<Route, ReactNode> = {
    dashboard: <Dashboard />,
    monthlyBudget: <MonthlyBudget />,
    expenses: <ExpensesPage />,
    bills: <BillsPage />,
    subscriptions: <SubscriptionsPage />,
    loans: <LoansPage />,
    maintenance: <MaintenancePage />,
    documents: <DocumentsPage />,
    family: <FamilyPage />,
    settings: <SettingsPage />,
  };

  return (
    <AppLayout currentRoute={route} onNavigate={setRoute}>
      {pages[route]}
    </AppLayout>
  );
}

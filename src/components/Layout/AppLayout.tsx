import { useState } from 'react';
import { LayoutDashboard, Receipt, Bell, CreditCard, Landmark, Wrench, FolderLock,
  Users, Settings, Menu, X, LogOut, Home,
  Wallet, } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type Route = 'dashboard' | 'monthlyBudget' | 'expenses' | 'bills' | 'subscriptions' | 'loans' | 'maintenance' | 'documents' | 'settings';

const navItems: { id: Route; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'monthlyBudget', label: 'Budget Master', icon: Wallet },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'bills', label: 'Bill Reminders', icon: Bell },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'loans', label: 'EMI & Loans', icon: Landmark },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'documents', label: 'Digital Locker', icon: FolderLock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface AppLayoutProps {
  currentRoute: Route;
  onNavigate: (route: Route) => void;
  children: React.ReactNode;
}

export function AppLayout({ currentRoute, onNavigate, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">HomeWallet</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Smart Family Finance</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User section */}
          <div className="px-3 pb-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-sm">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{user?.email}</p>
                  <p className="text-xs text-slate-400">Free Plan</p>
                </div>
                <button
                  onClick={signOut}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold text-slate-900">
              {navItems.find((i) => i.id === currentRoute)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500 hidden sm:inline">Synced</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

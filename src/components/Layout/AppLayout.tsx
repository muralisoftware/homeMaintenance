import { useState } from 'react';
import { LayoutDashboard, Receipt, Bell, CreditCard, Landmark, Wrench, FolderLock,
  Users, Settings, Menu, X, LogOut, Home,
  Wallet,Notebook, } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type Route = 'dashboard' | 'monthlyBudget' | 'expenses' | 'bills' | 'subscriptions' | 'loans' | 'maintenance' | 'documents'| 'notes' | 'settings';

const navItems: { id: Route; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'monthlyBudget', label: 'Budget Master', icon: Wallet },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'bills', label: 'Bill Reminders', icon: Bell },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'loans', label: 'EMI & Loans', icon: Landmark },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'documents', label: 'Document Manager', icon: FolderLock },
  { id: 'notes', label: 'Notes', icon:  Notebook },
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
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--primary-bg)', color: 'var(--primary-text)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto h-full ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--primary-main)', borderColor: 'var(--primary-border)' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 h-16 border-b flex-shrink-0" style={{ borderColor: 'var(--primary-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/20" style={{ backgroundColor: 'var(--accent-main)' }}>
                <Home className="w-5 h-5" style={{ color: 'var(--primary-main)' }} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">HomeWallet</h1>
                <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--accent-main)' }}>Smart Family Finance</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg opacity-70 hover:opacity-100"
              style={{ color: 'var(--primary-bg)' }}
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
                      ? 'shadow-lg shadow-gold-500/20'
                      : 'opacity-70 hover:opacity-100 hover:bg-white/10 text-white'
                  }`}
                  style={isActive ? { backgroundColor: 'var(--accent-main)', color: 'var(--primary-main)' } : {}}
                >
                  <Icon className="w-[18px] h-[18px]" style={{ color: isActive ? 'var(--primary-main)' : 'white' }} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User section */}
          <div className="px-3 pb-4 flex-shrink-0">
            <div className="rounded-xl p-3 border" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'var(--primary-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm border" style={{ backgroundColor: 'var(--accent-main)', color: 'var(--primary-main)', borderColor: 'var(--accent-main)' }}>
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                  <p className="text-xs font-medium opacity-60" style={{ color: 'var(--accent-main)' }}>Premium Plan</p>
                </div>
                <button
                  onClick={signOut}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-red-400 transition-colors"
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
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top bar */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 lg:px-8 flex-shrink-0 z-30" style={{ borderColor: 'var(--primary-border)' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold text-darkblue-900">
              {navItems.find((i) => i.id === currentRoute)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-main)' }} />
            <span className="text-xs text-darkblue-400 hidden sm:inline">Secure Session</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto" style={{ backgroundColor: 'var(--primary-bg)' }}>
          {children}
        </main>

        <footer className="flex-shrink-0 bg-white" style={{ borderTop: '1px solid var(--primary-border)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--primary-text)', opacity: 0.7, fontFamily: "'Syne', sans-serif" }}>
            © 2026 <span style={{ color: 'var(--accent-main)', fontWeight: 700 }}>muralisoftware</span>. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--primary-text)', opacity: 0.5, cursor: 'pointer' }}>Privacy</span>
            <span style={{ fontSize: '12px', color: 'var(--primary-text)', opacity: 0.5, cursor: 'pointer' }}>Terms</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

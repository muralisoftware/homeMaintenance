import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingDown, Bell, CreditCard, Receipt,
  Landmark, AlertTriangle, CheckCircle2, Clock,
  ArrowUpRight, Download, FileSpreadsheet, FileText, Pencil, X, Check,
} from 'lucide-react';

interface ExpenseSummary {
  total: number;
  byCategory: { category: string; total: number }[];
}

interface BillItem {
  id: string;
  bill_type: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  provider: string;
}

interface SubscriptionItem {
  id: string;
  name: string;
  amount: number;
  billing_cycle: string;
  next_billing_date: string;
  is_active: boolean;
}

interface LoanItem {
  id: string;
  loan_type: string;
  outstanding_balance: number;
  emi_amount: number;
  emi_due_date: string;
}

const categoryColors: Record<string, string> = {
  grocery: '#0d9488',
  food: '#f59e0b',
  medical: '#ef4444',
  fuel: '#6366f1',
  education: '#8b5cf6',
  entertainment: '#ec4899',
  shopping: '#14b8a6',
  transport: '#f97316',
  bills: '#3b82f6',
  rent: '#64748b',
  other: '#94a3b8',
};

const billTypeLabels: Record<string, string> = {
  electricity: 'Electricity',
  water: 'Water Tax',
  internet: 'Internet/WiFi',
  gas: 'Gas Cylinder',
  rent: 'House Rent',
  credit_card: 'Credit Card',
  insurance: 'Insurance',
  school: 'School Fees',
  other: 'Other Bill',
};

// ─── Excel Export ──────────────────────────────────────────────────────────────
function exportToExcel(
  expenseSummary: ExpenseSummary,
  upcomingBills: BillItem[],
  subscriptions: SubscriptionItem[],
  loans: LoanItem[],
  monthlyBudget: number
) {
  const now = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
  const rows: string[] = [];

  rows.push(`Finance Dashboard Export - ${now}`);
  rows.push('');
  rows.push('SUMMARY');
  rows.push('Metric,Value');
  rows.push(`Monthly Budget,₹${monthlyBudget.toLocaleString('en-IN')}`);
  rows.push(`Total Expenses,₹${expenseSummary.total.toLocaleString('en-IN')}`);
  const savings = monthlyBudget - expenseSummary.total;
  rows.push(`Savings,₹${Math.abs(savings).toLocaleString('en-IN')} ${savings < 0 ? '(Over Budget)' : ''}`);
  rows.push(`Active Subscriptions,${subscriptions.length}`);
  rows.push(`Active Loans,${loans.length}`);
  rows.push(`Upcoming Unpaid Bills,${upcomingBills.filter(b => !b.is_paid).length}`);
  rows.push('');

  rows.push('EXPENSE BREAKDOWN');
  rows.push('Category,Amount (₹),% of Total');
  expenseSummary.byCategory.forEach(cat => {
    const pct = expenseSummary.total > 0 ? ((cat.total / expenseSummary.total) * 100).toFixed(1) : '0.0';
    rows.push(`${cat.category},${cat.total},${pct}%`);
  });
  rows.push('');

  rows.push('UPCOMING BILLS');
  rows.push('Bill Type,Provider,Amount (₹),Due Date,Status');
  upcomingBills.forEach(bill => {
    const daysLeft = Math.ceil((new Date(bill.due_date).getTime() - Date.now()) / 86400000);
    const status = bill.is_paid ? 'Paid' : daysLeft <= 0 ? 'Overdue' : `Due in ${daysLeft}d`;
    rows.push(`${billTypeLabels[bill.bill_type] || bill.bill_type},${bill.provider || 'N/A'},${bill.amount},${new Date(bill.due_date).toLocaleDateString('en-IN')},${status}`);
  });
  rows.push('');

  rows.push('ACTIVE SUBSCRIPTIONS');
  rows.push('Name,Amount (₹),Billing Cycle,Next Billing Date');
  subscriptions.forEach(sub => {
    rows.push(`${sub.name},${sub.amount},${sub.billing_cycle},${new Date(sub.next_billing_date).toLocaleDateString('en-IN')}`);
  });
  rows.push('');

  rows.push('ACTIVE LOANS');
  rows.push('Loan Type,Outstanding Balance (₹),EMI Amount (₹),EMI Due Date');
  loans.forEach(loan => {
    rows.push(`${loan.loan_type} Loan,${loan.outstanding_balance},${loan.emi_amount},${new Date(loan.emi_due_date).toLocaleDateString('en-IN')}`);
  });

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finance-dashboard-${now.replace(/\s/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Export ────────────────────────────────────────────────────────────────
async function exportToPDF(
  expenseSummary: ExpenseSummary,
  upcomingBills: BillItem[],
  subscriptions: SubscriptionItem[],
  loans: LoanItem[],
  monthlyBudget: number
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');

  const now = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
  const savings = monthlyBudget - expenseSummary.total;
  const totalEMI = loans.reduce((s, l) => s + Number(l.emi_amount), 0);
  const totalSubs = subscriptions.reduce((s, sub) => s + Number(sub.amount), 0);

  const tableStyle = `border-collapse:collapse;width:100%;margin-bottom:20px;font-size:12px;font-family:'Segoe UI',sans-serif;`;
  const thStyle = `background:#0f172a;color:#fff;padding:8px 12px;text-align:left;`;
  const tdStyle = `padding:7px 12px;border-bottom:1px solid #e2e8f0;`;
  const tdAltStyle = `padding:7px 12px;border-bottom:1px solid #e2e8f0;background:#f8fafc;`;

  const categoryRows = expenseSummary.byCategory.map((cat, i) => {
    const pct = expenseSummary.total > 0 ? ((cat.total / expenseSummary.total) * 100).toFixed(1) : '0.0';
    const color = categoryColors[cat.category] || '#94a3b8';
    const td = i % 2 === 0 ? tdStyle : tdAltStyle;
    return `<tr>
      <td style="${td}"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:6px;vertical-align:middle;"></span>${cat.category}</td>
      <td style="${td}">₹${cat.total.toLocaleString('en-IN')}</td>
      <td style="${td}">${pct}%</td>
    </tr>`;
  }).join('');

  const billRows = upcomingBills.map((bill, i) => {
    const daysLeft = Math.ceil((new Date(bill.due_date).getTime() - Date.now()) / 86400000);
    const status = bill.is_paid ? 'Paid' : daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`;
    const statusColor = bill.is_paid ? '#16a34a' : daysLeft <= 3 ? '#dc2626' : '#64748b';
    const td = i % 2 === 0 ? tdStyle : tdAltStyle;
    return `<tr>
      <td style="${td}">${billTypeLabels[bill.bill_type] || bill.bill_type}</td>
      <td style="${td}">${bill.provider || '—'}</td>
      <td style="${td}">₹${Number(bill.amount).toLocaleString('en-IN')}</td>
      <td style="${td}">${new Date(bill.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
      <td style="${td};color:${statusColor};font-weight:600;">${status}</td>
    </tr>`;
  }).join('');

  const subRows = subscriptions.map((sub, i) => {
    const td = i % 2 === 0 ? tdStyle : tdAltStyle;
    return `<tr>
      <td style="${td}">${sub.name}</td>
      <td style="${td}">₹${Number(sub.amount).toLocaleString('en-IN')}</td>
      <td style="${td};text-transform:capitalize;">${sub.billing_cycle}</td>
      <td style="${td}">${new Date(sub.next_billing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
    </tr>`;
  }).join('');

  const loanRows = loans.map((loan, i) => {
    const td = i % 2 === 0 ? tdStyle : tdAltStyle;
    return `<tr>
      <td style="${td};text-transform:capitalize;">${loan.loan_type} Loan</td>
      <td style="${td}">₹${Number(loan.outstanding_balance).toLocaleString('en-IN')}</td>
      <td style="${td}">₹${Number(loan.emi_amount).toLocaleString('en-IN')}</td>
      <td style="${td}">${new Date(loan.emi_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
    </tr>`;
  }).join('');

  const html = `
    <div id="pdf-content" style="width:794px;padding:40px;background:#fff;font-family:'Segoe UI',sans-serif;color:#1e293b;">
      <h1 style="font-size:24px;font-weight:700;color:#0f172a;margin:0 0 4px;">Finance Dashboard</h1>
      <p style="color:#64748b;font-size:13px;margin:0 0 32px;">
        ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <h2 style="font-size:15px;font-weight:600;color:#0f172a;margin:0 0 10px;border-left:4px solid #0d9488;padding-left:10px;">Summary</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px;">
        ${[
          ['Monthly Budget', `₹${monthlyBudget.toLocaleString('en-IN')}`],
          ['Total Expenses', `₹${expenseSummary.total.toLocaleString('en-IN')}`],
          ['Savings', `${savings >= 0 ? '+' : '-'}₹${Math.abs(savings).toLocaleString('en-IN')}`],
          ['Subscriptions / mo', `₹${totalSubs.toLocaleString('en-IN')}`],
          ['EMI / mo', `₹${totalEMI.toLocaleString('en-IN')}`],
          ['Unpaid Bills', `${upcomingBills.filter(b => !b.is_paid).length}`],
        ].map(([label, val]) => `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;font-weight:600;margin-bottom:4px;">${label}</div>
            <div style="font-size:20px;font-weight:700;color:#0f172a;">${val}</div>
          </div>
        `).join('')}
      </div>

      ${expenseSummary.byCategory.length > 0 ? `
      <h2 style="font-size:15px;font-weight:600;color:#0f172a;margin:0 0 10px;border-left:4px solid #0d9488;padding-left:10px;">Expense Breakdown</h2>
      <table style="${tableStyle}">
        <thead><tr><th style="${thStyle}">Category</th><th style="${thStyle}">Amount</th><th style="${thStyle}">% of Total</th></tr></thead>
        <tbody>${categoryRows}</tbody>
      </table>` : ''}

      ${upcomingBills.length > 0 ? `
      <h2 style="font-size:15px;font-weight:600;color:#0f172a;margin:0 0 10px;border-left:4px solid #0d9488;padding-left:10px;">Upcoming Bills</h2>
      <table style="${tableStyle}">
        <thead><tr><th style="${thStyle}">Bill Type</th><th style="${thStyle}">Provider</th><th style="${thStyle}">Amount</th><th style="${thStyle}">Due Date</th><th style="${thStyle}">Status</th></tr></thead>
        <tbody>${billRows}</tbody>
      </table>` : ''}

      ${subscriptions.length > 0 ? `
      <h2 style="font-size:15px;font-weight:600;color:#0f172a;margin:0 0 10px;border-left:4px solid #0d9488;padding-left:10px;">Active Subscriptions</h2>
      <table style="${tableStyle}">
        <thead><tr><th style="${thStyle}">Name</th><th style="${thStyle}">Amount</th><th style="${thStyle}">Billing Cycle</th><th style="${thStyle}">Next Date</th></tr></thead>
        <tbody>${subRows}</tbody>
      </table>` : ''}

      ${loans.length > 0 ? `
      <h2 style="font-size:15px;font-weight:600;color:#0f172a;margin:0 0 10px;border-left:4px solid #0d9488;padding-left:10px;">Active Loans</h2>
      <table style="${tableStyle}">
        <thead><tr><th style="${thStyle}">Loan Type</th><th style="${thStyle}">Outstanding Balance</th><th style="${thStyle}">EMI Amount</th><th style="${thStyle}">EMI Due Date</th></tr></thead>
        <tbody>${loanRows}</tbody>
      </table>` : ''}

      <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
        Generated by Finance Dashboard · ${now}
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const element = container.querySelector('#pdf-content') as HTMLElement;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`finance-report-${now.replace(/\s/g, '-')}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

// ─── Export Menu ───────────────────────────────────────────────────────────────
function ExportMenu({
  onExcelExport,
  onPDFExport,
}: {
  onExcelExport: () => void;
  onPDFExport: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
      >
        <Download className="w-4 h-4" />
        Export
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden w-48">
            <button
              onClick={() => { onExcelExport(); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Download as Excel
            </button>
            <div className="h-px bg-slate-100" />
            <button
              onClick={() => { onPDFExport(); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileText className="w-4 h-4 text-red-500" />
              Download as PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary>({ total: 0, byCategory: [] });
  const [upcomingBills, setUpcomingBills] = useState<BillItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loans, setLoans] = useState<LoanItem[]>([]);

  // ── Budget state ──
  const [monthlyBudget, setMonthlyBudget] = useState(50000);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('50000');
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetError, setBudgetError] = useState('');

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [expensesRes, billsRes, subsRes, loansRes, settingsRes] = await Promise.all([
      supabase.from('expenses').select('amount, category').eq('user_id', user!.id).gte('expense_date', startOfMonth).lte('expense_date', endOfMonth),
      supabase.from('bills').select('id, bill_type, amount, due_date, is_paid, provider').eq('user_id', user!.id).gte('due_date', new Date().toISOString().split('T')[0]).order('due_date', { ascending: true }).limit(5),
      supabase.from('subscriptions').select('id, name, amount, billing_cycle, next_billing_date, is_active').eq('user_id', user!.id).eq('is_active', true),
      supabase.from('loans').select('id, loan_type, outstanding_balance, emi_amount, emi_due_date').eq('user_id', user!.id).eq('is_active', true),
      supabase.from('user_settings').select('monthly_budget').eq('user_id', user!.id).single(),
    ]);

    // Load budget — fall back to 50000 if no row yet
    const budget = settingsRes.data?.monthly_budget ?? 50000;
    setMonthlyBudget(budget);
    setBudgetInput(String(budget));

    const expenses = expensesRes.data || [];
    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const categoryMap: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + Number(e.amount);
    });
    const byCategory = Object.entries(categoryMap)
      .map(([category, catTotal]) => ({ category, total: catTotal }))
      .sort((a, b) => b.total - a.total);

    setExpenseSummary({ total, byCategory });
    setUpcomingBills(billsRes.data || []);
    setSubscriptions(subsRes.data || []);
    setLoans(loansRes.data || []);
    setLoading(false);
  };

  const saveBudget = async () => {
    setBudgetError('');
    const value = parseFloat(budgetInput);
    if (isNaN(value) || value <= 0) {
      setBudgetError('Enter a valid amount');
      return;
    }

    setSavingBudget(true);
    const { error } = await supabase
      .from('user_settings')
      .upsert(
        { user_id: user!.id, monthly_budget: value, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (error) {
      setBudgetError('Failed to save. Try again.');
    } else {
      setMonthlyBudget(value);
      setEditingBudget(false);
    }
    setSavingBudget(false);
  };

  const cancelBudgetEdit = () => {
    setEditingBudget(false);
    setBudgetInput(String(monthlyBudget));
    setBudgetError('');
  };

  const totalSubscriptions = subscriptions.reduce((s, sub) => s + Number(sub.amount), 0);
  const totalEMI = loans.reduce((s, l) => s + Number(l.emi_amount), 0);
  const savings = monthlyBudget - expenseSummary.total;
  const savingsPercent = Math.max(0, Math.min(100, (savings / monthlyBudget) * 100));

  const handleExcelExport = () =>
    exportToExcel(expenseSummary, upcomingBills, subscriptions, loans, monthlyBudget);

  const handlePDFExport = () =>
    exportToPDF(expenseSummary, upcomingBills, subscriptions, loans, monthlyBudget);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <ExportMenu onExcelExport={handleExcelExport} onPDFExport={handlePDFExport} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Monthly Expenses" value={`₹${expenseSummary.total.toLocaleString('en-IN')}`} subtitle="This month" icon={Receipt} iconBg="bg-teal-50" iconColor="text-teal-600" trend={expenseSummary.total > 0 ? 'up' : 'neutral'} />
        <StatCard title="Upcoming Bills" value={upcomingBills.filter((b) => !b.is_paid).length.toString()} subtitle={`₹${upcomingBills.filter((b) => !b.is_paid).reduce((s, b) => s + Number(b.amount), 0).toLocaleString('en-IN')} due`} icon={Bell} iconBg="bg-amber-50" iconColor="text-amber-600" trend="neutral" />
        <StatCard title="Subscriptions" value={`₹${totalSubscriptions.toLocaleString('en-IN')}`} subtitle={`${subscriptions.length} active`} icon={CreditCard} iconBg="bg-blue-50" iconColor="text-blue-600" trend="neutral" />
        <StatCard title="EMI Due" value={`₹${totalEMI.toLocaleString('en-IN')}`} subtitle={`${loans.length} active loans`} icon={Landmark} iconBg="bg-rose-50" iconColor="text-rose-600" trend="neutral" />
      </div>

      {/* Savings Progress with editable budget */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900">Monthly Savings</h3>

            {editingBudget ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-400 font-medium">₹</span>
                <input
                  type="number"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveBudget();
                    if (e.key === 'Escape') cancelBudgetEdit();
                  }}
                  className="w-36 text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="e.g. 50000"
                  autoFocus
                />
                <button
                  onClick={saveBudget}
                  disabled={savingBudget}
                  className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  {savingBudget ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={cancelBudgetEdit}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                {budgetError && (
                  <span className="text-xs text-red-500">{budgetError}</span>
                )}
              </div>
            ) : (
              <button
                onClick={() => setEditingBudget(true)}
                className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 transition-colors group"
              >
                <span>Budget: ₹{monthlyBudget.toLocaleString('en-IN')}</span>
                <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          <div className={`text-2xl font-bold ml-4 ${savings >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {savings >= 0 ? '+' : ''}₹{Math.abs(savings).toLocaleString('en-IN')}
          </div>
        </div>

        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${savings >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
            style={{ width: `${savingsPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>₹0</span>
          <span>₹{monthlyBudget.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Expense Breakdown</h3>
          {expenseSummary.byCategory.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No expenses this month</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenseSummary.byCategory.map((cat) => {
                const percent = (cat.total / expenseSummary.total) * 100;
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 capitalize">{cat.category}</span>
                      <span className="text-sm text-slate-500">₹{cat.total.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: categoryColors[cat.category] || '#94a3b8' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Bills */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Upcoming Bills</h3>
          {upcomingBills.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">All bills are paid!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBills.map((bill) => {
                const daysLeft = Math.ceil((new Date(bill.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isUrgent = daysLeft <= 3;
                return (
                  <div key={bill.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isUrgent ? 'border-red-200 bg-red-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isUrgent ? 'bg-red-100' : 'bg-slate-100'}`}>
                      {isUrgent ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <Clock className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{billTypeLabels[bill.bill_type] || bill.bill_type}</p>
                      <p className="text-xs text-slate-500">{bill.provider || 'No provider'} · Due {new Date(bill.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">₹{Number(bill.amount).toLocaleString('en-IN')}</p>
                      <p className={`text-xs ${isUrgent ? 'text-red-500 font-medium' : 'text-slate-400'}`}>{daysLeft <= 0 ? 'Overdue!' : `${daysLeft}d left`}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active Subscriptions & Loans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Active Subscriptions</h3>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">₹{totalSubscriptions.toLocaleString('en-IN')}/mo</span>
          </div>
          {subscriptions.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No active subscriptions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{sub.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{sub.billing_cycle}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">₹{Number(sub.amount).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Active Loans</h3>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">EMI ₹{totalEMI.toLocaleString('en-IN')}/mo</span>
          </div>
          {loans.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <Landmark className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No active loans</p>
            </div>
          ) : (
            <div className="space-y-2">
              {loans.map((loan) => (
                <div key={loan.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900 capitalize">{loan.loan_type} Loan</p>
                    <p className="text-xs text-slate-400">Outstanding: ₹{Number(loan.outstanding_balance).toLocaleString('en-IN')}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">₹{Number(loan.emi_amount).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, iconBg, iconColor, trend }: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Receipt;
  iconBg: string;
  iconColor: string;
  trend: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-red-400" />}
        {trend === 'down' && <TrendingDown className="w-4 h-4 text-emerald-400" />}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mt-2">{title}</p>
    </div>
  );
}
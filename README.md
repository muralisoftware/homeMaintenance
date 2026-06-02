# HomeWallet - Smart Family Finance Tracker

HomeWallet is a comprehensive personal and family finance management application built with React, TypeScript, Tailwind CSS, and Supabase. It helps users track expenses, manage bills, monitor loans, and keep home maintenance tasks on track with a modern, responsive interface.

## 🚀 Features

### 💰 Expense Management
- Track daily spending with categories.
- Advanced filtering by date, week, month, and year.
- Search functionality and category-based filtering.
- **Interactive DataTable**: Sortable columns and paginated results.

### 📅 Bill Reminders
- Never miss a payment with automated reminders.
- Track recurring bills (Monthly, Quarterly, Yearly).
- Visual alerts for overdue and urgent upcoming bills.
- One-click "Mark as Paid" functionality.

### 🏦 EMI & Loans
- Monitor loan balances and principal amounts.
- Interactive progress bars showing "Paid off" percentage.
- Record EMI payments and view full payment history.
- Automatic calculation of total outstanding debt.

### 🎬 Subscriptions
- Centralized tracking for all your recurring services (Netflix, Spotify, etc.).
- Calculate total monthly and yearly subscription costs.
- Pause/Resume subscriptions with a single click.

### 🔧 Home Maintenance
- Schedule and track home maintenance tasks (AC service, Bike/Car service, etc.).
- Support for recurring tasks with custom frequencies.
- Overdue indicators and completion history.

### 📁 Document Manager & Notes
- Securely track important documents and their expiry dates.
- Quick notes system with pinning and color-coding for better organization.

### 🎨 Modern UI/UX
- **Theming**: Multiple professional themes (Dark Green, Royal Blue, Violet, Dark Mode).
- **Responsive Design**: Optimized for Desktop, Tablet, and Mobile.
- **Global Notifications**: Real-time feedback via toast messages for all operations.
- **Security**: Robust authentication via Supabase with logout confirmation.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Supabase (Auth, PostgreSQL, RLS)
- **Notifications**: React Hot Toast
- **Export**: jsPDF, XLSX for reports

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd HomeWallet
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## 🗄️ Database Schema

The project uses Supabase (PostgreSQL) with Row Level Security (RLS) to ensure data privacy.

### Key Tables:
- `expenses`: Tracks individual spending records.
- `bills`: Manages bill reminders and payment statuses.
- `loans`: Tracks loan principals, EMI, and balances.
- `loan_payments`: History of individual EMI payments.
- `subscriptions`: Monthly/Yearly recurring services.
- `maintenance_tasks`: Home service schedules.
- `notes`: Personal quick notes.
- `documents`: Tracking important file metadata.

## 🤝 Contribution

Contributions are welcome! Please feel free to submit a Pull Request.

---
© 2026 **muralisoftware**. All rights reserved.

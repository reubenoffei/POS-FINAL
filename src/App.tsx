import React, { useState } from 'react';
import { ShopProvider, useShop } from './context/ShopContext';
import { BranchGatekeeper } from './components/BranchGatekeeper';
import { POSView } from './components/POSView';
import { StockView } from './components/StockView';
import { SalesView } from './components/SalesView';
import { PurchasesView } from './components/PurchasesView';
import { CustomersView } from './components/CustomersView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { AccountAuthModal } from './components/AccountAuthModal';
import {
  Store,
  ShoppingCart,
  Package,
  Receipt,
  Truck,
  Users,
  BarChart3,
  Settings,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  User,
  ChevronDown,
  Building2,
  LogIn,
  LogOut,
  Sparkles,
  Radio,
  Cloud,
} from 'lucide-react';

type ActiveTab =
  | 'pos'
  | 'stock'
  | 'sales'
  | 'purchases'
  | 'customers'
  | 'analytics'
  | 'settings';

const ShopApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const {
    settings,
    lowStockProducts,
    totalCustomerDebt,
    sales,
    formatCurrency,
    branches,
    activeBranch,
    activeBranchId,
    setActiveBranchId,
    currentUser,
    accounts,
    branchSessions,
    isOwner,
    login,
    logout,
    releaseBranchSession,
  } = useShop();

  // If not logged in, enforce the mandatory Gatekeeper login & branch selector
  if (!currentUser) {
    return <BranchGatekeeper />;
  }

  // Calculate Today's sales sum for current branch
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySalesTotal = sales
    .filter((s) => s.status !== 'refunded' && new Date(s.date).getTime() >= todayStart.getTime())
    .reduce((acc, s) => acc + s.grandTotal, 0);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Top Application Header & Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-slate-100 shadow-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 py-2.5">
          
          {/* Left: Brand & Store Name */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('pos')}>
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Store className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h1 className="font-bold text-sm sm:text-base text-white tracking-tight leading-tight">
                  {settings.shopName || 'Shop Ledger POS'}
                </h1>
                <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                  <span>{settings.tagline || 'Multi-Branch Sales, Purchases & Stock ERP'}</span>
                </p>
              </div>
            </div>

            {/* Mobile quick metrics */}
            <div className="md:hidden flex items-center gap-2 text-[11px]">
              <span className="text-indigo-400 font-bold font-mono">{formatCurrency(todaySalesTotal)}</span>
            </div>
          </div>

          {/* Right: Branch Selector + Staff Account Login & Status Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            
            {/* Branch Switcher (Owner can switch between all 3+ branches; Shopkeepers see assigned branch) */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              {isOwner ? (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">Branch:</span>
                  <select
                    value={activeBranchId}
                    onChange={(e) => setActiveBranchId(e.target.value)}
                    className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-1"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                        {b.name} {b.isHeadOffice ? '(HQ)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <span className="text-[11px] text-slate-400 font-normal">Active Branch:</span>
                  {activeBranch.name}
                </span>
              )}
            </div>

            {/* Current Staff User / Switch Account Button */}
            <button
              id="btn-user-account-menu"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/90 text-white rounded-xl border border-slate-700 transition-colors shadow-xs"
              title="Click to Switch Staff Account or View Branch Station Details"
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentUser?.role === 'owner'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                {currentUser?.role === 'owner' ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left">
                <span className="block text-[11px] font-bold text-slate-100 leading-tight">
                  {currentUser?.name || 'Guest Cashier'}
                </span>
                <span className="block text-[9px] text-slate-400 capitalize leading-tight">
                  {currentUser?.role === 'owner' ? 'Head Owner' : 'Shopkeeper'}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Live Real-time Cloud Sync Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 rounded-xl text-[11px] font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Cloud className="w-3 h-3 text-emerald-400" />
              <span className="hidden md:inline">Firebase Live Sync</span>
            </div>

            {/* Exit Branch / End Shift Button */}
            <button
              id="btn-logout-end-shift"
              onClick={logout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-semibold transition-colors shadow-xs"
              title="End Shift, Free this Branch and Exit to Gateway"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">End Shift</span>
            </button>

            {/* Today's Sales */}
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 text-[11px]">Today:</span>
              <span className="font-bold text-indigo-400 font-mono">{formatCurrency(todaySalesTotal)}</span>
            </div>

            {/* Low Stock Warning */}
            {lowStockProducts.length > 0 && (
              <button
                onClick={() => setActiveTab('stock')}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-700/60 rounded-xl text-[11px] font-semibold transition-colors"
                title="View Low Stock Items"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>{lowStockProducts.length} Low Stock</span>
              </button>
            )}
          </div>

        </div>

        {/* Primary Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-none border-t border-slate-800">
          <nav className="flex space-x-1 py-1 text-xs font-semibold">
            
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'pos'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Point of Sale (POS)</span>
            </button>

            <button
              onClick={() => setActiveTab('stock')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'stock'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Stock & Inventory</span>
              {lowStockProducts.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[10px] font-extrabold">
                  {lowStockProducts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'sales'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Sales & Invoices</span>
            </button>

            <button
              onClick={() => setActiveTab('purchases')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'purchases'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Purchases & Suppliers</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'customers'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Customers & Credit</span>
              {totalCustomerDebt > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>P&L Financials & Expenses</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings & Branches</span>
            </button>

          </nav>
        </div>
      </header>

      {/* Main View Container */}
      <main className="flex-1 overflow-x-hidden">
        {activeTab === 'pos' && <POSView />}
        {activeTab === 'stock' && <StockView />}
        {activeTab === 'sales' && <SalesView />}
        {activeTab === 'purchases' && <PurchasesView />}
        {activeTab === 'customers' && <CustomersView />}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Staff Account & Branch Sign-In Modal */}
      <AccountAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        accounts={accounts}
        branches={branches}
        branchSessions={branchSessions}
        currentUser={currentUser}
        onLogin={login}
        onLogout={logout}
        onReleaseBranchSession={releaseBranchSession}
      />

    </div>
  );
};

export default function App() {
  return (
    <ShopProvider>
      <ShopApp />
    </ShopProvider>
  );
}

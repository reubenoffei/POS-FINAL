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
  Menu,
  X,
  Grid,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-indigo-100 selection:text-indigo-900 pb-16 md:pb-0">
      
      {/* Top Application Header & Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-slate-100 shadow-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 py-2 sm:py-2.5">
          
          {/* Top Row on Mobile: Brand, Quick Status & Menu Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-2.5 cursor-pointer" onClick={() => handleSelectTab('pos')}>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-xs sm:text-base text-white tracking-tight leading-tight truncate">
                  {settings.shopName || 'Shop Ledger POS'}
                </h1>
                <p className="text-[9.5px] sm:text-[10px] text-slate-400 font-medium flex items-center gap-1.5 truncate">
                  <span>{settings.tagline || 'Multi-Branch Sales & Inventory'}</span>
                </p>
              </div>
            </div>

            {/* Mobile Controls Right: Today's revenue & Menu Toggle Button */}
            <div className="flex md:hidden items-center gap-1.5">
              <span className="text-indigo-400 font-bold font-mono text-[11px] bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                {formatCurrency(todaySalesTotal)}
              </span>
              
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-colors"
                title="Open All Navigation Tabs and Tools"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Right on Desktop / Bottom on Mobile: Branch Selector + Staff Account Login & Status Badges */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2 text-xs">
            
            {/* Branch Switcher (Owner can switch between all 3+ branches; Shopkeepers see assigned branch) */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              {isOwner ? (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] sm:text-[11px] text-slate-400">Branch:</span>
                  <select
                    value={activeBranchId}
                    onChange={(e) => setActiveBranchId(e.target.value)}
                    className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-1 max-w-[120px] sm:max-w-none truncate"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                        {b.name} {b.isHeadOffice ? '(HQ)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-xs font-bold text-white flex items-center gap-1 truncate max-w-[130px] sm:max-w-none">
                  <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal hidden sm:inline">Branch:</span>
                  {activeBranch.name}
                </span>
              )}
            </div>

            {/* Current Staff User / Switch Account Button */}
            <button
              id="btn-user-account-menu"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700/90 text-white rounded-xl border border-slate-700 transition-colors shadow-xs"
              title="Click to Switch Staff Account or View Branch Station Details"
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  currentUser?.role === 'owner'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                {currentUser?.role === 'owner' ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left hidden xs:block">
                <span className="block text-[10.5px] sm:text-[11px] font-bold text-slate-100 leading-tight truncate max-w-[90px] sm:max-w-none">
                  {currentUser?.name || 'Cashier'}
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
              <span className="hidden md:inline">Sync</span>
            </div>

            {/* Exit Branch / End Shift Button */}
            <button
              id="btn-logout-end-shift"
              onClick={logout}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-semibold transition-colors shadow-xs"
              title="End Shift, Free this Branch and Exit to Gateway"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Exit</span>
            </button>

            {/* Today's Sales (Desktop) */}
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 text-[11px]">Today:</span>
              <span className="font-bold text-indigo-400 font-mono">{formatCurrency(todaySalesTotal)}</span>
            </div>

            {/* Low Stock Warning */}
            {lowStockProducts.length > 0 && (
              <button
                onClick={() => handleSelectTab('stock')}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-700/60 rounded-xl text-[11px] font-semibold transition-colors"
                title="View Low Stock Items"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>{lowStockProducts.length} Low Stock</span>
              </button>
            )}
          </div>

        </div>

        {/* Primary Desktop Navigation Tabs (Horizontal scroll on desktop/tablet) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-none border-t border-slate-800 hidden md:block">
          <nav className="flex space-x-1 py-1 text-xs font-semibold">
            
            <button
              onClick={() => handleSelectTab('pos')}
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
              onClick={() => handleSelectTab('stock')}
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
              onClick={() => handleSelectTab('sales')}
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
              onClick={() => handleSelectTab('purchases')}
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
              onClick={() => handleSelectTab('customers')}
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
              onClick={() => handleSelectTab('analytics')}
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
              onClick={() => handleSelectTab('settings')}
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

      {/* MOBILE BOTTOM NAVIGATION BAR (Fixed at bottom on phones) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-1 py-1 flex items-center justify-around shadow-2xl safe-area-bottom">
        
        {/* Tab 1: POS */}
        <button
          onClick={() => handleSelectTab('pos')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'pos'
              ? 'text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <ShoppingCart className={`w-5 h-5 ${activeTab === 'pos' ? 'stroke-[2.5]' : ''}`} />
          </div>
          <span className="text-[10px] mt-0.5">POS</span>
        </button>

        {/* Tab 2: Stock */}
        <button
          onClick={() => handleSelectTab('stock')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'stock'
              ? 'text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Package className={`w-5 h-5 ${activeTab === 'stock' ? 'stroke-[2.5]' : ''}`} />
            {lowStockProducts.length > 0 && (
              <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-amber-500 text-slate-950 text-[8px] font-extrabold rounded-full flex items-center justify-center">
                {lowStockProducts.length}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Stock</span>
        </button>

        {/* Tab 3: Sales */}
        <button
          onClick={() => handleSelectTab('sales')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'sales'
              ? 'text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className={`w-5 h-5 ${activeTab === 'sales' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">Sales</span>
        </button>

        {/* Tab 4: Customers */}
        <button
          onClick={() => handleSelectTab('customers')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'customers'
              ? 'text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Users className={`w-5 h-5 ${activeTab === 'customers' ? 'stroke-[2.5]' : ''}`} />
            {totalCustomerDebt > 0 && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] mt-0.5">Customers</span>
        </button>

        {/* Tab 5: More Tabs Menu */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            ['purchases', 'analytics', 'settings'].includes(activeTab)
              ? 'text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">More</span>
        </button>

      </nav>

      {/* MOBILE FULL DRAWER / BOTTOM SHEET FOR ALL TABS & TOOLS */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 text-white rounded-t-3xl border-t border-slate-800 p-5 max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">App Navigation & Tools</h3>
                  <p className="text-[11px] text-slate-400">Current: {activeBranch.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              
              <button
                onClick={() => handleSelectTab('pos')}
                className={`p-3 rounded-2xl flex items-center gap-3 text-left border transition-all ${
                  activeTab === 'pos'
                    ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-200 hover:bg-slate-750'
                }`}
              >
                <div className="p-2 rounded-xl bg-slate-900/60 text-indigo-300">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">POS Register</div>
                  <div className="text-[10px] text-slate-400">Barcode, cart & sales</div>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('stock')}
                className={`p-3 rounded-2xl flex items-center gap-3 text-left border transition-all ${
                  activeTab === 'stock'
                    ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-200 hover:bg-slate-750'
                }`}
              >
                <div className="p-2 rounded-xl bg-slate-900/60 text-indigo-300">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Stock & Inventory</div>
                  <div className="text-[10px] text-slate-400">Products & labels</div>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('sales')}
                className={`p-3 rounded-2xl flex items-center gap-3 text-left border transition-all ${
                  activeTab === 'sales'
                    ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-200 hover:bg-slate-750'
                }`}
              >
                <div className="p-2 rounded-xl bg-slate-900/60 text-indigo-300">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Sales & Invoices</div>
                  <div className="text-[10px] text-slate-400">Receipts & refunds</div>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('purchases')}
                className={`p-3 rounded-2xl flex items-center gap-3 text-left border transition-all ${
                  activeTab === 'purchases'
                    ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-200 hover:bg-slate-750'
                }`}
              >
                <div className="p-2 rounded-xl bg-slate-900/60 text-indigo-300">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Purchases</div>
                  <div className="text-[10px] text-slate-400">Suppliers & PO orders</div>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('customers')}
                className={`p-3 rounded-2xl flex items-center gap-3 text-left border transition-all ${
                  activeTab === 'customers'
                    ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-200 hover:bg-slate-750'
                }`}
              >
                <div className="p-2 rounded-xl bg-slate-900/60 text-indigo-300">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Customers</div>
                  <div className="text-[10px] text-slate-400">Credit debt ledger</div>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('analytics')}
                className={`p-3 rounded-2xl flex items-center gap-3 text-left border transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-200 hover:bg-slate-750'
                }`}
              >
                <div className="p-2 rounded-xl bg-slate-900/60 text-indigo-300">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Financials & P&L</div>
                  <div className="text-[10px] text-slate-400">Profit, expenses, tax</div>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('settings')}
                className={`col-span-2 p-3 rounded-2xl flex items-center gap-3 text-left border transition-all ${
                  activeTab === 'settings'
                    ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-200 hover:bg-slate-750'
                }`}
              >
                <div className="p-2 rounded-xl bg-slate-900/60 text-indigo-300">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Settings & Multi-Branch Hub</div>
                  <div className="text-[10px] text-slate-400">Store info, receipt config, staff accounts</div>
                </div>
              </button>

            </div>

            {/* Quick Actions Footer */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold flex items-center justify-center gap-2 border border-slate-700"
              >
                <User className="w-4 h-4 text-indigo-400" />
                <span>Switch Staff</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="flex-1 py-2.5 px-3 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-xl font-semibold flex items-center justify-center gap-2 border border-rose-800/60"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>End Shift</span>
              </button>
            </div>

          </div>
        </div>
      )}

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


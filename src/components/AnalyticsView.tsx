import React, { useState, useMemo } from 'react';
import { useShop } from '../context/ShopContext';
import { Expense, ExpenseCategory, PaymentMethod } from '../types';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  Layers,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const {
    sales,
    expenses,
    products,
    addExpense,
    deleteExpense,
    formatCurrency,
    settings,
  } = useShop();

  const [dateRange, setDateRange] = useState<'all' | 'month' | 'week' | 'today'>('all');

  // Expense Modal
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('utilities');
  const [expMethod, setExpMethod] = useState<PaymentMethod>('cash');
  const [expNotes, setExpNotes] = useState('');

  // Cash Drawer Reconciliation state
  const [openingFloat, setOpeningFloat] = useState<number>(100);
  const [countedCash, setCountedCash] = useState<number>(100);

  // Filtered sales and expenses by date range
  const filteredData = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 7 * 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const dateFilterFn = (dateStr: string) => {
      const time = new Date(dateStr).getTime();
      if (dateRange === 'today') return time >= todayStart;
      if (dateRange === 'week') return time >= weekStart;
      if (dateRange === 'month') return time >= monthStart;
      return true;
    };

    const validSales = sales.filter((s) => s.status !== 'refunded' && dateFilterFn(s.date));
    const validExpenses = expenses.filter((e) => dateFilterFn(e.date));

    return { sales: validSales, expenses: validExpenses };
  }, [sales, expenses, dateRange]);

  // Financial Calculations
  const grossSalesRevenue = filteredData.sales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalTaxCollected = filteredData.sales.reduce((acc, s) => acc + s.taxAmount, 0);
  const netSalesRevenue = grossSalesRevenue - totalTaxCollected;
  const costOfGoodsSold = filteredData.sales.reduce((acc, s) => acc + s.costTotal, 0);
  const grossProfit = Math.max(0, netSalesRevenue - costOfGoodsSold);
  const grossMarginPct = netSalesRevenue > 0 ? ((grossProfit / netSalesRevenue) * 100).toFixed(1) : '0';

  const totalExpenses = filteredData.expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const netProfitMarginPct = netSalesRevenue > 0 ? ((netProfit / netSalesRevenue) * 100).toFixed(1) : '0';

  // Expense by Category Breakdown
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [filteredData.expenses]);

  // Top Selling Products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number; profit: number }> = {};
    filteredData.sales.forEach((s) => {
      s.items.forEach((item) => {
        if (!map[item.productId]) {
          map[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
            profit: 0,
          };
        }
        map[item.productId].quantity += item.quantity;
        map[item.productId].revenue += item.total;
        map[item.productId].profit += item.total - item.costPrice * item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.quantity - a.quantity).slice(0, 6);
  }, [filteredData.sales]);

  // Cash Register Reconciliation calculation
  const cashSalesTotal = filteredData.sales
    .filter((s) => s.paymentMethod === 'cash')
    .reduce((acc, s) => acc + s.grandTotal, 0);

  const cashExpensesTotal = filteredData.expenses
    .filter((e) => e.paymentMethod === 'cash')
    .reduce((acc, e) => acc + e.amount, 0);

  const expectedDrawerCash = openingFloat + cashSalesTotal - cashExpensesTotal;
  const cashDiscrepancy = countedCash - expectedDrawerCash;

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || expAmount <= 0) return;

    addExpense({
      title: expTitle.trim(),
      amount: Number(expAmount),
      category: expCategory,
      paymentMethod: expMethod,
      date: new Date().toISOString(),
      notes: expNotes.trim() || undefined,
    });

    setIsAddExpenseOpen(false);
    setExpTitle('');
    setExpAmount(0);
    setExpNotes('');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header & Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Financials, Expenses & P&L Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time Profit & Loss statement, operational expenses log, and cash register reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="bg-transparent border-none text-xs font-semibold text-slate-800 focus:outline-hidden"
            >
              <option value="all">All-Time Performance</option>
              <option value="month">This Month</option>
              <option value="week">Past 7 Days</option>
              <option value="today">Today Only</option>
            </select>
          </div>

          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Record Expense
          </button>
        </div>
      </div>

      {/* Main Financial Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Net Sales Revenue</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(netSalesRevenue)}</div>
          <span className="text-[11px] text-slate-500">Gross: {formatCurrency(grossSalesRevenue)}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Cost of Goods (COGS)</span>
            <ArrowDownRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-700">{formatCurrency(costOfGoodsSold)}</div>
          <span className="text-[11px] text-slate-500">Direct product acquisition</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700">{formatCurrency(grossProfit)}</div>
          <span className="text-[11px] text-emerald-600 font-semibold">{grossMarginPct}% gross margin</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Net Bottom-Line Profit</span>
            <ArrowUpRight className="w-4 h-4 text-indigo-600" />
          </div>
          <div className={`text-xl font-extrabold ${netProfit >= 0 ? 'text-indigo-900' : 'text-rose-600'}`}>
            {formatCurrency(netProfit)}
          </div>
          <span className="text-[11px] text-slate-500">After all operating expenses</span>
        </div>

      </div>

      {/* P&L Statement & Expense Manager Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT (7 cols): Formal Profit & Loss Statement */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Profit & Loss (P&L) Statement</h3>
              <p className="text-[11px] text-slate-500">Accounting summary for selected period</p>
            </div>
            <span className="text-xs font-mono-code bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 uppercase font-semibold">
              {dateRange}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            
            {/* Section 1: Revenue */}
            <div>
              <div className="font-bold uppercase tracking-wider text-[11px] mb-1.5 text-indigo-950">
                1. Revenue
              </div>
              <div className="space-y-1.5 pl-2">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Sales Recorded</span>
                  <span className="font-medium text-slate-900">{formatCurrency(grossSalesRevenue)}</span>
                </div>
                {totalTaxCollected > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Less: {settings.taxName} Tax Payable</span>
                    <span className="text-rose-600">-{formatCurrency(totalTaxCollected)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                  <span>Net Revenue</span>
                  <span>{formatCurrency(netSalesRevenue)}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Cost of Goods Sold */}
            <div className="pt-2 border-t border-slate-200">
              <div className="font-bold uppercase tracking-wider text-[11px] mb-1.5 text-indigo-950">
                2. Cost of Sales
              </div>
              <div className="space-y-1.5 pl-2">
                <div className="flex justify-between text-slate-600">
                  <span>Cost of Goods Sold (Inventory Outflow)</span>
                  <span className="font-medium text-slate-900">-{formatCurrency(costOfGoodsSold)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-800 pt-1 border-t border-slate-100 bg-emerald-50/60 p-2 rounded-lg">
                  <span>Gross Profit (Net Revenue - COGS)</span>
                  <span className="text-sm font-extrabold">{formatCurrency(grossProfit)}</span>
                </div>
              </div>
            </div>

            {/* Section 3: Operating Expenses */}
            <div className="pt-2 border-t border-slate-200">
              <div className="font-bold uppercase tracking-wider text-[11px] mb-1.5 text-indigo-950">
                3. Operating Expenses (OPEX)
              </div>
              <div className="space-y-1 pl-2">
                {Object.keys(expensesByCategory).length === 0 ? (
                  <div className="text-slate-400 italic">No expenses recorded for this period.</div>
                ) : (
                  Object.entries(expensesByCategory).map(([cat, amt]) => (
                    <div key={cat} className="flex justify-between text-slate-600">
                      <span className="capitalize">{cat}</span>
                      <span className="font-medium text-slate-800">-{formatCurrency(amt)}</span>
                    </div>
                  ))
                )}
                <div className="flex justify-between font-semibold text-rose-700 pt-1 border-t border-slate-100">
                  <span>Total Operating Expenses</span>
                  <span>-{formatCurrency(totalExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Final Bottom Line */}
            <div className="pt-3 border-t-2 border-slate-300">
              <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-xl shadow-xs">
                <div>
                  <div className="font-bold text-sm">NET SHOP PROFIT</div>
                  <div className="text-[11px] text-slate-400">Net Profit Margin: {netProfitMarginPct}%</div>
                </div>
                <div className="text-xl font-extrabold font-mono-code text-indigo-400">
                  {formatCurrency(netProfit)}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT (5 cols): Top Products & Category Mix */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Top Selling Products */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm">Top Selling Products</h3>
              <span className="text-[10px] text-slate-400">By units sold</span>
            </div>

            {topProducts.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">No sales recorded yet.</div>
            ) : (
              <div className="space-y-2.5 text-xs">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-500">{p.quantity} units sold</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-slate-900">{formatCurrency(p.revenue)}</div>
                      <div className="text-[10px] text-emerald-700 font-medium">+{formatCurrency(p.profit)} profit</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cash Register / Drawer Day-Close Tool */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Calculator className="w-4 h-4 text-indigo-700" />
              <h3 className="font-bold text-slate-900 text-sm">Cash Drawer Close Reconciliation</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="text-slate-600">Opening Cash Float ({settings.currencySymbol}):</label>
                <input
                  type="number"
                  step="any"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-0.5 border border-slate-300 rounded-md text-right font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-between text-slate-600">
                <span>+ Cash Sales Collected:</span>
                <span className="font-semibold text-emerald-700">+{formatCurrency(cashSalesTotal)}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>- Cash Expenses Paid:</span>
                <span className="font-semibold text-rose-600">-{formatCurrency(cashExpensesTotal)}</span>
              </div>

              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Expected Cash in Drawer:</span>
                <span>{formatCurrency(expectedDrawerCash)}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="font-semibold text-slate-700">Physical Counted Cash:</label>
                <input
                  type="number"
                  step="any"
                  value={countedCash}
                  onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 border border-slate-300 rounded-md text-right font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Discrepancy indicator */}
              <div className="pt-2 border-t border-slate-200">
                {Math.abs(cashDiscrepancy) < 0.01 ? (
                  <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg text-center font-bold text-[11px] flex items-center justify-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Drawer Perfectly Balanced (No Discrepancy)
                  </div>
                ) : cashDiscrepancy > 0 ? (
                  <div className="p-2 bg-indigo-50 text-indigo-900 rounded-lg text-center font-bold text-[11px]">
                    Cash Surplus: +{formatCurrency(cashDiscrepancy)}
                  </div>
                ) : (
                  <div className="p-2 bg-rose-50 text-rose-900 rounded-lg text-center font-bold text-[11px]">
                    Cash Shortage: {formatCurrency(cashDiscrepancy)}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Operating Expenses Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Operating Expenses Log</h3>
            <p className="text-xs text-slate-500">Rent, staff salaries, utility bills, packaging & maintenance.</p>
          </div>

          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Expense
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Expense Title</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Payment Method</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No operating expenses recorded for this period.
                  </td>
                </tr>
              ) : (
                filteredData.expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 text-slate-500 font-mono-code text-[11px]">
                      {new Date(exp.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {exp.title}
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 uppercase text-slate-600 text-[10px] font-semibold">
                      {exp.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-3 font-bold text-rose-600 text-sm">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {exp.notes || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: RECORD EXPENSE */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Record Operating Expense</h3>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expense Title / Description *</label>
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g. August Electric Bill, Cleaner wages"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount ({settings.currencySymbol}) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={expAmount || ''}
                    onChange={(e) => setExpAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="utilities">Utilities & Power</option>
                    <option value="rent">Shop Rent</option>
                    <option value="salaries">Staff Salaries</option>
                    <option value="transport">Transport & Freight</option>
                    <option value="packaging">Packaging & Bags</option>
                    <option value="maintenance">Repairs & Maintenance</option>
                    <option value="marketing">Advertising</option>
                    <option value="other">Other Operating Expense</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Paid Via</label>
                <select
                  value={expMethod}
                  onChange={(e) => setExpMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="cash">Cash Register Drawer</option>
                  <option value="bank_transfer">Bank Account / Transfer</option>
                  <option value="card">Company Debit/Credit Card</option>
                  <option value="momo">Mobile Money</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks (Optional)</label>
                <input
                  type="text"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="e.g. Receipt #1209, paid to landlord"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

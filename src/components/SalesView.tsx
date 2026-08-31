import React, { useState, useMemo } from 'react';
import { useShop } from '../context/ShopContext';
import { Sale } from '../types';
import {
  Receipt,
  Search,
  Download,
  DollarSign,
  TrendingUp,
  RotateCcw,
  Printer,
  Calendar,
  AlertCircle,
  X,
  FileText,
  Building2,
} from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';

export const SalesView: React.FC = () => {
  const { sales, refundSale, exportSalesCSV, formatCurrency, branches, isOwner, activeBranchId } = useShop();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>(isOwner ? 'all' : activeBranchId);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'credit' | 'refunded'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  // Modals
  const [viewingReceiptSale, setViewingReceiptSale] = useState<Sale | null>(null);
  const [refundingSale, setRefundingSale] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState('');

  // Date & Branch filtering logic
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 7 * 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return sales.filter((sale) => {
      // Branch check
      let matchesBranch = true;
      if (!isOwner) {
        matchesBranch = !sale.branchId || sale.branchId === activeBranchId;
      } else if (selectedBranchFilter !== 'all') {
        matchesBranch = sale.branchId === selectedBranchFilter;
      }

      const saleTime = new Date(sale.date).getTime();

      // Date check
      let matchesDate = true;
      if (dateFilter === 'today') matchesDate = saleTime >= todayStart;
      else if (dateFilter === 'yesterday') matchesDate = saleTime >= yesterdayStart && saleTime < todayStart;
      else if (dateFilter === 'week') matchesDate = saleTime >= weekStart;
      else if (dateFilter === 'month') matchesDate = saleTime >= monthStart;

      // Status check
      let matchesStatus = true;
      if (statusFilter === 'completed') matchesStatus = sale.status === 'completed';
      else if (statusFilter === 'credit') matchesStatus = sale.status === 'credit_unpaid' || sale.status === 'credit_partial';
      else if (statusFilter === 'refunded') matchesStatus = sale.status === 'refunded';

      // Method check
      const matchesMethod = methodFilter === 'all' || sale.paymentMethod === methodFilter;

      // Query check
      const q = searchTerm.toLowerCase().trim();
      const matchesQuery =
        !q ||
        sale.receiptNo.toLowerCase().includes(q) ||
        sale.customerName.toLowerCase().includes(q) ||
        (sale.branchName && sale.branchName.toLowerCase().includes(q)) ||
        (sale.cashierName && sale.cashierName.toLowerCase().includes(q)) ||
        sale.items.some((i) => i.productName.toLowerCase().includes(q));

      return matchesBranch && matchesDate && matchesStatus && matchesMethod && matchesQuery;
    });
  }, [sales, isOwner, activeBranchId, selectedBranchFilter, dateFilter, statusFilter, methodFilter, searchTerm]);

  // KPI calculations on active filtered set
  const totalRevenue = filteredSales
    .filter((s) => s.status !== 'refunded')
    .reduce((acc, s) => acc + s.grandTotal, 0);

  const totalGrossProfit = filteredSales
    .filter((s) => s.status !== 'refunded')
    .reduce((acc, s) => acc + s.profit, 0);

  const uncollectedCreditSales = filteredSales
    .filter((s) => s.status !== 'refunded')
    .reduce((acc, s) => acc + s.balanceDue, 0);

  const handleProcessRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundingSale) return;

    refundSale(refundingSale.id, refundReason.trim() || 'Customer returned items');
    setRefundingSale(null);
    setRefundReason('');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sales History & Invoices Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View completed transactions, thermal receipts, profit margins, cashiers, and return refunds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportSalesCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Sales CSV
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Sales Revenue</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</div>
          <span className="text-[11px] text-slate-500">{filteredSales.length} filtered transactions</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700">{formatCurrency(totalGrossProfit)}</div>
          <span className="text-[11px] text-emerald-600">
            {totalRevenue > 0 ? ((totalGrossProfit / totalRevenue) * 100).toFixed(1) : 0}% gross margin
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Uncollected Credit</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-700">{formatCurrency(uncollectedCreditSales)}</div>
          <span className="text-[11px] text-amber-600">Pending customer debt</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Receipts Ledger</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900">{filteredSales.length}</div>
          <span className="text-[11px] text-slate-500">Sales records shown</span>
        </div>

      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        
        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search receipt #, customer name, cashier, items..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Branch Filter (Owner can toggle between all 3+ branches) */}
            {isOwner && (
              <div className="flex items-center gap-1 text-xs">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-hidden"
                >
                  <option value="all">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Filter */}
            <div className="flex items-center gap-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Past 7 Days</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed Paid</option>
              <option value="credit">Store Credit / Pay Later</option>
              <option value="refunded">Refunded / Returned</option>
            </select>

            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden"
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card / POS</option>
              <option value="momo">Mobile Money</option>
              <option value="credit">Store Credit</option>
            </select>

          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Receipt # & Date</th>
                <th className="py-3 px-3">Branch & Cashier</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-3">Grand Total</th>
                <th className="py-3 px-3">Profit</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No sales matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const isRefunded = sale.status === 'refunded';
                  const isCredit = sale.status === 'credit_unpaid' || sale.status === 'credit_partial';

                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isRefunded ? 'bg-slate-50/50 opacity-70' : ''
                      }`}
                    >
                      {/* Receipt & Date */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          {sale.receiptNo}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(sale.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </td>

                      {/* Branch & Cashier */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">
                          {sale.branchName || 'Head Office'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Staff: {sale.cashierName || 'Cashier'}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{sale.customerName}</div>
                        {sale.customerPhone && (
                          <div className="text-[10px] text-slate-400">{sale.customerPhone}</div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 max-w-xs truncate">
                          {sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {sale.items.reduce((acc, i) => acc + i.quantity, 0)} items sold
                        </div>
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-3">
                        <div className={`font-bold text-sm ${isRefunded ? 'line-through text-slate-400' : 'text-slate-950'}`}>
                          {formatCurrency(sale.grandTotal)}
                        </div>
                        {sale.discount > 0 && (
                          <div className="text-[10px] text-rose-600">Disc: -{formatCurrency(sale.discount)}</div>
                        )}
                      </td>

                      {/* Profit */}
                      <td className="py-3 px-3">
                        {isRefunded ? (
                          <span className="text-slate-400 italic">Refunded</span>
                        ) : (
                          <div>
                            <span className="font-bold text-emerald-700">+{formatCurrency(sale.profit)}</span>
                            <div className="text-[10px] text-slate-400">
                              {sale.grandTotal > 0 ? ((sale.profit / (sale.grandTotal - sale.taxAmount)) * 100).toFixed(0) : 0}%
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-3">
                        <span className="uppercase font-semibold text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {sale.paymentMethod.replace('_', ' ')}
                        </span>
                        {sale.cashTendered !== undefined && sale.paymentMethod === 'cash' && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Cash: {formatCurrency(sale.cashTendered)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                            sale.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isRefunded
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {sale.status.replace('_', ' ')}
                        </span>
                        {isCredit && sale.balanceDue > 0 && (
                          <div className="text-[10px] text-rose-600 font-bold mt-0.5">
                            Due: {formatCurrency(sale.balanceDue)}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setViewingReceiptSale(sale)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                            title="View Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Receipt
                          </button>

                          {!isRefunded && (
                            <button
                              onClick={() => setRefundingSale(sale)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Process Refund & Restock"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL: VIEW THERMAL RECEIPT */}
      {viewingReceiptSale && (
        <ReceiptModal
          sale={viewingReceiptSale}
          onClose={() => setViewingReceiptSale(null)}
        />
      )}

      {/* MODAL: PROCESS REFUND */}
      {refundingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-rose-50/50">
              <div className="flex items-center gap-2 text-rose-800">
                <RotateCcw className="w-5 h-5" />
                <h3 className="font-bold text-sm">Process Sale Refund</h3>
              </div>
              <button
                onClick={() => setRefundingSale(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessRefund} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Are you sure you want to refund receipt <strong className="text-slate-900 font-mono">{refundingSale.receiptNo}</strong> for{' '}
                <strong className="text-slate-900">{formatCurrency(refundingSale.grandTotal)}</strong>?
              </p>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800 text-[11px]">
                ⚠️ Refunding will automatically return all sold items back into branch inventory.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Return / Refund</label>
                <input
                  type="text"
                  required
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer changed mind / Expired item replacement"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRefundingSale(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
                >
                  Confirm & Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

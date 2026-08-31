import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { Customer, PaymentMethod } from '../types';
import {
  Users,
  Plus,
  Search,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  X,
  CreditCard,
  History,
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const {
    customers,
    sales,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    recordCustomerPayment,
    formatCurrency,
  } = useShop();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [viewingHistoryCustomer, setViewingHistoryCustomer] = useState<Customer | null>(null);

  // Payment State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payNote, setPayNote] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  // Filtered list
  const filteredCustomers = customers.filter((c) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesQuery =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q));

    const matchesDebt = !filterDebtOnly || c.creditBalance > 0;
    return matchesQuery && matchesDebt;
  });

  // KPIs
  const totalCustomers = customers.length;
  const totalOutstandingDebt = customers.reduce((acc, c) => acc + (c.creditBalance || 0), 0);
  const totalLifetimeSpent = customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
  const debtorCount = customers.filter((c) => c.creditBalance > 0).length;

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormData({
      name: cust.name,
      phone: cust.phone,
      email: cust.email || '',
      address: cust.address || '',
      notes: cust.notes || '',
    });
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, formData);
      setEditingCustomer(null);
    } else {
      addCustomer(formData);
      setIsAddModalOpen(false);
    }
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingCustomer || payAmount <= 0) return;

    recordCustomerPayment(
      payingCustomer.id,
      payAmount,
      payMethod,
      payNote.trim() || undefined
    );
    setPayingCustomer(null);
    setPayAmount(0);
    setPayNote('');
  };

  // Customer transactions history
  const customerSales = viewingHistoryCustomer
    ? sales.filter((s) => s.customerId === viewingHistoryCustomer.id)
    : [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Customer Ledger & Debt Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer accounts, store credit receivables, purchase histories, and debt settlements.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Registered</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900">{totalCustomers}</div>
          <span className="text-[11px] text-slate-500">Customer profiles</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Uncollected Debt</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600">{formatCurrency(totalOutstandingDebt)}</div>
          <span className="text-[11px] text-rose-500">{debtorCount} customers with active credit</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Customer Lifetime Sales</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700">{formatCurrency(totalLifetimeSpent)}</div>
          <span className="text-[11px] text-emerald-600">Total customer spending</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Account Health</span>
            <CheckCircle className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {totalCustomers > 0 ? (((totalCustomers - debtorCount) / totalCustomers) * 100).toFixed(0) : 100}%
          </div>
          <span className="text-[11px] text-slate-500">Debt-free customers</span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customer name, phone, email..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-white px-3 py-1.5 border border-slate-300 rounded-lg">
            <input
              type="checkbox"
              checked={filterDebtOnly}
              onChange={(e) => setFilterDebtOnly(e.target.checked)}
              className="rounded-sm text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show Debtors Only ({debtorCount})</span>
          </label>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-3">Outstanding Debt</th>
                <th className="py-3 px-3">Lifetime Spent</th>
                <th className="py-3 px-3">Orders Count</th>
                <th className="py-3 px-4">Address / Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No customers found matching the search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const hasDebt = cust.creditBalance > 0;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{cust.name}</div>
                        <div className="text-[10px] text-slate-400">Member since {new Date(cust.createdAt).toLocaleDateString()}</div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{cust.phone}</span>
                        </div>
                        {cust.email && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-300" />
                            <span>{cust.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Debt */}
                      <td className="py-3 px-3">
                        {hasDebt ? (
                          <div className="font-bold text-rose-600 text-sm">
                            {formatCurrency(cust.creditBalance)}
                            <span className="block text-[10px] text-rose-500 font-normal">Active Store Credit</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                            <CheckCircle className="w-3.5 h-3.5" /> Settled
                          </span>
                        )}
                      </td>

                      {/* Total Spent */}
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {formatCurrency(cust.totalSpent)}
                      </td>

                      {/* Orders */}
                      <td className="py-3 px-3 font-medium text-slate-700">
                        {cust.totalPurchasesCount} purchases
                      </td>

                      {/* Address & Notes */}
                      <td className="py-3 px-4 text-[11px] text-slate-500 max-w-xs">
                        {cust.address && (
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{cust.address}</span>
                          </div>
                        )}
                        {cust.notes && <div className="italic text-slate-400 mt-0.5">{cust.notes}</div>}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {hasDebt && (
                            <button
                              onClick={() => {
                                setPayingCustomer(cust);
                                setPayAmount(cust.creditBalance);
                              }}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-[11px] transition-colors"
                            >
                              Settle Debt
                            </button>
                          )}

                          <button
                            onClick={() => setViewingHistoryCustomer(cust)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
                            title="View Purchases"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(cust)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Delete customer profile "${cust.name}"?`)) {
                                deleteCustomer(cust.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* MODAL: ADD / EDIT CUSTOMER */}
      {(isAddModalOpen || editingCustomer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Register New Customer'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCustomer(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 555-0188"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="customer@email.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery / Home Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. 14 Elmwood Drive, Apt 3"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Credit limits, favorite goods, payment terms..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingCustomer(null);
                  }}
                  className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SETTLE DEBT */}
      {payingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Customer Debt Settlement</h3>
                <p className="text-xs text-slate-500 font-medium">{payingCustomer.name}</p>
              </div>
              <button
                onClick={() => setPayingCustomer(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-3 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center">
                <span className="text-amber-900 font-medium">Outstanding Balance:</span>
                <span className="font-bold text-base text-amber-800">
                  {formatCurrency(payingCustomer.creditBalance)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount Received *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={payingCustomer.creditBalance}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="cash">Cash</option>
                  <option value="momo">Mobile Money</option>
                  <option value="card">Card / POS</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Note / Reference</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="e.g. Paid in cash at counter"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPayingCustomer(null)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  Record Payment & Clear Debt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMER HISTORY */}
      {viewingHistoryCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Purchase History: {viewingHistoryCustomer.name}</h3>
                <p className="text-xs text-slate-500">
                  Lifetime spend: {formatCurrency(viewingHistoryCustomer.totalSpent)} • Current debt: {formatCurrency(viewingHistoryCustomer.creditBalance)}
                </p>
              </div>
              <button
                onClick={() => setViewingHistoryCustomer(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-2 text-xs">
              {customerSales.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No recorded sales for this customer yet.
                </div>
              ) : (
                customerSales.map((s) => (
                  <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">{s.receiptNo}</div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(s.date).toLocaleString()} • {s.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-sm">{formatCurrency(s.grandTotal)}</div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">{s.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 mt-4">
              <button
                onClick={() => setViewingHistoryCustomer(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium text-xs hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

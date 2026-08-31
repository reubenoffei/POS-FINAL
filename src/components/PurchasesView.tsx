import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { Purchase, Supplier, PaymentMethod } from '../types';
import {
  Truck,
  Plus,
  Search,
  Download,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  PlusCircle,
  Trash2,
  X,
  CreditCard,
  Edit2,
} from 'lucide-react';

export const PurchasesView: React.FC = () => {
  const {
    purchases,
    suppliers,
    products,
    recordPurchase,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    recordSupplierPayment,
    exportPurchasesCSV,
    formatCurrency,
  } = useShop();

  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');

  // Modals
  const [isNewPOModalOpen, setIsNewPOModalOpen] = useState(false);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(null);
  const [supplierPayAmount, setSupplierPayAmount] = useState<number>(0);
  const [supplierPayMethod, setSupplierPayMethod] = useState<PaymentMethod>('bank_transfer');
  const [supplierPayNote, setSupplierPayNote] = useState('');

  // New PO Form state
  const [poSupplierId, setPoSupplierId] = useState(suppliers[0]?.id || '');
  const [poItems, setPoItems] = useState<
    { productId: string; productName: string; sku: string; unitCost: number; quantity: number; total: number; unit: string }[]
  >([
    {
      productId: products[0]?.id || '',
      productName: products[0]?.name || '',
      sku: products[0]?.sku || '',
      unitCost: products[0]?.costPrice || 0,
      quantity: 10,
      total: (products[0]?.costPrice || 0) * 10,
      unit: products[0]?.unit || 'pcs',
    },
  ]);
  const [poAmountPaid, setPoAmountPaid] = useState<number>(0);
  const [poPaymentMethod, setPoPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [poNotes, setPoNotes] = useState('');
  const [poUpdateCostPrices, setPoUpdateCostPrices] = useState(true);

  // Supplier form state
  const [supFormData, setSupFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  // Calculate PO items total
  const poTotalAmount = poItems.reduce((acc, i) => acc + i.total, 0);

  // Filtered Purchases
  const filteredPurchases = purchases.filter((p) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesQuery =
      !q ||
      p.poNumber.toLowerCase().includes(q) ||
      p.supplierName.toLowerCase().includes(q) ||
      p.items.some((i) => i.productName.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'all' || p.paymentStatus === statusFilter;
    return matchesQuery && matchesStatus;
  });

  // Filtered Suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchTerm.toLowerCase().trim();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.contactPerson.toLowerCase().includes(q) ||
      s.phone.includes(q)
    );
  });

  // KPI calculations
  const totalPurchasesAmount = purchases.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalPaidToSuppliers = purchases.reduce((acc, p) => acc + p.amountPaid, 0);
  const totalSupplierBalanceOwed = suppliers.reduce((acc, s) => acc + s.balanceOwed, 0);

  // Item handler for PO
  const handleItemProductChange = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    setPoItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          const qty = item.quantity || 1;
          const cost = prod.costPrice;
          return {
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            unitCost: cost,
            quantity: qty,
            total: cost * qty,
            unit: prod.unit,
          };
        }
        return item;
      })
    );
  };

  const handleItemQtyChange = (index: number, qty: number) => {
    setPoItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          const safeQty = Math.max(1, qty);
          return {
            ...item,
            quantity: safeQty,
            total: safeQty * item.unitCost,
          };
        }
        return item;
      })
    );
  };

  const handleItemCostChange = (index: number, cost: number) => {
    setPoItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          const safeCost = Math.max(0, cost);
          return {
            ...item,
            unitCost: safeCost,
            total: item.quantity * safeCost,
          };
        }
        return item;
      })
    );
  };

  const addPoItemRow = () => {
    const firstProd = products[0];
    if (!firstProd) return;
    setPoItems((prev) => [
      ...prev,
      {
        productId: firstProd.id,
        productName: firstProd.name,
        sku: firstProd.sku,
        unitCost: firstProd.costPrice,
        quantity: 5,
        total: firstProd.costPrice * 5,
        unit: firstProd.unit,
      },
    ]);
  };

  const removePoItemRow = (index: number) => {
    if (poItems.length <= 1) return;
    setPoItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Submit PO
  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0) return;

    const sup = suppliers.find((s) => s.id === poSupplierId);
    const supplierName = sup ? sup.name : 'General Supplier';

    recordPurchase({
      supplierId: poSupplierId,
      supplierName,
      items: poItems,
      totalAmount: poTotalAmount,
      amountPaid: Number(poAmountPaid) || 0,
      paymentMethod: poPaymentMethod,
      notes: poNotes.trim() || undefined,
      updateCostPrices: poUpdateCostPrices,
    });

    setIsNewPOModalOpen(false);
    setPoNotes('');
  };

  // Supplier Form Submissions
  const handleOpenAddSupplier = () => {
    setSupFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    });
    setIsNewSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupFormData({
      name: sup.name,
      contactPerson: sup.contactPerson,
      phone: sup.phone,
      email: sup.email,
      address: sup.address,
      notes: sup.notes || '',
    });
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supFormData.name.trim()) return;

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, supFormData);
      setEditingSupplier(null);
    } else {
      addSupplier(supFormData);
      setIsNewSupplierModalOpen(false);
    }
  };

  const handleSettleSupplierDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSupplier || supplierPayAmount <= 0) return;

    recordSupplierPayment(
      payingSupplier.id,
      supplierPayAmount,
      supplierPayMethod,
      supplierPayNote || undefined
    );
    setPayingSupplier(null);
    setSupplierPayAmount(0);
    setSupplierPayNote('');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Purchases & Supplier Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record supplier orders, stock replenishment invoices, and track outstanding supplier debts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportPurchasesCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          <button
            onClick={() => {
              setPoAmountPaid(0);
              setIsNewPOModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Purchase / Stock-In
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Purchases Value</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(totalPurchasesAmount)}</div>
          <span className="text-[11px] text-slate-500">{purchases.length} total orders</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Paid to Suppliers</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700">{formatCurrency(totalPaidToSuppliers)}</div>
          <span className="text-[11px] text-emerald-600">Settled expenditures</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Outstanding Supplier Debt</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600">{formatCurrency(totalSupplierBalanceOwed)}</div>
          <span className="text-[11px] text-rose-500">Payable to suppliers</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Active Suppliers</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900">{suppliers.length}</div>
          <span className="text-[11px] text-slate-500">Vendor directory</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center justify-between text-xs font-semibold">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'purchases'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            Purchase Orders & Stock In ({purchases.length})
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'suppliers'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Suppliers Directory & Debtors ({suppliers.length})
          </button>
        </div>

        {activeTab === 'suppliers' && (
          <button
            onClick={handleOpenAddSupplier}
            className="pb-2.5 text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <PlusCircle className="w-4 h-4" />
            Add Supplier
          </button>
        )}
      </div>

      {/* TAB 1: PURCHASES ORDERS */}
      {activeTab === 'purchases' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search PO #, supplier, or product name..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden"
            >
              <option value="all">All Payment Status</option>
              <option value="paid">Fully Paid</option>
              <option value="partial">Partial Paid</option>
              <option value="unpaid">Unpaid (Credit)</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">PO Number & Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Items Received</th>
                  <th className="py-3 px-3">Total Amount</th>
                  <th className="py-3 px-3">Paid</th>
                  <th className="py-3 px-3">Balance Due</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No purchase orders recorded.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono-code">{po.poNumber}</div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(po.date).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-900">
                        {po.supplierName}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">
                          {po.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {po.items.reduce((acc, i) => acc + i.quantity, 0)} units received
                        </div>
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-900">
                        {formatCurrency(po.totalAmount)}
                      </td>

                      <td className="py-3 px-3 text-emerald-700 font-medium">
                        {formatCurrency(po.amountPaid)}
                      </td>

                      <td className="py-3 px-3 font-bold">
                        {po.balanceDue > 0 ? (
                          <span className="text-rose-600">{formatCurrency(po.balanceDue)}</span>
                        ) : (
                          <span className="text-slate-400">0.00</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase ${
                            po.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-800'
                              : po.paymentStatus === 'partial'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          {po.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search suppliers by name, contact, phone..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-3">Debt Owed to Supplier</th>
                  <th className="py-3 px-4">Address / Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-700">
                      {s.contactPerson || '—'}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <div>{s.phone}</div>
                      {s.email && <div className="text-[11px] text-slate-400">{s.email}</div>}
                    </td>

                    <td className="py-3 px-3">
                      {s.balanceOwed > 0 ? (
                        <div className="font-bold text-rose-600 text-sm">
                          {formatCurrency(s.balanceOwed)}
                          <span className="text-[10px] block font-normal text-rose-500">Shop owes vendor</span>
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-xs flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> All Settled
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      <div>{s.address || '—'}</div>
                      {s.notes && <div className="text-slate-400 italic mt-0.5">{s.notes}</div>}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {s.balanceOwed > 0 && (
                          <button
                            onClick={() => {
                              setPayingSupplier(s);
                              setSupplierPayAmount(s.balanceOwed);
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-[11px] transition-colors"
                          >
                            Pay Debt
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditSupplier(s)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete supplier "${s.name}"?`)) deleteSupplier(s.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREATE PURCHASE ORDER / RECORD STOCK IN */}
      {isNewPOModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Record Purchase / Stock-In</h3>
                <p className="text-xs text-slate-500">
                  Received inventory is automatically added to product stock.
                </p>
              </div>
              <button
                onClick={() => setIsNewPOModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              
              {/* Supplier Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Supplier *</label>
                  <select
                    required
                    value={poSupplierId}
                    onChange={(e) => setPoSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.balanceOwed > 0 ? `(Debt: ${formatCurrency(s.balanceOwed)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={poPaymentMethod}
                    onChange={(e) => setPoPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="bank_transfer">Bank Transfer / EFT</option>
                    <option value="cash">Cash</option>
                    <option value="card">Company Card / POS</option>
                    <option value="momo">Mobile Money</option>
                    <option value="credit">Pay Later / Supplier Credit</option>
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="font-bold text-slate-800">Items Received in this Delivery</span>
                  <button
                    type="button"
                    onClick={addPoItemRow}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item Row
                  </button>
                </div>

                <div className="space-y-2">
                  {poItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200">
                      
                      {/* Product select */}
                      <div className="col-span-5">
                        <label className="text-[10px] text-slate-400 font-medium">Product</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemProductChange(idx, e.target.value)}
                          className="w-full text-xs py-1 border-slate-200 rounded-md"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Current Stock: {p.stock})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400 font-medium">Quantity ({item.unit})</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemQtyChange(idx, parseInt(e.target.value) || 1)}
                          className="w-full text-xs font-semibold py-1 px-1.5 border border-slate-200 rounded-md text-center"
                        />
                      </div>

                      {/* Unit Cost */}
                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400 font-medium">Unit Cost</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          value={item.unitCost}
                          onChange={(e) => handleItemCostChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-semibold py-1 px-1.5 border border-slate-200 rounded-md text-right"
                        />
                      </div>

                      {/* Line Total */}
                      <div className="col-span-2 text-right">
                        <label className="text-[10px] text-slate-400 font-medium">Total Cost</label>
                        <div className="font-bold text-slate-900 py-1">{formatCurrency(item.total)}</div>
                      </div>

                      {/* Remove */}
                      <div className="col-span-1 text-center pt-3">
                        <button
                          type="button"
                          onClick={() => removePoItemRow(idx)}
                          disabled={poItems.length <= 1}
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Allocation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-600 font-medium">Total Purchase Invoice:</div>
                  <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {formatCurrency(poTotalAmount)}
                  </div>
                  
                  <label className="flex items-center gap-1.5 mt-3 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={poUpdateCostPrices}
                      onChange={(e) => setPoUpdateCostPrices(e.target.checked)}
                      className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Update inventory cost price with this new rate</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-semibold text-slate-700">Amount Paid to Supplier Now</label>
                      <button
                        type="button"
                        onClick={() => setPoAmountPaid(poTotalAmount)}
                        className="text-[10px] text-indigo-600 hover:underline"
                      >
                        Full Payment
                      </button>
                    </div>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={poAmountPaid}
                      onChange={(e) => setPoAmountPaid(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                    <span className="text-slate-600">Balance Due (Added to Supplier Debt):</span>
                    <span className="font-bold text-rose-600">
                      {formatCurrency(Math.max(0, poTotalAmount - poAmountPaid))}
                    </span>
                  </div>
                </div>
              </div>

              {/* PO Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Purchase Remarks (Optional)</label>
                <input
                  type="text"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="e.g. Invoice #9910, Delivery Batch 3, Received in good condition"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewPOModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Record Stock-In & Save PO
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SUPPLIER */}
      {(isNewSupplierModalOpen || editingSupplier) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Supplier'}
              </h3>
              <button
                onClick={() => {
                  setIsNewSupplierModalOpen(false);
                  setEditingSupplier(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={supFormData.name}
                  onChange={(e) => setSupFormData({ ...supFormData, name: e.target.value })}
                  placeholder="e.g. Apex Global Distributors"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Person Name</label>
                <input
                  type="text"
                  value={supFormData.contactPerson}
                  onChange={(e) => setSupFormData({ ...supFormData, contactPerson: e.target.value })}
                  placeholder="e.g. Robert Smith"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={supFormData.phone}
                    onChange={(e) => setSupFormData({ ...supFormData, phone: e.target.value })}
                    placeholder="e.g. +1 555-0182"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={supFormData.email}
                    onChange={(e) => setSupFormData({ ...supFormData, email: e.target.value })}
                    placeholder="orders@vendor.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Warehouse Location</label>
                <input
                  type="text"
                  value={supFormData.address}
                  onChange={(e) => setSupFormData({ ...supFormData, address: e.target.value })}
                  placeholder="e.g. Warehouse 12, Commercial Road"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  value={supFormData.notes}
                  onChange={(e) => setSupFormData({ ...supFormData, notes: e.target.value })}
                  placeholder="Payment terms, delivery schedules, representative notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewSupplierModalOpen(false);
                    setEditingSupplier(null);
                  }}
                  className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAY SUPPLIER DEBT */}
      {payingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Settle Supplier Debt</h3>
                <p className="text-xs text-slate-500 font-medium">{payingSupplier.name}</p>
              </div>
              <button
                onClick={() => setPayingSupplier(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSettleSupplierDebt} className="space-y-3 text-xs">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex justify-between items-center">
                <span className="text-rose-800 font-medium">Total Debt Owed:</span>
                <span className="font-bold text-base text-rose-700">
                  {formatCurrency(payingSupplier.balanceOwed)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Amount *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={payingSupplier.balanceOwed}
                  required
                  value={supplierPayAmount}
                  onChange={(e) => setSupplierPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={supplierPayMethod}
                  onChange={(e) => setSupplierPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="bank_transfer">Bank Transfer / Wire</option>
                  <option value="cash">Cash</option>
                  <option value="card">Company Card / POS</option>
                  <option value="momo">Mobile Money</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Reference / Note</label>
                <input
                  type="text"
                  value={supplierPayNote}
                  onChange={(e) => setSupplierPayNote(e.target.value)}
                  placeholder="e.g. Bank Ref #9921 / Cheque #442"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPayingSupplier(null)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

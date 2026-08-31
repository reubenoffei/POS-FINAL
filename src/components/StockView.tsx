import React, { useState, useMemo } from 'react';
import { useShop } from '../context/ShopContext';
import { Product, StockAdjustment } from '../types';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Layers,
  History,
  TrendingUp,
  Edit2,
  Trash2,
  X,
  SlidersHorizontal,
  Barcode as BarcodeIcon,
  DollarSign,
  Check,
  RefreshCw,
  Store,
  ShieldCheck,
  ArrowRightLeft,
  Lock,
  Building2,
  Printer,
  Tag,
  CheckSquare,
  Square,
  Copy,
} from 'lucide-react';
import { printBarcodeLabels, BarcodePaperMode, generateBarcodeSvgString } from '../lib/printUtils';

export const StockView: React.FC = () => {
  const {
    products,
    suppliers,
    stockAdjustments,
    branches,
    activeBranch,
    activeBranchId,
    currentUser,
    isOwner,
    canManageStock,
    canDeleteStock,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    transferStock,
    exportStockCSV,
    formatCurrency,
    getProductBranchStock,
    settings,
  } = useShop();

  const calculateMargin = (cost: number, sell: number) => {
    if (!sell || sell <= 0) return '0.0';
    return (((sell - cost) / sell) * 100).toFixed(1);
  };

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out' | 'in'>('all');
  const [activeTab, setActiveTab] = useState<'inventory' | 'adjustments' | 'transfer' | 'barcodes'>('inventory');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  // Transfer State
  const [transferProductId, setTransferProductId] = useState<string>('');
  const [transferFromBranch, setTransferFromBranch] = useState<string>(branches[0]?.id || 'branch-1');
  const [transferToBranch, setTransferToBranch] = useState<string>(branches[1]?.id || 'branch-2');
  const [transferQty, setTransferQty] = useState<number>(5);
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [transferSuccessMsg, setTransferSuccessMsg] = useState<string | null>(null);

  // Form states for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'Groceries',
    unit: 'pcs',
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    minStockAlert: 10,
    supplierId: '',
    description: '',
  });

  // Barcode Printing Studio State
  const [barcodePaperMode, setBarcodePaperMode] = useState<BarcodePaperMode>('thermal_roll');
  const [selectedBarcodeIds, setSelectedBarcodeIds] = useState<string[]>([]);
  const [barcodeCopiesMap, setBarcodeCopiesMap] = useState<Record<string, number>>({});
  const [globalLabelCopies, setGlobalLabelCopies] = useState<number>(1);
  const [barcodeShowPrice, setBarcodeShowPrice] = useState<boolean>(true);
  const [barcodeShowSku, setBarcodeShowSku] = useState<boolean>(true);
  const [barcodeSearchTerm, setBarcodeSearchTerm] = useState<string>('');
  const [isPrintingBarcodes, setIsPrintingBarcodes] = useState<boolean>(false);
  const [barcodePrintSuccess, setBarcodePrintSuccess] = useState<boolean>(false);

  // Stock Adjustment Form state
  const [adjNewStock, setAdjNewStock] = useState<number>(0);
  const [adjReason, setAdjReason] = useState<StockAdjustment['reason']>('audit_discrepancy');
  const [adjNotes, setAdjNotes] = useState('');

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set).sort()];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q);

      const effectiveStock = getProductBranchStock(p);
      let matchesStatus = true;
      if (statusFilter === 'low') matchesStatus = effectiveStock > 0 && effectiveStock <= p.minStockAlert;
      if (statusFilter === 'out') matchesStatus = effectiveStock <= 0;
      if (statusFilter === 'in') matchesStatus = effectiveStock > p.minStockAlert;

      return matchesCat && matchesSearch && matchesStatus;
    });
  }, [products, categoryFilter, searchTerm, statusFilter, activeBranchId]);

  // Inventory Totals
  const totalSKUs = products.length;
  const totalItemsCount = products.reduce((acc, p) => acc + (isOwner ? p.stock : getProductBranchStock(p)), 0);
  const totalCostVal = products.reduce((acc, p) => acc + p.costPrice * (isOwner ? p.stock : getProductBranchStock(p)), 0);
  const totalRetailVal = products.reduce((acc, p) => acc + p.sellingPrice * (isOwner ? p.stock : getProductBranchStock(p)), 0);
  const lowStockCount = products.filter((p) => {
    const s = getProductBranchStock(p);
    return s > 0 && s <= p.minStockAlert;
  }).length;
  const outOfStockCount = products.filter((p) => getProductBranchStock(p) <= 0).length;

  // Auto generators
  const generateSKU = (name: string, category: string) => {
    const catPrefix = (category || 'GEN').slice(0, 3).toUpperCase();
    const namePrefix = (name || 'PRD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    const rand = Math.floor(100 + Math.random() * 900);
    return `${catPrefix}-${namePrefix}-${rand}`;
  };

  const generateBarcode = () => {
    return `890${Math.floor(100000000 + Math.random() * 900000000)}`;
  };

  const handleOpenAddModal = () => {
    if (!canManageStock) {
      alert('Permission Denied: Only the Owner at the Head Branch has exclusive rights to add new stock to the catalog.');
      return;
    }
    setFormData({
      name: '',
      sku: generateSKU('', 'Groceries'),
      barcode: generateBarcode(),
      category: 'Groceries',
      unit: 'pcs',
      costPrice: 0,
      sellingPrice: 0,
      stock: 0,
      minStockAlert: 10,
      supplierId: suppliers[0]?.id || '',
      description: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    if (!canManageStock) {
      alert('Permission Denied: Only the Owner at the Head Branch can edit product catalog definitions.');
      return;
    }
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      unit: product.unit,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      minStockAlert: product.minStockAlert,
      supplierId: product.supplierId || '',
      description: product.description || '',
    });
  };

  const handleOpenAdjustModal = (product: Product) => {
    setAdjustingProduct(product);
    setAdjNewStock(getProductBranchStock(product));
    setAdjReason('audit_discrepancy');
    setAdjNotes('');
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim(),
        category: formData.category,
        unit: formData.unit,
        costPrice: Number(formData.costPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        stock: Number(formData.stock) || 0,
        minStockAlert: Number(formData.minStockAlert) || 0,
        supplierId: formData.supplierId || undefined,
        description: formData.description.trim() || undefined,
      });
      setEditingProduct(null);
    } else {
      addProduct({
        name: formData.name.trim(),
        sku: formData.sku.trim() || generateSKU(formData.name, formData.category),
        barcode: formData.barcode.trim() || generateBarcode(),
        category: formData.category,
        unit: formData.unit,
        costPrice: Number(formData.costPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        stock: Number(formData.stock) || 0,
        minStockAlert: Number(formData.minStockAlert) || 10,
        supplierId: formData.supplierId || undefined,
        description: formData.description.trim() || undefined,
      });
      setIsAddModalOpen(false);
    }
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    adjustStock(
      adjustingProduct.id,
      adjNewStock,
      adjReason,
      adjNotes.trim() || undefined,
      currentUser?.name || 'Staff'
    );
    setAdjustingProduct(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (!canDeleteStock) {
      alert('Permission Denied: Only the Head Branch Owner has exclusive right to delete stock items.');
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete "${name}" from inventory?`)) {
      deleteProduct(id);
    }
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProductId) {
      alert('Please choose a product to transfer');
      return;
    }
    if (transferFromBranch === transferToBranch) {
      alert('Origin and Destination branches cannot be the same.');
      return;
    }

    const res = transferStock(transferProductId, transferFromBranch, transferToBranch, transferQty, transferNotes);
    if (res.success) {
      setTransferSuccessMsg(`Successfully transferred ${transferQty} units between branches.`);
      setTimeout(() => setTransferSuccessMsg(null), 3000);
    } else {
      alert(res.message || 'Transfer failed');
    }
  };

  // Barcode Printing Helpers
  const handleToggleSelectBarcode = (id: string) => {
    setSelectedBarcodeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllBarcodes = () => {
    setSelectedBarcodeIds(products.map((p) => p.id));
  };

  const handleDeselectAllBarcodes = () => {
    setSelectedBarcodeIds([]);
  };

  const handleSetCopiesForProduct = (id: string, count: number) => {
    setBarcodeCopiesMap((prev) => ({
      ...prev,
      [id]: Math.max(1, count),
    }));
  };

  const handleApplyGlobalCopies = () => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      map[p.id] = globalLabelCopies;
    });
    setBarcodeCopiesMap(map);
  };

  const handlePrintBarcodes = async (productsToPrint?: Product[], customCopies?: Record<string, number>) => {
    const targetProducts = productsToPrint || (
      selectedBarcodeIds.length > 0
        ? products.filter((p) => selectedBarcodeIds.includes(p.id))
        : products
    );

    if (targetProducts.length === 0) {
      alert('Please select at least one product to print barcode labels.');
      return;
    }

    setIsPrintingBarcodes(true);
    try {
      await printBarcodeLabels(targetProducts, formatCurrency, {
        mode: barcodePaperMode,
        copiesPerProduct: customCopies || barcodeCopiesMap,
        defaultCopies: globalLabelCopies,
        showPrice: barcodeShowPrice,
        showSku: barcodeShowSku,
        shopName: settings.shopName || 'Retail Store',
      });
      setBarcodePrintSuccess(true);
      setTimeout(() => setBarcodePrintSuccess(false), 3000);
    } catch (err) {
      console.error('Barcode print error:', err);
    } finally {
      setIsPrintingBarcodes(false);
    }
  };

  const handleQuickPrintSingleProductBarcode = (product: Product) => {
    printBarcodeLabels([product], formatCurrency, {
      mode: barcodePaperMode,
      copiesPerProduct: { [product.id]: 1 },
      defaultCopies: 1,
      showPrice: true,
      showSku: true,
      shopName: settings.shopName || 'Retail Store',
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Branch & Access Rights Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
            {isOwner ? <ShieldCheck className="w-5 h-5" /> : <Store className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">
                Current Branch View: <span className="text-indigo-400 font-extrabold">{activeBranch.name}</span>
              </h3>
              {isOwner ? (
                <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                  Head Branch Owner (Full Admin Rights)
                </span>
              ) : (
                <span className="text-[10px] font-medium bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                  Shopkeeper Branch Scope
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isOwner
                ? 'You have exclusive owner authority to add new products, delete inventory, transfer stock between 3+ branches, and manage cashier accounts.'
                : `Logged in as ${currentUser?.name}. You can audit and monitor stock at ${activeBranch.name}. Catalog creation/deletion is restricted to Head Office Owner.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-slate-400">
            Network: <strong className="text-white">{branches.length} Registered Branches</strong>
          </span>
        </div>
      </div>

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Stock & Inventory Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-branch stock levels, valuation, low-stock warnings, and inter-branch transfers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportStockCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          <button
            onClick={handleOpenAddModal}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-colors ${
              canManageStock
                ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                : 'text-slate-500 bg-slate-100 hover:bg-slate-200 cursor-not-allowed border border-slate-300'
            }`}
            title={canManageStock ? 'Add New Product to Catalog' : 'Restricted: Only Head Branch Owner can add stock'}
          >
            {canManageStock ? <Plus className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
            Add New Product
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Catalog SKUs</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900">{totalSKUs}</div>
          <span className="text-[11px] text-slate-500">{totalItemsCount} units ({isOwner ? 'All Branches' : activeBranch.name})</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Inventory Cost Value</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(totalCostVal)}</div>
          <span className="text-[11px] text-slate-500">Asset acquisition cost</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Expected Retail Value</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700">{formatCurrency(totalRetailVal)}</div>
          <span className="text-[11px] text-emerald-600/90 font-medium">
            +{formatCurrency(Math.max(0, totalRetailVal - totalCostVal))} margin
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Low Stock Warnings</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-700">{lowStockCount}</div>
          <span className="text-[11px] text-amber-600">At {activeBranch.name}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Out of Stock</span>
            <Layers className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600">{outOfStockCount}</div>
          <span className="text-[11px] text-rose-500">Zero quantity items</span>
        </div>
      </div>

      {/* Sub Tabs: Catalog vs Branch Transfer vs Audit vs Barcodes */}
      <div className="border-b border-slate-200 flex items-center gap-4 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          Branch Catalog ({products.length})
        </button>

        <button
          onClick={() => setActiveTab('transfer')}
          className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'transfer'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
          Inter-Branch Stock Transfer
        </button>

        <button
          onClick={() => setActiveTab('adjustments')}
          className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'adjustments'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Stock Audit Trail ({stockAdjustments.length})
        </button>

        <button
          onClick={() => setActiveTab('barcodes')}
          className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'barcodes'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarcodeIcon className="w-4 h-4" />
          Printable Barcode Sheet
        </button>
      </div>

      {/* TAB 1: PRODUCT CATALOG */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Name, SKU, or Barcode..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              
              {/* Category Filter */}
              <div className="flex items-center gap-1 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c === 'All' ? 'All Categories' : c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden"
              >
                <option value="all">All Status</option>
                <option value="in">Normal In-Stock</option>
                <option value="low">Low Stock Alert (≤ Alert)</option>
                <option value="out">Out of Stock (0)</option>
              </select>

            </div>
          </div>

          {/* Products Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Cost Price</th>
                  <th className="py-3 px-3">Selling Price</th>
                  <th className="py-3 px-3">Margin</th>
                  <th className="py-3 px-3">Stock Level</th>
                  <th className="py-3 px-3">Valuation</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No matching products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isOut = p.stock <= 0;
                    const isLow = p.stock > 0 && p.stock <= p.minStockAlert;
                    const margin = calculateMargin(p.costPrice, p.sellingPrice);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Name & SKU */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 text-sm leading-snug">
                            {p.name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono-code">
                            <span>SKU: {p.sku}</span>
                            <span>•</span>
                            <span>Barcode: {p.barcode}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {p.category}
                          </span>
                        </td>

                        {/* Cost Price */}
                        <td className="py-3 px-3 font-medium text-slate-600">
                          {formatCurrency(p.costPrice)}
                        </td>

                        {/* Selling Price */}
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {formatCurrency(p.sellingPrice)}
                          <span className="text-[10px] text-slate-400 font-normal ml-0.5">/{p.unit}</span>
                        </td>

                        {/* Margin */}
                        <td className="py-3 px-3">
                          <span className={`font-semibold text-[11px] ${Number(margin) > 20 ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {margin}%
                          </span>
                        </td>

                        {/* Stock Level */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {isOut ? (
                              <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-rose-50 text-rose-700 border border-rose-200">
                                0 {p.unit} (Out)
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                {getProductBranchStock(p)} {p.unit} (Low)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md font-medium text-[11px] bg-emerald-50 text-emerald-800">
                                {getProductBranchStock(p)} {p.unit}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Branch: <strong className="text-slate-600">{getProductBranchStock(p)}</strong> {p.unit}
                            {isOwner && (
                              <span className="text-indigo-600 ml-1">
                                (Total: {p.stock})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Valuation */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">
                            {formatCurrency(p.costPrice * getProductBranchStock(p))}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Retail: {formatCurrency(p.sellingPrice * getProductBranchStock(p))}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleQuickPrintSingleProductBarcode(p)}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors inline-flex items-center gap-1"
                              title="Print Thermal Barcode Label for this Product"
                            >
                              <Tag className="w-3 h-3 text-indigo-600" />
                              <span className="hidden xl:inline">Label</span>
                            </button>
                            <button
                              onClick={() => handleOpenAdjustModal(p)}
                              className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors"
                              title="Adjust Stock Quantity at Current Branch"
                            >
                              Audit Qty
                            </button>
                            {canManageStock && (
                              <button
                                onClick={() => handleOpenEditModal(p)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                title="Edit Product Definition (Owner Only)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDeleteStock && (
                              <button
                                onClick={() => handleDelete(p.id, p.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="Delete Product (Owner Only)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* TAB: INTER-BRANCH STOCK TRANSFER */}
      {activeTab === 'transfer' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Inter-Branch Stock Movement & Logistics</h3>
              <p className="text-xs text-slate-500">
                Transfer inventory batches between Head Office warehouse and retail shop branches.
              </p>
            </div>
            {transferSuccessMsg && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                {transferSuccessMsg}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Transfer Dispatch Form */}
            <form onSubmit={handleExecuteTransfer} className="lg:col-span-2 space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Source (Origin Branch) *
                  </label>
                  <select
                    value={transferFromBranch}
                    onChange={(e) => setTransferFromBranch(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.isHeadOffice ? '(Head Office HQ)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Destination Branch *
                  </label>
                  <select
                    value={transferToBranch}
                    onChange={(e) => setTransferToBranch(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} disabled={b.id === transferFromBranch}>
                        {b.name} {b.id === transferFromBranch ? '(Selected as Origin)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Product to Move *
                </label>
                <select
                  value={transferProductId}
                  onChange={(e) => {
                    setTransferProductId(e.target.value);
                  }}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800"
                  required
                >
                  <option value="">-- Choose Product to Transfer --</option>
                  {products.map((p) => {
                    const originStock = p.branchStock?.[transferFromBranch] ?? 0;
                    return (
                      <option key={p.id} value={p.id} disabled={originStock <= 0}>
                        {p.name} — [Available at origin: {originStock} {p.unit}]
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantity and Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Transfer Quantity *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={transferQty}
                    onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Dispatch Reference / Notes
                  </label>
                  <input
                    type="text"
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="e.g. Weekly restock van delivery #4"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all flex items-center gap-2"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Dispatch Transfer
                </button>
              </div>
            </form>

            {/* Branch Network Summary Box */}
            <div className="bg-slate-900 text-white p-5 rounded-xl flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  Branch Locations Distribution
                </h4>
                <div className="space-y-3">
                  {branches.map((b) => (
                    <div key={b.id} className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{b.name}</span>
                        {b.isHeadOffice && (
                          <span className="text-[10px] bg-indigo-600 px-1.5 py-0.5 rounded font-semibold text-white">
                            HQ
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{b.address}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Manager: {b.managerName}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-800">
                Transfers update branch inventory instantly across all registers and POS terminals.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT TRAIL / ADJUSTMENTS LOG */}
      {activeTab === 'adjustments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Inventory Adjustment Audit Log</h3>
              <p className="text-xs text-slate-500">
                Official audit trail of manual adjustments, damaged items, expirations, and stock corrections.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-3">Previous</th>
                  <th className="py-3 px-3">Adjusted To</th>
                  <th className="py-3 px-3">Difference</th>
                  <th className="py-3 px-3">Reason</th>
                  <th className="py-3 px-4">Notes & Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No stock adjustments recorded yet.
                    </td>
                  </tr>
                ) : (
                  stockAdjustments.map((adj) => (
                    <tr key={adj.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-slate-600 font-mono-code text-[11px]">
                        {new Date(adj.date).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{adj.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono-code">SKU: {adj.sku}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{adj.previousStock}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{adj.newStock}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold text-[11px] px-1.5 py-0.5 rounded-sm ${
                            adj.difference > 0
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {adj.difference > 0 ? `+${adj.difference}` : adj.difference}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize font-medium text-slate-700 px-2 py-0.5 bg-slate-100 rounded-md">
                          {adj.reason.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{adj.notes || '—'}</div>
                        <div className="text-[10px] text-slate-400">By: {adj.adjustedBy}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRINTABLE BARCODE SHEET & THERMAL LABEL STUDIO */}
      {activeTab === 'barcodes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
          
          {/* Header and Mode Selector */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <BarcodeIcon className="w-5 h-5 text-indigo-600" />
                Barcode & Price Label Printing Studio
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate crisp, scannable Code128 barcode labels for thermal sticker rolls or standard A4 sheet grids.
              </p>
            </div>

            {/* Paper format selector */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setBarcodePaperMode('thermal_roll')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    barcodePaperMode === 'thermal_roll'
                      ? 'bg-white text-indigo-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  Thermal Label Roll (58mm/Continuous)
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodePaperMode('a4_labels')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    barcodePaperMode === 'a4_labels'
                      ? 'bg-white text-indigo-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Standard A4 Sheet (3x8 Grid)
                </button>
              </div>

              <button
                onClick={() => handlePrintBarcodes()}
                disabled={isPrintingBarcodes}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center gap-2"
              >
                {barcodePrintSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    Sent to Printer!
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    {isPrintingBarcodes ? 'Preparing Labels...' : 'Print Barcode Labels'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Configuration & Controls Toolbar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row flex-wrap gap-4 items-stretch md:items-center justify-between text-xs">
            
            {/* Search within Barcode Studio */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={barcodeSearchTerm}
                onChange={(e) => setBarcodeSearchTerm(e.target.value)}
                placeholder="Filter products to label..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Quick selection actions */}
            <div className="flex flex-wrap items-center gap-2 text-slate-700">
              <button
                type="button"
                onClick={handleSelectAllBarcodes}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 font-semibold text-slate-700 flex items-center gap-1.5"
              >
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                Select All ({products.length})
              </button>
              <button
                type="button"
                onClick={handleDeselectAllBarcodes}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 font-semibold text-slate-700 flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5 text-slate-400" />
                Clear
              </button>
            </div>

            {/* Global Copies Batch Stepper */}
            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-300">
              <span className="font-semibold text-slate-700">Copies/Product:</span>
              <input
                type="number"
                min={1}
                max={100}
                value={globalLabelCopies}
                onChange={(e) => setGlobalLabelCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 text-center py-0.5 border border-slate-300 rounded-md font-bold text-slate-900"
              />
              <button
                type="button"
                onClick={handleApplyGlobalCopies}
                className="px-2 py-0.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md font-bold text-[11px]"
              >
                Apply to All
              </button>
            </div>

            {/* Display Toggles */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={barcodeShowPrice}
                  onChange={(e) => setBarcodeShowPrice(e.target.checked)}
                  className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                />
                Show Price
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={barcodeShowSku}
                  onChange={(e) => setBarcodeShowSku(e.target.checked)}
                  className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                />
                Show SKU
              </label>
            </div>

          </div>

          {/* Selected Summary */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Selected: <strong className="text-slate-900">
                {selectedBarcodeIds.length === 0 ? products.length : selectedBarcodeIds.length} of {products.length} products
              </strong>
              {selectedBarcodeIds.length === 0 && ' (All will be printed)'}
            </span>
            <span className="text-indigo-600 font-semibold">
              Mode: {barcodePaperMode === 'thermal_roll' ? 'Continuous Thermal Roll (58mm)' : 'Standard A4 Multi-label Grid'}
            </span>
          </div>

          {/* Product Label Preview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-slate-50/70 rounded-xl border border-slate-200 max-h-[600px] overflow-y-auto">
            {products
              .filter((p) => {
                if (!barcodeSearchTerm) return true;
                const q = barcodeSearchTerm.toLowerCase();
                return (
                  p.name.toLowerCase().includes(q) ||
                  p.sku.toLowerCase().includes(q) ||
                  p.barcode.toLowerCase().includes(q)
                );
              })
              .map((prod) => {
                const isSelected = selectedBarcodeIds.length === 0 || selectedBarcodeIds.includes(prod.id);
                const copies = barcodeCopiesMap[prod.id] ?? globalLabelCopies;
                const barcodeSvgHtml = generateBarcodeSvgString(prod.barcode || prod.sku, {
                  height: 28,
                  width: 1.2,
                  fontSize: 9,
                });

                return (
                  <div
                    key={prod.id}
                    className={`bg-white p-3.5 rounded-xl border transition-all flex flex-col justify-between relative shadow-2xs ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 opacity-60 hover:opacity-90'
                    }`}
                  >
                    {/* Checkbox and Title */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedBarcodeIds.includes(prod.id)}
                          onChange={() => handleToggleSelectBarcode(prod.id)}
                          className="mt-0.5 rounded-sm text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 line-clamp-1" title={prod.name}>
                            {prod.name}
                          </div>
                          {barcodeShowSku && (
                            <div className="text-[10px] text-slate-400 font-mono-code">SKU: {prod.sku}</div>
                          )}
                        </div>
                      </div>

                      {barcodeShowPrice && (
                        <div className="text-xs font-extrabold text-indigo-700 shrink-0">
                          {formatCurrency(prod.sellingPrice)}
                        </div>
                      )}
                    </div>

                    {/* Scaled Barcode SVG Preview */}
                    <div
                      className="my-1.5 flex justify-center items-center overflow-hidden bg-slate-50 p-1 rounded-lg border border-slate-100"
                      dangerouslySetInnerHTML={{ __html: barcodeSvgHtml }}
                    />

                    {/* Label Quantity Controls */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-medium">Qty:</span>
                        <div className="flex items-center border border-slate-200 rounded-md overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => handleSetCopiesForProduct(prod.id, copies - 1)}
                            className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                          >
                            -
                          </button>
                          <span className="px-2 py-0.5 font-bold text-slate-900 text-xs min-w-[20px] text-center">
                            {copies}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSetCopiesForProduct(prod.id, copies + 1)}
                            className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleQuickPrintSingleProductBarcode(prod)}
                        className="px-2 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1"
                        title="Print single test label"
                      >
                        <Printer className="w-3 h-3" />
                        Print 1
                      </button>
                    </div>

                  </div>
                );
              })}
          </div>

        </div>
      )}

      {/* MODAL: ADD / EDIT PRODUCT */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Inventory Product'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              
              {/* Product Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Title / Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Golden Grain Basmati Rice (5kg)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 font-medium"
                />
              </div>

              {/* SKU & Barcode Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700">SKU Code</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, sku: generateSKU(formData.name, formData.category) })}
                      className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Auto SKU
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-code"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700">Barcode / EAN</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, barcode: generateBarcode() })}
                      className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Auto Barcode
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-code"
                  />
                </div>
              </div>

              {/* Category, Unit & Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    list="category-suggestions"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                  <datalist id="category-suggestions">
                    <option value="Groceries" />
                    <option value="Dairy & Eggs" />
                    <option value="Beverages" />
                    <option value="Bakery" />
                    <option value="Snacks & Sweets" />
                    <option value="Household & Cleaning" />
                    <option value="Personal Care" />
                    <option value="Hardware" />
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit of Measure</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="bag">Bag</option>
                    <option value="box">Box</option>
                    <option value="bottle">Bottle</option>
                    <option value="can">Can</option>
                    <option value="pack">Pack</option>
                    <option value="carton">Carton</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="ltr">Liter (ltr)</option>
                    <option value="loaf">Loaf</option>
                    <option value="crate">Crate</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Primary Supplier</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">None / General</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & Margins */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Cost Price (Purchase Cost)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Selling Price (Retail)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold text-indigo-700"
                    />
                  </div>
                </div>

                {/* Live Margin Calculation */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-600">Calculated Profit Margin:</span>
                  <span className="font-bold text-emerald-700">
                    {calculateMargin(formData.costPrice, formData.sellingPrice)}% (Profit: {formatCurrency(Math.max(0, formData.sellingPrice - formData.costPrice))})
                  </span>
                </div>
              </div>

              {/* Stock Levels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Current In-Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Low-Stock Alert Level</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.minStockAlert}
                    onChange={(e) => setFormData({ ...formData, minStockAlert: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Description (Optional)</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional product specifications, storage conditions, or expiry notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl resize-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: ADJUST STOCK */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Adjust Stock Quantity</h3>
                <p className="text-[11px] text-slate-500 font-medium">{adjustingProduct.name}</p>
              </div>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
              
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600">Current Stock:</span>
                <span className="font-bold text-sm text-slate-900">{adjustingProduct.stock} {adjustingProduct.unit}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Exact Stock Quantity *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjNewStock}
                  onChange={(e) => setAdjNewStock(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base font-bold text-slate-900"
                />
                <div className="text-[11px] mt-1 text-slate-500">
                  Adjustment difference:{' '}
                  <strong className={adjNewStock - adjustingProduct.stock >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {adjNewStock - adjustingProduct.stock >= 0 ? `+${adjNewStock - adjustingProduct.stock}` : adjNewStock - adjustingProduct.stock} {adjustingProduct.unit}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Adjustment *</label>
                <select
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-800"
                >
                  <option value="audit_discrepancy">Physical Inventory Count Correction</option>
                  <option value="damaged">Damaged / Broken Goods</option>
                  <option value="expired">Expired Stock Discard</option>
                  <option value="theft">Lost / Missing Stock</option>
                  <option value="customer_return">Customer Return to Stock</option>
                  <option value="restock">Direct Restock</option>
                  <option value="other">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks / Explanation</label>
                <textarea
                  rows={2}
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  placeholder="Provide context for this inventory adjustment..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Confirm Adjustment
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

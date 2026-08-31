import React, { useState, useMemo } from 'react';
import { useShop } from '../context/ShopContext';
import { Product, SaleItem, PaymentMethod, Sale } from '../types';
import confetti from 'canvas-confetti';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  BookOpen,
  ArrowRight,
  Sparkles,
  AlertCircle,
  PlusCircle,
  X,
  Layers,
  Percent,
  Camera,
  Store,
  ShieldCheck,
  ChevronLeft,
  Check,
} from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';

export const POSView: React.FC = () => {
  const {
    products,
    customers,
    settings,
    recordSale,
    addCustomer,
    formatCurrency,
    activeBranch,
    currentUser,
    getProductBranchStock,
  } = useShop();

  // Mobile / Tablet Responsive Tab Switcher
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Cart State
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [applyTax, setApplyTax] = useState<boolean>(settings.enableTax);

  // Payment Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [saleNotes, setSaleNotes] = useState('');
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);

  // Quick New Customer Modal inside POS
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  // Categories list
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
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const q = searchTerm.toLowerCase().trim();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [products, selectedCategory, searchTerm]);

  // Add product to cart (using branch stock)
  const addToCart = (product: Product) => {
    const availableStock = getProductBranchStock(product);
    if (availableStock <= 0) {
      alert(`"${product.name}" is out of stock at ${activeBranch.name}.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= availableStock) {
          alert(`Cannot add more than ${availableStock} available units for ${product.name} at this branch.`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unitPrice,
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            unitPrice: product.sellingPrice,
            costPrice: product.costPrice,
            quantity: 1,
            total: product.sellingPrice,
            unit: product.unit,
          },
        ];
      }
    });
  };

  // Adjust cart item quantity
  const updateQuantity = (productId: string, newQty: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const availableStock = getProductBranchStock(product);
    if (newQty > availableStock) {
      newQty = availableStock;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: newQty, total: newQty * item.unitPrice }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setCashTendered('');
    setSaleNotes('');
  };

  // Barcode Scanner input handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = products.find(
      (p) =>
        p.barcode.toLowerCase() === barcodeInput.trim().toLowerCase() ||
        p.sku.toLowerCase() === barcodeInput.trim().toLowerCase()
    );

    if (matched) {
      addToCart(matched);
      setBarcodeInput('');
    } else {
      alert(`No product found with barcode/SKU: ${barcodeInput}`);
    }
  };

  // Cart calculations
  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);

  const calculatedDiscount = useMemo(() => {
    if (discountValue <= 0) return 0;
    if (discountType === 'percentage') {
      return (subtotal * Math.min(100, discountValue)) / 100;
    }
    return Math.min(subtotal, discountValue);
  }, [subtotal, discountType, discountValue]);

  const afterDiscount = Math.max(0, subtotal - calculatedDiscount);
  const taxRate = applyTax ? settings.taxRate : 0;
  const taxAmount = (afterDiscount * taxRate) / 100;
  const grandTotal = afterDiscount + taxAmount;

  // Selected customer details
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Cash change calculation
  const cashGivenNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, cashGivenNum - grandTotal);

  // Handle Checkout submission
  const handleCompleteSale = () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'credit' && !selectedCustomerId) {
      alert('Please select or add a registered customer to record a Store Credit (debt) sale.');
      return;
    }

    const amountPaid =
      paymentMethod === 'credit'
        ? 0
        : paymentMethod === 'cash'
        ? Math.min(grandTotal, cashGivenNum || grandTotal)
        : grandTotal;

    const sale = recordSale({
      customerId: selectedCustomerId || undefined,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
      customerPhone: selectedCustomer?.phone,
      items: cart,
      subtotal,
      discount: calculatedDiscount,
      taxRate,
      taxAmount,
      grandTotal,
      paymentMethod,
      cashTendered: paymentMethod === 'cash' ? cashGivenNum || grandTotal : undefined,
      changeDue: paymentMethod === 'cash' ? changeDue : undefined,
      amountPaid,
      notes: saleNotes.trim() || undefined,
    });

    // Celebration effect
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }

    setIsCheckoutOpen(false);
    clearCart();
    setLastCompletedSale(sale);
    setMobileTab('catalog');
  };

  // Quick Customer Creation
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newCust = addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim() || 'N/A',
      email: newCustEmail.trim() || undefined,
      notes: 'Added at POS register',
    });

    setSelectedCustomerId(newCust.id);
    setIsNewCustModalOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
  };

  const totalCartItems = cart.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100dvh-7rem)] md:h-[calc(100vh-4.25rem)] overflow-hidden relative">
      
      {/* LEFT / CENTER: Products Catalog & Search */}
      <div
        className={`flex-1 flex-col min-w-0 bg-slate-100 border-r border-slate-200 ${
          mobileTab === 'catalog' ? 'flex h-full' : 'hidden lg:flex'
        }`}
      >
        
        {/* Top Controls Bar */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 shadow-2xs space-y-2.5 sm:space-y-3">
          
          {/* Mobile / Tablet Segmented Tab Switcher */}
          <div className="lg:hidden flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMobileTab('catalog')}
              className={`flex-1 py-1.5 sm:py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'catalog'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Catalog ({filteredProducts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('cart')}
              className={`flex-1 py-1.5 sm:py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 relative ${
                mobileTab === 'cart'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Cart ({totalCartItems})</span>
              {cart.length > 0 && (
                <span className="font-mono text-[10px] ml-0.5 bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full font-extrabold">
                  {formatCurrency(grandTotal)}
                </span>
              )}
            </button>
          </div>

          {/* Branch & Cashier Context Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 sm:pb-2 border-b border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 sm:px-2.5 py-1 rounded-lg">
                <Store className="w-3.5 h-3.5 text-indigo-600" />
                Branch: <span className="text-indigo-700 font-bold">{activeBranch.name}</span>
              </span>
              <span className="text-slate-400 hidden sm:inline">•</span>
              <span className="text-slate-500 hidden sm:inline">
                Cashier: <strong className="text-slate-800">{currentUser?.name}</strong> ({currentUser?.role === 'owner' ? 'Owner / Admin' : 'Shopkeeper'})
              </span>
            </div>
            <span className="text-[11px] text-slate-500 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium border border-emerald-200">
              ● POS Active
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 items-stretch sm:items-center justify-between">
            {/* Live Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search items by Name, SKU, or Barcode..."
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Barcode Quick Scan Input */}
              <form onSubmit={handleBarcodeSubmit} className="relative flex-1 sm:w-52">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Barcode + ↵"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-indigo-50/50 border border-indigo-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all text-slate-900 font-mono placeholder-slate-400"
                />
              </form>

              {/* Scan with Camera Button */}
              <button
                id="btn-pos-camera-scan"
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-3 sm:px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                title="Open camera to scan product barcodes or QR codes"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden xs:inline">Scan Barcode</span>
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-24 lg:pb-4">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Layers className="w-12 h-12 mb-3 text-slate-300 stroke-[1.5]" />
              <h3 className="font-semibold text-slate-700 text-base">No products found</h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Try searching for a different keyword or category, or add items from inventory.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3">
              {filteredProducts.map((product) => {
                const branchStock = getProductBranchStock(product);
                const isOutOfStock = branchStock <= 0;
                const isLowStock = branchStock > 0 && branchStock <= product.minStockAlert;
                const cartQty = cart.find((i) => i.productId === product.id)?.quantity || 0;

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock}
                    className={`relative text-left p-2.5 sm:p-3.5 rounded-xl border transition-all flex flex-col justify-between group ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-indigo-500 hover:shadow-md active:scale-[0.98]'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1 mb-1 sm:mb-1.5">
                        <span className="text-[9.5px] sm:text-[10px] font-medium tracking-tight text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                          {product.category}
                        </span>

                        {isOutOfStock ? (
                          <span className="text-[9.5px] sm:text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            Out of stock
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[9.5px] sm:text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <AlertCircle className="w-2.5 h-2.5" />
                            {branchStock} left
                          </span>
                        ) : (
                          <span className="text-[9.5px] sm:text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {branchStock} {product.unit}
                          </span>
                        )}
                      </div>

                      {/* Product Name & SKU */}
                      <h4 className="font-semibold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9.5px] sm:text-[10px] font-mono text-slate-400">{product.sku}</span>
                        {product.barcode && (
                          <>
                            <span className="text-[9px] text-slate-300">•</span>
                            <span className="text-[9.5px] sm:text-[10px] font-mono text-indigo-500 truncate max-w-[75px]">{product.barcode}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Price & Quantity in Cart indicator */}
                    <div className="mt-2.5 sm:mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs sm:text-base">
                        {formatCurrency(product.sellingPrice)}
                      </span>

                      {cartQty > 0 ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-indigo-600 text-white font-bold text-[11px] sm:text-xs rounded-full shadow-xs">
                          {cartQty}
                        </span>
                      ) : (
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-100 group-hover:bg-indigo-100 group-hover:text-indigo-800 text-slate-400 flex items-center justify-center transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* FLOATING STICKY CHECKOUT BAR ON MOBILE (When in catalog mode with items in cart) */}
        {cart.length > 0 && mobileTab === 'catalog' && (
          <div className="lg:hidden absolute bottom-2 left-2 right-2 z-30 bg-slate-950/95 text-white backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between animate-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center gap-2.5">
              <div className="relative p-2 bg-indigo-600 rounded-xl text-white">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {totalCartItems}
                </span>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Cart Total ({totalCartItems} items)</div>
                <div className="text-base font-extrabold font-mono text-white leading-tight">
                  {formatCurrency(grandTotal)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileTab('cart')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all"
              >
                Review Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  setCashTendered(grandTotal.toFixed(2));
                  setIsCheckoutOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1 active:scale-95"
              >
                <span>Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* RIGHT / MOBILE CART REGISTER & CHECKOUT PANEL */}
      <div
        className={`w-full lg:w-96 xl:w-[420px] bg-white flex-col border-t lg:border-t-0 shadow-lg z-10 ${
          mobileTab === 'cart' ? 'flex flex-1 h-full' : 'hidden lg:flex'
        }`}
      >
        
        {/* Cart Header */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* On Mobile: Back button to Catalog */}
            <button
              type="button"
              onClick={() => setMobileTab('catalog')}
              className="lg:hidden p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100"
              title="Return to Product Catalog"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Sale Register</h3>
              <p className="text-[11px] text-slate-500">
                {totalCartItems} items in cart
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileTab('catalog')}
              className="lg:hidden text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg"
            >
              + Add More
            </button>
          </div>
        </div>

        {/* Customer Selector */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <User className="w-3 h-3" />
              Customer
            </label>
            <button
              onClick={() => setIsNewCustModalOpen(true)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <PlusCircle className="w-3 h-3" />
              New Customer
            </button>
          </div>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Walk-in Customer (Guest)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''} {c.creditBalance > 0 ? `[Debt: ${formatCurrency(c.creditBalance)}]` : ''}
              </option>
            ))}
          </select>
          {selectedCustomer && selectedCustomer.creditBalance > 0 && (
            <div className="mt-1.5 p-1.5 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-800 flex justify-between">
              <span>Outstanding Debt:</span>
              <span className="font-bold">{formatCurrency(selectedCustomer.creditBalance)}</span>
            </div>
          )}
        </div>

        {/* Cart Line Items List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100 min-h-[160px]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingCart className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
              <p className="text-xs font-medium text-slate-600">Cart is empty</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click any product or scan a barcode to begin checkout
              </p>
              <button
                type="button"
                onClick={() => setMobileTab('catalog')}
                className="mt-3 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl lg:hidden"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-semibold text-slate-900 truncate leading-snug">
                    {item.productName}
                  </h5>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span>{formatCurrency(item.unitPrice)} / {item.unit}</span>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                    className="w-9 sm:w-10 text-center font-semibold text-xs py-0.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden"
                  />
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Total */}
                <div className="text-right min-w-[60px]">
                  <div className="text-xs font-bold text-slate-900">
                    {formatCurrency(item.total)}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-[10px] text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Calculation Breakdown */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 space-y-2 sm:space-y-2.5 text-xs">
          
          {/* Subtotal */}
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
          </div>

          {/* Discount Field */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
            <div className="flex items-center gap-1 text-slate-600">
              <Percent className="w-3 h-3 text-slate-400" />
              <span>Discount</span>
              <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-white text-[10px] ml-1">
                <button
                  onClick={() => setDiscountType('fixed')}
                  className={`px-1.5 py-0.5 rounded-xs ${discountType === 'fixed' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-500'}`}
                >
                  {settings.currencySymbol}
                </button>
                <button
                  onClick={() => setDiscountType('percentage')}
                  className={`px-1.5 py-0.5 rounded-xs ${discountType === 'percentage' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-500'}`}
                >
                  %
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                step="any"
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-16 px-2 py-0.5 text-right font-medium text-xs bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
              {calculatedDiscount > 0 && (
                <span className="text-rose-600 font-semibold text-xs">
                  -{formatCurrency(calculatedDiscount)}
                </span>
              )}
            </div>
          </div>

          {/* Tax Option */}
          {settings.enableTax && (
            <div className="flex items-center justify-between text-slate-600">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyTax}
                  onChange={(e) => setApplyTax(e.target.checked)}
                  className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                />
                <span>{settings.taxName} ({settings.taxRate}%)</span>
              </label>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="pt-2 border-t border-slate-300 flex items-baseline justify-between">
            <span className="font-bold text-slate-900 text-sm">Grand Total</span>
            <span className="font-extrabold text-slate-950 text-xl tracking-tight">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          {/* Checkout Action Button */}
          <button
            onClick={() => {
              setCashTendered(grandTotal.toFixed(2));
              setIsCheckoutOpen(true);
            }}
            disabled={cart.length === 0}
            className={`w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
              cart.length > 0
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Proceed to Payment
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

      </div>

      {/* MODAL: Payment Checkout */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Complete Payment</h3>
                <p className="text-xs text-slate-500">
                  Total Payable: <strong className="text-slate-900">{formatCurrency(grandTotal)}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content (Scrollable on small mobile screens) */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
              
              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-5 h-5 text-indigo-700" />
                    <span className="text-xs">Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                      paymentMethod === 'card'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    <span className="text-xs">Card / POS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('momo')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                      paymentMethod === 'momo'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs">Mobile Money</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                      paymentMethod === 'credit'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <BookOpen className="w-5 h-5 text-amber-700" />
                    <span className="text-xs">Store Credit</span>
                  </button>

                </div>
              </div>

              {/* CASH SPECIFIC: Cash tendered & quick cash chips */}
              {paymentMethod === 'cash' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Cash Received / Tendered</label>
                    <span className="text-xs text-slate-500">Exact: {formatCurrency(grandTotal)}</span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                      {settings.currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 text-lg font-bold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { label: 'Exact', val: grandTotal },
                      { label: `${settings.currencySymbol}10`, val: 10 },
                      { label: `${settings.currencySymbol}20`, val: 20 },
                      { label: `${settings.currencySymbol}50`, val: 50 },
                      { label: `${settings.currencySymbol}100`, val: 100 },
                    ].map((btn, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCashTendered(btn.val.toFixed(2))}
                        className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Dynamic Change Due */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm">
                    <span className="font-medium text-slate-600">Change Due:</span>
                    <span className={`font-bold text-base ${changeDue > 0 ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {formatCurrency(changeDue)}
                    </span>
                  </div>
                </div>
              )}

              {/* STORE CREDIT WARNING */}
              {paymentMethod === 'credit' && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-amber-800">
                    <AlertCircle className="w-4 h-4" />
                    Store Credit / Pay Later Ledger
                  </div>
                  <p>
                    This full amount of <strong className="font-semibold">{formatCurrency(grandTotal)}</strong> will be added to the customer's outstanding debt balance.
                  </p>
                  {!selectedCustomerId && (
                    <p className="text-rose-700 font-semibold pt-1">
                      ⚠️ Please close this modal and choose or create a customer before proceeding.
                    </p>
                  )}
                </div>
              )}

              {/* Optional Sale Note */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Sale Notes / Order Reference (Optional)
                </label>
                <input
                  type="text"
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  placeholder="e.g. Delivery order, customer PO, special request"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={paymentMethod === 'credit' && !selectedCustomerId}
                className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                Finish Sale & Print Receipt
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Inline Quick Customer Registration */}
      {isNewCustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Register New Customer</h3>
              <button
                onClick={() => setIsNewCustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Johnathan Doe"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. +1 555-0199"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  placeholder="e.g. customer@domain.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewCustModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal Trigger */}
      {lastCompletedSale && (
        <ReceiptModal
          sale={lastCompletedSale}
          onClose={() => setLastCompletedSale(null)}
        />
      )}

      {/* Camera Barcode & QR Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        onProductScanned={(p) => addToCart(p)}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};

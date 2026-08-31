import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Product,
  Sale,
  Purchase,
  Supplier,
  Customer,
  Expense,
  StockAdjustment,
  ShopSettings,
  SaleItem,
  PaymentMethod,
  Branch,
  UserAccount,
  UserRole,
  BranchSession
} from '../types';
import {
  initialSettings,
  initialProducts,
  initialSuppliers,
  initialCustomers,
  initialSales,
  initialPurchases,
  initialExpenses,
  initialStockAdjustments,
  initialBranches,
  initialAccounts,
} from '../data/initialData';

interface ShopContextType {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  suppliers: Supplier[];
  customers: Customer[];
  expenses: Expense[];
  stockAdjustments: StockAdjustment[];
  settings: ShopSettings;
  
  // Multi-Branch & Accounts
  branches: Branch[];
  activeBranchId: string;
  activeBranch: Branch;
  setActiveBranchId: (id: string) => void;
  addBranch: (branchData: Omit<Branch, 'id' | 'createdAt' | 'isHeadBranch' | 'active'>) => Branch;
  updateBranch: (id: string, data: Partial<Branch>) => void;
  deleteBranch: (id: string) => boolean;

  accounts: UserAccount[];
  currentUser: UserAccount | null;
  branchSessions: Record<string, BranchSession>;
  login: (username: string, pin: string, chosenBranchId?: string) => { success: boolean; message?: string };
  switchUser: (accountId: string) => void;
  logout: () => void;
  releaseBranchSession: (branchId: string) => void;
  isBranchOccupied: (branchId: string, currentUserId?: string) => { occupied: boolean; session?: BranchSession; isOccupiedBySelf: boolean };
  addAccount: (accountData: Omit<UserAccount, 'id' | 'createdAt'>) => UserAccount;
  updateAccount: (id: string, data: Partial<UserAccount>) => void;
  deleteAccount: (id: string) => boolean;

  // RBAC permissions helpers
  isOwner: boolean;
  isHeadBranch: boolean;
  canManageStock: boolean; // Owner exclusive right
  canDeleteStock: boolean; // Owner exclusive right
  
  // Multi-branch stock helper
  getProductBranchStock: (product: Product, branchId?: string) => number;
  transferStock: (productId: string, fromBranchId: string, toBranchId: string, quantity: number, notes?: string) => boolean;

  // Product actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, initialBranchStock?: Record<string, number>) => Product;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => boolean;
  
  // Sales actions
  recordSale: (saleData: {
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    items: SaleItem[];
    subtotal: number;
    discount: number;
    taxRate: number;
    taxAmount: number;
    grandTotal: number;
    paymentMethod: PaymentMethod;
    cashTendered?: number;
    changeDue?: number;
    amountPaid: number;
    notes?: string;
  }) => Sale;
  refundSale: (saleId: string, reason: string) => void;
  
  // Purchases actions
  recordPurchase: (purchaseData: {
    supplierId: string;
    supplierName: string;
    items: {
      productId: string;
      productName: string;
      sku: string;
      unitCost: number;
      quantity: number;
      total: number;
      unit: string;
    }[];
    totalAmount: number;
    amountPaid: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    updateCostPrices?: boolean;
  }) => Purchase;
  
  // Stock adjustments
  adjustStock: (
    productId: string,
    newQuantity: number,
    reason: StockAdjustment['reason'],
    notes?: string,
    adjustedBy?: string,
    targetBranchId?: string
  ) => void;
  
  // Supplier & Customer actions
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'balanceOwed'>) => Supplier;
  updateSupplier: (id: string, data: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  recordSupplierPayment: (supplierId: string, amount: number, paymentMethod: PaymentMethod, note?: string) => void;

  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'creditBalance' | 'totalSpent' | 'totalPurchasesCount'>) => Customer;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  recordCustomerPayment: (customerId: string, amount: number, paymentMethod: PaymentMethod, note?: string) => void;

  // Expense actions
  addExpense: (expense: Omit<Expense, 'id'>) => Expense;
  deleteExpense: (id: string) => void;

  // Settings & System
  updateSettings: (newSettings: Partial<ShopSettings>) => void;
  resetToSampleData: () => void;
  exportJSONBackup: () => void;
  importJSONBackup: (jsonData: string) => boolean;
  exportSalesCSV: () => void;
  exportStockCSV: () => void;
  exportPurchasesCSV: () => void;
  
  // Calculated helpers
  lowStockProducts: Product[];
  totalStockCostValue: number;
  totalStockRetailValue: number;
  totalCustomerDebt: number;
  totalSupplierDebt: number;
  formatCurrency: (amount: number) => string;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'shop_pos_products_v2',
  SALES: 'shop_pos_sales_v2',
  PURCHASES: 'shop_pos_purchases_v2',
  SUPPLIERS: 'shop_pos_suppliers_v2',
  CUSTOMERS: 'shop_pos_customers_v2',
  EXPENSES: 'shop_pos_expenses_v2',
  ADJUSTMENTS: 'shop_pos_adjustments_v2',
  SETTINGS: 'shop_pos_settings_v2',
  BRANCHES: 'shop_pos_branches_v2',
  ACCOUNTS: 'shop_pos_accounts_v2',
  CURRENT_USER: 'shop_pos_user_v2',
  ACTIVE_BRANCH: 'shop_pos_active_branch_v2',
  BRANCH_SESSIONS: 'shop_pos_branch_sessions_v2',
};

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BRANCHES);
    return saved ? JSON.parse(saved) : initialBranches;
  });

  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    return saved ? JSON.parse(saved) : initialAccounts;
  });

  const [branchSessions, setBranchSessions] = useState<Record<string, BranchSession>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BRANCH_SESSIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null; // Require explicit login & branch choice at start
  });

  const [activeBranchId, setActiveBranchIdState] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_BRANCH);
    if (saved && branches.some((b) => b.id === saved)) return saved;
    return currentUser?.branchId || initialBranches[0].id;
  });

  const [settings, setSettings] = useState<ShopSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : initialSettings;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : initialProducts;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SALES);
    return saved ? JSON.parse(saved) : initialSales;
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PURCHASES);
    return saved ? JSON.parse(saved) : initialPurchases;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    return saved ? JSON.parse(saved) : initialSuppliers;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return saved ? JSON.parse(saved) : initialCustomers;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return saved ? JSON.parse(saved) : initialExpenses;
  });

  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ADJUSTMENTS);
    return saved ? JSON.parse(saved) : initialStockAdjustments;
  });

  // LocalStorage sync
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BRANCH_SESSIONS, JSON.stringify(branchSessions));
  }, [branchSessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BRANCH, activeBranchId);
  }, [activeBranchId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify(stockAdjustments));
  }, [stockAdjustments]);

  // Derived Active Branch
  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0] || initialBranches[0];

  // RBAC Permissions
  const isOwner = currentUser?.role === 'owner';
  const isHeadBranch = activeBranch?.isHeadBranch === true;
  const canManageStock = isOwner; // Owner at head branch has exclusive right
  const canDeleteStock = isOwner;

  // Active Branch Switcher (restricted if shopkeeper)
  const setActiveBranchId = (id: string) => {
    const targetBranch = branches.find((b) => b.id === id);
    if (!targetBranch) return;

    if (!isOwner && currentUser && currentUser.branchId !== id) {
      alert(`As a shopkeeper, you are restricted to operating in ${currentUser.branchName}.`);
      return;
    }
    setActiveBranchIdState(id);
  };

  // Multi-branch stock calculation helper
  const getProductBranchStock = (product: Product, branchId?: string): number => {
    const targetId = branchId || activeBranchId;
    if (product.branchStock && product.branchStock[targetId] !== undefined) {
      return product.branchStock[targetId];
    }
    // Fallback if branchStock not populated: for head branch return product.stock, for others 0
    return targetId === 'branch-head' ? product.stock : 0;
  };

  // Branch Management (Owner only)
  const addBranch = (branchData: Omit<Branch, 'id' | 'createdAt' | 'isHeadBranch' | 'active'>): Branch => {
    const newBranch: Branch = {
      ...branchData,
      id: `branch-${Date.now()}`,
      isHeadBranch: false,
      active: true,
      createdAt: new Date().toISOString(),
    };
    setBranches((prev) => [...prev, newBranch]);

    // Initialize branch stock for existing products
    setProducts((prevProds) =>
      prevProds.map((p) => ({
        ...p,
        branchStock: {
          ...(p.branchStock || {}),
          [newBranch.id]: 0,
        },
      }))
    );

    return newBranch;
  };

  const updateBranch = (id: string, data: Partial<Branch>) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...data } : b))
    );
  };

  const deleteBranch = (id: string): boolean => {
    const target = branches.find((b) => b.id === id);
    if (!target || target.isHeadBranch) {
      return false; // Head branch cannot be deleted
    }
    setBranches((prev) => prev.filter((b) => b.id !== id));
    if (activeBranchId === id) {
      setActiveBranchIdState(initialBranches[0].id);
    }
    return true;
  };

  // User Accounts & Authentication with Branch Claim & Occupancy Management
  const isBranchOccupied = (branchId: string, currentUserId?: string) => {
    const session = branchSessions[branchId];
    if (!session) {
      return { occupied: false, isOccupiedBySelf: false };
    }
    const checkUserId = currentUserId || currentUser?.id;
    const isOccupiedBySelf = checkUserId === session.userId;
    return {
      occupied: true,
      session,
      isOccupiedBySelf,
    };
  };

  const login = (
    username: string,
    pin: string,
    chosenBranchId?: string
  ): { success: boolean; message?: string } => {
    const acc = accounts.find(
      (a) => a.username.toLowerCase() === username.toLowerCase().trim() && a.pin === pin.trim()
    );
    if (!acc) {
      return { success: false, message: 'Invalid Username or Security PIN.' };
    }

    const targetBranchId = chosenBranchId || acc.branchId || branches[0]?.id || 'branch-head';
    const targetBranch = branches.find((b) => b.id === targetBranchId);
    if (!targetBranch) {
      return { success: false, message: 'Selected branch does not exist.' };
    }

    // Update branch sessions for live status awareness
    const updatedSessions = { ...branchSessions };
    Object.keys(updatedSessions).forEach((bId) => {
      if (updatedSessions[bId]?.userId === acc.id) {
        delete updatedSessions[bId];
      }
    });

    // Register this user's active branch session
    updatedSessions[targetBranchId] = {
      branchId: targetBranchId,
      branchName: targetBranch.name,
      userId: acc.id,
      userName: acc.name,
      userRole: acc.role,
      claimedAt: new Date().toISOString(),
    };
    setBranchSessions(updatedSessions);

    const updatedUser: UserAccount = {
      ...acc,
      branchId: targetBranchId,
      branchName: targetBranch.name,
    };
    setCurrentUser(updatedUser);
    setActiveBranchIdState(targetBranchId);
    return { success: true };
  };

  const switchUser = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (acc) {
      login(acc.username, acc.pin, acc.branchId);
    }
  };

  const releaseBranchSession = (branchId: string) => {
    setBranchSessions((prev) => {
      const next = { ...prev };
      delete next[branchId];
      return next;
    });
    if (currentUser?.branchId === branchId) {
      setCurrentUser(null);
    }
  };

  const logout = () => {
    if (currentUser) {
      setBranchSessions((prev) => {
        const next = { ...prev };
        delete next[currentUser.branchId];
        return next;
      });
    }
    setCurrentUser(null);
  };

  const addAccount = (accountData: Omit<UserAccount, 'id' | 'createdAt'>): UserAccount => {
    const newAcc: UserAccount = {
      ...accountData,
      id: `acc-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAccounts((prev) => [...prev, newAcc]);
    return newAcc;
  };

  const updateAccount = (id: string, data: Partial<UserAccount>) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...data } : a))
    );
    if (currentUser?.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...data } : null));
    }
  };

  const deleteAccount = (id: string): boolean => {
    if (accounts.length <= 1) return false;
    const target = accounts.find((a) => a.id === id);
    if (target?.role === 'owner' && accounts.filter((a) => a.role === 'owner').length <= 1) {
      return false; // Preserve at least one owner
    }
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    return true;
  };

  // Inter-branch Stock Transfer (Owner only)
  const transferStock = (
    productId: string,
    fromBranchId: string,
    toBranchId: string,
    quantity: number,
    notes?: string
  ): boolean => {
    const product = products.find((p) => p.id === productId);
    if (!product || quantity <= 0) return false;

    const sourceStock = getProductBranchStock(product, fromBranchId);
    if (sourceStock < quantity) {
      alert(`Insufficient stock at source branch. Available: ${sourceStock}`);
      return false;
    }

    const fromBranch = branches.find((b) => b.id === fromBranchId);
    const toBranch = branches.find((b) => b.id === toBranchId);

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const currentBranchStock = { ...(p.branchStock || {}) };
        const newFromStock = Math.max(0, (currentBranchStock[fromBranchId] || 0) - quantity);
        const newToStock = (currentBranchStock[toBranchId] || 0) + quantity;

        currentBranchStock[fromBranchId] = newFromStock;
        currentBranchStock[toBranchId] = newToStock;

        return {
          ...p,
          branchStock: currentBranchStock,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    // Record Stock Adjustment Log
    const newAdj: StockAdjustment = {
      id: `adj-${Date.now()}`,
      productId,
      productName: product.name,
      sku: product.sku,
      branchId: toBranchId,
      branchName: `${fromBranch?.name || 'Branch'} -> ${toBranch?.name || 'Branch'}`,
      previousStock: sourceStock,
      newStock: sourceStock - quantity,
      difference: -quantity,
      reason: 'transfer',
      notes: notes || `Inter-branch stock dispatch of ${quantity} units from ${fromBranch?.name} to ${toBranch?.name}.`,
      date: new Date().toISOString(),
      adjustedBy: currentUser?.name || 'Owner',
    };

    setStockAdjustments((prev) => [newAdj, ...prev]);
    return true;
  };

  // Currency Formatter
  const formatCurrency = (amount: number): string => {
    const symbol = settings.currencySymbol || '$';
    return `${symbol}${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Product Actions (Owner Exclusive)
  const addProduct = (
    prodData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
    initialBranchStock?: Record<string, number>
  ): Product => {
    if (!canManageStock) {
      alert('Exclusive Permission: Only the store Owner at Head Branch can add new inventory.');
      throw new Error('Unauthorized');
    }

    const defaultBranchStock: Record<string, number> = {};
    branches.forEach((b) => {
      defaultBranchStock[b.id] = initialBranchStock?.[b.id] ?? (b.isHeadBranch ? prodData.stock : 0);
    });

    const totalCalculatedStock = Object.values(defaultBranchStock).reduce((a, b) => a + b, 0);

    const newProduct: Product = {
      ...prodData,
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      stock: totalCalculatedStock || prodData.stock,
      branchStock: defaultBranchStock,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = (id: string, updatedFields: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updatedFields, updatedAt: new Date().toISOString() };
        if (updated.branchStock) {
          updated.stock = Object.values(updated.branchStock).reduce((a: number, b: number) => a + (Number(b) || 0), 0);
        }
        return updated;
      })
    );
  };

  const deleteProduct = (id: string): boolean => {
    if (!canDeleteStock) {
      alert('Exclusive Permission: Only the store Owner can delete products from the database.');
      return false;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    return true;
  };

  // Record Sale & Decrement Branch Stock
  const recordSale = (saleData: {
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    items: SaleItem[];
    subtotal: number;
    discount: number;
    taxRate: number;
    taxAmount: number;
    grandTotal: number;
    paymentMethod: PaymentMethod;
    cashTendered?: number;
    changeDue?: number;
    amountPaid: number;
    notes?: string;
  }): Sale => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const receiptNo = `REC-${dateStr}-${randNum}`;

    // Calculate total cost & profit
    const costTotal = saleData.items.reduce((acc, item) => acc + item.costPrice * item.quantity, 0);
    const profit = Math.max(0, saleData.grandTotal - saleData.taxAmount - costTotal);
    const balanceDue = Math.max(0, saleData.grandTotal - saleData.amountPaid);

    let status: Sale['status'] = 'completed';
    if (saleData.paymentMethod === 'credit' || balanceDue > 0) {
      status = saleData.amountPaid > 0 ? 'credit_partial' : 'credit_unpaid';
    }

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      receiptNo,
      branchId: activeBranchId,
      branchName: activeBranch.name,
      cashierId: currentUser?.id,
      cashierName: currentUser?.name || 'Cashier',
      customerId: saleData.customerId,
      customerName: saleData.customerName || 'Walk-in Customer',
      customerPhone: saleData.customerPhone,
      items: saleData.items,
      subtotal: saleData.subtotal,
      discount: saleData.discount,
      taxRate: saleData.taxRate,
      taxAmount: saleData.taxAmount,
      grandTotal: saleData.grandTotal,
      costTotal,
      profit,
      paymentMethod: saleData.paymentMethod,
      cashTendered: saleData.cashTendered,
      changeDue: saleData.changeDue,
      amountPaid: saleData.amountPaid,
      balanceDue,
      status,
      notes: saleData.notes,
      date: now.toISOString(),
    };

    // 1. Decrement Stock from current branch AND total stock
    setProducts((prevProducts) =>
      prevProducts.map((product) => {
        const soldItem = saleData.items.find((item) => item.productId === product.id);
        if (soldItem) {
          const currentBranchStockMap = { ...(product.branchStock || {}) };
          const prevBranchQty = currentBranchStockMap[activeBranchId] ?? product.stock;
          const newBranchQty = Math.max(0, prevBranchQty - soldItem.quantity);
          currentBranchStockMap[activeBranchId] = newBranchQty;

          const newTotalStock = Math.max(0, product.stock - soldItem.quantity);

          return {
            ...product,
            stock: newTotalStock,
            branchStock: currentBranchStockMap,
            updatedAt: new Date().toISOString(),
          };
        }
        return product;
      })
    );

    // 2. Update Customer record if registered
    if (saleData.customerId) {
      setCustomers((prevCustomers) =>
        prevCustomers.map((cust) => {
          if (cust.id === saleData.customerId) {
            return {
              ...cust,
              totalSpent: cust.totalSpent + saleData.amountPaid,
              creditBalance: cust.creditBalance + balanceDue,
              totalPurchasesCount: cust.totalPurchasesCount + 1,
            };
          }
          return cust;
        })
      );
    }

    // 3. Save Sale
    setSales((prev) => [newSale, ...prev]);
    return newSale;
  };

  // Refund Sale & Restock to Branch
  const refundSale = (saleId: string, reason: string) => {
    const saleToRefund = sales.find((s) => s.id === saleId);
    if (!saleToRefund || saleToRefund.status === 'refunded') return;

    const refundBranchId = saleToRefund.branchId || activeBranchId;

    // Restore stock
    setProducts((prevProducts) =>
      prevProducts.map((product) => {
        const item = saleToRefund.items.find((i) => i.productId === product.id);
        if (item) {
          const currentBranchStockMap = { ...(product.branchStock || {}) };
          const prevBranchQty = currentBranchStockMap[refundBranchId] ?? product.stock;
          currentBranchStockMap[refundBranchId] = prevBranchQty + item.quantity;

          return {
            ...product,
            stock: product.stock + item.quantity,
            branchStock: currentBranchStockMap,
            updatedAt: new Date().toISOString(),
          };
        }
        return product;
      })
    );

    // If customer had credit, reduce balance
    if (saleToRefund.customerId && saleToRefund.balanceDue > 0) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === saleToRefund.customerId
            ? { ...c, creditBalance: Math.max(0, c.creditBalance - saleToRefund.balanceDue) }
            : c
        )
      );
    }

    // Mark sale as refunded
    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              status: 'refunded',
              notes: s.notes ? `${s.notes} [Refunded: ${reason}]` : `[Refunded: ${reason}]`,
            }
          : s
      )
    );
  };

  // Record Purchases & Increment Stock
  const recordPurchase = (purchaseData: {
    supplierId: string;
    supplierName: string;
    items: {
      productId: string;
      productName: string;
      sku: string;
      unitCost: number;
      quantity: number;
      total: number;
      unit: string;
    }[];
    totalAmount: number;
    amountPaid: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    updateCostPrices?: boolean;
  }): Purchase => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(100 + Math.random() * 900);
    const poNumber = `PO-${dateStr}-${randNum}`;
    const balanceDue = Math.max(0, purchaseData.totalAmount - purchaseData.amountPaid);
    const paymentStatus = balanceDue <= 0 ? 'paid' : purchaseData.amountPaid > 0 ? 'partial' : 'unpaid';

    const newPurchase: Purchase = {
      id: `po-${Date.now()}`,
      poNumber,
      branchId: activeBranchId,
      branchName: activeBranch.name,
      supplierId: purchaseData.supplierId,
      supplierName: purchaseData.supplierName,
      items: purchaseData.items,
      totalAmount: purchaseData.totalAmount,
      amountPaid: purchaseData.amountPaid,
      balanceDue,
      paymentStatus,
      paymentMethod: purchaseData.paymentMethod,
      date: now.toISOString(),
      notes: purchaseData.notes,
      received: true,
    };

    // 1. Increment Stock & update branch stock
    setProducts((prevProducts) =>
      prevProducts.map((product) => {
        const item = purchaseData.items.find((pItem) => pItem.productId === product.id);
        if (item) {
          const currentBranchStockMap = { ...(product.branchStock || {}) };
          const prevBranchQty = currentBranchStockMap[activeBranchId] ?? product.stock;
          currentBranchStockMap[activeBranchId] = prevBranchQty + item.quantity;

          return {
            ...product,
            stock: product.stock + item.quantity,
            branchStock: currentBranchStockMap,
            costPrice: purchaseData.updateCostPrices ? item.unitCost : product.costPrice,
            updatedAt: new Date().toISOString(),
          };
        }
        return product;
      })
    );

    // 2. Update Supplier balance owed if unpaid / partial
    if (purchaseData.supplierId && balanceDue > 0) {
      setSuppliers((prevSuppliers) =>
        prevSuppliers.map((sup) =>
          sup.id === purchaseData.supplierId
            ? { ...sup, balanceOwed: sup.balanceOwed + balanceDue }
            : sup
        )
      );
    }

    setPurchases((prev) => [newPurchase, ...prev]);
    return newPurchase;
  };

  // Stock Adjustments
  const adjustStock = (
    productId: string,
    newQuantity: number,
    reason: StockAdjustment['reason'],
    notes?: string,
    adjustedBy = currentUser?.name || 'Owner',
    targetBranchId = activeBranchId
  ) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const previousBranchStock = getProductBranchStock(product, targetBranchId);
    const difference = newQuantity - previousBranchStock;
    const targetBranch = branches.find((b) => b.id === targetBranchId) || activeBranch;

    const newAdj: StockAdjustment = {
      id: `adj-${Date.now()}`,
      productId,
      productName: product.name,
      sku: product.sku,
      branchId: targetBranchId,
      branchName: targetBranch.name,
      previousStock: previousBranchStock,
      newStock: newQuantity,
      difference,
      reason,
      notes,
      date: new Date().toISOString(),
      adjustedBy,
    };

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const currentBranchStockMap = { ...(p.branchStock || {}) };
        currentBranchStockMap[targetBranchId] = newQuantity;
        const newTotal = Object.values(currentBranchStockMap).reduce((a: number, b: number) => a + (Number(b) || 0), 0);

        return {
          ...p,
          stock: newTotal,
          branchStock: currentBranchStockMap,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    setStockAdjustments((prev) => [newAdj, ...prev]);
  };

  // Supplier handlers
  const addSupplier = (supData: Omit<Supplier, 'id' | 'createdAt' | 'balanceOwed'>): Supplier => {
    const newSup: Supplier = {
      ...supData,
      id: `sup-${Date.now()}`,
      balanceOwed: 0,
      createdAt: new Date().toISOString(),
    };
    setSuppliers((prev) => [newSup, ...prev]);
    return newSup;
  };

  const updateSupplier = (id: string, data: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
  };

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };

  const recordSupplierPayment = (supplierId: string, amount: number, paymentMethod: PaymentMethod, note?: string) => {
    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === supplierId
          ? { ...s, balanceOwed: Math.max(0, s.balanceOwed - amount) }
          : s
      )
    );

    addExpense({
      title: `Supplier Debt Settle: ${suppliers.find((s) => s.id === supplierId)?.name || 'Supplier'}`,
      category: 'other',
      amount,
      date: new Date().toISOString(),
      paymentMethod,
      notes: note || 'Supplier invoice partial/full settlement',
    });
  };

  // Customer Handlers
  const addCustomer = (custData: Omit<Customer, 'id' | 'createdAt' | 'creditBalance' | 'totalSpent' | 'totalPurchasesCount'>): Customer => {
    const newCust: Customer = {
      ...custData,
      id: `cust-${Date.now()}`,
      creditBalance: 0,
      totalSpent: 0,
      totalPurchasesCount: 0,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCust, ...prev]);
    return newCust;
  };

  const updateCustomer = (id: string, data: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  const recordCustomerPayment = (customerId: string, amount: number, paymentMethod: PaymentMethod, note?: string) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
              ...c,
              creditBalance: Math.max(0, c.creditBalance - amount),
              totalSpent: c.totalSpent + amount,
            }
          : c
      )
    );

    let remainingAmount = amount;
    setSales((prevSales) =>
      prevSales.map((sale) => {
        if (sale.customerId === customerId && sale.balanceDue > 0 && remainingAmount > 0) {
          const deduction = Math.min(sale.balanceDue, remainingAmount);
          remainingAmount -= deduction;
          const newBalance = sale.balanceDue - deduction;
          const newPaid = sale.amountPaid + deduction;
          const newStatus = newBalance <= 0 ? 'completed' : 'credit_partial';
          return {
            ...sale,
            amountPaid: newPaid,
            balanceDue: newBalance,
            status: newStatus,
            notes: sale.notes ? `${sale.notes} [Payment recvd: ${formatCurrency(deduction)}]` : `[Payment recvd: ${formatCurrency(deduction)}]`,
          };
        }
        return sale;
      })
    );
  };

  // Expenses
  const addExpense = (expenseData: Omit<Expense, 'id'>): Expense => {
    const newExp: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      branchId: activeBranchId,
      branchName: activeBranch?.name,
    };
    setExpenses((prev) => [newExp, ...prev]);
    return newExp;
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Settings
  const updateSettings = (newSettings: Partial<ShopSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Reset to initial sample data
  const resetToSampleData = () => {
    setSettings(initialSettings);
    setBranches(initialBranches);
    setAccounts(initialAccounts);
    setCurrentUser(initialAccounts[0]);
    setActiveBranchIdState(initialBranches[0].id);
    setProducts(initialProducts);
    setSales(initialSales);
    setPurchases(initialPurchases);
    setSuppliers(initialSuppliers);
    setCustomers(initialCustomers);
    setExpenses(initialExpenses);
    setStockAdjustments(initialStockAdjustments);
  };

  // Backup & Export Helpers
  const exportJSONBackup = () => {
    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      settings,
      branches,
      accounts,
      products,
      sales,
      purchases,
      suppliers,
      customers,
      expenses,
      stockAdjustments,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shop-multibranch-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSONBackup = (jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData);
      if (data.products && data.settings) {
        if (data.settings) setSettings(data.settings);
        if (data.branches) setBranches(data.branches);
        if (data.accounts) setAccounts(data.accounts);
        if (data.products) setProducts(data.products);
        if (data.sales) setSales(data.sales);
        if (data.purchases) setPurchases(data.purchases);
        if (data.suppliers) setSuppliers(data.suppliers);
        if (data.customers) setCustomers(data.customers);
        if (data.expenses) setExpenses(data.expenses);
        if (data.stockAdjustments) setStockAdjustments(data.stockAdjustments);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const exportSalesCSV = () => {
    const headers = ['Receipt No', 'Date', 'Branch', 'Cashier', 'Customer', 'Items Count', 'Subtotal', 'Discount', 'Tax', 'Grand Total', 'Payment Method', 'Status', 'Profit'];
    const rows = sales.map((s) => [
      `"${s.receiptNo}"`,
      `"${new Date(s.date).toLocaleString()}"`,
      `"${s.branchName || ''}"`,
      `"${s.cashierName || ''}"`,
      `"${s.customerName}"`,
      s.items.reduce((acc, i) => acc + i.quantity, 0),
      s.subtotal.toFixed(2),
      s.discount.toFixed(2),
      s.taxAmount.toFixed(2),
      s.grandTotal.toFixed(2),
      `"${s.paymentMethod}"`,
      `"${s.status}"`,
      s.profit.toFixed(2),
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV(csvContent, `sales-report-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportStockCSV = () => {
    const branchHeaders = branches.map((b) => `Stock (${b.name})`).join(',');
    const headers = ['Product Name', 'SKU', 'Barcode', 'Category', 'Unit', 'Cost Price', 'Selling Price', 'Margin %', 'Total Stock', branchHeaders, 'Min Alert Level', 'Total Cost Value', 'Total Retail Value'];
    const rows = products.map((p) => {
      const margin = p.sellingPrice > 0 ? (((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100).toFixed(1) : '0';
      const branchCols = branches.map((b) => p.branchStock?.[b.id] ?? 0).join(',');
      return [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.sku}"`,
        `"${p.barcode}"`,
        `"${p.category}"`,
        `"${p.unit}"`,
        p.costPrice.toFixed(2),
        p.sellingPrice.toFixed(2),
        `"${margin}%"`,
        p.stock,
        branchCols,
        p.minStockAlert,
        (p.costPrice * p.stock).toFixed(2),
        (p.sellingPrice * p.stock).toFixed(2),
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadCSV(csvContent, `multibranch-inventory-stock-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportPurchasesCSV = () => {
    const headers = ['PO Number', 'Date', 'Branch', 'Supplier', 'Items Count', 'Total Amount', 'Amount Paid', 'Balance Due', 'Payment Status', 'Payment Method'];
    const rows = purchases.map((p) => [
      `"${p.poNumber}"`,
      `"${new Date(p.date).toLocaleString()}"`,
      `"${p.branchName || ''}"`,
      `"${p.supplierName}"`,
      p.items.reduce((acc, i) => acc + i.quantity, 0),
      p.totalAmount.toFixed(2),
      p.amountPaid.toFixed(2),
      p.balanceDue.toFixed(2),
      `"${p.paymentStatus}"`,
      `"${p.paymentMethod}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV(csvContent, `purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Computed metrics
  const lowStockProducts = products.filter((p) => getProductBranchStock(p) <= p.minStockAlert);
  const totalStockCostValue = products.reduce((acc, p) => acc + p.costPrice * getProductBranchStock(p), 0);
  const totalStockRetailValue = products.reduce((acc, p) => acc + p.sellingPrice * getProductBranchStock(p), 0);
  const totalCustomerDebt = customers.reduce((acc, c) => acc + (c.creditBalance || 0), 0);
  const totalSupplierDebt = suppliers.reduce((acc, s) => acc + (s.balanceOwed || 0), 0);

  return (
    <ShopContext.Provider
      value={{
        products,
        sales,
        purchases,
        suppliers,
        customers,
        expenses,
        stockAdjustments,
        settings,
        branches,
        activeBranchId,
        activeBranch,
        setActiveBranchId,
        addBranch,
        updateBranch,
        deleteBranch,
        accounts,
        currentUser,
        branchSessions,
        login,
        switchUser,
        logout,
        releaseBranchSession,
        isBranchOccupied,
        addAccount,
        updateAccount,
        deleteAccount,
        isOwner,
        isHeadBranch,
        canManageStock,
        canDeleteStock,
        getProductBranchStock,
        transferStock,
        addProduct,
        updateProduct,
        deleteProduct,
        recordSale,
        refundSale,
        recordPurchase,
        adjustStock,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        recordSupplierPayment,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        recordCustomerPayment,
        addExpense,
        deleteExpense,
        updateSettings,
        resetToSampleData,
        exportJSONBackup,
        importJSONBackup,
        exportSalesCSV,
        exportStockCSV,
        exportPurchasesCSV,
        lowStockProducts,
        totalStockCostValue,
        totalStockRetailValue,
        totalCustomerDebt,
        totalSupplierDebt,
        formatCurrency,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};


import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  BranchSession,
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
import {
  COLLECTIONS,
  subscribeToCollection,
  subscribeToDoc,
  saveDocument,
  updateDocument,
  deleteDocument,
  seedInitialFirestoreData,
} from '../lib/firestoreSync';

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
  canManageStock: boolean;
  canDeleteStock: boolean;
  
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
  
  // Real-time Cloud Sync Status
  isCloudSynced: boolean;

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
  PRODUCTS: 'shop_pos_products_v3',
  SALES: 'shop_pos_sales_v3',
  PURCHASES: 'shop_pos_purchases_v3',
  SUPPLIERS: 'shop_pos_suppliers_v3',
  CUSTOMERS: 'shop_pos_customers_v3',
  EXPENSES: 'shop_pos_expenses_v3',
  ADJUSTMENTS: 'shop_pos_adjustments_v3',
  SETTINGS: 'shop_pos_settings_v3',
  BRANCHES: 'shop_pos_branches_v3',
  ACCOUNTS: 'shop_pos_accounts_v3',
  CURRENT_USER: 'shop_pos_user_v3',
  ACTIVE_BRANCH: 'shop_pos_active_branch_v3',
  BRANCH_SESSIONS: 'shop_pos_branch_sessions_v3',
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
    return null;
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

  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);
  const initialBootstrapRef = useRef<boolean>(false);

  // --- FIREBASE REAL-TIME LISTENERS ---
  useEffect(() => {
    // 1. Products Real-time Listener
    const unsubProducts = subscribeToCollection<Product>(
      COLLECTIONS.PRODUCTS,
      (remoteProducts) => {
        if (remoteProducts.length > 0) {
          // Sort by name or creation
          setProducts(remoteProducts);
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(remoteProducts));
        } else if (!initialBootstrapRef.current) {
          // If remote empty, bootstrap initial data
          initialBootstrapRef.current = true;
          seedInitialFirestoreData({
            branches,
            accounts,
            settings,
            products,
            suppliers,
            customers,
            sales,
            purchases,
            expenses,
            stockAdjustments,
          });
        }
      }
    );

    // 2. Sales Real-time Listener
    const unsubSales = subscribeToCollection<Sale>(
      COLLECTIONS.SALES,
      (remoteSales) => {
        if (remoteSales.length > 0) {
          const sorted = [...remoteSales].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setSales(sorted);
          localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sorted));
        }
      }
    );

    // 3. Purchases Real-time Listener
    const unsubPurchases = subscribeToCollection<Purchase>(
      COLLECTIONS.PURCHASES,
      (remotePurchases) => {
        if (remotePurchases.length > 0) {
          const sorted = [...remotePurchases].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setPurchases(sorted);
          localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(sorted));
        }
      }
    );

    // 4. Customers Real-time Listener
    const unsubCustomers = subscribeToCollection<Customer>(
      COLLECTIONS.CUSTOMERS,
      (remoteCustomers) => {
        if (remoteCustomers.length > 0) {
          setCustomers(remoteCustomers);
          localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(remoteCustomers));
        }
      }
    );

    // 5. Suppliers Real-time Listener
    const unsubSuppliers = subscribeToCollection<Supplier>(
      COLLECTIONS.SUPPLIERS,
      (remoteSuppliers) => {
        if (remoteSuppliers.length > 0) {
          setSuppliers(remoteSuppliers);
          localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(remoteSuppliers));
        }
      }
    );

    // 6. Expenses Real-time Listener
    const unsubExpenses = subscribeToCollection<Expense>(
      COLLECTIONS.EXPENSES,
      (remoteExpenses) => {
        if (remoteExpenses.length > 0) {
          const sorted = [...remoteExpenses].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setExpenses(sorted);
          localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(sorted));
        }
      }
    );

    // 7. Stock Adjustments Real-time Listener
    const unsubAdjustments = subscribeToCollection<StockAdjustment>(
      COLLECTIONS.ADJUSTMENTS,
      (remoteAdj) => {
        if (remoteAdj.length > 0) {
          const sorted = [...remoteAdj].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setStockAdjustments(sorted);
          localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify(sorted));
        }
      }
    );

    // 8. Branches Real-time Listener
    const unsubBranches = subscribeToCollection<Branch>(
      COLLECTIONS.BRANCHES,
      (remoteBranches) => {
        if (remoteBranches.length > 0) {
          setBranches(remoteBranches);
          localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(remoteBranches));
        }
      }
    );

    // 9. Accounts Real-time Listener
    const unsubAccounts = subscribeToCollection<UserAccount>(
      COLLECTIONS.ACCOUNTS,
      (remoteAccounts) => {
        if (remoteAccounts.length > 0) {
          setAccounts(remoteAccounts);
          localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(remoteAccounts));
        }
      }
    );

    // 10. Store Settings & Sessions Real-time Listener
    const unsubSettings = subscribeToDoc<ShopSettings>(
      COLLECTIONS.STORE_META,
      'global_settings',
      (remoteSettings) => {
        if (remoteSettings) {
          setSettings(remoteSettings);
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(remoteSettings));
        }
      }
    );

    const unsubSessions = subscribeToDoc<{ sessions: Record<string, BranchSession> }>(
      COLLECTIONS.STORE_META,
      'active_sessions',
      (docData) => {
        if (docData && docData.sessions) {
          setBranchSessions(docData.sessions);
          localStorage.setItem(STORAGE_KEYS.BRANCH_SESSIONS, JSON.stringify(docData.sessions));
        }
      }
    );

    return () => {
      unsubProducts();
      unsubSales();
      unsubPurchases();
      unsubCustomers();
      unsubSuppliers();
      unsubExpenses();
      unsubAdjustments();
      unsubBranches();
      unsubAccounts();
      unsubSettings();
      unsubSessions();
    };
  }, []);

  // Offline / Fallback LocalStorage sync for user session
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BRANCH, activeBranchId);
  }, [activeBranchId]);

  // Derived Active Branch
  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0] || initialBranches[0];

  // RBAC Permissions
  const isOwner = currentUser?.role === 'owner';
  const isHeadBranch = activeBranch?.isHeadBranch === true;
  const canManageStock = isOwner;
  const canDeleteStock = isOwner;

  // Active Branch Switcher
  const setActiveBranchId = (id: string) => {
    const targetBranch = branches.find((b) => b.id === id);
    if (!targetBranch) return;

    if (!isOwner && currentUser && currentUser.branchId !== id) {
      alert(`As a shopkeeper, you are assigned to ${currentUser.branchName}.`);
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
    saveDocument(COLLECTIONS.BRANCHES, newBranch.id, newBranch);

    // Initialize branch stock for existing products in Firestore
    setProducts((prevProds) => {
      const updated = prevProds.map((p) => {
        const branchStock = { ...(p.branchStock || {}), [newBranch.id]: 0 };
        const newP = { ...p, branchStock };
        saveDocument(COLLECTIONS.PRODUCTS, p.id, newP);
        return newP;
      });
      return updated;
    });

    return newBranch;
  };

  const updateBranch = (id: string, data: Partial<Branch>) => {
    setBranches((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const updated = { ...b, ...data };
          saveDocument(COLLECTIONS.BRANCHES, id, updated);
          return updated;
        }
        return b;
      })
    );
  };

  const deleteBranch = (id: string): boolean => {
    const target = branches.find((b) => b.id === id);
    if (!target || target.isHeadBranch) return false;

    setBranches((prev) => prev.filter((b) => b.id !== id));
    deleteDocument(COLLECTIONS.BRANCHES, id);

    if (activeBranchId === id) {
      const head = branches.find((b) => b.isHeadBranch) || branches[0];
      setActiveBranchIdState(head.id);
    }
    return true;
  };

  // User Accounts & Authentication
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

    // Update branch sessions for live cashier status awareness in Firestore
    const updatedSessions = { ...branchSessions };
    Object.keys(updatedSessions).forEach((bId) => {
      if (updatedSessions[bId]?.userId === acc.id) {
        delete updatedSessions[bId];
      }
    });

    updatedSessions[targetBranchId] = {
      branchId: targetBranchId,
      branchName: targetBranch.name,
      userId: acc.id,
      userName: acc.name,
      userRole: acc.role,
      claimedAt: new Date().toISOString(),
    };
    setBranchSessions(updatedSessions);
    saveDocument(COLLECTIONS.STORE_META, 'active_sessions', { sessions: updatedSessions });

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
      saveDocument(COLLECTIONS.STORE_META, 'active_sessions', { sessions: next });
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
        saveDocument(COLLECTIONS.STORE_META, 'active_sessions', { sessions: next });
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
    saveDocument(COLLECTIONS.ACCOUNTS, newAcc.id, newAcc);
    return newAcc;
  };

  const updateAccount = (id: string, data: Partial<UserAccount>) => {
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const updated = { ...a, ...data };
          saveDocument(COLLECTIONS.ACCOUNTS, id, updated);
          return updated;
        }
        return a;
      })
    );
    if (currentUser?.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...data } : null));
    }
  };

  const deleteAccount = (id: string): boolean => {
    if (accounts.length <= 1) return false;
    const target = accounts.find((a) => a.id === id);
    if (target?.role === 'owner' && accounts.filter((a) => a.role === 'owner').length <= 1) {
      return false;
    }
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    deleteDocument(COLLECTIONS.ACCOUNTS, id);
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

    const currentBranchStock = { ...(product.branchStock || {}) };
    const newFromStock = Math.max(0, (currentBranchStock[fromBranchId] || 0) - quantity);
    const newToStock = (currentBranchStock[toBranchId] || 0) + quantity;

    currentBranchStock[fromBranchId] = newFromStock;
    currentBranchStock[toBranchId] = newToStock;

    const updatedProduct: Product = {
      ...product,
      branchStock: currentBranchStock,
      updatedAt: new Date().toISOString(),
    };

    setProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)));
    saveDocument(COLLECTIONS.PRODUCTS, productId, updatedProduct);

    // Record Stock Adjustment Log in Firestore
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
    saveDocument(COLLECTIONS.ADJUSTMENTS, newAdj.id, newAdj);
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
    saveDocument(COLLECTIONS.PRODUCTS, newProduct.id, newProduct);
    return newProduct;
  };

  const updateProduct = (id: string, updatedFields: Partial<Product>) => {
    const target = products.find((p) => p.id === id);
    if (!target) return;

    const updated = { ...target, ...updatedFields, updatedAt: new Date().toISOString() };
    if (updated.branchStock) {
      updated.stock = Object.values(updated.branchStock).reduce((a: number, b: number) => a + (Number(b) || 0), 0);
    }

    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    saveDocument(COLLECTIONS.PRODUCTS, id, updated);
  };

  const deleteProduct = (id: string): boolean => {
    if (!canDeleteStock) {
      alert('Exclusive Permission: Only the store Owner can delete products from the database.');
      return false;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    deleteDocument(COLLECTIONS.PRODUCTS, id);
    return true;
  };

  // Record Sale & Decrement Branch Stock in Real-time Cloud Firestore
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

    // 1. Decrement Stock from current branch AND total stock in Firestore
    saleData.items.forEach((soldItem) => {
      const product = products.find((p) => p.id === soldItem.productId);
      if (product) {
        const currentBranchStockMap = { ...(product.branchStock || {}) };
        const prevBranchQty = currentBranchStockMap[activeBranchId] ?? product.stock;
        const newBranchQty = Math.max(0, prevBranchQty - soldItem.quantity);
        currentBranchStockMap[activeBranchId] = newBranchQty;
        const newTotalStock = Math.max(0, product.stock - soldItem.quantity);

        const updatedProd: Product = {
          ...product,
          stock: newTotalStock,
          branchStock: currentBranchStockMap,
          updatedAt: new Date().toISOString(),
        };

        setProducts((prev) => prev.map((p) => (p.id === product.id ? updatedProd : p)));
        saveDocument(COLLECTIONS.PRODUCTS, product.id, updatedProd);
      }
    });

    // 2. Update Customer record if registered in Firestore
    if (saleData.customerId) {
      const customer = customers.find((c) => c.id === saleData.customerId);
      if (customer) {
        const updatedCust: Customer = {
          ...customer,
          totalSpent: customer.totalSpent + saleData.amountPaid,
          creditBalance: customer.creditBalance + balanceDue,
          totalPurchasesCount: customer.totalPurchasesCount + 1,
        };
        setCustomers((prev) => prev.map((c) => (c.id === customer.id ? updatedCust : c)));
        saveDocument(COLLECTIONS.CUSTOMERS, customer.id, updatedCust);
      }
    }

    // 3. Save Sale in Firestore
    setSales((prev) => [newSale, ...prev]);
    saveDocument(COLLECTIONS.SALES, newSale.id, newSale);

    return newSale;
  };

  // Refund Sale & Restock to Branch
  const refundSale = (saleId: string, reason: string) => {
    const saleToRefund = sales.find((s) => s.id === saleId);
    if (!saleToRefund || saleToRefund.status === 'refunded') return;

    const refundBranchId = saleToRefund.branchId || activeBranchId;

    // Restock items in Firestore
    saleToRefund.items.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        const currentBranchStock = { ...(product.branchStock || {}) };
        const currentBranchQty = currentBranchStock[refundBranchId] ?? 0;
        currentBranchStock[refundBranchId] = currentBranchQty + item.quantity;
        const newTotalStock = product.stock + item.quantity;

        const updatedProd: Product = {
          ...product,
          stock: newTotalStock,
          branchStock: currentBranchStock,
          updatedAt: new Date().toISOString(),
        };

        setProducts((prev) => prev.map((p) => (p.id === product.id ? updatedProd : p)));
        saveDocument(COLLECTIONS.PRODUCTS, product.id, updatedProd);
      }
    });

    const updatedSale: Sale = {
      ...saleToRefund,
      status: 'refunded',
      notes: `${saleToRefund.notes || ''} [Refunded on ${new Date().toLocaleDateString()}: ${reason}]`,
    };

    setSales((prev) => prev.map((s) => (s.id === saleId ? updatedSale : s)));
    saveDocument(COLLECTIONS.SALES, saleId, updatedSale);
  };

  // Record Purchase & Add to Stock
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
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `PO-${dateStr}-${randNum}`;

    const balanceDue = Math.max(0, purchaseData.totalAmount - purchaseData.amountPaid);
    let paymentStatus: Purchase['paymentStatus'] = 'paid';
    if (balanceDue > 0) {
      paymentStatus = purchaseData.amountPaid > 0 ? 'partial' : 'unpaid';
    }

    const newPurchase: Purchase = {
      id: `po-${Date.now()}`,
      poNumber: orderNumber,
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
      received: true,
      notes: purchaseData.notes,
    };

    // 1. Increment Stock in Firestore
    purchaseData.items.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        const currentBranchStock = { ...(product.branchStock || {}) };
        const currentQty = currentBranchStock[activeBranchId] ?? 0;
        currentBranchStock[activeBranchId] = currentQty + item.quantity;
        const newTotalStock = product.stock + item.quantity;

        const updatedProd: Product = {
          ...product,
          stock: newTotalStock,
          branchStock: currentBranchStock,
          costPrice: purchaseData.updateCostPrices ? item.unitCost : product.costPrice,
          updatedAt: new Date().toISOString(),
        };

        setProducts((prev) => prev.map((p) => (p.id === product.id ? updatedProd : p)));
        saveDocument(COLLECTIONS.PRODUCTS, product.id, updatedProd);
      }
    });

    // 2. Update Supplier balance if credit purchase
    if (purchaseData.supplierId && balanceDue > 0) {
      const supplier = suppliers.find((s) => s.id === purchaseData.supplierId);
      if (supplier) {
        const updatedSupplier: Supplier = {
          ...supplier,
          balanceOwed: (supplier.balanceOwed || 0) + balanceDue,
        };
        setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? updatedSupplier : s)));
        saveDocument(COLLECTIONS.SUPPLIERS, supplier.id, updatedSupplier);
      }
    }

    // 3. Save Purchase in Firestore
    setPurchases((prev) => [newPurchase, ...prev]);
    saveDocument(COLLECTIONS.PURCHASES, newPurchase.id, newPurchase);

    return newPurchase;
  };

  // Stock Adjustment Action
  const adjustStock = (
    productId: string,
    newQuantity: number,
    reason: StockAdjustment['reason'],
    notes?: string,
    adjustedBy?: string,
    targetBranchId?: string
  ) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const branchToAdjust = targetBranchId || activeBranchId;
    const currentBranchStock = { ...(product.branchStock || {}) };
    const prevBranchStock = currentBranchStock[branchToAdjust] ?? 0;
    const difference = newQuantity - prevBranchStock;

    currentBranchStock[branchToAdjust] = newQuantity;
    const newTotalStock = Math.max(0, product.stock + difference);

    const updatedProd: Product = {
      ...product,
      stock: newTotalStock,
      branchStock: currentBranchStock,
      updatedAt: new Date().toISOString(),
    };

    setProducts((prev) => prev.map((p) => (p.id === productId ? updatedProd : p)));
    saveDocument(COLLECTIONS.PRODUCTS, productId, updatedProd);

    const adjBranch = branches.find((b) => b.id === branchToAdjust);
    const newAdj: StockAdjustment = {
      id: `adj-${Date.now()}`,
      productId,
      productName: product.name,
      sku: product.sku,
      branchId: branchToAdjust,
      branchName: adjBranch?.name || activeBranch.name,
      previousStock: prevBranchStock,
      newStock: newQuantity,
      difference,
      reason,
      notes,
      date: new Date().toISOString(),
      adjustedBy: adjustedBy || currentUser?.name || 'Owner',
    };

    setStockAdjustments((prev) => [newAdj, ...prev]);
    saveDocument(COLLECTIONS.ADJUSTMENTS, newAdj.id, newAdj);
  };

  // Supplier Handlers
  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'createdAt' | 'balanceOwed'>): Supplier => {
    const newSupp: Supplier = {
      ...supplierData,
      id: `supp-${Date.now()}`,
      balanceOwed: 0,
      createdAt: new Date().toISOString(),
    };
    setSuppliers((prev) => [...prev, newSupp]);
    saveDocument(COLLECTIONS.SUPPLIERS, newSupp.id, newSupp);
    return newSupp;
  };

  const updateSupplier = (id: string, data: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = { ...s, ...data };
          saveDocument(COLLECTIONS.SUPPLIERS, id, updated);
          return updated;
        }
        return s;
      })
    );
  };

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    deleteDocument(COLLECTIONS.SUPPLIERS, id);
  };

  const recordSupplierPayment = (supplierId: string, amount: number, paymentMethod: PaymentMethod, note?: string) => {
    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === supplierId) {
          const updated = {
            ...s,
            balanceOwed: Math.max(0, (s.balanceOwed || 0) - amount),
          };
          saveDocument(COLLECTIONS.SUPPLIERS, supplierId, updated);
          return updated;
        }
        return s;
      })
    );

    addExpense({
      title: `Payment to supplier: ${suppliers.find((s) => s.id === supplierId)?.name || 'Supplier'}`,
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
    setCustomers((prev) => [...prev, newCust]);
    saveDocument(COLLECTIONS.CUSTOMERS, newCust.id, newCust);
    return newCust;
  };

  const updateCustomer = (id: string, data: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...data };
          saveDocument(COLLECTIONS.CUSTOMERS, id, updated);
          return updated;
        }
        return c;
      })
    );
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    deleteDocument(COLLECTIONS.CUSTOMERS, id);
  };

  const recordCustomerPayment = (customerId: string, amount: number, paymentMethod: PaymentMethod, note?: string) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const updated = {
            ...c,
            creditBalance: Math.max(0, c.creditBalance - amount),
            totalSpent: c.totalSpent + amount,
          };
          saveDocument(COLLECTIONS.CUSTOMERS, customerId, updated);
          return updated;
        }
        return c;
      })
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
          const updatedSale: Sale = {
            ...sale,
            amountPaid: newPaid,
            balanceDue: newBalance,
            status: newStatus,
            notes: sale.notes ? `${sale.notes} [Payment recvd: ${formatCurrency(deduction)}]` : `[Payment recvd: ${formatCurrency(deduction)}]`,
          };
          saveDocument(COLLECTIONS.SALES, sale.id, updatedSale);
          return updatedSale;
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
    saveDocument(COLLECTIONS.EXPENSES, newExp.id, newExp);
    return newExp;
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    deleteDocument(COLLECTIONS.EXPENSES, id);
  };

  // Settings
  const updateSettings = (newSettings: Partial<ShopSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveDocument(COLLECTIONS.STORE_META, 'global_settings', updated);
      return updated;
    });
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

    seedInitialFirestoreData({
      branches: initialBranches,
      accounts: initialAccounts,
      settings: initialSettings,
      products: initialProducts,
      suppliers: initialSuppliers,
      customers: initialCustomers,
      sales: initialSales,
      purchases: initialPurchases,
      expenses: initialExpenses,
      stockAdjustments: initialStockAdjustments,
    });
  };

  // Backup & Export Helpers
  const exportJSONBackup = () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      appVersion: '3.0.0-firebase',
      branches,
      accounts,
      settings,
      products,
      sales,
      purchases,
      suppliers,
      customers,
      expenses,
      stockAdjustments,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `shop-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importJSONBackup = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!parsed.products || !parsed.sales) {
        throw new Error('Invalid JSON format');
      }

      if (parsed.settings) setSettings(parsed.settings);
      if (parsed.branches) setBranches(parsed.branches);
      if (parsed.accounts) setAccounts(parsed.accounts);
      if (parsed.products) setProducts(parsed.products);
      if (parsed.sales) setSales(parsed.sales);
      if (parsed.purchases) setPurchases(parsed.purchases);
      if (parsed.suppliers) setSuppliers(parsed.suppliers);
      if (parsed.customers) setCustomers(parsed.customers);
      if (parsed.expenses) setExpenses(parsed.expenses);
      if (parsed.stockAdjustments) setStockAdjustments(parsed.stockAdjustments);

      seedInitialFirestoreData({
        branches: parsed.branches || branches,
        accounts: parsed.accounts || accounts,
        settings: parsed.settings || settings,
        products: parsed.products || products,
        suppliers: parsed.suppliers || suppliers,
        customers: parsed.customers || customers,
        sales: parsed.sales || sales,
        purchases: parsed.purchases || purchases,
        expenses: parsed.expenses || expenses,
        stockAdjustments: parsed.stockAdjustments || stockAdjustments,
      });

      return true;
    } catch (e) {
      console.error('Error importing backup:', e);
      return false;
    }
  };

  const exportSalesCSV = () => {
    const headers = [
      'Receipt No',
      'Date',
      'Branch',
      'Cashier',
      'Customer',
      'Items Count',
      'Subtotal',
      'Discount',
      'Tax',
      'Grand Total',
      'Amount Paid',
      'Balance Due',
      'Status',
      'Payment Method',
    ];
    const rows = sales.map((s) => [
      `"${s.receiptNo}"`,
      `"${new Date(s.date).toLocaleString()}"`,
      `"${s.branchName || 'Head Store'}"`,
      `"${s.cashierName || 'Cashier'}"`,
      `"${s.customerName}"`,
      s.items.reduce((acc, i) => acc + i.quantity, 0),
      s.subtotal.toFixed(2),
      s.discount.toFixed(2),
      s.taxAmount.toFixed(2),
      s.grandTotal.toFixed(2),
      s.amountPaid.toFixed(2),
      s.balanceDue.toFixed(2),
      `"${s.status}"`,
      `"${s.paymentMethod}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV(csvContent, `sales-report-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportStockCSV = () => {
    const headers = ['Product Name', 'SKU', 'Barcode', 'Category', 'Total Stock', ...branches.map((b) => `Stock (${b.name})`), 'Cost Price', 'Selling Price', 'Min Stock Alert'];
    const rows = products.map((p) => [
      `"${p.name}"`,
      `"${p.sku}"`,
      `"${p.barcode || ''}"`,
      `"${p.category}"`,
      p.stock,
      ...branches.map((b) => getProductBranchStock(p, b.id)),
      p.costPrice.toFixed(2),
      p.sellingPrice.toFixed(2),
      p.minStockAlert,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV(csvContent, `inventory-stock-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportPurchasesCSV = () => {
    const headers = ['PO Number', 'Date', 'Branch', 'Supplier', 'Items Count', 'Total Amount', 'Amount Paid', 'Balance Due', 'Status', 'Payment Method'];
    const rows = purchases.map((p) => [
      `"${p.poNumber}"`,
      `"${new Date(p.date).toLocaleString()}"`,
      `"${p.branchName || 'Head Store'}"`,
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
        isCloudSynced,
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

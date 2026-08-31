export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  managerName?: string;
  isHeadBranch: boolean;
  isHeadOffice?: boolean;
  active: boolean;
  createdAt: string;
}

export type UserRole = 'owner' | 'shopkeeper';

export interface BranchSession {
  branchId: string;
  branchName: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  claimedAt: string;
}

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  pin: string;
  role: UserRole;
  branchId: string;
  branchName: string;
  phone?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unit: string; // 'pcs', 'kg', 'ltr', 'box', 'pack', 'carton', 'm'
  costPrice: number;
  sellingPrice: number;
  stock: number; // Aggregate total across all branches
  branchStock?: Record<string, number>; // Branch ID -> quantity at that branch
  minStockAlert: number;
  supplierId?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  total: number;
  unit: string;
}

export type PaymentMethod = 'cash' | 'card' | 'momo' | 'credit' | 'bank_transfer';
export type SaleStatus = 'completed' | 'refunded' | 'credit_unpaid' | 'credit_partial';

export interface Sale {
  id: string;
  receiptNo: string;
  branchId?: string;
  branchName?: string;
  cashierId?: string;
  cashierName?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number; // in currency amount
  taxRate: number; // percentage e.g. 5%
  taxAmount: number;
  grandTotal: number;
  costTotal: number;
  profit: number;
  paymentMethod: PaymentMethod;
  cashTendered?: number;
  changeDue?: number;
  amountPaid: number;
  balanceDue: number;
  status: SaleStatus;
  notes?: string;
  date: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  unitCost: number;
  quantity: number;
  total: number;
  unit: string;
}

export interface Purchase {
  id: string;
  poNumber: string;
  branchId?: string;
  branchName?: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentMethod: PaymentMethod;
  date: string;
  notes?: string;
  received: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  balanceOwed: number; // Money the shop owes the supplier
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  creditBalance: number; // Money the customer owes the shop
  totalSpent: number;
  totalPurchasesCount: number;
  notes?: string;
  createdAt: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  branchId?: string;
  branchName?: string;
  previousStock: number;
  newStock: number;
  difference: number;
  reason: 'damaged' | 'expired' | 'audit_discrepancy' | 'theft' | 'customer_return' | 'restock' | 'transfer' | 'other';
  notes?: string;
  date: string;
  adjustedBy: string;
}

export type ExpenseCategory = 'rent' | 'utilities' | 'salaries' | 'transport' | 'maintenance' | 'marketing' | 'packaging' | 'other';

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  branchId?: string;
  branchName?: string;
  date: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface ShopSettings {
  shopName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  currencySymbol: string;
  currencyCode: string;
  taxRate: number;
  taxName: string;
  enableTax: boolean;
  receiptHeader: string;
  receiptFooter: string;
  lowStockThresholdDefault: number;
}

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Product,
  Sale,
  Purchase,
  Supplier,
  Customer,
  Expense,
  StockAdjustment,
  ShopSettings,
  Branch,
  UserAccount,
  BranchSession,
} from '../types';

export const COLLECTIONS = {
  PRODUCTS: 'products',
  SALES: 'sales',
  PURCHASES: 'purchases',
  SUPPLIERS: 'suppliers',
  CUSTOMERS: 'customers',
  EXPENSES: 'expenses',
  ADJUSTMENTS: 'stock_adjustments',
  BRANCHES: 'branches',
  ACCOUNTS: 'accounts',
  STORE_META: 'store_meta',
};

// --- REAL-TIME SUBSCRIPTION HELPERS ---

export function subscribeToCollection<T>(
  collectionName: string,
  onUpdate: (items: T[]) => void,
  onError?: (error: Error) => void
) {
  try {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as T[];
        onUpdate(data);
      },
      (err) => {
        console.warn(`Firestore sync error for ${collectionName}:`, err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn(`Error setting up listener for ${collectionName}:`, err);
    return () => {};
  }
}

export function subscribeToDoc<T>(
  collectionName: string,
  docId: string,
  onUpdate: (data: T | null) => void
) {
  try {
    const docRef = doc(db, collectionName, docId);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate({ id: docSnap.id, ...docSnap.data() } as T);
        } else {
          onUpdate(null);
        }
      },
      (err) => {
        console.warn(`Firestore sync error for doc ${collectionName}/${docId}:`, err);
      }
    );
  } catch (err) {
    console.warn(`Error setting up doc listener for ${collectionName}/${docId}:`, err);
    return () => {};
  }
}

// --- SANITIZE FOR FIRESTORE (Removes undefined fields to prevent Firestore serialization rejection) ---
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    const clean: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean;
  }
  return data;
}

// --- SYNC MUTATION HELPERS ---

export async function saveDocument(collectionName: string, id: string, data: any) {
  try {
    const docRef = doc(db, collectionName, id);
    const cleanData = sanitizeForFirestore(data);
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    console.error(`Failed to save doc to ${collectionName}:`, error);
  }
}

export async function updateDocument(collectionName: string, id: string, data: any) {
  try {
    const docRef = doc(db, collectionName, id);
    const cleanData = sanitizeForFirestore(data);
    await updateDoc(docRef, cleanData);
  } catch (error) {
    console.error(`Failed to update doc in ${collectionName}:`, error);
  }
}

export async function deleteDocument(collectionName: string, id: string) {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Failed to delete doc from ${collectionName}:`, error);
  }
}

// Batch bootstrap initial state if remote database is empty
export async function seedInitialFirestoreData(seedData: {
  branches: Branch[];
  accounts: UserAccount[];
  settings: ShopSettings;
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  stockAdjustments: StockAdjustment[];
}) {
  try {
    const batch = writeBatch(db);

    seedData.branches.forEach((b) => {
      batch.set(doc(db, COLLECTIONS.BRANCHES, b.id), sanitizeForFirestore(b));
    });

    seedData.accounts.forEach((a) => {
      batch.set(doc(db, COLLECTIONS.ACCOUNTS, a.id), sanitizeForFirestore(a));
    });

    seedData.products.forEach((p) => {
      batch.set(doc(db, COLLECTIONS.PRODUCTS, p.id), sanitizeForFirestore(p));
    });

    seedData.suppliers.forEach((s) => {
      batch.set(doc(db, COLLECTIONS.SUPPLIERS, s.id), sanitizeForFirestore(s));
    });

    seedData.customers.forEach((c) => {
      batch.set(doc(db, COLLECTIONS.CUSTOMERS, c.id), sanitizeForFirestore(c));
    });

    seedData.sales.forEach((s) => {
      batch.set(doc(db, COLLECTIONS.SALES, s.id), sanitizeForFirestore(s));
    });

    seedData.purchases.forEach((p) => {
      batch.set(doc(db, COLLECTIONS.PURCHASES, p.id), sanitizeForFirestore(p));
    });

    seedData.expenses.forEach((e) => {
      batch.set(doc(db, COLLECTIONS.EXPENSES, e.id), sanitizeForFirestore(e));
    });

    seedData.stockAdjustments.forEach((adj) => {
      batch.set(doc(db, COLLECTIONS.ADJUSTMENTS, adj.id), sanitizeForFirestore(adj));
    });

    batch.set(doc(db, COLLECTIONS.STORE_META, 'global_settings'), sanitizeForFirestore(seedData.settings));

    await batch.commit();
    console.log('Firebase Firestore successfully bootstrapped with real-time seed data.');
  } catch (error) {
    console.warn('Error during Firestore data seed:', error);
  }
}

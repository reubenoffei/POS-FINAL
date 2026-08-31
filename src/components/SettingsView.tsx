import React, { useState, useRef } from 'react';
import { useShop } from '../context/ShopContext';
import {
  Settings,
  Store,
  DollarSign,
  Receipt,
  Download,
  Upload,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Users,
  Plus,
  Lock,
  Edit2,
  X,
} from 'lucide-react';
import { Branch, UserAccount } from '../types';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    exportJSONBackup,
    importJSONBackup,
    exportSalesCSV,
    exportStockCSV,
    exportPurchasesCSV,
    branches,
    addBranch,
    updateBranch,
    accounts,
    addAccount,
    updateAccount,
    branchSessions,
    releaseBranchSession,
    isOwner,
    currentUser,
  } = useShop();

  const [formData, setFormData] = useState({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Branch Modal State
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    phone: '',
    managerName: '',
  });

  // Staff Account Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [accountForm, setAccountForm] = useState<{
    name: string;
    username: string;
    pin: string;
    role: 'owner' | 'shopkeeper';
    branchId: string;
    phone: string;
  }>({
    name: '',
    username: '',
    pin: '1234',
    role: 'shopkeeper',
    branchId: branches[0]?.id || 'branch-1',
    phone: '',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ...formData,
      taxRate: Number(formData.taxRate) || 0,
      lowStockThresholdDefault: Number(formData.lowStockThresholdDefault) || 5,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleOpenAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({
      name: '',
      address: '',
      phone: '',
      managerName: '',
    });
    setIsBranchModalOpen(true);
  };

  const handleOpenEditBranch = (b: Branch) => {
    setEditingBranch(b);
    setBranchForm({
      name: b.name,
      address: b.address,
      phone: b.phone,
      managerName: b.managerName,
    });
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name.trim()) return;

    if (editingBranch) {
      updateBranch(editingBranch.id, {
        name: branchForm.name.trim(),
        address: branchForm.address.trim(),
        phone: branchForm.phone.trim(),
        managerName: branchForm.managerName.trim(),
      });
    } else {
      addBranch({
        name: branchForm.name.trim(),
        address: branchForm.address.trim() || 'Branch Retail Address',
        phone: branchForm.phone.trim() || '+233 50 000 0000',
        managerName: branchForm.managerName.trim() || 'Assigned Manager',
        isHeadOffice: false,
      });
    }
    setIsBranchModalOpen(false);
    setEditingBranch(null);
  };

  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccountForm({
      name: '',
      username: '',
      pin: '1234',
      role: 'shopkeeper',
      branchId: branches[0]?.id || 'branch-1',
      phone: '',
    });
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: UserAccount) => {
    setEditingAccount(acc);
    setAccountForm({
      name: acc.name,
      username: acc.username,
      pin: acc.pin,
      role: acc.role,
      branchId: acc.branchId,
      phone: acc.phone || '',
    });
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.name.trim() || !accountForm.username.trim()) return;

    const assignedBranch = branches.find((b) => b.id === accountForm.branchId);

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        name: accountForm.name.trim(),
        username: accountForm.username.trim().toLowerCase(),
        pin: accountForm.pin,
        role: accountForm.role,
        branchId: accountForm.branchId,
        branchName: assignedBranch?.name || 'Assigned Branch',
        phone: accountForm.phone.trim(),
      });
    } else {
      addAccount({
        name: accountForm.name.trim(),
        username: accountForm.username.trim().toLowerCase(),
        pin: accountForm.pin || '1234',
        role: accountForm.role,
        branchId: accountForm.branchId,
        branchName: assignedBranch?.name || 'Assigned Branch',
        phone: accountForm.phone.trim(),
      });
    }
    setIsAccountModalOpen(false);
    setEditingAccount(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importJSONBackup(content);
        if (success) {
          alert('Backup restored successfully! All data has been updated.');
        } else {
          alert('Invalid backup file format. Please provide a valid JSON export.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Shop Settings, Branches & Staff Accounts</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure multi-branch locations, shopkeeper access accounts, currency, and complete database backups.
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Settings Saved!
          </div>
        )}
      </div>

      {/* SECTION: MULTI-BRANCH NETWORK MANAGEMENT (3+ Branches) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Shop Branches Network ({branches.length} Locations)</h3>
              <p className="text-xs text-slate-500">
                Manage your head branch and expansion retail locations across town.
              </p>
            </div>
          </div>

          {isOwner && (
            <button
              onClick={handleOpenAddBranch}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Open New Branch
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {branches.map((b) => (
            <div
              key={b.id}
              className={`p-4 rounded-xl border transition-all ${
                b.isHeadOffice
                  ? 'bg-indigo-50/40 border-indigo-200'
                  : 'bg-slate-50/60 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    {b.name}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">ID: {b.id}</span>
                </div>
                {b.isHeadOffice ? (
                  <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                    Head HQ
                  </span>
                ) : (
                  <span className="text-[10px] font-medium bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                    Branch Store
                  </span>
                )}
              </div>

              <div className="text-xs space-y-1 text-slate-600">
                <p className="line-clamp-1">📍 {b.address}</p>
                <p>📞 {b.phone}</p>
                <p className="text-slate-500 text-[11px]">Manager: {b.managerName}</p>
              </div>

              {/* Station Occupancy Badge */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-xs">
                {branchSessions[b.id] ? (
                  <div className="flex items-center justify-between gap-1 text-[11px] bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 rounded-lg">
                    <span className="flex items-center gap-1 font-medium truncate">
                      <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                      Cashier: <strong className="font-bold">{branchSessions[b.id].userName}</strong>
                    </span>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => releaseBranchSession(b.id)}
                        className="text-[10px] text-amber-900 hover:text-rose-700 font-bold underline shrink-0"
                        title="Free this branch station"
                      >
                        Release
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Station Available / Unoccupied</span>
                  </div>
                )}
              </div>

              {isOwner && (
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex justify-end">
                  <button
                    onClick={() => handleOpenEditBranch(b)}
                    className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit Branch Info
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION: SHOPKEEPER STAFF ACCOUNTS & RBAC */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Shopkeepers & Staff Accounts</h3>
              <p className="text-xs text-slate-500">
                Every shopkeeper logs into their dedicated branch. Owner has exclusive inventory add/delete rights.
              </p>
            </div>
          </div>

          {isOwner ? (
            <button
              onClick={handleOpenAddAccount}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Staff Account
            </button>
          ) : (
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Staff management restricted to Owner
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Staff Name</th>
                <th className="py-2.5 px-3">Username & PIN</th>
                <th className="py-2.5 px-3">Assigned Branch</th>
                <th className="py-2.5 px-3">Role & Rights</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          acc.role === 'owner'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {acc.role === 'owner' ? <ShieldCheck className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        {acc.name}
                        {acc.id === currentUser?.id && (
                          <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">
                    <div>@{acc.username}</div>
                    <div className="text-[10px] text-slate-400">PIN: {acc.pin}</div>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">
                    {acc.branchName || 'Head Office'}
                  </td>
                  <td className="py-2.5 px-3">
                    {acc.role === 'owner' ? (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                        Head Branch Owner (Full Rights)
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                        Shopkeeper (Branch POS & Audits)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {isOwner && (
                      <button
                        onClick={() => handleOpenEditAccount(acc)}
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                        title="Edit Account"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* SECTION 1: SHOP IDENTITY */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Store className="w-4 h-4 text-indigo-700" />
            <h3 className="font-bold text-slate-900 text-sm">Store Profile & Branding</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Shop / Business Name *</label>
              <input
                type="text"
                required
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tagline / Slogan</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="e.g. Quality Goods & Everyday Essentials"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Physical Store Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: CURRENCY & TAXATION */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <DollarSign className="w-4 h-4 text-indigo-700" />
            <h3 className="font-bold text-slate-900 text-sm">Currency & Taxation</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                placeholder="$, €, £, ₵, ₦, ₹, ¥"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-base focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Currency Code (ISO)</label>
              <input
                type="text"
                value={formData.currencyCode}
                onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value.toUpperCase() })}
                placeholder="USD, GHS, NGN, EUR, GBP"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Low Stock Alert Threshold</label>
              <input
                type="number"
                min="1"
                value={formData.lowStockThresholdDefault}
                onChange={(e) => setFormData({ ...formData, lowStockThresholdDefault: parseInt(e.target.value) || 5 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Tax Options */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900">
              <input
                type="checkbox"
                checked={formData.enableTax}
                onChange={(e) => setFormData({ ...formData, enableTax: e.target.checked })}
                className="rounded-sm text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Enable Tax Calculation on Sales</span>
            </label>

            {formData.enableTax && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tax Label / Name</label>
                  <input
                    type="text"
                    value={formData.taxName}
                    onChange={(e) => setFormData({ ...formData, taxName: e.target.value })}
                    placeholder="VAT, Sales Tax, GST"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tax Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: RECEIPT CUSTOMIZATION */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Receipt className="w-4 h-4 text-indigo-700" />
            <h3 className="font-bold text-slate-900 text-sm">Receipt Template & Customer Notes</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Receipt Header Greeting</label>
              <input
                type="text"
                value={formData.receiptHeader}
                onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                placeholder="Thank you for shopping with us!"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Receipt Footer / Return Policy</label>
              <textarea
                rows={2}
                value={formData.receiptFooter}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                placeholder="Goods sold in good condition. Keep receipt for returns within 7 days."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors text-xs"
          >
            Save Store Settings
          </button>
        </div>

      </form>

      {/* SECTION 4: DATA EXPORT & BACKUP TOOLS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-slate-900 text-sm">Data Backup, CSV Export & System Recovery</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* JSON Full Backup */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-indigo-700" />
              Full Database JSON Backup
            </h4>
            <p className="text-slate-500 text-[11px]">
              Export all products, branch inventories, sales, purchases, suppliers, customers, and accounts.
            </p>
            <button
              onClick={exportJSONBackup}
              className="w-full py-2 font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-2xs transition-colors"
            >
              Download Backup File (.json)
            </button>
          </div>

          {/* JSON Restore */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-indigo-600" />
              Restore Database from JSON
            </h4>
            <p className="text-slate-500 text-[11px]">
              Load a previously exported backup file to restore all multi-branch records.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-2xs transition-colors"
            >
              Choose Backup File to Restore
            </button>
          </div>
        </div>

        {/* CSV Spreadsheet Exports */}
        <div className="pt-2">
          <label className="block font-bold text-slate-800 text-xs mb-2">Export Data for Excel / Sheets (CSV)</label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={exportSalesCSV}
              className="py-2 px-3 text-center font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors truncate"
            >
              Sales Ledger (CSV)
            </button>
            <button
              onClick={exportStockCSV}
              className="py-2 px-3 text-center font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors truncate"
            >
              Stock & Inventory (CSV)
            </button>
            <button
              onClick={exportPurchasesCSV}
              className="py-2 px-3 text-center font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors truncate"
            >
              Purchase Orders (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: ADD / EDIT BRANCH */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingBranch ? `Edit Branch: ${editingBranch.name}` : 'Open New Shop Branch'}
              </h3>
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="e.g. East Legon Retail Hub"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location Address</label>
                <input
                  type="text"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  placeholder="e.g. Plot 44, Mensah Wood Ave, Accra"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch Phone</label>
                  <input
                    type="text"
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                    placeholder="+233 50 111 2222"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Manager / Lead</label>
                  <input
                    type="text"
                    value={branchForm.managerName}
                    onChange={(e) => setBranchForm({ ...branchForm, managerName: e.target.value })}
                    placeholder="e.g. Daniel Osei"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  {editingBranch ? 'Update Branch' : 'Register Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT STAFF ACCOUNT */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingAccount ? `Edit Staff Account: ${editingAccount.name}` : 'Create Staff Login Account'}
              </h3>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Staff Full Name *</label>
                <input
                  type="text"
                  required
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  placeholder="e.g. Sarah Boateng"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={accountForm.username}
                    onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                    placeholder="sarah.b"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Login PIN (4 digits) *</label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={accountForm.pin}
                    onChange={(e) => setAccountForm({ ...accountForm, pin: e.target.value })}
                    placeholder="1234"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Branch *</label>
                <select
                  value={accountForm.branchId}
                  onChange={(e) => setAccountForm({ ...accountForm, branchId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-800 font-semibold"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.isHeadOffice ? '(Head HQ)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role & Permission Level *</label>
                <select
                  value={accountForm.role}
                  onChange={(e) => setAccountForm({ ...accountForm, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-800 font-semibold"
                >
                  <option value="shopkeeper">Shopkeeper (Branch POS & Sales Records)</option>
                  <option value="owner">Head Branch Owner (Add/Delete Stock, All Branches)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  {editingAccount ? 'Update Staff Account' : 'Save Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

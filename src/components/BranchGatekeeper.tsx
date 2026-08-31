import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { UserAccount, Branch } from '../types';
import {
  Store,
  Building2,
  Lock,
  KeyRound,
  ShieldCheck,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  UserCheck,
  LogOut,
  RefreshCw,
  Info
} from 'lucide-react';

export const BranchGatekeeper: React.FC = () => {
  const {
    settings,
    branches,
    accounts,
    branchSessions,
    login,
    releaseBranchSession,
  } = useShop();

  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blockedBranchWarning, setBlockedBranchWarning] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Live time updater
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  // When account changes, default to their assigned branch
  const handleSelectAccount = (acc: UserAccount) => {
    setSelectedAccountId(acc.id);
    setErrorMessage(null);
    setBlockedBranchWarning(null);
    setSelectedBranchId(acc.branchId || branches[0]?.id || '');
  };

  const handleBranchClick = (branch: Branch) => {
    setErrorMessage(null);
    setBlockedBranchWarning(null);
    setSelectedBranchId(branch.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setBlockedBranchWarning(null);

    if (!selectedAccount) {
      setErrorMessage('Please select a staff account.');
      return;
    }

    if (!pinInput.trim()) {
      setErrorMessage('Please enter your 4-digit security PIN.');
      return;
    }

    if (!selectedBranchId) {
      setErrorMessage('Please choose a branch station before proceeding.');
      return;
    }

    const result = login(selectedAccount.username, pinInput, selectedBranchId);
    if (!result.success) {
      setErrorMessage(result.message || 'Authentication failed. Please check your credentials.');
    }
  };

  const fillQuickDemo = (acc: UserAccount) => {
    setSelectedAccountId(acc.id);
    setPinInput(acc.pin || '1234');
    setSelectedBranchId(acc.branchId);
    setErrorMessage(null);
    setBlockedBranchWarning(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white p-4 sm:p-6 md:p-8">
      {/* Top Brand Bar */}
      <header className="max-w-5xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-600/30">
            <Store className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl text-white tracking-tight leading-tight">
              {settings.shopName || 'Retail & Multi-Branch ERP'}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              {settings.tagline || 'Branch Access Terminal & Inventory Portal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{currentTime || '00:00:00'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>System Active</span>
          </div>
        </div>
      </header>

      {/* Main Terminal Container */}
      <main className="max-w-4xl w-full mx-auto my-6">
        <div className="bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
          {/* Header Banner */}
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 px-2.5 py-1 rounded-md bg-indigo-950/80 border border-indigo-800/60 inline-block mb-1.5">
                Staff Authentication & Branch Station Check-In
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Select Your Account & Choose a Branch
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose an available branch to unlock inventory, POS cash register, and local records.
              </p>
            </div>

            {/* Quick Demo Credentials Helper */}
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Quick Demo Sign-In
              </span>
              <div className="flex flex-wrap gap-1.5">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => fillQuickDemo(acc)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                      selectedAccountId === acc.id
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {acc.role === 'owner' ? '👑 ' : '🏬 '}
                    {acc.name.split(' ')[0]} ({acc.role === 'owner' ? 'HQ Owner' : 'Staff'})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            
            {/* Error Message Banner */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-3 animate-shake">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-100">Authentication / Access Notice</p>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Blocked Branch Click Warning */}
            {blockedBranchWarning && (
              <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-800/80 text-amber-200 text-xs flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-100">Branch Already Chosen & In Use</p>
                  <p>{blockedBranchWarning}</p>
                </div>
              </div>
            )}

            {/* Step 1: Staff Account Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  Select Staff Member / Cashier Account
                </label>
                <span className="text-[11px] text-slate-400">
                  Selected: <strong className="text-slate-200">{selectedAccount?.name}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {accounts.map((acc) => {
                  const isSelected = acc.id === selectedAccountId;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleSelectAccount(acc)}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/50 shadow-md'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            acc.role === 'owner'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {acc.role === 'owner' ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                        </div>
                        {acc.role === 'owner' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Head Owner
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            Shopkeeper
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-bold text-white leading-tight">{acc.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">@{acc.username}</p>
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Choose Branch (Open selection with active cashier badge) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                  Choose Branch Station to Operate / Manage
                </label>
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                  Select any branch station (owner & sellers can operate concurrently)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {branches.map((branch) => {
                  const session = branchSessions[branch.id];
                  const isOccupied = !!session;
                  const isOccupiedBySelf = session?.userId === selectedAccount?.id;
                  const isSelected = selectedBranchId === branch.id;

                  return (
                    <div
                      key={branch.id}
                      onClick={() => handleBranchClick(branch)}
                      className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/50 ring-2 ring-indigo-500/60 shadow-lg'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900/60'
                      }`}
                    >
                      {/* Top status */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 text-indigo-400 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                              {branch.code}
                            </span>
                            {branch.isHeadBranch && (
                              <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                HQ
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Availability Tag */}
                        {isOccupiedBySelf ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> Your Session
                          </span>
                        ) : isOccupied ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Active: {session.userName.split(' ')[0]}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Open Station
                          </span>
                        )}
                      </div>

                      {/* Branch Name & Address */}
                      <div className="mb-3">
                        <h3 className="text-sm font-bold text-white leading-snug">{branch.name}</h3>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          {branch.address}
                        </p>
                      </div>

                      {/* Session Occupancy info or Owner Release */}
                      <div className="pt-2 border-t border-slate-800/80 text-[11px]">
                        {isOccupied ? (
                          <div className="space-y-1">
                            <p className="text-slate-400 flex items-center justify-between">
                              <span>Active Cashier:</span>
                              <strong className={isOccupiedBySelf ? 'text-indigo-300' : 'text-amber-300'}>
                                {session.userName}
                              </strong>
                            </p>
                            {selectedAccount?.role === 'owner' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  releaseBranchSession(branch.id);
                                }}
                                className="text-[10px] text-amber-400 hover:text-amber-300 underline font-medium mt-1 flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3" /> Reset Session Tag
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="text-emerald-400/80 font-medium">Ready for check-in</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Security PIN Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                  Enter 4-Digit Security PIN for {selectedAccount?.name}
                </span>
                <span className="text-[11px] font-normal text-slate-400">Default PIN: 1234</span>
              </label>

              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={8}
                  placeholder="Enter 4-digit PIN..."
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 rounded-xl text-white text-sm font-mono tracking-widest focus:outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="btn-gatekeeper-login"
                className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] cursor-pointer"
              >
                <span>Unlock & Access Branch Contents</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </form>
        </div>
      </main>

      {/* Footer info */}
      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-slate-500 pt-3 border-t border-slate-900">
        <p>
          Secure Point of Sale & Multi-Branch Ledger ERP &bull; Each branch station operates with segregated inventory and cashier reconciliation.
        </p>
      </footer>
    </div>
  );
};

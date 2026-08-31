import React, { useState } from 'react';
import { UserAccount, Branch, BranchSession } from '../types';
import { UserCheck, ShieldCheck, Lock, LogIn, Building2, Store, KeyRound, Check, X, User, LogOut, AlertCircle, RefreshCw } from 'lucide-react';

interface AccountAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: UserAccount[];
  branches: Branch[];
  branchSessions: Record<string, BranchSession>;
  currentUser: UserAccount | null;
  onLogin: (username: string, pin: string, chosenBranchId?: string) => { success: boolean; message?: string };
  onLogout: () => void;
  onReleaseBranchSession: (branchId: string) => void;
}

export const AccountAuthModal: React.FC<AccountAuthModalProps> = ({
  isOpen,
  onClose,
  accounts,
  branches,
  branchSessions,
  currentUser,
  onLogin,
  onLogout,
  onReleaseBranchSession,
}) => {
  const [selectedAccId, setSelectedAccId] = useState<string>(currentUser?.id || accounts[0]?.id || '');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(currentUser?.branchId || branches[0]?.id || '');
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickSelect = (acc: UserAccount) => {
    setSelectedAccId(acc.id);
    setSelectedBranchId(acc.branchId || branches[0]?.id || '');
    setErrorMsg(null);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAcc = accounts.find((a) => a.id === selectedAccId);
    if (!targetAcc) {
      setErrorMsg('Please select an account');
      return;
    }

    const session = branchSessions[selectedBranchId];
    if (session && session.userId !== targetAcc.id && targetAcc.role !== 'owner') {
      setErrorMsg(`Branch is already occupied by ${session.userName}. Already chosen branch cannot be selected.`);
      return;
    }

    const res = onLogin(targetAcc.username, pinInput, selectedBranchId);
    if (res.success) {
      setPinInput('');
      setErrorMsg(null);
      onClose();
    } else {
      setErrorMsg(res.message || 'Invalid Security PIN or branch already claimed');
    }
  };

  const activeSelected = accounts.find((a) => a.id === selectedAccId) || accounts[0];

  return (
    <div
      id="account-auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div
        id="account-auth-modal"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Staff & Branch Station Check-In</h2>
              <p className="text-xs text-slate-300">Switch user account or select active branch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Account Selector Cards */}
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            1. Select Staff Account
          </label>
          <div className="space-y-2 mb-5 max-h-48 overflow-y-auto p-0.5">
            {accounts.map((acc) => {
              const isSelected = acc.id === selectedAccId;
              const isCurrent = currentUser?.id === acc.id;

              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleQuickSelect(acc)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        acc.role === 'owner'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {acc.role === 'owner' ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900">{acc.name}</p>
                        {acc.role === 'owner' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-500 text-white rounded">
                            Head Owner
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Store className="w-3 h-3 text-slate-400" />
                        Default: {acc.branchName}
                      </p>
                    </div>
                  </div>

                  {isCurrent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                      Logged In
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Branch Station Selection */}
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            2. Choose Branch Station
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
            {branches.map((b) => {
              const session = branchSessions[b.id];
              const isOccupied = !!session;
              const isOccupiedBySelf = session?.userId === selectedAccId;
              const isSelected = selectedBranchId === b.id;

              return (
                <div
                  key={b.id}
                  onClick={() => {
                    setSelectedBranchId(b.id);
                    setErrorMsg(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-500 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">{b.name}</span>
                    {isOccupiedBySelf ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded border border-indigo-200">
                        Current
                      </span>
                    ) : isOccupied ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-200 flex items-center gap-0.5">
                        Active: {session.userName.split(' ')[0]}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                        Open
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{b.address}</p>
                  {isOccupied && (
                    <p className="text-[10px] text-amber-700 font-medium mt-1">
                      Cashier: {session.userName}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* PIN Input Form */}
          <form onSubmit={handleLoginSubmit}>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Security PIN for {activeSelected?.name.split(' ')[0]}</span>
                <span className="text-[10px] font-normal text-slate-400">Default PIN: 1234</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Enter 4-digit PIN..."
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
              {currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="py-2.5 px-4 text-xs font-semibold border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out & Free Branch
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                Confirm & Enter Branch
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

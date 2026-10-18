/**
 * Core Single-Level Navigation Bar
 * Conforms strictly to requirements:
 * 1. Dashboard (Landing page, no separate Home menu item)
 * 2. Ledger Guide
 * 3. Claim Source Tax
 * 4. Claim AIT
 * 5. Tax Payment Status
 * Plus direct sub-access tabs for Payment and Adjustment journeys in appropriate functional context
 */

import React, { useState } from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import {
  LayoutDashboard,
  BookOpen,
  Receipt,
  Car,
  FileCheck2,
  CreditCard,
  SlidersHorizontal,
  Menu,
  X,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    activeNavTab,
    setActiveNavTab,
    totals,
    setIsStatusModalOpen,
  } = useLedger();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: 'dashboard' | 'ledger-guide' | 'source-tax' | 'ait' | 'payments' | 'adjustments') => {
    setActiveNavTab(tab);
    setMobileMenuOpen(false);
  };

  const handleTaxPaymentStatusClick = () => {
    setIsStatusModalOpen(true);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-slate-800 text-slate-100 border-b border-slate-700 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-13">
          {/* Desktop Single-Level Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {/* 1. Dashboard */}
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                activeNavTab === 'dashboard'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-200 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            {/* 2. Ledger Guide */}
            <button
              onClick={() => handleNavClick('ledger-guide')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                activeNavTab === 'ledger-guide'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-200 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Ledger Guide</span>
            </button>

            {/* 3. Claim Source Tax */}
            <button
              onClick={() => handleNavClick('source-tax')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                activeNavTab === 'source-tax'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-200 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Claim Source Tax</span>
              {totals.sourceTaxCount > 0 && (
                <span className="ml-1 text-xs px-1.5 py-0.2 rounded-full bg-slate-900/60 text-emerald-300 font-semibold border border-slate-600">
                  {totals.sourceTaxCount}
                </span>
              )}
            </button>

            {/* 4. Claim AIT */}
            <button
              onClick={() => handleNavClick('ait')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                activeNavTab === 'ait'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-200 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Claim AIT</span>
              {totals.aitCount > 0 && (
                <span className="ml-1 text-xs px-1.5 py-0.2 rounded-full bg-slate-900/60 text-emerald-300 font-semibold border border-slate-600">
                  {totals.aitCount}
                </span>
              )}
            </button>

            {/* Functional journey extensions: Payments & Adjustments */}
            <button
              onClick={() => handleNavClick('payments')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                activeNavTab === 'payments'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-200 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Payments</span>
              {totals.paymentsCount > 0 && (
                <span className="ml-1 text-xs px-1.5 py-0.2 rounded-full bg-slate-900/60 text-emerald-300 font-semibold border border-slate-600">
                  {totals.paymentsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNavClick('adjustments')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                activeNavTab === 'adjustments'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-200 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Adjustments</span>
              {totals.adjustmentsCount > 0 && (
                <span className="ml-1 text-xs px-1.5 py-0.2 rounded-full bg-slate-900/60 text-emerald-300 font-semibold border border-slate-600">
                  {totals.adjustmentsCount}
                </span>
              )}
            </button>
          </div>

          {/* 5. Tax Payment Status Modal Trigger */}
          <div className="hidden md:flex items-center">
            <button
              onClick={handleTaxPaymentStatusClick}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-md text-sm font-semibold shadow-sm transition-colors border border-emerald-500/50"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Tax Payment Status</span>
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-emerald-800 text-emerald-100 rounded">
                Reconciliation
              </span>
            </button>
          </div>

          {/* Mobile hamburger menu button */}
          <div className="flex md:hidden items-center justify-between w-full">
            <span className="text-sm font-semibold text-emerald-400 capitalize">
              {activeNavTab.replace('-', ' ')}
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleTaxPaymentStatusClick}
                className="bg-emerald-600 text-white px-2.5 py-1.5 rounded text-xs font-semibold"
              >
                Status
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-2 space-y-1 border-t border-slate-700">
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded text-sm text-left ${
                activeNavTab === 'dashboard' ? 'bg-emerald-700 text-white' : 'text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => handleNavClick('ledger-guide')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded text-sm text-left ${
                activeNavTab === 'ledger-guide' ? 'bg-emerald-700 text-white' : 'text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Ledger Guide</span>
            </button>
            <button
              onClick={() => handleNavClick('source-tax')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm text-left ${
                activeNavTab === 'source-tax' ? 'bg-emerald-700 text-white' : 'text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4" />
                <span>Claim Source Tax</span>
              </div>
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300">
                {totals.sourceTaxCount}
              </span>
            </button>
            <button
              onClick={() => handleNavClick('ait')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm text-left ${
                activeNavTab === 'ait' ? 'bg-emerald-700 text-white' : 'text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Car className="w-4 h-4" />
                <span>Claim AIT</span>
              </div>
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300">
                {totals.aitCount}
              </span>
            </button>
            <button
              onClick={() => handleNavClick('payments')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm text-left ${
                activeNavTab === 'payments' ? 'bg-emerald-700 text-white' : 'text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4" />
                <span>Payments</span>
              </div>
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300">
                {totals.paymentsCount}
              </span>
            </button>
            <button
              onClick={() => handleNavClick('adjustments')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm text-left ${
                activeNavTab === 'adjustments' ? 'bg-emerald-700 text-white' : 'text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4" />
                <span>Adjustments</span>
              </div>
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300">
                {totals.adjustmentsCount}
              </span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

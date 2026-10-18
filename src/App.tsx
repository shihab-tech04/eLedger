/**
 * NBR eReturn Ledger (eLedger)
 * Phase 0: Project Reconstruction
 * Main Application Component
 */

import React from 'react';
import { LedgerProvider, useLedger } from './context/LedgerContext.tsx';
import { Header } from './components/layout/Header.tsx';
import { Navbar } from './components/navigation/Navbar.tsx';
import { DashboardView } from './features/dashboard/DashboardView.tsx';
import { LedgerGuideView } from './features/ledger-guide/LedgerGuideView.tsx';
import { SourceTaxView } from './features/source-tax/SourceTaxView.tsx';
import { AitView } from './features/ait/AitView.tsx';
import { PaymentsView } from './features/payments/PaymentsView.tsx';
import { AdjustmentsView } from './features/adjustments/AdjustmentsView.tsx';
import { TaxPaymentStatusModal } from './components/modals/TaxPaymentStatusModal.tsx';
import { Shield, FileCheck2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { activeNavTab, isStatusModalOpen, setIsStatusModalOpen } = useLedger();

  const renderActiveView = () => {
    switch (activeNavTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'ledger-guide':
        return <LedgerGuideView />;
      case 'source-tax':
        return <SourceTaxView />;
      case 'ait':
        return <AitView />;
      case 'payments':
        return <PaymentsView />;
      case 'adjustments':
        return <AdjustmentsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 antialiased font-sans">
      {/* Official Gov Header */}
      <Header />

      {/* Single-Level Navigation Bar */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {renderActiveView()}
      </main>

      {/* Tax Payment Status Modal (Requirement #7) */}
      <TaxPaymentStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />

      {/* Official Government Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 mt-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              National Board of Revenue (NBR) • Government of the People&apos;s Republic of Bangladesh
            </span>
          </div>

          <div className="flex items-center space-x-4 text-slate-500">
            <span>Income Tax Act 2023 Statutory Compliance</span>
            <span>•</span>
            <button
              onClick={() => setIsStatusModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors flex items-center space-x-1"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Tax Payment Status</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <LedgerProvider>
      <AppContent />
    </LedgerProvider>
  );
}

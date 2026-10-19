/**
 * NBR eReturn Ledger (eLedger)
 * Phase 0: Project Reconstruction
 * Main Application Component
 */

import React from 'react';
import { LedgerProvider, useLedger } from './context/LedgerContext.tsx';
import { Header } from './components/layout/Header.tsx';
import { Sidebar } from './components/navigation/Sidebar.tsx';
import { DashboardView } from './features/dashboard/DashboardView.tsx';
import { LedgerGuideView } from './features/ledger-guide/LedgerGuideView.tsx';
import { SourceTaxView } from './features/source-tax/SourceTaxView.tsx';
import { AitView } from './features/ait/AitView.tsx';
import { PaymentsView } from './features/payments/PaymentsView.tsx';
import { AdjustmentsView } from './features/adjustments/AdjustmentsView.tsx';
import { TaxPaymentStatusModal } from './components/modals/TaxPaymentStatusModal.tsx';

const AppContent: React.FC = () => {
  const { activeNavTab, activeRouteId, taxpayer, assessmentYear, isStatusModalOpen, setIsStatusModalOpen, loadError } = useLedger();
  // Discard unsaved form/lookup state when the route or taxpayer context changes.
  const workflowKey = `${taxpayer.tin}:${assessmentYear}:${activeRouteId}`;

  const renderActiveView = () => {
    switch (activeNavTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'ledger-guide':
        return <LedgerGuideView />;
      case 'source-tax':
        return <SourceTaxView key={workflowKey} />;
      case 'ait':
        return <AitView key={workflowKey} />;
      case 'payments':
        return <PaymentsView key={workflowKey} />;
      case 'adjustments':
        return <AdjustmentsView key={workflowKey} />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="eledger-app min-h-screen text-slate-800 antialiased font-sans">
      <Header />
      <div className="eledger-workspace">
        <Sidebar />
        <div className="eledger-stage">
          {loadError && (
            <div role="alert" className="eledger-load-error">
              <strong>Saved ledger unavailable.</strong> {loadError} No saved records were overwritten.
              Use Download Local Backup in the header to preserve original browser data before recovery.
            </div>
          )}
          <main className="eledger-main">{renderActiveView()}</main>
          <footer className="eledger-footer">
            <span>National Board of Revenue • eReturn Ledger</span>
            <span>Assessment year: {assessmentYear}</span>
          </footer>
        </div>
      </div>

      {/* Tax Payment Status Modal (Requirement #7) */}
      <TaxPaymentStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />

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

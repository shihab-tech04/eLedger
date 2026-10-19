/**
 * Application Header
 * Government of Bangladesh - National Board of Revenue eReturn Ledger
 */

import React, { useState } from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { AssessmentYear } from '../../domain/models.ts';
import { Building2, Calendar, User, FileText, Download } from 'lucide-react';
import { createLocalLedgerBackup } from '../../services/ledgerBackup.ts';

export const Header: React.FC = () => {
  const [backupError, setBackupError] = useState<string | null>(null);
  const {
    taxpayer,
    setTaxpayer,
    availableTaxpayers,
    assessmentYear,
    setAssessmentYear,
  } = useLedger();

  const downloadLocalBackup = () => {
    setBackupError(null);
    try {
      const snapshot = createLocalLedgerBackup(window.localStorage);
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `eledger-local-backup-${snapshot.createdAt.slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      setBackupError('Local backup could not be downloaded. Your saved data has not been changed.');
    }
  };

  return (
    <header className="bg-emerald-900 text-white border-b border-emerald-950 shadow-sm">
      {/* Top Gov Banner */}
      <div className="bg-emerald-950/80 px-4 py-1.5 text-xs text-emerald-200 border-b border-emerald-900/50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-medium">Government of the People&apos;s Republic of Bangladesh</span>
          </div>
          <div className="flex items-center space-x-4 text-emerald-300">
            <span>National Board of Revenue (NBR)</span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">eReturn Tax & Payment Ledger</span>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo & System Title */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg bg-emerald-800 border border-emerald-700 flex items-center justify-center shadow-inner text-emerald-100 flex-shrink-0">
              <FileText className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  NBR eReturn Ledger
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-800 text-emerald-200 border border-emerald-700">
                  eLedger
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-200">
                Source Tax, Advance Income Tax (AIT) & Payment Reconciliation System
              </p>
            </div>
          </div>

          {/* Taxpayer Info & Context Switchers */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-emerald-800/60 p-2 sm:p-2.5 rounded-lg border border-emerald-700/60 text-xs sm:text-sm">
            {/* Taxpayer Selector */}
            <div className="flex items-center space-x-1.5">
              <User className="w-4 h-4 text-emerald-300" />
              <label htmlFor="taxpayer-select" className="sr-only">Select Taxpayer</label>
              <select
                id="taxpayer-select"
                value={taxpayer.tin}
                onChange={(e) => {
                  const selected = availableTaxpayers.find((t) => t.tin === e.target.value);
                  if (selected) setTaxpayer(selected);
                }}
                className="bg-emerald-950 text-white text-xs rounded px-2 py-1.5 border border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-400 font-medium"
              >
                {availableTaxpayers.map((tp) => (
                  <option key={tp.tin} value={tp.tin}>
                    {tp.name} (TIN: {tp.tin})
                  </option>
                ))}
              </select>
            </div>

            {/* Assessment Year Selector */}
            <div className="flex items-center space-x-1.5 border-l border-emerald-700/80 pl-2">
              <Calendar className="w-4 h-4 text-emerald-300" />
              <label htmlFor="ay-select" className="text-xs text-emerald-200 font-medium">AY:</label>
              <select
                id="ay-select"
                value={assessmentYear}
                onChange={(e) => setAssessmentYear(e.target.value as AssessmentYear)}
                className="bg-emerald-950 text-white text-xs font-semibold rounded px-2 py-1.5 border border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                <option value="2026-2027">2026-2027 (Current)</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
              </select>
            </div>

            {/* Circle & Zone details badge */}
            <div className="hidden lg:flex items-center space-x-1.5 border-l border-emerald-700/80 pl-2 text-xs text-emerald-200">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{taxpayer.circle}, {taxpayer.taxesZone}</span>
            </div>

          </div>

            <button
              type="button"
              onClick={downloadLocalBackup}
              title="Download local ledger backup (all saved contexts)"
              aria-label="Download Local Backup"
              className="p-1.5 rounded hover:bg-emerald-700 text-emerald-300 hover:text-white transition-colors border border-emerald-700"
            >
              <Download className="w-4 h-4" />
            </button>
        </div>
          {backupError && <p role="alert" className="text-xs text-rose-100 bg-rose-800 border border-rose-600 rounded p-2">{backupError}</p>}
      </div>
    </header>
  );
};

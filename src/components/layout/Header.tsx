import React, { useState } from 'react';
import { Download, Landmark } from 'lucide-react';
import { useLedger } from '../../context/LedgerContext.tsx';
import type { AssessmentYear } from '../../domain/models.ts';
import { createLocalLedgerBackup } from '../../services/ledgerBackup.ts';

/** The light, single-row eReturn Ledger masthead used by the reference UI. */
export const Header: React.FC = () => {
  const [backupError, setBackupError] = useState<string | null>(null);
  const { taxpayer, setTaxpayer, availableTaxpayers, assessmentYear, setAssessmentYear } = useLedger();

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
    <header className="eledger-header">
      <div className="eledger-header-main">
        <div className="eledger-brand" aria-label="eReturn Ledger">
          <div className="eledger-brand-mark" aria-hidden="true">eR</div>
          <div className="eledger-brand-words"><strong>eReturn</strong><span>LEDGER</span></div>
        </div>
        <div className="eledger-agency">
          <div className="eledger-agency-emblem"><Landmark size={22} strokeWidth={1.7}/></div>
          <div><strong>NATIONAL BOARD OF REVENUE</strong><span>Government of the People&apos;s Republic of Bangladesh</span></div>
        </div>
        <div className="eledger-header-controls">
          <label htmlFor="ay-select">Assessment Year</label>
          <select id="ay-select" value={assessmentYear} onChange={(event) => setAssessmentYear(event.target.value as AssessmentYear)}>
            <option value="2026-2027">2026-2027</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2024-2025">2024-2025</option>
          </select>
          <div className="eledger-header-divider" />
          <label htmlFor="taxpayer-select" className="sr-only">Select Taxpayer</label>
          <div className="eledger-taxpayer-select">
            <span aria-hidden="true">{taxpayer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
            <select id="taxpayer-select" value={taxpayer.tin} onChange={(event) => {
              const selected = availableTaxpayers.find((item) => item.tin === event.target.value);
              if (selected) setTaxpayer(selected);
            }}>
              {availableTaxpayers.map((item) => <option key={item.tin} value={item.tin}>{item.name}</option>)}
            </select>
          </div>
          <button type="button" onClick={downloadLocalBackup} className="eledger-backup"
            aria-label="Download Local Backup" title="Download Local Backup"><Download size={18}/></button>
        </div>
      </div>
      {backupError && <p className="eledger-backup-error" role="alert">{backupError}</p>}
    </header>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, ChevronDown, Download } from 'lucide-react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerLanguage } from '../../context/LanguageContext.tsx';
import type { AssessmentYear } from '../../domain/models.ts';
import { createLocalLedgerBackup } from '../../services/ledgerBackup.ts';

/** Masthead reconstructed from the user's 20–21 September custom eLedger captures. */
export const Header: React.FC = () => {
  const [backupError, setBackupError] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { taxpayer, setTaxpayer, availableTaxpayers, assessmentYear, setAssessmentYear } = useLedger();
  const { language, setLanguage } = useLedgerLanguage();

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
      if (!notificationRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

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
      setProfileOpen(false);
    } catch {
      setBackupError('Local backup could not be downloaded. Your saved data has not been changed.');
    }
  };

  const initials = taxpayer.name.split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase();

  return (
    <header className="eledger-header">
      <div className="eledger-header-main">
        <div className="eledger-brand" aria-label="eReturn Ledger">
          <div className="eledger-brand-mark" aria-hidden="true">eR</div>
          <div className="eledger-brand-words"><strong>eReturn</strong><span>LEDGER</span></div>
        </div>
        <div className="eledger-agency">
          <strong>NATIONAL BOARD OF REVENUE</strong>
          <span>Government of the People&apos;s Republic of Bangladesh</span>
        </div>
        <div className="eledger-header-controls">
          <label htmlFor="ay-select" className="eledger-assessment">
            <strong>{language === 'en' ? 'Assessment Year :' : 'করবর্ষ :'}</strong>
            <select id="ay-select" value={assessmentYear} onChange={(event) => setAssessmentYear(event.target.value as AssessmentYear)}>
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
            </select>
          </label>
          <div className="eledger-language-switch" role="group" aria-label="Display language">
            <button type="button" lang="bn" className={language === 'bn' ? 'is-active' : ''}
              aria-pressed={language === 'bn'} onClick={() => setLanguage('bn')}>বাংলা</button>
            <button type="button" lang="en" className={language === 'en' ? 'is-active' : ''}
              aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button>
          </div>
          <div className="eledger-header-popover" ref={notificationRef}>
            <button type="button" className="eledger-notification-button" aria-label="Notifications"
              aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }}>
              <Bell size={17}/>
            </button>
            {notificationsOpen && <div className="eledger-popover eledger-notification-panel" role="status">
              <strong>{language === 'en' ? 'Notifications' : 'বিজ্ঞপ্তি'}</strong>
              <p>{language === 'en' ? 'No new notifications.' : 'কোনো নতুন বিজ্ঞপ্তি নেই।'}</p>
            </div>}
          </div>
          <div className="eledger-header-popover" ref={profileRef}>
            <button type="button" className="eledger-taxpayer-button" aria-label={'Taxpayer: ' + taxpayer.name + '. Open profile menu'}
              aria-expanded={profileOpen} onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }}>
              <span className="eledger-taxpayer-avatar" aria-hidden="true">{initials}</span>
              <span className="eledger-taxpayer-identity"><strong>{taxpayer.name}</strong><small>{language === 'en' ? 'Taxpayer' : 'করদাতা'}</small></span>
              <ChevronDown size={14}/>
            </button>
            {profileOpen && <div className="eledger-popover eledger-profile-menu">
              <p className="eledger-profile-title">{language === 'en' ? 'Select taxpayer' : 'করদাতা নির্বাচন করুন'}</p>
              {availableTaxpayers.map((option) => <button type="button" key={option.tin}
                className="eledger-profile-option" onClick={() => { setTaxpayer(option); setProfileOpen(false); }}>
                <span>{option.name}</span>{option.tin === taxpayer.tin && <Check size={15} aria-label="Selected"/>}
              </button>)}
              <button type="button" className="eledger-profile-backup" onClick={downloadLocalBackup}>
                <Download size={15}/>{language === 'en' ? 'Download Local Backup' : 'স্থানীয় ব্যাকআপ ডাউনলোড'}
              </button>
            </div>}
          </div>
        </div>
      </div>
      {backupError && <p className="eledger-backup-error" role="alert">{backupError}</p>}
    </header>
  );
};

import React, { createContext, useContext, useEffect, useState } from 'react';

export type LedgerLanguage = 'en' | 'bn';

type LanguageContextValue = {
  language: LedgerLanguage;
  setLanguage: (language: LedgerLanguage) => void;
};

// Standalone embedded/SSR components retain English when no language provider is present.
const LanguageContext = createContext<LanguageContextValue>({ language: 'en', setLanguage: () => {} });

const LANGUAGE_STORAGE_KEY = 'eledger:display-language';

export function LanguageProvider({ children, initialLanguage }: { children?: React.ReactNode; initialLanguage?: LedgerLanguage }) {
  const [language, setLanguage] = useState<LedgerLanguage>(() => {
    if (initialLanguage) return initialLanguage;
    try {
      const stored = typeof window === 'undefined' ? null : window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return stored === 'bn' ? 'bn' : 'en';
    } catch { return 'en'; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language); } catch { /* Private browsing may deny persistence. */ }
  }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLedgerLanguage() {
  return useContext(LanguageContext);
}

/** Page-level bilingual copy without altering stored financial data or identifiers. */
export function useLedgerCopy() {
  const { language } = useLedgerLanguage();
  return (english: string, bengali: string) => language === 'bn' ? bengali : english;
}

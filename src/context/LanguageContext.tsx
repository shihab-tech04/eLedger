import React, { createContext, useContext, useState } from 'react';

export type LedgerLanguage = 'en' | 'bn';

type LanguageContextValue = {
  language: LedgerLanguage;
  setLanguage: (language: LedgerLanguage) => void;
};

// Standalone embedded/SSR components retain English when no language provider is present.
const LanguageContext = createContext<LanguageContextValue>({ language: 'en', setLanguage: () => {} });

export function LanguageProvider({ children, initialLanguage = 'en' }: { children?: React.ReactNode; initialLanguage?: LedgerLanguage }) {
  const [language, setLanguage] = useState<LedgerLanguage>(initialLanguage);
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

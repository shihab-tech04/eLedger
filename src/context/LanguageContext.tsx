import React, { createContext, useContext, useState } from 'react';

export type LedgerLanguage = 'en' | 'bn';

type LanguageContextValue = {
  language: LedgerLanguage;
  setLanguage: (language: LedgerLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LedgerLanguage>('en');
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLedgerLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('Ledger language context is unavailable.');
  return context;
}

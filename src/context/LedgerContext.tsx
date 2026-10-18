/**
 * Ledger Context and State Management
 * Coordinates taxpayer selection, assessment year isolation, and reactive ledger entries
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  TaxpayerContext,
  AssessmentYear,
  LedgerEntry,
  TaxCategoryTotals,
  LedgerRouteId,
} from '../domain/models.ts';
import { DEFAULT_TAXPAYERS } from '../data/seedData.ts';
import { ledgerRepository } from '../services/ledgerRepository.ts';
import { incomeSyncService } from '../services/incomeSyncService.ts';
import { calculateCategoryTotals } from '../domain/calculations.ts';
import { validateLedgerEntry, ValidationResult } from '../domain/validation.ts';

interface LedgerContextType {
  taxpayer: TaxpayerContext;
  setTaxpayer: (tp: TaxpayerContext) => void;
  availableTaxpayers: TaxpayerContext[];
  assessmentYear: AssessmentYear;
  setAssessmentYear: (ay: AssessmentYear) => void;
  entries: LedgerEntry[];
  isLoading: boolean;
  totals: TaxCategoryTotals;
  activeNavTab: 'dashboard' | 'ledger-guide' | 'source-tax' | 'ait' | 'payments' | 'adjustments';
  setActiveNavTab: (tab: 'dashboard' | 'ledger-guide' | 'source-tax' | 'ait' | 'payments' | 'adjustments') => void;
  activeRouteId: LedgerRouteId;
  setActiveRouteId: (routeId: LedgerRouteId) => void;
  isStatusModalOpen: boolean;
  setIsStatusModalOpen: (open: boolean) => void;
  addEntry: (entryData: Omit<LedgerEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; entry?: LedgerEntry; validation?: ValidationResult }>;
  updateEntry: (id: string, patch: Partial<LedgerEntry>) => Promise<{ success: boolean; entry?: LedgerEntry; validation?: ValidationResult }>;
  deleteEntry: (id: string) => Promise<boolean>;
  syncIncomeItem: (itemId: string, sectionCode: string) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const LedgerContext = createContext<LedgerContextType | null>(null);

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [availableTaxpayers] = useState<TaxpayerContext[]>(DEFAULT_TAXPAYERS);
  const [taxpayer, setTaxpayerState] = useState<TaxpayerContext>(DEFAULT_TAXPAYERS[0]);
  const [assessmentYear, setAssessmentYearState] = useState<AssessmentYear>('2026-2027');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeNavTab, setActiveNavTab] = useState<'dashboard' | 'ledger-guide' | 'source-tax' | 'ait' | 'payments' | 'adjustments'>('dashboard');
  const [activeRouteId, setActiveRouteId] = useState<LedgerRouteId>('salary-ibas');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);

  // Load entries for current taxpayer TIN and assessment year
  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ledgerRepository.getEntries(taxpayer.tin, assessmentYear);
      setEntries(data);
    } catch (err) {
      console.error('Error fetching ledger entries:', err);
    } finally {
      setIsLoading(false);
    }
  }, [taxpayer.tin, assessmentYear]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const setTaxpayer = (tp: TaxpayerContext) => {
    setTaxpayerState(tp);
  };

  const setAssessmentYear = (ay: AssessmentYear) => {
    setAssessmentYearState(ay);
  };

  // Purely dynamic totals derived directly from underlying entries
  const totals = useMemo(() => {
    return calculateCategoryTotals(entries);
  }, [entries]);

  const addEntry = async (
    entryData: Omit<LedgerEntry, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const validation = validateLedgerEntry(entryData, entries);
    if (!validation.isValid) {
      return { success: false, validation };
    }

    const created = await ledgerRepository.addEntry({
      ...entryData,
      taxpayerTin: taxpayer.tin,
      assessmentYear: assessmentYear,
    });

    await loadEntries();
    return { success: true, entry: created };
  };

  const updateEntry = async (id: string, patch: Partial<LedgerEntry>) => {
    const currentEntry = entries.find((e) => e.id === id);
    if (!currentEntry) {
      return {
        success: false,
        validation: {
          isValid: false,
          errors: { general: 'Entry not found' },
        },
      };
    }

    const merged = { ...currentEntry, ...patch };
    const validation = validateLedgerEntry(merged, entries, id);
    if (!validation.isValid) {
      return { success: false, validation };
    }

    const updated = await ledgerRepository.updateEntry(id, patch);
    await loadEntries();
    return { success: true, entry: updated };
  };

  const deleteEntry = async (id: string) => {
    const success = await ledgerRepository.deleteEntry(id);
    if (success) {
      await loadEntries();
    }
    return success;
  };

  const syncIncomeItem = async (itemId: string, sectionCode: string) => {
    const res = await incomeSyncService.syncItemToLedger(itemId, sectionCode);
    if (res.success) {
      await loadEntries();
    }
    return res;
  };

  const refreshData = async () => {
    await loadEntries();
  };

  const resetToDefaults = async () => {
    await ledgerRepository.resetToDefaults();
    await incomeSyncService.resetSyncItems();
    await loadEntries();
  };

  return (
    <LedgerContext.Provider
      value={{
        taxpayer,
        setTaxpayer,
        availableTaxpayers,
        assessmentYear,
        setAssessmentYear,
        entries,
        isLoading,
        totals,
        activeNavTab,
        setActiveNavTab,
        activeRouteId,
        setActiveRouteId,
        isStatusModalOpen,
        setIsStatusModalOpen,
        addEntry,
        updateEntry,
        deleteEntry,
        syncIncomeItem,
        refreshData,
        resetToDefaults,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
};

export function useLedger() {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
}

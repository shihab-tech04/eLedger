/**
 * Income Sync Service Adapter
 * Manages syncing eReturn declared income sources into Ledger entries
 */

import { IncomeSyncItem, LedgerEntry, AssessmentYear } from '../domain/models.ts';
import { INITIAL_INCOME_SYNC_ITEMS } from '../data/seedData.ts';
import { ledgerRepository } from './ledgerRepository.ts';

const SYNC_STORAGE_KEY = 'nbr_eledger_income_sync_v1';

export class IncomeSyncService {
  private loadItems(): IncomeSyncItem[] {
    if (typeof window === 'undefined') {
      return [...INITIAL_INCOME_SYNC_ITEMS];
    }
    try {
      const data = localStorage.getItem(SYNC_STORAGE_KEY);
      if (!data) {
        localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(INITIAL_INCOME_SYNC_ITEMS));
        return [...INITIAL_INCOME_SYNC_ITEMS];
      }
      return JSON.parse(data) as IncomeSyncItem[];
    } catch {
      return [...INITIAL_INCOME_SYNC_ITEMS];
    }
  }

  private saveItems(items: IncomeSyncItem[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(items));
      } catch (err) {
        console.error('Failed to save income sync items:', err);
      }
    }
  }

  async getSyncItemsForRoute(
    taxpayerTin: string,
    assessmentYear: AssessmentYear,
    routeId: string
  ): Promise<IncomeSyncItem[]> {
    const items = this.loadItems();
    const ledgerEntries = await ledgerRepository.getEntries(taxpayerTin, assessmentYear);
    return items.filter(
      (item) =>
        item.taxpayerTin === taxpayerTin &&
        item.assessmentYear === assessmentYear &&
        item.routeId === routeId
    ).map((item) => ({
      ...item,
      // The ledger is the source of truth after a row has been deleted.
      isSyncedToLedger: ledgerEntries.some(
        (entry) => entry.routeId === item.routeId &&
          entry.referenceNo === item.accountOrCertificateNo
      ),
    }));
  }

  async syncItemToLedger(
    itemId: string,
    sectionCode: string,
    expectedTin: string,
    expectedAssessmentYear: AssessmentYear
  ): Promise<{ success: boolean; entry?: LedgerEntry; error?: string }> {
    const items = this.loadItems();
    const itemIndex = items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) {
      return { success: false, error: 'Income source item not found.' };
    }

    const item = items[itemIndex];
    if (item.taxpayerTin !== expectedTin || item.assessmentYear !== expectedAssessmentYear) {
      return { success: false, error: 'Taxpayer or assessment year does not match the selected context.' };
    }

    const existing = await ledgerRepository.getEntries(expectedTin, expectedAssessmentYear);
    if (existing.some((entry) =>
      entry.routeId === item.routeId && entry.referenceNo === item.accountOrCertificateNo
    )) {
      return { success: false, error: 'This income source is already synchronized to ledger.' };
    }

    // Add to ledger
    const newEntry = await ledgerRepository.addEntry({
      taxpayerTin: item.taxpayerTin,
      assessmentYear: item.assessmentYear,
      category: item.category,
      routeId: item.routeId,
      referenceNo: item.accountOrCertificateNo,
      sourceEntity: item.payerName,
      sectionCode: sectionCode || 'Sec 102',
      grossAmount: item.reportedGrossIncome,
      taxDeducted: item.calculatedTaxCredit,
      date: item.syncDate,
      status: 'SYNCED',
      workflow: 'SYNC_FROM_INCOME',
      isManual: false,
      externalVerified: false,
      remarks: `Synchronized from eReturn Income Head: ${item.sourceHead}`,
    });

    // Mark synced
    items[itemIndex].isSyncedToLedger = true;
    this.saveItems(items);

    return { success: true, entry: newEntry };
  }

  async resetSyncItems(): Promise<void> {
    this.saveItems([...INITIAL_INCOME_SYNC_ITEMS]);
  }
}

export const incomeSyncService = new IncomeSyncService();

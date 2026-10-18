/**
 * Ledger Repository Interface and Local Storage Adapter
 * Decouples persistence from UI components for seamless transition to future REST/GraphQL APIs
 */

import { LedgerEntry, AssessmentYear } from '../domain/models.ts';
import { INITIAL_LEDGER_ENTRIES } from '../data/seedData.ts';

const STORAGE_KEY = 'nbr_eledger_entries_v1';

export interface ILedgerRepository {
  getEntries(taxpayerTin: string, assessmentYear: AssessmentYear): Promise<LedgerEntry[]>;
  getAllEntries(): Promise<LedgerEntry[]>;
  getEntryById(id: string): Promise<LedgerEntry | undefined>;
  addEntry(entry: Omit<LedgerEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<LedgerEntry>;
  updateEntry(id: string, patch: Partial<LedgerEntry>): Promise<LedgerEntry>;
  deleteEntry(id: string): Promise<boolean>;
  resetToDefaults(): Promise<void>;
}

export class LocalStorageLedgerRepository implements ILedgerRepository {
  private inMemoryCache: LedgerEntry[] | null = null;

  private loadRaw(): LedgerEntry[] {
    if (typeof window === 'undefined') {
      return [...INITIAL_LEDGER_ENTRIES];
    }
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_LEDGER_ENTRIES));
        return [...INITIAL_LEDGER_ENTRIES];
      }
      return JSON.parse(data) as LedgerEntry[];
    } catch {
      return [...INITIAL_LEDGER_ENTRIES];
    }
  }

  private saveRaw(entries: LedgerEntry[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch (err) {
        console.error('Failed to save to localStorage:', err);
      }
    }
    this.inMemoryCache = entries;
  }

  async getAllEntries(): Promise<LedgerEntry[]> {
    if (!this.inMemoryCache) {
      this.inMemoryCache = this.loadRaw();
    }
    return [...this.inMemoryCache];
  }

  async getEntries(taxpayerTin: string, assessmentYear: AssessmentYear): Promise<LedgerEntry[]> {
    const all = await this.getAllEntries();
    return all.filter(
      (entry) =>
        entry.taxpayerTin === taxpayerTin && entry.assessmentYear === assessmentYear
    );
  }

  async getEntryById(id: string): Promise<LedgerEntry | undefined> {
    const all = await this.getAllEntries();
    return all.find((e) => e.id === id);
  }

  async addEntry(
    entry: Omit<LedgerEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LedgerEntry> {
    const all = await this.getAllEntries();
    const now = new Date().toISOString();
    const newEntry: LedgerEntry = {
      ...entry,
      // This repository is local-only. It cannot mint verified tax credits.
      status: entry.status === 'SYNCED' ? 'SYNCED' : 'PENDING_VERIFICATION',
      externalVerified: false,
      verificationAuthority: undefined,
      id: `ledg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    all.push(newEntry);
    this.saveRaw(all);
    return newEntry;
  }

  async updateEntry(id: string, patch: Partial<LedgerEntry>): Promise<LedgerEntry> {
    const all = await this.getAllEntries();
    const index = all.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error(`Ledger entry with ID '${id}' not found.`);
    }
    const updated: LedgerEntry = {
      ...all[index],
      ...patch,
      // Editing a local row must not grant verification or move its ownership.
      taxpayerTin: all[index].taxpayerTin,
      assessmentYear: all[index].assessmentYear,
      status: all[index].status === 'SYNCED' ? 'SYNCED' : 'PENDING_VERIFICATION',
      externalVerified: false,
      verificationAuthority: undefined,
      updatedAt: new Date().toISOString(),
    };
    all[index] = updated;
    this.saveRaw(all);
    return updated;
  }

  async deleteEntry(id: string): Promise<boolean> {
    const all = await this.getAllEntries();
    const filtered = all.filter((e) => e.id !== id);
    if (filtered.length === all.length) {
      return false;
    }
    this.saveRaw(filtered);
    return true;
  }

  async resetToDefaults(): Promise<void> {
    this.saveRaw([...INITIAL_LEDGER_ENTRIES]);
  }
}

export const ledgerRepository = new LocalStorageLedgerRepository();

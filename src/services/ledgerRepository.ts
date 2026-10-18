/**
 * Ledger Repository Interface and Local Storage Adapter
 * Decouples persistence from UI components for seamless transition to future REST/GraphQL APIs
 */

import { LedgerEntry, AssessmentYear } from '../domain/models.ts';
import { INITIAL_LEDGER_ENTRIES } from '../data/seedData.ts';
import { validateLedgerEntry } from '../domain/validation.ts';

const STORAGE_KEY = 'nbr_eledger_entries_v1';
type LedgerStorage = Pick<Storage, 'getItem' | 'setItem'>;

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

  constructor(private readonly storage: LedgerStorage | null =
    typeof window === 'undefined' ? null : window.localStorage) {}

  private loadRaw(): LedgerEntry[] {
    if (!this.storage) {
      return INITIAL_LEDGER_ENTRIES.map((entry) => ({ ...entry }));
    }
    try {
      const data = this.storage.getItem(STORAGE_KEY);
      if (!data) {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_LEDGER_ENTRIES));
        return INITIAL_LEDGER_ENTRIES.map((entry) => ({ ...entry }));
      }
      const parsed: unknown = JSON.parse(data);
      if (!Array.isArray(parsed) || !parsed.every((entry) =>
        entry !== null && typeof entry === 'object' &&
        typeof entry.id === 'string' && typeof entry.taxpayerTin === 'string' &&
        typeof entry.assessmentYear === 'string' && typeof entry.routeId === 'string'
      )) {
        throw new Error('Stored entries have an invalid structure.');
      }
      return parsed as LedgerEntry[];
    } catch {
      // Never overwrite a user's unreadable saved data with demo defaults.
      throw new Error('Saved ledger data could not be read. The stored data was left unchanged.');
    }
  }

  private saveRaw(entries: LedgerEntry[]): void {
    if (this.storage) {
      try {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch {
        throw new Error('Ledger changes could not be saved to browser storage.');
      }
    }
    this.inMemoryCache = entries.map((entry) => ({ ...entry }));
  }

  async getAllEntries(): Promise<LedgerEntry[]> {
    if (!this.inMemoryCache) {
      this.inMemoryCache = this.loadRaw();
    }
    return this.inMemoryCache.map((entry) => ({ ...entry }));
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
    const validation = validateLedgerEntry(entry, all);
    if (!validation.isValid) {
      throw new Error(Object.values(validation.errors)[0]);
    }
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
    const original = all[index];
    const updated: LedgerEntry = {
      ...original,
      ...patch,
      // All provenance, classification, ownership and identity fields are immutable.
      id: original.id,
      createdAt: original.createdAt,
      taxpayerTin: original.taxpayerTin,
      assessmentYear: original.assessmentYear,
      routeId: original.routeId,
      category: original.category,
      workflow: original.workflow,
      isManual: original.isManual,
      status: original.status === 'SYNCED' ? 'SYNCED' : 'PENDING_VERIFICATION',
      externalVerified: false,
      verificationAuthority: undefined,
      updatedAt: new Date().toISOString(),
    };
    const validation = validateLedgerEntry(updated, all, id);
    if (!validation.isValid) {
      throw new Error(Object.values(validation.errors)[0]);
    }
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
    this.saveRaw(INITIAL_LEDGER_ENTRIES.map((entry) => ({ ...entry })));
  }
}

export const ledgerRepository = new LocalStorageLedgerRepository();

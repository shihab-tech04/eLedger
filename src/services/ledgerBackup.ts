import { LEDGER_STORAGE_KEY } from './ledgerRepository.ts';
import { SYNC_STORAGE_KEY } from './incomeSyncService.ts';

export interface LocalLedgerBackup {
  format: 'eledger-local-backup-v1';
  createdAt: string;
  storage: {
    [LEDGER_STORAGE_KEY]: string | null;
    [SYNC_STORAGE_KEY]: string | null;
  };
}

/** Export the ORIGINAL persisted bytes, including unreadable JSON, without changing any storage key. */
export function createLocalLedgerBackup(
  storage: Pick<Storage, 'getItem'>,
  createdAt: string = new Date().toISOString()
): LocalLedgerBackup {
  return {
    format: 'eledger-local-backup-v1',
    createdAt,
    storage: {
      [LEDGER_STORAGE_KEY]: storage.getItem(LEDGER_STORAGE_KEY),
      [SYNC_STORAGE_KEY]: storage.getItem(SYNC_STORAGE_KEY),
    },
  };
}

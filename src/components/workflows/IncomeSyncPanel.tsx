/**
 * Income Sync Panel Component
 * Supports Workflow Pattern #3: Sync from Income
 * Used by Bank/FI, Dividend, Sanchayapatra, and Service Payment
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { useLedgerCopy } from '../../context/LanguageContext.tsx';
import { IncomeSyncItem } from '../../domain/models.ts';
import { incomeSyncService } from '../../services/incomeSyncService.ts';
import { formatCurrencyBDT } from '../../domain/calculations.ts';
import { RefreshCw, CheckCircle, ArrowDownToLine, AlertCircle } from 'lucide-react';

interface IncomeSyncPanelProps {
  routeId: string;
  defaultSection: string;
  title: string;
}

export const IncomeSyncPanel: React.FC<IncomeSyncPanelProps> = ({
  routeId,
  defaultSection,
  title,
}) => {
  const t = useLedgerCopy();
  const { taxpayer, assessmentYear, syncIncomeItem } = useLedger();
  const [items, setItems] = useState<IncomeSyncItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [sanchayapatraShares, setSanchayapatraShares] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await incomeSyncService.getSyncItemsForRoute(
        taxpayer.tin,
        assessmentYear,
        routeId
      );
      setItems(data);
    } catch {
      setMessage({ type: 'error', text: 'Failed to retrieve declared income sources.' });
    } finally {
      setLoading(false);
    }
  }, [taxpayer.tin, assessmentYear, routeId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSync = async (item: IncomeSyncItem) => {
    setSyncingId(item.id);
    setMessage(null);
    try {
      const claimedAmount = routeId === 'sanchayapatra'
        ? Number(sanchayapatraShares[item.id] ?? item.calculatedTaxCredit)
        : undefined;
      if (routeId === 'sanchayapatra' &&
          (claimedAmount === undefined || !Number.isFinite(claimedAmount) || claimedAmount <= 0 || claimedAmount > item.calculatedTaxCredit)) {
        setMessage({ type: 'error', text: 'Enter your positive share of the TDS, not exceeding the total deducted.' });
        setSyncingId(null);
        return;
      }
      const res = await syncIncomeItem(item.id, defaultSection, claimedAmount);
      if (res.success) {
        setMessage({
          type: 'success',
          text: `Recorded ${formatCurrencyBDT(claimedAmount ?? item.calculatedTaxCredit)} in the ledger for verification.`,
        });
        await fetchItems();
      } else {
        setMessage({
          type: 'error',
          text: res.error || 'Failed to sync income source into ledger.',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Sync operation failed.' });
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="text-xs sm:text-sm font-semibold text-slate-800">
              {t('Sync from eReturn Declared Income:','স্থানীয় ঘোষিত আয় থেকে সমন্বয়:')} {title}
            </h4>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
              {t('Workflow: Income Sync','কাজ: আয়ের রেকর্ড সমন্বয়')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('Local demonstration income-schedule deductions only; no live eReturn connection or official credit verification.','শুধু স্থানীয় নমুনা আয় বিবরণীর কর্তনের তথ্য; সরাসরি ই-রিটার্ন সংযোগ বা সরকারি ক্রেডিট যাচাই নেই।')}
          </p>
        </div>
        <button
          onClick={fetchItems}
          disabled={loading}
          className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('Refresh Declarations','ঘোষণা হালনাগাদ করুন')}</span>
        </button>
      </div>

      {message && (
        <div
          className={`mt-3 p-2.5 rounded text-xs flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="mt-3">
        {loading ? (
          <p className="text-xs text-slate-400 py-3 text-center">{t('Loading income declarations...','আয়ের ঘোষণা লোড হচ্ছে...')}</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">
            {t(`No pending declared income sources found for this head in AY ${assessmentYear}.`,`${assessmentYear} করবর্ষে এই খাতে কোনো অনিষ্পন্ন ঘোষিত আয়ের উৎস নেই।`)}
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-800">{item.payerName}</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      ({item.accountOrCertificateNo})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{item.sourceHead}</p>
                  <p className="text-[11px] text-slate-500">
                    {t('Gross Reported:','ঘোষিত মোট অঙ্ক:')} {formatCurrencyBDT(item.reportedGrossIncome)} | {t('Date:','তারিখ:')} {item.syncDate}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">{t('Calculated TDS','গণনাকৃত উৎস কর')}</span>
                    <span className="text-sm font-bold text-emerald-800 font-mono">
                      {formatCurrencyBDT(item.calculatedTaxCredit)}
                    </span>
                    {routeId === 'sanchayapatra' && !item.isSyncedToLedger && (
                      <label className="block mt-2 text-[11px] text-slate-600">
                        {t('Your TDS Claim (৳)','আপনার উৎস কর দাবি (৳)')}
                        <input
                          type="number"
                          min="0.01"
                          max={item.calculatedTaxCredit}
                          step="any"
                          value={sanchayapatraShares[item.id] ?? String(item.calculatedTaxCredit)}
                          onChange={(event) => setSanchayapatraShares((previous) => ({ ...previous, [item.id]: event.target.value }))}
                          className="block mt-1 w-32 rounded border border-slate-300 bg-white px-2 py-1 text-right font-mono text-xs"
                        />
                      </label>
                    )}
                  </div>

                  {item.isSyncedToLedger ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      {t('Synced to Ledger','লেজারে সমন্বিত')}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSync(item)}
                      disabled={syncingId === item.id}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold shadow-xs transition-colors disabled:opacity-60"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      <span>{syncingId === item.id ? t('Syncing...','সমন্বয় হচ্ছে...') : t('Sync to Ledger','লেজারে সমন্বয় করুন')}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Ledger Guide View
 * Comprehensive documentation of NBR eReturn Ledger workflows and statutory rules
 */

import React from 'react';
import {
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Workflow,
  HelpCircle,
  FileCheck2,
} from 'lucide-react';

export const LedgerGuideView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Title Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-emerald-800 text-white">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              NBR eReturn Ledger (eLedger) Operational Guide
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Statutory tax payment recording, source tax credit reconciliation, and assessment year workflows
            </p>
          </div>
        </div>
      </div>

      {/* Intended System Journey */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
          <Workflow className="w-4 h-4 text-emerald-700" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            1. Intended eReturn Ecosystem Journey
          </h3>
        </div>

        <p className="text-xs text-slate-600 mt-3 leading-relaxed">
          eLedger operates as an authoritative sub-ledger within the Bangladesh National Board of Revenue (NBR) digital tax filing infrastructure. The mandated taxpayer journey flows as:
        </p>

        <div className="mt-4 p-4 rounded-lg bg-slate-900 text-white overflow-x-auto">
          <div className="flex items-center space-x-2 text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap">
            <span className="px-3 py-1.5 rounded bg-emerald-800 border border-emerald-600">
              eReturn Portal
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700">
              Tax & Payment Stage
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700">
              Update Tax Payment Status
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="px-3 py-1.5 rounded bg-emerald-700 border border-emerald-500 font-bold">
              eLedger (Active App)
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700">
              Tax Payment Status Modal
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="px-3 py-1.5 rounded bg-emerald-800 border border-emerald-600">
              eReturn Final Return
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <strong className="text-slate-800 block mb-1">System Boundaries:</strong>
            This eLedger prototype organizes recorded payments, source tax (TDS) claims, AIT, and prior-return adjustments. It does not replace NBR TaxPay, official verification services, or tax assessment systems.
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <strong className="text-slate-800 block mb-1">Assessment Year Isolation:</strong>
            Tax credits and payment records are isolated strictly to the active taxpayer TIN and assessment year. Modifying records for AY 2026-2027 never bleeds into AY 2025-2026.
          </div>
        </div>
      </div>

      {/* The 8 Workflow Patterns */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            2. Reusable Workflow Architecture (8 Established Patterns)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-xs font-bold text-emerald-800 block">1. System Claim</span>
            <p className="text-xs text-slate-600 mt-1">
              Demonstration government salary deduction records modeled on iBAS++ (Sec 86/87). Live payroll synchronization and verification are not connected.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-xs font-bold text-emerald-800 block">2. Manual Ledger Entry</span>
            <p className="text-xs text-slate-600 mt-1">
              Clicking <strong>Add Entry</strong> inserts an inline editable row inside the table with input fields, Save, and Cancel. Supports row edit and deletion without separate modals.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-xs font-bold text-emerald-800 block">3. Sync from Income</span>
            <p className="text-xs text-slate-600 mt-1">
              Local demonstration import of income-related withholding records. Live eReturn income-schedule synchronization is not connected.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-xs font-bold text-emerald-800 block">4. Hybrid Income Sync + Manual Entry</span>
            <p className="text-xs text-slate-600 mt-1">
              Used in Service Payments & Contractor TDS (Sec 89/90) allowing both schedule sync and ad-hoc certificate entries.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-xs font-bold text-emerald-800 block">5. System Lookup (Fail-Closed)</span>
            <p className="text-xs text-slate-600 mt-1">
              Checks bundled local reference records (BRTA, A-Challan, Sec 154), validates taxpayer and assessment-year context, and fails closed on mismatches. No live registry is connected.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-xs font-bold text-emerald-800 block">6. System Records / Import</span>
            <p className="text-xs text-slate-600 mt-1">
              Batch processing for ASYCUDA customs bill of entry imports and port clearance withholding records.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-xs font-bold text-emerald-800 block">7. Single Claim Pattern</span>
            <p className="text-xs text-slate-600 mt-1">
              Section 163 prior-year minimum-tax adjustment with assessment and payment evidence tracking.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-xs font-bold text-emerald-800 block">8. Reconciliation Pattern</span>
            <p className="text-xs text-slate-600 mt-1">
              Compact Tax Payment Status modal summarizing all Source Tax, AIT, Payment, and Adjustment credits with fixed totals footer.
            </p>
          </div>
        </div>
      </div>

      {/* Statutory Rules & Duplicate Prevention */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
          <HelpCircle className="w-4 h-4 text-emerald-700" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            3. Verification & Duplicate Prevention Protocol
          </h3>
        </div>

        <div className="space-y-3 mt-3 text-xs text-slate-700">
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Duplicate Prevention:</strong> The system strictly rejects entries with identical reference/challan numbers within the same taxpayer TIN, assessment year, and route category.
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Amount Validation:</strong> Negative tax credits or tax amounts exceeding the reported gross payment are rejected immediately.
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Status Differentiation:</strong> Purely manual entries are classified as <code>PENDING_VERIFICATION</code> or <code>DRAFT</code> and never automatically marked as verified tax credits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

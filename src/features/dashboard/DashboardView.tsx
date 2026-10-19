import React from 'react';
import { useLedger } from '../../context/LedgerContext.tsx';
import { CURRENT_ROUTE_REGISTRY } from '../../domain/routeRegistry.ts';
import type { LedgerRouteId } from '../../domain/models.ts';
import {
  ArrowRight, BookOpen, CheckCircle2, ChevronRight, CircleAlert,
  FileCheck2, FileText, Landmark, ReceiptText, ShieldCheck, WalletCards,
} from 'lucide-react';

const amount = (value: number) => `৳ ${value.toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

export const DashboardView: React.FC = () => {
  const { taxpayer, assessmentYear, entries, totals, setActiveNavTab,
    setActiveRouteId, setIsStatusModalOpen } = useLedger();

  const recordedRoutes = new Set(entries.map((entry) => entry.routeId));
  const visibleRoutes = CURRENT_ROUTE_REGISTRY.filter((route) => route.group !== 'Tax Payment Status');
  const usedRoutes = visibleRoutes.filter((route) => recordedRoutes.has(route.id)).length;
  const progressPercent = Math.round((usedRoutes / visibleRoutes.length) * 100);
  const pendingEntries = entries.filter((entry) => !(
    entry.status === 'VERIFIED' && entry.externalVerified &&
    entry.verificationAuthority === 'AUTHORITATIVE' && !entry.isManual
  ));

  const goToRoute = (routeId: LedgerRouteId, group: string) => {
    setActiveRouteId(routeId);
    if (group === 'Source Tax') setActiveNavTab('source-tax');
    else if (group === 'AIT') setActiveNavTab('ait');
    else if (group === 'Payment') setActiveNavTab('payments');
    else if (group === 'Adjustment') setActiveNavTab('adjustments');
    else setIsStatusModalOpen(true);
  };

  const cards = [
    { id: 'source', label: 'Source Tax', value: totals.sourceTaxTotal, count: totals.sourceTaxCount,
      caption: 'recorded claims', className: 'source', icon: ReceiptText, action: () => setActiveNavTab('source-tax') },
    { id: 'ait', label: 'Advance Income Tax (AIT)', value: totals.aitTotal, count: totals.aitCount,
      caption: 'recorded claims', className: 'ait', icon: FileText, action: () => setActiveNavTab('ait') },
    { id: 'other', label: 'Other Tax Credits', value: totals.paymentsTotal + totals.adjustmentsTotal,
      count: totals.paymentsCount + totals.adjustmentsCount, caption: 'recorded payments and adjustments',
      className: 'payment', icon: WalletCards, action: () => setActiveNavTab('payments') },
    { id: 'verified', label: 'Verified Tax Credit', value: totals.grandTotalCredits,
      count: entries.length - pendingEntries.length, caption: 'externally confirmed records',
      className: 'verified', icon: ShieldCheck, action: () => setIsStatusModalOpen(true) },
  ];

  return (
    <div className="eledger-dashboard">
      <div className="eledger-breadcrumb"><span>Dashboard</span></div>
      <section className="eledger-welcome">
        <div>
          <span className="eledger-eyebrow">Welcome to</span>
          <h1>eReturn Ledger</h1>
          <p>Review, claim and reconcile your tax payments and credits for Assessment Year {assessmentYear}.</p>
          <div className="eledger-context-line"><Landmark size={15}/><span>{taxpayer.name} · TIN {taxpayer.tin}</span></div>
        </div>
        <div className="eledger-hero-art" aria-hidden="true">
          <div className="eledger-hero-document"><FileText size={48}/><div className="eledger-hero-lines"><i/><i/><i/></div></div>
          <div className="eledger-hero-check"><ShieldCheck size={35}/></div>
        </div>
      </section>

      <section className="eledger-summary-cards" aria-label="Tax records summary">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.id} role="button" tabIndex={0} onClick={card.action}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.action(); }
              }} className={`eledger-summary-card ${card.className}`}>
              <div className="eledger-summary-symbol"><Icon size={25}/></div>
              <div className="eledger-summary-details"><span className="eledger-card-label">{card.label}</span>
                <strong>{amount(card.value)}</strong>
                <span>{card.count} {card.caption}</span>
              </div>
              <ChevronRight className="eledger-summary-arrow" size={18}/>
            </div>
          );
        })}
      </section>

      <div className="eledger-dashboard-grid">
        <section className="eledger-dashboard-panel eledger-progress-panel">
          <div className="eledger-panel-heading"><h2>Ledger progress</h2><span>{visibleRoutes.length} categories</span></div>
          <div className="eledger-progress-body">
            <div className="eledger-progress-ring" style={{ '--progress': `${progressPercent}%` } as React.CSSProperties}>
              <div><strong>{usedRoutes} of {visibleRoutes.length}</strong><span>Categories with records</span></div>
            </div>
            <div className="eledger-progress-legend">
              <div><span className="eledger-dot has-records"/>With records <strong>{usedRoutes}</strong></div>
              <div><span className="eledger-dot empty"/>No records yet <strong>{visibleRoutes.length - usedRoutes}</strong></div>
              <button type="button" onClick={() => setActiveNavTab('source-tax')}>View source tax categories <ArrowRight size={16}/></button>
            </div>
          </div>
        </section>

        <section className="eledger-dashboard-panel eledger-actions-panel">
          <div className="eledger-panel-heading"><h2>Items needing attention</h2><span className="eledger-count-badge">{pendingEntries.length}</span></div>
          {pendingEntries.length === 0 ? (
            <div className="eledger-empty-attention"><CheckCircle2 size={23}/><div><strong>No pending records</strong><span>Newly entered claims appear here until independently verified.</span></div></div>
          ) : (
            <div className="eledger-attention-list">
              {pendingEntries.slice(0, 4).map((entry) => {
                const route = CURRENT_ROUTE_REGISTRY.find((item) => item.id === entry.routeId);
                return <button type="button" key={entry.id} onClick={() => goToRoute(entry.routeId, route?.group ?? 'Source Tax')}>
                  <span className="eledger-attention-icon"><CircleAlert size={19}/></span>
                  <span className="eledger-attention-copy"><strong>{route?.title ?? entry.routeId}</strong><small>{entry.referenceNo} · {entry.status.replaceAll('_', ' ')}</small></span>
                  <ChevronRight size={17}/>
                </button>;
              })}
            </div>
          )}
        </section>

        <section className="eledger-dashboard-panel eledger-activity-panel">
          <div className="eledger-panel-heading"><h2>Recent ledger activity</h2><span>{entries.length} records</span></div>
          {entries.length === 0 ? (
            <div className="eledger-empty-activity">No ledger entries have been recorded for this taxpayer and assessment year.</div>
          ) : (
            <div className="eledger-activity-scroll"><table>
              <thead><tr><th>Date</th><th>Reference</th><th>Category</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>{[...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((entry) => (
                <tr key={entry.id}><td>{entry.date}</td><td>{entry.referenceNo}</td>
                  <td>{CURRENT_ROUTE_REGISTRY.find((item) => item.id === entry.routeId)?.title ?? entry.category}</td>
                  <td>{amount(entry.taxDeducted)}</td><td><span className="eledger-record-status">{entry.status.replaceAll('_', ' ')}</span></td></tr>
              ))}</tbody>
            </table></div>
          )}
        </section>

        <section className="eledger-dashboard-panel eledger-quick-panel">
          <div className="eledger-panel-heading"><h2>Quick actions</h2></div>
          <div className="eledger-quick-grid">
            <button type="button" onClick={() => setActiveNavTab('source-tax')}><ReceiptText size={24}/><span><strong>Claim Source Tax</strong><small>Review deductions and income records</small></span></button>
            <button type="button" onClick={() => setActiveNavTab('ait')}><FileCheck2 size={24}/><span><strong>Claim Advance Tax</strong><small>Vehicle, challan and import claims</small></span></button>
            <button type="button" onClick={() => setIsStatusModalOpen(true)}><ShieldCheck size={24}/><span><strong>Tax Payment Status</strong><small>Review reconciled credits</small></span></button>
            <button type="button" onClick={() => setActiveNavTab('ledger-guide')}><BookOpen size={24}/><span><strong>Ledger Guide</strong><small>How the ledger categories work</small></span></button>
          </div>
        </section>
      </div>

      <div className="eledger-info-bar"><CircleAlert size={19}/><span>
        Only externally confirmed amounts are included in verified tax credits. Current verified amount: <strong>{amount(totals.grandTotalCredits)}</strong>.
      </span><button type="button" onClick={() => setIsStatusModalOpen(true)}>View breakdown <ArrowRight size={16}/></button></div>
    </div>
  );
};

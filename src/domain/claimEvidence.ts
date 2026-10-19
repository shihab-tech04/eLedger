import { ClaimEvidence, LedgerRouteId } from './models.ts';

export type EvidenceFieldKey = keyof ClaimEvidence;

export interface EvidenceFieldDefinition {
  key: EvidenceFieldKey;
  label: string;
  kind: 'text' | 'date' | 'number' | 'select';
  options?: Array<{ value: string; label: string }>;
  helperText?: string;
}

const documentType: EvidenceFieldDefinition = {
  key: 'paymentDocumentType',
  label: 'Payment Document Type',
  kind: 'select',
  options: [
    { value: '', label: 'Select document type' },
    { value: 'CHALLAN', label: 'Challan' },
    { value: 'CERTIFICATE', label: 'Certificate' },
    { value: 'OTHER', label: 'Other' },
  ],
};

const documentAmount: EvidenceFieldDefinition = {
  key: 'documentAmount',
  label: 'Total Challan / Certificate Amount (৳)',
  kind: 'number',
  helperText: 'The amount on the document, which may exceed the amount claimed for this taxpayer.',
};

const treasuryFields: EvidenceFieldDefinition[] = [
  { key: 'paymentMode', label: 'Payment Mode', kind: 'text' },
  { key: 'bankName', label: 'Bank', kind: 'text' },
  { key: 'branchName', label: 'Branch', kind: 'text' },
  { key: 'taxZone', label: 'Tax Zone', kind: 'text' },
  { key: 'taxCircle', label: 'Tax Circle', kind: 'text' },
];

const fieldsByRoute: Partial<Record<LedgerRouteId, EvidenceFieldDefinition[]>> = {
  'service-payment': [
    { key: 'depositingAuthority', label: 'Depositing Authority', kind: 'text' },
    documentType,
    documentAmount,
    { key: 'paymentPurpose', label: 'Purpose / Service Description', kind: 'text' },
  ],
  'other-tds': [
    { key: 'paymentPurpose', label: 'Purpose of Payment', kind: 'text' },
    { key: 'depositingAuthority', label: 'Depositing Authority', kind: 'text' },
    documentType,
    documentAmount,
  ],
  'source-ltu': [
    { key: 'paymentPurpose', label: 'Description', kind: 'text' },
    { key: 'attachmentFileName', label: 'Evidence File Name (reference only)', kind: 'text', helperText: 'The file itself is not uploaded or stored in this local-only application.' },
  ],
  'sec-154': [documentType, documentAmount, ...treasuryFields],
  'sec-173': [documentType, documentAmount, ...treasuryFields],
  'ait-import': [documentType, documentAmount, ...treasuryFields],
  'sanchayapatra': [
    { key: 'savingsScheme', label: 'Savings Scheme', kind: 'text' },
    { key: 'savingsRegistration', label: 'Registration / Certificate No', kind: 'text' },
    { key: 'savingsIssueDate', label: 'Certificate Issue Date', kind: 'date' },
  ],
};

export function getClaimEvidenceFields(routeId: LedgerRouteId): EvidenceFieldDefinition[] {
  return fieldsByRoute[routeId] ?? [];
}

/** Treat an empty evidence editor as absent, keeping older records unchanged. */
export function normalizeClaimEvidence(evidence: ClaimEvidence): ClaimEvidence | undefined {
  const normalized: ClaimEvidence = {};
  for (const [key, value] of Object.entries(evidence) as Array<[EvidenceFieldKey, string | number | undefined]>) {
    if (typeof value === 'string' && value.trim()) {
      // Numeric fields come from a controlled editor, but have domain validation below.
      (normalized as Record<string, unknown>)[key] = value.trim();
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      (normalized as Record<string, unknown>)[key] = value;
    }
  }
  return Object.keys(normalized).length ? normalized : undefined;
}

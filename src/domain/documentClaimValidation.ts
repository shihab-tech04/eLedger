/**
 * Frontend-only validation for the six document fields observed in the NBR
 * Salary (Others) and Service Payment Add rows. This never verifies tax credit.
 */
export type DocumentClaimField =
  | 'authority' | 'documentType' | 'reference' | 'date' | 'documentAmount' | 'claimedAmount';

export type DocumentClaimIssue = 'required' | 'invalidAmount' | 'exceedsDocument';
export type DocumentClaimIssues = Partial<Record<DocumentClaimField, DocumentClaimIssue>>;

export type DocumentClaimDraft = Record<DocumentClaimField, string>;

export function validateDocumentClaimDraft(draft: DocumentClaimDraft): DocumentClaimIssues {
  const issues: DocumentClaimIssues = {};
  for (const key of ['authority', 'reference', 'date'] as const) {
    if (!draft[key].trim()) issues[key] = 'required';
  }
  if (draft.documentType !== 'CHALLAN' && draft.documentType !== 'CERTIFICATE') {
    issues.documentType = 'required';
  }
  for (const key of ['documentAmount', 'claimedAmount'] as const) {
    if (!draft[key].trim()) {
      issues[key] = 'required';
    } else if (!Number.isFinite(Number(draft[key])) || Number(draft[key]) <= 0) {
      issues[key] = 'invalidAmount';
    }
  }
  if (!issues.documentAmount && !issues.claimedAmount &&
      Number(draft.claimedAmount) > Number(draft.documentAmount)) {
    issues.claimedAmount = 'exceedsDocument';
  }
  return issues;
}

export function documentClaimIssueText(
  issue: DocumentClaimIssue | undefined,
  translate: (en: string, bn: string) => string,
): string | undefined {
  switch (issue) {
    case 'required': return translate('Required', 'আবশ্যক');
    case 'invalidAmount': return translate('Enter a positive amount', 'ধনাত্মক অঙ্ক দিন');
    case 'exceedsDocument': return translate('Cannot exceed document amount', 'দলিলের অঙ্কের বেশি নয়');
    default: return undefined;
  }
}

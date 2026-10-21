import { refundCirclesForZone } from './refundCircleOptions.ts';

/** Source-observed five-field LTU and seven-field Refund Add UI checks.
 * No API or authoritative tax-credit determination occurs here. */
export type ManualAddIssue = 'required' | 'invalidAmount' | 'exceedsSupportingAmount' | 'invalidCircle';
export type ManualAddField =
  | 'section' | 'claim' | 'reference' | 'description'
  | 'assessmentYear' | 'date' | 'zone' | 'circle' | 'total';
export type ManualAddIssues = Partial<Record<ManualAddField, ManualAddIssue>>;

const validPositive = (value: string): boolean =>
  value.trim().length > 0 && Number.isFinite(Number(value)) && Number(value) > 0;

export function validateLtuAdd(draft: {
  section: string; claim: string; reference: string; description: string;
}): ManualAddIssues {
  const issues: ManualAddIssues = {};
  if (!draft.section.trim()) issues.section = 'required';
  if (!draft.reference.trim()) issues.reference = 'required';
  if (!draft.description.trim()) issues.description = 'required';
  if (!draft.claim.trim()) issues.claim = 'required';
  else if (!validPositive(draft.claim)) issues.claim = 'invalidAmount';
  return issues;
}

export function validateRefundAdd(draft: {
  assessmentYear: string; reference: string; date: string;
  zone: string; circle: string; total: string; claim: string;
}): ManualAddIssues {
  const issues: ManualAddIssues = {};
  for (const field of ['assessmentYear', 'reference', 'date', 'zone', 'circle'] as const) {
    if (!draft[field].trim()) issues[field] = 'required';
  }
  if (draft.zone && draft.circle && !refundCirclesForZone(draft.zone).includes(draft.circle)) {
    issues.circle = 'invalidCircle';
  }
  for (const field of ['total', 'claim'] as const) {
    if (!draft[field].trim()) issues[field] = 'required';
    else if (!validPositive(draft[field])) issues[field] = 'invalidAmount';
  }
  if (!issues.total && !issues.claim && Number(draft.claim) > Number(draft.total)) {
    issues.claim = 'exceedsSupportingAmount';
  }
  return issues;
}

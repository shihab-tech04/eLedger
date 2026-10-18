/** UI-only date context; these labels do not determine statutory carry-forward eligibility. */
import { AssessmentYear } from './models.ts';

export const CARRY_FORWARD_CLASSIFICATIONS = [
  'Unabsorbed Minimum Tax Credit (Sec 163)',
  'Unabsorbed Depreciation Allowance',
  'Business Loss Carried Forward (Sec 70)',
] as const;

export function getPriorAssessmentYears(assessmentYear: AssessmentYear): string[] {
  const startYear = Number(assessmentYear.slice(0, 4));
  return [1, 2, 3].map((offset) => `${startYear - offset}-${startYear - offset + 1}`);
}

export function readCarryForwardDetails(
  remarks: string | undefined,
  assessmentYear: AssessmentYear
): { priorAssessmentYear: string; classification: string } {
  const years = getPriorAssessmentYears(assessmentYear);
  const match = remarks?.match(/^Prior Year: (\d{4}-\d{4}) \| Type: (.+)$/);
  return {
    priorAssessmentYear: match && years.includes(match[1]) ? match[1] : years[0],
    classification: match && CARRY_FORWARD_CLASSIFICATIONS.some((type) => type === match[2])
      ? match[2] : CARRY_FORWARD_CLASSIFICATIONS[0],
  };
}

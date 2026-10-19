import { AssessmentYear, LedgerEntry } from './models.ts';

/** Local Section 120 import; it is never evidence of ASYCUDA/government verification. */
export const SECTION120_CSV_HEADERS = [
  'referenceNo', 'sourceEntity', 'sectionCode', 'grossAmount', 'taxDeducted', 'date',
] as const;

export interface Section120ImportContext {
  taxpayerTin: string;
  assessmentYear: AssessmentYear;
  routeId: 'system-import' | 'ait-import';
}

function parseCsvMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let fields: string[] = [];
  let cell = '';
  let quoted = false;
  let closedQuote = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quoted) {
        quoted = false;
        closedQuote = true;
      } else if (!cell && !closedQuote) {
        quoted = true;
      } else {
        throw new Error('Invalid quote placement in CSV.');
      }
    } else if (!quoted && (ch === ',' || ch === '\n' || ch === '\r')) {
      fields.push(cell.trim());
      cell = '';
      closedQuote = false;
      if (ch !== ',') {
        if (fields.some((field) => field !== '')) rows.push(fields);
        fields = [];
        if (ch === '\r' && input[i + 1] === '\n') i++;
      }
    } else {
      if (closedQuote && !/\s/.test(ch)) throw new Error('Unexpected text after a CSV quote.');
      cell += ch;
    }
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  fields.push(cell.trim());
  if (fields.some((field) => field !== '')) rows.push(fields);
  return rows;
}

export function parseSection120Csv(text: string, context: Section120ImportContext): Array<Omit<LedgerEntry, 'id' | 'createdAt' | 'updatedAt'>> {
  if (text.length > 1_000_000) throw new Error('CSV exceeds the 1 MB local import limit.');
  const matrix = parseCsvMatrix(text);
  if (!matrix.length || matrix[0].join(',') !== SECTION120_CSV_HEADERS.join(',')) {
    throw new Error(`CSV headers must be: ${SECTION120_CSV_HEADERS.join(',')}`);
  }
  const values = matrix.slice(1);
  if (values.length < 1 || values.length > 100) throw new Error('Enter 1 to 100 CSV data rows per batch.');
  return values.map((fields, index) => {
    const row = index + 2;
    if (fields.length !== SECTION120_CSV_HEADERS.length) throw new Error(`CSV row ${row}: expected six columns.`);
    const [referenceNo, sourceEntity, sectionCode, gross, deducted, date] = fields;
    if (!referenceNo || referenceNo.length > 120 || /[\r\n]/.test(referenceNo) ||
      !sourceEntity || sourceEntity.length > 250 ||
      !sectionCode || sectionCode.length > 120) {
      throw new Error(`CSV row ${row}: reference, source name or section is missing or too long.`);
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(gross) || !/^\d+(?:\.\d{1,2})?$/.test(deducted)) {
      throw new Error(`CSV row ${row}: amounts must be positive decimal values (up to 2 decimals).`);
    }
    return {
      taxpayerTin: context.taxpayerTin,
      assessmentYear: context.assessmentYear,
      category: context.routeId === 'ait-import' ? 'AIT' as const : 'SOURCE_TAX' as const,
      routeId: context.routeId,
      referenceNo,
      sourceEntity,
      sectionCode,
      grossAmount: Number(gross),
      taxDeducted: Number(deducted),
      date,
      status: 'PENDING_VERIFICATION' as const,
      workflow: 'MANUAL_ENTRY' as const,
      isManual: true,
      externalVerified: false,
    };
  });
}

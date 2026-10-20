import { REFUND_TAX_ZONES } from './officialLedgerFields.ts';

/**
 * Exact rendered Circle choices (including spelling, case, suffixes and order)
 * observed by selecting each of the 50 zones in the authenticated NBR eLedger
 * refund form for AY 2026–2027 on 20 October 2026. This is a dated UI
 * snapshot, not an authorization to submit claims to the NBR service.
 *
 * Never synthesize an option for a zone that has no source observation.
 */
const list = (first: number, last: number, options: {
  prefix?: string; pad?: number; overrides?: Record<number, string>;
} = {}): string[] => Array.from({ length: last - first + 1 }, (_, offset) => {
  const number = first + offset;
  return options.overrides?.[number] ?? `${options.prefix ?? 'Circle-'}${String(number).padStart(options.pad ?? 0, '0')}`;
});

const upper = (first: number, last: number) => list(first, last, { prefix: 'CIRCLE-' });
const pad = (first = 1, last = 22) => list(first, last, { pad: 2 });
const unpad = (first = 1, last = 22) => list(first, last);
const decorated = (first: number, last: number, overrides: Record<number, string>) => list(first, last, { overrides });

const observedCircleLists: readonly (readonly string[])[] = [
  // Barishal's original option order ends with Circle-09.
  ['Circle-01(Companies)', 'Circle-02(Companies)', ...pad(3, 6), 'Circle-07(Salaries)', 'Circle-08',
    ...pad(10, 12), 'Circle-13(Salaries)', ...pad(14, 17), 'Circle-18(Salaries)', ...pad(19, 22), 'Circle-09'],
  list(23, 44),
  list(45, 66),
  list(67, 88),
  decorated(89, 110, Object.fromEntries([89, 90, 91, 95, 96, 101].map((n) => [n, `Circle-${n}(Com)`]))),
  list(111, 132),
  list(133, 154),
  list(155, 176),
  list(177, 198),
  list(199, 220),
  list(221, 242),
  pad(), // Bogura
  list(243, 264),
  list(265, 286),
  list(287, 308),
  list(309, 330),
  pad(), // Gazipur
  pad(), // Khulna
  ['Circle LTU(Tax)'],
  unpad(), // Mymensingh
  pad(), // Narayanganj
  pad(), // Rajshahi
  ['Circle-01, Dhaka', 'Circle-02, Dhaka', 'Circle-03, Dhaka', 'Circle-04, Dhaka',
    'Circle-01, Chattogram', 'Circle-02, Chattogram', 'Circle-03, Chattogram',
    'Circle-01, Khulna', 'Circle-02, Khulna', 'Circle-01, Rajshahi', 'Circle-02, Rajshahi'],
  pad(), // Rangpur
  pad(), // Sylhet
  decorated(1, 22, {
    1: 'Circle-01 (Companies)', 2: 'Circle-02 (Companies)', 3: 'Circle-03 (Companies)',
    7: 'Circle-07 (Companies)', 8: 'Circle-08 (Companies)', 10: 'Circle-10 (Salaries)',
    13: 'Circle-13 (Companies)', 14: 'Circle-14 (Salaries)', 17: 'Circle-17 (Sitakundu)',
    19: 'Circle-19 (Salaries)', 22: 'Circle-22 (Patiya)',
  }).map((value) => /^Circle-\d{1,2}$/.test(value) ? value.replace(/Circle-(\d+)$/, (_, digits: string) => `Circle-${digits.padStart(2, '0')}`) : value),
  decorated(23, 44, {
    23: 'Circle-23(Companies)', 24: 'Circle-24(Companies)', 25: 'Circle-25(Companies)',
    29: 'Circle-29(Companies)', 30: 'Circle-30(Companies)', 32: 'Circle-32(Salary)',
    35: 'Circle-35(Companies)', 36: 'Circle-36(Salary)', 39: 'Circle-39 (Chandanaish)',
    41: 'Circle-41(Salary)', 44: 'Circle-44(Lohagara)',
  }),
  [...list(45, 54), ...list(56, 66), 'Circle-55'],
  list(67, 88),
  pad(), // Cumilla
  unpad(), // Dhaka 1
  decorated(331, 352, {
    331: 'Circle-331 (Company)', 332: 'Circle-332 (Company)', 333: 'Circle-333 (Company)',
    336: 'Circle-336 (Salary)', 337: 'Circle-337 (Company)', 338: 'Circle-338 (Company)',
    341: 'Circle-341 (Salary)', 342: 'Circle-342 (Salary)', 343: 'Circle-343 (Company)',
    346: 'Circle-346 (Salary)', 347: 'Circle-347 (Salary)', 351: 'Circle-351 (Salary)', 352: 'Circle-352 (Salary)',
  }),
  decorated(353, 374, {
    353: 'Circle-353 (Company)', 354: 'Circle-354 (Company)', 355: 'Circle-355 (Company)',
    357: 'Circle-357 (Salary)', 358: 'Circle-358 (Salary)', 359: 'Circle-359 (Company)',
    360: 'Circle-360 (Company)', 363: 'Circle-363 (Salary)', 364: 'Circle-364 (Salary)',
    365: 'Circle-365 (Company)', 368: 'Circle-368 (Salary)', 369: 'Circle-369 (Salary)',
    373: 'Circle-373 (Salary)', 374: 'Circle-374 (Salary)',
  }),
  decorated(375, 396, {
    375: 'Circle-375 (Company)', 376: 'Circle-376 (Company)', 377: 'Circle-377 (Company)',
    380: 'Circle-380 (Salary)', 381: 'Circle-381 (Company)', 382: 'Circle-382 (Company',
    386: 'Circle-386 (Salary)', 387: 'Circle-387 (Company)', 390: 'Circle-390 (Salary)',
    391: 'Circle-391 (Salary)', 395: 'Circle-395 (Salary)', 396: 'Circle-396 (Salary)',
  }),
  decorated(397, 418, {
    397: 'Circle-397 (Company)', 398: 'Circle-398 (Company)', 399: 'Circle-399 (Company)',
    402: 'Circle-402 (Salary)', 403: 'Circle-403 (Company)', 404: 'Circle-404 (Company)',
    405: 'Circle-405 (Nawabganj)', 409: 'Circle-409 (Company)',
    412: 'Circle-412 (Salary)', 413: 'Circle-413 (Salary)', 417: 'Circle-417 (Salary)', 418: 'Circle-418 (Salary)',
  }),
  decorated(419, 440, {
    419: 'Circle-419 (Company)', 420: 'Circle-420 (Company)', 421: 'Circle-421 (Company)',
    423: 'Circle-423 (Salary)', 424: 'Circle-424 (Salary)', 425: 'Circle-425 (Company)',
    426: 'Circle-426 (Company)', 429: 'Circle-429 (Salary)', 430: 'Circle-430 (Salary)',
    431: 'Circle-431 (Company)', 434: 'Circle-434 (Salary)', 435: 'Circle-435 (Salary)',
    438: 'Circle-438 (Contractor)', 439: 'Circle-439 (Salary)', 440: 'Circle-440 (Salary)',
  }),
  decorated(441, 462, {
    441: 'Circle-441 (Company)', 442: 'Circle-442 (Company)', 443: 'Circle-443 (Company)',
    445: 'Circle-445 (Salary)', 446: 'Circle-446 (Salary)', 447: 'Circle-447 (Company)',
    448: 'Circle-448 (Company)', 451: 'Circle-451 (Salary)', 452: 'Circle-452 (Salary)',
    453: 'Circle-453 (Company)', 456: 'Circle-456 (Salary)', 457: 'Circle-457 (Salary)',
    461: 'Circle-461 (Salary)', 462: 'Circle-462 (Salary)',
  }),
  decorated(463, 484, {
    463: 'Circle-463 (Company)', 464: 'Circle-464 (Company)', 465: 'Circle-465 (Company)',
    467: 'Circle-467 (Salary)', 468: 'Circle-468 (Salary)', 469: 'Circle-469 (Company)',
    470: 'Circle-470 (Company)', 473: 'Circle-473 (Salary)', 474: 'Circle-474 (Salary)',
    475: 'Circle-475 (Company)', 478: 'Circle-478 (Salary)', 479: 'Circle-479 (Salary)',
    483: 'Circle-483 (Salary)', 484: 'Circle-484 (Salary)',
  }),
  decorated(485, 506, {
    485: 'Circle-485 (Company)', 486: 'Circle-486 (Company)', 487: 'Circle-487 (Company)',
    490: 'Circle-490 (Salary)', 491: 'Circle-491 (Company)', 492: 'Circle-492 (Company)',
    495: 'Circle-495 (Salary)', 496: 'Circle-496 (Salary)', 497: 'Circle-497 (Company)',
    500: 'Circle-500 (Salary)', 501: 'Circle-501 (Salary)',
    502: 'Circle-502 (Keraniganj-1)', 503: 'Circle-503 (Keraniganj-2)',
    504: 'Circle-504 (Keraniganj-3)', 505: 'Circle-505 (Salary) (Keraniganj-4)',
    506: 'Circle-506 (Salary) (Keraniganj-5)',
  }),
  decorated(507, 528, {
    507: 'Circle-507 (Company)', 508: 'Circle-508 (Company)', 509: 'Circle-509 (Company)',
    511: 'Circle-511 (Salary)', 512: 'Circle-512 (Salary)', 513: 'Circle-513 (Company)',
    514: 'Circle-514 (Company)', 517: 'Circle-517 (Salary)', 518: 'Circle-518 (Salary)',
    519: 'Circle-519 (Company)', 522: 'Circle-522 (Salary)', 523: 'Circle-523 (Salary)',
    524: 'Circle-524 (Dhamrai)', 527: 'Circle-527 (Salary)', 528: 'Circle-528 (Salary)',
  }),
  decorated(529, 550, {
    529: 'Circle-529 (Company)', 530: 'Circle-530 (Company)', 531: 'Circle-531 (Company)',
    533: 'Circle-533 (Salary)', 534: 'Circle-534 (Salary)', 535: 'Circle-535 (Company)',
    536: 'Circle-536 (Company)', 539: 'Circle-539 (Salary)', 540: 'Circle-540 (Salary)',
    541: 'Circle-541 (Company)', 542: 'Circle-542 (Salary)',
    546: 'Circle-546 (Manikganj Sadar)', 547: 'Circle-547 (Ghior)',
    548: 'Circle-548 (Shibaloy)', 549: 'Circle-549 (Shingair)', 550: 'Circle-550 (Salary)',
  }),
  upper(1, 22), // Jashore
  upper(111, 132), // Chattogram 06
  upper(1, 22), // Narsingdi
  upper(1, 22), // Kushtia
  upper(89, 110), // Chattogram 05
  upper(1, 22), // Faridpur
  upper(1, 22), // Cox's Bazar
  upper(1, 22), // Noakhali
  upper(1, 22), // Dinajpur
];

export const REFUND_CIRCLES_BY_ZONE: Readonly<Record<(typeof REFUND_TAX_ZONES)[number], readonly string[]>> =
  Object.fromEntries(REFUND_TAX_ZONES.map((zone, index) => [zone, observedCircleLists[index] ?? []])) as
  Record<(typeof REFUND_TAX_ZONES)[number], readonly string[]>;

export const refundCirclesForZone = (zone: string): readonly string[] =>
  Object.prototype.hasOwnProperty.call(REFUND_CIRCLES_BY_ZONE, zone)
    ? REFUND_CIRCLES_BY_ZONE[zone as (typeof REFUND_TAX_ZONES)[number]] : [];

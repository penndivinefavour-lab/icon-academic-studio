import { describe, it, expect } from 'vitest';
import {
  formatInText,
  formatReferenceList,
  parseRawReference,
  isValidDoi,
  duplicateKey,
  isReferenceComplete,
  ALL_CITATION_STYLES,
  type ReferenceFields,
} from './citationFormats.js';

const REF: ReferenceFields = {
  authors: ['Ngwa, P.'],
  year: '2023',
  title: 'Smallholder farming productivity in Cameroon',
  source: 'Journal of African Economies',
  volume: '12',
  issue: '3',
  pages: '45-67',
  url: null,
  doi: '10.1234/jae.2023.001',
};

describe('Citation formatting', () => {
  it('supports APA, MLA, Chicago and Harvard styles', () => {
    expect(ALL_CITATION_STYLES).toEqual(['APA', 'MLA', 'CHICAGO', 'HARVARD']);
  });

  it('formats APA in-text citation with year', () => {
    expect(formatInText(REF, 'APA')).toBe('(Ngwa, 2023)');
  });

  it('formats MLA in-text citation without year', () => {
    expect(formatInText(REF, 'MLA')).toBe('(Ngwa)');
  });

  it('formats Chicago author-date in-text citation', () => {
    expect(formatInText(REF, 'CHICAGO')).toBe('(Ngwa 2023)');
  });

  it('formats Harvard in-text citation', () => {
    expect(formatInText(REF, 'HARVARD')).toBe('(Ngwa, 2023)');
  });

  it('uses "et al." for three or more authors', () => {
    const ref: ReferenceFields = { ...REF, authors: ['Ngwa, P.', 'Foka, A.', 'Ateh, B.'] };
    expect(formatInText(ref, 'APA')).toBe('(Ngwa et al., 2023)');
  });

  it('joins two authors in APA with "and"', () => {
    const ref: ReferenceFields = { ...REF, authors: ['Ngwa, P.', 'Foka, A.'] };
    expect(formatInText(ref, 'APA')).toBe('(Ngwa and Foka, 2023)');
  });

  it('honestly reports unknown author/year rather than inventing them', () => {
    const ref: ReferenceFields = { authors: [], year: null, title: null };
    const apa = formatInText(ref, 'APA');
    expect(apa).toBe('(Unknown, n.d.)');
    const mla = formatInText(ref, 'MLA');
    expect(mla).toBe('(Unknown)');
  });

  it('builds a full APA reference-list entry', () => {
    const out = formatReferenceList(REF, 'APA');
    expect(out).toContain('Ngwa, P.');
    expect(out).toContain('(2023).');
    expect(out).toContain('Smallholder farming productivity in Cameroon.');
    expect(out).toContain('Journal of African Economies, 12(3), 45-67.');
    expect(out).toContain('https://doi.org/10.1234/jae.2023.001');
  });

  it('builds a full MLA reference-list entry', () => {
    const out = formatReferenceList(REF, 'MLA');
    expect(out).toContain('"Smallholder farming productivity in Cameroon."');
    expect(out).toContain('vol. 12');
    expect(out).toContain('no. 3');
    expect(out).toContain('pp. 45-67');
  });

  it('builds a full Harvard reference-list entry', () => {
    const out = formatReferenceList(REF, 'HARVARD');
    expect(out).toContain('(2023)');
    expect(out).toContain(`'Smallholder farming productivity in Cameroon'`);
  });

  it('parses authors, year, title, DOI and pages from a raw APA string', () => {
    const raw = 'Ngwa, P., and Foka, A. (2023). Smallholder farming in Cameroon. Journal of African Economies, 12(3), 45-67. doi:10.1234/jae.2023.001';
    const parsed = parseRawReference(raw);
    expect(parsed.year).toBe('2023');
    expect(parsed.title).toBe('Smallholder farming in Cameroon');
    expect(parsed.authors.length).toBeGreaterThanOrEqual(1);
    expect(parsed.authors[0]).toContain('Ngwa');
    expect(parsed.doi).toBe('10.1234/jae.2023.001');
    expect(parsed.pages).toBe('45-67');
  });
});

describe('Reference validation', () => {
  it('accepts a well-formed DOI', () => {
    expect(isValidDoi('10.1234/jae.2023.001')).toBe(true);
  });

  it('rejects DOIs with spaces or wrong prefix', () => {
    expect(isValidDoi('10.1234/jae 2023')).toBe(false);
    expect(isValidDoi('9.1234/jae')).toBe(false);
    expect(isValidDoi(null)).toBe(false);
    expect(isValidDoi('')).toBe(false);
  });

  it('flags duplicate references by normalized key', () => {
    const a: ReferenceFields = { authors: ['Ngwa, P.'], year: '2023', title: 'Farming in Cameroon' };
    const b: ReferenceFields = { authors: ['NGWA, P.'], year: '2023', title: 'Farming in Cameroon' };
    const c: ReferenceFields = { authors: ['Foka, A.'], year: '2023', title: 'Farming in Cameroon' };
    expect(duplicateKey(a)).toBe(duplicateKey(b));
    expect(duplicateKey(a)).not.toBe(duplicateKey(c));
  });

  it('requires author, year and title for completeness', () => {
    expect(isReferenceComplete(REF)).toBe(true);
    expect(isReferenceComplete({ ...REF, year: null })).toBe(false);
    expect(isReferenceComplete({ ...REF, title: null })).toBe(false);
    expect(isReferenceComplete({ ...REF, authors: [] })).toBe(false);
  });
});

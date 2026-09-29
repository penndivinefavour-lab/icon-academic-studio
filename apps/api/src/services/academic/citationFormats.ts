/**
 * ICON Academic Studio — Citation/Reference formatting (Phase 6)
 *
 * Extends the existing Citation model formatting (APA/MLA/CHICAGO in
 * routes/citations.ts) with Harvard plus full reference-list formatting.
 * Formatting is deterministic string assembly from persisted fields only —
 * no author/title/year is ever invented. Missing fields are represented
 * honestly (empty string or a placeholder marker).
 */

export type CitationStyle = 'APA' | 'MLA' | 'CHICAGO' | 'HARVARD';

export const ALL_CITATION_STYLES: CitationStyle[] = ['APA', 'MLA', 'CHICAGO', 'HARVARD'];

export interface ReferenceFields {
  authors: string[]; // as persisted, e.g. ["Ngwa, P.", "Foka, A."]
  year?: string | null;
  title?: string | null;
  source?: string | null; // journal / publisher / container
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  url?: string | null;
  doi?: string | null;
}

/**
 * In-text citation from persisted fields.
 * APA: (Ngwa, 2023) / (Ngwa & Foka, 2023)
 * MLA: (Ngwa) / (Ngwa and Foka)
 * Chicago: (Ngwa 2023) — author-date form
 * Harvard: (Ngwa, 2023)
 */
export function formatInText(ref: ReferenceFields, style: CitationStyle): string {
  const first = ref.authors[0]?.trim() || 'Unknown';
  const surname = first.split(',')[0].trim() || 'Unknown';
  const n = ref.authors.length;

  switch (style) {
    case 'APA': {
      let authorPart: string;
      if (n === 0) authorPart = 'Unknown';
      else if (n === 1) authorPart = surname;
      else if (n === 2) authorPart = `${surname} and ${secondSurname(ref)}`;
      else authorPart = `${surname} et al.`;
      // APA requires a year; absent years are reported as n.d.
      return `(${authorPart}${ref.year ? `, ${ref.year}` : ', n.d.'})`;
    }
    case 'MLA': {
      let authorPart: string;
      if (n === 0) authorPart = 'Unknown';
      else if (n === 1) authorPart = surname;
      else if (n === 2) authorPart = `${surname} and ${secondSurname(ref)}`;
      else authorPart = `${surname} et al.`;
      return `(${authorPart})`;
    }
    case 'CHICAGO': {
      let authorPart: string;
      if (n === 0) authorPart = 'Unknown';
      else if (n === 1) authorPart = surname;
      else authorPart = `${surname} et al.`;
      return `(${authorPart} ${ref.year || 'n.d.'})`;
    }
    case 'HARVARD': {
      let authorPart: string;
      if (n === 0) authorPart = 'Unknown';
      else if (n === 1) authorPart = surname;
      else authorPart = `${surname} et al.`;
      return `(${authorPart}${ref.year ? `, ${ref.year}` : ', n.d.'})`;
    }
  }
}

function secondSurname(ref: ReferenceFields): string {
  const second = ref.authors[1]?.trim() || '';
  return second.split(',')[0].trim() || 'Unknown';
}

/**
 * Full reference-list entry.
 * APA: Ngwa, P. (2023). Title of work. Journal Name, 12(3), 45-67.
 * MLA: Ngwa, P. "Title of Work." Journal Name, vol. 12, no. 3, 2023, pp. 45-67.
 * Chicago: Ngwa, P. Title of Work. Journal Name 12, no. 3 (2023): 45-67.
 * Harvard: Ngwa, P. (2023) 'Title of work', Journal Name, 12(3), pp. 45-67.
 */
export function formatReferenceList(ref: ReferenceFields, style: CitationStyle): string {
  const authors = ref.authors.length ? ref.authors.join(', ') : 'Unknown author';
  const year = ref.year || 'n.d.';
  const title = ref.title || 'Untitled';

  // style-specific container assembly
  let container = '';
  if (style === 'APA') {
    // Journal Name, 12(3), 45-67.
    const parts = [
      ref.source,
      [ref.volume, ref.issue && `(${ref.issue})`].filter(Boolean).join(''),
      ref.pages,
    ].filter(Boolean);
    container = parts.join(', ');
  } else if (style === 'MLA') {
    const parts = [
      ref.source,
      ref.volume && `vol. ${ref.volume}`,
      ref.issue && `no. ${ref.issue}`,
      ref.year && `${ref.year}`,
      ref.pages && `pp. ${ref.pages}`,
    ].filter(Boolean);
    container = parts.join(', ');
  } else if (style === 'CHICAGO') {
    const parts = [
      ref.source,
      [ref.volume, ref.issue && `no. ${ref.issue}`].filter(Boolean).join(' '),
      ref.year && `(${ref.year})`,
      ref.pages,
    ].filter(Boolean);
    container = parts.join(' ');
  } else {
    // Harvard: Journal Name, 12(3), pp. 45-67.
    const parts = [
      ref.source,
      [ref.volume, ref.issue && `(${ref.issue})`].filter(Boolean).join(''),
      ref.pages && `pp. ${ref.pages}`,
    ].filter(Boolean);
    container = parts.join(', ');
  }

  const tail = [ref.doi ? `https://doi.org/${ref.doi}` : ref.url].filter(Boolean).join(' ');

  switch (style) {
    case 'APA':
      return [authors, `(${year}).`, `${title}.`, container ? `${container}.` : '', tail].filter(Boolean).join(' ');
    case 'MLA':
      return [authors, `"${title}."`, container ? `${container}.` : '', tail].filter(Boolean).join(' ');
    case 'CHICAGO':
      return [authors, `${title}.`, container ? `${container}.` : '', tail].filter(Boolean).join(' ');
    case 'HARVARD':
      return [authors, `(${year})`, `'${title}'`, container ? `${container}.` : '', tail].filter(Boolean).join(' ');
  }
}

/** Parse a raw "Surname, X., and Surname, Y. (Year). Title." string minimally. */
export function parseRawReference(raw: string): ReferenceFields {
  const authors: string[] = [];
  const yearMatch = raw.match(/\((\d{4}[a-z]?)\)/);
  const year = yearMatch?.[1];
  const titleMatch = raw.match(/\)\s*\.?\s*([^.]{10,})\./);
  const title = titleMatch?.[1]?.trim();
  const doiMatch = raw.match(/10\.\d{4,9}\/[^\s)]+/i);
  const doi = doiMatch?.[0]?.replace(/\.$/, '');
  const urlMatch = raw.match(/https?:\/\/[^\s)]+/i);
  const url = urlMatch?.[0]?.replace(/[.)]+$/, '');
  const pagesMatch = raw.match(/(\d+\s*[-–—]\s*\d+)/);
  const pages = pagesMatch?.[1];

  // authors = text before the first "(year)" marker
  if (yearMatch && yearMatch.index !== undefined && yearMatch.index > 0) {
    raw
      .slice(0, yearMatch.index)
      .split(/,?\s+and\s+|;/)
      .map((a) => a.trim())
      .filter((a) => a.length > 1 && !/^[\d.]+$/.test(a))
      .forEach((a) => authors.push(a.endsWith('.') ? a.slice(0, -1) : a));
  }
  return { authors, year, title, doi, url, pages };
}

/** DOI format check: 10.xxxx/xxxx (no spaces). */
export function isValidDoi(doi: string | null | undefined): boolean {
  if (!doi) return false;
  return /^10\.\d{4,9}\/\S+$/.test(doi) && !/\s/.test(doi);
}

/** Detect duplicate references by normalized (authors+year+title) key. */
export function duplicateKey(ref: ReferenceFields): string {
  return [
    ref.authors.map((a) => a.toLowerCase().replace(/[^a-z]/g, '')).join('|'),
    (ref.year || '').trim(),
    (ref.title || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(),
  ].join('::');
}

/** A reference is complete when it has at least one author, a year and a title. */
export function isReferenceComplete(ref: ReferenceFields): boolean {
  return ref.authors.length > 0 && !!ref.year && !!ref.title;
}

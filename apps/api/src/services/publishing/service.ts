/**
 * ICON Academic Studio — Publishing Service (Phase 7)
 *
 * Core persistence + workflow for Publications, Parts, Chapters,
 * Front/Back Matter, Contributors, Glossary, Index, Figures/Tables,
 * Validation, Document sync, TOC, versioning. Reuses Document/
 * DocumentSection/DocumentBlock/DocumentVersion, FormattingProfile,
 * Chart/Table_, EvidenceItem, Citation, Source, Dataset, Analysis.
 */
import { prisma } from '@icon-academic/db';
import { v4 as uuidv4 } from 'uuid';
import { getPublicationTemplate, PUBLICATION_TEMPLATES } from './templates';

// ── types ──────────────────────────────────────────────────────────────────

export interface PublicationCreateInput {
  projectId: string;
  title: string;
  subtitle?: string;
  publicationType: string;
  author?: string;
  coAuthors?: string[];
  editor?: string;
  publisher?: string;
  language?: string;
  edition?: string;
  publicationYear?: string;
  description?: string;
  keywords?: string[];
  formattingProfileId?: string;
  seriesId?: string;
  volumeNumber?: string;
  trimSize?: string;
  orientation?: string;
  gutter?: string;
  bleed?: string;
  printNotes?: string;
  isbn10?: string;
  isbn13?: string;
  copyrightHolder?: string;
  copyrightYear?: string;
  subject?: string;
  metadata?: Record<string, unknown>;
  documentId?: string;
}

export interface PublicationUpdateInput {
  title?: string;
  subtitle?: string;
  status?: string;
  author?: string;
  coAuthors?: string[];
  editor?: string;
  publisher?: string;
  language?: string;
  edition?: string;
  publicationYear?: string;
  description?: string;
  keywords?: string[];
  formattingProfileId?: string;
  seriesId?: string;
  volumeNumber?: string;
  trimSize?: string;
  orientation?: string;
  gutter?: string;
  bleed?: string;
  printNotes?: string;
  isbn10?: string;
  isbn13?: string;
  copyrightHolder?: string;
  copyrightYear?: string;
  subject?: string;
  metadata?: Record<string, unknown>;
  coverNotes?: string;
  spineText?: string;
  backCoverDescription?: string;
  authorBio?: string;
  documentId?: string;
}

// ── helpers ────────────────────────────────────────────────────────────────

async function wordCountForDocument(documentId?: string | null): Promise<number> {
  if (!documentId) return 0;
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { sections: { include: { blocks: true } } },
  });
  if (!doc) return 0;
  let count = 0;
  for (const section of doc.sections) {
    if (section.content) {
      count += section.content.split(/\s+/).filter(Boolean).length;
    }
    for (const block of section.blocks) {
      if (block.content) {
        count += block.content.split(/\s+/).filter(Boolean).length;
      }
    }
  }
  return count;
}

async function paragraphCountForDocument(documentId?: string | null): Promise<number> {
  if (!documentId) return 0;
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { sections: { include: { blocks: true } } },
  });
  if (!doc) return 0;
  let count = 0;
  for (const section of doc.sections) {
    if (section.content && section.content.trim()) count++;
    for (const block of section.blocks) {
      if (block.type === 'PARAGRAPH' && block.content && block.content.trim()) count++;
    }
  }
  return count;
}

function estimatePages(wordCount: number, trimSize: string): number {
  const wordsPerPage: Record<string, number> = {
    A4: 300,
    A5: 250,
    Letter: 300,
    Digest: 200,
    Trade: 275,
  };
  const wpp = wordsPerPage[trimSize] ?? 275;
  return Math.ceil(wordCount / wpp);
}

// ── publication CRUD ───────────────────────────────────────────────────────

export async function createPublication(input: PublicationCreateInput) {
  const id = uuidv4();
  const coAuthors = input.coAuthors ? JSON.stringify(input.coAuthors) : '[]';
  const keywords = input.keywords ? JSON.stringify(input.keywords) : '[]';
  const metadata = input.metadata ? JSON.stringify(input.metadata) : '{}';

  return prisma.publication.create({
    data: {
      id,
      projectId: input.projectId,
      documentId: input.documentId ?? null,
      title: input.title,
      subtitle: input.subtitle ?? null,
      publicationType: input.publicationType,
      status: 'DRAFT',
      author: input.author ?? null,
      coAuthors,
      editor: input.editor ?? null,
      publisher: input.publisher ?? null,
      language: input.language ?? 'en',
      edition: input.edition ?? null,
      publicationYear: input.publicationYear ?? null,
      description: input.description ?? null,
      keywords,
      formattingProfileId: input.formattingProfileId ?? null,
      seriesId: input.seriesId ?? null,
      volumeNumber: input.volumeNumber ?? null,
      trimSize: input.trimSize ?? null,
      orientation: input.orientation ?? null,
      gutter: input.gutter ?? null,
      bleed: input.bleed ?? null,
      printNotes: input.printNotes ?? null,
      isbn10: input.isbn10 ?? null,
      isbn13: input.isbn13 ?? null,
      isbnValidationStatus: null,
      copyrightHolder: input.copyrightHolder ?? null,
      copyrightYear: input.copyrightYear ?? null,
      subject: input.subject ?? null,
      metadata,
    },
  });
}

export async function getPublication(id: string) {
  return prisma.publication.findUnique({
    where: { id },
    include: {
      project: true,
      document: true,
      series: true,
    },
  });
}

export async function listPublications(projectId: string) {
  return prisma.publication.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    include: { project: true },
  });
}

export async function updatePublication(id: string, input: PublicationUpdateInput) {
  const d: Record<string, unknown> = {};
  const fields = [
    'title', 'subtitle', 'status', 'author', 'editor', 'publisher',
    'language', 'edition', 'publicationYear', 'description',
    'formattingProfileId', 'seriesId', 'volumeNumber',
    'trimSize', 'orientation', 'gutter', 'bleed', 'printNotes',
    'isbn10', 'isbn13', 'copyrightHolder', 'copyrightYear',
    'subject', 'metadata', 'coverNotes', 'spineText',
    'backCoverDescription', 'authorBio', 'documentId',
  ] as const;
  for (const k of fields) {
    if (input[k] !== undefined) d[k] = input[k];
  }
  if (input.coAuthors !== undefined) d.coAuthors = JSON.stringify(input.coAuthors);
  if (input.keywords !== undefined) d.keywords = JSON.stringify(input.keywords);
  if (input.metadata !== undefined) d.metadata = JSON.stringify(input.metadata);

  return prisma.publication.update({ where: { id }, data: d });
}

export async function deletePublication(id: string) {
  return prisma.publication.delete({ where: { id } });
}

// ── template helpers ───────────────────────────────────────────────────────

export async function listTemplates() {
  return PUBLICATION_TEMPLATES;
}

export async function createFromTemplate(
  projectId: string,
  publicationType: string,
  overrides?: Partial<PublicationCreateInput>,
) {
  const template = getPublicationTemplate(publicationType as any);
  if (!template) throw new Error(`Template not found for type: ${publicationType}`);

  const input: PublicationCreateInput = {
    projectId,
    title: 'Untitled Publication',
    publicationType,
    ...(overrides ?? {}),
  };

  const publication = await createPublication(input);

  // Apply front/back matter defaults
  const frontMatterKinds: string[] = [];
  const backMatterKinds: string[] = [];
  const chapterStructure: string[] = [];

  // Use template structure from constants
  for (const tm of PUBLICATION_TEMPLATES) {
    if (tm.publicationType === publicationType) {
      tm.frontMatter.forEach(k => frontMatterKinds.push(k));
      tm.backMatter.forEach(k => backMatterKinds.push(k));
      tm.chapterStructure.forEach(s => {
        if (typeof s === 'string') chapterStructure.push(s);
        else if (s && typeof s === 'object' && 'title' in s) chapterStructure.push((s as any).title);
      });
      break;
    }
  }

  await prisma.publicationFrontMatter.createMany({
    data: frontMatterKinds.map((kind, i) => ({
      publicationId: publication.id,
      kind,
      title: kind.replace(/_/g, ' '),
      order: i,
    })),
    skipDuplicates: true,
  });

  await prisma.publicationBackMatter.createMany({
    data: backMatterKinds.map((kind, i) => ({
      publicationId: publication.id,
      kind,
      title: kind.replace(/_/g, ' '),
      order: i,
    })),
    skipDuplicates: true,
  });

  // Create default chapters from template structure
  for (let i = 0; i < chapterStructure.length; i++) {
    await prisma.publicationChapter.create({
      data: {
        publicationId: publication.id,
        chapterNumber: i + 1,
        title: chapterStructure[i],
        order: i,
      },
    });
  }

  return publication;
}

// ── parts ──────────────────────────────────────────────────────────────────

export async function addPart(publicationId: string, input: { partNumber: number; title: string; description?: string; order?: number }) {
  return prisma.publicationPart.create({
    data: {
      publicationId,
      partNumber: input.partNumber,
      title: input.title,
      description: input.description ?? null,
      order: input.order ?? 0,
    },
  });
}

export async function updatePart(id: string, data: { title?: string; description?: string; order?: number }) {
  const d: Record<string, unknown> = {};
  for (const k of ['title', 'description', 'order'] as const) {
    if (data[k] !== undefined) d[k] = data[k];
  }
  return prisma.publicationPart.update({ where: { id }, data: d });
}

export async function reorderPart(id: string, partNumber: number) {
  return prisma.publicationPart.update({ where: { id }, data: { partNumber } });
}

export async function deletePart(id: string) {
  return prisma.publicationPart.delete({ where: { id } });
}

export async function getParts(publicationId: string) {
  return prisma.publicationPart.findMany({
    where: { publicationId },
    orderBy: { partNumber: 'asc' },
    include: { chapters: { orderBy: { chapterNumber: 'asc' } } },
  });
}

// ── chapters ───────────────────────────────────────────────────────────────

export async function addChapter(publicationId: string, input: {
  partId?: string;
  chapterNumber: number;
  title: string;
  subtitle?: string;
  description?: string;
  wordTarget?: number;
  order?: number;
  documentSectionId?: string;
}) {
  return prisma.publicationChapter.create({
    data: {
      publicationId,
      partId: input.partId ?? null,
      chapterNumber: input.chapterNumber,
      title: input.title,
      subtitle: input.subtitle ?? null,
      description: input.description ?? null,
      wordTarget: input.wordTarget ?? null,
      order: input.order ?? 0,
      documentSectionId: input.documentSectionId ?? null,
    },
  });
}

export async function updateChapter(id: string, data: {
  title?: string;
  subtitle?: string;
  description?: string;
  wordTarget?: number;
  order?: number;
  status?: string;
  documentSectionId?: string;
}) {
  const d: Record<string, unknown> = {};
  for (const k of ['title', 'subtitle', 'description', 'wordTarget', 'order', 'status', 'documentSectionId'] as const) {
    if (data[k] !== undefined) d[k] = data[k];
  }
  return prisma.publicationChapter.update({ where: { id }, data: d });
}

export async function getChapters(publicationId: string) {
  return prisma.publicationChapter.findMany({
    where: { publicationId },
    orderBy: { chapterNumber: 'asc' },
    include: { part: true },
  });
}

export async function getChaptersByPublication(publicationId: string) {
  return prisma.publicationChapter.findMany({
    where: { publicationId },
    orderBy: { chapterNumber: 'asc' },
  });
}

export async function deleteChapter(id: string) {
  return prisma.publicationChapter.delete({ where: { id } });
}

// ── front matter ───────────────────────────────────────────────────────────

export async function upsertFrontMatter(publicationId: string, input: {
  kind: string;
  title: string;
  content?: string;
  order?: number;
  required?: boolean;
}) {
  return prisma.publicationFrontMatter.upsert({
    where: { publicationId_kind: { publicationId, kind: input.kind } },
    update: { title: input.title, content: input.content ?? '', order: input.order ?? 0, required: input.required ?? true },
    create: { publicationId, kind: input.kind, title: input.title, content: input.content ?? '', order: input.order ?? 0, required: input.required ?? true },
  });
}

export async function getFrontMatter(publicationId: string) {
  return prisma.publicationFrontMatter.findMany({
    where: { publicationId },
    orderBy: { order: 'asc' },
  });
}

export async function deleteFrontMatter(publicationId: string, kind: string) {
  return prisma.publicationFrontMatter.delete({
    where: { publicationId_kind: { publicationId, kind } },
  });
}

// ── back matter ────────────────────────────────────────────────────────────

export async function upsertBackMatter(publicationId: string, input: {
  kind: string;
  title: string;
  content?: string;
  order?: number;
  required?: boolean;
}) {
  return prisma.publicationBackMatter.upsert({
    where: { publicationId_kind: { publicationId, kind: input.kind } },
    update: { title: input.title, content: input.content ?? '', order: input.order ?? 0, required: input.required ?? true },
    create: { publicationId, kind: input.kind, title: input.title, content: input.content ?? '', order: input.order ?? 0, required: input.required ?? true },
  });
}

export async function getBackMatter(publicationId: string) {
  return prisma.publicationBackMatter.findMany({
    where: { publicationId },
    orderBy: { order: 'asc' },
  });
}

export async function deleteBackMatter(publicationId: string, kind: string) {
  return prisma.publicationBackMatter.delete({
    where: { publicationId_kind: { publicationId, kind } },
  });
}

// ── contributors ───────────────────────────────────────────────────────────

export async function addContributor(publicationId: string, input: {
  name: string;
  role: string;
  order?: number;
}) {
  return prisma.publicationContributor.create({
    data: {
      publicationId,
      name: input.name,
      role: input.role,
      order: input.order ?? 0,
    },
  });
}

export async function updateContributor(id: string, data: { name?: string; role?: string; order?: number }) {
  const d: Record<string, unknown> = {};
  for (const k of ['name', 'role', 'order'] as const) {
    if (data[k] !== undefined) d[k] = data[k];
  }
  return prisma.publicationContributor.update({ where: { id }, data: d });
}

export async function deleteContributor(id: string) {
  return prisma.publicationContributor.delete({ where: { id } });
}

export async function listContributors(publicationId: string) {
  return prisma.publicationContributor.findMany({
    where: { publicationId },
    orderBy: { order: 'asc' },
  });
}

// ── glossary ───────────────────────────────────────────────────────────────

export async function addGlossaryTerm(input: {
  publicationId: string;
  term: string;
  definition: string;
  pronunciation?: string;
  chapterId?: string;
  order?: number;
}) {
  return prisma.publicationGlossary.create({
    data: {
      publicationId: input.publicationId,
      term: input.term,
      definition: input.definition,
      pronunciation: input.pronunciation ?? null,
      chapterId: input.chapterId ?? null,
      order: input.order ?? 0,
    },
  });
}

export async function updateGlossaryTerm(id: string, input: { term?: string; definition?: string; pronunciation?: string; chapterId?: string; order?: number }) {
  const d: Record<string, unknown> = {};
  for (const k of ['term', 'definition', 'pronunciation', 'chapterId', 'order'] as const) {
    if (input[k] !== undefined) d[k] = input[k];
  }
  return prisma.publicationGlossary.update({ where: { id }, data: d });
}

export async function deleteGlossaryTerm(id: string) {
  return prisma.publicationGlossary.delete({ where: { id } });
}

export async function listGlossary(publicationId: string) {
  return prisma.publicationGlossary.findMany({
    where: { publicationId },
    orderBy: { order: 'asc' },
    include: { chapter: true },
  });
}

// ── index ──────────────────────────────────────────────────────────────────

export async function addIndexEntry(input: {
  publicationId: string;
  term: string;
  subterm?: string;
  sectionId?: string;
  blockId?: string;
  order?: number;
}) {
  return prisma.publicationIndexEntry.create({
    data: {
      publicationId: input.publicationId,
      term: input.term,
      subterm: input.subterm ?? null,
      sectionId: input.sectionId ?? null,
      blockId: input.blockId ?? null,
      order: input.order ?? 0,
    },
  });
}

export async function updateIndexEntry(id: string, data: { term?: string; subterm?: string; sectionId?: string; blockId?: string; order?: number }) {
  const d: Record<string, unknown> = {};
  for (const k of ['term', 'subterm', 'sectionId', 'blockId', 'order'] as const) {
    if (data[k] !== undefined) d[k] = data[k];
  }
  return prisma.publicationIndexEntry.update({ where: { id }, data: d });
}

export async function deleteIndexEntry(id: string) {
  return prisma.publicationIndexEntry.delete({ where: { id } });
}

export async function listIndexEntries(publicationId: string) {
  return prisma.publicationIndexEntry.findMany({
    where: { publicationId },
    orderBy: { order: 'asc' },
  });
}

// ── figures & tables ───────────────────────────────────────────────────────

export async function addFigure(input: {
  publicationId: string;
  kind: 'FIGURE' | 'TABLE' | 'CHART' | 'IMAGE';
  caption: string;
  chartId?: string;
  tableId?: string;
  documentSectionId?: string;
  order?: number;
}) {
  const maxN = await prisma.publicationFigure.aggregate({
    where: { publicationId: input.publicationId, kind: input.kind },
    _max: { number: true },
  });
  const number = (maxN._max.number || 0) + 1;
  const chapterPrefix = input.documentSectionId
    ? (await chapterNumberFromSection(input.publicationId, input.documentSectionId)) ?? null
    : null;
  let label: string;
  if (input.kind === 'TABLE') {
    label = chapterPrefix ? `Table ${chapterPrefix}.${number}` : `Table ${number}`;
  } else {
    label = chapterPrefix ? `Figure ${chapterPrefix}.${number}` : `Figure ${number}`;
  }
  return prisma.publicationFigure.create({
    data: {
      publicationId: input.publicationId,
      kind: input.kind,
      number,
      label,
      caption: input.caption,
      chartId: input.chartId ?? null,
      tableId: input.tableId ?? null,
      documentSectionId: input.documentSectionId ?? null,
      order: input.order ?? 0,
    },
  });
}

async function chapterNumberFromSection(publicationId: string, sectionId: string): Promise<number | null> {
  const chapters = await prisma.publicationChapter.findMany({
    where: { publicationId, documentSectionId: sectionId },
    take: 1,
    orderBy: { chapterNumber: 'asc' },
  });
  return chapters[0]?.chapterNumber ?? null;
}

export async function updateFigure(id: string, data: { caption?: string; order?: number }) {
  const d: Record<string, unknown> = {};
  for (const k of ['caption', 'order'] as const) {
    if (data[k] !== undefined) d[k] = data[k];
  }
  return prisma.publicationFigure.update({ where: { id }, data: d });
}

export async function deleteFigure(id: string) {
  return prisma.publicationFigure.delete({ where: { id } });
}

export async function listFigures(publicationId: string, kind?: string) {
  return prisma.publicationFigure.findMany({
    where: {
      publicationId,
      ...(kind ? { kind } : {}),
    },
    orderBy: { number: 'asc' },
    include: { chart: true, table: true },
  });
}

// ── validation ─────────────────────────────────────────────────────────────

export async function runValidation(publicationId: string): Promise<{
  status: string;
  passedCount: number;
  warningCount: number;
  errorCount: number;
}> {
  const issues: Array<{ category: string; severity: string; rule: string; message: string }> = [];

  const pub = await getPublication(publicationId);
  if (!pub) throw new Error('Publication not found');

  // Check required fields
  if (!pub.title || pub.title.trim() === '') {
    issues.push({ category: 'STRUCTURE', severity: 'ERROR', rule: 'TITLE_REQUIRED', message: 'Title is required' });
  }

  if (!pub.publicationType) {
    issues.push({ category: 'STRUCTURE', severity: 'ERROR', rule: 'TYPE_REQUIRED', message: 'Publication type is required' });
  }

  // Check chapters
  const chapters = await getChaptersByPublication(publicationId);
  if (chapters.length === 0) {
    issues.push({ category: 'STRUCTURE', severity: 'WARNING', rule: 'NO_CHAPTERS', message: 'No chapters defined' });
  }

  // Classify issues
  let errorCount = 0;
  let warningCount = 0;
  let passedCount = 0;

  for (const issue of issues) {
    if (issue.severity === 'ERROR') errorCount++;
    else if (issue.severity === 'WARNING') warningCount++;
    else passedCount++;
  }

  // Save validation run
  const run = await prisma.publicationValidationRun.create({
    data: {
      publicationId,
      status: errorCount > 0 ? 'FAILED' : 'COMPLETED',
      passedCount,
      warningCount,
      errorCount,
    },
  });

  // Save individual issues
  for (const issue of issues) {
    await prisma.publicationValidationIssue.create({
      data: {
        validationRunId: run.id,
        ...issue,
      },
    });
  }

  return {
    status: errorCount > 0 ? 'FAILED' : 'COMPLETED',
    passedCount,
    warningCount,
    errorCount,
  };
}

export async function listValidationRuns(publicationId: string) {
  return prisma.publicationValidationRun.findMany({
    where: { publicationId },
    orderBy: { createdAt: 'desc' },
    include: { issues: true },
  });
}

export async function getValidationIssues(validationRunId: string) {
  return prisma.publicationValidationIssue.findMany({
    where: { validationRunId },
    orderBy: { severity: 'asc' },
  });
}

export async function resolveValidationIssue(issueId: string, resolutionNote?: string) {
  return prisma.publicationValidationIssue.update({
    where: { id: issueId },
    data: { resolved: true, resolutionNote: resolutionNote ?? null, resolvedAt: new Date() },
  });
}

// ── document sync ──────────────────────────────────────────────────────────

export async function syncToDocument(publicationId: string): Promise<{ documentId: string; sectionIds: string[] }> {
  const pub = await getPublication(publicationId);
  if (!pub) throw new Error('Publication not found');

  // Create or reuse document
  let document = await prisma.document.findFirst({ where: { id: pub.documentId ?? '' } });
  if (!document) {
    document = await prisma.document.create({
      data: {
        projectId: pub.projectId,
        title: pub.title,
        type: pub.publicationType,
      },
    });
    await prisma.publication.update({
      where: { id: publicationId },
      data: { documentId: document.id },
    });
  }

  // Sync chapters to sections
  const chapters = await getChaptersByPublication(publicationId);
  const sectionIds: string[] = [];

  for (const ch of chapters) {
    let section = await prisma.documentSection.findFirst({
      where: { documentId: document.id, title: ch.title },
    });
    if (!section) {
      section = await prisma.documentSection.create({
        data: {
          documentId: document.id,
          title: ch.title,
          order: ch.order,
        },
      });
      await prisma.publicationChapter.update({
        where: { id: ch.id },
        data: { documentSectionId: section.id },
      });
    }
    sectionIds.push(section.id);
  }

  return { documentId: document.id, sectionIds };
}

// ── table of contents ──────────────────────────────────────────────────────

export async function generateTOC(publicationId: string): Promise<string[]> {
  const parts = await getParts(publicationId);
  const chapters = await getChaptersByPublication(publicationId);
  const toc: string[] = [];

  for (const part of parts) {
    toc.push(`PART ${part.partNumber}: ${part.title}`);
    for (const ch of chapters.filter(c => c.partId === part.id)) {
      toc.push(`  ${ch.chapterNumber}. ${ch.title}`);
    }
  }

  // Add un-parted chapters
  for (const ch of chapters.filter(c => !c.partId)) {
    toc.push(`${ch.chapterNumber}. ${ch.title}`);
  }

  return toc;
}

// ── versioning ─────────────────────────────────────────────────────────────

export async function createPublicationVersion(publicationId: string, note?: string) {
  const pub = await getPublication(publicationId);
  if (!pub) throw new Error('Publication not found');
  const chapters = await getChaptersByPublication(publicationId);
  const parts = await getParts(publicationId);
  const frontMatter = await getFrontMatter(publicationId);
  const backMatter = await getBackMatter(publicationId);
  const glossary = await listGlossary(publicationId);

  // Find last version number
  const lastVersion = await prisma.documentVersion.findFirst({
    where: { documentId: pub.documentId ?? '' },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  });
  const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

  const snapshot = {
    title: pub.title,
    subtitle: pub.subtitle,
    publicationType: pub.publicationType,
    status: pub.status,
    author: pub.author,
    coAuthors: JSON.parse(pub.coAuthors),
    editor: pub.editor,
    publisher: pub.publisher,
    language: pub.language,
    edition: pub.edition,
    publicationYear: pub.publicationYear,
    description: pub.description,
    keywords: JSON.parse(pub.keywords),
    parts: parts.map(p => ({ id: p.id, partNumber: p.partNumber, title: p.title })),
    chapters: chapters.map(ch => ({
      id: ch.id, partId: ch.partId, chapterNumber: ch.chapterNumber,
      title: ch.title, subtitle: ch.subtitle, description: ch.description,
    })),
    frontMatter: frontMatter.map(fm => ({ kind: fm.kind, title: fm.title, order: fm.order })),
    backMatter: backMatter.map(bm => ({ kind: bm.kind, title: bm.title, order: bm.order })),
    glossary: glossary.map(g => ({ term: g.term, definition: g.definition, chapterId: g.chapterId })),
    timestamp: new Date().toISOString(),
  };

  // Create version record
  const version = await prisma.documentVersion.create({
    data: {
      documentId: pub.documentId ?? '',
      versionNumber,
      note: note ?? `Version ${versionNumber}`,
      structure: JSON.stringify(snapshot),
    },
  });

  return version;
}

export async function restoreVersion(publicationId: string, versionId: string) {
  const version = await prisma.documentVersion.findUnique({
    where: { id: versionId },
  });
  if (!version) throw new Error('Version not found');

  const snapshot = JSON.parse(version.structure);

  // Restore publication metadata
  await prisma.publication.update({
    where: { id: publicationId },
    data: {
      title: snapshot.title,
      subtitle: snapshot.subtitle,
      author: snapshot.author,
      coAuthors: JSON.stringify(snapshot.coAuthors),
      editor: snapshot.editor,
      publisher: snapshot.publisher,
      edition: snapshot.edition,
      publicationYear: snapshot.publicationYear,
      description: snapshot.description,
      keywords: JSON.stringify(snapshot.keywords),
    },
  });

  // Clear and restore chapters
  await prisma.publicationChapter.deleteMany({ where: { publicationId } });
  for (const ch of snapshot.chapters) {
    await prisma.publicationChapter.create({
      data: {
        publicationId,
        partId: ch.partId,
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        subtitle: ch.subtitle,
        description: ch.description,
      },
    });
  }

  return { restoredVersionId: version.id, versionNumber: version.versionNumber };
}

export async function listPublicationVersions(publicationId: string) {
  const pub = await getPublication(publicationId);
  if (!pub) throw new Error('Publication not found');
  return prisma.documentVersion.findMany({
    where: { documentId: pub.documentId ?? '' },
    orderBy: { versionNumber: 'desc' },
  });
}

// ── dashboard ──────────────────────────────────────────────────────────────

export async function getPublicationDashboard(publicationId: string) {
  const pub = await getPublication(publicationId);
  if (!pub) throw new Error('Publication not found');
  const [wordCount, paraCount, chapters, figures, glossary, contributors, appendices, versions] = await Promise.all([
    wordCountForDocument(pub.documentId),
    paragraphCountForDocument(pub.documentId),
    getChaptersByPublication(publicationId),
    listFigures(publicationId),
    listGlossary(publicationId),
    listContributors(publicationId),
    prisma.publicationBackMatter.findMany({ where: { publicationId } }),
    prisma.documentVersion.count({ where: { documentId: pub.documentId ?? '' } }),
  ]);
  const contentChapters = await Promise.all(
    chapters.map(async (ch) => {
      if (!ch.documentSectionId) return false;
      const sec = await prisma.documentSection.findUnique({
        where: { id: ch.documentSectionId },
        include: { blocks: true },
      });
      if (!sec) return false;
      return (sec.content && sec.content.trim()) || sec.blocks.some((b: { content: string }) => b.content && b.content.trim());
    }),
  );
  const contentCount = contentChapters.filter(Boolean).length;
  return {
    id: pub.id, title: pub.title, subtitle: pub.subtitle,
    publicationType: pub.publicationType, status: pub.status,
    author: pub.author, editor: pub.editor, publisher: pub.publisher,
    edition: pub.edition, publicationYear: pub.publicationYear,
    trimSize: pub.trimSize, orientation: pub.orientation,
    wordCount, estimatedPages: estimatePages(wordCount, pub.trimSize ?? 'A4'),
    chapterCount: chapters.length, contentChapterCount: contentCount,
    sectionCount: chapters.length + (await prisma.publicationPart.count({ where: { publicationId } })),
    contributorCount: contributors.length,
    glossaryCount: glossary.length,
    figureCount: figures.filter((f) => f.kind === 'FIGURE' || f.kind === 'IMAGE').length,
    tableCount: figures.filter((f) => f.kind === 'TABLE').length,
    chartCount: figures.filter((f) => f.kind === 'CHART').length,
    backMatterCount: appendices.length,
    versionCount: versions,
    lastUpdated: pub.updatedAt,
    validationStatus: 'NEEDS_REVIEW' as const,
  };
}

// ── export bridge ──────────────────────────────────────────────────────────

export async function exportToDocument(publicationId: string, format: 'DOCX' | 'PDF' | 'MARKDOWN' | 'HTML' | 'TXT') {
  const pub = await getPublication(publicationId);
  if (!pub) throw new Error('Publication not found');

  // Use existing Document export service via the linked document
  if (!pub.documentId) {
    throw new Error('Publication must be synced to Document Studio first');
  }

  // Create export job
  const job = await prisma.exportJob.create({
    data: {
      documentId: pub.documentId,
      format,
      status: 'QUEUED',
    },
  });

  return { jobId: job.id, status: job.status };
}

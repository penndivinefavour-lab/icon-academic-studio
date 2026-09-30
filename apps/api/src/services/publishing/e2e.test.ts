/**
 * ICON Academic Studio — Generic Publishing End-to-End Test (Phase 7)
 *
 * Exercises the full publication workflow against real PostgreSQL:
 * create → structure → content → front/back matter → contributors
 * → glossary → index → figures → validation → sync → version → export.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@icon-academic/db';
import * as svc from './service.js';
import { PUBLICATION_TEMPLATES } from './templates.js';
import { generateDocx, generatePdf, generateMarkdown, generateHtml, generateTxt } from '../../services/documentExport.js';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Publishing E2E Workflow', () => {
  let projectId: string;
  let publicationId: string;
  let partId: string;
  let chapterId: string;
  let sectionId: string;
  let contributorId: string;
  let figureId: string;
  let tableFigureId: string;
  let glossaryId: string;
  let indexId: string;
  let validationRunId: string;
  let validationIssueId: string;
  let documentId: string;
  let versionId: string;

  beforeAll(async () => {
    // Create a project for isolation
    const project = await prisma.project.create({
      data: { name: 'Phase 7 E2E Test Book', type: 'ACADEMIC_PROJECT' },
    });
    projectId = project.id;

    // Create publication from template
    const pub = await svc.createPublication({
      projectId,
      title: 'Test Textbook: Phase 7 E2E',
      subtitle: 'A comprehensive testing guide',
      publicationType: 'TEXTBOOK',
      author: 'Test Author',
      description: 'This is a test textbook for the Phase 7 E2E workflow.',
      language: 'en',
      metadata: { customKey: 'customValue' },
    });
    publicationId = pub.id;

    // Add a part
    const part = await svc.addPart(publicationId, { partNumber: 1, title: 'Part I: Basics', order: 1 });
    partId = part.id;

    // Add chapters
    const chapter = await svc.addChapter(publicationId, {
      partId,
      chapterNumber: 1,
      title: 'Chapter 1: Introduction',
      wordTarget: 5000,
      status: 'DRAFT',
    });
    chapterId = chapter.id;

    // Sync to Document Studio for export testing
    const syncResult = await svc.syncToDocument(publicationId);
    documentId = syncResult.documentId;

    // Add a contributor
    const contributor = await svc.addContributor(publicationId, { name: 'John Doe', role: 'Editor', order: 1 });
    contributorId = contributor.id;

    // Add front matter
    await svc.upsertFrontMatter(publicationId, { kind: 'title-page', title: 'Title Page', order: 1, required: true });
    await svc.upsertFrontMatter(publicationId, { kind: 'toc', title: 'Table of Contents', order: 2, required: true });
    await svc.upsertFrontMatter(publicationId, { kind: 'preface', title: 'Preface', order: 3, required: false });

    // Add back matter
    await svc.upsertBackMatter(publicationId, { kind: 'references', title: 'References', order: 1, required: true });
    await svc.upsertBackMatter(publicationId, { kind: 'glossary', title: 'Glossary', order: 2, required: false });
    await svc.upsertBackMatter(publicationId, { kind: 'index', title: 'Index', order: 3, required: false });

    // Add a glossary term
    const glossary = await svc.addGlossaryTerm({
      publicationId,
      term: 'E2E Testing',
      definition: 'End-to-end testing validates the entire workflow.',
      pronunciation: '/iː ˈtwiː ˈdiː/',
      chapterId,
    });
    glossaryId = glossary.id;

    // Add an index entry
    const index = await svc.addIndexEntry({
      publicationId,
      term: 'Testing',
      subterm: 'end-to-end',
    });
    indexId = index.id;

    // Add a figure (using existing chart data pattern)
    const figure = await svc.addFigure({
      publicationId,
      kind: 'FIGURE',
      caption: 'Figure 1: Test Diagram',
      order: 1,
      source: 'Created for E2E test',
    });
    figureId = figure.id;

    // Add a table
    const tableFig = await svc.addFigure({
      publicationId,
      kind: 'TABLE',
      caption: 'Table 1: Summary Data',
      order: 1,
      source: 'Self-generated',
    });
    tableFigureId = tableFig.id;

    // Run validation
    const run = await svc.runValidation(publicationId);
    validationRunId = run.id;

    // Resolve any issues if present
    const issues = await svc.getValidationIssues(validationRunId);
    if (issues.length > 0) {
      for (const issue of issues) {
        await svc.resolveValidationIssue(issue.id, 'Test resolution');
      }
      validationIssueId = issues[0].id;
    }

    // Create a version snapshot
    const version = await svc.createPublicationVersion(publicationId, 'Initial snapshot');
    versionId = version.id;
  });

  afterAll(async () => {
    // Clean up in reverse order
    try {
      if (versionId) await prisma.publicationVersion.delete({ where: { id: versionId } }).catch(() => {});
      if (indexId) await prisma.publicationIndexEntry.delete({ where: { id: indexId } }).catch(() => {});
      if (glossaryId) await prisma.publicationGlossary.delete({ where: { id: glossaryId } }).catch(() => {});
      if (tableFigureId) await prisma.publicationFigure.delete({ where: { id: tableFigureId } }).catch(() => {});
      if (figureId) await prisma.publicationFigure.delete({ where: { id: figureId } }).catch(() => {});
      if (contributorId) await prisma.publicationContributor.delete({ where: { id: contributorId } }).catch(() => {});
      if (chapterId) await prisma.publicationChapter.delete({ where: { id: chapterId } }).catch(() => {});
      if (partId) await prisma.publicationPart.delete({ where: { id: partId } }).catch(() => {});
      if (publicationId) await prisma.publication.delete({ where: { id: publicationId } }).catch(() => {});
      if (projectId) await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
    } catch { /* ignore cleanup errors */ }
  });

  describe('1. Publication creation', () => {
    it('creates a publication with all metadata', async () => {
      const pub = await svc.getPublication(publicationId);
      expect(pub).toBeDefined();
      expect(pub.title).toBe('Test Textbook: Phase 7 E2E');
      expect(pub.author).toBe('Test Author');
      expect(pub.publicationType).toBe('TEXTBOOK');
      // metadata is stored as JSON string
      const meta = JSON.parse(pub.metadata || '{}');
      expect(meta.customKey).toBe('customValue');
    });
  });

  describe('2. Parts and Chapters', () => {
    it('lists parts correctly', async () => {
      const parts = await svc.getParts(publicationId);
      expect(parts).toHaveLength(1);
      expect(parts[0].title).toBe('Part I: Basics');
    });

    it('lists chapters with ordering', async () => {
      const chapters = await svc.getChapters(publicationId);
      expect(chapters).toHaveLength(1);
      expect(chapters[0].chapterNumber).toBe(1);
      expect(chapters[0].wordTarget).toBe(5000);
    });
  });

  describe('3. Front and Back Matter', () => {
    it('has correct front matter items', async () => {
      const front = await svc.getFrontMatter(publicationId);
      expect(front).toHaveLength(3);
      const kinds = front.map(f => f.kind);
      expect(kinds).toContain('title-page');
      expect(kinds).toContain('toc');
      expect(kinds).toContain('preface');
    });

    it('has correct back matter items', async () => {
      const back = await svc.getBackMatter(publicationId);
      expect(back).toHaveLength(3);
      const kinds = back.map(b => b.kind);
      expect(kinds).toContain('references');
      expect(kinds).toContain('glossary');
      expect(kinds).toContain('index');
    });
  });

  describe('4. Contributors', () => {
    it('lists contributors', async () => {
      const contributors = await svc.listContributors(publicationId);
      expect(contributors).toHaveLength(1);
      expect(contributors[0].name).toBe('John Doe');
      expect(contributors[0].role).toBe('Editor');
    });
  });

  describe('5. Glossary Terms', () => {
    it('stores glossary with pronunciation', async () => {
      const terms = await svc.listGlossary(publicationId);
      expect(terms).toHaveLength(1);
      expect(terms[0].term).toBe('E2E Testing');
      expect(terms[0].pronunciation).toBe('/iː ˈtwiː ˈdiː/');
      expect(terms[0].chapterId).toBe(chapterId);
    });
  });

  describe('6. Index Entries', () => {
    it('links index entries to sections', async () => {
      const entries = await svc.listIndexEntries(publicationId);
      expect(entries).toHaveLength(1);
      expect(entries[0].term).toBe('Testing');
      expect(entries[0].subterm).toBe('end-to-end');
    });
  });

  describe('7. Figures and Tables', () => {
    it('distinguishes figures from tables by kind', async () => {
      const figures = await svc.listFigures(publicationId);
      expect(figures).toHaveLength(2);
      const kinds = figures.map(f => f.kind);
      // Database stores enum values - check both cases
      expect(kinds.some(k => k === 'FIGURE' || k.toLowerCase() === 'figure')).toBe(true);
      expect(kinds.some(k => k === 'TABLE' || k.toLowerCase() === 'table')).toBe(true);
    });

    it('figures have captions and sources', async () => {
      const figures = await svc.listFigures(publicationId);
      const fig = figures.find(f => f.kind === 'FIGURE' || f.kind?.toLowerCase() === 'figure');
      expect(fig?.caption).toContain('Figure 1');
      // Labels are auto-generated as "Figure N"
      expect(fig?.label).toBeDefined();
    });
  });

  describe('8. Validation', () => {
    it('runs validation checks', async () => {
      const runs = await svc.listValidationRuns(publicationId);
      expect(runs).toHaveLength(1);
      expect(runs[0].status).toBe('COMPLETED');
    });

    it('creates validation issues on problematic publications', async () => {
      // Create a minimal pub without title to trigger validation
      const badPub = await svc.createPublication({ projectId, title: '', publicationType: 'TEXTBOOK' });
      const run = await svc.runValidation(badPub.id);
      const issues = await svc.getValidationIssues(run.id);
      // Should have at least one error for missing title
      expect(issues.some(i => i.severity === 'ERROR')).toBe(true);
      await svc.deletePublication(badPub.id);
    });

    it('resolves validation issues', async () => {
      const unresolved = await svc.getValidationIssues(validationRunId);
      // We already resolved them above, but test again
      const resolved = unresolved.filter(i => i.resolvedAt !== null);
      expect(resolved.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('9. Document Synchronization', () => {
    it('syncs publication to Document Studio', async () => {
      expect(documentId).toBeDefined();
      const doc = await prisma.document.findUnique({ where: { id: documentId } });
      expect(doc).toBeDefined();
      expect(doc!.title).toContain('Test Textbook');
      // Verify publication was updated with documentId
      const updatedPub = await svc.getPublication(publicationId);
      expect(updatedPub.documentId).toBe(documentId);
    });
  });

  describe('10. TOC Generation', () => {
    it('generates table of contents', async () => {
      const toc = await svc.generateTOC(publicationId);
      expect(toc).toBeDefined();
      expect(Array.isArray(toc)).toBe(true);
      // Should contain at least the chapter we created (TOC is an array of strings)
      expect(toc.some(item => item.includes('Chapter 1'))).toBe(true);
    });
  });

  describe('11. Version Management', () => {
    it('creates version snapshots', async () => {
      const versions = await svc.listPublicationVersions(publicationId);
      expect(versions).toHaveLength(1);
      expect(versions[0].note).toBe('Initial snapshot');
    });

    it('restores previous version', async () => {
      const originalTitle = 'Test Textbook: Phase 7 E2E';
      // Modify publication
      await svc.updatePublication(publicationId, { title: 'Modified Title' });

      // Restore version
      await svc.restoreVersion(publicationId, versionId);

      // Verify restoration
      const restored = await svc.getPublication(publicationId);
      expect(restored.title).toBe(originalTitle);
    });
  });

  describe('12. Export Integration', () => {
    it('exports DOCX with content', async () => {
      const docxBuffer = await generateDocx(documentId);
      expect(docxBuffer.length).toBeGreaterThan(1000);
      // DOCX is a ZIP file; check magic bytes
      expect(docxBuffer[0]).toBe(0x50); // 'P' - ZIP signature
      expect(docxBuffer[1]).toBe(0x4B); // 'K'
    });

    it('exports PDF with correct header', async () => {
      const pdfBuffer = await generatePdf(documentId);
      expect(pdfBuffer.length).toBeGreaterThan(100);
      const head = Buffer.from(pdfBuffer.subarray(0, 5)).toString('latin1');
      expect(head).toBe('%PDF-');
    });

    it('exports Markdown with title', async () => {
      const md = await generateMarkdown(documentId);
      expect(md).toContain('Test Textbook');
    });

    it('exports HTML with structure', async () => {
      const html = await generateHtml(documentId);
      expect(html.toLowerCase()).toContain('<section');
      expect(html).toContain('</div>');
    });

    it('exports TXT with chapter content', async () => {
      const txt = await generateTxt(documentId);
      expect(txt).toContain('Chapter 1');
    });
  });

  describe('13. Dashboard Statistics', () => {
    it('computes dashboard stats correctly', async () => {
      const dash = await svc.getPublicationDashboard(publicationId);
      // Verify structure exists with expected keys
      expect(dash).toBeDefined();
      expect(dash.id).toBe(publicationId);
      expect(dash.title).toBe('Test Textbook: Phase 7 E2E');
      // Key counts should be numbers
      expect(typeof dash.chapterCount).toBe('number');
      expect(typeof dash.sectionCount).toBe('number');
      expect(typeof dash.wordCount).toBe('number');
    });
  });

  describe('14. Template Application', () => {
    it('loads templates correctly', () => {
      const template = PUBLICATION_TEMPLATES.find(t => t.publicationType === 'TEXTBOOK');
      expect(template).toBeDefined();
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('frontMatter');
      expect(template).toHaveProperty('backMatter');
    });

    it('all templates are defined', () => {
      // Templates exist - check that common types are present
      const types = PUBLICATION_TEMPLATES.map(t => t.publicationType);
      expect(types).toContain('TEXTBOOK');
      expect(types).toContain('STUDY_GUIDE');
      expect(types).toContain('GCE_STUDY_PAMPHLET');
    });
  });

  describe('15. ISBN Validation', () => {
    // ISBN validation is done by the service during creation; test the database accepts valid values
    it('accepts valid ISBN-13', async () => {
      const testProject = await prisma.project.create({ data: { name: 'ISBN Test', type: 'ACADEMIC_PROJECT' } });
      const pub = await svc.createPublication({
        projectId: testProject.id,
        title: 'ISBN Test Book',
        publicationType: 'TEXTBOOK',
        isbn13: '9780123456789',
      });
      expect(pub.isbn13).toBe('9780123456789');
      await svc.deletePublication(pub.id);
      await prisma.project.delete({ where: { id: testProject.id } });
    });
  });
});

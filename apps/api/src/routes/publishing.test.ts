/**
 * ICON Academic Studio — Publishing Tests (Phase 7)
 *
 * Unit and integration tests for Publication CRUD, Parts, Chapters,
 * Front/Back Matter, Contributors, Glossary, Index, Figures/Tables,
 * Validation, Versioning, Document sync, TOC, Export.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@icon-academic/db';
import * as pubService from '../services/publishing/service.js';

// ── helpers ─────────────────────────────────────────────────────────────────

async function createTestProject() {
  const project = await prisma.project.create({
    data: {
      name: `Test Project ${Date.now()}`,
      description: 'Test project for Phase 7',
      type: 'BOOK',
      status: 'DRAFT',
    },
  });
  return project;
}

let testProjectId: string;

beforeEach(async () => {
  const project = await createTestProject();
  testProjectId = project.id;
});

// ── publication CRUD ────────────────────────────────────────────────────────

describe('Publication CRUD', () => {
  it('should create a publication', async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'Test Textbook',
      publicationType: 'TEXTBOOK',
      author: 'John Doe',
    });
    
    expect(pub).toBeDefined();
    expect(pub.id).toBeTruthy();
    expect(pub.title).toBe('Test Textbook');
    expect(pub.publicationType).toBe('TEXTBOOK');
    expect(pub.status).toBe('DRAFT');
  });

  it('should list publications for a project', async () => {
    await pubService.createPublication({
      projectId: testProjectId,
      title: 'Pub 1',
      publicationType: 'TEXTBOOK',
    });
    await pubService.createPublication({
      projectId: testProjectId,
      title: 'Pub 2',
      publicationType: 'STUDY_GUIDE',
    });

    const pubs = await pubService.listPublications(testProjectId);
    expect(pubs.length).toBe(2);
  });

  it('should update a publication', async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'Original Title',
      publicationType: 'TEXTBOOK',
    });

    const updated = await pubService.updatePublication(pub.id, {
      title: 'Updated Title',
      status: 'IN_REVIEW',
    });
    
    expect(updated.title).toBe('Updated Title');
    expect(updated.status).toBe('IN_REVIEW');
  });

  it('should delete a publication', async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'To Delete',
      publicationType: 'TEXTBOOK',
    });

    await pubService.deletePublication(pub.id);
    
    const remaining = await pubService.getPublication(pub.id);
    expect(remaining).toBeNull();
  });
});

// ── parts ──────────────────────────────────────────────────────────────────

describe('Parts', () => {
  let publicationId: string;

  beforeEach(async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'Test Book',
      publicationType: 'TEXTBOOK',
    });
    publicationId = pub.id;
  });

  it('should add a part', async () => {
    const part = await pubService.addPart(publicationId, {
      partNumber: 1,
      title: 'Part One',
      description: 'First part',
    });
    
    expect(part).toBeDefined();
    expect(part.partNumber).toBe(1);
    expect(part.title).toBe('Part One');
  });

  it('should get parts for a publication', async () => {
    await pubService.addPart(publicationId, { partNumber: 1, title: 'Part 1' });
    await pubService.addPart(publicationId, { partNumber: 2, title: 'Part 2' });

    const parts = await pubService.getParts(publicationId);
    expect(parts.length).toBe(2);
    expect(parts[0].partNumber).toBe(1);
    expect(parts[1].partNumber).toBe(2);
  });

  it('should update a part', async () => {
    const part = await pubService.addPart(publicationId, {
      partNumber: 1,
      title: 'Original',
    });

    const updated = await pubService.updatePart(part.id, {
      title: 'Updated',
    });
    
    expect(updated.title).toBe('Updated');
  });

  it('should delete a part', async () => {
    const part = await pubService.addPart(publicationId, {
      partNumber: 1,
      title: 'To Delete',
    });

    await pubService.deletePart(part.id);
    
    const parts = await pubService.getParts(publicationId);
    expect(parts.length).toBe(0);
  });
});

// ── chapters ────────────────────────────────────────────────────────────────

describe('Chapters', () => {
  let publicationId: string;

  beforeEach(async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'Test Book',
      publicationType: 'TEXTBOOK',
    });
    publicationId = pub.id;
  });

  it('should add a chapter', async () => {
    const chapter = await pubService.addChapter(publicationId, {
      chapterNumber: 1,
      title: 'Introduction',
      description: 'Chapter 1',
    });
    
    expect(chapter).toBeDefined();
    expect(chapter.chapterNumber).toBe(1);
    expect(chapter.title).toBe('Introduction');
  });

  it('should get chapters for a publication', async () => {
    await pubService.addChapter(publicationId, { chapterNumber: 1, title: 'Ch1' });
    await pubService.addChapter(publicationId, { chapterNumber: 2, title: 'Ch2' });
    await pubService.addChapter(publicationId, { chapterNumber: 3, title: 'Ch3' });

    const chapters = await pubService.getChaptersByPublication(publicationId);
    expect(chapters.length).toBe(3);
    expect(chapters[0].chapterNumber).toBe(1);
    expect(chapters[2].chapterNumber).toBe(3);
  });

  it('should update a chapter', async () => {
    const chapter = await pubService.addChapter(publicationId, {
      chapterNumber: 1,
      title: 'Original',
    });

    const updated = await pubService.updateChapter(chapter.id, {
      title: 'Updated Chapter',
      wordTarget: 5000,
    });
    
    expect(updated.title).toBe('Updated Chapter');
    expect(updated.wordTarget).toBe(5000);
  });

  it('should delete a chapter', async () => {
    const chapter = await pubService.addChapter(publicationId, {
      chapterNumber: 1,
      title: 'To Delete',
    });

    await pubService.deleteChapter(chapter.id);
    
    const chapters = await pubService.getChaptersByPublication(publicationId);
    expect(chapters.length).toBe(0);
  });
});

// ── front matter ────────────────────────────────────────────────────────────

describe('Front Matter', () => {
  let publicationId: string;

  beforeEach(async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'Test Book',
      publicationType: 'TEXTBOOK',
    });
    publicationId = pub.id;
  });

  it('should upsert front matter', async () => {
    const item = await pubService.upsertFrontMatter(publicationId, {
      kind: 'TITLE_PAGE',
      title: 'Title Page',
      content: '<h1>Title</h1>',
    });
    
    expect(item).toBeDefined();
    expect(item.kind).toBe('TITLE_PAGE');
    expect(item.content).toBe('<h1>Title</h1>');
  });

  it('should get front matter items', async () => {
    await pubService.upsertFrontMatter(publicationId, {
      kind: 'TITLE_PAGE',
      title: 'Title Page',
    });
    await pubService.upsertFrontMatter(publicationId, {
      kind: 'DEDICATION',
      title: 'Dedication',
    });

    const items = await pubService.getFrontMatter(publicationId);
    expect(items.length).toBe(2);
  });

  it('should delete front matter', async () => {
    await pubService.upsertFrontMatter(publicationId, {
      kind: 'TITLE_PAGE',
      title: 'Title Page',
    });

    await pubService.deleteFrontMatter(publicationId, 'TITLE_PAGE');
    
    const items = await pubService.getFrontMatter(publicationId);
    expect(items.length).toBe(0);
  });
});

// ── back matter ────────────────────────────────────────────────────────────

describe('Back Matter', () => {
  let publicationId: string;

  beforeEach(async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'Test Book',
      publicationType: 'TEXTBOOK',
    });
    publicationId = pub.id;
  });

  it('should upsert back matter', async () => {
    const item = await pubService.upsertBackMatter(publicationId, {
      kind: 'REFERENCES',
      title: 'References',
      content: '[1] Author, A. (2024).',
    });
    
    expect(item).toBeDefined();
    expect(item.kind).toBe('REFERENCES');
  });

  it('should get back matter items', async () => {
    await pubService.upsertBackMatter(publicationId, {
      kind: 'GLOSSARY',
      title: 'Glossary',
    });
    await pubService.upsertBackMatter(publicationId, {
      kind: 'INDEX',
      title: 'Index',
    });

    const items = await pubService.getBackMatter(publicationId);
    expect(items.length).toBe(2);
  });

  it('should delete back matter', async () => {
    await pubService.upsertBackMatter(publicationId, {
      kind: 'REFERENCES',
      title: 'References',
    });

    await pubService.deleteBackMatter(publicationId, 'REFERENCES');
    
    const items = await pubService.getBackMatter(publicationId);
    expect(items.length).toBe(0);
  });
});

// ── contributors ────────────────────────────────────────────────────────────

describe('Contributors', () => {
  let publicationId: string;

  beforeEach(async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'Test Book',
      publicationType: 'TEXTBOOK',
    });
    publicationId = pub.id;
  });

  it('should add a contributor', async () => {
    const contrib = await pubService.addContributor(publicationId, {
      name: 'John Doe',
      role: 'AUTHOR',
      order: 1,
    });
    
    expect(contrib).toBeDefined();
    expect(contrib.name).toBe('John Doe');
    expect(contrib.role).toBe('AUTHOR');
  });

  it('should list contributors', async () => {
    await pubService.addContributor(publicationId, {
      name: 'Author One',
      role: 'AUTHOR',
      order: 1,
    });
    await pubService.addContributor(publicationId, {
      name: 'Editor Two',
      role: 'EDITOR',
      order: 2,
    });

    const contributors = await pubService.listContributors(publicationId);
    expect(contributors.length).toBe(2);
    expect(contributors[0].name).toBe('Author One');
  });

  it('should update a contributor', async () => {
    const contrib = await pubService.addContributor(publicationId, {
      name: 'Original Name',
      role: 'AUTHOR',
    });

    const updated = await pubService.updateContributor(contrib.id, {
      name: 'Updated Name',
    });
    
    expect(updated.name).toBe('Updated Name');
  });

  it('should delete a contributor', async () => {
    const contrib = await pubService.addContributor(publicationId, {
      name: 'To Delete',
      role: 'AUTHOR',
    });

    await pubService.deleteContributor(contrib.id);
    
    const contributors = await pubService.listContributors(publicationId);
    expect(contributors.length).toBe(0);
  });
});

// ── glossary ────────────────────────────────────────────────────────────────

describe('Glossary', () => {
  let publicationId: string;

  beforeEach(async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'Test Book',
      publicationType: 'TEXTBOOK',
    });
    publicationId = pub.id;
  });

  it('should add a glossary term', async () => {
    const term = await pubService.addGlossaryTerm({
      publicationId,
      term: 'Algorithm',
      definition: 'A set of instructions',
      pronunciation: '/ˈælɡərɪðəm/',
    });
    
    expect(term).toBeDefined();
    expect(term.term).toBe('Algorithm');
    expect(term.pronunciation).toBe('/ˈælɡərɪðəm/');
  });

  it('should list glossary terms', async () => {
    await pubService.addGlossaryTerm({
      publicationId,
      term: 'First Term',
      definition: 'Definition 1',
    });
    await pubService.addGlossaryTerm({
      publicationId,
      term: 'Second Term',
      definition: 'Definition 2',
    });

    const terms = await pubService.listGlossary(publicationId);
    expect(terms.length).toBe(2);
    expect(terms[0].term).toBe('First Term');
  });

  it('should update a glossary term', async () => {
    const term = await pubService.addGlossaryTerm({
      publicationId,
      term: 'Original',
      definition: 'Original Definition',
    });

    const updated = await pubService.updateGlossaryTerm(term.id, {
      definition: 'Updated Definition',
    });
    
    expect(updated.definition).toBe('Updated Definition');
  });

  it('should delete a glossary term', async () => {
    const term = await pubService.addGlossaryTerm({
      publicationId,
      term: 'To Delete',
      definition: 'Definition',
    });

    await pubService.deleteGlossaryTerm(term.id);
    
    const terms = await pubService.listGlossary(publicationId);
    expect(terms.length).toBe(0);
  });
});

// ── index entries ───────────────────────────────────────────────────────────

describe('Index Entries', () => {
  let publicationId: string;

  beforeEach(async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'Test Book',
      publicationType: 'TEXTBOOK',
    });
    publicationId = pub.id;
  });

  it('should add an index entry', async () => {
    const entry = await pubService.addIndexEntry({
      publicationId,
      term: 'Python',
      subterm: 'programming language',
    });
    
    expect(entry).toBeDefined();
    expect(entry.term).toBe('Python');
    expect(entry.subterm).toBe('programming language');
  });

  it('should list index entries', async () => {
    await pubService.addIndexEntry({ publicationId, term: 'Apple' });
    await pubService.addIndexEntry({ publicationId, term: 'Banana' });

    const entries = await pubService.listIndexEntries(publicationId);
    expect(entries.length).toBe(2);
  });

  it('should update an index entry', async () => {
    const entry = await pubService.addIndexEntry({
      publicationId,
      term: 'Original',
    });

    const updated = await pubService.updateIndexEntry(entry.id, {
      term: 'Updated',
    });
    
    expect(updated.term).toBe('Updated');
  });

  it('should delete an index entry', async () => {
    const entry = await pubService.addIndexEntry({
      publicationId,
      term: 'To Delete',
    });

    await pubService.deleteIndexEntry(entry.id);
    
    const entries = await pubService.listIndexEntries(publicationId);
    expect(entries.length).toBe(0);
  });
});

// ── figures and tables ──────────────────────────────────────────────────────

describe('Figures and Tables', () => {
  let publicationId: string;

  beforeEach(async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'Test Book',
      publicationType: 'TEXTBOOK',
    });
    publicationId = pub.id;
  });

  it('should add a figure', async () => {
    const figure = await pubService.addFigure({
      publicationId,
      kind: 'FIGURE',
      caption: 'Figure showing the process',
      order: 1,
    });
    
    expect(figure).toBeDefined();
    expect(figure.kind).toBe('FIGURE');
    expect(figure.label).toBe('Figure 1');
    expect(figure.number).toBe(1);
  });

  it('should add a table', async () => {
    const table = await pubService.addFigure({
      publicationId,
      kind: 'TABLE',
      caption: 'Summary statistics',
      order: 1,
    });
    
    expect(table).toBeDefined();
    expect(table.kind).toBe('TABLE');
    expect(table.label).toBe('Table 1');
    expect(table.number).toBe(1);
  });

  it('should list figures by kind', async () => {
    await pubService.addFigure({ publicationId, kind: 'FIGURE', caption: 'Fig 1' });
    await pubService.addFigure({ publicationId, kind: 'TABLE', caption: 'Table 1' });
    await pubService.addFigure({ publicationId, kind: 'FIGURE', caption: 'Fig 2' });

    const figures = await pubService.listFigures(publicationId);
    expect(figures.length).toBe(3);

    const onlyFigures = await pubService.listFigures(publicationId, 'FIGURE');
    expect(onlyFigures.length).toBe(2);
    expect(onlyFigures[0].kind).toBe('FIGURE');
  });

  it('should update a figure', async () => {
    const figure = await pubService.addFigure({
      publicationId,
      kind: 'FIGURE',
      caption: 'Original caption',
    });

    const updated = await pubService.updateFigure(figure.id, {
      caption: 'Updated caption',
    });
    
    expect(updated.caption).toBe('Updated caption');
  });

  it('should delete a figure', async () => {
    const figure = await pubService.addFigure({
      publicationId,
      kind: 'FIGURE',
      caption: 'To Delete',
    });

    await pubService.deleteFigure(figure.id);
    
    const figures = await pubService.listFigures(publicationId);
    expect(figures.length).toBe(0);
  });
});

// ── validation ──────────────────────────────────────────────────────────────

describe('Validation', () => {
  let publicationId: string;

  beforeEach(async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'Test Book',
      publicationType: 'TEXTBOOK',
    });
    publicationId = pub.id;
  });

  it('should run validation on a complete publication', async () => {
    const result = await pubService.runValidation(publicationId);
    
    expect(result).toBeDefined();
    expect(result.status).toBe('COMPLETED');
    expect(result.errorCount).toBe(0);
  });

  it('should detect missing title', async () => {
    await pubService.updatePublication(publicationId, { title: '' });
    
    const result = await pubService.runValidation(publicationId);
    
    expect(result.status).toBe('FAILED');
    expect(result.errorCount).toBeGreaterThan(0);
  });

  it('should list validation runs', async () => {
    await pubService.runValidation(publicationId);
    await pubService.runValidation(publicationId);

    const runs = await pubService.listValidationRuns(publicationId);
    expect(runs.length).toBe(2);
  });

  it('should resolve validation issues', async () => {
    await pubService.runValidation(publicationId);
    
    const runs = await pubService.listValidationRuns(publicationId);
    if (runs.length > 0 && (runs[0] as any).issues?.length > 0) {
      const issue = (runs[0] as any).issues[0];
      const resolved = await pubService.resolveValidationIssue(issue.id, 'Fixed manually');
      
      expect(resolved.resolved).toBe(true);
      expect(resolved.resolutionNote).toBe('Fixed manually');
    }
  });
});

// ── document sync ───────────────────────────────────────────────────────────

describe('Document Sync', () => {
  let publicationId: string;

  beforeEach(async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'Test Book',
      publicationType: 'TEXTBOOK',
    });
    publicationId = pub.id;
  });

  it('should sync to Document Studio', async () => {
    await pubService.addChapter(publicationId, {
      chapterNumber: 1,
      title: 'Introduction',
    });

    const result = await pubService.syncToDocument(publicationId);
    
    expect(result).toBeDefined();
    expect(result.documentId).toBeDefined();
    expect(result.sectionIds.length).toBeGreaterThan(0);
  });
});

// ── TOC generation ──────────────────────────────────────────────────────────

describe('TOC Generation', () => {
  let publicationId: string;

  beforeEach(async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'Test Book',
      publicationType: 'TEXTBOOK',
    });
    publicationId = pub.id;
  });

  it('should generate TOC', async () => {
    await pubService.addChapter(publicationId, {
      chapterNumber: 1,
      title: 'Introduction',
    });
    await pubService.addChapter(publicationId, {
      chapterNumber: 2,
      title: 'Methods',
    });

    const toc = await pubService.generateTOC(publicationId);
    
    expect(toc).toBeDefined();
    expect(toc.length).toBe(2);
    expect(toc[0]).toContain('Introduction');
  });
});

// ── versioning ──────────────────────────────────────────────────────────────

describe('Versioning', () => {
  let publicationId: string;
  let documentId: string;

  beforeEach(async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'Test Book',
      publicationType: 'TEXTBOOK',
    });
    publicationId = pub.id;

    // Create a document for versioning
    const doc = await prisma.document.create({
      data: {
        projectId: testProjectId,
        title: 'Version Test',
        type: 'TEXTBOOK',
      },
    });
    documentId = doc.id;

    // Link publication to document
    await pubService.updatePublication(publicationId, { documentId });
  });

  it('should create a version', async () => {
    await pubService.addChapter(publicationId, {
      chapterNumber: 1,
      title: 'Introduction',
    });

    const version = await pubService.createPublicationVersion(publicationId, 'Initial version');
    
    expect(version).toBeDefined();
    expect(version.versionNumber).toBe(1);
  });

  it('should list versions', async () => {
    await pubService.createPublicationVersion(publicationId, 'Version 1');
    await pubService.createPublicationVersion(publicationId, 'Version 2');

    const versions = await pubService.listPublicationVersions(publicationId);
    expect(versions.length).toBe(2);
    expect(versions[0].versionNumber).toBe(2);
  });

  it('should restore a version', async () => {
    const v1 = await pubService.createPublicationVersion(publicationId, 'Version 1');
    
    await pubService.updatePublication(publicationId, { title: 'Modified Title' });
    
    const restored = await pubService.restoreVersion(publicationId, v1.id);
    
    expect(restored.restoredVersionId).toBe(v1.id);
  });
});

// ── dashboard ───────────────────────────────────────────────────────────────

describe('Dashboard', () => {
  let publicationId: string;

  beforeEach(async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'Test Book',
      publicationType: 'TEXTBOOK',
    });
    publicationId = pub.id;
  });

  it('should return dashboard data', async () => {
    await pubService.addChapter(publicationId, {
      chapterNumber: 1,
      title: 'Introduction',
    });
    await pubService.addContributor(publicationId, {
      name: 'John Doe',
      role: 'AUTHOR',
    });
    await pubService.addGlossaryTerm({
      publicationId,
      term: 'Test Term',
      definition: 'Test Definition',
    });

    const dashboard = await pubService.getPublicationDashboard(publicationId);
    
    expect(dashboard).toBeDefined();
    expect(dashboard.id).toBe(publicationId);
    expect(dashboard.title).toBe('Test Book');
    expect(dashboard.chapterCount).toBe(1);
    expect(dashboard.contributorCount).toBe(1);
    expect(dashboard.glossaryCount).toBe(1);
  });
});

// ── export ──────────────────────────────────────────────────────────────────

describe('Export', () => {
  let publicationId: string;
  let documentId: string;

  beforeEach(async () => {
    const pub = await pubService.createPublication({
      projectId: testProjectId,
      title: 'Test Book',
      publicationType: 'TEXTBOOK',
    });
    publicationId = pub.id;
    
    // Create a document for export
    const doc = await prisma.document.create({
      data: {
        projectId: testProjectId,
        title: 'Export Test',
        type: 'TEXTBOOK',
      },
    });
    documentId = doc.id;
    
    // Link publication to document
    await pubService.updatePublication(publicationId, { documentId });
  });

  it('should export to DOCX', async () => {
    const result = await pubService.exportToDocument(publicationId, 'DOCX');
    
    expect(result).toBeDefined();
    expect(result.jobId).toBeDefined();
    expect(result.status).toBe('QUEUED');
  });

  it('should export to PDF', async () => {
    const result = await pubService.exportToDocument(publicationId, 'PDF');
    
    expect(result).toBeDefined();
    expect(result.status).toBe('QUEUED');
  });
});

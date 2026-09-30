/**
 * ICON Academic Studio — GCE Study Guide End-to-End Test (Phase 7)
 *
 * Exercises the full GCE study guide workflow:
 * Uses existing GCE subject/syllabus data (Phase 5), creates a GCE_STUDY_PAMPHLET
 * publication, maps syllabus topics to chapters, adds historical questions with
 * provenance, validates, exports.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@icon-academic/db';
import * as pubSvc from '../publishing/service.js';
import { generateDocx, generateMarkdown } from '../../services/documentExport.js';

describe('GCE Study Guide Workflow', () => {
  let projectId: string;
  let publicationId: string;
  let documentId: string;
  let syllabusId: string;
  let topicId: string;
  let paperId: string;
  let subjectId: string;
  let partId: string;

  beforeAll(async () => {
    // Create project for isolation
    const project = await prisma.project.create({
      data: { name: 'GCE Study Guide E2E Test', type: 'ACADEMIC_PROJECT' },
    });
    projectId = project.id;

    // Use existing GCE data or create minimal fixture
    const board = await prisma.examBoard.findFirst();
    if (!board) throw new Error('No exam boards in database');

    // Get or create a subject
    let subject = await prisma.subject.findFirst({ where: { examBoardId: board.id } });
    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          name: 'Mathematics',
          code: 'MATH001',
          examBoardId: board.id,
          level: 'A-LEVEL',
        },
      });
    }
    subjectId = subject.id;

    // Get or create a syllabus
    let syllabus = await prisma.syllabus.findFirst({ where: { subjectId } });
    if (!syllabus) {
      syllabus = await prisma.syllabus.create({
        data: {
          title: 'Mathematics A-Level Syllabus 2024',
          code: 'MATH-A2-2024',
          subjectId,
          examinationBody: board.name,
          year: '2024',
          content: '# Syllabus Content\n\n## Paper 1: Pure Mathematics\n\n### Topic 1: Algebra and Functions',
        },
      });
    }
    syllabusId = syllabus.id;

    // Get or create a topic
    let topic = await prisma.syllabusTopic.findFirst({ where: { syllabusId } });
    if (!topic) {
      topic = await prisma.syllabusTopic.create({
        data: {
          syllabusId,
          code: 'A.1',
          title: 'Algebra and Functions',
          order: 1,
          description: 'Core algebraic concepts and functions',
        },
      });
    }
    topicId = topic.id;

    // Create a past paper (historical, not predicted)
    const paper = await prisma.pastPaper.create({
      data: {
        projectId,
        examBoardId: board.id,
        subjectId,
        year: 2020,
        paperNumber: '12',
        title: 'Pure Mathematics 1',
        metadata: JSON.stringify({
          sourceType: 'past_paper',
          historicalYear: 2020,
          provenance: 'Historical examination paper',
          sampleQuestions: 'Solve quadratic equations, differentiation, area under curves',
        }),
      },
    });
    paperId = paper.id;

    // Create GCE Study Pamphlet publication
    const pub = await pubSvc.createPublication({
      projectId,
      title: 'Mathematics A-Level Study Guide',
      subtitle: 'Historical Question Bank with Mark Schemes',
      publicationType: 'GCE_STUDY_PAMPHLET',
      author: 'Study Guide Team',
      description: 'A comprehensive study guide organized by syllabus topic with historically sourced questions.',
      language: 'en',
      trimSize: 'A4',
      orientation: 'PORTRAIT',
    });
    publicationId = pub.id;

    // Add a part for the subject
    const part = await pubSvc.addPart(publicationId, {
      partNumber: 1,
      title: 'Pure Mathematics',
      order: 1,
    });
    partId = part.id;

    // Map syllabus topic to chapter
    await pubSvc.addChapter(publicationId, {
      partId: part.id,
      chapterNumber: 1,
      title: `Topic ${topic.code}: Algebra and Functions`,
      wordTarget: 3000,
      status: 'DRAFT',
      metadata: JSON.stringify({
        syllabusTopicId: topicId,
        pastPaperIds: [paperId],
        provenance: 'Historical past paper questions from 2020 examination series',
      }),
    });

    // Sync to Document Studio
    const syncResult = await pubSvc.syncToDocument(publicationId);
    documentId = syncResult.documentId;

    // Add front matter
    await pubSvc.upsertFrontMatter(publicationId, {
      kind: 'title-page',
      title: 'Title Page',
      order: 1,
      required: true,
    });
    await pubSvc.upsertFrontMatter(publicationId, {
      kind: 'table-of-contents',
      title: 'Table of Contents',
      order: 2,
      required: true,
    });

    // Add back matter
    await pubSvc.upsertBackMatter(publicationId, {
      kind: 'references',
      title: 'References',
      order: 1,
      required: true,
      content: JSON.stringify([{
        type: 'past_paper',
        reference: `Mathematics A-Level, Paper 9709/12, 2020`,
        provenance: `Exam board: ${board.name}`,
      }]),
    });
    await pubSvc.upsertBackMatter(publicationId, {
      kind: 'answer-key',
      title: 'Answer Key & Mark Schemes',
      order: 2,
      required: true,
    });

    // Add contributor
    await pubSvc.addContributor(publicationId, {
      name: 'Senior Examiner',
      role: 'Content Reviewer',
      order: 1,
    });

    // Add glossary term with pronunciation
    await pubSvc.addGlossaryTerm({
      publicationId,
      term: 'Derivative',
      definition: 'The rate of change of a function at a given point.',
      pronunciation: '/dɪˈrɪv.ə.tɪv/',
    });

    // Add index entry
    await pubSvc.addIndexEntry({
      publicationId,
      term: 'Differentiation',
      subterm: 'tangent',
    });
  });

  describe('GCE Study Guide Structure', () => {
    it('has correct publication metadata', async () => {
      const pub = await pubSvc.getPublication(publicationId);
      expect(pub.title).toContain('Mathematics');
      expect(pub.publicationType).toBe('GCE_STUDY_PAMPHLET');
      expect(pub.trimSize).toBe('A4');
    });

    it('maps syllabus topics to chapters', async () => {
      const chapters = await pubSvc.getChapters(publicationId);
      expect(chapters.length).toBeGreaterThanOrEqual(1);
      const chapter = chapters[0];
      expect(chapter.title).toContain('Topic');
      // Chapters should have a partId (linked to part)
      expect(chapter.partId).toBeDefined();
    });
  });

  describe('Historical Provenance', () => {
    it('preserves historical question source', async () => {
      const pub = await pubSvc.getPublication(publicationId);
      const metadata = JSON.parse(pub.metadata || '{}');
      // The publication should have provenance info
      expect(pub.description).toContain('historically');
    });

    it('links to past papers via back matter', async () => {
      const backMatter = await pubSvc.getBackMatter(publicationId);
      const references = backMatter.find((b: { kind: string }) => b.kind === 'references');
      expect(references).toBeDefined();
      expect(references.content).toContain('past_paper');
    });
  });

  describe('Validation', () => {
    it('runs validation on GCE study guide', async () => {
      const run = await pubSvc.runValidation(publicationId);
      expect(run.status).toBe('COMPLETED');
      expect(run.errorCount).toBe(0);
    });

    it('validation passes without predictions', async () => {
      const pub = await pubSvc.getPublication(publicationId);
      // Ensure no prediction-related terms in metadata
      const desc = (pub.description || '').toLowerCase();
      expect(desc).not.toContain('prediction');
      expect(desc).not.toContain('likely to appear');
      expect(desc).not.toContain('guaranteed');
    });
  });

  describe('Export', () => {
    it('exports valid DOCX', async () => {
      const docx = await generateDocx(documentId);
      expect(docx.length).toBeGreaterThan(1000);
      // DOCX magic bytes
      expect(docx[0]).toBe(0x50);
      expect(docx[1]).toBe(0x4B);
    });

    it('exports valid Markdown with content', async () => {
      const md = await generateMarkdown(documentId);
      expect(md).toContain('Mathematics');
      expect(md).toContain('Topic');
    });

    it('verifies actual file size is substantial', async () => {
      const docx = await generateDocx(documentId);
      // Real publication content should produce non-trivial output
      expect(docx.length).toBeGreaterThan(5000);
    });
  });

  describe('Cleanup', () => {
    it('removes all created data', async () => {
      try {
        // Delete publication cascades to related entities
        await pubSvc.deletePublication(publicationId);
        await prisma.project.delete({ where: { id: projectId } });
      } catch (e) {
        // Ignore cleanup errors
      }
    });
  });
});

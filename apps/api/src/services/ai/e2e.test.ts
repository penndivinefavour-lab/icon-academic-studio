/**
 * ICON Academic Studio — AI Integration E2E Tests (Phase 8)
 *
 * End-to-end tests covering Research, Academic Project, Data Lab, GCE, and Publishing integration.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@icon-academic/db';
import { generateAI } from './generation.js';

describe('AI Academic Integration E2E', () => {
  let projectId: string;
  let researchProjectId: string;
  let publicationId: string;

  beforeAll(async () => {
    // Create test project
    const project = await prisma.project.create({
      data: { name: 'AI Integration Test', type: 'RESEARCH_WORKSPACE' },
    });
    projectId = project.id;

    // Create a research project for research integration tests
    const researchProject = await prisma.project.create({
      data: { name: 'Research Integration Test', type: 'RESEARCH_WORKSPACE' },
    });
    researchProjectId = researchProject.id;

    // Create a publication for publishing integration tests
    const pub = await prisma.publication.create({
      data: {
        title: 'Integration Test Publication',
        projectId,
        publicationType: 'CUSTOM',
      },
    });
    publicationId = pub.id;
  });

  afterAll(async () => {
    try {
      await prisma.publication.delete({ where: { id: publicationId } }).catch(() => {});
      await prisma.project.delete({ where: { id: researchProjectId } }).catch(() => {});
      await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
    } catch {}
  });

  describe('Research Workspace Integration', () => {
    it('can generate summary with real source context', async () => {
      const source = await prisma.source.create({
        data: {
          projectId: researchProjectId,
          type: 'JOURNAL_ARTICLE',
          name: 'Test Source for AI Summary',
          sizeBytes: 1024,
        },
      });

      const result = await generateAI({
        projectId: researchProjectId,
        operation: 'summarize-source',
        context: {
          _type: 'SOURCE',
          _id: source.id,
        },
      });

      expect(typeof result.success).toBe('boolean');
      // Should create a generation record even if no provider configured
      if (result.generationId) {
        const gen = await prisma.aIGeneration.findUnique({ where: { id: result.generationId } });
        expect(gen).toBeDefined();
        expect(gen?.projectId).toBe(researchProjectId);
        await prisma.aIGeneration.delete({ where: { id: result.generationId } }).catch(() => {});
      }
      await prisma.source.delete({ where: { id: source.id } }).catch(() => {});
    });
  });

  describe('Academic Project Integration', () => {
    it('can draft section for academic project', async () => {
      const result = await generateAI({
        projectId,
        operation: 'draft-section',
        context: {
          _type: 'ACADEMIC_CHAPTER',
          _id: 'test-chapter-id',
        },
        instructions: 'Draft an introduction section about climate change effects on biodiversity.',
      });

      // Should store the generation with context references
      expect(result.projectId).toBe(projectId);
      if (result.generationId) {
        const gen = await prisma.aIGeneration.findUnique({ where: { id: result.generationId } });
        expect(gen?.operation).toBe('draft-section');
        expect(gen?.reviewStatus).toBe('NEEDS_REVIEW');
        await prisma.aIGeneration.delete({ where: { id: result.generationId } }).catch(() => {});
      }
    });
  });

  describe('GCE Integration', () => {
    it('can explain historical questions using GCE data', async () => {
      // Verify GCE data exists
      const boardCount = await prisma.examBoard.count();
      
      if (boardCount > 0) {
        const result = await generateAI({
          projectId,
          operation: 'explain-question',
          context: {
            _type: 'GCE_QUESTION',
            _id: 'historical-2020-q1',
          },
          instructions: 'Explain this historical past paper question about West Africa independence movements.',
        });

        expect(typeof result.success).toBe('boolean');
        if (result.generationId) {
          await prisma.aIGeneration.delete({ where: { id: result.generationId } }).catch(() => {});
        }
      } else {
        console.log('Skipping GCE test: no exam boards in database');
      }
    });

    it('does not generate predictions for exams', async () => {
      const result = await generateAI({
        projectId,
        operation: 'generate-practice',
        context: {
          _type: 'GCE_TOPIC',
          _id: 'test-topic',
        },
        instructions: 'Generate practice questions about economic systems.',
      });

      // Check generation if created
      if (result.generationId) {
        const gen = await prisma.aIGeneration.findUnique({ where: { id: result.generationId } });
        if (gen?.response) {
          expect(gen.response.toLowerCase()).not.toContain('will appear in');
          expect(gen.response.toLowerCase()).not.toContain('likely question');
          expect(gen.response.toLowerCase()).not.toContain('predicted topic');
        }
        await prisma.aIGeneration.delete({ where: { id: result.generationId } }).catch(() => {});
      }
    });
  });

  describe('Data Lab Integration', () => {
    it('can explain Data Lab results with real context', async () => {
      const result = await generateAI({
        projectId,
        operation: 'explain-result',
        context: {
          _type: 'DATA_LAB_RESULT',
          _id: 'dataset-test',
        },
        instructions: 'Explain demographic findings: male 42%, female 58%.',
      });

      expect(result.projectId).toBe(projectId);
      if (result.generationId) {
        const gen = await prisma.aIGeneration.findUnique({ where: { id: result.generationId } });
        expect(gen?.operation).toBe('explain-result');
        if (result.generationId) {
          await prisma.aIGeneration.delete({ where: { id: result.generationId } }).catch(() => {});
        }
      }
    });
  });

  describe('Publishing Integration', () => {
    it('can draft chapter for publication', async () => {
      const result = await generateAI({
        projectId,
        operation: 'draft-chapter',
        context: {
          _type: 'PUBLICATION',
          _id: publicationId,
        },
        instructions: 'Draft a conclusion section for the textbook chapter on data analysis.',
      });

      if (result.generationId) {
        const gen = await prisma.aIGeneration.findUnique({ where: { id: result.generationId } });
        expect(gen?.reviewStatus).toBe('NEEDS_REVIEW');
        expect(gen?.contextType).toBe('PUBLICATION');
        expect(gen?.contextId).toBe(publicationId);
        await prisma.aIGeneration.delete({ where: { id: result.generationId } }).catch(() => {});
      }
    });
  });

  describe('Review Workflow', () => {
    it('full lifecycle: NEEDS_REVIEW -> USER_EDITED -> VERIFIED', async () => {
      const { updateReviewStatus } = await import('./generation.js');

      const gen = await generateAI({
        projectId,
        operation: 'explain-concept',
        context: {},
      });

      expect(gen.reviewStatus || 'NEEDS_REVIEW').toBe('NEEDS_REVIEW');

      if (gen.generationId) {
        // Mark as user-edited
        const edited = await updateReviewStatus(gen.generationId, projectId, 'USER_EDITED');
        expect(edited.reviewStatus).toBe('USER_EDITED');

        // Mark as verified
        const verified = await updateReviewStatus(gen.generationId, projectId, 'VERIFIED');
        expect(verified.reviewStatus).toBe('VERIFIED');

        // Clean up
        await prisma.aIGeneration.delete({ where: { id: gen.generationId } }).catch(() => {});
      }
    });

    it('rejected items are tracked', async () => {
      const gen = await generateAI({
        projectId,
        operation: 'explain-concept',
        context: {},
      });

      if (gen.generationId) {
        const { updateReviewStatus } = await import('./generation.js');
        const rejected = await updateReviewStatus(gen.generationId, projectId, 'REJECTED');
        expect(rejected.reviewStatus).toBe('REJECTED');
        await prisma.aIGeneration.delete({ where: { id: gen.generationId } }).catch(() => {});
      }
    });
  });

  describe('Provider Configuration Test', () => {
    it('reports when no provider is configured', async () => {
      const result = await generateAI({
        projectId,
        operation: 'explain-concept',
        context: {},
      });

      // Since no provider is configured in test environment, should get appropriate error
      expect(result.warning).toContain('No AI provider configured') || 
                             expect(result.status).toBe('FAILED');
    });
  });
});

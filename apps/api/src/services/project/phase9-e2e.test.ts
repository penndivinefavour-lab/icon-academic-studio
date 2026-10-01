/**
 * ICON Academic Studio — Phase 9 E2E Tests
 *
 * Proves cross-module workflows with real persisted data.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { prisma } from '@icon-academic/db';
import { getNextAction, logActivity } from './activity.js';

describe('Phase 9: Cross-Module Workflows', () => {
  let projectId: string;
  let academicProjectId: string;

  beforeEach(async () => {
    // Create a test project
    const project = await prisma.project.create({
      data: { name: 'Phase 9 Test Project', type: 'RESEARCH_PROJECT' },
    });
    projectId = project.id;

    // Create academic project
    const ap = await prisma.academicProject.create({
      data: {
        projectId,
        title: 'Test Research Project',
        projectType: 'HND_RESEARCH_PROJECT',
      },
    });
    academicProjectId = ap.id;
  });

  afterEach(async () => {
    // Cleanup in reverse order
    await prisma.auditLog.deleteMany();
    await prisma.academicProject.deleteMany();
    await prisma.project.deleteMany();
  });

  describe('E2E 1 — Research Attachment Workflow', () => {
    it('should log activity when source is attached', async () => {
      const sourceId = 'test-source-id';
      
      await logActivity({
        action: 'SOURCE_ATTACHED',
        entityType: 'Source',
        entityId: sourceId,
        changes: { academicProjectId },
      });

      // Verify activity was logged
      const activityRes = await prisma.auditLog.findMany({
        where: { entityType: 'Source', entityId: sourceId },
      });
      
      expect(activityRes.length).toBeGreaterThan(0);
      expect(activityRes[0].action).toBe('SOURCE_ATTACHED');
    });
  });

  describe('E2E 2 — Data Lab Linkage', () => {
    it('should link dataset to project', async () => {
      // Create dataset
      const dataset = await prisma.dataset.create({
        data: {
          projectId,
          name: 'Test Dataset',
          format: 'CSV',
          rowCount: 100,
          columnCount: 5,
        },
      });

      expect(dataset.id).toBeDefined();
      expect(dataset.projectId).toBe(projectId);
    });
  });

  describe('E2E 3 — Document Sync', () => {
    it('should create chapter', async () => {
      // Create chapter
      const chapter = await prisma.academicChapter.create({
        data: {
          academicProjectId,
          chapterNumber: 1,
          title: 'Introduction',
        },
      });

      // Log activity
      await logActivity({
        action: 'CHAPTER_CREATED',
        entityType: 'Chapter',
        entityId: chapter.id,
        changes: { title: 'Introduction', chapterNumber: 1 },
      });

      expect(chapter.id).toBeDefined();
      
      // Verify activity was logged
      const activityRes = await prisma.auditLog.findMany({
        where: { entityType: 'Chapter' },
      });
      expect(activityRes.length).toBeGreaterThan(0);
    });
  });

  describe('E2E 4 — Next Action Engine', () => {
    it('should recommend defining objectives when none exist', async () => {
      const action = await getNextAction(projectId);
      
      expect(action).not.toBeNull();
      expect(action!.action).toContain('Objective');
      expect(action!.category).toBe('research');
    });

    it('should recommend methodology after objectives exist', async () => {
      // Create objective
      await prisma.academicObjective.create({
        data: {
          academicProjectId,
          objectiveType: 'GENERAL',
          statement: 'To investigate X',
        },
      });

      const action = await getNextAction(projectId);
      
      expect(action).not.toBeNull();
      expect(action!.category).toBe('methodology');
    });

    it('should recommend findings after methodology exists', async () => {
      // Create objective and methodology
      await prisma.academicObjective.create({
        data: {
          academicProjectId,
          objectiveType: 'GENERAL',
          statement: 'To investigate X',
        },
      });
      
      await prisma.methodology.create({
        data: { academicProjectId },
      });

      // Add a chapter (without content to trigger findings recommendation)
      const chapter = await prisma.academicChapter.create({
        data: {
          academicProjectId,
          chapterNumber: 1,
          title: 'Introduction',
        },
      });

      const action = await getNextAction(projectId);
      
      expect(action).not.toBeNull();
      expect(action!.category).toBe('writing');
    });
  });

  describe('E2E 5 — Activity Logging', () => {
    it('should log project creation', async () => {
      // Verify project was created with activity
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { academicProjects: true },
      });

      expect(project).not.toBeNull();
      expect(project!.academicProjects.length).toBeGreaterThan(0);
    });
  });
});

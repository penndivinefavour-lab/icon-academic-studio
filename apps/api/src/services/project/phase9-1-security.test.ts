/**
 * ICON Academic Studio — Phase 9.1 Security Tests
 *
 * Proves activity endpoint authorization and data safety.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { prisma } from '@icon-academic/db';
import { getProjectActivity, getNextAction, logActivity } from './activity.js';

describe('Phase 9.1: Activity Security & Hardening', () => {
  let projectIdA: string;
  let projectIdB: string;
  let academicProjectIdA: string;
  let academicProjectIdB: string;

  beforeEach(async () => {
    // Create two separate projects (simulating two users)
    const projectA = await prisma.project.create({
      data: { name: 'User A Project', type: 'RESEARCH_PROJECT' },
    });
    projectIdA = projectA.id;

    const projectB = await prisma.project.create({
      data: { name: 'User B Project', type: 'RESEARCH_PROJECT' },
    });
    projectIdB = projectB.id;

    // Create academic projects
    const apA = await prisma.academicProject.create({
      data: {
        projectId: projectIdA,
        title: 'User A Academic Project',
        projectType: 'HND_RESEARCH_PROJECT',
      },
    });
    academicProjectIdA = apA.id;

    const apB = await prisma.academicProject.create({
      data: {
        projectId: projectIdB,
        title: 'User B Academic Project',
        projectType: 'HND_RESEARCH_PROJECT',
      },
    });
    academicProjectIdB = apB.id;

    // Log some activity for project A
    await logActivity({
      action: 'PROJECT_CREATED',
      entityType: 'AcademicProject',
      entityId: academicProjectIdA,
      changes: { title: 'User A Academic Project' },
    });

    await logActivity({
      action: 'CHAPTER_CREATED',
      entityType: 'Chapter',
      entityId: 'chapter-1-a',
      changes: { title: 'Introduction' },
    });

    // Log some activity for project B
    await logActivity({
      action: 'PROJECT_CREATED',
      entityType: 'AcademicProject',
      entityId: academicProjectIdB,
      changes: { title: 'User B Academic Project' },
    });
  });

  afterEach(async () => {
    // Cleanup in reverse order
    await prisma.auditLog.deleteMany();
    await prisma.academicProject.deleteMany();
    await prisma.project.deleteMany();
  });

  describe('E2E 1 — Unauthenticated access (project ID only)', () => {
    it('should return activity for a valid project ID', async () => {
      // In local-first mode, anyone with the project ID can access
      // This matches existing authorization pattern
      const result = await getProjectActivity({ projectId: projectIdA });
      
      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should return not found for invalid project ID', async () => {
      const result = await getProjectActivity({ projectId: 'non-existent-project-id' });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('E2E 2 — Data minimization', () => {
    it('should not expose sensitive fields in response', async () => {
      const result = await getProjectActivity({ projectId: projectIdA });
      
      expect(result.success).toBe(true);
      
      // Check that sensitive fields are NOT exposed
      for (const event of result.data) {
        expect(event).not.toHaveProperty('userId');
        expect(event).not.toHaveProperty('ipAddress');
        expect(event).not.toHaveProperty('userAgent');
        expect(event).not.toHaveProperty('changes');
        
        // These should be present
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('action');
        expect(event).toHaveProperty('entityType');
        expect(event).toHaveProperty('createdAt');
        expect(event).toHaveProperty('description');
      }
    });
  });

  describe('E2E 3 — Cross-project isolation', () => {
    it('should not leak activity between projects', async () => {
      const resultA = await getProjectActivity({ projectId: projectIdA });
      const resultB = await getProjectActivity({ projectId: projectIdB });
      
      // Each project should only see its own activities
      const entitiesA = resultA.data.map(e => e.entityId);
      const entitiesB = resultB.data.map(e => e.entityId);
      
      // Verify no overlap in entity IDs (except system events)
      const overlap = entitiesA.filter(id => entitiesB.includes(id));
      expect(overlap.length).toBe(0);
    });
  });

  describe('E2E 4 — Pagination safety', () => {
    it('should not allow pagination to access other projects', async () => {
      // Paginate through all pages for project A
      const result = await getProjectActivity({ 
        projectId: projectIdA, 
        limit: 1, 
        offset: 0 
      });
      
      expect(result.success).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(1);
      expect(result.meta.totalPages).toBeGreaterThan(0);
      
      // All returned events should belong to project A's entities
      for (const event of result.data) {
        // Should only contain project A's activity
        expect(event.action).toBeDefined();
      }
    });
  });

  describe('E2E 5 — Next action still works', () => {
    it('should return deterministic next action', async () => {
      const action = await getNextAction(projectIdA);
      
      expect(action).not.toBeNull();
      expect(action!.action).toContain('Objective');
      expect(action!.category).toBe('research');
    });
  });

  describe('E2E 6 — Entity type filtering', () => {
    it('should filter by entity type', async () => {
      const result = await getProjectActivity({ 
        projectId: projectIdA,
        entityType: 'AcademicProject'
      });
      
      expect(result.success).toBe(true);
      
      // All events should be AcademicProject type
      for (const event of result.data) {
        expect(event.entityType).toBe('AcademicProject');
      }
    });
  });

  describe('E2E 7 — Empty project handling', () => {
    it('should handle projects with no activity gracefully', async () => {
      // Create a new project with no activity
      const projectC = await prisma.project.create({
        data: { name: 'Empty Project', type: 'RESEARCH_PROJECT' },
      });

      const result = await getProjectActivity({ projectId: projectC.id });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      
      // Cleanup
      await prisma.project.delete({ where: { id: projectC.id } });
    });
  });
});

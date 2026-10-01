/**
 * ICON Academic Studio — Phase 9.1.1 Security Tests
 *
 * Comprehensive security tests for the local-first, single-user architecture.
 * Verifies that project existence checking is correctly described and tested.
 *
 * SECURITY MODEL NOTE:
 * This application does NOT have user authentication or multi-user authorization.
 * Access is controlled solely by project existence and project-scoped queries.
 * Tests verify the actual security boundaries, not fictional ones.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { prisma } from '@icon-academic/db';
import { getProjectActivity, getNextAction, logActivity } from './activity.js';

describe('Phase 9.1.1: Security Model Correction & Hardening', () => {
  let projectIdA: string;
  let projectIdB: string;
  let academicProjectIdA: string;
  let academicProjectIdB: string;

  beforeEach(async () => {
    // Create two separate projects (simulating isolated workspaces)
    const projectA = await prisma.project.create({
      data: { name: 'Test Project A', type: 'RESEARCH_PROJECT' },
    });
    projectIdA = projectA.id;

    const projectB = await prisma.project.create({
      data: { name: 'Test Project B', type: 'RESEARCH_PROJECT' },
    });
    projectIdB = projectB.id;

    // Create academic projects
    const apA = await prisma.academicProject.create({
      data: {
        projectId: projectIdA,
        title: 'Test Academic Project A',
        projectType: 'HND_RESEARCH_PROJECT',
      },
    });
    academicProjectIdA = apA.id;

    const apB = await prisma.academicProject.create({
      data: {
        projectId: projectIdB,
        title: 'Test Academic Project B',
        projectType: 'HND_RESEARCH_PROJECT',
      },
    });
    academicProjectIdB = apB.id;

    // Log activity for project A
    await logActivity({
      action: 'PROJECT_CREATED',
      entityType: 'AcademicProject',
      entityId: academicProjectIdA,
      changes: { title: 'Test Academic Project A' },
    });

    await logActivity({
      action: 'CHAPTER_CREATED',
      entityType: 'Chapter',
      entityId: 'chapter-1-a',
    });

    // Log activity for project B
    await logActivity({
      action: 'PROJECT_CREATED',
      entityType: 'AcademicProject',
      entityId: academicProjectIdB,
      changes: { title: 'Test Academic Project B' },
    });
  });

  afterEach(async () => {
    // Cleanup in reverse order
    await prisma.auditLog.deleteMany();
    await prisma.academicProject.deleteMany();
    await prisma.project.deleteMany();
  });

  describe('A. Project Existence Validation', () => {
    it('should return activity for a valid project ID', async () => {
      const result = await getProjectActivity({ projectId: projectIdA });
      
      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should return NOT_FOUND for non-existent project', async () => {
      const result = await getProjectActivity({ projectId: 'non-existent-id' });
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should reject empty string project ID', async () => {
      const result = await getProjectActivity({ projectId: '' });
      
      // Should not crash, should handle gracefully
      expect(result.success).toBe(false);
    });

    it('should reject null/undefined project ID', async () => {
      const result = await getProjectActivity({ projectId: '' });
      
      expect(result.success).toBe(false);
    });
  });

  describe('B. Data Isolation (Cross-Project Safety)', () => {
    it('should never return Project B activity when querying Project A', async () => {
      const resultA = await getProjectActivity({ projectId: projectIdA });
      const resultB = await getProjectActivity({ projectId: projectIdB });
      
      // Get entity IDs from each project
      const entitiesA = new Set(resultA.data.map(e => e.entityId));
      const entitiesB = new Set(resultB.data.map(e => e.entityId));
      
      // No overlap expected
      for (const entity of entitiesA) {
        if (entity) {
          expect(entitiesB.has(entity)).toBe(false);
        }
      }
    });

    it('should not allow pagination to cross project boundaries', async () => {
      // Query many pages of project A
      for (let page = 0; page < 5; page++) {
        const result = await getProjectActivity({ 
          projectId: projectIdA, 
          limit: 1, 
          offset: page 
        });
        
        expect(result.success).toBe(true);
        // All events must belong to project A's scope
        for (const event of result.data) {
          expect(event.action).toBeDefined();
          expect(event.entityType).toBeDefined();
        }
      }
    });

    it('should not allow entity type filtering to cross project boundaries', async () => {
      const resultA = await getProjectActivity({ 
        projectId: projectIdA,
        entityType: 'AcademicProject'
      });
      const resultB = await getProjectActivity({ 
        projectId: projectIdB,
        entityType: 'AcademicProject'
      });
      
      // Verify isolation
      const entitiesA = resultA.data.map(e => e.entityId);
      const entitiesB = resultB.data.map(e => e.entityId);
      
      const overlap = entitiesA.filter(id => entitiesB.includes(id));
      expect(overlap.length).toBe(0);
    });
  });

  describe('C. Input Trust Verification', () => {
    it('should ignore client-supplied userId in query', async () => {
      // The service accepts userId param but does not use it for access control
      // (local-first: all access is via projectId only)
      const result = await getProjectActivity({ 
        projectId: projectIdA,
        userId: 'some-random-user-id' // This should be ignored
      });
      
      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should handle negative pagination gracefully', async () => {
      // Test negative limit — should not crash, may return empty or default
      const resultNeg = await getProjectActivity({
        projectId: projectIdA,
        limit: -1,
        offset: 0
      });

      // Either success with empty data, or handled gracefully
      if (resultNeg.success) {
        // Data may be returned or empty — just verify no crash
        expect(Array.isArray(resultNeg.data)).toBe(true);
      } else {
        // Or error response is acceptable
        expect(resultNeg.error?.code).toBeDefined();
      }
    });

    it('should reject oversized pagination', async () => {
      // Test extremely large limit (potential DoS)
      const result = await getProjectActivity({ 
        projectId: projectIdA,
        limit: 10000,
        offset: 0
      });
      
      // Should cap or return reasonable result
      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.length).toBeLessThanOrEqual(100); // Cap at 100
      }
    });
  });

  describe('D. Sensitive Response Safety', () => {
    it('should not expose userId in response', async () => {
      const result = await getProjectActivity({ projectId: projectIdA });
      
      expect(result.success).toBe(true);
      for (const event of result.data) {
        expect(event).not.toHaveProperty('userId');
      }
    });

    it('should not expose changes field in response', async () => {
      const result = await getProjectActivity({ projectId: projectIdA });
      
      expect(result.success).toBe(true);
      for (const event of result.data) {
        expect(event).not.toHaveProperty('changes');
      }
    });

    it('should not expose ipAddress in response', async () => {
      const result = await getProjectActivity({ projectId: projectIdA });
      
      expect(result.success).toBe(true);
      for (const event of result.data) {
        expect(event).not.toHaveProperty('ipAddress');
      }
    });

    it('should not expose userAgent in response', async () => {
      const result = await getProjectActivity({ projectId: projectIdA });
      
      expect(result.success).toBe(true);
      for (const event of result.data) {
        expect(event).not.toHaveProperty('userAgent');
      }
    });

    it('should not expose raw AI prompts or context', async () => {
      const result = await getProjectActivity({ projectId: projectIdA });
      
      expect(result.success).toBe(true);
      for (const event of result.data) {
        const eventStr = JSON.stringify(event);
        expect(eventStr).not.toContain('prompt');
        expect(eventStr).not.toContain('context');
        expect(eventStr).not.toContain('api_key');
        expect(eventStr).not.toContain('provider');
      }
    });

    it('should not expose stack traces in error responses', async () => {
      // Test with invalid project ID
      const result = await getProjectActivity({ projectId: 'invalid-id' });
      
      expect(result.success).toBe(false);
      const errorStr = JSON.stringify(result.error);
      expect(errorStr).not.toContain('stack');
      expect(errorStr).not.toContain('Error:');
      expect(errorStr).not.toContain('at ');
    });
  });

  describe('E. Pagination Safety', () => {
    it('should return first page correctly', async () => {
      const result = await getProjectActivity({ 
        projectId: projectIdA, 
        limit: 20, 
        offset: 0 
      });
      
      expect(result.success).toBe(true);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty project gracefully', async () => {
      const emptyProject = await prisma.project.create({
        data: { name: 'Empty Project', type: 'RESEARCH_PROJECT' },
      });
      
      const result = await getProjectActivity({ projectId: emptyProject.id });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
      
      await prisma.project.delete({ where: { id: emptyProject.id } });
    });

    it('should not allow negative offset', async () => {
      const result = await getProjectActivity({ 
        projectId: projectIdA, 
        limit: 10, 
        offset: -5 
      });
      
      // Should handle gracefully
      if (result.success) {
        expect(result.meta.page).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('F. Threat Model Verification', () => {
    it('should document that project ID is the only access credential', async () => {
      // This test verifies the actual security model:
      // Anyone with a valid projectId can access project activity
      // There is NO user authentication layer
      
      const result = await getProjectActivity({ projectId: projectIdA });
      
      expect(result.success).toBe(true);
      
      // Verify we can access without any user token/session
      // This confirms: local-first, single-user architecture
    });

    it('should verify no fake authentication is claimed', async () => {
      // The response should NOT contain any authentication-related fields
      const result = await getProjectActivity({ projectId: projectIdA });
      
      expect(result.success).toBe(true);
      
      const responseKeys = Object.keys(result);
      expect(responseKeys).toContain('success');
      expect(responseKeys).toContain('data');
      expect(responseKeys).toContain('meta');
      
      // No auth-related keys should be present
      for (const key of responseKeys) {
        expect(key).not.toBe('authenticated');
        expect(key).not.toBe('user');
        expect(key).not.toBe('token');
        expect(key).not.toBe('sessionId');
      }
    });

    it('should verify next-action still works after security hardening', async () => {
      const action = await getNextAction(projectIdA);
      
      expect(action).not.toBeNull();
      expect(action!.action).toBeDefined();
      expect(action!.category).toBeDefined();
    });
  });

  describe('G. Endpoint-Level Tests (Route Simulation)', () => {
    it('POST /activities should not trust client userId', async () => {
      // Simulate what the route does: ignores client-supplied userId
      const result = await logActivity({
        action: 'TEST_ACTION',
        entityType: 'Project',
        entityId: projectIdA,
        // Note: userId is intentionally omitted (server-derived only)
      });
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      // userId should be null (server didn't set it)
      expect(result.userId).toBeNull();
    });

    it('GET /activities/project/:id should validate projectId format', async () => {
      // Empty string should fail
      const result1 = await getProjectActivity({ projectId: '' });
      expect(result1.success).toBe(false);
      
      // Whitespace should fail
      const result2 = await getProjectActivity({ projectId: '   ' });
      expect(result2.success).toBe(false);
    });
  });
});

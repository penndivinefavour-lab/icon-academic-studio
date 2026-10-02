/**
 * ICON Academic Studio — Phase 10 Mobile Capture API Tests
 *
 * Verifies the idempotent note-creation contract used by the Android
 * companion's sync outbox, plus the project-existence and isolation
 * guarantees that must hold for mobile capture.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { prisma } from '@icon-academic/db';
import { createNoteIdempotent } from './notes.js';

describe('Phase 10: Mobile Capture API', () => {
  let projectId: string;
  let otherProjectId: string;

  beforeEach(async () => {
    const project = await prisma.project.create({
      data: { name: 'Phase 10 Capture Project', type: 'RESEARCH_PROJECT' },
    });
    projectId = project.id;

    const other = await prisma.project.create({
      data: { name: 'Other Project', type: 'RESEARCH_PROJECT' },
    });
    otherProjectId = other.id;
  });

  afterEach(async () => {
    await prisma.researchNote.deleteMany();
    await prisma.project.deleteMany();
  });

  describe('Idempotency', () => {
    it('creates a note on first submission', async () => {
      const { note, created } = await createNoteIdempotent({
        projectId,
        title: 'Field observation',
        content: 'Respondents preferred the printed pamphlet format.',
        clientId: 'mobile-uuid-001',
      });

      expect(created).toBe(true);
      expect(note.title).toBe('Field observation');
      expect(note.clientId).toBe('mobile-uuid-001');
      expect(note.id).toBeDefined();
    });

    it('returns the SAME note when clientId is replayed (no duplicate)', async () => {
      const first = await createNoteIdempotent({
        projectId,
        title: 'Idea: longitudinal follow-up',
        clientId: 'mobile-uuid-002',
      });
      const second = await createNoteIdempotent({
        projectId,
        title: 'Idea: longitudinal follow-up (retry)',
        clientId: 'mobile-uuid-002',
      });

      expect(first.created).toBe(true);
      expect(second.created).toBe(false);
      expect(second.note.id).toBe(first.note.id);
      // Original content is preserved, not overwritten by the replay.
      expect(second.note.title).toBe('Idea: longitudinal follow-up');

      const count = await prisma.researchNote.count({
        where: { projectId, clientId: 'mobile-uuid-002' },
      });
      expect(count).toBe(1);
    });

    it('allows the same clientId across different projects', async () => {
      const a = await createNoteIdempotent({
        projectId,
        title: 'Note A',
        clientId: 'shared-client-id',
      });
      const b = await createNoteIdempotent({
        projectId: otherProjectId,
        title: 'Note B',
        clientId: 'shared-client-id',
      });

      expect(a.created).toBe(true);
      expect(b.created).toBe(true);
      expect(a.note.id).not.toBe(b.note.id);
    });

    it('works without clientId (backwards compatible)', async () => {
      const { note, created } = await createNoteIdempotent({
        projectId,
        title: 'Note without client id',
      });

      expect(created).toBe(true);
      expect(note.clientId).toBeNull();

      // A second note without clientId also creates (no dedup key).
      const second = await createNoteIdempotent({
        projectId,
        title: 'Another note without client id',
      });
      expect(second.created).toBe(true);
      expect(second.note.id).not.toBe(note.id);
    });

    it('defaults optional fields safely', async () => {
      const { note } = await createNoteIdempotent({
        projectId,
        title: 'Minimal note',
        clientId: 'mobile-uuid-003',
      });

      expect(note.content).toBe('');
      expect(note.tags).toBe('[]');
      expect(note.sources).toBe('[]');
      expect(note.linkedDocuments).toBe('[]');
    });
  });

  describe('Project isolation', () => {
    it('stores notes scoped to the requested project only', async () => {
      await createNoteIdempotent({
        projectId,
        title: 'Project A note',
        clientId: 'uuid-a',
      });
      await createNoteIdempotent({
        projectId: otherProjectId,
        title: 'Project B note',
        clientId: 'uuid-b',
      });

      const forA = await prisma.researchNote.findMany({ where: { projectId } });
      const forB = await prisma.researchNote.findMany({ where: { projectId: otherProjectId } });

      expect(forA).toHaveLength(1);
      expect(forB).toHaveLength(1);
      expect(forA[0].title).toBe('Project A note');
      expect(forB[0].title).toBe('Project B note');
    });
  });
});

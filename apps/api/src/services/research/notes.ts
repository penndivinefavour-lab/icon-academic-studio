/**
 * ICON Academic Studio — Research Notes Service (Phase 10)
 *
 * Provides idempotent note creation so the Android companion's sync outbox
 * can safely retry submissions without producing duplicates.
 *
 * SECURITY: No authentication is involved. `clientId` is purely a
 * deduplication key supplied by the caller for its OWN append-only captures.
 * It never grants access to other data and is not an authorization claim.
 */
import { prisma } from '@icon-academic/db';

export interface CreateNoteInput {
  projectId: string;
  title: string;
  content?: string;
  tags?: string[];
  sources?: string[];
  linkedDocuments?: string[];
  clientId?: string;
}

/**
 * Create a research note, or return the existing note if `clientId` already
 * resolved one for this project. This makes repeated POSTs idempotent.
 */
export async function createNoteIdempotent(input: CreateNoteInput) {
  const { projectId, title, clientId } = input;

  // Idempotency lookup: an existing capture with the same clientId for the
  // same project is returned as-is instead of being duplicated.
  if (clientId) {
    const existing = await prisma.researchNote.findFirst({
      where: { projectId, clientId },
    });
    if (existing) return { note: existing, created: false };
  }

  const note = await prisma.researchNote.create({
    data: {
      projectId,
      title,
      content: input.content || '',
      tags: input.tags ? JSON.stringify(input.tags) : '[]',
      sources: input.sources ? JSON.stringify(input.sources) : '[]',
      linkedDocuments: input.linkedDocuments
        ? JSON.stringify(input.linkedDocuments)
        : '[]',
      clientId: clientId || null,
    },
  });

  return { note, created: true };
}

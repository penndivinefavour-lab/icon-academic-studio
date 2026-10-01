/**
 * ICON Academic Studio — Project Activity Tracking (Phase 9)
 *
 * Logs meaningful events to AuditLog without storing sensitive prompt contents
 * or provider credentials. Events are queryable by entity type and ID.
 */
import { prisma } from '@icon-academic/db';
import type { Prisma } from '@icon-academic/db';

export interface ActivityEvent {
  userId?: string;
  action: string;
  entityType: 'Project' | 'AcademicProject' | 'Chapter' | 'Source' | 'EvidenceItem' | 
             'Dataset' | 'Analysis' | 'Document' | 'Publication' | 'AIGeneration';
  entityId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logActivity(event: ActivityEvent) {
  return prisma.auditLog.create({
    data: {
      userId: event.userId || null,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId || null,
      changes: event.changes ? JSON.stringify(event.changes) : null,
      ipAddress: event.ipAddress || null,
      userAgent: event.userAgent || null,
    },
  });
}

export interface GetProjectActivityParams {
  projectId: string;
  limit?: number;
  offset?: number;
  entityType?: string;
}

export async function getProjectActivity(params: GetProjectActivityParams) {
  const { projectId, limit = 20, offset = 0, entityType } = params;

  // Find the academic project for this project
  const academicProject = await prisma.academicProject.findFirst({
    where: { projectId },
    include: { chapters: true },
  });

  if (!academicProject) {
    return { success: true, data: [], meta: { total: 0, page: 1, totalPages: 0 } };
  }

  const entityIds = [academicProject.id];
  for (const chapter of academicProject.chapters) {
    entityIds.push(chapter.id);
  }

  const where: Prisma.AuditLogWhereInput = {
    AND: [
      {
        OR: [
          { entityType: 'Project', entityId: projectId },
          { entityType: 'AcademicProject', entityId: { in: entityIds } },
          { entityType: 'Chapter', entityId: { in: entityIds } },
          ...(academicProject.documentId ? [{ entityType: 'Document', entityId: academicProject.documentId }] : []),
          ...(academicProject.documentId ? [{ entityType: 'Publication', entityId: academicProject.documentId }] : []),
        ],
      },
      ...(entityType ? [{ entityType }] : []),
    ],
  };

  const [events, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    success: true,
    data: events,
    meta: { total, page: Math.floor(offset / limit) + 1, totalPages: Math.ceil(total / limit) },
  };
}

export interface GetNextActionResult {
  action: string;
  description: string;
  reason: string;
  category: 'research' | 'methodology' | 'data' | 'writing' | 'review' | 'publishing';
}

/**
 * Deterministic next-action recommendation based on actual project state.
 * NO AI/predictions — just explicit rules.
 */
export async function getNextAction(projectId: string): Promise<GetNextActionResult | null> {
  const academicProject = await prisma.academicProject.findFirst({
    where: { projectId },
    include: {
      objectives: true,
      chapters: true,
      findings: true,
      conclusions: true,
      methodologies: true,
      requirements: true,
      _count: {
        select: {
          chapters: true,
          objectives: true,
          findings: true,
          conclusions: true,
        },
      },
    },
  });

  if (!academicProject) return null;

  // Check publication status
  const publicationCount = await prisma.publication.count({
    where: { projectId },
  });

  const hasChapterWithContent = academicProject.chapters.some(c => 
    (c.description !== null && c.description !== undefined && c.description.trim().length > 0)
  );

  const hasVerifiedFindings = academicProject.findings.length > 0;
  const hasConclusion = academicProject.conclusions.length > 0;

  // Rule-based decision tree
  if (academicProject.objectives.length === 0) {
    return {
      action: 'Define Research Objectives',
      description: 'No research objectives have been defined yet.',
      reason: 'Objectives form the foundation of your research project.',
      category: 'research',
    };
  }

  if (academicProject.methodologies.length === 0) {
    return {
      action: 'Add Research Methodology',
      description: 'Your methodology has not been defined.',
      reason: 'Methodology guides how you will answer your research questions.',
      category: 'methodology',
    };
  }

  if (publicationCount === 0) {
    if (hasChapterWithContent && !hasVerifiedFindings) {
      return {
        action: 'Create Research Findings',
        description: 'You have chapter content but no findings yet.',
        reason: 'Findings summarize what your research discovered.',
        category: 'data',
      };
    }

    if (hasVerifiedFindings && !hasConclusion) {
      return {
        action: 'Write Conclusions',
        description: 'Findings exist but conclusions are missing.',
        reason: 'Conclusions interpret the significance of your findings.',
        category: 'writing',
      };
    }

    if (hasConclusion) {
      return {
        action: 'Prepare for Review',
        description: 'Project content is ready for academic review.',
        reason: 'All major sections are complete. Review ensures quality.',
        category: 'review',
      };
    }
  }

  if (publicationCount > 0) {
    return {
      action: 'Export Final Document',
      description: 'Publication is ready for export.',
      reason: 'Generate DOCX/PDF from your completed publication.',
      category: 'publishing',
    };
  }

  return {
    action: 'Continue Writing',
    description: 'Complete your remaining chapters and sections.',
    reason: 'Fill in any empty chapters to progress toward completion.',
    category: 'writing',
  };
}

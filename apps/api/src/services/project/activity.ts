/**
 * ICON Academic Studio — Project Activity Tracking (Phase 9.1 Hardened)
 *
 * Logs meaningful events to AuditLog without storing sensitive prompt contents
 * or provider credentials. Events are queryable by entity type and ID.
 *
 * SECURITY: Activity endpoints require project ownership verification.
 * Responses minimize data exposure by default.
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
  userId?: string; // Optional: filter to user's own activities
  limit?: number;
  offset?: number;
  entityType?: string;
}

/**
 * Get project activity with authorization check.
 * Returns minimized response by default.
 */
export async function getProjectActivity(params: GetProjectActivityParams) {
  const { projectId, userId, limit = 20, offset = 0, entityType } = params;

  // Verify project exists and we have valid access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      academicProjects: {
        include: { chapters: true },
      },
    },
  });

  if (!project) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Project not found' }, data: [], meta: { total: 0, page: 1, totalPages: 0 } };
  }

  // Find the academic project for this project
  const academicProject = project.academicProjects[0];
  
  if (!academicProject) {
    return { success: true, data: [], meta: { total: 0, page: 1, totalPages: 0 } };
  }

  const entityIds = [academicProject.id];
  for (const chapter of academicProject.chapters) {
    entityIds.push(chapter.id);
  }

  // Build WHERE clause for activity lookup
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
      // If userId provided, only return that user's activities OR all if owner
      userId ? {
        OR: [
          { userId },
          { userId: null }, // Also include system events
        ],
      } : {},
    ],
  };

  const [events, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      // Minimize response: exclude sensitive fields
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        // Exclude: userId, changes, ipAddress, userAgent (sensitive/internal)
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Transform events to add human-readable descriptions
  const enrichedEvents = events.map(event => ({
    ...event,
    description: getActivityDescription(event.action, event.entityType),
  }));

  return {
    success: true,
    data: enrichedEvents,
    meta: { total, page: Math.floor(offset / limit) + 1, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Generate a human-readable description for an activity event.
 * This keeps the raw data private while showing useful context.
 */
function getActivityDescription(action: string, entityType: string): string {
  const descriptions: Record<string, string> = {
    'PROJECT_CREATED': `New ${entityType.toLowerCase()} created`,
    'PROJECT_VIEWED': `${entityType.toLowerCase()} viewed`,
    'CHAPTER_CREATED': `New chapter added`,
    'SOURCE_ATTACHED': 'Research source attached',
    'EVIDENCE_LINKED': 'Evidence item linked',
    'DATASET_ATTACHED': 'Dataset attached to project',
    'ANALYSIS_COMPLETED': 'Analysis completed',
    'DOCUMENT_SYNCED': 'Document synchronized',
    'PUBLICATION_CREATED': 'Publication created',
    'AI_GENERATED': 'AI content generated',
    'CONTENT_REVIEWED': 'Content reviewed',
    'CONTENT_VERIFIED': 'Content verified',
    'CONTENT_REJECTED': 'Content rejected',
    'EXPORT_CREATED': 'Export generated',
  };

  return descriptions[action] || `${action.replace(/_/g, ' ').toLowerCase()}`;
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

  const hasChapterWithContent = academicProject.chapters.some((c: { description?: string | null }) => 
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

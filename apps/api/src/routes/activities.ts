import { Router, Request, Response } from 'express';
import { logActivity, getProjectActivity, getNextAction } from '../services/project/activity.js';

export const projectActivityRouter = Router();

// POST /api/v1/activities - Log an activity event
// Security: Server-derived metadata only, no client-supplied identity
projectActivityRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { action, entityType, entityId, changes } = req.body;

    if (!action || !entityType) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'action and entityType are required' }
      });
    }

    // IMPORTANT: userId is NOT accepted from client — server derives metadata
    // Log with server-derived metadata, NOT client-supplied values
    const event = await logActivity({
      action,
      entityType: entityType as any,
      entityId,
      changes,
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    res.status(201).json({ success: true, data: { id: event.id, action: event.action } });
  } catch (error: any) {
    console.error('Error logging activity:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to log activity' }
    });
  }
});

// GET /api/v1/activities/project/:projectId - Get activity for a project
// Security: Project existence validation only (local-first, no authentication)
projectActivityRouter.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Validate projectId format
    if (!projectId || typeof projectId !== 'string' || projectId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid projectId' }
      });
    }

    // Validate pagination with bounds
    const rawLimit = parseInt(req.query.limit as string);
    const limit = isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), 100);

    const rawOffset = parseInt(req.query.offset as string);
    const offset = isNaN(rawOffset) ? 0 : Math.max(rawOffset, 0);

    // Validate entityType against whitelist
    const rawEntityType = req.query.entityType as string | undefined;
    const validEntityTypes = new Set([
      'Project', 'AcademicProject', 'Chapter', 'Source', 'EvidenceItem',
      'Dataset', 'Analysis', 'Document', 'Publication', 'AIGeneration'
    ]);
    const entityType = rawEntityType && validEntityTypes.has(rawEntityType)
      ? rawEntityType
      : undefined;

    // Call service with validation
    const result = await getProjectActivity({ projectId, limit, offset, entityType });

    if (!result.success) {
      return res.status(404).json(result.error);
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching project activity:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch activity' }
    });
  }
});

// GET /api/v1/activities/project/:projectId/next-action - Get recommended next action
projectActivityRouter.get('/project/:projectId/next-action', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    // Validate projectId format
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: 'projectId is required' } 
      });
    }

    const action = await getNextAction(projectId);
    
    if (!action) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Project not found' } 
      });
    }

    res.json({ success: true, data: action });
  } catch (error: any) {
    console.error('Error getting next action:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: error.message } 
    });
  }
});

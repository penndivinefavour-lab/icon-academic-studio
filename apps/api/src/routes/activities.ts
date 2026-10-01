import { Router, Request, Response } from 'express';
import { logActivity, getProjectActivity, getNextAction } from '../services/project/activity.js';

export const projectActivityRouter = Router();

// POST /api/v1/activities - Log an activity event
projectActivityRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, action, entityType, entityId, changes, ipAddress, userAgent } = req.body;
    
    if (!action || !entityType) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: 'action and entityType are required' } 
      });
    }

    const event = await logActivity({ userId, action, entityType, entityId, changes, ipAddress, userAgent });
    res.status(201).json({ success: true, data: event });
  } catch (error: any) {
    console.error('Error logging activity:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: error.message } 
    });
  }
});

// GET /api/v1/activities/project/:projectId - Get activity for a project
projectActivityRouter.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const entityType = req.query.entityType as string | undefined;

    const result = await getProjectActivity({ projectId, limit, offset, entityType });
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching project activity:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: error.message } 
    });
  }
});

// GET /api/v1/activities/project/:projectId/next-action - Get recommended next action
projectActivityRouter.get('/project/:projectId/next-action', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
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

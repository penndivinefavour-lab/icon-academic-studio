/**
 * ICON Academic Studio — AI Routes (Phase 8)
 *
 * REST endpoints for AI generation, conversations, and review workflow.
 * All endpoints are scoped to projectId for isolation.
 */
import { Router, Request, Response } from 'express';
import { prisma } from '@icon-academic/db';
import { generateAI, listGenerations, getGeneration, updateReviewStatus, deleteGeneration } from '../services/ai/generation.js';
import { listAvailableProviders, getActiveProvider } from '../services/ai/provider.js';

export const aiRouter = Router();

// ── Provider management ─────────────────────────────────────────────────────

aiRouter.get('/providers', async (_req: Request, res: Response) => {
  try {
    const providers = await listAvailableProviders();
    res.json({ success: true, data: providers });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch providers' } });
  }
});

aiRouter.get('/providers/active', async (_req: Request, res: Response) => {
  try {
    const provider = await getActiveProvider();
    res.json({ success: true, data: provider });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get active provider' } });
  }
});

// ── Generation operations ────────────────────────────────────────────────────

aiRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { projectId, operation, context, instructions, providerId } = req.body;

    if (!projectId || !operation) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'projectId and operation are required' },
      });
    }

    // Verify project ownership
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const result = await generateAI({ projectId, operation, context, instructions, providerId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } });
  }
});

aiRouter.get('/generations', async (req: Request, res: Response) => {
  try {
    const { projectId, operation, status, reviewStatus, limit } = req.query;

    if (!projectId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'projectId is required' } });
    }

    const generations = await listGenerations(projectId as string, {
      operation: operation as string,
      status: status as string,
      reviewStatus: reviewStatus as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ success: true, data: generations });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch generations' } });
  }
});

aiRouter.get('/generations/:id', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const { id } = req.params;

    if (!projectId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'projectId is required' } });
    }

    const generation = await getGeneration(id, projectId as string);
    if (!generation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Generation not found' } });
    }

    res.json({ success: true, data: generation });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch generation' } });
  }
});

aiRouter.patch('/generations/:id/review', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const { id } = req.params;
    const { reviewStatus } = req.body;

    if (!reviewStatus || !['NEEDS_REVIEW', 'USER_EDITED', 'VERIFIED', 'REJECTED'].includes(reviewStatus)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid reviewStatus is required' },
      });
    }

    const generation = await updateReviewStatus(id, projectId as string, reviewStatus);
    res.json({ success: true, data: generation });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update review status' } });
  }
});

aiRouter.delete('/generations/:id', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const { id } = req.params;

    await deleteGeneration(id, projectId as string);
    res.json({ success: true, message: 'Generation deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete generation' } });
  }
});

// ── Operations catalog ───────────────────────────────────────────────────────

aiRouter.get('/operations', async (_req: Request, res: Response) => {
  try {
    // Import here to avoid circular dependency issues
    const { OPERATIONS } = require('../services/ai/generation.js');
    res.json({ success: true, data: OPERATIONS });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch operations' } });
  }
});

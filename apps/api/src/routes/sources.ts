import { Router, Request, Response } from 'express';
import prisma from '@icon-academic/db';

export const sourcesRouter = Router();

// GET /api/v1/sources - List sources for a project
sourcesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const type = req.query.type as string | undefined;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'projectId is required',
        },
      });
    }

    const where: Record<string, unknown> = { projectId };
    if (type) where.type = type;

    const sources = await prisma.source.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { chunks: true, citations: true },
        },
      },
    });

    res.json({
      success: true,
      data: sources,
    });
  } catch (error) {
    console.error('Error fetching sources:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch sources',
      },
    });
  }
});

// POST /api/v1/sources - Create a new source
sourcesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { projectId, name, type, metadata } = req.body;

    if (!projectId || !name || !type) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'projectId, name, and type are required',
        },
      });
    }

    const source = await prisma.source.create({
      data: {
        projectId,
        name,
        type,
        sizeBytes: 0,
        metadata: metadata || {},
      },
    });

    res.status(201).json({
      success: true,
      data: source,
    });
  } catch (error) {
    console.error('Error creating source:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create source',
      },
    });
  }
});

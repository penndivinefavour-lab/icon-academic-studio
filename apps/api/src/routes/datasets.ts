import { Router, Request, Response } from 'express';
import { prisma } from '@icon-academic/db';

export const datasetsRouter = Router();

// GET /api/v1/datasets - List datasets for a project
datasetsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'projectId is required',
        },
      });
    }

    const datasets = await prisma.dataset.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      success: true,
      data: datasets,
    });
  } catch (error) {
    console.error('Error fetching datasets:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch datasets',
      },
    });
  }
});

// POST /api/v1/datasets - Create a new dataset
datasetsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { projectId, name, description, file, columns, rowCount, preview } = req.body;

    if (!projectId || !name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'projectId and name are required',
        },
      });
    }

    const dataset = await prisma.dataset.create({
      data: {
        projectId,
        name,
        description,
        file,
        columns: columns || [],
        rowCount: rowCount || 0,
        preview: preview || [],
      },
    });

    res.status(201).json({
      success: true,
      data: dataset,
    });
  } catch (error) {
    console.error('Error creating dataset:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create dataset',
      },
    });
  }
});

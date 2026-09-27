import { Router, Request, Response } from 'express';
import prisma from '@icon-academic/db';

export const documentsRouter = Router();

// GET /api/v1/documents - List documents for a project
documentsRouter.get('/', async (req: Request, res: Response) => {
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

    const documents = await prisma.document.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch documents',
      },
    });
  }
});

// POST /api/v1/documents - Create a new document
documentsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { projectId, title, type, structure, settings } = req.body;

    if (!projectId || !title || !type) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'projectId, title, and type are required',
        },
      });
    }

    const document = await prisma.document.create({
      data: {
        projectId,
        title,
        type,
        structure: structure || {},
        settings: settings || {},
      },
    });

    res.status(201).json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create document',
      },
    });
  }
});

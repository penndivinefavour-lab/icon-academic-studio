import { Router, Request, Response } from 'express';
import { prisma } from '@icon-academic/db';

export const aiProvidersRouter = Router();

// GET /api/v1/ai/providers - List AI providers
aiProvidersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const providers = await prisma.aIProvider.findMany({
      orderBy: { name: 'asc' },
      include: {
        models_list: true,
      },
    });

    res.json({
      success: true,
      data: providers,
    });
  } catch (error) {
    console.error('Error fetching AI providers:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch AI providers',
      },
    });
  }
});

// POST /api/v1/ai/providers - Create an AI provider
aiProvidersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, endpoint, models, capabilities } = req.body;

    if (!name || !type || !endpoint) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name, type, and endpoint are required',
        },
      });
    }

    const provider = await prisma.aIProvider.create({
      data: {
        name,
        type,
        endpoint,
        capabilities: capabilities || {},
      },
    });

    res.status(201).json({
      success: true,
      data: provider,
    });
  } catch (error) {
    console.error('Error creating AI provider:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create AI provider',
      },
    });
  }
});

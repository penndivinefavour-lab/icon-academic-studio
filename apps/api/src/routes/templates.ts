import { Router, Request, Response } from 'express';
import prisma from '@icon-academic/db';

export const templatesRouter = Router();

// GET /api/v1/templates - List templates
templatesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const projectType = req.query.projectType as string | undefined;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (projectType) where.projectType = projectType;

    const templates = await prisma.template.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch templates',
      },
    });
  }
});

// POST /api/v1/templates - Create a template
templatesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, type, projectType, structure, variables } = req.body;

    if (!name || !type || !projectType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name, type, and projectType are required',
        },
      });
    }

    const template = await prisma.template.create({
      data: {
        name,
        description,
        type,
        projectType,
        structure: structure || {},
        variables: variables || [],
      },
    });

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create template',
      },
    });
  }
});

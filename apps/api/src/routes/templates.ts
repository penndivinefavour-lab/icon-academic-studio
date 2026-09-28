import { Router, Request, Response } from 'express';
import { prisma } from '@icon-academic/db';
import { seedTemplates, getTemplates, getTemplate } from '../services/templateService.js';

export const templatesRouter = Router();

// Initialize templates on startup
seedTemplates().catch(console.error);

// GET /api/v1/templates - List templates
templatesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const projectType = req.query.projectType as string | undefined;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (projectType) where.projectType = projectType;

    const templates = await getTemplates(projectType);
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch templates' },
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
        error: { code: 'VALIDATION_ERROR', message: 'name, type, and projectType are required' },
      });
    }

    const template = await prisma.template.create({
      data: {
        name,
        description,
        type,
        projectType,
        structure: structure ? JSON.stringify(structure) : '{}',
        variables: variables ? JSON.stringify(variables) : '[]',
      },
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create template' },
    });
  }
});

// GET /api/v1/templates/:id - Get single template
templatesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const template = await getTemplate(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Template not found' },
      });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch template' },
    });
  }
});

// POST /api/v1/templates/:id/documents - Create document from template
templatesRouter.post('/:id/documents', async (req: Request, res: Response) => {
  try {
    const { projectId, title } = req.body;
    
    if (!projectId || !title) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'projectId and title are required' },
      });
    }

    const { createDocumentFromTemplate } = require('../services/templateService.js');
    const document = await createDocumentFromTemplate(req.params.id, projectId, title);

    res.status(201).json({ success: true, data: document });
  } catch (error) {
    console.error('Error creating document from template:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create document from template' },
    });
  }
});

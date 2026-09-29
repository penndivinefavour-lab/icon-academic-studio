import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@icon-academic/db';

export const projectsRouter = Router();

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum([
    'GCE_STUDY_GUIDE',
    'GCE_PAMPHLET',
    'PAST_PAPER_ANALYSIS',
    'REVISION_NOTES',
    'QUESTION_BANK',
    'MOCK_EXAMINATION',
    'TEXTBOOK',
    'BOOK',
    'RESEARCH_PROJECT',
    'HND_PROJECT',
    'THESIS',
    'RESEARCH_PROPOSAL',
    'SEMINAR_PAPER',
    'INTERNSHIP_REPORT',
    'QUESTIONNAIRE',
    'INTERVIEW_GUIDE',
    'DATA_ANALYSIS',
    'GENERAL_DOCUMENT',
    'CUSTOM',
  ]),
  workspaceId: z.string().cuid().optional(),
  settings: z.record(z.unknown()).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  type: z.enum([
    'GCE_STUDY_GUIDE',
    'GCE_PAMPHLET',
    'PAST_PAPER_ANALYSIS',
    'REVISION_NOTES',
    'QUESTION_BANK',
    'MOCK_EXAMINATION',
    'TEXTBOOK',
    'BOOK',
    'RESEARCH_PROJECT',
    'HND_PROJECT',
    'THESIS',
    'RESEARCH_PROPOSAL',
    'SEMINAR_PAPER',
    'INTERNSHIP_REPORT',
    'QUESTIONNAIRE',
    'INTERVIEW_GUIDE',
    'DATA_ANALYSIS',
    'GENERAL_DOCUMENT',
    'CUSTOM',
  ]).optional(),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ARCHIVED']).optional(),
  settings: z.record(z.unknown()).optional(),
});

// GET /api/v1/projects - List all projects
projectsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              sources: true,
              documents: true,
              datasets: true,
            },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({
      success: true,
      data: projects,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch projects',
      },
    });
  }
});

// POST /api/v1/projects - Create a new project
projectsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = createProjectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        ...validatedData,
        settings: validatedData.settings ? JSON.stringify(validatedData.settings) : '{}',
      },
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid project data',
          details: error.errors,
        },
      });
    }
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create project',
      },
    });
  }
});

// GET /api/v1/projects/:id - Get a project by ID
projectsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        sources: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          take: 10,
          orderBy: { updatedAt: 'desc' },
        },
        datasets: {
          take: 10,
          orderBy: { updatedAt: 'desc' },
        },
        _count: {
          select: {
            sources: true,
            documents: true,
            datasets: true,
            researchNotes: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Project not found',
        },
      });
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch project',
      },
    });
  }
});

// PATCH /api/v1/projects/:id - Update a project
projectsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateProjectSchema.partial().parse(req.body);

    const project = await prisma.project.update({
      where: { id },
      data: validatedData,
    });

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid project data',
          details: error.errors,
        },
      });
    }
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update project',
      },
    });
  }
});

// DELETE /api/v1/projects/:id - Delete a project
projectsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.project.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete project',
      },
    });
  }
});

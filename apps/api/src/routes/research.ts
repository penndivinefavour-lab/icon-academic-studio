import { Router, Request, Response } from 'express';
import { prisma } from '@icon-academic/db';

export const researchRouter = Router();

// GET /api/v1/research/questions - List research questions
researchRouter.get('/questions', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'projectId is required' },
      });
    }

    const questions = await prisma.researchQuestion.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { evidenceItems: true } },
      },
    });

    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('Error fetching research questions:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch research questions' },
    });
  }
});

// POST /api/v1/research/questions - Create research question
researchRouter.post('/questions', async (req: Request, res: Response) => {
  try {
    const { projectId, question, hypothesis, notes } = req.body;

    if (!projectId || !question) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'projectId and question are required' },
      });
    }

    const questionRecord = await prisma.researchQuestion.create({
      data: {
        projectId,
        question,
        hypothesis,
        notes,
      },
    });

    res.status(201).json({ success: true, data: questionRecord });
  } catch (error) {
    console.error('Error creating research question:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create research question' },
    });
  }
});

// GET /api/v1/research/notes - List research notes
researchRouter.get('/notes', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'projectId is required' },
      });
    }

    const notes = await prisma.researchNote.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: notes });
  } catch (error) {
    console.error('Error fetching research notes:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch research notes' },
    });
  }
});

// POST /api/v1/research/notes - Create research note
researchRouter.post('/notes', async (req: Request, res: Response) => {
  try {
    const { projectId, title, content, tags, sources, linkedDocuments } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'projectId and title are required' },
      });
    }

    const note = await prisma.researchNote.create({
      data: {
        projectId,
        title,
        content: content || '',
        tags: tags ? JSON.stringify(tags) : '[]',
        sources: sources ? JSON.stringify(sources) : '[]',
        linkedDocuments: linkedDocuments ? JSON.stringify(linkedDocuments) : '[]',
      },
    });

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    console.error('Error creating research note:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create research note' },
    });
  }
});

// GET /api/v1/research/search - Search across sources and notes
researchRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const query = req.query.q as string;

    if (!projectId || !query) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'projectId and q (search query) are required' },
      });
    }

    const searchPattern = `%${query}%`;

    const [sources, notes, questions] = await Promise.all([
      prisma.source.findMany({
        where: {
          projectId,
          OR: [
            { name: { contains: query } },
            { contentPreview: { contains: query } },
          ],
        },
        select: { id: true, name: true, type: true, contentPreview: true, status: true },
      }),
      prisma.researchNote.findMany({
        where: {
          projectId,
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
          ],
        },
        select: { id: true, title: true, content: true, tags: true },
      }),
      prisma.researchQuestion.findMany({
        where: {
          projectId,
          question: { contains: query },
        },
        select: { id: true, question: true, status: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        sources,
        notes,
        questions,
        total: sources.length + notes.length + questions.length,
      },
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Search failed' },
    });
  }
});

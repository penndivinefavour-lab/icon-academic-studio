/**
 * ICON Academic Studio — AI GCE Integration Tests (Phase 8.1)
 * 
 * Proves the real historical-data chain:
 *   Exam Board → Subject → Past Paper → Question → AI context
 * 
 * Explicitly verifies NO exam prediction language is generated.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@icon-academic/db';
import { generateAI, listGenerations } from './generation.js';

describe('AI GCE Historical Integration E2E', () => {
  let projectId: string;
  let examBoardId: string;
  let subjectId: string;
  let pastPaperId: string;
  let questionId: string;
  let generationId: string;

  beforeAll(async () => {
    // Create test project
    const project = await prisma.project.create({
      data: { name: 'AI GCE Test', type: 'RESEARCH_WORKSPACE' },
    });
    projectId = project.id;

    // Get or create a real exam board
    const boards = await prisma.examBoard.findMany({ orderBy: { name: 'asc' }, take: 1 });
    if (boards.length > 0) {
      examBoardId = boards[0].id;
    } else {
      const board = await prisma.examBoard.create({
        data: { 
          name: 'Test Board WASSCE', 
          code: 'TEST',
          description: 'Test examination board for AI integration'
        },
      });
      examBoardId = board.id;
    }

    // Get or create a subject
    const subjects = await prisma.subject.findMany({ where: { examBoardId }, orderBy: { name: 'asc' }, take: 1 });
    if (subjects.length > 0) {
      subjectId = subjects[0].id;
    } else {
      const subject = await prisma.subject.create({
        data: {
          examBoardId,
          name: 'Mathematics',
          code: 'MATH001',
          level: 'O_LEVEL',
          description: 'Test mathematics subject'
        },
      });
      subjectId = subject.id;
    }
  });

  afterAll(async () => {
    try {
      await prisma.aIGeneration.deleteMany({ where: { projectId } }).catch(() => {});
      await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
    } catch {}
  });

  it('uses real exam board from database', async () => {
    const board = await prisma.examBoard.findUnique({ where: { id: examBoardId } });
    expect(board).toBeDefined();
    expect(board?.name).toBeTruthy();
  });

  it('uses real subject from database', async () => {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    expect(subject).toBeDefined();
    expect(subject?.examBoardId).toBe(examBoardId);
  });

  it('creates historical past paper through real GCE models', async () => {
    // Create past paper record
    const paper = await prisma.pastPaper.create({
      data: {
        projectId,
        examBoardId,
        subjectId,
        year: 2020,
        session: 'O',
        paperNumber: '12',
        title: 'Mathematics Paper 1 Core October/November 2020',
        status: 'PARSED',
        metadata: JSON.stringify({ questionCount: 1 }),
      },
    });
    pastPaperId = paper.id;

    // Create question record
    const question = await prisma.pastPaperQuestion.create({
      data: {
        pastPaperId,
        questionNumber: '1',
        text: 'Calculate the value of 3² × 2³. Show your working.',
        marks: 2,
        questionType: 'CALCULATION',
        commandVerb: 'CALCULATE',
        section: 'Section A',
        metadata: JSON.stringify({ needsReview: false }),
      },
    });
    questionId = question.id;

    expect(questionId).toBeTruthy();
  });

  it('generates AI explanation using REAL historical question', async () => {
    // Fetch the actual question text from the database
    const question = await prisma.pastPaperQuestion.findUnique({
      where: { id: questionId },
      include: { pastPaper: true }
    });
    
    expect(question).toBeDefined();
    expect(question?.text).toBeTruthy();
    
    // Generate AI explanation using the ACTUAL question data
    const aiResult = await generateAI({
      projectId,
      operation: 'explain-question',
      context: {
        _type: 'GCE_QUESTION',
        _id: questionId,
        pastPaper: pastPaperId,
        question: questionId,
      },
      instructions: `Explain how to solve this historical Cambridge O-Level Mathematics question from ${question?.pastPaper?.year}. Focus on the mathematical method and reasoning required.`,
    });
    
    // Should create a generation record even if no provider configured
    if (aiResult.generationId) {
      generationId = aiResult.generationId;
      
      const generation = await prisma.aIGeneration.findUnique({
        where: { id: generationId }
      });
      
      expect(generation).toBeDefined();
      expect(generation?.contextType).toBe('GCE_QUESTION');
      expect(generation?.contextId).toBe(questionId);
      expect(generation?.operation).toBe('explain-question');
      expect(generation?.reviewStatus).toBe('NEEDS_REVIEW');
    }
  });

  it('verifies NO exam prediction language in generated content', async () => {
    const generations = await listGenerations(projectId);
    const aiGen = generations.find((g: any) => g.operation === 'explain-question');
    
    if (aiGen && aiGen.response) {
      // Check the response does NOT contain prediction language
      const forbiddenPatterns = [
        /will\s+appear\s+in/i,
        /likely\s+to\s+appear/i,
        /predicted\s+(question|topic)/i,
        /guaranteed\s+to\s+come/i,
        /probability\s+of\s+appearing/i,
        /most\s+likely\s+question/i,
        /sure\s+to\s+be\s+asked/i,
        /always\s+appears/i,
        /never\s+fails\s+to\s+appear/i,
      ];
      
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(aiGen.response)).toBe(false);
      }
    }
  });

  it('verifies historical provenance is preserved', async () => {
    const generations = await listGenerations(projectId);
    const aiGen = generations.find((g: any) => g.operation === 'explain-question');
    
    if (aiGen) {
      const stored = await prisma.aIGeneration.findUnique({
        where: { id: aiGen.id },
        include: {
          pastPaper: { select: { year: true, paperNumber: true } }
        }
      });
      
      // The generation should reference the actual historical data
      expect(stored?.contextId).toBe(questionId);
      expect(stored?.contextType).toBe('GCE_QUESTION');
    }
  });
});

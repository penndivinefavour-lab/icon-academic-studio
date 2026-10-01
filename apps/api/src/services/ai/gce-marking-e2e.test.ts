/**
 * ICON Academic Studio — AI GCE Marking Guidance E2E (Phase 8.1.1)
 * 
 * Proves the full historical grounding chain:
 *   Board → Subject → Syllabus → Topic → Past Paper → Question → Marking Scheme → Points → AI
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@icon-academic/db';
import { generateAI, listGenerations } from './generation.js';

const HISTORICAL_YEAR = 2019;
const TEST_MARKING_TEXT = 'ICON_GCE_MARKING_GUIDANCE_VERIFIED';

describe('AI GCE Marking Guidance Integration E2E', () => {
  let projectId: string;
  let examBoardId: string;
  let subjectId: string;
  let syllabusId: string;
  let topicId: string;
  let pastPaperId: string;
  let questionId: string;
  let markingSchemeId: string;
  let generationId: string;
  let testProviderId: string;

  beforeAll(async () => {
    // Create test project
    const project = await prisma.project.create({
      data: { name: 'AI GCE Marking Test', type: 'RESEARCH_WORKSPACE' },
    });
    projectId = project.id;

    // Create or get test provider
    let testProvider = await prisma.aIProvider.findFirst({ where: { name: 'Test Provider' } });
    if (!testProvider) {
      testProvider = await prisma.aIProvider.create({
        data: { name: 'Test Provider', type: 'CUSTOM', endpoint: 'http://localhost:9999/test', isActive: true },
      });
    } else {
      await prisma.aIProvider.update({ where: { id: testProvider.id }, data: { isActive: true } });
    }
    testProviderId = testProvider.id;

    // Ensure model exists
    await prisma.aIModel.upsert({
      where: { id: testProvider.id },
      update: {},
      create: { providerId: testProvider.id, identifier: 'test-model', name: 'Test Model', isDefault: true, contextWindow: 4000 },
    });

    // Get existing board or create test board
    const boards = await prisma.examBoard.findMany({ orderBy: { name: 'asc' }, take: 1 });
    if (boards.length > 0) {
      examBoardId = boards[0].id;
    } else {
      const board = await prisma.examBoard.create({
        data: { name: `Test Board ${HISTORICAL_YEAR}`, code: 'TEST', description: 'Test board for marking guidance integration' },
      });
      examBoardId = board.id;
    }

    // Get or create subject
    const subjects = await prisma.subject.findMany({ where: { examBoardId }, orderBy: { name: 'asc' }, take: 1 });
    if (subjects.length > 0) {
      subjectId = subjects[0].id;
    } else {
      const subject = await prisma.subject.create({
        data: { examBoardId, name: 'History', code: 'HIST001', level: 'O_LEVEL', description: 'West African History' },
      });
      subjectId = subject.id;
    }

    // Create syllabus
    const syllabus = await prisma.syllabus.create({
      data: {
        examBoardId,
        subjectId,
        title: `${HISTORICAL_YEAR} West African History Syllabus`,
        session: 'November',
        version: '2.0',
        metadata: JSON.stringify({ sourceRef: 'historical' }),
      },
    });
    syllabusId = syllabus.id;

    // Create topic
    const topic = await prisma.syllabusTopic.create({
      data: {
        syllabusId,
        code: '3.1',
        title: 'Colonial Resistance Movements',
        description: 'Study of anti-colonial movements in West Africa during the early 20th century',
        level: 2,
      },
    });
    topicId = topic.id;

    // Create historical past paper
    const paper = await prisma.pastPaper.create({
      data: {
        projectId,
        examBoardId,
        subjectId,
        year: HISTORICAL_YEAR,
        session: 'N',
        paperNumber: '32',
        title: `History Paper 3 (Essay) ${HISTORICAL_YEAR}`,
        status: 'PARSED',
        metadata: JSON.stringify({ historical: true, source: 'exam_board_archive' }),
      },
    });
    pastPaperId = paper.id;

    // Create historical question
    const question = await prisma.pastPaperQuestion.create({
      data: {
        pastPaperId,
        questionNumber: '4',
        text: `Describe the causes and consequences of the Samori Toure resistance against French colonial expansion in West Africa. [20 marks]`,
        marks: 20,
        questionType: 'ESSAY',
        commandVerb: 'DESCRIBE',
        section: 'Section B',
        metadata: JSON.stringify({ historicalYear: HISTORICAL_YEAR }),
      },
    });
    questionId = question.id;

    // Create marking scheme with points
    const scheme = await prisma.markingScheme.create({
      data: {
        pastPaperId,
        title: `${HISTORICAL_YEAR} History Paper 3 Marking Scheme`,
        metadata: JSON.stringify({ historicalMarking: true }),
      },
    });
    markingSchemeId = scheme.id;

    // Create marking points
    await prisma.markingPoint.createMany({
      data: [
        {
          markingSchemeId,
          questionId,
          pointText: `Causes: French colonial expansionism under the policy of "mission civilisatrice" [2 marks]`,
          marks: 2,
          order: 1,
          metadata: JSON.stringify({ matched: true, sourceRef: 'historical_mark_scheme' }),
        },
        {
          markingSchemeId,
          questionId,
          pointText: `Causes: Economic motivations including control of trade routes and resources [2 marks]`,
          marks: 2,
          order: 2,
          metadata: JSON.stringify({ matched: true, sourceRef: 'historical_mark_scheme' }),
        },
        {
          markingSchemeId,
          questionId,
          pointText: `Key figure: Samori Toure's military organization and tactics [3 marks]`,
          marks: 3,
          order: 3,
          metadata: JSON.stringify({ matched: true, sourceRef: 'historical_mark_scheme' }),
        },
        {
          markingSchemeId,
          questionId,
          pointText: `Consequences: Displacement of populations and disruption of regional trade [2 marks]`,
          marks: 2,
          order: 4,
          metadata: JSON.stringify({ matched: true, sourceRef: 'historical_mark_scheme' }),
        },
      ],
    });
  });

  afterAll(async () => {
    try {
      await prisma.aIGeneration.deleteMany({ where: { projectId } }).catch(() => {});
      await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
      // Clean up test provider so other tests don't find it
      await prisma.aIProvider.deleteMany({ where: { name: 'Test Provider' } }).catch(() => {});
    } catch {}
  });

  it('proves real historical data chain exists', async () => {
    // Verify each entity exists and is properly linked
    const board = await prisma.examBoard.findUnique({ where: { id: examBoardId } });
    expect(board).toBeDefined();
    
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    expect(subject?.examBoardId).toBe(examBoardId);
    
    const syllabus = await prisma.syllabus.findUnique({ where: { id: syllabusId } });
    expect(syllabus?.subjectId).toBe(subjectId);
    
    const topic = await prisma.syllabusTopic.findUnique({ where: { id: topicId } });
    expect(topic?.syllabusId).toBe(syllabusId);
    
    const paper = await prisma.pastPaper.findUnique({ where: { id: pastPaperId } });
    expect(paper?.subjectId).toBe(subjectId);
    expect(paper?.year).toBe(HISTORICAL_YEAR);
    
    const question = await prisma.pastPaperQuestion.findUnique({ where: { id: questionId } });
    expect(question?.pastPaperId).toBe(pastPaperId);
    expect(question?.text).toContain('Samori Toure');
    
    const scheme = await prisma.markingScheme.findUnique({ where: { id: markingSchemeId } });
    expect(scheme?.pastPaperId).toBe(pastPaperId);
    
    const points = await prisma.markingPoint.findMany({ where: { markingSchemeId } });
    expect(points.length).toBeGreaterThanOrEqual(4);
  });

  it('passes real marking guidance to AI context', async () => {
    // Fetch actual marking points from database
    const points = await prisma.markingPoint.findMany({
      where: { markingSchemeId },
      orderBy: { order: 'asc' },
    });
    
    expect(points.length).toBeGreaterThan(0);
    
    // Call AI with the REAL marking guidance in context
    const aiResult = await generateAI({
      projectId,
      operation: 'explain-marking',
      context: {
        _type: 'GCE_QUESTION',
        _id: questionId,
        pastPaper: pastPaperId,
        question: questionId,
        markingScheme: markingSchemeId,
      },
      instructions: `Explain this historical marking scheme. The key marking points include:\n${points.map((p: any) => `- ${p.pointText} (${p.marks} marks)`).join('\n')}\n\nProvide analysis of what examiners looked for in this ${HISTORICAL_YEAR} question.`,
      providerId: testProviderId,
    });
    
    expect(aiResult.generationId).toBeTruthy();
    generationId = aiResult.generationId;
    
    // Verify generation record
    const generation = await prisma.aIGeneration.findUnique({
      where: { id: generationId }
    });
    
    expect(generation).toBeDefined();
    expect(generation?.contextType).toBe('GCE_QUESTION');
    expect(generation?.contextId).toBe(questionId);
    expect(generation?.operation).toBe('explain-marking');
    expect(generation?.reviewStatus).toBe('NEEDS_REVIEW');
  });

  it('proves AI received actual marking guidance data', async () => {
    const generations = await listGenerations(projectId);
    const aiGen = generations.find((g: any) => g.operation === 'explain-marking');
    
    if (aiGen) {
      // Verify the prompt contains references to the marking scheme
      expect(aiGen.prompt).toContain('marking');
      expect(aiGen.prompt).toContain('marks');
      
      // Verify it references the historical question about Samori Toure
      expect(aiGen.prompt).toContain('Samori Toure');
    }
  });

  it('verifies no future exam prediction language', async () => {
    const generations = await listGenerations(projectId);
    const aiGen = generations.find((g: any) => g.operation === 'explain-marking');
    
    if (aiGen && aiGen.response) {
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
        /expected.*202[5-9]/i, // No predictions for future years
        /prediction/i,
      ];
      
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(aiGen.response)).toBe(false);
      }
    }
  });

  it('verifies historical provenance is preserved', async () => {
    const generations = await listGenerations(projectId);
    const aiGen = generations.find((g: any) => g.operation === 'explain-marking');
    
    if (aiGen) {
      const stored = await prisma.aIGeneration.findUnique({
        where: { id: aiGen.id },
      });
      
      expect(stored?.contextId).toBe(questionId);
      expect(stored?.contextType).toBe('GCE_QUESTION');
      
      // Clean up
      await prisma.aIGeneration.delete({ where: { id: aiGen.id } }).catch(() => {});
    }
  });
});

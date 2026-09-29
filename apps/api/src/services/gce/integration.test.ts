/// <reference types="vitest/globals" />
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@icon-academic/db';
import * as gce from './service.js';
import * as parsers from './parsers.js';

describe('GCE Intelligence — Integration', () => {
  let examBoardId: string;
  let subjectId: string;
  let projectId: string;

  beforeAll(async () => {
    // Create a test project
    const project = await prisma.project.create({
      data: { name: 'GCE Test Project - ' + Date.now(), type: 'RESEARCH' },
    });
    projectId = project.id;

    // Create an exam board with unique name to avoid conflicts
    const board = await prisma.examBoard.create({
      data: { name: 'Test Board GCE ' + Date.now(), code: 'TST' + Date.now() },
    });
    examBoardId = board.id;

    // Create a subject
    const subject = await prisma.subject.create({
      data: {
        examBoardId,
        name: 'Mathematics Test ' + Date.now(),
        code: 'MATH' + Date.now(),
        level: 'A_LEVEL',
      },
    });
    subjectId = subject.id;
  });

  afterAll(async () => {
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.$disconnect();
  });

  describe('Exam Board & Subject CRUD', () => {
    it('should create and retrieve an exam board', async () => {
      const boards = await gce.listExamBoards();
      expect(boards.length).toBeGreaterThan(0);
    });

    it('should list subjects for an exam board', async () => {
      const subjects = await gce.listSubjects(examBoardId);
      expect(subjects.length).toBeGreaterThan(0);
      expect(subjects.some(s => s.id === subjectId)).toBe(true);
    });
  });

  describe('Syllabus ingestion', () => {
    it('should ingest a syllabus structure', async () => {
      const rawText = `1. Number Systems\n  1.1 Integers\n  1.2 Rational numbers\n2. Algebra\n  2.1 Linear equations\n  2.2 Quadratic equations`;
      
      const result = await gce.ingestSyllabus(rawText, {
        projectId,
        examBoardId,
        subjectId,
        title: 'Mathematics Syllabus 2024',
      });

      expect(result.syllabusId).toBeDefined();
      expect(result.sectionsCreated).toBeGreaterThan(0);
      expect(result.topicsCreated).toBeGreaterThan(0);
    });
  });

  describe('Past paper ingestion', () => {
    it('should ingest a past paper', async () => {
      const rawText = `SECTION A: Multiple Choice\n\n1. What is 2 + 2? [1 mark]\n\nSECTION B: Structured Questions\n\n2. Solve the equation 2x = 10. [2 marks]`;

      const result = await gce.ingestPastPaper(rawText, {
        projectId,
        examBoardId,
        subjectId,
        year: 2023,
        paperNumber: 'P1',
      });

      expect(result.pastPaperId).toBeDefined();
      expect(result.questionsCreated).toBeGreaterThan(0);
      expect(result.ocrRequired).toBe(false);
    });
  });

  describe('Historical analysis', () => {
    it('should return analysis even with no data', async () => {
      const result = await gce.historicalAnalysis({
        examBoardId,
        subjectId,
      });

      expect(result.summary).toBeDefined();
      expect(Array.isArray(result.byTopic)).toBe(true);
    });
  });

  describe('Search', () => {
    it('should return empty results for unknown query', async () => {
      const result = await gce.searchGce('zzznonexistentzzz', { subjectId });
      expect(result.questions.length).toBe(0);
      expect(result.topics.length).toBe(0);
    });
  });

  describe('Question Bank', () => {
    it('should add and retrieve items', async () => {
      const item = await gce.addToQuestionBank({
        projectId,
        questionText: 'What is the derivative of x²?',
        marks: 3,
        topic: 'Calculus',
        questionType: 'SHORT_ANSWER',
      });

      expect(item.id).toBeDefined();

      const filtered = await gce.questionBankFilters({ projectId });
      expect(filtered.items.some(i => i.id === item.id)).toBe(true);
      expect(filtered.total).toBeGreaterThan(0);
    });
  });
});

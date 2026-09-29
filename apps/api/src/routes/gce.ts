import { Router, Request, Response } from 'express';
import * as gce from '../services/gce/service.js';

export const gceRouter = Router();

// ---- Exam Boards ----
gceRouter.get('/exam-boards', async (req, res) => {
  try {
    const boards = await gce.listExamBoards();
    res.json({ success: true, data: boards });
  } catch (e) {
    console.error('Error listing exam boards:', e);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list exam boards' } });
  }
});

gceRouter.post('/exam-boards', async (req, res) => {
  try {
    const { name, code, description, metadata } = req.body;
    if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name is required' } });
    const board = await gce.upsertExamBoard({ name, code, description, metadata });
    res.status(201).json({ success: true, data: board });
  } catch (e) {
    console.error('Error upserting exam board:', e);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to upsert exam board' } });
  }
});

gceRouter.get('/exam-boards/:id', async (req, res) => {
  try {
    const board = await gce.getExamBoard(req.params.id);
    if (!board) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam board not found' } });
    res.json({ success: true, data: board });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get exam board' } });
  }
});

// ---- Subjects ----
gceRouter.get('/subjects', async (req, res) => {
  try {
    const subjects = await gce.listSubjects(req.query.examBoardId as string, req.query.level as string);
    res.json({ success: true, data: subjects });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list subjects' } });
  }
});

gceRouter.post('/subjects', async (req, res) => {
  try {
    const { examBoardId, name, code, level, description, metadata } = req.body;
    if (!examBoardId || !name) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'examBoardId and name are required' } });
    const subject = await gce.createSubject({ examBoardId, name, code, level, description, metadata });
    res.status(201).json({ success: true, data: subject });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create subject' } });
  }
});

// ---- Syllabi ----
gceRouter.get('/syllabi', async (req, res) => {
  try {
    const syllabi = await gce.listSyllabi({
      subjectId: req.query.subjectId as string,
      examBoardId: req.query.examBoardId as string,
      projectId: req.query.projectId as string,
    });
    res.json({ success: true, data: syllabi });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list syllabi' } });
  }
});

gceRouter.post('/syllabi/ingest', async (req, res) => {
  try {
    const { rawText, projectId, examBoardId, subjectId, title, session, version, sourceId, status } = req.body;
    if (!examBoardId || !subjectId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'examBoardId and subjectId are required' } });
    const result = await gce.ingestSyllabus(rawText || '', { projectId, examBoardId, subjectId, title, session, version, sourceId, status });
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    console.error('Error ingesting syllabus:', e);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to ingest syllabus' } });
  }
});

gceRouter.get('/syllabi/:id', async (req, res) => {
  try {
    const syllabus = await gce.getSyllabus(req.params.id);
    if (!syllabus) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Syllabus not found' } });
    res.json({ success: true, data: syllabus });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get syllabus' } });
  }
});

// ---- Past Papers ----
gceRouter.get('/papers', async (req, res) => {
  try {
    const result = await gce.listPastPapers({
      subjectId: req.query.subjectId as string,
      examBoardId: req.query.examBoardId as string,
      year: req.query.year ? Number(req.query.year) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list past papers' } });
  }
});

gceRouter.post('/papers/ingest', async (req, res) => {
  try {
    const { rawText, projectId, examBoardId, subjectId, year, session, paperNumber, title, sourceId } = req.body;
    if (!projectId || !examBoardId || !subjectId || !year) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'projectId, examBoardId, subjectId, and year are required' } });
    const result = await gce.ingestPastPaper(rawText || '', { projectId, examBoardId, subjectId, year, session, paperNumber, title, sourceId });
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    console.error('Error ingesting past paper:', e);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to ingest past paper' } });
  }
});

gceRouter.get('/papers/:id', async (req, res) => {
  try {
    const paper = await gce.getPastPaper(req.params.id);
    if (!paper) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Past paper not found' } });
    res.json({ success: true, data: paper });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get past paper' } });
  }
});

// ---- Marking Schemes ----
gceRouter.post('/papers/:paperId/marking-schemes/ingest', async (req, res) => {
  try {
    const { rawText, sourceId, title } = req.body;
    if (!rawText) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'rawText is required' } });
    const result = await gce.ingestMarkingScheme(rawText, { pastPaperId: req.params.paperId, sourceId, title });
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    console.error('Error ingesting marking scheme:', e);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to ingest marking scheme' } });
  }
});

// ---- Topic Mappings ----
gceRouter.get('/mappings', async (req, res) => {
  try {
    const mappings = await gce.listMappings({
      questionId: req.query.questionId as string,
      topicId: req.query.topicId as string,
      status: req.query.status as string,
      syllabusId: req.query.syllabusId as string,
    });
    res.json({ success: true, data: mappings });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list mappings' } });
  }
});

gceRouter.post('/mappings', async (req, res) => {
  try {
    const { questionId, topicId, method, status, confidence, rationale } = req.body;
    if (!questionId || !topicId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'questionId and topicId are required' } });
    const mapping = await gce.createMapping({ questionId, topicId, method, status, confidence, rationale });
    res.status(201).json({ success: true, data: mapping });
  } catch (e) {
    console.error('Error creating mapping:', e);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create mapping' } });
  }
});

gceRouter.put('/mappings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'status is required' } });
    const mapping = await gce.updateMappingStatus(req.params.id, status as 'SUGGESTED' | 'REVIEWED' | 'CONFIRMED' | 'REJECTED');
    res.json({ success: true, data: mapping });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update mapping status' } });
  }
});

gceRouter.get('/questions/:questionId/mappings/suggest', async (req, res) => {
  try {
    const topics = JSON.parse(req.query.topics as string || '[]');
    const suggestions = await gce.suggestTopicMappings(req.params.questionId, topics);
    res.json({ success: true, data: suggestions });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to suggest mappings' } });
  }
});

// ---- Historical Analysis ----
gceRouter.get('/analysis/historical', async (req, res) => {
  try {
    const scope = {
      syllabusId: req.query.syllabusId as string,
      subjectId: req.query.subjectId as string,
      examBoardId: req.query.examBoardId as string,
      statuses: (typeof req.query.statuses === 'string' ? req.query.statuses.split(',') : req.query.statuses) as string[] | undefined,
    };
    const analysis = await gce.historicalAnalysis(scope);
    res.json({ success: true, data: analysis });
  } catch (e) {
    console.error('Error running historical analysis:', e);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to run historical analysis' } });
  }
});

// ---- Search ----
gceRouter.get('/search', async (req, res) => {
  try {
    const query = (req.query.q || '') as string;
    const results = await gce.searchGce(query, {
      subjectId: req.query.subjectId as string,
      examBoardId: req.query.examBoardId as string,
    });
    res.json({ success: true, data: results });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to search GCE data' } });
  }
});

// ---- Question Bank ----
gceRouter.get('/question-bank', async (req, res) => {
  try {
    const { projectId, topicId, questionType, commandVerb, difficulty, year, paperTitle, textContains, page, pageSize } = req.query;
    const result = await gce.questionBankFilters({
      projectId: projectId as string,
      topicId: topicId as string,
      questionType: questionType as string,
      commandVerb: commandVerb as string,
      difficulty: difficulty as string,
      year: year ? Number(year) : undefined,
      paperTitle: paperTitle as string,
      textContains: textContains as string,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list question bank' } });
  }
});

gceRouter.post('/question-bank', async (req, res) => {
  try {
    const item = await gce.addToQuestionBank(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (e) {
    console.error('Error adding to question bank:', e);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to add to question bank' } });
  }
});

gceRouter.delete('/question-bank/:itemId', async (req, res) => {
  try {
    const { projectId, itemId } = req.query;
    if (!projectId || !itemId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'projectId and itemId are required' } });
    const result = await gce.removeFromQuestionBank(projectId as string, itemId as string);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to remove from question bank' } });
  }
});

// ---- Mock Exams ----
gceRouter.get('/mock-exams', async (req, res) => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'projectId is required' } });
    const exams = await gce.listMockExams(projectId);
    res.json({ success: true, data: exams });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list mock exams' } });
  }
});

gceRouter.post('/mock-exams', async (req, res) => {
  try {
    const exam = await gce.createMockExam(req.body);
    res.status(201).json({ success: true, data: exam });
  } catch (e) {
    console.error('Error creating mock exam:', e);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create mock exam' } });
  }
});

gceRouter.get('/mock-exams/:id', async (req, res) => {
  try {
    const exam = await gce.getMockExam(req.params.id);
    if (!exam) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mock exam not found' } });
    res.json({ success: true, data: exam });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get mock exam' } });
  }
});

gceRouter.post('/mock-exams/:id/questions', async (req, res) => {
  try {
    const result = await gce.addQuestionToMockExam(req.params.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to add question to mock exam' } });
  }
});

gceRouter.delete('/mock-exams/:mockExamId/questions/:questionId', async (req, res) => {
  try {
    const result = await gce.removeQuestionFromMockExam(req.params.mockExamId, req.params.questionId);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to remove question from mock exam' } });
  }
});

// ---- Document Studio Bridge ----
gceRouter.post('/documents/:documentId/bridge', async (req, res) => {
  try {
    const { blocks } = req.body;
    if (!blocks || !Array.isArray(blocks)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'blocks array is required' } });
    const result = await gce.appendGceBlocksToDocument({ documentId: req.params.documentId, blocks });
    res.json({ success: true, data: result });
  } catch (e) {
    console.error('Error bridging GCE to document:', e);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to bridge GCE content to document' } });
  }
});

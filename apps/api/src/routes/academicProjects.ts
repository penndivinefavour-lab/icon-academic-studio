/**
 * ICON Academic Studio — Academic Project Studio routes (Phase 6)
 *
 * All endpoints under /api/v1/academic-projects. Every write hits the real
 * service layer and real PostgreSQL. Project IDs are validated server-side
 * so one project can never read or write another project's data.
 */
import { Router, Request, Response } from 'express';
import * as svc from '../services/academic/service.js';
import * as bridge from '../services/academic/exportBridge.js';
import { validateAcademicProject, persistValidationRun, resolveValidationIssue } from '../services/academic/validator.js';
import { ACADEMIC_TEMPLATES, getTemplateByType } from '../services/academic/templates.js';
import { draftWithProvider, composePromptContext } from '../services/academic/ai.js';
import { prisma } from '@icon-academic/db';
import { generateDocx, generatePdf, generateMarkdown, generateHtml, generateTxt } from '../services/documentExport.js';

export const academicProjectsRouter = Router();

function badRequest(res: Response, message: string) {
  return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message } });
}
function notFound(res: Response, message = 'Not found') {
  return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message } });
}

/** Load an academic project and verify it belongs to the given project. */
async function loadOwned(academicProjectId: string, projectId: string) {
  const ap = await prisma.academicProject.findUnique({ where: { id: academicProjectId } });
  if (!ap || ap.projectId !== projectId) return null;
  return ap;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
academicProjectsRouter.get('/templates', (_req: Request, res: Response) => {
  res.json({ success: true, data: ACADEMIC_TEMPLATES });
});

academicProjectsRouter.get('/templates/:projectType', (req: Request, res: Response) => {
  const t = getTemplateByType(req.params.projectType);
  if (!t) return notFound(res, 'Unknown project type');
  res.json({ success: true, data: t });
});

// ---------------------------------------------------------------------------
// Project CRUD
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { projectId, title, projectType, template, ...rest } = req.body;
    if (!projectId || !title || !projectType) return badRequest(res, 'projectId, title and projectType are required');
    if (!getTemplateByType(projectType) && projectType !== 'CUSTOM') return badRequest(res, `Unknown projectType "${projectType}"`);
    const ap = await svc.createAcademicProject({ projectId, title, projectType, template, ...rest });
    res.status(201).json({ success: true, data: ap });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.get('/', async (req: Request, res: Response) => {
  const projectId = req.query.projectId as string;
  if (!projectId) return badRequest(res, 'projectId is required');
  const data = await svc.listAcademicProjects(projectId);
  res.json({ success: true, data });
});

academicProjectsRouter.get('/:id', async (req: Request, res: Response) => {
  const ap = await svc.getAcademicProject(req.params.id);
  if (!ap) return notFound(res, 'Academic project not found');
  res.json({ success: true, data: ap });
});

academicProjectsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = await svc.updateAcademicProject(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await svc.deleteAcademicProject(req.params.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

// ---------------------------------------------------------------------------
// Chapters
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/chapters', async (req: Request, res: Response) => {
  try {
    const data = await svc.createChapter({ academicProjectId: req.params.id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.put('/:id/chapters/:chapterId', async (req: Request, res: Response) => {
  try {
    const data = await svc.updateChapter(req.params.chapterId, req.body);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.delete('/:id/chapters/:chapterId', async (req: Request, res: Response) => {
  try {
    await svc.deleteChapter(req.params.chapterId);
    res.json({ success: true, data: { deleted: true } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

// ---------------------------------------------------------------------------
// Requirements
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/requirements', async (req: Request, res: Response) => {
  try {
    const data = await svc.createRequirement({ academicProjectId: req.params.id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.get('/:id/requirements', async (req: Request, res: Response) => {
  const data = await svc.listRequirements(req.params.id);
  res.json({ success: true, data });
});

academicProjectsRouter.delete('/:id/requirements/:requirementId', async (req: Request, res: Response) => {
  await prisma.academicRequirement.delete({ where: { id: req.params.requirementId } });
  res.json({ success: true, data: { deleted: true } });
});

// ---------------------------------------------------------------------------
// Objectives
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/objectives', async (req: Request, res: Response) => {
  try {
    const data = await svc.createObjective({ academicProjectId: req.params.id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.get('/:id/objectives', async (req: Request, res: Response) => {
  const data = await svc.listObjectives(req.params.id);
  res.json({ success: true, data });
});

academicProjectsRouter.post('/:id/objectives/:objectiveId/links', async (req: Request, res: Response) => {
  try {
    const data = await svc.linkObjectiveToQuestion({ academicProjectId: req.params.id, objectiveId: req.params.objectiveId, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

// ---------------------------------------------------------------------------
// Hypotheses
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/hypotheses', async (req: Request, res: Response) => {
  try {
    const data = await svc.createHypothesis({ academicProjectId: req.params.id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.post('/:id/hypotheses/:hypothesisId/test', async (req: Request, res: Response) => {
  try {
    const { analysisId, status } = req.body;
    if (!analysisId || !status) return badRequest(res, 'analysisId and status are required');
    const data = await svc.recordHypothesisTest(req.params.hypothesisId, analysisId, status);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/variables', async (req: Request, res: Response) => {
  try {
    const data = await svc.createVariable({ academicProjectId: req.params.id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.get('/:id/variables', async (req: Request, res: Response) => {
  const data = await svc.listVariables(req.params.id);
  res.json({ success: true, data });
});

// ---------------------------------------------------------------------------
// Conceptual framework
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/frameworks', async (req: Request, res: Response) => {
  try {
    const data = await svc.createFramework({ academicProjectId: req.params.id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.post('/:id/frameworks/:frameworkId/nodes', async (req: Request, res: Response) => {
  try {
    const data = await svc.addFrameworkNode({ frameworkId: req.params.frameworkId, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.post('/:id/frameworks/:frameworkId/edges', async (req: Request, res: Response) => {
  try {
    const data = await svc.addFrameworkEdge({ frameworkId: req.params.frameworkId, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

// ---------------------------------------------------------------------------
// Methodology
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/methodologies', async (req: Request, res: Response) => {
  try {
    const data = await svc.createMethodology({ academicProjectId: req.params.id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.put('/:id/methodologies/:methodologyId/sections/:sectionKey', async (req: Request, res: Response) => {
  try {
    const { title, content, status } = req.body;
    if (!title || content === undefined) return badRequest(res, 'title and content are required');
    const data = await svc.setMethodologySection(req.params.methodologyId, req.params.sectionKey, title, content, status);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

// ---------------------------------------------------------------------------
// Questionnaires
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/questionnaires', async (req: Request, res: Response) => {
  try {
    const data = await svc.createQuestionnaire({ academicProjectId: req.params.id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.get('/:id/questionnaires', async (req: Request, res: Response) => {
  const data = await svc.listQuestionnaires(req.params.id);
  res.json({ success: true, data });
});

academicProjectsRouter.get('/:id/questionnaires/:questionnaireId', async (req: Request, res: Response) => {
  const data = await svc.getQuestionnaire(req.params.questionnaireId);
  if (!data) return notFound(res, 'Questionnaire not found');
  res.json({ success: true, data });
});

academicProjectsRouter.post('/:id/questionnaires/:questionnaireId/sections', async (req: Request, res: Response) => {
  try {
    const data = await svc.addQuestionnaireSection({ questionnaireId: req.params.questionnaireId, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.post('/:id/questionnaires/:questionnaireId/sections/:sectionId/items', async (req: Request, res: Response) => {
  try {
    const data = await svc.addQuestionnaireItem({ questionnaireSectionId: req.params.sectionId, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

// ---------------------------------------------------------------------------
// Interview guides
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/interview-guides', async (req: Request, res: Response) => {
  try {
    const data = await svc.createInterviewGuide({ academicProjectId: req.params.id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.post('/:id/interview-guides/:guideId/questions', async (req: Request, res: Response) => {
  try {
    const data = await svc.addInterviewQuestion({ interviewGuideId: req.params.guideId, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.get('/:id/interview-guides/:guideId', async (req: Request, res: Response) => {
  const data = await svc.getInterviewGuide(req.params.guideId);
  if (!data) return notFound(res, 'Interview guide not found');
  res.json({ success: true, data });
});

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/findings', async (req: Request, res: Response) => {
  try {
    const data = await svc.createFinding({ academicProjectId: req.params.id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.get('/:id/findings', async (req: Request, res: Response) => {
  const data = await svc.listFindings(req.params.id);
  res.json({ success: true, data });
});

// ---------------------------------------------------------------------------
// Conclusions / Recommendations
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/conclusions', async (req: Request, res: Response) => {
  try {
    const data = await svc.createConclusion({ academicProjectId: req.params.id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.post('/:id/recommendations', async (req: Request, res: Response) => {
  try {
    const data = await svc.createRecommendation({ academicProjectId: req.params.id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

// ---------------------------------------------------------------------------
// Appendices
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/appendices', async (req: Request, res: Response) => {
  try {
    const data = await svc.createAppendix({ academicProjectId: req.params.id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.get('/:id/appendices', async (req: Request, res: Response) => {
  const data = await svc.listAppendices(req.params.id);
  res.json({ success: true, data });
});

// ---------------------------------------------------------------------------
// Front matter / Abstract
// ---------------------------------------------------------------------------
academicProjectsRouter.put('/:id/front-matter/:kind', async (req: Request, res: Response) => {
  try {
    const { title, content, required } = req.body;
    if (!title) return badRequest(res, 'title is required');
    const data = await svc.setFrontMatter(req.params.id, req.params.kind, title, content || '', required);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.put('/:id/abstract', async (req: Request, res: Response) => {
  try {
    const { content, wordLimit, generationStatus, reviewStatus } = req.body;
    if (content === undefined) return badRequest(res, 'content is required');
    const data = await svc.setAbstract({ academicProjectId: req.params.id, content, wordLimit, generationStatus, reviewStatus });
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

// ---------------------------------------------------------------------------
// Tables / Figures
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/tables-figures', async (req: Request, res: Response) => {
  try {
    const data = await svc.registerTableFigure({ academicProjectId: req.params.id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.get('/:id/tables-figures', async (req: Request, res: Response) => {
  const data = await svc.listTablesFigures(req.params.id);
  res.json({ success: true, data });
});

// ---------------------------------------------------------------------------
// References
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/references', async (req: Request, res: Response) => {
  try {
    const data = await svc.createReference({ academicProjectId: req.params.id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.get('/:id/references', async (req: Request, res: Response) => {
  const data = await svc.listReferences(req.params.id);
  res.json({ success: true, data });
});

academicProjectsRouter.get('/:id/references/formatted', async (req: Request, res: Response) => {
  const data = await svc.formatProjectReferences(req.params.id);
  res.json({ success: true, data });
});

academicProjectsRouter.post('/:id/references/from-citation', async (req: Request, res: Response) => {
  try {
    const { citationId, style, projectId } = req.body;
    if (!citationId || !projectId) return badRequest(res, 'citationId and projectId are required');
    const data = await svc.referenceFromCitation({ academicProjectId: req.params.id, projectId, citationId, style });
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: e.message } });
  }
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/validate', async (req: Request, res: Response) => {
  try {
    const summary = await validateAcademicProject(req.params.id);
    const { runId } = await persistValidationRun(summary);
    res.json({ success: true, data: { runId, ...summary } });
  } catch (e: any) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: e.message } });
  }
});

academicProjectsRouter.get('/:id/validation-runs', async (req: Request, res: Response) => {
  const data = await prisma.validationRun.findMany({
    where: { academicProjectId: req.params.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { issues: true },
  });
  res.json({ success: true, data });
});

academicProjectsRouter.post('/:id/validation-issues/:issueId/resolve', async (req: Request, res: Response) => {
  try {
    const { note } = req.body;
    await resolveValidationIssue(req.params.issueId, note || 'Resolved by user');
    res.json({ success: true, data: { resolved: true } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

// ---------------------------------------------------------------------------
// Document integration + export
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/document', async (req: Request, res: Response) => {
  try {
    const data = await svc.buildProjectDocument(req.params.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: e.message } });
  }
});

academicProjectsRouter.post('/:id/sync-document', async (req: Request, res: Response) => {
  try {
    const data = await bridge.syncAcademicProjectToDocument(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: e.message } });
  }
});

academicProjectsRouter.post('/:id/versions', async (req: Request, res: Response) => {
  try {
    const data = await bridge.snapshotAcademicDocument(req.params.id, req.body.note);
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: e.message } });
  }
});

academicProjectsRouter.get('/:id/versions', async (req: Request, res: Response) => {
  const ap = await prisma.academicProject.findUnique({ where: { id: req.params.id } });
  if (!ap || !ap.documentId) return notFound(res, 'No document bound to this project');
  const data = await prisma.documentVersion.findMany({
    where: { documentId: ap.documentId },
    orderBy: { versionNumber: 'desc' },
    take: 20,
  });
  res.json({ success: true, data });
});

academicProjectsRouter.post('/:id/versions/:versionId/restore', async (req: Request, res: Response) => {
  try {
    const data = await bridge.restoreAcademicDocument(req.params.id, req.params.versionId);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: e.message } });
  }
});

academicProjectsRouter.get('/:id/export/:format', async (req: Request, res: Response) => {
  try {
    const ap = await prisma.academicProject.findUnique({ where: { id: req.params.id } });
    if (!ap || !ap.documentId) return notFound(res, 'No document bound to this project');
    const format = (req.params.format || '').toUpperCase();

    if (format === 'DOCX') {
      const buf = await generateDocx(ap.documentId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="academic-project.docx"`);
      return res.send(Buffer.from(buf));
    }
    if (format === 'PDF') {
      const buf = await generatePdf(ap.documentId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="academic-project.pdf"`);
      return res.send(Buffer.from(buf));
    }
    if (format === 'MARKDOWN' || format === 'MD') {
      const md = await generateMarkdown(ap.documentId);
      res.setHeader('Content-Type', 'text/markdown');
      return res.send(md);
    }
    if (format === 'HTML') {
      const html = await generateHtml(ap.documentId);
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }
    if (format === 'TXT') {
      const txt = await generateTxt(ap.documentId);
      res.setHeader('Content-Type', 'text/plain');
      return res.send(txt);
    }
    return badRequest(res, `Unsupported export format "${format}"`);
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
academicProjectsRouter.get('/:id/dashboard', async (req: Request, res: Response) => {
  try {
    const data = await svc.getProjectDashboard(req.params.id);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: e.message } });
  }
});

// ---------------------------------------------------------------------------
// Search (project-scoped)
// ---------------------------------------------------------------------------
academicProjectsRouter.get('/:id/search', async (req: Request, res: Response) => {
  const q = (req.query.q as string) || '';
  const data = await svc.searchAcademicProject(q, req.params.id);
  res.json({ success: true, data });
});

// ---------------------------------------------------------------------------
// AI drafts (provider-agnostic; always AI_GENERATED + NEEDS_REVIEW)
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/ai-draft', async (req: Request, res: Response) => {
  try {
    const { task, context, providerId } = req.body;
    if (!task) return badRequest(res, 'task is required');
    const result = await draftWithProvider({
      academicProjectId: req.params.id,
      task,
      context: composePromptContext(Array.isArray(context) ? context : [context || '']),
      providerId,
    });
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

academicProjectsRouter.post('/:id/ai-draft/outline', async (req: Request, res: Response) => {
  try {
    const ap = await svc.getAcademicProject(req.params.id);
    if (!ap) return notFound(res, 'Academic project not found');
    const context = composePromptContext([
      `Project type: ${ap.projectType}`,
      `Title: ${ap.title}`,
      `Chapters: ${ap.chapters.map((c: any) => `${c.chapterNumber}. ${c.title}`).join('; ')}`,
    ]);
    const data = await draftWithProvider({ academicProjectId: req.params.id, task: 'outline', context, providerId: req.body.providerId });
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

// ---------------------------------------------------------------------------
// Review / status promotion
// ---------------------------------------------------------------------------
academicProjectsRouter.post('/:id/review/:entity/:entityId', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) return badRequest(res, 'status is required');
    const data = await svc.reviewEntity(req.params.entity as any, req.params.entityId, status);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

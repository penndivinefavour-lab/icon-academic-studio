/**
 * ICON Academic Studio — Publishing Routes (Phase 7)
 *
 * REST endpoints for Publications, Parts, Chapters, Front/Back Matter,
 * Contributors, Glossary, Index, Figures/Tables, Validation, Versioning.
 */
import { Router } from 'express';
import {
  createPublication,
  getPublication,
  listPublications,
  updatePublication,
  deletePublication,
  addPart,
  updatePart,
  reorderPart,
  deletePart,
  getParts,
  addChapter,
  updateChapter,
  getChapters,
  getChaptersByPublication,
  deleteChapter,
  upsertFrontMatter,
  getFrontMatter,
  deleteFrontMatter,
  upsertBackMatter,
  getBackMatter,
  deleteBackMatter,
  addContributor,
  updateContributor,
  deleteContributor,
  listContributors,
  addGlossaryTerm,
  updateGlossaryTerm,
  deleteGlossaryTerm,
  listGlossary,
  addIndexEntry,
  updateIndexEntry,
  deleteIndexEntry,
  listIndexEntries,
  addFigure,
  updateFigure,
  deleteFigure,
  listFigures,
  runValidation,
  listValidationRuns,
  getValidationIssues,
  resolveValidationIssue,
  syncToDocument,
  generateTOC,
  createPublicationVersion,
  restoreVersion,
  listPublicationVersions,
  getPublicationDashboard,
  exportToDocument,
  listTemplates,
  createFromTemplate,
} from '../services/publishing/service';
import { z } from 'zod';

export const publishingRouter = Router();

// ── validation schemas ─────────────────────────────────────────────────────

const publicationCreateSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  publicationType: z.string(),
  author: z.string().optional(),
  coAuthors: z.array(z.string()).optional(),
  editor: z.string().optional(),
  publisher: z.string().optional(),
  language: z.string().optional(),
  edition: z.string().optional(),
  publicationYear: z.string().optional(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  formattingProfileId: z.string().optional(),
  seriesId: z.string().optional(),
  volumeNumber: z.string().optional(),
  trimSize: z.string().optional(),
  orientation: z.string().optional(),
  gutter: z.string().optional(),
  bleed: z.string().optional(),
  printNotes: z.string().optional(),
  isbn10: z.string().optional(),
  isbn13: z.string().optional(),
  copyrightHolder: z.string().optional(),
  copyrightYear: z.string().optional(),
  subject: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  documentId: z.string().optional(),
});

const publicationUpdateSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  status: z.string().optional(),
  author: z.string().optional(),
  coAuthors: z.array(z.string()).optional(),
  editor: z.string().optional(),
  publisher: z.string().optional(),
  language: z.string().optional(),
  edition: z.string().optional(),
  publicationYear: z.string().optional(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  formattingProfileId: z.string().optional(),
  seriesId: z.string().optional(),
  volumeNumber: z.string().optional(),
  trimSize: z.string().optional(),
  orientation: z.string().optional(),
  gutter: z.string().optional(),
  bleed: z.string().optional(),
  printNotes: z.string().optional(),
  isbn10: z.string().optional(),
  isbn13: z.string().optional(),
  copyrightHolder: z.string().optional(),
  copyrightYear: z.string().optional(),
  subject: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  coverNotes: z.string().optional(),
  spineText: z.string().optional(),
  backCoverDescription: z.string().optional(),
  authorBio: z.string().optional(),
});

const partSchema = z.object({
  partNumber: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
});

const chapterSchema = z.object({
  partId: z.string().optional(),
  chapterNumber: z.number().int().positive(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  wordTarget: z.number().int().positive().optional(),
  order: z.number().int().nonnegative().optional(),
  documentSectionId: z.string().optional(),
});

const contributorSchema = z.object({
  name: z.string().min(1),
  role: z.string(),
  order: z.number().int().nonnegative().optional(),
});

const glossarySchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
  pronunciation: z.string().optional(),
  chapterId: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
});

const indexEntrySchema = z.object({
  term: z.string().min(1),
  subterm: z.string().optional(),
  sectionId: z.string().optional(),
  blockId: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
});

const figureSchema = z.object({
  kind: z.enum(['FIGURE', 'TABLE', 'CHART', 'IMAGE']),
  caption: z.string().min(1),
  chartId: z.string().optional(),
  tableId: z.string().optional(),
  documentSectionId: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
});

const frontMatterSchema = z.object({
  kind: z.string(),
  title: z.string().min(1),
  content: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
  required: z.boolean().optional(),
});

const backMatterSchema = z.object({
  kind: z.string(),
  title: z.string().min(1),
  content: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
  required: z.boolean().optional(),
});

// ── publications ───────────────────────────────────────────────────────────

publishingRouter.get('/publications', async (req, res) => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const pubs = await listPublications(projectId);
    return res.json(pubs);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.post('/publications', async (req, res) => {
  try {
    const data = publicationCreateSchema.parse(req.body);
    const pub = await createPublication(data);
    return res.status(201).json(pub);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors });
    }
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.get('/publications/:id', async (req, res) => {
  try {
    const pub = await getPublication(req.params.id);
    if (!pub) return res.status(404).json({ error: 'Not found' });
    return res.json(pub);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.put('/publications/:id', async (req, res) => {
  try {
    const data = publicationUpdateSchema.parse(req.body);
    const pub = await updatePublication(req.params.id, data);
    return res.json(pub);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors });
    }
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.delete('/publications/:id', async (req, res) => {
  try {
    await deletePublication(req.params.id);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.post('/publications/from-template', async (req, res) => {
  try {
    const { projectId, publicationType, overrides } = req.body;
    const pub = await createFromTemplate(projectId, publicationType, overrides);
    return res.status(201).json(pub);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.get('/publications/templates', async (_req, res) => {
  try {
    const templates = await listTemplates();
    return res.json(templates);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ── parts ──────────────────────────────────────────────────────────────────

publishingRouter.get('/publications/:publicationId/parts', async (req, res) => {
  try {
    const parts = await getParts(req.params.publicationId);
    return res.json(parts);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.post('/publications/:publicationId/parts', async (req, res) => {
  try {
    const data = partSchema.parse(req.body);
    const part = await addPart(req.params.publicationId, data);
    return res.status(201).json(part);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors });
    }
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.put('/parts/:id', async (req, res) => {
  try {
    const part = await updatePart(req.params.id, req.body);
    return res.json(part);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.patch('/parts/:id/reorder', async (req, res) => {
  try {
    const { partNumber } = req.body;
    const part = await reorderPart(req.params.id, partNumber);
    return res.json(part);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.delete('/parts/:id', async (req, res) => {
  try {
    await deletePart(req.params.id);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ── chapters ────────────────────────────────────────────────────────────────

publishingRouter.get('/publications/:publicationId/chapters', async (req, res) => {
  try {
    const chapters = await getChapters(req.params.publicationId);
    return res.json(chapters);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.post('/publications/:publicationId/chapters', async (req, res) => {
  try {
    const data = chapterSchema.parse(req.body);
    const chapter = await addChapter(req.params.publicationId, data);
    return res.status(201).json(chapter);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors });
    }
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.put('/chapters/:id', async (req, res) => {
  try {
    const chapter = await updateChapter(req.params.id, req.body);
    return res.json(chapter);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.delete('/chapters/:id', async (req, res) => {
  try {
    await deleteChapter(req.params.id);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ── front matter ────────────────────────────────────────────────────────────

publishingRouter.get('/publications/:publicationId/front-matter', async (req, res) => {
  try {
    const items = await getFrontMatter(req.params.publicationId);
    return res.json(items);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.post('/publications/:publicationId/front-matter', async (req, res) => {
  try {
    const data = frontMatterSchema.parse(req.body);
    const item = await upsertFrontMatter(req.params.publicationId, data);
    return res.status(201).json(item);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors });
    }
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.delete('/publications/:publicationId/front-matter/:kind', async (req, res) => {
  try {
    await deleteFrontMatter(req.params.publicationId, req.params.kind);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ── back matter ────────────────────────────────────────────────────────────

publishingRouter.get('/publications/:publicationId/back-matter', async (req, res) => {
  try {
    const items = await getBackMatter(req.params.publicationId);
    return res.json(items);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.post('/publications/:publicationId/back-matter', async (req, res) => {
  try {
    const data = backMatterSchema.parse(req.body);
    const item = await upsertBackMatter(req.params.publicationId, data);
    return res.status(201).json(item);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors });
    }
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.delete('/publications/:publicationId/back-matter/:kind', async (req, res) => {
  try {
    await deleteBackMatter(req.params.publicationId, req.params.kind);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ── contributors ────────────────────────────────────────────────────────────

publishingRouter.get('/publications/:publicationId/contributors', async (req, res) => {
  try {
    const contributors = await listContributors(req.params.publicationId);
    return res.json(contributors);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.post('/publications/:publicationId/contributors', async (req, res) => {
  try {
    const data = contributorSchema.parse(req.body);
    const contributor = await addContributor(req.params.publicationId, data);
    return res.status(201).json(contributor);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors });
    }
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.put('/contributors/:id', async (req, res) => {
  try {
    const contributor = await updateContributor(req.params.id, req.body);
    return res.json(contributor);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.delete('/contributors/:id', async (req, res) => {
  try {
    await deleteContributor(req.params.id);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ── glossary ────────────────────────────────────────────────────────────────

publishingRouter.get('/publications/:publicationId/glossary', async (req, res) => {
  try {
    const terms = await listGlossary(req.params.publicationId);
    return res.json(terms);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.post('/publications/:publicationId/glossary', async (req, res) => {
  try {
    const data = glossarySchema.parse(req.body);
    const term = await addGlossaryTerm({ ...data, publicationId: req.params.publicationId });
    return res.status(201).json(term);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors });
    }
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.put('/glossary/:id', async (req, res) => {
  try {
    const term = await updateGlossaryTerm(req.params.id, req.body);
    return res.json(term);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.delete('/glossary/:id', async (req, res) => {
  try {
    await deleteGlossaryTerm(req.params.id);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ── index ──────────────────────────────────────────────────────────────────

publishingRouter.get('/publications/:publicationId/index', async (req, res) => {
  try {
    const entries = await listIndexEntries(req.params.publicationId);
    return res.json(entries);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.post('/publications/:publicationId/index', async (req, res) => {
  try {
    const data = indexEntrySchema.parse(req.body);
    const entry = await addIndexEntry({ ...data, publicationId: req.params.publicationId });
    return res.status(201).json(entry);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors });
    }
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.put('/index/:id', async (req, res) => {
  try {
    const entry = await updateIndexEntry(req.params.id, req.body);
    return res.json(entry);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.delete('/index/:id', async (req, res) => {
  try {
    await deleteIndexEntry(req.params.id);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ── figures & tables ────────────────────────────────────────────────────────

publishingRouter.get('/publications/:publicationId/figures', async (req, res) => {
  try {
    const kind = req.query.kind as string | undefined;
    const figures = await listFigures(req.params.publicationId, kind);
    return res.json(figures);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.post('/publications/:publicationId/figures', async (req, res) => {
  try {
    const data = figureSchema.parse(req.body);
    const figure = await addFigure({ ...data, publicationId: req.params.publicationId });
    return res.status(201).json(figure);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: e.errors });
    }
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.put('/figures/:id', async (req, res) => {
  try {
    const figure = await updateFigure(req.params.id, req.body);
    return res.json(figure);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.delete('/figures/:id', async (req, res) => {
  try {
    await deleteFigure(req.params.id);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ── validation ──────────────────────────────────────────────────────────────

publishingRouter.post('/publications/:id/validate', async (req, res) => {
  try {
    const result = await runValidation(req.params.id);
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.get('/publications/:id/validation-runs', async (req, res) => {
  try {
    const runs = await listValidationRuns(req.params.id);
    return res.json(runs);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.get('/validation-runs/:runId/issues', async (req, res) => {
  try {
    const issues = await getValidationIssues(req.params.runId);
    return res.json(issues);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.patch('/validation-issues/:issueId/resolve', async (req, res) => {
  try {
    const { resolutionNote } = req.body;
    const issue = await resolveValidationIssue(req.params.issueId, resolutionNote);
    return res.json(issue);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ── document sync ───────────────────────────────────────────────────────────

publishingRouter.post('/publications/:id/sync', async (req, res) => {
  try {
    const result = await syncToDocument(req.params.id);
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ── TOC ────────────────────────────────────────────────────────────────────

publishingRouter.get('/publications/:id/toc', async (req, res) => {
  try {
    const toc = await generateTOC(req.params.id);
    return res.json(toc);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ── versions ────────────────────────────────────────────────────────────────

publishingRouter.post('/publications/:id/versions', async (req, res) => {
  try {
    const { note } = req.body;
    const version = await createPublicationVersion(req.params.id, note);
    return res.status(201).json(version);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.get('/publications/:id/versions', async (req, res) => {
  try {
    const versions = await listPublicationVersions(req.params.id);
    return res.json(versions);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

publishingRouter.post('/publications/:id/versions/:versionId/restore', async (req, res) => {
  try {
    const result = await restoreVersion(req.params.id, req.params.versionId);
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ── dashboard ───────────────────────────────────────────────────────────────

publishingRouter.get('/publications/:id/dashboard', async (req, res) => {
  try {
    const dashboard = await getPublicationDashboard(req.params.id);
    return res.json(dashboard);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ── export ──────────────────────────────────────────────────────────────────

publishingRouter.post('/publications/:id/export', async (req, res) => {
  try {
    const { format } = req.body;
    if (!['DOCX', 'PDF', 'MARKDOWN', 'HTML', 'TXT'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format' });
    }
    const result = await exportToDocument(req.params.id, format as any);
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

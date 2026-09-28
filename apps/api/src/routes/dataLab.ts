// Data Lab API routes for ICON Academic Studio
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as dataLabService from '../services/dataLabService.js';
import { prisma } from '@icon-academic/db';

const router = Router();

// Configure multer for secure file uploads (controlled storage, no client-specified paths)
const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const storageDir = path.join(process.cwd(), 'storage', 'datasets');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    cb(null, storageDir);
  },
  filename: (_req, file, cb) => {
    // Safe generated name — original filename is never used as a write path
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, `${uniqueSuffix}${ext ? '.' + ext : ''}`);
  }
});

// File filter: CSV/XLSX only (extension + MIME validation)
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  const allowedExts = ['.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext || file.mimetype}. Only CSV and XLSX are allowed.`));
  }
};

const upload = multer({
  storage: uploadStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  }
});

function readUploadedFile(req: Request): Buffer | null {
  const file = req.file;
  if (!file) return null;
  const buffer = fs.readFileSync(file.path);
  // Clean up the temp disk file; the service stores a controlled copy
  try { fs.unlinkSync(file.path); } catch { /* already gone */ }
  return buffer;
}

// Upload CSV dataset
router.post('/csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { projectId, name, description } = req.body as any;
    const buffer = readUploadedFile(req);

    if (!buffer) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } });
    }
    if (!projectId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'projectId is required' } });
    }

    const result = await dataLabService.importCsv(projectId, buffer, req.file!.originalname, { name, description });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'IMPORT_ERROR', message: error.message } });
  }
});

// Upload XLSX dataset
router.post('/xlsx', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { projectId, name, description, sheetName } = req.body as any;
    const buffer = readUploadedFile(req);

    if (!buffer) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } });
    }
    if (!projectId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'projectId is required' } });
    }

    const result = await dataLabService.importXlsx(projectId, buffer, req.file!.originalname, { name, description, sheetName });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'IMPORT_ERROR', message: error.message } });
  }
});

// List datasets for a project
router.get('/datasets/:projectId', async (req: Request, res: Response) => {
  try {
    const datasets = await prisma.dataset.findMany({
      where: { projectId: req.params.projectId },
      include: { columns: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: datasets });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch datasets' } });
  }
});

// Get dataset details (profile, analyses, charts, tables, transformations)
router.get('/datasets/:datasetId', async (req: Request, res: Response) => {
  try {
    const dataset = await dataLabService.getDatasetFull(req.params.datasetId);
    if (!dataset) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Dataset not found' } });
    }
    res.json({ success: true, data: dataset });
  } catch (error: any) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
  }
});

// Preview dataset rows (bounded, paginated)
router.get('/datasets/:datasetId/preview', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize)) || 50));

    const preview = await dataLabService.previewDataset(req.params.datasetId, page, pageSize);
    res.json({ success: true, data: preview });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message } });
  }
});

// Run analysis (persisted, deterministic)
router.post('/analyses', async (req: Request, res: Response) => {
  try {
    const { type, datasetId, configuration } = req.body as any;

    if (!type || !datasetId || !configuration) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'type, datasetId, and configuration are required' } });
    }
    const validTypes = ['FREQUENCY', 'DESCRIPTIVE_STATS', 'GROUPED_ANALYSIS', 'CROSS_TAB', 'HISTOGRAM'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `Unknown analysis type: ${type}` } });
    }

    const result = await dataLabService.runAnalysis({ type, datasetId, configuration });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'ANALYSIS_ERROR', message: error.message } });
  }
});

// List analyses for a dataset
router.get('/datasets/:datasetId/analyses', async (req: Request, res: Response) => {
  try {
    const analyses = await prisma.analysis.findMany({
      where: { datasetId: req.params.datasetId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: analyses });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch analyses' } });
  }
});

// Apply transformation (creates derived dataset, preserves original)
router.post('/datasets/:datasetId/transformations', async (req: Request, res: Response) => {
  try {
    const { type, config } = req.body as any;

    if (!type) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Transformation type is required' } });
    }

    const result = await dataLabService.applyTransformation(req.params.datasetId, type, config || {});
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'TRANSFORM_ERROR', message: error.message } });
  }
});

// Create chart from analysis results (real data, persisted)
router.post('/charts', async (req: Request, res: Response) => {
  try {
    const { datasetId, type, config } = req.body as any;

    if (!datasetId || !type || !config) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'datasetId, type, and config are required' } });
    }
    const validChartTypes = ['BAR', 'LINE', 'PIE', 'HISTOGRAM', 'SCATTER'];
    if (!validChartTypes.includes(type)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `Unknown chart type: ${type}` } });
    }

    const chart = await dataLabService.createChart(datasetId, type, config);
    res.json({ success: true, data: chart });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'CHART_ERROR', message: error.message } });
  }
});

// Export chart as SVG
router.get('/charts/:chartId/export', async (req: Request, res: Response) => {
  try {
    const result = await dataLabService.exportChart(req.params.chartId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
  }
});

// Save table from analysis results
router.post('/tables', async (req: Request, res: Response) => {
  try {
    const { datasetId, title, headers, rows, caption } = req.body as any;

    if (!datasetId || !title || !Array.isArray(headers) || !Array.isArray(rows)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'datasetId, title, headers, and rows are required' } });
    }

    const table = await dataLabService.saveTable(datasetId, title, headers, rows, caption);
    res.json({ success: true, data: table });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'TABLE_ERROR', message: error.message } });
  }
});

// Link an analysis/chart/table result into a Document block (provenance-preserving)
router.post('/link-to-document', async (req: Request, res: Response) => {
  try {
    const { documentId, resultType, resultId, label } = req.body as any;

    if (!documentId || !resultType || !resultId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'documentId, resultType, and resultId are required' } });
    }
    const validResultTypes = ['ANALYSIS', 'CHART', 'TABLE'];
    if (!validResultTypes.includes(resultType)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `Unknown result type: ${resultType}` } });
    }

    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    // Resolve provenance chain
    let provenance: Record<string, string> = {};
    let content = label || '';
    switch (resultType) {
      case 'ANALYSIS': {
        const analysis = await prisma.analysis.findFirst({ where: { id: resultId } });
        if (!analysis) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Analysis not found' } });
        const dataset = await prisma.dataset.findUnique({ where: { id: analysis.datasetId } });
        provenance = { analysisId: analysis.id, datasetId: analysis.datasetId, datasetName: dataset?.name || '', projectId: document.projectId };
        content = content || `Analysis: ${analysis.method} on "${dataset?.name}"`;
        break;
      }
      case 'CHART': {
        const chart = await prisma.chart.findFirst({ where: { id: resultId } });
        if (!chart) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Chart not found' } });
        const dataset = await prisma.dataset.findUnique({ where: { id: chart.datasetId } });
        provenance = { chartId: chart.id, datasetId: chart.datasetId, datasetName: dataset?.name || '', projectId: document.projectId };
        content = content || `Figure: ${chart.title || chart.type} from "${dataset?.name}"`;
        break;
      }
      case 'TABLE': {
        const table = await prisma.table_.findFirst({ where: { id: resultId } });
        if (!table) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Table not found' } });
        const dataset = await prisma.dataset.findUnique({ where: { id: table.datasetId } });
        provenance = { tableId: table.id, datasetId: table.datasetId, datasetName: dataset?.name || '', projectId: document.projectId };
        content = content || `Table: ${table.title} from "${dataset?.name}"`;
        break;
      }
    }

    // Find max block order to append deterministically
    const lastBlock = await prisma.documentBlock.findFirst({
      where: { documentId },
      orderBy: { order: 'desc' },
    });

    const block = await prisma.documentBlock.create({
      data: {
        documentId,
        sectionId: null,
        type: 'DATA_LAB_REFERENCE',
        content,
        order: (lastBlock?.order ?? -1) + 1,
        metadata: JSON.stringify({ referenceType: resultType, ...provenance }),
      },
    });

    res.json({ success: true, data: block });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'LINK_ERROR', message: error.message } });
  }
});

export default router;

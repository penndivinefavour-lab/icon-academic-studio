import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { prisma } from '@icon-academic/db';
import { extractPdf, extractDocx, chunkContent } from './extractors.js';

export const sourcesRouter = Router();

// Configure multer for secure file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './storage/uploads';
    // Sanitize projectId for directory creation
    const projectId = (req.body?.projectId || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
    const dir = path.join(uploadDir, projectId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File filter for allowed types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown',
    'text/html',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  
  const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md', '.csv', '.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50') * 1024 * 1024, // 50MB default
  }
});

// GET /api/v1/sources - List sources for a project
sourcesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'projectId is required' },
      });
    }

    const sources = await prisma.source.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { chunks: true, citations: true, evidenceItems: true } },
      },
    });

    res.json({ success: true, data: sources });
  } catch (error) {
    console.error('Error fetching sources:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch sources' },
    });
  }
});

// POST /api/v1/sources/upload - Upload a source file
sourcesRouter.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { projectId, name, type } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' },
      });
    }

    if (!projectId || !name || !type) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'projectId, name, and type are required' },
      });
    }

    // Validate file path is within expected directory (prevent path traversal)
    const uploadDir = process.env.UPLOAD_DIR || './storage/uploads';
    const normalizedPath = path.resolve(req.file.path);
    if (!normalizedPath.startsWith(path.resolve(uploadDir))) {
      return res.status(400).json({
        success: false,
        error: { code: 'SECURITY_ERROR', message: 'Invalid file path' },
      });
    }

    // Calculate checksum
    const fileBuffer = fs.readFileSync(req.file.path);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Create source record
    const source = await prisma.source.create({
      data: {
        projectId,
        name,
        type,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        filePath: normalizedPath,
        status: 'UPLOADED',
        metadata: JSON.stringify({ 
          originalName: req.file.originalname, 
          checksum,
          uploadedAt: new Date().toISOString()
        }),
      },
    });

    // Start background extraction
    extractSource(source.id, normalizedPath, type).catch(err => {
      console.error(`Extraction failed for source ${source.id}:`, err);
      prisma.source.update({
        where: { id: source.id },
        data: { 
          status: 'ERROR',
          metadata: JSON.stringify({ ...JSON.parse(source.metadata), error: (err as Error).message })
        },
      }).catch(console.error);
    });

    res.status(201).json({ success: true, data: source });
  } catch (error) {
    console.error('Error uploading source:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to upload source' },
    });
  }
});

// POST /api/v1/sources - Create source metadata only
sourcesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { projectId, name, type, metadata } = req.body;

    if (!projectId || !name || !type) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'projectId, name, and type are required' },
      });
    }

    const source = await prisma.source.create({
      data: {
        projectId,
        name,
        type,
        sizeBytes: 0,
        metadata: metadata ? JSON.stringify(metadata) : '{}',
        status: 'UPLOADED',
      },
    });

    res.status(201).json({ success: true, data: source });
  } catch (error) {
    console.error('Error creating source:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create source' },
    });
  }
});

// PATCH /api/v1/sources/:id/status - Update source processing status
sourcesRouter.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['UPLOADED', 'PROCESSING', 'PROCESSED', 'ERROR', 'DELETED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      });
    }

    const source = await prisma.source.update({
      where: { id },
      data: { status },
    });

    res.json({ success: true, data: source });
  } catch (error) {
    console.error('Error updating source status:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update source status' },
    });
  }
});

// DELETE /api/v1/sources/:id - Delete a source
sourcesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get source to delete file
    const source = await prisma.source.findUnique({ where: { id } });
    
    if (!source) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Source not found' },
      });
    }

    // Delete file if exists
    if (source.filePath && fs.existsSync(source.filePath)) {
      fs.unlinkSync(source.filePath);
    }

    // Delete from database
    await prisma.source.delete({ where: { id } });

    res.json({ success: true, message: 'Source deleted successfully' });
  } catch (error) {
    console.error('Error deleting source:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete source' },
    });
  }
});

// Helper: Extract content from file
async function extractSource(sourceId: string, filePath: string, fileType: string) {
  try {
    await prisma.source.update({
      where: { id: sourceId },
      data: { status: 'PROCESSING' },
    });

    let content = '';
    const metadataObj: any = {};
    let status = 'PROCESSING';
    let errorMsg = '';

    switch (fileType) {
      case 'TXT':
      case 'MARKDOWN':
        content = fs.readFileSync(filePath, 'utf-8');
        break;

    case 'PDF': {
        try {
          const pdfBuffer = fs.readFileSync(filePath);
          const result = await extractPdf(pdfBuffer);
          content = result.text || '';
          if (result.pages) {
            metadataObj.pageCount = result.pages;
          }
          if (result.headings?.length) {
            metadataObj.headings = result.headings;
          }
        } catch (parseError) {
          status = 'ERROR';
          errorMsg = `PDF extraction failed: ${(parseError as Error).message}`;
        }
        break;
      }

      case 'DOCX': {
        try {
          const docxBuffer = fs.readFileSync(filePath);
          const result = await extractDocx(docxBuffer);
          content = result.text || '';
          if (result.headings?.length) {
            metadataObj.headings = result.headings;
          }
        } catch (extractError) {
          status = 'ERROR';
          errorMsg = `DOCX extraction failed: ${(extractError as Error).message}`;
        }
        break;
      }

      default:
        content = `[Content extraction not implemented for ${fileType}]`;
    }

    // Store extracted content
    const source = await prisma.source.findUnique({ where: { id: sourceId } });
    if (source) {
      await prisma.source.update({
        where: { id: sourceId },
        data: {
          contentPreview: content.substring(0, 10000),
          status: status,
          metadata: JSON.stringify({ ...JSON.parse(source.metadata || '{}'), ...metadataObj, ...(status === 'ERROR' ? { error: errorMsg } : {}) }),
        },
      });
    } else {
      throw new Error('Source not found for updating');
    }

    // Chunk content
    await chunkSource(sourceId, content);

  } catch (error) {
    console.error(`Extraction error for source ${sourceId}:`, error);
    await prisma.source.update({
      where: { id: sourceId },
      data: {
        status: 'ERROR',
        metadata: JSON.stringify({
          error: (error as Error).message
        })
      },
    });
  }
}

// Helper: Chunk extracted content
async function chunkSource(sourceId: string, content: string) {
  const CHUNK_SIZE = 2000; // characters per chunk
  const lines = content.split(/\r?\n/);
  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const line of lines) {
    if ((currentChunk + line).length > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push({
        sourceId,
        index: chunkIndex++,
        content: currentChunk.trim(),
        metadata: JSON.stringify({ lineRange: `~${currentChunk.split('\n').length} lines` }),
      });
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      sourceId,
      index: chunkIndex++,
      content: currentChunk.trim(),
      metadata: JSON.stringify({ lineRange: `~${currentChunk.split('\n').length} lines` }),
    });
  }

  await prisma.sourceChunk.createMany({
    data: chunks,
    skipDuplicates: true,
  });
}

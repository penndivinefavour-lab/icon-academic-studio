import { Router, Request, Response } from 'express';
import { prisma } from '@icon-academic/db';

export const documentsRouter = Router();

// GET /api/v1/documents - List documents for a project
documentsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'projectId is required' },
      });
    }

    const documents = await prisma.document.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { versions: true, blocks: true } } },
    });

    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch documents' },
    });
  }
});

// POST /api/v1/documents - Create a new document
documentsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { projectId, title, type, templateId, formattingProfileId } = req.body;

    if (!projectId || !title || !type) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'projectId, title, and type are required' },
      });
    }

    let structure = {};
    
    if (templateId) {
      const template = await prisma.template.findUnique({ where: { id: templateId } });
      if (template?.structure) {
        structure = JSON.parse(template.structure);
      }
    }

    const document = await prisma.document.create({
      data: {
        projectId,
        title,
        type,
        formattingProfileId,
        structure: JSON.stringify(structure),
      },
    });

    res.status(201).json({ success: true, data: document });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create document' },
    });
  }
});

// GET /api/v1/documents/:id - Get document with sections and blocks
documentsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        blocks: { orderBy: { order: 'asc' } },
        sections: {
          orderBy: { order: 'asc' },
          include: { blocks: { orderBy: { order: 'asc' } } },
        },
        versions: { orderBy: { createdAt: 'desc' }, take: 20 },
        formattingProfile: true,
        _count: { select: { versions: true, blocks: true } },
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found' },
      });
    }

    res.json({ success: true, data: document });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch document' },
    });
  }
});

// PUT /api/v1/documents/:id - Update document metadata
documentsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, type, settings, status, formattingProfileId } = req.body;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (type) updateData.type = type;
    if (settings) updateData.settings = JSON.stringify(settings);
    if (status) updateData.status = status;
    if (formattingProfileId) updateData.formattingProfileId = formattingProfileId;

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: document });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update document' },
    });
  }
});

// PATCH /api/v1/documents/:id/content - Update document structure (sections + blocks)
documentsRouter.patch('/:id/content', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sections, blocks, wordCount } = req.body;

    // Validate structure
    if (!Array.isArray(sections) && !Array.isArray(blocks)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Either sections or blocks must be provided' },
      });
    }

    // Delete existing
    await prisma.documentBlock.deleteMany({ where: { documentId: id } });
    await prisma.documentSection.deleteMany({ where: { documentId: id } });

    // Create sections
    const createdSections = await Promise.all(
      (sections || []).map((s: any) =>
        prisma.documentSection.create({
          data: {
            documentId: id,
            parentId: s.parentId || null,
            title: s.title || '',
            headingLevel: s.headingLevel || 1,
            order: s.order || 0,
            content: s.content || null,
            metadata: s.metadata ? JSON.stringify(s.metadata) : '{}',
          },
        })
      )
    );

    // Create blocks
    const createdBlocks = await Promise.all(
      (blocks || []).map((b: any) =>
        prisma.documentBlock.create({
          data: {
            documentId: id,
            sectionId: b.sectionId || null,
            type: b.type,
            content: b.content || '',
            order: b.order || 0,
            metadata: b.metadata ? JSON.stringify(b.metadata) : '{}',
            provenance: b.provenance ? JSON.stringify(b.provenance) : null,
          },
        })
      )
    );

    // Update word count
    if (wordCount !== undefined) {
      await prisma.document.update({
        where: { id },
        data: { wordCount },
      });
    }

    res.json({
      success: true,
      data: { sections: createdSections, blocks: createdBlocks },
    });
  } catch (error) {
    console.error('Error updating document content:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update document content' },
    });
  }
});

// DELETE /api/v1/documents/:id - Archive document
documentsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.document.delete({ where: { id } });
    res.json({ success: true, message: 'Document archived' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete document' },
    });
  }
});

// POST /api/v1/documents/:id/version - Create version snapshot
documentsRouter.post('/:id/version', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const document = await prisma.document.findUnique({
      where: { id },
      include: { blocks: true, sections: true },
    });

    if (!document) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    const snapshot = {
      title: document.title,
      type: document.type,
      wordCount: document.wordCount,
      blocks: document.blocks,
      sections: document.sections,
    };

    const version = await prisma.documentVersion.create({
      data: {
        documentId: id,
        versionNumber: document.version + 1,
        note: note || `Version ${document.version + 1}`,
        structure: JSON.stringify(snapshot),
      },
    });

    await prisma.document.update({
      where: { id },
      data: { version: document.version + 1 },
    });

    res.status(201).json({ success: true, data: version });
  } catch (error) {
    console.error('Error creating version:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create version' },
    });
  }
});

// GET /api/v1/documents/:id/versions
documentsRouter.get('/:id/versions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const versions = await prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: versions });
  } catch (error) {
    console.error('Error fetching versions:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch versions' },
    });
  }
});

// POST /api/v1/documents/:id/restore/:versionId
documentsRouter.post('/:id/restore/:versionId', async (req: Request, res: Response) => {
  try {
    const { id, versionId } = req.params;

    const version = await prisma.documentVersion.findUnique({ where: { id: versionId } });
    if (!version || version.documentId !== id) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Version not found' } });
    }

    const structure = JSON.parse(version.structure);

    // Clear current content
    await prisma.documentBlock.deleteMany({ where: { documentId: id } });
    await prisma.documentSection.deleteMany({ where: { documentId: id } });

    // Restore sections
    if (structure.sections) {
      for (const section of structure.sections) {
        await prisma.documentSection.create({ data: { documentId: id, ...section } });
      }
    }

    // Restore blocks
    if (structure.blocks) {
      for (const block of structure.blocks) {
        await prisma.documentBlock.create({ data: { documentId: id, ...block } });
      }
    }

    // Update document metadata
    await prisma.document.update({
      where: { id },
      data: {
        title: structure.title,
        type: structure.type,
        wordCount: structure.wordCount,
        version: structure.versionNumber,
      },
    });

    res.json({ success: true, message: `Restored to version ${structure.versionNumber}` });
  } catch (error) {
    console.error('Error restoring version:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to restore version' },
    });
  }
});

// GET /api/v1/documents/:id/stats
documentsRouter.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { getDocumentStats } = await import('../services/documentExport.js');
    const stats = await getDocumentStats(req.params.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get document stats' },
    });
  }
});

// GET /api/v1/documents/:id/export/:format
documentsRouter.get('/:id/export/:format', async (req: Request, res: Response) => {
  try {
    const { id, format } = req.params;
    
    let output: Buffer | string;
    let mimeType: string;
    let extension: string;

    switch (format.toLowerCase()) {
      case 'docx': {
        const { generateDocx } = await import('../services/documentExport.js');
        output = await generateDocx(id);
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        extension = '.docx';
        break;
      }
      case 'markdown':
      case 'md': {
        const { generateMarkdown } = await import('../services/documentExport.js');
        output = await generateMarkdown(id);
        mimeType = 'text/markdown';
        extension = '.md';
        break;
      }
      case 'html': {
        const { generateHtml } = await import('../services/documentExport.js');
        output = await generateHtml(id);
        mimeType = 'text/html';
        extension = '.html';
        break;
      }
      case 'txt': {
        const { generateTxt } = await import('../services/documentExport.js');
        output = await generateTxt(id);
        mimeType = 'text/plain';
        extension = '.txt';
        break;
      }
      default:
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `Unsupported format: ${format}` },
        });
    }

    // Create export job record
    await prisma.exportJob.create({
      data: {
        documentId: id,
        format: format.toUpperCase(),
        status: 'COMPLETED',
        outputPath: `/exports/${id}${extension}`,
      },
    });

    // Stream file
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${id}${extension}"`);
    res.send(output);
  } catch (error) {
    console.error('Error exporting document:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to export document' },
    });
  }
});

// GET /api/v1/documents/:id/toc
documentsRouter.get('/:id/toc', async (req: Request, res: Response) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: { blocks: { where: { type: 'HEADING' }, orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    const toc: any[] = [];
    for (const section of document.sections) {
      if (!section.parentId) {
        toc.push({ id: section.id, title: section.title, level: section.headingLevel, order: section.order, children: [] });
      }
    }
    for (const section of document.sections) {
      if (section.parentId) {
        const parent = toc.find(t => t.id === section.parentId);
        if (parent) {
          parent.children.push({ id: section.id, title: section.title, level: section.headingLevel, order: section.order });
        }
      }
    }

    res.json({ success: true, data: toc });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate TOC' } });
  }
});

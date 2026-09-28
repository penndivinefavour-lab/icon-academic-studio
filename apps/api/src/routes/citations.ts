import { Router, Request, Response } from 'express';
import { prisma } from '@icon-academic/db';

export const citationsRouter = Router();

// GET /api/v1/citations - List citations for a source
citationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const sourceId = req.query.sourceId as string;

    if (!sourceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'sourceId is required' },
      });
    }

    const citations = await prisma.citation.findMany({
      where: { sourceId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: citations });
  } catch (error) {
    console.error('Error fetching citations:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch citations' },
    });
  }
});

// POST /api/v1/citations - Create citation
citationsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { sourceId, author, year, title, url, doi, pageRange, format, raw, context } = req.body;

    if (!sourceId || !raw) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'sourceId and raw citation are required' },
      });
    }

    const citation = await prisma.citation.create({
      data: {
        sourceId,
        author,
        year,
        title,
        url,
        doi,
        pageRange,
        format: format || 'INLINE',
        raw,
        context,
      },
    });

    res.status(201).json({ success: true, data: citation });
  } catch (error) {
    console.error('Error creating citation:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create citation' },
    });
  }
});

// Format citation based on style
function formatCitation(citation: any, style: 'APA' | 'MLA' | 'CHICAGO'): string {
  const { author, year, title, url } = citation;
  
  switch (style) {
    case 'APA':
      return `${author}, ${year}. ${title}.${url ? ` Retrieved from ${url}` : ''}`;
    case 'MLA':
      return `${author}. "${title}." ${year}.`;
    case 'CHICAGO':
      return `${author}. ${title}. ${year}. ${url || ''}`;
    default:
      return citation.raw;
  }
}

// GET /api/v1/citations/format - Format a citation
citationsRouter.get('/format', async (req: Request, res: Response) => {
  try {
    const { id } = req.query as { id?: string };
    const styleRaw = req.query.style;
    const style: string | undefined = Array.isArray(styleRaw) ? (styleRaw[0] as string) : ((styleRaw as string) || undefined);

    if (!id || !style) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'id and style are required' },
      });
    }

    const citation = await prisma.citation.findUnique({ where: { id } });
    
    if (!citation) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Citation not found' },
      });
    }

    const formatted = formatCitation(citation, style as any);

    res.json({ success: true, data: { id, style, formatted } });
  } catch (error) {
    console.error('Error formatting citation:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to format citation' },
    });
  }
});

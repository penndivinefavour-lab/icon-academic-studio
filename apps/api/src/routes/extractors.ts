import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import AdmZip from 'adm-zip';
import { DOMParser } from 'xmldom';

export interface ExtractionResult {
  text: string;
  pages?: number;
  headings?: string[];
  metadata?: Record<string, any>;
}

/**
 * Extract text from PDF files
 * Returns extracted text with page information when available
 */
export async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const data = await pdfParse(buffer);
    
    return {
      text: data.text || '',
      pages: data.numpages,
      metadata: {
        info: data.info,
        version: data.version
      }
    };
  } catch (error) {
    // If pdf-parse fails, try basic text extraction
    const text = buffer.toString('utf-8');
    // Filter out PDF binary markers and keep readable text
    const cleanText = text
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')  // Remove non-printable chars
      .replace(/\s+/g, ' ')                   // Normalize whitespace
      .trim();
    
    return {
      text: cleanText || '',
      pages: 1,
      metadata: { extractionMethod: 'fallback' }
    };
  }
}

/**
 * Extract text from DOCX files
 * Preserves headings and basic structure
 */
export async function extractDocx(buffer: Buffer): Promise<ExtractionResult> {
  try {
    // Try using mammoth first for proper XML parsing
    const result = await mammoth.extractRawText({ buffer });
    
    // Also try to get more structured output
    let headings: string[] = [];
    let structuredText = result.value;
    
    // Extract headings from the raw XML
    try {
      const xml = buffer.toString('utf-8');
      // Simple regex-based heading extraction
      const headingMatches = xml.match(/<w:pStyle w:val="Heading\d"[^>]*>.*?<\/w:pStyle>/g) || [];
      headings = headingMatches.map(h => h.replace(/<[^>]+>/g, '').trim());
    } catch {
      // Ignore heading extraction errors
    }
    
    return {
      text: structuredText || '',
      headings: headings.length > 0 ? headings : undefined,
      metadata: {
        paragraphCount: (structuredText?.match(/\n/g) || []).length,
        extractionMethod: 'mammoth'
      }
    };
  } catch (error) {
    // Fallback: try to extract from ZIP directly
    try {
      const zip = new AdmZip(buffer);
      const docXml = zip.readAsText('word/document.xml');
      
      if (!docXml) {
        return { text: '', metadata: { error: 'No document.xml found' } };
      }
      
      // Parse XML to extract text
      const parser = new DOMParser();
      const doc = parser.parseFromString(docXml, 'text/xml');
      
      // Extract all text nodes
      const paragraphs = doc.getElementsByTagName('w:t');
      let text = '';
      for (let i = 0; i < paragraphs.length; i++) {
        text += paragraphs[i].textContent || '';
        if (i < paragraphs.length - 1) text += '\n';
      }
      
      return {
        text: text.trim(),
        metadata: { 
          extractionMethod: 'fallback',
          paragraphCount: paragraphs.length 
        }
      };
    } catch (fallbackError) {
      return {
        text: '',
        metadata: { 
          error: `DOCX extraction failed: ${(error as Error).message}`,
          extractionMethod: 'failed'
        }
      };
    }
  }
}

/**
 * Extract text from TXT/Markdown files
 */
export function extractText(filePath: string): string {
  const fs = require('fs');
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Chunk content with semantic boundaries
 */
export interface ChunkOptions {
  targetSize?: number;
  maxSize?: number;
  overlap?: number;
  preserveHeadings?: boolean;
}

export interface Chunk {
  id: string;
  sourceId: string;
  index: number;
  content: string;
  metadata: {
    lineRange?: string;
    page?: number;
    heading?: string;
    type?: string;
  };
}

export function chunkContent(content: string, options: ChunkOptions = {}, sourceId: string = ''): Chunk[] {
  const {
    targetSize = 2000,
    maxSize = 2500,
    overlap = 0,
    preserveHeadings = true
  } = options;
  
  const chunks: Chunk[] = [];
  const lines = content.split(/\r?\n/);
  let currentChunk = '';
  let chunkIndex = 0;
  let currentPage = 1;
  let currentHeading = '';
  let lineStart = 1;
  
  for (const line of lines) {
    const lineLen = line.length + 1; // +1 for newline
    
    // Check if this is a heading
    if (preserveHeadings && /^#+\s/.test(line)) {
      currentHeading = line.replace(/^#+\s/, '');
    }
    
    // Check for page break marker
    if (/^---PAGE BREAK---$/i.test(line.trim()) || /^%PAGE/.test(line.trim())) {
      currentPage++;
      currentHeading = '';
    }
    
    // If adding this line would exceed max size, flush the chunk
    if ((currentChunk + line).length >= maxSize && currentChunk.length > 0) {
      // Apply overlap if configured
      let chunkContent = currentChunk.trim();
      if (overlap > 0 && chunkContent.length > overlap) {
        chunkContent = chunkContent.substring(0, chunkContent.length - overlap);
      }
      
      chunks.push({
        id: `${sourceId}-chunk-${chunkIndex}`,
        sourceId,
        index: chunkIndex++,
        content: chunkContent,
        metadata: {
          lineRange: `${lineStart}-${lineStart + currentChunk.split('\n').length - 1}`,
          page: currentPage,
          heading: currentHeading || undefined,
          type: 'paragraph'
        }
      });
      
      // Start new chunk with overlap content
      if (overlap > 0 && currentChunk.length > overlap) {
        const lastLines = currentChunk.split('\n').slice(-Math.ceil(overlap / targetSize * 10));
        currentChunk = lastLines.join('\n') + '\n';
        lineStart = lineStart + currentChunk.split('\n').length - lastLines.length;
      } else {
        currentChunk = line + '\n';
        lineStart = lineStart + currentChunk.split('\n').length - 1;
      }
    } else {
      currentChunk += line + '\n';
    }
  }
  
  // Flush remaining content
  if (currentChunk.trim()) {
    chunks.push({
      id: `${sourceId}-chunk-${chunkIndex}`,
      sourceId,
      index: chunkIndex,
      content: currentChunk.trim(),
      metadata: {
        lineRange: `${lineStart}-${lineStart + currentChunk.split('\n').length - 1}`,
        page: currentPage,
        heading: currentHeading || undefined,
        type: 'paragraph'
      }
    });
  }
  
  return chunks;
}

/**
 * Determine file type from buffer and extension
 */
export function detectFileType(buffer: Buffer, filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  // Check magic numbers
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'PDF';
  }
  
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return 'DOCX'; // ZIP-based format
  }
  
  // Fallback to extension
  switch (ext) {
    case 'pdf': return 'PDF';
    case 'docx': 
    case 'doc': return 'DOCX';
    case 'txt': return 'TXT';
    case 'md': return 'MARKDOWN';
    case 'csv': return 'CSV';
    case 'xlsx':
    case 'xls': return 'XLSX';
    default: return 'UNKNOWN';
  }
}

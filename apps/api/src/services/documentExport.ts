// Document export services for ICON Academic Studio
import { prisma } from '@icon-academic/db';
import fs from 'fs';
import path from 'path';

export interface ExportOptions {
  font?: string;
  fontSize?: number;
  margins?: { top?: number; right?: number; bottom?: number; left?: number };
}

export async function generateDocx(documentId: string, options: ExportOptions = {}): Promise<Buffer> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          blocks: {
            orderBy: { order: 'asc' },
          },
        },
      },
      blocks: {
        orderBy: { order: 'asc' },
      },
      formattingProfile: true,
    },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  // Simple DOCX generation using basic structure
  const lines: string[] = [];
  
  // Add title
  lines.push(document.title);
  lines.push('');
  
  if (document.subtitle) {
    lines.push(document.subtitle);
    lines.push('');
  }

  // Process sections and blocks
  const sections = document.sections || [];
  const blocks = document.blocks || [];

  for (const section of sections) {
    lines.push(section.title.toUpperCase());
    lines.push('='.repeat(section.title.length));
    lines.push('');
    
    if (section.content) {
      lines.push(section.content);
      lines.push('');
    }

    const sectionBlocks = blocks.filter(b => b.sectionId === section.id);
    for (const block of sectionBlocks) {
      lines.push(renderTextBlock(block));
      lines.push('');
    }
  }

  // Root blocks
  const rootBlocks = blocks.filter(b => !b.sectionId);
  for (const block of rootBlocks) {
    lines.push(renderTextBlock(block));
    lines.push('');
  }

  const content = lines.join('\n');
  
  // Create a simple DOCX-like buffer (in production, would use proper DOCX generation)
  const docxContent = createSimpleDocx(content);
  
  // Create export job
  await prisma.exportJob.create({
    data: {
      documentId,
      format: 'DOCX',
      status: 'COMPLETED',
      outputPath: `/exports/${documentId}.docx`,
    },
  });

  return Buffer.from(docxContent);
}

function createSimpleDocx(text: string): string {
  // Return a simple text representation that can be used as fallback
  return `PK${text}`;
}

function renderTextBlock(block: any): string {
  switch (block.type) {
    case 'HEADING':
      const level = (block.metadata as any)?.level || 2;
      return '#'.repeat(level) + ' ' + block.content;
    
    case 'BULLET_LIST':
      return (block.content || '').split('\n').map((line: string) => `- ${line}`).join('\n');
    
    case 'NUMBERED_LIST':
      return (block.content || '').split('\n').map((line: string, i: number) => `${i + 1}. ${line}`).join('\n');
    
    case 'QUOTE':
      return `> ${block.content}`;
    
    case 'PAGE_BREAK':
      return '\n---\n';
    
    default:
      return block.content || '';
  }
}

// Helper to get document stats
export async function getDocumentStats(documentId: string): Promise<any> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      blocks: true,
      sections: true,
    },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  const wordCount = document.wordCount || 
    document.blocks.reduce((sum: number, b: any) => sum + (b.content?.split(/\s+/).filter((w: string) => w.length > 0).length || 0), 0);
  
  const charCount = document.blocks.reduce((sum: number, b: any) => sum + (b.content?.length || 0), 0);

  return {
    wordCount,
    characterCount: charCount,
    paragraphCount: document.blocks.filter((b: any) => b.type === 'PARAGRAPH').length,
    headingCount: document.blocks.filter((b: any) => b.type === 'HEADING').length,
    listCount: document.blocks.filter((b: any) => b.type === 'BULLET_LIST' || b.type === 'NUMBERED_LIST').length,
    tableCount: document.blocks.filter((b: any) => b.type === 'TABLE').length,
    sectionCount: document.sections.length,
    blockCount: document.blocks.length,
  };
}

export async function generateMarkdown(documentId: string): Promise<string> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          blocks: { orderBy: { order: 'asc' } },
        },
      },
      blocks: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  let md = `# ${document.title}\n\n`;

  if (document.subtitle) {
    md += `*${document.subtitle}*\n\n`;
  }

  // Process sections
  for (const section of document.sections) {
    md += `## ${section.title}\n\n`;
    
    if (section.content) {
      md += `${section.content}\n\n`;
    }

    for (const block of section.blocks) {
      md += renderMarkdownBlock(block);
    }
  }

  // Process root blocks
  for (const block of document.blocks) {
    if (!block.sectionId) {
      md += renderMarkdownBlock(block);
    }
  }

  return md;
}

function renderMarkdownBlock(block: any): string {
  switch (block.type) {
    case 'PARAGRAPH':
      return `${block.content}\n\n`;
    
    case 'HEADING': {
      const level = (block.metadata as any)?.level || 2;
      return `${'#'.repeat(level)} ${block.content}\n\n`;
    }
    
    case 'BULLET_LIST': {
      const items = (block.content || '').split('\n');
      return items.map((item: string) => `- ${item}`).join('\n') + '\n\n';
    }
    
    case 'NUMBERED_LIST': {
      const items = (block.content || '').split('\n');
      return items.map((item: string, i: number) => `${i + 1}. ${item}`).join('\n') + '\n\n';
    }
    
    case 'QUOTE':
      return `> ${block.content}\n\n`;
    
    case 'PAGE_BREAK':
      return `\n---\n\n`;
    
    default:
      return '';
  }
}

export async function generateHtml(documentId: string): Promise<string> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          blocks: { orderBy: { order: 'asc' } },
        },
      },
      blocks: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  let html = `<h1>${document.title}</h1>\n`;
  
  if (document.subtitle) {
    html += `<h2>${document.subtitle}</h2>\n`;
  }

  html += '<div class="document-content">\n';

  for (const section of document.sections) {
    html += `<section id="${section.id}">\n`;
    html += `<h${Math.min(section.headingLevel || 1, 6)}>${section.title}</h${Math.min(section.headingLevel || 1, 6)}>\n`;
    
    if (section.content) {
      html += `<p>${section.content}</p>\n`;
    }

    for (const block of section.blocks) {
      html += renderHtmlBlock(block);
    }
    
    html += '</section>\n';
  }

  for (const block of document.blocks) {
    if (!block.sectionId) {
      html += renderHtmlBlock(block);
    }
  }

  html += '</div>\n';

  return html;
}

function renderHtmlBlock(block: any): string {
  switch (block.type) {
    case 'PARAGRAPH':
      return `<p>${block.content}</p>\n`;
    
    case 'HEADING': {
      const level = (block.metadata as any)?.level || 2;
      return `<h${level}>${block.content}</h${level}>\n`;
    }
    
    case 'BULLET_LIST': {
      const items = (block.content || '').split('\n');
      return `<ul>\n${items.map((item: string) => `<li>${item}</li>`).join('\n')}\n</ul>\n`;
    }
    
    case 'NUMBERED_LIST': {
      const items = (block.content || '').split('\n');
      return `<ol>\n${items.map((item: string) => `<li>${item}</li>`).join('\n')}\n</ol>\n`;
    }
    
    case 'QUOTE':
      return `<blockquote>${block.content}</blockquote>\n`;
    
    case 'PAGE_BREAK':
      return '<hr>\n';
    
    case 'CALLOUT':
      return `<div class="callout">${block.content}</div>\n`;
    
    default:
      return '';
  }
}

export async function generateTxt(documentId: string): Promise<string> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { blocks: { orderBy: { order: 'asc' } } },
      },
      blocks: { orderBy: { order: 'asc' } },
    },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  let txt = `${document.title}\n${'='.repeat(document.title.length)}\n\n`;
  
  if (document.subtitle) {
    txt += `${document.subtitle}\n\n`;
  }

  for (const section of document.sections) {
    txt += `\n${section.title}\n${'-'.repeat(section.title.length)}\n`;
    
    if (section.content) {
      txt += `${section.content}\n`;
    }

    for (const block of section.blocks) {
      txt += renderTxtBlock(block);
    }
  }

  for (const block of document.blocks) {
    if (!block.sectionId) {
      txt += renderTxtBlock(block);
    }
  }

  return txt;
}

function renderTxtBlock(block: any): string {
  switch (block.type) {
    case 'PARAGRAPH':
      return `${block.content}\n\n`;
    
    case 'HEADING':
      return `\n${block.content}\n${'*'.repeat(block.content.length)}\n\n`;
    
    case 'BULLET_LIST':
    case 'NUMBERED_LIST': {
      const items = (block.content || '').split('\n');
      return items.map((item: string, i: number) => 
        block.type === 'NUMBERED_LIST' ? `${i + 1}. ${item}` : `• ${item}`
      ).join('\n') + '\n\n';
    }
    
    case 'QUOTE':
      return `> ${block.content}\n\n`;
    
    default:
      return '';
  }
}

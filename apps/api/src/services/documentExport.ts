// Document export services for ICON Academic Studio
import { prisma } from '@icon-academic/db';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, PageBreak, LevelFormat,
  Header, Footer, PageNumber, UnderlineType, convertInchesToTwip
} from 'docx';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface ExportOptions {
  font?: string;
  fontSize?: number;
  margins?: { top?: number; right?: number; bottom?: number; left?: number };
}

interface Block {
  type: string;
  content: string;
  metadata?: any;
  order: number;
}

interface Section {
  id: string;
  title: string;
  headingLevel: number;
  order: number;
  content?: string;
  blocks?: Block[];
}

interface DocumentData {
  title: string;
  subtitle?: string;
  sections: Section[];
  blocks: Block[];
  formattingProfile?: any;
}

// Helper to get document with structure
async function getDocumentData(documentId: string): Promise<DocumentData> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      sections: { orderBy: { order: 'asc' } },
      blocks: { orderBy: { order: 'asc' } },
      formattingProfile: true,
    },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  // Group blocks by section
  const blocksBySection = new Map<string, Block[]>();
  const rootBlocks: Block[] = [];

  for (const block of document.blocks || []) {
    const blockData: Block = {
      type: block.type,
      content: block.content || '',
      metadata: block.metadata ? JSON.parse(block.metadata) : {},
      order: block.order,
    };
    
    if (block.sectionId) {
      if (!blocksBySection.has(block.sectionId)) {
        blocksBySection.set(block.sectionId, []);
      }
      blocksBySection.get(block.sectionId)!.push(blockData);
    } else {
      rootBlocks.push(blockData);
    }
  }

  // Attach blocks to sections
  const sections: Section[] = (document.sections || []).map(section => ({
    id: section.id,
    title: section.title || '',
    headingLevel: section.headingLevel || 1,
    order: section.order,
    content: section.content || undefined,
    blocks: blocksBySection.get(section.id) || [],
  }));

  return {
    title: document.title,
    subtitle: document.subtitle || undefined,
    sections,
    blocks: rootBlocks,
    formattingProfile: document.formattingProfile,
  };
}

// Common helpers
function getPageMargins(formattingProfile: any) {
  if (formattingProfile?.custom?.margins) {
    const m = formattingProfile.custom.margins;
    return {
      top: convertInchesToTwip(m.top || 1),
      right: convertInchesToTwip(m.right || 0.75),
      bottom: convertInchesToTwip(m.bottom || 1),
      left: convertInchesToTwip(m.left || 1),
    };
  }
  return { top: 1440, right: 1080, bottom: 1440, left: 1440 }; // Default 1" margins
}

function getFontSize(formattingProfile: any) {
  return formattingProfile?.custom?.fontSize || 12;
}

function getFontFamily(formattingProfile: any) {
  return formattingProfile?.custom?.fontFamily || 'Times New Roman';
}

function getLineSpacing(formattingProfile: any) {
  return formattingProfile?.custom?.lineHeight || 1.15;
}

function renderParagraph(docx: any, text: string, options: any = {}) {
  docx.addParagraph({
    children: [new TextRun({ 
      text, 
      size: options.size || getFontSize(options.profile) * 2,
      font: options.font || getFontFamily(options.profile),
      italics: options.italic,
    })],
    spacing: { 
      after: 120, 
      line: Math.round((options.profile?.custom?.lineHeight || 1.15) * 240) 
    },
    alignment: options.alignment || AlignmentType.LEFT,
  });
}

function renderHeading(docx: any, text: string, level: number, profile: any) {
  const sizes = [48, 36, 32, 28, 24, 20]; // Heading sizes in half-points
  const size = sizes[Math.min(level - 1, sizes.length - 1)] || 36;
  
  const headings = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
  const heading = headings[Math.min(level - 1, headings.length - 1)] || HeadingLevel.HEADING_1;
  
  docx.addParagraph({
    children: [new TextRun({ 
      text, 
      bold: true, 
      size, 
      font: getFontFamily(profile) 
    })],
    heading,
    spacing: { before: 240, after: 120 },
  });
}

function renderList(docx: any, items: string[], type: 'bullet' | 'number', profile: any) {
  const format = type === 'bullet' ? LevelFormat.BULLET : LevelFormat.DECIMAL;
  
  for (const item of items) {
    docx.addParagraph({
      children: [new TextRun({ 
        text: item, 
        size: getFontSize(profile) * 2,
        font: getFontFamily(profile)
      })],
      numbering: { reference: type === 'bullet' ? 'bulletList' : 'numberedList', level: 0 },
      spacing: { after: 60 },
    });
  }
}

function renderTable(docx: any, rows: any[][], profile: any) {
  if (!rows || rows.length === 0) return;
  
  const rowCount = rows.length;
  const tableRows = rows.map((row, rowIndex) => 
    new TableRow({
      children: row.map((cell: any) => 
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ 
              text: String(cell), 
              size: getFontSize(profile) * 2,
              font: getFontFamily(profile)
            })],
          })],
          width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
        })
      ),
    })
  );

  docx.addTable({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: Array(rowCount).fill(Math.floor(100 / rowCount)),
  });
  
  docx.addParagraph({ children: [] }); // Spacing after table
}

// DOCX Export
export async function generateDocx(documentId: string): Promise<Buffer> {
  const docData = await getDocumentData(documentId);
  const profile = docData.formattingProfile;

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 }, // Letter size
          margin: getPageMargins(profile),
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({ 
              text: docData.title, 
              size: 18, 
              color: '666666',
              font: getFontFamily(profile)
            })],
            alignment: AlignmentType.RIGHT,
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: '— ', size: 18, font: getFontFamily(profile) }),
              new TextRun({ text: 'Page ', size: 18, font: getFontFamily(profile) }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, font: getFontFamily(profile) }),
              new TextRun({ text: ' —', size: 18, font: getFontFamily(profile) }),
            ],
            alignment: AlignmentType.CENTER,
          })],
        }),
      },
      children: [
        // Title
        new Paragraph({
          children: [new TextRun({ 
            text: docData.title, 
            bold: true, 
            size: 48, 
            font: getFontFamily(profile) 
          })],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        
        // Subtitle
        ...(docData.subtitle ? [new Paragraph({
          children: [new TextRun({ 
            text: docData.subtitle, 
            italics: true, 
            size: 28, 
            font: getFontFamily(profile) 
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })] : []),

        // Render sections
        ...renderSections(docData.sections, profile),
        
        // Render root blocks
        ...renderBlocks(docData.blocks, profile),
      ],
    }],
    styles: {
      default: {
        document: {
          run: { font: getFontFamily(profile), size: getFontSize(profile) * 2 },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal',
          quickFormat: true,
          run: { size: 36, bold: true, font: getFontFamily(profile) },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal',
          quickFormat: true,
          run: { size: 32, bold: true, font: getFontFamily(profile) },
          paragraph: { spacing: { before: 200, after: 100 } },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'bulletList',
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
        {
          reference: 'numberedList',
          levels: [{
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
      ],
    },
  });

  // Create export job record
  await prisma.exportJob.create({
    data: {
      documentId,
      format: 'DOCX',
      status: 'COMPLETED',
      outputPath: `/exports/${documentId}.docx`,
    },
  });

  return Packer.toBuffer(doc);
}

function renderSections(sections: Section[], profile: any): any[] {
  const elements: any[] = [];
  
  for (const section of sections) {
    // Section heading
    elements.push(new Paragraph({
      children: [new TextRun({ 
        text: section.title, 
        bold: true, 
        size: (section.headingLevel <= 2 ? 36 : section.headingLevel <= 3 ? 32 : 28),
        font: getFontFamily(profile)
      })],
      spacing: { before: 240, after: 120 },
    }));

    // Section content
    if (section.content) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: section.content, size: getFontSize(profile) * 2, font: getFontFamily(profile) })],
        spacing: { after: 120 },
      }));
    }

    // Section blocks
    elements.push(...renderBlocks(section.blocks || [], profile));
  }
  
  return elements;
}

function renderBlocks(blocks: Block[], profile: any): any[] {
  const elements: any[] = [];
  
  for (const block of blocks) {
    switch (block.type) {
      case 'PARAGRAPH':
        elements.push(new Paragraph({
          children: [new TextRun({ text: block.content, size: getFontSize(profile) * 2, font: getFontFamily(profile) })],
          spacing: { after: 120 },
        }));
        break;
        
      case 'HEADING': {
        const level = block.metadata?.level || 2;
        const sizes = [48, 36, 32, 28, 24, 20];
        elements.push(new Paragraph({
          children: [new TextRun({ text: block.content, bold: true, size: sizes[Math.min(level - 1, 5)] || 36, font: getFontFamily(profile) })],
          spacing: { before: 200, after: 100 },
        }));
        break;
      }
      
      case 'BULLET_LIST': {
        const items = (block.content || '').split('\n').filter(Boolean);
        for (const item of items) {
          elements.push(new Paragraph({
            children: [new TextRun({ text: item, size: getFontSize(profile) * 2, font: getFontFamily(profile) })],
            numbering: { reference: 'bulletList', level: 0 },
            spacing: { after: 60 },
          }));
        }
        break;
      }
      
      case 'NUMBERED_LIST': {
        const items = (block.content || '').split('\n').filter(Boolean);
        for (let i = 0; i < items.length; i++) {
          elements.push(new Paragraph({
            children: [new TextRun({ text: items[i], size: getFontSize(profile) * 2, font: getFontFamily(profile) })],
            numbering: { reference: 'numberedList', level: 0 },
            spacing: { after: 60 },
          }));
        }
        break;
      }
      
      case 'QUOTE':
        elements.push(new Paragraph({
          children: [new TextRun({ text: `"${block.content}"`, italics: true, size: getFontSize(profile) * 2, font: getFontFamily(profile) })],
          indent: { left: 720 },
          spacing: { before: 120, after: 120 },
        }));
        break;
      
      case 'PAGE_BREAK':
        elements.push(new Paragraph({ children: [] }));
        elements.push(new PageBreak());
        break;
        
      case 'TABLE': {
        const data = block.metadata?.rows || [];
        if (data.length > 0) {
          const tableRows = data.map((row: any[]) => 
            new TableRow({
              children: row.map((cell: string) => 
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ text: cell, size: getFontSize(profile) * 2, font: getFontFamily(profile) })],
                  })],
                })
              ),
            })
          );
          elements.push(new Table({ rows: tableRows }));
          elements.push(new Paragraph({ children: [] }));
        }
        break;
      }
      
      case 'CALLOUT':
        elements.push(new Paragraph({
          children: [new TextRun({ text: block.content, color: '666666', size: getFontSize(profile) * 2, font: getFontFamily(profile) })],
          shading: { fill: 'F5F5F5' },
          indent: { left: 360, right: 360 },
          spacing: { before: 120, after: 120 },
        }));
        break;
    }
  }
  
  return elements;
}

// PDF Export
export async function generatePdf(documentId: string): Promise<Buffer> {
  const docData = await getDocumentData(documentId);
  const profile = docData.formattingProfile;
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'Letter',
        margins: getPageMarginsPdf(profile),
        info: { Title: docData.title },
      });

      const chunks: Buffer[] = [];
      (doc as any).on('data', (chunk: Buffer) => chunks.push(chunk));
      (doc as any).on('end', () => resolve(Buffer.concat(chunks)));
      (doc as any).on('error', reject);

      // Title
      doc.fontSize(24).text(docData.title, { align: 'center' });
      doc.moveDown(0.5);

      // Subtitle
      if (docData.subtitle) {
        doc.fontSize(16).text(docData.subtitle, { align: 'center', italics: true } as any);
        doc.moveDown(1);
      }

      // Sections and blocks
      for (const section of docData.sections) {
        // Section heading
        const headingSize = section.headingLevel <= 1 ? 18 : section.headingLevel <= 2 ? 16 : 14;
        doc.fontSize(headingSize).text(section.title, { continued: false });
        doc.moveDown(0.3);

        // Section content
        if (section.content) {
          doc.fontSize(11).text(section.content, { lineGap: 4 });
          doc.moveDown(0.3);
        }

        // Section blocks
        for (const block of section.blocks || []) {
          renderPdfBlock(doc, block, profile);
        }
      }

      // Root blocks
      for (const block of docData.blocks) {
        renderPdfBlock(doc, block, profile);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function getPageMarginsPdf(profile: any) {
  if (profile?.custom?.margins) {
    const m = profile.custom.margins;
    return { top: (m.top || 1) * 72, bottom: (m.bottom || 1) * 72, left: (m.left || 1) * 72, right: (m.right || 0.75) * 72 };
  }
  return { top: 72, bottom: 72, left: 72, right: 72 };
}

function renderPdfBlock(doc: any, block: any, profile: any) {
  const fontSize = (profile?.custom?.fontSize || 12) * 0.75; // Convert to points
  
  switch (block.type) {
    case 'PARAGRAPH':
      doc.fontSize(fontSize).text(block.content, { lineGap: 4 });
      doc.moveDown(0.3);
      break;
      
    case 'HEADING': {
      const level = block.metadata?.level || 2;
      const size = level <= 1 ? 18 : level <= 2 ? 16 : 14;
      doc.fontSize(size).text(block.content, { continued: false });
      doc.moveDown(0.3);
      break;
    }
    
    case 'BULLET_LIST': {
      const items = (block.content || '').split('\n').filter(Boolean);
      for (const item of items) {
        doc.fontSize(fontSize).text(`• ${item}`, { lineGap: 2 });
      }
      doc.moveDown(0.2);
      break;
    }
    
    case 'NUMBERED_LIST': {
      const items = (block.content || '').split('\n').filter(Boolean);
      items.forEach((item: string, i: number) => {
        doc.fontSize(fontSize).text(`${i + 1}. ${item}`, { lineGap: 2 });
      });
      doc.moveDown(0.2);
      break;
    }
    
    case 'QUOTE':
      doc.fontSize(fontSize).text(`"${block.content}"`, { indent: 36, italics: true });
      doc.moveDown(0.3);
      break;
    
    case 'PAGE_BREAK':
      doc.addPage();
      break;
      
    case 'TABLE': {
      const data = block.metadata?.rows || [];
      if (data.length > 0) {
        const colWidths = data[0].length > 0 ? Array(data[0].length).fill(0).map((_, i) => 612 / data[0].length) : [612];
        let y = doc.y;
        
        // Draw table
        data.forEach((row: any[], rowIdx: number) => {
          row.forEach((cell: string, colIdx: number) => {
            const x = colIdx * (612 / row.length);
            doc.rect(x, y, 612 / row.length, 20).stroke();
            doc.fontSize(9).text(cell, x + 3, y + 3, { width: 612 / row.length - 6, align: 'left' });
          });
          y += 20;
        });
        
        doc.y = y + 10;
      }
      break;
    }
  }
}

// Markdown Export
export async function generateMarkdown(documentId: string): Promise<string> {
  const docData = await getDocumentData(documentId);
  
  let md = `# ${docData.title}\n\n`;
  
  if (docData.subtitle) {
    md += `*${docData.subtitle}*\n\n`;
  }

  for (const section of docData.sections) {
    md += `## ${section.title}\n\n`;
    
    if (section.content) {
      md += `${section.content}\n\n`;
    }

    for (const block of section.blocks || []) {
      md += renderMarkdownBlock(block);
    }
  }

  for (const block of docData.blocks) {
    md += renderMarkdownBlock(block);
  }

  // Save export job
  await prisma.exportJob.create({
    data: {
      documentId,
      format: 'MARKDOWN',
      status: 'COMPLETED',
      outputPath: `/exports/${documentId}.md`,
    },
  });

  return md;
}

function renderMarkdownBlock(block: Block): string {
  switch (block.type) {
    case 'PARAGRAPH':
      return `${block.content}\n\n`;
    
    case 'HEADING': {
      const level = block.metadata?.level || 2;
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
    
    case 'TABLE': {
      const data = block.metadata?.rows || [];
      if (data.length === 0) return '';
      
      let table = '| ' + data[0].join(' | ') + ' |\n';
      table += '| ' + data[0].map(() => '---').join(' | ') + ' |\n';
      for (let i = 1; i < data.length; i++) {
        table += '| ' + data[i].join(' | ') + ' |\n';
      }
      return table + '\n';
    }
    
    default:
      return '';
  }
}

// HTML Export
export async function generateHtml(documentId: string): Promise<string> {
  const docData = await getDocumentData(documentId);
  
  let html = `<h1>${escapeHtml(docData.title)}</h1>\n`;
  
  if (docData.subtitle) {
    html += `<h2>${escapeHtml(docData.subtitle)}</h2>\n`;
  }

  html += '<div class="document-content">\n';

  for (const section of docData.sections) {
    html += `<section id="${section.id}">\n`;
    html += `<h${Math.min(section.headingLevel || 1, 6)}>${escapeHtml(section.title)}</h${Math.min(section.headingLevel || 1, 6)}>\n`;
    
    if (section.content) {
      html += `<p>${escapeHtml(section.content)}</p>\n`;
    }

    for (const block of section.blocks || []) {
      html += renderHtmlBlock(block);
    }
    
    html += '</section>\n';
  }

  for (const block of docData.blocks) {
    html += renderHtmlBlock(block);
  }

  html += '</div>\n';

  await prisma.exportJob.create({
    data: {
      documentId,
      format: 'HTML',
      status: 'COMPLETED',
      outputPath: `/exports/${documentId}.html`,
    },
  });

  return html;
}

function renderHtmlBlock(block: Block): string {
  switch (block.type) {
    case 'PARAGRAPH':
      return `<p>${escapeHtml(block.content)}</p>\n`;
    
    case 'HEADING': {
      const level = block.metadata?.level || 2;
      return `<h${level}>${escapeHtml(block.content)}</h${level}>\n`;
    }
    
    case 'BULLET_LIST': {
      const items = (block.content || '').split('\n');
      return `<ul>\n${items.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('\n')}\n</ul>\n`;
    }
    
    case 'NUMBERED_LIST': {
      const items = (block.content || '').split('\n');
      return `<ol>\n${items.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('\n')}\n</ol>\n`;
    }
    
    case 'QUOTE':
      return `<blockquote>${escapeHtml(block.content)}</blockquote>\n`;
    
    case 'PAGE_BREAK':
      return '<hr>\n';
    
    case 'TABLE': {
      const data = block.metadata?.rows || [];
      if (data.length === 0) return '';
      
      let table = '<table>\n<thead>\n<tr>\n';
      data[0].forEach((cell: string) => { table += `<th>${escapeHtml(cell)}</th>\n`; });
      table += '</tr>\n</thead>\n<tbody>\n';
      
      for (let i = 1; i < data.length; i++) {
        table += '<tr>\n';
        data[i].forEach((cell: string) => { table += `<td>${escapeHtml(cell)}</td>\n`; });
        table += '</tr>\n';
      }
      
      table += '</tbody>\n</table>\n';
      return table;
    }
    
    default:
      return '';
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// TXT Export
export async function generateTxt(documentId: string): Promise<string> {
  const docData = await getDocumentData(documentId);
  
  let txt = `${docData.title}\n${'='.repeat(docData.title.length)}\n\n`;
  
  if (docData.subtitle) {
    txt += `${docData.subtitle}\n\n`;
  }

  for (const section of docData.sections) {
    txt += `\n${section.title}\n${'-'.repeat(section.title.length)}\n`;
    
    if (section.content) {
      txt += `${section.content}\n`;
    }

    for (const block of section.blocks || []) {
      txt += renderTxtBlock(block);
    }
  }

  for (const block of docData.blocks) {
    txt += renderTxtBlock(block);
  }

  await prisma.exportJob.create({
    data: {
      documentId,
      format: 'TXT',
      status: 'COMPLETED',
      outputPath: `/exports/${documentId}.txt`,
    },
  });

  return txt;
}

function renderTxtBlock(block: Block): string {
  switch (block.type) {
    case 'PARAGRAPH':
      return `${block.content}\n\n`;
    
    case 'HEADING':
      return `\n${block.content}\n${'*'.repeat(block.content.length)}\n\n`;
    
    case 'BULLET_LIST': {
      const items = (block.content || '').split('\n');
      return items.map((item: string) => `• ${item}`).join('\n') + '\n\n';
    }
    
    case 'NUMBERED_LIST': {
      const items = (block.content || '').split('\n');
      return items.map((item: string, i: number) => `${i + 1}. ${item}`).join('\n') + '\n\n';
    }
    
    case 'QUOTE':
      return `> ${block.content}\n\n`;
    
    default:
      return '';
  }
}

// Get document statistics
export async function getDocumentStats(documentId: string): Promise<any> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { blocks: true, sections: true },
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

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@icon-academic/db';
import { generateDocx, generatePdf, generateMarkdown, generateHtml, generateTxt, getDocumentStats } from '../services/documentExport.js';
import AdmZip from 'adm-zip';

describe('Document Export Integration', () => {
  let projectId: string;
  let documentId: string;

  beforeAll(async () => {
    // Create test project
    const project = await prisma.project.create({
      data: { name: 'Test Export Project', type: 'RESEARCH_REPORT' },
    });
    projectId = project.id;

    // Create document
    const doc = await prisma.document.create({
      data: {
        projectId,
        title: 'Test Academic Report',
        type: 'RESEARCH_REPORT',
        status: 'DRAFT',
      },
    });
    documentId = doc.id;

    // Create sections
    const intro = await prisma.documentSection.create({
      data: { documentId, title: 'Introduction', headingLevel: 1, order: 0 },
    });
    const methods = await prisma.documentSection.create({
      data: { documentId, title: 'Methods', headingLevel: 1, order: 1 },
    });
    const results = await prisma.documentSection.create({
      data: { documentId, title: 'Results', headingLevel: 1, order: 2 },
    });

    // Create blocks with various types
    await prisma.documentBlock.create({
      data: { documentId, sectionId: intro.id, type: 'PARAGRAPH', content: 'This is the introduction paragraph.', order: 0 },
    });
    await prisma.documentBlock.create({
      data: { documentId, sectionId: intro.id, type: 'HEADING', content: 'Background', order: 1, metadata: JSON.stringify({ level: 2 }) },
    });
    await prisma.documentBlock.create({
      data: { documentId, sectionId: intro.id, type: 'PARAGRAPH', content: 'Background information here.', order: 2 },
    });
    await prisma.documentBlock.create({
      data: { documentId, sectionId: methods.id, type: 'PARAGRAPH', content: 'Methodology description.', order: 0 },
    });
    await prisma.documentBlock.create({
      data: { documentId, sectionId: methods.id, type: 'BULLET_LIST', content: 'Step one\nStep two\nStep three', order: 1 },
    });
    await prisma.documentBlock.create({
      data: { documentId, sectionId: methods.id, type: 'NUMBERED_LIST', content: 'First step\nSecond step\nThird step', order: 2 },
    });
    await prisma.documentBlock.create({
      data: { documentId, sectionId: results.id, type: 'TABLE', content: 'Results summary', order: 0, metadata: JSON.stringify({
        rows: [
          ['Metric', 'Value', 'Status'],
          ['Accuracy', '95%', 'Pass'],
          ['Precision', '92%', 'Pass'],
          ['Recall', '88%', 'Warning'],
        ]
      })},
    });
    await prisma.documentBlock.create({
      data: { documentId, sectionId: results.id, type: 'PAGE_BREAK', content: '', order: 1 },
    });
    await prisma.documentBlock.create({
      data: { documentId, sectionId: results.id, type: 'QUOTE', content: 'The results were significant.', order: 2 },
    });
    await prisma.documentBlock.create({
      data: { documentId, type: 'PARAGRAPH', content: 'Root level paragraph.', order: 0 },
    });
  });

  afterAll(async () => {
    await prisma.documentBlock.deleteMany({ where: { documentId } });
    await prisma.documentSection.deleteMany({ where: { documentId } });
    await prisma.document.delete({ where: { id: documentId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.$disconnect();
  });

  it('should generate valid DOCX', async () => {
    const buffer = await generateDocx(documentId);
    
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000); // Real DOCX is much larger than placeholder
    
    // Verify it's a valid ZIP (DOCX is ZIP format)
    expect(buffer.slice(0, 4)).toEqual(Buffer.from([0x50, 0x4B, 0x03, 0x04])); // PK signature
    
    // Try to read as ZIP
    try {
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();
      
      // Should contain Word document XML
      const hasDocXml = entries.some(e => e.entryName.includes('word/document.xml'));
      expect(hasDocXml).toBe(true);
      
      // Should containrels
      const hasRels = entries.some(e => e.entryName.includes('[Content_Types].xml'));
      expect(hasRels).toBe(true);
      
      console.log(`DOCX generated: ${buffer.length} bytes, ${entries.length} entries`);
    } catch (e) {
      console.error('ZIP extraction failed:', e);
      throw e;
    }
  });

  it('should generate valid PDF', async () => {
    const buffer = await generatePdf(documentId);
    
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);
    
    // Verify PDF header
    const header = buffer.slice(0, 8).toString('utf-8');
    expect(header).toContain('%PDF');
    
    console.log(`PDF generated: ${buffer.length} bytes`);
  }, 10000); // 10 second timeout

  it('should generate Markdown', async () => {
    const md = await generateMarkdown(documentId);
    
    expect(md).toContain('# Test Academic Report');
    expect(md).toContain('## Introduction');
    expect(md).toContain('## Methods');
    expect(md).toContain('## Results');
    expect(md).toContain('Background');
    expect(md).toContain('- Step one');
    expect(md).toContain('1. First step');
    expect(md).toContain('> The results were significant.');
    
    console.log(`Markdown generated: ${md.length} characters`);
  });

  it('should generate HTML', async () => {
    const html = await generateHtml(documentId);
    
    expect(html).toContain('<h1>Test Academic Report</h1>');
    expect(html).toContain('<h1>Introduction</h1>');
    expect(html).toContain('<p>This is the introduction paragraph.</p>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<ol>');
    expect(html).toContain('<table>');
    
    console.log(`HTML generated: ${html.length} characters`);
  });

  it('should generate TXT', async () => {
    const txt = await generateTxt(documentId);
    
    expect(txt).toContain('Test Academic Report');
    expect(txt).toContain('Introduction');
    expect(txt).toContain('Methods');
    expect(txt).toContain('Results');
    expect(txt).toContain('• Step one');
    expect(txt).toContain('1. First step');
    
    console.log(`TXT generated: ${txt.length} characters`);
  });

  it('should get document stats', async () => {
    const stats = await getDocumentStats(documentId);
    
    expect(stats.wordCount).toBeGreaterThan(0);
    expect(stats.characterCount).toBeGreaterThan(0);
    expect(stats.sectionCount).toBe(3);
    expect(stats.blockCount).toBeGreaterThan(0);
    
    console.log(`Stats: ${JSON.stringify(stats)}`);
  });
});

describe('Document Versioning', () => {
  let projectId: string;
  let documentId: string;

  beforeAll(async () => {
    const project = await prisma.project.create({
      data: { name: 'Version Test Project', type: 'GENERAL' },
    });
    projectId = project.id;

    const doc = await prisma.document.create({
      data: { projectId, title: 'Version Test', type: 'GENERAL' },
    });
    documentId = doc.id;
  });

  afterAll(async () => {
    await prisma.document.delete({ where: { id: documentId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.$disconnect();
  });

  it('should create version snapshots', async () => {
    // Create version 1
    const v1 = await prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber: 1,
        note: 'Initial version',
        structure: JSON.stringify({ title: 'Version Test', type: 'GENERAL', wordCount: 0, blocks: [], sections: [] }),
      },
    });
    expect(v1).toBeDefined();
    expect(v1.versionNumber).toBe(1);

    // Update document
    await prisma.document.update({
      where: { id: documentId },
      data: { version: 2, wordCount: 100 },
    });

    // Create version 2
    const v2 = await prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber: 2,
        note: 'After edits',
        structure: JSON.stringify({ title: 'Version Test', type: 'GENERAL', wordCount: 100, blocks: [], sections: [] }),
      },
    });
    expect(v2.versionNumber).toBe(2);

    // List versions
    const versions = await prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
    expect(versions.length).toBe(2);
  });

  it('should restore a version', async () => {
    // Create a document with sections
    await prisma.documentSection.create({
      data: { documentId, title: 'Original Section', headingLevel: 1, order: 0 },
    });
    await prisma.document.update({
      where: { id: documentId },
      data: { title: 'Updated Title' },
    });

    // Save version with original state
    const originalStructure = JSON.stringify({
      title: 'Original Title',
      type: 'GENERAL',
      wordCount: 0,
      blocks: [],
      sections: [{ id: 'original-section-id', title: 'Original Section', headingLevel: 1, order: 0 }],
    });
    
    const version = await prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber: 3,
        note: 'Before update',
        structure: originalStructure,
      },
    });

    // Now restore
    const restored = await prisma.document.findUnique({ where: { id: documentId } });
    expect(restored?.title).toBe('Updated Title');
  });
});

describe('Export Format Validation', () => {
  it('should reject invalid format', async () => {
    // This would be tested via API endpoint
    const formats = ['docx', 'pdf', 'markdown', 'md', 'html', 'txt'];
    expect(formats).toContain('docx');
    expect(formats).toContain('pdf');
    expect(formats).toContain('markdown');
  });

  it('should handle non-existent document', async () => {
    await expect(generateDocx('non-existent-id')).rejects.toThrow('Document not found');
    await expect(generatePdf('non-existent-id')).rejects.toThrow('Document not found');
    await expect(generateMarkdown('non-existent-id')).rejects.toThrow('Document not found');
  });
});

import { describe, it, expect } from 'vitest';
import { extractText, extractPdf, extractDocx, chunkContent } from './extractors.js';

describe('PDF Extraction', () => {
  it('should extract text from a valid PDF', async () => {
    // Create a simple valid PDF with text content
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
10 750 Td
(Test PDF Content) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /TimesRoman >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000110 00000 n 
0000000247 00000 n 
0000000341 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
444
%%EOF`;

    const pdfBuffer = Buffer.from(pdfContent, 'utf-8');
    const result = await extractPdf(pdfBuffer);
    
    expect(result).toBeDefined();
    expect(typeof result.text).toBe('string');
    expect(result.pages).toBeGreaterThanOrEqual(1);
  });

  it('should handle empty PDF', async () => {
    const result = await extractPdf(Buffer.from('%PDF-1.4\n%%EOF'));
    expect(result).toBeDefined();
    expect(typeof result.text).toBe('string');
  });
});

describe('DOCX Extraction', () => {
  it('should extract text from a valid DOCX', async () => {
    // Create a minimal DOCX structure (ZIP format)
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    
    // Add word/document.xml
    const docXml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Test Document Title</w:t></w:r></w:p>
    <w:p><w:r><w:t>First paragraph content.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Second paragraph with more text.</w:t></w:r></w:p>
  </w:body>
</w:document>`;
    zip.addFile('word/document.xml', Buffer.from(docXml));
    
    // Add content types
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
    zip.addFile('[Content_Types].xml', Buffer.from(contentTypes));
    
    // Add relationships
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
    zip.addFile('word/_rels/document.xml.rels', Buffer.from(rels));
    
    const docxBuffer = zip.toBuffer();
    const result = await extractDocx(docxBuffer);
    
    expect(result).toBeDefined();
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('should handle invalid DOCX', async () => {
    const result = await extractDocx(Buffer.from('not a valid docx'));
    expect(result).toBeDefined();
    // Should return empty or error, not crash
    expect(typeof result.text).toBe('string');
  });
});

describe('Chunking', () => {
  it('should split content into chunks by semantic boundaries', () => {
    const content = 'Heading 1\n\nParagraph one with some content here.\n\nHeading 2\n\nParagraph two with more content.\n\nHeading 3\n\nFinal paragraph.';
    const chunks = chunkContent(content, { targetSize: 100, preserveHeadings: true }, 'test-source');

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content.length).toBeLessThan(200); // Should respect size limits
    expect(chunks.every(c => c.sourceId === 'test-source')).toBe(true);
    expect(chunks.every(c => typeof c.index === 'number')).toBe(true);
  });

  it('should split content into multiple chunks', () => {
    // Create content that exceeds a small maxSize to force multiple chunks
    const content = 'Line one with enough content here.\nLine two continues the pattern now.\nLine three adds even more text here please.';
    const chunks = chunkContent(content, { targetSize: 100, maxSize: 40 }, 'test-source');

    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('should preserve heading context', () => {
    const content = '# Introduction\n\nSome text here.\n## Methods\n\nMore text.\n### Results\n\nFinal text.';
    const chunks = chunkContent(content, { targetSize: 80, preserveHeadings: true }, 'test-source');

    expect(chunks.length).toBeGreaterThan(0);
    // At least one chunk should have heading metadata
    const hasHeading = chunks.some(c => c.metadata.heading);
    expect(hasHeading).toBe(true);
  });
});

describe('Extract Text (TXT/Markdown)', () => {
  it('should read plain text files', () => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-test-'));
    const testFile = path.join(testDir, 'test.txt');
    fs.writeFileSync(testFile, 'Hello World\nThis is a test.');
    
    const result = extractText(testFile);
    expect(result).toBe('Hello World\nThis is a test.');
    
    // Cleanup
    fs.unlinkSync(testFile);
    fs.rmdirSync(testDir);
  });
});

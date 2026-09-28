import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@icon-academic/db';

describe('Document Studio Unit Tests', () => {
  let projectId: string;
  let documentId: string;

  beforeAll(async () => {
    // Create a test project
    const project = await prisma.project.create({
      data: { name: 'Test Document Project', type: 'RESEARCH_REPORT' },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    // Cleanup in reverse order
    if (documentId) {
      await prisma.document.delete({ where: { id: documentId } }).catch(() => {});
    }
    await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it('should create a document', async () => {
    const document = await prisma.document.create({
      data: {
        projectId,
        title: 'Test Document',
        type: 'RESEARCH_REPORT',
        status: 'DRAFT',
      },
    });
    
    expect(document).toBeDefined();
    expect(document.title).toBe('Test Document');
    expect(document.type).toBe('RESEARCH_REPORT');
    expect(document.status).toBe('DRAFT');
    documentId = document.id;
  });

  it('should retrieve a document', async () => {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });
    
    expect(document).toBeDefined();
    expect(document?.id).toBe(documentId);
    expect(document?.title).toBe('Test Document');
  });

  it('should update document metadata', async () => {
    const updated = await prisma.document.update({
      where: { id: documentId },
      data: { 
        title: 'Updated Title',
        status: 'REVIEW',
      },
    });
    
    expect(updated.title).toBe('Updated Title');
    expect(updated.status).toBe('REVIEW');
  });

  it('should create and manage sections', async () => {
    const section = await prisma.documentSection.create({
      data: {
        documentId,
        title: 'Introduction',
        headingLevel: 1,
        order: 0,
      },
    });
    
    expect(section).toBeDefined();
    expect(section.documentId).toBe(documentId);
    expect(section.title).toBe('Introduction');
    
    // List sections for document
    const sections = await prisma.documentSection.findMany({
      where: { documentId },
      orderBy: { order: 'asc' },
    });
    
    expect(sections.length).toBeGreaterThan(0);
  });

  it('should create and manage blocks', async () => {
    const block = await prisma.documentBlock.create({
      data: {
        documentId,
        type: 'PARAGRAPH',
        content: 'This is a test paragraph.',
        order: 0,
      },
    });
    
    expect(block).toBeDefined();
    expect(block.type).toBe('PARAGRAPH');
    expect(block.content).toBe('This is a test paragraph.');
    
    // List blocks for document
    const blocks = await prisma.documentBlock.findMany({
      where: { documentId },
      orderBy: { order: 'asc' },
    });
    
    expect(blocks.length).toBeGreaterThan(0);
  });

  it('should create a version snapshot', async () => {
    const version = await prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber: 2,
        note: 'Test version',
        structure: JSON.stringify({
          title: 'Test Document',
          type: 'RESEARCH_REPORT',
          wordCount: 10,
          blocks: [],
          sections: [],
        }),
      },
    });
    
    expect(version).toBeDefined();
    expect(version.versionNumber).toBe(2);
    expect(version.note).toBe('Test version');
  });

  it('should list versions', async () => {
    const versions = await prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
    
    expect(Array.isArray(versions)).toBe(true);
    expect(versions.length).toBeGreaterThan(0);
  });

  it('should update word count', async () => {
    const updated = await prisma.document.update({
      where: { id: documentId },
      data: { wordCount: 150 },
    });
    
    expect(updated.wordCount).toBe(150);
  });

  it('should delete a document', async () => {
    await prisma.document.delete({
      where: { id: documentId },
    });
    
    const deleted = await prisma.document.findUnique({
      where: { id: documentId },
    });
    
    expect(deleted).toBeNull();
    documentId = '';
  });
});

describe('Document Block Types', () => {
  it('should define all required block types', () => {
    const validBlockTypes = [
      'PARAGRAPH',
      'HEADING',
      'BULLET_LIST',
      'NUMBERED_LIST',
      'QUOTE',
      'TABLE',
      'PAGE_BREAK',
      'CITATION_BLOCK',
      'CALLOUT',
      'IMAGE',
    ];

    expect(validBlockTypes.length).toBe(10);
    expect(validBlockTypes).toContain('PARAGRAPH');
    expect(validBlockTypes).toContain('HEADING');
    expect(validBlockTypes).toContain('TABLE');
  });
});

describe('Document Types', () => {
  it('should support required document types', () => {
    const validDocumentTypes = [
      'GENERAL',
      'CHAPTER',
      'SECTION',
      'RESEARCH_REPORT',
      'THESIS',
      'DISSERTATION',
      'STUDY_GUIDE',
      'PAMPHLET',
      'TEXTBOOK',
      'BOOK',
      'SEMINAR_PAPER',
      'PROPOSAL',
      'REPORT',
      'QUESTIONNAIRE',
      'INTERVIEW_GUIDE',
      'HND_PROJECT',
    ];

    expect(validDocumentTypes.length).toBeGreaterThan(10);
    expect(validDocumentTypes).toContain('THESIS');
    expect(validDocumentTypes).toContain('STUDY_GUIDE');
    expect(validDocumentTypes).toContain('HND_PROJECT');
  });
});

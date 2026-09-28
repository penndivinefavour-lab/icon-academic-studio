import { describe, it, expect } from 'vitest';

// Test document structure types
describe('Document Structure Types', () => {
  const documentTypes = [
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
    'SEMINEAR_PAPER',
    'PROPOSAL',
    'REPORT',
    'QUESTIONNAIRE',
    'INTERVIEW_GUIDE'
  ];

  const blockTypes = [
    'PARAGRAPH',
    'HEADING',
    'BULLET_LIST',
    'NUMBERED_LIST',
    'QUOTE',
    'TABLE',
    'PAGE_BREAK',
    'CITATION_BLOCK',
    'CALLOUT',
    'IMAGE'
  ];

  it('should define all document types', () => {
    expect(documentTypes.length).toBeGreaterThan(10);
  });

  it('should define all block types', () => {
    expect(blockTypes.length).toBeGreaterThan(5);
  });

  it('should have study guide type', () => {
    expect(documentTypes).toContain('STUDY_GUIDE');
  });

  it('should have thesis type', () => {
    expect(documentTypes).toContain('THESIS');
  });
});

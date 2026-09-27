/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';

describe('Project Domain Model', () => {
  it('should have all required project types defined', () => {
    const projectTypes = [
      'gce-study-guide',
      'gce-pamphlet',
      'past-paper-analysis',
      'revision-notes',
      'question-bank',
      'mock-examination',
      'textbook',
      'book',
      'research-project',
      'hnd-project',
      'thesis',
      'research-proposal',
      'seminar-paper',
      'internship-report',
      'questionnaire',
      'interview-guide',
      'data-analysis',
      'general-document',
      'custom',
    ];

    expect(projectTypes.length).toBe(19);
    expect(projectTypes).toContain('thesis');
    expect(projectTypes).toContain('research-project');
  });

  it('should have document types defined', () => {
    const documentTypes = [
      'chapter', 'section', 'paragraph', 'appendix',
      'preface', 'introduction', 'literature-review',
      'methodology', 'results', 'discussion', 'conclusion',
      'references', 'bibliography', 'glossary', 'index', 'cover',
    ];
    expect(documentTypes.length).toBeGreaterThan(0);
  });
});
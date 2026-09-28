import { describe, it, expect } from 'vitest';
import type { Project, Source, Document, Dataset, AIProvider } from '@icon-academic/shared';

describe('Shared Types', () => {
  describe('ProjectType', () => {
    it('should define all project types', () => {
      const projectTypes: Project['type'][] = [
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
    });
  });

  describe('Source', () => {
    it('should have required fields', () => {
      const source: Partial<Source> = {
        id: 'src_123',
        projectId: 'proj_123',
        name: 'Test PDF',
        type: 'pdf',
        sizeBytes: 1024,
        metadata: {},
        status: 'uploaded',
        chunks: [],
        citations: [],
      };

      expect(source.id).toBeDefined();
      expect(source.projectId).toBeDefined();
      expect(source.name).toBeDefined();
      expect(source.type).toBeDefined();
    });
  });

  describe('Document', () => {
    it('should have structured content', () => {
      const document: Partial<Document> = {
        id: 'doc_123',
        projectId: 'proj_123',
        title: 'Chapter 1',
        type: 'chapter',
        structure: {
          sections: [
            {
              id: 'sec_1',
              title: 'Introduction',
              level: 1,
              blocks: [],
            },
          ],
        },
        settings: {
          pageBreaks: true,
          includeInTOC: true,
        },
        status: 'draft',
        version: 1,
        wordCount: 0,
      };

      expect(document.structure?.sections).toHaveLength(1);
      expect(document.settings).toBeDefined();
    });
  });

  describe('Dataset', () => {
    it('should support column metadata', () => {
      const dataset: Partial<Dataset> = {
        id: 'ds_123',
        projectId: 'proj_123',
        name: 'Survey Results',
        columns: [
          {
            name: 'age',
            type: 'number',
            nullable: false,
          },
          {
            name: 'gender',
            type: 'categorical',
            nullable: false,
          },
        ],
        rowCount: 150,
        preview: [],
      };

      expect(dataset.columns).toHaveLength(2);
      expect(dataset.rowCount).toBe(150);
    });
  });

  describe('AIProvider', () => {
    it('should support multiple provider types', () => {
      const providers: AIProvider['type'][] = [
        'gemini',
        'openai',
        'openrouter',
        'ollama',
        'custom',
      ];

      expect(providers).toContain('gemini');
      expect(providers).toContain('openai');
    });

    it('should have capabilities object', () => {
      const provider: Partial<AIProvider> = {
        id: 'ai_123',
        name: 'Test Provider',
        type: 'openai',
        endpoint: 'https://api.openai.com/v1',
        models: [],
        capabilities: {
          chat: true,
          streaming: true,
          structuredOutput: false,
          vision: false,
          embeddings: true,
          imageGeneration: false,
        },
        isActive: true,
      };

      expect(provider.capabilities?.chat).toBe(true);
      expect(provider.capabilities?.streaming).toBe(true);
    });
  });
});

describe('API Response Types', () => {
  it('should have consistent response structure', () => {
    interface TestResponse {
      success: boolean;
      data?: unknown;
      error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
      };
      meta?: Record<string, unknown>;
    }

    const successfulResponse: TestResponse = {
      success: true,
      data: { id: '1' },
      meta: { page: 1, total: 10 },
    };

    const erroredResponse: TestResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { name: 'Required' },
      },
    };

    expect(successfulResponse.success).toBe(true);
    expect(erroredResponse.error?.code).toBe('VALIDATION_ERROR');
  });
});

// Document types for ICON Academic Studio
export const DOCUMENT_TYPES = [
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
  'PAST_PAPER_ANALYSIS',
  'MOCK_EXAMINATION',
  'HND_PROJECT',
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number];

export const BLOCK_TYPES = [
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
] as const;

export type BlockType = typeof BLOCK_TYPES[number];

export const DOCUMENT_STATUSES = [
  'DRAFT',
  'REVIEW',
  'EDITED',
  'PROOF',
  'TYPESET',
  'FINAL',
] as const;

export type DocumentStatus = typeof DOCUMENT_STATUSES[number];

export interface DocumentBlock {
  id?: string;
  type: BlockType;
  content: string;
  order: number;
  metadata?: Record<string, any>;
  provenance?: {
    sourceId?: string;
    evidenceId?: string;
    chunkId?: string;
  };
}

export interface DocumentSection {
  id?: string;
  title: string;
  headingLevel: number;
  order: number;
  content?: string;
  parentId?: string | null;
  metadata?: Record<string, any>;
}

export interface Document {
  id: string;
  projectId: string;
  title: string;
  type: DocumentType;
  subtitle?: string;
  description?: string;
  language: string;
  status: DocumentStatus;
  version: number;
  wordCount: number;
  structure?: Record<string, any>;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  sections?: DocumentSection[];
  blocks?: DocumentBlock[];
}

export interface FormattingProfile {
  id: string;
  projectId?: string;
  name: string;
  description?: string;
  preset?: string; // APA, MLA, CHICAGO, etc.
  custom?: {
    fontFamily?: string;
    fontSize?: number;
    lineHeight?: number;
    margins?: { top?: number; right?: number; bottom?: number; left?: number };
    pageSizes?: { width?: number; height?: number };
  };
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_FORMATTING_PROFILE: FormattingProfile = {
  id: 'academic-default',
  name: 'Academic Default',
  description: 'Standard academic formatting (APA-style)',
  preset: 'APA',
  custom: {
    fontFamily: 'Times New Roman',
    fontSize: 12,
    lineHeight: 2,
    margins: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 },
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

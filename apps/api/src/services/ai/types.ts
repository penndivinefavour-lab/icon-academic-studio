/**
 * ICON Academic Studio — AI Types (Phase 8)
 */

export type AIGenerationOperation =
  | 'summarize-source'
  | 'explain-concept'
  | 'extract-claims'
  | 'compare-sources'
  | 'identify-evidence'
  | 'generate-research-questions'
  | 'literature-synthesis'
  | 'create-outline'
  | 'draft-section'
  | 'expand-section'
  | 'condense-section'
  | 'rewrite-for-clarity'
  | 'improve-tone'
  | 'draft-conclusion'
  | 'draft-recommendations'
  | 'draft-methodology'
  | 'draft-objectives'
  | 'draft-research-questions'
  | 'draft-hypotheses'
  | 'suggest-variables'
  | 'explain-dataset'
  | 'explain-result'
  | 'explain-chart'
  | 'draft-findings'
  | 'draft-discussion'
  | 'explain-question'
  | 'generate-practice'
  | 'explain-marking'
  | 'create-revision-notes'
  | 'draft-chapter'
  | 'summarize-chapter'
  | 'create-intro'
  | 'create-conclusion'
  | 'explain-glossary-term';

export interface AIGenerationContext {
  _type?: string;
  _id?: string;
  sources?: string[];
  evidence?: string[];
  document?: string;
  section?: string;
  dataset?: string;
  analysis?: string;
  chart?: string;
  academicProject?: string;
  pastPaper?: string;
  question?: string;
  syllabus?: string;
  topic?: string;
  markingScheme?: string;
  publication?: string;
  chapter?: string;
  glossaryTerm?: string;
}

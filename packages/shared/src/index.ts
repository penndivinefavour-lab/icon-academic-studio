/**
 * ICON Academic Studio — Shared Types
 * 
 * These types are imported by both the API and web applications.
 * Changes here affect the entire system.
 */

// ============================================================================
// PROJECT TYPES
// ============================================================================

export type ProjectType =
  | 'gce-study-guide'
  | 'gce-pamphlet'
  | 'past-paper-analysis'
  | 'revision-notes'
  | 'question-bank'
  | 'mock-examination'
  | 'textbook'
  | 'book'
  | 'research-project'
  | 'hnd-project'
  | 'thesis'
  | 'research-proposal'
  | 'seminar-paper'
  | 'internship-report'
  | 'questionnaire'
  | 'interview-guide'
  | 'data-analysis'
  | 'general-document'
  | 'custom';

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: ProjectType;
  workspaceId?: string;
  settings: ProjectSettings;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectStatus = 'draft' | 'in-progress' | 'review' | 'completed' | 'archived';

export interface ProjectSettings {
  formattingProfileId?: string;
  aiProviderId?: string;
  citationStyle: CitationStyle;
  language: string;
  metadata: Record<string, unknown>;
}

export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'harvard' | 'ieee' | 'gbt7714' | 'custom';

// ============================================================================
// SOURCE TYPES
// ============================================================================

export type SourceType =
  | 'pdf'
  | 'docx'
  | 'txt'
  | 'markdown'
  | 'csv'
  | 'xlsx'
  | 'image'
  | 'web'
  | 'note'
  | 'manual';

export interface Source {
  id: string;
  projectId: string;
  name: string;
  type: SourceType;
  mimeType?: string;
  sizeBytes: number;
  filePath?: string;
  contentPreview?: string;
  metadata: SourceMetadata;
  status: SourceStatus;
  chunks: SourceChunk[];
  citations: Citation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SourceMetadata {
  title?: string;
  author?: string;
  publicationDate?: string;
  pageLength?: number;
  wordCount?: number;
  extractionMethod?: string;
  ocrRequired?: boolean;
  custom?: Record<string, unknown>;
}

export type SourceStatus = 'uploaded' | 'processing' | 'processed' | 'error' | 'deleted';

export interface SourceChunk {
  id: string;
  sourceId: string;
  index: number;
  content: string;
  metadata: Record<string, unknown>;
}

export interface SourceCollection {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  sources: Source[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export type DocumentType =
  | 'chapter'
  | 'section'
  | 'subsection'
  | 'paragraph'
  | 'appendix'
  | 'preface'
  | 'introduction'
  | 'literature-review'
  | 'methodology'
  | 'results'
  | 'discussion'
  | 'conclusion'
  | 'references'
  | 'bibliography'
  | 'glossary'
  | 'index'
  | 'cover';

export interface Document {
  id: string;
  projectId: string;
  title: string;
  type: DocumentType;
  structure: DocumentStructure;
  settings: DocumentSettings;
  status: DocumentStatus;
  version: number;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentStructure {
  sections: DocumentSection[];
  references?: Reference[];
  appendices?: Appendix[];
}

export interface DocumentSection {
  id: string;
  title: string;
  level: number;
  blocks: DocumentBlock[];
  subsections?: DocumentSection[];
}

export type DocumentBlockType =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'ordered-list'
  | 'table'
  | 'figure'
  | 'code'
  | 'blockquote'
  | 'page-break'
  | 'citation-block';

export interface DocumentBlock {
  id: string;
  type: DocumentBlockType;
  content: string | TableData | FigureData;
  citations?: Citation[];
  metadata?: Record<string, unknown>;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface FigureData {
  type: 'image' | 'chart' | 'diagram';
  source?: string;
  caption: string;
  altText?: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentSettings {
  formattingProfileId?: string;
  pageBreaks: boolean;
  includeInTOC: boolean;
  customStyles?: Record<string, unknown>;
}

export type DocumentStatus = 'draft' | 'review' | 'edited' | 'proof' | 'typeset' | 'final';

export interface Reference {
  id: string;
  documentId: string;
  citation: Citation;
  formatted: string;
}

export interface Citation {
  id: string;
  sourceId: string;
  author?: string;
  year?: string;
  title?: string;
  url?: string;
  doi?: string;
  pageRange?: string;
  format: CitationFormat;
  raw: string;
  verified: boolean;
  context?: string;
}

export type CitationFormat = 'inline' | 'footnote' | 'endnote' | 'bibliography';

export interface Appendix {
  id: string;
  title: string;
  blocks: DocumentBlock[];
}

// ============================================================================
// RESEARCH TYPES
// ============================================================================

export interface ResearchNote {
  id: string;
  projectId: string;
  title: string;
  content: string;
  tags: string[];
  sources: string[];
  linkedDocuments: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ResearchQuestion {
  id: string;
  projectId: string;
  question: string;
  hypothesis?: string;
  status: ResearchQuestionStatus;
  evidenceItems: EvidenceItem[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ResearchQuestionStatus = 'open' | 'investigating' | 'answered' | 'closed';

export interface EvidenceItem {
  id: string;
  researchQuestionId: string;
  sourceId: string;
  claim: string;
  supportingEvidence: string;
  strength: EvidenceStrength;
  createdAt: Date;
}

export type EvidenceStrength = 'strong' | 'moderate' | 'weak' | 'uncertain';

// ============================================================================
// DATASET TYPES
// ============================================================================

export interface Dataset {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  file?: FileReference;
  columns: DatasetColumn[];
  rowCount: number;
  preview: Record<string, unknown>[];
  analysis?: Analysis;
  charts: Chart[];
  tables: Table[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FileReference {
  path: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface DatasetColumn {
  name: string;
  type: ColumnType;
  nullable: boolean;
  unique?: boolean;
  description?: string;
  statistics?: ColumnStatistics;
}

export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'categorical' | 'ordinal';

export interface ColumnStatistics {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  nullCount?: number;
  frequencyTable?: Record<string, number>;
}

export interface Analysis {
  id: string;
  datasetId: string;
  method: string;
  parameters: Record<string, unknown>;
  results: Record<string, unknown>;
  notes?: string;
  createdAt: Date;
}

export interface Chart {
  id: string;
  datasetId: string;
  type: ChartType;
  config: ChartConfig;
  data: Record<string, unknown>[];
  imageUrl?: string;
  title?: string;
  createdAt: Date;
}

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'histogram' | 'boxplot';

export interface ChartConfig {
  xField?: string;
  yField?: string;
  categoryField?: string;
  groupField?: string;
  aggregate?: 'sum' | 'mean' | 'count' | 'max' | 'min' | 'median';
  [key: string]: unknown;
}

export interface Table {
  id: string;
  datasetId: string;
  title: string;
  headers: string[];
  rows: (string | number | null)[][];
  caption?: string;
  note?: string;
  createdAt: Date;
}

// ============================================================================
// AI PROVIDER TYPES
// ============================================================================

export interface AIProvider {
  id: string;
  name: string;
  type: ProviderType;
  endpoint: string;
  apiKeyId?: string;
  models: AIModel[];
  capabilities: ProviderCapabilities;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ProviderType = 'gemini' | 'openai' | 'openrouter' | 'ollama' | 'custom';

export interface ProviderCapabilities {
  chat: boolean;
  streaming: boolean;
  structuredOutput: boolean;
  vision: boolean;
  embeddings: boolean;
  imageGeneration: boolean;
}

export interface AIModel {
  id: string;
  providerId: string;
  name: string;
  identifier: string;
  capabilities: ModelCapabilities;
  contextWindow: number;
  maxTokens?: number;
  costPerToken?: CostPerToken;
  isDefault: boolean;
}

export interface ModelCapabilities {
  chat: boolean;
  functionCalling: boolean;
  vision: boolean;
  structuredOutput: boolean;
}

export interface CostPerToken {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  currency: string;
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export interface Template {
  id: string;
  name: string;
  description?: string;
  type: TemplateType;
  projectType: ProjectType;
  structure: TemplateStructure;
  formattingProfile?: FormattingProfile;
  variables: TemplateVariable[];
  createdAt: Date;
  updatedAt: Date;
}

export type TemplateType = 'document' | 'section' | 'exam' | 'questionnaire' | 'report';

export interface TemplateStructure {
  sections: TemplateSection[];
}

export interface TemplateSection {
  id: string;
  title: string;
  placeholder?: string;
  required: boolean;
  order: number;
}

export interface TemplateVariable {
  id: string;
  name: string;
  label: string;
  type: VariableType;
  defaultValue?: string;
  required: boolean;
}

export type VariableType = 'text' | 'number' | 'date' | 'select' | 'boolean' | 'file';

// ============================================================================
// FORMATTING TYPES
// ============================================================================

export interface FormattingProfile {
  id: string;
  name: string;
  description?: string;
  preset?: FormattingPreset;
  custom: FormattingCustom;
  createdAt: Date;
  updatedAt: Date;
}

export type FormattingPreset = 'apa' | 'mla' | 'chicago' | 'harvard' | 'ieee' | 'gbt7714' | 'custom';

export interface FormattingCustom {
  page: PageFormat;
  typography: Typography;
  spacing: Spacing;
  alignment: Alignment;
  indentation: Indentation;
  headersFooters: HeadersFooters;
  citations: CitationFormatting;
  tables: TableFormatting;
  figures: FigureFormatting;
  toc: TOCSettings;
  coverPage: CoverPageSettings;
}

export interface PageFormat {
  size: PageSize;
  orientation: 'portrait' | 'landscape';
  margins: Margins;
}

export type PageSize = 'A4' | 'A5' | 'Letter' | 'Legal' | 'Custom';

export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
  unit: 'mm' | 'inches';
}

export interface Typography {
  fontFamily: string;
  fontSize: number;
  headingSizes: Record<string, number>;
  lineHeight: number;
}

export interface Spacing {
  lineSpacing: number;
  paragraphSpacing: number;
  paragraphIndent: number;
}

export interface Alignment {
  default: 'left' | 'right' | 'center' | 'justify';
  headings?: 'left' | 'right' | 'center' | 'justify';
}

export interface Indentation {
  firstLine: boolean;
  firstLineSize: number;
  hanging: boolean;
}

export interface HeadersFooters {
  enabled: boolean;
  header?: string;
  footer?: string;
  pageNumber: boolean;
  oddEvenDifferent: boolean;
}

export interface CitationFormatting {
  style: CitationStyle;
  position: 'inline' | 'footnote' | 'endnote';
  format: string;
}

export interface TableFormatting {
  captionPosition: 'above' | 'below';
  numbering: boolean;
  style: 'simple' | 'grid' | 'minimal';
}

export interface FigureFormatting {
  captionPosition: 'above' | 'below';
  numbering: boolean;
  labelFormat: 'figure' | 'plate' | 'scheme';
}

export interface TOCSettings {
  enabled: boolean;
  chapters: number;
  excludeReferences: boolean;
  numbering: boolean;
}

export interface CoverPageSettings {
  enabled: boolean;
  layout: 'minimal' | 'formal' | 'creative';
  elements: CoverElement[];
}

export type CoverElement = 'title' | 'subtitle' | 'author' | 'institution' | 'date' | 'logo' | 'course';

// ============================================================================
// REVIEW & EXPORT TYPES
// ============================================================================

export interface ReviewItem {
  id: string;
  documentId: string;
  blockId?: string;
  type: ReviewType;
  status: ReviewStatus;
  reviewer?: string;
  feedback: string;
  resolution?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export type ReviewType = 'fact-check' | 'grammar' | 'style' | 'citation' | 'content' | 'formatting';
export type ReviewStatus = 'pending' | 'addressed' | 'resolved' | 'rejected';

export interface ExportJob {
  id: string;
  documentId?: string;
  datasetId?: string;
  templateId?: string;
  format: ExportFormat;
  status: ExportStatus;
  outputPath?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export type ExportFormat = 'docx' | 'pdf' | 'markdown' | 'html' | 'txt';
export type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ExportArtifact {
  id: string;
  jobId: string;
  format: ExportFormat;
  path: string;
  size: number;
  checksum: string;
  createdAt: Date;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ResponseMeta;
}

// ============================================================================
// GENERATION & JOB TYPES
// ============================================================================

export interface GenerationJob {
  id: string;
  projectId: string;
  type: JobType;
  status: JobStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  progress?: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export type JobType =
  | 'generate-section'
  | 'generate-chapter'
  | 'generate-question'
  | 'analyze-data'
  | 'extract-source'
  | 'format-document'
  | 'export-document'
  | 'review-content';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// ============================================================================
// QUESTION/EXAMINATION TYPES
// ============================================================================

export interface Question {
  id: string;
  projectId: string;
  type: QuestionType;
  subject: string;
  topic: string;
  subtopic?: string;
  year?: number;
  paper?: string;
  marks: number;
  difficulty: Difficulty;
  stem: string;
  options?: Option[];
  answer?: string;
  markingScheme?: MarkingScheme;
  sources: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type QuestionType = 'multiple-choice' | 'short-answer' | 'essay' | 'calculation' | 'case-study';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface Option {
  id: string;
  text: string;
  correct: boolean;
}

export interface MarkingScheme {
  points: MarkPoint[];
  total: number;
  rubric?: string;
}

export interface MarkPoint {
  description: string;
  marks: number;
}

// ============================================================================
// SYLLABUS/EXAMINATION TYPES
// ============================================================================

export interface Syllabus {
  id: string;
  subject: string;
  examBoard: string;
  year: number;
  topics: Topic[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Topic {
  id: string;
  name: string;
  code?: string;
  weight?: number;
  subtopics?: Subtopic[];
  pastPaperOccurrences?: PastPaperOccurrence[];
}

export interface Subtopic {
  id: string;
  name: string;
  code?: string;
  topics?: SubSubtopic[];
}

export interface SubSubtopic {
  id: string;
  name: string;
  code?: string;
}

export interface PastPaperOccurrence {
  year: number;
  paper: string;
  questionNumbers?: string[];
  marks: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface IDomainEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type StrictUnion<T> = T extends object ? { [K in keyof T]: T[K] } & Partial<Record<Exclude<keyof T, K>, never>> : T;

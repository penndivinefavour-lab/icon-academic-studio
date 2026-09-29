/**
 * ICON Academic Studio — Academic Project Templates (Phase 6)
 *
 * Structural definitions only. No generated academic content.
 * Templates define chapters, standard sections, front matter, formatting
 * defaults and citation-style defaults. Content is authored by the user.
 */

export type AcademicProjectType =
  | 'HND_PROJECT'
  | 'HND_RESEARCH_PROJECT'
  | 'BACHELOR_RESEARCH_PROJECT'
  | 'THESIS'
  | 'DISSERTATION'
  | 'RESEARCH_PROPOSAL'
  | 'SEMINAR_PAPER'
  | 'INTERNSHIP_REPORT'
  | 'INDUSTRIAL_TRAINING_REPORT'
  | 'PROJECT_REPORT'
  | 'ACADEMIC_ESSAY'
  | 'CASE_STUDY'
  | 'LITERATURE_REVIEW'
  | 'RESEARCH_PAPER'
  | 'QUESTIONNAIRE'
  | 'INTERVIEW_GUIDE'
  | 'CUSTOM';

export const ALL_PROJECT_TYPES: AcademicProjectType[] = [
  'HND_PROJECT',
  'HND_RESEARCH_PROJECT',
  'BACHELOR_RESEARCH_PROJECT',
  'THESIS',
  'DISSERTATION',
  'RESEARCH_PROPOSAL',
  'SEMINAR_PAPER',
  'INTERNSHIP_REPORT',
  'INDUSTRIAL_TRAINING_REPORT',
  'PROJECT_REPORT',
  'ACADEMIC_ESSAY',
  'CASE_STUDY',
  'LITERATURE_REVIEW',
  'RESEARCH_PAPER',
  'QUESTIONNAIRE',
  'INTERVIEW_GUIDE',
  'CUSTOM',
];

export interface ChapterSpec {
  chapterNumber: number;
  title: string;
  description?: string;
  wordTarget?: number;
  isFrontMatter?: boolean;
  isAppendix?: boolean;
  required?: boolean;
  standardSections?: string[];
}

export interface FrontMatterSpec {
  kind: string;
  title: string;
  required: boolean;
  order: number;
}

export interface AcademicTemplateDef {
  projectType: AcademicProjectType;
  name: string;
  description: string;
  academicLevel: string;
  citationStyle: string;
  formattingPreset: string;
  chapters: ChapterSpec[];
  frontMatter: FrontMatterSpec[];
  appendixTypes: string[];
  methodologySections: string[];
  defaultRequirements: Array<{
    category: string;
    rule: string;
    parameters?: Record<string, unknown>;
    severity: string;
    description: string;
  }>;
}

// ---------------------------------------------------------------------------
// Front matter sets
// ---------------------------------------------------------------------------

const FRONT_MATTER_FULL: FrontMatterSpec[] = [
  { kind: 'COVER_PAGE', title: 'Cover Page', required: true, order: 0 },
  { kind: 'TITLE_PAGE', title: 'Title Page', required: true, order: 1 },
  { kind: 'DECLARATION', title: 'Declaration', required: true, order: 2 },
  { kind: 'CERTIFICATION', title: 'Certification', required: false, order: 3 },
  { kind: 'APPROVAL_PAGE', title: 'Approval Page', required: false, order: 4 },
  { kind: 'DEDICATION', title: 'Dedication', required: false, order: 5 },
  { kind: 'ACKNOWLEDGEMENTS', title: 'Acknowledgements', required: true, order: 6 },
  { kind: 'ABSTRACT', title: 'Abstract', required: true, order: 7 },
  { kind: 'TABLE_OF_CONTENTS', title: 'Table of Contents', required: true, order: 8 },
  { kind: 'LIST_OF_TABLES', title: 'List of Tables', required: false, order: 9 },
  { kind: 'LIST_OF_FIGURES', title: 'List of Figures', required: false, order: 10 },
  { kind: 'LIST_OF_ABBREVIATIONS', title: 'List of Abbreviations', required: false, order: 11 },
  { kind: 'LIST_OF_APPENDICES', title: 'List of Appendices', required: false, order: 12 },
];

const FRONT_MATTER_MINIMAL: FrontMatterSpec[] = [
  { kind: 'TITLE_PAGE', title: 'Title Page', required: true, order: 0 },
  { kind: 'ABSTRACT', title: 'Abstract', required: false, order: 1 },
];

// ---------------------------------------------------------------------------
// Methodology section sets
// ---------------------------------------------------------------------------

const METHODOLOGY_FULL = [
  'RESEARCH_DESIGN',
  'STUDY_AREA',
  'POPULATION',
  'SAMPLE',
  'SAMPLING_TECHNIQUE',
  'DATA_COLLECTION_INSTRUMENT',
  'VALIDITY',
  'RELIABILITY',
  'DATA_COLLECTION_PROCEDURE',
  'DATA_ANALYSIS',
  'ETHICAL_CONSIDERATIONS',
];

const METHODOLOGY_MINIMAL = [
  'RESEARCH_DESIGN',
  'POPULATION',
  'SAMPLE',
  'DATA_COLLECTION_INSTRUMENT',
  'DATA_ANALYSIS',
];

// ---------------------------------------------------------------------------
// Standard 5-chapter research structure
// ---------------------------------------------------------------------------

const CHAPTERS_5: ChapterSpec[] = [
  {
    chapterNumber: 1,
    title: 'Introduction',
    description: 'Background, problem statement, objectives, research questions and significance.',
    wordTarget: 3000,
    standardSections: [
      'Introduction',
      'Background of the Study',
      'Statement of the Problem',
      'Purpose of the Study',
      'Objectives',
      'Research Questions',
      'Research Hypotheses',
      'Significance of the Study',
      'Scope of the Study',
      'Definition of Terms',
    ],
  },
  {
    chapterNumber: 2,
    title: 'Literature Review',
    description: 'Conceptual, theoretical and empirical review with research gap.',
    wordTarget: 5000,
    standardSections: [
      'Introduction',
      'Conceptual Review',
      'Theoretical Review',
      'Empirical Review',
      'Research Gap',
    ],
  },
  {
    chapterNumber: 3,
    title: 'Research Methodology',
    description: 'Design, population, sampling, instruments, validity, reliability and analysis.',
    wordTarget: 2500,
    standardSections: [
      'Introduction',
      'Research Design',
      'Population',
      'Sample',
      'Sampling Technique',
      'Instruments',
      'Validity',
      'Reliability',
      'Data Collection',
      'Data Analysis',
      'Ethical Considerations',
    ],
  },
  {
    chapterNumber: 4,
    title: 'Results and Findings',
    description: 'Data presentation, analysis and findings.',
    wordTarget: 3000,
    standardSections: ['Introduction', 'Data Presentation', 'Analysis', 'Findings'],
  },
  {
    chapterNumber: 5,
    title: 'Discussion, Conclusion and Recommendations',
    description: 'Discussion, conclusions, recommendations, limitations and further research.',
    wordTarget: 2500,
    standardSections: [
      'Introduction',
      'Discussion',
      'Conclusion',
      'Recommendations',
      'Limitations',
      'Suggestions for Further Research',
    ],
  },
];

const APPENDIX_TYPES_FULL = [
  'QUESTIONNAIRE',
  'INTERVIEW_GUIDE',
  'CONSENT_FORM',
  'RAW_DATA',
  'ADDITIONAL_TABLE',
  'ADDITIONAL_FIGURE',
  'APPROVAL_LETTER',
  'SUPPORTING_DOCUMENT',
];

// ---------------------------------------------------------------------------
// Requirement sets
// ---------------------------------------------------------------------------

const REQUIREMENTS_FULL = [
  { category: 'CONTENT', rule: 'MIN_TOTAL_WORDS', parameters: { minimum: 10000 }, severity: 'WARNING', description: 'Total project word count should meet the minimum target.' },
  { category: 'CONTENT', rule: 'OBJECTIVES_DEFINED', severity: 'ERROR', description: 'At least one general objective and one specific objective are required.' },
  { category: 'CONTENT', rule: 'RESEARCH_QUESTIONS_DEFINED', severity: 'ERROR', description: 'At least one research question is required.' },
  { category: 'REFERENCE', rule: 'MIN_REFERENCES', parameters: { minimum: 15 }, severity: 'WARNING', description: 'Minimum number of references should be cited.' },
  { category: 'REFERENCE', rule: 'NO_UNCITED_REFERENCES', severity: 'WARNING', description: 'Every listed reference should be cited in the body.' },
  { category: 'REFERENCE', rule: 'NO_MISSING_REFERENCES', severity: 'ERROR', description: 'Every in-text citation must appear in the reference list.' },
  { category: 'DATA', rule: 'FINDINGS_HAVE_PROVENANCE', severity: 'ERROR', description: 'Every finding must reference an analysis, table, chart or verified user-entered value.' },
  { category: 'DATA', rule: 'TABLES_HAVE_SOURCE_DATA', severity: 'ERROR', description: 'Every table must be linked to source data.' },
  { category: 'DATA', rule: 'CHARTS_HAVE_SOURCE_DATA', severity: 'ERROR', description: 'Every figure must be linked to source data.' },
  { category: 'FORMATTING', rule: 'FORMATTING_PROFILE_APPLIED', severity: 'WARNING', description: 'A formatting profile must be applied.' },
  { category: 'FORMATTING', rule: 'REQUIRED_FRONT_MATTER', severity: 'WARNING', description: 'All required front matter sections must be present.' },
];

// ---------------------------------------------------------------------------
// The 12 required templates + research variants
// ---------------------------------------------------------------------------

export const ACADEMIC_TEMPLATES: AcademicTemplateDef[] = [
  {
    projectType: 'HND_PROJECT',
    name: 'HND Project',
    description: 'Higher National Diploma project with full front matter and 5 chapters.',
    academicLevel: 'HND',
    citationStyle: 'APA',
    formattingPreset: 'APA',
    chapters: CHAPTERS_5,
    frontMatter: FRONT_MATTER_FULL,
    appendixTypes: APPENDIX_TYPES_FULL,
    methodologySections: METHODOLOGY_FULL,
    defaultRequirements: REQUIREMENTS_FULL,
  },
  {
    projectType: 'HND_RESEARCH_PROJECT',
    name: 'HND Research Project',
    description: 'HND research project with empirical methodology and findings traceability.',
    academicLevel: 'HND',
    citationStyle: 'APA',
    formattingPreset: 'APA',
    chapters: CHAPTERS_5,
    frontMatter: FRONT_MATTER_FULL,
    appendixTypes: APPENDIX_TYPES_FULL,
    methodologySections: METHODOLOGY_FULL,
    defaultRequirements: REQUIREMENTS_FULL,
  },
  {
    projectType: 'BACHELOR_RESEARCH_PROJECT',
    name: "Bachelor's Research Project",
    description: "Bachelor's degree research project with full academic structure.",
    academicLevel: 'BACHELOR',
    citationStyle: 'APA',
    formattingPreset: 'APA',
    chapters: CHAPTERS_5,
    frontMatter: FRONT_MATTER_FULL,
    appendixTypes: APPENDIX_TYPES_FULL,
    methodologySections: METHODOLOGY_FULL,
    defaultRequirements: REQUIREMENTS_FULL,
  },
  {
    projectType: 'THESIS',
    name: 'Thesis',
    description: 'Master thesis with extended literature review and rigorous methodology.',
    academicLevel: 'MASTER',
    citationStyle: 'APA',
    formattingPreset: 'APA',
    chapters: CHAPTERS_5,
    frontMatter: FRONT_MATTER_FULL,
    appendixTypes: APPENDIX_TYPES_FULL,
    methodologySections: METHODOLOGY_FULL,
    defaultRequirements: [
      ...REQUIREMENTS_FULL.filter((r) => r.rule !== 'MIN_TOTAL_WORDS'),
      { category: 'CONTENT', rule: 'MIN_TOTAL_WORDS', parameters: { minimum: 20000 }, severity: 'WARNING', description: 'A thesis should meet the extended word-count target.' },
      { category: 'CONTENT', rule: 'HYPOTHESES_OR_QUESTIONS', severity: 'WARNING', description: 'A thesis should define hypotheses or explicit research questions.' },
    ],
  },
  {
    projectType: 'DISSERTATION',
    name: 'Dissertation',
    description: 'Doctoral dissertation with comprehensive structure and validation.',
    academicLevel: 'DOCTORATE',
    citationStyle: 'APA',
    formattingPreset: 'APA',
    chapters: CHAPTERS_5,
    frontMatter: FRONT_MATTER_FULL,
    appendixTypes: APPENDIX_TYPES_FULL,
    methodologySections: METHODOLOGY_FULL,
    defaultRequirements: REQUIREMENTS_FULL,
  },
  {
    projectType: 'RESEARCH_PROPOSAL',
    name: 'Research Proposal',
    description: 'Research proposal: problem, objectives, methodology and work plan.',
    academicLevel: 'BACHELOR',
    citationStyle: 'APA',
    formattingPreset: 'APA',
    chapters: [
      { chapterNumber: 1, title: 'Introduction', wordTarget: 1500, standardSections: ['Background', 'Problem Statement', 'Objectives', 'Research Questions', 'Significance'] },
      { chapterNumber: 2, title: 'Literature Review', wordTarget: 2000, standardSections: ['Conceptual Review', 'Theoretical Review', 'Research Gap'] },
      { chapterNumber: 3, title: 'Methodology', wordTarget: 1500, standardSections: METHODOLOGY_MINIMAL },
    ],
    frontMatter: FRONT_MATTER_MINIMAL,
    appendixTypes: ['QUESTIONNAIRE', 'INTERVIEW_GUIDE'],
    methodologySections: METHODOLOGY_MINIMAL,
    defaultRequirements: REQUIREMENTS_FULL.filter((r) => r.rule !== 'MIN_TOTAL_WORDS'),
  },
  {
    projectType: 'SEMINAR_PAPER',
    name: 'Seminar Paper',
    description: 'Seminar paper with focused topic and evidence-based argument.',
    academicLevel: 'BACHELOR',
    citationStyle: 'APA',
    formattingPreset: 'APA',
    chapters: [
      { chapterNumber: 1, title: 'Introduction', wordTarget: 800, standardSections: ['Background', 'Objectives'] },
      { chapterNumber: 2, title: 'Main Content', wordTarget: 2000, standardSections: ['Discussion'] },
      { chapterNumber: 3, title: 'Conclusion', wordTarget: 600, standardSections: ['Conclusion', 'References'] },
    ],
    frontMatter: FRONT_MATTER_MINIMAL,
    appendixTypes: [],
    methodologySections: METHODOLOGY_MINIMAL,
    defaultRequirements: REQUIREMENTS_FULL.filter((r) => !['MIN_TOTAL_WORDS', 'MIN_REFERENCES'].includes(r.rule)),
  },
  {
    projectType: 'INTERNSHIP_REPORT',
    name: 'Internship Report',
    description: 'Internship report: organisation, activities, learning and recommendations.',
    academicLevel: 'HND',
    citationStyle: 'APA',
    formattingPreset: 'APA',
    chapters: [
      { chapterNumber: 1, title: 'Introduction', wordTarget: 1000, standardSections: ['Background', 'Objectives of the Internship', 'Scope'] },
      { chapterNumber: 2, title: 'The Organisation', wordTarget: 1200, standardSections: ['Overview', 'Departments', 'Activities'] },
      { chapterNumber: 3, title: 'Internship Activities', wordTarget: 1500, standardSections: ['Tasks', 'Challenges', 'Solutions'] },
      { chapterNumber: 4, title: 'Learning and Reflection', wordTarget: 1200, standardSections: ['Skills Acquired', 'Reflection'] },
      { chapterNumber: 5, title: 'Conclusion and Recommendations', wordTarget: 800, standardSections: ['Conclusion', 'Recommendations'] },
    ],
    frontMatter: FRONT_MATTER_FULL.filter((f) => ['COVER_PAGE', 'TITLE_PAGE', 'DECLARATION', 'ACKNOWLEDGEMENTS', 'TABLE_OF_CONTENTS'].includes(f.kind)),
    appendixTypes: ['APPROVAL_LETTER', 'SUPPORTING_DOCUMENT'],
    methodologySections: [],
    defaultRequirements: REQUIREMENTS_FULL.filter((r) => !['MIN_TOTAL_WORDS', 'MIN_REFERENCES'].includes(r.rule)),
  },
  {
    projectType: 'INDUSTRIAL_TRAINING_REPORT',
    name: 'Industrial Training Report',
    description: 'Industrial training report documenting technical experience.',
    academicLevel: 'HND',
    citationStyle: 'APA',
    formattingPreset: 'APA',
    chapters: [
      { chapterNumber: 1, title: 'Introduction', wordTarget: 1000, standardSections: ['Background', 'Training Objectives'] },
      { chapterNumber: 2, title: 'Training Environment', wordTarget: 1000, standardSections: ['Company Overview', 'Technologies'] },
      { chapterNumber: 3, title: 'Training Activities', wordTarget: 2000, standardSections: ['Projects', 'Technical Work', 'Outcomes'] },
      { chapterNumber: 4, title: 'Conclusion and Recommendations', wordTarget: 800, standardSections: ['Conclusion', 'Recommendations'] },
    ],
    frontMatter: FRONT_MATTER_FULL.filter((f) => ['COVER_PAGE', 'TITLE_PAGE', 'DECLARATION', 'ACKNOWLEDGEMENTS', 'TABLE_OF_CONTENTS'].includes(f.kind)),
    appendixTypes: ['APPROVAL_LETTER', 'SUPPORTING_DOCUMENT'],
    methodologySections: [],
    defaultRequirements: REQUIREMENTS_FULL.filter((r) => !['MIN_TOTAL_WORDS', 'MIN_REFERENCES'].includes(r.rule)),
  },
  {
    projectType: 'RESEARCH_PAPER',
    name: 'Research Paper',
    description: 'Journal-style research paper with abstract, methods, results and references.',
    academicLevel: 'BACHELOR',
    citationStyle: 'APA',
    formattingPreset: 'APA',
    chapters: [
      { chapterNumber: 1, title: 'Introduction', wordTarget: 800, standardSections: ['Background', 'Problem', 'Objectives'] },
      { chapterNumber: 2, title: 'Literature Review', wordTarget: 1200, standardSections: ['Review', 'Gap'] },
      { chapterNumber: 3, title: 'Methodology', wordTarget: 1000, standardSections: METHODOLOGY_MINIMAL },
      { chapterNumber: 4, title: 'Results', wordTarget: 1000, standardSections: ['Results', 'Analysis'] },
      { chapterNumber: 5, title: 'Discussion and Conclusion', wordTarget: 800, standardSections: ['Discussion', 'Conclusion'] },
    ],
    frontMatter: FRONT_MATTER_MINIMAL,
    appendixTypes: ['RAW_DATA', 'ADDITIONAL_TABLE'],
    methodologySections: METHODOLOGY_MINIMAL,
    defaultRequirements: REQUIREMENTS_FULL.filter((r) => !['MIN_TOTAL_WORDS', 'MIN_REFERENCES'].includes(r.rule)),
  },
  {
    projectType: 'LITERATURE_REVIEW',
    name: 'Literature Review',
    description: 'Standalone literature review with thematic synthesis.',
    academicLevel: 'BACHELOR',
    citationStyle: 'APA',
    formattingPreset: 'APA',
    chapters: [
      { chapterNumber: 1, title: 'Introduction', wordTarget: 800, standardSections: ['Scope', 'Objectives'] },
      { chapterNumber: 2, title: 'Thematic Review', wordTarget: 3000, standardSections: ['Themes', 'Synthesis', 'Gaps'] },
      { chapterNumber: 3, title: 'Conclusion', wordTarget: 600, standardSections: ['Conclusion'] },
    ],
    frontMatter: FRONT_MATTER_MINIMAL,
    appendixTypes: [],
    methodologySections: [],
    defaultRequirements: REQUIREMENTS_FULL.filter((r) => !['MIN_TOTAL_WORDS', 'MIN_REFERENCES'].includes(r.rule)),
  },
  {
    projectType: 'CUSTOM',
    name: 'Custom Academic Project',
    description: 'Configurable academic project with user-defined structure.',
    academicLevel: 'OTHER',
    citationStyle: 'APA',
    formattingPreset: 'APA',
    chapters: [{ chapterNumber: 1, title: 'Section 1', wordTarget: 1000, required: true }],
    frontMatter: FRONT_MATTER_MINIMAL,
    appendixTypes: APPENDIX_TYPES_FULL,
    methodologySections: METHODOLOGY_MINIMAL,
    defaultRequirements: [],
  },
];

export function getTemplateByType(projectType: string): AcademicTemplateDef | undefined {
  return ACADEMIC_TEMPLATES.find((t) => t.projectType === projectType);
}

export const QUESTIONNAIRE_QUESTION_TYPES = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'YES_NO',
  'LIKERT',
  'NUMERIC',
  'DATE',
  'MATRIX',
] as const;

export const LIKERT_5 = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];

export const METHODOLOGY_SECTION_TITLES: Record<string, string> = {
  RESEARCH_DESIGN: 'Research Design',
  STUDY_AREA: 'Study Area',
  POPULATION: 'Population of the Study',
  SAMPLE: 'Sample Size',
  SAMPLING_TECHNIQUE: 'Sampling Technique',
  DATA_COLLECTION_INSTRUMENT: 'Data Collection Instrument',
  VALIDITY: 'Validity of the Instrument',
  RELIABILITY: 'Reliability of the Instrument',
  DATA_COLLECTION_PROCEDURE: 'Data Collection Procedure',
  DATA_ANALYSIS: 'Method of Data Analysis',
  ETHICAL_CONSIDERATIONS: 'Ethical Considerations',
};

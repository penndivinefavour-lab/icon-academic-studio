/**
 * ICON Academic Studio — Publishing Templates (Phase 7)
 *
 * Structural definitions only. No fabricated book content.
 * Templates define front matter, back matter, chapter structure,
 * formatting and citation defaults.
 */

export const PUBLICATION_TYPES = [
  'TEXTBOOK',
  'STUDY_GUIDE',
  'GCE_STUDY_PAMPHLET',
  'REVISION_GUIDE',
  'WORKBOOK',
  'ACADEMIC_BOOK',
  'RESEARCH_BOOK',
  'MANUAL',
  'HANDBOOK',
  'COURSE_MATERIAL',
  'TRAINING_MANUAL',
  'GENERAL_BOOK',
  'CUSTOM',
] as const;

export type PublicationType = (typeof PUBLICATION_TYPES)[number];

export const PUBLICATION_STATUSES = [
  'DRAFT',
  'IN_REVIEW',
  'EDITING',
  'FORMATTING',
  'PRODUCTION',
  'READY_FOR_EXPORT',
  'PUBLISHED',
  'ARCHIVED',
] as const;

export const FRONT_MATTER_KINDS = [
  'HALF_TITLE',
  'TITLE_PAGE',
  'COPYRIGHT_PAGE',
  'DEDICATION',
  'EPIGRAPH',
  'FOREWORD',
  'PREFACE',
  'ACKNOWLEDGEMENTS',
  'INTRODUCTION',
  'TABLE_OF_CONTENTS',
  'LIST_OF_FIGURES',
  'LIST_OF_TABLES',
  'LIST_OF_ABBREVIATIONS',
  'AUTHOR_BIOGRAPHY',
  'PUBLISHER_INFORMATION',
] as const;

export const BACK_MATTER_KINDS = [
  'REFERENCES',
  'BIBLIOGRAPHY',
  'GLOSSARY',
  'INDEX',
  'FURTHER_READING',
  'ABOUT_THE_AUTHOR',
  'APPENDICES',
  'ANSWER_KEY',
  'NOTES',
] as const;

// ---------------------------------------------------------------
// Templates
// ---------------------------------------------------------------

export interface ChapterSectionSpec {
  title: string;
  required?: boolean;
  subcategory?: string;
}

export interface PublicationTemplateDef {
  publicationType: PublicationType;
  name: string;
  description: string;
  frontMatter: string[];
  backMatter: string[];
  chapterStructure: ChapterSectionSpec[];
  formattingPreset?: string;
  citationStyle: string;
  hasParts?: boolean;
  typicalWordTarget?: number;
}

const DEFAULT_FRONT_MATTER = [
  'TITLE_PAGE',
  'COPYRIGHT_PAGE',
  'DEDICATION',
  'FOREWORD',
  'PREFACE',
  'ACKNOWLEDGEMENTS',
  'TABLE_OF_CONTENTS',
  'LIST_OF_FIGURES',
  'LIST_OF_TABLES',
];

const DEFAULT_BACK_MATTER = [
  'REFERENCES',
  'GLOSSARY',
  'INDEX',
  'FURTHER_READING',
  'ABOUT_THE_AUTHOR',
  'APPENDICES',
];

export const PUBLICATION_TEMPLATES: PublicationTemplateDef[] = [
  {
    publicationType: 'TEXTBOOK',
    name: 'Textbook',
    description: 'A comprehensive textbook with learning objectives, examples, exercises, and review questions.',
    frontMatter: DEFAULT_FRONT_MATTER,
    backMatter: DEFAULT_BACK_MATTER,
    chapterStructure: [
      { title: 'Learning Objectives', required: true, subcategory: 'objectives' },
      { title: 'Chapter Introduction', required: true, subcategory: 'introduction' },
      { title: 'Key Concepts', required: true, subcategory: 'concepts' },
      { title: 'Explanations', subcategory: 'explanations' },
      { title: 'Worked Examples', subcategory: 'examples' },
      { title: 'Exercises', subcategory: 'exercises' },
      { title: 'Review Questions', subcategory: 'review' },
      { title: 'Summary', required: true, subcategory: 'summary' },
      { title: 'Key Terms', subcategory: 'glossary' },
      { title: 'Further Reading', subcategory: 'further_reading' },
    ],
    formattingPreset: 'TEXTBOOK',
    citationStyle: 'APA',
    hasParts: true,
    typicalWordTarget: 5000,
  },

  {
    publicationType: 'GCE_STUDY_PAMPHLET',
    name: 'GCE Study Pamphlet',
    description: 'A concise GCE-focused study guide organized by syllabus topic with revision notes and practice questions.',
    frontMatter: ['TITLE_PAGE', 'COPYRIGHT_PAGE', 'TABLE_OF_CONTENTS'],
    backMatter: ['REFERENCES', 'ANSWER_KEY'],
    chapterStructure: [
      { title: 'Topic Overview', required: true, subcategory: 'overview' },
      { title: 'Key Points', required: true, subcategory: 'key_points' },
      { title: 'Revision Notes', required: true, subcategory: 'revision' },
      { title: 'Examples', subcategory: 'examples' },
      { title: 'Practice Questions', required: true, subcategory: 'practice' },
      { title: 'Answer Section', required: true, subcategory: 'answers' },
    ],
    formattingPreset: 'PAMPHLET',
    citationStyle: 'APA',
    hasParts: false,
    typicalWordTarget: 1500,
  },

  {
    publicationType: 'STUDY_GUIDE',
    name: 'Study Guide',
    description: 'A structured study guide with topic overviews, key points, examples, and exercises.',
    frontMatter: DEFAULT_FRONT_MATTER.filter((f) => ['TITLE_PAGE', 'ACKNOWLEDGEMENTS', 'TABLE_OF_CONTENTS', 'LIST_OF_FIGURES', 'LIST_OF_TABLES'].includes(f)),
    backMatter: ['REFERENCES', 'ANSWER_KEY'],
    chapterStructure: [
      { title: 'Topic Overview', required: true, subcategory: 'overview' },
      { title: 'Key Concepts', required: true, subcategory: 'concepts' },
      { title: 'Concise Explanations', subcategory: 'explanations' },
      { title: 'Key Points', subcategory: 'key_points' },
      { title: 'Examples', subcategory: 'examples' },
      { title: 'Exercises', subcategory: 'exercises' },
      { title: 'Practice Questions', subcategory: 'practice' },
      { title: 'Summary', required: true, subcategory: 'summary' },
    ],
    citationStyle: 'APA',
    hasParts: false,
    typicalWordTarget: 3000,
  },

  {
    publicationType: 'REVISION_GUIDE',
    name: 'Revision Guide',
    description: 'A revision guide with key points, concise explanations, practice questions, and answers.',
    frontMatter: ['TITLE_PAGE', 'COPYRIGHT_PAGE', 'TABLE_OF_CONTENTS'],
    backMatter: ['ANSWER_KEY', 'KEY_TERMS'],
    chapterStructure: [
      { title: 'Key Points', required: true, subcategory: 'key_points' },
      { title: 'Concise Explanations', subcategory: 'explanations' },
      { title: 'Revision Notes', subcategory: 'revision' },
      { title: 'Practice Questions', required: true, subcategory: 'practice' },
      { title: 'Answer Section', subcategory: 'answers' },
      { title: 'Summary', required: true, subcategory: 'summary' },
    ],
    citationStyle: 'APA',
    hasParts: false,
    typicalWordTarget: 2000,
  },

  {
    publicationType: 'WORKBOOK',
    name: 'Workbook',
    description: 'A workbook with exercises, question blocks, activity sections, and answer spaces.',
    frontMatter: ['TITLE_PAGE', 'COPYRIGHT_PAGE', 'INSTRUCTIONS', 'ANSWER_KEY'],
    backMatter: [],
    chapterStructure: [
      { title: 'Instructions', required: true, subcategory: 'instructions' },
      { title: 'Exercise Block', subcategory: 'exercises' },
      { title: 'Question Block', subcategory: 'questions' },
      { title: 'Activity Section', subcategory: 'activity' },
      { title: 'Practice Tasks', subcategory: 'tasks' },
      { title: 'Answer Space', subcategory: 'answer_space' },
    ],
    citationStyle: 'APA',
    hasParts: false,
    typicalWordTarget: 1000,
  },

  {
    publicationType: 'ACADEMIC_BOOK',
    name: 'Academic Book',
    description: 'A scholarly academic book with research integration, citations, and rigorous structure.',
    frontMatter: DEFAULT_FRONT_MATTER,
    backMatter: ['REFERENCES', 'BIBLIOGRAPHY', 'GLOSSARY', 'INDEX', 'FURTHER_READING', 'ABOUT_THE_AUTHOR', 'APPENDICES', 'NOTES'],
    chapterStructure: [
      { title: 'Introduction', required: true, subcategory: 'introduction' },
      { title: 'Background', subcategory: 'background' },
      { title: 'Literature Review', subcategory: 'literature' },
      { title: 'Theoretical Framework', subcategory: 'framework' },
      { title: 'Methodology', subcategory: 'methodology' },
      { title: 'Analysis', subcategory: 'analysis' },
      { title: 'Discussion', subcategory: 'discussion' },
      { title: 'Conclusion', required: true, subcategory: 'conclusion' },
      { title: 'References', subcategory: 'references' },
    ],
    citationStyle: 'APA',
    hasParts: true,
    typicalWordTarget: 8000,
  },

  {
    publicationType: 'RESEARCH_BOOK',
    name: 'Research Book',
    description: 'A research book with methodologies, datasets, analysis, and detailed references.',
    frontMatter: ['TITLE_PAGE', 'COPYRIGHT_PAGE', 'FOREWORD', 'PREFACE', 'ACKNOWLEDGEMENTS', 'TABLE_OF_CONTENTS', 'LIST_OF_TABLES', 'LIST_OF_FIGURES'],
    backMatter: ['REFERENCES', 'BIBLIOGRAPHY', 'GLOSSARY', 'INDEX', 'APPENDICES', 'ANSWER_KEY'],
    chapterStructure: [
      { title: 'Introduction', required: true, subcategory: 'introduction' },
      { title: 'Research Questions', required: true, subcategory: 'questions' },
      { title: 'Literature Review', subcategory: 'literature' },
      { title: 'Research Design', subcategory: 'design' },
      { title: 'Data Collection', subcategory: 'data_collection' },
      { title: 'Analysis', subcategory: 'analysis' },
      { title: 'Results', subcategory: 'results' },
      { title: 'Discussion', subcategory: 'discussion' },
      { title: 'Conclusion', required: true, subcategory: 'conclusion' },
    ],
    citationStyle: 'APA',
    hasParts: true,
    typicalWordTarget: 10000,
  },

  {
    publicationType: 'MANUAL',
    name: 'Manual',
    description: 'A technical or user manual with procedures, examples, and reference sections.',
    frontMatter: ['TITLE_PAGE', 'COPYRIGHT_PAGE', 'TABLE_OF_CONTENTS', 'CONTENTS'],
    backMatter: ['APPENDICES', 'INDEX', 'FURTHER_READING'],
    chapterStructure: [
      { title: 'Introduction', required: true, subcategory: 'introduction' },
      { title: 'Getting Started', required: true, subcategory: 'getting_started' },
      { title: 'Procedures', subcategory: 'procedures' },
      { title: 'Examples', subcategory: 'examples' },
      { title: 'Reference', subcategory: 'reference' },
      { title: 'Troubleshooting', subcategory: 'troubleshooting' },
    ],
    citationStyle: 'APA',
    hasParts: false,
    typicalWordTarget: 4000,
  },

  {
    publicationType: 'HANDBOOK',
    name: 'Handbook',
    description: 'A handbook with reference information, standards, and quick-reference sections.',
    frontMatter: ['TITLE_PAGE', 'COPYRIGHT_PAGE', 'TABLE_OF_CONTENTS'],
    backMatter: ['APPENDICES', 'INDEX', 'FURTHER_READING'],
    chapterStructure: [
      { title: 'Introduction', required: true, subcategory: 'introduction' },
      { title: 'Core Content', subcategory: 'core' },
      { title: 'Reference Tables', subcategory: 'reference' },
      { title: 'Quick Reference', subcategory: 'quick_reference' },
      { title: 'Glossary of Terms', required: true, subcategory: 'glossary' },
    ],
    citationStyle: 'APA',
    hasParts: false,
    typicalWordTarget: 5000,
  },

  {
    publicationType: 'COURSE_MATERIAL',
    name: 'Course Material',
    description: 'Course materials with learning objectives, content, activities, and assessments.',
    frontMatter: ['TITLE_PAGE', 'COPYRIGHT_PAGE', 'TABLE_OF_CONTENTS', 'COURSE_INFORMATION'],
    backMatter: ['REFERENCES', 'ANSWER_KEY'],
    chapterStructure: [
      { title: 'Course Information', required: true, subcategory: 'course_info' },
      { title: 'Learning Objectives', required: true, subcategory: 'objectives' },
      { title: 'Content', subcategory: 'content' },
      { title: 'Activities', subcategory: 'activities' },
      { title: 'Assessments', subcategory: 'assessments' },
      { title: 'Answers', subcategory: 'answers' },
    ],
    citationStyle: 'APA',
    hasParts: true,
    typicalWordTarget: 3000,
  },

  {
    publicationType: 'TRAINING_MANUAL',
    name: 'Training Manual',
    description: 'A training manual with learning objectives, step-by-step instructions, exercises, and assessments.',
    frontMatter: ['TITLE_PAGE', 'COPYRIGHT_PAGE', 'TABLE_OF_CONTENTS', 'CONTENTS', 'AUTHOR_BIOGRAPHY'],
    backMatter: ['REFERENCES', 'APPENDICES', 'INDEX'],
    chapterStructure: [
      { title: 'Learning Objectives', required: true, subcategory: 'objectives' },
      { title: 'Introduction', subcategory: 'introduction' },
      { title: 'Step-by-Step Instructions', subcategory: 'instructions' },
      { title: 'Examples', subcategory: 'examples' },
      { title: 'Exercises', subcategory: 'exercises' },
      { title: 'Review Questions', subcategory: 'review' },
      { title: 'Summary', required: true, subcategory: 'summary' },
    ],
    citationStyle: 'APA',
    hasParts: false,
    typicalWordTarget: 3500,
  },

  {
    publicationType: 'GENERAL_BOOK',
    name: 'General Book',
    description: 'A general-purpose book with flexible structure and standard front/back matter.',
    frontMatter: DEFAULT_FRONT_MATTER,
    backMatter: ['REFERENCES', 'GLOSSARY', 'INDEX', 'ABOUT_THE_AUTHOR', 'FURTHER_READING'],
    chapterStructure: [
      { title: 'Chapter Opening', required: true, subcategory: 'opening' },
      { title: 'Content', subcategory: 'content' },
      { title: 'Summary', subcategory: 'summary' },
    ],
    citationStyle: 'APA',
    hasParts: true,
    typicalWordTarget: 5000,
  },

  {
    publicationType: 'CUSTOM',
    name: 'Custom Publication',
    description: 'A fully configurable publication with user-defined structure.',
    frontMatter: [],
    backMatter: [],
    chapterStructure: [{ title: 'Section 1', required: true, subcategory: 'section' }],
    citationStyle: 'APA',
    hasParts: false,
    typicalWordTarget: 1000,
  },
];

/**
 * Primary templates for the E2E fixture: textbook + GCE study guide.
 */
export const PRIMARY_PUBLICATION_TEMPLATES = PUBLICATION_TEMPLATES.filter(
  (t) => t.publicationType === 'TEXTBOOK' || t.publicationType === 'GCE_STUDY_PAMPHLET',
);

/**
 * Get a template by publication type.
 */
export function getPublicationTemplate(publicationType: PublicationType): PublicationTemplateDef | undefined {
  return PUBLICATION_TEMPLATES.find((t) => t.publicationType === publicationType);
}

/**
 * Return the standard front-matter kinds for a given template.
 */
export function getFrontMatterKinds(publicationType: PublicationType): string[] {
  const t = getPublicationTemplate(publicationType);
  return t?.frontMatter || [];
}

/**
 * Return the standard back-matter kinds for a given template.
 */
export function getBackMatterKinds(publicationType: PublicationType): string[] {
  const t = getPublicationTemplate(publicationType);
  return t?.backMatter || [];
}

/**
 * Return the standard chapter structure for a given template.
 */
export function getChapterStructure(publicationType: PublicationType): ChapterSectionSpec[] {
  const t = getPublicationTemplate(publicationType);
  return t?.chapterStructure || [];
}

/**
 * Is the given kind a valid front-matter kind?
 */
export function isFrontMatterKind(kind: string): boolean {
  return FRONT_MATTER_KINDS.includes(kind as any);
}

/**
 * Is the given kind a valid back-matter kind?
 */
export function isBackMatterKind(kind: string): boolean {
  return BACK_MATTER_KINDS.includes(kind as any);
}

/**
 * Is this a textbook-oriented template?
 */
export function isTextbook(publicationType: PublicationType): boolean {
  return publicationType === 'TEXTBOOK';
}

/**
 * Is this a GCE-oriented template?
 */
export function isGcePublication(publicationType: PublicationType): boolean {
  return publicationType === 'GCE_STUDY_PAMPHLET' || publicationType === 'STUDY_GUIDE';
}

/**
 * Return contributor roles.
 */
export const CONTRIBUTOR_ROLES = [
  'AUTHOR',
  'CO_AUTHOR',
  'EDITOR',
  'CONTRIBUTOR',
  'TRANSLATOR',
  'ILLUSTRATOR',
  'FOREWORD_AUTHOR',
  'PHOTOGRAPHER',
  'OTHER',
] as const;

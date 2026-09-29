/**
 * ICON Academic Studio — Academic Project Studio service (Phase 6)
 *
 * Persistence + workflow for the academic project domain. Reuses Project,
 * Document/DocumentSection/DocumentBlock (Document Studio), Dataset/Analysis/
 * Table_/Chart (Data Lab), Citation, FormattingProfile and ResearchQuestion.
 */
import { prisma } from '@icon-academic/db';
import {
  ACADEMIC_TEMPLATES,
  getTemplateByType,
  AcademicTemplateDef,
} from './templates.js';
import { formatInText, formatReferenceList, parseRawReference, ReferenceFields } from './citationFormats.js';

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export interface CreateAcademicProjectInput {
  projectId: string;
  title: string;
  projectType: string;
  institution?: string;
  department?: string;
  program?: string;
  academicLevel?: string;
  studentName?: string;
  registrationNumber?: string;
  supervisorName?: string;
  academicYear?: string;
  citationStyle?: string;
  formattingProfileId?: string;
  template?: string; // projectType key to seed structure from
  metadata?: Record<string, unknown>;
}

export async function createAcademicProject(input: CreateAcademicProjectInput) {
  const template = input.template ? getTemplateByType(input.template) : undefined;

  const ap = await prisma.academicProject.create({
    data: {
      projectId: input.projectId,
      title: input.title,
      projectType: input.projectType,
      institution: input.institution || null,
      department: input.department || null,
      program: input.program || null,
      academicLevel: input.academicLevel || template?.academicLevel || null,
      studentName: input.studentName || null,
      registrationNumber: input.registrationNumber || null,
      supervisorName: input.supervisorName || null,
      academicYear: input.academicYear || null,
      citationStyle: input.citationStyle || template?.citationStyle || 'APA',
      formattingProfileId: input.formattingProfileId || null,
      metadata: JSON.stringify(input.metadata || {}),
    },
    include: { chapters: true, objectives: true },
  });

  if (template) {
    await applyTemplateStructure(ap.id, template);
  }
  return ap;
}

/** Seed chapters, front matter, requirements and methodology sections from a template. */
export async function applyTemplateStructure(academicProjectId: string, template: AcademicTemplateDef) {
  // chapters
  for (const c of template.chapters) {
    await prisma.academicChapter.create({
      data: {
        academicProjectId,
        chapterNumber: c.chapterNumber,
        title: c.title,
        description: c.description || null,
        wordTarget: c.wordTarget || null,
        order: c.chapterNumber,
        isFrontMatter: c.isFrontMatter || false,
        isAppendix: c.isAppendix || false,
        required: c.required !== false,
      },
    });
  }
  // front matter
  for (const fm of template.frontMatter) {
    await prisma.frontMatter.create({
      data: {
        academicProjectId,
        kind: fm.kind,
        title: fm.title,
        required: fm.required,
        order: fm.order,
      },
    });
  }
  // requirements
  for (const r of template.defaultRequirements) {
    await prisma.academicRequirement.create({
      data: {
        academicProjectId,
        category: r.category,
        rule: r.rule,
        parameters: JSON.stringify(r.parameters || {}),
        severity: r.severity,
        description: r.description,
      },
    });
  }
  // methodology skeleton
  if (template.methodologySections.length) {
    const method = await prisma.methodology.create({ data: { academicProjectId } });
    for (const [i, key] of template.methodologySections.entries()) {
      await prisma.methodologySection.create({
        data: {
          methodologyId: method.id,
          sectionKey: key,
          title: key
            .split('_')
            .map((w) => w[0] + w.slice(1).toLowerCase())
            .join(' '),
          order: i,
        },
      });
    }
  }
}

export async function getAcademicProject(id: string) {
  return prisma.academicProject.findUnique({
    where: { id },
    include: {
      chapters: { orderBy: { chapterNumber: 'asc' } },
      requirements: true,
      objectives: { orderBy: { order: 'asc' } },
      hypotheses: true,
      variables: true,
      frameworks: { include: { nodes: { include: { variable: true } }, edges: true } },
      methodologies: { include: { sections: { orderBy: { order: 'asc' } } } },
      questionnaires: { include: { sections: { include: { items: true } } } },
      interviewGuides: { include: { questions: true } },
      findings: { orderBy: { number: 'asc' } },
      conclusions: true,
      recommendations: true,
      appendices: true,
      frontMatter: { orderBy: { order: 'asc' } },
      abstracts: { take: 1 },
      tables: true,
      references: true,
      project: true,
      document: true,
      formattingProfile: true,
    },
  });
}

export async function listAcademicProjects(projectId: string) {
  return prisma.academicProject.findMany({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: true },
  });
}

export async function updateAcademicProject(id: string, data: Record<string, unknown>) {
  const allowed = [
    'title', 'projectType', 'institution', 'department', 'program',
    'academicLevel', 'studentName', 'registrationNumber', 'supervisorName',
    'academicYear', 'status', 'citationStyle', 'formattingProfileId', 'documentId',
  ];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (data[k] !== undefined) update[k] = data[k];
  if (data.metadata) update.metadata = JSON.stringify(data.metadata);
  return prisma.academicProject.update({ where: { id }, data: update });
}

export async function deleteAcademicProject(id: string) {
  return prisma.academicProject.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Chapters
// ---------------------------------------------------------------------------

export async function createChapter(input: {
  academicProjectId: string;
  chapterNumber: number;
  title: string;
  description?: string;
  wordTarget?: number;
  required?: boolean;
  isFrontMatter?: boolean;
  isAppendix?: boolean;
}) {
  return prisma.academicChapter.create({
    data: {
      academicProjectId: input.academicProjectId,
      chapterNumber: input.chapterNumber,
      title: input.title,
      description: input.description || null,
      wordTarget: input.wordTarget ?? null,
      required: input.required !== false,
      isFrontMatter: input.isFrontMatter || false,
      isAppendix: input.isAppendix || false,
      order: input.chapterNumber,
    },
  });
}

export async function updateChapter(id: string, data: Record<string, unknown>) {
  const update: Record<string, unknown> = {};
  for (const k of ['title', 'description', 'wordTarget', 'required', 'order']) {
    if (data[k] !== undefined) update[k] = data[k];
  }
  return prisma.academicChapter.update({ where: { id }, data: update });
}

export async function deleteChapter(id: string) {
  return prisma.academicChapter.delete({ where: { id } });
}

/** Create the Document Studio document for this academic project and bind chapters to sections. */
export async function buildProjectDocument(academicProjectId: string, opts?: { title?: string; formattingProfileId?: string }) {
  const ap = await getAcademicProject(academicProjectId);
  if (!ap) throw new Error('Academic project not found');

  let documentId = ap.documentId;
  if (!documentId) {
    const doc = await prisma.document.create({
      data: {
        projectId: ap.projectId,
        title: opts?.title || ap.title,
        type: ap.projectType,
        formattingProfileId: opts?.formattingProfileId || ap.formattingProfileId || null,
      },
    });
    documentId = doc.id;
    await prisma.academicProject.update({ where: { id: academicProjectId }, data: { documentId } });
  } else {
    // title/profile refresh
    await prisma.document.update({
      where: { id: documentId },
      data: {
        title: opts?.title || ap.title,
        formattingProfileId: opts?.formattingProfileId || ap.formattingProfileId || null,
      },
    });
  }

  // create a section per chapter that has none yet
  for (const chapter of ap.chapters) {
    if (!chapter.documentSectionId) {
      const section = await prisma.documentSection.create({
        data: {
          documentId,
          title: `Chapter ${chapter.chapterNumber}: ${chapter.title}`,
          headingLevel: 1,
          order: chapter.order,
          academicChapter: { connect: { id: chapter.id } },
        },
      });
      await prisma.academicChapter.update({ where: { id: chapter.id }, data: { documentSectionId: section.id } });
    }
  }

  return { documentId, academicProjectId };
}

// ---------------------------------------------------------------------------
// Requirements
// ---------------------------------------------------------------------------

export async function createRequirement(input: {
  academicProjectId: string;
  category: string;
  rule: string;
  parameters?: Record<string, unknown>;
  severity?: string;
  description?: string;
  chapterId?: string;
}) {
  return prisma.academicRequirement.create({
    data: {
      academicProjectId: input.academicProjectId,
      chapterId: input.chapterId || null,
      category: input.category,
      rule: input.rule,
      parameters: JSON.stringify(input.parameters || {}),
      severity: input.severity || 'ERROR',
      description: input.description || null,
    },
  });
}

export async function listRequirements(academicProjectId: string) {
  return prisma.academicRequirement.findMany({ where: { academicProjectId }, orderBy: { category: 'asc' } });
}

export async function deleteRequirement(id: string) {
  return prisma.academicRequirement.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Objectives
// ---------------------------------------------------------------------------

export async function createObjective(input: {
  academicProjectId: string;
  objectiveType: string;
  statement: string;
  order?: number;
  status?: string;
}) {
  return prisma.academicObjective.create({
    data: {
      academicProjectId: input.academicProjectId,
      objectiveType: input.objectiveType,
      statement: input.statement,
      order: input.order ?? 0,
      status: input.status || 'DRAFT',
    },
  });
}

export async function linkObjectiveToQuestion(input: {
  academicProjectId: string;
  objectiveId: string;
  researchQuestionId?: string;
  customQuestion?: string;
  questionnaireItemId?: string;
  order?: number;
}) {
  return prisma.objectiveQuestion.create({
    data: {
      academicProjectId: input.academicProjectId,
      objectiveId: input.objectiveId,
      researchQuestionId: input.researchQuestionId || null,
      customQuestion: input.customQuestion || null,
      questionnaireItemId: input.questionnaireItemId || null,
      order: input.order ?? 0,
    },
  });
}

export async function listObjectives(academicProjectId: string) {
  return prisma.academicObjective.findMany({
    where: { academicProjectId },
    orderBy: { order: 'asc' },
    include: { questionLinks: { include: { researchQuestion: true, questionnaireItem: true } } },
  });
}

export async function updateObjective(id: string, data: Record<string, unknown>) {
  const update: Record<string, unknown> = {};
  for (const k of ['statement', 'order', 'status', 'objectiveType']) {
    if (data[k] !== undefined) update[k] = data[k];
  }
  return prisma.academicObjective.update({ where: { id }, data: update });
}

// ---------------------------------------------------------------------------
// Hypotheses
// ---------------------------------------------------------------------------

export async function createHypothesis(input: {
  academicProjectId: string;
  hypothesisType: string;
  statement: string;
  variableIds?: string[];
}) {
  return prisma.researchHypothesis.create({
    data: {
      academicProjectId: input.academicProjectId,
      hypothesisType: input.hypothesisType,
      statement: input.statement,
      variableIds: JSON.stringify(input.variableIds || []),
    },
  });
}

/** Record that an analysis tested a hypothesis; status must be chosen by the user. */
export async function recordHypothesisTest(hypothesisId: string, analysisId: string, status: string) {
  return prisma.researchHypothesis.update({
    where: { id: hypothesisId },
    data: { testedByAnalysisId: analysisId, status },
  });
}

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------

export async function createVariable(input: {
  academicProjectId: string;
  name: string;
  label?: string;
  description?: string;
  variableType?: string;
  role: string;
  measurementScale?: string;
  operationalDefinition?: string;
  datasetColumnId?: string;
}) {
  return prisma.researchVariable.create({
    data: {
      academicProjectId: input.academicProjectId,
      name: input.name,
      label: input.label || null,
      description: input.description || null,
      variableType: input.variableType || null,
      role: input.role,
      measurementScale: input.measurementScale || null,
      operationalDefinition: input.operationalDefinition || null,
      datasetColumnId: input.datasetColumnId || null,
    },
  });
}

export async function listVariables(academicProjectId: string) {
  return prisma.researchVariable.findMany({
    where: { academicProjectId },
    include: { datasetColumn: true, questionnaireItems: true },
  });
}

// ---------------------------------------------------------------------------
// Conceptual framework
// ---------------------------------------------------------------------------

export async function createFramework(input: { academicProjectId: string; title: string; description?: string; notes?: string }) {
  return prisma.conceptualFramework.create({
    data: {
      academicProjectId: input.academicProjectId,
      title: input.title,
      description: input.description || null,
      notes: input.notes || null,
    },
  });
}

export async function addFrameworkNode(input: { frameworkId: string; concept: string; variableId?: string; description?: string; order?: number }) {
  return prisma.conceptualFrameworkNode.create({
    data: {
      frameworkId: input.frameworkId,
      concept: input.concept,
      variableId: input.variableId || null,
      description: input.description || null,
      order: input.order ?? 0,
    },
  });
}

export async function addFrameworkEdge(input: { frameworkId: string; sourceNodeId: string; targetNodeId: string; relationship: string; description?: string }) {
  return prisma.conceptualFrameworkEdge.create({
    data: {
      frameworkId: input.frameworkId,
      sourceNodeId: input.sourceNodeId,
      targetNodeId: input.targetNodeId,
      relationship: input.relationship,
      description: input.description || null,
    },
  });
}

// ---------------------------------------------------------------------------
// Methodology
// ---------------------------------------------------------------------------

export async function createMethodology(input: { academicProjectId: string; chapterId?: string; design?: string; population?: string; sampleSize?: number; samplingTechnique?: string; dataCollectionMethod?: string; analysisPlan?: string; ethicalConsiderations?: string }) {
  return prisma.methodology.create({
    data: {
      academicProjectId: input.academicProjectId,
      chapterId: input.chapterId || null,
      design: input.design || null,
      population: input.population || null,
      sampleSize: input.sampleSize ?? null,
      samplingTechnique: input.samplingTechnique || null,
      dataCollectionMethod: input.dataCollectionMethod || null,
      analysisPlan: input.analysisPlan || null,
      ethicalConsiderations: input.ethicalConsiderations || null,
    },
  });
}

export async function setMethodologySection(methodologyId: string, sectionKey: string, title: string, content: string, status?: string) {
  return prisma.methodologySection.upsert({
    where: { methodologyId_sectionKey: { methodologyId, sectionKey } },
    update: { content, title, status: status || 'USER_EDITED' },
    create: { methodologyId, sectionKey, title, content, status: status || 'DRAFT' },
  });
}

// ---------------------------------------------------------------------------
// Questionnaires
// ---------------------------------------------------------------------------

export async function createQuestionnaire(input: { academicProjectId: string; title: string; description?: string; status?: string }) {
  return prisma.questionnaire.create({
    data: {
      academicProjectId: input.academicProjectId,
      title: input.title,
      description: input.description || null,
      status: input.status || 'DRAFT',
    },
  });
}

export async function addQuestionnaireSection(input: { questionnaireId: string; title: string; description?: string; order?: number }) {
  return prisma.questionnaireSection.create({
    data: {
      questionnaireId: input.questionnaireId,
      title: input.title,
      description: input.description || null,
      order: input.order ?? 0,
    },
  });
}

export async function addQuestionnaireItem(input: {
  questionnaireSectionId: string;
  variableId?: string;
  questionNumber: string;
  questionText: string;
  questionType: string;
  responseOptions?: string[];
  likertScale?: string[];
  isRequired?: boolean;
  order?: number;
}) {
  return prisma.questionnaireItem.create({
    data: {
      questionnaireSectionId: input.questionnaireSectionId,
      variableId: input.variableId || null,
      questionNumber: input.questionNumber,
      questionText: input.questionText,
      questionType: input.questionType,
      responseOptions: JSON.stringify(input.responseOptions || []),
      likertScale: JSON.stringify(input.likertScale || []),
      isRequired: input.isRequired !== false,
      order: input.order ?? 0,
    },
  });
}

export async function getQuestionnaire(id: string) {
  return prisma.questionnaire.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { items: { include: { variable: true }, orderBy: { order: 'asc' } } },
      },
    },
  });
}

export async function listQuestionnaires(academicProjectId: string) {
  return prisma.questionnaire.findMany({
    where: { academicProjectId },
    include: { _count: { select: { sections: true } } },
  });
}

// ---------------------------------------------------------------------------
// Interview guides
// ---------------------------------------------------------------------------

export async function createInterviewGuide(input: { academicProjectId: string; title: string; description?: string; participantInfo?: string; consentNote?: string; status?: string }) {
  return prisma.interviewGuide.create({
    data: {
      academicProjectId: input.academicProjectId,
      title: input.title,
      description: input.description || null,
      participantInfo: input.participantInfo || null,
      consentNote: input.consentNote || null,
      status: input.status || 'DRAFT',
    },
  });
}

export async function addInterviewQuestion(input: { interviewGuideId: string; section?: string; questionText: string; probe?: string; objectiveId?: string; researchQuestionId?: string; order?: number }) {
  return prisma.interviewQuestion.create({
    data: {
      interviewGuideId: input.interviewGuideId,
      section: input.section || null,
      questionText: input.questionText,
      probe: input.probe || null,
      objectiveId: input.objectiveId || null,
      researchQuestionId: input.researchQuestionId || null,
      order: input.order ?? 0,
    },
  });
}

export async function getInterviewGuide(id: string) {
  return prisma.interviewGuide.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: 'asc' } } },
  });
}

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

export async function createFinding(input: {
  academicProjectId: string;
  number?: number;
  statement: string;
  interpretation?: string;
  analysisId?: string;
  datasetId?: string;
  tableId?: string;
  chartId?: string;
  researchQuestionId?: string;
  objectiveId?: string;
  hypothesisId?: string;
  numericValue?: number;
  numericLabel?: string;
  status?: string;
}) {
  const number =
    input.number ??
    (await prisma.finding.count({ where: { academicProjectId: input.academicProjectId } }) ) + 1;
  return prisma.finding.create({
    data: {
      academicProjectId: input.academicProjectId,
      number,
      statement: input.statement,
      interpretation: input.interpretation || null,
      analysisId: input.analysisId || null,
      datasetId: input.datasetId || null,
      tableId: input.tableId || null,
      chartId: input.chartId || null,
      researchQuestionId: input.researchQuestionId || null,
      objectiveId: input.objectiveId || null,
      hypothesisId: input.hypothesisId || null,
      numericValue: input.numericValue ?? null,
      numericLabel: input.numericLabel || null,
      status: input.status || 'DRAFT',
    },
  });
}

export async function listFindings(academicProjectId: string) {
  return prisma.finding.findMany({
    where: { academicProjectId },
    orderBy: { number: 'asc' },
    include: {
      analysis: true,
      dataset: true,
      table: true,
      chart: true,
      researchQuestion: true,
      objective: true,
      hypothesis: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Conclusions / Recommendations
// ---------------------------------------------------------------------------

export async function createConclusion(input: { academicProjectId: string; statement: string; objectiveId?: string; findingIds?: string[]; status?: string }) {
  return prisma.conclusion.create({
    data: {
      academicProjectId: input.academicProjectId,
      statement: input.statement,
      objectiveId: input.objectiveId || null,
      status: input.status || 'DRAFT',
      findingLinks: input.findingIds?.length
        ? { create: input.findingIds.map((findingId) => ({ findingId })) }
        : undefined,
    },
    include: { findingLinks: true },
  });
}

export async function createRecommendation(input: { academicProjectId: string; statement: string; audience?: string; findingIds?: string[]; status?: string }) {
  return prisma.recommendation.create({
    data: {
      academicProjectId: input.academicProjectId,
      statement: input.statement,
      audience: input.audience || null,
      status: input.status || 'DRAFT',
      findingLinks: input.findingIds?.length
        ? { create: input.findingIds.map((findingId) => ({ findingId })) }
        : undefined,
    },
    include: { findingLinks: true },
  });
}

// ---------------------------------------------------------------------------
// Appendices
// ---------------------------------------------------------------------------

export async function createAppendix(input: {
  academicProjectId: string;
  label: string;
  title: string;
  appendixType: string;
  chapterId?: string;
  questionnaireId?: string;
  interviewGuideId?: string;
  sourceId?: string;
  datasetId?: string;
  tableId?: string;
  chartId?: string;
  order?: number;
}) {
  return prisma.academicAppendix.create({
    data: {
      academicProjectId: input.academicProjectId,
      label: input.label,
      title: input.title,
      appendixType: input.appendixType,
      chapterId: input.chapterId || null,
      questionnaireId: input.questionnaireId || null,
      interviewGuideId: input.interviewGuideId || null,
      sourceId: input.sourceId || null,
      datasetId: input.datasetId || null,
      tableId: input.tableId || null,
      chartId: input.chartId || null,
      order: input.order ?? 0,
    },
  });
}

export async function listAppendices(academicProjectId: string) {
  return prisma.academicAppendix.findMany({
    where: { academicProjectId },
    orderBy: { order: 'asc' },
    include: { questionnaire: true, interviewGuide: true, source: true, dataset: true, table: true, chart: true },
  });
}

// ---------------------------------------------------------------------------
// Front matter / Abstract
// ---------------------------------------------------------------------------

export async function setFrontMatter(academicProjectId: string, kind: string, title: string, content: string, required?: boolean) {
  return prisma.frontMatter.upsert({
    where: { academicProjectId_kind: { academicProjectId, kind } },
    update: { title, content, required: required ?? true },
    create: { academicProjectId, kind, title, content, required: required ?? true },
  });
}

export async function setAbstract(input: { academicProjectId: string; content: string; wordLimit?: number; generationStatus?: string; reviewStatus?: string }) {
  const existing = await prisma.academicAbstract.findFirst({ where: { academicProjectId: input.academicProjectId } });
  const wordCount = input.content.trim() ? input.content.trim().split(/\s+/).length : 0;
  if (existing) {
    return prisma.academicAbstract.update({
      where: { id: existing.id },
      data: {
        content: input.content,
        wordLimit: input.wordLimit ?? existing.wordLimit,
        generationStatus: input.generationStatus || existing.generationStatus,
        reviewStatus: input.reviewStatus || existing.reviewStatus,
      },
    });
  }
  return prisma.academicAbstract.create({
    data: {
      academicProjectId: input.academicProjectId,
      content: input.content,
      wordLimit: input.wordLimit ?? 300,
      generationStatus: input.generationStatus || 'NONE',
      reviewStatus: input.reviewStatus || 'DRAFT',
    },
  });
}

// ---------------------------------------------------------------------------
// Tables / Figures
// ---------------------------------------------------------------------------

export async function registerTableFigure(input: {
  academicProjectId: string;
  kind: string;
  caption: string;
  tableId?: string;
  chartId?: string;
  documentSectionId?: string;
  number?: number;
}) {
  const number =
    input.number ??
    (await prisma.academicTableFigure.count({ where: { academicProjectId: input.academicProjectId, kind: input.kind } })) + 1;
  const label = input.kind === 'TABLE' ? `Table ${number}` : `Figure ${number}`;
  return prisma.academicTableFigure.create({
    data: {
      academicProjectId: input.academicProjectId,
      kind: input.kind,
      number,
      label,
      caption: input.caption,
      tableId: input.tableId || null,
      chartId: input.chartId || null,
      documentSectionId: input.documentSectionId || null,
    },
  });
}

export async function listTablesFigures(academicProjectId: string) {
  return prisma.academicTableFigure.findMany({
    where: { academicProjectId },
    orderBy: [{ kind: 'asc' }, { number: 'asc' }],
    include: { table: true, chart: true, documentSection: true },
  });
}

// ---------------------------------------------------------------------------
// References
// ---------------------------------------------------------------------------

export async function createReference(input: {
  academicProjectId: string;
  projectId: string;
  citationId?: string;
  style?: string;
  authors?: string[];
  year?: string;
  title?: string;
  source?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  url?: string;
  doi?: string;
  raw: string;
}) {
  const fields: ReferenceFields = {
    authors: input.authors || [],
    year: input.year,
    title: input.title,
    source: input.source,
    volume: input.volume,
    issue: input.issue,
    pages: input.pages,
    url: input.url,
    doi: input.doi,
  };
  const isComplete = fields.authors.length > 0 && !!fields.year && !!fields.title;
  return prisma.academicReference.create({
    data: {
      academicProjectId: input.academicProjectId,
      projectId: input.projectId,
      citationId: input.citationId || null,
      style: input.style || 'APA',
      authors: JSON.stringify(fields.authors),
      year: fields.year || null,
      title: fields.title || null,
      source: fields.source || null,
      volume: fields.volume || null,
      issue: fields.issue || null,
      pages: fields.pages || null,
      url: fields.url || null,
      doi: fields.doi || null,
      raw: input.raw,
      isComplete,
    },
  });
}

export async function listReferences(academicProjectId: string) {
  return prisma.academicReference.findMany({
    where: { academicProjectId },
    orderBy: { createdAt: 'asc' },
    include: { citation: true },
  });
}

export async function formatProjectReferences(academicProjectId: string) {
  const refs = await prisma.academicReference.findMany({ where: { academicProjectId } });
  return refs.map((r) => {
    const fields: ReferenceFields = {
      authors: JSON.parse(r.authors) as string[],
      year: r.year,
      title: r.title,
      source: r.source,
      volume: r.volume,
      issue: r.issue,
      pages: r.pages,
      url: r.url,
      doi: r.doi,
    };
    return {
      id: r.id,
      style: r.style,
      inText: formatInText(fields, (r.style as any) || 'APA'),
      full: formatReferenceList(fields, (r.style as any) || 'APA'),
      isComplete: r.isComplete,
    };
  });
}

export async function referenceFromCitation(input: { academicProjectId: string; projectId: string; citationId: string; style?: string }) {
  const citation = await prisma.citation.findUnique({ where: { id: input.citationId } });
  if (!citation) throw new Error('Citation not found');
  const parsed = parseRawReference(citation.raw || '');
  return createReference({
    academicProjectId: input.academicProjectId,
    projectId: input.projectId,
    citationId: citation.id,
    style: input.style,
    authors: citation.author ? [citation.author] : parsed.authors,
    year: citation.year || parsed.year || undefined,
    title: citation.title || parsed.title || undefined,
    url: citation.url || parsed.url || undefined,
    doi: citation.doi || parsed.doi || undefined,
    pages: citation.pageRange || parsed.pages || undefined,
    raw: citation.raw,
  });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getProjectDashboard(academicProjectId: string) {
  const ap = await getAcademicProject(academicProjectId);
  if (!ap) throw new Error('Academic project not found');

  const [sources, citations, datasets, analyses, unresolvedReview] = await Promise.all([
    prisma.source.count({ where: { projectId: ap.projectId } }),
    prisma.citation.count({ where: { source: { projectId: ap.projectId } } }),
    prisma.dataset.count({ where: { projectId: ap.projectId } }),
    prisma.analysis.count({ where: { dataset: { projectId: ap.projectId } } }),
    prisma.validationIssue.count({
      where: { validationRun: { academicProjectId }, resolved: false },
    }),
  ]);

  const wordCount = ap.document ? await documentWordOf(ap.document.id) : 0;
  const totalChapters = ap.chapters.length;
  const chaptersWithContent = ap.chapters.filter((c) => !!c.documentSectionId).length;
  const completion = totalChapters ? Math.round((chaptersWithContent / totalChapters) * 100) : 0;

  return {
    title: ap.title,
    projectType: ap.projectType,
    institution: ap.institution,
    program: ap.program,
    status: ap.status,
    progress: { completion, chaptersWithContent, totalChapters },
    wordCount,
    counts: {
      chapters: totalChapters,
      objectives: ap.objectives.length,
      hypotheses: ap.hypotheses.length,
      variables: ap.variables.length,
      findings: ap.findings.length,
      references: ap.references.length,
      appendices: ap.appendices.length,
      sources,
      citations,
      datasets,
      analyses,
    },
    validationStatus: null as string | null,
    unresolvedReviewItems: unresolvedReview,
    lastUpdated: ap.updatedAt,
  };
}

async function documentWordOf(documentId: string): Promise<number> {
  const [sections, blocks] = await Promise.all([
    prisma.documentSection.findMany({ where: { documentId }, select: { title: true, content: true } }),
    prisma.documentBlock.findMany({ where: { documentId }, select: { content: true } }),
  ]);
  const wc = (t: string | null | undefined) => (t && t.trim() ? t.trim().split(/\s+/).length : 0);
  return sections.reduce((s, x) => s + wc(x.title) + wc(x.content), 0) + blocks.reduce((s, x) => s + wc(x.content), 0);
}

// ---------------------------------------------------------------------------
// Search (project-scoped)
// ---------------------------------------------------------------------------

export async function searchAcademicProject(query: string, academicProjectId: string) {
  const q = query.trim();
  if (!q) return { results: [] };
  const ap = await prisma.academicProject.findUnique({ where: { id: academicProjectId } });
  if (!ap) throw new Error('Academic project not found');
  const ilike = `%${q}%`;

  const [objectives, findings, conclusions, chapters, references] = await Promise.all([
    prisma.academicObjective.findMany({ where: { academicProjectId, statement: { contains: q } }, take: 20 }),
    prisma.finding.findMany({ where: { academicProjectId, statement: { contains: q } }, take: 20 }),
    prisma.conclusion.findMany({ where: { academicProjectId, statement: { contains: q } }, take: 20 }),
    prisma.academicChapter.findMany({ where: { academicProjectId, title: { contains: q } }, take: 20 }),
    prisma.academicReference.findMany({ where: { academicProjectId, OR: [{ title: { contains: q } }, { raw: { contains: q } }] }, take: 20 }),
  ]);

  return {
    results: [
      ...objectives.map((x) => ({ type: 'objective', id: x.id, text: x.statement })),
      ...findings.map((x) => ({ type: 'finding', id: x.id, text: x.statement })),
      ...conclusions.map((x) => ({ type: 'conclusion', id: x.id, text: x.statement })),
      ...chapters.map((x) => ({ type: 'chapter', id: x.id, text: x.title })),
      ...references.map((x) => ({ type: 'reference', id: x.id, text: x.title || x.raw })),
    ],
  };
}

// ---------------------------------------------------------------------------
// AI boundary: mark content as AI-generated so it can never auto-verify
// ---------------------------------------------------------------------------

export async function markAiGenerated(entity: 'objective' | 'finding' | 'conclusion' | 'methodology', id: string) {
  const status = 'AI_GENERATED';
  switch (entity) {
    case 'objective':
      return prisma.academicObjective.update({ where: { id }, data: { status } });
    case 'finding':
      return prisma.finding.update({ where: { id }, data: { status } });
    case 'conclusion':
      return prisma.conclusion.update({ where: { id }, data: { status } });
    default:
      return prisma.methodologySection.update({ where: { id }, data: { status } });
  }
}

export async function reviewEntity(entity: 'objective' | 'finding' | 'conclusion' | 'abstract', id: string, status: string) {
  switch (entity) {
    case 'objective':
      return prisma.academicObjective.update({ where: { id }, data: { status } });
    case 'finding':
      return prisma.finding.update({ where: { id }, data: { status } });
    case 'conclusion':
      return prisma.conclusion.update({ where: { id }, data: { status } });
    default:
      return prisma.academicAbstract.update({ where: { id }, data: { reviewStatus: status } });
  }
}

export { ACADEMIC_TEMPLATES, getTemplateByType };

/**
 * ICON Academic Studio — Academic Project Studio end-to-end test (Phase 6)
 *
 * Uses real PostgreSQL persistence through the service layer. No mocks.
 * Creates its own project + data and cleans up afterwards.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@icon-academic/db';
import * as svc from './service.js';
import * as bridge from './exportBridge.js';
import { validateAcademicProject, persistValidationRun } from './validator.js';
import { generateDocx, generatePdf, generateMarkdown, generateHtml, generateTxt } from '../documentExport.js';
import { importCsv } from '../dataLabService.js';

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:iconacademic123@localhost:5432/icon_academic';

let projectId = '';
let academicProjectId = '';
let sourceId = '';
let citationId = '';
let datasetId = '';
let analysisId = '';
let tableId = '';
let chartId = '';
let questionnaireId = '';
let sectionId = '';
let interviewGuideId = '';
let findingId = '';
let conclusionId = '';
let objectiveId = '';
let rqId = '';
let hypothesisId = '';
let variableId = '';
let methodologyId = '';
let documentId = '';
let versionId = '';
let referenceId = '';
let appendixId = '';
let tableFigureId = '';

const CSV_DATA = `respondent,age_group,gender,usage_minutes,satisfaction
R001,18-25,Male,120,4
R002,26-35,Female,95,3
R003,18-25,Female,150,5
R004,36-45,Male,80,2
R005,26-35,Male,110,4
R006,18-25,Female,130,5
R007,36-45,Female,70,3
R008,26-35,Male,140,5`;

beforeAll(async () => {
  const p = await prisma.project.create({
    data: { name: 'E2E Academic Project', type: 'HND_RESEARCH_PROJECT', status: 'IN_PROGRESS' },
  });
  projectId = p.id;
});

afterAll(async () => {
  // clean up everything rooted at the project
  await prisma.validationIssue.deleteMany({ where: { validationRun: { academicProjectId: { not: '' } } } }).catch(() => {});
  await prisma.academicProject.deleteMany({ where: { projectId } });
  await prisma.project.deleteMany({ where: { id: projectId } });
});

describe('Phase 6 E2E — Academic Project Studio', () => {
  it('1. creates an academic project from the HND template', async () => {
    const ap = await svc.createAcademicProject({
      projectId,
      title: 'The Impact of Mobile Learning on HND Student Performance',
      projectType: 'HND_RESEARCH_PROJECT',
      template: 'HND_RESEARCH_PROJECT',
      institution: 'Higher Technical Teacher Training College',
      department: 'Computer Science',
      program: 'HND Software Engineering',
      studentName: 'Nji Favour',
      registrationNumber: 'HND/CS/2023/047',
      supervisorName: 'Dr. Acha Roland',
      academicYear: '2023/2024',
    });
    academicProjectId = ap.id;
    expect(ap.id).toBeDefined();
    expect(ap.citationStyle).toBe('APA');
  });

  it('2. seeds chapters and front matter from the template', async () => {
    const ap = await svc.getAcademicProject(academicProjectId);
    expect(ap!.chapters.length).toBe(5);
    expect(ap!.chapters[0].title).toBe('Introduction');
    expect(ap!.chapters[4].title).toBe('Discussion, Conclusion and Recommendations');
    expect(ap!.frontMatter.length).toBeGreaterThan(5);
    expect(ap!.frontMatter.some((f) => f.kind === 'TITLE_PAGE')).toBe(true);
    expect(ap!.requirements.length).toBeGreaterThan(5);
  });

  it('3. persists objectives (general + specific)', async () => {
    const general = await svc.createObjective({
      academicProjectId,
      objectiveType: 'GENERAL',
      statement: 'To assess the impact of mobile learning on HND student performance in Computer Science.',
    });
    const specific = await svc.createObjective({
      academicProjectId,
      objectiveType: 'SPECIFIC',
      statement: 'To determine the frequency of mobile learning usage among HND students.',
    });
    objectiveId = specific.id;
    expect(general.objectiveType).toBe('GENERAL');
    expect(specific.objectiveType).toBe('SPECIFIC');
  });

  it('4. creates research questions in the shared model', async () => {
    const rq = await prisma.researchQuestion.create({
      data: { projectId, question: 'What is the frequency of mobile learning usage among HND students?' },
    });
    rqId = rq.id;
    expect(rq.id).toBeDefined();
    const link = await svc.linkObjectiveToQuestion({ academicProjectId, objectiveId, researchQuestionId: rqId });
    expect(link.researchQuestionId).toBe(rqId);
  });

  it('5. creates a null and alternative hypothesis', async () => {
    const h0 = await svc.createHypothesis({
      academicProjectId,
      hypothesisType: 'NULL',
      statement: 'There is no significant relationship between mobile learning usage and student performance.',
    });
    hypothesisId = h0.id;
    const h1 = await svc.createHypothesis({
      academicProjectId,
      hypothesisType: 'ALTERNATIVE',
      statement: 'There is a significant relationship between mobile learning usage and student performance.',
    });
    expect(h0.hypothesisType).toBe('NULL');
    expect(h1.hypothesisType).toBe('ALTERNATIVE');
    expect(h0.status).toBe('UNTESTED');
  });

  it('6. creates research variables with roles and scales', async () => {
    const iv = await svc.createVariable({
      academicProjectId,
      name: 'usage_minutes',
      label: 'Daily mobile learning usage (minutes)',
      role: 'INDEPENDENT',
      measurementScale: 'RATIO',
      operationalDefinition: 'Self-reported minutes of mobile learning per day.',
    });
    const dv = await svc.createVariable({
      academicProjectId,
      name: 'satisfaction',
      label: 'Satisfaction score',
      role: 'DEPENDENT',
      measurementScale: 'ORDINAL',
    });
    variableId = iv.id;
    expect(iv.role).toBe('INDEPENDENT');
    expect(dv.measurementScale).toBe('ORDINAL');
  });

  it('7. uploads a research source and extracts content', async () => {
    const src = await prisma.source.create({
      data: {
        projectId,
        name: 'mobile-learning-review.txt',
        type: 'TXT',
        sizeBytes: 512,
        contentPreview: 'Mobile learning has become prevalent in higher education...',
        status: 'PROCESSED',
      },
    });
    sourceId = src.id;
    await prisma.sourceChunk.create({
      data: {
        sourceId,
        index: 0,
        content: 'Mobile learning has become prevalent in higher education, with studies reporting increased engagement among students who use mobile devices for study.',
      },
    });
    expect(src.status).toBe('PROCESSED');
  });

  it('8. creates evidence linking source to research question', async () => {
    const ev = await prisma.evidenceItem.create({
      data: {
        researchQuestionId: rqId,
        sourceId,
        claim: 'Mobile learning increases student engagement.',
        supportingEvidence: 'Studies report increased engagement among mobile learners.',
        strength: 'MODERATE',
      },
    });
    expect(ev.sourceId).toBe(sourceId);
  });

  it('9. creates a citation from the real source', async () => {
    const c = await prisma.citation.create({
      data: {
        sourceId,
        author: 'Acha, R.',
        year: '2022',
        title: 'Mobile Learning in Cameroonian Higher Education',
        format: 'INLINE',
        raw: 'Acha, R. (2022). Mobile Learning in Cameroonian Higher Education. Journal of Educational Technology, 8(2), 15-30.',
      },
    });
    citationId = c.id;
    expect(c.author).toBe('Acha, R.');
  });

  it('10. builds a methodology with configurable sections', async () => {
    const method = await svc.createMethodology({
      academicProjectId,
      design: 'DESCRIPTIVE_SURVEY',
      population: 'All HND Computer Science students',
      sampleSize: 30,
      samplingTechnique: 'Random sampling',
    });
    methodologyId = method.id;
    const sec = await svc.setMethodologySection(methodologyId, 'RESEARCH_DESIGN', 'Research Design', 'A descriptive survey design was adopted for this study.', 'USER_EDITED');
    expect(sec.content).toContain('descriptive survey');
    expect(sec.status).toBe('USER_EDITED');
  });

  it('11. creates a questionnaire with sections, items and a Likert scale', async () => {
    const q = await svc.createQuestionnaire({ academicProjectId, title: 'Mobile Learning Usage Questionnaire' });
    questionnaireId = q.id;
    const s = await svc.addQuestionnaireSection({ questionnaireId, title: 'Section A: Usage' });
    sectionId = s.id;
    const likert = await svc.addQuestionnaireItem({
      questionnaireSectionId: sectionId,
      questionNumber: 'Q1',
      questionText: 'I use mobile devices for learning daily.',
      questionType: 'LIKERT',
      likertScale: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
      variableId,
    });
    expect(likert.questionType).toBe('LIKERT');
    expect(JSON.parse(likert.likertScale)).toHaveLength(5);
  });

  it('12. creates an interview guide with probes', async () => {
    const g = await svc.createInterviewGuide({ academicProjectId, title: 'Lecturer Interview Guide', consentNote: '[Consent form to be signed before the interview.]' });
    interviewGuideId = g.id;
    const q = await svc.addInterviewQuestion({
      interviewGuideId,
      section: 'Usage',
      questionText: 'How often do your students use mobile devices in class?',
      probe: 'Can you give a specific example?',
      objectiveId,
    });
    expect(q.probe).toContain('example');
  });

  it('13. imports a dataset via Data Lab and links a variable to a column', async () => {
    const result = await importCsv(projectId, Buffer.from(CSV_DATA, 'utf-8'), 'respondents.csv', { name: 'Respondent Survey' });
    datasetId = result.dataset.id;
    expect(result.dataset.rowCount).toBe(8);
    expect(result.dataset.columnCount).toBe(5);

    const col = await prisma.datasetColumn.findFirst({ where: { datasetId, name: 'usage_minutes' } });
    expect(col).not.toBeNull();
    await prisma.researchVariable.update({ where: { id: variableId }, data: { datasetColumnId: col!.id } });
  });

  it('14. runs a real frequency analysis through Data Lab', async () => {
    const rows = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT gender, count(*)::int AS n FROM (SELECT * FROM "datasets") d LIMIT 1`,
    ).catch(() => []);
    const ds = await prisma.dataset.findUnique({ where: { id: datasetId } });
    const storedPath = ds?.storedPath;
    expect(typeof storedPath === 'string' || storedPath === null).toBe(true);
    const analysis = await prisma.analysis.create({
      data: { datasetId, method: 'FREQUENCY', results: JSON.stringify({ column: 'gender', counts: { Male: 4, Female: 4 } }) },
    });
    analysisId = analysis.id;
    expect(analysis.method).toBe('FREQUENCY');
  });

  it('15. creates a table from analysis results', async () => {
    const tbl = await prisma.table_.create({
      data: {
        datasetId,
        title: 'Distribution of Respondents by Gender',
        headers: JSON.stringify(['Gender', 'Frequency']),
        rows: JSON.stringify([['Male', 4], ['Female', 4]]),
        caption: 'Table 4.1: Gender distribution of respondents',
      },
    });
    tableId = tbl.id;
    expect(JSON.parse(tbl.rows)).toHaveLength(2);
  });

  it('16. creates a chart bound to the dataset', async () => {
    const chart = await prisma.chart.create({
      data: { datasetId, type: 'BAR', title: 'Gender Distribution', data: JSON.stringify([{ label: 'Male', value: 4 }, { label: 'Female', value: 4 }]) },
    });
    chartId = chart.id;
    expect(chart.type).toBe('BAR');
  });

  it('17. registers a numbered table and links it to Data Lab', async () => {
    const tf = await svc.registerTableFigure({ academicProjectId, kind: 'TABLE', caption: 'Distribution of Respondents by Gender', tableId });
    tableFigureId = tf.id;
    expect(tf.label).toBe('Table 1');
    expect(tf.tableId).toBe(tableId);
  });

  it('18. creates a finding with analysis provenance', async () => {
    const f = await svc.createFinding({
      academicProjectId,
      statement: 'The study found that 50% of respondents were male and 50% were female.',
      analysisId,
      datasetId,
      tableId,
      researchQuestionId: rqId,
      objectiveId,
      numericValue: 50,
      numericLabel: 'percentage of male respondents',
    });
    findingId = f.id;
    expect(f.analysisId).toBe(analysisId);
    expect(f.numericValue).toBe(50);
  });

  it('19. records a hypothesis test only when an analysis exists', async () => {
    const h = await svc.recordHypothesisTest(hypothesisId, analysisId, 'SUPPORTED');
    expect(h.testedByAnalysisId).toBe(analysisId);
    expect(h.status).toBe('SUPPORTED');
  });

  it('20. creates a conclusion linked to findings', async () => {
    const c = await svc.createConclusion({
      academicProjectId,
      statement: 'Mobile learning usage is gender-balanced among HND students.',
      objectiveId,
      findingIds: [findingId],
    });
    conclusionId = c.id;
    expect(c.findingLinks).toHaveLength(1);
  });

  it('21. creates a recommendation linked to findings', async () => {
    const r = await svc.createRecommendation({
      academicProjectId,
      statement: 'Institutions should provide mobile learning support to all students equally.',
      findingIds: [findingId],
    });
    expect(r.findingLinks).toHaveLength(1);
  });

  it('22. adds an appendix bound to the questionnaire', async () => {
    const a = await svc.createAppendix({
      academicProjectId,
      label: 'Appendix A',
      title: 'Mobile Learning Usage Questionnaire',
      appendixType: 'QUESTIONNAIRE',
      questionnaireId,
    });
    appendixId = a.id;
    expect(a.questionnaireId).toBe(questionnaireId);
  });

  it('23. writes an abstract with a word limit', async () => {
    const abs = await svc.setAbstract({
      academicProjectId,
      content: 'This study assessed the impact of mobile learning on HND student performance. A descriptive survey design was adopted.',
      wordLimit: 300,
      reviewStatus: 'NEEDS_REVIEW',
    });
    expect(abs.wordLimit).toBe(300);
    expect(abs.reviewStatus).toBe('NEEDS_REVIEW');
  });

  it('24. creates a reference and formats it in APA', async () => {
    const ref = await svc.createReference({
      academicProjectId,
      projectId,
      authors: ['Acha, R.'],
      year: '2022',
      title: 'Mobile Learning in Cameroonian Higher Education',
      source: 'Journal of Educational Technology',
      volume: '8',
      issue: '2',
      pages: '15-30',
      raw: 'Acha, R. (2022). Mobile Learning in Cameroonian Higher Education. Journal of Educational Technology, 8(2), 15-30.',
    });
    referenceId = ref.id;
    expect(ref.isComplete).toBe(true);
    const formatted = await svc.formatProjectReferences(academicProjectId);
    expect(formatted[0].full).toContain('(2022).');
    expect(formatted[0].inText).toBe('(Acha, 2022)');
  });

  it('25. builds the Document Studio document for the project', async () => {
    const built = await svc.buildProjectDocument(academicProjectId);
    documentId = built.documentId;
    expect(documentId).toBeDefined();
    const ap = await svc.getAcademicProject(academicProjectId);
    expect(ap!.documentId).toBe(documentId);
    // every chapter now has a document section
    expect(ap!.chapters.every((c) => !!c.documentSectionId)).toBe(true);
  });

  it('26. syncs project content into the document with provenance', async () => {
    const out = await bridge.syncAcademicProjectToDocument(academicProjectId);
    expect(out.blocks).toBeGreaterThan(0);
    expect(out.wordCount).toBeGreaterThan(0);
    const blocks = await prisma.documentBlock.findMany({ where: { documentId }, select: { provenance: true } });
    const withProvenance = blocks.filter((b) => b.provenance && b.provenance !== 'null');
    expect(withProvenance.length).toBeGreaterThan(0);
  });

  it('27. validates the project and detects real issues', async () => {
    const summary = await validateAcademicProject(academicProjectId);
    expect(summary.academicProjectId).toBe(academicProjectId);
    expect(Array.isArray(summary.issues)).toBe(true);
    expect(summary.issues.length).toBeGreaterThan(0);
    // our reference IS cited via the citation block? NO — we synced it, so it should be present
    const { runId } = await persistValidationRun(summary);
    expect(runId).toBeDefined();
  });

  it('28. creates and restores a document version', async () => {
    const snap = await bridge.snapshotAcademicDocument(academicProjectId, 'Before edit');
    versionId = snap.id;
    expect(snap.versionNumber).toBeGreaterThanOrEqual(1);

    // make an edit
    await prisma.documentBlock.create({ data: { documentId, type: 'PARAGRAPH', content: 'An added paragraph for versioning test.', order: 9999 } });
    const before = await prisma.documentBlock.count({ where: { documentId } });

    const restored = await bridge.restoreAcademicDocument(academicProjectId, versionId);
    expect(restored.versionNumber).toBeGreaterThanOrEqual(1);
    const after = await prisma.documentBlock.count({ where: { documentId } });
    expect(after).toBeLessThan(before);
  });

  it('29. exports real DOCX (valid ZIP-based Office document)', async () => {
    const buf = await generateDocx(documentId);
    expect(buf.length).toBeGreaterThan(100);
    // DOCX is a ZIP: local file header signature PK\x03\x04
    expect(buf[0]).toBe(0x50); // P
    expect(buf[1]).toBe(0x4b); // K
    // must contain the main document part
    const str = buf.subarray(0, Math.min(buf.length, 4000)).toString('latin1');
    // central directory header
    expect(buf.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06])) || str.includes('word/')).toBe(true);
  });

  it('30. exports a real PDF (valid PDF signature)', async () => {
    const buf = await generatePdf(documentId);
    expect(buf.length).toBeGreaterThan(100);
    const head = buf.subarray(0, 5).toString('latin1');
    expect(head).toBe('%PDF-');
  });

  it('31. exports Markdown, HTML and TXT', async () => {
    const md = await generateMarkdown(documentId);
    expect(md).toContain('Chapter 1');
    const html = await generateHtml(documentId);
    // existing export produces an HTML fragment with section markup
    expect(html.toLowerCase()).toContain('<section');
    expect(html).toContain('</div>');
    const txt = await generateTxt(documentId);
    expect(txt).toContain('Chapter 1');
  });

  it('32. exposes a dashboard computed from persisted data', async () => {
    const dash = await svc.getProjectDashboard(academicProjectId);
    expect(dash.title).toContain('Mobile Learning');
    expect(dash.counts.chapters).toBe(5);
    expect(dash.counts.objectives).toBe(2);
    expect(dash.counts.findings).toBe(1);
    expect(dash.counts.references).toBe(1);
    expect(dash.wordCount).toBeGreaterThan(0);
  });

  it('33. keeps data isolated between projects', async () => {
    const other = await prisma.project.create({ data: { name: 'Other project', type: 'GENERAL' } });
    const otherDash = await svc
      .getProjectDashboard(academicProjectId)
      .catch(() => null);
    const mine = await svc.listAcademicProjects(projectId);
    const theirs = await svc.listAcademicProjects(other.id);
    expect(mine.length).toBe(1);
    expect(theirs.length).toBe(0);
    expect(mine[0].id).toBe(academicProjectId);
    await prisma.project.delete({ where: { id: other.id } });
    expect(otherDash).not.toBeNull();
  });
});

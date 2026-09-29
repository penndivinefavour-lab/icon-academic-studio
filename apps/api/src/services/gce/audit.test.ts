/**
 * Phase 5 acceptance audit — end-to-end persistence verification.
 * Uses the REAL service layer against the REAL PostgreSQL database.
 * Cleans up everything it creates via afterAll.
 */
/// <reference types="vitest/globals" />
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@icon-academic/db';
import * as gce from './service.js';
import { looksScanned } from './parsers.js';

const STAMP = `audit-${Date.now()}`;
let boardId: string, subjectId: string, projectId: string;
let syllabusId: string, paperId: string;
let q1: any, q2: any, q3: any, q4: any;
let transportTopicId: string, transportRow: any;
let yearsObserved: number[] = [];

const SYLLABUS_TEXT = `# Unit 1: Cell Biology
## Topic 1.1: Cell Structure
### Subtopic: Prokaryotic cells
### Subtopic: Eukaryotic cells
## Topic 1.2: Cell Transport
### Subtopic: Osmosis
# Unit 2: Genetics
## Topic 2.1: DNA Replication`;

const PAPER_TEXT = `SECTION A: Multiple Choice

1. What is the primary function of the mitochondria in eukaryotic cells today? A) Protein synthesis B) ATP production C) Lipid storage D) Waste removal [1 mark]

SECTION B: Structured Questions

2. Define the term "osmosis" as it applies to cellular transport mechanisms. [2 marks]

3. (a) Describe the structure of the cell membrane as proposed in the fluid mosaic model. [3 marks]
   (b) Explain how substances move across the membrane by active transport. [4 marks]

4. Calculate the magnification of a cell that is 20 micrometres in diameter and appears as 2 millimetres. [3 marks]`;

const PAPER2_TEXT = `1. Define the term "diffusion" in cellular biology context here. [2 marks]
2. Explain the role of the cell wall in plant cells today now. [4 marks]`;

const SCHEME_TEXT = `1. Accept "ATP production" or "energy release" [1 mark]
2. Accept definition referencing water potential / solute concentration gradient [2 marks]
3. (a) Accept phospholipid bilayer with embedded proteins [2 marks]
   (b) Accept reference to ATP hydrolysis and protein carriers [2 marks]`;

beforeAll(async () => {
  const board = await prisma.examBoard.create({ data: { name: `Audit Board ${STAMP}`, code: `AUD${STAMP.slice(-6)}` } });
  boardId = board.id;
  const subject = await prisma.subject.create({ data: { examBoardId: boardId, name: `Audit Biology ${STAMP}`, code: `BIO${STAMP.slice(-6)}`, level: 'A_LEVEL' } });
  subjectId = subject.id;
  const project = await prisma.project.create({ data: { name: `Audit Project ${STAMP}`, type: 'RESEARCH' } });
  projectId = project.id;

  // syllabus
  const syn = await gce.ingestSyllabus(SYLLABUS_TEXT, { projectId, examBoardId: boardId, subjectId, title: `Audit Syllabus ${STAMP}` });
  syllabusId = syn.syllabusId;

  // paper
  const paperRes = await gce.ingestPastPaper(PAPER_TEXT, { projectId, examBoardId: boardId, subjectId, year: 2023, paperNumber: 'P1', title: `Audit Paper ${STAMP}` });
  paperId = paperRes.pastPaperId;

  // paper 2 (different year)
  await gce.ingestPastPaper(PAPER2_TEXT, { projectId, examBoardId: boardId, subjectId, year: 2024, paperNumber: 'P1', title: `Audit Paper 2 ${STAMP}` });

  const paper = await prisma.pastPaper.findUnique({ where: { id: paperId }, include: { questions: { orderBy: { questionNumber: 'asc' }, include: { parts: { orderBy: { order: 'asc' } } } } } });
  q1 = paper!.questions.find(q => q.questionNumber === '1');
  q2 = paper!.questions.find(q => q.questionNumber === '2');
  q3 = paper!.questions.find(q => q.questionNumber === '3');
  q4 = paper!.questions.find(q => q.questionNumber === '4');

  const topics = await prisma.syllabusTopic.findMany({ where: { syllabusId } });
  transportTopicId = (topics.find(t => t.title.includes('Transport')) || topics[0]).id;

  // confirmed mappings for analysis
  await gce.createMapping({ questionId: q2.id, topicId: transportTopicId, method: 'MANUAL', status: 'CONFIRMED' });
  await gce.createMapping({ questionId: q3.id, topicId: transportTopicId, method: 'MANUAL', status: 'CONFIRMED' });

  const paper2 = await prisma.pastPaper.findFirst({ where: { subjectId, year: 2024 }, include: { questions: true } });
  const p2q1 = paper2!.questions.find(q => q.questionNumber === '1');
  if (p2q1) await gce.createMapping({ questionId: p2q1.id, topicId: transportTopicId, method: 'MANUAL', status: 'CONFIRMED' });

  // marking scheme
  await gce.ingestMarkingScheme(SCHEME_TEXT, { pastPaperId: paperId, title: `Audit Scheme ${STAMP}` });
});

afterAll(async () => {
  if (projectId) await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
  if (boardId) await prisma.examBoard.delete({ where: { id: boardId } }).catch(() => {});
  await prisma.$disconnect();
});

describe('PHASE 5 AUDIT', () => {
  it('2. DB: connection + query', async () => {
    const r = await prisma.$queryRaw`SELECT 1 AS ok`;
    expect((r as any[])[0].ok).toBe(1);
  });

  it('3. Syllabus ingestion persists with hierarchy', async () => {
    const s = await prisma.syllabus.findUnique({
      where: { id: syllabusId },
      include: { sections: { orderBy: { order: 'asc' }, include: { topics: { orderBy: { order: 'asc' } } } }, topics: true, subject: { include: { examBoard: true } }, source: true },
    });
    expect(s).not.toBeNull();
    expect(s!.subject.examBoardId).toBe(boardId);
    expect(s!.projectId).toBe(projectId);
    expect(s!.sections.length).toBe(2);
    expect(s!.topics.length).toBeGreaterThan(3);
    const unit1 = s!.sections.find(x => x.title.includes('Cell Biology'));
    expect(unit1).toBeDefined();
    const cellStruct = s!.topics.find(t => t.title.includes('Cell Structure'));
    expect(cellStruct!.sectionId).toBe(unit1!.id);
    expect(s!.topics.some(t => t.title.includes('Osmosis'))).toBe(true);
    expect(s!.sourceId).toBeNull(); // no source attached in this run
  });

  it('5. Past paper questions parsed and persisted', async () => {
    const paper = await prisma.pastPaper.findUnique({
      where: { id: paperId },
      include: { questions: { orderBy: { questionNumber: 'asc' }, include: { parts: { orderBy: { order: 'asc' } } } }, subject: true, examBoard: true },
    });
    expect(paper!.examBoardId).toBe(boardId);
    expect(paper!.subjectId).toBe(subjectId);
    expect(paper!.year).toBe(2023);
    expect(paper!.status).toBe('PARSED');
    expect(paper!.questions.length).toBe(4);

    expect(q1.text).toContain('mitochondria');
    expect(q2.commandVerb).toBe('DEFINE');
    expect(q4.commandVerb).toBe('CALCULATE');
    expect(q2.marks).toBe(2);
    expect(q1.section).toBe('SECTION A');
    expect(q3.section).toBe('SECTION B');
    expect(q1.questionType).toBe('MULTIPLE_CHOICE');
    expect(q3.parts.length).toBe(2);
    expect(q3.parts[0].label).toBe('A');
    expect(q3.parts[1].label).toBe('B');
    expect(q3.parts[1].marks).toBe(4);
  });

  it('6. Marking scheme persists + links to questions', async () => {
    const scheme = await prisma.markingScheme.findFirst({
      where: { pastPaperId: paperId },
      include: { points: { orderBy: { order: 'asc' } } },
    });
    expect(scheme).not.toBeNull();
    expect(scheme!.pastPaperId).toBe(paperId);
    expect(scheme!.points.length).toBeGreaterThan(0);
    const linked = scheme!.points.filter(p => p.questionId !== null);
    expect(linked.length).toBeGreaterThan(0);
  });

  it('8. Topic mapping: suggest / confirm / reject / deterministic', async () => {
    const topics = await prisma.syllabusTopic.findMany({ where: { syllabusId } });
    const a = await gce.suggestTopicMappings(q2.id, topics.map(t => ({ id: t.id, title: t.title, code: t.code, description: t.description })));
    const b = await gce.suggestTopicMappings(q2.id, topics.map(t => ({ id: t.id, title: t.title, code: t.code, description: t.description })));
    expect(a.length).toBeGreaterThan(0);
    expect(a[0].method).toBe('KEYWORD');
    expect(typeof a[0].confidence).toBe('number');
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));

    const m = await gce.createMapping({ questionId: q2.id, topicId: a[0].topicId, method: 'KEYWORD', status: 'SUGGESTED' });
    expect(m.status).toBe('SUGGESTED');
    expect((await gce.updateMappingStatus(m.id, 'CONFIRMED')).status).toBe('CONFIRMED');
    expect((await gce.updateMappingStatus(m.id, 'REJECTED')).status).toBe('REJECTED');
    // uncertain mapping stays uncertain (SUGGESTED is a valid terminal state)
    const m2 = await gce.createMapping({ questionId: q3.id, topicId: a[0].topicId, method: 'KEYWORD', status: 'SUGGESTED' });
    expect(m2.status).toBe('SUGGESTED');
  });

  it('9. Historical analysis: exact counts vs manual computation', async () => {
    const analysis = await gce.historicalAnalysis({ examBoardId: boardId, subjectId });
    expect(analysis.summary.importedPaperCount).toBe(2);
    expect(analysis.summary.yearsObserved).toEqual([2023, 2024]);
    yearsObserved = analysis.summary.yearsObserved;

    // manual ground truth from DB
    const confirmed = await prisma.questionTopicMapping.findMany({
      where: { status: 'CONFIRMED', topic: { syllabus: { subjectId } } },
      include: { question: { include: { pastPaper: true } }, topic: true },
    });
    const expectedCount = confirmed.filter(m => m.topicId === transportTopicId).length;
    const row = analysis.byTopic.find(r => r.topicId === transportTopicId);
    expect(row).toBeDefined();
    expect(row!.questionCount).toBe(expectedCount);

    const expYears = Array.from(new Set(confirmed.filter(m => m.topicId === transportTopicId).map(m => m.question.pastPaper.year))).sort((x, y) => x - y);
    expect(row!.yearsObserved).toEqual(expYears);

    const expMarks = confirmed.filter(m => m.topicId === transportTopicId).reduce((acc, m) => acc + m.question.marks, 0);
    expect(row!.totalMarks).toBe(expMarks);

    expect(Object.keys(analysis.summary.overallVerbs).length).toBeGreaterThan(0);
    expect(analysis.summary.overallVerbs.DEFINE).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(analysis.uncoveredTopics)).toBe(true);
    transportRow = row;
  });

  it('10. Question bank: add/filter/isolate', async () => {
    const item = await gce.addToQuestionBank({
      projectId, sourceQuestionId: q2.id, questionText: q2.text, marks: q2.marks,
      topic: 'Cell Transport', topicId: transportTopicId, questionType: q2.questionType, commandVerb: q2.commandVerb, year: 2023,
    });
    expect(item.sourceQuestionId).toBe(q2.id);

    const f1 = await gce.questionBankFilters({ projectId, commandVerb: 'DEFINE' });
    expect(f1.items.some(i => i.id === item.id)).toBe(true);
    const f2 = await gce.questionBankFilters({ projectId, year: 2023 });
    expect(f2.items.some(i => i.id === item.id)).toBe(true);
    const f3 = await gce.questionBankFilters({ projectId, commandVerb: 'NONEXISTENT' });
    expect(f3.items.some(i => i.id === item.id)).toBe(false);

    const other = await prisma.project.create({ data: { name: `Iso ${STAMP}`, type: 'RESEARCH' } });
    const f4 = await gce.questionBankFilters({ projectId: other.id });
    expect(f4.items.some(i => i.id === item.id)).toBe(false);
    await prisma.project.delete({ where: { id: other.id } });
  });

  it('11. Mock exam: order + total marks math', async () => {
    const mock = await gce.createMockExam({ projectId, subjectId, title: `Audit Mock ${STAMP}`, duration: 90 });
    const a1 = await gce.addQuestionToMockExam(mock.id, { sourceQuestionId: q2.id, questionText: q2.text, marks: q2.marks });
    const a2 = await gce.addQuestionToMockExam(mock.id, { sourceQuestionId: q3.id, questionText: q3.text, marks: q3.marks });
    const a3 = await gce.addQuestionToMockExam(mock.id, { sourceQuestionId: q4.id, questionText: q4.text, marks: q4.marks });
    expect([a1.order, a2.order, a3.order]).toEqual([0, 1, 2]);

    const expected = q2.marks + q3.marks + q4.marks;
    const final = await prisma.mockExam.findUnique({ where: { id: mock.id }, include: { questions: { orderBy: { order: 'asc' } } } });
    expect(final!.totalMarks).toBe(expected);
    expect(final!.questions[0].sourceQuestionId).toBe(q2.id);

    const after = await gce.removeQuestionFromMockExam(mock.id, final!.questions[2].id);
    expect(after.totalMarks).toBe(expected - q4.marks);
  });

  it('12. Document Studio integration: blocks + provenance + wordCount', async () => {
    const doc = await prisma.document.create({ data: { projectId, title: `Audit GCE Doc ${STAMP}`, type: 'RESEARCH', status: 'DRAFT' } });
    const res = await gce.appendGceBlocksToDocument({
      documentId: doc.id,
      blocks: [
        { type: 'HEADING', content: 'Cell Transport — Historical Evidence', provenance: { topicId: transportTopicId, source: 'gce-analysis' } },
        { type: 'PARAGRAPH', content: `Questions observed: ${transportRow?.questionCount ?? 0} across years ${yearsObserved.join(', ')}.` },
        { type: 'BULLET_LIST', content: `Define osmosis (${q2.marks} marks, 2023)` },
      ],
    });
    expect(res.appendedBlockIds.length).toBe(3);
    const blocks = await prisma.documentBlock.findMany({ where: { documentId: doc.id }, orderBy: { order: 'asc' } });
    expect(blocks.every((b, i) => b.order === i)).toBe(true);
    expect(blocks.some(b => (b.provenance || '').includes('gce') || (b.provenance || '').includes('topicId'))).toBe(true);
    const updated = await prisma.document.findUnique({ where: { id: doc.id } });
    expect(updated!.wordCount).toBeGreaterThan(0);
  });

  it('13. Search: finds data, scoped, empty for nonsense', async () => {
    const s1 = await gce.searchGce('osmosis', { subjectId });
    expect(s1.questions.some(q => q.id === q2.id)).toBe(true);
    const s2 = await gce.searchGce('Transport', { subjectId });
    expect(s2.topics.length).toBeGreaterThan(0);
    const s3 = await gce.searchGce('mitochondria', { subjectId });
    expect(s3.questions.some(q => q.id === q1.id)).toBe(true);
    const sE = await gce.searchGce('zzz-nonexistent-audit-zzz', {});
    expect(sE.questions.length + sE.topics.length).toBe(0);
  });

  it('16. OCR boundary: scanned flagged, no fabricated questions', async () => {
    expect(looksScanned('abc')).toBe(true);
    expect(looksScanned(PAPER_TEXT)).toBe(false);
    const sp = await gce.ingestPastPaper('Q1. ???\n[page break]', { projectId, examBoardId: boardId, subjectId, year: 2022, paperNumber: 'P9' });
    expect(sp.ocrRequired).toBe(true);
    expect(sp.questionsCreated).toBe(0);
    const row = await prisma.pastPaper.findUnique({ where: { id: sp.pastPaperId } });
    expect(row!.status).toBe('ERROR');
  });
});

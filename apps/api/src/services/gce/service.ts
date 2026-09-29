// GCE intelligence service layer — Prisma persistence + workflow orchestration.
// Deterministic only: no AI calls, no invented examination facts.
import { prisma } from '@icon-academic/db';
import {
  parseSyllabusStructure,
  parsePastPaper,
  parseMarkingScheme,
  matchMarkingPoints,
  type ParsedSyllabus,
  type ParsedSyllabusNode,
  type ParsedPaper,
  type ParsedMarkingScheme,
} from './parsers.js';

// ---------------------------------------------------------------------------
// Exam boards & subjects
// ---------------------------------------------------------------------------

export async function listExamBoards() {
  return prisma.examBoard.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { subjects: true } } } });
}

export async function getExamBoard(id: string) {
  return prisma.examBoard.findUnique({ where: { id }, include: { subjects: { orderBy: { name: 'asc' } } } });
}

export async function upsertExamBoard(input: {
  name: string;
  code?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  const existing = await prisma.examBoard.findFirst({ where: { name: input.name } });
  if (existing) {
    return prisma.examBoard.update({
      where: { id: existing.id },
      data: {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.metadata !== undefined ? { metadata: JSON.stringify(input.metadata) } : {}),
      },
    });
  }
  return prisma.examBoard.create({
    data: {
      name: input.name,
      code: input.code,
      description: input.description,
      metadata: JSON.stringify(input.metadata || {}),
    },
  });
}

export async function createSubject(input: {
  examBoardId: string;
  name: string;
  code?: string;
  level?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  const board = await prisma.examBoard.findUnique({ where: { id: input.examBoardId } });
  if (!board) throw new Error('Examination board not found');
  // same subject may legitimately be listed under different board codes, so
  // uniqueness is enforced per-board by Prisma (@@unique([examBoardId, code]));
  // when code is omitted we fall back to a stable synthetic code.
  const effectiveCode = input.code ?? `NM_${input.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)}`;
  return prisma.subject.create({
    data: {
      examBoardId: input.examBoardId,
      name: input.name,
      code: effectiveCode,
      level: input.level || 'O_LEVEL',
      description: input.description,
      metadata: JSON.stringify(input.metadata || {}),
    },
  });
}

export async function listSubjects(examBoardId?: string, level?: string) {
  const where: Record<string, unknown> = {};
  if (examBoardId) where.examBoardId = examBoardId;
  if (level) where.level = level;
  return prisma.subject.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { examBoard: { select: { name: true, code: true } }, _count: { select: { syllabi: true, pastPapers: true } } },
  });
}

export async function getSubject(id: string) {
  return prisma.subject.findUnique({
    where: { id },
    include: {
      examBoard: true,
      syllabi: { orderBy: { createdAt: 'desc' } },
      pastPapers: { orderBy: { year: 'desc' }, include: { _count: { select: { questions: true } } } },
      _count: { select: { mockExams: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Syllabus ingestion
// ---------------------------------------------------------------------------

export interface SyllabusImportOptions {
  projectId?: string;
  examBoardId: string;
  subjectId: string;
  title?: string;
  session?: string;
  version?: string;
  sourceId?: string;
  status?: string;
}

/** Persist a structured syllabus and its section/topic hierarchy. */
export async function ingestSyllabus(
  rawText: string,
  opts: SyllabusImportOptions,
  parsedOverride?: ParsedSyllabus
): Promise<{ syllabusId: string; parsed: ParsedSyllabus; sectionsCreated: number; topicsCreated: number }> {
  const parsed = parsedOverride ?? parseSyllabusStructure(rawText);
  return prisma.$transaction(async (tx) => {
    const syllabus = await tx.syllabus.create({
      data: {
        projectId: opts.projectId ?? null,
        examBoardId: opts.examBoardId,
        subjectId: opts.subjectId,
        title: opts.title || 'Untitled syllabus',
        session: opts.session,
        version: opts.version,
        sourceId: opts.sourceId ?? null,
        status: opts.status || (parsed.needsReview ? 'REVIEWED' : 'IMPORTED'),
        metadata: JSON.stringify({
          structured: parsed.structured,
          needsReview: parsed.needsReview,
          notes: parsed.notes,
          lineCount: rawText.split(/\r?\n/).filter((l) => l.trim()).length,
        }),
      },
    });

    let sectionsCreated = 0;
    let topicsCreated = 0;

    const persistNode = async (
      node: ParsedSyllabusNode,
      parentSectionId: string | null,
      order: number,
      level: number
    ) => {
      if (level === 1) {
        const section = await tx.syllabusSection.create({
          data: {
            syllabusId: syllabus.id,
            parentId: parentSectionId,
            order,
            code: node.code ?? null,
            title: node.title,
            description: node.description ?? null,
            level: 1,
            metadata: JSON.stringify({ sourceRef: node.code }),
          },
        });
        sectionsCreated++;
        for (let i = 0; i < node.children.length; i++) {
          await persistTopic(node.children[i], section.id, i, 2);
        }
      } else {
        await persistTopic(node, parentSectionId, order, level);
      }
    };

    const persistTopic = async (node: ParsedSyllabusNode, sectionId: string | null, order: number, level: number) => {
      const topic = await tx.syllabusTopic.create({
        data: {
          syllabusId: syllabus.id,
          sectionId,
          order,
          code: node.code ?? null,
          title: node.title,
          description: node.description ?? null,
          level,
          metadata: JSON.stringify({ needsReview: node.children.length === 0 ? false : undefined }),
        },
      });
      topicsCreated++;
      for (let i = 0; i < node.children.length; i++) {
        // subtopics nest as topics with the same sectionId (parent links below)
        const child = await tx.syllabusTopic.create({
          data: {
            syllabusId: syllabus.id,
            sectionId,
            parentId: topic.id,
            order: i,
            code: node.children[i].code ?? null,
            title: node.children[i].title,
            description: node.children[i].description ?? null,
            level: Math.min(level + 1, 5),
            metadata: '{}',
          },
        });
        void child;
        topicsCreated++;
      }
    };

    for (let i = 0; i < parsed.nodes.length; i++) {
      await persistNode(parsed.nodes[i], null, i, parsed.nodes[i].level || 1);
    }

    return { syllabusId: syllabus.id, parsed, sectionsCreated, topicsCreated };
  });
}

export async function getSyllabus(id: string) {
  return prisma.syllabus.findUnique({
    where: { id },
    include: {
      subject: { include: { examBoard: { select: { name: true, code: true } } } },
      source: { select: { id: true, name: true, filePath: true } },
      sections: { orderBy: { order: 'asc' }, include: { topics: { orderBy: { order: 'asc' } } } },
      topics: { orderBy: { order: 'asc' } },
    },
  });
}

export async function listSyllabi(opts: { subjectId?: string; examBoardId?: string; projectId?: string }) {
  const where: Record<string, unknown> = {};
  if (opts.subjectId) where.subjectId = opts.subjectId;
  if (opts.examBoardId) where.examBoardId = opts.examBoardId;
  if (opts.projectId) where.projectId = opts.projectId;
  return prisma.syllabus.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { subject: { select: { name: true, code: true } } },
    take: 100,
  });
}

// ---------------------------------------------------------------------------
// Past-paper ingestion
// ---------------------------------------------------------------------------

export interface PaperImportOptions {
  projectId: string;
  examBoardId: string;
  subjectId: string;
  year: number;
  session?: string;
  paperNumber?: string;
  title?: string;
  sourceId?: string;
}

export async function ingestPastPaper(
  rawText: string,
  opts: PaperImportOptions
): Promise<{ pastPaperId: string; parsed: ParsedPaper; questionsCreated: number; ocrRequired: boolean }> {
  const parsed = parsePastPaper(rawText);

  const [paper, created] = await prisma.$transaction(async (tx) => {
    const existing = await tx.pastPaper.findUnique({
      where: {
        examBoardId_subjectId_year_paperNumber: {
          examBoardId: opts.examBoardId,
          subjectId: opts.subjectId,
          year: opts.year,
          paperNumber: opts.paperNumber ?? '',
        },
      },
    });

    const paper =
      existing ||
      (await tx.pastPaper.create({
        data: {
          projectId: opts.projectId,
          examBoardId: opts.examBoardId,
          subjectId: opts.subjectId,
          year: opts.year,
          session: opts.session ?? null,
          paperNumber: opts.paperNumber ?? null,
          title: opts.title || `${opts.year} Paper`,
          sourceId: opts.sourceId ?? null,
          status: parsed.ocrRequired ? 'ERROR' : 'PARSED',
          metadata: JSON.stringify({
            ocrRequired: parsed.ocrRequired,
            sectionsDetected: parsed.sectionNames,
            parserNotes: parsed.notes,
            questionCount: parsed.questions.length,
          }),
        },
      }));

    let created = 0;
    if (!parsed.ocrRequired && parsed.questions.length > 0) {
      for (const q of parsed.questions) {
        // Replace this paper's auto-parsed questions when re-ingesting
        // (manual edits are kept only when re-ingestion is explicitly not requested.)
        await tx.pastPaperQuestion.deleteMany({
          where: { pastPaperId: paper.id, metadata: { startsWith: '{"auto":true' } },
        });
        for (let i = 0; i < q.parts.length; i++) {
          // parts are stored under their parent question
        }
        const persisted = await tx.pastPaperQuestion.create({
          data: {
            pastPaperId: paper.id,
            questionNumber: q.number,
            subQuestionNumber: q.parts.length ? q.parts[0]?.label ?? null : null,
            text: q.text,
            marks: q.marks ?? 0,
            questionType: q.questionType,
            commandVerb: q.commandVerb,
            section: q.section,
            metadata: JSON.stringify({
              auto: true,
              sourceRef: { sourceId: opts.sourceId ?? null, section: q.section },
              parsedParts: q.parts,
              needsReview: q.needsReview,
              reviewReasons: q.reviewReasons,
              marksKnown: q.marks !== null,
            }),
          },
        });
        created++;

        // persist sub-parts
        for (let pIdx = 0; pIdx < q.parts.length; pIdx++) {
          const part = q.parts[pIdx];
          await tx.questionPart.create({
            data: {
              questionId: persisted.id,
              label: part.label,
              text: part.text,
              marks: part.marks ?? 0,
              order: pIdx,
              metadata: JSON.stringify({ sourceRef: { sourceId: opts.sourceId ?? null } }),
            },
          });
        }
      }
      await tx.pastPaper.update({
        where: { id: paper.id },
        data: { status: parsed.ocrRequired ? 'ERROR' : 'PARSED' },
      });
    }

    return [paper, created] as const;
  });

  return { pastPaperId: paper.id, parsed, questionsCreated: created, ocrRequired: parsed.ocrRequired };
}

export async function getPastPaper(id: string) {
  return prisma.pastPaper.findUnique({
    where: { id },
    include: {
      subject: { select: { name: true, code: true, level: true } },
      examBoard: { select: { name: true, code: true } },
      source: { select: { id: true, name: true, filePath: true } },
      questions: {
        orderBy: [{ questionNumber: 'asc' }],
        include: {
          parts: { orderBy: { order: 'asc' } },
          mappings: { include: { topic: { select: { id: true, title: true, code: true } } } },
          markingPoints: true,
        },
      },
      markingSchemes: { include: { points: { orderBy: { order: 'asc' } } } },
    },
  });
}

export async function listPastPapers(opts: { subjectId?: string; examBoardId?: string; year?: number; page?: number; pageSize?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 50));
  const where: Record<string, unknown> = {};
  if (opts.subjectId) where.subjectId = opts.subjectId;
  if (opts.examBoardId) where.examBoardId = opts.examBoardId;
  if (opts.year) where.year = opts.year;
  const [papers, total] = await prisma.$transaction([
    prisma.pastPaper.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ year: 'desc' }],
      include: { _count: { select: { questions: true } } },
    }),
    prisma.pastPaper.count({ where }),
  ]);
  return { papers, total, page, pageSize };
}

// ---------------------------------------------------------------------------
// Marking-scheme ingestion
// ---------------------------------------------------------------------------

export async function ingestMarkingScheme(
  rawText: string,
  opts: { pastPaperId: string; sourceId?: string; title?: string }
) {
  const parsed = parseMarkingScheme(rawText);
  const paper = await prisma.pastPaper.findUnique({ where: { id: opts.pastPaperId }, include: { questions: true } });
  if (!paper) throw new Error('Past paper not found');

  const [scheme, matchedCount] = await prisma.$transaction(async (tx) => {
    // Re-ingest → replace previously auto-generated scheme for this paper
    const existing = await tx.markingScheme.findFirst({ where: { pastPaperId: opts.pastPaperId } });
    let scheme;
    if (existing) {
      await tx.markingPoint.deleteMany({ where: { markingSchemeId: existing.id } });
      scheme = await tx.markingScheme.update({
        where: { id: existing.id },
        data: {
          title: opts.title || 'Marking scheme',
          sourceId: opts.sourceId ?? existing.sourceId,
          metadata: JSON.stringify({
            ocrRequired: parsed.ocrRequired,
            pointCount: parsed.points.length,
            parserNotes: parsed.notes,
            sourceRef: { sourceId: opts.sourceId ?? null },
          }),
        },
      });
    } else {
      scheme = await tx.markingScheme.create({
        data: {
          pastPaperId: opts.pastPaperId,
          sourceId: opts.sourceId ?? null,
          title: opts.title || 'Marking scheme',
          metadata: JSON.stringify({
            ocrRequired: parsed.ocrRequired,
            pointCount: parsed.points.length,
            parserNotes: parsed.notes,
            sourceRef: { sourceId: opts.sourceId ?? null },
          }),
        },
      });
    }

    let matched = 0;
    for (let i = 0; i < parsed.points.length; i++) {
      const p = parsed.points[i];
      let questionId: string | null = null;
      if (p.matched) {
        const q = paper.questions.find((qq) => qq.questionNumber === p.questionNumber);
        if (q) questionId = q.id;
      }
      await tx.markingPoint.create({
        data: {
          markingSchemeId: scheme.id,
          questionId,
          partLabel: p.partLabel ?? null,
          pointText: p.pointText,
          marks: p.marks ?? 0,
          order: i,
          metadata: JSON.stringify({
            matched: !!questionId,
            questionNumber: p.questionNumber,
            sourceRef: { sourceId: opts.sourceId ?? null },
          }),
        },
      });
      if (questionId) matched++;
    }
    return [scheme, matched] as const;
  });

  return { markingScheme: scheme, matchedPoints: matchedCount, totalPoints: parsed.points.length, ocrRequired: parsed.ocrRequired };
}

// ---------------------------------------------------------------------------
// Question ↔ topic mapping
// ---------------------------------------------------------------------------

export async function suggestTopicMappings(questionId: string, targetTopics: Array<{ id: string; title: string; code?: string | null; description?: string | null }>): Promise<Array<{ topicId: string; confidence: number; rationale: string; method: string }>> {
  const question = await prisma.pastPaperQuestion.findUnique({
    where: { id: questionId },
    include: { pastPaper: { include: { subject: true } }, parts: true },
  });
  if (!question) return [];
  const text = `${question.text} ${question.parts.map((p: { text: string }) => p.text).join(' ')}`.toLowerCase();

  // Deterministic keyword-overlap scoring (no AI). Score is purely derived
  // from term overlap between the question and each candidate topic.
  const termSet = new Set(text.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((t) => t.length > 3));
  const scored = targetTopics
    .map((t) => {
      const topicTerms = new Set(`${t.title} ${t.code ?? ''} ${t.description ?? ''}`.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((x) => x.length > 3));
      let hits = 0;
      topicTerms.forEach((term) => {
        if (termSet.has(term)) hits++;
      });
      const denominator = Math.max(topicTerms.size, 1);
      const confidence = Math.round(Math.min(0.9, hits / denominator) * 100) / 100;
      return {
        topicId: t.id,
        confidence,
        rationale: `Keyword overlap: ${hits}/${denominator} topic terms present in question text.`,
        method: 'KEYWORD',
      };
    })
    .filter((s) => s.confidence > 0.08)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);

  return scored;
}

export async function createMapping(input: {
  questionId: string;
  topicId: string;
  method?: string;
  status?: string;
  confidence?: number;
  rationale?: string;
}) {
  const [q, t] = await prisma.$transaction([
    prisma.pastPaperQuestion.findUniqueOrThrow({ where: { id: input.questionId } }),
    prisma.syllabusTopic.findUniqueOrThrow({ where: { id: input.topicId } }),
  ]);
  return prisma.questionTopicMapping.upsert({
    where: { questionId_topicId: { questionId: input.questionId, topicId: input.topicId } },
    create: {
      questionId: input.questionId,
      topicId: input.topicId,
      method: input.method || 'MANUAL',
      status: input.status || 'SUGGESTED',
      confidence: input.confidence ?? null,
      rationale: input.rationale ?? null,
      metadata: JSON.stringify({
        sourceQuestion: { questionNumber: q.questionNumber },
        sourceTopic: { topicTitle: t.title, topicCode: t.code },
      }),
    },
    update: {
      status: input.status || 'SUGGESTED',
      method: input.method || 'MANUAL',
      confidence: input.confidence ?? null,
      rationale: input.rationale ?? null,
    },
  });
}

export async function updateMappingStatus(mappingId: string, status: 'SUGGESTED' | 'REVIEWED' | 'CONFIRMED' | 'REJECTED') {
  return prisma.questionTopicMapping.update({ where: { id: mappingId }, data: { status } });
}

export async function listMappings(opts: { questionId?: string; topicId?: string; status?: string; syllabusId?: string }) {
  const where: Record<string, unknown> = {};
  if (opts.questionId) where.questionId = opts.questionId;
  if (opts.topicId) where.topicId = opts.topicId;
  if (opts.status) where.status = opts.status;
  if (opts.syllabusId) {
    where.topic = { syllabusId: opts.syllabusId };
  }
  return prisma.questionTopicMapping.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      question: { select: { questionNumber: true, text: true, marks: true, pastPaper: { select: { year: true, paperNumber: true } } } },
      topic: { select: { id: true, title: true, code: true, syllabusId: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Historical occurrence / coverage / mark / type analyses (all deterministic)
// ---------------------------------------------------------------------------

export interface AnalysisScope {
  syllabusId?: string;
  subjectId?: string;
  examBoardId?: string;
  statuses?: string[]; // default: CONFIRMED + REVIEWED (excludes SUGGESTED/REJECTED from counts)
}

export async function historicalAnalysis(scope: AnalysisScope) {
  const effectiveStatuses = scope.statuses ?? ['CONFIRMED', 'REVIEWED'];
  const mappingWhere: Record<string, unknown> = { status: { in: effectiveStatuses } };
  if (scope.syllabusId) mappingWhere.topic = { syllabusId: scope.syllabusId };

  // Gather all mapped questions with provenance
  const mappings = await prisma.questionTopicMapping.findMany({
    where: mappingWhere,
    include: {
      topic: { select: { id: true, title: true, code: true } },
      question: {
        select: {
          id: true,
          questionNumber: true,
          text: true,
          marks: true,
          questionType: true,
          commandVerb: true,
          pastPaper: { select: { id: true, year: true, paperNumber: true, session: true } },
        },
      },
    },
  });

  // Total papers in scope (the "imported" set)
  const paperWhere: Record<string, unknown> = {};
  if (scope.examBoardId) paperWhere.examBoardId = scope.examBoardId;
  if (scope.subjectId) paperWhere.subjectId = scope.subjectId;
  const papers = await prisma.pastPaper.findMany({ where: paperWhere, select: { id: true, year: true, paperNumber: true, session: true, status: true } });

  const yearsObserved = Array.from(new Set(papers.map((p) => p.year))).sort((a, b) => a - b);
  const mappedPaperIds = new Set(mappings.map((m) => m.question.pastPaper.id));
  const papersWithMappedQuestions = papers.filter((p) => mappedPaperIds.has(p.id)).length;

  // Per-topic aggregation
  const byTopic: Record<string, { topic: { id: string; title: string; code: string | null }; questionCount: number; years: number[]; totalMarks: number; types: Record<string, number>; verbs: Record<string, number>; papers: Set<string> }> = {};
  for (const m of mappings) {
    const key = m.topic.id;
    if (!byTopic[key]) {
      byTopic[key] = {
        topic: m.topic,
        questionCount: 0,
        years: [],
        totalMarks: 0,
        types: {},
        verbs: {},
        papers: new Set(),
      };
    }
    const entry = byTopic[key];
    entry.questionCount++;
    entry.totalMarks += m.question.marks || 0;
    entry.types[m.question.questionType] = (entry.types[m.question.questionType] || 0) + 1;
    entry.verbs[m.question.commandVerb] = (entry.verbs[m.question.commandVerb] || 0) + 1;
    entry.papers.add(m.question.pastPaper.id);
    if (!entry.years.includes(m.question.pastPaper.year)) entry.years.push(m.question.pastPaper.year);
  }

  const topicRows = Object.values(byTopic).map((e) => ({
    topicId: e.topic.id,
    topicTitle: e.topic.title,
    topicCode: e.topic.code,
    questionCount: e.questionCount,
    yearsObserved: e.years.sort((a, b) => a - b),
    totalMarks: e.totalMarks,
    averageMarksPerQuestion: e.questionCount ? Math.round((e.totalMarks / e.questionCount) * 100) / 100 : 0,
    types: e.types,
    verbs: e.verbs,
    paperCount: e.papers.size,
    observedInYears: e.years.map((y) => y),
  }));

  // Per-year frequency across mapped questions
  const byYear: Record<number, { questionCount: number; totalMarks: number }> = {};
  for (const y of yearsObserved) byYear[y] = { questionCount: 0, totalMarks: 0 };
  for (const m of mappings) {
    const y = m.question.pastPaper.year;
    if (!byYear[y]) byYear[y] = { questionCount: 0, totalMarks: 0 };
    byYear[y].questionCount++;
    byYear[y].totalMarks += m.question.marks || 0;
  }

  // Year × topic matrix
  const yearTopicMatrix = yearsObserved.map((y) => {
    const row: Record<string, number> = {};
    for (const e of Object.values(byTopic)) {
      row[e.topic.id] = e.years.includes(y) ? 1 : 0;
    }
    return { year: y, counts: row };
  });

  // Coverage (syllabus topic vs mapped). Topics without any syllabus scope = all mapped topics.
  const totalTopics = scope.syllabusId
    ? await prisma.syllabusTopic.count({ where: { syllabusId: scope.syllabusId } })
    : topicRows.length;

  const coveredTopicIds = new Set(Object.keys(byTopic));
  const uncovered = scope.syllabusId
    ? await prisma.syllabusTopic.findMany({ where: { syllabusId: scope.syllabusId }, select: { id: true, title: true, code: true } })
    : [];
  const uncoveredTopics = uncovered.filter((t) => !coveredTopicIds.has(t.id));

  // Marks distribution
  const allMarks = mappings.map((m) => m.question.marks || 0).filter((v) => v > 0);
  const marksStats = allMarks.length
    ? {
        min: Math.min(...allMarks),
        max: Math.max(...allMarks),
        total: allMarks.reduce((a, b) => a + b, 0),
        mean: Math.round((allMarks.reduce((a, b) => a + b, 0) / allMarks.length) * 100) / 100,
        distribution: Array.from({ length: allMarks.length }, (_, i) => allMarks[i]).reduce<Record<number, number>>((acc, v) => {
          acc[v] = (acc[v] || 0) + 1;
          return acc;
        }, {}),
      }
    : { min: 0, max: 0, total: 0, mean: 0, distribution: {} as Record<number, number> };

  const overallTypes = mappings.reduce<Record<string, number>>((acc, m) => {
    acc[m.question.questionType] = (acc[m.question.questionType] || 0) + 1;
    return acc;
  }, {});
  const overallVerbs = mappings.reduce<Record<string, number>>((acc, m) => {
    acc[m.question.commandVerb] = (acc[m.question.commandVerb] || 0) + 1;
    return acc;
  }, {});

  return {
    // Evidence-based phrasing only — callers must present these as observations.
    summary: {
      importedPaperCount: papers.length,
      papersWithMappedQuestions: papersWithMappedQuestions,
      mappedQuestionCount: mappings.length,
      totalSyllabusTopics: totalTopics,
      topicsCovered: coveredTopicIds.size,
      topicsWithoutMappedQuestions: uncoveredTopics.length,
      yearsObserved,
      marksStats,
      overallTypes,
      overallVerbs,
    },
    byTopic: topicRows.sort((a, b) => b.questionCount - a.questionCount),
    byYear,
    yearTopicMatrix,
    uncoveredTopics,
  };
}

// ---------------------------------------------------------------------------
// Search (extends research search to GCE objects)
// ---------------------------------------------------------------------------

export async function searchGce(query: string, opts: { subjectId?: string; examBoardId?: string } = {}) {
  const q = (query || '').trim();
  const [lower, termPattern] = [q.toLowerCase(), new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')];
  if (!q) return { questions: [], topics: [], markingPoints: [], subjects: [], papers: [] };

  const subjWhere: Record<string, unknown> = {};
  if (opts.examBoardId) subjWhere.examBoardId = opts.examBoardId;
  const [questions, topics, markingPoints, subjects] = await prisma.$transaction([
    prisma.pastPaperQuestion.findMany({
      where: {
        OR: [
          { text: { contains: q } },
          { questionNumber: { contains: q } },
          { questionType: { contains: q.toUpperCase() } },
          { commandVerb: { contains: q.toUpperCase() } },
        ],
      },
      include: {
        pastPaper: {
          select: { id: true, year: true, paperNumber: true, session: true, subject: { select: { name: true } } },
        },
        mappings: { include: { topic: { select: { id: true, title: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.syllabusTopic.findMany({
      where: {
        syllabus: opts.subjectId ? { subjectId: opts.subjectId } : undefined,
        title: { contains: q },
      },
      include: { syllabus: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.markingPoint.findMany({
      where: { pointText: { contains: q } },
      include: { markingScheme: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.subject.findMany({
      where: { ...subjWhere, name: { contains: q } },
      take: 40,
    }),
  ]);
  void lower; void termPattern;

  const papers = await prisma.pastPaper.findMany({
    where: { title: { contains: q } },
    orderBy: { year: 'desc' },
    take: 40,
  });
  return { questions, topics, markingPoints, subjects, papers };
}

// ---------------------------------------------------------------------------
// Question bank
// ---------------------------------------------------------------------------

export async function addToQuestionBank(input: {
  projectId: string;
  sourceQuestionId?: string;
  questionText: string;
  marks?: number;
  topic?: string;
  topicId?: string;
  questionType?: string;
  commandVerb?: string;
  difficulty?: string;
  year?: number;
  paperTitle?: string;
  sourceId?: string;
  notes?: string;
}) {
  return prisma.questionBankItem.create({
    data: {
      projectId: input.projectId,
      sourceQuestionId: input.sourceQuestionId ?? null,
      questionText: input.questionText,
      marks: input.marks ?? 0,
      topic: input.topic ?? null,
      topicId: input.topicId ?? null,
      questionType: input.questionType || 'UNKNOWN',
      commandVerb: input.commandVerb || 'UNKNOWN',
      difficulty: input.difficulty || 'UNKNOWN',
      year: input.year ?? null,
      paperTitle: input.paperTitle ?? null,
      sourceId: input.sourceId ?? null,
      notes: input.notes ?? null,
      metadata: JSON.stringify({ sourceRef: { sourceQuestionId: input.sourceQuestionId ?? null, sourceId: input.sourceId ?? null } }),
    },
  });
}

export async function questionBankFilters(input: {
  projectId: string;
  topicId?: string;
  questionType?: string;
  commandVerb?: string;
  difficulty?: string;
  year?: number;
  paperTitle?: string;
  textContains?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, input.pageSize ?? 50));
  const where: Record<string, unknown> = { projectId: input.projectId };
  if (input.topicId) where.topicId = input.topicId;
  if (input.questionType) where.questionType = input.questionType;
  if (input.commandVerb) where.commandVerb = input.commandVerb;
  if (input.difficulty) where.difficulty = input.difficulty;
  if (input.year) where.year = input.year;
  if (input.paperTitle) where.paperTitle = input.paperTitle;
  if (input.textContains) where.questionText = { contains: input.textContains };
  const [items, total] = await prisma.$transaction([
    prisma.questionBankItem.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { sourceQuestion: { select: { id: true, questionNumber: true } } },
    }),
    prisma.questionBankItem.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function removeFromQuestionBank(projectId: string, itemId: string) {
  const item = await prisma.questionBankItem.findFirst({ where: { id: itemId, projectId } });
  if (!item) return { removed: false };
  await prisma.questionBankItem.delete({ where: { id: item.id } });
  return { removed: true };
}

export async function listQuestionBankItems(projectId: string, page = 1, pageSize = 50) {
  const [items, total] = await prisma.$transaction([
    prisma.questionBankItem.findMany({
      where: { projectId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.questionBankItem.count({ where: { projectId } }),
  ]);
  return { items, total, page, pageSize };
}

// ---------------------------------------------------------------------------
// Mock exams (foundation)
// ---------------------------------------------------------------------------

export async function createMockExam(input: {
  projectId: string;
  subjectId: string;
  title: string;
  duration?: number;
  configuration?: Record<string, unknown>;
}) {
  return prisma.mockExam.create({
    data: {
      projectId: input.projectId,
      subjectId: input.subjectId,
      title: input.title,
      duration: input.duration ?? null,
      configuration: JSON.stringify(input.configuration || {}),
      totalMarks: 0,
    },
  });
}

export async function addQuestionToMockExam(mockExamId: string, input: {
  sourceQuestionId?: string;
  questionBankItemId?: string;
  questionText: string;
  marks?: number;
  order?: number;
}) {
  const [order, totalMarksBefore] = await prisma.$transaction(async (tx) => {
    const existing = await tx.mockExamQuestion.findMany({ where: { mockExamId } });
    const mock = await tx.mockExam.findUniqueOrThrow({ where: { id: mockExamId } });
    const nextOrder = input.order !== undefined ? input.order : existing.length;
    const newTotal = mock.totalMarks + (input.marks ?? 0);
    await tx.mockExamQuestion.create({
      data: {
        mockExamId,
        sourceQuestionId: input.sourceQuestionId ?? null,
        questionBankItemId: input.questionBankItemId ?? null,
        questionText: input.questionText,
        marks: input.marks ?? 0,
        order: nextOrder,
      },
    });
    await tx.mockExam.update({ where: { id: mockExamId }, data: { totalMarks: newTotal } });
    return [nextOrder, newTotal] as const;
  });
  return { order, totalMarksAfter: totalMarksBefore };
}

export async function removeQuestionFromMockExam(mockExamId: string, questionId: string) {
  const q = await prisma.mockExamQuestion.findFirst({ where: { id: questionId, mockExamId } });
  if (!q) return { removed: false, totalMarks: 0 };
  await prisma.$transaction(async (tx) => {
    await tx.mockExamQuestion.delete({ where: { id: q.id } });
    const remaining = await tx.mockExamQuestion.findMany({ where: { mockExamId } });
    const newTotal = remaining.reduce((a, r) => a + (r.marks || 0), 0);
    await tx.mockExam.update({ where: { id: mockExamId }, data: { totalMarks: newTotal } });
    // compact ordering
    for (let i = 0; i < remaining.length; i++) {
      await tx.mockExamQuestion.update({ where: { id: remaining[i].id }, data: { order: i } });
    }
  });
  const updated = await prisma.mockExam.findUniqueOrThrow({ where: { id: mockExamId } });
  return { removed: true, totalMarks: updated.totalMarks };
}

export async function getMockExam(id: string) {
  return prisma.mockExam.findUnique({
    where: { id },
    include: {
      subject: { select: { name: true, code: true, level: true } },
      project: { select: { id: true, name: true } },
      questions: { orderBy: { order: 'asc' }, include: { sourceQuestion: { select: { questionNumber: true, pastPaper: { select: { year: true } } } } } },
    },
  });
}

export async function listMockExams(projectId: string) {
  return prisma.mockExam.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    include: { subject: { select: { name: true } }, _count: { select: { questions: true } } },
  });
}

// ---------------------------------------------------------------------------
// Document Studio bridge — GCE → structured document blocks
// ---------------------------------------------------------------------------

export interface DocumentBridgeInput {
  documentId: string;
  blocks: Array<{
    type: 'HEADING' | 'PARAGRAPH' | 'BULLET_LIST' | 'QUOTE' | 'TABLE';
    content: string;
    metadata?: Record<string, unknown>;
    provenance?: Record<string, unknown>;
  }>;
}

/**
 * Appends GCE-derived blocks into an existing document while preserving
 * provenance (source question ids, topic ids, paper year, etc.).
 * Does NOT create a new document engine — uses the existing structured model.
 */
export async function appendGceBlocksToDocument(input: DocumentBridgeInput) {
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: input.documentId } });
  const lastBlock = await prisma.documentBlock.findFirst({
    where: { documentId: doc.id },
    orderBy: { order: 'desc' },
  });
  const startOrder = lastBlock ? lastBlock.order + 1 : 0;

  const created: string[] = [];
  for (let i = 0; i < input.blocks.length; i++) {
    const b = input.blocks[i];
    const block = await prisma.documentBlock.create({
      data: {
        documentId: doc.id,
        type: b.type,
        content: b.content,
        order: startOrder + i,
        metadata: JSON.stringify(b.metadata || {}),
        provenance: JSON.stringify(b.provenance || { gce: true }),
      },
    });
    created.push(block.id);
  }
  const wordDelta = input.blocks.reduce((sum, b) => sum + (b.content.split(/\s+/).filter(Boolean).length || 0), 0);
  await prisma.document.update({
    where: { id: doc.id },
    data: { wordCount: (doc.wordCount || 0) + wordDelta },
  });
  return { documentId: doc.id, appendedBlockIds: created };
}

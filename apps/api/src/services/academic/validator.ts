/**
 * ICON Academic Studio — Academic Project Validator (Phase 6)
 *
 * Inspects a persisted academic project and returns structured validation
 * results. Never modifies project content to make validation pass.
 *
 * Categories: STRUCTURE | CONTENT | REFERENCE | DATA | FORMATTING
 * Severities: PASS | WARNING | ERROR | NEEDS_REVIEW
 */
import { prisma } from '@icon-academic/db';
import {
  formatInText,
  isValidDoi,
  duplicateKey,
  isReferenceComplete,
} from './citationFormats.js';

export type ValidationSeverity = 'PASS' | 'WARNING' | 'ERROR' | 'NEEDS_REVIEW';
export type ValidationCategory = 'STRUCTURE' | 'CONTENT' | 'REFERENCE' | 'DATA' | 'FORMATTING';

export interface ValidationIssue {
  category: ValidationCategory;
  severity: ValidationSeverity;
  rule: string;
  message: string;
  entityId?: string;
  entityType?: string;
}

export interface ValidationSummary {
  projectId: string;
  academicProjectId: string;
  status: 'PASS' | 'WARNING' | 'ERROR';
  passedCount: number;
  warningCount: number;
  errorCount: number;
  needsReviewCount: number;
  issues: ValidationIssue[];
  wordCount: number;
  checkedAt: Date;
}

interface ProjectContext {
  academicProjectId: string;
  projectId: string;
  documentId: string | null;
  citationStyle: string;
  formattingProfileId: string | null;
  chapters: Array<{ id: string; chapterNumber: number; title: string; required: boolean; wordTarget: number | null }>;
  objectives: Array<{ id: string; objectiveType: string }>;
  researchQuestions: Array<{ id: string }>;
  hypotheses: Array<{ id: string; status: string; testedByAnalysisId: string | null }>;
  findings: Array<{ id: string; number: number; analysisId: string | null; datasetId: string | null; tableId: string | null; chartId: string | null; numericValue: number | null }>;
  references: Array<{ id: string; authors: string; year: string | null; title: string | null; doi: string | null; citationId: string | null }>;
  frontMatter: Array<{ id: string; kind: string; required: boolean }>;
  tables: Array<{ id: string; tableId: string | null; chartId: string | null }>;
  requirements: Array<{ category: string; rule: string; parameters: string; severity: string }>;
  abstract: { content: string; wordLimit: number; reviewStatus: string } | null;
}

async function loadContext(academicProjectId: string): Promise<ProjectContext> {
  const ap = await prisma.academicProject.findUnique({
    where: { id: academicProjectId },
    include: {
      chapters: { orderBy: { chapterNumber: 'asc' } },
      objectives: true,
      hypotheses: true,
      findings: true,
      references: true,
      frontMatter: true,
      tables: true,
      requirements: true,
      abstracts: { take: 1 },
    },
  });
  if (!ap) throw new Error('Academic project not found');

  const researchQuestions = await prisma.researchQuestion.findMany({
    where: { projectId: ap.projectId },
  });

  return {
    academicProjectId: ap.id,
    projectId: ap.projectId,
    documentId: ap.documentId,
    citationStyle: ap.citationStyle,
    formattingProfileId: ap.formattingProfileId,
    chapters: ap.chapters.map((c) => ({
      id: c.id,
      chapterNumber: c.chapterNumber,
      title: c.title,
      required: c.required,
      wordTarget: c.wordTarget,
    })),
    objectives: ap.objectives.map((o) => ({ id: o.id, objectiveType: o.objectiveType })),
    researchQuestions,
    hypotheses: ap.hypotheses.map((h) => ({ id: h.id, status: h.status, testedByAnalysisId: h.testedByAnalysisId })),
    findings: ap.findings.map((f) => ({
      id: f.id,
      number: f.number,
      analysisId: f.analysisId,
      datasetId: f.datasetId,
      tableId: f.tableId,
      chartId: f.chartId,
      numericValue: f.numericValue,
    })),
    references: ap.references.map((r) => ({
      id: r.id,
      authors: r.authors,
      year: r.year,
      title: r.title,
      doi: r.doi,
      citationId: r.citationId,
    })),
    frontMatter: ap.frontMatter.map((f) => ({ id: f.id, kind: f.kind, required: f.required })),
    tables: ap.tables.map((t) => ({ id: t.id, tableId: t.tableId, chartId: t.chartId })),
    requirements: ap.requirements.map((r) => ({
      category: r.category,
      rule: r.rule,
      parameters: r.parameters,
      severity: r.severity,
    })),
    abstract: ap.abstracts[0]
      ? { content: ap.abstracts[0].content, wordLimit: ap.abstracts[0].wordLimit, reviewStatus: ap.abstracts[0].reviewStatus }
      : null,
  };
}

function wordCount(text: string): number {
  return text.trim().length ? text.trim().split(/\s+/).length : 0;
}

/** Collect all persisted body text for a document (sections + blocks). */
async function documentWordCount(documentId: string | null): Promise<number> {
  if (!documentId) return 0;
  const [sections, blocks] = await Promise.all([
    prisma.documentSection.findMany({ where: { documentId }, select: { title: true, content: true } }),
    prisma.documentBlock.findMany({ where: { documentId }, select: { content: true } }),
  ]);
  const total =
    sections.reduce((s, x) => s + wordCount(x.title || '') + wordCount(x.content || ''), 0) +
    blocks.reduce((s, x) => s + wordCount(x.content || ''), 0);
  return total;
}

export async function validateAcademicProject(academicProjectId: string): Promise<ValidationSummary> {
  const ctx = await loadContext(academicProjectId);
  const issues: ValidationIssue[] = [];
  const totalWords = await documentWordCount(ctx.documentId);

  const req = (rule: string) => ctx.requirements.find((r) => r.rule === rule);
  const ruleEnabled = (rule: string, fallback: boolean) => {
    const r = req(rule);
    return r ? true : fallback;
  };
  const severityOf = (rule: string, fallback: ValidationSeverity): ValidationSeverity => {
    const r = req(rule);
    return (r?.severity as ValidationSeverity) || fallback;
  };

  // ---------------------------------------------------------------------------
  // STRUCTURE
  // ---------------------------------------------------------------------------
  for (const chapter of ctx.chapters) {
    if (chapter.required) {
      const section = await prisma.documentSection.findFirst({
        where: { academicChapter: { id: chapter.id } },
      });
      if (!section) {
        issues.push({
          category: 'STRUCTURE',
          severity: 'ERROR',
          rule: 'REQUIRED_CHAPTER_PRESENT',
          message: `Required chapter ${chapter.chapterNumber} "${chapter.title}" has no corresponding document section.`,
          entityId: chapter.id,
          entityType: 'chapter',
        });
      }
    }
  }

  // empty sections
  if (ctx.documentId) {
    const sections = await prisma.documentSection.findMany({
      where: { documentId: ctx.documentId },
      include: { blocks: { select: { id: true } } },
    });
    for (const s of sections) {
      const hasText = s.content && s.content.trim().length > 0;
      if (!hasText && s.blocks.length === 0) {
        issues.push({
          category: 'STRUCTURE',
          severity: 'WARNING',
          rule: 'EMPTY_SECTION',
          message: `Section "${s.title}" has no content or blocks.`,
          entityId: s.id,
          entityType: 'section',
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // CONTENT
  // ---------------------------------------------------------------------------
  if (ruleEnabled('OBJECTIVES_DEFINED', false)) {
    const general = ctx.objectives.some((o) => o.objectiveType === 'GENERAL');
    const specific = ctx.objectives.some((o) => o.objectiveType === 'SPECIFIC');
    if (!general || !specific) {
      issues.push({
        category: 'CONTENT',
        severity: severityOf('OBJECTIVES_DEFINED', 'ERROR'),
        rule: 'OBJECTIVES_DEFINED',
        message: `Missing ${!general ? 'a general' : ''}${!general && !specific ? ' and ' : ''}${!specific ? 'specific' : ''} objective.`,
      });
    }
  }

  if (ruleEnabled('RESEARCH_QUESTIONS_DEFINED', false)) {
    if (ctx.researchQuestions.length === 0) {
      issues.push({
        category: 'CONTENT',
        severity: severityOf('RESEARCH_QUESTIONS_DEFINED', 'ERROR'),
        rule: 'RESEARCH_QUESTIONS_DEFINED',
        message: 'No research questions are defined for this project.',
      });
    }
  }

  if (ruleEnabled('HYPOTHESES_OR_QUESTIONS', false) && ctx.hypotheses.length === 0 && ctx.researchQuestions.length === 0) {
    issues.push({
      category: 'CONTENT',
      severity: severityOf('HYPOTHESES_OR_QUESTIONS', 'WARNING'),
      rule: 'HYPOTHESES_OR_QUESTIONS',
      message: 'Neither hypotheses nor research questions are defined.',
    });
  }

  if (ctx.abstract) {
    const words = wordCount(ctx.abstract.content);
    if (words > ctx.abstract.wordLimit) {
      issues.push({
        category: 'CONTENT',
        severity: 'WARNING',
        rule: 'ABSTRACT_WORD_LIMIT',
        message: `Abstract has ${words} words; limit is ${ctx.abstract.wordLimit}.`,
      });
    }
    if (ctx.abstract.reviewStatus !== 'VERIFIED' && ctx.abstract.content.trim().length > 0) {
      issues.push({
        category: 'CONTENT',
        severity: 'NEEDS_REVIEW',
        rule: 'ABSTRACT_REVIEWED',
        message: 'Abstract has not been reviewed/verified.',
      });
    }
  }

  const minWords = (() => {
    const r = req('MIN_TOTAL_WORDS');
    if (!r) return 0;
    try {
      return JSON.parse(r.parameters).minimum || 0;
    } catch {
      return 0;
    }
  })();
  if (minWords > 0 && totalWords < minWords) {
    issues.push({
      category: 'CONTENT',
      severity: severityOf('MIN_TOTAL_WORDS', 'WARNING'),
      rule: 'MIN_TOTAL_WORDS',
      message: `Total word count ${totalWords} is below the minimum ${minWords}.`,
    });
  }

  // ---------------------------------------------------------------------------
  // REFERENCE
  // ---------------------------------------------------------------------------
  // Find in-text citation markers inside persisted document text
  const bodyCitations = new Set<string>();
  if (ctx.documentId) {
    const blocks = await prisma.documentBlock.findMany({
      where: { documentId: ctx.documentId },
      select: { content: true, type: true },
    });
    const sections = await prisma.documentSection.findMany({
      where: { documentId: ctx.documentId },
      select: { content: true },
    });
    const allText = [...blocks.map((b) => b.content), ...sections.map((s) => s.content || '')].join(' \n ');
    // APA/MLA/Harvard style markers: (Author, Year) / (Author Year) / (Author et al., Year)
    const markerRegex = /\(([^()]{2,80}?\d{4}[a-z]?[^()]{0,20}?)\)/g;
    let m: RegExpExecArray | null;
    while ((m = markerRegex.exec(allText)) !== null) {
      bodyCitations.add(m[1].trim());
    }
  }

  const parsedRefs = ctx.references.map((r) => ({
    id: r.id,
    authors: safeParse<string[]>(r.authors, []),
    year: r.year,
    title: r.title,
    doi: r.doi,
    citationId: r.citationId,
  }));

  // 1. cited source missing from references (marker present, no matching ref)
  if (ruleEnabled('NO_MISSING_REFERENCES', false) && bodyCitations.size > 0) {
    for (const marker of bodyCitations) {
      const year = (marker.match(/\d{4}/) || [])[0];
      const surname = marker.split(',')[0].replace(/^(et al\.|and)/, '').trim();
      if (!surname || surname.length < 2) continue;
      const hasMatch = parsedRefs.some(
        (r) =>
          r.authors.some((a: string) => a.toLowerCase().includes(surname.toLowerCase())) ||
          (r.year && year && r.year === year),
      );
      if (!hasMatch && !/^(see|cf|e\.g|i\.e)/i.test(surname)) {
        issues.push({
          category: 'REFERENCE',
          severity: severityOf('NO_MISSING_REFERENCES', 'ERROR'),
          rule: 'NO_MISSING_REFERENCES',
          message: `In-text citation "(${marker})" has no matching reference in the reference list.`,
        });
      }
    }
  }

  // 2. reference not cited anywhere in the body
  if (ruleEnabled('NO_UNCITED_REFERENCES', false)) {
    for (const r of parsedRefs) {
      const surname = r.authors[0]?.split(',')[0].trim();
      if (!surname) continue;
      const cited = [...bodyCitations].some((marker) => marker.toLowerCase().includes(surname.toLowerCase().slice(0, Math.max(4, surname.length - 2))));
      if (!cited) {
        issues.push({
          category: 'REFERENCE',
          severity: severityOf('NO_UNCITED_REFERENCES', 'WARNING'),
          rule: 'NO_UNCITED_REFERENCES',
          message: `Reference "${surname}${r.year ? ` (${r.year})` : ''}" is listed but not cited in the body.`,
          entityId: r.id,
          entityType: 'reference',
        });
      }
    }
  }

  // 3. incomplete references + malformed DOI
  for (const r of parsedRefs) {
    if (!isReferenceComplete(r)) {
      issues.push({
        category: 'REFERENCE',
        severity: 'WARNING',
        rule: 'INCOMPLETE_REFERENCE',
        message: `Reference is incomplete: missing ${!r.authors.length ? 'author' : ''}${!r.authors.length && !r.year ? ', ' : ''}${!r.year ? 'year' : ''}${(!r.authors.length || !r.year) && !r.title ? ', ' : ''}${!r.title ? 'title' : ''}.`,
        entityId: r.id,
        entityType: 'reference',
      });
    }
    if (r.doi && !isValidDoi(r.doi)) {
      issues.push({
        category: 'REFERENCE',
        severity: 'ERROR',
        rule: 'MALFORMED_DOI',
        message: `Reference has a malformed DOI: "${r.doi}".`,
        entityId: r.id,
        entityType: 'reference',
      });
    }
  }

  // 4. duplicate references
  const seen = new Map<string, string>();
  for (const r of parsedRefs) {
    const key = duplicateKey(r);
    if (seen.has(key)) {
      issues.push({
        category: 'REFERENCE',
        severity: 'WARNING',
        rule: 'DUPLICATE_REFERENCE',
        message: `Duplicate reference detected (also ${seen.get(key)}).`,
        entityId: r.id,
        entityType: 'reference',
      });
    } else {
      seen.set(key, r.id);
    }
  }

  // 5. duplicate sources bound to different references
  const byCitation = new Map<string, number>();
  for (const r of parsedRefs) {
    if (r.citationId) byCitation.set(r.citationId, (byCitation.get(r.citationId) || 0) + 1);
  }
  for (const [citationId, count] of byCitation) {
    if (count > 1) {
      issues.push({
        category: 'REFERENCE',
        severity: 'WARNING',
        rule: 'DUPLICATE_SOURCE_ENTRY',
        message: `Source ${citationId} is linked to ${count} references.`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // DATA
  // ---------------------------------------------------------------------------
  if (ruleEnabled('FINDINGS_HAVE_PROVENANCE', false)) {
    for (const f of ctx.findings) {
      const hasProvenance = !!(f.analysisId || f.datasetId || f.tableId || f.chartId || f.numericValue !== null);
      if (!hasProvenance) {
        issues.push({
          category: 'DATA',
          severity: severityOf('FINDINGS_HAVE_PROVENANCE', 'ERROR'),
          rule: 'FINDINGS_HAVE_PROVENANCE',
          message: `Finding ${f.number} has no analysis, table, chart or verified numeric provenance.`,
          entityId: f.id,
          entityType: 'finding',
        });
      }
    }
  }

  if (ruleEnabled('TABLES_HAVE_SOURCE_DATA', false)) {
    for (const t of ctx.tables) {
      if (!t.tableId && !t.chartId) {
        issues.push({
          category: 'DATA',
          severity: severityOf('TABLES_HAVE_SOURCE_DATA', 'ERROR'),
          rule: 'TABLES_HAVE_SOURCE_DATA',
          message: `Numbered table/figure has no linked Data Lab table or chart.`,
          entityId: t.id,
          entityType: 'table',
        });
      }
    }
  }

  // numeric claims need provenance: scan body text for numbers attributed to findings
  if (ctx.documentId && ctx.findings.length) {
    const blocks = await prisma.documentBlock.findMany({
      where: { documentId: ctx.documentId },
      select: { content: true },
    });
    const text = blocks.map((b) => b.content).join(' ');
    const percentClaims = text.match(/\d+(\.\d+)?\s?%/g) || [];
    const verifiedPercentages = ctx.findings.filter((f) => f.numericValue !== null).map((f) => f.numericValue);
    for (const claim of percentClaims.slice(0, 20)) {
      const value = parseFloat(claim);
      if (!isNaN(value)) {
        const isBacked = verifiedPercentages.some((v) => v !== null && Math.abs(v - value) < 0.01);
        if (!isBacked) {
          issues.push({
            category: 'DATA',
            severity: 'NEEDS_REVIEW',
            rule: 'NUMERIC_CLAIM_PROVENANCE',
            message: `Numeric claim "${claim}" in the body has no matching verified finding value.`,
          });
        }
      }
    }
  }

  // hypothesis status must be backed by analysis
  for (const h of ctx.hypotheses) {
    if (h.status !== 'UNTESTED' && !h.testedByAnalysisId) {
      issues.push({
        category: 'DATA',
        severity: 'ERROR',
        rule: 'HYPOTHESIS_UNBACKED_STATUS',
        message: `Hypothesis status is "${h.status}" but no analysis is recorded as testing it.`,
        entityId: h.id,
        entityType: 'hypothesis',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // FORMATTING
  // ---------------------------------------------------------------------------
  if (ruleEnabled('FORMATTING_PROFILE_APPLIED', false) && !ctx.formattingProfileId) {
    issues.push({
      category: 'FORMATTING',
      severity: severityOf('FORMATTING_PROFILE_APPLIED', 'WARNING'),
      rule: 'FORMATTING_PROFILE_APPLIED',
      message: 'No formatting profile is applied to this project.',
    });
  }

  if (ruleEnabled('REQUIRED_FRONT_MATTER', false)) {
    for (const fm of ctx.frontMatter) {
      if (fm.required && !ctx.frontMatter.some((f) => f.kind === fm.kind)) {
        issues.push({
          category: 'FORMATTING',
          severity: severityOf('REQUIRED_FRONT_MATTER', 'WARNING'),
          rule: 'REQUIRED_FRONT_MATTER',
          message: `Required front matter "${fm.kind}" is missing.`,
          entityId: fm.id,
          entityType: 'front_matter',
        });
      }
    }
  }

  // heading hierarchy: chapter sections must be level 1, their children deeper
  if (ctx.documentId) {
    const sections = await prisma.documentSection.findMany({
      where: { documentId: ctx.documentId },
      orderBy: { order: 'asc' },
    });
    let lastLevel = 0;
    for (const s of sections) {
      if (s.headingLevel > lastLevel + 1 && lastLevel > 0) {
        issues.push({
          category: 'FORMATTING',
          severity: 'WARNING',
          rule: 'HEADING_HIERARCHY',
          message: `Section "${s.title}" jumps from heading level ${lastLevel} to ${s.headingLevel}.`,
          entityId: s.id,
          entityType: 'section',
        });
      }
      lastLevel = s.headingLevel;
    }
  }

  // ---------------------------------------------------------------------------
  const errorCount = issues.filter((i) => i.severity === 'ERROR').length;
  const warningCount = issues.filter((i) => i.severity === 'WARNING').length;
  const needsReviewCount = issues.filter((i) => i.severity === 'NEEDS_REVIEW').length;
  const passedCount = Math.max(0, 8 - errorCount - warningCount - needsReviewCount);

  return {
    projectId: ctx.projectId,
    academicProjectId: ctx.academicProjectId,
    status: errorCount > 0 ? 'ERROR' : warningCount > 0 || needsReviewCount > 0 ? 'WARNING' : 'PASS',
    passedCount,
    warningCount,
    errorCount,
    needsReviewCount,
    issues,
    wordCount: totalWords,
    checkedAt: new Date(),
  };
}

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Persist a validation run + its issues, so results are auditable. */
export async function persistValidationRun(summary: ValidationSummary): Promise<{ runId: string }> {
  const run = await prisma.validationRun.create({
    data: {
      academicProjectId: summary.academicProjectId,
      status: summary.status === 'ERROR' ? 'FAILED' : 'COMPLETED',
      passedCount: summary.passedCount,
      warningCount: summary.warningCount,
      errorCount: summary.errorCount,
      issues: {
        create: summary.issues.map((i) => ({
          category: i.category,
          severity: i.severity,
          rule: i.rule,
          message: i.message,
          entityId: i.entityId || null,
          entityType: i.entityType || null,
        })),
      },
    },
  });
  return { runId: run.id };
}

/** Mark an issue resolved with a note (does not alter project content). */
export async function resolveValidationIssue(issueId: string, note: string): Promise<void> {
  await prisma.validationIssue.update({
    where: { id: issueId },
    data: { resolved: true, resolutionNote: note, resolvedAt: new Date() },
  });
}

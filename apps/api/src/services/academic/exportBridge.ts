/**
 * ICON Academic Studio — Academic Project export bridge (Phase 6)
 *
 * Maps the academic project domain onto Document Studio (Document +
 * DocumentSection + DocumentBlock) and then to the existing real export
 * pipeline (documentExport.ts). No content is invented: every block is built
 * from persisted project data; missing data is simply omitted or flagged
 * with an honest "[not yet provided]" placeholder.
 */
import { prisma } from '@icon-academic/db';
import { formatInText, formatReferenceList, ReferenceFields } from './citationFormats.js';

export interface SyncOptions {
  includeFrontMatter?: boolean;
  includeAppendices?: boolean;
}

/**
 * Synchronise the academic project into its Document Studio document:
 * front matter, chapters, abstract, tables/figures, references, appendices.
 * Returns the document id and counts of sections/blocks written.
 */
export async function syncAcademicProjectToDocument(academicProjectId: string, opts: SyncOptions = {}) {
  const ap = await prisma.academicProject.findUnique({
    where: { id: academicProjectId },
    include: {
      chapters: { orderBy: { chapterNumber: 'asc' }, include: { documentSection: true } },
      frontMatter: { orderBy: { order: 'asc' } },
      abstracts: { take: 1 },
      findings: { orderBy: { number: 'asc' }, include: { analysis: true, table: true, chart: true } },
      conclusions: true,
      recommendations: true,
      references: true,
      appendices: { orderBy: { order: 'asc' }, include: { questionnaire: { include: { sections: { include: { items: true } } } }, interviewGuide: { include: { questions: true } } } },
      tables: { orderBy: { number: 'asc' } },
      methodologies: { include: { sections: { orderBy: { order: 'asc' } } } },
    },
  });
  if (!ap) throw new Error('Academic project not found');
  if (!ap.documentId) throw new Error('Project has no document — call buildProjectDocument first');

  const documentId = ap.documentId;
  let sectionOrder = 0;
  let blockOrder = 0;
  const counters = { sections: 0, blocks: 0 };

  const makeSection = async (title: string, level: number, chapterId?: string) => {
    const s = await prisma.documentSection.create({
      data: {
        documentId,
        title,
        headingLevel: level,
        order: sectionOrder++,
        ...(chapterId ? { academicChapter: { connect: { id: chapterId } } } : {}),
      },
    });
    counters.sections += 1;
    return s;
  };
  const makeBlock = async (sectionId: string | null, type: string, content: string, provenance?: Record<string, unknown>) => {
    const b = await prisma.documentBlock.create({
      data: {
        documentId,
        sectionId,
        type,
        content,
        order: blockOrder++,
        provenance: provenance ? JSON.stringify(provenance) : null,
      },
    });
    counters.blocks += 1;
    return b;
  };

  // wipe previous generated content (document-level; version history keeps snapshots)
  await prisma.documentBlock.deleteMany({ where: { documentId } });
  await prisma.documentSection.deleteMany({ where: { documentId } });

  // ---------------- Front matter ----------------
  if (opts.includeFrontMatter !== false) {
    const fm = await makeSection(ap.title, 1);
    await makeBlock(fm.id, 'PARAGRAPH', `${ap.institution || '[Institution]'}\n${ap.department || '[Department]'}\n${ap.program || '[Program]'}`);
    await makeBlock(fm.id, 'PARAGRAPH', `Student: ${ap.studentName || '[Student name]'}${ap.registrationNumber ? ` — ${ap.registrationNumber}` : ''}`);
    if (ap.supervisorName) await makeBlock(fm.id, 'PARAGRAPH', `Supervisor: ${ap.supervisorName}`);
    if (ap.academicYear) await makeBlock(fm.id, 'PARAGRAPH', `Academic year: ${ap.academicYear}`);

    for (const item of ap.frontMatter) {
      const s = await makeSection(item.title, 1);
      await makeBlock(s.id, 'PARAGRAPH', item.content || '[Content to be provided by the student]');
    }

    const abstract = ap.abstracts[0];
    const absSection = await makeSection('Abstract', 1);
    if (abstract && abstract.content.trim()) {
      await makeBlock(absSection.id, 'PARAGRAPH', abstract.content, { academicAbstractId: abstract.id });
      const wc = abstract.content.trim().split(/\s+/).length;
      await makeBlock(absSection.id, 'CALLOUT', `Word count: ${wc} (limit ${abstract.wordLimit})`);
    } else {
      await makeBlock(absSection.id, 'PARAGRAPH', '[Abstract not yet written]');
    }
  }

  // ---------------- Chapters ----------------
  for (const chapter of ap.chapters) {
    const s = await makeSection(`Chapter ${chapter.chapterNumber}: ${chapter.title}`, 1, chapter.id);

    if (chapter.description) {
      await makeBlock(s.id, 'CALLOUT', chapter.description, { academicChapterId: chapter.id });
    }

    // methodology sections bound to this project
    const methodology = ap.methodologies.find((m) => m.chapterId === chapter.id);
    if (methodology) {
      for (const ms of methodology.sections) {
        await makeBlock(s.id, 'PARAGRAPH', `${ms.title}: ${ms.content || '[not yet provided]'}`, { methodologySectionId: ms.id });
      }
    }

    // findings belong conceptually to results chapters; chapters numbered 4 by convention
    if (chapter.chapterNumber === 4) {
      for (const f of ap.findings) {
        await makeBlock(
          s.id,
          'PARAGRAPH',
          `Finding ${f.number}: ${f.statement}`,
          { findingId: f.id, analysisId: f.analysisId || null, tableId: f.tableId || null, chartId: f.chartId || null },
        );
      }
      for (const t of ap.tables) {
        await makeBlock(
          s.id,
          'TABLE',
          JSON.stringify({ label: t.label, caption: t.caption, tableId: t.tableId, chartId: t.chartId }),
          { academicTableFigureId: t.id },
        );
      }
    }

    if (chapter.chapterNumber === 5) {
      for (const c of ap.conclusions) {
        await makeBlock(s.id, 'PARAGRAPH', c.statement, { conclusionId: c.id });
      }
      for (const r of ap.recommendations) {
        await makeBlock(s.id, 'PARAGRAPH', r.statement, { recommendationId: r.id });
      }
    }
  }

  // ---------------- References ----------------
  if (ap.references.length) {
    const s = await makeSection('References', 1);
    for (const r of ap.references) {
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
      const style = (r.style as any) || 'APA';
      const entry = formatReferenceList(fields, style);
      const inText = formatInText(fields, style);
      await makeBlock(s.id, 'CITATION_BLOCK', entry, { academicReferenceId: r.id, inText, style });
    }
  }

  // ---------------- Appendices ----------------
  if (opts.includeAppendices !== false) {
    for (const a of ap.appendices) {
      const s = await makeSection(`${a.label}: ${a.title}`, 1);
      if (a.questionnaire) {
        for (const qs of a.questionnaire.sections) {
          await makeBlock(s.id, 'HEADING', qs.title);
          for (const item of qs.items) {
            const opts = JSON.parse(item.responseOptions) as string[];
            const scale = JSON.parse(item.likertScale) as string[];
            const parts = [
              `${item.questionNumber}. ${item.questionText}`,
              `Type: ${item.questionType}`,
              opts.length ? `Options: ${opts.join(' | ')}` : '',
              scale.length ? `Scale: ${scale.join(' | ')}` : '',
            ].filter(Boolean);
            await makeBlock(s.id, 'PARAGRAPH', parts.join('\n'), { questionnaireItemId: item.id });
          }
        }
      }
      if (a.interviewGuide) {
        for (const q of a.interviewGuide.questions) {
          await makeBlock(
            s.id,
            'PARAGRAPH',
            q.probe ? `${q.questionText}\nProbe: ${q.probe}` : q.questionText,
            { interviewQuestionId: q.id },
          );
        }
      }
      if (!a.questionnaire && !a.interviewGuide) {
        await makeBlock(s.id, 'PARAGRAPH', `[${a.appendixType} — bound artifact: ${[a.sourceId, a.datasetId, a.tableId, a.chartId].filter(Boolean).length || 'none'}]`);
      }
    }
  }

  // recompute document word count
  const sections = await prisma.documentSection.findMany({ where: { documentId }, select: { title: true, content: true } });
  const blocks = await prisma.documentBlock.findMany({ where: { documentId }, select: { content: true } });
  const wc = (t: string | null | undefined) => (t && t.trim() ? t.trim().split(/\s+/).length : 0);
  const total = sections.reduce((s, x) => s + wc(x.title) + wc(x.content), 0) + blocks.reduce((s, x) => s + wc(x.content), 0);
  await prisma.document.update({ where: { id: documentId }, data: { wordCount: total } });

  return { documentId, ...counters, wordCount: total };
}

/**
 * Create a version snapshot before destructive edits (reuses Document Studio
 * version history rather than inventing a second versioning system).
 */
export async function snapshotAcademicDocument(academicProjectId: string, note?: string) {
  const ap = await prisma.academicProject.findUnique({ where: { id: academicProjectId } });
  if (!ap || !ap.documentId) throw new Error('No document bound to this project');

  const [sections, blocks] = await Promise.all([
    prisma.documentSection.findMany({ where: { documentId: ap.documentId }, orderBy: { order: 'asc' } }),
    prisma.documentBlock.findMany({ where: { documentId: ap.documentId }, orderBy: { order: 'asc' } }),
  ]);
  const last = await prisma.documentVersion.findFirst({ where: { documentId: ap.documentId }, orderBy: { versionNumber: 'desc' } });
  const versionNumber = (last?.versionNumber || 0) + 1;

  const version = await prisma.documentVersion.create({
    data: {
      documentId: ap.documentId,
      versionNumber,
      note: note || `Academic project snapshot ${versionNumber}`,
      structure: JSON.stringify({ sections, blocks }),
    },
  });
  return version;
}

export async function restoreAcademicDocument(academicProjectId: string, versionId: string) {
  const ap = await prisma.academicProject.findUnique({ where: { id: academicProjectId } });
  if (!ap || !ap.documentId) throw new Error('No document bound to this project');
  const version = await prisma.documentVersion.findUnique({ where: { id: versionId } });
  if (!version || version.documentId !== ap.documentId) throw new Error('Version not found for this document');

  const structure = JSON.parse(version.structure) as { sections: any[]; blocks: any[] };
  // take a snapshot of current state first (non-destructive restore)
  await snapshotAcademicDocument(academicProjectId, `Pre-restore snapshot (restoring version ${version.versionNumber})`);

  await prisma.documentBlock.deleteMany({ where: { documentId: ap.documentId } });
  await prisma.documentSection.deleteMany({ where: { documentId: ap.documentId } });

  const sectionIdMap = new Map<string, string>();
  for (const s of structure.sections) {
    const created = await prisma.documentSection.create({
      data: {
        documentId: ap.documentId,
        title: s.title,
        headingLevel: s.headingLevel,
        order: s.order,
        content: s.content,
        metadata: s.metadata,
        ...(s.academicChapterId ? { academicChapter: { connect: { id: s.academicChapterId } } } : {}),
      },
    });
    sectionIdMap.set(s.id, created.id);
  }
  for (const b of structure.blocks) {
    await prisma.documentBlock.create({
      data: {
        documentId: ap.documentId,
        sectionId: b.sectionId ? sectionIdMap.get(b.sectionId) || null : null,
        type: b.type,
        content: b.content,
        order: b.order,
        metadata: b.metadata,
        provenance: b.provenance,
      },
    });
  }
  return { restoredVersionId: version.id, versionNumber: version.versionNumber };
}

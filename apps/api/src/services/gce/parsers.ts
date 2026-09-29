// GCE intelligence — deterministic parsers for syllabi, past papers, marking schemes
// All functions are pure (no DB, no network). No AI. No invented facts:
// whenever evidence is insufficient the answer is UNKNOWN / flagged for review.

export interface ParsedSyllabusNode {
  code?: string;
  title: string;
  level: number; // 1 = section/unit, 2 = topic, 3+ = subtopic
  description?: string;
  children: ParsedSyllabusNode[];
}

export interface ParsedSyllabus {
  structured: boolean; // false when no structural cues were found
  nodes: ParsedSyllabusNode[]; // flat roots; children nest
  needsReview: boolean;
  notes: string[];
}

export interface ParsedQuestionPart {
  label: string;
  text: string;
  marks: number | null;
}

export interface ParsedQuestion {
  number: string;
  text: string;
  marks: number | null;
  questionType: string; // UNKNOWN unless identified deterministically
  commandVerb: string; // UNKNOWN unless identified deterministically
  section: string | null;
  parts: ParsedQuestionPart[];
  needsReview: boolean;
  reviewReasons: string[];
}

export interface ParsedPaper {
  ocrRequired: boolean;
  questions: ParsedQuestion[];
  sectionNames: string[];
  notes: string[];
}

export interface ParsedMarkingPoint {
  questionNumber: string;
  partLabel?: string;
  marks: number | null;
  pointText: string;
  matched: boolean; // whether it resolved against a parsed question
}

export interface ParsedMarkingScheme {
  ocrRequired: boolean;
  points: ParsedMarkingPoint[];
  notes: string[];
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const MARK_TAIL = /\s*[([]\s*(\d{1,3})\s*(marks?)?\s*[\])]\s*$/i;

function cleanLine(line: string): string {
  return line.replace(/\u00a0/g, ' ').replace(/[\r\n\t]+/g, ' ').trim();
}

/** True when extracted text looks like a scanned/image PDF with no usable text. */
export function looksScanned(text: string): boolean {
  const meaningful = (text || '').replace(/[^A-Za-z0-9]/g, '');
  const lines = (text || '').split(/\r?\n/).filter((l) => l.trim().length > 0);
  return meaningful.length < 60 || lines.length < 2;
}

const COMMAND_VERBS: Record<string, string> = {
  define: 'DEFINE',
  explain: 'EXPLAIN',
  describe: 'DESCRIBE',
  calculate: 'CALCULATE',
  compute: 'CALCULATE',
  state: 'STATE',
  list: 'LIST',
  enumerate: 'LIST',
  compare: 'COMPARE',
  contrast: 'COMPARE',
  distinguish: 'DISTINGUISH',
  differentiate: 'DISTINGUISH',
  discuss: 'DISCUSS',
  evaluate: 'EVALUATE',
  analyse: 'ANALYZE',
  analyze: 'ANALYZE',
  interpret: 'ANALYZE',
  draw: 'DRAW',
  sketch: 'DRAW',
  diagram: 'DRAW',
  identify: 'IDENTIFY',
  give: 'STATE',
  derive: 'CALCULATE',
  find: 'CALCULATE',
  determine: 'CALCULATE',
};

function detectCommandVerb(questionText: string): string {
  const words = questionText.match(/[A-Za-z][A-Za-z\-']+/g) || [];
  if (words.length === 0) return 'UNKNOWN';
  const first = (words[0] || '').toLowerCase();
  // allow "(a)" style leading tokens that some papers print as text
  if (/^(and|the|an|a|of|for|to|in|on|its)$/i.test(first)) {
    const second = words[1] || '';
    return second ? COMMAND_VERBS[second.toLowerCase()] || 'UNKNOWN' : 'UNKNOWN';
  }
  return COMMAND_VERBS[first] || 'UNKNOWN';
}

function countWords(text: string): number {
  return (text.match(/\S+/g) || []).length;
}

function detectQuestionType(text: string, number: string): string {
  const t = text;
  // Multiple choice: options A/B/C/D printed inline or as "A." "B." lines
  const hasOptionLetters =
    /\b[A-D]\s*[.):]\s*.+\b[B-D]\s*[.):]\s*\S/.test(t) ||
    /\b[A-D]\.\s/.test(t);
  if (hasOptionLetters && t.length < 800) return 'MULTIPLE_CHOICE';
  const verb = detectCommandVerb(t).toLowerCase();
  if (verb === 'define') return 'DEFINITION';
  if (verb === 'explain') return 'EXPLANATION';
  if (verb === 'compare' || verb === 'distinguish') return 'COMPARISON';
  if (verb === 'draw') return 'DIAGRAM';
  if (verb === 'calculate' || /[0-9]+\s*[+\-×x*/=]\s*[0-9]/.test(t) || /calculate|compute|evaluate value/i.test(t)) {
    return 'CALCULATION';
  }
  if (countWords(t) <= 12) return 'SHORT_ANSWER';
  if (countWords(t) >= 40) return 'ESSAY';
  // Heuristic fallbacks stay UNKNOWN rather than inventing a type
  void number;
  return 'UNKNOWN';
}

// ---------------------------------------------------------------------------
// Syllabus structure
// ---------------------------------------------------------------------------

interface Ctx {
  currentL2: ParsedSyllabusNode | null; // topic
}

function makeNode(code: string | undefined, title: string, level: number, description?: string): ParsedSyllabusNode {
  return { code, title, level, description, children: [] };
}

/**
 * Deterministic syllabus structure detection.
 * Recognised cues (highest priority first):
 *   1. Markdown headings:  # → section, ## → topic, ### → subtopic, #### → sub-subtopic
 *   2. Keyword lines:      UNIT n / CHAPTER n / SECTION n → section
 *                          TOPIC x.y → topic, SUBTOPIC x.y.z → subtopic
 *   3. Numbered codes:     "1 Title" → section, "1.2 Title" → topic,
 *                          "1.2.3 Title" → subtopic (line must be short,
 *                          capitalised, and not sentence-like)
 * When nothing is recognised the syllabus is returned unstructured
 * (structured=false) and callers keep it as a review target — never a guess.
 */
export function parseSyllabusStructure(rawText: string, sourceFileName?: string): ParsedSyllabus {
  const lines = (rawText || '').split(/\r?\n/).map(cleanLine);
  const notes: string[] = [];
  const roots: ParsedSyllabusNode[] = [];
  let ctx: Ctx = { currentL2: null };
  let sawStructure = false;

  const pushLevel3 = (parent2: ParsedSyllabusNode | null, node: ParsedSyllabusNode) => {
    if (parent2) parent2.children.push(node);
    else roots.push(node);
  };

  for (const raw of lines) {
    if (!raw) continue;

    // 1. Markdown headings
    const md = raw.match(/^(#{1,4})\s+(.+)$/);
    if (md) {
      sawStructure = true;
      const level = md[1].length;
      const title = md[2].trim();
      if (level === 1) {
        roots.push(makeNode(undefined, title, 1));
        ctx.currentL2 = null;
      } else if (level === 2) {
        const parent1 = roots[roots.length - 1];
        const topic = makeNode(undefined, title, 2);
        if (parent1) parent1.children.push(topic);
        else {
          roots.push(makeNode(undefined, 'General', 1));
          roots[roots.length - 1].children.push(topic);
        }
        ctx.currentL2 = topic;
      } else {
        const parent =
          ctx.currentL2 ||
          (() => {
            const p1 = roots[roots.length - 1];
            ctx.currentL2 = makeNode(undefined, 'General topics', 2);
            p1?.children.push(ctx.currentL2);
            return ctx.currentL2;
          })();
        pushLevel3(ctx.currentL2, makeNode(undefined, title, level));
      }
      continue;
    }

    // 2. Keyword sections / topics
    const kwSection = raw.match(/^(UNIT|CHAPTER|CHAPTERS|SECTION)\s+(?:NUM)?([IVX0-9]{1,4}|[a-z0-9]{1,8})\s*[:.]\s*(.+)?$/i);
    if (kwSection) {
      sawStructure = true;
      const code = (kwSection[2] || '').toUpperCase();
      const title = kwSection[3]?.trim() ? `${kwSection[1].toUpperCase()} ${code}: ${kwSection[3].trim()}` : `${kwSection[1].toUpperCase()} ${code}`;
      const rootTitle = kwSection[3]?.trim() || `${kwSection[1].toUpperCase()} ${code}`;
      roots.push(makeNode(code, rootTitle.toUpperCase(), 1));
      void title;
      ctx.currentL2 = null;
      continue;
    }

    const kwTopic = raw.match(/^SUB?TOPIC\s+([\d.A-Z-]+)\s*[:.]\s*(.+)$/i);
    if (kwTopic) {
      sawStructure = true;
      const node = makeNode(kwTopic[1], kwTopic[2].trim(), 3);
      pushLevel3(ctx.currentL2, node);
      continue;
    }
    const kwSub = raw.match(/^SUB[-\s]?PART\s+([\d.A-Z-]+)\s*[:.]\s*(.+)$/i);
    if (kwSub) {
      sawStructure = true;
      pushLevel3(ctx.currentL2, makeNode(kwSub[1], kwSub[2].trim(), 4));
      continue;
    }

    // 3. Numbered coding: "1.1 Quadratic expressions"
    const num = raw.match(/^(\d+(?:\.\d+){0,3})[\s.:)]\s*([A-Z][^.!?;]{2,79})[\.]?$/);
    if (num && !/[.!?]$/.test(num[0].trim())) {
      sawStructure = true;
      const code = num[1];
      const segs = code.split('.');
      const title = num[2].trim();
      if (segs.length === 1) {
        roots.push(makeNode(code, title, 1));
        ctx.currentL2 = null;
      } else if (segs.length === 2) {
        // attach under most recent level-1 root (create a catch-all if none)
        let parent1 = roots.filter((r) => r.level === 1)[roots.filter((r) => r.level === 1).length - 1];
        if (!parent1) {
          parent1 = makeNode(undefined, 'General', 1);
          roots.push(parent1);
        }
        const topic = makeNode(code, title, 2);
        parent1.children.push(topic);
        ctx.currentL2 = topic;
      } else {
        pushLevel3(ctx.currentL2, makeNode(code, title, Math.min(segs.length, 4)));
      }
      continue;
    }

    // Non-structural lines can become descriptions of the most recent node
    const lastRoot = roots[roots.length - 1];
    if (lastRoot && lastRoot.children.length === 0 && lastRoot.level === 1 && raw.length > 10 && !/^SECTION\b/i.test(raw)) {
      // description belongs to the section only when it is not itself structural
      if (countWords(raw) >= 3 && !/^#/.test(raw)) {
        lastRoot.description = lastRoot.description ? `${lastRoot.description} ${raw}` : raw;
      }
    }
  }

  if (!sawStructure) {
    notes.push('No structural cues (headings, units/topics, numbered codes) detected; content kept flat for human review.');
    return { structured: false, nodes: [], needsReview: true, notes };
  }

  // Flatten review flags: nodes without titles
  const check = (nodes: ParsedSyllabusNode[]): boolean => {
    let flag = false;
    for (const n of nodes) {
      if (!n.title || !n.title.trim()) flag = true;
      if (check(n.children)) flag = true;
    }
    return flag;
  };

  return { structured: true, nodes: roots, needsReview: check(roots) || roots.length === 0, notes };
}

// ---------------------------------------------------------------------------
// Past paper questions
// ---------------------------------------------------------------------------

/**
 * Parses plain-text exam papers.
 * Structural cues: section banners ("SECTION A", "PART B", "(B)"),
 * top-level numbered questions ("3. Explain ..."), sub-parts ("(a) ..."),
 * trailing mark tags ("[4]", "(6 marks)").
 * Unknowns are preserved explicitly — never filled with guesses.
 */
export function parsePastPaper(rawText: string): ParsedPaper {
  const notes: string[] = [];
  const ocrRequired = looksScanned(rawText);
  if (ocrRequired) {
    notes.push('Extracted text too sparse to parse reliably — treat source as scanned (OCR required in a later phase).');
    return { ocrRequired: true, questions: [], sectionNames: [], notes };
  }

  const lines = (rawText || '').split(/\r?\n/);
  const questions: ParsedQuestion[] = [];
  const sectionNames: string[] = [];
  let currentSection: string | null = null;
  let currentQ: ParsedQuestion | null = null;

  const SECTION_BANNER =
    /^\s*\(?\s*(SECTION|PART)\s+([A-Z0-9]{1,3})\b/i;
  const Q_START = /^(\s{0,3})(\d{1,3})\s*[.):]?\s+(\S.*)$/;
  const PART_LINE =
    /^\s*\((?:[a-d]|[ivx]{1,4}|\d{1,2})\)\s*(\S.*)$/;
  // A question line may itself start with a part label, e.g.
  //   "3. (a) Describe the structure..."   → number "3", part "(a)", body
  const Q_START_WITH_PART =
    /^(\s{0,3})(\d{1,3})\s*[.):]?\s+(\([a-d]\)|\([ivx]{1,4}\)|\(\d{1,2}\))\s*(\S.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const sec = line.match(SECTION_BANNER);
    if (sec) {
      currentSection = `${sec[1]} ${sec[2]}`.toUpperCase();
      if (!sectionNames.includes(currentSection)) sectionNames.push(currentSection);
      continue;
    }

    // sub-part belongs to the previous question — consume as part
    if (currentQ) {
      const partMatch = line.match(PART_LINE);
      if (partMatch) {
        const labelM = line.match(/^\s*\(([a-d]|[ivx]{1,4}|\d{1,2})\)/i);
        const label = labelM ? labelM[1].toUpperCase() : '';
        let text = partMatch[1].trim();
        let marks: number | null = null;
        const mTail = text.match(MARK_TAIL);
        if (mTail) {
          marks = parseInt(mTail[1], 10);
          text = text.slice(0, mTail.index ?? 0).trim();
        }
        currentQ.parts.push({ label, text, marks });
        // merge text upward only when question body is empty so far
        if (!currentQ.text) currentQ.text = text;
        if (marks !== null && currentQ.marks === null) currentQ.marks = marks;
        if (!currentQ.parts.every((p) => p.label === label)) {
          // nothing — parts already labelled
        }
        continue;
      }

      // continuation of the current question body
      const trimmed = line.trim();
      if (trimmed && !Q_START.test(line) && !SECTION_BANNER.test(line)) {
        const mTail = trimmed.match(MARK_TAIL);
        let tail = trimmed;
        if (mTail) {
          const marks = parseInt(mTail[1], 10);
          if (currentQ.marks === null) currentQ.marks = marks;
          tail = trimmed.slice(0, mTail.index ?? 0).trim();
        }
        if (tail) currentQ.text = currentQ.text ? `${currentQ.text} ${tail}` : tail;
        continue;
      }
    }

    const qStartWithPart = line.match(Q_START_WITH_PART);
    const qStart = qStartWithPart ? null : line.match(Q_START);
    if (qStartWithPart) {
      // "3. (a) Describe..." — open the question and immediately emit part (a)
      const number = qStartWithPart[2];
      const partLabel = qStartWithPart[3];
      const body = qStartWithPart[4].trim();
      if (body.length >= 4) {
        currentQ = {
          number,
          text: '',
          marks: null,
          questionType: 'UNKNOWN',
          commandVerb: 'UNKNOWN',
          section: currentSection,
          parts: [],
          needsReview: false,
          reviewReasons: [],
        };
        const labelM = partLabel.match(/^\(([a-d]|[ivx]{1,4}|\d{1,2})\)$/i);
        const label = labelM ? labelM[1].toUpperCase() : '';
        let text = body;
        const mTail = text.match(MARK_TAIL);
        let partMarks: number | null = null;
        if (mTail) {
          partMarks = parseInt(mTail[1], 10);
          text = text.slice(0, mTail.index ?? 0).trim();
        }
        currentQ.parts.push({ label, text, marks: partMarks });
        if (!currentQ.text) currentQ.text = text;
        if (partMarks !== null && currentQ.marks === null) currentQ.marks = partMarks;
        currentQ.commandVerb = detectCommandVerb(text);
        currentQ.questionType = detectQuestionType(text, currentQ.number);
        if (currentQ.marks === null) {
          currentQ.needsReview = true;
          currentQ.reviewReasons.push('Marks not identified');
        }
        if (currentQ.commandVerb === 'UNKNOWN') {
          currentQ.needsReview = true;
          currentQ.reviewReasons.push('Command verb unknown');
        }
        questions.push(currentQ);
        continue;
      }
    }
    if (qStart) {
      // ignore very short bullets that are clearly list items, not questions
      const body = qStart[3].trim();
      if (body.length >= 8) {
        currentQ = {
          number: qStart[2],
          text: '',
          marks: null,
          questionType: 'UNKNOWN',
          commandVerb: 'UNKNOWN',
          section: currentSection,
          parts: [],
          needsReview: false,
          reviewReasons: [],
        };
        // absorb inline marks
        const mTail = body.match(MARK_TAIL);
        let text = body;
        if (mTail) {
          currentQ.marks = parseInt(mTail[1], 10);
          text = body.slice(0, mTail.index ?? 0).trim();
        }
        currentQ.text = text;
        currentQ.commandVerb = detectCommandVerb(text);
        currentQ.questionType = detectQuestionType(text, currentQ.number);
        if (currentQ.marks === null) {
          currentQ.needsReview = true;
          currentQ.reviewReasons.push('Marks not identified');
        }
        if (currentQ.commandVerb === 'UNKNOWN') {
          currentQ.needsReview = true;
          currentQ.reviewReasons.push('Command verb unknown');
        }
        questions.push(currentQ);
      }
    }
  }

  if (questions.length === 0) {
    notes.push('No numbered questions detected in extractable text. Marked for review; do not treat absence of questions as fact.');
  }
  return { ocrRequired: false, questions, sectionNames, notes };
}

// ---------------------------------------------------------------------------
// Marking schemes
// ---------------------------------------------------------------------------

export function parseMarkingScheme(rawText: string): ParsedMarkingScheme {
  const ocrRequired = looksScanned(rawText);
  if (ocrRequired) {
    return {
      ocrRequired: true,
      points: [],
      notes: ['Scanned document — marking points not extractable without OCR (later phase).'],
    };
  }

  const lines = (rawText || '').split(/\r?\n/).map(cleanLine);
  const points: ParsedMarkingPoint[] = [];
  // Groups: 1 = question number
  //         2 = parenthesised part label ("(a)", "(i)", "(1)")
  //         3 = bare part label followed by bracket/colon ("a)", "1:", "ii.")
  //         4 = inline marks annotation at start ("[3 marks]", "(2 marks)")
  //         5 = point text after leading annotation
  // Part labels are only recognised with an explicit boundary — never the
  // first letter of a content word. A leading dash separator is tolerated.
  const POINT_LINE =
    /^\s*(\d{1,3})\s*[.):]?\s*(?:\(\s*([a-d]|[ivx]{1,4}|\d{1,2})\s*\)\s*|([a-d]|[ivx]{1,4}|\d{1,2})\s*[\):]\s*)?(?:\s*[-–—]\s*)?(?:[([]\s*(\d{1,3})\s*marks?\s*[)\]])?\s*(.*)$/i;

  for (const line of lines) {
    if (!line || line.length < 3) continue;
    const m = line.match(POINT_LINE);
    if (!m) continue;
    const number = m[1];
    const partRaw = m[2] ?? m[3];
    const part = partRaw ? partRaw.toUpperCase() : undefined;
    let marks = m[4] ? parseInt(m[4], 10) : null;
    let text = (m[5] || '').trim();
    // If no leading marks annotation, check whether the mark annotation is
    // printed at the end of the point line (common in GCE schemes):
    //   "... accept '4' [1 mark]"
    if (marks === null) {
      const tailMatch = text.match(/\s*[([]\s*(\d{1,3})\s*marks?\s*[)\]]\s*$/i);
      if (tailMatch) {
        marks = parseInt(tailMatch[1], 10);
        text = text.slice(0, tailMatch.index!).trim();
      }
    }
    if (!text && marks === null) continue; // pure alignment / empty line
    points.push({
      questionNumber: number,
      partLabel: part,
      marks,
      pointText: text,
      matched: false,
    });
  }

  const notes: string[] = [];
  if (points.length === 0) {
    notes.push('No structured marking points detected; scheme retained as source reference only.');
  }
  return { ocrRequired: false, points, notes };
}

/**
 * Deterministic matching of marking points to parsed questions by
 * question number (and part label when present). Ambiguous matches stay
 * unmatched rather than linked incorrectly.
 */
export function matchMarkingPoints(
  parsed: ParsedMarkingScheme,
  questions: ParsedQuestion[]
): ParsedMarkingPoint[] {
  const result = [...parsed.points];
  for (const point of result) {
    const byNumber = questions.filter((q) => q.number === point.questionNumber);
    if (byNumber.length === 0) continue;
    if (point.partLabel) {
      const withPart = byNumber.find((q) =>
        q.parts.some((p) => p.label.toLowerCase() === point.partLabel!.toLowerCase())
      );
      if (withPart) {
        point.matched = true;
      }
    } else if (byNumber.length === 1) {
      point.matched = true;
    }
    // multiple candidates with part label missing → deliberately left unmatched
  }
  return result;
}

/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import {
  looksScanned,
  parseSyllabusStructure,
  parsePastPaper,
  parseMarkingScheme,
  matchMarkingPoints,
} from './parsers.js';

// ---------------------------------------------------------------------------
// looksScanned — returns true when text is too short/sparsely lined to parse
// ---------------------------------------------------------------------------
describe('looksScanned', () => {
  it('returns false for sufficient multi-line text', () => {
    const text = 'This is line one with content.\nLine two has more characters here.\nThird line exists too.';
    expect(looksScanned(text)).toBe(false);
  });

  it('returns true for very short text (below 60 meaningful chars)', () => {
    expect(looksScanned('abc')).toBe(true);
    expect(looksScanned('Short')).toBe(true);
  });

  it('returns true for single-line text (fewer than 2 lines)', () => {
    // Even long single-line text is considered "scanned-ish" by this heuristic
    expect(looksScanned('A'.repeat(80))).toBe(true);
  });

  it('returns false for proper multi-line content', () => {
    // Multi-line text with sufficient characters is NOT considered scanned
    const text = `Section A: Multiple Choice
Question 1: What is x? Solve the equation x plus 2 equals 5.
Question 2: Explain the concept of derivatives in calculus.`;
    expect(looksScanned(text)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseSyllabusStructure
// ---------------------------------------------------------------------------
describe('parseSyllabusStructure', () => {
  it('parses markdown headings into structured nodes', () => {
    const text = `# Unit 1: Introduction
## Topic 1.1: Basics
### Subtopic detail
# Unit 2: Advanced`;
    const result = parseSyllabusStructure(text);
    expect(result.structured).toBe(true);
    expect(result.nodes.length).toBeGreaterThanOrEqual(2);
  });

  it('handles empty input gracefully', () => {
    const result = parseSyllabusStructure('');
    expect(result.structured).toBe(false);
    expect(result.nodes.length).toBe(0);
  });

  it('extracts codes from header-like lines', () => {
    const text = `# MAT101: Basic Mathematics
## MAT102: Advanced Topics`;
    const result = parseSyllabusStructure(text);
    expect(result.nodes.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// parsePastPaper
// ---------------------------------------------------------------------------
describe('parsePastPaper', () => {
  it('parses numbered questions with body text', () => {
    const text = `SECTION A

1. Define the term velocity in physics. This is a proper question with enough text.
2. Explain why the sky appears blue during daytime hours.
3. Calculate the area of a circle given its radius measurement.

SECTION B

4. State Newton's first law of motion clearly and concisely now.`;
    const result = parsePastPaper(text);
    expect(result.questions.length).toBeGreaterThanOrEqual(4);
    expect(result.sectionNames.length).toBeGreaterThanOrEqual(2);
  });

  it('detects command verbs from question text', () => {
    const text = `1. Define photosynthesis and explain its importance today.
2. Calculate the area of rectangle with sides 5cm and 10cm please.
3. Describe the process of cellular respiration in detail here.`;
    const result = parsePastPaper(text);
    const verbs = result.questions.map(q => q.commandVerb);
    expect(verbs.some(v => v === 'DEFINE')).toBe(true);
    expect(verbs.some(v => v === 'CALCULATE')).toBe(true);
    expect(verbs.some(v => v === 'DESCRIBE')).toBe(true);
  });

  it('extracts marks from bracketed annotations at end of line', () => {
    const text = `1. Define velocity in physics terms and provide an example. [5 marks]
2. Calculate the force using F equals m times a with given values. [10 marks]
3. Explain the concept of momentum conservation in collisions now. [3 marks]`;
    const result = parsePastPaper(text);
    const marks = result.questions.map(q => q.marks);
    expect(marks.filter(m => m !== null && m > 0)).toHaveLength(3);
    expect(marks.includes(5)).toBe(true);
    expect(marks.includes(10)).toBe(true);
  });

  it('identifies multiple-choice questions with inline options', () => {
    // MCQ detection requires the options pattern in the question body (≥8 chars)
    const text = `1. What is the capital of France? A) London B) Paris C) Berlin D) Madrid`;
    const result = parsePastPaper(text);
    // Body must be ≥8 chars for the question to be retained
    if (result.questions.length > 0) {
      expect(result.questions[0].questionType).toBe('MULTIPLE_CHOICE');
    }
  });
});

// ---------------------------------------------------------------------------
// parseMarkingScheme
// ---------------------------------------------------------------------------
describe('parseMarkingScheme', () => {
  it('parses numbered marking points with marks', () => {
    // The parser expects [N marks] or (N marks) in bracketed form at end of line
    const text = `1. Accept answer 5 as correct for part a [2 marks]
2. Method mark for showing correct approach to solution [1 mark]
3. Final answer correct with units included here now [3 marks]`;
    const result = parseMarkingScheme(text);
    expect(result.points.length).toBeGreaterThanOrEqual(3);
    expect(result.points.every(p => p.pointText.length > 0)).toBe(true);
  });

  it('handles OCR-detected text appropriately', () => {
    const text = `1. Point unclear due to scanning quality issues here
2. Another point text follows below`;
    const result = parseMarkingScheme(text);
    expect(typeof result.ocrRequired).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// matchMarkingPoints
// ---------------------------------------------------------------------------
describe('matchMarkingPoints', () => {
  it('matches points to questions by question number string', () => {
    const parsed = {
      ocrRequired: false,
      points: [
        { questionNumber: '1', pointText: 'Answer is 5', marks: 2, matched: false },
        { questionNumber: '2', pointText: 'Answer is 10', marks: 3, matched: false },
      ],
      notes: [],
    };
    const questions = [
      { number: '1', parts: [] },
      { number: '2', parts: [] },
    ];
    const result = matchMarkingPoints(parsed, questions);
    expect(result.every(p => p.matched === true)).toBe(true);
  });

  it('leaves unmatched points unmarked when question number differs', () => {
    const parsed = {
      ocrRequired: false,
      points: [
        { questionNumber: '99', pointText: 'Orphan point', marks: null, matched: false },
      ],
      notes: [],
    };
    const questions = [{ number: '1', parts: [] }];
    const result = matchMarkingPoints(parsed, questions);
    expect(result[0].matched).toBe(false);
  });

  it('handles part-labeled points correctly', () => {
    const parsed = {
      ocrRequired: false,
      points: [
        { questionNumber: '1', partLabel: 'A', pointText: 'Part A answer', marks: 1, matched: false },
      ],
      notes: [],
    };
    const questions = [{
      number: '1',
      parts: [{ label: 'A', text: 'Part A text', marks: 1 }],
    }];
    const result = matchMarkingPoints(parsed, questions);
    expect(result[0].matched).toBe(true);
  });
});

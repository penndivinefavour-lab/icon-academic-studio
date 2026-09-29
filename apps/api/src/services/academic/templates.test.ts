import { describe, it, expect } from 'vitest';
import { ACADEMIC_TEMPLATES, getTemplateByType, ALL_PROJECT_TYPES } from './templates.js';

describe('Academic Project Templates', () => {
  it('defines all 17 project types', () => {
    expect(ALL_PROJECT_TYPES).toHaveLength(17);
    expect(ALL_PROJECT_TYPES).toContain('HND_PROJECT');
    expect(ALL_PROJECT_TYPES).toContain('HND_RESEARCH_PROJECT');
    expect(ALL_PROJECT_TYPES).toContain('THESIS');
    expect(ALL_PROJECT_TYPES).toContain('DISSERTATION');
    expect(ALL_PROJECT_TYPES).toContain('RESEARCH_PROPOSAL');
    expect(ALL_PROJECT_TYPES).toContain('CUSTOM');
  });

  it('exposes the 12 required templates', () => {
    const names = ACADEMIC_TEMPLATES.map((t) => t.name);
    expect(names).toContain('HND Project');
    expect(names).toContain('HND Research Project');
    expect(names).toContain("Bachelor's Research Project");
    expect(names).toContain('Thesis');
    expect(names).toContain('Dissertation');
    expect(names).toContain('Research Proposal');
    expect(names).toContain('Seminar Paper');
    expect(names).toContain('Internship Report');
    expect(names).toContain('Industrial Training Report');
    expect(names).toContain('Research Paper');
    expect(names).toContain('Literature Review');
    expect(names).toContain('Custom Academic Project');
  });

  it('gives every template a unique projectType', () => {
    const types = ACADEMIC_TEMPLATES.map((t) => t.projectType);
    expect(new Set(types).size).toBe(types.length);
  });

  it('numbers chapters contiguously starting at 1', () => {
    for (const t of ACADEMIC_TEMPLATES) {
      const nums = t.chapters.map((c) => c.chapterNumber);
      expect(nums[0]).toBe(1);
      for (let i = 1; i < nums.length; i++) {
        expect(nums[i]).toBe(nums[i - 1] + 1);
      }
    }
  });

  it('sets word targets on research-style templates', () => {
    const hnd = getTemplateByType('HND_PROJECT')!;
    expect(hnd.chapters.length).toBeGreaterThanOrEqual(3);
    expect(hnd.chapters.every((c) => (c.wordTarget || 0) > 0)).toBe(true);
  });

  it('front matter kinds are unique within a template', () => {
    for (const t of ACADEMIC_TEMPLATES) {
      const kinds = t.frontMatter.map((f) => f.kind);
      expect(new Set(kinds).size).toBe(kinds.length);
    }
  });

  it('every requirement has a category, rule and severity', () => {
    for (const t of ACADEMIC_TEMPLATES) {
      for (const r of t.defaultRequirements) {
        expect(['STRUCTURE', 'CONTENT', 'REFERENCE', 'DATA', 'FORMATTING']).toContain(r.category);
        expect(r.rule.length).toBeGreaterThan(0);
        expect(['ERROR', 'WARNING', 'INFO']).toContain(r.severity);
      }
    }
  });

  it('thesis requires more words than an HND project', () => {
    const thesis = getTemplateByType('THESIS')!;
    const hnd = getTemplateByType('HND_PROJECT')!;
    const tMin = thesis.defaultRequirements.find((r) => r.rule === 'MIN_TOTAL_WORDS');
    const hMin = hnd.defaultRequirements.find((r) => r.rule === 'MIN_TOTAL_WORDS');
    expect(tMin).toBeDefined();
    expect(hMin).toBeDefined();
    // parameters may be stored as a Record or a JSON string — normalize both
    const tNum = typeof tMin!.parameters === 'string' ? JSON.parse(tMin!.parameters as string) : tMin!.parameters;
    const hNum = typeof hMin!.parameters === 'string' ? JSON.parse(hMin!.parameters as string) : hMin!.parameters;
    expect(tNum.minimum).toBeGreaterThan(hNum.minimum);
  });

  it('custom template has no forced requirements', () => {
    expect(getTemplateByType('CUSTOM')!.defaultRequirements).toHaveLength(0);
  });

  it('proposal and seminar templates have no full 5 chapters', () => {
    expect(getTemplateByType('RESEARCH_PROPOSAL')!.chapters.length).toBe(3);
    expect(getTemplateByType('SEMINAR_PAPER')!.chapters.length).toBe(3);
  });

  it('templates contain structural placeholders, not generated content', () => {
    for (const t of ACADEMIC_TEMPLATES) {
      for (const c of t.chapters) {
        expect(c.title.length).toBeGreaterThan(0);
        expect(c.title).not.toMatch(/\bAbstract of the Study\b/);
      }
    }
  });
});

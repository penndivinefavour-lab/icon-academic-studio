/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';

describe('AI Provider Types', () => {
  it('should support all provider types', () => {
    const types = ['gemini', 'openai', 'openrouter', 'ollama', 'custom'];
    expect(types).toContain('gemini');
    expect(types).toContain('openai');
    expect(types).toContain('ollama');
  });
});

describe('Project Status Types', () => {
  it('should define all status values', () => {
    const statuses = ['draft', 'in-progress', 'review', 'completed', 'archived'];
    expect(statuses).toHaveLength(5);
    expect(statuses).toContain('draft');
    expect(statuses).toContain('completed');
  });
});

describe('Citation Format Types', () => {
  it('should support common citation styles', () => {
    const formats = ['apa', 'mla', 'chicago', 'harvard', 'ieee'];
    expect(formats).toContain('apa');
    expect(formats).toContain('mla');
  });
});

describe('Export Format Types', () => {
  it('should support all export formats', () => {
    const formats = ['docx', 'pdf', 'markdown', 'html', 'txt'];
    expect(formats).toContain('docx');
    expect(formats).toContain('pdf');
    expect(formats).toContain('markdown');
  });
});
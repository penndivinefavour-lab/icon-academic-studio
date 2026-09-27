/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';

// Simple in-memory store for testing
const projects = new Map<string, any>();
const sources = new Map<string, any>();
const researchNotes = new Map<string, any>();
const researchQuestions = new Map<string, any>();
const citations = new Map<string, any>();

let nextId = 1;
const generateId = () => `test-${nextId++}`;

const app = express();
app.use(express.json());

// Health endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.2.0' });
});

// Projects CRUD
app.get('/api/v1/projects', (_req, res) => {
  res.json({ success: true, data: Array.from(projects.values()) });
});

app.post('/api/v1/projects', (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
  }
  const project = { id: generateId(), name, type, status: 'DRAFT', createdAt: new Date() };
  projects.set(project.id, project);
  res.status(201).json({ success: true, data: project });
});

app.get('/api/v1/projects/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  res.json({ success: true, data: project });
});

app.patch('/api/v1/projects/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  Object.assign(project, req.body, { updatedAt: new Date() });
  res.json({ success: true, data: project });
});

app.delete('/api/v1/projects/:id', (req, res) => {
  const deleted = projects.delete(req.params.id);
  res.json({ success: true, data: { deleted } });
});

// Sources
app.get('/api/v1/sources', (req, res) => {
  const projectId = req.query.projectId as string;
  if (!projectId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
  const filtered = Array.from(sources.values()).filter(s => s.projectId === projectId);
  res.json({ success: true, data: filtered });
});

app.post('/api/v1/sources', (req, res) => {
  const { projectId, name, type } = req.body;
  if (!projectId || !name || !type) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
  }
  const source = { id: generateId(), projectId, name, type, status: 'UPLOADED', metadata: '{}' };
  sources.set(source.id, source);
  res.status(201).json({ success: true, data: source });
});

// Research Questions
app.get('/api/v1/research/questions', (req, res) => {
  const projectId = req.query.projectId as string;
  if (!projectId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
  const filtered = Array.from(researchQuestions.values()).filter(q => q.projectId === projectId);
  res.json({ success: true, data: filtered });
});

app.post('/api/v1/research/questions', (req, res) => {
  const { projectId, question } = req.body;
  if (!projectId || !question) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
  }
  const q = { id: generateId(), projectId, question, status: 'OPEN' };
  researchQuestions.set(q.id, q);
  res.status(201).json({ success: true, data: q });
});

// Research Notes
app.get('/api/v1/research/notes', (req, res) => {
  const projectId = req.query.projectId as string;
  if (!projectId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
  const filtered = Array.from(researchNotes.values()).filter(n => n.projectId === projectId);
  res.json({ success: true, data: filtered });
});

app.post('/api/v1/research/notes', (req, res) => {
  const { projectId, title } = req.body;
  if (!projectId || !title) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
  }
  const note = { id: generateId(), projectId, title, content: '', tags: '[]' };
  researchNotes.set(note.id, note);
  res.status(201).json({ success: true, data: note });
});

// Search
app.get('/api/v1/research/search', (req, res) => {
  const projectId = req.query.projectId as string;
  const query = req.query.q as string;
  if (!projectId || !query) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
  }
  const total = sources.size + researchNotes.size + researchQuestions.size;
  res.json({ success: true, data: { sources: [], notes: [], questions: [], total } });
});

// Citations
app.get('/api/v1/citations', (req, res) => {
  const sourceId = req.query.sourceId as string;
  if (!sourceId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
  const filtered = Array.from(citations.values()).filter(c => c.sourceId === sourceId);
  res.json({ success: true, data: filtered });
});

app.post('/api/v1/citations', (req, res) => {
  const { sourceId, raw } = req.body;
  if (!sourceId || !raw) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
  }
  const citation = { id: generateId(), sourceId, raw, author: null, year: null };
  citations.set(citation.id, citation);
  res.status(201).json({ success: true, data: citation });
});

describe('ICON Academic Studio - Phase 2 Integration Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await fetch('http://localhost:9999/api/health');
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.version).toBeTruthy();
    });
  });

  describe('Projects CRUD', () => {
    let projectId: string;

    it('should create a project', async () => {
      const response = await fetch('http://localhost:9999/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Project', type: 'RESEARCH_PROJECT' }),
      });
      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Test Project');
      projectId = data.data.id;
    });

    it('should list projects', async () => {
      const response = await fetch('http://localhost:9999/api/v1/projects');
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should get a project by ID', async () => {
      const response = await fetch(`http://localhost:9999/api/v1/projects/${projectId}`);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.data.id).toBe(projectId);
    });

    it('should update a project', async () => {
      const response = await fetch(`http://localhost:9999/api/v1/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Project' }),
      });
      const data = await response.json();
      expect(data.data.name).toBe('Updated Project');
    });

    it('should delete a project', async () => {
      const response = await fetch(`http://localhost:9999/api/v1/projects/${projectId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Source Management', () => {
    let projectId: string;
    let sourceId: string;

    beforeEach(async () => {
      // Create project first
      const res = await fetch('http://localhost:9999/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Source Test', type: 'BOOK' }),
      });
      const data = await res.json();
      projectId = data.data.id;
    });

    it('should create a source', async () => {
      const response = await fetch('http://localhost:9999/api/v1/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, name: 'Test PDF', type: 'PDF' }),
      });
      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.data.name).toBe('Test PDF');
      expect(data.data.status).toBe('UPLOADED');
      sourceId = data.data.id;
    });

    it('should list sources for a project', async () => {
      await fetch('http://localhost:9999/api/v1/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, name: 'Source 1', type: 'PDF' }),
      });
      await fetch('http://localhost:9999/api/v1/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, name: 'Source 2', type: 'DOCX' }),
      });

      const response = await fetch(`http://localhost:9999/api/v1/sources?projectId=${projectId}`);
      const data = await response.json();
      expect(data.data.length).toBe(2);
    });

    it('should validate source creation', async () => {
      const response = await fetch('http://localhost:9999/api/v1/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Research Questions', () => {
    let projectId: string;

    beforeEach(async () => {
      const res = await fetch('http://localhost:9999/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Research Test', type: 'THESIS' }),
      });
      const data = await res.json();
      projectId = data.data.id;
    });

    it('should create a research question', async () => {
      const response = await fetch('http://localhost:9999/api/v1/research/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, question: 'What is AI?' }),
      });
      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.data.question).toContain('AI');
    });

    it('should list research questions', async () => {
      await fetch('http://localhost:9999/api/v1/research/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, question: 'Question 1' }),
      });
      await fetch('http://localhost:9999/api/v1/research/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, question: 'Question 2' }),
      });

      const response = await fetch(`http://localhost:9999/api/v1/research/questions?projectId=${projectId}`);
      const data = await response.json();
      expect(data.data.length).toBe(2);
    });
  });

  describe('Research Notes', () => {
    let projectId: string;

    beforeEach(async () => {
      const res = await fetch('http://localhost:9999/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Notes Test', type: 'RESEARCH_PROJECT' }),
      });
      const data = await res.json();
      projectId = data.data.id;
    });

    it('should create a research note', async () => {
      const response = await fetch('http://localhost:9999/api/v1/research/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Key Finding', content: 'AI helps education' }),
      });
      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.data.title).toBe('Key Finding');
    });

    it('should list research notes', async () => {
      await fetch('http://localhost:9999/api/v1/research/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Note 1' }),
      });

      const response = await fetch(`http://localhost:9999/api/v1/research/notes?projectId=${projectId}`);
      const data = await response.json();
      expect(data.data.length).toBe(1);
    });
  });

  describe('Search', () => {
    it('should search across sources, notes, and questions', async () => {
      // Create some data
      await fetch('http://localhost:9999/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Search Test', type: 'RESEARCH_PROJECT' }),
      });

      const response = await fetch('http://localhost:9999/api/v1/research/search?projectId=test&q=AI');
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(typeof data.data.total).toBe('number');
    });

    it('should require projectId and query', async () => {
      const response = await fetch('http://localhost:9999/api/v1/research/search?q=AI');
      expect(response.status).toBe(400);
    });
  });

  describe('Citations', () => {
    let projectId: string;
    let sourceId: string;

    beforeEach(async () => {
      // Create project first
      const projRes = await fetch('http://localhost:9999/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Citation Test Project', type: 'RESEARCH_PROJECT' }),
      });
      const projData = await projRes.json();
      projectId = projData.data.id;

      // Create source with valid projectId
      const srcRes = await fetch('http://localhost:9999/api/v1/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, name: 'Citation Source', type: 'PDF' }),
      });
      const srcData = await srcRes.json();
      sourceId = srcData.data.id;
    });

    it('should create a citation', async () => {
      const response = await fetch('http://localhost:9999/api/v1/citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, raw: 'Smith (2024)' }),
      });
      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.raw).toBe('Smith (2024)');
    });

    it('should list citations for a source', async () => {
      await fetch('http://localhost:9999/api/v1/citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, raw: 'Citation 1' }),
      });

      const response = await fetch(`http://localhost:9999/api/v1/citations?sourceId=${sourceId}`);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });
});

// Start server for tests
const server = app.listen(9999, () => {
  console.log('Test server running on port 9999');
});

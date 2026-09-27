import { describe, it, expect } from 'vitest';
import express from 'express';
import supertest from 'supertest';

// Simple test server
const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

app.get('/api/v1/projects', (_req, res) => {
  res.json({ success: true, data: [] });
});

app.post('/api/v1/projects', (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
  }
  res.status(201).json({ success: true, data: { id: 'test-id', name, type } });
});

const api = supertest(app);

describe('API Health Endpoint', () => {
  it('should return health status', async () => {
    const response = await api.get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});

describe('Projects API', () => {
  it('should list projects', async () => {
    const response = await api.get('/api/v1/projects');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should create a project with valid data', async () => {
    const response = await api.post('/api/v1/projects').send({
      name: 'Test Project',
      type: 'RESEARCH_PROJECT',
    });
    expect(response.status).toBe(201);
    expect(response.body.data.name).toBe('Test Project');
  });

  it('should validate project creation data', async () => {
    const response = await api.post('/api/v1/projects').send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

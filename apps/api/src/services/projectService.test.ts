/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryProjectService } from './projectService.js';

describe('InMemoryProjectService', () => {
  let service: InMemoryProjectService;

  beforeEach(() => {
    service = new InMemoryProjectService();
  });

  it('should create a project with default values', async () => {
    const project = await service.create({
      name: 'Test Project',
      type: 'RESEARCH_PROJECT',
    });

    expect(project.id).toBeDefined();
    expect(project.name).toBe('Test Project');
    expect(project.type).toBe('RESEARCH_PROJECT');
    expect(project.status).toBe('DRAFT');
    expect(project.settings).toEqual({});
  });

  it('should accept optional fields', async () => {
    const project = await service.create({
      name: 'Full Project',
      type: 'THESIS',
      description: 'A test thesis',
      workspaceId: 'ws-123',
      settings: { citationStyle: 'APA' },
    });

    expect(project.description).toBe('A test thesis');
    expect(project.workspaceId).toBe('ws-123');
    expect(project.settings).toEqual({ citationStyle: 'APA' });
  });

  it('should return empty array when no projects exist', async () => {
    const projects = await service.findAll();
    expect(projects).toEqual([]);
  });

  it('should return all created projects', async () => {
    await service.create({ name: 'Project 1', type: 'BOOK' });
    await service.create({ name: 'Project 2', type: 'TEXTBOOK' });

    const projects = await service.findAll();
    expect(projects).toHaveLength(2);
  });

  it('should find a project by ID', async () => {
    const created = await service.create({ name: 'Found Project', type: 'DISSERTATION' });
    const found = await service.findById(created.id);

    expect(found).not.toBeNull();
    expect(found?.name).toBe('Found Project');
  });

  it('should return null for non-existent project', async () => {
    const project = await service.findById('non-existent-id');
    expect(project).toBeNull();
  });

  it('should update a project', async () => {
    const created = await service.create({ name: 'Original', type: 'REPORT' });
    const updated = await service.update(created.id, { name: 'Updated' });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('Updated');
  });

  it('should delete a project', async () => {
    const created = await service.create({ name: 'ToDelete', type: 'ESSAY' });
    const result = await service.delete(created.id);

    expect(result).toBe(true);
    const found = await service.findById(created.id);
    expect(found).toBeNull();
  });
});
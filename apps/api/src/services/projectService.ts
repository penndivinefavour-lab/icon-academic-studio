export interface ProjectService {
  create(data: CreateProjectInput): Promise<Project>;
  findAll(): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  update(id: string, data: UpdateProjectInput): Promise<Project | null>;
  delete(id: string): Promise<boolean>;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  type: string;
  workspaceId?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  type?: string;
  status?: string;
  settings?: Record<string, unknown>;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: string;
  workspaceId?: string;
  settings: Record<string, unknown>;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class InMemoryProjectService implements ProjectService {
  private projects: Map<string, Project> = new Map();

  async create(input: CreateProjectInput): Promise<Project> {
    const project: Project = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      type: input.type,
      workspaceId: input.workspaceId,
      settings: input.settings || {},
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(project.id, project);
    return project;
  }

  async findAll(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async findById(id: string): Promise<Project | null> {
    return this.projects.get(id) || null;
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
    const existing = this.projects.get(id);
    if (!existing) return null;

    const updated: Project = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };
    this.projects.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }
}

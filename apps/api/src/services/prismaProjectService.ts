import prisma from '@icon-academic/db';
import { Project, CreateProjectInput, UpdateProjectInput } from './projectService.js';

export class PrismaProjectService {
  async create(input: CreateProjectInput): Promise<Project> {
    const project = await prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        type: input.type,
        workspaceId: input.workspaceId,
        settings: input.settings || {},
      },
    });

    return this.mapToProject(project);
  }

  async findAll(): Promise<Project[]> {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return projects.map(this.mapToProject);
  }

  async findById(id: string): Promise<Project | null> {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    return project ? this.mapToProject(project) : null;
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
    const project = await prisma.project.update({
      where: { id },
      data: input,
    });

    return this.mapToProject(project);
  }

  async delete(id: string): Promise<boolean> {
    await prisma.project.delete({
      where: { id },
    });
    return true;
  }

  private mapToProject(project: any): Project {
    return {
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      type: project.type,
      workspaceId: project.workspaceId || undefined,
      settings: project.settings || {},
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}

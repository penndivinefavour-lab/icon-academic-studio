import { Router } from 'express';
import { projectsRouter } from './projects.js';
import { sourcesRouter } from './sources.js';
import { documentsRouter } from './documents.js';
import { datasetsRouter } from './datasets.js';
import { aiProvidersRouter } from './ai-providers.js';
import { templatesRouter } from './templates.js';
import { healthRouter } from './health.js';
import { researchRouter } from './research.js';
import { citationsRouter } from './citations.js';

export const apiRoutes = Router();

apiRoutes.use('/health', healthRouter);
apiRoutes.use('/projects', projectsRouter);
apiRoutes.use('/sources', sourcesRouter);
apiRoutes.use('/documents', documentsRouter);
apiRoutes.use('/datasets', datasetsRouter);
apiRoutes.use('/ai/providers', aiProvidersRouter);
apiRoutes.use('/templates', templatesRouter);
apiRoutes.use('/research', researchRouter);
apiRoutes.use('/citations', citationsRouter);

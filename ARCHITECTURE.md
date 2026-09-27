# ARCHITECTURE.md

## System Overview

ICON Academic Studio is a modular monolith built on:

- **Backend**: Express.js + TypeScript
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: PostgreSQL (via Prisma ORM)
- **Package Manager**: pnpm workspaces

## Directory Structure

```
icon-academic-studio/
├── apps/
│   ├── api/                 # Backend application
│   │   ├── src/
│   │   │   ├── routes/      # HTTP route handlers
│   │   │   ├── middleware/  # Auth, validation, error handling
│   │   │   ├── services/    # Business logic
│   │   │   ├── controllers/ # Request/response mapping
│   │   │   ├── types/       # TypeScript type definitions
│   │   │   ├── utils/       # Helpers
│   │   │   └── config/      # Environment configuration
│   │   └── package.json
│   └── web/                 # Frontend application
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── hooks/       # Custom React hooks
│       │   ├── services/    # API client functions
│       │   ├── types/       # TypeScript types
│       │   ├── styles/      # Global styles
│       │   └── pages/       # Page components
│       └── package.json
├── packages/
│   ├── shared/              # Types and utilities shared across apps
│   ├── db/                  # Prisma schema, migrations, client
│   └── ui/                  # Shared UI component library
├── docs/                    # Documentation
└── .github/workflows/       # CI/CD pipelines
```

## Module Boundaries

### Core Domain Model

The domain model centers on these entities:

| Entity | Purpose |
|--------|---------|
| `Project` | Root container for all work |
| `Workspace` | Collaborative context (future) |
| `Source` | Uploaded/referenced material |
| `Document` | Structured document output |
| `Dataset` | Tabular data for analysis |
| `Template` | Reusable document structure |
| `AIProvider` | Configured AI endpoint |
| `Citation` | Source attribution |
| `ReviewItem` | Human review tracking |

### AI Provider Abstraction

All AI interactions flow through provider interfaces:

```typescript
interface AIProvider {
  id: string;
  name: string;
  type: 'gemini' | 'openai' | 'openrouter' | 'ollama' | 'custom';
  endpoint: string;
  models: AIModel[];
  capabilities: ProviderCapabilities;
  
  chat(params: ChatParams): Promise<ChatResponse>;
  embed(texts: string[]): Promise<number[][]>; // if supported
  generateImage(prompt: string): Promise<string>; // if supported
}
```

### Research Pipeline

```
Source → Ingest → Extract → Chunk → Evidence → Citation → Document
```

### Document Structure

Documents are structured, not flat text:

```
Document
├── metadata (title, type, settings)
├── sections[]
│   └── subsections[]
│       └── blocks[]
│           ├── type: 'paragraph' | 'heading' | 'list' | 'table' | 'figure'
│           ├── content
│           └── citations[]
├── references[]
└── appendices[]
```

### Formatting Profiles

Formatting is data-driven:

```typescript
interface FormattingProfile {
  page: { size: 'A4' | 'Letter'; margins: Margins };
  typography: { fontFamily: string; sizes: Record<string, number> };
  spacing: { lineSpacing: number; paragraphSpacing: number };
  citations: { style: 'APA' | 'MLA' | 'Chicago' | 'custom' };
}
```

## API Design

Base path: `/api/v1`

Key endpoints (Phase 1):

```
GET    /api/v1/health
POST   /api/v1/auth/login
POST   /api/v1/auth/register  (internal only)
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PATCH  /api/v1/projects/:id
DELETE /api/v1/projects/:id
GET    /api/v1/sources
POST   /api/v1/sources
GET    /api/v1/documents
POST   /api/v1/documents
POST   /api/v1/documents/:id/export
GET    /api/v1/datasets
POST   /api/v1/datasets
POST   /api/v1/datasets/:id/analyze
GET    /api/v1/templates
POST   /api/v1/templates
GET    /api/v1/ai/providers
POST   /api/v1/ai/providers
PATCH  /api/v1/ai/providers/:id
```

## Database

PostgreSQL with Prisma ORM. Schema defined in `packages/db/prisma/schema.prisma`.

Migrations are version-controlled and applied automatically at startup in development.

## Frontend

React 18 + Vite 5 + Tailwind CSS 3.

Type-safe API client generated from shared types.

No state management library in Phase 1 — using React context + useReducer for simplicity.

## Testing

- Vitest for unit tests
- Supertest for API integration tests
- Jest + React Testing Library for frontend components

Test coverage target: 70%+ for core modules.

## Security Model

1. JWT-based authentication
2. Environment-variable secret storage
3. Input validation on all endpoints
4. File upload validation (type, size, content scanning)
5. API key encryption at rest
6. No logging of document content or source material

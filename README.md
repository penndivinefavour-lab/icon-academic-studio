# ICON Academic Studio

Research. Learn. Create. Publish.

Private research, academic production, educational publishing, document-generation, data-analysis, and knowledge-work environment.

## What This Is

A local-first workstation for producing GCE study pamphlets, revision guides, textbooks, questionnaires, mock examinations, HND projects, theses, research reports, and publication-ready documents. Built for serious academic work with source traceability and human review as first-class concerns.

## What This Is NOT (Yet)

- Not a public SaaS platform (no subscriptions, no multi-tenancy in Phase 1)
- Not an automated fact-checking system
- Not a web crawler or research engine (Phase 1 only ingests uploaded sources)
- Not production-ready for commercial use
- Not an Android app yet (future phase)

## Architecture

```
icon-academic-studio/
├── apps/
│   ├── api/          # Express + TypeScript backend
│   └── web/          # React + Vite frontend
├── packages/
│   ├── shared/       # Shared types and utilities
│   ├── db/           # Prisma schema and migrations
│   └── ui/           # Shared UI components
├── docs/
└── monorepo config (pnpm workspace)
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy env and configure
cp .env.example .env
# Edit .env with your settings

# Database
pnpm db:migrate
pnpm db:generate

# Run API
pnpm dev

# In another terminal, run web
cd apps/web && pnpm dev
```

## Phases

See [ROADMAP.md](./ROADMAP.md) for full progression.

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | IN PROGRESS | Foundation & Architecture |
| 2 | Planned | Research Workspace |
| 3 | Planned | Document Studio |
| 4 | Planned | Data Lab |
| 5 | Planned | GCE/Past-Paper Intelligence |
| 6 | Planned | Academic Project Studio |
| 7 | Planned | Publishing & Book Production |
| 8 | Planned | Advanced AI Research |
| 9 | Planned | Android Companion |
| 10 | Planned | Production Hardening |

## Security

- All secrets via environment variables or `.env`
- No hardcoded API keys
- Uploaded files validated before processing
- AI-generated content marked as such
- Source provenance tracked where practical

See [SECURITY.md](./SECURITY.md).

## License

Private project. All rights reserved.

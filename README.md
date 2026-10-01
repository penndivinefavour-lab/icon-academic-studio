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
| 1-7 | COMPLETE | Foundation through Publishing |
| 8 | COMPLETE | AI Academic Intelligence |
| 8.1 | COMPLETE | Integration Hardening |
| 8.1.1 | COMPLETE | Brand Correction & E2E Proof |
| 9 | COMPLETE | Workflow Orchestration & Command Center |
| 9.1 | COMPLETE | Security Hardening & Activity UI |
| 10 | Planned | Android Companion |
| 11 | Planned | Production Hardening |

## Key Features (Phase 9)

### Project Command Center
- Unified workflow view showing progress across all stages
- Real-time completion percentage based on actual project state
- Workflow pipeline visualization (Discover → Export)
- Materials summary (sources, datasets, documents, publications)

### Deterministic Next-Action Engine
- Rule-based recommendations derived from actual project state
- NO AI predictions — explicit if/then logic
- Categories: research, methodology, data, writing, review, publishing

### Activity Tracking
- Chronological event log for each project
- Human-readable descriptions without exposing sensitive data
- Pagination support
- Cross-module event tracking (sources, chapters, AI generations, exports)

### Academic Integrity Safeguards
- All AI content marked as `NEEDS_REVIEW` by default
- Human review required before content becomes verified
- Evidence linking preserved through generation lifecycle
- No fabricated references or citations

## Security

- All secrets via environment variables or `.env`
- No hardcoded API keys
- Uploaded files validated before processing
- AI-generated content marked as such
- Source provenance tracked where practical
- Project-scoped authorization enforced server-side
- Activity responses minimize sensitive field exposure

See [SECURITY.md](./SECURITY.md).

## Documentation

- [PHASE_9_AUDIT.md](./docs/PHASE_9_AUDIT.md) - Phase 9 architecture audit
- [ACADEMIC_WORKFLOWS.md](./docs/ACADEMIC_WORKFLOWS.md) - Workflow lifecycle guide
- [ACADEMIC_INTEGRITY.md](./docs/ACADEMIC_INTEGRITY.md) - AI safeguards documentation
- [PROJECT_COMMAND_CENTER.md](./docs/PROJECT_COMMAND_CENTER.md) - Command Center API reference
- [PHASE_9_1_AUDIT.md](./docs/PHASE_9_1_AUDIT.md) - Phase 9.1 hardening audit

## Testing

```bash
# Run all tests
bun test

# Run API tests
bun test apps/api

# Run specific test file
bun test apps/api/src/services/project/phase9-1-security.test.ts
```

**Current Status:** 472 tests passing, 0 failing.

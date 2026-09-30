# Phase 7 Plan: Publishing & Book Production

## Objective

Transform ICON Academic Studio from an academic/research workspace into a full publishing production environment supporting textbooks, study guides, GCE pamphlets, research books, manuals, and custom publications.

## Scope

### In Scope
- Publishing domain models (12 new Prisma models)
- Publication lifecycle: create → structure → content → validate → export
- 15 publication templates with structural definitions
- Document Studio synchronization
- Version management with snapshot restore
- Validation engine (structure, content, reference, figure, table, production rules)
- Real DOCX/PDF/Mardown/HTML/TXT export via existing pipeline
- GCE Study Guide integration (historical questions only)
- Contributing metadata (authors, editors, illustrators)
- Front/Back matter management
- Glossary and index tools
- Figure/table numbering with provenance links
- Basic frontend interface

### Out of Scope (Phase 7+)
- Marketplace/publication submission
- Payment processing
- Public author profiles
- Social features
- Multi-tenancy beyond project isolation
- Print-on-demand integration
- AI-generated content drafts (provider abstraction exists but not wired)

## Implementation Plan

### Step 1: Database Schema
Add 12 new models to Prisma schema with proper relations:
- Publication (root entity)
- PublicationContributor
- PublicationPart
- PublicationChapter
- PublicationFrontMatter
- PublicationBackMatter
- PublicationFigure
- PublicationGlossary
- PublicationIndexEntry
- PublicationSeries
- PublicationTemplate
- PublicationValidationRun + Issue

Ensure opposite-side relations declared correctly for Prisma 5.22.0.

### Step 2: Service Layer
Implement CRUD and workflow methods:
- createPublication, getPublication, listPublications, updatePublication, deletePublication
- Template application (createFromTemplate)
- Part/Chapter CRUD with ordering
- Front/Back matter upsert
- Contributor management
- Glossary term CRUD
- Index entry CRUD
- Figure/Table CRUD (numbered by kind)
- Validation engine with issue persistence
- Document sync service
- TOC generation
- Version create/list/restore
- Export bridge to documentExport.ts

### Step 3: Templates
Define 15 structural templates in `templates.ts`:
- Each with frontMatter array, backMatter array, chapterStructure array
- Citation style defaults (APA)
- Formatting preset hints
- Word target suggestions

### Step 4: API Routes
REST endpoints under `/api/v1/publishing` with Zod validation.

### Step 5: Frontend
PublishingStudio.tsx page with tabs:
- Overview (dashboard stats)
- Metadata editing
- Parts/Chapters list
- Contributors
- Validation status
- Export options

### Step 6: Testing
- Unit tests for service methods
- Integration tests for relationships
- E2E workflow tests
- Export verification tests
- Security tests (ownership, validation)

### Step 7: Documentation
Update README, add PUBLISHING.md.

## Acceptance Criteria

1. Schema validates (prisma validate passes)
2. Migration creates all tables
3. All service methods work against PostgreSQL
4. 15 templates structurally valid
5. 47+ tests passing
6. 355 total tests pass (regression)
7. DOCX export produces valid ZIP
8. PDF export produces valid PDF
9. Frontend page renders without errors
10. Git clean, pushed to master

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking Phase 1-6 tests | Isolated test files, clean migration |
| Relationship validation failures | Named relations on both sides |
| Duplicate content engines | Reuse DocumentService only |
| Export path security | Server-generated paths, no user input |

## Timeline

Estimated: 2-3 days implementation + 1 day testing/verification

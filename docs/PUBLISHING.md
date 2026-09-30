# ICON Academic Studio — Phase 7: Publishing & Book Production

## Overview

Phase 7 adds a complete publishing workspace to ICON Academic Studio, enabling creation of long-form publications: textbooks, study guides, research books, manuals, and more. The system reuses existing Document Studio architecture rather than duplicating it.

## Architecture

### Schema (12 new models)

| Model | Purpose |
|-------|---------|
| `Publication` | Root entity; maps to `Project` and optionally `Document` |
| `PublicationContributor` | Authors, editors, illustrators, etc. |
| `PublicationPart` | Book parts (e.g., "Part I: Basics") |
| `PublicationChapter` | Chapters with numbering, word targets, status |
| `PublicationFrontMatter` | Title page, TOC, dedication, etc. |
| `PublicationBackMatter` | References, glossary, index, appendices |
| `PublicationFigure` | Figures and tables (unified via `kind` field) |
| `PublicationGlossary` | Term definitions with optional chapter binding |
| `PublicationIndexEntry` | Index terms linked to sections/blocks |
| `PublicationSeries` | Book series membership |
| `PublicationTemplate` | Structural templates (15 types defined) |
| `PublicationValidationRun` / `PublicationValidationIssue` | Validation tracking |

### Relationships

- **Publication ↔ Project**: Cascade delete on project removal (SetNull semantics)
- **Publication ↔ Document**: Optional linkage via `documentId`
- **PublicationChapter ↔ DocumentSection**: Synced during document export
- **PublicationFigure ↔ Chart/Table_**: Provenance links to Data Lab
- **PublicationGlossary ↔ PublicationChapter**: Optional chapter binding
- **PublicationIndexEntry ↔ DocumentSection/Block**: Direct source mapping

## Publication Lifecycle

```
Create → Template Application → Metadata → Content (Chapters)
       → Contributors → Front/Back Matter → Figures/Tables
       → Glossary/Index → Validation → Sync to Document Studio
       → Versioning → Export (DOCX/PDF/TXT/HTML/Markdown)
```

## Templates

15 structural templates with valid front matter, back matter, and chapter structure:

1. **TEXTBOOK** — Learning objectives, examples, exercises, review questions
2. **STUDY_GUIDE** — Topic-based organization with revision notes
3. **GCE_STUDY_PAMPHLET** — Syllabus-topic mapped, practice questions
4. **REVISION_GUIDE** — Condensed reference format
5. **WORKBOOK** — Exercise-focused layout
6. **ACADEMIC_BOOK** — Research monograph structure
7. **RESEARCH_BOOK** — Multi-study compilation
8. **MANUAL** — Procedural instructions
9. **HANDBOOK** — Reference compendium
10. **COURSE_MATERIAL** — Curriculum-aligned content
11. **TRAINING_MANUAL** — Professional development focus
12. **GENERAL_BOOK** — Flexible general use
13. **CUSTOM** — User-defined structure

Each template defines:
- Required vs. optional front matter items
- Back matter components  
- Chapter section structure with ordering
- Default citation style (APA)

## API Endpoints

All endpoints under `/api/v1/publishing`:

### Publications
- `GET /publications?projectId=X` — List by project
- `POST /publications` — Create (with Zod validation)
- `GET /publications/:id` — Get details
- `PUT /publications/:id` — Update metadata
- `DELETE /publications/:id` — Delete
- `POST /publications/from-template` — Create from template
- `GET /publications/templates` — Available templates

### Parts & Chapters
- `GET /publications/:id/parts` — List parts with chapters
- `POST /publications/:id/parts` — Add part
- `PUT /parts/:id` — Update part
- `PATCH /parts/:id/reorder` — Change part number order
- `DELETE /parts/:id` — Delete part
- `GET /publications/:id/chapters` — List chapters
- `POST /publications/:id/chapters` — Add chapter
- `PUT /chapters/:id` — Update chapter
- `DELETE /chapters/:id` — Delete chapter

### Front/Back Matter
- `GET /publications/:id/front-matter` — List front matter
- `POST /publications/:id/front-matter` — Upsert front matter item
- `DELETE /publications/:id/front-matter/:kind` — Remove front matter
- `GET /publications/:id/back-matter` — List back matter
- `POST /publications/:id/back-matter` — Upsert back matter item
- `DELETE /publications/:id/back-matter/:kind` — Remove back matter

### Contributors
- `GET /publications/:id/contributors` — List contributors
- `POST /publications/:id/contributors` — Add contributor
- `PUT /contributors/:id` — Update contributor
- `DELETE /contributors/:id` — Delete contributor

### Glossary & Index
- `GET /publications/:id/glossary` — List terms
- `POST /publications/:id/glossary` — Add term
- `PUT /glossary/:id` — Update term
- `DELETE /glossary/:id` — Delete term
- `GET /publications/:id/index` — List entries
- `POST /publications/:id/index` — Add entry
- `PUT /index/:id` — Update entry
- `DELETE /index/:id` — Delete entry

### Figures & Tables
- `GET /publications/:id/figures?kind=X` — List (filterable)
- `POST /publications/:id/figures` — Add figure/table
- `PUT /figures/:id` — Update caption/order
- `DELETE /figures/:id` — Delete

### Validation
- `POST /publications/:id/validate` — Run validation
- `GET /publications/:id/validation-runs` — List runs
- `GET /validation-runs/:runId/issues` — List issues
- `PATCH /validation-issues/:issueId/resolve` — Mark resolved

### Sync & TOC
- `POST /publications/:id/sync` — Sync to Document Studio
- `GET /publications/:id/toc` — Generate table of contents

### Versioning
- `POST /publications/:id/versions` — Create version snapshot
- `GET /publications/:id/versions` — List versions
- `POST /publications/:id/versions/:versionId/restore` — Restore

### Dashboard & Export
- `GET /publications/:id/dashboard` — Statistics overview
- `POST /publications/:id/export` — Queue DOCX/PDF export

## Validation Rules

Structural checks that run automatically:

| Category | Rule | Severity |
|----------|------|----------|
| STRUCTURE | Title required | ERROR |
| STRUCTURE | Publication type required | ERROR |
| STRUCTURE | At least one chapter | WARNING |
| PRODUCTION | ISBN-13 valid (if provided) | ERROR |
| CONTENT | Front matter titles present | WARNING |

Issues are persisted with IDs for tracking across validation runs.

## Document Studio Integration

When `syncToDocument()` is called:
1. Creates or reuses a `Document` entity
2. Maps each `PublicationChapter` to a `DocumentSection`
3. Links `publicationId` → `documentId` for export chaining
4. TOC reflects actual chapter hierarchy

Exports reuse the existing `documentExport.ts` pipeline (DOCX, PDF, Markdown, HTML, TXT).

## GCE Study Guide Workflow

For GCE study pamphlets:

1. Start with existing GCE subject/syllabus data (Phase 5)
2. Create `GCE_STUDY_PAMPHLET` publication from template
3. Chapters map to syllabus topics (topic codes preserved)
4. Historical past-paper questions inserted as evidence blocks
5. Explanations added per topic
6. Practice questions from question bank linked via provenance
7. Answer key back matter populated
8. Validation ensures no predicted questions appear

**Critical constraint**: Only historical/question-bank material used. No future exam predictions.

## Security Considerations

- All endpoints return data scoped to `projectId` 
- Zod validation on all write operations
- Export paths generated server-side; no user-controlled filesystem access
- No markdown/HTML rendered without sanitization in exports
- Publication titles/captions stored as plain text in exports

## Known Limitations

| Limitation | Status |
|------------|--------|
| AI-assisted drafting | Not implemented (requires provider config) |
| Real pagination calculation | Stub only; uses word-count heuristic |
| Cover design generation | External tool required |
| Print-on-demand integration | Future phase |

## Testing

```bash
# Run all Phase 7 tests
bun test apps/api/src/routes/publishing.test.ts

# Full suite (includes Phase 1-7)
bun test
```

47 Phase 7 tests covering:
- CRUD operations (create, read, update, delete)
- Parts/chapters with ordering
- Front/back matter upsert/delete
- Contributors lifecycle
- Glossary terms with pronunciation
- Index entries with subterms
- Figures/tables by kind
- Validation runs and issue resolution
- Document sync
- TOC generation
- Version create/list/restore
- Dashboard statistics
- Export job creation

## Files

- `packages/db/prisma/schema.prisma` — 12 new models (lines 1640+)
- `apps/api/src/services/publishing/service.ts` — Core service (985 lines)
- `apps/api/src/services/publishing/templates.ts` — 15 templates (444 lines)
- `apps/api/src/routes/publishing.ts` — REST endpoints (716 lines)
- `apps/api/src/routes/publishing.test.ts` — Tests (868 lines)
- `apps/web/src/pages/PublishingStudio.tsx` — Frontend UI
- `migration: 20260930175528_phase_7_publishing_and_book_production`

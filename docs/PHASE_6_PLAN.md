# Phase 6 — Academic Project Studio (implementation plan)

Reuse-first. No second hierarchy: chapters = typed view over `DocumentSection`.
All new tables link to existing `Project` / `Document` / `Dataset` / `Analysis` / `Table_` / `Chart` / `Citation`.

## New models (~24 tables)

| Model | Purpose | Reuses |
|---|---|---|
| AcademicProject | root academic record | Project, Document, FormattingProfile |
| AcademicChapter | chapter = DocumentSection mapping + word target | DocumentSection |
| AcademicRequirement | persisted validation rules (category/rule/params/severity) | — |
| AcademicObjective | GENERAL/SPECIFIC, order, status | ResearchQuestion (join) |
| ObjectiveQuestion | objective ↔ ResearchQuestion M:N | ResearchQuestion |
| ResearchHypothesis | NULL/ALTERNATIVE, status UNTESTED until analysis | Finding |
| ResearchVariable | role + measurement scale + operational def | DatasetColumn |
| ConceptualFramework / Node / Edge | persisted concepts + relationships | ResearchVariable |
| Methodology / MethodologySection | configurable methodology sections | — |
| Questionnaire / Section / Item | instrument with variable+objective+RQ mapping | ResearchVariable |
| InterviewGuide / InterviewQuestion | sections, probes, objective+RQ mapping | — |
| Finding | statement + analysis/table/chart/dataset/RQ/objective/hypothesis | Analysis, Table_, Chart, Dataset |
| Conclusion / ConclusionFinding | M:N finding traceability | Finding |
| Recommendation / RecommendationFinding | M:N finding traceability | Finding |
| AcademicAppendix | typed appendices bound to real artifacts | Source, Dataset, Table_, Chart |
| FrontMatter | typed front-matter sections | — |
| Abstract | text + wordLimit + generationStatus + reviewStatus | — |
| TableFigure | numbered TABLE/FIGURE with caption | Table_, Chart, DocumentSection |
| Reference | formatted reference bound to a Citation | Citation |
| ValidationRun / ValidationIssue | persisted validation results | — |

Templates: **reuse `Template`** with `type='ACADEMIC_PROJECT'`, structure JSON = chapters+frontMatter+defaults.

## Service layer (`apps/api/src/services/academic/`)
- `service.ts` — all persistence + workflow (project CRUD, chapters, requirements, objectives, hypotheses, variables, framework, methodology, instruments, findings, conclusions, appendices, references, dashboard)
- `templates.ts` — 12 academic template definitions, seeded deterministically
- `validator.ts` — validation engine (structure/content/references/data/formatting), persisted runs
- `referenceValidator.ts` — missing citations, uncited refs, incomplete refs, DOI format, duplicates
- `citationFormats.ts` — APA/MLA/Chicago/Harvard formatters (extend, not replace)
- `ai.ts` — provider-agnostic AI via existing AIProvider/APIKey tables; always `AI_GENERATED` + `needsReview`
- `exportBridge.ts` — academic project → Document Studio sections/blocks → existing DOCX/PDF/MD/HTML/TXT

## Routes
`/api/v1/academic-projects/...` registered in `routes/index.ts`.

## Tests (target: 237 → 300+)
- `templates.test.ts` — template definitions (unit)
- `validator.test.ts` — validation rules (unit)
- `citationFormats.test.ts` — formatters (unit)
- `referenceValidator.test.ts` — reference checks (unit)
- `service.test.ts` — persistence integration
- `security.test.ts` — cross-project isolation, injection, path traversal
- `export.test.ts` — real DOCX (ZIP/zip64) + PDF (%PDF-) + content
- `e2e.test.ts` — full workflow: create → template → chapters → objectives → RQ → hypothesis → variables → sources → evidence → citations → methodology → questionnaire → dataset → analysis → table/chart → findings → discussion → conclusion → recommendations → appendix → validate → resolve → document → export → version → restore → re-export

## Frontend
`AcademicStudio.tsx` — tabbed workspace (Overview / Structure / Research / Methodology / Instruments / Data / Findings / Validation / Export).

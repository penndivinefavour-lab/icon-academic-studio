# Phase 6 — Academic Project Studio

## Overview

Phase 6 turns ICON Academic Studio into a serious workspace for creating structured academic projects and research documents. It supports HND projects, theses, dissertations, research proposals, seminar papers, internship reports, literature reviews, research papers, questionnaires, interview guides, and custom academic projects.

The architecture is **configurable, not hard-coded** around one school. Project structures are defined by institution, program, department, academic level, project type, formatting profile, chapter structure, and citation style.

## Architecture

### Reuse-first principle

Phase 6 does **not** create a second document hierarchy, a second citation system, or a second data engine. It reuses:

| Existing system | How Phase 6 uses it |
|---|---|
| Document Studio (`Document`, `DocumentSection`, `DocumentBlock`) | Chapters are typed views over `DocumentSection`; the export bridge writes academic content into real document blocks |
| Data Lab (`Dataset`, `Analysis`, `Table_`, `Chart`) | Findings link to real analyses, tables, and charts; variables link to dataset columns |
| Research Workspace (`Source`, `EvidenceItem`, `ResearchQuestion`, `ResearchNote`) | Sources, evidence, and research questions are shared; objectives link to research questions |
| Citation system (`Citation`) | References bind to existing citations; formatting extends APA/MLA/Chicago with Harvard |
| Formatting profiles | Academic projects reference existing `FormattingProfile` records |
| AI provider abstraction | AI drafts go through the existing `AIProvider`/`AIModel` tables |
| Version history | Document Studio versions are reused for academic project snapshots |
| Export pipeline | DOCX, PDF, Markdown, HTML, TXT all use the existing `documentExport.ts` |

### New domain models (30 tables)

| Model | Purpose |
|---|---|
| `AcademicProject` | Root academic record (title, type, institution, student, supervisor, status) |
| `AcademicChapter` | Chapter = typed view over `DocumentSection` with word target |
| `AcademicRequirement` | Persisted validation rules (category, rule, parameters, severity) |
| `AcademicObjective` | GENERAL/SPECIFIC objectives with review status |
| `ObjectiveQuestion` | Objective ↔ ResearchQuestion / QuestionnaireItem M:N |
| `ResearchHypothesis` | NULL/ALTERNATIVE hypotheses; status UNTESTED until analysis exists |
| `ResearchVariable` | Variable with role, measurement scale, operational definition, Data Lab column link |
| `ConceptualFramework` / `Node` / `Edge` | Persisted concepts, variables, and relationships |
| `Methodology` / `MethodologySection` | Configurable methodology sections |
| `Questionnaire` / `Section` / `Item` | Instrument with question types, Likert scales, variable mapping |
| `InterviewGuide` / `InterviewQuestion` | Interview sections, probes, objective mapping |
| `Finding` | Statement + analysis/table/chart/dataset/RQ/objective/hypothesis provenance |
| `Conclusion` / `ConclusionFinding` | Conclusions linked to findings |
| `Recommendation` / `RecommendationFinding` | Recommendations linked to findings |
| `AcademicAppendix` | Typed appendices bound to real artifacts |
| `FrontMatter` | Typed front-matter sections (cover, declaration, abstract, etc.) |
| `AcademicAbstract` | Abstract with word limit, generation status, review status |
| `AcademicTableFigure` | Numbered tables/figures linked to Data Lab |
| `AcademicReference` | Formatted reference bound to a Citation |
| `ValidationRun` / `ValidationIssue` | Persisted validation results |
| `EvidenceSectionLink` | Source → Evidence → Document Section provenance |

### Project templates (17 types)

HND Project, HND Research Project, Bachelor's Research Project, Thesis, Dissertation, Research Proposal, Seminar Paper, Internship Report, Industrial Training Report, Project Report, Academic Essay, Case Study, Literature Review, Research Paper, Questionnaire, Interview Guide, Custom.

Templates define chapters, standard sections, front matter, formatting defaults, citation-style defaults, and default requirements. They contain **structural placeholders only** — no generated academic content.

## API

All endpoints under `/api/v1/academic-projects/...`:

- `GET /templates` — list all templates
- `POST /` — create academic project (optionally from template)
- `GET /:id` — get full project with all relations
- `POST /:id/chapters` — create chapter
- `POST /:id/requirements` — create validation requirement
- `POST /:id/objectives` — create objective
- `POST /:id/hypotheses` — create hypothesis
- `POST /:id/variables` — create research variable
- `POST /:id/frameworks` — create conceptual framework
- `POST /:id/methodologies` — create methodology
- `POST /:id/questionnaires` — create questionnaire
- `POST /:id/interview-guides` — create interview guide
- `POST /:id/findings` — create finding with provenance
- `POST /:id/conclusions` — create conclusion linked to findings
- `POST /:id/recommendations` — create recommendation linked to findings
- `POST /:id/appendices` — create appendix bound to real artifacts
- `PUT /:id/front-matter/:kind` — set front matter section
- `PUT /:id/abstract` — set abstract
- `POST /:id/tables-figures` — register numbered table/figure
- `POST /:id/references` — create reference
- `GET /:id/references/formatted` — get formatted references
- `POST /:id/validate` — run validation engine
- `POST /:id/document` — build Document Studio document
- `POST /:id/sync-document` — sync project content to document
- `POST /:id/versions` — create version snapshot
- `POST /:id/versions/:versionId/restore` — restore version
- `GET /:id/export/:format` — export DOCX/PDF/Markdown/HTML/TXT
- `GET /:id/dashboard` — project dashboard with real metrics
- `GET /:id/search?q=...` — project-scoped search
- `POST /:id/ai-draft` — AI-assisted drafting (always AI_GENERATED + NEEDS_REVIEW)

## Validation engine

The validator inspects:

- **Structure**: required chapters present, empty sections
- **Content**: objectives defined, research questions defined, abstract word limit, total word count
- **Reference**: missing citations, uncited references, incomplete references, malformed DOI, duplicates, duplicate sources
- **Data**: findings without provenance, tables without source data, numeric claims without verified values, unbacked hypothesis status
- **Formatting**: formatting profile applied, required front matter, heading hierarchy

Results are persisted as `ValidationRun` + `ValidationIssue` records. Issues can be resolved with a note but project content is never auto-modified.

## AI integration

AI drafts use the existing `AIProvider`/`AIModel` abstraction. Every AI output:

- Is returned with `generationStatus: 'AI_GENERATED'` and `reviewStatus: 'NEEDS_REVIEW'`
- Can never be auto-VERIFIED
- Carries an explicit "do not fabricate citations/results/data" instruction
- Treats all uploaded content as untrusted data

## Export

Academic projects export through the existing Document Studio pipeline:

1. `syncAcademicProjectToDocument()` writes front matter, chapters, findings, tables, references, and appendices into real `DocumentSection` + `DocumentBlock` records with provenance
2. `generateDocx()` / `generatePdf()` / `generateMarkdown()` / `generateHtml()` / `generateTxt()` produce real files
3. DOCX is a valid ZIP-based Office document (PK signature)
4. PDF has a valid `%PDF-` signature

## Security

- Cross-project isolation verified: project B cannot read project A's data
- Prompt-injection text stored as inert data, never executed
- SQL-special characters preserved as literal data (ORM parameterization)
- HTML/script payloads stored as text, not rendered
- No API keys in frontend code
- No secrets in Git

## Testing

- **Unit tests**: templates (12), citation formats (15)
- **Integration/E2E**: full 33-step workflow from template creation through export
- **Security tests**: cross-project isolation, malicious input, prompt injection, path traversal, XSS
- **Total**: 308 tests pass (237 baseline + 71 new)

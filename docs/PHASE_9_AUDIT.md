# Phase 9 Audit — ICON Academic Studio

## Current Architecture Summary

### Database Schema
- **89 Prisma models** across PostgreSQL
- Core entities: Project, AcademicProject, Document, Source, EvidenceItem, Dataset, Analysis, PastPaper, Publication, AIGeneration
- Phase 8 added: AIGeneration, AIConversation, AIEvidenceReference

### API Structure
- Routes under `/api/v1/` for all modules
- Services in `apps/api/src/services/`
- Cross-module references already exist in schema

### Frontend Structure
- Pages: Dashboard, Projects, Research, Documents, DataLab, GCEPastPapers, AcademicStudio, PublishingStudio, AIWorkspace
- Single sidebar navigation (12 items)
- React Router with lazy-loaded components

---

## Existing Capabilities (Already Built)

### What Works
1. ✅ **Project lifecycle states**: DRAFT, IN_PROGRESS, REVIEW, COMPLETED, ARCHIVED
2. ✅ **Academic Project Studio**: Full CRUD with chapters, objectives, methodology, findings
3. ✅ **Research Workspace**: Sources, evidence, citations, notes
4. ✅ **Data Lab**: Dataset upload, analysis, charts
5. ✅ **GCE Intelligence**: Past papers, marking schemes, questions
6. ✅ **Document Studio**: Sections, blocks, versioning
7. ✅ **Publishing Studio**: Publications, chapters, export
8. ✅ **AI Workspace**: Provider abstraction, grounded generation, review lifecycle
9. ✅ **Export system**: DOCX, PDF, Markdown, HTML, TXT generation
10. ✅ **Provider tests**: Deterministic test provider for E2E validation

### Reusable Services
- `documentExport.ts`: Generate DOCX/PDF/Markdown from documents
- `publishing/service.ts`: Sync publication → document
- `ai/generation.ts`: Grounded AI generation with evidence linking
- `academic/service.ts`: Full academic project management

---

## Workflow Gaps Identified

### Gap 1: Dashboard Shows Fake Data
**Current**: Hardcoded stats, no real counts
**Fix**: Connect to real database queries

### Gap 2: No Project Command Center
**Current**: AcademicStudio has tabs but no unified workflow view
**Fix**: Add progress tracking, next actions, materials overview

### Gap 3: Cross-Module References Not Visualized
**Current**: Model relations exist but UI doesn't show connections
**Fix**: Display linked sources, datasets, publications per project

### Gap 4: No Activity History
**Current**: Only has basic timestamps
**Fix**: Log meaningful events (creation, edits, exports, verifications)

### Gap 5: Next Actions Not Deterministic
**Current**: None
**Fix**: Implement rule-based recommendations based on project state

### Gap 6: Navigation Could Be Clearer
**Current**: Flat list of 12 items
**Fix**: Group by workflow stage, highlight current context

### Gap 7: Empty States Inconsistent
**Current**: Mix of generic messages and custom empty states
**Fix**: Standardize helpful empty states with CTAs

---

## Integration Opportunities

### 1. Research → Academic Project
- Existing: `EvidenceItem` links to `ResearchQuestion` and `Source`
- Need: UI to attach research materials to academic chapters
- Action: Add "Attach Research" button in chapter view

### 2. Data Lab → Academic Project
- Existing: `Analysis.findings` has relationship
- Need: Link analysis results to project findings
- Action: Allow selecting dataset → analysis → finding chain

### 3. Academic Project → Document Studio
- Existing: `syncToDocument()` in publishing service
- Need: Better integration point in AcademicStudio
- Action: Add "Sync to Document" with real-time preview

### 4. Academic Project → Publishing
- Existing: Chapter sync creates publication structure
- Need: One-click publication creation from completed project
- Action: Add "Publish" workflow step

### 5. AI → Project Content
- Existing: AI generation stores in `AIGeneration`
- Need: Insert verified content into project sections
- Action: Add "Insert into Chapter" button after verification

---

## Proposed Implementation Order

### Phase 9.1 — Foundation (Week 1)
1. Fix Dashboard with real data
2. Add ActivityLog model and service
3. Create ProjectCommandCenter component

### Phase 9.2 — Workflows (Week 2)
4. Research attachment interface
5. Data Lab linkage interface
6. Document sync improvements
7. Publication creation workflow

### Phase 9.3 — Intelligence (Week 3)
8. Next-action engine (deterministic rules)
9. Project-aware AI context selector
10. Search/discovery improvements

### Phase 9.4 — Polish (Week 4)
11. Consistent empty/loading/error states
12. Navigation refinement
13. Security hardening
14. Documentation updates

---

## Explicitly NOT Needed (Already Exist)

- ❌ Second AI system (Phase 8 exists)
- ❌ Second document engine (DocumentStudio exists)
- ❌ Second publishing system (PublishingStudio exists)
- ❌ Plagiarism detection (out of scope)
- ❌ Social features (not in requirements)
- ❌ Payments/subscriptions (private tool)
- ❌ External databases (PostgreSQL sufficient)
- ❌ Semantic search service (PostgreSQL search sufficient)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing tests | Run regression after each module |
| Scope creep | Strict adherence to audit plan |
| Performance with large projects | Pagination, bounded queries |
| Authorization gaps | Server-side ownership checks |

---

## Phase 9 Scope (Recommended)

### Must Have
1. Fixed Dashboard with real metrics
2. Project Command Center with progress
3. Activity history tracking
4. Next-action recommendation engine
5. Research → Project attachment UI
6. Data Lab → Project linkage UI
7. Document sync improvements
8. Publication workflow from project
9. Search within project context
10. Consistent empty states

### Should Have
- Navigation grouping by workflow
- Basic export status tracking
- Cross-module provenance display

### Nice to Have
- Project templates (partial)
- Collaborative features (limited)

---

*Audit completed: 2026-10-01*

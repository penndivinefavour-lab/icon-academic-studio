# AI Academic Intelligence — Documentation

## Provider Support

| Provider | SDK Required | Environment Variable | Notes |
|----------|--------------|---------------------|-------|
| Gemini | google-genai | GEMINI_API_KEY | Primary provider, recommended |
| OpenAI | openai | OPENAI_API_KEY | OpenAI-compatible endpoints |
| OpenRouter | openai | OPENROUTER_API_KEY | Access to multiple models |
| Ollama | built-in (fetch) | None | Local privacy-preserving option |
| Custom | built-in (fetch) | None | Any OpenAI-compatible endpoint |

## API Endpoints

### AI Generation (`/api/v1/ai`)

```
POST   /ai/generate          - Generate AI content (requires projectId, operation, context)
GET    /ai/generations?projectId=X  - List generations for project
GET    /ai/generations/:id  - Get specific generation
PUT    /ai/generations/:id/review  - Update review status
DELETE /ai/generations/:id  - Delete generation

Review statuses: NEEDS_REVIEW | USER_EDITED | VERIFIED | REJECTED
```

### AI Conversations (`/api/v1/ai/conversations`)

```
POST   /ai/conversations     - Start new conversation
GET    /ai/conversations?projectId=X  - List conversations
GET    /ai/conversations/:id  - Get conversation with messages
POST   /ai/conversations/:id/messages  - Add message and continue
DELETE /ai/conversations/:id  - Delete conversation
```

### Provider Management (`/api/v1/ai/providers`)

```
GET    /ai/providers         - List available providers
POST   /ai/providers         - Add provider
PUT    /ai/providers/:id     - Update provider
PATCH  /ai/providers/:id/toggle  - Activate/deactivate
DELETE /ai/providers/:id     - Delete provider
GET    /ai/providers/:id/models  - List models for provider
POST   /ai/providers/:id/models  - Add model
```

## Operations Catalog

| Category | Operations | Description |
|----------|------------|-------------|
| Research | summarize-source, explain-concept, extract-claims, compare-sources, identify-evidence, generate-research-questions, literature-synthesis | Research assistance |
| Academic Writing | create-outline, draft-section, expand-section, condense-section, rewrite-for-clarity, improve-tone, draft-conclusion, draft-recommendations | Writing assistance |
| Methodology | draft-methodology, draft-objectives, draft-hypotheses, suggest-variables | Research methodology |
| Data Analysis | explain-dataset, explain-result, explain-chart, draft-findings, draft-discussion | Data Lab integration |
| GCE Studies | explain-question, generate-practice, explain-marking, create-revision-notes | Exam paper analysis |
| Publication | draft-chapter, summarize-chapter, create-intro, create-conclusion, explain-glossary-term | Publishing workflow |

## Grounding Mechanism

All AI generations are grounded in actual database records:

- **Research Context**: Loads Sources, EvidenceItems, Citations from database
- **Data Lab Context**: Loads Datasets, Analysis results, Charts with real calculated statistics
- **GCE Context**: Loads ExamBoards, Subjects, Syllabi, PastPapers, Questions, MarkingSchemes, MarkingPoints
- **Publication Context**: Loads Publication data, Chapters, Glossary terms

Source/evidence content is explicitly marked as "untrusted source material" in prompts to prevent fabrication.

## Security Features

1. **Prompt Injection Defense**: `sanitizePrompt()` removes dangerous patterns
2. **Project Isolation**: All queries scoped to `projectId`
3. **API Key Protection**: Keys resolved from relation, never exposed in responses
4. **No Fabrication Guarantee**: Integrity preamble instructs model to cite sources
5. **Review Gate Enforcement**: AI_GENERATED → NEEDS_REVIEW → USER_EDITED → VERIFIED/REJECTED

## Deterministic Test Provider (Phase 8.1.1)

For testing purposes, a deterministic test provider returns fixed academic content:

- Activated via `(globalThis as any).__ICON_AI_TEST_MODE__ = true`
- Maps operation descriptions to predefined responses
- Enables reproducible E2E testing without external API calls
- Response content verified via string matching assertions

## Publishing → Export Integration

The complete AI → Publishing → Document → Export chain is tested:

```typescript
// Example pipeline verification
const generation = await generateAI({ ... });
expect(generation.reviewStatus).toBe('NEEDS_REVIEW'); // Not auto-verified

await updateReviewStatus(generation.id, 'USER_EDITED');
await updateReviewStatus(generation.id, 'VERIFIED');

const publication = await createPublication({ ... });
const chapter = await addChapter(publication.id, { ... });
const docResult = await syncToDocument(publication.id);
const docxBuf = await generateDocx(docResult.documentId);

expect(docxBuf.length).toBeGreaterThan(1000); // Valid DOCX
expect(docxBuf.includes(Buffer.from('word/'))).toBe(true); // ZIP structure
```

## GCE Marking Guidance Integration

Full historical grounding chain verified:

```
ExamBoard → Subject → Syllabus → SyllabusTopic
         → PastPaper → PastPaperQuestion → MarkingScheme → MarkingPoint → AI
```

Key test assertions:
- Historical questions contain real exam board data
- Marking points are loaded from database
- No future exam prediction language is generated
- Prompt includes actual marking guidance text

## Limitations

- No streaming support (synchronous generation only)
- Requires at least one active AI provider for actual generation
- Provider API keys must be configured in Settings → AI Providers
- DOCX export requires JSZip or similar library for XML extraction in tests

---

*Last updated: 2026-10-01 | Phase 8.1.1*

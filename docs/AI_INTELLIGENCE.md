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

### Research
- **summarize-source**: Summarize a research source
- **explain-concept**: Explain an academic concept
- **extract-claims**: Extract key claims from sources
- **compare-sources**: Compare multiple sources
- **identify-evidence**: Identify supporting/conflicting evidence
- **generate-research-questions**: Generate research questions
- **literature-synthesis**: Synthesize literature findings

### Academic Writing
- **create-outline**: Create content outline
- **draft-section**: Draft a section
- **expand-section**: Expand a section
- **condense-section**: Condense a section
- **rewrite-for-clarity**: Rewrite for clarity
- **improve-tone**: Improve academic tone
- **draft-conclusion**: Draft conclusion
- **draft-recommendations**: Draft recommendations

### Methodology
- **draft-methodology**: Draft methodology section
- **draft-objectives**: Draft objectives
- **draft-hypotheses**: Draft hypotheses
- **suggest-variables**: Suggest variables
- **draft-questionnaire**: Draft questionnaire items

### Data Analysis
- **explain-dataset**: Explain dataset characteristics
- **explain-result**: Explain Data Lab result
- **explain-chart**: Explain chart visualization
- **draft-findings**: Draft findings narrative
- **draft-discussion**: Draft discussion based on results

### GCE
- **explain-question**: Explain historical exam question
- **generate-practice**: Generate practice questions
- **explain-marking**: Explain marking scheme
- **create-revision-notes**: Create revision notes
- **create-study-guide**: Create study guide content

### Publication
- **draft-chapter**: Draft publication chapter
- **summarize-chapter**: Summarize chapter
- **create-intro**: Create introductory section
- **create-conclusion**: Create concluding section
- **explain-glossary-term**: Explain glossary term

## Grounding Mechanism

All AI operations receive grounded context:
1. Selected sources/evidence are fetched from database
2. Context is injected into prompt under `GROUNDING CONTEXT:` section
3. Generated output preserves bracketed citations to evidence IDs
4. User reviews citations for accuracy before accepting

## Safety Measures

### Fabrication Prevention
- Integrity preamble states rules explicitly
- Post-generation check flags URLs/DOIs for review
- Empty source context returns "Insufficient evidence" not hallucinated content

### Prompt Injection Defense
- Source text placed in DATA section, not instructions
- Dangerous patterns detected and flagged
- System/user/source content strictly separated

### Academic Integrity
- All outputs start as NEEDS_REVIEW
- Verification is explicit user action only
- Rejected content tracked separately
- Generation history preserved for audit trail

## Database Models

### AIGeneration
```prisma
model AIGeneration {
  id            String   @id @default(cuid())
  projectId     String
  contextType   String?  // RESEARCH | ACADEMIC_PROJECT | PUBLICATION | DATA_LAB | GCE
  contextId     String?
  operation     String
  prompt        String
  response      String?
  status        String   @default("PENDING")
  reviewStatus  String   @default("NEEDS_REVIEW")
  usedProviders String?
  modelUsed     String?
  safetyFlags   String?  // JSON array of flagged concerns
  error         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  project  Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  evidences AIEvidenceReference[]

  @@index([projectId])
  @@index([contextType, contextId])
  @@index([status])
  @@index([reviewStatus])
  @@map("ai_generations")
}
```

### AIConversation
```prisma
model AIConversation {
  id            String   @id @default(cuid())
  projectId     String
  contextType   String?
  contextId     String?
  title         String?
  messages      String   @default("[]")  // JSON array
  aiProviderId  String?
  modelId       String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  project Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  aiProvider AIProvider? @relation(fields: [aiProviderId], references: [id])
  model AIModel?   @relation(fields: [modelId], references: [id])

  @@index([projectId])
  @@map("ai_conversations")
}
```

### AIEvidenceReference
```prisma
model AIEvidenceReference {
  id              String   @id @default(cuid())
  generationId    String
  sourceId        String?
  evidenceItemId  String?
  citationId      String?
  claimText       String
  referencedAt    Int      @default(0)  // position in response
  createdAt       DateTime @default(now())

  generation AIGeneration @relation(fields: [generationId], references: [id], onDelete: Cascade)

  @@index([generationId])
  @@map("ai_evidence_references")
}
```

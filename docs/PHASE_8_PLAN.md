# Phase 8 — AI Academic Intelligence & Assisted Production

## Overview

Phase 8 extends ICON Academic Studio with a provider-agnostic AI assistance layer that supports academic operations across Research Workspace, Document Studio, Data Lab, GCE Intelligence, Academic Project Studio, and Publishing Studio.

The AI system is designed to **assist**, not replace human academic judgment. All AI-generated content starts as `NEEDS_REVIEW` and must be explicitly verified before use.

## Architecture

### Provider Abstraction
- Supports Gemini, OpenAI-compatible, OpenRouter, Ollama, and custom HTTP providers
- Provider secrets stored in `ai_providers` + `api_keys` tables, never exposed in API responses or frontend
- Error handling for missing credentials, provider unavailable, timeout, malformed responses

### AI Domain Model (Phase 8 schema additions)
- **AIGeneration**: Records every AI operation with provenance tracking
- **AIConversation**: Multi-turn academic conversations with context references
- **AIEvidenceReference**: Links generated claims back to source evidence

### Prompt Construction
- Grounded prompts inject selected evidence/context directly into the request
- Integrity preamble prevents fabrication of citations, statistics, sources
- Prompt injection defense filters dangerous patterns before calling providers
- Context separation: SYSTEM INSTRUCTIONS / USER INSTRUCTIONS / SOURCE CONTENT are distinct sections

### Review Workflow
- All AI output starts as `NEEDS_REVIEW`
- User can: ACCEPT (→ USER_EDITED), VERIFY (→ VERIFIED), REJECT (→ REJECTED)
- Verified status persists through publication/export workflows
- Generation history preserved for audit

### Operations Supported
| Category | Operations |
|----------|------------|
| Research | summarize-source, explain-concept, extract-claims, compare-sources, identify-evidence, literature-synthesis |
| Academic Writing | create-outline, draft-section, expand-section, condense-section, rewrite-for-clarity, improve-tone, draft-conclusion, draft-recommendations |
| Methodology | draft-methodology, draft-objectives, draft-hypotheses, suggest-variables |
| Data | explain-dataset, explain-result, explain-chart, draft-findings, draft-discussion |
| GCE | explain-question, generate-practice, explain-marking, create-revision-notes |
| Publication | draft-chapter, summarize-chapter, create-intro, create-conclusion, explain-glossary-term |

## Integration Points

### Research Workspace
- Sources can be selected as context for summarization, claim extraction, evidence identification
- Evidence items are preserved and linked to generated content

### Academic Project Studio
- Chapters and sections can be selected as context for drafting, outlining, condensing
- Generated content flows into existing document structure via sync

### Data Lab
- Dataset IDs and analysis results passed as grounding context
- Statistical explanations use real calculated values only — no fabrication

### GCE Intelligence
- Past paper questions explained using historical data
- Practice questions generated based on syllabus topics
- Marking guidance explained
- No prediction language used (historical analysis only)

### Publishing Studio
- Chapters drafted for publications using templates
- Reviewed content can be inserted into existing publications
- Export pipeline uses existing Document Studio/Publishing mechanisms

## Provider Configuration

To configure a real AI provider:

```bash
# Set environment variable
export GEMINI_API_KEY="your-key-here"

# Or via Prisma Studio / settings UI
# Navigate to Settings > AI Providers > Add Provider
```

Default model for Gemini: `gemini-2.0-flash`
Default model for Ollama: `llama3.2`

No credentials are required for the application to function — when no provider is configured, AI operations return clear error messages explaining the limitation.

## Security

- Provider API keys stored encrypted in database
- Keys never returned in API responses (keyPrefix shown instead)
- Input validation via Zod on all routes
- Project isolation enforced on all AI generation requests
- Context separated from instructions (source text treated as DATA not COMMAND)
- No secret exposure in logs or error responses

## Testing

- 25 AI-specific tests: provider abstraction, generation lifecycle, security, integration
- 433 total tests passing (including all Phase 1–7 baseline)
- Both API and Web builds green

## Known Limitations

- Requires configured AI provider for actual content generation
- Model selection limited to what's configured per-provider
- Streaming not yet implemented for all providers
- Context length limited by provider token limits
- AI outputs always require human review before academic use

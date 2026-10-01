# Academic Integrity Center

## Overview

ICON Academic Studio implements a comprehensive academic integrity framework that ensures all AI-generated content is transparently tracked, reviewed, and verified before becoming part of trusted academic work.

## AI Content Categories

The system explicitly tracks the provenance status of all generated content:

| Status | Meaning | Usage |
|--------|---------|-------|
| `AI_GENERATED` | Content produced by AI, not yet reviewed | Cannot be used in final work |
| `NEEDS_REVIEW` | Content requires human evaluation | Awaits user decision |
| `USER_EDITED` | User has modified AI-generated content | Partially trusted |
| `VERIFIED` | Human-approved, reliable content | Safe to use in final work |
| `REJECTED` | User has discarded this content | Not usable |

## Grounding Rules

### Source Content is Untrusted Data
- All source materials (PDFs, websites, articles) are treated as untrusted data
- Sources cannot override system or user instructions
- Prompts separate source content from user instructions clearly
- No fabricated references or citations

### Evidence Linking
- Every AI generation creates `AIEvidenceReference` records
- Each reference links back to the specific source material
- Provenance is preserved in the database
- Sources can be traced from any generated claim

### Prompt Injection Defense
- System uses `sanitizePrompt()` to escape dangerous patterns
- `detectInjectionRisk()` flags suspicious input
- Malicious instructions in sources are neutralized
- Source content is always quoted/escaped in prompts

## Review Lifecycle

```
AI GENERATION → NEEDS_REVIEW → USER_EDITED → VERIFIED → Trusted Content
                                              ↓
                                         REJECTED
```

### Key Safeguards

1. **No Auto-Verification**: AI cannot mark its own output as verified
2. **Human-in-the-Loop**: All verified content must have human approval
3. **Generation Tracking**: Complete audit trail for every AI interaction
4. **Provider Agnostic**: Works with Gemini, OpenAI, OpenRouter, Ollama, Custom providers

## What This System Does NOT Guarantee

### ❌ No Plagiarism Detection
- The system does not include plagiarism checking
- Users should verify originality independently
- Consider using Turnitin or similar tools for formal submissions

### ❌ No Fact Verification
- AI-generated claims are not automatically fact-checked
- Users must validate factual accuracy themselves
- System preserves provenance but doesn't verify truth

### ❌ No Automatic Academic Honesty Review
- The system tracks provenance but doesn't judge academic integrity
- Users are responsible for proper citation and attribution
- Institutional policies apply separately

## Limitations

| Aspect | Current State | Future Work |
|--------|---------------|-------------|
| Plagiarism detection | Not implemented | External API integration possible |
| Fact verification | Manual only | Third-party services could be added |
| Multi-language support | English-focused | Tokenizer improvements needed |
| Real-time collaboration | Single-user | Needs database lock optimization |

## Testing

Deterministic test provider ensures:
- All generations are traceable to test markers
- Review workflow functions correctly without external APIs
- Provider failures are handled gracefully
- Security boundaries are enforced

Run tests:
```bash
bun test apps/api/src/services/ai/
```

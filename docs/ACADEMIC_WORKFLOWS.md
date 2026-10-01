# Academic Workflows

## Overview

ICON Academic Studio supports a coherent academic production lifecycle that flows through distinct phases:

```
DISCOVER → RESEARCH → PLAN → COLLECT → ANALYZE → WRITE → REVIEW → PUBLISH → EXPORT
```

## Workflow Stages

### 1. DISCOVER
- Define research topic and objectives
- Identify existing sources and gaps
- Set project scope and requirements

**Tracked by**: Project metadata, Research Questions

### 2. RESEARCH
- Upload and organize source materials
- Extract evidence from sources
- Build citation library

**Tracked by**: Source → Evidence → Citation chain

### 3. PLAN
- Define methodology
- Create research questions
- Design data collection instruments

**Tracked by**: Methodology sections, Questionnaires, Interview guides

### 4. COLLECT
- Upload datasets (CSV, XLSX)
- Profile and validate data
- Link to project variables

**Tracked by**: Dataset → Column analysis → Variables

### 5. ANALYZE
- Perform statistical tests
- Generate charts and visualizations
- Link results to hypotheses

**Tracked by**: Analysis → Findings → Hypothesis testing

### 6. WRITE
- Create project chapters
- Synthesize findings into narrative
- Format references and citations

**Tracked by**: Academic chapters → Document sections

### 7. REVIEW
- AI-generated content requires review
- User edits and verifies content
- Track provenance status

**Tracked by**: AIGeneration.reviewStatus

### 8. PUBLISH
- Sync to Publishing Studio
- Create publication structure
- Prepare for export

**Tracked by**: Publication → Export artifacts

### 9. EXPORT
- Generate final documents (DOCX, PDF, etc.)
- Archive project state
- Create version snapshots

**Tracked by**: Export artifacts, Document versions

## Cross-Module Integration

### Research → Academic Project
```
Source → Evidence → Research Question → Objective → Chapter
```

### Data Lab → Academic Project
```
Dataset → Analysis → Finding → Hypothesis Test → Conclusion
```

### Academic Project → Document Studio
```
Academic Chapter ↔ Document Section (bi-directional sync)
```

### Academic Project → Publishing
```
Complete Project → Publication → Export Artifact
```

### AI → Review → Verified Content
```
AI Generation → NEEDS_REVIEW → USER_EDITED → VERIFIED → Project Content
```

## Next Action Engine

The deterministic next-action engine analyzes project state and recommends the most appropriate next step:

| Current State | Recommended Action | Category |
|---------------|-------------------|----------|
| No objectives | Define Research Objectives | research |
| No methodology | Add Research Methodology | methodology |
| Chapters exist, no findings | Create Research Findings | data |
| Findings exist, no conclusions | Write Conclusions | writing |
| All sections complete | Prepare for Review | review |
| Publication exists | Export Final Document | publishing |

## Activity Tracking

All meaningful project events are logged:

- `PROJECT_CREATED` - New academic project initialized
- `CHAPTER_CREATED` - New chapter added to project
- `SOURCE_ATTACHED` - Research source linked to project
- `AI_GENERATED` - AI-assisted content created
- `CONTENT_VERIFIED` - AI content reviewed and approved
- `DOCUMENT_SYNCED` - Project synced to Document Studio
- `EXPORT_CREATED` - Final export generated

View activity via API:
```bash
GET /api/v1/activities/project/:projectId
```

## Best Practices

1. **Start with objectives** - Define what you want to achieve before collecting data
2. **Link evidence early** - Connect sources to research questions as you find them
3. **Review AI content** - Never accept AI output without human verification
4. **Sync regularly** - Keep chapters synchronized with your document
5. **Version exports** - Create snapshots before major changes

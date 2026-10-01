# Project Command Center

## Purpose

The Project Command Center provides a unified workflow view for academic projects, connecting all modules into a coherent production environment.

## Components

### Progress Overview
- Real-time completion percentage based on actual project state
- Visual workflow pipeline showing completed/active stages
- Project material counts (sources, datasets, documents, publications)

### Next Action Engine
- Deterministic recommendations based on project state
- NO AI predictions — explicit rule-based logic
- Explainable reasoning for each recommendation

### Activity Feed
- Chronological list of project events
- Filterable by entity type
- Persists across sessions

## API Endpoints

### Get Project Activity
```
GET /api/v1/activities/project/:projectId?limit=20&offset=0
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "action": "PROJECT_CREATED",
      "entityType": "AcademicProject",
      "entityId": "uuid",
      "changes": null,
      "createdAt": "2026-10-01T10:00:00Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "totalPages": 3
  }
}
```

### Get Next Action
```
GET /api/v1/activities/project/:projectId/next-action
```

Response:
```json
{
  "success": true,
  "data": {
    "action": "Define Research Objectives",
    "description": "No research objectives have been defined yet.",
    "reason": "Objectives form the foundation of your research project.",
    "category": "research"
  }
}
```

## Frontend Component

Use `<ProjectCommandCenter projectId="..." />` in your React components.

Props:
- `projectId`: String — The project ID to display

Features:
- Responsive grid layout
- Real-time data fetching
- Empty states with guidance
- Loading indicators
- Error handling

## Future Enhancements

- [ ] Drag-and-drop material attachment
- [ ] Inline activity editing
- [ ] Export activity log as report
- [ ] Notification preferences

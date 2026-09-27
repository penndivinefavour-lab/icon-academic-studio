# ICON Academic Studio API Documentation

## Base URL

```
http://localhost:4000/api/v1
```

## Health Check

### GET /health

Returns the health status of the API.

**Response:**
```json
{
  "status": "ok",
  "service": "icon-academic-studio-api",
  "version": "0.1.0",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

---

## Projects

### GET /projects

List all projects with pagination.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `type` (string, optional): Filter by project type
- `status` (string, optional): Filter by status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx123",
      "name": "GCE Mathematics Study Guide",
      "description": "Comprehensive study guide for WASSCE Mathematics",
      "type": "GCE_STUDY_GUIDE",
      "status": "IN_PROGRESS",
      "settings": {
        "citationStyle": "APA"
      },
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### POST /projects

Create a new project.

**Request Body:**
```json
{
  "name": "Project Name",
  "description": "Optional description",
  "type": "RESEARCH_PROJECT",
  "workspaceId": "optional-workspace-id",
  "settings": {
    "citationStyle": "APA"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx123",
    "name": "Project Name",
    "type": "RESEARCH_PROJECT",
    "status": "DRAFT",
    ...
  }
}
```

### GET /projects/:id

Get a specific project by ID.

### PATCH /projects/:id

Update a project.

**Request Body (all fields optional):**
```json
{
  "name": "Updated Name",
  "status": "IN_PROGRESS",
  "settings": {}
}
```

### DELETE /projects/:id

Delete a project.

---

## Sources

### GET /sources

List sources for a project.

**Query Parameters:**
- `projectId` (required): Project ID
- `type` (optional): Source type filter

### POST /sources

Create a new source entry.

---

## Documents

### GET /documents

List documents for a project.

### POST /documents

Create a new document.

---

## Datasets

### GET /datasets

List datasets for a project.

### POST /datasets

Create a new dataset entry.

---

## AI Providers

### GET /ai/providers

List configured AI providers.

### POST /ai/providers

Create a new AI provider configuration.

---

## Templates

### GET /templates

List available templates.

### POST /templates

Create a new template.

---

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {}
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": []
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| VALIDATION_ERROR | Request validation failed |
| NOT_FOUND | Resource not found |
| INTERNAL_ERROR | Server error |
| UNAUTHORIZED | Authentication required |
| FORBIDDEN | Insufficient permissions |

## Status Values

### Project Status
- `DRAFT` - Initial state
- `IN_PROGRESS` - Work in progress
- `REVIEW` - Under review
- `COMPLETED` - Finished
- `ARCHIVED` - Archived

### Document Status
- `DRAFT` - Being written
- `REVIEW` - Under review
- `EDITED` - Revised
- `PROOF` - Final proofreading
- `TYPESET` - Formatted
- `FINAL` - Ready for export

### Job Status
- `PENDING` - Queued
- `RUNNING` - In progress
- `COMPLETED` - Done
- `FAILED` - Error occurred
- `CANCELLED` - Cancelled by user

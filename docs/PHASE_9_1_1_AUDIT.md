# Phase 9.1.1 Audit — Security Model Correction & Final Acceptance Pass

## Executive Summary

Phase 9.1 incorrectly described project-existence checking as "authentication" and "authorization." This phase corrects that terminology, hardens the activity API within the current local-first architecture, and adds comprehensive security tests.

---

## 1. Security Architecture Audit

### 1.1 Is the application single-user/local-first?

**YES.** The application is a local-first workstation tool with the following characteristics:

- No authentication middleware exists in `apps/api/src/middleware/` (only `errorHandler.ts` and `requestLogger.ts`)
- No JWT, session tokens, or OAuth handling anywhere in the codebase
- Routes accept requests without any identity verification
- The frontend (`ActivityTab.tsx`, `AcademicStudio.tsx`) runs locally and calls the API directly

### 1.2 Does the architecture have user sessions, JWTs, accounts, or authenticated identities?

**NO — with one caveat:**

- The Prisma schema **does** define a `User` model with `email`, `passwordHash`, `role`, `isActive` fields
- The Prisma schema **does** define a `Workspace` model with an `ownerId` field referencing `User.id`
- However, **no route or service uses these models for authentication**
- No login endpoint exists
- No token generation or validation exists
- No session management exists

The `User` and `Workspace` models are present in the schema but unused by the current API implementation. They appear to be scaffolding for future multi-user features.

### 1.3 Can the API distinguish User A from User B?

**NO.** The API cannot distinguish between users because:

1. There is no authentication mechanism
2. The `userId` field in `AuditLog` is nullable and rarely set (set to `null` in current usage)
3. Routes like `activities.ts` explicitly do NOT trust client-supplied `userId`:
   ```typescript
   // Log with server-derived metadata, NOT client-supplied userId
   const event = await logActivity({
     action,
     entityType: entityType as any,
     entityId,
     changes,
     ipAddress: req.ip || undefined,
     userAgent: req.headers['user-agent'] || undefined,
   });
   ```

### 1.4 Is `projectId` currently an identity/authentication credential?

**NO — but it functions as the only access control mechanism.**

Project existence checking (`findUnique({ where: { id: projectId } })`) is **NOT** authentication. It is simply a query that verifies a record exists before performing an operation. Anyone who knows a valid project ID can access that project's data.

### 1.5 What happens if an untrusted caller knows a valid project ID?

An untrusted caller who:
- Has network access to the API (port 3000 or whatever port the API runs on)
- Knows a valid `projectId`

Can:
- Read all activity for that project
- Log new activities
- Get next-action recommendations
- Access other endpoints that use the same pattern (e.g., AI generation)

The application provides **no protection** against unauthorized access beyond project-scoped queries.

### 1.6 Are there any existing network exposure assumptions?

**Yes — the application assumes the local workstation boundary is trusted:**

- The API runs on localhost by default
- There is no rate limiting middleware
- There is no CORS configuration for production use
- Error responses in development leak stack traces:
  ```typescript
  ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  ```

### 1.7 What security guarantees are genuinely implemented?

| Guarantee | Status | Evidence |
|-----------|--------|----------|
| Project-scoped query isolation | ✅ Implemented | All activity queries use `WHERE projectId = ?` |
| Server-side project existence check | ✅ Implemented | `findUnique` returns null for non-existent IDs |
| Response data minimization | ✅ Implemented | Selected fields exclude `userId`, `changes`, `ipAddress`, `userAgent` |
| Input validation (projectId format) | ✅ Partial | String type check, but no length/CUID validation |
| Pagination bounds | ✅ Partial | `limit` defaults to 20, but no maximum enforced |
| Client userId not trusted | ✅ Implemented | Routes do not accept `userId` from request body |

### 1.8 What security guarantees are NOT implemented?

| Missing Guarantee | Impact |
|-------------------|--------|
| User authentication | Anyone with project ID can access data |
| Authorization/ownership checks | No verification that caller "owns" the project |
| Rate limiting | Potential for abuse if API is exposed |
| CORS protection | Not configured for production |
| Request signing/hmac | No way to verify request origin |
| Audit log integrity | Logs can be written by any caller with projectId |

---

## 2. Terminology Corrections

### 2.1 What Phase 9.1 Got Wrong

| Incorrect Term | Actual Meaning |
|----------------|----------------|
| "Authentication" | Project existence check only |
| "Authorization" | Project existence check only |
| "User-level access control" | Does not exist |
| "Multi-user authorization" | Does not exist |

### 2.2 Correct Terminology

**Authentication** = Proving who the requester is (e.g., via password, JWT, OAuth)
- **Status**: NOT IMPLEMENTED

**Authorization** = Determining what an authenticated user can access
- **Status**: NOT IMPLEMENTED (requires authentication first)

**Project existence validation** = Confirming that the requested project ID exists in the database
- **Status**: IMPLEMENTED
- **Purpose**: Prevents access to non-existent projects
- **Limitation**: Does not verify who is making the request

---

## 3. Current Security Model (Accurate Description)

```
┌─────────────────────────────────────────────────────────┐
│                 TRUSTED BOUNDARY                         │
│              (Local Workstation)                          │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │   Frontend   │◄──►│     API      │                   │
│  │  (React)     │    │ (Express)    │                   │
│  └──────────────┘    └──────────────┘                   │
│       │                    │                            │
│       │   Trusted          │   Trusted                   │
│       ▼                    ▼                            │
│  ┌──────────────────────────────┐                       │
│  │      PostgreSQL Database     │                       │
│  │  (Projects, AuditLogs, etc.) │                       │
│  └──────────────────────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### Security Boundaries

1. **Network Boundary**: API expected to run on localhost only
2. **Process Boundary**: Frontend and API run in the same process/session
3. **Data Boundary**: Project-scoped queries prevent cross-project leakage

### What This Protects Against

- Accidental cross-project activity retrieval
- Invalid project references
- Malformed pagination/filter input
- Sensitive activity metadata exposure (userId, changes, IP, userAgent)
- Accidental response overexposure

### What This Does NOT Protect Against

- An untrusted remote caller who can directly access the API
- User-level identity impersonation
- Multi-user authorization
- Remote account-level access control
- Denial of service (no rate limiting)

---

## 4. Hardening Changes Made

### 4.1 Activity Service (`activity.ts`)

**Added:**
- Server-side `projectId` validation (CUID format check)
- Input sanitization for `entityType` filter (whitelist validation)
- Maximum pagination limit enforcement (cap at 100)
- Minimum pagination validation (reject negative values)

**Preserved:**
- Existing response schema (no breaking changes)
- Data minimization (excluded sensitive fields)
- Cross-project isolation via database WHERE clause

### 4.2 Activity Routes (`activities.ts`)

**Added:**
- Strict `limit` parameter validation (1-100 range)
- Strict `offset` parameter validation (non-negative integer)
- Entity type whitelist validation
- Improved error handling (no stack trace leakage in production)

### 4.3 Tests (`phase9-1-security.test.ts`)

**Expanded test coverage to include:**
- Negative pagination rejection
- Maximum page size enforcement
- Entity type whitelist validation
- Response schema strictness (no unexpected fields)
- Input injection attempts (userId, ownership, etc.)

---

## 5. Threat Model

### Trusted Boundary
Local workstation / application process.

### Current Identity Model
No authenticated user identity exists. The `User` model is defined in the schema but not used for authentication.

### Current Access Model
Project existence and project-scoped querying. Access is granted based on knowledge of the project ID.

### Attack Surface
The primary attack vector is direct API access by anyone who:
1. Can reach the API endpoint (network access)
2. Knows a valid project ID

### Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Unauthorized data access | Medium (if exposed) | Low (local data) | Local-first assumption |
| Data leakage via API | Low | Low | Data minimization in place |
| SQL injection | Very Low | High | Prisma ORM parameterized queries |
| DoS via pagination | Low | Low | Pagination bounds enforced |

---

## 6. Files Modified

### Modified
- `apps/api/src/services/project/activity.ts` — Added input validation, pagination bounds
- `apps/api/src/routes/activities.ts` — Added strict parameter validation
- `apps/api/src/services/project/phase9-1-security.test.ts` — Expanded test coverage

### Created
- `docs/PHASE_9_1_1_AUDIT.md` — This audit document

### Documentation Updated
- `docs/PHASE_9_1_AUDIT.md` — Corrected terminology
- `README.md` — Accurate security description

---

## 7. Compliance Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Authentication accurately described | ✅ | Documented as NOT implemented |
| Project existence ≠ authentication | ✅ | Explicitly stated in docs |
| No fake authentication introduced | ✅ | Only local-first model documented |
| Project-scoped isolation verified | ✅ | Tests confirm cross-project safety |
| Sensitive response fields excluded | ✅ | userId, changes, IP, userAgent excluded |
| Pagination validated and bounded | ✅ | Range 1-100, offset >= 0 |
| Threat model documented | ✅ | Honest assessment in this doc |
| No client-supplied identity trusted | ✅ | Route code verified |

---

*Audit completed: 2026-10-01*
*Commit: [to be populated on push]*

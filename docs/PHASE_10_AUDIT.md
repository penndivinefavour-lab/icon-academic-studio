# Phase 10 Audit — Android Companion

## Executive Summary

Phase 10 adds a mobile companion to ICON Academic Studio. This audit was completed **before any implementation**, per the phase brief, and determines what the backend can safely support, which APIs must never be exposed, and what belongs in Phase 10 versus later phases.

---

## 1. Current Backend Capabilities

### API Surface (all under `/api/v1`)

| Module | Base route | Read endpoints relevant to mobile |
|--------|-----------|----------------------------------|
| Health | `/api/health` | `GET /api/health` |
| Projects | `/projects` | `GET /` (list+counts), `GET /:id` (detail+counts) |
| Academic Projects | `/academic-projects` | `GET /templates`, `GET /?projectId=`, `GET /:id`, `GET /:id/dashboard`, `GET /:id/search` |
| Activity | `/activities` | `GET /project/:projectId`, `GET /project/:projectId/next-action` |
| Research | `/research` | `GET /notes?projectId=`, `GET /questions?projectId=`, `GET /search` |
| Documents | `/documents` | Document metadata + export endpoints |
| Publishing | `/publishing` | Publications list/detail |
| Data Lab | `/data-lab` | Dataset profiling/analysis (heavy) |
| GCE | `/gce` | Past papers, syllabi, question bank |
| AI | `/ai` | Generation, review workflow |

### Services already implemented

- `getProjectActivity()` — project-scoped activity with pagination, data minimization, entity-type whitelist, pagination bounds (limit 1–100, offset ≥ 0) — hardened in Phase 9.1.1
- `getNextAction()` — **deterministic** rule-based next-action engine (no AI). The API is authoritative; mobile must never recompute this.
- `svc.getProjectDashboard()` — real completion %, word count, counts, unresolved review items
- `logActivity()` — writes `AuditLog` with server-derived metadata only (no client-supplied `userId`)

### Database

- 89 Prisma models, PostgreSQL (dev uses SQLite `dev.db` via `DATABASE_URL="file:./dev.db"`)
- `AuditLog`: `id, userId?, action, entityType, entityId?, changes?, ipAddress?, userAgent?, createdAt` — sensitive fields (`userId`, `changes`, `ipAddress`, `userAgent`) are excluded from activity responses by the service `select`

### Shared types

`packages/shared/src/index.ts` exports canonical TypeScript domain types (`Project`, `ProjectType`, `ProjectStatus`, `Source`, `CitationStyle`, …) consumed by both `apps/api` and `apps/web`. The Android app reuses these concepts by mirroring them in Kotlin.

---

## 2. APIs That Can Safely Support Mobile

Safe = read-only, project-scoped, already returns minimized data, and carries no credentials.

| Endpoint | Why safe |
|----------|----------|
| `GET /api/health` | No data, ideal connection probe |
| `GET /api/v1/projects` (`?page&limit&type&status`) | List with pagination and counts |
| `GET /api/v1/projects/:id` | Project detail with material counts |
| `GET /api/v1/academic-projects/:id/dashboard` | Real progress/counts for Command Center |
| `GET /api/v1/activities/project/:projectId` | Hardened in 9.1.1: minimized response, bounded pagination, entity whitelist, cross-project isolation |
| `GET /api/v1/activities/project/:projectId/next-action` | Deterministic, no AI |
| `GET /api/v1/research/notes?projectId=` | Project-scoped notes (capture target) |
| `GET /api/v1/academic-projects/:id` | Academic project detail |

Write endpoints usable for capture, with validation:
- `POST /api/v1/research/notes` — requires `projectId` + `title`; body validated in route
- `POST /api/v1/activities` — logs events with server-derived metadata only

---

## 3. APIs That Must NOT Be Exposed to Arbitrary Networks

Phase 9.1.1 established there is **no authentication and no authorization**. `projectId` is not a credential. Therefore the following must never be reachable from an untrusted network, and Phase 10 does not change that:

- `POST /api/v1/ai/generate` and all AI generation paths — provider credentials live server-side; exposing the route exposes paid capability to anyone on the network
- `POST /api/v1/academic-projects/:id/ai-draft` — same reason
- All write/export endpoints (`PATCH /projects/:id`, `DELETE /projects/:id`, `/sync-document`, `/versions/*/restore`, `/export/:format`) — destructive or cost-incurring
- `GET /api/v1/ai/providers` and provider config routes — risk leaking provider configuration metadata
- Data Lab ingestion and GCE ingestion endpoints — heavy, unbounded work

**Rule: Phase 10 connects only over a user-configured trusted local network. No public exposure, no cloud hosting, no port forwarding, no LAN auto-discovery that auto-connects.**

---

## 4. Existing Android / Mobile Assets

**None.** A repository-wide search for `*.kt`, `*.gradle`, `*.gradle.kts`, `AndroidManifest.xml`, and `*.apk` returned zero results. `apps/` contains only `api/` and `web/`. No React Native, Flutter, Capacitor, or Cordova tooling exists either.

Phase 10 therefore builds the Android project from scratch under a new `apps/android/` workspace.

### Build environment verified

| Tool | Status |
|------|--------|
| JDK | Temurin 21.0.12.1, `JAVA_HOME` set |
| Android SDK | `C:\androidsdk`, `ANDROID_HOME`/`ANDROID_SDK_ROOT` set |
| Platforms | `android-34`, `android-35` |
| Build-tools | `34.0.0`, `35.0.0` |
| cmdline-tools | `12.0` (`sdkmanager.bat`, `lint.bat`, `avdmanager.bat`) |
| platform-tools | `adb 34.0.5` |
| Licenses | Accepted (`android-sdk-license` etc.) |
| Gradle / Kotlin standalone | Not installed globally — will use Gradle Wrapper |

**Decision: target `compileSdk = 34`, `minSdk = 26`, and use the Gradle wrapper so the build is reproducible without a system Gradle install.**

---

## 5. Existing Shared TypeScript / Domain Models

Canonical types in `packages/shared/src/index.ts`:

```ts
ProjectType        // 19 literal values (gce-study-guide … custom)
ProjectStatus      // 'draft' | 'in-progress' | 'review' | 'completed' | 'archived'
Project            // id, name, description?, type, settings, status, timestamps
CitationStyle      // apa | mla | chicago | harvard | ieee | gbt7714 | custom
Source / SourceMetadata / SourceChunk
```

The web app's brand tokens (`apps/web/tailwind.config.js`) define the ICON palette reused on Android:

```
brand.navy     #1A2744   structural elements, headers, navigation
brand.purple   #6B21A8   primary actions, accents
brand.gold     #F5C518   highlights, warnings
brand.charcoal #1E1E2E   dark backgrounds
brand.white    #FFFFFF
primary.600    #6B21A8   ICON Rich Purple (primary scale root)
fontFamily     Poppins / Inter / system-ui
```

---

## 6. Recommended Android Architecture

```
UI (Jetpack Compose)  →  ViewModel (StateFlow)  →  Repository  →  { RemoteDataSource (Retrofit), LocalDataSource (Room) }
```

- **Kotlin + Jetpack Compose**, single-activity, portrait-first
- **MVVM** with `ViewModel` + `StateFlow`/`UiState`; networking never touches composables
- **Repository pattern** with `RemoteDataSource` (Retrofit + OkHttp) and `LocalDataSource` (Room) so offline behaviour is a first-class path, not an error handler
- **Room** for local persistence: projects, activity, next-action snapshots, capture outbox, connection config
- **WorkManager** for the sync outbox (reliable retries, respect for constraints)
- **DataStore (Preferences)** for connection settings (base URL) — not `SharedPreferences`
- **Hilt** is intentionally avoided to keep the dependency set small and the build reproducible; manual `ServiceLocator`/`AppContainer` is sufficient at this scale

---

## 7. Offline Requirements

The companion must stay useful when the workstation is unreachable.

**Cached locally (Room):**
- Recently viewed projects and their summaries
- Project dashboard/progress snapshots
- Activity pages already fetched
- Last next-action result (labelled **stale/cached** when shown offline)
- All captured items (notes/ideas/tasks/questions) — never silently dropped
- Connection configuration

**Rules:**
- Every screen renders from the local cache first when present; network refresh is best-effort
- Offline data is clearly labelled (badge: `Offline — cached`), never presented as fresh
- Next action is never invented locally; when offline the last cached value is shown with a "cached" label
- Capture works fully offline — items land in Room immediately with `PENDING_SYNC` status

---

## 8. Synchronization Requirements

Simple deterministic outbox — not a distributed sync engine.

- Local captured items get client-generated IDs (`UUID`) created on capture
- Sync state per item: `SYNCED` / `PENDING_SYNC` / `SYNC_FAILED`
- On successful POST, mark `SYNCED` and record the server ID
- On failure, remain `PENDING_SYNC` (retryable) or become `SYNC_FAILED` after repeated failures
- **Idempotency / duplicate prevention:** the server endpoint accepts an optional `clientId`; a replayed submission returns the original record instead of creating a duplicate
- Retries are safe because POST is idempotent-by-`clientId`
- No conflict resolution engine: captured items are append-only, so nothing is ever overwritten silently

---

## 9. Security Constraints (carried from Phase 9.1.1)

1. **No authentication exists** — do not fake any. No invented users, no hardcoded user IDs, no trusted `x-user-id`, no client-side ownership claims.
2. **Never ship provider credentials** (Gemini/OpenAI/OpenRouter/Ollama keys) in the APK.
3. The app connects only to a **user-configured base URL** on a trusted local network. No hardcoded IPs, no auto-scanning, no cloud.
4. Use **HTTPS where available**; clearly warn when connecting to plain `http://` (typical for local dev).
5. Never trust client-supplied authorization metadata; the API validates everything server-side.
6. No sensitive academic content or credentials in logs. Release builds strip debug logging.
7. Error surfaces show safe messages, never stack traces.
8. Local storage of connection config uses DataStore (no secrets beyond a host:port string, which is not sensitive).

---

## 10. What Belongs in Phase 10 vs Future Phases

### In Phase 10
- Android project scaffold (Gradle wrapper, `compileSdk 34`, `minSdk 26`)
- Home/Dashboard, Projects list+detail, Mobile Command Center, Activity timeline, Next Action, Quick Capture, Settings/connection management
- Offline Room cache + WorkManager sync outbox
- Small, validated server addition: idempotency support for note creation (`clientId`) — reuses `ResearchNote`, **no new model**
- Deterministic tests: API (validation, isolation, idempotency) + Android unit tests (parsing, offline state, sync queue)
- `PHASE_10_AUDIT.md`, `PHASE_10_ARCHITECTURE.md`, `ANDROID_COMPANION.md`, README update

### Explicitly out of scope
- Public cloud deployment, SaaS accounts, subscriptions, payments
- Full mobile Document Studio / Data Lab / Publishing Studio
- New AI providers or speculative AI features; AI review is read-only and never auto-verifies
- Authentication platform, remote collaboration, chat, social, blockchain
- Notification infrastructure beyond what the companion's own workflow needs

---

## 11. Key Risks

| Risk | Mitigation |
|------|-----------|
| Turning local-first API into a public API | User-configured URL only; documented trusted-network assumption |
| Silent data loss of offline captures | Room write before network; outbox retries until `SYNCED` |
| Fake security | No auth layer invented; boundary documented honestly |
| Build unreproducibility | Gradle wrapper, pinned versions, `compileSdk 34` matching installed SDK |
| Scope creep | Audit-approved scope only (Section 10) |

---

*Audit completed: 2026-10-01*
*Starting commit: `ab08ca0`*

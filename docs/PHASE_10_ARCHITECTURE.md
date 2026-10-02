# Phase 10 Architecture — Android Companion

## Decision: Option A — Local / Trusted Network Companion

After evaluating the three options in the phase brief:

| Option | Verdict |
|--------|---------|
| **A — Local/Trusted network companion** | **CHOSEN.** Reuses existing read APIs as-is; no new trust boundary created |
| B — Local export/import (file transfer) | Rejected as primary: no ongoing workflow visibility; useful only as a future fallback |
| C — Companion-specific authenticated bridge | Rejected: Phase 9.1.1 proves **no authentication foundation exists**. Building a bridge would mean inventing an auth platform — explicitly forbidden |

Option A is the simplest architecture that delivers useful mobile functionality **without weakening the security model established in Phase 9.1.1**.

---

## 1. Connection Model

```
┌────────────────────────────┐         ┌──────────────────────────────┐
│  Android Companion         │         │  Workstation (trusted LAN)   │
│  apps/android              │         │                              │
│                            │  HTTP   │  Express API  (PORT 4000)    │
│  Retrofit + OkHttp ────────┼────────►│  /api/v1/*                   │
│   (user-configured URL)    │         │      │                       │
│                            │         │      ▼                       │
│  Room cache (offline)      │         │  PostgreSQL / SQLite dev.db  │
└────────────────────────────┘         └──────────────────────────────┘
```

### Rules

1. **The base URL is entered by the user** in Settings (e.g. `http://192.168.1.20:4000`). Nothing is hardcoded, no developer IP, no auto-discovery that silently connects.
2. **The app never claims internet/cloud sync.** UI text says "Studio API" and "trusted network".
3. **Connection test** runs `GET /api/health` with a short timeout; result drives the status badge.
4. **Fail safe:** unreachable API → offline mode with cached data, never a crash or a fake "synced" state.
5. **Plain HTTP warning:** if the configured URL is `http://`, the app shows a persistent notice that traffic to a local dev endpoint is unencrypted. HTTPS is used automatically when the URL is `https://`.
6. **Security boundary is unchanged:** Phase 10 adds zero new network exposure. The user deliberately points the app at their own workstation on their own trusted network.

---

## 2. Layered Architecture

```
┌──────────────────────────────────────────────────────────┐
│  UI — Jetpack Compose (Home, Projects, CommandCenter,     │
│       Activity, Capture, Settings)                        │
└───────────────▲───────────────────────────▲──────────────┘
                │ UiState (StateFlow)        │ events
┌───────────────┴───────────────────────────┴──────────────┐
│  ViewModel layer (androidx.lifecycle.ViewModel)           │
└───────────────▲──────────────────────────────────────────┘
                │ suspend calls
┌───────────────┴──────────────────────────────────────────┐
│  Repository (single source of truth per feature)          │
│   ├─ RemoteDataSource  → Retrofit (ApiService)            │
│   └─ LocalDataSource   → Room DAOs                        │
└──────────────────┬────────────────────────┬──────────────┘
                   │                        │
        ┌──────────▼─────────┐    ┌─────────▼──────────┐
        │  WorkManager        │    │  DataStore          │
        │  (sync outbox)      │    │  (connection config)│
        └────────────────────┘    └─────────────────────┘
```

Networking is never called from composables; every screen goes UI → ViewModel → Repository → DataSource.

---

## 3. Data Flow

### Read (e.g. Activity timeline)
1. ViewModel calls `activityRepository.getActivity(projectId, page, refresh)`
2. Repository returns Room flow immediately (cache-first)
3. If connected, Repository also calls `GET /api/v1/activities/project/:projectId` and **replaces** the cached page
4. UI shows cached content with a freshness/sync badge

### Capture (offline-first)
1. User writes note → UI → ViewModel → `captureRepository.capture(item)`
2. Repository **writes to Room immediately** with `syncState = PENDING_SYNC` and a UUID `clientId`
3. UI returns instantly; the item is durably stored
4. WorkManager picks up pending items and POSTs them when connectivity to the Studio API exists
5. On 2xx → `syncState = SYNCED`, store `serverId`. On repeated failure → `SYNC_FAILED` (still retryable, never deleted)

---

## 4. Synchronization Model

Append-only outbox. Simple, deterministic, no conflict engine.

```
capture ──► Room (PENDING_SYNC, clientId=UUID)
              │
              ▼  WorkManager constraint: connected to Studio API
        POST /api/v1/research/notes  { ..., clientId }
              │
      ┌───────┴────────┐
      ▼                ▼
   2xx → SYNCED     failure → retry (backoff)
                     exhausted → SYNC_FAILED (manual retry available)
```

**Idempotency contract (server side):** `POST /api/v1/research/notes` accepts an optional `clientId`. The service looks up an existing `ResearchNote` by `(projectId, clientId)` first; if found, it returns that record instead of inserting a duplicate. This makes retries safe.

**Duplicate prevention is the only place the client influences server identity, and it is strictly additive/append-only — it never grants access to other data.**

### Sync states surfaced in UI
| State | Meaning |
|-------|---------|
| `SYNCED` | Acknowledged by Studio API |
| `PENDING_SYNC` | Queued, will be sent when connected |
| `SYNC_FAILED` | Tried repeatedly; user can retry manually |

Nothing is ever silently dropped or overwritten.

---

## 5. API Dependencies (Phase 10 uses only these)

| Purpose | Endpoint | Notes |
|---------|----------|-------|
| Connection probe | `GET /api/health` | No auth, lightweight |
| Project list | `GET /api/v1/projects` | `?page&limit&type&status` |
| Project detail | `GET /api/v1/projects/:id` | Includes material counts |
| Academic dashboard | `GET /api/v1/academic-projects/:id/dashboard` | Real progress for Command Center |
| Activity | `GET /api/v1/activities/project/:projectId` | Bounded pagination, minimized response |
| Next action | `GET /api/v1/activities/project/:projectId/next-action` | Deterministic; API authoritative |
| Capture | `POST /api/v1/research/notes` | **Modified in Phase 10**: adds optional `clientId` for idempotency |

No other endpoints are called. AI, Data Lab, GCE ingestion, publishing, and document editing are deliberately not used by the companion.

---

## 6. Offline Storage Schema (Room)

| Entity | Purpose |
|--------|---------|
| `ProjectEntity` | Cached project list/detail + counts |
| `ActivityEntity` | Cached activity events (no sensitive fields stored) |
| `NextActionEntity` | Last known next-action per project, with `cachedAt` |
| `CaptureEntity` | Local captures with `clientId`, `syncState`, `serverId?` |
| `ConnectionConfig` | Base URL + last-known reachability |

`NextActionEntity` carries `cachedAt` so the UI can label stale results explicitly.

---

## 7. Security Posture

- No provider credentials, API keys, or secrets anywhere in the app or its build files
- No authentication is implemented, faked, or implied
- Client never supplies authorization metadata; it only supplies its own `clientId` for dedup
- `usesCleartextTraffic` is enabled **only for local trusted hosts** via network security config (needed for `http://` LAN dev endpoints), and the UI warns when in use
- Debug logging is compiled out of release builds; no academic content or credentials are logged
- Error UI shows safe messages; stack traces never reach the user
- Room stores only data the API already returns in minimized form

---

## 8. Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Language | Kotlin | Matches ecosystem expectations; null-safety helps with API parsing |
| UI | Jetpack Compose | Modern, declarative, less boilerplate for a small app |
| Architecture | MVVM + Repository | Keeps networking out of UI; testable |
| Networking | Retrofit 2 + OkHttp + Kotlinx Serialization | Mature, simple, coroutines-friendly |
| Persistence | Room | Compile-time SQL validation, observable queries |
| Background sync | WorkManager | Respectful of constraints, retries survive process death |
| Preferences | DataStore | Coroutine-friendly replacement for SharedPreferences |
| DI | Manual `AppContainer` | Hilt adds build complexity disproportionate to a 6-screen app |
| Build | Gradle wrapper, AGP 8.x, compileSdk 34, minSdk 26 | Matches installed SDK (platforms 34/35, build-tools 34/35), reproducible |

---

*Architecture document — Phase 10, 2026-10-01*

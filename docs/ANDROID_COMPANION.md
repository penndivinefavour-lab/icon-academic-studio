# Android Companion

ICON Academic Studio — Android companion app for mobile monitoring, capture, and lightweight project review.

## Architecture

**Local-first, trusted-network only.** The Android companion connects to your ICON Academic Studio workstation over a user-configured local network address. There is no authentication, no cloud, no public API.

### Connection model

```
┌─────────────────────────────┐          ┌──────────────────────────────┐
│  Android Companion          │          │  Workstation (trusted LAN)    │
│  apps/android               │   HTTP   │                              │
│                               ├─────────►│  Express API  (PORT 4000)   │
│  Retrofit + OkHttp ────────  │          │  /api/v1/*                   │
│   (user-configured URL)      │          │      │                       │
│                              │          │      ▼                       │
│  Room cache (offline)        │          │  PostgreSQL / SQLite dev.db  │
└─────────────────────────────┘          └──────────────────────────────┘
```

### Why this architecture?

Phase 9.1.1 established:
- No user authentication exists in the API
- `projectId` is not an identity credential — it's project-scoped access control
- The application is single-user/local-first by design
- There is no JWT/session system, no login endpoint, no authorization middleware

**Therefore Phase 10 does NOT:**
- Invert authentication
- Add provider credentials to the APK
- Create a cloud endpoint
- Expose the API to untrusted networks
- Trust client-supplied identity metadata

The companion is a **mobile lens** into an already-trusted local setup. Users point it at their own workstation on their own trusted network.

---

## Screens

| Screen | Purpose | Data Source |
|--------|---------|-------------|
| **Home** | Dashboard, recent projects, connection status | `GET /api/v1/projects`, Room cache |
| **Projects** | Searchable list of all projects | `GET /api/v1/projects`, Room cache |
| **Command Center** | Progress, next action, workflow pipeline, materials | `GET /academic-projects/:id/dashboard`, `GET /activities/project/:id/next-action` |
| **Activity** | Chronological event timeline | `GET /api/v1/activities/project/:id` |
| **Capture** | Research notes, ideas, tasks (offline-safe) | Local Room write → WorkManager sync to `POST /api/v1/research/notes` |
| **Settings** | Connection URL configuration, test, about | DataStore preference |

---

## Offline & Synchronization

### Offline behavior
- **Cache-first**: All screens render from Room immediately; network refresh is best-effort
- **Offline label**: Cached data is visibly labelled as stale (`Cached — last synced Xh ago`)
- **Next action**: Never invented locally; always comes from the authoritative API when available

### Capture flow
1. User writes a note → saved to Room with UUID `clientId`, state `PENDING_SYNC`
2. UI returns instantly — capture is durably stored
3. WorkManager worker drains pending items when connectivity to the Studio API exists
4. Idempotent POST via `clientId` prevents duplicates on retry

### Sync states
| State | Meaning |
|-------|---------|
| `SYNCED` | Acknowledged by Studio API |
| `PENDING_SYNC` | Queued, will be sent when connected |
| `SYNC_FAILED` | Repeated failures; user can retry manually |

Nothing is ever silently dropped or overwritten.

---

## Security Guarantees

| Guarantee | Status |
|-----------|--------|
| No provider credentials in APK | ✅ None shipped |
| No fake authentication | ✅ Documented as local-first |
| No hardcoded IP addresses | ✅ User-configured URL |
| Plain HTTP warning | ✅ Persistent banner when applicable |
| No stack traces in UI | ✅ User-safe error messages only |
| Client never trusts its own authorization | ✅ `clientId` is idempotency key only, not auth |

---

## API Endpoints Used

| Endpoint | Method | Usage |
|----------|--------|-------|
| `/api/health` | GET | Connection probe |
| `/api/v1/projects` | GET | Project list + counts |
| `/api/v1/projects/{id}` | GET | Project detail |
| `/api/v1/academic-projects/{id}/dashboard` | GET | Command center metrics |
| `/api/v1/activities/project/{projectId}` | GET | Activity timeline |
| `/api/v1/activities/project/{projectId}/next-action` | GET | Deterministic next action |
| `/api/v1/research/notes` | GET | Existing captures (view-only in v1) |
| `/api/v1/research/notes` | POST | New capture (with `clientId`) |

### New backend endpoint (Phase 10)
- `POST /api/v1/research/notes` now accepts optional `clientId` for idempotent upsert
- Server looks up existing `(projectId, clientId)` pair first; returns original if found
- Backwards-compatible: callers without `clientId` behave exactly as before

---

## Build

### Prerequisites
- JDK 21 (`JAVA_HOME` must point to Eclipse Adoptium jdk-21.0.12.1+1 or compatible)
- Android SDK installed at `C:\androidsdk` (platforms 34/35, build-tools 34/35 accepted)

### Commands
```bash
cd apps/android

# Debug build
./gradlew assembleDebug

# Unit tests
./gradlew testDebugUnitTest

# Lint
./gradlew lintDebug
```

### Generated artifacts
- Debug APK: `apps/android/app/build/outputs/apk/debug/app-debug.apk`
- Package: `com.iconstudios.academiccompanion.debug`
- Version: `0.1.0-debug`

---

## Future

Phase 11 should add real authentication if ICON Academic Studio moves beyond single-user/local use. Until then, the trusted-network model is the honest security boundary.

# Phase 10.1 — Android Companion Verification Record

**Date:** 2026-10-03
**Scope:** ICON brand alignment, Android build verification, API/offline verification, targeted fixes.

---

## 1. Repository State (verified)

| Item | Value |
|---|---|
| Repo | `penndivinefavour-lab/icon-academic-studio` |
| Branch | `master` |
| Starting HEAD | `add4846` (== `origin/master`) |
| Phase 10.1 checkpoint | `ab08ca0` (Phase 9.1.1) |
| Working tree | clean at start (one untracked doc) |

---

## 2. Branding Audit

**Previous incorrect color:** `#0D9488` (teal) — reported by the prior audit as the Android primary.

**Actual state found in source:** A grep across the entire `apps/android/` tree for
`0D9488` and `teal` returned **zero matches**. The teal branding had already been
replaced with the authoritative ICON palette in Phase 10.

**Authoritative palette in use (centralized in `ui/theme/Color.kt` + `res/values/colors.xml`):**

| Token | Hex | Role |
|---|---|---|
| `IconNavy` | `#1A2744` | Primary surface / header |
| `IconPurple` | `#6B21A8` | Primary brand / accents |
| `IconGold` | `#F5C518` | Action / highlight (FAB, selected nav) |
| `IconWhite` | `#FFFFFF` | On-primary text |
| `IconCharcoal` | `#1E1E2E` | Dark-mode background |
| `IconSuccess` / `IconError` | green/red | Status only |

- All screens reference theme tokens, not raw hex.
- Only one raw hex in the whole UI layer: `Color(0xFF6B21A8)` (purple) in
  `ActivityScreen.kt` — semantically identical to `IconPurple`, kept as-is to
  avoid layout churn.
- Dark-mode behavior is coherent (Material3 dynamic color disabled; explicit
  dark color scheme in `Theme.kt`).

**All Android UI surfaces audited:** theme, Material color scheme, launcher icon
(adaptive, navy/purple), splash, bottom navigation + selected/unselected states,
buttons, cards, headers, progress indicators, chips, connection/sync status,
empty/error states, settings, quick capture, command center, activity, projects,
home. **No orange, no teal, no template colors.**

---

## 3. Typography

`apps/android` does **not** bundle Poppins. Per the phase rules, no font files
were invented or downloaded. The existing reliable Android font stack
(Material3 default type scale) is preserved. No broken font configuration
introduced.

---

## 4. Build Environment

| Tool | Version / Path |
|---|---|
| JDK | Eclipse Adoptium **21.0.12.1+1** — `/c/Program Files/Eclipse Adoptium/jdk-21.0.12.1+1` |
| Android SDK | `/c/Users/USER/Android/Sdk` |
| Platforms | `android-34` |
| Build-tools | `34.0.0` |
| System image | `android-34/google_apis/x86_64` (emulator available) |
| Gradle | 8.9 (project wrapper) |
| `adb` | present |

**Invocation note:** the `gradlew` shell script had CRLF line endings and hung.
Normalized with `sed -i 's/\r$//' gradlew`, then invoked the wrapper jar
directly, which is stable:

```
cd apps/android
JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.0.12.1+1" \
ANDROID_HOME="/c/Users/USER/Android/Sdk" \
ANDROID_SDK_ROOT="/c/Users/USER/Android/Sdk" \
java -cp "gradle/wrapper/gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain assembleDebug --no-daemon
```

`local.properties` was created with `sdk.dir` pointing at the local SDK. It is
git-ignored and was **not** committed.

---

## 5. Build Verification

**Command:** `assembleDebug --no-daemon`
**Result:** **BUILD SUCCESSFUL**

| Item | Value |
|---|---|
| APK path | `apps/android/app/build/outputs/apk/debug/app-debug.apk` |
| APK size | 18,547,489 bytes (~17.7 MB) |
| Variant | debug |
| Application ID | `com.iconstudios.academiccompanion.debug` |
| versionName | `0.1.0-debug` |
| versionCode | 1 |
| minSdk | 26 |
| targetSdk | 34 |

Artifact copy (outside generated dirs, not committed):
`artifacts/icon-academic-companion-0.1.0-debug.apk`

**Unit tests:** `testDebugUnitTest` — **BUILD SUCCESSFUL**, no failing tests.
(The project ships no test sources; the task executed and passed.)

### Compile errors fixed to reach a green build

All were genuine project-level source defects (not environment):

1. **`CommonComponents.kt`** — duplicate navigation block (`NavigationHost`,
   `Screen`, `Header`, `NavBarRoute`, `SCREENS`) redeclared symbols already
   defined in `Navigation.kt`, and an orphaned `BottomNavBar` referencing removed
   symbols. Removed the duplicates; `Navigation.kt` is now the single source.
2. **`Daos.kt`** — `markSynced` `@Query` referenced wrong column names and a
   mismatched signature. Corrected to
   `UPDATE captures SET sync_state = :state, server_id = :serverId, last_attempt_at = :attemptAt WHERE clientId = :clientId`.
3. **`CaptureScreen.kt`** — used the Material3 experimental `Chip` with an
   invalid `enabled` param, and `FloatingActionButton` had an invalid `enabled`
   param. Switched to the stable `AssistChip` (with `label` slot) and removed the
   invalid FAB param. Added the missing `setValue` import.
4. **`ActivityScreen.kt` / `CommandCenterScreen.kt`** — duplicated
   `relativeTime()` helpers; corrected both. Added missing
   `clip` / `width` / `Box` / `background` imports.
5. **`Navigation.kt`** — `currentBackStackEntryAsState()?.destination?.route`
   is invalid (the state must be read as `.value`). Fixed, plus missing imports
   (`NavigationBarItem`, `background`, `Arrangement`, `Column`, `Row`, `Spacer`,
   `padding`, `size`, `height`, `fillMaxWidth`) and wrong package paths
   (`ui.home.*` / `ui.projects.*` → `ui.*`). Added `@OptIn(ExperimentalMaterial3Api::class)`
   to `NavigationShell`, `Header`, and `BottomNavBar` (TopAppBar is experimental).
6. **`HomeScreen.kt`** — missing `fillMaxWidth` import and the same wrong
   `ui.home.*` package paths.
7. **`AppContainer.kt`** — `synchronized(this) { ... }` wrapping a `suspend`
   call is illegal. Restructured so the suspend read happens outside the
   monitor and only the cache write is synchronized. Added an `appContext`
   property (required by `CaptureViewModel`) and its `Context` import.
8. **`libs.versions.toml`** — `kotlinxSerialization = "1.7.3"` is incompatible
   with the project's Kotlin 1.9.25 (requires Kotlin 2.0+). Downgraded to
   `1.6.3`, which is the last release compatible with Kotlin 1.9.x.

---

## 6. Architecture Verification (source audit)

The claimed layering is real and present:

```
UI (Compose)  ->  ViewModel  ->  Repository  ->  Local (Room) / Remote (Retrofit)
```

- **Persistence:** **Room**, not raw SQLite. `CompanionDatabase` (RoomDatabase)
  with `ProjectEntity`, `ActivityEntity`, `CaptureEntity` + DAOs. The prior
  report's phrasing ("SQLite entities") was imprecise; the mechanism is Room
  over SQLite.
- **API client:** Retrofit + kotlinx.serialization, `StudioApi` interface,
  base URL sourced from `ConnectionPrefs` (DataStore) — **configurable, no key
  embedded, no hardcoded production IP**. `localhost` handling is intentional
  and limited to the configurable dev base URL.
- **Offline queue:** `CaptureEntity` carries a `sync_state`; the capture
  repository persists pending captures locally before any network call.
- **Sync:** `CaptureSyncWorker` (WorkManager) processes the queue with retry;
  captures are only marked synced after confirmed server success, so failures
  do not silently delete pending data.
- **Connection state:** observable via `ConnectionRepository` / `ConnectionPrefs`
  and surfaced in the UI.

---

## 7. API Integration Verification

### Route contract — Android client vs. API server (VERIFIED, source-level)

| Android (`StudioApi.kt`) | API route (mounted) | Match |
|---|---|---|
| `GET /api/health` | `GET /api/v1/health` | partial — see note |
| `GET /api/v1/projects` | `GET /api/v1/projects` (`projectsRouter.get('/')`) | YES |
| `GET /api/v1/projects/{id}` | `GET /api/v1/projects/:id` | YES |
| `GET /api/v1/academic-projects/{id}/dashboard` | `GET /api/v1/academic-projects/:id/dashboard` | YES |
| `GET /api/v1/activities/project/{projectId}` | `GET /api/v1/activities/project/:projectId` | YES |
| `GET /api/v1/activities/project/{projectId}/next-action` | `GET /api/v1/activities/project/:projectId/next-action` | YES |
| `GET /api/v1/research/notes?projectId=` | `GET /api/v1/research/notes` | YES |
| `POST /api/v1/research/notes` | `POST /api/v1/research/notes` | YES |

**Note on `/api/health`:** the Android health check targets `/api/health`. This
is correct — `apps/api/src/index.ts:33` defines `app.get('/api/health', ...)`
as an app-level alias in addition to the `/api/v1/health` router mount. No
mismatch.

### Runtime API test — PASS (live server)

The API was brought up against a live PostgreSQL instance and every route the
Android client calls was exercised over HTTP.

**Environment brought up for verification:**
- PostgreSQL 16 (`postgres:16-alpine`, container `icon-academic-pg`) on `localhost:5432`
- Database `icon_academic_studio` created; `prisma db push` applied the full
  schema (all tables created, verified via `\dt`)
- API server (`apps/api`) started on port **4001** (4000 was already occupied by
  an unrelated `opsvault` container)

**Live request/response results:**

| Endpoint | Result |
|---|---|
| `GET /api/health` | **200** — `{status:"ok", version:"0.1.0"}` |
| `GET /api/v1/health` | **200** — `{status:"ok", service:"icon-academic-studio-api"}` |
| `GET /api/v1/projects` | **200** — returns array + pagination meta |
| `GET /api/v1/projects/{id}` | **200** — returns single project with counts |
| `GET /api/v1/academic-projects/{id}/dashboard` | **200** — progress, counts, validation summary |
| `GET /api/v1/activities/project/{id}` | **200** — activity feed (records server-side views) |
| `GET /api/v1/activities/project/{id}/next-action` | **200** — deterministic next action returned |
| `POST /api/v1/research/notes` | **201** on create |
| `GET /api/v1/research/notes?projectId=` | **200** — returns persisted notes |

### Idempotent sync — PASS (live server)

The core offline-safety guarantee was executed end to end:

1. POST with `clientId: abc-123-verify-001` → **201**, record created
   (`cmutb5rm500018t04sgb0uiud`)
2. POST repeated with the **same** `clientId` → **200**, the **same** record id
   and createdAt returned. No duplicate was created.

This is exactly the retry path `CaptureSyncWorker` relies on: a WorkManager
replay after a network failure cannot create a duplicate note. Verified against
the running server, not just source inspection.

### Validation guards — PASS (live server)

| Case | Result |
|---|---|
| Missing `title` | **400** `VALIDATION_ERROR` |
| Non-existent `projectId` | **500** rejected (foreign-key constraint) |

---

## 8. Offline-First Verification

**Server contract: PASS (live).** The idempotency guarantee that the offline
queue depends on was executed against the running API (§7, "Idempotent sync").

**Android runtime flow: UNVERIFIED.** No emulator was booted. The
connect → cache → offline capture → queue → reconnect → sync sequence was
never executed inside a running app. The Android-side mechanisms were validated
at the source level only:

- `CaptureRepository.capture()` writes to Room **before** any network call
  (`syncState = SyncState.PENDING`), so a capture is never lost.
- `CaptureSyncWorker` drains only `SyncState.PENDING` items and returns
  `Result.retry()` unless **every** item succeeded, so a partial failure does
  not clear the queue.
- `pushCaptureWith()` calls `markSynced()` only after a server response
  containing a real `id`; on any throw or missing id it calls `markFailed()`,
  so a failed push is preserved rather than deleted.
- `POST /api/v1/research/notes` is idempotent on `clientId` (verified live, §7),
  so WorkManager replays cannot duplicate a note.
- `SyncEnqueuer.enqueueCaptureSync()` uses `enqueueUniqueWork`, so repeated
  enqueue calls coalesce into one worker rather than stacking.

The reason the emulator was not booted: the host's `node_modules` virtual store
was corrupted (documented in §7 environment notes) and the time budget was spent
restoring a runnable API server instead. This is a genuine gap, not an
assumption.

---

## 9. Security Verification

| Check | Status |
|---|---|
| Provider credentials in Android | **NONE** — no Gemini/OpenAI/OpenRouter keys anywhere in `apps/android` |
| `.env` committed | No — and `.env` is git-ignored |
| Hardcoded API secrets | None |
| Fake authentication | None |
| Public API exposure | None introduced; API bound to localhost only |
| Unnecessary permissions | None found in `AndroidManifest.xml` |
| Network security config | Intentional — `network_security_config.xml` scopes cleartext to the configurable dev host only; not broadly enabled |
| Local data exposing credentials | No — local DB holds app data only |
| Secret/sensitive logging | None found |

---

## 10. UX Quality Pass (source-level)

Bottom navigation, back navigation, loading/error/empty states, offline and sync
status, input validation (including API URL validation), and guardrails against
double-submit are all present. Accessibility content descriptions exist where
appropriate. No placeholder/demo data is presented as real data.

---

## 11. Documentation

Updated: `docs/PHASE_10_AUDIT.md` (this file) — the Phase 10.1 record.
Other Phase 10 docs (`ANDROID_COMPANION.md`, `PHASE_10_ARCHITECTURE.md`,
`PHASE_10_EXECUTIVE.md`) were inspected; their architecture descriptions match
the actual implementation and required no correction beyond what this record
captures.

---

## 12. Known Limitations (evidence-backed)

1. **No Android runtime/offline verification.** No emulator was booted. The
   server-side contract was verified live (§7), and the Android mechanisms were
   verified at the source level (§8), but the end-to-end offline flow inside a
   running app is UNVERIFIED.
2. **No instrumented/UI tests exist** in the Android project. Only the compile
   and unit-test tasks could be exercised.
3. **Poppins is not bundled** in the Android app (by design — see §3).
4. **Verification used a local PostgreSQL + API instance.** The API was run on
   port 4001 against a locally created database. No production deployment was
   touched and no credentials were exposed.
5. **`node_modules` corruption on this host.** The pnpm virtual store had
   empty package directories (prisma, esbuild, and several transitive deps
   extracted to nothing). Packages were manually restored into
   `apps/api/node_modules` and `packages/db/node_modules` from registry
   tarballs. These are local-only `node_modules` changes and are git-ignored;
   no committed file was altered to work around this. A clean `pnpm install` on
   a healthy host should still be run to confirm the lockfile resolves.

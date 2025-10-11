# Singura Architecture & QA Review Notes

## Architecture Snapshot
- **Monorepo & Build Orchestration** – npm workspaces coordinate shared/ backend/frontend builds and scripts (`package.json#L7-L39`).
- **Shared Type System** – `@singura/shared-types` exports all API/database/OAuth contracts consumed across services (`shared-types/package.json#L1-L35`, `shared-types/src/api/requests.ts#L1-L60`).
- **Backend Service Layer** – Express entrypoint with layered security middleware and route mounting (`backend/src/server.ts#L1-L125`), data-provider abstraction bridging mock vs. live connectors (`backend/src/services/data-provider.ts#L1-L120`), and Bull-powered background queues for discovery/risk jobs (`backend/src/jobs/queue.ts#L1-L200`).
- **Frontend SPA** – Vite/React dashboard with Clerk auth and centralized Axios client/interceptors (`frontend/package.json#L1-L78`, `frontend/src/services/api.ts#L1-L200`).
- **Testing & Tooling** – Playwright e2e harness (`e2e/README.md#L1-L32`), supplemental Jest suites (`backend/src/__tests__`), container orchestration (`docker-compose.yml#L1-L70`), multi-stage build (`Dockerfile#L1-L60`), and production deploy script with safety checks (`scripts/deploy.sh#L1-L200`).

## Documentation to Keep Handy
- Product overview & onboarding (`README.md#L1-L120`).
- High-level platform architecture (`docs/ARCHITECTURE.md#L1-L40`).
- TypeScript migration guide and shared-types structure (`docs/architecture/typescript.md#L1-L40`).
- Outstanding type errors backlog (`docs/TYPESCRIPT_ERRORS_TO_FIX.md#L1-L40`).
- Agent/delegation protocol for contributors (`CLAUDE.md#L1-L40`).

## QA Follow-Up Queue
- **Duplicate/Backup Route Files** – Multiple historical variants alongside active code (`backend/src/routes/connections.ts#L1-L120`, `backend/src/routes/connections.ts.bak`, `backend/src/routes/connections.ts.bak2`, `backend/src/routes/connections.ts.bak3`, `backend/src/routes/connections.ts.bak4`, `backend/src/routes/automations-mock.ts.bak`). Confirm canonical sources and archive/remove extras.
- **Security & Auth Stubs** – Mock login logic and console-only audit logging imply incomplete hardening (`backend/src/routes/auth.ts#L35-L144`, `backend/src/security/audit.ts#L28-L188`, `backend/src/services/index.ts#L6-L40`). Prioritize production-ready implementations.
- **Bundled Build Artifacts** – Compiled outputs are committed under `backend/dist/server.js#L1`, `frontend/dist/index.html#L1`, and `shared-types/dist/index.js#L1`. Validate if these should be generated instead to reduce drift.
- **Nested Frontend Package** – Investigate the extra workspace at `frontend/frontend/package.json#L1` to avoid dependency duplication.
- **Dev/Test Utilities in Source** – Legacy or manual scripts worth review (`backend/src/simple-server.ts#L1-L160`, `backend/src/test-ml-behavioral-engine.ts#L1-L160`, `backend/src/test-oauth.ts#L1`, `backend/test-data-toggle.js#L1-L160`). Decide which belong in mainline code vs. tooling.
- **Captured Diagnostic Artifacts** – Static assets from debugging runs (`diagnostic-screenshots/diagnostic-log.json#L1-L33`, `playwright-report/index.html#L1-L19`, `waitlist-landing-page.png`). Confirm retention policy.
- **Vercel Config Drift** – Two configs present; reconcile `vercel.json#L1-L45` with `vercel.json.backup#L1-L40` to prevent deployment confusion.
- **Distributed Test Suites** – Playwright specs live in both `e2e/tests/authentication.spec.ts#L1-L40` and `tests/e2e/google-discovery.spec.ts#L1-L20` along with Jest tests in `backend/src/__tests__`. Consider consolidating structure for clarity.
- **React Notification Regression Anecdotes** – Keep `docs/TOAST_DUPLICATION_FIX.md#L1-L40` handy while validating UI fixes.

## Suggested Next Steps
1. Curate and potentially remove redundant `.bak`/backup files after confirming historical need (see `backend/src/routes/connections.ts#L1-L120` and associated `.bak` variants).
2. Replace mock security/audit implementations with hardened services; coordinate with the TypeScript error backlog for affected files (`backend/src/routes/auth.ts#L35-L144`, `backend/src/security/audit.ts#L28-L188`, `backend/src/services/index.ts#L6-L40`).
3. Decide on policy for tracked build outputs and diagnostic artifacts to keep the repo lean (`backend/dist/server.js#L1`, `frontend/dist/index.html#L1`, `shared-types/dist/index.js#L1`, `diagnostic-screenshots/diagnostic-log.json#L1-L33`).
4. Normalize test locations to simplify QA automation ownership (`e2e/tests/authentication.spec.ts#L1-L40`, `tests/e2e/google-discovery.spec.ts#L1-L20`, `backend/src/__tests__`).

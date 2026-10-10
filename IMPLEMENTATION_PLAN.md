# Four-stage delivery plan

## Stage 1 — complete (development foundation)

- [x] Architecture, security, ADRs, design system, setup documentation
- [x] Strict Next.js tooling, stable exact dependencies, CI
- [x] Normalized PostgreSQL schema and generated/reviewed migrations
- [x] Immutable-version and membership DB guards, constraints tested on real PostgreSQL
- [x] Email/password signup, verification, login, reset, logout and negative access tests
- [x] Guest credential helpers and server-only authorization boundaries
- [x] Localized responsive shell, dark mode, account, loading/error/empty states
- [x] Compose app/PostgreSQL/MinIO/Mailpit health checks
- [x] Frozen install, lint, typecheck, unit/integration tests, build, E2E/axe evidence

## Stage 2 — not started; requires explicit prompt

- [ ] Verified localized quiz seeds, real public catalog and filtering
- [ ] Solo attempts, required answers, autosave, accessible real results
- [ ] Authenticated draft builder and immutable version APIs
- [ ] Complete translation checks; no fabricated scoring

## Stage 3 — not started; requires explicit prompt

- [ ] Secure guest join, atomic 2–10-person lifecycle, membership lock
- [ ] Status-only polling, private autosave, idempotent submit
- [ ] Deterministic versioned group scoring, withheld protected results
- [ ] Consent-based private social image export
- [ ] Concurrency, IDOR, stolen sessions and early-disclosure tests

## Stage 4 — not started; requires explicit prompt

- [ ] Moderation/admin, reporting and audited publication
- [ ] Registered history policy, privacy access/export/delete, retention job
- [ ] Age assurance/restricted previews and jurisdiction review
- [ ] Imports, entitlements (PDF remains future), observability
- [ ] VPS hardening, private media pipeline, CI security checks
- [ ] Encrypted backups/restore, incident response, independent reviews

## Verification record

Verified locally on 2026-10-10. Host Node 25.4.0 / pnpm 12.9.1; application container Node 22.21.1. GitHub-hosted workflow execution is not claimed.

| Exact command                                                     | Actual outcome                                                                                                               |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                  | PASS; exact lockfile, explicitly reviewed native build scripts                                                               |
| `pnpm peers check`                                                | PASS; no peer dependency issues                                                                                              |
| `pnpm lint`                                                       | PASS; zero errors/warnings                                                                                                   |
| `pnpm typecheck`                                                  | PASS; Next route type generation + strict tsc                                                                                |
| `pnpm test`                                                       | PASS; 7 tests across 2 files (guest expiry/revocation/theft, ownership/RBAC, role injection, locale parity, keyboard button) |
| `pnpm test:integration`                                           | PASS; 7 actual PostgreSQL tests, fixture transactions rolled back                                                            |
| `pnpm build`                                                      | PASS; optimized webpack build; dynamic private pages                                                                         |
| `pnpm test:e2e`                                                   | PASS; 7 Chromium tests against final Node 22 production container, including fresh RBAC grant/revocation                     |
| `pnpm db:generate`                                                | PASS; generated initial 29-table migration and snapshots                                                                     |
| `pnpm exec drizzle-kit generate --custom --name=integrity_guards` | PASS; reviewed custom immutability/membership/lifecycle SQL                                                                  |
| `pnpm exec drizzle-kit generate --custom --name=retention_guards` | PASS; reviewed dependent guest retention SQL                                                                                 |
| `pnpm db:migrate`                                                 | PASS; initial clean local DB plus incremental guards                                                                         |
| `pnpm db:seed`                                                    | PASS; repeated idempotently, localized category only                                                                         |
| `pnpm db:rehearse`                                                | PASS; all migrations on a fresh temporary DB, 29 tables, idempotent reapply, temporary DB removed                            |
| `docker compose build minio`                                      | PASS; pinned official-source build                                                                                           |
| `docker compose up -d --build`                                    | PASS; final app, PostgreSQL, MinIO, Mailpit containers built/started and healthy                                             |
| `docker compose ps --format '{{.Service}}: {{.Health}}'`          | PASS; all 4 healthy                                                                                                          |
| `pnpm format:check`                                               | PASS                                                                                                                         |
| `pnpm audit --prod`                                               | PASS; no known advisories at check time, not a security guarantee                                                            |
| `git diff --check`                                                | PASS                                                                                                                         |

E2E covers EN/UK/FR at 320px, locale switching, both colour themes, persistence, keyboard skip navigation, Radix focus trap/Escape, reduced motion, signup/verify/login/reset/logout, one-time and expired codes, concurrent code consumption, moderator grant/revocation on an existing session, denied moderation, CSRF/unknown endpoint/role rejection, rate limits and revoked-cookie private-data denial. Axe returned zero violations on tested public/dialog/account views. Public home screenshots inspected at 320px and 1280px; no auth screenshots, video or traces. Failure teardown clears secret fields. A streamed Next redirect is tested by absence of private account data and zero database sessions, rather than assuming an HTTP 3xx response.

Earlier failures were resolved: TypeScript 7 was outside ESLint peers (pinned 6.0.3); explicit pnpm native-script review; sandbox SWC cache access (approved rerun); CJS seed top-level await (ESM project); missing MinIO registry images (pinned official-source development build); Corepack pnpm 12 entry-point incompatibility (exact npm installation). First expanded cookie test assumed HTTP redirect; corrected to test actual streamed authorization denial. No unresolved code/test failure is being hidden.

## Scope and remaining risks

[Complete file manifest](docs/stage1-files.md). The existing starter deletions are preserved. Generated migrations, snapshots and lockfile are included in the Stage 1 change set for a local foundation commit. No remote push or production deployment is authorized.

Not implemented: active quiz catalog/seed quizzes, solo quiz/answers/results, draft builder, room joining/polling/autosave/submission/scoring/share images, moderation workflows, registered history, account privacy export/deletion, physical cleanup scheduler, adult-content/age assurance, imports, media upload/export pipeline, entitlements/checkout/PDF. Their relational foundations exist; their services and user journeys do not.

Production blockers: independent legal/privacy/security and adult-content review; disclosed registered-history/backup retention; supported S3 storage decision (MinIO upstream is archived, development-only source build); real SMTP provider/queue/timing/delivery validation; HTTPS and trusted proxy IP limits (current requests share a conservative peer bucket); least-privilege runtime/migration roles; encrypted backups/restore; production secrets/rotation and incident procedures. No production accounts accessed and no deployment/billing enabled. Tests/seeds refuse remote databases and browser tests refuse remote hosts. GitHub CodeQL/quality gates are configured but not run on GitHub; branch protection and scanning permissions require repository-owner setup. Chromium checks do not replace cross-browser, assistive-technology or manual production review. No claim of GDPR compliance or complete security.

Stage 2 prerequisites: explicit next-stage prompt, running migrated local PostgreSQL/Mailpit stack, editorially verified complete EN/UK/FR quiz content, transactional translation/publication checks and solo-flow design. Stage 1 does not authorize advancing to Stage 2.

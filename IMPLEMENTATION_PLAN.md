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

## Stage 2 — complete development slice; verification recorded below

- [x] Eight original complete EN/UK/FR official seed topics; four question kinds, no free text
- [x] PostgreSQL public catalog/search/category/tag filters/featured/new/locale sorting/pagination/detail and version read API
- [x] Approved published complete immutable snapshots only; restricted adult metadata and verifier-backed development gate
- [x] Secure guest/account solo starts/resume; owner guards, no-store/noindex, seven-day service expiry
- [x] Accessible progress/required-answer controls, save-on-change status/retry, optimistic revision conflicts
- [x] Atomic idempotent completion, frozen answer graph, genuine private versioned solo profiles/distributions/rules
- [x] Disclosed seven-day registered recent-history UI; no long-term retention assumption
- [x] Authenticated React Hook Form/Zod private draft builder, all translations, categories/tags/weights/options/images/order
- [x] Translation deficiency labels, dirty-exit protection, explicit save, local preview, review request only
- [x] Owner-only media references, bounded MIME/signature/decoder validation, metadata-free WebP, private S3 storage/reads
- [x] New draft version cloning, preserved stable question IDs, immutable published snapshots; pending review read-only
- [x] Pure exact match/scale similarity/Jaccard/weighted aggregation primitives and versioned configuration
- [x] Generated/custom reviewed SQL migrations, fresh migration + repeated seed rehearsal, docs/API contracts/CI setup
- [x] Stage-1 checks run before extension; auth hydration/native-GET submission issue corrected

Production prerequisites remain incomplete by design: legal/privacy/security and native-language editorial review, production age assurance, physical cleanup/privacy rights and backup deletion, supported storage/scanning/quotas/media cleanup, real email delivery and deployment hardening. Admin approval, group multiplayer, sharing/export and paid PDF are absent. Stage 2 does not authorize stage 3.

## Stage 3 — not started; requires explicit prompt

- [ ] Secure guest join, atomic 2–10-person lifecycle, membership lock
- [ ] Status-only polling, private autosave, idempotent submit
- [ ] Deterministic versioned group scoring, withheld protected results
- [ ] Consent-based private social image export
- [ ] Concurrency, IDOR, stolen sessions and early-disclosure tests

## Stage 4 — not started; requires explicit prompt

- [ ] Moderation/admin, reporting and audited publication
- [ ] Registered history policy, privacy access/export/delete, retention job
- [ ] Production age assurance and jurisdiction review (development restricted previews shipped in stage 2)
- [ ] Imports, entitlements (PDF remains future), observability
- [ ] VPS hardening, private media/export hardening, CI security checks
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

## Stage 1 scope and remaining risks (historical foundation record)

[Complete file manifest](docs/stage1-files.md). The existing starter deletions are preserved. Generated migrations, snapshots and lockfile are included in the Stage 1 change set for a local foundation commit. No remote push or production deployment is authorized.

Not implemented: active quiz catalog/seed quizzes, solo quiz/answers/results, draft builder, room joining/polling/autosave/submission/scoring/share images, moderation workflows, registered history, account privacy export/deletion, physical cleanup scheduler, adult-content/age assurance, imports, media upload/export pipeline, entitlements/checkout/PDF. Their relational foundations exist; their services and user journeys do not.

Production blockers: independent legal/privacy/security and adult-content review; disclosed registered-history/backup retention; supported S3 storage decision (MinIO upstream is archived, development-only source build); real SMTP provider/queue/timing/delivery validation; HTTPS and trusted proxy IP limits (current requests share a conservative peer bucket); least-privilege runtime/migration roles; encrypted backups/restore; production secrets/rotation and incident procedures. No production accounts accessed and no deployment/billing enabled. Tests/seeds refuse remote databases and browser tests refuse remote hosts. GitHub CodeQL/quality gates are configured but not run on GitHub; branch protection and scanning permissions require repository-owner setup. Chromium checks do not replace cross-browser, assistive-technology or manual production review. No claim of GDPR compliance or complete security.

Stage 1 handoff prerequisites (subsequently authorized by the stage-2 prompt): explicit next-stage prompt, running migrated local PostgreSQL/Mailpit stack, editorially verified complete EN/UK/FR quiz content, transactional translation/publication checks and solo-flow design. Stage 1 does not authorize advancing to Stage 2.

## Stage 2 verification — complete development slice, 2026-10-10

Stage 1 was checked before extending: lint/typecheck/build, 7 unit tests, 7 PostgreSQL integration tests and 7 browser tests all passed. Final stage-2 browser evidence uses the Node 22.21.1 production application container with actual local PostgreSQL/Mailpit/private MinIO, not mocked handlers. Host checks use Node 25.4.0 / pnpm 12.9.1. GitHub-hosted CI execution is not claimed.

| Exact command                                                           | Actual final outcome                                                                                                                                        |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                                                             | PASS; zero errors/warnings                                                                                                                                  |
| `pnpm typecheck`                                                        | PASS; generated route types and strict TypeScript                                                                                                           |
| `pnpm test`                                                             | PASS; 18 tests across 3 files                                                                                                                               |
| `pnpm test:integration`                                                 | PASS; 15 real PostgreSQL tests across 2 files; service fixtures roll back                                                                                   |
| `pnpm build`                                                            | PASS; production webpack bundle, private/data pages dynamic                                                                                                 |
| `pnpm test:e2e`                                                         | PASS; 16 Chromium tests against final production container, 25.6 seconds                                                                                    |
| `pnpm db:generate`                                                      | PASS; generated additive schema/solo-age migrations `0003` and `0005`, reviewed SQL/snapshots included                                                      |
| `pnpm exec drizzle-kit generate --custom --name=solo_guards`            | PASS; `0004` reviewed frozen-answer/guest integrity guards                                                                                                  |
| `pnpm exec drizzle-kit generate --custom --name=publication_validation` | PASS; `0006` reviewed complete approved-publication guards                                                                                                  |
| `pnpm exec drizzle-kit generate --custom --name=locale_sort`            | PASS; `0007` fixed EN/UK/FR ICU collations                                                                                                                  |
| `pnpm db:migrate`                                                       | PASS; all five additional migrations applied locally                                                                                                        |
| `pnpm db:rehearse`                                                      | PASS; fresh temporary DB, migrations twice, seed twice, 30 tables/8 immutable published quizzes/32 questions/96 question translations; temporary DB removed |
| `pnpm db:seed`                                                          | PASS; repeated idempotently, published content unchanged                                                                                                    |
| `pnpm storage:init`                                                     | PASS; configured local private bucket initialized, no public policy                                                                                         |
| `pnpm audit --prod`                                                     | PASS; no known vulnerabilities at check time, not a security guarantee                                                                                      |
| `pnpm peers check`                                                      | PASS; no peer issues                                                                                                                                        |
| `pnpm exec drizzle-kit check`                                           | PASS; migration snapshots/journal consistent                                                                                                                |
| `docker compose build app`                                              | PASS; frozen lockfile install and full build on Node 22.21.1                                                                                                |
| `docker compose up -d --wait app`                                       | PASS; application, PostgreSQL, MinIO and Mailpit healthy                                                                                                    |
| `pnpm format:check`                                                     | PASS                                                                                                                                                        |
| `git diff --check`                                                      | PASS                                                                                                                                                        |

Unit evidence covers all eight translations/question types, unknown/duplicate questions/options, invalid scales and min/max, required submission, payload bounds, image signatures, pure scoring edges and deterministic non-compatibility solo interpretation. Database tests cover public/draft/adult eligibility, guest start/resume/theft/expiry/revocation, cross-user denial, editable/frozen answers, wrong version, stale revisions, singleton/idempotent results, author ownership, unowned media, adult authoring gate, translation review deficiencies, pending lock and snapshot/stable-ID cloning. Service fixtures run inside rollback transactions on real PostgreSQL.

Browser evidence covers EN/UK/FR catalog filters and 320px layout, accessible details/inputs/results/editor with zero axe violations on tested settled views, guest resume and completion, no credential-free result reads, private headers, adult metadata withholding, real verified registration/login/solo/history, EN/UK/FR private draft authoring/preview/save/review, actual private S3 image upload/reencode/read and outsider denial, concurrent stale saves, two simultaneous final submissions producing one revision/result, invalid input/uploads, and no-JavaScript/pre-hydration auth protection. All original stage-1 auth/locale/theme/keyboard tests also pass. Public catalog screenshots at 320px and 1280px were visually inspected; no private/auth screenshot, trace or video was saved. Chromium/axe do not replace assistive-technology or cross-browser review.

Resolved failures are recorded: nested locale copy required extending the stage-1 flat-message test; option distributions now use immutable option IDs instead of ambiguous generic values; Turbopack repeated recompile/navigation resets were resolved with webpack development; an auth form hydration race was fixed with POST-only native behavior and disabled pre-hydration fields; the new registration test incorrectly supplied an allowlist-rejected locale; integration fixtures were narrowed to official PUBLISHED versions after browser drafts existed; browser tests now wait for the destination detail heading/URL before accessibility scans and version reads. Final checks pass; earlier failed/interrupted browser runs are not reported as successful.

[Complete stage-2 file manifest](docs/stage2-files.md). [API contracts](docs/stage2-api.md). [ADR 0002](docs/adr/0002-solo-authoring.md). Code, generated/reviewed migrations and snapshots are included in the local stage-2 commit; no remote push, production deployment, migration, account access or billing action occurred.

The stage-2 newcomer journey is verified: local Docker services → migrations → seed/private bucket initialization → localized catalog → solo guest/account completion → private genuine results; verified account → editable private draft → review request without self-publication. Local application remains running at http://localhost:3000/en/catalog.

Remaining work belongs to subsequent stages: group multiplayer/scoring UI; moderation/admin approval; privacy/export/deletion/physical purge and backup-retention policies; production age assurance/legal/security/native-language review; supported S3 provider/scanning/quotas/orphan cleanup; SMTP queue/delivery/proxy/TLS/least privilege/backups/monitoring; social exports and future paid PDF. Production readiness remains blocked. **STOP: stage 3 has not been started.**

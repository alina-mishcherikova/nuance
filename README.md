# Nuance

A multilingual social quiz platform with the **Stage 2 development experience**: localized catalog, eight original quizzes, guest/account solo completion with private results, seven-day recent history, private draft authoring and access-controlled image uploads. Group play, admin publication and production launch remain later stages.

## Local setup

Requirements: Node 22 LTS, pnpm 12.9.1, Docker Desktop/Compose v2.24+ (production override uses `!reset`).

```sh
pnpm install --frozen-lockfile
pnpm dev:env
# Generates ignored local credentials without printing them; refuses overwrite.
docker compose up -d postgres minio mailpit
pnpm db:migrate
pnpm db:seed
pnpm storage:init
# Creates only the configured local private bucket, no public access policy.
pnpm dev
```

Open http://localhost:3000/en (also /uk, /fr). Mailpit http://localhost:8025 captures verification/reset codes; no real email is delivered. SMTP port 1025. MinIO console http://localhost:9001 uses local .env credentials. Storage is private by default; `pnpm storage:init` creates the local `nuance-private` bucket. PNG/JPEG/WebP uploads are bounded and re-encoded to private WebP. `docker compose up -d --build` also runs the production-built application at port 3000; stop the host dev server first. Migrations are an explicit operator step, never run on app startup.

MinIO upstream is archived and official images unavailable as checked 2026-10-10. Development image builds from official commit `7aac2a2c5b7c882e68c1ce017d8256be2feea27f` using Go. Review its AGPL obligations. Do not use this archived development service in production without a supported storage decision. See [official upstream](https://github.com/minio/minio).

## Commands

| Command                        | Behavior                                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev` / `build` / `start` | Next development / production bundle / server                                                                                |
| `pnpm lint` / `typecheck`      | ESLint zero warnings / strict TypeScript                                                                                     |
| `pnpm format` / `format:check` | Prettier write / check                                                                                                       |
| `pnpm test`                    | Vitest/RTL unit and security tests                                                                                           |
| `pnpm test:integration`        | Actual PostgreSQL constraints; transactional rollback fixtures                                                               |
| `pnpm test:e2e`                | Playwright auth, locale, mobile, theme, keyboard and axe; requires migrated DB/Mailpit                                       |
| `pnpm db:generate`             | Generate SQL/snapshot; review and commit before applying                                                                     |
| `pnpm db:migrate`              | Apply committed migrations to configured DB                                                                                  |
| `pnpm db:rehearse`             | Create a temporary local database, apply migrations twice, seed twice, validate 30 tables/eight quizzes, remove temporary DB |
| `pnpm storage:init`            | Initialize the configured local private S3 bucket                                                                            |
| `pnpm db:seed`                 | Eight complete original EN/UK/FR official quizzes; repeats preserve snapshots, no login credentials or elevated roles        |

Install Chromium first: `pnpm exec playwright install chromium`. E2E uses local test accounts/mail only, no production data. Traces/video/screenshots are disabled for auth secrecy. CI uses generated ephemeral secrets, local PG/mail services and migrations. Pinned CodeQL and Dependabot workflows are configured; GitHub execution and repository code-scanning/branch-protection settings need verification by the repository owner. Native dependency scripts are specifically allowlisted in pnpm-workspace.yaml; peer compatibility checked (TypeScript 6.0.3, not unsupported 7).

## Authentication and permissions

Signup → eight-digit email code → verify → password login. Codes expire in ten minutes with five attempts, hashed server storage, one-time consumption. Reset uses a new email code and revokes active sessions. Account pages query the authenticated ID server-side, never a URL user ID. Role defaults to user; no user-controlled role field or role-management endpoint. Moderator/admin provisioning is a future audited operator workflow; development seed never creates privileged accounts.

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` for a provider; production delivery remains unverified until configured and tested, with queue/timing review. Use HTTPS `BETTER_AUTH_URL`, strong private `BETTER_AUTH_SECRET` and restricted DB credentials. Proxy IP trust is intentionally disabled; production needs validated edge configuration and distributed abuse review. Never point tests at production.

## Migrations and recovery

Initial migration creates 29 normalized tables; custom guard migrations create immutable-content, membership/lifecycle and dependent-retention triggers. Apply to a fresh local database first. For existing environments take an encrypted backup and rehearse restore to a separate DB; review generated SQL and locks, apply with dedicated migration role, then run smoke checks. Roll forward with a new non-destructive migration when possible. Never modify applied migration files or use `db:push`. Initial schema rollback is restore-to-separate-DB plus connection cutover; no destructive down script. Temporary deletion cascades preserve published content; full privacy cleanup is stage 4.

## Delivery and evidence

Read [architecture](ARCHITECTURE.md), [security/threat model](SECURITY.md), [design system](DESIGN_SYSTEM.md), [ADRs](docs/adr/0001-foundation.md) and [implementation plan](IMPLEMENTATION_PLAN.md). Stage 2 stops here; Stage 3 requires an explicit next-stage instruction. Production is blocked pending legal/privacy/security review, supported storage, SMTP, TLS/proxy, least-privilege DB, retention/privacy flows, backups/restore and manual checks. No analytics, checkout or fabricated stats.

## Stage 2 journeys

Open `/en/catalog`, `/uk/catalog` or `/fr/catalog`. Search titles, filter category/tag, sort featured/new/title, and page through six cards. Open a quiz detail and choose **Take alone**. Answers save on valid changes; required questions block progression/submission. Refresh resumes with the same HttpOnly session. A stale tab returns a conflict rather than overwriting; submitted answers are frozen. Results reflect actual selections and scale means, with no compatibility percentage.

Sign up, verify through Mailpit and sign in. `/en/account` includes completed solo attempts for seven days; `/en/builder` creates private drafts. Fill title/description/questions/options in EN/UK/FR, upload images if desired, reorder questions, configure weights/selection bounds, preview and explicitly save. Missing translations are shown and prevent review submission. **Submit for review** creates PENDING only, never publication; clone a pending/published version to start a new draft. No moderator queue is implemented in this stage.

The official seeds cover couples, friends, habits, values, humor, group opinions (solo only), preferences and 18+ consent/intimacy. Each has four real questions with all four supported kinds and all three translations. Re-running seed never changes published questions. The editorial principal has no password/account/verified email/privileged role. Original seed copy is programmatically validated; independent native-language editorial review remains a production prerequisite.

Adult titles, descriptions, questions and covers are withheld until `/en/age` records a verifier-backed 18+ self-declaration. This is a development gate, not production age assurance. All attempts, including registered results/history, deny access after seven days; scheduled physical purge and user privacy workflows are stage 4. Do not use development with real sensitive production data.

Read [stage-2 API contracts](docs/stage2-api.md), [design decisions](docs/adr/0002-solo-authoring.md) and [verification/files](IMPLEMENTATION_PLAN.md). Development uses webpack after a locally observed Turbopack recompile/navigation loop. Tests use real local PostgreSQL, Mailpit and MinIO; initialize/seed them before the integration/E2E commands. Production remains blocked.

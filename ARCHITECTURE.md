# Nuance architecture

Stage 1 modular monolith: Next.js App Router transports and server-rendered UI in `src/app`; services in `src/features`; Drizzle schema/repositories in `src/db`; pure authorization, credential and validation primitives in `src/lib`. Client modules cannot import server-only database/auth modules. PostgreSQL is authoritative; no permanent mocked endpoints.

## Boundaries

Public shell and auth forms exist in stage 1. Account and moderation boundary routes perform database-backed session/RBAC checks on every request. Auth requests have an allowlisted transport and Origin checks. There is no quiz, room, answer, media or moderation mutation endpoint yet. Schema existence does not constitute a working feature.

Later private APIs must return explicit DTOs: polling exposes phase/counts/own submission status only; answers remain scoped to their author; result access requires membership and all submissions. Quiz ownership never grants response access. Use no-store and noindex on all private transports/pages. Public catalog queries must require published immutable versions, complete EN/UK/FR translations and appropriate age gating.

## Relational model

Users, credential accounts, sessions, verification records and rate limits support Better Auth. Quiz masters own version sequences; ordered questions/options and translations reference a version. Composite foreign keys bind answers to attempt versions and selected options to their question. Rooms reference one version; participants have independent verifier credentials; attempts reference either a solo user or room participant. One result snapshot per room or attempt is enforced by unique indexes. JSONB is limited to versioned scoring configuration and aggregate result payloads (Zod validated); no raw response JSON or analytics payloads.

Published content is protected by database triggers in the guard migration. The publication transaction must check translation completeness/moderation in stage 2/4. Database room guards serialize participant writes through row locks, enforce capacity and frozen membership. Stage 3 still must implement lifecycle transactions, idempotent submission and concurrent final-result creation, with service tests.

## Operational model

Node 22 LTS target; exact stable package versions in package.json/lockfile, no release candidates. Registry verified Next 16.4.0, React 19.3.0, Better Auth 1.7.7, Drizzle ORM 0.45.4 / Kit 0.31.11. The Drizzle current quickstart mentions RC; deliberately use stable compatible versions and generate/migrate only. PostgreSQL 17, private MinIO, Mailpit development sink. No production deployment or automatic startup migration.

See [ADRs](docs/adr/0001-foundation.md), [security](SECURITY.md) and [delivery plan](IMPLEMENTATION_PLAN.md).

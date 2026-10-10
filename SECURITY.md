# Security baseline and threat model

This is engineering policy and evidence, not a security certification. Production remains blocked pending independent security/privacy/legal review, jurisdiction-specific adult-content review, infrastructure hardening, backup/restore rehearsal and manual verification.

| Boundary / threat                                       | Stage 1 control                                                                                                                                                           | Later work                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Credentials: stuffing, enumeration, reset replay        | Better Auth; Argon2id; verified email before login; generic transport failures; hashed expiring one-time email codes; attempt limits; database rate limits; Origin checks | Production SMTP delivery/outbox, load/timing and abuse review                              |
| Sessions: fixation, theft, stale privilege              | Database sessions, secure cookies on HTTPS, no cookie session cache; logout and reset revoke sessions; fresh RBAC server checks                                           | Proxy/HTTPS validation, incident rotation drill                                            |
| Guest room: code guessing, nickname impersonation       | 256-bit independent random token helper; SHA-256 verifier, constant-time comparison, expiry/revocation; no join endpoint yet                                              | Per-IP/principal join limits, guest ownership scoped repositories and IDOR tests           |
| Answers/results: early disclosure, BOLA, caching        | No response endpoints; composite schema integrity; deny-by-default ownership helper; no-store private pages                                                               | Query-layer withholding, race tests, authorized ephemeral export                           |
| UGC: XSS, moderation bypass, mutable published content  | Escaped plain text, CSP nonces, immutable-content triggers; no UGC endpoint                                                                                               | Validated drafts, complete translation publication checks, audit moderation decisions      |
| Rooms: capacity / membership / double submit races      | Row-locking participant guards, unique participant attempt and result constraints                                                                                         | Lifecycle and final submission transactions, stale autosave tests                          |
| Adult content and minors                                | No adult content or previews shipped                                                                                                                                      | Age assurance, restricted metadata, consent, jurisdiction review                           |
| Files/imports/exports: SSRF, malware, formula injection | No endpoint; private storage configuration only                                                                                                                           | Auth, signature/MIME/size checks, reencoding, parser bounds, signed export access          |
| Retention, analytics, logs                              | Expiry markers/indexes; no answer/email/token logging, no analytics SDK or nonessential cookies                                                                           | Cleanup job, account/guest export/delete, disclosed registered retention and backup policy |

## Auth transport

Only explicitly enabled Better Auth routes are exposed. Zod strict request shapes strip no unknown authorization fields: unknown fields are rejected. Role is server-only (`input:false`) with user default and DB enum; no API promotes roles. Every mutation requires the configured exact Origin. Better Auth additionally enforces its CSRF/session rules. Incoming proxy IP headers are ignored by default; all local requests share a rate-limit key. Production must configure a trusted edge to overwrite a single IP header before enabling it, never blindly trust forwarded-for. Email principal limits complement global peer limits.

Use SMTP authentication/TLS for a real provider, a persistent delivery queue, restricted credentials and reliable monitoring before production. Mailpit is local-only; no delivery claims beyond that sink. Do not emit auth request bodies/errors to logs. Auth email codes are secrets and never placed in URLs. Local secrets are generated into ignored `.env`, never committed.

## Data deletion design

Guest credentials/room/attempt records expire within 7 days; services must deny expired access immediately. Stage 4 purge transaction deletes room results then answers/attempts/participants/room (CASCADE for temporary child graphs); published versions are RESTRICTed. Registered history policy is deliberately pending, so no history feature is released. Account deletion must anonymize retained moderation/audit references, resolve owned quiz preservation and delete identifiable answers/media; deleting a user alone is not a privacy workflow. Backup erasure latency must be disclosed. Dedicated scheduled cleanup is not implemented.

## Deployment baseline

CSP per-request nonce, frame-ancestors none, nosniff, restrictive permissions/referrer headers and HTTPS-only HSTS. Private routes no-store/noindex. Local Compose binds DB/mail/storage to loopback; production overlay removes ports. Secrets supplied externally; migration role separate from runtime before deployment. Alerts, encrypted backups, restores, TLS termination, dependency advisory review and least-privilege roles are production prerequisites.

## References checked 2026-10-10

[Better Auth email/password](https://better-auth.com/docs/authentication/email-password), [email OTP](https://better-auth.com/docs/plugins/email-otp), [Drizzle adapter](https://better-auth.com/docs/adapters/drizzle), [OWASP ASVS](https://owasp.org/projects/asvs), [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [WCAG 2.2](https://www.w3.org/TR/WCAG22/). Implementation evidence and remaining gaps are in IMPLEMENTATION_PLAN.md.

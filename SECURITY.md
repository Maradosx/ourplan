# Security

Security was treated as a first-class concern in OurPlan. This document summarises
the measures in place and how to report an issue.

## Authentication & sessions

- Passwords are hashed with **bcrypt** (cost factor 12) — never stored or logged in plain text.
- **JWT** access tokens (15 min) + refresh tokens (30 days) with **refresh-token rotation**:
  each refresh invalidates the previous token server-side, so a stolen refresh token is
  single-use.
- Password-reset tokens are random 32-byte values, single-use, and expire after 1 hour.
  The token is **never returned in an API response** (it is only surfaced behind an explicit,
  off-by-default `EXPOSE_RESET_TOKEN` flag for local development).
- The forgot-password endpoint returns an identical response whether or not the email exists,
  to prevent **account enumeration**.

## Authorization

- Every protected route is guarded by a JWT auth guard.
- **Object-level authorization**: schedules, friendships, groups, quick-shifts and profiles are
  always scoped to the authenticated user; the API never trusts a client-supplied id without
  an ownership/permission check.
- **Privacy preferences are enforced server-side** — the “public profile”, “show events” and
  “discoverable” toggles are applied in the read endpoints, not just hidden in the UI.

## Transport & input

- **helmet** sets hardened HTTP response headers.
- A global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`) validates every request body
  against typed DTOs, preventing **mass-assignment** and malformed input.
- **Rate limiting** (`@nestjs/throttler`) is registered as a global guard; auth endpoints
  (login/register/forgot-password) carry stricter limits.
- A global Prisma exception filter maps database errors to clean 4xx responses so internal
  details are not leaked in 500s.

## Secrets & data

- No secrets are committed. `.env` files are git-ignored; only `.env.example` templates are tracked.
- The Google Maps key is injected from the environment via `app.config.js`, never hard-coded.
- The hosted Postgres (Supabase) has **Row Level Security enabled** on all tables. The API connects
  with the database service role over a direct connection (which bypasses RLS by design), while the
  public/anon PostgREST surface is locked down.

## Reporting a vulnerability

This is a portfolio project. If you spot a security issue, please open a private report via the
repository’s Security tab or contact the maintainer directly.

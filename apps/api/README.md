# OurPlan API

The backend for **OurPlan** — a [NestJS 11](https://nestjs.com/) service using **Prisma** over **PostgreSQL**, with JWT authentication (refresh-token rotation), request validation, and rate limiting. All routes are served under the global prefix **`/api/v1`**.

> Part of the OurPlan monorepo — see the [root README](../../README.md) for the full picture.

## Requirements

- Node.js ≥ 18
- pnpm ≥ 8
- A running PostgreSQL instance

## Setup

From the **repo root** (recommended, so workspace deps resolve):

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # then edit values
pnpm --filter api prisma migrate dev      # apply schema + generate client
pnpm api                                  # start in watch mode → http://localhost:3000/api/v1
```

Run commands directly inside `apps/api`:

```bash
pnpm start:dev   # watch mode
pnpm start       # one-off start
pnpm start:prod  # node dist/main (after pnpm build)
pnpm build
pnpm test        # unit tests (jest)
pnpm test:e2e    # e2e tests
```

## Environment Variables

From `apps/api/.env.example`:

| Variable | Description | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma | `postgresql://postgres:password@localhost:5432/ourplan?schema=public` |
| `JWT_SECRET` | Secret for signing **access** tokens | `change-me-to-a-long-random-string` |
| `JWT_REFRESH_SECRET` | Secret for signing **refresh** tokens | `change-me-too` |
| `JWT_EXPIRES_IN` | Access-token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime | `30d` |
| `PORT` | HTTP port | `3000` |
| `NODE_ENV` | Environment (`development` exposes the dev password-reset token) | `development` |

## Prisma Commands

```bash
pnpm --filter api prisma migrate dev     # create/apply a migration in dev
pnpm --filter api prisma generate        # regenerate the Prisma client
pnpm --filter api prisma studio          # browse data in the Prisma Studio UI
pnpm --filter api prisma migrate deploy  # apply migrations in production
```

Schema lives in [`prisma/schema.prisma`](./prisma/schema.prisma): `User`, `Schedule`, `QuickShift`, `Friendship`, `Group`, `GroupMember`, `RefreshToken`, and `PasswordResetToken`.

## Routes

All paths are relative to **`/api/v1`**. Every group except the public auth endpoints requires a `Bearer` access token.

| Group | Method & path | Purpose |
| --- | --- | --- |
| **Auth** | `POST /auth/register` | Create account, returns access + refresh tokens |
| | `POST /auth/login` | Log in |
| | `POST /auth/refresh` | Rotate refresh token, issue a new pair |
| | `GET /auth/me` | Current user (auth required) |
| | `POST /auth/forgot-password` | Begin password reset |
| | `POST /auth/reset-password` | Complete password reset |
| **Schedules** | `GET /schedules?date=` | My events for a day |
| | `GET /schedules/month?year=&month=` | My month overview |
| | `GET /schedules/free-slots` | Shared free slots across friends |
| | `GET /schedules/friends/all` · `GET /schedules/friends/month` | Friends' day / month availability |
| | `GET /schedules/friend/:friendId` · `GET /schedules/friend/:friendId/month` | A single friend's schedule |
| | `POST /schedules` · `GET/PATCH/DELETE /schedules/:id` | Event CRUD |
| **Quick Shifts** | `GET /quick-shifts?date=` · `GET /quick-shifts/month` | Read shifts |
| | `POST /quick-shifts` · `POST /quick-shifts/bulk` | Upsert one / many |
| | `DELETE /quick-shifts/:date` · `DELETE /quick-shifts/:date/:shiftKey` | Remove shifts |
| **Friends** | `GET /friends` · `GET /friends/pending` | List friends / requests |
| | `POST /friends/request/:targetId` | Send request |
| | `POST /friends/:id/accept` · `/decline` · `/unfriend` | Manage friendships |
| **Groups** | `GET /groups` · `POST /groups` | List / create |
| | `PATCH /groups/:id` · `DELETE /groups/:id` | Rename / delete |
| | `POST /groups/:id/members` · `DELETE /groups/:id/members/:userId` | Membership |
| **Users** | `GET /users/search?q=` | Search users |
| | `GET /users/me/preferences` · `PATCH /users/me/preferences` | Notification / privacy prefs |
| | `PATCH /users/me` | Update own profile |
| | `GET /users/:slug` · `/:slug/schedules` · `/:slug/friend-status` | Public profile data |

Auth-sensitive endpoints are rate-limited with `@nestjs/throttler` (login `10/min`, register `5/min`, forgot-password `3/min`; global default `60/min`).

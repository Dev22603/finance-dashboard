# Finance Dashboard — Backend

Express + TypeScript backend for a single-firm finance dashboard with role-based access control, financial record management, and analytics APIs.

---

## Tech Stack

- **Runtime:** Node.js + TypeScript (via `tsx`)
- **Framework:** Express v5
- **Database:** PostgreSQL
- **ORM:** Prisma v7 (with `pg` connection pool adapter)
- **Auth:** JWT + bcrypt
- **Validation:** Zod v4

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

See the [Environment Variables](#environment-variables) section for details.

### 3. Generate Prisma client

```bash
npm run db:generate
```

### 4. Run database migrations

```bash
npm run db:migrate
```

Creates all tables in your database. Run this whenever you change `schema.prisma`.

### 5. Seed the database

```bash
npm run db:seed
```

Creates the SUPERADMIN account using credentials from `.env`. Idempotent — safely skips if the account already exists.

### 6. Start the server

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:migrate` | Create and apply a new migration (dev) |
| `npm run db:migrate:prod` | Apply pending migrations without creating new ones |
| `npm run db:seed` | Create the SUPERADMIN account |
| `npm run db:reset` | Drop database, reapply all migrations, and re-seed |
| `npm run db:studio` | Open Prisma Studio GUI |

---

## Data Models

### User

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key, auto-generated |
| `name` | String | |
| `email` | String | Unique |
| `passwordHash` | String | Never exposed in API responses |
| `role` | Enum | `VIEWER` (default), `ANALYST`, `ADMIN`, `SUPERADMIN` |
| `isActive` | Boolean | Default `true`. Set to `false` on soft delete |
| `createdAt` | DateTime | Auto-generated |

### Record

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key, auto-generated |
| `amount` | Decimal(12,2) | Must be positive |
| `type` | Enum | `INCOME` or `EXPENSE` |
| `category` | String | Free-text category label |
| `date` | DateTime | Transaction date |
| `notes` | String? | Optional |
| `createdBy` | UUID | Foreign key to User |
| `deletedAt` | DateTime? | Soft delete timestamp |
| `createdAt` | DateTime | Auto-generated |
| `updatedAt` | DateTime | Auto-updated |

---

## Roles and Access Control

Access is enforced via `authenticate` (JWT verification) and `authorize` (role check) middleware on every route.

| Role | Records | Dashboard Analytics | User Management |
|---|---|---|---|
| `SUPERADMIN` | Full CRUD | Full access | Full access (cannot delete self or change own role) |
| `ADMIN` | Full CRUD | Full access | Can manage VIEWER and ANALYST users only |
| `ANALYST` | Read-only | Full access | Own profile only |
| `VIEWER` | Read-only | No access | Own profile only |

### Role hierarchy rules

- SUPERADMIN is created **only** via the seed script. Cannot be assigned through any API.
- SUPERADMIN cannot delete their own account or change their own role.
- ADMIN cannot modify or delete ADMIN or SUPERADMIN accounts.
- ADMIN can only assign VIEWER or ANALYST roles — cannot promote to ADMIN or above.
- All new signups default to VIEWER. Role is not accepted in the signup request body.

---

## API Documentation

See [API.md](API.md) for the complete API reference with all endpoints, request/response formats, query parameters, and auth requirements.

---

## Assumptions

See [ASSUMPTIONS.md](ASSUMPTIONS.md) for all design decisions and deviations from the assignment.

---

## Architecture Notes

### Why `config.ts` instead of `process.env` directly?

`process.env` is a dictionary lookup on every access, which adds measurable overhead in hot paths ([detailed explanation](https://blog.stackademic.com/when-process-env-bites-back-a-node-js-performance-lesson-40bbec066d33)). `config.ts` reads all environment variables once at startup into a plain object. Every import reads a cached property — faster at runtime, easier to mock in tests, and gives a single place for defaults.

### Prisma Connection Pooling

Prisma is initialized with a `pg.Pool` via `@prisma/adapter-pg`. In development, the client is cached on `globalThis` so hot reloads don't exhaust the connection limit.

### CORS

Currently allows requests only from `http://localhost:5173` (default Vite dev server). Update in `src/app.ts` for production.

### Project Structure

```
src/
├── app.ts                  Express app setup
├── index.ts                Entry point
├── controllers/            Request handling
├── services/               Business logic
├── repositories/           Data access (Prisma queries)
├── routes/                 Endpoint definitions
├── middlewares/             Auth & authorization
├── schemas/                Zod validation schemas
├── constants/              Roles, messages, config
├── utils/                  ApiError, ApiResponse, helpers
├── types/                  Express type extensions
└── lib/                    Prisma client setup
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `PORT` | Express server port |
| `DB_HOST` | PostgreSQL hostname |
| `DB_PORT` | PostgreSQL port |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_NAME` | Database name |
| `DATABASE_URL` | Full Prisma connection string |
| `JWT_SECRET` | Secret for signing/verifying JWTs |
| `SUPER_ADMIN_NAME` | Superadmin display name (seed) |
| `SUPER_ADMIN_EMAIL` | Superadmin login email (seed) |
| `SUPER_ADMIN_PASSWORD` | Superadmin password (seed) |

# Environment Variables

Copy this as `.env.example` (commit it). Create `.env` locally with real values (never commit).

```env
# Server
PORT=5000
NODE_ENV=development

# CORS — frontend origin allowed to call this API
CORS_ORIGIN=http://localhost:5173

# Database — individual fields (used for manual connection, not currently used by Prisma directly)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_NAME=budget

# Database — Prisma connection string (required by PrismaPg adapter)
DATABASE_URL=postgresql://postgres:your_db_password@localhost:5432/budget

# Auth
JWT_SECRET=your_jwt_secret_at_least_32_chars

# Superadmin seed — used by prisma/seed.ts to create the initial SUPERADMIN account
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_NAME=Admin
SUPER_ADMIN_PASSWORD=Admin@123456
```

---

## Variable reference

| Variable | Required | Default (in config.ts) | Description |
|----------|----------|------------------------|-------------|
| `PORT` | No | `5000` | Port the Express server binds to |
| `NODE_ENV` | No | `"development"` | Controls Prisma singleton caching (non-production recycles) |
| `CORS_ORIGIN` | No | `"http://localhost:5173"` | Frontend origin for CORS allow-list |
| `DB_HOST` | No | `"localhost"` | Postgres host (informational — Prisma uses DATABASE_URL) |
| `DB_PORT` | No | `5432` | Postgres port (informational) |
| `DB_USER` | No | `"postgres"` | Postgres user (informational) |
| `DB_PASSWORD` | No | `"root"` | Postgres password (informational) |
| `DB_NAME` | No | `"budget"` | Postgres database name (informational) |
| `DATABASE_URL` | **Yes** | `postgresql://postgres:root@localhost:5432/budget` | Full connection string used by Prisma + PrismaPg |
| `JWT_SECRET` | **Yes** | `"jwt_secret"` (insecure) | Secret for JWT signing — use a long random string in prod |
| `SUPER_ADMIN_EMAIL` | No | `"devbachani08@gmail.com"` | Email for the seeded SUPERADMIN account |
| `SUPER_ADMIN_NAME` | No | `"Dev"` | Display name for the seeded SUPERADMIN |
| `SUPER_ADMIN_PASSWORD` | No | `"superAdminPassword"` (insecure) | Password for the seeded SUPERADMIN — change in prod |

## Notes

- `DATABASE_URL` is the only variable Prisma actually reads (via `prisma.config.ts`). The `DB_*` variables are loaded into `config.ts` for potential direct use but are not used by any current code path.
- `JWT_SECRET` and `SUPER_ADMIN_PASSWORD` defaults in `config.ts` are intentionally insecure — always override in production.
- Token expiry is hardcoded to `"10h"` in `auth.services.ts`. There is no refresh token mechanism — users re-login after 10 hours.
- `CORS_ORIGIN` is new (added in blueprint) — the original hardcoded `http://localhost:5173`. Set to your frontend URL.

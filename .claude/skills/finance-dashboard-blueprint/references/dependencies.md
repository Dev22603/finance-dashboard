# Dependencies

Full `package.json` — copy verbatim, then run `npm install`.

```json
{
    "name": "finance-dashboard",
    "version": "1.0.0",
    "description": "",
    "main": "dist/index.js",
    "scripts": {
        "test": "echo \"Error: no test specified\" && exit 1",
        "dev": "tsx watch src/index.ts",
        "build": "tsc",
        "start": "node dist/index.js",
        "db:generate": "prisma generate",
        "db:migrate": "prisma migrate dev",
        "db:migrate:prod": "prisma migrate deploy",
        "db:seed": "prisma db seed",
        "db:reset": "prisma migrate reset",
        "db:studio": "prisma studio",
        "format": "prettier --write .",
        "format:check": "prettier --check ."
    },
    "dependencies": {
        "@prisma/adapter-pg": "^7.6.0",
        "@prisma/client": "^7.6.0",
        "bcrypt": "^6.0.0",
        "cors": "^2.8.6",
        "dotenv": "^17.4.0",
        "express": "^5.2.1",
        "jsonwebtoken": "^9.0.3",
        "pg": "^8.20.0",
        "winston": "^3.19.0",
        "zod": "^4.3.6"
    },
    "devDependencies": {
        "@types/bcrypt": "^6.0.0",
        "@types/cors": "^2.8.19",
        "@types/express": "^5.0.6",
        "@types/jsonwebtoken": "^9.0.10",
        "@types/node": "^25.6.0",
        "@types/pg": "^8.20.0",
        "prisma": "^7.6.0",
        "tsx": "^4.21.0",
        "typescript": "^6.0.2"
    }
}
```

---

## Dependency notes

### Production

| Package | Purpose |
|---------|---------|
| `@prisma/adapter-pg` | Prisma driver adapter for `pg` (node-postgres) — required when using `PrismaPg` |
| `@prisma/client` | Prisma query client (generated to `src/generated/prisma/`) |
| `bcrypt` | Password hashing — salt rounds = 10 throughout |
| `cors` | Express CORS middleware — origin configured from `CORS_ORIGIN` env var |
| `dotenv` | Loads `.env` at startup via `import "dotenv/config"` in `prisma.config.ts` and explicit `dotenv.config()` in `config.ts` |
| `express` | HTTP framework — v5 (uses promise-based error handling) |
| `jsonwebtoken` | JWT sign + verify — access token only, no refresh tokens |
| `pg` | node-postgres pool — used by `PrismaPg` adapter |
| `winston` | Structured logging — colorized console output, child loggers per module |
| `zod` | Schema validation — imported as `zod/v4` (Zod v4 API) |

### Dev

| Package | Purpose |
|---------|---------|
| `@types/*` | TypeScript type definitions for runtime packages |
| `prisma` | Prisma CLI for migrations, generation, seeding |
| `tsx` | TypeScript execution for dev (`tsx watch`) and seed (`tsx ./prisma/seed.ts`) |
| `typescript` | v6 — strict mode, NodeNext module resolution |

### Scripts reference

| Script | Command | Use |
|--------|---------|-----|
| `dev` | `tsx watch src/index.ts` | Development with hot reload |
| `build` | `tsc` | Compile to `dist/` for production |
| `start` | `node dist/index.js` | Run compiled production build |
| `db:generate` | `prisma generate` | Regenerate Prisma client after schema change |
| `db:migrate` | `prisma migrate dev` | Apply + create new migration in dev |
| `db:migrate:prod` | `prisma migrate deploy` | Apply existing migrations in prod (no new migration created) |
| `db:seed` | `prisma db seed` | Run `prisma/seed.ts` via `tsx` |
| `db:reset` | `prisma migrate reset` | Drop DB, reapply all migrations, reseed |
| `db:studio` | `prisma studio` | Open Prisma Studio UI |
| `format` | `prettier --write .` | Format all files |
| `format:check` | `prettier --check .` | Check formatting (CI) |

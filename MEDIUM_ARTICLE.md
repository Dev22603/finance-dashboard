# How I Structure Node.js Backends — From an Empty Folder to Something You Can Ship

### A complete walkthrough of the scaffolding, architecture, and conventions I use for every API I build. Steal any of it.

---

Every backend tutorial ends at `app.listen(3000)`.

Then you try to add a second feature and the whole thing collapses into a 2,000-line `server.js` you're afraid to touch.

This article is the opposite of that. It walks you through the exact setup of a real backend I shipped — a finance dashboard with roles, JWT auth, Postgres, Prisma, Zod validation, structured logging, and a strict layered architecture. Every file. Every command. Every `tsconfig` flag. Every reason.

If you're a fresher building your first "real" API, clone the mental model. If you're already shipping, there's probably one or two ideas in here you haven't seen.

> **TL;DR.** Express 5 + TypeScript + Prisma v7, a hard split between routes / controllers / services / repositories, Zod schemas at the service boundary, Winston with child loggers per file, a consistent `ApiError` / `ApiResponse` contract, and a six-command path from clone to running.

---

## The big picture

The domain doesn't matter. Swap "finance records" for todos, blog posts, tickets — the scaffolding is identical. What matters is the shape.

- **Express 5** for HTTP.
- **TypeScript** because `req.body.amount` being silently `undefined` in production is a career event.
- **PostgreSQL** via **Prisma v7**.
- **JWT + bcrypt** for auth.
- **Zod v4** for validating the garbage users send you.
- **Winston** for logs, because `console.log` is a liability.
- A strict **routes → controllers → services → repositories** pipeline so the app stays readable at 5pm on a Friday.

Here's the final `src/` layout. Hold this picture in your head the whole time:

```
src/
├── index.ts            Entry point — starts the server
├── app.ts              Express app wiring — middleware + routes
├── routes/             URL → controller mapping (thin)
├── controllers/        HTTP I/O — parse request, return response
├── services/           Business logic — the actual rules
├── repositories/       Database queries — Prisma lives here
├── middlewares/        Auth, authorization, etc.
├── schemas/            Zod validation schemas
├── constants/          Enums, messages, config
├── utils/              ApiError, ApiResponse, helpers
├── lib/                Prisma client, logger — singletons
├── types/              TypeScript global augmentation
└── generated/          Prisma-generated client (git-ignored)
```

Each folder has **one job.** That discipline is the most valuable thing in this article — more valuable than any specific library choice.

---

## Before you start

Make sure these work:

```bash
node --version     # v20 or newer
npm --version      # v10 or newer
git --version      # anything recent
```

You also need a Postgres database. Local, Docker, or a free cloud one. If you don't have one: go to [neon.tech](https://neon.tech), sign up, copy the connection string. That's it.

Everything else, we build from scratch.

---

# Part 1 — From empty folder to running server

## Init the folder and git

```bash
mkdir finance-dashboard
cd finance-dashboard
git init
```

Init git *first*, before anything else. Two reasons.

First, the very first commit becomes a safety net. Mess up in the next ten minutes and `git restore .` rescues you.

Second, `npm install` creates `node_modules/` — 30,000 files of third-party code you never want in git. If git is running, you have a chance to add a `.gitignore` before the disaster commit happens.

Create a minimal one now:

```bash
echo "node_modules" > .gitignore
echo "dist" >> .gitignore
echo ".env" >> .gitignore
```

We'll flesh it out later.

## `npm init`

```bash
npm init -y
```

The `-y` takes every default. You get a minimal `package.json` with a useless `test` script, an empty description, and `"main": "index.js"`.

Three fields matter going forward:

- **`dependencies`** — packages your code imports at runtime (`express`). They ship to production.
- **`devDependencies`** — packages used only while developing or building (`typescript`, `tsx`, `prisma`). They don't ship.
- **`scripts`** — named shell commands you run with `npm run <name>`. This is where the magic lives.

We'll fill these up as we go. But here's the final version I ship, so you have a target:

```json
{
    "name": "finance-dashboard",
    "version": "1.0.0",
    "main": "dist/index.js",
    "scripts": {
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

Notice `"main"` changed from `"index.js"` to `"dist/index.js"`. That's because TypeScript is going to compile down to `dist/`, and `main` should point at the compiled output — the thing that actually runs in production.

> **npm vs pnpm vs yarn vs bun.** `npm` ships with Node and works everywhere — boring, reliable, correct default. `pnpm` is faster and stricter; I use it on every serious project. `yarn` had its moment in 2017. `bun` is promising but still has rough edges with native modules like Prisma. For this article: `npm`.

### Every dependency, one-liner

| Package | Why |
|---|---|
| `express` | HTTP router. Could be Fastify or Hono — Express is the safe default. |
| `cors` | Lets your frontend on a different port actually talk to this backend. |
| `dotenv` | Loads `.env` into `process.env`. |
| `bcrypt` | Password hashing. **Never** store plain passwords. |
| `jsonwebtoken` | Issues and verifies JWTs. |
| `zod` | Runtime validation — TypeScript types vanish at runtime, Zod fills the gap. |
| `winston` | Structured logging. |
| `pg` | Postgres driver (used under the Prisma adapter). |
| `@prisma/client` | The generated ORM client you actually import. |
| `@prisma/adapter-pg` | Lets Prisma use your own `pg.Pool` for connection pooling. |
| `prisma` (dev) | The CLI and migration engine. |
| `typescript` (dev) | The compiler. |
| `tsx` (dev) | The dev-mode TypeScript runner. |
| `@types/*` (dev) | Type declarations for libraries that ship as plain JS. |

Don't install everything at once. We install each piece when we need it, so you see the context.

---

## TypeScript, configured properly

```bash
npm install --save-dev typescript @types/node
npx tsc --init
```

`npx tsc --init` gives you a `tsconfig.json` with 80 commented-out options. Mine is trimmed to the ones that actually matter:

```json
{
    "exclude": ["prisma.config.ts", "node_modules"],
    "compilerOptions": {
        "rootDir": "./src",
        "outDir": "./dist",

        "target": "ES2022",

        "sourceMap": true,

        "strict": true,
        "skipLibCheck": true,
        "esModuleInterop": true,
        "module": "NodeNext",
        "moduleResolution": "NodeNext"
    }
}
```

Let me walk through every option. These are the levers that make or break your dev experience.

**`rootDir` + `outDir`.** "My source lives in `src/`. Put the compiled JavaScript in `dist/`." Human code in `src/`, machine output in `dist/`, `dist/` git-ignored.

**`target: "ES2022"`.** Which JavaScript version should `tsc` emit? Node 20+ supports ES2023 natively. `ES2022` is a safe sweet spot — `async/await`, optional chaining, private class fields, `.at()`, top-level await. Lower values make `tsc` polyfill ugly code. Higher values couple you to bleeding-edge Node behavior.

**`module: "NodeNext"` + `moduleResolution: "NodeNext"`.** The pair of settings that confuses more freshers than anything else. It tells TypeScript: "use Node's modern resolution, respect `"type"` in `package.json`, understand both CommonJS and ESM." For any greenfield Node project, always use `"NodeNext"`. Don't touch `"CommonJS"` (legacy) or `"ESNext"` (for bundlers).

**`strict: true`.** Turns on *all* the strict type-checking flags at once. Without this, TypeScript is barely more than autocomplete.

> Turn off `strict` and you're writing JavaScript with extra steps. Don't.

**`esModuleInterop: true`.** Lets you write `import express from "express"` instead of the clunky `import * as express from "express"`. Always on.

**`skipLibCheck: true`.** Don't type-check `.d.ts` files inside `node_modules`. Third-party type definitions occasionally disagree with each other and watching `tsc` referee them will waste your life.

**`sourceMap: true`.** Generates `.js.map` files so production stack traces point at your original TypeScript line, not the compiled one. Debugging gift.

**`exclude: ["prisma.config.ts", "node_modules"]`.** The Prisma v7 config file lives at the project root, not in `src/`. If TypeScript picks it up it tries to compile it into `dist/` and screams about module resolution. Excluding it is the clean fix.

Test it works:

```ts
// src/index.ts
const name: string = "backend";
console.log(`Hello from ${name}`);
```

```bash
npx tsc
node dist/index.js
```

If "Hello from backend" prints, your TypeScript is alive. Delete `dist/` — we don't commit it, and we don't run `tsc` by hand during development.

---

## Why `tsx watch` beats `ts-node` and `nodemon`

Running `tsc` then `node` on every code change is insane. You need a dev runner that:

1. Runs TypeScript directly, no separate compile step.
2. Restarts on file change.

```bash
npm install --save-dev tsx
```

Then in `package.json`:

```json
"scripts": {
    "dev": "tsx watch src/index.ts"
}
```

```bash
npm run dev
```

Server starts. Edit any file. Restarts instantly. Done.

Why `tsx` and not the alternatives?

| Tool | Verdict |
|---|---|
| `node src/index.ts` (with `--experimental-strip-types`) | No watch mode. Still experimental. |
| `ts-node` | **Slow.** Painful startup. Legacy. |
| `nodemon` + `ts-node` | Two tools, two configs, two kinds of gotchas. |
| `nodemon` + `tsc -w` | Double complexity, stale `dist/` bugs. |
| `bun --watch` | Different runtime, still flaky with Prisma. |
| **`tsx watch`** | One devDependency. Fast (esbuild under the hood). First-class ESM. **Winner.** |

Bonus: the same `tsx` binary runs our Prisma seed script later. One tool, two jobs.

---

## The `index.ts` / `app.ts` split

I split the server into two files instead of one. Tiny decision, huge downstream payoff.

`src/index.ts`:

```ts
import { app } from "./app";
import { config } from "./constants/config";
import logger from "./lib/logger";

app.listen(config.PORT, () => {
    logger.info(`Server is running on http://localhost:${config.PORT}`);
});
```

`src/app.ts`:

```ts
import express from "express";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import recordRoutes from "./routes/record.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import cors from "cors";

const app = express();

app.use(cors({
    origin: "http://localhost:5173",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
}));

app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({ status: "Server is Up and Running!" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/dashboard", dashboardRoutes);

export { app };
```

`app.ts` builds and exports the Express app, fully configured. It does *not* listen on a port. `index.ts` takes the app and binds it.

Why split them?

**Testing.** Integration tests call `request(app)` via Supertest — they need the app instance, but they must not bind a port (two tests fighting for port 5000 = chaos). An exported pure `app` makes this trivial.

**Clarity.** `index.ts` is "how we start." `app.ts` is "what we are." That separation is the difference between a hobby project and something you can reason about.

**The `/health` route.** Every backend should have one. Uptime monitors, load balancers, Kubernetes liveness probes, the sanity check when your deploy goes sideways — all hit `/health`. Five lines, enormous ROI.

> **CORS trap.** The `5173` is Vite's default dev port. In production, replace it with your actual frontend origin. And never use `origin: "*"` together with `credentials: true` — browsers refuse.

---

## Every script in `package.json`, explained

```json
"scripts": {
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
}
```

**`dev`** — hot-reloading dev server. Already covered.

**`build`** — runs `tsc`. Output lands in `dist/`. You run this before deploying.

**`start`** — `node dist/index.js`. Production start. Plain Node, no TypeScript in the runtime path. Never `tsx` in prod — you'd be shipping a transpiler you don't need.

**`db:generate`** — regenerates the Prisma Client after any schema change. Also part of every fresh install.

**`db:migrate`** — `prisma migrate dev`. Development migration. Diffs your database against `schema.prisma`, creates a new SQL migration file, applies it, prompts for a migration name.

**`db:migrate:prod`** — `prisma migrate deploy`. Production migration. **Does not create new migrations**, only applies pending ones. This is what runs on deploy.

**`db:seed`** — runs the seed script defined in `prisma.config.ts`.

**`db:reset`** — nuclear button. Drops the database, re-applies all migrations, re-runs the seed. Never in production.

**`db:studio`** — spreadsheet-like web GUI at `http://localhost:5555`. Indispensable.

**`format` / `format:check`** — Prettier. `--write` rewrites files, `--check` fails if any file is out of spec (perfect for CI).

The `db:` prefix groups them visually. NPM allows colons in script names and most autocomplete groups them nicely. Once you have 10+ scripts, grouping saves your sanity.

---

# Part 2 — The database layer

## Installing Prisma

```bash
npm install --save-dev prisma
npm install @prisma/client @prisma/adapter-pg pg
```

Two installs, on purpose:

- `prisma` is the **CLI + migration engine**. Dev-only.
- `@prisma/client` is the **generated client** you actually import at runtime.
- `@prisma/adapter-pg` + `pg` let Prisma use your own `pg.Pool` instead of its built-in connector. Crucial for connection pooling in production.

```bash
npx prisma init --datasource-provider postgresql
```

This creates a `prisma/` folder, drops a starter `schema.prisma`, and appends `DATABASE_URL=` to your `.env`.

> **Prisma vs Drizzle vs TypeORM vs raw `pg`.** Drizzle is lighter and closer to SQL. TypeORM is mature but dev momentum has stalled. Raw `pg` gives full control but you write everything yourself. Prisma's time-saved-in-the-first-three-weeks pays for every rough edge you'll ever hit. My default pick.

---

## The `schema.prisma` walkthrough

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Role { VIEWER ANALYST ADMIN SUPERADMIN }
enum RecordType { INCOME EXPENSE }

model User {
  id           String    @id @default(uuid())
  name         String
  email        String    @unique
  passwordHash String
  role         Role      @default(VIEWER)
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())

  records      Record[]
}

model Record {
  id        String     @id @default(uuid())
  amount    Decimal    @db.Decimal(12, 2)
  type      RecordType
  category  String
  date      DateTime
  notes     String?

  createdBy   String
  user        User     @relation(fields: [createdBy], references: [id])

  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

### The generator block

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

`provider = "prisma-client"` is the new v7 generator. The older `prisma-client-js` still works but is being phased out.

`output = "../src/generated/prisma"` puts the generated client inside `src/` instead of `node_modules`. Three reasons: TypeScript finds it naturally, it shows up in my IDE tree (so I remember it exists), and I git-ignore it because it's a build artifact, not source.

### The datasource block

```prisma
datasource db { provider = "postgresql" }
```

Notice there's no `url` field. In Prisma v7, the URL moved into `prisma.config.ts` — keeps all "where does config come from?" answers in one TypeScript file.

### Enums become TypeScript unions

```prisma
enum Role { VIEWER ANALYST ADMIN SUPERADMIN }
```

Prisma enums become both Postgres enum types *and* TypeScript unions. In code:

```ts
import { Role } from "../generated/prisma";
const r: Role = "ADMIN"; // typo caught at compile time
```

This is the moment most ORM converts fall in love.

### The `User` model

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  role         Role      @default(VIEWER)
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())

  records      Record[]
}
```

- `@id` — primary key.
- `@default(uuid())` — Prisma generates a UUID v4 at insert time. I prefer UUIDs over CUIDs for inter-service compatibility.
- `@unique` — database-level unique index. Duplicate email attempts throw.
- `records Record[]` — virtual relation field. No column is added to the `User` table; the foreign key lives on the other side.

### The `Record` model — and your first JOIN

```prisma
model Record {
  amount    Decimal    @db.Decimal(12, 2)
  notes     String?

  createdBy   String
  user        User     @relation(fields: [createdBy], references: [id])

  deletedAt DateTime?
  updatedAt DateTime  @updatedAt
}
```

New attributes:

- `@db.Decimal(12, 2)` — native Postgres-type override. Default `Decimal` in Prisma doesn't let you specify precision. **Money should never be a float.** Floats lose pennies.
- `notes String?` — the `?` makes it nullable.
- `deletedAt DateTime?` — **soft delete** timestamp. Null = live, date = deleted-but-recoverable.
- `updatedAt DateTime @updatedAt` — Prisma bumps this automatically on every update. Free audit column.

The relation itself:

```prisma
createdBy   String
user        User     @relation(fields: [createdBy], references: [id])
```

Reading top-down: `createdBy` is a plain FK column, `user` is the virtual relation field. Now in code:

```ts
const record = await prisma.record.findUnique({
  where: { id },
  include: { user: true },
});
record.user.name; // fully type-safe
```

One query, joined, typed.

---

## `prisma.config.ts` — the v7 change

Prisma v7 moved configuration out of `schema.prisma` into a TypeScript file at the project root:

```ts
// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        seed: "tsx ./prisma/seed.js",
    },
    datasource: {
        url: process.env["DATABASE_URL"],
    },
});
```

- `import "dotenv/config"` loads `.env` *before* the config is evaluated. Without this, `DATABASE_URL` is undefined when the CLI runs.
- `migrations.seed` tells Prisma how to run your seed script. I use `tsx` because my seed imports TypeScript files from `src/`.
- `datasource.url` is the connection string.

This is why `tsconfig.json` has `"exclude": ["prisma.config.ts"]`. If `tsc` picks it up, it tries to emit `dist/prisma.config.js` and complains about module resolution. Prisma CLI reads this file directly — it handles its own TypeScript compilation.

---

## Connection pooling, the right way

```ts
// src/lib/prisma.ts
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "../constants/config";

const createPrismaClient = () => {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);

    return new PrismaClient({
        adapter,
        log: ["query", "info", "warn", "error"],
    });
};

type PrismaClientSingleton = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as typeof globalThis & {
    prisma?: PrismaClientSingleton;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (config.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
```

Three things are happening here.

**The `pg.Pool` + adapter.** By default, Prisma spins up its own Rust-based connection pool. Giving it a `pg.Pool` explicitly is cleaner — you control pool size, you can share the pool with other libraries, and the connection semantics become plain Node Postgres, which is what most cloud providers expect.

**The `log: ["query", ...]` option.** Prisma prints every SQL query it runs to the console. Beautiful for learning — you see the actual SQL your `findMany` calls generate. Turn it down to `["warn", "error"]` in production.

**The `globalThis` singleton trick.** This solves a dev-only problem: `tsx watch` restarts the process on file change. Node's module cache also clears, so each restart would instantiate a fresh `PrismaClient` — and fifty debug iterations = fifty open database connections, until Postgres refuses new ones.

The fix: store the client on `globalThis`, which survives across module reloads within the same process. If a client already exists, reuse it. In production, no reloader exists, so we skip the global cache.

This pattern is used by every serious Node + Prisma project. You'll see it everywhere once you notice it.

---

## Migrations: `dev` vs `deploy`

```bash
npm run db:migrate
```

Prisma prompts for a migration name. Type `init`. It does three things:

1. Creates `prisma/migrations/20260418XXXXXX_init/migration.sql` — the actual SQL.
2. Applies it to your database.
3. Regenerates the client.

**Commit the `migrations/` folder to git.** It's part of your project's history now — future teammates, CI, and production all replay these files in order.

The two migration commands do very different things:

- **`prisma migrate dev`** — development. Creates new migration files based on schema diffs. May prompt to reset the DB if you've edited past migrations.
- **`prisma migrate deploy`** — production. *Never* creates migrations, only applies existing ones. Safe to run on every deploy.

Mixing them up is how development databases end up in weird half-migrated states.

---

## Seeding — what, why, and the rule

Seeding means running a script that inserts initial data your app needs to exist before anyone does anything. Examples: a SUPERADMIN user so you can log in the first time, a list of countries or currencies, dummy fixtures for local development.

It is **not** for user-generated data. It's for the stuff your app cannot start without.

Why seed instead of just inserting rows manually once?

- **Reproducibility.** A new developer clones the repo and runs six commands — everything works. No Slack message asking "what's the admin password?"
- **Idempotency.** A good seed script runs once or a hundred times with identical end state.
- **CI and staging resets.** You can nuke a staging DB and bring it back exactly how you want.
- **Known starting state for tests.**

### The seed script

```js
// prisma/seed.js
import { authRepository } from "../src/repositories/auth.repositories";
import { ROLES } from "../src/constants/app.constants";
import bcrypt from "bcrypt";
import { config } from "../src/constants/config";

async function createSuperAdmin() {
    const hashedPassword = await bcrypt.hash(config.SUPER_ADMIN_PASSWORD, 10);
    await authRepository.createUser(
        config.SUPER_ADMIN_NAME,
        config.SUPER_ADMIN_EMAIL,
        hashedPassword,
        ROLES.SUPERADMIN,
    );
}

async function main() {
    console.log("Starting database seed...");
    const userExists = await authRepository.userExists(config.SUPER_ADMIN_EMAIL);
    if (!userExists) {
        await createSuperAdmin();
        console.log("SUPER ADMIN created.");
    } else {
        console.log("SUPER ADMIN already exists.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
```

Six things to notice, because each is a rule:

1. **It imports from `src/`.** That's why the seed command is `tsx ./prisma/seed.js` — it needs to resolve TypeScript files.
2. **It reuses `authRepository.createUser`**, the same function signup uses. Don't write a separate seeding DB client. If your repositories are good, seeds piggyback on them for free.
3. **It's idempotent.** Before creating, it checks whether the user already exists. Run once = create. Run twenty more times = silent no-op.
4. **Credentials come from `.env`.** Not hardcoded. The actual password lives in git-ignored `.env`.
5. **`process.exit(1)` on error** — without this, a failing seed inside `prisma migrate reset` can *look* like it succeeded when it didn't.
6. **SUPERADMIN can be created only this way.** There's no API endpoint to promote to SUPERADMIN. The *only* path is the seed. That's intentional — it prevents privilege escalation through any API surface.

### Running it

```bash
npm run db:seed
```

First run:

```
Starting database seed...
SUPER ADMIN created.
```

Second run:

```
Starting database seed...
SUPER ADMIN already exists.
```

That's the whole point.

### The nuke flow

```bash
npm run db:reset
```

Prisma drops the database, recreates it, reapplies every migration in order, then runs the seed. You end up exactly where a fresh clone starts. The fastest way out of "why is my DB in this weird half-migrated state?" hell.

---

# Part 3 — Environment, formatting, git hygiene

## `.env` and the `.env.example` contract

Create `.env` at the project root:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=root
DB_NAME=budget
DATABASE_URL=postgresql://postgres:root@localhost:5432/budget
JWT_SECRET=super_long_random_string_replace_me
SUPER_ADMIN_PASSWORD=SomeStr0ng!Pass
SUPER_ADMIN_NAME=Dev
SUPER_ADMIN_EMAIL=dev@example.com
```

Never commit `.env` to git. Never.

Now the file freshers forget constantly — `.env.example`:

```env
PORT=
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
DATABASE_URL=
SUPER_ADMIN_PASSWORD=
SUPER_ADMIN_NAME=
SUPER_ADMIN_EMAIL=
```

It's `.env`'s twin, with every key present and every value blank. It *is* committed.

Three reasons this file is non-negotiable:

**It's a contract.** A teammate clones your repo and instantly knows every variable they need. Without it, they're grep-ing your code to figure out what to set.

**It's the production-deploy checklist.** When you configure Railway / Render / Fly, `.env.example` is what you hand to future-you as "set these."

**It's the schema of your config.** It forces *you* to think about what needs configuring before you scatter `process.env.SOMETHING` across fifteen files.

> **The rule:** every time you add a new `process.env.FOO` anywhere in the codebase, open `.env.example` in the same commit and add `FOO=`. Muscle memory. If a PR adds a new env var without updating `.env.example`, the PR is broken.

---

## The cached `config.ts` pattern

```ts
// src/constants/config.ts
import dotenv from "dotenv";
dotenv.config();

export const config = {
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || "development",
    DB_USER: process.env.DB_USER || "postgres",
    DB_HOST: process.env.DB_HOST || "localhost",
    DB_NAME: process.env.DB_NAME || "budget",
    DB_PASSWORD: process.env.DB_PASSWORD || "root",
    DB_PORT: process.env.DB_PORT || 5432,
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/budget",
    JWT_SECRET: process.env.JWT_SECRET || "jwt_secret",
    SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || "superAdminPassword",
    SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME || "Dev",
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || "dev@example.com",
};
```

Everywhere else in the codebase:

```ts
import { config } from "../constants/config";
app.listen(config.PORT, ...);
```

Never `process.env.PORT` directly. Always `config.PORT`.

Why bother?

**Performance.** `process.env` is not a normal object — it's a proxy that does a system lookup on every property read. Measurable in hot paths. `config` is a plain object, read once at startup.

**Defaults in one place.** Every fallback is visible in one file. You don't have to grep the codebase to know what happens if `DB_HOST` is missing.

**Testability.** Mock the `config` module in tests with one line. Mocking `process.env` across a suite is a nightmare.

**IDE autocomplete.** `config.` shows you every setting. `process.env.` shows nothing — it's `any`.

**One place to add runtime validation.** Later, if you want "refuse to start if `JWT_SECRET` is missing in production," add that check inside `config.ts` and it protects the whole app.

> **"Why have defaults at all? Isn't that risky?"** The defaults are sensible local-dev values. In production every variable *is* set; the defaults exist so a new teammate can `npm run dev` without editing anything. Some teams prefer no defaults + fail loudly via Zod-validated env schemas — that's also valid. For a fresher project, defaults reduce friction.

---

## Prettier — every key, explained

```bash
npm install --save-dev prettier
```

`.prettierrc`:

```json
{
    "tabWidth": 4,
    "useTabs": true,
    "semi": true,
    "trailingComma": "all",
    "bracketSpacing": true,
    "bracketSameLine": false,
    "arrowParens": "always",
    "printWidth": 130,
    "endOfLine": "lf"
}
```

**`useTabs: true` + `tabWidth: 4`.** Tabs rendered as width 4. Tabs let readers set their own indent width for accessibility, and use one byte per indent instead of four. The counter-argument — spaces render consistently everywhere — is also valid. The *worst* answer is mixing both.

**`semi: true`.** Semicolons terminate statements. Skip them and you'll eventually hit the ASI trap:

```js
const a = foo()
[1,2,3].forEach(...)
// parsed as: foo()[1,2,3].forEach(...) → crash
```

Keep them.

**`trailingComma: "all"`.** A comma after the last item in any list. Diffs become cleaner — adding a new item touches one line instead of two.

**`bracketSpacing: true`.** `{ foo }` instead of `{foo}`.

**`arrowParens: "always"`.** `(x) => x + 1` instead of `x => x + 1`. Slightly more verbose but consistent — when you add a second parameter, you don't also have to add parens.

**`printWidth: 130`.** I use 130 instead of the default 80. Modern monitors are wide. 80 was a 1970s terminal constraint. 130 eliminates awkward `if (a && b && c)` wraps while still fitting on a laptop for side-by-side diffs.

**`endOfLine: "lf"`.** Unix line endings. Critical if your team is on mixed OSes — without this, git thinks every line changed on every save.

`.prettierignore`:

```
node_modules
dist
build
coverage
.next
```

Don't waste CPU formatting generated code.

Set up **Format On Save** in VS Code with the Prettier extension. You will never think about formatting again.

> **Prettier vs ESLint.** They solve different problems. Prettier = how code *looks* (spacing, quotes, commas). ESLint = how code *behaves* (unused vars, unreachable code, suspicious patterns). A production-grade setup has both. I left ESLint out of this project to keep scope manageable.

---

## `.gitignore` — and the Prisma trap

Start with the Node template from [toptal.com/developers/gitignore](https://www.toptal.com/developers/gitignore/api/node). It covers every obscure cache folder you'll never remember.

The entries that matter most:

| Pattern | Why |
|---|---|
| `node_modules/` | 30,000 files of dependencies. Reproducible via `npm install`. |
| `.env` and variants | Secrets. Never commit. |
| `dist/`, `build/` | Compiled outputs. Reproducible via `npm run build`. |
| `*.log`, `logs/` | Runtime noise, sometimes sensitive. |
| `*.tsbuildinfo` | TypeScript incremental build cache. Local-only. |
| `coverage/` | Regenerated on every test run. |

And the one that will bite you:

```gitignore
/src/generated/prisma
```

Here's the bug that sequence produces if you forget:

1. Run `npm run db:generate`.
2. Prisma writes thousands of generated client files into `src/generated/prisma/`.
3. You `git add .`.
4. Congratulations — you just committed an entire ORM client. PR diff is 50,000 lines.

The fix: git-ignore the generated folder *before* your first `db:generate`. Any generated artifact — Prisma client, GraphQL schema, compiled protobufs — belongs in `.gitignore`, not in git.

> **"So how does a teammate get the Prisma client?"** They run `npm run db:generate` after cloning. Ideally you wire this into `postinstall`:
> ```json
> "scripts": { "postinstall": "prisma generate" }
> ```
> Now `npm install` auto-generates the client. Zero manual steps.

Once the `.gitignore` is in place, take your first real commit:

```bash
git add .
git commit -m "chore: initial project scaffolding"
```

---

# Part 4 — The architecture that matters

This is the section that separates a hobby project from a real backend. The scaffolding so far is the stage. The architecture is the play.

## The request flow

Here's what happens when `POST /api/auth/signup` hits the server:

```
HTTP request
     │
     ▼
 app.ts              Global middleware (cors, json parsing)
     │
     ▼
 routes/auth         URL → controller. Auth middleware attached.
     │
     ▼
 controllers/auth    Parse req.body. Call service. Format ApiResponse.
     │
     ▼
 services/auth       Validate via schemas/. Apply business rules.
     │
     ▼
 repositories/user   Prisma queries. The ONLY layer that touches the DB.
     │
     ▼
 lib/prisma          The actual DB connection.
```

Each arrow is a one-way call. The repository never calls back up. The service never imports Express's `Request`/`Response`. The controller never writes SQL.

## The one rule

> **A layer can only import from the layer directly below it. Never skip layers. Never import upward.**

Violations to watch for:

- A controller that imports `prisma` directly — skipping service and repository.
- A service that imports `Request` from Express — business logic knowing HTTP exists.
- A repository that does role checks — that's business logic.

When you enforce this, three magical things happen:

**Tests become trivial.** Unit-test a service by passing plain objects and stubbing the repository. No HTTP mocks, no DB.

**Swapping pieces is cheap.** Moving from Prisma to Drizzle? Only the repository changes. Swapping Express for Fastify? Only routes and controllers.

**The code makes sense on a Friday at 5pm.** You always know where a given line of logic belongs.

---

## `routes/` — the thinnest layer

A route file is a URL-to-controller map with the right middleware in front of each endpoint. **It contains zero logic.**

```ts
// src/routes/auth.routes.ts
import express from "express";
import { signup, login } from "../controllers/auth.controllers";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

export default router;
```

A more interesting one with middleware:

```ts
// src/routes/user.routes.ts
import express from "express";
import {
    getMe, getAllUsers, getUserById, updateUser,
    updateUserRole, changePassword, reactivateUser, deleteUser,
} from "../controllers/user.controllers";
import { authenticate, authorize } from "../middlewares/auth";
import { ROLES } from "../constants/app.constants";

const router = express.Router();

router.get("/me", authenticate, getMe);
router.get("/", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), getAllUsers);
router.get("/:id", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), getUserById);
router.patch("/", authenticate, updateUser);
router.patch("/password", authenticate, changePassword);
router.patch("/:id/role", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), updateUserRole);
router.patch("/:id/reactivate", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), reactivateUser);
router.delete("/:id", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), deleteUser);

export default router;
```

Every row reads left-to-right as a sentence:

> `PATCH /:id/role` — first `authenticate`, then `authorize(ADMIN or SUPERADMIN)`, then `updateUserRole`.

When you want to know "who can touch this endpoint?", you read one line. No hunting.

---

## `controllers/` — HTTP in, HTTP out

A controller's job: translate between the HTTP world and the service world.

- Pull fields from `req.body` / `req.params` / `req.query`.
- Call exactly one service method.
- Wrap the result in `ApiResponse` and send.
- Catch errors, convert them into HTTP responses.

```ts
// src/controllers/auth.controllers.ts
const signup = async (req: Request, res: Response) => {
    try {
        const userData = {
            first_name: req.body.first_name?.trim(),
            last_name: req.body.last_name?.trim(),
            email: req.body.email?.trim(),
            phone_number: req.body.phone_number?.trim(),
            password: req.body.password?.trim(),
        };

        const user = await authService.signup(userData);
        const response = new ApiResponse(201, "User registered successfully", user);
        res.status(201).json(response);
    } catch (error) {
        if (error instanceof ApiError) {
            logger.warn("Signup failed", { code: error.code, message: error.message });
            return res.status(error.code).json(error);
        }
        logger.error("Signup — unexpected error", { error: (error as Error).message });
        res.status(500).json(new ApiError(500, "Internal server error"));
    }
};
```

Five things to notice.

**It pulls `req.body` fields one at a time and trims them.** The service receives a clean DTO, not the raw Express object. If I ever swapped frameworks, the service wouldn't notice.

**It calls exactly one service method** — `authService.signup(userData)`.

**It wraps success in `new ApiResponse(201, ..., user)`.** Every response has the same shape. No guessing whether today's API returns `{user}` or `{data: {user}}`.

**The try/catch handles two kinds of errors.** Known `ApiError` (our own class — status code already on it) and unknown (logged, flattened to a sanitized 500).

**Zero business logic.** No `if (role === "ADMIN")`, no DB calls. If a feature change requires editing a controller for anything other than I/O, something's wrong.

---

## `services/` — where the business lives

The service is the *only* place business rules exist.

```ts
// src/services/auth.services.ts
export const authService = {
    async signup(userData: any) {
        validateUserSignup(userData);

        const email = userData.email.toLowerCase();
        const name = userData.first_name + " " + userData.last_name;

        const userExists = await authRepository.userExists(email);
        if (userExists) {
            throw new ApiError(409, USER_FEEDBACK_MESSAGES.USER_ALREADY_EXISTS);
        }

        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = await authRepository.createUser(name, email, hashedPassword);

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name },
            process.env.JWT_SECRET!,
            { expiresIn: "10h" },
        );

        logger.info("User signed up", { userId: user.id, email: user.email });

        return { token, id: user.id, name: user.name, email: user.email, role: user.role };
    },

    async login(credentials: any) {
        validateUserLogin(credentials);
        const email = credentials.email.toLowerCase();

        const user = await authRepository.getUserByEmail(email);
        if (!user) throw new ApiError(401, USER_FEEDBACK_MESSAGES.USER_NOT_FOUND);

        const isPasswordMatch = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isPasswordMatch) {
            logger.warn("Failed login attempt", { email });
            throw new ApiError(401, USER_FEEDBACK_MESSAGES.INVALID_CREDENTIALS);
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name },
            process.env.JWT_SECRET!,
            { expiresIn: "10h" },
        );

        logger.info("User logged in", { userId: user.id, email: user.email });

        return { token, role: user.role, name: user.name };
    },
};
```

Every rule the app enforces lives here. Email must be valid. Password must meet complexity. Email is normalized to lowercase. Duplicate email → 409. Passwords are bcrypted at cost 10. Tokens expire in 10 hours. Wrong password → warn-level log + 401.

The service **throws `ApiError`** when a rule is violated. It does not call `res.status()`. That's the controller's job.

This separation is what lets you reuse the same service from the seed script, a CLI, or a background worker — none of which have a `res` object.

---

## `repositories/` — the only place SQL exists

```ts
// src/repositories/user.repositories.ts (abridged)
export const userRepository = {
    async userExists(email: string) {
        try {
            const user = await prisma.user.findUnique({ where: { email } });
            return !!user;
        } catch (error) {
            logger.error("DB error — userExists", { email, error: (error as Error).message });
            throw error;
        }
    },

    async createUser(name: string, email: string, hashedPassword: string) {
        try {
            return await prisma.user.create({ data: { name, email, passwordHash: hashedPassword } });
        } catch (error) {
            logger.error("DB error — createUser", { email, error: (error as Error).message });
            throw error;
        }
    },

    async getAllUsers() {
        try {
            return await prisma.user.findMany({ omit: { passwordHash: true } });
        } catch (error) {
            logger.error("DB error — getAllUsers", { error: (error as Error).message });
            throw error;
        }
    },

    async updateUserRole(id: string, role: ROLES) {
        try {
            return await prisma.user.update({ where: { id }, data: { role }, omit: { passwordHash: true } });
        } catch (error) {
            logger.error("DB error — updateUserRole", { id, role, error: (error as Error).message });
            throw error;
        }
    },

    async softDeleteUser(id: string) {
        try {
            return await prisma.user.update({ where: { id }, data: { isActive: false }, omit: { passwordHash: true } });
        } catch (error) {
            logger.error("DB error — softDeleteUser", { id, error: (error as Error).message });
            throw error;
        }
    },
};
```

The rules I follow:

**No business logic.** Don't check "is the user an admin?" here. That's the service.

**Use Prisma's `omit` to never leak `passwordHash`.** Every read returning a user has `omit: { passwordHash: true }`. The service and controller don't get a chance to accidentally send it to the client.

**One method per use case, not per field.** `softDeleteUser(id)` beats exposing raw `update({ where, data })`. Intent is in the name.

**Wrap in try/catch and log.** Every DB error lands in the logger with context (which email, which ID). When your production DB throws at 3am, future-you will cry tears of gratitude.

**Re-throw after logging.** Don't swallow — the service still needs to know so it can throw a proper `ApiError`.

> **"Isn't the try/catch repetitive?"** Yes. You can factor it into a `withDbErrorLog` higher-order function. I haven't — the repetition is obvious and I value readable boilerplate over clever abstractions in a starter. When you feel the itch in your own project, factor it.

---

## Where does this code go? A decision table

When adding a feature and wondering where the code goes:

| You're writing... | It belongs in... |
|---|---|
| `router.post("/x", ...)` | `routes/` |
| `res.status(400).json(...)` | `controllers/` |
| `req.body.foo?.trim()` | `controllers/` |
| `if (user.role !== ADMIN)` | `services/` |
| `bcrypt.hash(password, 10)` | `services/` |
| `jwt.sign(...)` | `services/` |
| `throw new ApiError(409, ...)` | `services/` |
| `prisma.user.findMany(...)` | `repositories/` |
| A reusable rule like `isEmailValid(email)` | `schemas/` or `utils/` |
| JWT verification on every request | `middlewares/` |
| The PrismaClient instance itself | `lib/prisma.ts` |
| The Winston logger itself | `lib/logger.ts` |
| `const ROLES = { ... }` | `constants/app.constants.ts` |
| `"User already exists"` | `constants/app.messages.ts` |
| A helper like `trimStrings(obj)` | `utils/common_functions.ts` |
| `class ApiError extends Error` | `utils/api_error.ts` |

Memorize this. It answers most "where does this go?" questions in your first year.

---

# Part 5 — The cross-cutting layers

Not every file fits neatly into the vertical request flow. Some code is horizontal — used by multiple layers. That's what these folders are for.

## `lib/` — the singletons

Exactly two files: `prisma.ts` (covered earlier) and `logger.ts` (coming next). The rule for `lib/`: things instantiated once and shared across the whole app. Singletons. Long-lived clients.

If you later add a Redis client, a Stripe client, an email client — they all live in `lib/`.

---

## `middlewares/` — request-pipeline functions

```ts
// src/middlewares/auth.ts
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        logger.warn("Request rejected — no token provided", { path: req.path });
        return res.status(401).json({ error: "Access denied. No token provided." });
    }
    try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string; name: string; role: ROLES };
        req.user = decoded;
        next();
    } catch (err) {
        logger.warn("Request rejected — invalid token", { path: req.path, error: (err as Error).message });
        res.status(400).json({ error: "Invalid token", err });
    }
};

export const authorize = (roles: ROLES[]) => (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
        logger.warn("Access forbidden — insufficient role", {
            path: req.path, userRole: req.user.role, requiredRoles: roles,
        });
        return res.status(403).json({ error: "Forbidden. You do not have access." });
    }
    next();
};
```

**`authenticate`** pulls the JWT from `Authorization: Bearer <token>`, verifies it, attaches the decoded payload to `req.user`, and calls `next()`. On failure, it 401s and does not call `next()` — the pipeline stops there.

**`authorize([roles])`** is a higher-order function: it takes allowed roles and *returns* a middleware. That's why you see `authorize([ROLES.ADMIN])` in routes — it's a function call that produces the actual middleware. Lets you configure per-route without writing a new middleware for every role combination.

> Order matters. `authenticate` *must* run before `authorize` — `authorize` reads `req.user.role`, which `authenticate` sets. Flip the order and `req.user` is undefined when `authorize` reads it.

---

## `constants/`

Three files:

### `app.constants.ts` — enums and numeric limits

```ts
const REGEX = {
    EMAIL: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/,
    PHONE: /^[1-9]\d{9}$/,
};

const LIMITS = {
    NAME_MIN: 2,
    NAME_MAX: 100,
    PASSWORD_MIN: 8,
};

enum ROLES { SUPERADMIN = "SUPERADMIN", ADMIN = "ADMIN", ANALYST = "ANALYST", VIEWER = "VIEWER" }
enum RECORD_TYPES { INCOME = "INCOME", EXPENSE = "EXPENSE" }

export { REGEX, LIMITS, ROLES, RECORD_TYPES };
```

Rule: any magic number or string that appears in more than one place becomes a constant. The first time you're tempted to write `if (name.length < 2)` in two files, hoist it to `LIMITS.NAME_MIN`.

### `app.messages.ts` — user-facing strings

```ts
const USER_FEEDBACK_MESSAGES = {
    USER_CREATED_SUCCESS: "User created successfully",
    USER_ALREADY_EXISTS: "User already exists",
    INVALID_CREDENTIALS: "Invalid credentials",
    // ...
};
```

Centralizing messages pays off three ways:

- **i18n later.** One dictionary to translate instead of grep-ing "User already" across the codebase.
- **Consistency.** You never write "User doesn't exist" in one place and "User not found" in another.
- **Review signal.** A reviewer sees in one file whether a new message matches the existing tone.

### `config.ts` — already covered

---

## `utils/`

Pure, stateless helpers. In this project:

- `api_error.ts` — the `ApiError` class.
- `api_response.ts` — the `ApiResponse` class.
- `common_functions.ts` — `parseQueryParam`, `clamp`, `validatePagination`, `trimStrings`.

```ts
const validatePagination = (req: Request, maxLimit: number = 100): PaginationParams => {
    const page = clamp(parseQueryParam(req.query.page, 1), 1, Number.MAX_SAFE_INTEGER);
    const limit = clamp(parseQueryParam(req.query.limit, 1), 1, maxLimit);
    return { page, limit, offset: (page - 1) * limit };
};
```

Rule for `utils/`: pure and reusable. If it touches `prisma`, it belongs in a repository. If it touches `res.json`, it belongs in a controller. If it encodes business rules, it belongs in a service. What's left — date formatters, pagination parsers, string trimmers — is `utils/`.

---

## `types/` — TypeScript global augmentation

Tiny file, outsized importance:

```ts
// src/types/express.d.ts
import { ROLES } from "../constants/app.constants";

declare global {
    namespace Express {
        interface Request {
            user: {
                id: string;
                name: string;
                role: ROLES;
            };
        }
    }
}
```

Remember how `authenticate` sets `req.user = decoded`? By default, TypeScript doesn't know about that — `req.user` would be a type error.

This file extends the built-in `Express.Request` interface. Now in every controller:

```ts
req.user.id       // ✅ typed string
req.user.role     // ✅ typed ROLES enum
req.user.nope     // ❌ compile error
```

The `declare global` + `namespace` pattern is the standard TypeScript way to augment third-party types. Bookmark it — you'll use it for every library you extend.

You don't need to `import` this file anywhere. TypeScript picks up `.d.ts` files inside `src/` automatically.

---

# Part 6 — The production concerns

## Why `console.log` is a liability

`console.log` is fine while you're learning. The moment you ship something that runs for more than a day, it stops being fine.

No levels. Everything is the same priority — no way to filter errors from noise.

No timestamps. Good luck correlating a bug report at "around 3pm yesterday" to a flat stream of log lines.

No structured metadata. `console.log("user signed up", userId, email)` produces a string to grep. `logger.info("user signed up", { userId, email })` produces JSON you can query.

No context. You can't tell which file a line came from.

Can't be turned down. You don't want every debug log hitting stdout in production.

A real logger fixes all five.

---

## Winston, configured

```bash
npm install winston
```

```ts
// src/lib/logger.ts
import winston from "winston";

const { combine, timestamp, colorize, printf } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...extras }) => {
    const extraStr = Object.keys(extras).length
        ? " " + JSON.stringify(extras)
        : "";
    return `\n[${level}]: ${timestamp} ${message}${extraStr}`;
});

const logger = winston.createLogger({
    level: "debug",
    format: combine(
        colorize(),
        timestamp({ format: "HH:mm:ss DD-MM-YYYY" }),
        logFormat,
    ),
    transports: [new winston.transports.Console()],
});

export function getLogger(name: string) {
    return logger.child({ service: name });
}

export default logger;
```

**The format pipeline.** Winston formats compose with `combine(a, b, c)` applied in order. `colorize()` adds ANSI colors (info = green, warn = yellow, error = red). `timestamp()` adds a formatted time field. `logFormat` is the final stringifier.

**The custom printf.** The `...extras` spread catches every extra field you pass — the `{ userId, email }` in a log call *plus* the `service` name from child loggers — and dumps them as JSON. This is what makes logs searchable.

**`level: "debug"`.** Minimum level logged. In production, bump to `"info"` or `"warn"`. Winston levels from verbose to critical: `silly → debug → verbose → info → http → warn → error`.

**Transports.** One transport = one destination. `Console()` goes to stdout. Winston also has File, Http, and third-party transports for CloudWatch, Datadog, etc.

**Child loggers** — the piece that makes this useful at scale:

```ts
// top of any file
import { getLogger } from "../lib/logger";
const logger = getLogger("auth.service");

// anywhere below
logger.info("User signed up", { userId, email });
```

Produces a line that includes `"service": "auth.service"` automatically. When you have 40 files logging, the `service` field lets you filter to one file with a single query.

Naming convention: `<filename>.<layer>`. Examples: `auth.controller`, `auth.service`, `user.repository`, `auth.middleware`. Consistent naming makes logs read like a call graph.

### Level discipline

| Level | When | Example |
|---|---|---|
| `debug` | Verbose detail for active debugging | `"Entering login flow"` |
| `info` | Expected events worth knowing happened | `"User signed up"` |
| `warn` | Unexpected but recoverable, usually the caller's fault | `"Failed login attempt"`, `"Invalid token"` |
| `error` | Something we didn't plan for — needs investigation | `"DB connection lost"` |

Rule of thumb: if you'd page someone at 3am for it, it's `error`. If it's a wrong password, it's `warn`. If it's a normal business event, it's `info`.

### Never log secrets

```ts
logger.info("User signed up", { userId: user.id, email: user.email });
```

I log the ID and email. I do *not* log the password, the hash, the JWT, or the Bearer header. Never put these in a log:

- Passwords (plain or hashed)
- JWT tokens
- API keys
- Full credit card numbers
- Full Bearer headers

The moment a log aggregator leaks, those go viral.

---

## The `ApiError` / `ApiResponse` contract

Every response from the API — success or failure — has the same shape. That's the contract.

### `ApiResponse<T>`

```ts
class ApiResponse<T> {
    code: number;
    message: string;
    data: T;

    constructor(statusCode: number, message: string = "Success", data: T) {
        this.code = statusCode;
        this.message = message;
        this.data = data;
    }
}
```

Usage:

```ts
const response = new ApiResponse(201, "User registered successfully", user);
res.status(201).json(response);
```

Wire format:

```json
{
    "code": 201,
    "message": "User registered successfully",
    "data": { "id": "...", "email": "...", "token": "..." }
}
```

The frontend team now writes one TypeScript type and one fetch wrapper for every response. The generic `<T>` gives autocomplete on `.data`.

### `ApiError`

```ts
class ApiError extends Error {
    code: number;
    message: string;
    errors: string[];
    constructor(code: number, message: string = "Something went wrong", errors: string[] = []) {
        super();
        this.code = code;
        this.message = message;
        this.errors = errors;
        Error.captureStackTrace(this, this.constructor);
    }
}
```

Three fields: `code` (HTTP status), `message` (human-readable), `errors` (optional array for field-level details).

Extending `Error` matters because:

1. `instanceof` checks work correctly in `try/catch`.
2. `Error.captureStackTrace` scrubs the stack so the *throw site* is at the top — not the constructor.

### The try/catch pattern

```ts
try {
    // happy path
} catch (error) {
    if (error instanceof ApiError) {
        logger.warn("...", { code: error.code, message: error.message });
        return res.status(error.code).json(error);
    }
    logger.error("... unexpected", { error: (error as Error).message });
    res.status(500).json(new ApiError(500, "Internal server error"));
}
```

Three flows:

**Happy path** — build `ApiResponse`, send, done.

**Known error (`ApiError`)** — thrown by our own code. HTTP status is already on it. Log at `warn` (user-caused, not system-caused) and send the error to the client.

**Unknown error** — DB crash, third-party API, my own typo. Log at `error` with the full message but **never send the raw error to the client**. Send a sanitized 500. Real details stay in server logs.

That last point is a security rule. **Never leak internal errors.** A stack trace saying "Postgres at db.acme-internal.local" is a gift to attackers.

### Status code conventions

| Code | When |
|---|---|
| 200 | GET / update success |
| 201 | POST that created a new resource |
| 204 | DELETE success (no body) |
| 400 | Validation failed |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource doesn't exist |
| 409 | Conflict — e.g. duplicate email |
| 500 | Something broke, our fault |

Stick to these. Don't get creative.

> **Future refactor.** The try/catch in every controller is repetitive. Express 5's native async error handling + a global error middleware + `asyncHandler(fn)` wrapper lets you drop the try/catch entirely. Worth doing once you're comfortable — I left the explicit version in this project because it's obvious for a first reading.

---

## Zod — runtime validation you can trust

TypeScript types vanish at runtime. That means:

```ts
interface SignupDTO { email: string; password: string; }

function signup(data: SignupDTO) {
    // data.email is typed as string in the IDE
    // but at runtime, data might be: { evilPayload: "<script>" }
}
```

A caller can send anything in `req.body`. `SignupDTO` is a wish, not a guarantee. You need runtime validation.

The options: roll your own (tedious), `express-validator` (ugly chain API), `joi` (not TS-native), `yup` (similar to Zod), or **`zod`** — TypeScript-native, schemas infer types, great errors, composable.

```bash
npm install zod
```

### Reusable sub-schemas

```ts
// src/schemas/user.schemas.ts
import * as z from "zod/v4";

const emailSchema = z.email(USER_VALIDATION_ERRORS.EMAIL_INVALID)
    .transform((val) => val.toLowerCase());

const passwordSchema = z
    .string()
    .min(LIMITS.PASSWORD_MIN, USER_VALIDATION_ERRORS.PASSWORD_LENGTH_INVALID)
    .regex(REGEX.PASSWORD, USER_VALIDATION_ERRORS.PASSWORD_INVALID);

const nameSchema = z
    .string()
    .min(LIMITS.NAME_MIN, USER_VALIDATION_ERRORS.NAME_MIN)
    .max(LIMITS.NAME_MAX, USER_VALIDATION_ERRORS.NAME_MAX);
```

Three leaf schemas, reusable.

The `email` schema has a `.transform(v => v.toLowerCase())` — after validation, data is transformed. `"John@X.com"` comes out as `"john@x.com"` automatically. The service never sees mixed-case emails.

### Composing into objects

```ts
const UserSignupSchema = z.object({
    first_name: nameSchema,
    last_name: nameSchema,
    email: emailSchema,
    phone_number: z.string().regex(REGEX.PHONE, "Phone number must be 10 digits and cannot start with 0"),
    password: passwordSchema,
});
```

Reads like English. Also rejects extra fields by default — no, you can't sneak `role: "ADMIN"` onto signup. One of Zod's killer security features.

### The `safeParse` + throw pattern

```ts
const validateUserSignup = (user: unknown) => {
    const result = UserSignupSchema.safeParse(trimStrings(user));
    if (!result.success) {
        const errors = result.error.issues.map((i) => i.message);
        throw new ApiError(400, "User registration validation failed", errors);
    }
    return result.data;
};
```

**`safeParse`, not `parse`.** `parse` throws a `ZodError` on failure. `safeParse` returns `{ success, data, error }` — forces me to explicitly control the error type (my `ApiError`, not a raw `ZodError`).

**`trimStrings` first.** `"  john@x.com  "` shouldn't fail email validation because the user hit spacebar.

**Parameter type is `unknown`, not `any`.** `unknown` means "I don't know the shape, and the compiler won't let me access properties without validating first." The correct type for untrusted input.

**Return `result.data`.** After validation, you have a typed, trimmed, transformed object. The service uses it directly with full type safety.

**Throw `ApiError(400, ..., errors[])`.** Zod's `.issues` has one entry per failed rule. Map them to messages and pass as the `errors` array. A form with three invalid fields returns all three at once — frontend renders them together instead of "fix one, submit, repeat."

### Where validation runs

At the top of every service method that accepts external data:

```ts
async signup(userData: any) {
    validateUserSignup(userData);   // <-- first line
    // business logic
}
```

**Not in the controller.** The service is the security boundary. If you later expose the same logic through a GraphQL resolver or a CLI, validation still runs — because the service runs.

### The killer trick: infer types from schemas

```ts
const UserSignupSchema = z.object({ ... });
type UserSignupDTO = z.infer<typeof UserSignupSchema>;
```

That type is generated *from* the schema. Add a field → the type updates. Replace `userData: any` with `userData: UserSignupDTO` and now the IDE autocompletes every field, TypeScript catches typos, refactors across files stay safe.

Once you get used to this, manual `interface`s for API input feel primitive.

---

# Part 7 — Ship it

## End-to-end command order

The complete sequence, from empty folder to running server:

```bash
# Init
mkdir finance-dashboard && cd finance-dashboard
git init
npm init -y

# TypeScript + dev runner
npm install --save-dev typescript @types/node tsx
npx tsc --init   # then edit tsconfig.json

# Prettier
npm install --save-dev prettier
# create .prettierrc and .prettierignore

# Express stack
npm install express cors dotenv
npm install --save-dev @types/express @types/cors

# Auth
npm install bcrypt jsonwebtoken
npm install --save-dev @types/bcrypt @types/jsonwebtoken

# Validation + logging
npm install zod winston

# Prisma
npm install --save-dev prisma
npm install @prisma/client @prisma/adapter-pg pg
npm install --save-dev @types/pg
npx prisma init --datasource-provider postgresql
# edit schema.prisma, create prisma.config.ts

# Env
cp .env.example .env
# fill in values

# DB + run
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

`http://localhost:5000/health` should now return:

```json
{ "status": "Server is Up and Running!" }
```

### After cloning — six commands

This is the bar I hold every project to:

```bash
git clone <repo-url>
cd <repo-name>
npm install
cp .env.example .env   # then fill in values
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

If a teammate needs more than this to get your project running, your README has failed.

### Deploying to production

- **Build command:** `npm ci && npm run db:generate && npm run build`
- **Start command:** `npm run db:migrate:prod && npm start`

Most platforms (Render, Railway, Fly) bake this into two fields. Done.

---

## Postman and API docs

A backend without API documentation is a blocking task for every frontend dev on your team.

I commit a **Postman collection** as a JSON file to the repo. Any teammate can import it and have every endpoint pre-configured with bodies, auth, and environment variables. First API call after cloning: one click instead of ten minutes piecing the URL, body, and headers together from reading code.

To create one: work through your API in Postman while building it (which is already the natural dev loop), save each request into a collection, export as Collection v2.1, commit the JSON.

I pair this with a handwritten `API.md` — one row per endpoint, with method, path, auth requirement, request/response example, and notes. Postman is interactive; markdown is readable. Both serve a purpose.

For larger projects, generate an OpenAPI spec from your Zod schemas with [zod-to-openapi](https://github.com/asteasolutions/zod-to-openapi). You get Swagger UI, codegen for SDKs, type-safe contracts across languages. More setup, more payoff.

---

## What I deliberately left out

This guide takes you from zero to production-*shaped*. Not battle-hardened. Here's what's missing, in rough priority — each a future article:

**Rate limiting.** Nothing stops a brute-force attack on `/login`. Add [`express-rate-limit`](https://www.npmjs.com/package/express-rate-limit) with a tight policy on `/auth/*`.

**Centralized error middleware.** Replace every controller try/catch with a `throw` + Express 5's native async support. Controllers get 30% shorter.

**Refresh tokens.** My JWT expires in 10 hours and users re-login. Real apps use short-lived access tokens (15 min) + long-lived refresh tokens (30 days, HTTP-only cookie). Significantly more secure.

**Integration tests.** `vitest` + `supertest` + a test Postgres in Docker. This is why we split `app.ts` and `index.ts` — so tests can import `app` without binding a port.

**ESLint.** Catches bugs Prettier doesn't. Pair with `eslint-config-prettier` so the two don't fight.

**Dockerfile + docker-compose.** Teammate doesn't need Postgres installed — `docker compose up` and the whole stack is live. Huge onboarding win.

**CI/CD.** GitHub Actions on every PR: `npm ci`, `format:check`, `build`, `test`. Deploy on merge to main.

**Observability.** Metrics (Prometheus), tracing (OpenTelemetry), alerts (PagerDuty, Slack). Pointless for a toy — essential when real users depend on you.

**Secret management.** For production, don't paste secrets into `.env` on your server. Use the platform's secret manager (Railway, Fly, AWS, Doppler). The rule: secrets never touch disk as plaintext.

**Global handlers for uncaught async rejections.** `process.on("unhandledRejection", ...)` + `process.on("uncaughtException", ...)` as a safety net. Should almost never fire, but when it does you want a log line instead of a silent dead process.

---

## Closing

If you've read this far, you have the full mental model:

- **The scaffolding** — `package.json`, `tsconfig.json`, `.env.example`, `.prettierrc`, `.gitignore`.
- **The runtime** — `tsx watch` in dev, `tsc` + `node` in prod.
- **The database layer** — Prisma schema, migrations, connection pooling, singleton, idempotent seeding.
- **The architecture** — routes → controllers → services → repositories, each with exactly one job.
- **The cross-cutting concerns** — structured logger, consistent `ApiError` / `ApiResponse`, Zod at the service boundary, JWT middleware.

None of this is novel. Every piece is a well-known pattern. The value isn't in any single piece — it's in seeing them assembled into a coherent shape, with clear rules about what goes where and why.

Copy the structure. Fork it. Rename "finance records" to whatever you're actually building. Ship it. Then come back and add rate limiting, tests, Docker, CI — the next layer of polish.

After about three projects, this stops being something you copy and becomes something you think in. That's the goal.

Happy shipping.

---

*This article walks through the exact structure of my finance-dashboard backend on GitHub. Clone it, read it alongside this article, and the abstract explanations become concrete.*

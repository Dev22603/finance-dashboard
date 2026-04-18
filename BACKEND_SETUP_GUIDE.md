# Build a Production-Grade Node.js Backend Like I Do — From `npm init` to a Layered Express + TypeScript + Prisma App

*A step-by-step, no-step-skipped walkthrough of the exact setup I use, the exact files I write, and the exact reasons behind every decision.*

---

## Why I Wrote This

If you are a fresher — a college student, a bootcamp grad, a self-taught developer about to ship your first "real" backend — you have probably felt this exact frustration:

> "Every tutorial gives me a `server.js` with `app.listen`, calls it done, and leaves me standing in the rain wondering where the rest of the backend went."

This guide is the opposite of that. I will walk you through **every single file** in a real backend I shipped — a finance dashboard with roles, JWT auth, Postgres, Prisma, Zod, Winston logging, centralized error handling, and a strict controller / service / repository split. I will explain **what each command does**, **why each file exists**, **what the alternatives were**, and **why I picked what I picked**. Copy this setup. Steal it. Fork it. Make it yours. That is the point.

If you follow this guide in order, you will end up with a folder that looks like the repo I actually ship, not a toy.

---

## Table of Contents

1. [Who This Is For](#1-who-this-is-for)
2. [What We Are Building (Big Picture)](#2-what-we-are-building-big-picture)
3. [Prerequisites](#3-prerequisites)
4. [Step 0 — Create the Folder and Init Git](#4-step-0--create-the-folder-and-init-git)
5. [Step 1 — `npm init`: The First Real Command](#5-step-1--npm-init-the-first-real-command)
6. [Step 2 — TypeScript Setup (and Why the Whole `tsconfig.json` Matters)](#6-step-2--typescript-setup-and-why-the-whole-tsconfigjson-matters)
7. [Step 3 — The Dev Runner: Why I Use `tsx watch` (Not `ts-node`, Not `nodemon`)](#7-step-3--the-dev-runner-why-i-use-tsx-watch-not-ts-node-not-nodemon)
8. [Step 4 — The Entry-Point Split: `index.ts` vs `app.ts`](#8-step-4--the-entry-point-split-indexts-vs-appts)
9. [Step 5 — The `package.json` Scripts, Line by Line](#9-step-5--the-packagejson-scripts-line-by-line)
10. [Step 6 — Prisma: Schema, Client, Migrations, Pooling](#10-step-6--prisma-schema-client-migrations-pooling) *(Turn 2)*
11. [Step 7 — Database Seeding (What, Why, and the Idempotent Pattern)](#11-step-7--database-seeding) *(Turn 2)*
12. [Step 8 — Environment Variables: `.env`, `.env.example`, `dotenv`, and the Cached `config.ts` Pattern](#12-step-8--environment-variables) *(Turn 3)*
13. [Step 9 — Prettier: `.prettierrc`, `.prettierignore`, and Why I Use Tabs](#13-step-9--prettier) *(Turn 3)*
14. [Step 10 — `.gitignore` Hygiene (and the Prisma-Generated Folder Trap)](#14-step-10--gitignore-hygiene) *(Turn 3)*
15. [Step 11 — The Layered Architecture: Routes → Controllers → Services → Repositories](#15-step-11--the-layered-architecture) *(Turn 4)*
16. [Step 12 — The Cross-Cutting Layers: `lib/`, `utils/`, `constants/`, `types/`, `middlewares/`, `schemas/`](#16-step-12--the-cross-cutting-layers) *(Turn 4)*
17. [Step 13 — Winston Logger: Why Not `console.log`](#17-step-13--winston-logger) *(Turn 5)*
18. [Step 14 — Error Handling: `ApiError`, `ApiResponse`, and the Controller Try/Catch Pattern](#18-step-14--error-handling) *(Turn 5)*
19. [Step 15 — Zod: Input Validation You Can Trust](#19-step-15--zod-input-validation) *(Turn 5)*
20. [Step 16 — The End-to-End Command Order (The "Clone-and-Run" Cheat Sheet)](#20-step-16--end-to-end-command-order) *(Turn 6)*
21. [Step 17 — Postman / API Docs Workflow](#21-step-17--postman-and-api-docs) *(Turn 6)*
22. [What I Deliberately Left Out (And Would Add Next)](#22-what-i-left-out) *(Turn 6)*

---

## 1. Who This Is For

You have written some JavaScript. You know what a function is, you have maybe followed a `express + mongoose` YouTube tutorial, and now you want to build something that doesn't collapse the moment you add a second feature.

You do **not** need to know TypeScript, Prisma, or even how Postgres is installed. I will hold your hand on all of that.

You **do** need:

- Node.js installed (`node --version` should print v20 or newer).
- A code editor. I use VS Code.
- A terminal you are not afraid of.
- A working Postgres database — local, Docker, or a free cloud one (Neon, Supabase, Railway). If you don't have one, just go to [neon.tech](https://neon.tech), sign up, and copy the connection string. That's it.

Everything else, we build from scratch.

---

## 2. What We Are Building (Big Picture)

The backend we are recreating is a **single-firm finance dashboard**. The domain does not matter — swap "finance records" for "blog posts," "todos," or "support tickets" and the scaffolding is identical. The shape is what you are learning:

- **Express v5** for HTTP routing.
- **TypeScript** because `req.body.amount` should not silently be `undefined` in production.
- **PostgreSQL** via **Prisma v7** for data access.
- **JWT + bcrypt** for authentication.
- **Zod v4** for validating the garbage users throw at you.
- **Winston** for logging, because `console.log` is a liability.
- A strict **Routes → Controllers → Services → Repositories** layering so that when the app grows, it does not become a `server.js` with 2,000 lines of spaghetti.

Here is the final `src/` layout you will end up with. Keep this picture in your head the whole time:

```
src/
├── index.ts                  Entry point — starts the server
├── app.ts                    Express app wiring — middleware + routes
├── routes/                   URL → controller mapping (thin)
├── controllers/              HTTP I/O — parse request, return response
├── services/                 Business logic — the actual rules
├── repositories/             Database queries — Prisma calls live here
├── middlewares/              Auth, error handling, etc.
├── schemas/                  Zod validation schemas
├── constants/                Enums, messages, config
├── utils/                    ApiError, ApiResponse, small helpers
├── lib/                      Prisma client, logger — cross-cutting singletons
├── types/                    TypeScript global augmentations
└── generated/                Prisma-generated client (git-ignored)
```

Each folder has **one job**. That discipline is the single most valuable thing in this guide — more valuable than any specific library choice.

---

## 3. Prerequisites

Make sure these return something sane before you continue:

```bash
node --version     # v20.x or newer
npm --version      # v10.x or newer
git --version      # anything recent
```

If `node` is missing, grab it from [nodejs.org](https://nodejs.org). Pick the LTS release.

> **Sidebar — Node version managers.** On a serious dev machine I recommend `nvm` (Linux/Mac) or `fnm` (cross-platform, fast). They let you switch Node versions per project. For a first backend, the vanilla Node installer is fine.

---

## 4. Step 0 — Create the Folder and Init Git

```bash
mkdir finance-dashboard
cd finance-dashboard
git init
```

Init git **first**, before `npm init`, before anything. Two reasons:

1. The very first `git add . && git commit -m "init"` becomes a "before" snapshot. If you mess up in the next ten minutes, `git restore .` rescues you.
2. `npm install` creates `node_modules/` — a folder with 30,000 files you never want in git. If git is already initialized when you first install, you have the opportunity to add a `.gitignore` before the disaster commit happens.

Create a barebones `.gitignore` right now so you don't forget later. I'll give you the full one in Step 10, but for now:

```bash
echo "node_modules" > .gitignore
echo "dist" >> .gitignore
echo ".env" >> .gitignore
```

---

## 5. Step 1 — `npm init`: The First Real Command

```bash
npm init -y
```

That's it. The `-y` flag says "take every default, I'll fix it later." It produces a minimal `package.json`:

```json
{
  "name": "finance-dashboard",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": { "test": "echo \"Error: no test specified\" && exit 1" },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
```

### What `package.json` actually is

It is the manifest of your project. Three things matter right now:

- **`dependencies`** — packages your code imports at runtime (e.g. `express`). These ship to production.
- **`devDependencies`** — packages only needed while developing or building (e.g. `typescript`, `tsx`, `prisma`). They are not shipped to production (well, `prisma` CLI ships, but you get the idea).
- **`scripts`** — named shell commands you invoke with `npm run <name>`. This is where the magic lives.

We will fill all of these up as we go. Here is my final version for reference — don't copy it yet, we'll build up to it line by line:

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

Notice something important: I changed `"main"` from `"index.js"` to `"dist/index.js"`. This is because our TypeScript is going to **compile down** to a `dist/` folder, and `main` should point at the compiled output — that's what gets run in production.

> **Sidebar — `npm` vs `pnpm` vs `yarn` vs `bun`.**
> - **`npm`** — ships with Node, works everywhere, zero config. Boring, reliable, correct default for this guide.
> - **`pnpm`** — much faster installs, strict dependency graph, symlinked `node_modules`. I use it on every real project, but it adds one extra install step for a fresher.
> - **`yarn`** — had its moment around 2017. Today, pick `npm` or `pnpm` over `yarn`.
> - **`bun`** — the new cool kid. Installs fast, runs TS natively, has its own runtime. Promising, but still has rough edges in 2026 with Prisma + native modules.
> - **My pick for this guide: `npm`.** Zero cognitive overhead for a beginner. Swap to `pnpm` later when you feel the pain of `npm install` being slow.

### Every dependency, explained

| Package | Why it's here |
|---|---|
| `express` | The HTTP router. Could be Fastify/Hono/Koa — Express is the safe default. |
| `cors` | Lets your frontend (on a different port) actually talk to this backend. |
| `dotenv` | Loads `.env` into `process.env` so you don't commit secrets to git. |
| `bcrypt` | Password hashing. **Never** store plain passwords. `bcrypt.hash` does the slow, salted hashing you need. |
| `jsonwebtoken` | Issues and verifies JWT auth tokens. |
| `zod` | Runtime validation of request bodies. TypeScript types disappear at runtime — Zod fills that gap. |
| `winston` | Structured logging. Way better than `console.log`. |
| `pg` | Postgres driver (used under the Prisma adapter). |
| `@prisma/client` | The generated ORM client you actually call in code. |
| `@prisma/adapter-pg` | The Prisma v7 adapter that lets Prisma use your own `pg.Pool` (crucial for connection pooling). |
| `prisma` (devDep) | The CLI + migration engine. |
| `typescript` (devDep) | The compiler. |
| `tsx` (devDep) | The dev-mode TS runner with hot reload. |
| `@types/*` (devDep) | Type declarations for packages that ship as plain JS. |

Don't install any of these yet — we install them when we need them, so you see each step in context.

---

## 6. Step 2 — TypeScript Setup (and Why the Whole `tsconfig.json` Matters)

### Install TypeScript

```bash
npm install --save-dev typescript @types/node
```

- `typescript` — the compiler (`tsc`).
- `@types/node` — type definitions for Node's built-ins (`fs`, `path`, `process`, etc.). Without this, TypeScript has no idea what `process.env` is.

> **Sidebar — "Why `--save-dev`?"** Because TypeScript is a compile-time tool. Production runs the compiled JavaScript in `dist/`. It does not need the compiler at runtime. The `-D` / `--save-dev` flag puts it in `devDependencies`, which `npm install --production` would skip.

### Generate `tsconfig.json`

```bash
npx tsc --init
```

This gives you a `tsconfig.json` with about 80 commented-out options. Mine is trimmed down to what matters. Here is the exact file I ship:

```json
{
    "include": ["src", "prisma", "prisma.config.ts"],
    "exclude": ["node_modules"],
    "compilerOptions": {
        "rootDir": "./",
        "outDir": "./dist",

        "target": "ES2022",
        "types": ["node"],

        "sourceMap": true,

        "strict": true,
        "skipLibCheck": true,
        "esModuleInterop": true,
        "module": "NodeNext",
        "moduleResolution": "NodeNext"
    }
}
```

Now let me walk through **every single option**, because these are the levers that make or break your dev experience.

#### `include`, `rootDir` and `outDir`

```json
"include": ["src", "prisma", "prisma.config.ts"],
"rootDir": "./",
"outDir": "./dist"
```

- `include` — the exact set of folders/files the compiler should type-check. `src/` is the app, `prisma/` holds `seed.ts`, and `prisma.config.ts` is the Prisma v7 config at the project root. All three are TypeScript and all three benefit from type-checking; listing them explicitly is tighter than letting TS scan the whole repo.
- `rootDir` — "my sources can live anywhere under the project root." I used to set this to `./src`, but once `prisma/seed.ts` and `prisma.config.ts` joined the include list, `tsc` complained that those files were outside `rootDir`. Widening to `./` fixes that. The emitted structure inside `dist/` then mirrors the project layout (`dist/src/...`, `dist/prisma/...`).
- `outDir` — "put the compiled JavaScript in `dist/`." This is why `package.json`'s `main` points at `dist/index.js`.

This gives a clean separation: human code lives alongside `prisma/` at the project root, `dist/` is machine output, and `dist/` is git-ignored.

#### `target: "ES2022"`

Which version of JavaScript should `tsc` emit? Node 20+ supports everything up through ES2023 natively. `ES2022` is a safe sweet spot that supports `async/await`, top-level await, optional chaining, nullish coalescing, private class fields, and `.at()` — basically everything modern.

> Lower (e.g. `ES2015`) and `tsc` starts polyfilling things into ugly generated code. Higher (e.g. `ESNext`) and you're coupling to bleeding-edge Node behavior. `ES2022` is the Goldilocks zone for Node 20+.

#### `module: "NodeNext"` and `moduleResolution: "NodeNext"`

This is the pair of settings that confuses more freshers than anything else. It tells TypeScript:

> "Use Node's modern module resolution. Respect the `"type"` field in `package.json`. Understand both CommonJS and ESM."

For a greenfield Node project in 2026, always use `"NodeNext"`. The older `"CommonJS"` mode is a legacy trap; `"ESNext"` is for bundler projects (Vite, Webpack). We are writing a Node server — `NodeNext` it is.

#### `strict: true`

This turns on **all** the strict type-checking flags at once: `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, and friends. Without this, TypeScript is barely more than VS Code autocomplete.

> **If you turn off `strict`, you are writing JavaScript with extra steps. Don't.**

#### `esModuleInterop: true`

Lets you write:

```ts
import express from "express";
```

instead of the clunky:

```ts
import * as express from "express";
```

…when importing CommonJS packages. Turn it on. Always.

#### `skipLibCheck: true`

Do not type-check `.d.ts` files inside `node_modules`. Third-party type definitions sometimes have tiny inconsistencies between packages. Letting the compiler argue with them will waste your life. Turn this on.

#### `sourceMap: true`

Generates `.js.map` files next to your compiled `.js`. When a stack trace crashes in production, the source map lets tools (and humans) point back at the **original TypeScript line** instead of the compiled line. Debugging gift.

#### `types: ["node"]`

Tells TypeScript to pull in the Node.js ambient typings (`@types/node`) globally. Without this, `process.env`, `Buffer`, `__dirname`, and friends are untyped — you'd get "cannot find name 'process'" in any file that touches env vars. Pinning `types` to an explicit allowlist also prevents random ambient types from `node_modules` leaking into your compile unit. For a Node server, `["node"]` is the baseline.

#### `exclude: ["node_modules"]`

Just the obvious: we don't compile our dependencies. Everything else the compiler should touch is enumerated by `include` above.

> **A word on why `prisma.config.ts` is now in `include`, not `exclude`.** In earlier versions of this guide, `prisma.config.ts` was in `exclude` — the theory being that the Prisma CLI reads it directly, so `tsc` shouldn't emit `dist/prisma.config.js` and muddle module resolution. That worked, but it also meant the file was invisible to the type-checker: typos went unnoticed until `prisma` crashed at runtime. With `"outDir": "./dist"`, `tsc` does emit a compiled copy into `dist/`, but that's harmless — nothing imports `dist/prisma.config.js`; Prisma CLI still reads the TypeScript source at the project root. The payoff is full type-checking on the config file, same as every other file in the project.

> **Sidebar — "What about the commented-out options?"** In the full file I keep many options commented as future upgrades. `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals` — these are excellent but aggressive. Enable them after you're comfortable with base strict mode; they tighten the net further.

### Try it out

Make a `src/index.ts`:

```ts
const name: string = "backend";
console.log(`Hello from ${name}`);
```

Then:

```bash
npx tsc
```

You should see a new `dist/index.js`. Run it:

```bash
node dist/index.js
```

If `Hello from backend` prints, your TypeScript setup is alive. Delete `dist/` — we don't commit it, and we don't run `tsc` by hand during development. That's what `tsx` is for.

---

## 7. Step 3 — The Dev Runner: Why I Use `tsx watch` (Not `ts-node`, Not `nodemon`)

Running `tsc` and then `node` on every code change is insanity. You need a dev runner that:

1. Runs TypeScript directly without a separate compile step.
2. Restarts the server when you change a file.

### Install `tsx`

```bash
npm install --save-dev tsx
```

That's the only install you need.

### The `dev` script

In `package.json`:

```json
"scripts": {
    "dev": "tsx watch src/index.ts"
}
```

Then:

```bash
npm run dev
```

Your server starts. Edit any file. It restarts instantly. Done.

### Why `tsx watch` and not the alternatives?

> **Sidebar — Dev runner comparison.**
>
> | Tool | What it does | Why I don't use it |
> |---|---|---|
> | **`node src/index.ts`** (Node 20.6+ with `--experimental-strip-types`) | Node now runs TS natively by stripping types. | No watch mode. No decorators. Still experimental-ish. |
> | **`ts-node`** | Transpiles TS on the fly via TypeScript's compiler. | **Slow.** Starts-up time and memory use are painful. Worse ESM/CJS edge cases. Legacy. |
> | **`nodemon` + `ts-node`** | `nodemon` does file-watching, `ts-node` does transpile. | Two tools, two configs, slow startup, the combo has weird gotchas with `nodemon.json`. |
> | **`nodemon` + `tsc -w`** | Compile TS to JS on watch, run JS with nodemon. | Two processes, double the complexity, stale `dist/` bugs. |
> | **`tsx watch`** | Single tool. Uses **esbuild** under the hood — an order of magnitude faster than `tsc`. Built-in watcher. First-class ESM. | Nothing. This is the winner. |
> | **`bun --watch`** | Bun's native TS runner. Fast. | Different runtime — incompatible with some native packages (Prisma was flaky for a while). |
>
> **My pick: `tsx watch`.** One devDependency. One script. Fast. Correct. Zero ceremony.

### Why `tsx` is also used for seeding

Foreshadowing Step 7: the same `tsx` binary runs our Prisma seed script. One tool for two jobs is a small but real win.

---

## 8. Step 4 — The Entry-Point Split: `index.ts` vs `app.ts`

I split my server into **two** files instead of one. Tiny detail; huge downstream benefit.

### `src/index.ts`

```ts
// index.ts
import { app } from "./app";
import { config } from "./constants/config";
import logger from "./lib/logger";

app.listen(config.PORT, () => {
    logger.info(`Server is running on http://localhost:${config.PORT}`);
});
```

That's the whole file. Its **only** job is: take an Express app, bind it to a port.

### `src/app.ts`

```ts
// app.ts
import express from "express";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import recordRoutes from "./routes/record.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import cors from "cors";

const app = express();
app.use(
    cors({
        origin: "http://localhost:5173",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        credentials: true,
    }),
);

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

`app.ts` builds and **exports** the Express app, fully configured with middleware and routes, but does **not** listen on a port.

### Why the split?

Three reasons, all of which bite you later if you don't:

1. **Testing.** When you write integration tests with `supertest`, it calls `request(app)` — it needs the app instance, but it must **not** actually bind a port (two tests = two processes fighting for port 5000). Exporting `app` from a pure file makes this trivial.
2. **Clarity of responsibility.** `index.ts` is "how we start." `app.ts` is "what we are." Keeping those separate is the difference between a hobby project and something you can reason about.
3. **Hot-reload behavior.** `tsx watch` restarts the entire process on change — fine either way. But if you ever move to a more sophisticated reloader, having the listen call isolated helps.

### The `/health` route

Notice the `app.get("/health", ...)`. Every backend should have a health endpoint. Uptime monitors, load balancers, Kubernetes liveness probes, the mental sanity check when your deploy goes sideways — all hit `/health`. Five lines, enormous ROI.

### CORS — a fresher trap

```ts
cors({ origin: "http://localhost:5173", credentials: true, ... })
```

If you ever get the dreaded:

> `Access to fetch at 'http://localhost:5000/api/...' from origin 'http://localhost:5173' has been blocked by CORS policy`

…it is because CORS is either missing or misconfigured. `5173` is Vite's default dev port. In production, replace it with your real frontend origin — and never use `origin: "*"` if you also set `credentials: true` (the browser will refuse).

---

## 9. Step 5 — The `package.json` Scripts, Line by Line

Here is the full `scripts` block from my `package.json`. I'll explain **every single line**. Some of these reference Prisma, which we haven't set up yet — that's fine, they become the checklist for the next section.

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

### `dev`

```
tsx watch src/index.ts
```

Dev server. Already covered in Step 3.

### `build`

```
tsc
```

Runs the TypeScript compiler with the settings from `tsconfig.json`. Output lands in `dist/`. You run this before deploying to production.

### `start`

```
node dist/index.js
```

Production start command. `node` runs plain compiled JavaScript — no TypeScript involved at runtime. Fastest, smallest, no dev-tool dependencies in the path.

The production flow is: `npm run build` → `npm start`. Never `tsx` in production — you'd be shipping a transpiler you don't need.

### `db:generate`

```
prisma generate
```

Regenerates the Prisma Client based on `schema.prisma`. Run this whenever you change the schema, and as part of every fresh install. Covered in depth in Step 6.

### `db:migrate`

```
prisma migrate dev
```

Development migration. Looks at the difference between your current database and `schema.prisma`, creates a new SQL migration file under `prisma/migrations/`, and applies it. Prompts you for a migration name.

### `db:migrate:prod`

```
prisma migrate deploy
```

Production migration. **Does not** create new migrations — only applies pending migration files. This is what runs on your deploy, never `migrate dev`.

### `db:seed`

```
prisma db seed
```

Runs the seed script defined in `prisma.config.ts`. Covered in Step 7.

### `db:reset`

```
prisma migrate reset
```

**Nuclear button.** Drops the entire database, re-applies all migrations, then re-runs the seed. Used when your dev database is hopelessly out of sync and you want a clean slate. Never run this in production.

### `db:studio`

```
prisma studio
```

Launches Prisma Studio — a web GUI at `http://localhost:5555` that lets you browse and edit your database with a spreadsheet-like UI. Indispensable during development.

### `format` and `format:check`

```
prettier --write .
prettier --check .
```

- `format` — rewrite all files to match `.prettierrc`.
- `format:check` — exit with a non-zero code if any file isn't formatted. Perfect for CI.

Covered in Step 9.

### Naming convention: `db:*`

I prefix all database scripts with `db:`. NPM allows `:` in script names and most tooling (including autocomplete) groups them visually. Once you have 10+ scripts, this kind of grouping saves your sanity.

---

---

## 10. Step 6 — Prisma: Schema, Client, Migrations, Pooling

Prisma is the ORM. You describe your tables in a single file, Prisma generates a fully type-safe client, you call `.findMany()` / `.create()` from your code, and you never hand-write SQL for routine CRUD again.

> **Sidebar — Prisma vs Drizzle vs TypeORM vs raw `pg`.**
>
> | ORM | Pros | Cons | When to pick it |
> |---|---|---|---|
> | **Prisma** | Best DX in the Node world — types derived from a single schema file, beautiful query API, migrations that actually work, Prisma Studio. | Heavier dependency (the query engine), opinionated, the schema language is its own DSL. | **Default pick.** What I use here. |
> | **Drizzle** | Lightweight, schema is TypeScript, SQL-like query builder, tiny bundle. | Fewer batteries included. Migration story is newer. You write more code. | If you want closer-to-SQL control and a smaller runtime. |
> | **TypeORM** | Mature, decorator-based, Active Record or Data Mapper. | Decorators everywhere, edge-case bugs, dev momentum has slowed. | Legacy projects. I don't reach for it on new builds. |
> | **Knex / `pg` directly** | Full SQL control, zero ORM magic. | You write everything yourself — validation, types, migrations. | When you need a specific SQL feature no ORM exposes cleanly. |
>
> **My pick: Prisma.** The time Prisma saves in the first three weeks of a project pays for every rough edge you'll ever hit.

### 10.1 Install Prisma

```bash
npm install --save-dev prisma
npm install @prisma/client @prisma/adapter-pg pg
```

Two separate installs on purpose:

- `prisma` (devDep) — the **CLI** and the migration engine. Used at build time, not at runtime.
- `@prisma/client` (dep) — the generated client you actually import in your code at runtime.
- `@prisma/adapter-pg` + `pg` (deps) — these let Prisma use your own `pg.Pool` instead of its built-in connector. That's how we get real connection pooling (crucial in production).

### 10.2 Initialize Prisma

```bash
npx prisma init --datasource-provider postgresql
```

This does three things:

1. Creates a `prisma/` folder.
2. Drops a starter `prisma/schema.prisma` inside it.
3. Appends `DATABASE_URL=` to your `.env`.

### 10.3 The `schema.prisma` walkthrough

Here is the **entire** schema from the finance dashboard. I'll dissect it block by block.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  VIEWER
  ANALYST
  ADMIN
  SUPERADMIN
}

enum RecordType {
  INCOME
  EXPENSE
}

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

#### `generator client`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

Tells Prisma to generate a TypeScript client. Two things worth noting:

- **`provider = "prisma-client"`** — the new v7 generator. The older `prisma-client-js` still exists, but `prisma-client` is the default going forward.
- **`output = "../src/generated/prisma"`** — I deliberately put the generated client inside `src/` instead of letting Prisma default-dump it into `node_modules/@prisma/client`. Reasons:
  - TypeScript finds it naturally from relative imports.
  - It shows up in my IDE file tree, so I remember it exists.
  - Path is `../src/generated/prisma` because `schema.prisma` lives inside `prisma/`, and `..` climbs back up.
  - I git-ignore this folder. It's a **build artifact**, not source.

#### `datasource db`

```prisma
datasource db {
  provider = "postgresql"
}
```

Says "I'm using Postgres." Notice there's **no `url` field**. In Prisma v7, I moved the URL into `prisma.config.ts` instead (covered below). In older versions you'd see:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Both styles work; the v7 config-file approach is cleaner because it keeps all "where does config come from?" answers in one TypeScript file.

#### Enums

```prisma
enum Role { VIEWER ANALYST ADMIN SUPERADMIN }
enum RecordType { INCOME EXPENSE }
```

Prisma enums become Postgres enum types **and** TypeScript union types. In code:

```ts
import { Role } from "../generated/prisma";
const r: Role = "ADMIN"; // type-safe; typos caught at compile time
```

This is the moment most ORM converts fall in love — changing an enum in one file ripples into SQL, the client, and your types automatically.

#### `model User`

```prisma
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
```

Let me decode the attributes:

- **`@id`** — primary key.
- **`@default(uuid())`** — Prisma generates a UUID v4 at insert time. Alternative: `@default(cuid())` for shorter, lexicographically-sortable IDs. I prefer UUIDs for inter-service compatibility.
- **`@unique`** — database-level unique index. Trying to insert a duplicate email throws.
- **`@default(VIEWER)`** — new users default to the `VIEWER` role.
- **`records Record[]`** — the relation field. "One User has many Records." This is a **virtual** field; no column is added on the `User` table. The foreign key lives on the other side (`Record.createdBy`).

#### `model Record` — and your first JOIN

```prisma
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

Attributes new to this model:

- **`@db.Decimal(12, 2)`** — native-Postgres-type override. Default `Decimal` in Prisma doesn't let you specify precision. I force `DECIMAL(12, 2)` — 12 total digits, 2 after the decimal — because money should never be a `float`. Floats lose pennies.
- **`notes String?`** — the `?` makes the column nullable. Users can leave notes blank.
- **`deletedAt DateTime?`** — **soft delete** timestamp. When it's null, the record is live. When it has a date, the record is "deleted" but still on disk. Lets you recover accidentally-removed data.
- **`updatedAt DateTime @updatedAt`** — Prisma automatically bumps this on every update. Free audit column.

The **relation**:

```prisma
createdBy   String
user        User     @relation(fields: [createdBy], references: [id])
```

Reading this top-down:

- `createdBy` is a plain column holding a user ID.
- `user` is the **virtual relation field** — you can write `record.user` in code and Prisma joins automatically.
- `@relation(fields: [createdBy], references: [id])` says: "the foreign key is `Record.createdBy`, which references `User.id`."

This is the Prisma version of `FOREIGN KEY (createdBy) REFERENCES User(id)`. Together with the `records Record[]` line on the `User` model, you have a full two-sided relation, and in code you can do:

```ts
// fetch a record with its user in one query
const record = await prisma.record.findUnique({
  where: { id },
  include: { user: true },
});
record.user.name; // fully type-safe
```

### 10.4 `prisma.config.ts` — the v7 change

Prisma v7 moved configuration out of `schema.prisma` into a TypeScript file at the project root. This file is **critical**.

```ts
// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        seed: "tsx ./prisma/seed.ts",
    },
    datasource: {
        url: process.env["DATABASE_URL"],
    },
});
```

Line by line:

- **`import "dotenv/config"`** — loads `.env` into `process.env` *before* the config is evaluated. Without this, `DATABASE_URL` would be undefined when `prisma` CLI runs.
- **`schema: "prisma/schema.prisma"`** — where to find the schema.
- **`migrations.seed: "tsx ./prisma/seed.ts"`** — command Prisma runs when you do `npm run db:seed`. I use `tsx` here because my seed file is TypeScript and imports from `src/`. Plain `node` can't handle either; `tsx` can.
- **`datasource.url: process.env["DATABASE_URL"]`** — the connection string.

> **Why is `prisma.config.ts` inside `include` (type-checked), not `exclude`?** Prisma CLI reads this file directly — it handles its own TS compilation, so the copy `tsc` emits to `dist/` is unused and harmless. What *does* matter is that the config is type-checked alongside the rest of the project, so a typo in an option name or a wrong shape caught at compile time instead of blowing up the first time you run `prisma generate`.

### 10.5 Generate the Prisma Client

```bash
npm run db:generate
```

Under the hood this runs `prisma generate`. Prisma reads `schema.prisma`, spits the client into `src/generated/prisma/`, and now you can:

```ts
import { PrismaClient } from "../generated/prisma/client";
```

Rule of thumb: run `db:generate` any time you edit `schema.prisma`. Many people also add it to a `postinstall` script so it runs automatically after `npm install`.

### 10.6 First migration

```bash
npm run db:migrate
```

This runs `prisma migrate dev`. Prisma prompts:

```
? Enter a name for the new migration: » init
```

Type `init` and press enter. Prisma:

1. Creates `prisma/migrations/20260418XXXXXX_init/migration.sql` — the actual SQL.
2. Applies it to your database.
3. Regenerates the client.

**Commit the migrations folder to git.** This is now part of your project's history — future teammates, CI, and production all replay these files in order.

Two commands, two very different behaviors:

- **`prisma migrate dev`** — for development. Creates new migration files based on schema diffs. May prompt to reset the DB if you've edited past migrations.
- **`prisma migrate deploy`** — for production. **Never** creates migrations, only applies existing ones. Safe to run on every deploy.

### 10.7 The Prisma singleton — `src/lib/prisma.ts`

Here is how I wire up the client. This pattern is worth memorizing — you will copy it into every project.

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

Three mechanisms are working here. Let me explain each.

#### (a) Connection pooling via `@prisma/adapter-pg`

```ts
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
return new PrismaClient({ adapter, ... });
```

By default, Prisma spins up its own Rust-based connection pool. That's fine for most apps, but giving it a `pg.Pool` explicitly is a cleaner story:

- You control pool size (`new pg.Pool({ max: 10, ... })`).
- You can share the same pool with other libraries if needed.
- The connection semantics become "plain Node Postgres," which is what most cloud providers expect.

For a beginner, think of this as: "use my pool, not your internal one." That's it.

#### (b) The `log: ["query", ...]` option

Prisma prints every SQL query it runs to the console. Beautiful for learning — you see the actual SQL your `findMany` calls generate. Turn it down to `["warn", "error"]` in production.

#### (c) The `globalThis` singleton — the "hot reload survival" trick

```ts
const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClientSingleton };
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (config.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
```

The problem this solves: in development, `tsx watch` restarts your process on file change. But Node.js's module cache is also reset, which means every restart instantiates a **new** `PrismaClient`. If you restart 50 times while debugging, you've spawned 50 Prisma instances and opened 50 connections to your database — until the database refuses new ones.

The fix: store the client on `globalThis`, a special object that survives across module reloads **in the same process**. If we've already created a client, reuse it. In production, there's no reloader, so we skip the global caching.

This exact pattern is used by virtually every serious Next.js / Node project using Prisma. You will see it in codebases everywhere once you notice it.

---

## 11. Step 7 — Database Seeding

### 11.1 What is seeding?

Seeding is the act of running a script that inserts **initial data** into your database. Examples:

- A SUPERADMIN user so you can even log in to your admin panel for the first time.
- A list of countries, currencies, or tax brackets that your app needs to exist before anyone does anything.
- Dummy test data — 100 fake users, 500 fake orders — so local development feels real.

Seeding is **not** for user-generated data. It's for the stuff your app cannot start without.

### 11.2 Why seed instead of just "insert manually once"?

- **Reproducibility.** A new developer clones the repo, runs `npm install && npm run db:migrate && npm run db:seed`, and has a working app in 60 seconds. No Slack messages asking "hey, what's the admin password?"
- **Idempotency.** A good seed script can be run 1 time or 100 times without duplicating or corrupting data.
- **CI / staging resets.** You can blow away a staging DB and bring it back exactly how you need it.
- **Testing.** Seeded data gives integration tests a known starting state.

### 11.3 How Prisma finds the seed script

The `prisma.config.ts` config we wrote earlier has this:

```ts
migrations: {
    seed: "tsx ./prisma/seed.ts",
}
```

That's the command Prisma runs when you do `npx prisma db seed` (or `npm run db:seed`, which is just our alias for it). It is also run automatically at the end of `prisma migrate reset`.

> In older Prisma versions, the seed command went into `package.json` under `"prisma": { "seed": "..." }`. In v7 it moved into `prisma.config.ts`.

### 11.4 The actual seed script

Here's my real `prisma/seed.ts`:

```ts
import { userRepository } from "../src/repositories/user.repositories";
import { ROLES } from "../src/constants/app.constants";
import bcrypt from "bcrypt";
import { config } from "../src/constants/config";

async function createSuperAdmin() {
    const hashedPassword = await bcrypt.hash(config.SUPER_ADMIN_PASSWORD, 10);
    await userRepository.createUser(
        config.SUPER_ADMIN_NAME,
        config.SUPER_ADMIN_EMAIL,
        hashedPassword,
        ROLES.SUPERADMIN,
    );
}

async function main() {
    console.log("🌱 Starting database seed...\n");

    try {
        const userExists = await userRepository.userExists(config.SUPER_ADMIN_EMAIL);
        if (!userExists) {
            await createSuperAdmin();
            console.log("\n✅ SUPER ADMIN ACCOUNT successfully created!");
        } else {
            console.log("\n✅ SUPER ADMIN ACCOUNT ALREADY created!");
        }
    } catch (error) {
        console.error("\n❌ Error creating SUPER ADMIN ACCOUNT:", error);
        throw error;
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {});
```

Things to notice, in order:

1. **It imports from `src/`.** This is why the `prisma.config.ts` seed command is `tsx ./prisma/seed.ts` — it needs to execute a TS file and resolve TypeScript imports transitively.
2. **It reuses `userRepository.createUser`** — the same function the signup route uses (imported there under the alias `authRepository`). Don't write a separate "seeding DB client" — if your repository layer is good, seeds piggyback on it for free.
3. **Idempotency.** Before creating, it checks `userExists(config.SUPER_ADMIN_EMAIL)`. Run it once, it creates; run it 20 more times, it silently no-ops. That's the rule every seed script must follow.
4. **Credentials come from `.env`.** Not hardcoded. If you leaked `seed.ts` to GitHub, nothing sensitive is in it — the actual password lives in `.env`, which is git-ignored.
5. **`process.exit(1)` on error.** Important. Without this, a failing seed script inside `prisma migrate reset` can look like it succeeded when it actually didn't.
6. **The SUPERADMIN role is passed here and nowhere else.** `createUser` takes a `role: ROLES` parameter, and the signup route always calls it without specifying `SUPERADMIN` — the seed is the **only** caller that passes `ROLES.SUPERADMIN`. There is no API endpoint to promote someone to SUPERADMIN either. That's intentional: it prevents privilege escalation through any API surface.

### 11.5 Running the seed

```bash
npm run db:seed
```

Output on first run:

```
🌱 Starting database seed...
✅ SUPER ADMIN ACCOUNT successfully created!
```

Run again:

```
🌱 Starting database seed...
✅ SUPER ADMIN ACCOUNT ALREADY created!
```

That's the whole point — **safely re-runnable**.

### 11.6 The `db:reset` nuke flow

```bash
npm run db:reset
```

Under the hood: `prisma migrate reset`. Prisma will:

1. `DROP DATABASE` (after confirming you're sure).
2. `CREATE DATABASE`.
3. Re-apply every migration from `prisma/migrations/` in order.
4. Run the seed command from `prisma.config.ts`.

You end up in the same state as a teammate who just cloned the repo. This is the fastest way out of "why is my DB in this weird half-migrated state?" hell.

> **Only use `db:reset` on local/dev databases.** Prisma will refuse to run it against a DB marked as production, but don't even flirt with it.

### 11.7 Order of operations (first-time setup)

Put these in your head — this is the sequence every teammate runs after cloning:

```bash
npm install              # 1. install deps
cp .env.example .env     # 2. create .env (then fill in values)
npm run db:generate      # 3. generate Prisma client
npm run db:migrate       # 4. apply migrations (creates tables)
npm run db:seed          # 5. seed SUPERADMIN
npm run dev              # 6. start the server
```

Six commands, clone to running. That's the bar — if your project needs more than this, your README has failed.

---

---

## 12. Step 8 — Environment Variables

Secrets and per-environment knobs never go in your code. They live in environment variables, loaded from a `.env` file locally and from your hosting platform's secret manager in production.

### 12.1 The `.env` file

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

> **Never commit `.env` to git.** Never, never, never. Check your `.gitignore` has `.env` in it before your first commit (it will, we set this up in Step 10).

### 12.2 The `.env.example` file — why this is mandatory

This is the file I see freshers forget constantly. Here's mine:

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

It is `.env`'s **twin**, with every key present and every value blank. It **is** committed to git.

Why this file is non-negotiable:

1. **It's a contract.** A teammate clones your repo and instantly knows every variable they need to set. Without it, they're guessing from grep-ing your code.
2. **It's the checklist for deployment.** When you set up production on Railway / Render / Fly, `.env.example` is what you hand to the infra person (or your future self) as "set these values in prod."
3. **It's the schema of your config.** It forces *you* to think about what actually needs configuring before you scatter `process.env.SOMETHING` all over your code.

The rule: **every time you add a new `process.env.FOO` anywhere in the codebase, open `.env.example` in the same commit and add `FOO=`**. Treat this as a muscle memory habit. If a PR introduces a new env var without updating `.env.example`, the PR is broken.

### 12.3 `dotenv` — how `.env` becomes `process.env`

```bash
npm install dotenv
```

`dotenv` reads `.env` and attaches its key-value pairs onto `process.env` at startup. Node does **not** read `.env` natively (well — Node 20.6+ has an `--env-file` flag, but I still prefer `dotenv` because it's framework-agnostic and runs identically in every tool, including the Prisma CLI).

You only need to call it once, as early as possible in your app's startup. That happens inside `config.ts` (below) so you never have to think about it.

### 12.4 The cached `config.ts` pattern

Here is `src/constants/config.ts`:

```ts
import dotenv from "dotenv";
dotenv.config();

export const config = {
    // Application Environment
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || "development",
    API_URL: process.env.API_URL || `http://localhost:${process.env.PORT}/api`,
    DB_USER: process.env.DB_USER || "postgres",
    DB_HOST: process.env.DB_HOST || "localhost",
    DB_NAME: process.env.DB_NAME || "budget",
    DB_PASSWORD: process.env.DB_PASSWORD || "root",
    DB_PORT: process.env.DB_PORT || 5432,
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/budget",
    JWT_SECRET: process.env.JWT_SECRET || "jwt_secret",
    SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || "superAdminPassword",
    SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME || "Dev",
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || "devbachani08@gmail.com",
};
```

Everywhere else in the codebase:

```ts
import { config } from "../constants/config";

app.listen(config.PORT, () => {
    logger.info(`Running on port ${config.PORT}`);
});
```

**Never** `process.env.PORT` directly. Always `config.PORT`.

Why this pattern beats reading `process.env` everywhere:

- **Performance.** `process.env` is not a plain JavaScript object — it's a special proxy that does a system lookup on every property read. That's measurable in hot code paths. `config` is a plain frozen-ish object read **once** at startup.
- **Defaults in one place.** Every fallback (`|| "postgres"`, `|| 5000`) is visible in a single file. You don't have to grep the codebase to know what happens if `DB_HOST` is missing.
- **Testability.** In tests, you can mock the `config` module in one import. Mocking `process.env` across a whole test suite is a nightmare.
- **IDE autocomplete.** `config.` shows you every available setting. `process.env.` shows nothing — it's `any`.
- **One place to add runtime validation.** If you later decide "the app should refuse to start if `JWT_SECRET` is unset in production," you add that check inside `config.ts` and it protects the whole app.

> **Sidebar — "Why include defaults at all? Isn't that a security risk?"**
> The defaults are dev-local sensible values. `DB_PASSWORD || "root"` means "if you didn't set it, try my local default." In production, every one of these variables *will* be set — the defaults are only there so a new teammate can `npm run dev` without editing any file. Some teams prefer **no defaults, fail loudly** (via Zod-validated env schemas) — that's fine, it's a philosophy call. For a fresher's project, defaults reduce friction.

> **Sidebar — `dotenv.config()` is called here, in a single import.** That's why you don't see `import "dotenv/config"` at the top of `index.ts`. The first time any file does `import { config } from ".../config"`, `dotenv` fires. Just make sure `config.ts` is imported early — in practice it is, because `app.ts`, `prisma.ts`, and most middleware depend on it.

### 12.5 The one exception — `prisma.config.ts`

Notice `prisma.config.ts` does `import "dotenv/config"` directly. That's because the Prisma CLI loads this file **before** any code in `src/` runs — it needs `.env` loaded right there, inside the config file itself.

---

## 13. Step 9 — Prettier

Code formatters eliminate the stupidest category of team argument: "one space or two?" Pick a config, commit it, never think about it again.

### 13.1 Install

```bash
npm install --save-dev prettier
```

### 13.2 The `.prettierrc` file

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

Every option, explained.

#### `"tabWidth": 4` + `"useTabs": true`

Indent with actual tab characters, rendered as width 4. Two reasons I prefer tabs:

1. **Accessibility.** A reader with vision issues or a narrower monitor can set their editor to render tabs as 2, 4, or 8 spaces — their choice. Spaces take that choice away.
2. **File size.** One byte per indent instead of four. Barely matters, but it's free.

The counter-argument (and it's a good one): spaces render identically across tools that don't respect tab widths (GitHub, diff viewers, some terminals). If your team is already on spaces, stay on spaces. The **worst** answer is mixing both in one codebase.

#### `"semi": true`

Terminate statements with semicolons. The alternative ("no semicolons") works, but you'll eventually hit the `[1,2,3].forEach(x => ...)` ASI trap:

```js
const a = foo()
[1,2,3].forEach(...)
// Parsed as: foo()[1,2,3].forEach(...)  — crash
```

Semicolons avoid every one of those edge cases. Keep them.

#### `"trailingComma": "all"`

Always put a comma after the last item in a list:

```ts
const obj = {
    a: 1,
    b: 2,   // <-- this comma
};
```

Why it matters: when you add a new item, you touch **one** line (adding the new line). Without trailing commas, adding a new item modifies the previous line too. Your git diffs become instantly cleaner.

#### `"bracketSpacing": true`

```ts
import { something } from "./x";   // with spaces
import {something} from "./x";     // without
```

I like the spaces. Easier to read.

#### `"bracketSameLine": false`

For multi-line JSX/HTML-like tags, the closing `>` goes on its own line:

```jsx
<Button
    onClick={...}
    label="Save"
>                    // <-- on its own line
```

Not relevant for this backend, but my `.prettierrc` is reusable across frontend projects too.

#### `"arrowParens": "always"`

```ts
const f = (x) => x + 1;   // always
const f = x => x + 1;     // "avoid"
```

Always-parens is slightly more verbose but consistent. When you inevitably add a second parameter, you don't also have to add parens. Fewer diff lines.

#### `"printWidth": 130`

Prettier will try to keep lines under 130 characters. I prefer 130 to the default 80 because:

- Modern monitors are wide. 80 was a terminal hardware limit from the 1970s.
- Fewer awkwardly wrapped `if (a && b && c)` chains.
- Still narrow enough that side-by-side diffs fit on a laptop.

Some teams stay at 80 or 100. Pick one, commit.

#### `"endOfLine": "lf"`

Unix line endings (`\n`), not Windows (`\r\n`). This matters if you and a teammate are on different OSes — without this, git will constantly show "every line changed" even though the actual content is identical. Always `lf` on a project touched by more than one OS.

### 13.3 The `.prettierignore` file

```
node_modules
dist
build
coverage
.next
```

Tells Prettier: "skip these folders." You don't want to waste CPU formatting auto-generated code.

Specifically:

- `node_modules` — third-party code, not yours.
- `dist`, `build`, `.next` — compilation outputs.
- `coverage` — test coverage reports.

Also add `src/generated/prisma` if you have it, since that's another build output.

### 13.4 The scripts

From our `package.json`:

```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```

- `npm run format` — rewrite every file in the repo to the config. Run this once after cloning if your editor isn't auto-formatting.
- `npm run format:check` — exit non-zero if any file is out of spec. Put this in CI. A PR that fails `format:check` shouldn't merge.

### 13.5 Editor integration (do this once)

In VS Code:

1. Install the Prettier extension.
2. Open settings, enable **Format On Save**.
3. Set **Default Formatter** to Prettier.

Now every time you hit save, the file becomes `.prettierrc`-compliant. You will never think about formatting again.

> **Sidebar — Prettier vs ESLint.** They solve different problems.
> - **Prettier** — how code *looks*. Spacing, quotes, trailing commas.
> - **ESLint** — how code *behaves*. Unused variables, unreachable code, suspicious patterns.
>
> A production-grade setup has both. I left ESLint out of this project to keep the fresher scope manageable — but when you're ready, add `eslint` + `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` + `eslint-config-prettier` (the last one disables ESLint rules that Prettier already handles). That's a separate article.

---

## 14. Step 10 — `.gitignore` Hygiene

### 14.1 Start with the `toptal` template

Head to [toptal.com/developers/gitignore](https://www.toptal.com/developers/gitignore/api/node) and generate a Node `.gitignore`. It covers every obscure cache folder you'll never remember (`.nyc_output`, `.parcel-cache`, `.svelte-kit`, and 80 others).

Here is the full file I ship:

```gitignore
# Created by https://www.toptal.com/developers/gitignore/api/node
# Edit at https://www.toptal.com/developers/gitignore?templates=node

### Node ###
# Logs
logs
*.log
npm-debug.log*

# Runtime data
pids
*.pid

# Coverage
coverage
*.lcov

# TypeScript cache
*.tsbuildinfo

# Dependency directories
node_modules/

# dotenv environment variable files
.env
.env.development.local
.env.test.local
.env.production.local
.env.local

# Build outputs
dist
build
.next
out

# IDE
.vscode-test

### My additions ###
/src/generated/prisma
```

### 14.2 The critical entries (never forget these)

| Pattern | Why it's there |
|---|---|
| `node_modules/` | 30,000 files of third-party code. Reproducible via `npm install`. Never commit. |
| `.env` and variants | Secrets. Never commit. |
| `dist/`, `build/` | Compiled outputs. Reproducible via `npm run build`. Never commit. |
| `*.log`, `logs/` | Runtime logs. Noisy, often huge, sometimes contain sensitive data. |
| `*.tsbuildinfo` | TypeScript incremental build cache. Local-only. |
| `coverage/` | Test coverage reports. Regenerated on every test run. |

### 14.3 The Prisma-generated-folder trap

Look at the last line of my `.gitignore`:

```gitignore
/src/generated/prisma
```

This one caught me off-guard, and it will catch you too. Here's the sequence that produces the bug:

1. You run `npm run db:generate`.
2. Prisma writes a mountain of generated client code into `src/generated/prisma/` — thousands of files, some of them large.
3. You `git add .`.
4. Congratulations, you just committed an entire generated ORM client to your repo. Your PR diff is 50,000 lines.

The fix: git-ignore the generated folder **before** your first `db:generate`. Any generated artifact — Prisma client, GraphQL schema, auto-compiled protobufs, anything that can be recreated from a source-of-truth file — **belongs in `.gitignore`, not in git**.

> **Sidebar — "Wait, so how does a teammate get the Prisma client?"** They run `npm run db:generate` after cloning. Ideally you wire this into a `postinstall` script:
>
> ```json
> "scripts": {
>     "postinstall": "prisma generate"
> }
> ```
>
> Now `npm install` auto-generates the client at the end. Zero manual steps. I leave this out of the base project to keep the fresher mental model simple — you see each step explicitly — but in a real team project, add it.

### 14.4 Commit early, commit often

Once `.gitignore` is in place, take your very first real commit:

```bash
git add .
git commit -m "chore: initial project scaffolding"
```

From here, commit after every meaningful change. Don't wait for "the feature to be done." A good commit history is a map you can walk backwards through.

---

---

## 15. Step 11 — The Layered Architecture

This is the section that separates a hobby project from a real backend. The scaffolding we built in Steps 0–10 is just the stage. The architecture is the play.

### 15.1 The request flow

Here is what happens when a request hits `POST /api/auth/signup`:

```
HTTP request
     │
     ▼
┌───────────────────────┐
│  app.ts               │  Express app, global middleware (cors, json parsing)
└───────┬───────────────┘
        │
        ▼
┌───────────────────────┐
│  routes/auth.routes   │  URL → controller mapping. Auth middleware attached.
└───────┬───────────────┘
        │
        ▼
┌───────────────────────┐
│  controllers/auth     │  Parse req.body. Call service. Format ApiResponse.
└───────┬───────────────┘
        │
        ▼
┌───────────────────────┐
│  services/auth        │  Validate input (via schemas/). Apply business rules.
└───────┬───────────────┘
        │
        ▼
┌───────────────────────┐
│  repositories/user    │  Prisma queries. The ONLY layer that touches the DB.
└───────┬───────────────┘
        │
        ▼
┌───────────────────────┐
│  lib/prisma (client)  │  The actual DB connection.
└───────────────────────┘
```

Each arrow is a one-way call. The repository never calls back up into the service. The service never imports Express's `Request`/`Response`. The controller never writes SQL.

### 15.2 The one rule that matters

> **A layer can only import from the layer directly below it. Never skip layers. Never import upward.**

Violations to watch for:

- A controller that imports `prisma` directly. Wrong — that's skipping the service and repository.
- A service that imports `Request` from Express. Wrong — business logic should not know HTTP exists.
- A repository that does role checks. Wrong — that's business logic.

When you enforce this, three magical things happen:

1. **Tests become trivial.** You can unit-test a service by passing plain objects and stubbing the repository. No HTTP mocking, no DB.
2. **Swapping pieces is cheap.** Move from Prisma to Drizzle? You only touch the repository layer. Move from Express to Fastify? You only touch routes and controllers.
3. **The code actually makes sense on a Friday at 5pm.** You always know where a given line of logic belongs.

### 15.3 `routes/` — the thinnest layer

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

And a more interesting one with middleware:

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

The pattern: every row is readable left-to-right as a sentence.

> `PATCH /:id/role` — first `authenticate`, then `authorize(ADMIN or SUPERADMIN)`, then `updateUserRole`.

When you want to know "who can touch this endpoint?", you read one line. No hunting.

Those middleware names are **composable**:

- `authenticate` — verifies the JWT and attaches `req.user`.
- `authorize([roles])` — checks `req.user.role` is one of the allowed ones.

You write them once in `middlewares/auth.ts` and sprinkle them wherever you need. We'll see their implementation in a moment.

### 15.4 `controllers/` — the HTTP layer

A controller's job: **translate between the HTTP world and the service world.**

- Pull fields out of `req.body`, `req.params`, `req.query`.
- Call exactly one service method.
- Wrap the result in `ApiResponse` and `res.json(...)` it.
- Catch errors and convert them into HTTP responses.

Here is my signup controller:

```ts
// src/controllers/auth.controllers.ts
import { Request, Response } from "express";
import { authService } from "../services/auth.services";
import { ApiError } from "../utils/api_error";
import { ApiResponse } from "../utils/api_response";
import { getLogger } from "../lib/logger";

const logger = getLogger("auth.controller");

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

export { signup, login };
```

Things to notice:

1. **It pulls `req.body` fields one at a time** and trims them. The service receives a clean DTO, not the raw Express object. If I ever switched frameworks, the service wouldn't even notice.
2. **It calls exactly one service method** — `authService.signup(userData)`.
3. **It wraps the success in `new ApiResponse(201, ..., user)`.** Every response from the API has the same shape: `{ code, message, data }`. No guessing "did the response come back as `{user}` or `{data: {user}}` today?"
4. **The try/catch knows about two kinds of errors.** `ApiError` is our own class — if the service throws one, we know the status code and message already. Anything else is an unexpected crash, logged at `error` level and flattened to a generic 500.
5. **Zero business logic.** Not a single `if (role === "ADMIN")`, not a single DB call. If a feature change requires editing a controller for anything other than I/O, you're probably doing it wrong.

> **Sidebar — why `error?.trim()` with optional chaining?** Because `req.body.first_name` might be `undefined`. `"undefined".trim()` crashes; `undefined?.trim()` returns `undefined`. Then the Zod validator in the service catches the missing field with a clean error message. Never trust the shape of `req.body`.

### 15.5 `services/` — where the business actually lives

The service layer is the **only** place business rules exist. Everything above it (routes, controllers) is plumbing. Everything below it (repositories) is dumb data access.

```ts
// src/services/auth.services.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { userRepository as authRepository } from "../repositories/user.repositories";
import { validateUserSignup, validateUserLogin } from "../schemas/user.schemas";
import { ApiError } from "../utils/api_error";
import { USER_FEEDBACK_MESSAGES } from "../constants/app.messages";
import { getLogger } from "../lib/logger";

const logger = getLogger("auth.service");

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
        if (!user) {
            throw new ApiError(401, USER_FEEDBACK_MESSAGES.USER_NOT_FOUND);
        }

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

Every rule the app enforces lives here:

- Email must be valid (validator).
- Password must meet strength requirements (validator).
- Email gets normalized to lowercase before lookup (so `John@x.com` and `john@x.com` are the same account).
- If a user with that email exists → 409 Conflict.
- On signup, the password is **hashed with bcrypt at cost factor 10** — never stored in plain.
- On successful signup/login, a JWT is issued with 10-hour expiry.
- On a wrong password, log a warning (brute-force signal for later) and return 401.

The service **throws `ApiError`** when a rule is violated. It does not call `res.status(...)`. That's the controller's job. This separation is what lets you reuse the same service from the seed script, from a CLI, from a background worker — none of which have a `res` object.

> **Sidebar — `userData: any` is a smell.** In a tighter codebase, I'd type `userData` with a `SignupDTO` interface. The `any` is legacy laziness from an early commit. Fix it when you're doing this for real; I'm leaving the code faithful to what's in the repo so you see the *actual* state of a working project, warts included. Real code is rarely pristine.

### 15.6 `repositories/` — the only place SQL exists

A repository is a thin wrapper around Prisma. One object per database table (or per logical resource), one method per query.

```ts
// src/repositories/user.repositories.ts (abridged)
import { ROLES } from "../constants/app.constants";
import { prisma } from "../lib/prisma";
import { getLogger } from "../lib/logger";

const logger = getLogger("user.repository");

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

    async createUser(name: string, email: string, hashedPassword: string, role: ROLES) {
        try {
            return await prisma.user.create({ data: { name, email, passwordHash: hashedPassword, role } });
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

    async getUserByEmail(email: string) {
        try {
            return await prisma.user.findUnique({ where: { email } });
        } catch (error) {
            logger.error("DB error — getUserByEmail", { email, error: (error as Error).message });
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
    // ... more methods
};
```

The rules I follow in repositories:

1. **No business logic.** Don't check "is the user an admin?" here. Do that in the service. The repo just fetches, updates, deletes.
2. **Use Prisma's `omit` to never leak `passwordHash`.** Notice `omit: { passwordHash: true }` on every read that returns a user. The service and controller don't even get a chance to accidentally send the hash to the client.
3. **One method per use case, not per field.** `softDeleteUser(id)` instead of exposing raw `update({ where, data })`. Intent is in the name.
4. **Wrap in try/catch and log.** Every DB error lands in Winston with context (which email, which ID). When your production DB throws at 3am, future-you will cry tears of gratitude for this log.
5. **Re-throw after logging.** Don't swallow the error — the service still needs to know it happened so it can throw a proper `ApiError` (or the global error handler can catch it).

> **Sidebar — "Isn't the try/catch repetitive?"** Yes. You can factor it into a `withDbErrorLog` higher-order function. I haven't done that in this repo because the repetition is obvious and I value easy-to-read boilerplate over clever abstractions in a starter template. When you feel the itch in your own project, factor it out.

### 15.7 The "which file am I writing in?" decision table

When you're adding a feature and wondering where the code goes, use this:

| You're writing... | It belongs in... |
|---|---|
| `router.post("/x", ...)` | `routes/` |
| `res.status(400).json(...)` | `controllers/` |
| `req.body.foo?.trim()` | `controllers/` (then pass a clean object into the service) |
| `if (user.role !== ADMIN)` | `services/` |
| `bcrypt.hash(password, 10)` | `services/` |
| `jwt.sign(...)` | `services/` |
| `throw new ApiError(409, ...)` | `services/` |
| `prisma.user.findMany(...)` | `repositories/` |
| A reusable rule check like `isEmailValid(email)` | `schemas/` (Zod) or `utils/` |
| JWT verification that runs on every request | `middlewares/` |
| The PrismaClient instance itself | `lib/prisma.ts` |
| The Winston logger itself | `lib/logger.ts` |
| `const ROLES = { ADMIN: "ADMIN", ... }` | `constants/app.constants.ts` |
| `"User already exists"` | `constants/app.messages.ts` |
| A helper like `trimStrings(obj)` | `utils/common_functions.ts` |
| `class ApiError extends Error` | `utils/api_error.ts` |

Memorize this table. It answers 90% of the "where do I put this code?" questions you'll have in your first year.

---

## 16. Step 12 — The Cross-Cutting Layers

Not every file fits neatly into the vertical request flow. Some code is horizontal — used by multiple layers. That's what the six cross-cutting folders are for.

### 16.1 `lib/` — cross-cutting singletons

Exactly two files: `prisma.ts` and `logger.ts` (covered fully in Step 13).

The rule for `lib/`: it's where you keep **things instantiated once and shared across the whole app**. Singletons. Long-lived clients. If your answer to "how many copies of this exist?" is "exactly one," it goes in `lib/`.

> If later you add a Redis client, a Stripe client, an email-sending client — they all live in `lib/`.

### 16.2 `middlewares/` — request-pipeline functions

Express middleware is a function with signature `(req, res, next) => void`. You already saw my auth middleware used in the routes:

```ts
// src/middlewares/auth.ts
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../constants/config";
import { ROLES } from "../constants/app.constants";
import { getLogger } from "../lib/logger";

const logger = getLogger("auth.middleware");

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

Two middleware exported:

#### `authenticate`

1. Pulls the JWT out of `Authorization: Bearer <token>`.
2. Verifies it with `jwt.verify` using `JWT_SECRET`.
3. Attaches the decoded payload to `req.user` (so controllers/services can read it).
4. Calls `next()` — move to the next middleware / the controller.

If anything fails, returns `401` (missing token) or `400` (invalid token) and does **not** call `next()`. The request pipeline stops there.

#### `authorize([roles])`

A higher-order function: `authorize` takes an array of allowed roles and *returns* a middleware. That's why you see `authorize([ROLES.ADMIN])` in routes — it's a function call that produces the actual middleware.

This pattern lets you configure behavior per route without writing a new middleware for every role combination.

> **Sidebar — why `authenticate` must run before `authorize`.** `authorize` reads `req.user.role`. That field is set by `authenticate`. If you flip the order, `req.user` is undefined when `authorize` reads it → crash. Order matters in the middleware chain.

### 16.3 `schemas/` — Zod validators

Exhaustive coverage comes in the next turn, but the principle:

- One Zod schema per input type (e.g. `UserSignupSchema`, `UserLoginSchema`).
- Exported as a `validateX` function that **parses or throws `ApiError(400)`**.
- Services call `validateX(data)` at the top of every method that accepts external data.

File you've seen: `src/schemas/user.schemas.ts` — full walkthrough in Step 15.

### 16.4 `constants/`

I keep three files here:

#### `app.constants.ts` — enums and numeric limits

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

Rule: **any magic number or magic string that appears in more than one place becomes a constant here.** The first time you're tempted to write `if (name.length < 2)` in two different files, stop and hoist it to `LIMITS.NAME_MIN`.

#### `app.messages.ts` — user-facing strings

```ts
const USER_FEEDBACK_MESSAGES = {
    USER_CREATED_SUCCESS: "User created successfully",
    USER_ALREADY_EXISTS: "User already exists",
    INVALID_CREDENTIALS: "Invalid credentials",
    // ...
};

const USER_VALIDATION_ERRORS = {
    EMAIL_INVALID: "Email must be a valid email address.",
    PASSWORD_INVALID: "Password must include at least 1 uppercase letter, ...",
    // ...
};
```

Why centralize message strings? Three reasons:

1. **i18n later.** When you decide to internationalize, you have a single dictionary to translate. If the strings are scattered, you're grep-ing for "User already" all day.
2. **Consistency.** You never write "User doesn't exist" in one place and "User not found" in another.
3. **Code review signal.** If a PR adds a new message string, a reviewer can see in one file whether it matches the existing tone.

#### `config.ts` — already covered in Step 8

Despite being called a "constant," it's really runtime config — but it lives here because its consumers look in `constants/` for app-wide settings.

### 16.5 `utils/`

Pure, stateless helpers that don't fit in the service or repository layer. In this project:

#### `api_error.ts`

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

export { ApiError };
```

#### `api_response.ts`

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

export { ApiResponse };
```

Both are covered in depth in Step 14.

#### `common_functions.ts`

Small stateless helpers:

```ts
const parseQueryParam = (value: any, defaultValue: number): number => {
    const parsed = parseInt(String(value), 10);
    return isNaN(parsed) ? defaultValue : parsed;
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(value, max));
};

const validatePagination = (req: Request, maxLimit: number = 100): PaginationParams => {
    const page = clamp(parseQueryParam(req.query.page, 1), 1, Number.MAX_SAFE_INTEGER);
    const limit = clamp(parseQueryParam(req.query.limit, 1), 1, maxLimit);
    return { page, limit, offset: (page - 1) * limit };
};

const trimStrings = (obj: any): any => {
    const newObj: any = {};
    for (const key in obj) {
        newObj[key] = typeof obj[key] === "string" ? obj[key].trim() : obj[key];
    }
    return newObj;
};
```

Rule for `utils/`: **a function belongs here only if it's pure and reusable.** If it touches `prisma`, it belongs in a repository. If it touches `res.json`, it belongs in a controller. If it encodes business rules, it belongs in a service. The stuff left over — date formatters, pagination parsers, string trimmers — that's `utils/`.

### 16.6 `types/` — TypeScript global augmentation

Here's a tiny file with outsized importance:

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

This file tells the compiler "I'm extending the built-in `Express.Request` interface to include a `user` property." Now in every controller:

```ts
req.user.id       // ✅ fully typed, string
req.user.role     // ✅ fully typed, ROLES enum
req.user.nope     // ❌ compile error
```

The `declare global` + `namespace Express { interface Request { ... } }` is the **standard TypeScript pattern** for augmenting third-party types. Bookmark it — you'll use it for every library you extend.

> **You don't need to `import` this file anywhere.** TypeScript picks up `.d.ts` files inside `src/` automatically as part of the compilation context.

---

---

## 17. Step 13 — Winston Logger

### 17.1 Why `console.log` is a career-limiting habit

When you're learning, `console.log("hi")` is fine. The moment you ship something that runs for more than a day, it stops being fine, because:

1. **No levels.** Everything is the same priority. There's no way to filter "show me errors only" vs "show me everything." Every line is equal noise.
2. **No timestamps.** Good luck correlating a user's bug report at "around 3pm yesterday" with a flat stream of `console.log` lines.
3. **No structured metadata.** `console.log("user signed up", userId, email)` produces a string — to search it, you grep. `logger.info("user signed up", { userId, email })` produces JSON you can query with any log tool.
4. **No context.** You can't tell which file a log line came from without reading it.
5. **Can't be turned down.** In production you don't want every `console.log("entering function")` hitting stdout. A logger lets you set level to `warn` and kill the debug noise.

A real logger fixes all of these. I use **Winston**. Alternatives: **Pino** (faster, JSON-first, great for production), **Bunyan** (old but solid). All three solve the same problems. Pick one.

> **Why Winston over Pino in this project?** Honestly — Winston has pretty colored console output out of the box, which is nicer for a fresher watching their dev terminal. Pino is objectively faster in production. If you're shipping at scale, switch to Pino + `pino-pretty` in dev. For teaching, Winston wins.

### 17.2 Install

```bash
npm install winston
```

### 17.3 The full logger setup

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

Let me break down what each piece does.

#### The format pipeline

```ts
format: combine(
    colorize(),
    timestamp({ format: "HH:mm:ss DD-MM-YYYY" }),
    logFormat,
)
```

Winston formats are composable. `combine(a, b, c)` applies them in order.

- **`colorize()`** — adds ANSI color codes to the level name. `info` is green, `warn` is yellow, `error` is red. Works in any modern terminal.
- **`timestamp({ format: "HH:mm:ss DD-MM-YYYY" })`** — adds a `timestamp` field to every log with the format I like reading.
- **`logFormat`** (my custom printf) — the final stringifier.

#### The custom printf

```ts
const logFormat = printf(({ level, message, timestamp, ...extras }) => {
    const extraStr = Object.keys(extras).length
        ? " " + JSON.stringify(extras)
        : "";
    return `\n[${level}]: ${timestamp} ${message}${extraStr}`;
});
```

This takes a log record like:

```ts
logger.info("User signed up", { userId: "abc", email: "x@y.com" });
```

…and produces:

```
[info]: 14:32:10 18-04-2026 User signed up {"service":"auth.service","userId":"abc","email":"x@y.com"}
```

The `...extras` spread catches **every** extra field you pass — the `{ userId, email }` and the `service` name from child loggers — and dumps them as JSON. This is what makes the logs searchable.

#### `level: "debug"`

The minimum level that gets logged. Winston levels from verbose to critical:

```
silly → debug → verbose → info → http → warn → error
```

`debug` means "log everything." In production, bump it to `info` or `warn` to cut noise.

> **Sidebar — make this configurable.** In a real project, swap `level: "debug"` with `level: process.env.LOG_LEVEL || "info"` so you can control it per environment without editing code.

#### Transports

```ts
transports: [new winston.transports.Console()]
```

A transport is a destination. `Console()` sends logs to stdout. Winston also has `File`, `Http`, and a huge ecosystem of third-party ones (CloudWatch, Loggly, Datadog). You can add multiple — for example, log to console **and** to a rotating file. I kept it to one transport here to not clutter the learning path.

#### `getLogger(name)` — child loggers

```ts
export function getLogger(name: string) {
    return logger.child({ service: name });
}
```

This is the pattern that makes the logger useful across a big app. A child logger is a logger that automatically prepends a field to every log it emits.

In every file:

```ts
// at the top of the file
import { getLogger } from "../lib/logger";
const logger = getLogger("auth.service");
```

Then anywhere below:

```ts
logger.info("User signed up", { userId, email });
```

…produces a log line that includes `"service": "auth.service"` without you having to pass it every time. When you have 40 files logging, the `service` field lets you filter "show me only logs from `auth.service`" with a single grep or log-tool query.

The naming convention I use: `<filename>.<layer>`. Examples:

- `auth.controller`
- `auth.service`
- `user.repository`
- `auth.middleware`

Once this is consistent, reading logs feels like reading a call graph.

### 17.4 Logging levels in practice

| Level | When to use | Real example |
|---|---|---|
| `debug` | Verbose detail, only useful when actively debugging. | `"Entering login flow"` |
| `info` | Expected events that are worth knowing happened. | `"User signed up"` |
| `warn` | Something unexpected but recoverable. Usually a caller's fault. | `"Failed login attempt"`, `"Invalid token"` |
| `error` | Something went wrong that we didn't plan for. Needs investigation. | `"DB connection lost"`, `"Unexpected error in signup"` |

Rule of thumb: if you page someone at 3am for it, it's `error`. If it's "a user typed a wrong password," it's `warn`. If it's a normal business event, it's `info`.

### 17.5 Never log secrets

Look at my service logs:

```ts
logger.info("User signed up", { userId: user.id, email: user.email });
```

I log the user ID and email. I do **not** log the password, the password hash, or the JWT. Never put any of these in a log:

- Passwords (plain or hashed)
- JWT tokens
- API keys
- Full credit card numbers
- Full bearer headers

The moment a log aggregator or a CI dump leaks out, those would be the first things to go viral.

---

## 18. Step 14 — Error Handling

This is the section most tutorials skip entirely. Error handling is not "wrap everything in try/catch" — it's a contract between layers.

### 18.1 The two classes: `ApiError` and `ApiResponse`

Every single response from the API — success or failure — has the same shape. That's the contract.

#### `ApiResponse<T>` — the success envelope

```ts
// src/utils/api_response.ts
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

export { ApiResponse };
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
    "data": { "id": "...", "name": "...", "email": "...", "role": "VIEWER", "token": "..." }
}
```

The frontend team now knows: **every** success response has `code`, `message`, `data`. They write one TypeScript type, one fetch wrapper, done.

The generic `<T>` on the class gives you type safety — `new ApiResponse(201, "ok", user)` infers `T = User`, and downstream consumers get full autocomplete on `.data`.

#### `ApiError` — the failure envelope

```ts
// src/utils/api_error.ts
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

export { ApiError };
```

Three fields:

- **`code`** — the HTTP status (400, 401, 404, 409, 500, etc.).
- **`message`** — human-readable top-level reason ("Validation failed").
- **`errors`** — optional array of detailed messages (`["Email is required", "Password too short"]`). Useful for Zod validation errors where a single request can have multiple field-level issues.

Usage:

```ts
throw new ApiError(409, USER_FEEDBACK_MESSAGES.USER_ALREADY_EXISTS);
throw new ApiError(400, "Validation failed", ["Email invalid", "Password too short"]);
```

Wire format:

```json
{
    "code": 409,
    "message": "User already exists",
    "errors": []
}
```

Key detail: **it extends `Error`**. That matters because:

1. It interacts correctly with `try/catch` and `instanceof`.
2. `Error.captureStackTrace(this, this.constructor)` scrubs the stack so the throw site (not the class constructor) is at the top of the trace. When you're debugging, you see the *actual* file that threw, not `api_error.ts:9`.

### 18.2 The controller try/catch pattern

```ts
const signup = async (req: Request, res: Response) => {
    try {
        const userData = { /* pull from req.body */ };
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

The flow:

1. **Happy path** — build `ApiResponse`, send it, done.
2. **Known error (`ApiError`)** — thrown by our own code in the service or schema layer. The HTTP status is already on the error (`.code`). Log at `warn` (because it's a user-caused failure, not a system failure) and send the error straight to the client.
3. **Unknown error (anything else)** — database crash, third-party API blowing up, my own typo. Log at `error` level with the full message, but **never** send the raw error to the client. Send a sanitized generic 500 instead. Real error details stay in server logs.

That last point is a security principle: **never leak internal errors.** A stack trace telling the world "Postgres connection timed out at db.acme-internal.local" is a gift to attackers. The client just sees `"Internal server error"`; you as the operator see the full story in your logs.

### 18.3 Why throw `ApiError` in services instead of returning errors?

You might wonder why the service does:

```ts
throw new ApiError(409, "User already exists");
```

…instead of returning `{ success: false, error: "..." }`.

Three reasons:

1. **Throw propagates.** If signup calls a sub-function that calls another function, an error thrown five layers deep still bubbles to the controller's catch. No manual forwarding.
2. **No null-checking noise.** Without throw, every caller has to `if (result.error) return` — which adds noise at every call site.
3. **Decouples failure paths from return types.** The service signature is "returns a user, or throws if something went wrong." Clean mental model.

### 18.4 The "can I do better?" — centralized error middleware

The try/catch in every controller is repetitive. Express supports **error-handling middleware** that catches thrown errors globally:

```ts
// a future refactor — not in this project yet
app.use((err, req, res, next) => {
    if (err instanceof ApiError) return res.status(err.code).json(err);
    logger.error("Unexpected", { err: err.message });
    res.status(500).json(new ApiError(500, "Internal server error"));
});
```

With that, your controllers can drop the try/catch entirely — just `throw`, and the middleware handles it. You'd need a tiny `asyncHandler(fn)` wrapper to catch rejected promises, since Express 4 doesn't auto-catch `async` errors (Express 5, which this project uses, does catch them, making this refactor especially clean).

I left the repetitive try/catch in the current code because it's **explicit and obvious for a fresher reading the file**. Once you're comfortable, the global error handler is the next step.

### 18.5 The status code conventions I use

| Code | When |
|---|---|
| 200 | GET success, update success without creation |
| 201 | POST that created a new resource |
| 204 | DELETE success (no body) |
| 400 | Validation failed — client sent malformed input |
| 401 | Not authenticated (no token, bad token) |
| 403 | Authenticated, but not authorized (role check fails) |
| 404 | Resource doesn't exist |
| 409 | Conflict — e.g. duplicate email on signup |
| 422 | Semantically invalid but well-formed (less common; I use 400 for both) |
| 500 | Something broke and it's our fault |

Stick to these. Don't get creative. A frontend dev reading your API expects these standard meanings.

---

## 19. Step 15 — Zod Input Validation

### 19.1 Why Zod

TypeScript types vanish at runtime. That means:

```ts
interface SignupDTO {
    email: string;
    password: string;
}

function signup(data: SignupDTO) {
    // data.email is typed as string in the IDE
    // but at runtime, data might literally be: { evilPayload: "<script>" }
}
```

A caller can send **anything** in `req.body`. TypeScript's `SignupDTO` is a wish, not a guarantee. You need **runtime validation**.

Options:

- **Roll your own** — lots of `if (typeof x !== "string") ...`. Tedious, inconsistent, hard to maintain.
- **`express-validator`** — older, chain-based API, middleware-oriented. Functional but ugly.
- **`joi`** — the old guard. Not TypeScript-native (types are bolted on).
- **`yup`** — popular in React-form-land. Similar to Zod.
- **`zod`** — TypeScript-native, infers types from schemas, composable, great error messages, v4 is fast.

> **My pick: Zod.** It's the one validation library where the schema *is* the type. You define it once, you get both a runtime validator and a TypeScript type from the same file.

### 19.2 Install

```bash
npm install zod
```

### 19.3 The full user-schemas file

```ts
// src/schemas/user.schemas.ts
import * as z from "zod/v4";
import { USER_VALIDATION_ERRORS } from "../constants/app.messages";
import { REGEX, LIMITS, ROLES } from "../constants/app.constants";
import { trimStrings } from "../utils/common_functions";
import { ApiError } from "../utils/api_error";

// Reusable validators
const emailSchema = z.email(USER_VALIDATION_ERRORS.EMAIL_INVALID).transform((val) => val.toLowerCase());

const passwordSchema = z
    .string()
    .min(LIMITS.PASSWORD_MIN, USER_VALIDATION_ERRORS.PASSWORD_LENGTH_INVALID)
    .regex(REGEX.PASSWORD, USER_VALIDATION_ERRORS.PASSWORD_INVALID);

const nameSchema = z
    .string()
    .min(LIMITS.NAME_MIN, USER_VALIDATION_ERRORS.NAME_MIN)
    .max(LIMITS.NAME_MAX, USER_VALIDATION_ERRORS.NAME_MAX);

// Schemas
const UserSignupSchema = z.object({
    first_name: nameSchema,
    last_name: nameSchema,
    email: emailSchema,
    phone_number: z.string().regex(REGEX.PHONE, "Phone number must be 10 digits and cannot start with 0"),
    password: passwordSchema,
});

const UserLoginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

const validateUserSignup = (user: unknown) => {
    const result = UserSignupSchema.safeParse(trimStrings(user));
    if (!result.success) {
        const errors = result.error.issues.map((i) => i.message);
        throw new ApiError(400, "User registration validation failed", errors);
    }
    return result.data;
};

const validateUserLogin = (user: unknown) => {
    const result = UserLoginSchema.safeParse(trimStrings(user));
    if (!result.success) {
        throw new ApiError(
            400,
            "User login validation failed",
            result.error.issues.map((i) => i.message),
        );
    }
    return result.data;
};

export { validateUserSignup, validateUserLogin /* ... */ };
```

Let me break the pattern apart.

### 19.4 Reusable sub-schemas

```ts
const emailSchema = z.email(USER_VALIDATION_ERRORS.EMAIL_INVALID).transform((val) => val.toLowerCase());
const passwordSchema = z.string().min(LIMITS.PASSWORD_MIN, ...).regex(REGEX.PASSWORD, ...);
const nameSchema = z.string().min(LIMITS.NAME_MIN, ...).max(LIMITS.NAME_MAX, ...);
```

Build leaf schemas once, reuse them in larger object schemas. The payoff:

- **`email`** — uses `z.email()` which has built-in validation. `.transform(v => v.toLowerCase())` is a *Zod pipeline step* — after validation, transform the data. So `"John@X.com"` comes out as `"john@x.com"` automatically. The service never sees mixed-case emails.
- **`password`** — two chained rules. `.min(8, msg)` for length, `.regex(...)` for complexity (at least one uppercase, lowercase, digit, special char). Error messages come from `USER_VALIDATION_ERRORS` — the same constants file from Step 12.
- **`name`** — min and max length with matching error messages.

When `UserSignupSchema` later composes `nameSchema` twice (for `first_name` and `last_name`), both fields automatically have identical validation without duplication.

### 19.5 Composing into object schemas

```ts
const UserSignupSchema = z.object({
    first_name: nameSchema,
    last_name: nameSchema,
    email: emailSchema,
    phone_number: z.string().regex(REGEX.PHONE, "..."),
    password: passwordSchema,
});
```

Reads like English: "a signup payload is an object with these five fields, each constrained as shown."

The object schema also rejects **extra** fields by default — no, you can't send `role: "ADMIN"` on signup and hope it sticks. That's one of Zod's killer features for security.

### 19.6 The `safeParse` + throw pattern

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

Critical choices:

- **`safeParse`, not `parse`.** `parse` throws a `ZodError` on failure; `safeParse` returns `{ success, data, error }`. I prefer `safeParse` because it forces me to explicitly handle failure and control the error type thrown (an `ApiError`, not a raw `ZodError`).
- **`trimStrings(user)` first.** Trim every string field before validating. `"  john@x.com  "` shouldn't fail email validation just because the user hit spacebar.
- **Parameter type is `unknown`, not `any`.** `unknown` means "I don't know the shape, and the compiler won't let me access properties without validating first." It's the correct type for untrusted input.
- **Return `result.data`.** After validation, you have a **typed, trimmed, transformed** object. The service can use it directly with full type safety.
- **Throw `ApiError(400, ..., errors[])`.** Zod's `.issues` array has one entry per failed rule. I map each to its `.message` and pass them as the `errors` field of `ApiError`. So a response for a form with three invalid fields looks like:

    ```json
    {
        "code": 400,
        "message": "User registration validation failed",
        "errors": [
            "Email must be a valid email address.",
            "Password must be at least 8 characters long",
            "Phone number must be 10 digits and cannot start with 0"
        ]
    }
    ```

    The frontend renders all three errors at once instead of "fix one, submit, fix next, submit."

### 19.7 Where validation runs — at the top of the service, not the controller

Look at the signup service again:

```ts
async signup(userData: any) {
    validateUserSignup(userData);   // <-- first line
    // ... business logic ...
}
```

Validation lives at the top of every service method, not in the controller. Reason: the service is the security boundary. If you ever expose the same logic through a different entry point (a GraphQL resolver, a CLI, a background job), validation still runs — because the service runs.

If validation were in the controller only, and someone later added a GraphQL resolver that called the service directly, they'd bypass validation by accident. That's a bug waiting to happen.

### 19.8 Inferring types from schemas (the killer Zod trick)

I don't use this in the current code, but you absolutely should in your own:

```ts
const UserSignupSchema = z.object({ ... });
type UserSignupDTO = z.infer<typeof UserSignupSchema>;
```

That `type UserSignupDTO` is generated **from** the schema. If you add a field to the schema, the type updates automatically. You replace `userData: any` in the service with `userData: UserSignupDTO` and now:

- The IDE autocompletes every field.
- TypeScript catches typos at compile time.
- Refactors across files stay safe.

Once you get used to this, writing manual TypeScript `interface`s for API input feels primitive.

### 19.9 Other schemas in the project

For completeness, here are the other validators in the same file:

- `UserUpdateSchema` — like signup but every field is `.optional()`, for `PATCH /users` where users only send the fields they want to change.
- `UserRoleSchema` — a `z.enum(...)` restricted to the four roles. Rejects any other value cold.
- `UserPasswordUpdateSchema` — requires current + new password (and the new password goes through `passwordSchema`).

Same `validateX` pattern for each: `safeParse` → on failure, throw `ApiError(400)` with the field-level errors.

---

---

## 20. Step 16 — The End-to-End Command Order

Here is the **entire project, from an empty folder to a running server**, in the exact order I'd run things if I had to start over tomorrow. If you followed along in order, you've already done each of these — this section is the reference card you come back to.

### 20.1 From scratch (building the repo)

```bash
# 0. Init the folder
mkdir finance-dashboard && cd finance-dashboard
git init

# 1. Create package.json
npm init -y

# 2. TypeScript
npm install --save-dev typescript @types/node
npx tsc --init         # then edit tsconfig.json to the version in Step 6

# 3. Dev runner
npm install --save-dev tsx

# 4. Prettier
npm install --save-dev prettier
#   create .prettierrc and .prettierignore (Step 9)

# 5. Express + friends
npm install express cors dotenv
npm install --save-dev @types/express @types/cors

# 6. Auth deps
npm install bcrypt jsonwebtoken
npm install --save-dev @types/bcrypt @types/jsonwebtoken

# 7. Validation + logging
npm install zod winston

# 8. Prisma
npm install --save-dev prisma
npm install @prisma/client @prisma/adapter-pg pg
npm install --save-dev @types/pg
npx prisma init --datasource-provider postgresql
#   edit prisma/schema.prisma
#   create prisma.config.ts at project root
#   in tsconfig: "include": ["src", "prisma", "prisma.config.ts"], "rootDir": "./"

# 9. Env
cp .env.example .env   # or create both files by hand
#   fill in values in .env

# 10. First migration + client
npm run db:generate
npm run db:migrate
#   (Prisma will ask for a migration name — "init" works)

# 11. Seed the DB
npm run db:seed

# 12. Start the server
npm run dev
```

At this point `http://localhost:5000/health` should return:

```json
{ "status": "Server is Up and Running!" }
```

### 20.2 After cloning (onboarding a teammate)

This is the bar I hold every project to: **six commands from clone to running.**

```bash
git clone <repo-url>
cd <repo-name>
npm install
cp .env.example .env     # then fill in values
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

If a teammate needs more than this to get your project running, your README has failed. Go fix it.

### 20.3 Daily dev loop

```bash
npm run dev              # leave running in a terminal tab

# when you edit schema.prisma
npm run db:migrate       # create + apply a new migration

# when you want to eyeball the DB
npm run db:studio

# when the DB is in a weird state
npm run db:reset         # nukes, re-migrates, re-seeds

# before committing
npm run format
```

### 20.4 Deploying to production

```bash
# 1. On your deploy target:
npm ci --production=false   # or: npm install --include=dev (we need tsc)
npm run db:generate
npm run db:migrate:prod     # NOT migrate dev — never in prod
npm run build               # produces dist/
npm start                   # runs node dist/index.js
```

Most platforms (Render, Railway, Fly.io) bake this into a build-command and start-command pair. Set:

- **Build:** `npm ci && npm run db:generate && npm run build`
- **Start:** `npm run db:migrate:prod && npm start`

And let the platform handle the rest.

---

## 21. Step 17 — Postman and API Docs

A backend without API documentation is a blocking task for every frontend dev on your team. You have three realistic options:

1. **Postman collection** — a JSON file committed to the repo. What I do.
2. **Swagger/OpenAPI** — a `openapi.yaml` spec, viewable in a browser. The industry standard.
3. **A handwritten `API.md`** — markdown in the repo. What I also do, alongside the Postman collection.

### 21.1 Why I ship a Postman collection

In my repo there's a file called `Finance Dashboard.postman_collection.json`. Any teammate can:

1. Open Postman.
2. Click **Import** → drop the file.
3. Get every endpoint pre-configured, with example request bodies, authentication, environment variables, the lot.

The first API call after cloning is now **one click** instead of ten minutes of piecing together the URL, body shape, and headers from reading the code.

How to make one:

1. Work through your API in Postman while building (which is already the natural dev loop).
2. Once each endpoint works, right-click the request → **Save As** → add to a collection named after your project.
3. When the collection is shaped how you like, click the collection → **Export** → **Collection v2.1 (recommended)**.
4. Commit the resulting JSON to the repo.

Update it whenever an endpoint changes. Yes, this is manual. Yes, it's still worth doing, because it takes 20 seconds and saves every teammate 20 minutes.

### 21.2 The companion `API.md`

Postman is interactive, but when you want to **read** the API — during code review, during design discussions, on your phone at 2am — a markdown file is better. My `API.md` has one row per endpoint with:

- **Method + path** (`POST /api/auth/signup`)
- **Auth requirement** ("public" / "authenticated" / "role: ADMIN")
- **Request body shape** (code-fenced JSON example)
- **Response body shape** (code-fenced JSON example, for both success and the main error cases)
- **Notes** about edge cases or non-obvious behavior

Committed to the repo, next to the code. When the endpoint changes, the PR updates the doc in the same commit.

### 21.3 If you go the OpenAPI route instead

For larger projects, generate an OpenAPI spec. A few options:

- Handwrite `openapi.yaml` (pure, boring, reliable).
- Use `zod-to-openapi` — generates the spec from your existing Zod schemas. Schema is still the source of truth.
- Use `tsoa` or `NestJS` — they generate OpenAPI from decorators. More setup cost.

The upside: you get Swagger UI for free (`/docs` endpoint), codegen for frontend SDKs, and type-safe contracts across languages. The downside: more moving parts. For a fresher project, Postman + markdown beats OpenAPI in time-to-value. Upgrade later.

---

## 22. What I Left Out (and Would Add Next)

This guide takes you from zero to a production-shaped backend. It does **not** take you all the way to battle-hardened. Here's what's missing, in rough priority order — each of these is a future article:

### 22.1 Rate limiting

Nothing is stopping an attacker from hitting `POST /login` one million times per second to brute-force passwords. Add [`express-rate-limit`](https://www.npmjs.com/package/express-rate-limit) with a tight policy on `/auth/*` (e.g. 10 requests per 15 minutes per IP) and a looser one app-wide.

### 22.2 Centralized error middleware

I showed the sketch in Step 14. Doing it for real means replacing every controller try/catch with a `throw` + a `asyncHandler(fn)` wrapper (or relying on Express 5's native async support). Net effect: controllers get 30% shorter and more readable.

### 22.3 Refresh tokens

My JWT expires in 10 hours and users re-login after that. Real apps use a **short-lived access token** (15 min) plus a **long-lived refresh token** (30 days, stored in an HTTP-only cookie) and an endpoint to mint a new access token from the refresh. Significantly more secure.

### 22.4 Integration tests

Nothing in this project is tested. Add:

- `vitest` or `jest` for the runner (I prefer Vitest — faster, zero config).
- `supertest` for hitting the Express app directly.
- A separate test Postgres database (spin it up in Docker for CI).

Integration tests beat unit tests for backends: test the real flow, with the real DB, using the exported `app` from `app.ts` (this is why we split `app.ts` and `index.ts` in the first place — see Step 4).

### 22.5 ESLint

Prettier handles formatting. ESLint catches **bugs**. Unused imports, unreachable code, suspicious `any`, unhandled promise rejections. Combine with `eslint-config-prettier` so the two don't fight.

### 22.6 Dockerfile + docker-compose

A one-command local setup:

```yaml
# docker-compose.yml (sketch)
services:
    db:
        image: postgres:16
        environment: { POSTGRES_PASSWORD: root }
    app:
        build: .
        depends_on: [db]
```

Then `docker compose up` and your teammate doesn't even need Postgres installed locally. Huge win for onboarding.

### 22.7 CI/CD

GitHub Actions workflow that on every PR:

1. Runs `npm ci`.
2. Runs `npm run format:check` (fails if unformatted).
3. Runs `npm run build` (fails on TypeScript errors).
4. Runs `npm test` (once you have tests).

And on every merge to `main`, deploys to your hosting platform. Takes an afternoon to set up, prevents a thousand future incidents.

### 22.8 Observability

Logging is step one. Step two is:

- **Metrics** (Prometheus, or a managed service). How many requests per second? What's the p99 latency? How often does `/login` 401?
- **Tracing** (OpenTelemetry). When a request is slow, which DB query was the bottleneck?
- **Alerts** (PagerDuty, Slack). When something breaks at 3am, someone gets woken up.

Pointless for a toy project. Essential when real users depend on your service.

### 22.9 Secret management

For local dev, `.env` is fine. For production, **do not** paste secrets into a `.env` file on your server. Use your platform's secret manager (Railway secrets, Fly secrets, AWS Secrets Manager, Doppler, etc.). The rule: secrets never touch disk as plaintext.

### 22.10 A global error handler for uncaught async rejections

```ts
process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason });
});
process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { err });
    process.exit(1);
});
```

A safety net. Should almost never fire — but when it does, at least you get a log line instead of a silent dead process.

---

## Closing

If you've read this far, you have the full mental model of a production-shaped Node.js backend:

- **The scaffolding** — `package.json`, `tsconfig.json`, `.env.example`, `.prettierrc`, `.gitignore`.
- **The runtime** — `tsx watch` in dev, `tsc` + `node` in prod.
- **The database layer** — Prisma schema, migrations, connection pooling, the singleton pattern, idempotent seeding.
- **The architecture** — routes → controllers → services → repositories, each with exactly one job.
- **The cross-cutting concerns** — a structured logger, a consistent `ApiError`/`ApiResponse` contract, Zod-validated input at the service boundary, JWT-based auth middleware.

None of this is novel. Every piece is a well-known pattern. The value isn't in any single piece — it's in seeing them assembled into a coherent shape, with clear rules about what goes where and why.

Copy this setup. Fork it. Rename the domain from "finance records" to whatever you're actually building. Ship it. Then come back and add rate limiting, tests, Docker, CI — the next layer of polish.

And when you build your next backend, steal this structure again. After about three projects, it stops being something you copy and becomes something you think in. That's the goal.

Happy shipping.

---

*This article walks through the exact structure of my finance-dashboard backend ([github.com/Dev22603/finance-dashboard](https://github.com/Dev22603/finance-dashboard)). Clone it, read it alongside this article, and the abstract explanations become concrete.*


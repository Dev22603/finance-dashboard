---
name: finance-dashboard-blueprint
description: >
  Scaffolds the full finance-dashboard project skeleton in an empty or existing repository.
  Replicates: Express 5 + Prisma 7 + PostgreSQL + TypeScript 6, 4-tier RBAC (SUPERADMIN/ADMIN/ANALYST/VIEWER),
  repository pattern, object-literal services, ApiError/ApiResponse, Zod v4 validation,
  Winston child loggers, soft delete on records, time-series analytics with raw SQL, SUPERADMIN seed.
  Use when the user says "use the finance-dashboard blueprint", "scaffold like finance-dashboard",
  "replicate this project", "set up this architecture", or "start a new finance API project".
---

# Finance Dashboard Blueprint

A production-grade REST API for a personal finance dashboard. The architecture is clean and layered: Express routes → controllers → services → repositories → Prisma + PostgreSQL. Validation lives in Zod v4 schemas called from the service layer. JWT auth with a 4-tier RBAC system (SUPERADMIN, ADMIN, ANALYST, VIEWER) protects every route. A dedicated dashboard domain uses raw SQL for efficient time-series aggregations (monthly/weekly trends, category breakdowns). Winston provides structured child-logger-per-module logging. Strict TypeScript 6 with NodeNext module resolution. No test framework — placeholder only.

---

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20.x+ |
| Language | TypeScript | ^6.0.2 |
| Framework | Express | ^5.2.1 |
| ORM | Prisma | ^7.6.0 |
| DB Adapter | @prisma/adapter-pg + pg | ^7.6.0 / ^8.20.0 |
| Database | PostgreSQL | 14+ |
| Validation | Zod v4 | ^4.3.6 |
| Auth | JWT (jsonwebtoken) | ^9.0.3 |
| Password hashing | bcrypt | ^6.0.0 |
| Logging | Winston | ^3.19.0 |
| CORS | cors | ^2.8.6 |
| Env loading | dotenv | ^17.4.0 |
| Dev runner | tsx (watch mode) | ^4.21.0 |
| Formatter | Prettier | (devDep, no ESLint) |
| Testing | None | — |

---

## Prerequisites

1. **Node.js >= 20.x** — `node -v`
2. **npm** — comes with Node.js (project uses npm, not pnpm/yarn)
3. **PostgreSQL 14+** running locally or via Docker:
   ```bash
   docker run --name finance-pg -e POSTGRES_PASSWORD=root -e POSTGRES_DB=budget -p 5432:5432 -d postgres:16
   ```
4. **Prisma CLI** — installed via devDependencies, invoke via `npm run db:*` scripts

---

## Phase A — Scaffold a New Project

Follow these steps in order. Reference files in `references/` for full file contents.

### A1. Directory structure

```bash
mkdir -p src/routes src/controllers src/services src/repositories
mkdir -p src/middlewares src/schemas src/constants src/lib src/utils src/types
mkdir -p prisma/migrations
```

See `references/directory-tree.md` for the full annotated tree.

### A2. Package manifest

Copy `package.json` from `references/dependencies.md`. Key decisions to preserve:
- No `"type": "module"` field — NodeNext resolution handles ESM/CJS interop
- `"main": "dist/index.js"` — compiled output entry
- `db:*` scripts wrap Prisma CLI commands
- `dev` uses `tsx watch src/index.ts` (no ts-node, no nodemon)

```bash
npm install
```

### A3. TypeScript configuration

Create `tsconfig.json` from `references/config-files.md`. Critical settings:
- `"target": "ES2022"`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`
- `"rootDir": "./"`, `"outDir": "./dist"`
- `"strict": true`, `"skipLibCheck": true`, `"esModuleInterop": true`
- `"include": ["src", "prisma", "prisma.config.ts"]`

### A4. Environment variables

Copy content from `references/env-template.md` into `.env.example`, then create `.env`:
```bash
cp .env.example .env
# Fill in real values — never commit .env
```

### A5. Prisma schema and config

1. Copy schema from `references/prisma-schema.md` to `prisma/schema.prisma`
2. Create `prisma.config.ts` at project root (content in `references/config-files.md`)
3. Run migrations and seed:

```bash
npm run db:generate   # generates client to src/generated/prisma/
npm run db:migrate    # applies migrations to local DB
npm run db:seed       # creates SUPERADMIN from env vars
```

### A6. Config files

Copy from `references/config-files.md`:
- `.prettierrc` — tabs, printWidth 130, LF line endings
- `.prettierignore`
- `.gitignore` — excludes `node_modules`, `dist`, `.env`, `src/generated`

### A7. Source files — entry point and app

**`src/index.ts`**:
```typescript
import { app } from "./app";
import { config } from "./constants/config";
import logger from "./lib/logger";

app.listen(config.PORT, () => {
    logger.info(`Server is running on http://localhost:${config.PORT}`);
});
```

**`src/app.ts`** — note CORS_ORIGIN from env:
```typescript
import express from "express";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import recordRoutes from "./routes/record.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import cors from "cors";

const app = express();
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
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

### A8. Source files — all layers

Scaffold every file below (full implementations in `references/code-patterns.md`):

| File | Purpose |
|------|---------|
| `src/constants/app.constants.ts` | REGEX, LIMITS, ROLES enum, RECORD_TYPES enum |
| `src/constants/app.messages.ts` | USER_VALIDATION_ERRORS, USER_FEEDBACK_MESSAGES, GLOBAL_ERROR_MESSAGES |
| `src/constants/config.ts` | dotenv-loaded typed config object with fallback defaults |
| `src/lib/logger.ts` | Winston logger + `getLogger(name)` child-logger factory |
| `src/lib/prisma.ts` | PrismaPg singleton (globalThis pattern, avoids hot-reload leaks) |
| `src/types/express.d.ts` | Global Express `req.user` type augmentation |
| `src/utils/api_error.ts` | `ApiError` class: `code`, `message`, `errors[]` |
| `src/utils/api_response.ts` | `ApiResponse<T>` class: `code`, `message`, `data` |
| `src/utils/common_functions.ts` | `trimStrings`, `validatePagination`, `formatDate` |
| `src/middlewares/auth.ts` | `authenticate` (JWT verify) + `authorize(roles[])` (RBAC guard) |
| `src/schemas/user.schemas.ts` | Zod v4 schemas for signup, login, update, role change, password change |
| `src/schemas/record.schemas.ts` | Zod v4 schemas for create, update, query filters |
| `src/repositories/user.repositories.ts` | All Prisma user operations (passwordHash omitted from selects) |
| `src/repositories/record.repositories.ts` | All Prisma record ops + raw SQL for trends/breakdown |
| `src/services/auth.services.ts` | signup + login: validate → hash → JWT sign |
| `src/services/user.services.ts` | User CRUD with RBAC business rules |
| `src/services/record.services.ts` | Record CRUD with soft delete |
| `src/services/dashboard.services.ts` | Analytics: summary, category breakdown, monthly/weekly trends |
| `src/controllers/auth.controllers.ts` | signup, login handlers |
| `src/controllers/user.controllers.ts` | getMe, getAllUsers, getUserById, updateUser, updateUserRole, changePassword, reactivateUser, deleteUser |
| `src/controllers/record.controllers.ts` | getAllRecords, getRecordById, createRecord, updateRecord, deleteRecord |
| `src/controllers/dashboard.controllers.ts` | getDashboardSummary, getCategoryTotals, getMonthlyTrends, getWeeklyTrends, getRecentActivity |
| `src/routes/auth.routes.ts` | POST /signup, POST /login (no auth) |
| `src/routes/user.routes.ts` | User CRUD routes with per-route auth/authorize |
| `src/routes/record.routes.ts` | Record CRUD routes with per-route auth/authorize |
| `src/routes/dashboard.routes.ts` | Dashboard analytics routes (ANALYST+ only) |
| `prisma/seed.ts` | Creates SUPERADMIN from env vars if not exists |

### A9. Verification

```bash
npm install
npm run db:generate   # "Generated Prisma Client" → src/generated/prisma/
npm run db:migrate    # migrations applied
npm run db:seed       # "SUPER ADMIN ACCOUNT successfully created!"
npm run dev           # "Server is running on http://localhost:5000"

# Smoke tests
curl http://localhost:5000/health
# → {"status":"Server is Up and Running!"}

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<SUPER_ADMIN_EMAIL>","password":"<SUPER_ADMIN_PASSWORD>"}'
# → {"code":200,"message":"Logged in successfully","data":{"token":"...","role":"SUPERADMIN",...}}
```

---

## Phase B — Pattern Guide (adding new features)

Read `references/code-patterns.md` for complete verbatim implementations. Summary:

### Adding a new resource (e.g. "Budget")

**1. Prisma model** — append to `prisma/schema.prisma`:
```prisma
model Budget {
  id        String   @id @default(uuid())
  name      String
  amount    Decimal  @db.Decimal(12, 2)
  createdBy String
  user      User     @relation(fields: [createdBy], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```
Then: `npm run db:migrate`

**2. Repository** — `src/repositories/budget.repositories.ts`:
```typescript
import { prisma } from "../lib/prisma";
import { getLogger } from "../lib/logger";
const logger = getLogger("budget.repository");

export const budgetRepository = {
    async createBudget(data: { name: string; amount: number; createdBy: string }) {
        try {
            return await prisma.budget.create({ data });
        } catch (error) {
            logger.error("DB error — createBudget", { error: (error as Error).message });
            throw error;
        }
    },
};
```

**3. Zod schema** — `src/schemas/budget.schemas.ts`:
```typescript
import * as z from "zod/v4";
import { ApiError } from "../utils/api_error";

const createBudgetSchema = z.object({
    name: z.string().min(1, "Name is required"),
    amount: z.number().positive("Amount must be positive"),
});

export function validateCreateBudget(data: unknown) {
    const result = createBudgetSchema.safeParse(data);
    if (!result.success) {
        throw new ApiError(400, "Budget validation failed", result.error.issues.map(i => i.message));
    }
    return result.data;
}
```

**4. Service** — `src/services/budget.services.ts`:
```typescript
import { budgetRepository } from "../repositories/budget.repositories";
import { validateCreateBudget } from "../schemas/budget.schemas";
import { getLogger } from "../lib/logger";
const logger = getLogger("budget.service");

export const budgetService = {
    async createBudget(data: unknown, createdBy: string) {
        const validated = validateCreateBudget(data);
        const budget = await budgetRepository.createBudget({ ...validated, createdBy });
        logger.info("Budget created", { budgetId: budget.id, createdBy });
        return budget;
    },
};
```

**5. Controller** — `src/controllers/budget.controllers.ts`:
```typescript
import { Request, Response } from "express";
import { budgetService } from "../services/budget.services";
import { ApiError } from "../utils/api_error";
import { ApiResponse } from "../utils/api_response";
import { GLOBAL_ERROR_MESSAGES } from "../constants/app.messages";
import { getLogger } from "../lib/logger";
const logger = getLogger("budget.controller");

const createBudget = async (req: Request, res: Response) => {
    try {
        const budget = await budgetService.createBudget(req.body, req.user.id);
        res.status(201).json(new ApiResponse(201, "Budget created successfully", budget));
    } catch (error) {
        if (error instanceof ApiError) return res.status(error.code).json(error);
        logger.error("Unexpected error", { error: (error as Error).message });
        res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
    }
};

export { createBudget };
```

**6. Route** — `src/routes/budget.routes.ts`:
```typescript
import express from "express";
import { createBudget } from "../controllers/budget.controllers";
import { authenticate, authorize } from "../middlewares/auth";
import { ROLES } from "../constants/app.constants";

const router = express.Router();
router.post("/", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), createBudget);
export default router;
```

**7. Mount** — in `src/app.ts`:
```typescript
import budgetRoutes from "./routes/budget.routes";
app.use("/api/budgets", budgetRoutes);
```

### Error handling contract

Always throw `ApiError` from services/repositories. Never call `res.status().json()` directly below the controller layer:
```typescript
throw new ApiError(404, "Resource not found");           // single message
throw new ApiError(400, "Validation failed", errors);    // with errors array
throw new ApiError(409, "Resource already exists");      // conflict
throw new ApiError(403, "Forbidden");                    // RBAC violation
```

Controllers follow this pattern — no variations:
```typescript
try {
    const result = await someService.doThing(...);
    res.status(200).json(new ApiResponse(200, "Done", result));
} catch (error) {
    if (error instanceof ApiError) return res.status(error.code).json(error);
    logger.error("Unexpected error", { error: (error as Error).message });
    res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
}
```

### Auth guard usage

```typescript
router.get("/me", authenticate, getMe);                                           // any authenticated user
router.get("/", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), fn);   // role-restricted
router.post("/", authenticate, authorize([ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPERADMIN]), fn);
```

`authenticate` sets `req.user = { id, name, role }` from decoded JWT.
`authorize(roles)` checks `roles.includes(req.user.role)`.

### RBAC rules (business logic layer)

The service layer enforces additional RBAC beyond route-level guards:
- SUPERADMIN cannot delete themselves or change their own role
- ADMIN cannot modify other ADMINs or SUPERADMINs
- ADMIN cannot assign ADMIN or higher roles
- SUPERADMIN role cannot be assigned via API (only via seed)

### Logging convention

```typescript
const logger = getLogger("module.name");   // declare once per file
logger.info("Action succeeded", { userId, resourceId });
logger.warn("Suspicious / failed attempt", { email, path: req.path });
logger.error("DB or unexpected error", { error: (error as Error).message });
```

### Adding raw SQL analytics

Use `prisma.$queryRaw` with tagged template literals:
```typescript
async getMonthlyTrends() {
    return await prisma.$queryRaw<Array<{ month: string; total: number; count: number }>>`
        SELECT
            TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month,
            SUM(amount)::float AS total,
            COUNT(*)::int AS count
        FROM "Record"
        WHERE "deletedAt" IS NULL
        GROUP BY DATE_TRUNC('month', date)
        ORDER BY DATE_TRUNC('month', date) ASC
    `;
}
```

---

## Phase C — Applying to an Existing Repo

### C1. Safety check
```bash
git status    # Warn if uncommitted changes — recommend stashing first
git stash     # Optional: stash before proceeding
```

### C2. Conflict detection
```bash
find . -type f ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" | sort
```
Present conflicts against Phase A scaffold list. Ask user:
- **Overwrite all** — destructive, do `git stash` first
- **Skip conflicts** — only create new files, leave existing untouched
- **Review each** — show diff and ask per file (safe but slow)

### C3. Dependency merge

Do NOT replace `package.json`. Merge by reading both files and combining `dependencies` + `devDependencies`, preferring blueprint versions for shared packages. Then `npm install`.

### C4. Prisma merge

Do NOT wipe `prisma/schema.prisma`. Instead:
- Append new models to the bottom
- Merge enums (add missing values only)
- Never modify existing model fields without explicit user confirmation per field
- Run `npm run db:migrate` after appending

### C5. Source files

Only create files that do not already exist. For each conflict:
1. Show diff between blueprint version and existing file
2. Ask: **Keep existing** | **Use blueprint** | **Merge manually**

---

## Verification Checklist

- [ ] `npm install` — no peer dependency errors
- [ ] `npm run db:generate` — Prisma client generated to `src/generated/prisma/`
- [ ] `npm run db:migrate` — all migrations applied, no pending
- [ ] `npm run db:seed` — SUPERADMIN created (or "already created")
- [ ] `npm run build` — TypeScript compiles with 0 errors
- [ ] `npm run dev` — server starts, logs port 5000
- [ ] `GET /health` — returns `{"status":"Server is Up and Running!"}`
- [ ] `POST /api/auth/signup` — creates user, returns `{token, id, name, email, role}`
- [ ] `POST /api/auth/login` — returns `{token, role, name}`
- [ ] `GET /api/users/me` with `Authorization: Bearer <token>` — returns user object
- [ ] `GET /api/dashboard/summary` with ANALYST+ token — returns analytics

---

## Reference Files Index

| File | Contents |
|------|----------|
| `references/directory-tree.md` | Full annotated project tree |
| `references/prisma-schema.md` | Complete Prisma schema with field explanations |
| `references/config-files.md` | All config files verbatim (tsconfig, prettier, prisma.config, gitignore) |
| `references/code-patterns.md` | Real verbatim implementations of every source layer |
| `references/dependencies.md` | Full package.json with version notes |
| `references/env-template.md` | Every env var with description and safe example value |

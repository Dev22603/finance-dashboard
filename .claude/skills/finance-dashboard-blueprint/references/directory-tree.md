# Directory Tree

Full annotated project structure for finance-dashboard.

```
finance-dashboard/
├── prisma/
│   ├── migrations/
│   │   ├── 20260403091455_init/
│   │   │   └── migration.sql          # Initial User + Record tables + enums
│   │   ├── 20260404102415_added_superadmin_role/
│   │   │   └── migration.sql          # Added SUPERADMIN to Role enum
│   │   └── migration_lock.toml        # Locks migration provider to postgresql
│   ├── schema.prisma                  # Prisma schema (2 models, 2 enums)
│   └── seed.ts                        # Creates SUPERADMIN from env vars
│
├── src/
│   ├── constants/
│   │   ├── app.constants.ts           # REGEX, LIMITS, ROLES enum, RECORD_TYPES enum
│   │   ├── app.messages.ts            # All user-facing strings and error messages
│   │   └── config.ts                  # dotenv config object with typed fields + defaults
│   │
│   ├── controllers/
│   │   ├── auth.controllers.ts        # signup, login
│   │   ├── user.controllers.ts        # getMe, getAllUsers, getUserById, updateUser,
│   │   │                              #   updateUserRole, changePassword, reactivateUser, deleteUser
│   │   ├── record.controllers.ts      # getAllRecords, getRecordById, createRecord,
│   │   │                              #   updateRecord, deleteRecord
│   │   └── dashboard.controllers.ts   # getDashboardSummary, getCategoryTotals,
│   │                                  #   getMonthlyTrends, getWeeklyTrends, getRecentActivity
│   │
│   ├── generated/
│   │   └── prisma/                    # Auto-generated Prisma client (DO NOT EDIT)
│   │       ├── client.ts              # PrismaClient export
│   │       ├── enums.ts               # Generated Role + RecordType enums
│   │       ├── models.ts              # Generated model types
│   │       └── ...                    # Other generated internals
│   │
│   ├── lib/
│   │   ├── logger.ts                  # Winston logger + getLogger(name) child-logger factory
│   │   └── prisma.ts                  # PrismaPg singleton (globalThis pattern)
│   │
│   ├── middlewares/
│   │   └── auth.ts                    # authenticate (JWT verify) + authorize(roles[]) (RBAC)
│   │
│   ├── repositories/
│   │   ├── user.repositories.ts       # All Prisma user DB operations
│   │   └── record.repositories.ts     # All Prisma record DB ops + raw SQL for analytics
│   │
│   ├── routes/
│   │   ├── auth.routes.ts             # POST /signup, POST /login
│   │   ├── user.routes.ts             # /users/* with per-route auth guards
│   │   ├── record.routes.ts           # /records/* with per-route auth guards
│   │   └── dashboard.routes.ts        # /dashboard/* (ANALYST+ only)
│   │
│   ├── schemas/
│   │   ├── user.schemas.ts            # Zod v4: signup, login, update, role, password
│   │   └── record.schemas.ts          # Zod v4: createRecord, updateRecord, recordFilters
│   │
│   ├── services/
│   │   ├── auth.services.ts           # signup + login business logic (bcrypt + JWT)
│   │   ├── user.services.ts           # User CRUD with RBAC enforcement
│   │   ├── record.services.ts         # Record CRUD (soft delete via deletedAt)
│   │   └── dashboard.services.ts      # Analytics: aggregations over recordRepository
│   │
│   ├── types/
│   │   └── express.d.ts               # Augments Express Request with req.user type
│   │
│   ├── utils/
│   │   ├── api_error.ts               # ApiError class: code, message, errors[]
│   │   ├── api_response.ts            # ApiResponse<T> class: code, message, data
│   │   └── common_functions.ts        # trimStrings, validatePagination, formatDate
│   │
│   ├── app.ts                         # Express app: CORS, middleware, route mounting
│   └── index.ts                       # Server entry: app.listen()
│
├── .env                               # Local secrets (never commit)
├── .env.example                       # Env var template (safe to commit)
├── .gitignore
├── .prettierignore
├── .prettierrc                        # Prettier config: tabs, printWidth 130, LF
├── package.json
├── package-lock.json
├── prisma.config.ts                   # Prisma CLI config: schema path, seed command
└── tsconfig.json
```

## Key architectural notes

- `src/generated/prisma/` is gitignored — always run `npm run db:generate` after clone
- No global error handler middleware — each controller has its own try/catch
- No path aliases (`@/`) — all imports use relative paths
- Services are object literals (not classes), exported as named singletons
- Repositories never throw custom errors — they rethrow DB errors as-is; services handle business errors
- `passwordHash` is excluded from all query selects except `getUserByIdWithPassword`
- Soft delete on Record: `deletedAt DateTime?` — all queries filter `WHERE deletedAt IS NULL`
- Soft delete on User: `isActive Boolean` — set to false; reactivate sets back to true

# Prisma Schema

Full `prisma/schema.prisma` — copy verbatim.

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

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

---

## Field explanations

### Generator

| Setting | Value | Why |
|---------|-------|-----|
| `provider` | `"prisma-client"` | Prisma 7+ uses `prisma-client` (not `prisma-client-js`) |
| `output` | `"../src/generated/prisma"` | Non-default location — keeps generated code in src tree |

### Datasource

| Setting | Value | Why |
|---------|-------|-----|
| `provider` | `"postgresql"` | PostgreSQL only — uses `$queryRaw` SQL in repository layer |
| `url` | (from `prisma.config.ts`) | URL provided via `prisma.config.ts` datasource override |

### enum Role

| Value | Access level |
|-------|-------------|
| `VIEWER` | Read own records only |
| `ANALYST` | Read all records + dashboard analytics |
| `ADMIN` | Full record CRUD + user management (cannot modify ADMIN/SUPERADMIN) |
| `SUPERADMIN` | All ADMIN permissions + cannot be created via API (seed only) |

### enum RecordType

| Value | Meaning |
|-------|---------|
| `INCOME` | Money received |
| `EXPENSE` | Money spent |

### model User

| Field | Type | Notes |
|-------|------|-------|
| `id` | `String` | UUID v4, PK |
| `name` | `String` | Full name (first + last concatenated at signup) |
| `email` | `String @unique` | Lowercased before storage |
| `passwordHash` | `String` | bcrypt hash, salt rounds = 10; omitted from all selects except password change |
| `role` | `Role` | Defaults to VIEWER; SUPERADMIN only via seed |
| `isActive` | `Boolean` | Soft delete flag; false = deactivated, not physically deleted |
| `createdAt` | `DateTime` | Auto-set on create |
| `records` | `Record[]` | Relation to Record model |

### model Record

| Field | Type | Notes |
|-------|------|-------|
| `id` | `String` | UUID v4, PK |
| `amount` | `Decimal(12,2)` | Up to 10 digits before decimal, 2 after |
| `type` | `RecordType` | INCOME or EXPENSE |
| `category` | `String` | Free-text; searched case-insensitively |
| `date` | `DateTime` | Transaction date (not createdAt) |
| `notes` | `String?` | Optional free-text notes |
| `createdBy` | `String` | FK → User.id |
| `user` | `User` | Relation; selected as `{ id, name }` in queries |
| `deletedAt` | `DateTime?` | Soft delete — set to `new Date()` on delete; all queries filter `deletedAt: null` |
| `createdAt` | `DateTime` | Auto-set on create |
| `updatedAt` | `DateTime` | Auto-updated by Prisma on every update |

---

## Migration history

| Migration | Change |
|-----------|--------|
| `20260403091455_init` | Created User and Record tables, Role enum, RecordType enum |
| `20260404102415_added_superadmin_role` | Added SUPERADMIN value to Role enum |

---

## prisma.config.ts

```typescript
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

---

## prisma/seed.ts

```typescript
import { userRepository } from "../src/repositories/user.repositories";
import { ROLES } from "../src/constants/app.constants";
import bcrypt from "bcrypt";
import { config } from "../src/constants/config";

async function createSuperAdmin() {
    const hashedPassword = await bcrypt.hash(config.SUPER_ADMIN_PASSWORD, 10);
    await userRepository.createUser(config.SUPER_ADMIN_NAME, config.SUPER_ADMIN_EMAIL, hashedPassword, ROLES.SUPERADMIN);
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

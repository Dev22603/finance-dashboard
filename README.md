# Finance Dashboard — Backend

Express + TypeScript backend with PostgreSQL via Prisma.

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

See the [Environment Variables](#environment-variables) section for what each variable does.

### 3. Run database migrations

```bash
npm run db:migrate
```

Creates all tables in your database and generates the Prisma client. Run this whenever you change `schema.prisma`.

### 4. Seed the database

```bash
npm run db:seed
```

Creates the superadmin account. Credentials are pulled from `SUPER_ADMIN_NAME`, `SUPER_ADMIN_EMAIL`, and `SUPER_ADMIN_PASSWORD` in your `.env`. If the account already exists it is safely skipped — the seed is idempotent.

### 5. Start the server

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

---

## Available Scripts

| Script                    | Description                                                     |
| ------------------------- | --------------------------------------------------------------- |
| `npm run dev`             | Start dev server with hot reload                                |
| `npm run build`           | Compile TypeScript to `dist/`                                   |
| `npm start`               | Run compiled production build                                   |
| `npm run db:generate`     | Regenerate Prisma client after schema changes                   |
| `npm run db:migrate`      | Create and apply a new migration (dev)                          |
| `npm run db:migrate:prod` | Apply pending migrations without creating new ones (production) |
| `npm run db:seed`         | Create the superadmin account                                   |
| `npm run db:reset`        | Drop the database, reapply all migrations, and re-seed          |
| `npm run db:studio`       | Open Prisma Studio to browse and edit the database via GUI      |

---

## Roles

Four roles are available. Role-based access is enforced via the `authorize` middleware using the JWT payload.

| Role         | Description                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `SUPERADMIN` | Full system access. Created exclusively via the seed script. Manages admins and system-wide settings. |
| `ADMIN`      | Can manage users (create, deactivate). Cannot modify superadmin accounts.                             |
| `ANALYST`    | Read access to all financial records. Can generate reports but cannot modify data.                    |
| `VIEWER`     | Can only view their own records. Default role assigned when a new user is created.                    |

The role can optionally be passed in the signup request body. If omitted, the database defaults to `VIEWER`.

---

## API Endpoints

### Health

| Method | Endpoint  | Description           |
| ------ | --------- | --------------------- |
| `GET`  | `/health` | Returns server status |

### Auth

#### `POST /api/auth/signup`

Registers a new user.

**Request body:**

```json
{
	"first_name": "string",
	"last_name": "string",
	"email": "string",
	"phone_number": "string (10 digits, cannot start with 0)",
	"password": "string",
	"role": "VIEWER | ANALYST | ADMIN | SUPERADMIN (optional, defaults to VIEWER)"
}
```

**Password requirements:** minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, and one special character (`!@#$%^&*`).

**Response `201`:**

```json
{
	"code": 201,
	"message": "User registered successfully",
	"data": {
		"id": "uuid",
		"name": "string",
		"email": "string",
		"role": "string"
	}
}
```

---

#### `POST /api/auth/login`

Logs in a user and returns a JWT.

**Request body:**

```json
{
	"email": "string",
	"password": "string"
}
```

**Response `200`:**

```json
{
	"code": 200,
	"message": "Logged in successfully",
	"data": {
		"token": "JWT string",
		"role": "string",
		"name": "string"
	}
}
```

The token expires in **10 hours**. Pass it as a Bearer token on subsequent authenticated requests:

```
Authorization: Bearer <token>
```

---

## Architecture Notes

### Why `config.ts` instead of `process.env` directly?

`process.env.SOME_VAR` is a string lookup on a dictionary every time it's called. The `config.ts` file reads all environment variables **once at startup**, caches them as a plain object, and exports them. Every import then just reads a property off an already-evaluated object — faster at runtime, easier to mock in tests, and gives a single place to set defaults and catch missing variables early.

### Prisma connection pooling

Prisma is initialized with a `pg.Pool` connection pool via `@prisma/adapter-pg`. This avoids opening a new database connection per request. In development, the Prisma client is cached on `globalThis` so that hot reloads (via `tsx watch`) don't exhaust the connection limit by creating a new pool on every file change.

### CORS

The server currently allows requests only from `http://localhost:5173` (the default Vite dev server port). Update this in `src/app.ts` for other frontend origins or production deployments.

---

## Environment Variables

| Variable               | Purpose                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `PORT`                 | The port the Express server listens on                                                            |
| `DB_HOST`              | Hostname of the PostgreSQL server                                                                 |
| `DB_PORT`              | Port PostgreSQL is listening on                                                                   |
| `DB_USER`              | PostgreSQL username used to connect                                                               |
| `DB_PASSWORD`          | Password for the PostgreSQL user                                                                  |
| `DB_NAME`              | Name of the database to connect to                                                                |
| `DATABASE_URL`         | Full Prisma/pg connection string — used by both Prisma migrations and the runtime connection pool |
| `JWT_SECRET`           | Secret key used to sign and verify JWTs — keep this long, random, and private                     |
| `SUPER_ADMIN_NAME`     | Display name for the superadmin account created during seeding                                    |
| `SUPER_ADMIN_EMAIL`    | Email address the superadmin uses to log in                                                       |
| `SUPER_ADMIN_PASSWORD` | Password for the superadmin account — must meet the password strength requirements                |

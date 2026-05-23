# Code Patterns

Verbatim implementations from every source layer. Use these as the canonical reference when scaffolding.

---

## src/constants/app.constants.ts

```typescript
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

enum ROLES {
    SUPERADMIN = "SUPERADMIN",
    ADMIN = "ADMIN",
    ANALYST = "ANALYST",
    VIEWER = "VIEWER",
}

enum RECORD_TYPES {
    INCOME = "INCOME",
    EXPENSE = "EXPENSE",
}

export { REGEX, LIMITS, ROLES, RECORD_TYPES };
```

---

## src/constants/app.messages.ts

```typescript
const USER_VALIDATION_ERRORS = {
    NAME_REQUIRED: "Name is required.",
    NAME_MIN: "Name must be at least 2 characters.",
    NAME_MAX: "Name cant exceed 100 characters.",
    EMAIL_REQUIRED: "Email is required.",
    EMAIL_INVALID: "Email must be a valid email address.",
    PASSWORD_REQUIRED: "Password is required.",
    PASSWORD_INVALID: "Password must include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character",
    PASSWORD_LENGTH_INVALID: "Password must be at least 8 characters long",
};

const USER_FEEDBACK_MESSAGES = {
    USER_CREATED_SUCCESS: "User created successfully",
    USER_LOGIN_SUCCESS: "User logged in successfully",
    USER_LOGOUT_SUCCESS: "User logged out successfully",
    USER_DELETED_SUCCESS: "User deleted successfully",
    USER_SOFT_DELETED_SUCCESS: "User deactivated successfully",
    USER_REACTIVATED_SUCCESS: "User reactivated successfully",
    USER_ALREADY_ACTIVE: "User is already active",
    USER_UPDATED_SUCCESS: "User updated successfully",
    USER_NOT_FOUND: "User not found",
    USER_ALREADY_EXISTS: "User already exists",
    USER_NOT_AUTHENTICATED: "User not authenticated",
    USER_NOT_AUTHORIZED: "User not authorized",
    INVALID_CREDENTIALS: "Invalid credentials",
    SAME_PASSWORD_ERROR: "Password cannot be same as previous password",
    CANNOT_ASSIGN_SUPERADMIN: "Super admin role cannot be assigned to another user",
    ADMIN_CANNOT_MODIFY_ADMIN_OR_SUPERADMIN: "Admin cannot change the role of another admin or super admin",
    ADMIN_CANNOT_ASSIGN_ADMIN_OR_ABOVE: "Admin can only assign viewer or analyst roles",
    SUPERADMIN_CANNOT_DELETE_SELF: "Super admin cannot delete themselves",
    SUPERADMIN_CANNOT_CHANGE_OWN_ROLE: "Super admin cannot change their own role",
};

const GLOBAL_ERROR_MESSAGES = {
    SERVER_ERROR: "Internal Server Error. Please try again later.",
};

export { GLOBAL_ERROR_MESSAGES, USER_VALIDATION_ERRORS, USER_FEEDBACK_MESSAGES };
```

---

## src/constants/config.ts

```typescript
import dotenv from "dotenv";
dotenv.config();

export const config = {
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

---

## src/lib/logger.ts

```typescript
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

---

## src/lib/prisma.ts

```typescript
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

**Why globalThis pattern:** In development, `tsx watch` re-executes modules on change. Without this pattern, each reload creates a new Prisma client and a new connection pool, eventually exhausting the DB connection limit.

---

## src/types/express.d.ts

```typescript
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

---

## src/utils/api_error.ts

```typescript
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

**Response shape when thrown:**
```json
{ "code": 400, "message": "Validation failed", "errors": ["Email is required", "Password too short"] }
```

---

## src/utils/api_response.ts

```typescript
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

**Response shape:**
```json
{ "code": 200, "message": "Records fetched successfully", "data": { ... } }
```

---

## src/utils/common_functions.ts

```typescript
import { Request } from "express";

interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
}

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

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB");
};

const trimStrings = (obj: any): any => {
    const newObj: any = {};
    for (const key in obj) {
        if (typeof obj[key] === "string") {
            newObj[key] = obj[key].trim();
        } else {
            newObj[key] = obj[key];
        }
    }
    return newObj;
};

export { validatePagination, formatDate, trimStrings };
```

---

## src/middlewares/auth.ts

```typescript
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
        logger.warn("Access forbidden — insufficient role", { path: req.path, userRole: req.user.role, requiredRoles: roles });
        return res.status(403).json({ error: "Forbidden. You do not have access." });
    }
    next();
};
```

**Token format:** `Authorization: Bearer <jwt_token>`
**JWT payload:** `{ id: string, name: string, role: ROLES }`
**Token expiry:** 10 hours, hardcoded

---

## src/schemas/user.schemas.ts

```typescript
import * as z from "zod/v4";
import { USER_VALIDATION_ERRORS } from "../constants/app.messages";
import { REGEX, LIMITS, ROLES } from "../constants/app.constants";
import { trimStrings } from "../utils/common_functions";
import { ApiError } from "../utils/api_error";

const emailSchema = z.email(USER_VALIDATION_ERRORS.EMAIL_INVALID).transform((val) => val.toLowerCase());

const passwordSchema = z
    .string()
    .min(LIMITS.PASSWORD_MIN, USER_VALIDATION_ERRORS.PASSWORD_LENGTH_INVALID)
    .regex(REGEX.PASSWORD, USER_VALIDATION_ERRORS.PASSWORD_INVALID);

const nameSchema = z
    .string()
    .min(LIMITS.NAME_MIN, USER_VALIDATION_ERRORS.NAME_MIN)
    .max(LIMITS.NAME_MAX, USER_VALIDATION_ERRORS.NAME_MAX);

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

const UserUpdateSchema = z.object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
});

const UserRoleSchema = z.enum([ROLES.VIEWER, ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPERADMIN], {
    error: "Role must be one of: VIEWER, ANALYST, ADMIN, SUPERADMIN",
});

const UserPasswordUpdateSchema = z.object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: passwordSchema,
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
        throw new ApiError(400, "User login validation failed", result.error.issues.map((i) => i.message));
    }
    return result.data;
};

const validateUserUpdate = (data: unknown) => {
    const result = UserUpdateSchema.safeParse(trimStrings(data));
    if (!result.success) {
        throw new ApiError(400, "User update validation failed", result.error.issues.map((i) => i.message));
    }
    return result.data;
};

const validateUserRole = (role: unknown) => {
    const result = UserRoleSchema.safeParse(role);
    if (!result.success) {
        throw new ApiError(400, "Role update validation failed", result.error.issues.map((i) => i.message));
    }
    return result.data;
};

const validateUserPasswordUpdate = (data: unknown) => {
    const result = UserPasswordUpdateSchema.safeParse(trimStrings(data));
    if (!result.success) {
        throw new ApiError(400, "Password change validation failed", result.error.issues.map((i) => i.message));
    }
    return result.data;
};

export { validateUserSignup, validateUserLogin, validateUserUpdate, validateUserRole, validateUserPasswordUpdate };
```

---

## src/schemas/record.schemas.ts

```typescript
import * as z from "zod/v4";
import { RECORD_TYPES } from "../constants/app.constants";
import { ApiError } from "../utils/api_error";

const recordTypeEnum = z.enum([RECORD_TYPES.INCOME, RECORD_TYPES.EXPENSE], {
    error: "Type must be INCOME or EXPENSE",
});

const amountField = z.number().positive("Amount must be a positive number");
const categoryField = z.string().min(1, "Category is required");
const dateField = z.coerce.date({ error: "Date must be a valid date" });
const notesField = z.string().optional();

const createRecordSchema = z.object({
    amount: amountField,
    type: recordTypeEnum,
    category: categoryField,
    date: dateField,
    notes: notesField,
});

const updateRecordSchema = z.object({
    amount: amountField.optional(),
    type: recordTypeEnum.optional(),
    category: categoryField.optional(),
    date: dateField.optional(),
    notes: notesField,
});

const recordFiltersSchema = z.object({
    type: recordTypeEnum.optional(),
    category: z.string().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type RecordFiltersInput = z.infer<typeof recordFiltersSchema>;

export function validateCreateRecord(data: unknown): CreateRecordInput {
    const result = createRecordSchema.safeParse(data);
    if (!result.success) {
        throw new ApiError(400, "Record creation validation failed", result.error.issues.map((i) => i.message));
    }
    return result.data;
}

export function validateUpdateRecord(data: unknown): UpdateRecordInput {
    const result = updateRecordSchema.safeParse(data);
    if (!result.success) {
        throw new ApiError(400, "Record update validation failed", result.error.issues.map((i) => i.message));
    }
    return result.data;
}

export function validateRecordFilters(data: unknown): RecordFiltersInput {
    const result = recordFiltersSchema.safeParse(data);
    if (!result.success) {
        throw new ApiError(400, "Invalid query filters", result.error.issues.map((i) => i.message));
    }
    return result.data;
}
```

---

## src/repositories/user.repositories.ts

```typescript
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
            return await prisma.user.create({ data: { name, email, passwordHash: hashedPassword, role: role } });
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

    async getUserById(id: string) {
        try {
            return await prisma.user.findUnique({ where: { id }, omit: { passwordHash: true } });
        } catch (error) {
            logger.error("DB error — getUserById", { id, error: (error as Error).message });
            throw error;
        }
    },

    async getUserByIdWithPassword(id: string) {
        try {
            return await prisma.user.findUnique({ where: { id } });
        } catch (error) {
            logger.error("DB error — getUserByIdWithPassword", { id, error: (error as Error).message });
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

    async updateUser(id: string, data: { name?: string; email?: string }) {
        try {
            return await prisma.user.update({ where: { id }, data, omit: { passwordHash: true } });
        } catch (error) {
            logger.error("DB error — updateUser", { id, error: (error as Error).message });
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

    async changePassword(id: string, hashedPassword: string) {
        try {
            return await prisma.user.update({ where: { id }, data: { passwordHash: hashedPassword }, omit: { passwordHash: true } });
        } catch (error) {
            logger.error("DB error — changePassword", { id, error: (error as Error).message });
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

    async reactivateUser(id: string) {
        try {
            return await prisma.user.update({ where: { id }, data: { isActive: true }, omit: { passwordHash: true } });
        } catch (error) {
            logger.error("DB error — reactivateUser", { id, error: (error as Error).message });
            throw error;
        }
    },

    async deleteUser(id: string) {
        try {
            return await prisma.user.delete({ where: { id }, omit: { passwordHash: true } });
        } catch (error) {
            logger.error("DB error — deleteUser", { id, error: (error as Error).message });
            throw error;
        }
    },
};
```

---

## src/repositories/record.repositories.ts

```typescript
import { RECORD_TYPES } from "../constants/app.constants";
import { prisma } from "../lib/prisma";
import { getLogger } from "../lib/logger";

const logger = getLogger("record.repository");

export interface RecordFilters {
    type?: RECORD_TYPES;
    category?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
}

export const recordRepository = {
    async createRecord(data: {
        amount: number;
        type: RECORD_TYPES;
        category: string;
        date: Date;
        notes?: string;
        createdBy: string;
    }) {
        try {
            return await prisma.record.create({
                data: {
                    amount: data.amount,
                    type: data.type,
                    category: data.category,
                    date: data.date,
                    notes: data.notes,
                    createdBy: data.createdBy,
                },
            });
        } catch (error) {
            logger.error("DB error — createRecord", { error: (error as Error).message });
            throw error;
        }
    },

    async getRecords(filters: RecordFilters) {
        const { type, category, from, to, page = 1, limit = 20 } = filters;

        const where = {
            deletedAt: null,
            ...(type && { type }),
            ...(category && { category: { contains: category, mode: "insensitive" as const } }),
            ...((from || to) && {
                date: {
                    ...(from && { gte: from }),
                    ...(to && { lte: to }),
                },
            }),
        };

        const recordSelect = {
            id: true,
            amount: true,
            type: true,
            category: true,
            date: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            user: { select: { id: true, name: true } },
        };

        try {
            const [rows, total] = await Promise.all([
                prisma.record.findMany({
                    where,
                    orderBy: { date: "desc" },
                    skip: (page - 1) * limit,
                    take: limit,
                    select: recordSelect,
                }),
                prisma.record.count({ where }),
            ]);

            const records = rows.map(({ user, ...rest }) => ({ ...rest, createdBy: user }));
            return { records, total, page, limit, totalPages: Math.ceil(total / limit) };
        } catch (error) {
            logger.error("DB error — getRecords", { filters, error: (error as Error).message });
            throw error;
        }
    },

    async getRecordById(id: string) {
        try {
            const record = await prisma.record.findFirst({
                where: { id, deletedAt: null },
                select: {
                    id: true,
                    amount: true,
                    type: true,
                    category: true,
                    date: true,
                    notes: true,
                    createdAt: true,
                    updatedAt: true,
                    user: { select: { id: true, name: true } },
                },
            });
            if (!record) return null;
            const { user, ...rest } = record;
            return { ...rest, createdBy: user };
        } catch (error) {
            logger.error("DB error — getRecordById", { id, error: (error as Error).message });
            throw error;
        }
    },

    async updateRecord(id: string, data: { amount?: number; type?: RECORD_TYPES; category?: string; date?: Date; notes?: string }) {
        try {
            return await prisma.record.update({
                where: { id },
                data,
                select: {
                    id: true, amount: true, type: true, category: true, date: true,
                    notes: true, createdAt: true, updatedAt: true,
                    user: { select: { id: true, name: true } },
                },
            }).then(({ user, ...rest }) => ({ ...rest, createdBy: user }));
        } catch (error) {
            logger.error("DB error — updateRecord", { id, error: (error as Error).message });
            throw error;
        }
    },

    async softDeleteRecord(id: string) {
        try {
            return await prisma.record.update({ where: { id }, data: { deletedAt: new Date() } });
        } catch (error) {
            logger.error("DB error — softDeleteRecord", { id, error: (error as Error).message });
            throw error;
        }
    },

    async getSummary() {
        try {
            return await prisma.record.groupBy({
                by: ["type"],
                _sum: { amount: true },
                _count: { _all: true },
                where: { deletedAt: null },
            });
        } catch (error) {
            logger.error("DB error — getSummary", { error: (error as Error).message });
            throw error;
        }
    },

    async getCategoryBreakdown() {
        try {
            return await prisma.record.groupBy({
                by: ["category", "type"],
                _sum: { amount: true },
                _count: { _all: true },
                where: { deletedAt: null },
                orderBy: { _sum: { amount: "desc" } },
            });
        } catch (error) {
            logger.error("DB error — getCategoryBreakdown", { error: (error as Error).message });
            throw error;
        }
    },

    async getMonthlyTrends() {
        try {
            return await prisma.$queryRaw<Array<{ month: string; type: string; category: string; total: number; count: number }>>`
                SELECT
                    TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month,
                    type::text,
                    category,
                    SUM(amount)::float AS total,
                    COUNT(*)::int AS count
                FROM "Record"
                WHERE "deletedAt" IS NULL
                GROUP BY DATE_TRUNC('month', date), type, category
                ORDER BY DATE_TRUNC('month', date) ASC
            `;
        } catch (error) {
            logger.error("DB error — getMonthlyTrends", { error: (error as Error).message });
            throw error;
        }
    },

    async getWeeklyTrends() {
        try {
            return await prisma.$queryRaw<Array<{ week_start: string; type: string; category: string; total: number; count: number }>>`
                SELECT
                    TO_CHAR(DATE_TRUNC('week', date), 'YYYY-MM-DD') AS week_start,
                    type::text,
                    category,
                    SUM(amount)::float AS total,
                    COUNT(*)::int AS count
                FROM "Record"
                WHERE "deletedAt" IS NULL
                GROUP BY DATE_TRUNC('week', date), type, category
                ORDER BY DATE_TRUNC('week', date) ASC
            `;
        } catch (error) {
            logger.error("DB error — getWeeklyTrends", { error: (error as Error).message });
            throw error;
        }
    },

    async getRecentActivity(limit: number = 10) {
        try {
            const records = await prisma.record.findMany({
                where: { deletedAt: null },
                orderBy: { date: "desc" },
                take: limit,
                select: {
                    id: true, amount: true, type: true, category: true, date: true,
                    notes: true, createdAt: true,
                    user: { select: { id: true, name: true } },
                },
            });
            return records.map(({ user, ...rest }) => ({ ...rest, createdBy: user }));
        } catch (error) {
            logger.error("DB error — getRecentActivity", { limit, error: (error as Error).message });
            throw error;
        }
    },
};
```

---

## src/services/auth.services.ts

```typescript
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

---

## src/routes/auth.routes.ts

```typescript
import express from "express";
import { signup, login } from "../controllers/auth.controllers";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

export default router;
```

---

## src/routes/user.routes.ts

```typescript
import express from "express";
import { getMe, getAllUsers, getUserById, updateUser, updateUserRole, changePassword, reactivateUser, deleteUser } from "../controllers/user.controllers";
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

---

## src/routes/record.routes.ts

```typescript
import express from "express";
import { createRecord, getAllRecords, getRecordById, updateRecord, deleteRecord } from "../controllers/record.controllers";
import { authenticate, authorize } from "../middlewares/auth";
import { ROLES } from "../constants/app.constants";

const router = express.Router();

// ADMIN/SUPERADMIN: full CRUD on all records
// ANALYST: read all records
// VIEWER: read only their own records

router.post("/", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), createRecord);
router.get("/", authenticate, getAllRecords);
router.get("/:id", authenticate, getRecordById);
router.patch("/:id", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), updateRecord);
router.delete("/:id", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), deleteRecord);

export default router;
```

---

## src/routes/dashboard.routes.ts

```typescript
import express from "express";
import {
    getDashboardSummary,
    getCategoryTotals,
    getMonthlyTrends,
    getWeeklyTrends,
    getRecentActivity,
} from "../controllers/dashboard.controllers";
import { authenticate, authorize } from "../middlewares/auth";
import { ROLES } from "../constants/app.constants";

const router = express.Router();

const dashboardRoles = [ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPERADMIN];

router.get("/summary", authenticate, authorize(dashboardRoles), getDashboardSummary);
router.get("/category-breakdown", authenticate, authorize(dashboardRoles), getCategoryTotals);
router.get("/trends/monthly", authenticate, authorize(dashboardRoles), getMonthlyTrends);
router.get("/trends/weekly", authenticate, authorize(dashboardRoles), getWeeklyTrends);
router.get("/recent", authenticate, authorize(dashboardRoles), getRecentActivity);

export default router;
```

---

## API route summary

| Method | Path | Auth | Min role |
|--------|------|------|----------|
| GET | /health | None | — |
| POST | /api/auth/signup | None | — |
| POST | /api/auth/login | None | — |
| GET | /api/users/me | Bearer | VIEWER |
| PATCH | /api/users/ | Bearer | VIEWER |
| PATCH | /api/users/password | Bearer | VIEWER |
| GET | /api/users/ | Bearer | ADMIN |
| GET | /api/users/:id | Bearer | ADMIN |
| PATCH | /api/users/:id/role | Bearer | ADMIN |
| PATCH | /api/users/:id/reactivate | Bearer | ADMIN |
| DELETE | /api/users/:id?soft=true | Bearer | ADMIN |
| GET | /api/records/ | Bearer | VIEWER |
| GET | /api/records/:id | Bearer | VIEWER |
| POST | /api/records/ | Bearer | ADMIN |
| PATCH | /api/records/:id | Bearer | ADMIN |
| DELETE | /api/records/:id | Bearer | ADMIN |
| GET | /api/dashboard/summary | Bearer | ANALYST |
| GET | /api/dashboard/category-breakdown | Bearer | ANALYST |
| GET | /api/dashboard/trends/monthly | Bearer | ANALYST |
| GET | /api/dashboard/trends/weekly | Bearer | ANALYST |
| GET | /api/dashboard/recent?limit=N | Bearer | ANALYST |

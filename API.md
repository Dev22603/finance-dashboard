# API Documentation

Base URL: `http://localhost:<PORT>/api`

## Response Format

All endpoints return a standardized response:

```json
{
  "code": 200,
  "message": "Description of result",
  "data": { }
}
```

Errors return:

```json
{
  "code": 400,
  "message": "Description of error",
  "errors": ["field-level error messages"]
}
```

Authentication is via Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

---

## Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Server status check |

---

## Auth (`/api/auth`)

### `POST /api/auth/signup`

Register a new user. All signups default to VIEWER role.

**Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `first_name` | string | Yes | 2–100 characters |
| `last_name` | string | Yes | 2–100 characters |
| `email` | string | Yes | Valid email format |
| `phone_number` | string | Yes | 10 digits, cannot start with 0 |
| `password` | string | Yes | Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char (`!@#$%^&*`) |

**Response `201`:**

```json
{
  "code": 201,
  "message": "User registered successfully",
  "data": {
    "token": "jwt_string",
    "id": "uuid",
    "name": "First Last",
    "email": "user@example.com",
    "role": "VIEWER"
  }
}
```

---

### `POST /api/auth/login`

Authenticate and receive a JWT token. Token expires in 10 hours.

**Body:**

| Field | Type | Required |
|---|---|---|
| `email` | string | Yes |
| `password` | string | Yes |

**Response `200`:**

```json
{
  "code": 200,
  "message": "Logged in successfully",
  "data": {
    "token": "jwt_string",
    "role": "VIEWER",
    "name": "First Last"
  }
}
```

---

## Users (`/api/users`)

### `GET /api/users/me`

Get the authenticated user's own profile.

**Auth:** Any authenticated user

**Response `200`:**

```json
{
  "code": 200,
  "message": "User fetched successfully",
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "VIEWER",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### `GET /api/users/`

Get all users.

**Auth:** ADMIN, SUPERADMIN

**Response `200`:** Array of user objects (same shape as above).

---

### `GET /api/users/:id`

Get a user by ID.

**Auth:** ADMIN, SUPERADMIN

**Params:**

| Param | Type | Description |
|---|---|---|
| `id` | UUID | User ID |

---

### `PATCH /api/users/`

Update the authenticated user's own profile.

**Auth:** Any authenticated user

**Body:**

| Field | Type | Required |
|---|---|---|
| `name` | string | No |
| `email` | string | No |

Email uniqueness is enforced. At least one field must be provided.

---

### `PATCH /api/users/password`

Change the authenticated user's password.

**Auth:** Any authenticated user

**Body:**

| Field | Type | Required |
|---|---|---|
| `current_password` | string | Yes |
| `new_password` | string | Yes |

New password cannot be the same as the current password. Must meet password strength requirements.

---

### `PATCH /api/users/:id/role`

Change a user's role.

**Auth:** ADMIN, SUPERADMIN

**Params:**

| Param | Type | Description |
|---|---|---|
| `id` | UUID | Target user ID |

**Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `role` | string | Yes | `VIEWER`, `ANALYST`, `ADMIN`, or `SUPERADMIN` |

**Restrictions:**
- SUPERADMIN role cannot be assigned to anyone
- ADMIN can only assign VIEWER or ANALYST
- SUPERADMIN cannot change their own role

---

### `PATCH /api/users/:id/reactivate`

Reactivate a soft-deleted (inactive) user.

**Auth:** ADMIN, SUPERADMIN

**Params:**

| Param | Type | Description |
|---|---|---|
| `id` | UUID | Target user ID |

Returns `409` if user is already active.

---

### `DELETE /api/users/:id`

Delete a user. Supports both soft and hard delete.

**Auth:** ADMIN, SUPERADMIN

**Params:**

| Param | Type | Description |
|---|---|---|
| `id` | UUID | Target user ID |

**Query params:**

| Param | Type | Default | Description |
|---|---|---|---|
| `soft` | string | `"false"` | Pass `"true"` to deactivate instead of permanently deleting |

**Restrictions:**
- SUPERADMIN cannot delete themselves
- ADMIN cannot delete ADMIN or SUPERADMIN accounts

---

## Records (`/api/records`)

### `POST /api/records/`

Create a financial record.

**Auth:** ADMIN, SUPERADMIN

**Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `amount` | number | Yes | Must be positive |
| `type` | string | Yes | `INCOME` or `EXPENSE` |
| `category` | string | Yes | Non-empty |
| `date` | string | Yes | Valid date (coerced) |
| `notes` | string | No | Optional description |

The `createdBy` field is automatically set to the authenticated user's ID.

**Response `201`:**

```json
{
  "code": 201,
  "message": "Record created successfully",
  "data": {
    "id": "uuid",
    "amount": "50000",
    "type": "INCOME",
    "category": "Salary",
    "date": "2025-01-15T00:00:00.000Z",
    "notes": "January salary",
    "createdAt": "...",
    "updatedAt": "...",
    "createdBy": { "id": "uuid", "name": "string" }
  }
}
```

---

### `GET /api/records/`

List all records with optional filters and pagination. Soft-deleted records are excluded.

**Auth:** Any authenticated user

**Query params:**

| Param | Type | Default | Description |
|---|---|---|---|
| `type` | string | — | Filter by `INCOME` or `EXPENSE` |
| `category` | string | — | Filter by category (case-insensitive partial match) |
| `from` | date | — | Start date (inclusive) |
| `to` | date | — | End date (inclusive) |
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Records per page (max 100) |

**Response `200`:**

```json
{
  "code": 200,
  "message": "Records fetched successfully",
  "data": {
    "records": [ ... ],
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### `GET /api/records/:id`

Get a single record by ID.

**Auth:** Any authenticated user

---

### `PATCH /api/records/:id`

Update a record. All fields are optional.

**Auth:** ADMIN, SUPERADMIN

**Body:** Same fields as create, all optional.

---

### `DELETE /api/records/:id`

Soft-delete a record (sets `deletedAt` timestamp).

**Auth:** ADMIN, SUPERADMIN

---

## Dashboard (`/api/dashboard`)

All dashboard endpoints require ANALYST, ADMIN, or SUPERADMIN role.

### `GET /api/dashboard/summary`

High-level financial overview. Serves KPI cards.

**Response `200`:**

```json
{
  "code": 200,
  "message": "Dashboard summary fetched successfully",
  "data": {
    "totalIncome": 310000,
    "totalExpenses": 187219,
    "netBalance": 122781,
    "savingsRate": 39.61,
    "incomeCount": 12,
    "expenseCount": 26,
    "totalTransactions": 38
  }
}
```

---

### `GET /api/dashboard/category-breakdown`

Income and expense totals grouped by category. Serves pie/donut charts.

**Response `200`:**

```json
{
  "code": 200,
  "message": "Category totals fetched successfully",
  "data": {
    "income": {
      "Salary": { "total": 255000, "average": 85000, "numTransactions": 3, "percentage": 82.26 },
      "Freelance": { "total": 17800, "average": 8900, "numTransactions": 2, "percentage": 5.74 }
    },
    "expense": {
      "Rent": { "total": 54000, "average": 18000, "numTransactions": 3, "percentage": 28.84 }
    }
  }
}
```

Percentages are relative to total income or total expense respectively (each group sums to 100%).

---

### `GET /api/dashboard/trends/monthly`

Monthly income and expense trends with category drill-down. Serves time-series charts.

**Response `200`:**

```json
{
  "code": 200,
  "message": "Monthly trends fetched successfully",
  "data": {
    "2025-01": {
      "income": {
        "total": 85000,
        "numTransactions": 3,
        "categories": {
          "Salary": { "total": 70000, "numTransactions": 1 },
          "Freelance": { "total": 15000, "numTransactions": 2 }
        }
      },
      "expense": {
        "total": 60000,
        "numTransactions": 8,
        "categories": {
          "Rent": { "total": 18000, "numTransactions": 1 },
          "Equipment": { "total": 25000, "numTransactions": 4 }
        }
      }
    }
  }
}
```

---

### `GET /api/dashboard/trends/weekly`

Same structure as monthly, keyed by week start date (`YYYY-MM-DD`, Monday).

---

### `GET /api/dashboard/recent`

Most recent transactions. Serves activity feed.

**Query params:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | `10` | Number of records to return (clamped to 1–50) |

**Response `200`:** Array of record objects ordered by date descending.

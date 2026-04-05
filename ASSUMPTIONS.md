# Assumptions

The assignment leaves several design decisions open. The following are intentional choices made for this implementation.

---

## System Model

This backend is a **single-firm internal finance tool**. All financial records belong to the organization, not individual users. There is no multi-tenancy or per-user data isolation.

## Role Model Deviation

The assignment suggests VIEWER should access dashboard data. In this implementation, **VIEWER can access raw records but not dashboard analytics**. The rationale: dashboard summaries and trend analysis are analytical tools meant for the ANALYST role, while VIEWERs should have access to the underlying transaction data for basic visibility. ANALYST has access to both records and all dashboard endpoints.

## SUPERADMIN Bootstrap

SUPERADMIN is created exclusively via the seed script (`npm run db:seed`). It cannot be created through signup or any other API endpoint. This is the only way to bootstrap the highest-privilege account, preventing privilege escalation.

## Signup Defaults

All signups default to VIEWER. The role field is not accepted in the signup request body — role assignment is a separate privileged operation via `PATCH /api/users/:id/role`.

## Records Are Firm-Level

Records represent organizational financial entries, not personal data. The `createdBy` field tracks who entered the record, not who owns it. Any user with read access sees all records.

## Soft Delete

Records are always soft-deleted (setting `deletedAt`). Soft-deleted records are excluded from all list queries and dashboard aggregations. Users support both soft delete (`?soft=true`, sets `isActive=false`) and hard delete (permanent removal).

## Authentication

JWT tokens expire in 10 hours. No refresh token mechanism — users re-login after expiry.

## Phone Number Format

Phone numbers must be exactly 10 digits and cannot start with 0, assuming Indian mobile number format.

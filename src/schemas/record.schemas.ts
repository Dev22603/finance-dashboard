import * as z from "zod/v4";
import { RECORD_TYPES } from "../constants/app.constants";
import { ApiError } from "../utils/api_error";

// Reusable validators
const recordTypeEnum = z.enum([RECORD_TYPES.INCOME, RECORD_TYPES.EXPENSE], {
	error: "Type must be INCOME or EXPENSE",
});

const amountField = z.number().positive("Amount must be a positive number");
const categoryField = z.string().min(1, "Category is required");
const dateField = z.coerce.date({ error: "Date must be a valid date" });
const notesField = z.string().optional();

// Schemas
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
		throw new ApiError(
			400,
			"Record creation validation failed",
			result.error.issues.map((i) => i.message),
		);
	}
	return result.data;
}

export function validateUpdateRecord(data: unknown): UpdateRecordInput {
	const result = updateRecordSchema.safeParse(data);
	if (!result.success) {
		throw new ApiError(
			400,
			"Record update validation failed",
			result.error.issues.map((i) => i.message),
		);
	}
	return result.data;
}

export function validateRecordFilters(data: unknown): RecordFiltersInput {
	const result = recordFiltersSchema.safeParse(data);
	if (!result.success) {
		throw new ApiError(
			400,
			"Invalid query filters",
			result.error.issues.map((i) => i.message),
		);
	}
	return result.data;
}

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
	console.log(result);

	if (!result.success) {
		const errors = result.error.issues.map((i) => i.message);
		console.log(errors);

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

export { validateUserSignup, validateUserLogin, validateUserUpdate, validateUserRole , validateUserPasswordUpdate };

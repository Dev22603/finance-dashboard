import * as z from "zod/v4";
import { USER_VALIDATION_ERRORS } from "../constants/app.messages";
import { REGEX, LIMITS } from "../constants/app.constants";
import { trimStrings } from "../utils/common_functions";
import { ApiError } from "../utils/api_error";

// Reusable validators
const emailValidator = z
	.email(USER_VALIDATION_ERRORS.EMAIL_INVALID)
	.transform((val) => val.toLowerCase());

const passwordValidator = z
	.string()
	.min(LIMITS.PASSWORD_MIN, USER_VALIDATION_ERRORS.PASSWORD_INVALID)
	.regex(REGEX.PASSWORD, USER_VALIDATION_ERRORS.PASSWORD_INVALID);

const nameValidator = z
	.string()
	.min(LIMITS.NAME_MIN, USER_VALIDATION_ERRORS.NAME_MIN)
	.max(LIMITS.NAME_MAX, USER_VALIDATION_ERRORS.NAME_MAX);

// Schemas
const UserSignupSchema = z.object({
	first_name: nameValidator,
	last_name: nameValidator,
	email: emailValidator,
	phone_number: z
		.string()
		.regex(
			REGEX.PHONE,
			"Phone number must be 10 digits and cannot start with 0",
		),
	password: passwordValidator,
});

const UserLoginSchema = z.object({
	email: emailValidator,
	password: passwordValidator,
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

export { validateUserSignup, validateUserLogin };

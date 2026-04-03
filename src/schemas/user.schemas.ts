import * as z from "zod/v4";
import { USER_VALIDATION_ERRORS } from "../constants/app.messages";
import { REGEX, LIMITS } from "../constants/app.constants";
import { trimStrings } from "../utils/common_functions";

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
		.regex(REGEX.PHONE, "Phone number must be 10 digits and cannot start with 0"),
	password: passwordValidator,
});

const UserLoginSchema = z.object({
	email: emailValidator,
	password: passwordValidator,
});

// Validation response formatter
interface ValidationResponse<T> {
	success: boolean;
	data?: T;
	errors?: string[];
	message: string;
}

const formatValidationResult = <T,>(
	result: any,
	successMessage: string,
	failureMessage: string
): ValidationResponse<T> => {
	if (!result.success) {
		return {
			success: false,
			errors: result.error.issues.map((issue: any) => issue.message),
			message: failureMessage,
		};
	}
	return {
		success: true,
		data: result.data,
		message: successMessage,
	};
};

// Validators
const validateUserSignup = (user: any) => {
	const trimmedUser = trimStrings(user);
	return formatValidationResult(
		UserSignupSchema.safeParse(trimmedUser),
		"User registered successfully",
		"User registration validation failed"
	);
};

const validateUserLogin = (user: any) => {
	const trimmedUser = trimStrings(user) as any;

	if (!trimmedUser.email) {
		return {
			success: false,
			errors: [USER_VALIDATION_ERRORS.EMAIL_REQUIRED],
			message: "User login validation failed",
		};
	}

	return formatValidationResult(
		UserLoginSchema.safeParse(trimmedUser),
		"User logged in successfully",
		"User login validation failed"
	);
};


export { validateUserSignup, validateUserLogin };
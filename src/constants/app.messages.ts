// constants/app.messages.ts

const USER_VALIDATION_ERRORS = {
	NAME_REQUIRED: "Name is required.",
	NAME_MIN: "Name must be at least 2 characters.",
	NAME_MAX: "Name cant exceed 100 characters.",

	EMAIL_REQUIRED: "Email is required.",
	EMAIL_INVALID: "Email must be a valid email address.",

	PASSWORD_REQUIRED: "Password is required.",
	PASSWORD_INVALID:
		"Password must be at least 8 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character",
};

const USER_FEEDBACK_MESSAGES = {
	USER_CREATED_SUCCESS: "User created successfully",
	USER_LOGIN_SUCCESS: "User logged in successfully",
	USER_LOGOUT_SUCCESS: "User logged out successfully",
	USER_DELETED_SUCCESS: "User deleted successfully",
	USER_UPDATED_SUCCESS: "User updated successfully",
	USER_NOT_FOUND: "User not found",
	USER_ALREADY_EXISTS: "User already exists",
	USER_NOT_AUTHENTICATED: "User not authenticated",
	USER_NOT_AUTHORIZED: "User not authorized",
	INVALID_CREDENTIALS: "Invalid credentials",
};

const GLOBAL_ERROR_MESSAGES = {
	SERVER_ERROR: "Internal Server Error. Please try again later.",
};

export {
	GLOBAL_ERROR_MESSAGES,
	USER_VALIDATION_ERRORS,
	USER_FEEDBACK_MESSAGES,
};

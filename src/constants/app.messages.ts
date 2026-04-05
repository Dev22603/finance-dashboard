// constants/app.messages.ts

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

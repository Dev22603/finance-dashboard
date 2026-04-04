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

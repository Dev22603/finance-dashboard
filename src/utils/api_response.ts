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

// Common utility functions

import { Request } from "express";

interface PaginationParams {
	page: number;
	limit: number;
	offset: number;
}

const parseQueryParam = (value: any, defaultValue: number): number => {
	const parsed = parseInt(String(value), 10);
	return isNaN(parsed) ? defaultValue : parsed;
};

const clamp = (value: number, min: number, max: number): number => {
	return Math.max(min, Math.min(value, max));
};

const validatePagination = (req: Request, maxLimit: number = 100): PaginationParams => {
	const page = clamp(parseQueryParam(req.query.page, 1), 1, Number.MAX_SAFE_INTEGER);
	const limit = clamp(parseQueryParam(req.query.limit, 1), 1, maxLimit);

	return { page, limit, offset: (page - 1) * limit };
};

// Format date in dd/mm/yyyy format
const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("en-GB");
};

const trimStrings = (obj: any): any => {
	const newObj: any = {};
	for (const key in obj) {
		if (typeof obj[key] === "string") {
			newObj[key] = obj[key].trim();
		} else {
			newObj[key] = obj[key];
		}
	}
	return newObj;
};

export { validatePagination, formatDate, trimStrings };

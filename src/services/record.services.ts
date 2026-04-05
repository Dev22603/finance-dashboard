import { recordRepository } from "../repositories/record.repositories";
import { validateCreateRecord, validateUpdateRecord, validateRecordFilters } from "../schemas/record.schemas";
import { ApiError } from "../utils/api_error";

export const recordService = {
	async getRecords(query: unknown) {
		const filters = validateRecordFilters(query);
		return recordRepository.getRecords(filters);
	},

	async getRecordById(id: string) {
		const record = await recordRepository.getRecordById(id);
		if (!record) throw new ApiError(404, "Record not found");
		return record;
	},

	async createRecord(data: unknown, createdBy: string) {
		const validated = validateCreateRecord(data);
		return recordRepository.createRecord({ ...validated, createdBy });
	},

	async updateRecord(id: string, data: unknown) {
		const record = await recordRepository.getRecordById(id);
		if (!record) throw new ApiError(404, "Record not found");
		const validated = validateUpdateRecord(data);
		return recordRepository.updateRecord(id, validated);
	},

	async deleteRecord(id: string) {
		const record = await recordRepository.getRecordById(id);
		if (!record) throw new ApiError(404, "Record not found");
		return recordRepository.softDeleteRecord(id);
	},

};

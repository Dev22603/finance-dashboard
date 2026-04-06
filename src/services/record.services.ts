import { recordRepository } from "../repositories/record.repositories";
import { validateCreateRecord, validateUpdateRecord, validateRecordFilters } from "../schemas/record.schemas";
import { ApiError } from "../utils/api_error";
import { getLogger } from "../lib/logger";

const logger = getLogger("record.service");

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
		const record = await recordRepository.createRecord({ ...validated, createdBy });
		logger.info("Record created", { recordId: record.id, createdBy });
		return record;
	},

	async updateRecord(id: string, data: unknown) {
		const record = await recordRepository.getRecordById(id);
		if (!record) throw new ApiError(404, "Record not found");
		const validated = validateUpdateRecord(data);
		const updated = await recordRepository.updateRecord(id, validated);
		logger.info("Record updated", { recordId: id });
		return updated;
	},

	async deleteRecord(id: string) {
		const record = await recordRepository.getRecordById(id);
		if (!record) throw new ApiError(404, "Record not found");
		logger.info("Record deleted", { recordId: id });
		return recordRepository.softDeleteRecord(id);
	},
};

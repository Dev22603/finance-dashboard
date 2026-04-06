import { RECORD_TYPES } from "../constants/app.constants";
import { prisma } from "../lib/prisma";
import { getLogger } from "../lib/logger";

const logger = getLogger("record.repository");

export interface RecordFilters {
	type?: RECORD_TYPES;
	category?: string;
	from?: Date;
	to?: Date;
	page?: number;
	limit?: number;
}

export const recordRepository = {
	async createRecord(data: {
		amount: number;
		type: RECORD_TYPES;
		category: string;
		date: Date;
		notes?: string;
		createdBy: string;
	}) {
		try {
			return await prisma.record.create({
				data: {
					amount: data.amount,
					type: data.type,
					category: data.category,
					date: data.date,
					notes: data.notes,
					createdBy: data.createdBy,
				},
			});
		} catch (error) {
			logger.error("DB error — createRecord", { error: (error as Error).message });
			throw error;
		}
	},

	async getRecords(filters: RecordFilters) {
		const { type, category, from, to, page = 1, limit = 20 } = filters;

		const where = {
			deletedAt: null,
			...(type && { type }),
			...(category && { category: { contains: category, mode: "insensitive" as const } }),
			...((from || to) && {
				date: {
					...(from && { gte: from }),
					...(to && { lte: to }),
				},
			}),
		};

		const recordSelect = {
			id: true,
			amount: true,
			type: true,
			category: true,
			date: true,
			notes: true,
			createdAt: true,
			updatedAt: true,
			user: { select: { id: true, name: true } },
		};

		try {
			const [rows, total] = await Promise.all([
				prisma.record.findMany({
					where,
					orderBy: { date: "desc" },
					skip: (page - 1) * limit,
					take: limit,
					select: recordSelect,
				}),
				prisma.record.count({ where }),
			]);

			const records = rows.map(({ user, ...rest }) => ({ ...rest, createdBy: user }));
			return { records, total, page, limit, totalPages: Math.ceil(total / limit) };
		} catch (error) {
			logger.error("DB error — getRecords", { filters, error: (error as Error).message });
			throw error;
		}
	},

	async getRecordById(id: string) {
		try {
			const record = await prisma.record.findFirst({
				where: { id, deletedAt: null },
				select: {
					id: true,
					amount: true,
					type: true,
					category: true,
					date: true,
					notes: true,
					createdAt: true,
					updatedAt: true,
					user: { select: { id: true, name: true } },
				},
			});

			if (!record) return null;
			const { user, ...rest } = record;
			return { ...rest, createdBy: user };
		} catch (error) {
			logger.error("DB error — getRecordById", { id, error: (error as Error).message });
			throw error;
		}
	},

	async updateRecord(
		id: string,
		data: {
			amount?: number;
			type?: RECORD_TYPES;
			category?: string;
			date?: Date;
			notes?: string;
		},
	) {
		try {
			return await prisma.record.update({
				where: { id },
				data,
				select: {
					id: true,
					amount: true,
					type: true,
					category: true,
					date: true,
					notes: true,
					createdAt: true,
					updatedAt: true,
					user: { select: { id: true, name: true } },
				},
			}).then(({ user, ...rest }) => ({ ...rest, createdBy: user }));
		} catch (error) {
			logger.error("DB error — updateRecord", { id, error: (error as Error).message });
			throw error;
		}
	},

	async softDeleteRecord(id: string) {
		try {
			return await prisma.record.update({ where: { id }, data: { deletedAt: new Date() } });
		} catch (error) {
			logger.error("DB error — softDeleteRecord", { id, error: (error as Error).message });
			throw error;
		}
	},

	async getSummary() {
		try {
			return await prisma.record.groupBy({
				by: ["type"],
				_sum: { amount: true },
				_count: { _all: true },
				where: { deletedAt: null },
			});
		} catch (error) {
			logger.error("DB error — getSummary", { error: (error as Error).message });
			throw error;
		}
	},

	async getCategoryBreakdown() {
		try {
			return await prisma.record.groupBy({
				by: ["category", "type"],
				_sum: { amount: true },
				_count: { _all: true },
				where: { deletedAt: null },
				orderBy: { _sum: { amount: "desc" } },
			});
		} catch (error) {
			logger.error("DB error — getCategoryBreakdown", { error: (error as Error).message });
			throw error;
		}
	},

	async getMonthlyTrends() {
		try {
			return await prisma.$queryRaw<Array<{ month: string; type: string; category: string; total: number; count: number }>>`
				SELECT
					TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month,
					type::text,
					category,
					SUM(amount)::float AS total,
					COUNT(*)::int AS count
				FROM "Record"
				WHERE "deletedAt" IS NULL
				GROUP BY DATE_TRUNC('month', date), type, category
				ORDER BY DATE_TRUNC('month', date) ASC
			`;
		} catch (error) {
			logger.error("DB error — getMonthlyTrends", { error: (error as Error).message });
			throw error;
		}
	},

	async getWeeklyTrends() {
		try {
			return await prisma.$queryRaw<Array<{ week_start: string; type: string; category: string; total: number; count: number }>>`
				SELECT
					TO_CHAR(DATE_TRUNC('week', date), 'YYYY-MM-DD') AS week_start,
					type::text,
					category,
					SUM(amount)::float AS total,
					COUNT(*)::int AS count
				FROM "Record"
				WHERE "deletedAt" IS NULL
				GROUP BY DATE_TRUNC('week', date), type, category
				ORDER BY DATE_TRUNC('week', date) ASC
			`;
		} catch (error) {
			logger.error("DB error — getWeeklyTrends", { error: (error as Error).message });
			throw error;
		}
	},

	async getRecentActivity(limit: number = 10) {
		try {
			const records = await prisma.record.findMany({
				where: { deletedAt: null },
				orderBy: { date: "desc" },
				take: limit,
				select: {
					id: true,
					amount: true,
					type: true,
					category: true,
					date: true,
					notes: true,
					createdAt: true,
					user: { select: { id: true, name: true } },
				},
			});
			return records.map(({ user, ...rest }) => ({ ...rest, createdBy: user }));
		} catch (error) {
			logger.error("DB error — getRecentActivity", { limit, error: (error as Error).message });
			throw error;
		}
	},
};

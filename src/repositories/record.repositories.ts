import { RECORD_TYPES } from "../constants/app.constants";
import { prisma } from "../lib/prisma";

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
		return prisma.record.create({
			data: {
				amount: data.amount,
				type: data.type,
				category: data.category,
				date: data.date,
				notes: data.notes,
				createdBy: data.createdBy,
			},
		});
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
	},

	async getRecordById(id: string) {
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
		return prisma.record.update({
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
	},

	async softDeleteRecord(id: string) {
		return prisma.record.update({ where: { id }, data: { deletedAt: new Date() } });
	},

	// Dashboard queries
	async getTotalsByType() {
		// TODO: aggregate sum grouped by type (INCOME / EXPENSE), exclude soft deleted
	},

	async getTotalsByCategory() {
		// TODO: aggregate sum grouped by category, exclude soft deleted
	},

	async getMonthlyTrends() {
		// TODO: aggregate sum grouped by month+year+type, exclude soft deleted
	},

	async getRecentActivity(limit: number = 10) {
		// TODO: fetch most recent records ordered by date desc, exclude soft deleted
	},
};

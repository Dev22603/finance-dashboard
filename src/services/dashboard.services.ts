import { recordRepository } from "../repositories/record.repositories";
import { getLogger } from "../lib/logger";

const logger = getLogger("dashboard.service");

export const dashboardService = {
	async getDashboardSummary() {
		const totals = await recordRepository.getSummary().catch((error) => {
			logger.error("Failed to fetch dashboard summary", { error: (error as Error).message });
			throw error;
		});

		const incomeRow = totals.find((t) => t.type === "INCOME");
		const expenseRow = totals.find((t) => t.type === "EXPENSE");

		const totalIncome = Number(incomeRow?._sum.amount ?? 0);
		const totalExpenses = Number(expenseRow?._sum.amount ?? 0);
		const netBalance = totalIncome - totalExpenses;
		const savingsRate = totalIncome > 0 ? parseFloat(((netBalance / totalIncome) * 100).toFixed(2)) : 0;

		return {
			totalIncome,
			totalExpenses,
			netBalance,
			savingsRate,
			incomeCount: incomeRow?._count._all ?? 0,
			expenseCount: expenseRow?._count._all ?? 0,
			totalTransactions: (incomeRow?._count._all ?? 0) + (expenseRow?._count._all ?? 0),
		};
	},

	async getCategoryTotals() {
		const rows = await recordRepository.getCategoryBreakdown().catch((error) => {
			logger.error("Failed to fetch category totals", { error: (error as Error).message });
			throw error;
		});

		const incomeTotal = rows
			.filter((r) => r.type === "INCOME")
			.reduce((sum, r) => sum + Number(r._sum.amount ?? 0), 0);
		const expenseTotal = rows
			.filter((r) => r.type === "EXPENSE")
			.reduce((sum, r) => sum + Number(r._sum.amount ?? 0), 0);

		const incomeCategories: Record<string, { total: number; average: number; numTransactions: number; percentage: number }> = {};
		const expenseCategories: Record<string, { total: number; average: number; numTransactions: number; percentage: number }> = {};

		for (const r of rows) {
			const amount = Number(r._sum.amount ?? 0);
			const numTransactions = r._count._all;
			const typeTotal = r.type === "INCOME" ? incomeTotal : expenseTotal;
			const entry = {
				total: amount,
				average: numTransactions > 0 ? parseFloat((amount / numTransactions).toFixed(2)) : 0,
				numTransactions,
				percentage: typeTotal > 0 ? parseFloat(((amount / typeTotal) * 100).toFixed(2)) : 0,
			};
			if (r.type === "INCOME") incomeCategories[r.category] = entry;
			else expenseCategories[r.category] = entry;
		}

		return {
			income: incomeCategories,
			expense: expenseCategories,
		};
	},

	async getMonthlyTrends() {
		const rows = await recordRepository.getMonthlyTrends().catch((error) => {
			logger.error("Failed to fetch monthly trends", { error: (error as Error).message });
			throw error;
		});

		type TypeEntry = { total: number; numTransactions: number; categories: Record<string, { total: number; numTransactions: number }> };
		const result: Record<string, { income: TypeEntry; expense: TypeEntry }> = {};

		for (const row of rows) {
			if (!result[row.month]) {
				result[row.month] = {
					income: { total: 0, numTransactions: 0, categories: {} },
					expense: { total: 0, numTransactions: 0, categories: {} },
				};
			}
			const type = row.type === "INCOME" ? result[row.month].income : result[row.month].expense;
			type.total += row.total;
			type.numTransactions += row.count;
			type.categories[row.category] = { total: row.total, numTransactions: row.count };
		}

		return result;
	},

	async getWeeklyTrends() {
		const rows = await recordRepository.getWeeklyTrends().catch((error) => {
			logger.error("Failed to fetch weekly trends", { error: (error as Error).message });
			throw error;
		});

		type TypeEntry = { total: number; numTransactions: number; categories: Record<string, { total: number; numTransactions: number }> };
		const result: Record<string, { income: TypeEntry; expense: TypeEntry }> = {};

		for (const row of rows) {
			if (!result[row.week_start]) {
				result[row.week_start] = {
					income: { total: 0, numTransactions: 0, categories: {} },
					expense: { total: 0, numTransactions: 0, categories: {} },
				};
			}
			const type = row.type === "INCOME" ? result[row.week_start].income : result[row.week_start].expense;
			type.total += row.total;
			type.numTransactions += row.count;
			type.categories[row.category] = { total: row.total, numTransactions: row.count };
		}

		return result;
	},

	async getRecentActivity(limit: number = 10) {
		return recordRepository.getRecentActivity(limit).catch((error) => {
			logger.error("Failed to fetch recent activity", { error: (error as Error).message });
			throw error;
		});
	},

};

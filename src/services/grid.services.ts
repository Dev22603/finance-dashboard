import { ApiError } from "../utils/api_error";

const GRID_SIZE = 16;
const grid: number[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));

export const gridService = {
	getGrid: () => grid.map((row) => [...row]),

	setCell: (x: number, y: number, value: 0 | 1, _userId: string) => {
		if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
			throw new ApiError(400, "Cell coordinates are out of bounds");
		}
		grid[y][x] = value;
		return { x, y, value };
	},
};

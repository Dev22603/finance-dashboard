export const SOCKET_EVENTS = {
	GRID: {
		SNAPSHOT: "grid:snapshot",
		SET_CELL: "grid:set-cell",
		CELL_UPDATED: "grid:cell-updated",
		ERROR: "grid:error",
	},
} as const;

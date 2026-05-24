import * as z from "zod/v4";

export const setCellSchema = z.object({
	x: z.number().int().min(0).max(15),
	y: z.number().int().min(0).max(15),
	value: z.union([z.literal(0), z.literal(1)]),
});

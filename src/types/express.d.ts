import { ROLES } from "../constants/app.constants";

declare global {
	namespace Express {
		interface Request {
			user: {
				id: string;
				name: string;
				role: ROLES;
			};
		}
	}
}

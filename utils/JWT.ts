import { badImplementation } from "@hapi/boom";
import jsonwebtoken from "jsonwebtoken";

export const JWT = {
	sign: (payload: object, options?: jsonwebtoken.SignOptions) => {
		try {
			const secret = Bun.env.JWT_SECRET;
			return jsonwebtoken.sign(payload, secret, options);
		} catch (_err: any) {
			throw badImplementation("Error signing token!");
		}
	},
	verify: (token: string) => {
		try {
			const secret = Bun.env.JWT_SECRET;
			return jsonwebtoken.verify(token, secret);
		} catch (_err: any) {
			throw badImplementation("Error verifying token!");
		}
	},
};

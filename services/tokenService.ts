import Token, { type IToken } from "models/tokenModel";
import { Types } from "mongoose";

const isValidObjectId = (id: string): boolean => {
	return Types.ObjectId.isValid(id);
};

export const createTokenService = async (
	tokenData: Partial<IToken>,
): Promise<IToken> => {
	const token = new Token(tokenData);
	return await token.save();
};

export const updateTokenService = async (
	key: string,
	tokenData: Partial<IToken>,
): Promise<IToken | null> => {
	const query: Record<string, any> = [{ access_token: key }];

	if (isValidObjectId(key)) {
		query.$or.push({ _id: key });
		query.$or.push({ user: key });
	}

	return await Token.findOneAndUpdate(query, tokenData, {
		new: true,
	});
};

export const getTokenService = async (key: string): Promise<IToken | null> => {
	const query: any = {
		$or: [{ access_token: key }, { refresh_token: key }],
	};

	if (isValidObjectId(key)) {
		query.$or = query.$or.concat([{ _id: key }, { user: key }]);
	}

	return await Token.findOne(query);
};

export const deleteTokenService = async (
	key: string,
): Promise<IToken | null> => {
	const query: any = {
		$or: [{ access_token: key }],
	};

	if (isValidObjectId(key)) {
		query.$or.push({ _id: key });
		query.$or.push({ user: key });
	}

	return await Token.findOneAndDelete(query);
};

export const createTwoFATokenService = async (
	tokenData: Partial<IToken>,
): Promise<IToken> => {
	const query = { user: tokenData.user };
	const update = { twofa_token: tokenData.twofa_token };

	return await Token.findOneAndUpdate(query, update, {
		new: true,
		upsert: true,
	});
};

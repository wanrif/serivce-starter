import mongoose, { Schema, type Document } from "mongoose";

export interface IToken extends Document {
	twofa_token: string;
	access_token: string;
	refresh_token: string;
	user: string;
}

const tokenSchema: Schema = new Schema({
	twofa_token: { type: String },
	access_token: { type: String },
	refresh_token: { type: String },
	user: { type: Schema.Types.ObjectId, ref: "User" },
});

export default mongoose.model<IToken>("Token", tokenSchema);

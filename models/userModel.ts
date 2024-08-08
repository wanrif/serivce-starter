import mongoose, { Schema, type Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  twofa_enabled: boolean; // default: false
}

const userSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  twofa_enabled: { type: Boolean, default: false },
});

export default mongoose.model<IUser>('User', userSchema);

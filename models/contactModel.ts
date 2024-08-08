import mongoose, { Schema, type Document } from 'mongoose';

export interface IContact extends Document {
  owner: mongoose.Types.ObjectId;
  contactList: mongoose.Types.ObjectId[];
}

const contactSchema: Schema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  contactList: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

export default mongoose.model<IContact>('Contact', contactSchema);

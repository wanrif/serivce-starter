import User, { type IUser } from 'models/userModel';
import { Types } from 'mongoose';

const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

export const getAllUsersService = async (): Promise<IUser[]> => {
  try {
    return await User.find();
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
};

export const createUserService = async (userData: Partial<IUser>): Promise<IUser> => {
  try {
    const user = new User(userData);
    return await user.save();
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const getUserService = async (key: string, withPassword?: boolean): Promise<IUser | null> => {
  const query = {
    $or: [{ _id: isValidObjectId(key) ? key : null }, { email: key }],
  };

  try {
    return await User.findOne(query).select(withPassword ? '+password' : '-password');
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

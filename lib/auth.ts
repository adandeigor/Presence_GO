import jwt from 'jsonwebtoken';
import { UserInfoType } from './session/session-options';

const JWT_SECRET = process.env.JWT_SECRET as string;

export const generateToken = (user: UserInfoType): string => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
};

export const verifyToken = (token: string): UserInfoType | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as UserInfoType;
  } catch {
    return null;
  }
};
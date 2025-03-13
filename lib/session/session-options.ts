import { Level, Role } from '@prisma/client';
import { SessionOptions } from 'iron-session';

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string, // Clé secrète pour signer le cookie (doit être au moins 32 caractères)
  cookieName: 'user_session', // Nom du cookie de session
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Sécurisé uniquement en production (HTTPS)
    sameSite: 'lax', // Politique SameSite
    path: '/', // Chemin d'accès au cookie
  },
};


export type UserInfoType = {
  id: string;
  email: string;
  name: string;
  image?: string;
  phone_number?: string;
  studentId?: string;
  role: Role;
  level?: Level;
  classId?: string;
  schoolId?: string;
  emailVerified? : Date;
  sessionToken?: string;
  sessionExpires?: Date;
};

export default sessionOptions;

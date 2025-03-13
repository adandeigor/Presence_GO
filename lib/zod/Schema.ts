import { Level, Role } from '@prisma/client';
import { z } from 'zod';

export const schoolSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Le nom de l'école est requis"),
  level: z.nativeEnum(Level),
  address: z.string().min(1, "L'adresse est requise"),
  phone_number: z.string().min(10, 'Numéro de téléphone invalide'),
  email: z.string().email('Email invalide'),
  createdAt: z.date().default(new Date()),
});

export const createSchoolSchema = z.object({
  name: z.string().min(1, "Le nom de l'école est requis"),
  level: z.nativeEnum(Level),
  address: z.string().min(1, "L'adresse est requise"),
  phone_number: z.string().min(10, 'Numéro de téléphone invalide'),
  email: z.string().email('Email invalide'),
});

export const schoolAdminSchema = z.object({
  id: z.string().cuid(),
  schoolId: z.string().uuid(),
  admin_id: z.string().cuid(),
  createdAt: z.date().default(new Date()),
});

export const classSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Le nom de la classe est requis'),
  level: z.nativeEnum(Level),
  schoolId: z.string().uuid(),
  teacherId: z.string().cuid().nullable(),
  createdAt: z.date().default(new Date()),
});

export const userSchema = z.object({
  id: z.string().cuid(),
  name: z.string().optional(),
  email: z.string().email(),
  emailVerified: z.date().nullable(),
  password: z.string().optional(),
  image: z.string().optional(),
  phone_number: z.string().optional(),
  studentId: z.string().optional(),
  role: z.nativeEnum(Role).default(Role.STUDENT),
  level: z.nativeEnum(Level).nullable(),
  classId: z.string().uuid().nullable(),
  schoolId: z.string().uuid().nullable(),
  createdAt: z.date().default(new Date()),
  updatedAt: z.date().default(new Date()),
});

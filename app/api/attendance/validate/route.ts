import { handleServerError } from '@/lib/api';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import { canManageCourse } from '@/lib/functions/attendance/attendanceHelpers';
import { prisma } from '@/lib/prisma/init';
import { ValidationMethodType } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Validation de la clé API
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    // Vérification des rôles
    const roleCheck = await withRoleCheck(request, ['TEACHER', 'ADMIN']);
    if (roleCheck) return roleCheck;

    const body = await request.json();
    const { 
      attendanceId,
      validationMethod = ValidationMethodType.MANUAL,
      deviceInfo = null
    } = body;

    // Validation des données requises
    if (!attendanceId) {
      return NextResponse.json(
        { error: "L'ID de la présence est requis" },
        { status: 400 }
      );
    }

    // Vérification de l'existence de la présence
    const existingAttendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        course: true
      }
    });

    if (!existingAttendance) {
      return NextResponse.json(
        { error: "La présence spécifiée n'existe pas" },
        { status: 404 }
      );
    }

    // Vérification des permissions
    const user = (request as any).user;
    const canManage = await canManageCourse(user.id, user.role, existingAttendance.courseId);
    if (!canManage) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à valider les présences de ce cours" },
        { status: 403 }
      );
    }

    // Mise à jour de la présence avec la validation
    const attendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        validationMethod,
        validatedById: user.id,
        deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        course: {
          select: {
            id: true,
            name: true,
            class: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        validatedBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('[ATTENDANCE_VALIDATE_ERROR]', error);
    return handleServerError(error);
  }
} 
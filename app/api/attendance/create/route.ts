import { handleServerError } from '@/lib/api';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import { canMarkAttendance, createAttendance, notifyParentsOfAbsence } from '@/lib/functions/attendance/attendanceHelpers';
import { AttendanceStatus, ValidationMethod } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { isDeviceAuthorized } from '@/lib/functions/device/deviceHelpers';

export async function POST(request: NextRequest) {
  try {
    // Validation de la clé API
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    // Vérification des rôles
    const roleCheckResult = await withRoleCheck(request, ['TEACHER', 'ADMIN']);
    if (roleCheckResult instanceof NextResponse) {
      return roleCheckResult;
    }
    const { user } = roleCheckResult;

    const body = await request.json();
    const { studentId, courseId, status, validationMethod, deviceInfo } = body;

    // Récupérer l'IP du client
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') ||
               '0.0.0.0';

    // Ajouter l'IP aux informations de l'appareil
    const deviceInfoWithIp = {
      ...deviceInfo,
      ip: ip.split(',')[0] // Prendre la première IP si plusieurs sont présentes
    };

    // Vérifier si l'appareil est autorisé
    if (!(await isDeviceAuthorized(studentId, deviceInfoWithIp))) {
      return NextResponse.json(
        { error: 'Appareil non autorisé' },
        { status: 403 }
      );
    }

    // Validation des données requises
    if (!studentId || !courseId) {
      return NextResponse.json(
        { error: "L'ID de l'étudiant et l'ID du cours sont requis" },
        { status: 400 }
      );
    }

    // Vérifier si l'étudiant peut marquer sa présence
    const { canMark, error } = await canMarkAttendance(studentId, courseId);
    if (!canMark) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Création de la présence
    const attendance = await createAttendance({
      studentId,
      courseId,
      status,
      validationMethod,
      validatedById: user.id,
      deviceInfo: deviceInfoWithIp
    });

    // Si l'étudiant est absent, notifier les parents
    if (status === AttendanceStatus.ABSENT) {
      await notifyParentsOfAbsence(
        studentId,
        courseId,
        'Étudiant'
      );
    }

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('[ATTENDANCE_CREATE_ERROR]', error);
    return handleServerError(error);
  }
} 
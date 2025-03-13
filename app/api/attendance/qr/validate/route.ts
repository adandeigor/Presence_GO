import { handleServerError } from '@/lib/api';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma/init';
import { AttendanceStatus, ValidationMethodType } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Fonction pour vérifier un QR code
function verifyQRCode(qrCode: string): { isValid: boolean; courseId?: string; timestamp?: number } {
  try {
    const secret = process.env.QR_SECRET || 'default-secret-key';
    const [courseId, timestamp, receivedHash] = qrCode.split('-');
    const data = `${courseId}-${timestamp}`;
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');

    if (receivedHash === expectedHash) {
      const timestampNum = parseInt(timestamp);
      const now = Date.now();
      // Vérifie si le QR code n'a pas expiré (5 minutes)
      if (now - timestampNum <= 5 * 60 * 1000) {
        return { isValid: true, courseId, timestamp: timestampNum };
      }
    }
    return { isValid: false };
  } catch {
    return { isValid: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validation de la clé API
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    // Vérification des rôles (seuls les étudiants peuvent scanner des QR codes)
    const roleCheck = await withRoleCheck(request, ['STUDENT']);
    if (roleCheck) return roleCheck;

    const body = await request.json();
    const { qrCode, deviceInfo } = body;

    if (!qrCode) {
      return NextResponse.json(
        { error: "Le QR code est requis" },
        { status: 400 }
      );
    }

    // Vérification du QR code
    const { isValid, courseId, timestamp } = verifyQRCode(qrCode);

    if (!isValid || !courseId) {
      return NextResponse.json(
        { error: "QR code invalide ou expiré" },
        { status: 400 }
      );
    }

    // Vérification que l'étudiant appartient à la classe du cours
    const student = await prisma.user.findFirst({
      where: {
        id: (request as any).user.id,
        role: 'STUDENT'
      },
      include: {
        class: true
      }
    });

    if (!student || !student.class) {
      return NextResponse.json(
        { error: "Étudiant non trouvé ou non assigné à une classe" },
        { status: 404 }
      );
    }

    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        classId: student.class.id
      }
    });

    if (!course) {
      return NextResponse.json(
        { error: "Cours non trouvé ou vous n'appartenez pas à la classe de ce cours" },
        { status: 404 }
      );
    }

    // Vérification qu'une présence n'a pas déjà été enregistrée pour ce cours aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: student.id,
        courseId: course.id,
        timestamp: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: "Vous avez déjà marqué votre présence pour ce cours aujourd'hui" },
        { status: 400 }
      );
    }

    // Création de la présence
    const attendance = await prisma.attendance.create({
      data: {
        studentId: student.id,
        courseId: course.id,
        status: AttendanceStatus.PRESENT,
        validationMethod: ValidationMethodType.QR,
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
        }
      }
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('[QR_VALIDATE_ERROR]', error);
    return handleServerError(error);
  }
} 
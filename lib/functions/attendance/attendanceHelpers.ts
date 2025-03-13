import { AttendanceStatus, ValidationMethod } from '@prisma/client';
import { prisma } from '@/lib/prisma/init';
import crypto from 'crypto';

export interface DeviceInfo {
  userAgent: string;
  ipAddress: string;
  deviceId?: string;
}

export interface AttendanceFilters {
  startDate?: Date;
  endDate?: Date;
  courseId?: string;
  classId?: string;
  studentId?: string;
  status?: AttendanceStatus;
  page?: number;
  limit?: number;
}

export interface QRCodeData {
  code: string;
  expiresAt: Date;
  courseId: string;
  timestamp: number;
}

/**
 * Vérifie si un utilisateur a le droit de voir les présences d'un étudiant
 */
export async function canViewStudentAttendance(
  userId: string,
  userRole: string,
  studentId: string
): Promise<boolean> {
  // L'étudiant peut voir ses propres présences
  if (userRole === 'STUDENT') {
    return userId === studentId;
  }

  // Les admins et les enseignants peuvent voir toutes les présences
  if (['ADMIN', 'TEACHER'].includes(userRole)) {
    return true;
  }

  // Les parents peuvent voir les présences de leurs enfants
  if (userRole === 'PARENT') {
    const isParentOfStudent = await prisma.parentChild.findFirst({
      where: {
        parentId: userId,
        childId: studentId
      }
    });
    return !!isParentOfStudent;
  }

  return false;
}

/**
 * Vérifie si un enseignant peut gérer un cours
 */
export async function canManageCourse(
  userId: string,
  userRole: string,
  courseId: string
): Promise<boolean> {
  if (userRole === 'ADMIN') return true;

  if (userRole === 'TEACHER') {
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        teacherId: userId
      }
    });
    return !!course;
  }

  return false;
}

/**
 * Génère un QR code sécurisé pour un cours
 */
export function generateSecureQRCode(courseId: string): QRCodeData {
  const secret = process.env.QR_SECRET || 'default-secret-key';
  const timestamp = Date.now();
  const data = `${courseId}-${timestamp}`;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  return {
    code: `${data}-${hash}`,
    expiresAt: new Date(timestamp + 5 * 60 * 1000), // Expire dans 5 minutes
    courseId,
    timestamp
  };
}

/**
 * Vérifie un QR code
 */
export function verifyQRCode(qrCode: string): { 
  isValid: boolean; 
  courseId?: string; 
  timestamp?: number 
} {
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

/**
 * Construit les conditions de recherche pour les présences
 */
export function buildAttendanceWhereClause(filters: AttendanceFilters): any {
  const where: any = {};

  if (filters.courseId) where.courseId = filters.courseId;
  if (filters.studentId) where.studentId = filters.studentId;
  if (filters.status) where.status = filters.status;

  if (filters.startDate && filters.endDate) {
    where.timestamp = {
      gte: filters.startDate,
      lte: filters.endDate
    };
  }

  if (filters.classId) {
    where.course = {
      classId: filters.classId
    };
  }

  return where;
}

/**
 * Calcule les statistiques de présence
 */
export function calculateAttendanceStats(attendances: any[]) {
  return {
    total: attendances.length,
    present: attendances.filter(a => a.status === AttendanceStatus.PRESENT).length,
    absent: attendances.filter(a => a.status === AttendanceStatus.ABSENT).length,
    excuse: attendances.filter(a => a.status === AttendanceStatus.EXCUSE).length
  };
}

/**
 * Envoie des notifications aux parents en cas d'absence
 */
export async function notifyParentsOfAbsence(
  studentId: string,
  courseName: string,
  studentName: string
) {
  const parents = await prisma.user.findMany({
    where: {
      role: 'PARENT',
      parentOf: {
        some: {
          childId: studentId
        }
      }
    }
  });

  if (parents.length > 0) {
    await prisma.notification.createMany({
      data: parents.map(parent => ({
        userId: parent.id,
        message: `Votre enfant ${studentName} était absent au cours de ${courseName}`,
        type: 'ABSENCE',
        status: 'SENT'
      }))
    });
  }
}

/**
 * Vérifie si un étudiant peut marquer sa présence pour un cours
 */
export async function canMarkAttendance(
  studentId: string,
  courseId: string
): Promise<{
  canMark: boolean;
  error?: string;
}> {
  // Vérifier que l'étudiant existe et est assigné à une classe
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: 'STUDENT'
    },
    include: {
      class: true
    }
  });

  if (!student || !student.class) {
    return {
      canMark: false,
      error: "Étudiant non trouvé ou non assigné à une classe"
    };
  }

  // Vérifier que le cours existe et appartient à la classe de l'étudiant
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      classId: student.class.id
    }
  });

  if (!course) {
    return {
      canMark: false,
      error: "Cours non trouvé ou vous n'appartenez pas à la classe de ce cours"
    };
  }

  // Vérifier qu'une présence n'a pas déjà été enregistrée aujourd'hui
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingAttendance = await prisma.attendance.findFirst({
    where: {
      studentId,
      courseId,
      timestamp: {
        gte: today,
        lt: tomorrow
      }
    }
  });

  if (existingAttendance) {
    return {
      canMark: false,
      error: "Vous avez déjà marqué votre présence pour ce cours aujourd'hui"
    };
  }

  return { canMark: true };
}

/**
 * Crée une nouvelle présence
 */
export async function createAttendance({
  studentId,
  courseId,
  status = AttendanceStatus.PRESENT,
  validationMethod = ValidationMethod.MANUAL,
  validatedById,
  deviceInfo
}: {
  studentId: string;
  courseId: string;
  status?: AttendanceStatus;
  validationMethod?: ValidationMethod;
  validatedById?: string;
  deviceInfo?: DeviceInfo;
}) {
  return prisma.attendance.create({
    data: {
      studentId,
      courseId,
      status,
      validationMethod,
      validatedById,
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
}

export async function generateQRCode(courseId: string, timestamp: Date): Promise<string> {
  const data = {
    courseId,
    timestamp: timestamp.toISOString(),
  };
  
  // Créer une signature unique pour le QR code
  const signature = crypto
    .createHash('sha256')
    .update(`${courseId}-${timestamp.toISOString()}-${process.env.QR_SECRET}`)
    .digest('hex');

  return JSON.stringify({
    ...data,
    signature
  });
} 
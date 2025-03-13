import { prisma } from '@/lib/prisma/init';
import { Prisma, ValidationMethod, ValidationMethodType } from '@prisma/client';
import { DeviceInfo, isDeviceAuthorized, isLocationValid, isDeviceSuspicious, logFraudAttempt } from '../device/deviceHelpers';
import { generateQRCode } from '../attendance/attendanceHelpers';

/**
 * Vérifie si un utilisateur peut valider une présence
 */
export async function canValidateAttendance(
  userId: string,
  userRole: string,
  courseId: string
): Promise<boolean> {
  if (userRole === 'ADMIN') return true;

  if (userRole === 'TEACHER') {
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });
    return course?.teacherId === userId;
  }

  return false;
}

/**
 * Valide une présence par QR Code
 */
export async function validateAttendanceByQR({
  studentId,
  courseId,
  qrCode,
  deviceInfo
}: {
  studentId: string;
  courseId: string;
  qrCode: string;
  deviceInfo: DeviceInfo;
}): Promise<{ success: boolean; message?: string }> {
  // Vérifier si le QR code est valide
  const isValidQR = await verifyQRCode(qrCode, courseId);
  if (!isValidQR) {
    return { success: false, message: 'QR Code invalide ou expiré' };
  }

  // Vérifier si l'appareil est autorisé
  const isDeviceValid = await isDeviceAuthorized(studentId, deviceInfo);
  if (!isDeviceValid) {
    await logFraudAttempt(studentId, courseId, deviceInfo, 'Appareil non autorisé');
    return { success: false, message: 'Appareil non autorisé' };
  }

  // Vérifier si l'appareil est suspect
  const isSuspicious = await isDeviceSuspicious(deviceInfo);
  if (isSuspicious) {
    await logFraudAttempt(studentId, courseId, deviceInfo, 'Appareil suspect');
    return { success: false, message: 'Activité suspecte détectée' };
  }

  // Vérifier la localisation si disponible
  if (deviceInfo.location) {
    const isValidLocation = await isLocationValid(courseId, deviceInfo.location);
    if (!isValidLocation) {
      await logFraudAttempt(studentId, courseId, deviceInfo, 'Localisation invalide');
      return { success: false, message: 'Localisation invalide' };
    }
  }

  return { success: true };
}

/**
 * Vérifie si un QR code est valide pour un cours
 */
async function verifyQRCode(qrCode: string, courseId: string): Promise<boolean> {
  try {
    const decodedData = JSON.parse(qrCode);
    if (!decodedData.courseId || !decodedData.timestamp || !decodedData.signature) {
      return false;
    }

    // Vérifier si le QR code correspond au bon cours
    if (decodedData.courseId !== courseId) {
      return false;
    }

    // Vérifier si le QR code n'est pas expiré (validité de 5 minutes)
    const qrTimestamp = new Date(decodedData.timestamp).getTime();
    const currentTime = Date.now();
    if (currentTime - qrTimestamp > 5 * 60 * 1000) {
      return false;
    }

    // Vérifier la signature du QR code
    const expectedSignature = await generateQRCode(courseId, new Date(qrTimestamp));
    return decodedData.signature === expectedSignature;
  } catch (error) {
    return false;
  }
}

/**
 * Valide une présence manuellement
 */
export async function validateAttendanceManually({
  studentId,
  courseId,
  validatedById,
  deviceInfo
}: {
  studentId: string;
  courseId: string;
  validatedById: string;
  deviceInfo?: DeviceInfo;
}): Promise<{ success: boolean; message?: string }> {
  // Vérifier si l'utilisateur peut valider la présence
  const validator = await prisma.user.findUnique({
    where: { id: validatedById }
  });

  if (!validator) {
    return { success: false, message: 'Validateur non trouvé' };
  }

  const canValidate = await canValidateAttendance(validatedById, validator.role, courseId);
  if (!canValidate) {
    return { success: false, message: 'Non autorisé à valider les présences' };
  }

  // Si des informations sur l'appareil sont fournies, effectuer les vérifications
  if (deviceInfo) {
    const isDeviceValid = await isDeviceAuthorized(studentId, deviceInfo);
    if (!isDeviceValid) {
      await logFraudAttempt(studentId, courseId, deviceInfo, 'Appareil non autorisé');
      return { success: false, message: 'Appareil non autorisé' };
    }

    const isSuspicious = await isDeviceSuspicious(deviceInfo);
    if (isSuspicious) {
      await logFraudAttempt(studentId, courseId, deviceInfo, 'Appareil suspect');
      return { success: false, message: 'Activité suspecte détectée' };
    }

    if (deviceInfo.location) {
      const isValidLocation = await isLocationValid(courseId, deviceInfo.location);
      if (!isValidLocation) {
        await logFraudAttempt(studentId, courseId, deviceInfo, 'Localisation invalide');
        return { success: false, message: 'Localisation invalide' };
      }
    }
  }

  return { success: true };
}

/**
 * Valide une présence par géolocalisation
 */
export async function validateAttendanceByLocation({
  studentId,
  courseId,
  location,
  deviceInfo
}: {
  studentId: string;
  courseId: string;
  location: { latitude: number; longitude: number };
  deviceInfo: DeviceInfo;
}): Promise<{ success: boolean; message?: string }> {
  // Vérifier si l'appareil est autorisé
  const isDeviceValid = await isDeviceAuthorized(studentId, deviceInfo);
  if (!isDeviceValid) {
    await logFraudAttempt(studentId, courseId, deviceInfo, 'Appareil non autorisé');
    return { success: false, message: 'Appareil non autorisé' };
  }

  // Vérifier si l'appareil est suspect
  const isSuspicious = await isDeviceSuspicious(deviceInfo);
  if (isSuspicious) {
    await logFraudAttempt(studentId, courseId, deviceInfo, 'Appareil suspect');
    return { success: false, message: 'Activité suspecte détectée' };
  }

  // Vérifier la localisation
  const isValidLocation = await isLocationValid(courseId, location);
  if (!isValidLocation) {
    await logFraudAttempt(studentId, courseId, deviceInfo, 'Localisation invalide');
    return { success: false, message: 'Localisation invalide' };
  }

  return { success: true };
}

interface ValidationMethodFilters {
  type?: ValidationMethodType;
  status?: string;
}

export function buildValidationMethodWhereClause(filters: ValidationMethodFilters): Prisma.ValidationMethodWhereInput {
  const where: Prisma.ValidationMethodWhereInput = {};
  
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  
  return where;
}

export async function getValidationMethods(
  where: Prisma.ValidationMethodWhereInput,
  page: number,
  limit: number
) {
  const [validationMethods, total] = await Promise.all([
    prisma.validationMethod.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.validationMethod.count({ where })
  ]);

  return {
    validationMethods,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function createValidationMethod({
  name,
  type,
  config,
  description
}: {
  name: string;
  type: ValidationMethodType;
  config: any;
  description?: string;
}) {
  return prisma.validationMethod.create({
    data: {
      name,
      type,
      config,
      description
    }
  });
}

export async function getValidationMethodById(id: string) {
  return prisma.validationMethod.findUnique({
    where: { id }
  });
}

export async function updateValidationMethod(
  id: string,
  data: {
    name?: string;
    type?: ValidationMethodType;
    config?: any;
    description?: string;
    status?: string;
  }
) {
  return prisma.validationMethod.update({
    where: { id },
    data
  });
}

export async function deleteValidationMethod(id: string) {
  return prisma.validationMethod.delete({
    where: { id }
  });
} 
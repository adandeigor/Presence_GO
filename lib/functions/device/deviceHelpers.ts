import { prisma } from '@/lib/prisma/init';
import { Prisma } from '@prisma/client';

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  browser: string;
  version: string;
  os: string;
  ip: string;
  location?: Location;
}

export interface Location {
  latitude: number;
  longitude: number;
}

/**
 * Vérifie si un appareil est autorisé pour un utilisateur
 */
export async function isDeviceAuthorized(userId: string, deviceInfo: DeviceInfo): Promise<boolean> {
  // Vérifier si l'appareil a déjà été utilisé par l'utilisateur
  const existingAttendance = await prisma.attendance.findFirst({
    where: {
      studentId: userId,
      deviceInfo: {
        not: null
      }
    },
    orderBy: {
      timestamp: 'desc'
    }
  });

  if (!existingAttendance) return true;

  const existingDeviceInfo = JSON.parse(existingAttendance.deviceInfo || '{}');

  // Comparer les informations de l'appareil
  return (
    existingDeviceInfo.userAgent === deviceInfo.userAgent &&
    existingDeviceInfo.platform === deviceInfo.platform &&
    existingDeviceInfo.browser === deviceInfo.browser &&
    existingDeviceInfo.os === deviceInfo.os &&
    existingDeviceInfo.ip === deviceInfo.ip
  );
}

/**
 * Formate les informations de l'appareil pour le stockage
 */
export function formatDeviceInfo(deviceInfo: DeviceInfo): string {
  return JSON.stringify({
    userAgent: deviceInfo.userAgent,
    platform: deviceInfo.platform,
    browser: deviceInfo.browser,
    version: deviceInfo.version,
    os: deviceInfo.os,
    ip: deviceInfo.ip
  });
}

/**
 * Vérifie si un appareil est suspect
 */
export async function isDeviceSuspicious(deviceInfo: DeviceInfo): Promise<boolean> {
  // Vérifier si l'appareil a été utilisé par plusieurs utilisateurs dans un court laps de temps
  const recentAttendances = await prisma.attendance.findMany({
    where: {
      deviceInfo: {
        not: null
      },
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Dernières 24 heures
      }
    }
  });

  const deviceUsers = new Set();
  for (const attendance of recentAttendances) {
    const attendanceDeviceInfo = JSON.parse(attendance.deviceInfo || '{}');
    if (
      attendanceDeviceInfo.userAgent === deviceInfo.userAgent &&
      attendanceDeviceInfo.platform === deviceInfo.platform &&
      attendanceDeviceInfo.browser === deviceInfo.browser &&
      attendanceDeviceInfo.os === deviceInfo.os
    ) {
      deviceUsers.add(attendance.studentId);
      if (deviceUsers.size > 2) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Enregistre une tentative de fraude
 */
export async function logFraudAttempt(
  userId: string,
  courseId: string,
  deviceInfo: DeviceInfo,
  reason: string
) {
  // Créer une notification pour l'enseignant
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      teacher: true,
      class: true
    }
  });

  if (!course) return;

  const message = `Tentative de fraude détectée pour l'étudiant ${userId} dans le cours ${course.name}. Raison : ${reason}`;

  await prisma.notification.create({
    data: {
      userId: course.teacherId as string,
      message,
      type: 'ALERT',
      status: 'SENT',
      metadata: JSON.stringify({
        studentId: userId,
        courseId,
        deviceInfo,
        reason,
        timestamp: new Date()
      })
    }
  });
}

export async function isLocationValid(courseId: string, location: Location): Promise<boolean> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      class: {
        include: {
          school: true
        }
      }
    }
  });

  if (!course?.class?.school) return false;

  // Vérifier si la localisation est dans un rayon de 100 mètres de l'école
  const MAX_DISTANCE = 0.1; // 100 mètres en kilomètres
  return true; // TODO: Implémenter la vérification de distance réelle si nécessaire
}

export async function getDeviceById(id: string) {
  return prisma.device.findUnique({
    where: { id }
  });
}

export async function updateDevice(id: string, data: {
  type?: string;
  name?: string;
  status?: string;
}) {
  return prisma.device.update({
    where: { id },
    data
  });
}

export async function deleteDevice(id: string) {
  return prisma.device.delete({
    where: { id }
  });
}

export interface DeviceFilters {
  userId?: string;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function buildDeviceWhereClause(filters: DeviceFilters): Prisma.DeviceWhereInput {
  const where: Prisma.DeviceWhereInput = {};
  
  if (filters.userId) where.userId = filters.userId;
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  
  return where;
}

export async function getDevices(
  where: Prisma.DeviceWhereInput,
  page: number,
  limit: number
) {
  const [devices, total] = await Promise.all([
    prisma.device.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.device.count({ where })
  ]);

  return {
    devices,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function createDevice(data: {
  userId: string;
  type: string;
  name: string;
  identifier: string;
}) {
  return prisma.device.create({
    data: {
      userId: data.userId,
      type: data.type,
      name: data.name,
      status: 'ACTIVE'
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
} 
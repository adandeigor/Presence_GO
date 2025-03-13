import { PermissionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma/init';

export interface PermissionFilters {
  startDate?: Date;
  endDate?: Date;
  courseId?: string;
  studentId?: string;
  status?: PermissionStatus;
  page?: number;
  limit?: number;
}

/**
 * Vérifie si un utilisateur peut gérer une permission
 */
export async function canManagePermission(
  userId: string,
  userRole: string,
  permissionId: string
): Promise<boolean> {
  if (userRole === 'ADMIN') return true;

  const permission = await prisma.permission.findUnique({
    where: { id: permissionId },
    include: {
      course: true
    }
  });

  if (!permission) return false;

  if (userRole === 'TEACHER') {
    return permission.course.teacherId === userId;
  }

  return false;
}

/**
 * Vérifie si un utilisateur peut créer une permission pour un étudiant
 */
export async function canCreatePermissionForStudent(
  userId: string,
  userRole: string,
  studentId: string
): Promise<boolean> {
  if (['ADMIN', 'TEACHER'].includes(userRole)) return true;

  if (userRole === 'PARENT') {
    const isParentOfStudent = await prisma.parentChild.findFirst({
      where: {
        parentId: userId,
        childId: studentId
      }
    });
    return !!isParentOfStudent;
  }

  if (userRole === 'STUDENT') {
    return userId === studentId;
  }

  return false;
}

/**
 * Construit les conditions de recherche pour les permissions
 */
export function buildPermissionWhereClause(filters: PermissionFilters): any {
  const where: any = {};

  if (filters.courseId) where.courseId = filters.courseId;
  if (filters.studentId) where.studentId = filters.studentId;
  if (filters.status) where.status = filters.status;

  if (filters.startDate && filters.endDate) {
    where.createdAt = {
      gte: filters.startDate,
      lte: filters.endDate
    };
  }

  return where;
}

/**
 * Crée une nouvelle permission
 */
export async function createPermission({
  studentId,
  courseId,
  reason,
  requestedById
}: {
  studentId: string;
  courseId: string;
  reason: string;
  requestedById: string;
}) {
  return prisma.permission.create({
    data: {
      studentId,
      courseId,
      reason,
      status: PermissionStatus.PENDING
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
}

/**
 * Met à jour le statut d'une permission
 */
export async function updatePermissionStatus({
  permissionId,
  status,
  approvedById
}: {
  permissionId: string;
  status: PermissionStatus;
  approvedById: string;
}) {
  const permission = await prisma.permission.update({
    where: { id: permissionId },
    data: {
      status,
      approvedById: status === PermissionStatus.PENDING ? null : approvedById
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
          name: true
        }
      },
      approvedBy: status === PermissionStatus.PENDING ? undefined : {
        select: {
          id: true,
          name: true,
          role: true
        }
      }
    }
  });

  // Envoyer une notification à l'étudiant et aux parents
  await notifyPermissionUpdate(permission);

  return permission;
}

/**
 * Notifie l'étudiant et les parents du changement de statut d'une permission
 */
async function notifyPermissionUpdate(permission: any) {
  const message = `Votre demande de permission pour le cours de ${permission.course.name} a été ${
    permission.status === PermissionStatus.APPROVED ? 'approuvée' : 
    permission.status === PermissionStatus.DENIED ? 'refusée' : 'mise en attente'
  }`;

  // Notification pour l'étudiant
  await prisma.notification.create({
    data: {
      userId: permission.studentId,
      message,
      type: 'GENERAL',
      status: 'SENT'
    }
  });

  // Notification pour les parents
  const parents = await prisma.user.findMany({
    where: {
      role: 'PARENT',
      parentOf: {
        some: {
          childId: permission.studentId
        }
      }
    }
  });

  if (parents.length > 0) {
    await prisma.notification.createMany({
      data: parents.map(parent => ({
        userId: parent.id,
        message,
        type: 'GENERAL',
        status: 'SENT'
      }))
    });
  }
} 
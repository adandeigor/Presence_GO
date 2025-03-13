import { NotificationType, NotificationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma/init';

export interface NotificationFilters {
  userId?: string;
  type?: NotificationType;
  status?: NotificationStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Construit les conditions de recherche pour les notifications
 */
export function buildNotificationWhereClause(filters: NotificationFilters): any {
  const where: any = {};

  if (filters.userId) where.userId = filters.userId;
  if (filters.type) where.type = filters.type;
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
 * Crée une nouvelle notification
 */
export async function createNotification({
  userId,
  message,
  type = 'GENERAL',
  status = 'SENT'
}: {
  userId: string;
  message: string;
  type?: NotificationType;
  status?: NotificationStatus;
}) {
  return prisma.notification.create({
    data: {
      userId,
      message,
      type,
      status
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

/**
 * Met à jour le statut d'une notification
 */
export async function updateNotificationStatus({
  notificationId,
  status
}: {
  notificationId: string;
  status: NotificationStatus;
}) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { status },
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

/**
 * Marque toutes les notifications d'un utilisateur comme lues
 */
export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      status: 'SENT'
    },
    data: {
      status: 'READ'
    }
  });
}

/**
 * Supprime une notification
 */
export async function deleteNotification(notificationId: string) {
  return prisma.notification.delete({
    where: { id: notificationId }
  });
}

/**
 * Envoie une notification à plusieurs utilisateurs
 */
export async function sendBulkNotifications({
  userIds,
  message,
  type = 'GENERAL'
}: {
  userIds: string[];
  message: string;
  type?: NotificationType;
}) {
  return prisma.notification.createMany({
    data: userIds.map(userId => ({
      userId,
      message,
      type,
      status: 'SENT'
    }))
  });
}

/**
 * Récupère le nombre de notifications non lues pour un utilisateur
 */
export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      status: 'SENT'
    }
  });
} 
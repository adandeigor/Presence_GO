import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-utils';
import {
  buildNotificationWhereClause,
  createNotification,
  markAllNotificationsAsRead,
  getUnreadNotificationsCount
} from '@/lib/functions/notification/notificationHelpers';
import { prisma } from '@/lib/prisma/init';
import { NotificationType, NotificationStatus } from '@prisma/client';

/**
 * Récupère la liste des notifications
 */
export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      userId: (request as any).user.id,
      type: searchParams.get('type') as NotificationType | undefined,
      status: searchParams.get('status') as NotificationStatus | undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
    };

    // Construire les conditions de recherche
    const where = buildNotificationWhereClause(filters);

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
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
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.notification.count({ where }),
      getUnreadNotificationsCount((request as any).user.id)
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
      pagination: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    );
  }
}

/**
 * Marque toutes les notifications comme lues
 */
export async function POST(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'markAllAsRead') {
      await markAllNotificationsAsRead((request as any).user.id);
      return NextResponse.json({ message: 'Toutes les notifications ont été marquées comme lues' });
    }

    return NextResponse.json(
      { error: 'Action non supportée' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Erreur lors du traitement des notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement des notifications' },
      { status: 500 }
    );
  }
} 
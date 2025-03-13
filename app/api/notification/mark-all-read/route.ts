import { handleServerError } from '@/lib/api';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma/init';
import { NotificationStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Validation de la clé API
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    // Vérification des rôles
    const roleCheckResult = await withRoleCheck(request, ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT']);
    if (roleCheckResult instanceof NextResponse) {
      return roleCheckResult;
    }
    const { user } = roleCheckResult;

    // Mise à jour de toutes les notifications non lues de l'utilisateur
    const result = await prisma.notification.updateMany({
      where: {
        userId: user.id,
        status: NotificationStatus.UNREAD
      },
      data: {
        status: NotificationStatus.READ
      }
    });

    return NextResponse.json({
      message: `${result.count} notifications marquées comme lues`,
      updatedCount: result.count
    });
  } catch (error) {
    console.error('[NOTIFICATION_MARK_ALL_READ_ERROR]', error);
    return handleServerError(error);
  }
} 
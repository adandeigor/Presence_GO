import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-utils';
import { updateNotificationStatus, deleteNotification } from '@/lib/functions/notification/notificationHelpers';
import { prisma } from '@/lib/prisma/init';

/**
 * Met à jour le statut d'une notification
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: params.id }
    });

    if (!notification || notification.userId !== (request as any).user.id) {
      return NextResponse.json(
        { error: 'Notification non trouvée ou non autorisée' },
        { status: 404 }
      );
    }

    const { status } = await request.json();
    if (!status) {
      return NextResponse.json(
        { error: 'Statut manquant' },
        { status: 400 }
      );
    }

    const updatedNotification = await updateNotificationStatus({
      notificationId: params.id,
      status
    });

    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la notification' },
      { status: 500 }
    );
  }
}

/**
 * Supprime une notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: params.id }
    });

    if (!notification || notification.userId !== (request as any).user.id) {
      return NextResponse.json(
        { error: 'Notification non trouvée ou non autorisée' },
        { status: 404 }
      );
    }

    await deleteNotification(params.id);

    return NextResponse.json({ message: 'Notification supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la notification' },
      { status: 500 }
    );
  }
} 
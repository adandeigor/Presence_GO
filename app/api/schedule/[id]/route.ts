import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import { updateSchedule, deleteSchedule } from '@/lib/functions/schedule/scheduleHelpers';
import { prisma } from '@/lib/prisma/init';

/**
 * Met à jour un créneau horaire
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validation de la clé API
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    // Vérification des rôles
    const roleCheck = await withRoleCheck(request, ['TEACHER', 'ADMIN']);
    if (roleCheck) return roleCheck;

    const { startTime, endTime, dayOfWeek, room } = await request.json();

    const updatedSchedule = await updateSchedule({
      scheduleId: params.id,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      dayOfWeek,
      room
    });

    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du créneau horaire:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du créneau horaire' },
      { status: 500 }
    );
  }
}

/**
 * Supprime un créneau horaire
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validation de la clé API
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    // Vérification des rôles
    const roleCheck = await withRoleCheck(request, ['TEACHER', 'ADMIN']);
    if (roleCheck) return roleCheck;

    // Vérifier si l'utilisateur peut supprimer ce créneau
    const schedule = await prisma.schedule.findUnique({
      where: { id: params.id },
      include: {
        course: true
      }
    });

    if (!schedule) {
      return NextResponse.json(
        { error: 'Créneau horaire non trouvé' },
        { status: 404 }
      );
    }

    // Seuls l'enseignant du cours et les administrateurs peuvent supprimer le créneau
    if (
      (request as any).user.role !== 'ADMIN' &&
      ((request as any).user.role !== 'TEACHER' || schedule.course.teacherId !== (request as any).user.id)
    ) {
      return NextResponse.json(
        { error: 'Non autorisé à supprimer ce créneau horaire' },
        { status: 403 }
      );
    }

    await deleteSchedule(params.id);

    return NextResponse.json({ message: 'Créneau horaire supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du créneau horaire:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du créneau horaire' },
      { status: 500 }
    );
  }
} 
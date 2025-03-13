import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-utils';
import { canManagePermission, updatePermissionStatus } from '@/lib/functions/permission/permissionHelpers';
import { prisma } from '@/lib/prisma/init';

/**
 * Met à jour le statut d'une permission
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const { status } = await request.json();
    if (!status) {
      return NextResponse.json(
        { error: 'Statut manquant' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur peut gérer cette permission
    const canManage = await canManagePermission(
      (request as any).user.id,
      (request as any).user.role,
      params.id
    );

    if (!canManage) {
      return NextResponse.json(
        { error: 'Non autorisé à gérer cette permission' },
        { status: 403 }
      );
    }

    const permission = await updatePermissionStatus({
      permissionId: params.id,
      status,
      approvedById: (request as any).user.id
    });

    return NextResponse.json(permission);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la permission:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la permission' },
      { status: 500 }
    );
  }
}

/**
 * Supprime une permission
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    // Vérifier si l'utilisateur peut gérer cette permission
    const canManage = await canManagePermission(
      (request as any).user.id,
      (request as any).user.role,
      params.id
    );

    if (!canManage) {
      return NextResponse.json(
        { error: 'Non autorisé à supprimer cette permission' },
        { status: 403 }
      );
    }

    await prisma.permission.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Permission supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la permission:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la permission' },
      { status: 500 }
    );
  }
} 
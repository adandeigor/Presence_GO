import { handleServerError } from '@/lib/api';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma/init';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    // Vérification des rôles
    const roleCheck = await withRoleCheck(request, ['ADMIN']);
    if (roleCheck) return roleCheck;

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json(
        { error: "Le champ schoolId est requis" },
        { status: 400 }
      );
    }

    // Vérifier si l'administrateur d'école existe
    const existingAdmin = await prisma.school_Admin.findUnique({
      where: { schoolId }
    });

    if (!existingAdmin) {
      return NextResponse.json(
        { error: "Aucun administrateur trouvé pour cette école" },
        { status: 404 }
      );
    }

    // Supprimer l'administrateur d'école
    await prisma.school_Admin.delete({
      where: { schoolId }
    });

    return NextResponse.json({ message: "Administrateur supprimé avec succès" });
  } catch (error) {
    console.error('[SCHOOL_ADMIN_DELETE_ERROR]', error);
    return handleServerError(error);
  }
} 
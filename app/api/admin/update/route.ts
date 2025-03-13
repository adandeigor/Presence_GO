import { handleServerError } from '@/lib/api';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma/init';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    // Vérification des rôles
    const roleCheck = await withRoleCheck(request, ['ADMIN']);
    if (roleCheck) return roleCheck;

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const body = await request.json();
    const { adminId } = body;

    if (!schoolId || !adminId) {
      return NextResponse.json(
        { error: "Les champs schoolId et adminId sont requis" },
        { status: 400 }
      );
    }

    // Vérifier si l'école existe
    const school = await prisma.school.findUnique({
      where: { id: schoolId }
    });

    if (!school) {
      return NextResponse.json(
        { error: "L'école n'existe pas" },
        { status: 404 }
      );
    }

    // Vérifier si l'utilisateur existe et a le rôle ADMIN
    const user = await prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "L'utilisateur n'existe pas ou n'a pas le rôle ADMIN" },
        { status: 404 }
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

    // Mettre à jour l'administrateur d'école
    const updatedAdmin = await prisma.school_Admin.update({
      where: { schoolId },
      data: { admin_id: adminId },
      include: {
        school: true,
        admin: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(updatedAdmin);
  } catch (error) {
    console.error('[SCHOOL_ADMIN_UPDATE_ERROR]', error);
    return handleServerError(error);
  }
} 
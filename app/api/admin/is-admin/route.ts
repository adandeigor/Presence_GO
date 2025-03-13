import { handleServerError } from '@/lib/api';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma/init';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    // Vérification des rôles
    const roleCheck = await withRoleCheck(request, ['ADMIN']);
    if (roleCheck) return roleCheck;

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const userId = searchParams.get('userId');

    if (!schoolId || !userId) {
      return NextResponse.json(
        { error: "Les champs schoolId et userId sont requis" },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur est administrateur de l'école
    const schoolAdmin = await prisma.school_Admin.findFirst({
      where: {
        AND: [
          { schoolId },
          { admin_id: userId }
        ]
      },
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

    return NextResponse.json({
      isAdmin: !!schoolAdmin,
      data: schoolAdmin
    });
  } catch (error) {
    console.error('[IS_SCHOOL_ADMIN_ERROR]', error);
    return handleServerError(error);
  }
} 
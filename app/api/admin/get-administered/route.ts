import { handleServerError } from '@/lib/api';
import { validateApiKey, getPaginationParams, createPaginatedResponse, getBaseUrl } from '@/lib/api-utils';
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
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: "Le champ userId est requis" },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe et a le rôle ADMIN
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "L'utilisateur n'existe pas ou n'a pas le rôle ADMIN" },
        { status: 404 }
      );
    }

    // Récupération des paramètres de pagination
    const paginationParams = getPaginationParams(searchParams);
    const baseUrl = getBaseUrl(request);

    // Récupérer toutes les écoles administrées par l'utilisateur
    const [schools, total] = await Promise.all([
      prisma.school.findMany({
        where: {
          school_admins: {
            admin_id: userId
          }
        },
        include: {
          school_admins: {
            include: {
              admin: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        skip: (paginationParams.page - 1) * paginationParams.limit,
        take: paginationParams.limit,
        orderBy: { [paginationParams.orderBy]: paginationParams.order }
      }),
      prisma.school.count({
        where: {
          school_admins: {
            admin_id: userId
          }
        }
      })
    ]);

    return NextResponse.json(
      createPaginatedResponse(schools, total, paginationParams, baseUrl)
    );
  } catch (error) {
    console.error('[GET_ADMINISTERED_SCHOOLS_ERROR]', error);
    return handleServerError(error);
  }
} 
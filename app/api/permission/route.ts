import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-utils';
import { 
  canCreatePermissionForStudent, 
  createPermission, 
  updatePermissionStatus,
  buildPermissionWhereClause
} from '@/lib/functions/permission/permissionHelpers';
import { prisma } from '@/lib/prisma/init';
import { PermissionStatus } from '@prisma/client';

/**
 * Crée une nouvelle demande de permission
 */
export async function POST(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const { studentId, courseId, reason } = await request.json();

    if (!studentId || !courseId || !reason) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    const canCreate = await canCreatePermissionForStudent(
      (request as any).user.id,
      (request as any).user.role,
      studentId
    );

    if (!canCreate) {
      return NextResponse.json(
        { error: 'Non autorisé à créer une permission pour cet étudiant' },
        { status: 403 }
      );
    }

    const permission = await createPermission({
      studentId,
      courseId,
      reason,
      requestedById: (request as any).user.id
    });

    return NextResponse.json(permission);
  } catch (error) {
    console.error('Erreur lors de la création de la permission:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la permission' },
      { status: 500 }
    );
  }
}

/**
 * Récupère la liste des permissions
 */
export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      studentId: searchParams.get('studentId') || undefined,
      courseId: searchParams.get('courseId') || undefined,
      status: searchParams.get('status') as PermissionStatus | undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
    };

    const where = buildPermissionWhereClause(filters);

    if ((request as any).user.role === 'STUDENT') {
      where.studentId = (request as any).user.id;
    } else if ((request as any).user.role === 'PARENT') {
      where.student = {
        childOf: {
          some: {
            parentId: (request as any).user.id
          }
        }
      };
    } else if ((request as any).user.role === 'TEACHER') {
      where.course = {
        teacherId: (request as any).user.id
      };
    }

    const [permissions, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          course: {
            select: {
              id: true,
              name: true,
              class: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          approvedBy: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.permission.count({ where })
    ]);

    return NextResponse.json({
      permissions,
      pagination: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des permissions' },
      { status: 500 }
    );
  }
}
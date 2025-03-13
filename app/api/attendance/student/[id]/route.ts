import { handleServerError } from '@/lib/api';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma/init';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validation de la clé API
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    // Vérification des rôles
    const roleCheck = await withRoleCheck(request, ['TEACHER', 'ADMIN', 'PARENT', 'STUDENT']);
    if (roleCheck) return roleCheck;

    const studentId = params.id;
    const user = (request as any).user;

    // Vérifications des permissions
    if (user.role === 'STUDENT' && user.id !== studentId) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à voir l'historique de cet étudiant" },
        { status: 403 }
      );
    }

    if (user.role === 'PARENT') {
      // Vérifier si l'étudiant est l'enfant du parent
      const isParentOfStudent = await prisma.parentChild.findFirst({
        where: {
          parentId: user.id,
          childId: studentId
        }
      });

      if (!isParentOfStudent) {
        return NextResponse.json(
          { error: "Vous n'êtes pas autorisé à voir l'historique de cet étudiant" },
          { status: 403 }
        );
      }
    }

    // Récupération des paramètres de requête
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const courseId = searchParams.get('courseId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Construction de la requête
    const where: any = {
      studentId
    };

    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (courseId) {
      where.courseId = courseId;
    }

    // Récupération des présences avec pagination
    const [attendances, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          timestamp: 'desc'
        },
        include: {
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
          validatedBy: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      }),
      prisma.attendance.count({ where })
    ]);

    // Calcul des statistiques
    const stats = {
      total: attendances.length,
      present: attendances.filter(a => a.status === 'PRESENT').length,
      absent: attendances.filter(a => a.status === 'ABSENT').length,
      excuse: attendances.filter(a => a.status === 'EXCUSE').length
    };

    return NextResponse.json({
      data: attendances,
      stats,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[STUDENT_ATTENDANCE_ERROR]', error);
    return handleServerError(error);
  }
} 
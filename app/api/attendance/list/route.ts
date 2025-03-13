import { handleServerError } from '@/lib/api';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import { buildAttendanceWhereClause, calculateAttendanceStats } from '@/lib/functions/attendance/attendanceHelpers';
import { prisma } from '@/lib/prisma/init';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Validation de la clé API
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    // Vérification des rôles
    const roleCheck = await withRoleCheck(request, ['TEACHER', 'ADMIN', 'PARENT']);
    if (roleCheck) return roleCheck;

    // Récupération des paramètres de requête
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      courseId: searchParams.get('courseId') || undefined,
      classId: searchParams.get('classId') || undefined,
      studentId: searchParams.get('studentId') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    };

    const skip = (filters.page - 1) * filters.limit;

    // Si l'utilisateur est un parent, il ne peut voir que les présences de ses enfants
    const user = (request as any).user;
    if (user.role === 'PARENT') {
      const children = await prisma.parentChild.findMany({
        where: { parentId: user.id },
        select: { childId: true }
      });
      filters.studentId = children.map(child => child.childId)[0]; // On prend le premier enfant par défaut
    }

    // Construction de la requête avec les filtres
    const where = buildAttendanceWhereClause(filters);

    // Récupération des présences avec pagination
    const [attendances, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: {
          timestamp: 'desc'
        },
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
    const stats = calculateAttendanceStats(attendances);

    return NextResponse.json({
      data: attendances,
      stats,
      pagination: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit)
      }
    });
  } catch (error) {
    console.error('[ATTENDANCE_LIST_ERROR]', error);
    return handleServerError(error);
  }
} 
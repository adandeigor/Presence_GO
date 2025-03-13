import { handleServerError } from '@/lib/api';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma/init';
import { AttendanceStatus } from '@prisma/client';
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

    // Récupération des paramètres
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('courseId');
    const classId = searchParams.get('classId');
    const studentId = searchParams.get('studentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Construction de la requête de base
    const where: any = {};

    if (courseId) where.courseId = courseId;
    if (studentId) where.studentId = studentId;
    if (classId) {
      where.course = {
        classId: classId
      };
    }
    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Si l'utilisateur est un parent, il ne peut voir que les statistiques de ses enfants
    const user = (request as any).user;
    if (user.role === 'PARENT') {
      const children = await prisma.parentChild.findMany({
        where: { parentId: user.id },
        select: { childId: true }
      });
      where.studentId = {
        in: children.map(child => child.childId)
      };
    }

    // Calcul des statistiques
    const [total, present, absent, excuse] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.count({ 
        where: { 
          ...where,
          status: AttendanceStatus.PRESENT 
        } 
      }),
      prisma.attendance.count({ 
        where: { 
          ...where,
          status: AttendanceStatus.ABSENT 
        } 
      }),
      prisma.attendance.count({ 
        where: { 
          ...where,
          status: AttendanceStatus.EXCUSE 
        } 
      })
    ]);

    // Calcul des pourcentages
    interface StatsType {
      total: number;
      present: { count: number; percentage: number };
      absent: { count: number; percentage: number };
      excuse: { count: number; percentage: number };
      recentHistory?: any[];
    }

    const stats: StatsType = {
      total,
      present: {
        count: present,
        percentage: total > 0 ? (present / total) * 100 : 0
      },
      absent: {
        count: absent,
        percentage: total > 0 ? (absent / total) * 100 : 0
      },
      excuse: {
        count: excuse,
        percentage: total > 0 ? (excuse / total) * 100 : 0
      }
    };

    // Si on a un studentId, on ajoute des statistiques détaillées
    if (studentId) {
      const attendanceHistory = await prisma.attendance.findMany({
        where: {
          ...where,
          timestamp: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)) // 30 derniers jours
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        include: {
          course: {
            select: {
              name: true
            }
          }
        }
      });

      stats['recentHistory'] = attendanceHistory;
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[ATTENDANCE_STATS_ERROR]', error);
    return handleServerError(error);
  }
} 
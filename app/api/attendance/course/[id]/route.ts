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
    const roleCheck = await withRoleCheck(request, ['TEACHER', 'ADMIN']);
    if (roleCheck) return roleCheck;

    const courseId = params.id;
    const user = (request as any).user;

    // Vérification que le cours existe
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        class: true
      }
    });

    if (!course) {
      return NextResponse.json(
        { error: "Le cours spécifié n'existe pas" },
        { status: 404 }
      );
    }

    // Si l'utilisateur est un enseignant, vérifier qu'il enseigne ce cours
    if (user.role === 'TEACHER' && course.teacherId !== user.id) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à voir les présences de ce cours" },
        { status: 403 }
      );
    }

    // Récupération des paramètres de requête
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Construction de la requête
    const where: any = {
      courseId
    };

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      where.timestamp = {
        gte: startDate,
        lt: endDate
      };
    }

    if (status) {
      where.status = status;
    }

    // Récupération des présences avec pagination
    const [attendances, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { timestamp: 'desc' },
          { student: { name: 'asc' } }
        ],
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true
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

    // Récupération de la liste complète des étudiants de la classe
    const classStudents = await prisma.user.findMany({
      where: {
        classId: course.classId,
        role: 'STUDENT'
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Pour chaque étudiant, vérifier s'il est présent dans la liste des présences
    const studentsAttendance = classStudents.map(student => {
      const attendance = attendances.find(a => a.studentId === student.id);
      return {
        student,
        attendance: attendance || null
      };
    });

    // Calcul des statistiques
    const stats = {
      totalStudents: classStudents.length,
      present: attendances.filter(a => a.status === 'PRESENT').length,
      absent: attendances.filter(a => a.status === 'ABSENT').length,
      excuse: attendances.filter(a => a.status === 'EXCUSE').length,
      unmarked: classStudents.length - attendances.length
    };

    return NextResponse.json({
      course: {
        id: course.id,
        name: course.name,
        class: course.class
      },
      data: studentsAttendance,
      stats,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[COURSE_ATTENDANCE_ERROR]', error);
    return handleServerError(error);
  }
} 
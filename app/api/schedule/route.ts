import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import {
  buildScheduleWhereClause,
  createSchedule,
  getStudentSchedule,
  getTeacherSchedule
} from '@/lib/functions/schedule/scheduleHelpers';
import { prisma } from '@/lib/prisma/init';
import { DayOfWeek } from '@prisma/client';

/**
 * Récupère l'emploi du temps
 */
export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      courseId: searchParams.get('courseId') || undefined,
      classId: searchParams.get('classId') || undefined,
      teacherId: searchParams.get('teacherId') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      dayOfWeek: searchParams.get('dayOfWeek') ? searchParams.get('dayOfWeek') as DayOfWeek : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
    };

    let schedules;
    let total;

    // Récupérer l'emploi du temps en fonction du rôle
    if ((request as any).user.role === 'STUDENT') {
      schedules = await getStudentSchedule(
        (request as any).user.id,
        filters.startDate,
        filters.endDate
      );
      total = schedules.length;
    } else if ((request as any).user.role === 'TEACHER') {
      schedules = await getTeacherSchedule(
        (request as any).user.id,
        filters.startDate,
        filters.endDate
      );
      total = schedules.length;
    } else {
      const where = buildScheduleWhereClause(filters);
      [schedules, total] = await Promise.all([
        prisma.schedule.findMany({
          where,
          include: {
            course: {
              include: {
                teacher: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                },
                class: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit,
          orderBy: [
            { dayOfWeek: 'asc' },
            { startDate: 'asc' }
          ]
        }),
        prisma.schedule.count({ where })
      ]);
    }

    return NextResponse.json({
      schedules,
      pagination: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des emplois du temps:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des emplois du temps' },
      { status: 500 }
    );
  }
}

/**
 * Crée un nouveau créneau horaire
 */
export async function POST(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const roleCheck = await withRoleCheck(request, ['TEACHER', 'ADMIN']);
    if (roleCheck) return roleCheck;

    const { courseId, startTime, endTime, dayOfWeek, room } = await request.json();

    if (!courseId || !startTime || !endTime || dayOfWeek === undefined || !room) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    // Si c'est un enseignant, vérifier qu'il est bien l'enseignant du cours
    if ((request as any).user.role === 'TEACHER') {
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      });

      if (!course || course.teacherId !== (request as any).user.id) {
        return NextResponse.json(
          { error: 'Non autorisé à créer des créneaux pour ce cours' },
          { status: 403 }
        );
      }
    }

    const schedule = await createSchedule({
      courseId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      dayOfWeek,
      room
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Erreur lors de la création du créneau horaire:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du créneau horaire' },
      { status: 500 }
    );
  }
} 
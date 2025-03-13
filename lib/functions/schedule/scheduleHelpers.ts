import { prisma } from '@/lib/prisma/init';
import { DayOfWeek, Prisma } from '@prisma/client';

export interface ScheduleFilters {
  courseId?: string;
  classId?: string;
  teacherId?: string;
  startDate?: Date;
  endDate?: Date;
  dayOfWeek?: DayOfWeek;
  page?: number;
  limit?: number;
}

/**
 * Construit les conditions de recherche pour les emplois du temps
 */
export function buildScheduleWhereClause(filters: ScheduleFilters): Prisma.ScheduleWhereInput {
  const where: Prisma.ScheduleWhereInput = {};

  if (filters.courseId) where.courseId = filters.courseId;
  if (filters.classId) where.course = { classId: filters.classId };
  if (filters.teacherId) where.course = { teacherId: filters.teacherId };
  if (filters.dayOfWeek !== undefined) where.dayOfWeek = filters.dayOfWeek;

  if (filters.startDate && filters.endDate) {
    where.startDate = {
      gte: filters.startDate
    };
    where.endDate = {
      lte: filters.endDate
    };
  }

  return where;
}

/**
 * Vérifie si un créneau horaire est disponible
 */
export async function isTimeSlotAvailable({
  courseId,
  startTime,
  endTime,
  dayOfWeek,
  excludeScheduleId
}: {
  courseId: string;
  startTime: Date;
  endTime: Date;
  dayOfWeek: DayOfWeek;
  excludeScheduleId?: string;
}): Promise<boolean> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      teacher: true,
      class: true
    }
  });

  if (!course) return false;

  // Vérifier les conflits pour l'enseignant
  const teacherConflicts = await prisma.schedule.count({
    where: {
      id: { not: excludeScheduleId },
      course: {
        teacherId: course.teacherId
      },
      dayOfWeek,
      OR: [
        {
          AND: [
            { startDate: { lte: startTime } },
            { endDate: { gt: startTime } }
          ]
        },
        {
          AND: [
            { startDate: { lt: endTime } },
            { endDate: { gte: endTime } }
          ]
        }
      ]
    }
  });

  if (teacherConflicts > 0) return false;

  // Vérifier les conflits pour la classe
  const classConflicts = await prisma.schedule.count({
    where: {
      id: { not: excludeScheduleId },
      course: {
        classId: course.classId
      },
      dayOfWeek,
      OR: [
        {
          AND: [
            { startDate: { lte: startTime } },
            { endDate: { gt: startTime } }
          ]
        },
        {
          AND: [
            { startDate: { lt: endTime } },
            { endDate: { gte: endTime } }
          ]
        }
      ]
    }
  });

  return classConflicts === 0;
}

/**
 * Crée un nouveau créneau horaire
 */
export async function createSchedule({
  courseId,
  startTime,
  endTime,
  dayOfWeek,
  room
}: {
  courseId: string;
  startTime: Date;
  endTime: Date;
  dayOfWeek: DayOfWeek;
  room: string;
}) {
  // Vérifier si le créneau est disponible
  const isAvailable = await isTimeSlotAvailable({
    courseId,
    startTime,
    endTime,
    dayOfWeek
  });

  if (!isAvailable) {
    throw new Error('Le créneau horaire n\'est pas disponible');
  }

  const data: Prisma.ScheduleCreateInput = {
    course: { connect: { id: courseId } },
    startDate: startTime,
    endDate: endTime,
    dayOfWeek,
    room
  };

  return prisma.schedule.create({
    data,
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
    }
  });
}

/**
 * Met à jour un créneau horaire
 */
export async function updateSchedule({
  scheduleId,
  startTime,
  endTime,
  dayOfWeek,
  room
}: {
  scheduleId: string;
  startTime?: Date;
  endTime?: Date;
  dayOfWeek?: DayOfWeek;
  room?: string;
}) {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: { course: true }
  });

  if (!schedule) {
    throw new Error('Créneau horaire non trouvé');
  }

  if (startTime || endTime || dayOfWeek !== undefined) {
    const isAvailable = await isTimeSlotAvailable({
      courseId: schedule.courseId,
      startTime: startTime || schedule.startDate,
      endTime: endTime || schedule.endDate,
      dayOfWeek: dayOfWeek || schedule.dayOfWeek,
      excludeScheduleId: scheduleId
    });

    if (!isAvailable) {
      throw new Error('Le nouveau créneau horaire n\'est pas disponible');
    }
  }

  const data: Prisma.ScheduleUpdateInput = {
    startDate: startTime ? startTime : undefined,
    endDate: endTime ? endTime : undefined,
    dayOfWeek: dayOfWeek ? dayOfWeek : undefined,
    room: room ? room : undefined
  };

  return prisma.schedule.update({
    where: { id: scheduleId },
    data,
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
    }
  });
}

/**
 * Supprime un créneau horaire
 */
export async function deleteSchedule(scheduleId: string) {
  return prisma.schedule.delete({
    where: { id: scheduleId }
  });
}

/**
 * Récupère l'emploi du temps d'un étudiant
 */
export async function getStudentSchedule(studentId: string, startDate?: Date, endDate?: Date) {
  const orderBy: Prisma.ScheduleOrderByWithRelationInput[] = [
    { dayOfWeek: 'asc' as Prisma.SortOrder },
    { startDate: 'asc' as Prisma.SortOrder }
  ];

  return prisma.schedule.findMany({
    where: {
      course: {
        class: {
          users: {
            some: {
              id: studentId
            }
          }
        }
      },
      ...(startDate && endDate ? {
        startDate: { gte: startDate },
        endDate: { lte: endDate }
      } : {})
    },
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
    orderBy
  });
}

/**
 * Récupère l'emploi du temps d'un enseignant
 */
export async function getTeacherSchedule(teacherId: string, startDate?: Date, endDate?: Date) {
  const orderBy: Prisma.ScheduleOrderByWithRelationInput[] = [
    { dayOfWeek: 'asc' as Prisma.SortOrder },
    { startDate: 'asc' as Prisma.SortOrder }
  ];

  return prisma.schedule.findMany({
    where: {
      course: {
        teacherId
      },
      ...(startDate && endDate ? {
        startDate: { gte: startDate },
        endDate: { lte: endDate }
      } : {})
    },
    include: {
      course: {
        include: {
          class: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy
  });
} 
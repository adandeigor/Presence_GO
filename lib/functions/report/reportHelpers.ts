import { prisma } from '@/lib/prisma/init';
import { AttendanceStatus } from '@prisma/client';

export interface AttendanceReportFilters {
  studentId?: string;
  courseId?: string;
  classId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Génère un rapport de présence pour un étudiant
 */
export async function generateStudentAttendanceReport({
  studentId,
  startDate,
  endDate
}: {
  studentId: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const attendances = await prisma.attendance.findMany({
    where: {
      studentId,
      ...(startDate && endDate ? {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      } : {})
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
      }
    },
    orderBy: {
      timestamp: 'desc'
    }
  });

  const totalSessions = attendances.length;
  const present = attendances.filter(a => a.status === AttendanceStatus.PRESENT).length;
  const absent = attendances.filter(a => a.status === AttendanceStatus.ABSENT).length;
  const late = attendances.filter(a => a.status === AttendanceStatus.ABSENT).length;
  const excused = attendances.filter(a => a.status === AttendanceStatus.EXCUSE).length;

  return {
    student: await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true
      }
    }),
    period: {
      startDate,
      endDate
    },
    statistics: {
      totalSessions,
      present,
      absent,
      late,
      excused,
      presenceRate: totalSessions > 0 ? (present + late) / totalSessions * 100 : 0
    },
    attendances
  };
}

/**
 * Génère un rapport de présence pour un cours
 */
export async function generateCourseAttendanceReport({
  courseId,
  startDate,
  endDate
}: {
  courseId: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      class: {
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      },
      teacher: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!course) {
    throw new Error('Cours non trouvé');
  }

  const attendances = await prisma.attendance.findMany({
    where: {
      courseId,
      ...(startDate && endDate ? {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      } : {})
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      timestamp: 'desc'
    }
  });

  const studentStats = course.class.users.map(student => {
    const studentAttendances = attendances.filter(a => a.studentId === student.id);
    const totalSessions = studentAttendances.length;
    const present = studentAttendances.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const absent = studentAttendances.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const late = studentAttendances.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const excused = studentAttendances.filter(a => a.status === AttendanceStatus.EXCUSE).length;

    return {
      student,
      statistics: {
        totalSessions,
        present,
        absent,
        late,
        excused,
        presenceRate: totalSessions > 0 ? (present + late) / totalSessions * 100 : 0
      }
    };
  });

  return {
    course: {
      id: course.id,
      name: course.name,
      class: course.class,
      teacher: course.teacher
    },
    period: {
      startDate,
      endDate
    },
    statistics: {
      totalStudents: course.class.users.length,
      averagePresenceRate: studentStats.reduce((acc, curr) => acc + curr.statistics.presenceRate, 0) / course.class.users.length
    },
    studentStats,
    attendances
  };
}

/**
 * Génère un rapport de présence pour une classe
 */
export async function generateClassAttendanceReport({
  classId,
  startDate,
  endDate
}: {
  classId: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const class_ = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      courses: {
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!class_) {
    throw new Error('Classe non trouvée');
  }

  const attendances = await prisma.attendance.findMany({
    where: {
      course: {
        classId
      },
      ...(startDate && endDate ? {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      } : {})
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
          teacher: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    },
    orderBy: {
      timestamp: 'desc'
    }
  });

  const studentStats = class_.users.map(student => {
    const studentAttendances = attendances.filter(a => a.studentId === student.id);
    const totalSessions = studentAttendances.length;
    const present = studentAttendances.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const absent = studentAttendances.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const late = studentAttendances.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const excused = studentAttendances.filter(a => a.status === AttendanceStatus.EXCUSE).length;

    return {
      student,
      statistics: {
        totalSessions,
        present,
        absent,
        late,
        excused,
        presenceRate: totalSessions > 0 ? (present + late) / totalSessions * 100 : 0
      }
    };
  });

  const courseStats = class_.courses.map(course => {
    const courseAttendances = attendances.filter(a => a.courseId === course.id);
    const totalSessions = courseAttendances.length / class_.users.length;
    const present = courseAttendances.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const absent = courseAttendances.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const late = courseAttendances.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const excused = courseAttendances.filter(a => a.status === AttendanceStatus.EXCUSE).length;

    return {
      course,
      statistics: {
        totalSessions,
        present,
        absent,
        late,
        excused,
        presenceRate: totalSessions > 0 ? (present + late) / (totalSessions * class_.users.length) * 100 : 0
      }
    };
  });

  return {
    class: {
      id: class_.id,
      name: class_.name,
      totalStudents: class_.users.length,
      totalCourses: class_.courses.length
    },
    period: {
      startDate,
      endDate
    },
    statistics: {
      averagePresenceRate: studentStats.reduce((acc, curr) => acc + curr.statistics.presenceRate, 0) / class_.users.length
    },
    studentStats,
    courseStats,
    attendances
  };
} 
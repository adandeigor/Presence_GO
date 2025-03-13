import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { validateApiKey } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma/init'
import { handleServerError } from '@/lib/api'
import { z } from 'zod'

const scheduleSchema = z.object({
  dayOfWeek: z.enum(['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE']),
  startTime: z.string(),
  endTime: z.string()
})

const courseSchema = z.object({
  name: z.string(),
  classId: z.string(),
  teacherId: z.string(),
  program: z.string().optional(),
  schedules: z.array(scheduleSchema)
})

const MAX_TEACHERS = {
  PRIMAIRE: 1,
  SECONDAIRE: 10,
  UNIVERSITAIRE: 25
}

export async function POST(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    const user = await getCurrentUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = courseSchema.parse(body)

    // Vérifier si la classe existe et récupérer son niveau
    const classData = await prisma.class.findUnique({
      where: { id: validatedData.classId }
    })

    if (!classData) {
      return NextResponse.json({ error: 'Classe non trouvée' }, { status: 404 })
    }

    // Récupérer tous les cours de la classe avec leurs horaires
    const existingCourses = await prisma.course.findMany({
      where: { classId: validatedData.classId },
      include: {
        teacher: true,
        schedules: true
      }
    })

    // Vérifier si le professeur existe et est bien un professeur
    const teacher = await prisma.user.findUnique({
      where: { id: validatedData.teacherId }
    })

    if (!teacher || teacher.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Professeur invalide' }, { status: 400 })
    }

    // Vérifier le nombre de professeurs selon le niveau
    const uniqueTeachers = new Set(existingCourses.map(course => course.teacherId))
    uniqueTeachers.add(validatedData.teacherId)

    if (uniqueTeachers.size > MAX_TEACHERS[classData.level]) {
      return NextResponse.json({
        error: `Le nombre maximum de professeurs pour le niveau ${classData.level} est de ${MAX_TEACHERS[classData.level]}`
      }, { status: 400 })
    }

    // Vérifier les conflits d'horaire pour chaque créneau
    for (const newSchedule of validatedData.schedules) {
      const conflictingSchedule = existingCourses.some(course =>
        course.schedules.some(schedule =>
          schedule.dayOfWeek === newSchedule.dayOfWeek &&
          ((newSchedule.startTime >= schedule.startTime && newSchedule.startTime <= schedule.endTime) ||
           (newSchedule.endTime >= schedule.startTime && newSchedule.endTime <= schedule.endTime))
        )
      )

      if (conflictingSchedule) {
        return NextResponse.json({
          error: `Conflit d'horaire le ${newSchedule.dayOfWeek} de ${newSchedule.startTime} à ${newSchedule.endTime}`
        }, { status: 400 })
      }
    }

    // Créer le cours avec ses créneaux horaires
    const newCourse = await prisma.course.create({
      data: {
        name: validatedData.name,
        classId: validatedData.classId,
        teacherId: validatedData.teacherId,
        program: validatedData.program,
        schedules: {
          create: validatedData.schedules
        }
      },
      include: {
        teacher: true,
        class: true,
        schedules: true
      }
    })

    return NextResponse.json(newCourse, { status: 201 })
  } catch (error) {
    console.error('[COURSE_CREATE_ERROR]', error)
    return handleServerError(error)
  }
} 
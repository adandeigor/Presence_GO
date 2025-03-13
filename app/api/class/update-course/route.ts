import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { validateApiKey } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma/init'
import { handleServerError } from '@/lib/api'
import { z } from 'zod'

const scheduleSchema = z.object({
  id: z.string().optional(),
  dayOfWeek: z.enum(['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE']),
  startTime: z.string(),
  endTime: z.string()
})

const courseUpdateSchema = z.object({
  name: z.string().optional(),
  teacherId: z.string().optional(),
  program: z.string().optional(),
  schedules: z.array(scheduleSchema).optional()
})

const MAX_TEACHERS = {
  PRIMAIRE: 1,
  SECONDAIRE: 10,
  UNIVERSITAIRE: 25
}

export async function PATCH(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    const user = await getCurrentUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('id')

    if (!courseId) {
      return NextResponse.json({ error: 'ID du cours manquant' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = courseUpdateSchema.parse(body)

    // Récupérer le cours actuel avec sa classe et les autres cours
    const currentCourse = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        class: {
          include: {
            courses: {
              include: {
                teacher: true,
                schedules: true
              }
            }
          }
        },
        schedules: true
      }
    })

    if (!currentCourse) {
      return NextResponse.json({ error: 'Cours non trouvé' }, { status: 404 })
    }

    // Si on change de professeur, vérifier les limites
    if (validatedData.teacherId && validatedData.teacherId !== currentCourse.teacherId) {
      // Vérifier si le nouveau professeur existe et est bien un professeur
      const teacher = await prisma.user.findUnique({
        where: { id: validatedData.teacherId }
      })

      if (!teacher || teacher.role !== 'TEACHER') {
        return NextResponse.json({ error: 'Professeur invalide' }, { status: 400 })
      }

      // Calculer le nombre unique de professeurs après le changement
      const otherCourses = currentCourse.class.courses.filter(c => c.id !== courseId)
      const uniqueTeachers = new Set(otherCourses.map(course => course.teacherId))
      uniqueTeachers.add(validatedData.teacherId)

      if (uniqueTeachers.size > MAX_TEACHERS[currentCourse.class.level]) {
        return NextResponse.json({
          error: `Le nombre maximum de professeurs pour le niveau ${currentCourse.class.level} est de ${MAX_TEACHERS[currentCourse.class.level]}`
        }, { status: 400 })
      }
    }

    // Vérifier les conflits d'horaire si les horaires sont modifiés
    if (validatedData.schedules) {
      const otherSchedules = currentCourse.class.courses
        .filter(c => c.id !== courseId)
        .flatMap(c => c.schedules)

      for (const newSchedule of validatedData.schedules) {
        const conflictingSchedule = otherSchedules.some(schedule =>
          schedule.dayOfWeek === newSchedule.dayOfWeek &&
          ((newSchedule.startTime >= schedule.startTime && newSchedule.startTime <= schedule.endTime) ||
           (newSchedule.endTime >= schedule.startTime && newSchedule.endTime <= schedule.endTime))
        )

        if (conflictingSchedule) {
          return NextResponse.json({
            error: `Conflit d'horaire le ${newSchedule.dayOfWeek} de ${newSchedule.startTime} à ${newSchedule.endTime}`
          }, { status: 400 })
        }
      }

      // Supprimer les anciens horaires et créer les nouveaux
      await prisma.schedule.deleteMany({
        where: { courseId }
      })
    }

    // Mettre à jour le cours
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...validatedData,
        schedules: validatedData.schedules ? {
          create: validatedData.schedules
        } : undefined
      },
      include: {
        teacher: true,
        class: true,
        schedules: true
      }
    })

    return NextResponse.json(updatedCourse)
  } catch (error) {
    console.error('[COURSE_UPDATE_ERROR]', error)
    return handleServerError(error)
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { validateApiKey } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma/init'
import { handleServerError } from '@/lib/api'
import { z } from 'zod'

const scheduleSchema = z.object({
  courseId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  dayOfWeek: z.enum(['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE']),
  room: z.string(),
  isRecurrent: z.boolean().default(true),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Validation API Key
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    // Authentification
    const user = await getCurrentUser(request)
    if (!user || !['ADMIN', 'TEACHER'].includes(user.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Validation des données
    const body = await request.json()
    const validatedData = scheduleSchema.parse(body)

    // Vérifier si le cours existe
    const course = await prisma.course.findUnique({
      where: { id: validatedData.courseId }
    })

    if (!course) {
      return NextResponse.json({ error: 'Cours non trouvé' }, { status: 404 })
    }

    // Création de l'emploi du temps
    const newSchedule = await prisma.schedule.create({
      data: validatedData,
      include: {
        course: true
      }
    })

    return NextResponse.json(newSchedule, { status: 201 })
  } catch (error) {
    console.error('[SCHEDULE_CREATE_ERROR]', error)
    return handleServerError(error)
  }
} 
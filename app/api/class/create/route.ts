import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { validateApiKey } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma/init'
import { handleServerError } from '@/lib/api'
import { z } from 'zod'

const classSchema = z.object({
  name: z.string(),
  level: z.enum(['PRIMAIRE', 'SECONDAIRE', 'UNIVERSITAIRE']),
  schoolId: z.string(),
  teacherId: z.string().optional(),
})

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
    const validatedData = classSchema.parse(body)

    // Vérifier si l'école existe
    const school = await prisma.school.findUnique({
      where: { id: validatedData.schoolId }
    })

    if (!school) {
      return NextResponse.json({ error: 'École non trouvée' }, { status: 404 })
    }

    // Vérifier si le professeur existe et est bien un professeur
    if (validatedData.teacherId) {
      const teacher = await prisma.user.findUnique({
        where: { id: validatedData.teacherId }
      })

      if (!teacher || teacher.role !== 'TEACHER') {
        return NextResponse.json({ error: 'Professeur invalide' }, { status: 400 })
      }
    }

    // Créer la classe
    const newClass = await prisma.class.create({
      data: validatedData,
      include: {
        teacher: true,
        school: true
      }
    })

    return NextResponse.json(newClass, { status: 201 })
  } catch (error) {
    console.error('[CLASS_CREATE_ERROR]', error)
    return handleServerError(error)
  }
} 
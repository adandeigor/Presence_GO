import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { validateApiKey } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma/init'
import { handleServerError } from '@/lib/api'
import { z } from 'zod'

const addStudentSchema = z.object({
  userId: z.string(),
  classId: z.string()
})

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
    const validatedData = addStudentSchema.parse(body)

    // Vérifier si l'étudiant existe
    const student = await prisma.user.findUnique({
      where: { id: validatedData.userId }
    })

    if (!student) {
      return NextResponse.json({ error: 'Étudiant non trouvé' }, { status: 404 })
    }

    if (student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'L\'utilisateur n\'est pas un étudiant' }, { status: 400 })
    }

    // Vérifier si la classe existe
    const classExists = await prisma.class.findUnique({
      where: { id: validatedData.classId }
    })

    if (!classExists) {
      return NextResponse.json({ error: 'Classe non trouvée' }, { status: 404 })
    }

    // Mettre à jour l'étudiant avec la nouvelle classe
    const updatedStudent = await prisma.user.update({
      where: { id: validatedData.userId },
      data: { 
        classId: validatedData.classId,
        schoolId: classExists.schoolId // Mettre à jour aussi l'école
      },
      include: {
        class: true,
        school: true
      }
    })

    return NextResponse.json(updatedStudent, { status: 200 })
  } catch (error) {
    console.error('[CLASS_ADD_STUDENT_ERROR]', error)
    return handleServerError(error)
  }
} 
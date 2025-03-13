import { handleServerError } from '@/lib/api'
import { validateApiKey, withRoleCheck } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma/init'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    // Vérification du rôle
    const roleCheck = await withRoleCheck(request, ['ADMIN', 'TEACHER'])
    if (roleCheck) return roleCheck

    const body = await request.json()
    const { id, name, teacherId, program } = body

    if (!id) {
      return NextResponse.json(
        { error: "L'ID du cours est requis" },
        { status: 400 }
      )
    }

    // Vérification de l'existence du cours
    const courseExists = await prisma.course.findUnique({
      where: { id }
    })

    if (!courseExists) {
      return NextResponse.json(
        { error: "Le cours spécifié n'existe pas" },
        { status: 404 }
      )
    }

    // Vérification de l'existence de l'enseignant si spécifié
    if (teacherId) {
      const teacherExists = await prisma.user.findUnique({
        where: { 
          id: teacherId,
          role: 'TEACHER'
        }
      })

      if (!teacherExists) {
        return NextResponse.json(
          { error: "L'enseignant spécifié n'existe pas ou n'a pas le rôle d'enseignant" },
          { status: 404 }
        )
      }
    }

    // Mise à jour du cours
    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(teacherId && { teacherId }),
        ...(program && { program })
      },
      include: {
        class: true,
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(updatedCourse)
  } catch (error) {
    console.error('[COURSE_UPDATE_ERROR]', error)
    return handleServerError(error)
  }
} 
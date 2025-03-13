import { handleServerError } from '@/lib/api'
import { validateApiKey, withRoleCheck } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma/init'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    // Vérification du rôle
    const roleCheck = await withRoleCheck(request, ['ADMIN', 'TEACHER'])
    if (roleCheck) return roleCheck

    const body = await request.json()
    const { name, classId, teacherId, program } = body

    // Validation des données
    if (!name || !classId) {
      return NextResponse.json(
        { error: "Le nom du cours et l'ID de la classe sont requis" },
        { status: 400 }
      )
    }

    // Vérification de l'existence de la classe
    const classExists = await prisma.class.findUnique({
      where: { id: classId }
    })

    if (!classExists) {
      return NextResponse.json(
        { error: "La classe spécifiée n'existe pas" },
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

    // Création du cours
    const course = await prisma.course.create({
      data: {
        name,
        classId,
        teacherId,
        program
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

    return NextResponse.json(course)
  } catch (error) {
    console.error('[COURSE_CREATE_ERROR]', error)
    return handleServerError(error)
  }
} 
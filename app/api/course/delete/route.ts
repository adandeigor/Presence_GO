import { handleServerError } from '@/lib/api'
import { validateApiKey, withRoleCheck } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma/init'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    // Vérification du rôle
    const roleCheck = await withRoleCheck(request, ['ADMIN'])
    if (roleCheck) return roleCheck

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json(
        { error: "L'ID du cours est requis" },
        { status: 400 }
      )
    }

    // Vérification de l'existence du cours
    const courseExists = await prisma.course.findUnique({
      where: { id: courseId }
    })

    if (!courseExists) {
      return NextResponse.json(
        { error: "Le cours spécifié n'existe pas" },
        { status: 404 }
      )
    }

    // Suppression du cours (les relations seront automatiquement supprimées grâce aux contraintes onDelete)
    await prisma.course.delete({
      where: { id: courseId }
    })

    return NextResponse.json({
      message: "Le cours a été supprimé avec succès"
    })
  } catch (error) {
    console.error('[COURSE_DELETE_ERROR]', error)
    return handleServerError(error)
  }
} 
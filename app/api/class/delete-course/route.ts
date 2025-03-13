import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { validateApiKey } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma/init'
import { handleServerError } from '@/lib/api'

export async function DELETE(request: NextRequest) {
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

    const deletedCourse = await prisma.course.delete({
      where: { id: courseId },
      include: {
        teacher: true,
        class: true
      }
    })

    return NextResponse.json(deletedCourse)
  } catch (error) {
    console.error('[COURSE_DELETE_ERROR]', error)
    return handleServerError(error)
  }
} 
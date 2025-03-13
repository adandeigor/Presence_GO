import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma/init'
import { handleServerError } from '@/lib/api'

export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    if (!classId) {
      return NextResponse.json({ error: 'ID de classe manquant' }, { status: 400 })
    }

    const courses = await prisma.course.findMany({
      where: { classId },
      include: {
        teacher: true,
        class: true,
        schedules: {
          orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' }
          ]
        }
      }
    })

    return NextResponse.json(courses)
  } catch (error) {
    console.error('[CLASS_COURSES_ERROR]', error)
    return handleServerError(error)
  }
} 
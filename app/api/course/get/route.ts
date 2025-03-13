import { handleServerError } from '@/lib/api'
import { validateApiKey, withRoleCheck } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma/init'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    // Vérification du rôle
    const roleCheck = await withRoleCheck(request, ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'])
    if (roleCheck) return roleCheck

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json(
        { error: "L'ID du cours est requis" },
        { status: 400 }
      )
    }

    // Récupération du cours avec ses relations
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        class: true,
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        schedules: true,
        permissions: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            approvedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        attendances: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            validatedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!course) {
      return NextResponse.json(
        { error: "Le cours spécifié n'existe pas" },
        { status: 404 }
      )
    }

    return NextResponse.json(course)
  } catch (error) {
    console.error('[COURSE_GET_ERROR]', error)
    return handleServerError(error)
  }
} 
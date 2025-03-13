import { handleServerError } from '@/lib/api'
import { validateApiKey, withRoleCheck, getPaginationParams, createPaginatedResponse, getBaseUrl } from '@/lib/api-utils'
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
    const classId = searchParams.get('classId')
    const teacherId = searchParams.get('teacherId')
    const search = searchParams.get('search')
    const userId = searchParams.get('userId') // Pour filtrer les cours des enfants d'un parent

    // Récupération des paramètres de pagination
    const paginationParams = getPaginationParams(searchParams)
    const baseUrl = getBaseUrl(request)

    // Construction de la requête
    const where = {
      ...(classId && { classId }),
      ...(teacherId && { teacherId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { program: { contains: search, mode: 'insensitive' as const } }
        ]
      }),
      ...(userId && {
        class: {
          users: {
            some: {
              OR: [
                { id: userId },
                {
                  id: {
                    in: (await prisma.user.findMany({
                      where: {
                        school: {
                          users: {
                            some: {
                              id: userId,
                              role: 'PARENT'
                            }
                          }
                        }
                      },
                      select: { id: true }
                    })).map(u => u.id)
                  }
                }
              ]
            }
          }
        }
      })
    }

    // Récupération des cours avec pagination
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          class: true,
          teacher: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          schedules: true
        },
        skip: (paginationParams.page - 1) * paginationParams.limit,
        take: paginationParams.limit,
        orderBy: { [paginationParams.orderBy]: paginationParams.order }
      }),
      prisma.course.count({ where })
    ])

    return NextResponse.json(
      createPaginatedResponse(courses, total, paginationParams, baseUrl)
    )
  } catch (error) {
    console.error('[COURSE_LIST_ERROR]', error)
    return handleServerError(error)
  }
} 
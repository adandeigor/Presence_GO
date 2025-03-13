import { handleServerError } from '@/lib/api'
import { validateApiKey, validateSchoolId, getPaginationParams, createPaginatedResponse, getBaseUrl } from '@/lib/api-utils'
import { withSchoolAccess } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma/init'
import { NextRequest, NextResponse } from 'next/server'
import { Level } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const schoolId = validateSchoolId(searchParams.get('schoolId'))

    // Vérification de l'accès à l'école
    const accessCheck = await withSchoolAccess(request, schoolId, ['ADMIN', 'TEACHER'])
    if (accessCheck) return accessCheck

    // Récupération des paramètres de pagination et de filtrage
    const paginationParams = getPaginationParams(searchParams)
    const baseUrl = getBaseUrl(request)
    const level = searchParams.get('level') as Level | null
    const search = searchParams.get('search')

    // Construction de la requête
    const where = {
      schoolId,
      ...(level && { level }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    }

    // Récupération des classes avec pagination
    const [classes, total] = await Promise.all([
      prisma.class.findMany({
        where,
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          courses: {
            select: {
              id: true,
              name: true
            }
          }
        },
        skip: (paginationParams.page - 1) * paginationParams.limit,
        take: paginationParams.limit,
        orderBy: { [paginationParams.orderBy]: paginationParams.order }
      }),
      prisma.class.count({ where })
    ])

    return NextResponse.json(
      createPaginatedResponse(classes, total, paginationParams, baseUrl)
    )
  } catch (error) {
    console.error('[SCHOOL_CLASSES_ERROR]', error)
    return handleServerError(error)
  }
}
import { handleServerError } from '@/lib/api'
import { validateApiKey, validateSchoolId, getPaginationParams, createPaginatedResponse, getBaseUrl } from '@/lib/api-utils'
import { withSchoolAccess } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma/init'
import { NextRequest, NextResponse } from 'next/server'

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
    const classId = searchParams.get('classId')
    const search = searchParams.get('search')

    // Construction de la requête
    const where = {
      schoolId,
      role: 'STUDENT' as const,
      ...(classId && { classId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    }

    // Récupération des étudiants avec pagination
    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          class: true
        },
        skip: (paginationParams.page - 1) * paginationParams.limit,
        take: paginationParams.limit,
        orderBy: { [paginationParams.orderBy]: paginationParams.order }
      }),
      prisma.user.count({ where })
    ])

    return NextResponse.json(
      createPaginatedResponse(students, total, paginationParams, baseUrl)
    )
  } catch (error) {
    console.error('[SCHOOL_STUDENTS_ERROR]', error)
    return handleServerError(error)
  }
}
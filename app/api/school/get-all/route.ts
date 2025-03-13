import { handleServerError } from '@/lib/api'
import { validateApiKey, getPaginationParams, createPaginatedResponse, getBaseUrl } from '@/lib/api-utils'
import { withRoleCheck } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma/init'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    const roleCheck = await withRoleCheck(request, ['ADMIN'])
    if (roleCheck) return roleCheck

    const { searchParams } = new URL(request.url)
    const paginationParams = getPaginationParams(searchParams)
    const baseUrl = getBaseUrl(request)

    const [schools, total] = await Promise.all([
      prisma.school.findMany({
        include: {
          school_admins: {
            include: { admin: true }
          }
        },
        skip: (paginationParams.page - 1) * paginationParams.limit,
        take: paginationParams.limit,
        orderBy: { [paginationParams.orderBy]: paginationParams.order }
      }),
      prisma.school.count()
    ])

    return NextResponse.json(
      createPaginatedResponse(schools, total, paginationParams, baseUrl)
    )
  } catch (error) {
    console.error('[SCHOOLS_GET_ALL_ERROR]', error)
    return handleServerError(error)
  }
}
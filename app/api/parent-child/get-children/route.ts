import { handleServerError } from '@/lib/api'
import { validateApiKey, withRoleCheck, getPaginationParams, createPaginatedResponse, getBaseUrl } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma/init'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    // Vérification du rôle PARENT
    const roleCheck = await withRoleCheck(request, ['PARENT'])
    if (roleCheck) return roleCheck

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')

    if (!parentId) {
      return NextResponse.json(
        { error: "L'identifiant du parent est requis" },
        { status: 400 }
      )
    }

    // Récupération des paramètres de pagination
    const paginationParams = getPaginationParams(searchParams)
    const baseUrl = getBaseUrl(request)

    // Récupération des enfants avec pagination
    const [children, total] = await Promise.all([
      prisma.parentChild.findMany({
        where: { parentId },
        include: {
          child: {
            select: {
              id: true,
              name: true,
              email: true,
              studentId: true,
              class: {
                include: {
                  courses: true
                }
              },
              school: true
            }
          }
        },
        skip: (paginationParams.page - 1) * paginationParams.limit,
        take: paginationParams.limit,
        orderBy: { createdAt: paginationParams.order }
      }),
      prisma.parentChild.count({ where: { parentId } })
    ])

    return NextResponse.json(
      createPaginatedResponse(
        children.map(pc => pc.child),
        total,
        paginationParams,
        baseUrl
      )
    )
  } catch (error) {
    console.error('[PARENT_CHILD_GET_CHILDREN_ERROR]', error)
    return handleServerError(error)
  }
} 
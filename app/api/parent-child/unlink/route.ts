import { handleServerError } from '@/lib/api'
import { validateApiKey, withRoleCheck } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma/init'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    // Vérification du rôle PARENT ou ADMIN
    const roleCheck = await withRoleCheck(request, ['PARENT', 'ADMIN'])
    if (roleCheck) return roleCheck

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')
    const childId = searchParams.get('childId')

    if (!parentId || !childId) {
      return NextResponse.json(
        { error: "Les identifiants du parent et de l'enfant sont requis" },
        { status: 400 }
      )
    }

    // Vérification si la relation existe
    const existingRelation = await prisma.parentChild.findUnique({
      where: {
        parentId_childId: {
          parentId,
          childId
        }
      }
    })

    if (!existingRelation) {
      return NextResponse.json(
        { error: "Cette relation parent-enfant n'existe pas" },
        { status: 404 }
      )
    }

    // Suppression de la relation
    await prisma.parentChild.delete({
      where: {
        parentId_childId: {
          parentId,
          childId
        }
      }
    })

    return NextResponse.json({
      message: "La relation parent-enfant a été supprimée avec succès"
    })
  } catch (error) {
    console.error('[PARENT_CHILD_UNLINK_ERROR]', error)
    return handleServerError(error)
  }
} 
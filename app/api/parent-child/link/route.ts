import { handleServerError } from '@/lib/api'
import { validateApiKey, withRoleCheck } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma/init'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    // Vérification du rôle PARENT
    const roleCheck = await withRoleCheck(request, ['PARENT'])
    if (roleCheck) return roleCheck

    const body = await request.json()
    const { studentId, parentId } = body

    if (!studentId || !parentId) {
      return NextResponse.json(
        { error: "L'identifiant de l'étudiant et l'identifiant du parent sont requis" },
        { status: 400 }
      )
    }

    // Recherche de l'étudiant par son studentId
    const student = await prisma.user.findFirst({
      where: {
        studentId,
        role: 'STUDENT'
      }
    })

    if (!student) {
      return NextResponse.json(
        { error: "Aucun étudiant trouvé avec cet identifiant" },
        { status: 404 }
      )
    }

    // Vérification si la relation existe déjà
    const existingRelation = await prisma.parentChild.findUnique({
      where: {
        parentId_childId: {
          parentId,
          childId: student.id
        }
      }
    })

    if (existingRelation) {
      return NextResponse.json(
        { error: "Cette relation parent-enfant existe déjà" },
        { status: 400 }
      )
    }

    // Création de la relation parent-enfant
    const parentChild = await prisma.parentChild.create({
      data: {
        parentId,
        childId: student.id
      },
      include: {
        child: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            class: true,
            school: true
          }
        }
      }
    })

    return NextResponse.json(parentChild)
  } catch (error) {
    console.error('[PARENT_CHILD_LINK_ERROR]', error)
    return handleServerError(error)
  }
} 
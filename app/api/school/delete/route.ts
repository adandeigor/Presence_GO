import { NextRequest, NextResponse } from 'next/server'
import { handleServerError } from '@/lib/api'
import { validateApiKey, validateSchoolId } from '@/lib/api-utils'
import { withSchoolAccess } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma/init'

export async function DELETE(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const schoolId = validateSchoolId(searchParams.get('id'))

    // Vérification de l'accès à l'école
    const accessCheck = await withSchoolAccess(request, schoolId, ['ADMIN'])
    if (accessCheck) return accessCheck

    try {
      // Vérification si l'école existe
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        include: {
          _count: {
            select: {
              users: true,
              classes: true
            }
          }
        }
      })

      if (!school) {
        return NextResponse.json(
          { error: 'École non trouvée' },
          { status: 404 }
        )
      }

      // Suppression en cascade via Prisma
      const deletedSchool = await prisma.school.delete({
        where: { id: schoolId },
        include: {
          school_admins: true,
          classes: true,
          users: {
            select: {
              id: true,
              email: true,
              role: true
            }
          }
        }
      })

      return NextResponse.json({
        message: 'École supprimée avec succès',
        data: {
          id: deletedSchool.id,
          name: deletedSchool.name,
          deletedData: {
            classes: deletedSchool.classes.length,
            users: deletedSchool.users.length,
            admins: deletedSchool.school_admins ? 1 : 0
          }
        }
      })
    } catch (dbError: any) {
      if (dbError.code === 'P2025') {
        return NextResponse.json(
          { error: 'École non trouvée' },
          { status: 404 }
        )
      }
      throw dbError
    }
  } catch (error) {
    console.error('[SCHOOL_DELETE_ERROR]', error)
    return handleServerError(error)
  }
}
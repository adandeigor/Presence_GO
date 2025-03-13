import { handleServerError } from '@/lib/api'
import { validateApiKey, validateSchoolId } from '@/lib/api-utils'
import { withSchoolAccess } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma/init'
import { NextRequest, NextResponse } from 'next/server'


export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const schoolId = validateSchoolId(searchParams.get('id'))

    // Vérification de l'accès à l'école
    const accessCheck = await withSchoolAccess(request, schoolId, ['ADMIN', 'TEACHER'])
    if (accessCheck) return accessCheck

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        school_admins: {
          include: { admin: true }
        },
        classes: {
          include: {
            teacher: true,
            users: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            class: true
          }
        }
      }
    })

    if (!school) return NextResponse.json({ error: 'École non trouvée' }, { status: 404 })

    return NextResponse.json(school)
  } catch (error) {
    console.error('[SCHOOL_GET_ERROR]', error)
    return handleServerError(error)
  }
}
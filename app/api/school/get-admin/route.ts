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
    const schoolId = validateSchoolId(searchParams.get('schoolId'))

    // Vérification de l'accès à l'école
    const accessCheck = await withSchoolAccess(request, schoolId, ['ADMIN', 'TEACHER'])
    if (accessCheck) return accessCheck

    const admin = await prisma.school_Admin.findUnique({
      where: { schoolId },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            role: true
          }
        }
      }
    })

    if (!admin) {
      return NextResponse.json(
        { error: 'Administrateur non trouvé pour cette école' },
        { status: 404 }
      )
    }

    return NextResponse.json(admin.admin)
  } catch (error) {
    console.error('[SCHOOL_ADMIN_ERROR]', error)
    return handleServerError(error)
  }
}
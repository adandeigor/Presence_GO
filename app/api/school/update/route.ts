import { handleServerError } from '@/lib/api'
import { validateApiKey, validateSchoolId } from '@/lib/api-utils'
import { withSchoolAccess } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma/init'
import { schoolSchema } from '@/lib/zod/Schema'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const schoolId = validateSchoolId(searchParams.get('id'))

    // Vérification de l'accès à l'école
    const accessCheck = await withSchoolAccess(request, schoolId, ['ADMIN'])
    if (accessCheck) return accessCheck

    // Validation des données
    const body = await request.json()
    
    try {
      const validatedData = schoolSchema.partial().parse(body)

      // Vérification si l'email ou le numéro de téléphone existe déjà
      if (validatedData.email || validatedData.phone_number) {
        const existingSchool = await prisma.school.findFirst({
          where: {
            id: { not: schoolId },
            OR: [
              validatedData.email ? { email: validatedData.email } : {},
              validatedData.phone_number ? { phone_number: validatedData.phone_number } : {}
            ]
          }
        })

        if (existingSchool) {
          return NextResponse.json(
            { error: 'Une école avec cet email ou ce numéro de téléphone existe déjà' },
            { status: 409 }
          )
        }
      }

      // Mise à jour de l'école
      const updatedSchool = await prisma.school.update({
        where: { id: schoolId },
        data: validatedData,
        include: {
          school_admins: {
            include: { admin: true }
          },
          classes: true
        }
      })

      return NextResponse.json(updatedSchool)
    } catch (validationError: any) {
      return NextResponse.json(
        { error: 'Données invalides', details: validationError.errors },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[SCHOOL_UPDATE_ERROR]', error)
    return handleServerError(error)
  }
}
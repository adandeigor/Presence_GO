import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { validateApiKey } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma/init'
import { handleServerError } from '@/lib/api'
import { createSchoolSchema } from '@/lib/zod/Schema'

export async function POST(request: NextRequest) {
  try {
    // Validation API Key
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 })
    }

    // Authentification
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Validation des données
    const body = await request.json()
    const validatedData = createSchoolSchema.parse(body)

    // Création de l'école
    const newSchool = await prisma.school.create({
      data: validatedData
    })

    return NextResponse.json(newSchool, { status: 201 })
  } catch (error) {
    console.error('[SCHOOL_CREATE_ERROR]', error)
    return handleServerError(error)
  }
}
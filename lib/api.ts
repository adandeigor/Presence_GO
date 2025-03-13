import { NextResponse } from 'next/server'
import { z } from 'zod'

export function handleServerError(error: unknown) {
  console.error(error)

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Erreur de validation', details: error.errors },
      { status: 422 }
    )
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { error: 'Une erreur inconnue est survenue' },
    { status: 500 }
  )
}
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import {
  createValidationMethod,
  getValidationMethods,
  buildValidationMethodWhereClause
} from '@/lib/functions/validation/validationHelpers';
import { ValidationMethodType } from '@prisma/client';

/**
 * Récupère la liste des méthodes de validation
 */
export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      type: searchParams.get('type') as ValidationMethodType | undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
    };

    const whereClause = buildValidationMethodWhereClause(filters);
    const validationMethods = await getValidationMethods(whereClause, filters.page, filters.limit);

    return NextResponse.json(validationMethods);
  } catch (error) {
    console.error('Erreur lors de la récupération des méthodes de validation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des méthodes de validation' },
      { status: 500 }
    );
  }
}

/**
 * Crée une nouvelle méthode de validation
 */
export async function POST(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const roleCheck = await withRoleCheck(request, ['ADMIN']);
    if (roleCheck) return roleCheck;

    const { name, type, config, description } = await request.json();

    if (!name || !type || !config) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    const validationMethod = await createValidationMethod({
      name,
      type: type as ValidationMethodType,
      config,
      description
    });

    return NextResponse.json(validationMethod);
  } catch (error) {
    console.error('Erreur lors de la création de la méthode de validation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la méthode de validation' },
      { status: 500 }
    );
  }
} 
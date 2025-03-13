import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import {
  updateValidationMethod,
  deleteValidationMethod,
  getValidationMethodById
} from '@/lib/functions/validation/validationHelpers';
import { ValidationMethodType } from '@prisma/client';

/**
 * Met à jour une méthode de validation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const roleCheck = await withRoleCheck(request, ['ADMIN']);
    if (roleCheck) return roleCheck;

    const validationMethod = await getValidationMethodById(params.id);
    if (!validationMethod) {
      return NextResponse.json(
        { error: 'Méthode de validation non trouvée' },
        { status: 404 }
      );
    }

    const { name, type, config, description, status } = await request.json();

    if (!name && !type && !config && !description && !status) {
      return NextResponse.json(
        { error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      );
    }

    const updatedValidationMethod = await updateValidationMethod(params.id, {
      name,
      type: type as ValidationMethodType,
      config,
      description,
      status
    });

    return NextResponse.json(updatedValidationMethod);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la méthode de validation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la méthode de validation' },
      { status: 500 }
    );
  }
}

/**
 * Supprime une méthode de validation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    const roleCheck = await withRoleCheck(request, ['ADMIN']);
    if (roleCheck) return roleCheck;

    const validationMethod = await getValidationMethodById(params.id);
    if (!validationMethod) {
      return NextResponse.json(
        { error: 'Méthode de validation non trouvée' },
        { status: 404 }
      );
    }

    await deleteValidationMethod(params.id);

    return NextResponse.json(
      { message: 'Méthode de validation supprimée avec succès' }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression de la méthode de validation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la méthode de validation' },
      { status: 500 }
    );
  }
} 
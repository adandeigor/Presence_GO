import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from './session';
import { Role } from '@prisma/client';

export async function withRoleCheck(
  request: NextRequest,
  allowedRoles: Role[]
) {
  const user = await getCurrentUser(request);
  
  if (!user || !allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Non autorisé' },
      { status: 403 }
    );
  }
  
  return { user };
}

export async function withSchoolAccess(
  request: NextRequest,
  schoolId: string,
  allowedRoles: Role[]
) {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 }
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Non autorisé' },
      { status: 403 }
    );
  }

  // Si l'utilisateur est ADMIN, il a accès à toutes les écoles
  if (user.role === 'ADMIN') {
    return null;
  }

  // Pour les autres rôles, vérifier si l'utilisateur appartient à l'école
  if (user.schoolId !== schoolId) {
    return NextResponse.json(
      { error: 'Non autorisé pour cette école' },
      { status: 403 }
    );
  }

  return null;
} 
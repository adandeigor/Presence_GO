import { handleServerError } from '@/lib/api';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma/init';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const deviceSchema = z.object({
  userId: z.string(),
  type: z.enum(['MOBILE', 'TABLET', 'DESKTOP']),
  name: z.string(),
  identifier: z.string()
});

export async function POST(request: NextRequest) {
  try {
    // Validation de la clé API
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    // Vérification des rôles
    const roleCheckResult = await withRoleCheck(request, ['ADMIN', 'TEACHER', 'STUDENT']);
    if (roleCheckResult instanceof NextResponse) {
      return roleCheckResult;
    }
    const { user } = roleCheckResult;

    const body = await request.json();

    // Validation du schéma
    const validatedData = deviceSchema.parse(body);

    // Vérifier si l'appareil existe déjà
    const existingDevice = await prisma.device.findFirst({
      where: {
        identifier: validatedData.identifier,
        userId: validatedData.userId
      }
    });

    if (existingDevice) {
      return NextResponse.json(
        { error: "Cet appareil est déjà enregistré pour cet utilisateur" },
        { status: 400 }
      );
    }

    // Création de l'appareil
    const device = await prisma.device.create({
      data: {
        userId: validatedData.userId,
        type: validatedData.type,
        name: validatedData.name,
        identifier: validatedData.identifier,
        isAuthorized: true // Par défaut, l'appareil est autorisé à la création
      }
    });

    return NextResponse.json(device, { status: 201 });
  } catch (error) {
    console.error('[DEVICE_CREATE_ERROR]', error);
    return handleServerError(error);
  }
} 
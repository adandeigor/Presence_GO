import { handleServerError } from '@/lib/api';
import { validateApiKey } from '@/lib/api-utils';
import { withRoleCheck } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma/init';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Fonction pour générer un QR code sécurisé
function generateSecureQRCode(courseId: string, timestamp: number) {
  const secret = process.env.QR_SECRET || 'default-secret-key';
  const data = `${courseId}-${timestamp}`;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
  
  return {
    code: `${data}-${hash}`,
    expiresAt: new Date(timestamp + 10 * 60 * 1000) // Expire dans 10 minutes
  };
}

export async function POST(request: NextRequest) {
  try {
    // Validation de la clé API
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
    }

    // Vérification des rôles (seuls les enseignants peuvent générer des QR codes)
    const roleCheck = await withRoleCheck(request, ['TEACHER']);
    if (roleCheck) return roleCheck;

    const body = await request.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json(
        { error: "L'ID du cours est requis" },
        { status: 400 }
      );
    }

    // Vérification que le cours existe et que l'enseignant est bien responsable du cours
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        teacherId: (request as any).user.id
      }
    });

    if (!course) {
      return NextResponse.json(
        { error: "Cours non trouvé ou vous n'êtes pas l'enseignant de ce cours" },
        { status: 404 }
      );
    }

    // Génération du QR code
    const timestamp = Date.now();
    const { code, expiresAt } = generateSecureQRCode(courseId, timestamp);

    return NextResponse.json({
      qrCode: code,
      courseId,
      expiresAt,
      timestamp
    });
  } catch (error) {
    console.error('[QR_GENERATE_ERROR]', error);
    return handleServerError(error);
  }
} 
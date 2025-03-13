import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma/init";
import bcrypt from "bcryptjs";
import { revokeAllSessions } from "@/lib/session";

// POST /api/auth/reset-password (Initiation)
export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Clé API invalide' }, { status: 401 });
  }

  try {
    const { email } = await request.json();
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: 'Aucun compte associé à cet email' },
        { status: 404 }
      );
    }

    const resetToken = crypto.randomUUID();
    const hashedToken = await bcrypt.hash(resetToken, 10);
    const expiresAt = new Date(Date.now() + 3600000); // 1 heure

    await prisma.tokenVerification.upsert({
      where: { email },
      update: { token: hashedToken, expires: expiresAt },
      create: { email, token: hashedToken, expires: expiresAt },
    });

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/reset-password/?token=${resetToken}&email=${email}`;

    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        subject: 'Réinitialisation de mot de passe',
        message: `Utilisez ce lien pour réinitialiser votre mot de passe : ${resetLink}`,
      }),
    });

    return NextResponse.json(
      { message: 'Email de réinitialisation envoyé' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur réinitialisation:', error);
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// GET /api/auth/reset-password (Vérification token)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (!token || !email) {
    return NextResponse.json(
      { error: 'Token et email requis' },
      { status: 400 }
    );
  }

  try {
    const verification = await prisma.tokenVerification.findUnique({
      where: { email },
    });

    if (!verification || !bcrypt.compareSync(token, verification.token)) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 401 }
      );
    }

    if (verification.expires < new Date()) {
      await prisma.tokenVerification.delete({ where: { email } });
      return NextResponse.json(
        { error: 'Token expiré' },
        { status: 401 }
      );
    }

    // Génération d'un token de session temporaire
    const tempSessionToken = crypto.randomUUID();
    await prisma.tokenVerification.update({
      where: { email },
      data: { token: await bcrypt.hash(tempSessionToken, 10) },
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?email=${email}&tempToken=${tempSessionToken}`,
      302);
  } catch (error) {
    console.error('Erreur vérification token:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// PATCH /api/auth/reset-password (Confirmation)
export async function PATCH(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Clé API invalide' }, { status: 401 });
  }

  try {
    const { email, newPassword, tempToken } = await request.json();

    // Validation finale du token temporaire
    const verification = await prisma.tokenVerification.findUnique({
      where: { email },
    });

    if (!verification || !bcrypt.compareSync(tempToken, verification.token)) {
      return NextResponse.json(
        { error: 'Autorisation invalide' },
        { status: 401 }
      );
    }

    // Mise à jour du mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // Révocation des sessions existantes
    await revokeAllSessions((await prisma.user.findUnique({ 
      where: { email },
      select: { id: true }
    }))!.id);

    // Nettoyage des tokens
    await prisma.tokenVerification.delete({ where: { email } });

    return NextResponse.json(
      { message: 'Mot de passe mis à jour avec succès' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur réinitialisation:', error);
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
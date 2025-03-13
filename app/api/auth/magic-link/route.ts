import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma/init";
import { createSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { generateToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Clé API invalide' }, { status: 401 });
  }

  try {
    const { email } = await request.json();

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Aucun compte trouvé avec cet email" },
        { status: 404 }
      );
    }
    
    // Génération et stockage du token magique
    const magicToken = randomUUID();
    const hashedToken = await bcrypt.hash(magicToken, 10);
    const expiresAt = new Date(Date.now() + 3600000); // 1 heure

    await prisma.tokenVerification.upsert({
      where: { email },
      update: { token: hashedToken, expires: expiresAt },
      create: { email, token: hashedToken, expires: expiresAt },
    });

    // Envoi du lien magique par email
    const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-magic-link?token=${magicToken}&email=${email}`;
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Voici votre lien de connexion sécurisé. Il expirera dans 1 heure : ${magicLink}`,
        subject: 'Connexion sécurisée à votre compte',
        email,
      }),
    });

    return NextResponse.json({ message: 'Lien magique envoyé' }, { status: 200 });
  } catch (error) {
    console.error('Erreur génération lien magique:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (!email || !token) {
    return NextResponse.json(
      { error: 'Paramètres manquants' }, 
      { status: 400 }
    );
  }

  try {
    // Vérification du token magique
    const verification = await prisma.tokenVerification.findUnique({ where: { email } });
    
    if (!verification) {
      return NextResponse.json(
        { error: 'Token non trouvé' },
        { status: 404 }
      );
    }

    if (verification.expires < new Date()) {
      await prisma.tokenVerification.delete({ where: { email } });
      return NextResponse.json(
        { error: 'Le lien a expiré. Veuillez demander un nouveau lien.' },
        { status: 401 }
      );
    }

    if (!bcrypt.compareSync(token, verification.token)) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }

    // Recherche de l'utilisateur
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: { id: true, email: true, role: true, name: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Création de la session
    const { token: sessionToken } = await createSession(user.id);

    // Génération du JWT
    const authToken = generateToken({
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role
    });

    // Nettoyage des tokens
    await prisma.tokenVerification.delete({ where: { email } });

    return NextResponse.json(
      { 
        token: authToken,
        sessionToken,
        user 
      },
      { 
        status: 200,
        headers: {
          "Set-Cookie": `session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Secure`
        }
      }
    );
  } catch (error) {
    console.error('Erreur vérification lien magique:', error);
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
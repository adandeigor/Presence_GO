import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/auth";
import { validateApiKey } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma/init";
import { createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: "Clé API invalide" },
      { status: 401 }
    );
  }

  try {
    const { email, password, name, role = "STUDENT" } = await request.json();

    // Validation des données
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email déjà utilisé" },
        { status: 409 }
      );
    }

    // Création de l'utilisateur
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });

    // Génération du token de vérification
    const verificationToken = crypto.randomUUID();
    await prisma.tokenVerification.create({
      data: {
        email,
        token: await bcrypt.hash(verificationToken, 10),
        expires: new Date(Date.now() + 3600000), // 1 heure
      },
    });

    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        subject: "Veuillez verifier votre email",
        message: `Merci de verifier votre email en cliquant sur ce lien: ${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${verificationToken}&email=${email}`,
      }),
    });
           
    const { token: sessionToken } = await createSession(user.id);

    return NextResponse.json(
      { 
        message: "Utilisateur créé - Vérification email requise",
        sessionToken,
        requiresVerification: true,
        id: user.id
      },
      {
        status: 201,
        headers: {
          "Set-Cookie": `session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Secure`
        }
      }
    );
  } catch (error) {
    console.error("Erreur inscription:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}


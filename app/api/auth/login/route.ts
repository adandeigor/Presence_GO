import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma/init";
import { validateApiKey } from "@/lib/api-utils";
import { generateToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: "Clé API invalide" },
      { status: 401 }
    );
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Email non vérifié. Veuillez vérifier votre email avant de vous connecter." },
        { status: 403 }
      );
    }

    const { token: sessionToken } = await createSession(user.id);

    // Génération du JWT avec les informations utilisateur
    const authToken = generateToken({
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role
    });

    return NextResponse.json(
      {
        token: authToken,
        sessionToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name
        }
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": `session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Secure`
        }
      }
    );
  } catch (error) {
    console.error("Erreur de connexion:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
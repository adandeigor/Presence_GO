import { generateToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma/init";
import { createSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");
  
    if (!email || !token) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }
  
    try {
      // Validation du token
      const verification = await prisma.tokenVerification.findUnique({ where: { email } });
      
      if (!verification || !bcrypt.compareSync(token, verification.token)) {
        return NextResponse.json({ error: "Token invalide" }, { status: 401 });
      }
  
      if (verification.expires < new Date()) {
        await prisma.tokenVerification.delete({ where: { email } });
        return NextResponse.json({ error: "Token expiré" }, { status: 401 });
      }
  
      // Activation du compte
      const user = await prisma.user.update({
        where: { email },
        data: { emailVerified: new Date() },
        select: { id: true, email: true, role: true, name: true }
      });
  
      // Révocation des sessions existantes
      await prisma.session.deleteMany({ where: { userId: user.id } });
      await prisma.tokenVerification.delete({ where: { email } });
      // Création d'une nouvelle session
      const { token: sessionToken } = await createSession(user.id);
  
      // Génération du JWT avec les informations utilisateur
      const authToken = generateToken({
        id: user.id,
        email: user.email,
        name: user.name || '',
        role: user.role
      });
  
      return NextResponse.json({
        success: true,
        token: authToken,
        sessionToken : sessionToken
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store'
        }
      });
  
    } catch (error) {
      console.error("Erreur vérification email:", error);
      return NextResponse.json(
        { error: "Erreur interne du serveur" },
        { status: 500 }
      );
    }
  }
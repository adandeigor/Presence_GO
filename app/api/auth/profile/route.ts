import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/init";
import { validateApiKey, authenticateRequest } from "@/lib/api-utils";
import { UserInfoType } from "@/lib/session/session-options";

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: "Clé API invalide" },
      { status: 401 }
    );
  }

  try {
    // Authentification via la session
    const auth = await authenticateRequest(request);
    if (!auth?.user) {
      return NextResponse.json(
        { 
          error: "Session invalide",
          details: "Veuillez vous reconnecter"
        },
        { status: 401 }
      );
    }

    // Récupération des données utilisateur avec vérification de la session
    const userData = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        phone_number: true,
        studentId: true,
        role: true,
        level: true,
        classId: true,
        schoolId: true,
        emailVerified: true,
        sessions: {
          where: {
            sessionToken: auth.session.token,
            expires: { gt: new Date() }
          },
          select: { expires: true }
        }
      }
    });

    // Vérification finale de la session active
    if (!userData?.sessions?.length) {
      return NextResponse.json(
        { error: "Session expirée" },
        { status: 401 }
      );
    }

    // Formatage des données de réponse
    const { sessions, ...userInfo } = userData;
    const responseData: UserInfoType = {
      ...userInfo,
      name: userInfo.name ?? 'Anonymous',
      image: userInfo.image ?? undefined,
      phone_number: userInfo.phone_number ?? undefined,
      studentId: userInfo.studentId ?? undefined,
      level: userInfo.level ?? undefined,
      classId: userInfo.classId ?? undefined,
      schoolId: userInfo.schoolId ?? undefined,
      emailVerified: userInfo.emailVerified ?? undefined,
      sessionExpires: sessions[0].expires
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error("Erreur récupération profil:", error);
    return NextResponse.json(
      { 
        error: "Erreur interne du serveur",
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
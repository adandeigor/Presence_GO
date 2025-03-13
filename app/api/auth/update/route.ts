import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, authenticateRequest } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma/init";
import { revokeAllSessions } from "@/lib/session";

export async function PATCH(request: NextRequest) {
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

    const updateData = await request.json();
    const validFields = [
      "name", "image", "phone_number", 
      "studentId", "level", "classId", "schoolId"
    ];

    // Validation des champs
    const invalidFields = Object.keys(updateData).filter(k => !validFields.includes(k));
    if (invalidFields.length > 0) {
      return NextResponse.json(
        { 
          error: "Champs invalides",
          invalidFields 
        },
        { status: 400 }
      );
    }

    // Mise à jour de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: auth.user.id },
      data: updateData,
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
        schoolId: true
      }
    });

    // Révocation des sessions si modification de données sensibles
    if (Object.keys(updateData).some(k => ["phone_number", "studentId"].includes(k))) {
      await revokeAllSessions(auth.user.id);
    }

    return NextResponse.json(updatedUser, { status: 200 });

  } catch (error) {
    console.error("Erreur mise à jour:", error);
    return NextResponse.json(
      { 
        error: "Erreur interne du serveur",
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
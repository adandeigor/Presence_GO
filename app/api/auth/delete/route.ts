import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/init";
import { validateApiKey, authenticateRequest } from "@/lib/api-utils";
import { deleteSession, revokeAllSessions } from "@/lib/session";

export async function DELETE(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: "Clé API invalide" },
      { status: 401 }
    );
  }

  const auth = await authenticateRequest(request);
  if (!auth?.user) {
    return NextResponse.json(
      { error: "Non authentifié" },
      { status: 401 }
    );
  }

  try {
    // Révocation de toutes les sessions avant suppression
    await revokeAllSessions(auth.user.id);

    // Suppression de l'utilisateur (cascade vers les sessions)
    await prisma.user.delete({ 
      where: { id: auth.user.id },
      include: { sessions: true } // Force la suppression en cascade
    });

    // Réponse avec invalidation du cookie côté client
    return NextResponse.json(
      { message: "Compte et sessions supprimés avec succès" },
      {
        status: 200,
        headers: {
          "Set-Cookie": `sessionToken=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
        }
      }
    );
  } catch (error) {
    console.error("Erreur suppression:", error);
    return NextResponse.json(
      { 
        error: "Erreur interne du serveur",
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
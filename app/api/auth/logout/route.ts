import { authenticateRequest } from "@/lib/middleware/auth-middleware";
import { deleteSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  
  if (!auth) {
    return NextResponse.json(
      { error: "Non autorisé" },
      { status: 401 }
    );
  }

  try {
    await deleteSession(auth.session.token);
    
    const response = NextResponse.json({ success: true });
    
    // Suppression du cookie de session
    response.cookies.set('session', '', {
      expires: new Date(0),
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'strict'
    });

    return response;
  } catch (error) {
    console.error("Erreur de déconnexion:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
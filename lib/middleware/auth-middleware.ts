import { NextRequest, NextResponse } from "next/server";
import { validateSession, verifyToken } from "@/lib/session";
import { prisma } from "../prisma/init";

export async function authenticateRequest(
  request: Request
): Promise<{ user: any; session: any } | null> { // Remplacer 'any' par vos types
  const token = request.headers.get("authorization")?.split(" ")[1];
  
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const session = await validateSession(payload.sessionToken);
  if (!session) return null;
  const user =  prisma.user.findUnique({ where: { id: session.userId } })

  return {
    user: user,
    session: {
      token: payload.sessionToken,
      expires: session.expires,
    },
  };
}
import { Session, User } from "@prisma/client";
import { randomUUID } from "crypto";
import { addHours } from "date-fns";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma/init";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET as string;
const SESSION_DURATION_HOURS = 24 // Durée de la session en heures

// Structure du payload JWT
interface SessionPayload {
  sessionToken: string;
  userId: string;
  role: string;
}

export async function createSession(userId: string): Promise<{
  session: Session;
  token: string;
}> {
  const sessionToken = randomUUID();
  const expires = addHours(new Date(), SESSION_DURATION_HOURS);

  const session = await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  const token = jwt.sign(
    { 
      sessionToken: session.sessionToken,
      userId: session.userId,
    } as SessionPayload, 
    JWT_SECRET, 
    { expiresIn: `${SESSION_DURATION_HOURS}h` }
  );

  return { session, token };
}

export async function deleteSession(sessionToken: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { sessionToken },
  });
}

export async function validateSession(
  sessionToken: string
): Promise<(Session & { user: User }) | null> {
  return prisma.session.findFirst({
    where: {
      sessionToken,
      expires: { gt: new Date() },
    },
    include: { user: true },
  });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}
export async function revokeAllSessions(userId: string) {
    await prisma.session.deleteMany({ 
      where: { userId } 
    });
  }

  export async function getCurrentUser(request: NextRequest): Promise<
  | (User & {
      role: string
      sessionToken: string
    })
  | null
> {
  try {
    // 1. Extraction du token depuis les headers
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.split(' ')[1] // Bearer <token>

    if (!token) return null

    // 2. Vérification du token JWT
    const payload = verifyToken(token)
    if (!payload?.sessionToken) return null

    // 3. Validation de la session en base
    const session = await validateSession(payload.sessionToken)
    if (!session?.user) null

    // 4. Vérification de l'expiration
    if (!session || new Date() > session.expires) {
      await deleteSession(payload.sessionToken)
      return null
    }

    // 5. Renvoi de l'utilisateur formaté
    return {
      ...session.user,
      role: session.user.role,
      sessionToken: payload.sessionToken
    }
  } catch (error) {
    console.error('[SESSION_ERROR]', error)
    return null
  }
}

// Fonction utilitaire pour les routes API
export async function requireAuth(request: NextRequest) {
  const user = await getCurrentUser(request)
  
  if (!user) {
    throw new Error('Authentification requise')
  }

  return user
}

// Fonction pour vérifier les rôles
export function checkRole(user: User | null, requiredRole: string) {
  return user?.role === requiredRole
}
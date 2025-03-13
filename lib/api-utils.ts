import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from "@/lib/auth";
import { UserInfoType } from "./session/session-options";
import { prisma } from "./prisma/init";
import { AuthResult } from "@/types/auth";
import { Role } from "@prisma/client";

export const validateApiKey = (request: NextRequest): boolean => {
  const apiKey = request.headers.get("x-api-key");
  return apiKey === process.env.NEXT_PUBLIC_API_KEY;
};

export const authenticateUser = async (request: NextRequest): Promise<UserInfoType | null> => {
  const token = request.headers.get("authorization")?.split(" ")[1];
  if (!token) return null;
  return verifyToken(token);
};

export const authenticateRequest = async (request: NextRequest): Promise<AuthResult | null> => {
  const token = getJwtFromHeader(request);
  if (!token) return null;

  try {
    const payload = verifyToken(token);
    if (!payload?.sessionToken) return null;

    const session = await prisma.session.findUnique({
      where: { sessionToken: payload.sessionToken },
      include: { user: true }
    });

    if (!session || session.expires < new Date()) return null;

    return {
      user: {
        id: session.user.id,
        name: session.user.name || '',
        email: session.user.email,
        image: session.user.image || "",
        role: (session.user.role || "") as Role,
      },
      session: {
        token: session.sessionToken,
        expires: session.expires
      }
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
};

function getJwtFromHeader(request: NextRequest): string | undefined {
  return request.headers.get("authorization")?.split(" ")[1];
}

export interface PaginationParams {
  page: number;
  limit: number;
  orderBy: string;
  order: 'asc' | 'desc';
}

export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  return {
    page: Math.max(1, parseInt(searchParams.get('page') || '1')),
    limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10'))),
    orderBy: searchParams.get('orderBy') || 'createdAt',
    order: (searchParams.get('order') || 'desc') as 'asc' | 'desc'
  };
}

export function validateSchoolId(schoolId: string | null): string {
  if (!schoolId || schoolId.trim() === '') {
    throw new Error('ID école manquant ou invalide');
  }
  return schoolId;
}

export interface PaginationLinks {
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  links: PaginationLinks;
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  { page, limit, orderBy, order }: PaginationParams,
  baseUrl: string
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  
  // Construction des liens de pagination
  const links: PaginationLinks = {
    first: `${baseUrl}?page=1&limit=${limit}&orderBy=${orderBy}&order=${order}`,
    last: `${baseUrl}?page=${totalPages}&limit=${limit}&orderBy=${orderBy}&order=${order}`,
    prev: page > 1 ? `${baseUrl}?page=${page - 1}&limit=${limit}&orderBy=${orderBy}&order=${order}` : null,
    next: page < totalPages ? `${baseUrl}?page=${page + 1}&limit=${limit}&orderBy=${orderBy}&order=${order}` : null
  };

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages
    },
    links
  };
}

// Fonction utilitaire pour construire l'URL de base
export function getBaseUrl(request: NextRequest): string {
  const { searchParams } = new URL(request.url);
  const path = request.nextUrl.pathname;
  
  // Conserver tous les paramètres de recherche sauf la pagination
  const params = new URLSearchParams(searchParams);
  params.delete('page');
  params.delete('limit');
  params.delete('orderBy');
  params.delete('order');
  
  const queryString = params.toString();
  return `${path}${queryString ? `?${queryString}` : ''}`;
}

export const withRoleCheck = async (request: NextRequest, allowedRoles: Role[]) => {
  const authResult = await authenticateRequest(request);
  if (!authResult) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  
  if (!allowedRoles.includes(authResult.user.role)) {
    return NextResponse.json(
      { error: "Vous n'avez pas les permissions nécessaires" },
      { status: 403 }
    );
  }
  
  return null;
};

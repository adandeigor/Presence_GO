import { Role } from "@prisma/client";
import { useAuthContext } from "@/context/useAuthContext";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

interface UserData {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phoneNumber?: string;
  address?: string;
  birthDate?: string;
}

interface ParentChildData {
  parentId: string;
  childId: string;
}

type QueryParams = Record<string, string | number | undefined>;

const createQueryString = (params: QueryParams): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, value.toString());
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

const BaseRequest = async (url: string, method: string, sessionToken?: string, body?: any) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    "x-api-key": process.env.NEXT_PUBLIC_API_KEY as string,
  };

  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }

  const response = await fetch(baseUrl + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Une erreur est survenue');
  }
  return data;
};

export const useUser = () => {
  const { sessionToken } = useAuthContext();

  // Récupération des utilisateurs
  const getUsers = async (params?: {
    role?: Role;
    schoolId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryString = createQueryString(params || {});
    return await BaseRequest(`/api/user${queryString}`, 'GET', sessionToken as string);
  };

  // Récupération d'un utilisateur spécifique
  const getUser = async (userId: string) => {
    return await BaseRequest(`/api/user/${userId}`, 'GET', sessionToken as string);
  };

  // Création d'un utilisateur
  const createUser = async (data: UserData) => {
    return await BaseRequest('/api/user', 'POST', sessionToken as string, data);
  };

  // Mise à jour d'un utilisateur
  const updateUser = async (userId: string, data: Partial<UserData>) => {
    return await BaseRequest(`/api/user/${userId}`, 'PATCH', sessionToken as string, data);
  };

  // Suppression d'un utilisateur
  const deleteUser = async (userId: string) => {
    return await BaseRequest(`/api/user/${userId}`, 'DELETE', sessionToken as string);
  };

  // Gestion des relations parent-enfant
  const addParentChild = async (data: ParentChildData) => {
    return await BaseRequest('/api/user/parent-child', 'POST', sessionToken as string, data);
  };

  const removeParentChild = async (parentId: string, childId: string) => {
    return await BaseRequest(`/api/user/parent-child/${parentId}/${childId}`, 'DELETE', sessionToken as string);
  };

  // Récupération des enfants d'un parent
  const getParentChildren = async (parentId: string, params?: {
    page?: number;
    limit?: number;
  }) => {
    const queryString = createQueryString(params || {});
    return await BaseRequest(`/api/user/${parentId}/children${queryString}`, 'GET', sessionToken as string);
  };

  // Récupération des parents d'un enfant
  const getChildParents = async (childId: string, params?: {
    page?: number;
    limit?: number;
  }) => {
    const queryString = createQueryString(params || {});
    return await BaseRequest(`/api/user/${childId}/parents${queryString}`, 'GET', sessionToken as string);
  };

  // Récupération du profil de l'utilisateur connecté
  const getCurrentUser = async () => {
    return await BaseRequest('/api/user/me', 'GET', sessionToken as string);
  };

  // Mise à jour du mot de passe
  const updatePassword = async (data: { oldPassword: string; newPassword: string }) => {
    return await BaseRequest('/api/user/password', 'PATCH', sessionToken as string, data);
  };

  return {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    addParentChild,
    removeParentChild,
    getParentChildren,
    getChildParents,
    getCurrentUser,
    updatePassword,
  };
}; 
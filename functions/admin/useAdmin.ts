import { useAuthContext } from "@/context/useAuthContext";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

interface PaginationParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

interface AdminResponse {
  school: {
    id: string;
    name: string;
    level: string;
    address: string;
    phone_number: string;
    email: string;
  };
  admin: {
    id: string;
    name: string;
    email: string;
  };
}

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

const createQueryString = (params: Record<string, string | number | undefined>): string => {
  const validParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(value!.toString())}`);

  return validParams.length > 0 ? `?${validParams.join('&')}` : '';
};

export const useAdmin = () => {
  const { sessionToken } = useAuthContext();

  const createSchoolAdmin = async (schoolId: string, adminId: string): Promise<AdminResponse> => {
    return await BaseRequest('/api/admin/create', 'POST', sessionToken as string, {
      schoolId,
      adminId
    });
  };

  const deleteSchoolAdmin = async (schoolId: string): Promise<{ message: string }> => {
    return await BaseRequest(`/api/admin/delete?schoolId=${schoolId}`, 'DELETE', sessionToken as string);
  };

  const updateSchoolAdmin = async (schoolId: string, adminId: string): Promise<AdminResponse> => {
    return await BaseRequest(`/api/admin/update?schoolId=${schoolId}`, 'PATCH', sessionToken as string, {
      adminId
    });
  };

  const getAdministeredSchools = async (userId: string, params?: PaginationParams) => {
    const queryParams = {
      userId,
      ...(params || {})
    };
    const queryString = createQueryString(queryParams);
    return await BaseRequest(`/api/admin/get-administered${queryString}`, 'GET', sessionToken as string);
  };

  const isSchoolAdmin = async (schoolId: string, userId: string): Promise<{ isAdmin: boolean; data: AdminResponse | null }> => {
    const queryString = createQueryString({ schoolId, userId });
    return await BaseRequest(`/api/admin/is-admin${queryString}`, 'GET', sessionToken as string);
  };

  return {
    createSchoolAdmin,
    deleteSchoolAdmin,
    updateSchoolAdmin,
    getAdministeredSchools,
    isSchoolAdmin,
  };
}; 
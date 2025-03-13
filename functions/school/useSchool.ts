import { Level } from "@prisma/client";
import { useAuthContext } from "@/context/useAuthContext";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

type PaginationParams = {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
};

interface SchoolData {
  name: string;
  level: Level;
  address: string;
  phone_number: string;
  email: string;
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

export const useSchool = () => {
  const { sessionToken } = useAuthContext();

  const getAllSchools = async (params?: PaginationParams) => {
    const queryString = createQueryString(params || {});
    return await BaseRequest(`/api/school/get-all${queryString}`, 'GET', sessionToken as string);
  };

  const getSchool = async (id: string) => {
    return await BaseRequest(`/api/school/get-once?id=${id}`, 'GET', sessionToken as string);
  };

  const createSchool = async (data: SchoolData) => {
    return await BaseRequest('/api/school/create', 'POST', sessionToken as string, data);
  };

  const updateSchool = async (id: string, data: Partial<SchoolData>) => {
    return await BaseRequest(`/api/school/update?id=${id}`, 'PATCH', sessionToken as string, data);
  };

  const deleteSchool = async (id: string) => {
    return await BaseRequest(`/api/school/delete?id=${id}`, 'DELETE', sessionToken as string);
  };

  const getSchoolClasses = async (schoolId: string, params?: PaginationParams & { level?: Level, search?: string }) => {
    const queryParams = {
      ...(params || {}),
      schoolId: schoolId || undefined
    };
    const queryString = createQueryString(queryParams);
    return await BaseRequest(`/api/school/get-classes${queryString}`, 'GET', sessionToken as string);
  };

  const getSchoolStudents = async (schoolId: string, params?: PaginationParams & { classId?: string, search?: string }) => {
    const queryParams = {
      ...(params || {}),
      schoolId: schoolId || undefined
    };
    const queryString = createQueryString(queryParams);
    return await BaseRequest(`/api/school/get-students${queryString}`, 'GET', sessionToken as string);
  };

  const getSchoolAdmin = async (schoolId: string) => {
    return await BaseRequest(`/api/school/get-admin?schoolId=${schoolId}`, 'GET', sessionToken as string);
  };

  return {
    getAllSchools,
    getSchool,
    createSchool,
    updateSchool,
    deleteSchool,
    getSchoolClasses,
    getSchoolStudents,
    getSchoolAdmin,
  };
}; 
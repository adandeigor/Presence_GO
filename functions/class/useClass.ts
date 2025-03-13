import { useAuthContext } from "@/context/useAuthContext";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

interface ClassData {
  name: string;
  schoolId: string;
  level: string;
  description?: string;
}

interface StudentData {
  userId: string;
  classId: string;
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

  console.log('URL:', baseUrl + url);
  console.log('Method:', method);
  console.log('Headers:', headers);
  console.log('Body:', body);

  const response = await fetch(baseUrl + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
    console.error('Erreur API:', {
      status: response.status,
      statusText: response.statusText,
      data: errorData
    });
    throw new Error(errorData.error || 'Une erreur est survenue');
  }

  const data = await response.json();
  return data;
};

export const useClass = () => {
  const { sessionToken } = useAuthContext();

  // Récupération des classes
  const getClasses = async (params?: {
    schoolId?: string;
    level?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryString = createQueryString(params || {});
    return await BaseRequest(`/api/class${queryString}`, 'GET', sessionToken as string);
  };

  // Récupération d'une classe spécifique
  const getClass = async (classId: string) => {
    return await BaseRequest(`/api/class/${classId}`, 'GET', sessionToken as string);
  };

  // Création d'une classe
  const createClass = async (data: ClassData) => {
    return await BaseRequest('/api/class/create', 'POST', sessionToken as string, data);
  };

  // Mise à jour d'une classe
  const updateClass = async (classId: string, data: Partial<ClassData>) => {
    return await BaseRequest(`/api/class/update/${classId}`, 'PATCH', sessionToken as string, data);
  };

  // Suppression d'une classe
  const deleteClass = async (classId: string) => {
    return await BaseRequest(`/api/class/delete/${classId}`, 'DELETE', sessionToken as string);
  };

  // Ajout d'un étudiant à une classe
  const addStudent = async (data: StudentData) => {
    return await BaseRequest('/api/class/add-student', 'POST', sessionToken as string, data);
  };

  // Retrait d'un étudiant d'une classe
  const removeStudent = async (classId: string, userId: string) => {
    return await BaseRequest(`/api/class/remove-student/${classId}/${userId}`, 'DELETE', sessionToken as string);
  };

  // Récupération des étudiants d'une classe
  const getClassStudents = async (classId: string, params?: {
    page?: number;
    limit?: number;
  }) => {
    const queryString = createQueryString(params || {});
    return await BaseRequest(`/api/class/students/${classId}${queryString}`, 'GET', sessionToken as string);
  };

  // Récupération des cours d'une classe
  const getClassCourses = async (classId: string, params?: {
    page?: number;
    limit?: number;
  }) => {
    const queryString = createQueryString(params || {});
    return await BaseRequest(`/api/class/courses/${classId}${queryString}`, 'GET', sessionToken as string);
  };

  return {
    getClasses,
    getClass,
    createClass,
    updateClass,
    deleteClass,
    addStudent,
    removeStudent,
    getClassStudents,
    getClassCourses,
  };
}; 
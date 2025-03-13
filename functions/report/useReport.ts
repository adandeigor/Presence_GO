import { useAuthContext } from "@/context/useAuthContext";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

type ReportType = 'student' | 'course' | 'class';

interface ReportParams {
  startDate?: string;
  endDate?: string;
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

export const useReport = () => {
  const { sessionToken } = useAuthContext();

  // Génération d'un rapport
  const generateReport = async (type: ReportType, id: string, params?: ReportParams) => {
    const queryString = createQueryString({
      type,
      id,
      ...params
    });
    return await BaseRequest(`/api/report${queryString}`, 'GET', sessionToken as string);
  };

  // Rapport de présence d'un étudiant
  const generateStudentReport = async (studentId: string, params?: ReportParams) => {
    return generateReport('student', studentId, params);
  };

  // Rapport de présence d'un cours
  const generateCourseReport = async (courseId: string, params?: ReportParams) => {
    return generateReport('course', courseId, params);
  };

  // Rapport de présence d'une classe
  const generateClassReport = async (classId: string, params?: ReportParams) => {
    return generateReport('class', classId, params);
  };

  return {
    generateReport,
    generateStudentReport,
    generateCourseReport,
    generateClassReport,
  };
}; 
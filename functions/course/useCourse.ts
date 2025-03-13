import { Level } from "@prisma/client";
import { useAuthContext } from "@/context/useAuthContext";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

interface CourseData {
  name: string;
  classId: string;
  teacherId?: string;
  program?: string;
}

interface ScheduleData {
  dayOfWeek: 'LUNDI' | 'MARDI' | 'MERCREDI' | 'JEUDI' | 'VENDREDI' | 'SAMEDI' | 'DIMANCHE';
  startTime: string;
  endTime: string;
  room: string;
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

export const useCourse = () => {
  const { sessionToken } = useAuthContext();

  // Récupération d'un cours
  const getCourse = async (courseId: string) => {
    return await BaseRequest(`/api/course/get?courseId=${courseId}`, 'GET', sessionToken as string);
  };

  // Liste des cours
  const listCourses = async (params?: {
    classId?: string;
    teacherId?: string;
    search?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryString = createQueryString(params || {});
    return await BaseRequest(`/api/course/list${queryString}`, 'GET', sessionToken as string);
  };

  // Création d'un cours
  const createCourse = async (data: CourseData) => {
    return await BaseRequest('/api/course/create', 'POST', sessionToken as string, data);
  };

  // Mise à jour d'un cours
  const updateCourse = async (courseId: string, data: Partial<CourseData>) => {
    return await BaseRequest(`/api/course/update?courseId=${courseId}`, 'PATCH', sessionToken as string, data);
  };

  // Suppression d'un cours
  const deleteCourse = async (courseId: string) => {
    return await BaseRequest(`/api/course/delete?courseId=${courseId}`, 'DELETE', sessionToken as string);
  };

  // Ajout d'un créneau horaire
  const addSchedule = async (courseId: string, scheduleData: ScheduleData) => {
    return await BaseRequest('/api/class/add-course', 'POST', sessionToken as string, {
      courseId,
      ...scheduleData
    });
  };

  // Mise à jour d'un créneau horaire
  const updateSchedule = async (scheduleId: string, scheduleData: Partial<ScheduleData>) => {
    return await BaseRequest(`/api/class/update-course?id=${scheduleId}`, 'PATCH', sessionToken as string, scheduleData);
  };

  // Suppression d'un créneau horaire
  const deleteSchedule = async (scheduleId: string) => {
    return await BaseRequest(`/api/class/delete-course?id=${scheduleId}`, 'DELETE', sessionToken as string);
  };

  return {
    getCourse,
    listCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    addSchedule,
    updateSchedule,
    deleteSchedule,
  };
}; 
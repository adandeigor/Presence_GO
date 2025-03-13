import { DayOfWeek } from "@prisma/client";
import { useAuthContext } from "@/context/useAuthContext";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

interface ScheduleData {
  courseId: string;
  startTime: string;
  endTime: string;
  dayOfWeek: DayOfWeek;
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

export const useSchedule = () => {
  const { sessionToken } = useAuthContext();

  // Récupération des emplois du temps
  const getSchedules = async (params?: {
    courseId?: string;
    classId?: string;
    teacherId?: string;
    startDate?: string;
    endDate?: string;
    dayOfWeek?: DayOfWeek;
    page?: number;
    limit?: number;
  }) => {
    const queryString = createQueryString(params || {});
    return await BaseRequest(`/api/schedule${queryString}`, 'GET', sessionToken as string);
  };

  // Création d'un créneau horaire
  const createSchedule = async (data: ScheduleData) => {
    return await BaseRequest('/api/schedule', 'POST', sessionToken as string, data);
  };

  // Mise à jour d'un créneau horaire
  const updateSchedule = async (scheduleId: string, data: Partial<ScheduleData>) => {
    return await BaseRequest(`/api/schedule/${scheduleId}`, 'PATCH', sessionToken as string, data);
  };

  // Suppression d'un créneau horaire
  const deleteSchedule = async (scheduleId: string) => {
    return await BaseRequest(`/api/schedule/${scheduleId}`, 'DELETE', sessionToken as string);
  };

  return {
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}; 
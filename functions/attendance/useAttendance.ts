import { AttendanceStatus, ValidationMethodType } from "@prisma/client";
import { useAuthContext } from "@/context/useAuthContext";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

type PaginationParams = {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
};

interface AttendanceData {
  studentId: string;
  courseId: string;
  status: AttendanceStatus;
  validationMethod?: ValidationMethodType;
  deviceInfo?: any;
}

interface DeviceInfo {
  type: string;
  name: string;
  identifier: string;
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

export const useAttendance = () => {
  const { sessionToken } = useAuthContext();

  // Gestion des présences par cours
  const getCourseAttendance = async (courseId: string, params?: {
    date?: string;
    status?: AttendanceStatus;
    page?: number;
    limit?: number;
  }) => {
    const queryString = createQueryString({ ...params, courseId });
    return await BaseRequest(`/api/attendance/course/${courseId}${queryString}`, 'GET', sessionToken as string);
  };

  // Création d'une présence
  const createAttendance = async (data: AttendanceData) => {
    return await BaseRequest('/api/attendance/create', 'POST', sessionToken as string, data);
  };

  // Validation d'une présence
  const validateAttendance = async (attendanceId: string, validationMethod: ValidationMethodType, deviceInfo?: DeviceInfo) => {
    return await BaseRequest('/api/attendance/validate', 'POST', sessionToken as string, {
      attendanceId,
      validationMethod,
      deviceInfo
    });
  };

  // Liste des présences
  const listAttendances = async (params?: {
    courseId?: string;
    classId?: string;
    studentId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryString = createQueryString(params || {});
    return await BaseRequest(`/api/attendance/list${queryString}`, 'GET', sessionToken as string);
  };

  // Présences d'un étudiant
  const getStudentAttendance = async (studentId: string, params?: {
    startDate?: string;
    endDate?: string;
    courseId?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryString = createQueryString(params || {});
    return await BaseRequest(`/api/attendance/student/${studentId}${queryString}`, 'GET', sessionToken as string);
  };

  // Statistiques de présence
  const getAttendanceStats = async (params?: {
    courseId?: string;
    classId?: string;
    studentId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const queryString = createQueryString(params || {});
    return await BaseRequest(`/api/attendance/stats${queryString}`, 'GET', sessionToken as string);
  };

  // Génération de QR Code
  const generateQRCode = async (courseId: string) => {
    return await BaseRequest('/api/attendance/qr/generate', 'POST', sessionToken as string, { courseId });
  };

  // Validation par QR Code
  const validateQRCode = async (qrCode: string, deviceInfo: DeviceInfo) => {
    return await BaseRequest('/api/attendance/qr/validate', 'POST', sessionToken as string, {
      qrCode,
      deviceInfo
    });
  };

  return {
    getCourseAttendance,
    createAttendance,
    validateAttendance,
    listAttendances,
    getStudentAttendance,
    getAttendanceStats,
    generateQRCode,
    validateQRCode,
  };
}; 
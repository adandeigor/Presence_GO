import { useAuthContext } from "@/context/useAuthContext";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

interface DeviceData {
  userId: string;
  type: string;
  name: string;
  identifier: string;
}

type DeviceStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

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

export const useDevice = () => {
  const { sessionToken } = useAuthContext();

  // Liste des appareils
  const getDevices = async (params?: {
    userId?: string;
    type?: string;
    status?: DeviceStatus;
    page?: number;
    limit?: number;
  }) => {
    const queryString = createQueryString(params || {});
    return await BaseRequest(`/api/device${queryString}`, 'GET', sessionToken as string);
  };

  // Création d'un appareil
  const createDevice = async (data: DeviceData) => {
    return await BaseRequest('/api/device', 'POST', sessionToken as string, data);
  };

  // Mise à jour d'un appareil
  const updateDevice = async (deviceId: string, data: Partial<{
    type: string;
    name: string;
    status: DeviceStatus;
  }>) => {
    return await BaseRequest(`/api/device/${deviceId}`, 'PATCH', sessionToken as string, data);
  };

  // Suppression d'un appareil
  const deleteDevice = async (deviceId: string) => {
    return await BaseRequest(`/api/device/${deviceId}`, 'DELETE', sessionToken as string);
  };

  return {
    getDevices,
    createDevice,
    updateDevice,
    deleteDevice,
  };
}; 
import { NotificationType, NotificationStatus } from "@prisma/client";
import { useAuthContext } from "@/context/useAuthContext";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

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

export const useNotification = () => {
  const { sessionToken } = useAuthContext();

  // Liste des notifications
  const getNotifications = async (params?: {
    type?: NotificationType;
    status?: NotificationStatus;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryString = createQueryString(params || {});
    return await BaseRequest(`/api/notification${queryString}`, 'GET', sessionToken as string);
  };

  // Marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    return await BaseRequest('/api/notification', 'POST', sessionToken as string, {
      action: 'markAllAsRead'
    });
  };

  // Mise à jour du statut d'une notification
  const updateNotificationStatus = async (notificationId: string, status: NotificationStatus) => {
    return await BaseRequest(`/api/notification/${notificationId}`, 'PATCH', sessionToken as string, {
      status
    });
  };

  // Suppression d'une notification
  const deleteNotification = async (notificationId: string) => {
    return await BaseRequest(`/api/notification/${notificationId}`, 'DELETE', sessionToken as string);
  };

  return {
    getNotifications,
    markAllAsRead,
    updateNotificationStatus,
    deleteNotification,
  };
}; 
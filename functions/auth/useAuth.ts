import { useAuthContext } from "@/context/useAuthContext";

// Types pour la gestion de session
interface Session {
  token: string;
  expiresAt: number;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
}

class AuthError extends Error {
  constructor(public code: number, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

const BaseRequest = async (url: string, method: string, sessionToken?: string, body?: any) => {
  // Vérifier si le token est valide avant de faire la requête
  if (sessionToken && !isSessionValid()) {
    throw new AuthError(401, 'Session expirée. Veuillez vous reconnecter.');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    "x-api-key": process.env.NEXT_PUBLIC_API_KEY as string,
  };

  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }

  try {
    console.log('Envoi de la requête à:', baseUrl + url);
    console.log('Méthode:', method);
    console.log('Headers:', headers);
    console.log('Body:', body);

    const response = await fetch(baseUrl + url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log('Status de la réponse:', response.status);
    const data = await response.json();
    console.log('Réponse brute:', data);
    
    if (!response.ok) {
      throw new AuthError(
        response.status,
        data.error || 'Une erreur est survenue'
      );
    }
    
    return data;
  } catch (error) {
    console.error('Erreur dans BaseRequest:', error);
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError(500, 'Erreur de connexion au serveur');
  }
};

const isSessionValid = (): boolean => {
  const expiresAt = localStorage.getItem('sessionExpires');
  return expiresAt ? Date.now() < parseInt(expiresAt) : false;
};

const setSession = (session: Session) => {
  if (!session || !session.expiresAt) {
    throw new AuthError(400, 'Données de session invalides');
  }
  
  localStorage.setItem('sessionExpires', session.expiresAt.toString());
  if (session.user) {
    localStorage.setItem('userData', JSON.stringify(session.user));
  }
  return session.token;
};

const clearSessionData = () => {
  localStorage.removeItem('sessionExpires');
  localStorage.removeItem('userData');
};

const extractExpiresAt = (token: string): number => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convertir en millisecondes
  } catch (error) {
    console.error('Erreur lors de l\'extraction de expiresAt:', error);
    throw new AuthError(400, 'Token invalide');
  }
};

export const useAuth = () => {
  const { sessionToken, setSessionToken, clearSession } = useAuthContext();

  const signup = async (email: string, password: string, name: string, role: string = "STUDENT") => {
    const data = await BaseRequest('/api/auth/sign-up', 'POST', undefined, { email, password, name, role });
    const token = setSession(data);
    setSessionToken(token);
    return data;
  };

  const login = async (email: string, password: string) => {
    const data = await BaseRequest('/api/auth/login', 'POST', undefined, { email, password });
    
    console.log('Réponse de l\'API:', data);
    
    // Vérifier que la réponse contient les données nécessaires
    if (!data || !data.token) {
      console.error('Données manquantes:', {
        hasData: !!data,
        hasToken: !!data?.token
      });
      throw new AuthError(400, 'Réponse de connexion invalide');
    }

    const expiresAt = extractExpiresAt(data.token);

    const session: Session = {
      token: data.token,
      expiresAt,
      user: data.user
    };

    const token = setSession(session);
    setSessionToken(token);
    return data;
  };

  const logout = async () => {
    try {
      await BaseRequest('/api/auth/logout', 'POST', sessionToken as string);
    } finally {
      clearSession();
      clearSessionData();
    }
  };

  const getProfile = async () => {
    if (!isSessionValid()) {
      throw new AuthError(401, 'Session expirée. Veuillez vous reconnecter.');
    }
    return await BaseRequest('/api/auth/profile', 'GET', sessionToken as string);
  };

  const updateProfile = async (updateData: Partial<{
    name: string;
    email: string;
    phone_number: string;
    image: string;
  }>) => {
    if (!isSessionValid()) {
      throw new AuthError(401, 'Session expirée. Veuillez vous reconnecter.');
    }
    return await BaseRequest('/api/auth/update', 'PATCH', sessionToken as string, updateData);
  };

  const resetPassword = async (email: string) => {
    return await BaseRequest('/api/auth/reset-password', 'POST', undefined, { email });
  };

  const confirmResetPassword = async (email: string, newPassword: string, tempToken: string) => {
    return await BaseRequest('/api/auth/reset-password', 'PATCH', undefined, { 
      email, 
      newPassword, 
      tempToken 
    });
  };

  const sendMagicLink = async (email: string) => {
    return await BaseRequest('/api/auth/magic-link', 'POST', undefined, { email });
  };

  return {
    signup,
    login,
    logout,
    getProfile,
    updateProfile,
    resetPassword,
    confirmResetPassword,
    sendMagicLink,
    isSessionValid,
  };
};
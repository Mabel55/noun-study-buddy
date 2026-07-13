import React, { createContext, useContext, useState, useEffect } from 'react';

const BASE_URL = 'https://noun-study-buddy.onrender.com';

interface UserData {
  pk: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthContextType {
  user: UserData | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { username: string; email: string; password1: string; password2: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoggedIn: false,
  isLoading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved session on app start
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('noun_token');
      const savedUser = localStorage.getItem('noun_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.key) {
        // Fetch user profile
        const userRes = await fetch(`${BASE_URL}/api/auth/user/`, {
          headers: { 'Authorization': `Token ${data.key}` },
        });
        const userData = await userRes.json();

        setToken(data.key);
        setUser(userData);

        if (typeof window !== 'undefined') {
          localStorage.setItem('noun_token', data.key);
          localStorage.setItem('noun_user', JSON.stringify(userData));
        }
        return { success: true };
      }

      // Parse error messages
      const errorMsg = data.non_field_errors?.[0] 
        || data.email?.[0] 
        || data.password?.[0] 
        || 'Login failed. Check your credentials.';
      return { success: false, error: errorMsg };

    } catch (e) {
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  };

  const register = async (formData: { username: string; email: string; password1: string; password2: string }) => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/registration/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok && data.key) {
        // Auto-login after registration
        const userRes = await fetch(`${BASE_URL}/api/auth/user/`, {
          headers: { 'Authorization': `Token ${data.key}` },
        });
        const userData = await userRes.json();

        setToken(data.key);
        setUser(userData);

        if (typeof window !== 'undefined') {
          localStorage.setItem('noun_token', data.key);
          localStorage.setItem('noun_user', JSON.stringify(userData));
        }
        return { success: true };
      }

      // Parse registration errors
      const errorMsg = data.username?.[0]
        || data.email?.[0]
        || data.password1?.[0]
        || data.non_field_errors?.[0]
        || 'Registration failed. Please try again.';
      return { success: false, error: errorMsg };

    } catch (e) {
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('noun_token');
      localStorage.removeItem('noun_user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn: !!token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}


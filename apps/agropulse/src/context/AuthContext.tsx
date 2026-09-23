import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { UserRole, Organization } from '../types/database';
import { MOCK_ORGANIZATION } from '../utils/mockData';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole;
  organization: Organization | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAs: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const DEMO_USERS: Record<UserRole, { id: string; email: string; fullName: string }> = {
  producer: {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'productor@agropulse.test',
    fullName: 'Carlos Productor',
  },
  operator: {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'operador@agropulse.test',
    fullName: 'Lucía Operadora',
  },
  advisor: {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    email: 'asesor@agropulse.test',
    fullName: 'Martín Asesor Agronómico',
  },
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const AUTH_STORAGE_KEY = '@agropulse_demo_user_role';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<UserRole>('producer');
  const [organization, setOrganization] = useState<Organization | null>(MOCK_ORGANIZATION);
  const [isLoading, setIsLoading] = useState(true);

  // Restore stored session on startup
  useEffect(() => {
    async function initAuth() {
      try {
        if (isLiveSupabaseConfigured) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await handleSupabaseUser(session.user);
            return;
          }
        }

        // Check local demo persistence
        const savedRole = (await AsyncStorage.getItem(AUTH_STORAGE_KEY)) as UserRole | null;
        if (savedRole && DEMO_USERS[savedRole]) {
          setUser(DEMO_USERS[savedRole]);
          setRole(savedRole);
          setOrganization(MOCK_ORGANIZATION);
        } else {
          // Default to producer for immediate first launch experience
          setUser(DEMO_USERS.producer);
          setRole('producer');
          setOrganization(MOCK_ORGANIZATION);
        }
      } catch (err) {
        console.warn('[AuthContext] Error initializing auth:', err);
        setUser(DEMO_USERS.producer);
        setRole('producer');
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase auth state changes if configured
    if (isLiveSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          await handleSupabaseUser(session.user);
        } else {
          setUser(null);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  async function handleSupabaseUser(sbUser: any) {
    const email = sbUser.email || '';
    let detectedRole: UserRole = 'producer';

    if (email.includes('operador')) detectedRole = 'operator';
    else if (email.includes('asesor')) detectedRole = 'advisor';

    // Fetch role from memberships table if exists
    try {
      const { data } = await supabase
        .from('memberships')
        .select('role, organization_id, organizations(*)')
        .eq('user_id', sbUser.id)
        .maybeSingle();

      if (data?.role) {
        detectedRole = data.role as UserRole;
        if (data.organizations) {
          setOrganization(data.organizations as unknown as Organization);
        }
      }
    } catch {
      // Fallback to detected role
    }

    setUser({
      id: sbUser.id,
      email: sbUser.email,
      fullName: sbUser.user_metadata?.full_name || email.split('@')[0],
    });
    setRole(detectedRole);
  }

  async function login(email: string, password?: string) {
    setIsLoading(true);
    try {
      if (isLiveSupabaseConfigured && password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          return { success: false, error: error.message };
        }
        if (data.user) {
          await handleSupabaseUser(data.user);
          return { success: true };
        }
      }

      // Demo login matching email
      const matchedRole = (Object.keys(DEMO_USERS) as UserRole[]).find(
        (r) => DEMO_USERS[r].email.toLowerCase() === email.trim().toLowerCase()
      );

      if (matchedRole) {
        await loginAs(matchedRole);
        return { success: true };
      }

      // If email doesn't strictly match demo list, default to operator
      setUser({
        id: 'user-' + Date.now(),
        email: email.trim(),
        fullName: email.split('@')[0],
      });
      setRole('operator');
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, 'operator');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al iniciar sesión' };
    } finally {
      setIsLoading(false);
    }
  }

  async function loginAs(selectedRole: UserRole) {
    setIsLoading(true);
    try {
      const demo = DEMO_USERS[selectedRole];
      setUser(demo);
      setRole(selectedRole);
      setOrganization(MOCK_ORGANIZATION);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, selectedRole);

      if (isLiveSupabaseConfigured) {
        // Attempt password login on Supabase in the background
        await supabase.auth.signInWithPassword({
          email: demo.email,
          password: 'AgroPulse2026!',
        }).catch(() => {});
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    setIsLoading(true);
    try {
      if (isLiveSupabaseConfigured) {
        await supabase.auth.signOut().catch(() => {});
      }
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        organization,
        isLoading,
        login,
        loginAs,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}

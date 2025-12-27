
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, PlanType, Project, Notification, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  projects: Project[];
  isLoading: boolean;
  notifications: Notification[];
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  deductCredit: () => Promise<boolean>; 
  upgradePlan: (plan: PlanType) => Promise<void>;
  saveProject: (thumbnail: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  addNotification: (type: 'SUCCESS' | 'ERROR' | 'INFO', message: string) => void;
  removeNotification: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Timeout ref to force stop loading if Supabase hangs
  const loadingTimeoutRef = useRef<any>(null);

  const addNotification = (type: 'SUCCESS' | 'ERROR' | 'INFO', message: string) => {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, type, message }]);
      setTimeout(() => removeNotification(id), 5000);
  };

  const removeNotification = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getOrCreateProfile = async (authUser: User) => {
    // Default Fallback
    const fallbackProfile: UserProfile = {
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata.full_name || authUser.email?.split('@')[0] || 'User',
        avatar_url: authUser.user_metadata.avatar_url || '',
        plan: 'FREE', 
        role: 'USER', 
        credits: 5 
    };

    try {
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!fetchError && existingProfile) {
          return existingProfile as UserProfile;
      }

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .upsert([fallbackProfile], { onConflict: 'id' })
        .select()
        .single();

      if (insertError) {
          console.warn("Auth: Profile creation failed, using fallback.", insertError);
          return fallbackProfile;
      }

      return (newProfile as UserProfile);
    } catch (error) {
      console.error("Auth: DB Critical Error:", error);
      return fallbackProfile;
    }
  };

  const loadUserData = async (authUser: User) => {
    try {
        const profile = await getOrCreateProfile(authUser);
        setUser(profile);
        
        const { data } = await supabase.from('projects').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false });
        setProjects((data as Project[]) || []);
    } catch (e) {
        console.error("Auth: User data load failed", e);
    }
  };

  useEffect(() => {
    // SAFETY: Force stop loading after 5 seconds max
    loadingTimeoutRef.current = setTimeout(() => {
        if(isLoading) {
            console.warn("Auth: Forced loading stop due to timeout.");
            setIsLoading(false);
        }
    }, 5000);

    const initAuth = async () => {
        setIsLoading(true);
        try {
            // 1. Check for OAuth redirect hash manually to be safe
            // This ensures we catch the session before the URL is cleaned by other routers
            const hash = window.location.hash;
            if (hash && hash.includes('access_token')) {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (!error && session) {
                    await loadUserData(session.user);
                    // Clear hash to clean up URL
                    window.history.replaceState(null, '', window.location.pathname);
                    setIsLoading(false);
                    return; 
                }
            }

            // 2. Standard Session Check (Persistence)
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await loadUserData(session.user);
            }
        } catch (error) {
            console.error("Auth Init Error:", error);
        } finally {
            setIsLoading(false);
            if(loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            // If user is null (fresh login) or ID mismatch, load data
            if (!user || user.id !== session.user.id) {
                 await loadUserData(session.user);
            }
        } else if (event === 'SIGNED_OUT') {
             setUser(null);
             setProjects([]);
             // Do not set isLoading false here, assume we are already loaded/unloaded
        }
    });

    return () => {
      subscription.unsubscribe();
      if(loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, []);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
          redirectTo: window.location.origin, 
          queryParams: { 
              access_type: 'offline', 
              prompt: 'consent select_account' 
          },
      }
    });
    if (error) {
        setIsLoading(false);
        addNotification('ERROR', 'Login failed. Please try again.');
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProjects([]);
    setIsLoading(false); 
  };

  const deductCredit = async () => {
    if (!user) return false;
    // For admins or "Unlimited" logic in demo
    if (user.role === 'ADMIN') return true; 

    if (user.credits <= 0) return false;
    
    const newCredits = user.credits - 1;
    const updatedUser = { ...user, credits: newCredits };
    setUser(updatedUser);
    
    supabase.from('profiles').update({ credits: newCredits }).eq('id', user.id).then();
    return true;
  };

  const upgradePlan = async (plan: PlanType) => {
    if (!user) return;
    const newCredits = plan === 'PRO' ? 500 : 5;
    const updatedUser = { ...user, plan, credits: newCredits };
    setUser(updatedUser);
    supabase.from('profiles').update({ plan, credits: newCredits }).eq('id', user.id).then();
    addNotification('SUCCESS', `Successfully upgraded to ${plan} plan!`);
  };

  const saveProject = async (thumbnail: string, name: string) => {
    if (!user) return;
    const tempId = Math.random().toString();
    const newProject: Project = { id: tempId, user_id: user.id, name, thumbnail_url: thumbnail, created_at: new Date().toISOString() };
    setProjects(prev => [newProject, ...prev]);
    const { data } = await supabase.from('projects').insert([{ user_id: user.id, name, thumbnail_url: thumbnail }]).select().single();
    if(data) setProjects(prev => [data as Project, ...prev.filter(p => p.id !== tempId)]);
  };

  const deleteProject = async (id: string) => {
      setProjects(prev => prev.filter(p => p.id !== id));
      await supabase.from('projects').delete().eq('id', id);
      addNotification('INFO', 'Project deleted.');
  };

  return (
    <AuthContext.Provider value={{ user, projects, isLoading, notifications, loginWithGoogle, logout, deductCredit, upgradePlan, saveProject, deleteProject, refreshProjects: async () => {}, addNotification, removeNotification }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

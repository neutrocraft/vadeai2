import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, PlanType, Project } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  projects: Project[];
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  deductCredit: () => Promise<boolean>; 
  upgradePlan: (plan: PlanType) => Promise<void>;
  saveProject: (thumbnail: string, name: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Use a ref to track if we are already mounting/fetching to prevent double-firing
  const isMounting = useRef(false);

  // --- HELPER: Fetch or Create Profile ---
  const getOrCreateProfile = async (authUser: User) => {
    // 1. Define fallback
    const fallbackProfile: UserProfile = {
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata.full_name || authUser.email?.split('@')[0] || 'User',
        avatar_url: authUser.user_metadata.avatar_url || '',
        plan: 'FREE',
        credits: 5 
    };

    try {
      // 2. Try to fetch existing
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!fetchError && existingProfile) {
          return existingProfile as UserProfile;
      }

      // 3. If missing, insert.
      // Note: We use upsert to prevent race conditions if two tabs open simultaneously
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .upsert([fallbackProfile], { onConflict: 'id' })
        .select()
        .single();

      if (insertError) {
        console.warn("Profile creation warning:", insertError);
        return fallbackProfile;
      }
      
      return (newProfile as UserProfile) || fallbackProfile;
    } catch (error) {
      console.error("Auth DB Error:", error);
      return fallbackProfile;
    }
  };

  // --- CORE: Load User Data ---
  const loadUserData = async (authUser: User) => {
    try {
        const profile = await getOrCreateProfile(authUser);
        // Only update state if component is still mounted (React best practice)
        setUser(profile);
        
        // Fetch projects
        const { data } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', authUser.id)
            .order('created_at', { ascending: false });
            
        setProjects((data as Project[]) || []);
    } catch (e) {
        console.error("User data load error", e);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (isMounting.current) return; 
    isMounting.current = true;

    // Defined handleAuth to process sessions
    const handleSession = async (session: Session | null) => {
        if (session?.user) {
            await loadUserData(session.user);
        } else {
            setUser(null);
            setProjects([]);
        }
        if (mounted) setIsLoading(false);
    };

    // 1. Set up the listener. This is the source of truth.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log(`Supabase Auth Event: ${event}`);

        if (event === 'INITIAL_SESSION') {
          // This event fires when the SDK has finished its initialization (checking local storage AND URL hash)
          await handleSession(session);
        } else if (event === 'SIGNED_IN') {
          // Explicit sign in event (e.g. after OAuth redirect processing)
          setIsLoading(true); // Briefly show loading while we fetch profile
          await handleSession(session);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProjects([]);
          setIsLoading(false);
        }
      }
    );

    // 2. Fallback / Init check
    // Sometimes onAuthStateChange doesn't fire INITIAL_SESSION immediately in some envs, 
    // so we manually check getSession but ONLY settle if we find a user.
    // If we find nothing, we let the listener determine "not logged in" via INITIAL_SESSION.
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && mounted) {
            // If we have a session immediately, load it.
            // But we don't set isLoading(false) here, we let the listener/handleSession do that
            // to ensure consistency.
             loadUserData(session.user);
        }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
          redirectTo: window.location.origin, 
          // Force a new refresh of the token flow
          queryParams: {
            access_type: 'offline',
            prompt: 'consent select_account',
          },
      }
    });
    if (error) {
        console.error("Login failed:", error);
        setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
  };

  const deductCredit = async () => {
    if (!user || user.credits <= 0) return false;
    const newCredits = user.credits - 1;
    setUser({ ...user, credits: newCredits });
    // Optimistic update, background sync
    supabase.from('profiles').update({ credits: newCredits }).eq('id', user.id).then();
    return true;
  };

  const upgradePlan = async (plan: PlanType) => {
    if (!user) return;
    const newCredits = plan === 'PRO' ? 500 : 9999;
    setUser({ ...user, plan, credits: newCredits });
    supabase.from('profiles').update({ plan, credits: newCredits }).eq('id', user.id).then();
  };

  const saveProject = async (thumbnail: string, name: string) => {
    if (!user) return;
    const tempId = Math.random().toString();
    const newProject: Project = { id: tempId, user_id: user.id, name, thumbnail_url: thumbnail, created_at: new Date().toISOString() };
    setProjects(prev => [newProject, ...prev]);
    
    const { data } = await supabase.from('projects').insert([{ user_id: user.id, name, thumbnail_url: thumbnail }]).select().single();
    if(data) setProjects(prev => [data as Project, ...prev.filter(p => p.id !== tempId)]);
  };

  return (
    <AuthContext.Provider value={{ user, projects, isLoading, loginWithGoogle, logout, deductCredit, upgradePlan, saveProject, refreshProjects: async () => {} }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
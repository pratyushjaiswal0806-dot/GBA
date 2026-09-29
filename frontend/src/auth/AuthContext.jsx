import { createContext, useContext, useEffect, useState } from 'react';
import { requestJson, setAccessTokenProvider } from '../api/client.js';
import { supabase } from '../api/supabaseClient.js';

const AuthContext = createContext(null);

function emptyState() {
  return {
    session: null,
    profile: null,
    profileError: null,
    loading: true,
    profileLoading: false
  };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(emptyState);

  async function loadProfile(session) {
    if (!session) {
      setState({
        session: null,
        profile: null,
        profileError: null,
        loading: false,
        profileLoading: false
      });
      return null;
    }

    setState((current) => ({
      ...current,
      session,
      profile: null,
      profileError: null,
      loading: false,
      profileLoading: true
    }));

    try {
      const profile = await requestJson('/api/auth/me', { accessToken: session.access_token });
      setState({ session, profile, profileError: null, loading: false, profileLoading: false });
      return profile;
    } catch (error) {
      setState({ session, profile: null, profileError: error, loading: false, profileLoading: false });
      return null;
    }
  }

  useEffect(() => {
    const clearAccessTokenProvider = setAccessTokenProvider(async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    });
    let active = true;

    async function restoreSession() {
      const { data } = await supabase.auth.getSession();

      if (active) {
        await loadProfile(data.session);
      }
    }

    restoreSession();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        loadProfile(session);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
      clearAccessTokenProvider();
    };
  }, []);

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw error;
    }

    return loadProfile(data.session);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    await loadProfile(null);
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}

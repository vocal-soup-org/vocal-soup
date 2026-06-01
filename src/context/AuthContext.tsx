// src/context/AuthContext.tsx
import React, { createContext, useEffect, useState, useContext } from "react";
import { supabase } from "../lib/supabaseClient";
import { fetchMe } from "../lib/apiClient";

type Language = "en" | "zh";

type AuthContextType = {
  user: any | null;
  loading: boolean;
  language: Language;
  isZh: boolean;
  setLanguage: (lang: Language) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  language: "en",
  isZh: false,
  setLanguage: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("en");

  const isZh = language === "zh";

  // Helper to get language from user metadata or fetchMe as fallback
  const loadLanguage = async (user: any) => {
    // 1. Try cached session user_metadata (fastest, no extra call)
    const metaLanguage = user?.user_metadata?.language as Language | undefined;
    if (metaLanguage) {
      setLanguage(metaLanguage);
      return;
    }

    // 2. Cached session may be stale — fetch fresh user from Supabase server
    try {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      const freshLang = freshUser?.user_metadata?.language as Language | undefined;
      if (freshLang) {
        setLanguage(freshLang);
        return;
      }
    } catch {}

    // 3. Last resort: backend profile (stores language set via Settings)
    try {
      const profile = await fetchMe() as { language?: Language };
      if (profile.language) {
        setLanguage(profile.language);
      }
    } catch (err) {
      console.error("Failed to load language preference:", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadLanguage(session.user);
      }

      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        if (session?.user) {
          await loadLanguage(session.user);
        }
      } else if (event === "SIGNED_OUT") {
        setLanguage("en");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, language, isZh, setLanguage }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

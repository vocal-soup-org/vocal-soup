import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { supabase } from "../lib/supabaseClient";

// src/services/auth.ts

export async function signUpWithEmail(
  email: string,
  password: string,
  metadata: Record<string, any> | undefined = undefined
) {
  const payload: any = {
    email,
    password,
  };

  if (metadata && Object.keys(metadata).length) {
    payload.options = { data: metadata };
  }

  const { data, error } = await supabase.auth.signUp(payload);

  if (error) throw error;
  return data;
}

export async function updateUserLanguage(lang: "en" | "zh") {
  const { data, error } = await supabase.auth.updateUser({
    data: { language: lang },
  });

  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const redirectTo = AuthSession.makeRedirectUri({ scheme: "vocal-soup" });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error("No OAuth URL returned from Supabase");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === "success") {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(result.url);
    if (sessionError) throw sessionError;
    return sessionData;
  }

  return null;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

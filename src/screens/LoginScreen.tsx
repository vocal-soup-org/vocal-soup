// src/screens/LoginScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { signInWithEmail, signInWithGoogle } from "../services/auth";
import { colors, spacing, borderRadius, typography, shadows } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation, route }: Props) {
  const { gameId, puzzleId } = route.params ?? {};

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLoginSuccess = () => {
    if (gameId && puzzleId) {
      navigation.reset({
        index: 1,
        routes: [{ name: "Home" }, { name: "Game", params: { gameId, puzzleId } }],
      });
    } else {
      navigation.goBack();
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithEmail(email.trim(), password);
      handleLoginSuccess();
    } catch (err: any) {
      setErrorMsg(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrorMsg(null);
    try {
      const result = await signInWithGoogle();
      if (result) {
        handleLoginSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            {gameId
              ? "Sign in to start playing"
              : "Sign in to continue your puzzle adventure"}
          </Text>
        </View>

        {/* Google Sign In */}
        <TouchableOpacity
          style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
          onPress={handleGoogleLogin}
          disabled={googleLoading || loading}
          activeOpacity={0.8}
        >
          {googleLoading ? (
            <ActivityIndicator color={colors.textSecondary} size="small" />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === "email" && styles.inputFocused,
              ]}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="your@email.com"
              placeholderTextColor={colors.textDim}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === "password" && styles.inputFocused,
              ]}
              secureTextEntry
              autoComplete="password"
              placeholder="Enter your password"
              placeholderTextColor={colors.textDim}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Error Message */}
          {errorMsg && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading || googleLoading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.textPrimary} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Signup")}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    alignSelf: "flex-start",
  },
  backText: {
    color: colors.textMuted,
    fontSize: typography.base,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.xxxl,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.md,
    color: colors.textMuted,
    lineHeight: 22,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  googleIcon: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: "#4285F4",
  },
  googleButtonText: {
    color: colors.textSecondary,
    fontSize: typography.md,
    fontWeight: typography.medium,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textDim,
    fontSize: typography.sm,
  },
  form: {
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.sm,
    fontWeight: typography.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    color: colors.textPrimary,
    fontSize: typography.md,
  },
  inputFocused: {
    borderColor: colors.primary,
    ...shadows.sm,
  },
  errorContainer: {
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.base,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: typography.semibold,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: typography.base,
  },
  linkButton: {
    paddingVertical: spacing.xs,
  },
  linkText: {
    color: colors.primary,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
});

// src/screens/AuthLandingScreen.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, spacing, borderRadius, typography, shadows } from "../theme";

export const AuthLandingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      {/* Decorative background element */}
      <View style={styles.backgroundGlow} />

      {/* Logo Section */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🍲</Text>
        </View>
        <Text style={styles.logo}>Vocal Soup</Text>
        <Text style={styles.tagline}>
          A voice-driven mystery game{"\n"}inspired by 海龟汤
        </Text>
      </View>

      {/* Features Preview */}
      <View style={styles.featuresSection}>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🎤</Text>
          <Text style={styles.featureText}>Ask questions by voice</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🧩</Text>
          <Text style={styles.featureText}>Solve lateral thinking puzzles</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🌏</Text>
          <Text style={styles.featureText}>Play in English or 中文</Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Signup")}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>

      {/* Skip Option */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => navigation.replace("Home")}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Continue as guest</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  backgroundGlow: {
    position: "absolute",
    top: "20%",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary,
    opacity: 0.05,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.glow,
  },
  logoIcon: {
    fontSize: 40,
  },
  logo: {
    fontSize: typography.display,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: typography.md,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 24,
  },
  featuresSection: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  featureIcon: {
    fontSize: 20,
    width: 32,
    textAlign: "center",
  },
  featureText: {
    fontSize: typography.base,
    color: colors.textTertiary,
    flex: 1,
  },
  buttonsContainer: {
    width: "100%",
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: "center",
    ...shadows.md,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: typography.semibold,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.textTertiary,
    fontSize: typography.md,
    fontWeight: typography.medium,
  },
  skipButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  skipText: {
    color: colors.textMuted,
    fontSize: typography.base,
    textDecorationLine: "underline",
  },
});

export default AuthLandingScreen;
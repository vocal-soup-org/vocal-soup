// src/screens/UserSettingScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { updateUserLanguage, signOut } from "../services/auth";
import { useAuth } from "../context/AuthContext";
import { storyApi } from "../lib/api";
import { colors, spacing, borderRadius, typography, fonts, shadows } from "../theme";
import { CheckIcon, ChevronLeftIcon } from "../icons";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export default function SettingsScreen({ navigation }: Props) {
  const { user, language, isZh, setLanguage } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLanguageChange = async (lang: "en" | "zh") => {
    if (lang === language) return;

    setSaving(true);
    setError(null);
    try {
      await updateUserLanguage(lang);
      if (user?.id) {
        await storyApi.updateLanguage(user.id, lang);
      }
      setLanguage(lang);
      Alert.alert(
        lang === "zh" ? "已保存" : "Saved",
        lang === "zh" ? "语言已更新。" : "Language updated."
      );
    } catch (err: any) {
      console.error("Failed to update language:", err);
      setError(err.message ?? "Failed to save language");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      isZh ? "退出登录？" : "Sign out?",
      isZh ? "你将需要再次登录。" : "You'll need to sign back in.",
      [
        { text: isZh ? "取消" : "Cancel", style: "cancel" },
        {
          text: isZh ? "退出" : "Sign out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
            } catch (err) {
              console.error("Error during logout:", err);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ChevronLeftIcon size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerEyebrow}>{isZh ? "设置" : "SETTINGS"}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Account */}
        <Text style={styles.sectionLabel}>{isZh ? "账户" : "Account"}</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() ?? "?"}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.fieldLabel}>{isZh ? "邮箱" : "Email"}</Text>
              <Text style={styles.fieldValue}>{user?.email ?? "—"}</Text>
            </View>
          </View>
        </View>

        {/* Language */}
        <Text style={styles.sectionLabel}>{isZh ? "语言" : "Language"}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.langRow, language === "en" && styles.langRowSelected]}
            onPress={() => handleLanguageChange("en")}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={styles.langText}>English</Text>
            {language === "en" && <CheckIcon size={16} color={colors.primary} />}
          </TouchableOpacity>
          <View style={styles.fieldDivider} />
          <TouchableOpacity
            style={[styles.langRow, language === "zh" && styles.langRowSelected]}
            onPress={() => handleLanguageChange("zh")}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={styles.langText}>中文</Text>
            {language === "zh" && <CheckIcon size={16} color={colors.primary} />}
          </TouchableOpacity>
          {saving && (
            <View style={styles.savingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.savingText}>{isZh ? "正在保存..." : "Saving..."}</Text>
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* About */}
        <Text style={styles.sectionLabel}>{isZh ? "关于" : "About"}</Text>
        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <Text style={styles.fieldLabel}>{isZh ? "版本" : "Version"}</Text>
            <Text style={styles.fieldValue}>1.0.0</Text>
          </View>
          <View style={styles.fieldDivider} />
          <View style={styles.aboutRow}>
            <Text style={styles.fieldLabel}>{isZh ? "应用" : "App"}</Text>
            <Text style={styles.fieldValue}>CIPHER</Text>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.actionRow} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.actionText}>{isZh ? "退出登录" : "Sign out"}</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>
          {isZh ? "CIPHER · 一个声音驱动的谜题" : "CIPHER · A voice-driven mystery"}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  headerEyebrow: {
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.textTertiary,
    letterSpacing: 2.5,
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  sectionLabel: {
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  avatarText: {
    color: colors.textInverse,
    fontSize: typography.xl,
    fontFamily: fonts.sansBold,
  },
  profileInfo: { flex: 1 },
  fieldLabel: {
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  fieldValue: {
    fontSize: typography.md,
    fontFamily: fonts.sans,
    color: colors.textPrimary,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  langRowSelected: {},
  langText: {
    fontSize: typography.md,
    fontFamily: fonts.sansMedium,
    color: colors.textPrimary,
  },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  savingText: {
    color: colors.textMuted,
    fontSize: typography.sm,
    fontFamily: fonts.sans,
  },
  errorBanner: {
    backgroundColor: colors.errorTint,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sm,
    fontFamily: fonts.sans,
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionRow: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  actionText: {
    fontSize: typography.md,
    fontFamily: fonts.sansMedium,
    color: colors.textSecondary,
  },
  footnote: {
    marginTop: spacing.xxl,
    textAlign: "center",
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.textMuted,
    letterSpacing: 2,
  },
});

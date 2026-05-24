// src/screens/GameScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Modal,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { Audio } from "expo-av";
import { useAuth } from "../context/AuthContext";
import { storyApi, ApiError, type PuzzleDetail } from "../lib/api";
import { colors, spacing, borderRadius, typography, fonts, shadows } from "../theme";
import {
  MicIcon,
  StopIcon,
  LockIcon,
  HintIcon,
  HintHideIcon,
  SolutionIcon,
  TruthRevealedIcon,
  AscendIcon,
} from "../icons";

type Props = NativeStackScreenProps<RootStackParamList, "Game">;

export const GameScreen: React.FC<Props> = ({ route, navigation }) => {
  const { gameId } = route.params;
  const { user, loading: authLoading, language, isZh } = useAuth();
  const currentUserId = user?.id;

  const [puzzleData, setPuzzleData] = useState<PuzzleDetail | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [dynamicHint, setDynamicHint] = useState<string | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newLevel, setNewLevel] = useState<number | null>(null);
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [completionPercent, setCompletionPercent] = useState<number>(0);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [lastRecordingUri, setLastRecordingUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  useEffect(() => {
    if (!authLoading && currentUserId && !sessionId) {
      startNewSession(currentUserId);
    } else if (!authLoading && !currentUserId) {
      console.warn("User is not logged in. Cannot start game session.");
    }
  }, [authLoading, currentUserId]);

  const startNewSession = async (userId: string) => {
    setIsLoadingSession(true);
    try {
      const data = await storyApi.startSession(gameId, userId, language);
      setSessionId(data.sessionId);
      setPuzzleData(data.puzzle);
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`API Error (${error.code}):`, error.message);
      } else {
        console.error("Error starting new session:", error);
      }
    } finally {
      setIsLoadingSession(false);
    }
  };

  const startRecording = async () => {
    try {
      if (!hasPermission) {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") {
          console.warn("Microphone permission not granted.");
          setHasPermission(false);
          return;
        }
        setHasPermission(true);
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      setIsRecording(true);
      setRecordingDuration(null);

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      recordingRef.current = recording;
    } catch (error) {
      console.error("Error starting recording", error);
      setIsRecording(false);
    }
  };

  const evalLabel = useCallback(
    (evalResult: string | null) => {
      if (!evalResult) return null;

      const normalized = evalResult.trim().toLowerCase();

      if (normalized === "evaluating..." || normalized === "evaluating") {
        return isZh ? "正在分析..." : "Listening...";
      }

      if (normalized === "yes" || normalized === "correct" || normalized === "true") {
        return isZh ? "是。" : "Yes.";
      }

      if (normalized === "no" || normalized === "incorrect" || normalized === "false") {
        return isZh ? "不是。" : "No.";
      }

      if (normalized.includes("error")) {
        return isZh ? "评估错误" : "The line went quiet.";
      }

      return evalResult;
    },
    [isZh]
  );

  const uploadAudioForTranscription = async (audioUri: string) => {
    if (!sessionId) {
      setEvaluationResult("Error: No session ID");
      return;
    }

    setEvaluationResult("Evaluating...");

    try {
      const data = await storyApi.transcribeAudio(sessionId, audioUri, language);
      setEvaluationResult(data.evaluation);
      setCompletionPercent(data.completion * 100);
      if (data.completion === 1) {
        if (data.xpGained != null && data.xpGained > 0) {
          setXpGained(data.xpGained);
        }
        setPuzzleSolved(true);
      }
      if (data.leveledUp && data.newLevel != null) {
        setLeveledUp(true);
        setNewLevel(data.newLevel);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`Transcription API Error (${error.code}):`, error.message);
        setEvaluationResult(
          error.code === "NETWORK"
            ? isZh ? "网络错误，请重试" : "Network error. Try again."
            : isZh ? "转录失败" : "We couldn't hear you."
        );
      } else {
        console.error("Error during transcription:", error);
        setEvaluationResult(isZh ? "转录出错" : "Something went wrong.");
      }
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      const recording = recordingRef.current;
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setLastRecordingUri(uri ?? null);

      if (uri) {
        await uploadAudioForTranscription(uri);
      }
      const status = await recording.getStatusAsync();
      if (status.isDoneRecording && status.durationMillis != null) {
        setRecordingDuration(Math.floor(status.durationMillis / 1000));
      }

      recordingRef.current = null;
    } catch (error) {
      console.error("Error stopping recording", error);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  if (authLoading || isLoadingSession || !puzzleData) {
    const loadingMessage = authLoading
      ? isZh ? "正在验证身份..." : "Authenticating..."
      : isZh ? "正在加载..." : "Opening the case...";

    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      </View>
    );
  }

  if (!currentUserId) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.errorCard}>
          <LockIcon size={36} color={colors.primary} />
          <Text style={styles.errorTitle}>{isZh ? "需要登录" : "Locked."}</Text>
          <Text style={styles.errorMessage}>
            {isZh ? "请登录以继续游戏" : "Sign in to continue."}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>{isZh ? "前往登录" : "Enter"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const micStatusText = (() => {
    if (isLoadingSession) return isZh ? "正在初始化..." : "Initializing...";
    if (hasPermission === false) return isZh ? "麦克风权限被拒绝" : "Microphone permission denied";
    if (isRecording) return isZh ? "正在聆听... 点击停止" : "Listening... tap to stop";
    return isZh ? "点击麦克风提问" : "Tap to ask";
  })();

  const localizedTitle = puzzleData.title;
  const localizedContent = puzzleData.content;
  const localizedHint = puzzleData.hint;
  const localizedFullAnswer = puzzleData.fullAnswer;

  const getEvaluationStyle = () => {
    if (!evaluationResult) return {};
    const normalized = evaluationResult.toLowerCase();
    if (normalized === "yes" || normalized === "correct" || normalized === "true") {
      return { backgroundColor: colors.successTint, borderColor: colors.success };
    }
    if (normalized === "no" || normalized === "incorrect" || normalized === "false") {
      return { backgroundColor: colors.errorTint, borderColor: colors.error };
    }
    return {};
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{isZh ? "案件档案" : "CASE FILE"}</Text>
        <Text style={styles.title}>{localizedTitle}</Text>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {isZh ? "接近真相" : "Toward the truth"}
            </Text>
            <Text style={styles.progressPercent}>
              {Math.round(completionPercent)}%
            </Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(Math.max(completionPercent, 0), 100)}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.puzzleCard}>
          <Text style={styles.sectionLabel}>{isZh ? "谜题" : "The puzzle"}</Text>
          <Text style={styles.puzzleContent}>{localizedContent}</Text>
        </View>

        {/* Hint */}
        <View style={styles.toggleSection}>
          <TouchableOpacity
            style={[styles.toggleButton, showHint && styles.toggleButtonActive]}
            onPress={async () => {
              if (showHint) { setShowHint(false); return; }
              setShowHint(true);
              if (sessionId) {
                setIsLoadingHint(true);
                try {
                  const { hint } = await storyApi.getHint(sessionId);
                  setDynamicHint(hint);
                } catch {
                  setDynamicHint(null);
                } finally {
                  setIsLoadingHint(false);
                }
              }
            }}
            activeOpacity={0.7}
          >
            {showHint ? (
              <HintHideIcon size={16} color={colors.textPrimary} />
            ) : (
              <HintIcon size={16} color={colors.textSecondary} />
            )}
            <Text style={[styles.toggleButtonText, showHint && styles.toggleButtonTextActive]}>
              {showHint
                ? isZh ? "隐藏提示" : "Hide hint"
                : isZh ? "显示提示" : "A small hint"}
            </Text>
          </TouchableOpacity>

          {showHint && (
            <View style={styles.revealedContent}>
              {isLoadingHint ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.revealedText}>{dynamicHint ?? localizedHint}</Text>
              )}
            </View>
          )}
        </View>

        {/* Solution */}
        <View style={styles.toggleSection}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              styles.solutionButton,
              showSolution && styles.solutionButtonActive,
            ]}
            onPress={() => setShowSolution((prev) => !prev)}
            activeOpacity={0.7}
          >
            <SolutionIcon
              size={16}
              color={showSolution ? colors.textInverse : colors.primary}
            />
            <Text
              style={[
                styles.toggleButtonText,
                styles.solutionButtonText,
                showSolution && styles.toggleButtonTextActive,
              ]}
            >
              {showSolution
                ? isZh ? "隐藏答案" : "Hide the truth"
                : isZh ? "完整故事" : "The whole truth"}
            </Text>
          </TouchableOpacity>

          {showSolution && (
            <View style={[styles.revealedContent, styles.solutionContent]}>
              <Text style={styles.solutionLabel}>
                {isZh ? "完整故事" : "The full story"}
              </Text>
              <Text style={styles.revealedText}>{localizedFullAnswer}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Evaluation */}
      {evaluationResult && (
        <View style={[styles.evaluationBanner, getEvaluationStyle()]}>
          <Text style={styles.evaluationText}>{evalLabel(evaluationResult)}</Text>
        </View>
      )}

      {/* Solved */}
      <Modal visible={puzzleSolved} transparent animationType="fade">
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayCard}>
            <TruthRevealedIcon size={64} color={colors.primary} />
            <Text style={styles.overlayTitle}>
              {isZh ? "真相大白。" : "The truth, revealed."}
            </Text>
            <Text style={styles.overlaySubtitle}>
              {isZh ? "你看穿了。" : "You saw it."}
            </Text>
            {xpGained != null && xpGained > 0 && (
              <Text style={styles.xpRewardText}>+{xpGained} XP</Text>
            )}
            <TouchableOpacity
              style={styles.overlayButton}
              onPress={() => { setPuzzleSolved(false); navigation.navigate("Home"); }}
              activeOpacity={0.85}
            >
              <Text style={styles.overlayButtonText}>{isZh ? "返回档案" : "Back to cases"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Level Up */}
      <Modal visible={leveledUp} transparent animationType="fade">
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayCard}>
            <AscendIcon size={64} color={colors.primary} />
            <Text style={styles.overlayTitle}>
              {isZh ? "你升级了。" : "You ascend."}
            </Text>
            <Text style={styles.overlaySubtitle}>
              {isZh ? `等级 ${newLevel}` : `Level ${newLevel}`}
            </Text>
            {xpGained != null && xpGained > 0 && (
              <Text style={styles.xpRewardText}>+{xpGained} XP</Text>
            )}
            <TouchableOpacity
              style={styles.overlayButton}
              onPress={() => setLeveledUp(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.overlayButtonText}>{isZh ? "继续" : "Continue"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Voice */}
      <View style={styles.voiceContainer}>
        <Text style={styles.voiceStatusText}>{micStatusText}</Text>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[
              styles.micButton,
              isRecording && styles.micButtonRecording,
              hasPermission === false && styles.micButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={toggleRecording}
            disabled={hasPermission === false}
          >
            {isRecording ? (
              <StopIcon size={24} color={colors.textInverse} />
            ) : (
              <MicIcon size={28} color={colors.textInverse} strokeWidth={2} />
            )}
          </TouchableOpacity>
        </Animated.View>
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>{isZh ? "录音中" : "Live"}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.xl,
    paddingBottom: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    color: colors.textTertiary,
    fontSize: typography.md,
    fontFamily: fonts.serif,
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 320,
  },
  errorTitle: {
    fontSize: typography.xl,
    fontFamily: fonts.serif,
    color: colors.textPrimary,
  },
  errorMessage: {
    fontSize: typography.base,
    fontFamily: fonts.sans,
    color: colors.textMuted,
    textAlign: "center",
  },
  eyebrow: {
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.primary,
    letterSpacing: 2.5,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.xxl,
    fontFamily: fonts.serif,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    lineHeight: 32,
  },
  progressSection: { marginBottom: spacing.xl },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  progressPercent: {
    fontSize: typography.base,
    fontFamily: fonts.mono,
    color: colors.primary,
  },
  progressBarBackground: {
    width: "100%",
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  puzzleCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionLabel: {
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  puzzleContent: {
    fontSize: 17,
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    lineHeight: 27,
    letterSpacing: 0.1,
  },
  toggleSection: { marginBottom: spacing.lg },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButtonActive: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.borderLight,
  },
  solutionButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  solutionButtonActive: { backgroundColor: colors.primary },
  toggleButtonText: {
    fontSize: typography.base,
    fontFamily: fonts.sansMedium,
    color: colors.textSecondary,
  },
  solutionButtonText: { color: colors.primary },
  toggleButtonTextActive: { color: colors.textInverse },
  revealedContent: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  solutionContent: {
    borderColor: colors.primary,
    borderLeftWidth: 3,
  },
  solutionLabel: {
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  revealedText: {
    fontSize: typography.base,
    fontFamily: fonts.serif,
    color: colors.textTertiary,
    lineHeight: 24,
  },
  evaluationBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  evaluationText: {
    fontSize: typography.xl,
    fontFamily: fonts.serif,
    color: colors.textPrimary,
  },
  voiceContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  voiceStatusText: {
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.glow,
  },
  micButtonRecording: { backgroundColor: colors.errorDark },
  micButtonDisabled: { opacity: 0.4 },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  recordingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
  },
  recordingText: {
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.error,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: typography.base,
    fontFamily: fonts.sansSemibold,
    letterSpacing: 1.5,
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
    width: "82%",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  overlayTitle: {
    fontSize: typography.xxl,
    fontFamily: fonts.serif,
    color: colors.textPrimary,
    textAlign: "center",
  },
  overlaySubtitle: {
    fontSize: typography.base,
    fontFamily: fonts.mono,
    color: colors.textMuted,
    textAlign: "center",
    letterSpacing: 1.5,
  },
  xpRewardText: {
    fontSize: typography.lg,
    fontFamily: fonts.mono,
    color: colors.primary,
    letterSpacing: 2,
  },
  overlayButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.full,
  },
  overlayButtonText: {
    color: colors.textInverse,
    fontSize: typography.base,
    fontFamily: fonts.sansSemibold,
    letterSpacing: 1.5,
  },
});

export default GameScreen;

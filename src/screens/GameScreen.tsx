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
import { STATIC_PUZZLES } from "../lib/staticData";
import { colors, spacing, borderRadius, typography, shadows } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Game">;

export const GameScreen: React.FC<Props> = ({ route, navigation }) => {
  const { gameId, puzzleId } = route.params;
  const { user, loading: authLoading, language, isZh } = useAuth();
  const currentUserId = user?.id;

  const [puzzleData, setPuzzleData] = useState<PuzzleDetail | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [dynamicHint, setDynamicHint] = useState<string | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newLevel, setNewLevel] = useState<number | null>(null);
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

  // Pulse animation for recording state
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
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
      setPuzzleData(STATIC_PUZZLES[puzzleId] ?? null);
    })();
  }, [puzzleId]);

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
      const data = await storyApi.startSession(gameId, userId);
      setSessionId(data.sessionId);
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
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();

      recordingRef.current = recording;
    } catch (error) {
      console.error("Error starting recording", error);
      setIsRecording(false);
    }
  };

  const pickLocalized = useCallback(
    (obj: any, baseKey: string) => {
      if (!obj) return "";
      const zhVariants = [
        `${baseKey}_zh`,
        `${baseKey}Zh`,
        `${baseKey}ZH`,
        `${baseKey}_zh_cn`,
        `${baseKey}ZhCN`,
        `${baseKey}_zh_hans`,
        `${baseKey}Zh_Hans`,
      ];
      if (isZh) {
        for (const k of zhVariants) {
          if (obj[k]) return obj[k];
        }
      }
      return obj[baseKey] ?? obj[`${baseKey}_en`] ?? "";
    },
    [isZh]
  );

  const evalLabel = useCallback(
    (evalResult: string | null) => {
      if (!evalResult) return null;

      const normalized = evalResult.trim().toLowerCase();

      if (normalized === "evaluating..." || normalized === "evaluating") {
        return isZh ? "正在分析你的问题..." : "Analyzing your question...";
      }

      if (normalized === "yes" || normalized === "correct" || normalized === "true") {
        return isZh ? "是的！" : "YES!";
      }

      if (normalized === "no" || normalized === "incorrect" || normalized === "false") {
        return isZh ? "不是" : "NO";
      }

      if (normalized.includes("error")) {
        return isZh ? "评估错误" : "Error evaluating";
      }

      return isZh ? `${evalResult}` : `${evalResult.toUpperCase()}`;
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
            ? isZh
              ? "网络错误，请重试"
              : "Network error, please retry"
            : isZh
            ? "转录失败"
            : "Transcription failed"
        );
      } else {
        console.error("Error during transcription:", error);
        setEvaluationResult(isZh ? "转录出错" : "Error during transcription");
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

  // Loading state
  if (authLoading || isLoadingSession || !puzzleData) {
    const loadingMessage = authLoading
      ? isZh
        ? "正在验证用户身份..."
        : "Authenticating..."
      : isZh
      ? "正在加载谜题..."
      : "Loading puzzle...";

    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      </View>
    );
  }

  // Not logged in
  if (!currentUserId) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>🔒</Text>
          <Text style={styles.errorTitle}>
            {isZh ? "需要登录" : "Login Required"}
          </Text>
          <Text style={styles.errorMessage}>
            {isZh ? "请登录以继续游戏" : "Please log in to continue playing"}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {isZh ? "前往登录" : "Go to Login"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const micStatusText = (() => {
    if (isLoadingSession)
      return isZh ? "正在初始化..." : "Initializing...";
    if (hasPermission === false)
      return isZh ? "麦克风权限被拒绝" : "Microphone permission denied";
    if (isRecording)
      return isZh ? "正在录音... 点击停止" : "Recording... tap to stop";
    return isZh ? "点击麦克风提问" : "Tap to ask a question";
  })();

  const localizedTitle =
    pickLocalized(puzzleData as any, "title") || puzzleData.title;
  const localizedContent =
    pickLocalized(puzzleData as any, "content") || puzzleData.content;
  const localizedHint =
    pickLocalized(puzzleData as any, "hint") || puzzleData.hint;
  const localizedFullAnswer =
    pickLocalized(puzzleData as any, "fullAnswer") || puzzleData.fullAnswer;

  const getEvaluationStyle = () => {
    if (!evaluationResult) return {};
    const normalized = evaluationResult.toLowerCase();
    if (normalized === "yes" || normalized === "correct" || normalized === "true") {
      return { backgroundColor: "rgba(16, 185, 129, 0.15)", borderColor: colors.success };
    }
    if (normalized === "no" || normalized === "incorrect" || normalized === "false") {
      return { backgroundColor: "rgba(248, 113, 113, 0.15)", borderColor: colors.error };
    }
    return {};
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.title}>{localizedTitle}</Text>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {isZh ? "进度" : "Progress"}
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

        {/* Puzzle Content */}
        <View style={styles.puzzleCard}>
          <Text style={styles.sectionLabel}>{isZh ? "谜题" : "Puzzle"}</Text>
          <Text style={styles.puzzleContent}>{localizedContent}</Text>
        </View>

        {/* Hint Section */}
        <View style={styles.toggleSection}>
          <TouchableOpacity
            style={[styles.toggleButton, showHint && styles.toggleButtonActive]}
            onPress={async () => {
              if (showHint) {
                setShowHint(false);
                return;
              }
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
            <Text style={styles.toggleIcon}>{showHint ? "🙈" : "💡"}</Text>
            <Text
              style={[
                styles.toggleButtonText,
                showHint && styles.toggleButtonTextActive,
              ]}
            >
              {showHint
                ? isZh ? "隐藏提示" : "Hide Hint"
                : isZh ? "显示提示" : "Show Hint"}
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

        {/* Solution Section */}
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
            <Text style={styles.toggleIcon}>{showSolution ? "🙈" : "📖"}</Text>
            <Text
              style={[
                styles.toggleButtonText,
                styles.solutionButtonText,
                showSolution && styles.toggleButtonTextActive,
              ]}
            >
              {showSolution
                ? isZh
                  ? "隐藏答案"
                  : "Hide Solution"
                : isZh
                ? "显示完整故事"
                : "Reveal Full Story"}
            </Text>
          </TouchableOpacity>

          {showSolution && (
            <View style={[styles.revealedContent, styles.solutionContent]}>
              <Text style={styles.solutionLabel}>
                {isZh ? "完整故事" : "Full Story"}
              </Text>
              <Text style={styles.revealedText}>{localizedFullAnswer}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Evaluation Result */}
      {evaluationResult && (
        <View style={[styles.evaluationBanner, getEvaluationStyle()]}>
          <Text style={styles.evaluationText}>{evalLabel(evaluationResult)}</Text>
        </View>
      )}

      {/* Puzzle Solved Modal */}
      <Modal visible={puzzleSolved} transparent animationType="fade">
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayEmoji}>🎉</Text>
            <Text style={styles.overlayTitle}>
              {isZh ? "谜题解开了！" : "Puzzle Solved!"}
            </Text>
            <Text style={styles.overlaySubtitle}>
              {isZh ? "恭喜你完成了这个谜题" : "You figured it out!"}
            </Text>
            <TouchableOpacity
              style={styles.overlayButton}
              onPress={() => {
                setPuzzleSolved(false);
                navigation.navigate("Home");
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.overlayButtonText}>
                {isZh ? "返回主页" : "Back to Home"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Level Up Modal */}
      <Modal visible={leveledUp} transparent animationType="fade">
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayEmoji}>⬆️</Text>
            <Text style={styles.overlayTitle}>
              {isZh ? "升级了！" : "Level Up!"}
            </Text>
            <Text style={styles.overlaySubtitle}>
              {isZh ? `你现在是等级 ${newLevel}` : `You are now Level ${newLevel}`}
            </Text>
            <TouchableOpacity
              style={styles.overlayButton}
              onPress={() => setLeveledUp(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.overlayButtonText}>
                {isZh ? "继续" : "Continue"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Voice Control */}
      <View style={styles.voiceContainer}>
        <Text style={styles.voiceStatusText}>{micStatusText}</Text>

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[
              styles.micButton,
              isRecording && styles.micButtonRecording,
              hasPermission === false && styles.micButtonDisabled,
            ]}
            activeOpacity={0.8}
            onPress={toggleRecording}
            disabled={hasPermission === false}
          >
            <Text style={styles.micIcon}>{isRecording ? "⏹️" : "🎤"}</Text>
          </TouchableOpacity>
        </Animated.View>

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>
              {isZh ? "录音中" : "Recording"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 300,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  errorTitle: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  errorMessage: {
    fontSize: typography.base,
    color: colors.textMuted,
    textAlign: "center",
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  progressSection: {
    marginBottom: spacing.xl,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: typography.sm,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressPercent: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
  progressBarBackground: {
    width: "100%",
    height: 8,
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
    fontSize: typography.sm,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  puzzleContent: {
    fontSize: typography.lg,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  toggleSection: {
    marginBottom: spacing.lg,
  },
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
    backgroundColor: "rgba(249, 115, 22, 0.1)",
  },
  solutionButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleIcon: {
    fontSize: 18,
  },
  toggleButtonText: {
    fontSize: typography.base,
    color: colors.textTertiary,
    fontWeight: typography.medium,
  },
  solutionButtonText: {
    color: colors.primary,
  },
  toggleButtonTextActive: {
    color: colors.textPrimary,
  },
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
    fontSize: typography.sm,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  revealedText: {
    fontSize: typography.base,
    color: colors.textTertiary,
    lineHeight: 22,
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
    fontSize: typography.lg,
    fontWeight: typography.bold,
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
    fontSize: typography.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.lg,
  },
  micButtonRecording: {
    backgroundColor: colors.errorDark,
  },
  micButtonDisabled: {
    opacity: 0.4,
  },
  micIcon: {
    fontSize: 28,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.errorDark,
  },
  recordingText: {
    fontSize: typography.sm,
    color: colors.error,
    fontWeight: typography.medium,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
    width: "78%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  overlayEmoji: {
    fontSize: 52,
  },
  overlayTitle: {
    fontSize: typography.xl,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
  },
  overlaySubtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
  overlayButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.full,
  },
  overlayButtonText: {
    color: "#fff",
    fontSize: typography.base,
    fontWeight: "700",
  },
});

export default GameScreen;
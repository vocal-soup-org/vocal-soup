// src/screens/HomeScreen.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";
import { RootStackParamList } from "../../App";
import { useAuth } from "../context/AuthContext";
import { storyApi, type Game, type UserProfile } from "../lib/api";
import { STATIC_GAMES } from "../lib/staticData";
import { colors, spacing, borderRadius, typography, fonts, shadows } from "../theme";
import { LockIcon, ReticleIcon, SettingsIcon } from "../icons";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - spacing.lg * 3) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

const GAME_IMAGES: Record<string, any> = {
  g_threeBrothers_01: require("../../assets/images/Gemini_Generated_Image_pahd7qpahd7qpahd.png"),
  g_celebrityHats_02: require("../../assets/images/Gemini_Generated_Image_x2ju71x2ju71x2ju.png"),
};

// CIPHER: all cards share one near-black; case art differentiates.
const CARD_BG = "#15151E";

// Cumulative XP required to reach each level
const XP_THRESHOLDS: Record<number, number> = { 2: 100, 3: 300, 4: 600, 5: 1000 };

function getNextLevelThreshold(level: number): number | null {
  return XP_THRESHOLDS[level + 1] ?? null;
}

function LoadingScreen() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 0.85,
      duration: 2200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.loadingScreen}>
      <Text style={styles.loadingTitle}>CASES</Text>
      <View style={styles.progressBarTrack}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.loadingLabel}>Opening files...</Text>
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, loading: authLoading, language, isZh } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const isFocused = useIsFocused();
  const languageRef = useRef(language);
  useEffect(() => { languageRef.current = language; }, [language]);

  useEffect(() => {
    if (authLoading || !isFocused) return;

    let cancelled = false;
    const lang = languageRef.current;

    const loadGames = async () => {
      try {
        setLoading(true);

        if (!user?.id) {
          if (!cancelled) setGames(STATIC_GAMES);
          return;
        }

        const [allGames, userGames, profile] = await Promise.all([
          storyApi.getGames(lang),
          storyApi.getUserGames(user.id, lang),
          storyApi.getUserProfile(user.id),
        ]);

        const merged = allGames.map((game) => {
          const userStatus = userGames.find((s) => s.gameId === game.id);
          return {
            ...game,
            status: userStatus?.locked ? ("locked" as const) : game.status,
            completed: userStatus?.completed ?? false,
          };
        });

        if (!cancelled) {
          setGames(merged);
          setUserProfile(profile);
        }
      } catch (err: any) {
        console.error("Failed to load games:", err);
        if (!cancelled) setGames([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadGames();
    return () => { cancelled = true; };
  }, [authLoading, isFocused, user?.id]);

  const handleCardPress = (item: Game) => {
    if (item.status !== "available" || !item.puzzleId) return;
    setSelectedGame(item);
  };

  const handlePlay = () => {
    if (!selectedGame) return;
    setSelectedGame(null);

    if (!user) {
      navigation.navigate("Login", {
        gameId: selectedGame.id,
        puzzleId: selectedGame.puzzleId,
      });
      return;
    }

    navigation.navigate("Game", {
      gameId: selectedGame.id,
      puzzleId: selectedGame.puzzleId,
    });
  };

  const renderCardInner = (item: Game, isLocked: boolean) => (
    <>
      {isLocked && <View style={styles.lockedOverlay} />}
      {item.completed && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedBadgeText}>✓</Text>
        </View>
      )}
      <View style={styles.cardCenter}>
        {isLocked &&
          (item.status === "premium" ? (
            <ReticleIcon size={28} color={colors.primary} strokeWidth={1.5} />
          ) : (
            <LockIcon size={26} color={colors.textTertiary} strokeWidth={1.5} />
          ))}
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{item.level}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.genreText} numberOfLines={1}>
            {isZh && item.genreZh ? item.genreZh : item.genre}
          </Text>
          <View style={styles.cardMetaBottom}>
            <Text style={styles.introText} numberOfLines={1}>
              {isZh && item.shortIntroZh ? item.shortIntroZh : item.shortIntro}
            </Text>
            {item.experience != null && (
              <Text style={styles.cardXpText}>+{item.experience}</Text>
            )}
          </View>
        </View>
      </View>
    </>
  );

  const renderCard = ({ item, index }: { item: Game; index: number }) => {
    const isLocked = item.status === "locked" || item.status === "premium";
    const cardStyle = [styles.card, { backgroundColor: CARD_BG }];
    const localImage = GAME_IMAGES[item.id];

    return (
      <TouchableOpacity
        activeOpacity={isLocked ? 1 : 0.85}
        onPress={() => handleCardPress(item)}
      >
        {localImage ? (
          <ImageBackground source={localImage} style={cardStyle} imageStyle={styles.cardImage}>
            {renderCardInner(item, isLocked)}
          </ImageBackground>
        ) : (
          <View style={cardStyle}>{renderCardInner(item, isLocked)}</View>
        )}
      </TouchableOpacity>
    );
  };

  const playButtonLabel = !user
    ? isZh ? "登录以游戏" : "Sign in to Play"
    : isZh ? "进入" : "Enter";

  return (
    <View style={styles.container}>
      <Modal
        visible={selectedGame !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedGame(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedGame(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {selectedGame && GAME_IMAGES[selectedGame.id] ? (
              <Image source={GAME_IMAGES[selectedGame.id]} style={styles.modalImage} />
            ) : (
              <View style={styles.modalImagePlaceholder} />
            )}
            <View style={styles.modalContent}>
              <Text style={styles.modalGenre}>
                {isZh && selectedGame?.genreZh ? selectedGame.genreZh : selectedGame?.genre}
              </Text>
              <Text style={styles.modalIntro}>
                {isZh && selectedGame?.shortIntroZh ? selectedGame.shortIntroZh : selectedGame?.shortIntro}
              </Text>
              <TouchableOpacity
                style={styles.modalPlayButton}
                onPress={handlePlay}
                activeOpacity={0.85}
              >
                <Text style={styles.modalPlayText}>{playButtonLabel}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.appTitle}>{isZh ? "档案" : "CASES"}</Text>
        {user ? (
          <>
            {userProfile && (
              <View style={styles.userLevelBadge}>
                <Text style={styles.userLevelText}>LV {userProfile.level}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate("Settings")}
              activeOpacity={0.7}
            >
              <SettingsIcon size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>{isZh ? "登录" : "Log In"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {user && userProfile && (() => {
        const nextThreshold = getNextLevelThreshold(userProfile.level);
        if (nextThreshold == null) return null;
        const xpPercent = Math.min((userProfile.experience / nextThreshold) * 100, 100);
        return (
          <View style={styles.xpSection}>
            <View style={styles.xpRow}>
              <Text style={styles.xpBarLabel}>
                {userProfile.experience} / {nextThreshold} XP
              </Text>
            </View>
            <View style={styles.xpBarTrack}>
              <View style={[styles.xpBarFill, { width: `${xpPercent}%` as any }]} />
            </View>
          </View>
        );
      })()}

      {loading || authLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={renderCard}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.lg,
  },
  appTitle: {
    fontSize: typography.lg,
    fontFamily: fonts.mono,
    color: colors.textPrimary,
    letterSpacing: 4,
  },
  userLevelBadge: {
    position: "absolute",
    left: spacing.lg,
    top: spacing.xxl + spacing.lg + 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  userLevelText: {
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.primary,
    letterSpacing: 1,
  },
  settingsButton: {
    position: "absolute",
    right: spacing.lg,
    top: spacing.xxl + spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  loginButton: {
    position: "absolute",
    right: spacing.lg,
    top: spacing.xxl + spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  loginButtonText: {
    fontSize: typography.sm,
    fontFamily: fonts.sansSemibold,
    color: colors.textInverse,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  loadingTitle: {
    fontSize: typography.xxl,
    fontFamily: fonts.mono,
    color: colors.textPrimary,
    letterSpacing: 4,
    marginBottom: spacing.sm,
  },
  progressBarTrack: {
    width: "100%",
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 1,
    backgroundColor: colors.primary,
  },
  loadingLabel: {
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm,
  },
  row: { gap: spacing.lg, marginBottom: spacing.lg },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    justifyContent: "space-between",
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardImage: { borderRadius: borderRadius.xl },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,15,0.72)",
  },
  completedBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  completedBadgeText: {
    fontSize: 12,
    fontFamily: fonts.sansBold,
    color: colors.textInverse,
  },
  cardCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  cardBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  levelBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  levelText: {
    fontSize: typography.sm,
    fontFamily: fonts.mono,
    color: colors.textPrimary,
  },
  cardMeta: { flex: 1, gap: 2 },
  cardMetaBottom: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardXpText: {
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.primary,
    opacity: 0.7,
    flexShrink: 0,
  },
  genreText: {
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  introText: {
    fontSize: typography.xs,
    fontFamily: fonts.serif,
    color: "rgba(245,245,240,0.55)",
  },
  xpSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  xpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  xpBarLabel: {
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.primary,
    letterSpacing: 1,
  },
  xpNextLabel: {
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  xpBarTrack: {
    width: "100%",
    height: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    width: width * 0.82,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  modalImage: { width: "100%", height: 180 },
  modalImagePlaceholder: { width: "100%", height: 180, backgroundColor: colors.surfaceLight },
  modalContent: { padding: spacing.xl, alignItems: "center", gap: spacing.sm },
  modalGenre: {
    fontSize: typography.xs,
    fontFamily: fonts.mono,
    color: colors.primary,
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  modalIntro: {
    fontSize: typography.lg,
    fontFamily: fonts.serif,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 26,
  },
  modalPlayButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    borderRadius: borderRadius.full,
  },
  modalPlayText: {
    color: colors.textInverse,
    fontSize: typography.base,
    fontFamily: fonts.sansSemibold,
    letterSpacing: 2,
  },
});

export default HomeScreen;

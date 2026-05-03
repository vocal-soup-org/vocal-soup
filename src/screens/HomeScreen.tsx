// src/screens/HomeScreen.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  ImageBackground,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { useAuth } from "../context/AuthContext";
import { storyApi, type Game, type UserProfile } from "../lib/api";
import { STATIC_GAMES } from "../lib/staticData";
import { colors, spacing, borderRadius, typography } from "../theme";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - spacing.lg * 3) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

const GAME_IMAGES: Record<string, any> = {
  g_threeBrothers_01: require("../../assets/images/Gemini_Generated_Image_pahd7qpahd7qpahd.png"),
  g_celebrityHats_02: require("../../assets/images/Gemini_Generated_Image_x2ju71x2ju71x2ju.png"),
};

const CARD_COLORS = [
  "#1B3A2D",
  "#2A1F3D",
  "#1A2E3D",
  "#3D1F2A",
  "#2D2A1A",
  "#1A2D2D",
  "#2D1A1A",
  "#1F2A3D",
];


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
      <Text style={styles.loadingTitle}>Puzzles</Text>
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
      <Text style={styles.loadingLabel}>Loading games...</Text>
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, loading: authLoading, isZh } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    if (authLoading) return;

    const loadGames = async () => {
      try {
        setLoading(true);

        if (!user?.id) {
          // Guest: show static catalog without user-specific status
          setGames(STATIC_GAMES);
          return;
        }

        // Authenticated: merge server status (locked/completed) into games
        const [userGames, profile] = await Promise.all([
          storyApi.getUserGames(user.id),
          storyApi.getUserProfile(user.id),
        ]);

        const merged = STATIC_GAMES.map((game) => {
          const userStatus = userGames.find((s) => s.gameId === game.id);
          return {
            ...game,
            status: userStatus?.locked ? ("locked" as const) : game.status,
            completed: userStatus?.completed ?? false,
          };
        });

        setGames(merged);
        setUserProfile(profile);
      } catch (err: any) {
        console.error("Failed to load games:", err);
        setGames(STATIC_GAMES);
      } finally {
        setLoading(false);
      }
    };

    loadGames();
  }, [authLoading, user?.id]);

  const handleCardPress = (item: Game) => {
    if (item.status !== "available" || !item.puzzleId) return;
    setSelectedGame(item);
  };

  const handlePlay = () => {
    if (!selectedGame) return;
    setSelectedGame(null);

    if (!user) {
      // Prompt login, passing game params so we land on the game after auth
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
        {isLocked && (
          <Text style={styles.lockIcon}>
            {item.status === "premium" ? "★" : "🔒"}
          </Text>
        )}
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{item.level}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.genreText} numberOfLines={1}>
            {item.genre}
          </Text>
          <Text style={styles.introText} numberOfLines={1}>
            {item.shortIntro}
          </Text>
        </View>
      </View>
    </>
  );

  const renderCard = ({ item, index }: { item: Game; index: number }) => {
    const bgColor = CARD_COLORS[index % CARD_COLORS.length];
    const isLocked = item.status === "locked" || item.status === "premium";
    const cardStyle = [styles.card, { backgroundColor: bgColor }];
    const localImage = GAME_IMAGES[item.id];

    return (
      <TouchableOpacity
        activeOpacity={isLocked ? 1 : 0.8}
        onPress={() => handleCardPress(item)}
      >
        {localImage ? (
          <ImageBackground
            source={localImage}
            style={cardStyle}
            imageStyle={styles.cardImage}
          >
            {renderCardInner(item, isLocked)}
          </ImageBackground>
        ) : (
          <View style={cardStyle}>
            {renderCardInner(item, isLocked)}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const playButtonLabel = !user
    ? isZh ? "登录以游戏" : "Sign in to Play"
    : isZh ? "开始" : "Play";

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
              <Text style={styles.modalGenre}>{selectedGame?.genre}</Text>
              <Text style={styles.modalIntro}>{selectedGame?.shortIntro}</Text>
              <TouchableOpacity
                style={styles.modalPlayButton}
                onPress={handlePlay}
                activeOpacity={0.8}
              >
                <Text style={styles.modalPlayText}>{playButtonLabel}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.appTitle}>{isZh ? "谜题" : "Puzzles"}</Text>
        {user ? (
          <>
            {userProfile && (
              <View style={styles.userLevelBadge}>
                <Text style={styles.userLevelText}>LV{userProfile.level}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate("Settings")}
              activeOpacity={0.7}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.lg,
  },
  appTitle: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  userLevelBadge: {
    position: "absolute",
    left: spacing.lg,
    top: spacing.xxl + spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
  },
  userLevelText: {
    fontSize: typography.xs,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
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
  settingsIcon: {
    fontSize: 18,
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
    fontWeight: typography.semibold,
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm,
  },
  row: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  cardImage: {
    borderRadius: borderRadius.xl,
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
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  progressBarTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  loadingLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    fontWeight: "800",
    color: "#fff",
  },
  cardCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lockIcon: {
    fontSize: 28,
    opacity: 0.7,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  levelBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  levelText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  cardMeta: {
    flex: 1,
    gap: 2,
  },
  genreText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  introText: {
    fontSize: typography.xs,
    color: "rgba(255,255,255,0.6)",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    width: width * 0.78,
    overflow: "hidden",
  },
  modalImage: {
    width: "100%",
    height: 180,
  },
  modalImagePlaceholder: {
    width: "100%",
    height: 180,
    backgroundColor: colors.border,
  },
  modalContent: {
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  modalGenre: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  modalIntro: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  modalPlayButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.full,
  },
  modalPlayText: {
    color: colors.background,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
});

export default HomeScreen;

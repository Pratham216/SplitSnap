import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Button,
  Card,
  MobileHeader,
  ScreenContainer,
} from "../components";
import { joinRoom } from "../api/rooms";
import { getRecentRooms, saveRoom, type RoomEntry } from "../lib/history";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { colors, fontSize, radius, spacing } from "../theme";
import { formatSavedAt } from "../lib/formatters";
import type { RootStackParamList } from "../navigation/AppNavigator";

export default function JoinTabScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [step, setStep] = useState<"code" | "name">("code");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentRooms, setRecentRooms] = useState<RoomEntry[]>([]);

  useEffect(() => {
    void getRecentRooms().then(setRecentRooms);
  }, []);

  useEffect(() => {
    if (user?.name && !name) {
      setName(user.name);
    }
  }, [user?.name, name]);

  function handleCodeContinue() {
    const trimmed = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (!trimmed) {
      toast.warning("Please enter a room code");
      return;
    }
    setCode(trimmed);
    setStep("name");
    setError(null);
  }

  async function handlePasteClipboard() {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text?.trim()) {
        toast.info("Clipboard is empty");
        return;
      }
      // Extract code if user pasted a join URL (e.g. https://zaptab.netlify.app/join/6NJ3JK)
      const match = text.match(/\/join\/([a-zA-Z0-9_-]+)/i);
      const raw = match ? match[1] : text;
      const extractedCode = raw
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);

      if (extractedCode) {
        setCode(extractedCode);
        toast.success(`Pasted code: ${extractedCode}`);
      } else {
        toast.warning("Could not find a valid room code in clipboard");
      }
    } catch {
      toast.error("Failed to read clipboard");
    }
  }

  async function handleJoin(targetCode?: string) {
    const activeCode = (targetCode || code)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    const activeName = name.trim() || user?.name?.trim() || "Guest";

    if (!activeCode) {
      toast.warning("Please enter a room code");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { room } = await joinRoom(activeCode, activeName);
      await saveRoom({
        code: room.code,
        role: "guest",
        restaurantName: room.bill?.restaurantName,
      });
      toast.success(`Joined ${room.bill?.restaurantName || "room"}!`);
      navigation.navigate("Room", { code: room.code });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to join room";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectRecentRoom(r: RoomEntry) {
    const cleaned = r.code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(cleaned);
    if (user?.name || name.trim()) {
      void handleJoin(cleaned);
    } else {
      setStep("name");
    }
  }

  return (
    <ScreenContainer contentStyle={styles.container} edges={["top"]}>
      <MobileHeader
        title="Join a Bill"
        goldTitle
        subtitle="Enter room code or paste an invite link"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {/* Main Interactive Join Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {step === "code" ? "Enter Room Code" : "Confirm Your Name"}
            </Text>
            <Text style={styles.cardSubtitle}>
              {step === "code"
                ? "Ask your friend for their 6-letter split code"
                : "How your friends will see you in this room"}
            </Text>
          </View>

          {step === "code" ? (
            <View style={styles.inputSection}>
              <View style={styles.codeRow}>
                <TextInput
                  value={code}
                  onChangeText={(t) =>
                    setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
                  }
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="ABC123"
                  placeholderTextColor={colors.textMuted}
                  maxLength={6}
                  style={styles.codeInput}
                  selectionColor={colors.gold}
                />
                <Pressable
                  onPress={handlePasteClipboard}
                  style={({ pressed }) => [
                    styles.pasteBtn,
                    pressed && styles.pasteBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Paste from clipboard"
                >
                  <Ionicons name="clipboard-outline" size={15} color={colors.gold} />
                  <Text style={styles.pasteBtnText}>Paste</Text>
                </Pressable>
              </View>

              <Button
                label="Continue"
                fullWidth
                disabled={code.trim().length !== 6}
                onPress={handleCodeContinue}
              />
            </View>
          ) : (
            <View style={styles.inputSection}>
              <View style={styles.roomTag}>
                <View style={styles.roomDot} />
                <Text style={styles.roomTagText}>
                  Target Room: <Text style={styles.roomTagCode}>{code}</Text>
                </Text>
              </View>

              <View style={styles.nameWrap}>
                <Text style={styles.inputLabel}>Your Name</Text>
                <View style={styles.nameInputRow}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={colors.textMuted}
                    style={styles.nameIcon}
                  />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.textMuted}
                    style={styles.nameInput}
                    selectionColor={colors.gold}
                  />
                </View>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button
                label="Join Split Session"
                fullWidth
                loading={loading}
                disabled={loading || !name.trim()}
                onPress={() => void handleJoin()}
              />

              <Button
                label="Change room code"
                variant="ghost"
                fullWidth
                disabled={loading}
                onPress={() => {
                  setStep("code");
                  setError(null);
                }}
              />
            </View>
          )}
        </View>

        {/* Recent Sessions Section */}
        {recentRooms.length > 0 ? (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeading}>Recent Split Rooms</Text>
            <View style={styles.recentList}>
              {recentRooms.slice(0, 3).map((r) => (
                <Pressable
                  key={r.code}
                  onPress={() => handleSelectRecentRoom(r)}
                  style={({ pressed }) => [
                    styles.recentRow,
                    pressed && styles.recentRowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Join room ${r.code}`}
                >
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentTitle}>
                      {r.restaurantName || "Split Room"}
                    </Text>
                    <Text style={styles.recentMeta}>
                      Code: <Text style={styles.recentCode}>{r.code}</Text>
                      {r.savedAt ? ` · ${formatSavedAt(r.savedAt)}` : ""}
                    </Text>
                  </View>
                  <View style={styles.rejoinChip}>
                    <Text style={styles.rejoinText}>Rejoin</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.gold} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* How It Works Guide */}
        <View style={styles.guideCard}>
          <Text style={styles.guideHeading}>How ZapTab Splitting Works</Text>
          <View style={styles.stepsList}>
            <View style={styles.stepItem}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>1</Text>
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>Enter Room Code</Text>
                <Text style={styles.stepDesc}>
                  Type the 6-character code or scan the host's QR code.
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>2</Text>
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>Select What You Had</Text>
                <Text style={styles.stepDesc}>
                  Claim dishes with live sync — tax & tip are split fairly.
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>3</Text>
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>Instant UPI Settle</Text>
                <Text style={styles.stepDesc}>
                  Pay your exact share directly to the host with 1 tap.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.md,
  },
  scrollList: {
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.15)",
    padding: spacing.xl,
    gap: spacing.lg,
    ...(Platform.OS === "web"
      ? ({
          boxShadow: "0 6px 24px rgba(0, 0, 0, 0.35)",
        } as const)
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 4,
        }),
  },
  cardHeader: {
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  inputSection: {
    gap: spacing.md,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    minHeight: 52,
    gap: spacing.xs,
    overflow: "hidden",
  },
  codeInput: {
    flex: 1,
    minWidth: 0,
    color: colors.gold,
    fontSize: fontSize.xl,
    fontFamily: "monospace",
    fontWeight: "700",
    letterSpacing: 4,
    paddingVertical: spacing.sm,
    textAlign: "left",
    ...(Platform.OS === "web"
      ? ({
          outlineWidth: 0,
          outlineColor: "transparent",
          outlineStyle: "none",
          borderWidth: 0,
        } as any)
      : {}),
  },
  pasteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.goldMuted,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    flexShrink: 0,
  },
  pasteBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  pasteBtnText: {
    color: colors.gold,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  roomTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.goldMuted,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  roomDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  roomTagText: {
    color: colors.goldLight,
    fontSize: fontSize.xs,
  },
  roomTagCode: {
    color: colors.gold,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  nameWrap: {
    gap: spacing.xs,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  nameInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  nameIcon: {
    marginRight: spacing.sm,
  },
  nameInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    paddingVertical: spacing.sm,
    ...(Platform.OS === "web"
      ? ({
          outlineWidth: 0,
          outlineColor: "transparent",
          outlineStyle: "none",
          borderWidth: 0,
        } as any)
      : {}),
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  sectionWrap: {
    gap: spacing.md,
  },
  sectionHeading: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  recentList: {
    gap: spacing.sm,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  recentRowPressed: {
    borderColor: colors.goldBorder,
    backgroundColor: colors.goldMuted,
    transform: [{ scale: 0.985 }],
  },
  recentInfo: {
    flex: 1,
    gap: 2,
  },
  recentTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.sm + 1,
    fontWeight: "600",
  },
  recentMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  recentCode: {
    color: colors.gold,
    fontFamily: "monospace",
    fontWeight: "700",
  },
  rejoinChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.goldMuted,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  rejoinText: {
    color: colors.gold,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  guideCard: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  guideHeading: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  stepsList: {
    gap: spacing.md,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNumText: {
    color: colors.gold,
    fontSize: fontSize.xs,
    fontWeight: "800",
  },
  stepBody: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  stepDesc: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
});

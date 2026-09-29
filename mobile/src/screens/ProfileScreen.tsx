import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import {
  Button,
  Card,
  MobileHeader,
  ScreenContainer,
  SupportSheet,
  ZapTabWordmark,
} from "../components";
import { updateUserUpi } from "../api/users";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { isValidUpiId } from "@zaptab/shared";
import packageJson from "../../package.json";
import { colors, fontSize, radius, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/AppNavigator";

const APP_VERSION =
  Constants.expoConfig?.version ||
  (Constants as any).manifest?.version ||
  packageJson.version ||
  "1.0.3";

interface ReleaseInfo {
  tagName: string;
  version: string;
  downloadUrl: string;
  releaseUrl: string;
  hasUpdate: boolean;
}

function parseSemver(v: string) {
  const cleaned = v.replace(/^v/, "").trim();
  const parts = cleaned.split(".").map((p) => parseInt(p, 10) || 0);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

function isNewerVersion(latest: string, current: string): boolean {
  const l = parseSemver(latest);
  const c = parseSemver(current);
  if (l.major !== c.major) return l.major > c.major;
  if (l.minor !== c.minor) return l.minor > c.minor;
  return l.patch > c.patch;
}

export default function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut, completeOnboarding } = useAuth();
  const toast = useToast();
  const [supportOpen, setSupportOpen] = useState(false);
  const [editingUpi, setEditingUpi] = useState(false);
  const [upiDraft, setUpiDraft] = useState(user?.upiId ?? "");
  const [upiSaving, setUpiSaving] = useState(false);
  const [upiError, setUpiError] = useState<string | null>(null);

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);

  const initial = (user?.name || user?.email || "?").slice(0, 1).toUpperCase();
  const supportUser = { name: user?.name, email: user?.email };

  const checkForUpdates = async (manual = false) => {
    setCheckingUpdate(true);
    try {
      const res = await fetch(
        "https://api.github.com/repos/Pratham216/ZapTab/releases/latest",
        { headers: { Accept: "application/vnd.github.v3+json" } }
      );
      if (!res.ok) {
        if (manual) toast.error("Could not fetch latest version info");
        return;
      }
      const data = await res.json();
      const tagName = data.tag_name || "";
      const apkAsset = data.assets?.find((a: { name: string }) =>
        a.name.endsWith(".apk")
      );
      const downloadUrl =
        apkAsset?.browser_download_url ||
        data.html_url ||
        "https://github.com/Pratham216/ZapTab/releases";
      const releaseUrl =
        data.html_url || "https://github.com/Pratham216/ZapTab/releases";
      const hasUpdate = isNewerVersion(tagName, APP_VERSION);

      const info: ReleaseInfo = {
        tagName,
        version: tagName.replace(/^v/, ""),
        downloadUrl,
        releaseUrl,
        hasUpdate,
      };

      setReleaseInfo(info);

      if (manual) {
        if (hasUpdate) {
          toast.info(`New version available: ${tagName}`);
        } else {
          toast.success("You are on the latest version!");
        }
      }
    } catch {
      if (manual) toast.error("Failed to check for updates");
    } finally {
      setCheckingUpdate(false);
    }
  };

  useEffect(() => {
    void checkForUpdates(false);
  }, []);

  return (
    <ScreenContainer scroll contentStyle={styles.container} edges={["top"]}>
      <MobileHeader title="Settings" subtitle="your account & app" />

      <View style={styles.avatarSection}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </View>
        </View>
        <ZapTabWordmark size="md" />
        <Text style={styles.userName}>{user?.name || "ZapTab user"}</Text>
        {user?.email ? <Text style={styles.userEmail}>{user.email}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Card>
          <Row label="Name" value={user?.name || "—"} />
          <View style={styles.divider} />
          <Row label="Email" value={user?.email || "—"} />
          <View style={styles.divider} />
          {editingUpi ? (
            <View style={styles.upiEditRow}>
              <View style={styles.upiEditField}>
                <Text style={styles.rowLabel}>UPI ID</Text>
                <TextInput
                  style={styles.upiInput}
                  value={upiDraft}
                  onChangeText={(v) => { setUpiDraft(v); setUpiError(null); }}
                  placeholder="you@ybl"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  selectionColor={colors.gold}
                  autoFocus
                />
                {upiError ? <Text style={styles.upiError}>{upiError}</Text> : null}
              </View>
              <View style={styles.upiEditActions}>
                <Pressable
                  onPress={async () => {
                    const trimmed = upiDraft.trim();
                    if (trimmed && !isValidUpiId(trimmed)) {
                      setUpiError("Use format: name@bank (e.g. you@ybl)");
                      return;
                    }
                    setUpiSaving(true);
                    setUpiError(null);
                    try {
                      const updated = await updateUserUpi(trimmed);
                      completeOnboarding(updated);
                      setEditingUpi(false);
                      toast.success("UPI ID updated!");
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : "Failed to save";
                      setUpiError(msg);
                      toast.error(msg);
                    } finally {
                      setUpiSaving(false);
                    }
                  }}
                  style={styles.upiSaveBtn}
                  disabled={upiSaving}
                >
                  <Ionicons name="checkmark" size={18} color={upiSaving ? colors.textMuted : colors.success} />
                </Pressable>
                <Pressable onPress={() => { setEditingUpi(false); setUpiDraft(user?.upiId ?? ""); setUpiError(null); }} style={styles.upiSaveBtn}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.upiReadRow}>
              <Row label="UPI ID" value={user?.upiId || "Not set"} />
              <Pressable
                onPress={() => { setUpiDraft(user?.upiId ?? ""); setEditingUpi(true); }}
                hitSlop={8}
                style={styles.upiEditBtn}
              >
                <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Version & Updates</Text>
        <Card style={styles.updateCard}>
          <View style={styles.updateRow}>
            <View
              style={[
                styles.updateIcon,
                releaseInfo?.hasUpdate && styles.updateIconAvailable,
              ]}
            >
              <Ionicons
                name={
                  releaseInfo?.hasUpdate
                    ? "arrow-up-circle-outline"
                    : "checkmark-circle-outline"
                }
                size={20}
                color={releaseInfo?.hasUpdate ? colors.gold : colors.success}
              />
            </View>

            <View style={styles.updateCopy}>
              <Text style={styles.updateTitle}>
                {releaseInfo?.hasUpdate
                  ? `Update Available: ${releaseInfo.tagName}`
                  : `ZapTab v${APP_VERSION}`}
              </Text>
              <Text style={styles.updateHint}>
                {checkingUpdate
                  ? "Checking GitHub releases..."
                  : releaseInfo?.hasUpdate
                  ? "A new version of ZapTab is available for download."
                  : "You are on the latest version of ZapTab."}
              </Text>
            </View>
          </View>

          <View style={styles.updateActionRow}>
            {releaseInfo?.hasUpdate ? (
              <Button
                label={`Download ${releaseInfo.tagName}`}
                variant="goldOutline"
                fullWidth
                onPress={() => void Linking.openURL(releaseInfo.downloadUrl)}
              />
            ) : (
              <Button
                label={checkingUpdate ? "Checking..." : "Check for Updates"}
                variant="secondary"
                fullWidth
                disabled={checkingUpdate}
                onPress={() => void checkForUpdates(true)}
              />
            )}
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <Card style={styles.supportCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Help and feedback"
            onPress={() => setSupportOpen(true)}
            style={({ pressed }) => [
              styles.supportRow,
              pressed && styles.supportRowPressed,
            ]}
          >
            <View style={styles.supportIcon}>
              <Ionicons
                name="chatbubble-ellipses"
                size={18}
                color={colors.onGold}
              />
            </View>
            <View style={styles.supportCopy}>
              <Text style={styles.supportText}>Help & Feedback</Text>
              <Text style={styles.supportHint}>
                Send a message to the ZapTab team
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </Card>
      </View>

      <View style={styles.actions}>
        {__DEV__ ? (
          <Button
            label="Developer info"
            variant="secondary"
            fullWidth
            onPress={() => navigation.navigate("Status")}
          />
        ) : null}
        <Button
          label="Sign out"
          variant="ghost"
          fullWidth
          onPress={() => void signOut()}
        />
      </View>

      <SupportSheet
        visible={supportOpen}
        onClose={() => setSupportOpen(false)}
        user={supportUser}
      />
    </ScreenContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },
  avatarSection: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  avatarRing: {
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.gold,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.goldMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: colors.gold,
    fontSize: fontSize.xxl,
    fontWeight: "700",
  },
  userName: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  userEmail: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  row: {
    gap: spacing.xs,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  rowValue: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  upiReadRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  upiEditBtn: {
    marginTop: spacing.xs,
    padding: 4,
  },
  upiEditRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  upiEditField: {
    flex: 1,
    gap: spacing.xs,
  },
  upiInput: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: "monospace",
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    minHeight: 38,
  },
  upiError: {
    color: colors.danger,
    fontSize: fontSize.xs,
  },
  upiEditActions: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.lg + 2,
  },
  upiSaveBtn: {
    padding: spacing.xs,
  },
  updateCard: {
    gap: spacing.md,
  },
  updateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  updateIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  updateIconAvailable: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.25)",
  },
  updateCopy: {
    flex: 1,
    gap: 2,
  },
  updateTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  updateHint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  updateActionRow: {
    marginTop: spacing.xs,
  },
  supportCard: {
    paddingVertical: spacing.md,
  },
  supportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    ...(Platform.OS === "web"
      ? ({ cursor: "pointer" } as const)
      : null),
  },
  supportRowPressed: {
    opacity: 0.85,
  },
  supportIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  supportCopy: {
    flex: 1,
    gap: 2,
  },
  supportText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  supportHint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});

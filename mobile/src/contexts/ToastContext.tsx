import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontSize, radius, spacing } from "../theme";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  show: (message: string, options?: ToastOptions) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastItem | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-16)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(1);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -16,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [fadeAnim, slideAnim]);

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      const type = options?.type || "info";
      const duration = options?.duration || 2600;
      const id = nextId.current++;

      setToast({ id, message, type });

      fadeAnim.setValue(0);
      slideAnim.setValue(-16);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [fadeAnim, slideAnim, hideToast]
  );

  const success = useCallback(
    (message: string) => show(message, { type: "success" }),
    [show]
  );
  const error = useCallback(
    (message: string) => show(message, { type: "error" }),
    [show]
  );
  const info = useCallback(
    (message: string) => show(message, { type: "info" }),
    [show]
  );
  const warning = useCallback(
    (message: string) => show(message, { type: "warning" }),
    [show]
  );

  const getIcon = (type: ToastType): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "alert-circle";
      case "warning":
        return "warning";
      case "info":
      default:
        return "information-circle";
    }
  };

  const getColor = (type: ToastType) => {
    switch (type) {
      case "success":
        return colors.success;
      case "error":
        return colors.danger;
      case "warning":
        return colors.gold;
      case "info":
      default:
        return "#60a5fa";
    }
  };

  return (
    <ToastContext.Provider value={{ show, success, error, info, warning }}>
      {children}
      {toast ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.container,
            { top: Math.max(insets.top + 8, spacing.md) },
          ]}
        >
          <Animated.View
            style={[
              styles.toast,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Pressable
              onPress={hideToast}
              style={styles.inner}
              accessibilityRole="alert"
            >
              <Ionicons
                name={getIcon(toast.type)}
                size={20}
                color={getColor(toast.type)}
              />
              <Text style={styles.message} numberOfLines={2}>
                {toast.message}
              </Text>
              <Ionicons
                name="close"
                size={16}
                color={colors.textMuted}
                style={styles.closeIcon}
              />
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 99999,
  },
  toast: {
    maxWidth: 420,
    width: "90%",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  message: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  closeIcon: {
    marginLeft: 2,
    opacity: 0.7,
  },
});

import { useEffect } from "react";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { QueryClientProvider } from "@tanstack/react-query";
import { tokenCache } from "./src/lib/tokenCache";
import { queryClient } from "./src/lib/queryClient";
import { AuthProvider } from "./src/contexts/AuthContext";
import { ToastProvider } from "./src/contexts/ToastContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { ErrorBoundary } from "./src/components";

const clerkPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "pk_test_ZGVmaW5pdGUtaW5zZWN0LTk5LmNsZXJrLmFjY291bnRzLmRldiQ";

export default function App() {
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.title = "ZapTab";
      const existingIcons = document.querySelectorAll("link[rel*='icon']");
      existingIcons.forEach((el) => el.remove());

      const link = document.createElement("link");
      link.type = "image/png";
      link.rel = "shortcut icon";
      link.href = "/favicon.png?v=" + Date.now();
      document.head.appendChild(link);
    }
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ClerkProvider
          publishableKey={clerkPublishableKey}
          tokenCache={tokenCache}
        >
          <ClerkLoaded>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <ToastProvider>
                  <StatusBar style="light" />
                  <AppNavigator />
                </ToastProvider>
              </AuthProvider>
            </QueryClientProvider>
          </ClerkLoaded>
        </ClerkProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

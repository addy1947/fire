import { useEffect } from "react";
import { View, Platform } from "react-native";
import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { SocketProvider, useSocket } from "@/hooks/useSocket";
import AlertOverlay from "@/components/AlertOverlay";
import { SERVER_URL } from "@/constants/server";

// How foreground notifications behave
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,   // was shouldShowAlert in older SDK
    shouldShowAlert:  true,   // keep for compatibility
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
});

// Register and send push token to backend
async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.warn("Push notifications only work on physical devices");
    return;
  }

  // Create Android notification channel for alerts
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("alerts", {
      name:       "Fire & Gas Alerts",
      importance:  Notifications.AndroidImportance.MAX,
      sound:      "default",
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Push notification permission denied");
    return;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn("No EAS Project ID found. Push notifications won't work until you run 'eas build'.");
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  console.log("📲 Expo Push Token:", token);

  // Send token to backend
  try {
    await fetch(`${SERVER_URL}/register-token`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ token }),
    });
    console.log("✅ Token registered with backend");
  } catch (err) {
    console.error("❌ Failed to register token:", err);
  }
}

function AppShell() {
  const { alert, dismissAlert } = useSocket();
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <AlertOverlay alert={alert} onDismiss={dismissAlert} />
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  return (
    <SocketProvider>
      <AppShell />
    </SocketProvider>
  );
}

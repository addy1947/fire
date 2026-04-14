import { useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { AlertPayload } from "@/hooks/useSocket";

const CONFIGS = {
  flame: { color: "#EF4444", bg: "#1A0000", icon: "flame"          as const },
  gas:   { color: "#F59E0B", bg: "#1A1000", icon: "cloud-outline"  as const },
};

type Props = { alert: AlertPayload | null; onDismiss: () => void };

export default function AlertOverlay({ alert, onDismiss }: Props) {
  const translateY = useRef(new Animated.Value(-300)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const pulse      = useRef(new Animated.Value(1)).current;
  const activeRef  = useRef(false);
  const pulseLoop  = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (alert) {
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();

      // Pulse icon loop
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.25, duration: 350, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1.0,  duration: 350, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();

      // Haptic + voice alert
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      activeRef.current = true;
      playVoiceAlert(alert.type);

    } else {
      // Slide out
      Animated.parallel([
        Animated.timing(translateY, { toValue: -300, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 0,    duration: 300, useNativeDriver: true }),
      ]).start();

      pulseLoop.current?.stop();
      activeRef.current = false;
      Speech.stop();
    }
  }, [alert]);

  const playVoiceAlert = (type: string) => {
    const textToSay = type === "flame" ? "Fire! Fire! Fire!" : "Smoke! Smoke!";

    const speak = () => {
      Speech.speak(textToSay, {
        rate: 0.9,
        pitch: 1.1,
        onDone: () => {
          if (activeRef.current) {
            speak();
          }
        },
      });
    };
    
    speak();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    activeRef.current = false;
    Speech.stop();
    onDismiss();
  };

  if (!alert) return null;

  const cfg = CONFIGS[alert.type] ?? CONFIGS.flame;

  return (
    <Animated.View
      style={[styles.wrapper, { opacity, transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      <View style={[styles.card, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
        <View style={[styles.strip, { backgroundColor: cfg.color }]} />

        <View style={styles.body}>
          <View style={styles.topRow}>
            <Animated.View style={[styles.iconWrap, { backgroundColor: cfg.color + "33", transform: [{ scale: pulse }] }]}>
              <Ionicons name={cfg.icon} size={30} color={cfg.color} />
            </Animated.View>
            <View style={[styles.badge, { backgroundColor: cfg.color + "33" }]}>
              <Text style={[styles.badgeText, { color: cfg.color }]}>
                {alert.type.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{alert.title}</Text>
          <Text style={styles.message}>{alert.message}</Text>
          <Text style={styles.time}>{new Date(alert.triggeredAt).toLocaleTimeString()}</Text>

          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: cfg.color }]}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={20} color={cfg.color} />
            <Text style={[styles.cancelText, { color: cfg.color }]}>Cancel Alert</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
    paddingTop: 52,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 16,
  },
  strip: { height: 4, width: "100%" },
  body:  { padding: 18 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 18,
    justifyContent: "center", alignItems: "center",
  },
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  title:   { color: "#F9FAFB", fontSize: 20, fontWeight: "700", marginBottom: 6 },
  message: { color: "#D1D5DB", fontSize: 14, lineHeight: 22, marginBottom: 6 },
  time:    { color: "#6B7280", fontSize: 12, marginBottom: 18 },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 13,
  },
  cancelText: { fontSize: 15, fontWeight: "700" },
});

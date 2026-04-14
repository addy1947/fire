import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSocket } from "@/hooks/useSocket";
import { useEffect, useRef } from "react";

const { width } = Dimensions.get("window");

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Animated ring that pulses when receiving data
function PulseRing({ active }: { active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale, { toValue: 1.6, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1,   duration: 900, easing: Easing.in(Easing.ease),  useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.6, duration: 900, useNativeDriver: true }),
          ]),
        ])
      ).start();
    } else {
      scale.stopAnimation();
      scale.setValue(1);
      opacity.setValue(0.3);
    }
  }, [active]);

  return (
    <View style={styles.pulseWrap}>
      <Animated.View style={[styles.pulseRing, { transform: [{ scale }], opacity }]} />
      <View style={[styles.pulseDot, { backgroundColor: active ? "#10B981" : "#EF4444" }]} />
    </View>
  );
}

// Single metric card
function MetricCard({
  icon, label, value, unit, color,
}: {
  icon: string; label: string; value: number | null; unit: string; color: string;
}) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (value !== null) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.3, duration: 100, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1,   duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [value]);

  return (
    <View style={[styles.card, { borderColor: color + "44" }]}>
      <View style={[styles.cardIcon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon as any} size={26} color={color} />
      </View>
      <Animated.Text style={[styles.cardValue, { color, opacity: fadeAnim }]}>
        {value !== null ? value.toFixed(1) : "--"}
      </Animated.Text>
      <Text style={[styles.cardUnit, { color: color + "99" }]}>{unit}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

export default function Index() {
  const { connected, reading } = useSocket();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Sensor Monitor</Text>
            <Text style={styles.subtitle}>Live ESP32 Data</Text>
          </View>
          <View style={styles.statusRow}>
            <PulseRing active={connected} />
            <Text style={[styles.statusText, { color: connected ? "#10B981" : "#EF4444" }]}>
              {connected ? "Connected" : "Offline"}
            </Text>
          </View>
        </View>

        {/* Device badge */}
        {reading && (
          <View style={styles.deviceBadge}>
            <Ionicons name="hardware-chip-outline" size={14} color="#A78BFA" />
            <Text style={styles.deviceText}>{reading.device}</Text>
            <View style={styles.badgeDot} />
            <Text style={styles.deviceTime}>Last update: {formatTime(reading.receivedAt)}</Text>
          </View>
        )}

        {/* Metric cards */}
        <View style={styles.cardsRow}>
          <MetricCard
            icon="thermometer-outline"
            label="Temperature"
            value={reading?.temperature ?? null}
            unit="°C"
            color="#F97316"
          />
          <MetricCard
            icon="water-outline"
            label="Humidity"
            value={reading?.humidity ?? null}
            unit="%"
            color="#06B6D4"
          />
        </View>

        {/* No data state */}
        {!reading && (
          <View style={styles.noData}>
            <Ionicons name="radio-outline" size={48} color="#2D2D4A" />
            <Text style={styles.noDataTitle}>Waiting for ESP32…</Text>
            <Text style={styles.noDataSub}>
              Make sure your ESP32 is connected to:
            </Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>ws://10.25.161.102:3000/esp32</Text>
            </View>
          </View>
        )}

        {/* Raw JSON preview */}
        {reading && (
          <View style={styles.jsonBox}>
            <Text style={styles.jsonLabel}>RAW PAYLOAD</Text>
            <Text style={styles.jsonText}>{JSON.stringify(reading, null, 2)}</Text>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F1A" },
  container: { flex: 1, padding: 20 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title:    { color: "#F9FAFB", fontSize: 26, fontWeight: "700" },
  subtitle: { color: "#6B7280", fontSize: 13, marginTop: 2 },
  statusRow: { alignItems: "center", gap: 6 },
  statusText: { fontSize: 12, fontWeight: "600" },

  // Pulse animation
  pulseWrap: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  pulseRing: {
    position: "absolute",
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#10B981",
  },
  pulseDot: { width: 10, height: 10, borderRadius: 5 },

  // Device badge
  deviceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#13132A",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1E1E2E",
    marginBottom: 24,
    alignSelf: "flex-start",
  },
  deviceText: { color: "#A78BFA", fontSize: 13, fontWeight: "600" },
  badgeDot:   { width: 3, height: 3, borderRadius: 2, backgroundColor: "#4B5563" },
  deviceTime: { color: "#6B7280", fontSize: 12 },

  // Metric cards
  cardsRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 28,
  },
  card: {
    flex: 1,
    backgroundColor: "#13132A",
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  cardIcon: {
    width: 50, height: 50, borderRadius: 16,
    justifyContent: "center", alignItems: "center",
    marginBottom: 4,
  },
  cardValue: { fontSize: 46, fontWeight: "800", letterSpacing: -1 },
  cardUnit:  { fontSize: 18, fontWeight: "600" },
  cardLabel: { color: "#6B7280", fontSize: 12, marginTop: 2 },

  // No data
  noData: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  noDataTitle: { color: "#4B5563", fontSize: 18, fontWeight: "600" },
  noDataSub:   { color: "#374151", fontSize: 13 },
  codeBox: {
    backgroundColor: "#13132A",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#1E1E2E",
    marginTop: 4,
  },
  codeText: { color: "#A78BFA", fontSize: 12, fontFamily: "monospace" },

  // JSON preview
  jsonBox: {
    backgroundColor: "#0A0A14",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E1E2E",
  },
  jsonLabel: { color: "#4B5563", fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 8 },
  jsonText:  { color: "#6EE7B7", fontSize: 12, fontFamily: "monospace", lineHeight: 20 },
});

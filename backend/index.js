require("dotenv").config();

const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const cors       = require("cors");
const morgan     = require("morgan");
const { Expo }   = require("expo-server-sdk");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*" } });
const expo   = new Expo();

const PORT = process.env.PORT || 3000;

// ── State ─────────────────────────────────────────────────────
let lastReading  = null;
let pushTokens   = new Set(); // stores all registered Expo push tokens

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ── Socket.IO (App) ───────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`🔌 App connected: ${socket.id}`);
  if (lastReading) socket.emit("sensor_data", lastReading);
  socket.on("disconnect", () => console.log(`🔴 App disconnected: ${socket.id}`));
});

// ── Push Notification Helper ──────────────────────────────────
async function sendPushNotifications(title, body, data = {}) {
  if (pushTokens.size === 0) return;

  const messages = [];
  for (const token of pushTokens) {
    if (!Expo.isExpoPushToken(token)) {
      console.warn(`❌ Invalid push token: ${token}`);
      pushTokens.delete(token);
      continue;
    }
    messages.push({
      to:       token,
      sound:    "default",
      title,
      body,
      data,
      priority: "high",
      channelId: "alerts",
    });
  }

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      receipts.forEach((receipt) => {
        if (receipt.status === "error") {
          console.error("❌ Push error:", receipt.message);
          // Remove invalid tokens
          if (receipt.details?.error === "DeviceNotRegistered") {
            const badToken = messages.find(m => m.to === receipt.id)?.to;
            if (badToken) pushTokens.delete(badToken);
          }
        }
      });
    } catch (err) {
      console.error("❌ Push send failed:", err.message);
    }
  }

  console.log(`📲 Push sent to ${messages.length} device(s): ${title}`);
}

// ── Routes ────────────────────────────────────────────────────

// GET /health
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    registeredTokens: pushTokens.size,
    lastReading,
  });
});

// POST /register-token  ← App sends its push token here on startup
app.post("/register-token", (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ status: "error", message: "token required" });

  if (!Expo.isExpoPushToken(token)) {
    return res.status(400).json({ status: "error", message: "invalid Expo push token" });
  }

  pushTokens.add(token);
  console.log(`📲 Token registered: ${token} (total: ${pushTokens.size})`);
  return res.status(200).json({ status: "ok" });
});

// POST /data  ← ESP32 sends here every 2s
app.post("/data", async (req, res) => {
  const { temperature, humidity, flame, gasDigital, gasAnalog, device } = req.body;

  if (temperature === undefined || humidity === undefined) {
    return res.status(400).json({ status: "error", message: "temperature and humidity required" });
  }

  const reading = {
    device:      device     ?? "ESP32",
    temperature: Number(temperature),
    humidity:    Number(humidity),
    flame:       Number(flame      ?? 0),
    gasDigital:  Number(gasDigital ?? 0),
    gasAnalog:   Number(gasAnalog  ?? 0),
    receivedAt:  new Date().toISOString(),
  };

  lastReading = reading;

  // ── Alert checks ──────────────────────────────────────────
  const alertList = [];
  if (reading.flame === 1)      alertList.push({ type: "flame", title: "🔥 Fire Detected!",     message: "Flame sensor triggered. Immediate action required!" });
  if (reading.gasAnalog > 1200) alertList.push({ type: "gas",   title: "💨 Gas Level Critical!", message: `Gas reading is ${reading.gasAnalog} — above safe limit.` });

  for (const alert of alertList) {
    const payload = { ...alert, value: reading, triggeredAt: new Date().toISOString() };

    // 1. Socket.IO → app (if open)
    io.emit("alert", payload);

    // 2. Push notification → app (even if closed/background)
    await sendPushNotifications(alert.title, alert.message, { type: alert.type });

    console.log(`🚨 ALERT [${alert.type.toUpperCase()}]: ${alert.title}`);
  }

  // Print to terminal
  console.log("\n┌─────────────────────────────────────┐");
  console.log(`│  📡 Device      : ${reading.device.padEnd(18)}│`);
  console.log(`│  🌡️  Temperature : ${(reading.temperature + " °C").padEnd(18)}│`);
  console.log(`│  💧 Humidity    : ${(reading.humidity    + " %").padEnd(18)} │`);
  console.log(`│  🔥 Flame       : ${(reading.flame ? "YES 🔥" : "No").padEnd(18)}│`);
  console.log(`│  💨 Gas (raw)   : ${String(reading.gasAnalog).padEnd(18)}│`);
  console.log(`│  🕐 Time        : ${new Date().toLocaleTimeString().padEnd(18)}│`);
  console.log("└─────────────────────────────────────┘");

  // Emit live sensor data to all connected app clients
  io.emit("sensor_data", reading);

  return res.status(200).json({ status: "ok" });
});

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ status: "error", message: "Not found" }));

// ── Start ─────────────────────────────────────────────────────
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server → Listening on port ${PORT} (0.0.0.0)`);
  console.log(`   ↳ ESP32 → POST to /data`);
  console.log(`   ↳ App   → Socket.IO + Push Notifications`);
});

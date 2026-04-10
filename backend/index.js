require("dotenv").config();

const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const cors       = require("cors");
const morgan     = require("morgan");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

// last reading cached so new app connections get data immediately
let lastReading = null;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ── Socket.IO (App) ──────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`🔌 App connected: ${socket.id}`);
  if (lastReading) socket.emit("sensor_data", lastReading);
  socket.on("disconnect", () => console.log(`🔴 App disconnected: ${socket.id}`));
});

// ── Routes ───────────────────────────────────────────────────

// GET /health
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    lastReading,
  });
});

// POST /data  ← ESP32 sends here every 2s
app.post("/data", (req, res) => {
  const { temperature, humidity, flame, gasDigital, gasAnalog, device } = req.body;

  if (temperature === undefined || humidity === undefined) {
    return res.status(400).json({ status: "error", message: "temperature and humidity required" });
  }

  const reading = {
    device:     device     ?? "ESP32",
    temperature: Number(temperature),
    humidity:    Number(humidity),
    flame:       Number(flame      ?? 0),
    gasDigital:  Number(gasDigital ?? 0),
    gasAnalog:   Number(gasAnalog  ?? 0),
    receivedAt:  new Date().toISOString(),
  };

  lastReading = reading;

  // ── Alert checks ────────────────────────────────────────
  const alerts = [];
  if (reading.flame === 1)        alerts.push({ type: "flame",  title: "🔥 Fire Detected!",      message: "Flame sensor triggered. Immediate action required!" });
  if (reading.gasAnalog > 1200)   alerts.push({ type: "gas",    title: "💨 Gas Level Critical!",  message: `Gas analog reading is ${reading.gasAnalog} — above safe limit.` });

  alerts.forEach(alert => {
    const payload = { ...alert, value: reading, triggeredAt: new Date().toISOString() };
    io.emit("alert", payload);
    console.log(`🚨 ALERT [${alert.type.toUpperCase()}]:`, alert.title);
  });

  // Print to terminal
  console.log("\n┌─────────────────────────────────────┐");
  console.log(`│  📡 Device      : ${reading.device.padEnd(18)}│`);
  console.log(`│  🌡️  Temperature : ${(reading.temperature + " °C").padEnd(18)}│`);
  console.log(`│  💧 Humidity    : ${(reading.humidity    + " %").padEnd(18)} │`);
  console.log(`│  🔥 Flame       : ${(reading.flame ? "YES 🔥" : "No").padEnd(18)}│`);
  console.log(`│  💨 Gas (raw)   : ${String(reading.gasAnalog).padEnd(18)}│`);
  console.log(`│  🕐 Time        : ${new Date().toLocaleTimeString().padEnd(18)}│`);
  console.log("└─────────────────────────────────────┘");

  // Push to all connected app clients
  io.emit("sensor_data", reading);

  return res.status(200).json({ status: "ok" });
});

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ status: "error", message: "Not found" }));

// ── Start ────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 Server → http://localhost:${PORT}`);
  console.log(`   ↳ ESP32 → POST http://YOUR_IP:${PORT}/data`);
  console.log(`   ↳ App   → Socket.IO http://YOUR_IP:${PORT}`);
});

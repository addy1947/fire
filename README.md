# FireShield 🔥🛡️

A comprehensive, real-time smart home IoT ecosystem for fire and gas safety monitoring. FireShield connects custom ESP32 hardware to a live mobile dashboard, providing crucial real-time voice alerts and native push notifications in emergency situations.

## 🏗️ Architecture Overview

The project is split into three main components:

1. **Hardware (ESP32 C++)**: Reads temperature, humidity, flame, and gas levels and actively POSTs the data to the server. Includes an onboard buzzer for immediate hardware-level alerts.
2. **Backend (Node.js / Express)**: Receives sensor data, checks against safety thresholds, and broadcasts real-time statuses via Socket.IO. Also manages device registration and triggers Expo Push notifications for background alerts.
3. **Frontend (React Native / Expo)**: A beautifully designed cross-platform mobile application that displays live sensor data, triggers pulsing voice alerts on emergencies, and subscribes to push notifications for when the app is closed.

## ✨ Key Features

*   **Real-Time Data Streaming:** Sensor data is broadcast to connected mobile apps via WebSocket with virtually zero lag.
*   **Intelligent Alerting:** If dangerous thresholds are met (e.g., Flame detected, or Gas > 1200), the backend automatically triggers an instant alert packet.
*   **Vocal Feedback:** The mobile app utilizes `expo-speech` to shout audible warnings ("Fire! Fire! Fire!" or "Smoke! Smoke!") during an emergency, continuing until explicitly dismissed.
*   **Native Push Notifications:** Using `expo-server-sdk`, critical alerts wake your phone up and notify you natively even if the app is killed.
*   **Hardware Backup Alarms:** The ESP32 triggers a physical GPIO buzzer if the internet goes down while a fire occurs.
*   **Modern Aesthetics:** Dark mode glassmorphism UI, pulsing visual indicators, and a beautiful custom app icon.

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
npm start
```
*Note: Make sure to update the `PORT` or let your hosting provider (like Render) assign it automatically. By default, it runs on port 3000.*

### 2. Physical Hardware Setup (ESP32)
1. Open `esp32/sensor.ino` in the Arduino IDE.
2. Update the `WIFI_SSID` and `WIFI_PASSWORD`.
3. Update the `SERVER_URL` to point to your hosted backend (e.g., `http://YOUR_LOCAL_IP:3000/data` or `https://your-production-url.onrender.com/data`).
4. Flash the code to your ESP32.

### 3. Mobile App Setup (Expo)
```bash
cd StickerSmash
npm install
```
1. Open `StickerSmash/constants/server.ts` and set `SERVER_URL` to match your backend.
2. To test locally: `npx expo start`
3. To build the production `.apk`: `eas build -p android --profile preview`

## 🔌 Hardware Pinout Configuration

| Sensor/Component | ESP32 GPIO Pin |
| :--- | :--- |
| **DHT22 (Temp & Hum)** | Pin 4 |
| **Flame Sensor** | Pin 22 |
| **MQ2 Digital (Gas)** | Pin 23 |
| **MQ2 Analog (Gas)** | Pin 34 |
| **Alarm Buzzer** | Pin 19 |

## 🛠️ Built With

*   **ESP32 Core:** Standard Arduino C++ with `HTTPClient` and `DHT.h`
*   **Backend:** Express, Socket.IO, Expo Server SDK
*   **Mobile:** React Native, Expo Router, Expo Speech, Animated API
*   **Design:** Custom SVGs, Animated parallel transforms, Expo Haptics

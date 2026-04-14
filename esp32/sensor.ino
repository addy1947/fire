#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// -------- WiFi --------
const char* WIFI_SSID     = "Addy";
const char* WIFI_PASSWORD = "adityama";

// -------- Backend --------
const char* SERVER_URL = "http://192.168.0.121:3000/data";
const char* DEVICE_ID  = "ESP32-01";

// -------- Sensors --------
#define DHTPIN      4
#define DHTTYPE     DHT22
#define FLAME_PIN   22
#define MQ2_DIGITAL 23
#define MQ2_ANALOG  34
#define BUZZER_PIN  19

DHT dht(DHTPIN, DHTTYPE);

unsigned long lastSend    = 0;
const unsigned long INTERVAL = 2000;   // ms between sends

void setup() {
  Serial.begin(115200);
  Serial.println("\n🚀 Starting...");

  dht.begin();
  pinMode(FLAME_PIN, INPUT);
  pinMode(MQ2_DIGITAL, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Connect WiFi
  Serial.print("📶 Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected: " + WiFi.localIP().toString());
}

void loop() {
  if (millis() - lastSend < INTERVAL) return;
  lastSend = millis();

  // -------- Read sensors --------
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("❌ DHT22 read failed — skipping");
    return;
  }

  int flameState = digitalRead(FLAME_PIN);
  int gasDigital = digitalRead(MQ2_DIGITAL);
  int gasAnalog  = analogRead(MQ2_ANALOG);

  // -------- Buzzer Logic --------
  if (flameState == LOW || gasAnalog > 1200) {
    digitalWrite(BUZZER_PIN, HIGH);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
  }

  Serial.println("\n-----------------------------");
  Serial.print("🌡️ Temp : "); Serial.print(temperature); Serial.println(" °C");
  Serial.print("💧 Hum  : "); Serial.print(humidity);    Serial.println(" %");
  Serial.println(flameState == LOW ? "🔥 Flame: YES" : "🟢 Flame: No");
  Serial.println(gasDigital == LOW ? "⚠️ Gas  : YES" : "🟢 Gas  : No");
  Serial.print("💨 Gas Analog: "); Serial.println(gasAnalog);

  // -------- Build JSON --------
  String json = "{";
  json += "\"device\":\""     + String(DEVICE_ID)                  + "\",";
  json += "\"temperature\":"  + String(temperature)                + ",";
  json += "\"humidity\":"     + String(humidity)                   + ",";
  json += "\"flame\":"        + String(flameState == LOW ? 1 : 0) + ",";
  json += "\"gasDigital\":"   + String(gasDigital == LOW ? 1 : 0) + ",";
  json += "\"gasAnalog\":"    + String(gasAnalog);
  json += "}";

  // -------- HTTP POST --------
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    int code = http.POST(json);

    if (code == 200) {
      Serial.println("📤 Sent OK (200)");
    } else {
      Serial.print("❌ POST failed, code: ");
      Serial.println(code);
    }

    http.end();
  } else {
    Serial.println("⚠️ WiFi disconnected — skipping send");
  }
}
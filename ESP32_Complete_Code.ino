/*
 * Krishi Sakha - ESP32 Sensor Client
 * Smart Agriculture System - Live Sensor Data
 * 
 * This code reads sensors and sends data to the backend server every 5 seconds
 * 
 * Author: Krishi Sakha Team
 * Version: 2.0
 * Last Updated: December 2025
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ========================================
// WiFi Configuration
// ========================================
const char* ssid = "ABCDE";           // ✅ Your WiFi name
const char* password = "123456789";   // ✅ Your WiFi password

// ========================================
// Server Configuration
// ========================================
// IMPORTANT: Use your computer's IP address on the same network
// To find your IP:
//   Mac: Open Terminal and type: ipconfig getifaddr en0
//   Windows: Open CMD and type: ipconfig (look for IPv4 Address)
//   Linux: Open Terminal and type: hostname -I
const char* serverUrl = "http://10.116.189.241:5001/api/sensors/data";
const char* deviceId = "ESP32_SENSOR_001";
const char* apiKey = "krishi-sakha-esp32";

// ========================================
// Sensor Pin Configuration
// ========================================
#define DHT_PIN 4           // DHT22 Temperature & Humidity sensor
#define DHT_TYPE DHT22      // DHT sensor type
#define SOIL_PIN 34         // Soil moisture sensor (analog)
#define PH_PIN 35           // pH sensor (analog)
#define RAIN_PIN 32         // Rain sensor (analog)

// ========================================
// Timing Configuration
// ========================================
const unsigned long SEND_INTERVAL = 5000;  // Send data every 5 seconds
unsigned long lastSendTime = 0;

// ========================================
// Calibration Values (adjust based on your sensors)
// ========================================
// Soil Moisture Calibration
const int SOIL_DRY_VALUE = 4095;    // Raw value in dry air
const int SOIL_WET_VALUE = 1500;    // Raw value in water

// pH Calibration (optional - adjust if you have pH calibration solution)
const float PH_NEUTRAL_VOLTAGE = 2048;  // Voltage at pH 7
const float PH_STEP = 293;              // Voltage step per pH unit

// Rain Sensor Calibration
const int RAIN_DRY_VALUE = 4095;    // Raw value when dry
const int RAIN_WET_VALUE = 500;     // Raw value when wet

// ========================================
// Initialize DHT Sensor
// ========================================
DHT dht(DHT_PIN, DHT_TYPE);

// ========================================
// Setup Function - Runs Once
// ========================================
void setup() {
  // Initialize Serial Monitor
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n");
  Serial.println("🌿 ================================");
  Serial.println("🌿 Krishi Sakha - ESP32 Sensor Client");
  Serial.println("🌿 ================================");
  Serial.println("");
  
  // Initialize sensors
  Serial.println("📡 Initializing sensors...");
  dht.begin();
  pinMode(SOIL_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);
  Serial.println("✅ Sensors initialized");
  
  // Connect to WiFi
  Serial.println("");
  Serial.print("📡 Connecting to WiFi: ");
  Serial.println(ssid);
  Serial.print("🔄 ");
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println("");
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✅ WiFi Connected Successfully!");
    Serial.print("📍 ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("📡 Sending data to: ");
    Serial.println(serverUrl);
    Serial.println("");
    Serial.println("🌿 System Ready! Starting sensor readings...");
    Serial.println("─────────────────────────────────────────────");
  } else {
    Serial.println("");
    Serial.println("❌ WiFi Connection Failed!");
    Serial.println("⚠️  Please check:");
    Serial.println("   1. SSID is correct");
    Serial.println("   2. Password is correct");
    Serial.println("   3. WiFi is 2.4GHz (ESP32 doesn't support 5GHz)");
    Serial.println("   4. Router is powered on");
    Serial.println("");
    Serial.println("🔄 ESP32 will keep trying to connect...");
  }
}

// ========================================
// Main Loop - Runs Continuously
// ========================================
void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n❌ WiFi disconnected! Attempting to reconnect...");
    WiFi.begin(ssid, password);
    delay(5000);
    return;
  }
  
  // Send sensor data every SEND_INTERVAL milliseconds
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();
    readAndSendSensorData();
  }
}

// ========================================
// Read Sensors and Send Data to Server
// ========================================
void readAndSendSensorData() {
  Serial.println("\n📊 Reading sensors...");
  
  // ===== Read DHT22 Sensor =====
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  // Check if DHT reading failed
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("⚠️  Warning: Failed to read from DHT sensor!");
    Serial.println("💡 Using default values (temp=25°C, humidity=60%)");
    temperature = 25.0;
    humidity = 60.0;
  }
  
  // ===== Read Soil Moisture Sensor =====
  int soilRaw = analogRead(SOIL_PIN);
  float soilMoisture = map(soilRaw, SOIL_DRY_VALUE, SOIL_WET_VALUE, 0, 100);
  soilMoisture = constrain(soilMoisture, 0, 100);
  
  // ===== Read pH Sensor =====
  int phRaw = analogRead(PH_PIN);
  // Simple linear mapping (0-4095 to 0-14 pH)
  // For better accuracy, use calibration with buffer solutions
  float pH = map(phRaw, 0, 4095, 0, 1400) / 100.0;  // Map to 0.00-14.00
  pH = constrain(pH, 0, 14);
  
  // ===== Read Rain Sensor =====
  int rainRaw = analogRead(RAIN_PIN);
  float rainfall = map(rainRaw, RAIN_DRY_VALUE, RAIN_WET_VALUE, 0, 100);
  rainfall = constrain(rainfall, 0, 100);
  
  // ===== Display Sensor Readings =====
  Serial.println("┌─────────────────────────────────────┐");
  Serial.println("│      LIVE SENSOR READINGS           │");
  Serial.println("├─────────────────────────────────────┤");
  Serial.printf("│ 🌡️  Temperature:   %6.1f °C      │\n", temperature);
  Serial.printf("│ 💧 Humidity:       %6.1f %%       │\n", humidity);
  Serial.printf("│ 🌱 Soil Moisture:  %6.1f %%       │\n", soilMoisture);
  Serial.printf("│     (Raw: %4d)                     │\n", soilRaw);
  Serial.printf("│ 🧪 pH Level:       %6.1f         │\n", pH);
  Serial.printf("│     (Raw: %4d)                     │\n", phRaw);
  Serial.printf("│ 🌧️  Rainfall:       %6.1f %%       │\n", rainfall);
  Serial.printf("│     (Raw: %4d)                     │\n", rainRaw);
  Serial.println("└─────────────────────────────────────┘");
  
  // ===== Create JSON Payload =====
  StaticJsonDocument<256> jsonDoc;
  jsonDoc["temperature"] = temperature;
  jsonDoc["humidity"] = humidity;
  jsonDoc["soilMoisture"] = soilMoisture;
  jsonDoc["pH"] = pH;
  jsonDoc["rainfall"] = rainfall;
  jsonDoc["deviceId"] = deviceId;
  jsonDoc["apiKey"] = apiKey;
  jsonDoc["source"] = "krishi-sakha";  // CRITICAL: Frontend needs this to recognize ESP32
  
  String jsonString;
  serializeJson(jsonDoc, jsonString);
  
  Serial.println("\n📡 Sending data to server...");
  Serial.printf("📍 Server URL: %s\n", serverUrl);
  Serial.printf("📦 JSON Payload: %s\n", jsonString.c_str());
  
  // ===== Send HTTP POST Request =====
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);  // 5 second timeout
  
  int httpResponseCode = http.POST(jsonString);
  
  // ===== Handle Response =====
  if (httpResponseCode == 200 || httpResponseCode == 201) {
    Serial.println("✅ SUCCESS! Data sent to server");
    String response = http.getString();
    Serial.println("📨 Server Response:");
    Serial.println(response);
    Serial.println("─────────────────────────────────────");
    Serial.println("✨ Data is now live on your dashboard!");
  } 
  else if (httpResponseCode > 0) {
    Serial.printf("⚠️  HTTP Error Code: %d\n", httpResponseCode);
    String response = http.getString();
    Serial.printf("📨 Server said: %s\n", response.c_str());
    Serial.println("\n💡 Possible issues:");
    Serial.println("   - Server endpoint changed");
    Serial.println("   - Data format incorrect");
  } 
  else {
    Serial.printf("❌ Connection Error: %d\n", httpResponseCode);
    Serial.println("\n💡 Troubleshooting steps:");
    Serial.println("   1. Check if backend server is running");
    Serial.println("   2. Verify server IP address is correct");
    Serial.println("   3. Check if firewall is blocking port 5001");
    Serial.println("   4. Ping server from your computer:");
    Serial.printf("      ping %s\n", serverUrl);
    Serial.println("   5. Test with curl:");
    Serial.println("      curl -X POST http://localhost:5001/api/sensors/data \\");
    Serial.println("        -H \"Content-Type: application/json\" \\");
    Serial.println("        -d '{\"temperature\":25,\"humidity\":60,...}'");
  }
  
  http.end();
  Serial.println("─────────────────────────────────────");
  Serial.println("");
}

// ========================================
// Helper Functions
// ========================================

// Function to get WiFi signal strength
int getWiFiStrength() {
  return WiFi.RSSI();  // Returns signal strength in dBm
}

// Function to display WiFi info (call from setup if needed)
void displayWiFiInfo() {
  Serial.println("\n📶 WiFi Information:");
  Serial.print("   SSID: ");
  Serial.println(WiFi.SSID());
  Serial.print("   IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.print("   Signal Strength: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
  Serial.print("   MAC Address: ");
  Serial.println(WiFi.macAddress());
}

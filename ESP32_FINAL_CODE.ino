/*
 * ESP32 IoT Sensor Client for Krishi Sakha Smart Agriculture System
 * 
 * This code reads sensor data and sends it to the backend server
 * 
 * Hardware Requirements:
 * - ESP32 Development Board
 * - DHT22 (Temperature & Humidity) - GPIO 4
 * - Soil Moisture Sensor (Capacitive) - GPIO 34
 * - pH Sensor (Analog) - GPIO 35
 * - Rain Sensor (Analog) - GPIO 32
 * 
 * Libraries Required:
 * - WiFi (built-in)
 * - HTTPClient (built-in)
 * - ArduinoJson (install via Library Manager)
 * - DHT sensor library (install via Library Manager)
 * - LiquidCrystal I2C (install via Library Manager)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ╔════════════════════════════════════════════════════════════════════════════╗
// ║                    🔧 CONFIGURE THESE SETTINGS                              ║
// ╚════════════════════════════════════════════════════════════════════════════╝

// ===== WiFi Configuration (MUST CHANGE) =====
const char* ssid = "ABCDE";           // ✅ Your WiFi name
const char* password = "123456789";   // ✅ Your WiFi password

// ===== Server Configuration (MUST CHANGE) =====
// IMPORTANT: Run this command on Mac to find your IP:
//   ipconfig getifaddr en0
// Then update the IP below with YOUR IP address
const char* serverUrl = "http://10.116.189.241:5001/api/sensors/data";  // ⚠️ UPDATE THIS IP!
const char* deviceId = "ESP32_SENSOR_001";     // Unique device identifier
const char* apiKey = "krishi-sakha-esp32";     // API key for authentication

// ===== Sensor Pin Configuration =====
#define DHT_PIN 4           // DHT22 data pin
#define DHT_TYPE DHT22      // DHT sensor type
#define SOIL_PIN 34         // Soil moisture sensor analog pin
#define PH_PIN 35           // pH sensor analog pin
#define RAIN_PIN 32         // Rain sensor analog pin

// ===== Timing Configuration =====
const unsigned long SEND_INTERVAL = 5000;  // Send data every 5 seconds (5000ms)

// ╔════════════════════════════════════════════════════════════════════════════╗
// ║                    🔧 SENSOR CALIBRATION VALUES                             ║
// ║  Adjust these values based on your sensor calibration                      ║
// ╚════════════════════════════════════════════════════════════════════════════╝

// ===== Soil Moisture Calibration (3-Point Calibration) =====
const int SOIL_DRY_VALUE = 4095;      // Reading in completely DRY soil (0% moisture)
const int SOIL_NORMAL_VALUE = 2500;   // Reading in NORMAL moist soil (~50% moisture)
const int SOIL_WET_VALUE = 1200;      // Reading in SATURATED wet soil (100% moisture)

// ===== pH Sensor Calibration =====
const float PH_NEUTRAL_VOLTAGE = 1.5;  // Voltage at pH 7.0 (typically ~1.5V for 3.3V system)
const float PH_ACID_VOLTAGE = 2.0;     // Voltage at pH 4.0
const float PH_STEP = 0.18;            // Voltage change per pH unit (~0.18V per pH)

// ===== Rain Sensor Calibration =====
const int RAIN_DRY_VALUE = 4095;     // Sensor reading when dry (no rain)
const int RAIN_WET_VALUE = 1000;     // Sensor reading when fully wet

// ===== Global Variables =====
DHT dht(DHT_PIN, DHT_TYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);  // LCD I2C address 0x27, 16 columns, 2 rows
unsigned long lastSendTime = 0;
int sendCount = 0;
int displayMode = 0;  // 0=Temp&Hum, 1=Soil&pH, 2=Rain&Status
unsigned long lastDisplayUpdate = 0;

// ===== Smoothing Variables for Stable Readings =====
float lastTemp = 25.0;
float lastHumidity = 65.0;

// ===== DHT22 Offset Correction (Optional) =====
const float TEMP_OFFSET = 0.0;      // Add/subtract to temperature
const float HUMIDITY_OFFSET = 0.0;  // Add/subtract to humidity

// ===== Sensor Data Structure =====
struct SensorData {
  float temperature;
  float humidity;
  float soilMoisture;
  float pH;
  float rainfall;  // Changed from rainLevel to match backend
};

// ===== Function Declarations =====
void connectWiFi();
SensorData readSensors();
void sendToBackend(SensorData data);
void updateLCDDisplay();

// ===== Setup Function =====
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n");
  Serial.println("========================================");
  Serial.println("🌾 Krishi Sakha IoT Sensor Client");
  Serial.println("========================================");
  
  // Initialize LCD
  Wire.begin();
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Krishi Sakha");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  delay(2000);
  
  // Initialize sensors
  dht.begin();
  pinMode(SOIL_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);
  
  // Connect to WiFi
  connectWiFi();
  
  // Show ready message on LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System Ready!");
  lcd.setCursor(0, 1);
  lcd.print("Monitoring...");
  delay(2000);
  
  // Print configuration
  Serial.println("\n📡 Configuration:");
  Serial.print("   Server: ");
  Serial.println(serverUrl);
  Serial.print("   Device ID: ");
  Serial.println(deviceId);
  Serial.print("   Update Interval: ");
  Serial.print(SEND_INTERVAL / 1000);
  Serial.println(" seconds");
  Serial.println("========================================\n");
}

// ===== Main Loop =====
void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi disconnected! Reconnecting...");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Lost!");
    lcd.setCursor(0, 1);
    lcd.print("Reconnecting...");
    connectWiFi();
  }
  
  // Send data at specified interval
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();
    
    // Read sensor data
    SensorData data = readSensors();
    
    // Send to backend
    sendToBackend(data);
    
    sendCount++;
  }
  
  // Update LCD display every 3 seconds
  if (millis() - lastDisplayUpdate >= 3000) {
    lastDisplayUpdate = millis();
    updateLCDDisplay();
  }
  
  delay(100); // Small delay to prevent watchdog issues
}

// ===== WiFi Connection Function =====
void connectWiFi() {
  Serial.print("🔌 Connecting to WiFi: ");
  Serial.println(ssid);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  lcd.setCursor(0, 1);
  lcd.print(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("   IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("   Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    
    // Show WiFi connected on LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected!");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    delay(2000);
  } else {
    Serial.println("\n❌ WiFi Connection Failed!");
    Serial.println("   Please check:");
    Serial.println("   - SSID and password are correct");
    Serial.println("   - Router is on 2.4GHz (ESP32 doesn't support 5GHz)");
    Serial.println("   - ESP32 is within range");
    Serial.println("\n   Restarting in 10 seconds...");
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed!");
    lcd.setCursor(0, 1);
    lcd.print("Restarting...");
    
    delay(10000);
    ESP.restart();
  }
}

// ===== Read All Sensors =====
SensorData readSensors() {
  SensorData data;
  
  // Read DHT22 (Temperature & Humidity) with Smoothing
  float rawTemp = dht.readTemperature();
  float rawHumidity = dht.readHumidity();
  
  // Check if DHT22 reading failed
  if (isnan(rawTemp) || isnan(rawHumidity)) {
    Serial.println("⚠️  DHT22 read failed, using previous values");
    data.temperature = lastTemp;
    data.humidity = lastHumidity;
  } else {
    // Apply exponential smoothing filter (70% new data, 30% old data)
    data.temperature = (rawTemp * 0.7) + (lastTemp * 0.3);
    data.humidity = (rawHumidity * 0.7) + (lastHumidity * 0.3);
    
    // Apply offset correction
    data.temperature += TEMP_OFFSET;
    data.humidity += HUMIDITY_OFFSET;
    
    // Store for next reading
    lastTemp = data.temperature;
    lastHumidity = data.humidity;
  }
  
  // Read Soil Moisture with Calibration
  int soilRaw = analogRead(SOIL_PIN);
  data.soilMoisture = map(soilRaw, SOIL_DRY_VALUE, SOIL_WET_VALUE, 0, 100);
  data.soilMoisture = constrain(data.soilMoisture, 0, 100);
  
  // Read pH Sensor with Calibration
  int phRaw = analogRead(PH_PIN);
  float phVoltage = (phRaw / 4095.0) * 3.3;  // Convert to voltage (0-3.3V)
  
  // Calculate pH using calibration values
  data.pH = 7.0 - ((phVoltage - PH_NEUTRAL_VOLTAGE) / PH_STEP);
  data.pH = constrain(data.pH, 4.0, 9.0);
  
  // Read Rain Sensor with Calibration
  int rainRaw = analogRead(RAIN_PIN);
  data.rainfall = map(rainRaw, RAIN_DRY_VALUE, RAIN_WET_VALUE, 0, 100);
  data.rainfall = constrain(data.rainfall, 0, 100);
  
  return data;
}

// ===== Send Data to Backend =====
void sendToBackend(SensorData data) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Cannot send - WiFi not connected");
    return;
  }
  
  HTTPClient http;
  
  // Configure HTTP request with timeout
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);  // 5 second timeout
  
  // Create JSON payload - MUST include "source": "krishi-sakha"
  StaticJsonDocument<256> jsonDoc;
  jsonDoc["temperature"] = data.temperature;
  jsonDoc["humidity"] = data.humidity;
  jsonDoc["soilMoisture"] = data.soilMoisture;
  jsonDoc["pH"] = data.pH;
  jsonDoc["rainfall"] = data.rainfall;  // Use "rainfall" not "rainLevel"
  jsonDoc["deviceId"] = deviceId;
  jsonDoc["apiKey"] = apiKey;
  jsonDoc["source"] = "krishi-sakha";  // CRITICAL: Required for frontend recognition
  
  String jsonString;
  serializeJson(jsonDoc, jsonString);
  
  // Print sending info
  Serial.println("\n📤 Sending data to backend...");
  Serial.print("   Count: #");
  Serial.println(sendCount + 1);
  Serial.print("   Temperature: ");
  Serial.print(data.temperature, 1);
  Serial.println("°C");
  Serial.print("   Humidity: ");
  Serial.print(data.humidity, 1);
  Serial.println("%");
  Serial.print("   Soil Moisture: ");
  Serial.print(data.soilMoisture, 1);
  Serial.println("%");
  Serial.print("   pH: ");
  Serial.println(data.pH, 1);
  Serial.print("   Rainfall: ");
  Serial.print(data.rainfall, 1);
  Serial.println("%");
  Serial.print("   JSON: ");
  Serial.println(jsonString);
  
  // Send HTTP POST request
  int httpResponseCode = http.POST(jsonString);
  
  // Handle response
  if (httpResponseCode == 200 || httpResponseCode == 201) {
    Serial.println("✅ Data sent successfully!");
    String response = http.getString();
    Serial.print("   Server response: ");
    Serial.println(response);
    
    // Show success on LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Sent #");
    lcd.print(sendCount + 1);
    lcd.setCursor(0, 1);
    lcd.print("Status: OK");
  } 
  else if (httpResponseCode > 0) {
    Serial.print("⚠️  HTTP Error Code: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.print("   Response: ");
    Serial.println(response);
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("HTTP Error!");
    lcd.setCursor(0, 1);
    lcd.print("Code: ");
    lcd.print(httpResponseCode);
  } 
  else {
    Serial.print("❌ Connection Error: ");
    Serial.println(httpResponseCode);
    Serial.println("   Possible causes:");
    Serial.println("   - Backend server not running");
    Serial.println("   - Wrong IP address in serverUrl");
    Serial.println("   - Firewall blocking port 5001");
    Serial.println("   - ESP32 and server on different networks");
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Send Failed!");
    lcd.setCursor(0, 1);
    lcd.print("Check Server");
  }
  
  http.end();
  Serial.println("========================================\n");
}

// ===== Update LCD Display =====
void updateLCDDisplay() {
  SensorData data = readSensors();
  
  lcd.clear();
  
  // Rotate through 3 display modes
  displayMode = (displayMode + 1) % 3;
  
  switch (displayMode) {
    case 0:  // Temperature & Humidity
      lcd.setCursor(0, 0);
      lcd.print("Temp: ");
      lcd.print(data.temperature, 1);
      lcd.print((char)223);  // Degree symbol
      lcd.print("C");
      
      lcd.setCursor(0, 1);
      lcd.print("Hum:  ");
      lcd.print(data.humidity, 1);
      lcd.print("%");
      break;
      
    case 1:  // Soil & pH
      lcd.setCursor(0, 0);
      lcd.print("Soil: ");
      lcd.print(data.soilMoisture, 1);
      lcd.print("%");
      
      lcd.setCursor(0, 1);
      lcd.print("pH:   ");
      lcd.print(data.pH, 1);
      break;
      
    case 2:  // Rainfall & WiFi Status
      lcd.setCursor(0, 0);
      lcd.print("Rain: ");
      lcd.print(data.rainfall, 1);
      lcd.print("%");
      
      lcd.setCursor(0, 1);
      lcd.print("WiFi: ");
      if (WiFi.status() == WL_CONNECTED) {
        lcd.print("OK ");
        lcd.print(WiFi.RSSI());
        lcd.print("dB");
      } else {
        lcd.print("Disconnected");
      }
      break;
  }
}

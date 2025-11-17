/*
 * Krishi Sakha - ESP32 Live Sensor Data Client
 * Sends real-time sensor data to your agriculture website
 * 
 * Required Libraries (Install via Arduino IDE Library Manager):
 * - WiFi (built-in for ESP32)
 * - HTTPClient (built-in)
 * - ArduinoJson (by Benoit Blanchon)
 * - DHT sensor library (by Adafruit)
 * - Adafruit Unified Sensor (dependency for DHT)
 * 
 * Hardware Connections:
 * ┌─────────────────────────────────────────┐
 * │ DHT22 Temperature & Humidity Sensor     │
 * │   VCC   → 3.3V (ESP32)                  │
 * │   DATA  → GPIO 4                        │
 * │   GND   → GND                           │
 * ├─────────────────────────────────────────┤
 * │ Capacitive Soil Moisture Sensor         │
 * │   VCC   → 3.3V                          │
 * │   AOUT  → GPIO 34 (Analog)              │
 * │   GND   → GND                           │
 * ├─────────────────────────────────────────┤
 * │ pH Sensor Module                        │
 * │   VCC   → 5V (if available) or 3.3V     │
 * │   AOUT  → GPIO 35 (Analog)              │
 * │   GND   → GND                           │
 * └─────────────────────────────────────────┘
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <LiquidCrystal_I2C.h>  // For I2C LCD display

// ==================== CONFIGURATION ====================
// WiFi credentials - CHANGE THESE!
const char* ssid = "YOUR_WIFI_SSID";           // Your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";   // Your WiFi password

// Backend server URL - CHANGE THIS!
// For local testing: "http://192.168.1.100:5001/api/sensors/data"
// For production: "https://yourdomain.com/api/sensors/data"
const char* serverUrl = "http://YOUR_SERVER_IP:5001/api/sensors/data";

// Device configuration
const char* deviceId = "ESP32_FARM_001";       // Unique identifier for this device
const char* farmerId = "";                     // Optional: Your farmer ID from the website
const char* apiKey = "";                       // Optional: API key for security

// Sensor pins
#define DHTPIN 4                               // DHT22 data pin
#define DHTTYPE DHT22                          // DHT sensor type
#define SOIL_PIN 34                            // Soil moisture analog pin
#define PH_PIN 35                              // pH sensor analog pin
#define RAIN_PIN 32                            // Rain sensor analog pin

// Timing
const long sendInterval = 10000;               // Send data every 10 seconds (10000 ms)

// ==================== GLOBAL OBJECTS ====================
DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);  // I2C address 0x27, 16 columns, 2 rows
unsigned long lastSendTime = 0;
unsigned long lastDisplayUpdate = 0;
const long displayInterval = 2000;  // Update LCD every 2 seconds
int displayMode = 0;  // 0=Temp/Hum, 1=Soil/pH, 2=Rain/WiFi

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n");
  Serial.println("╔═══════════════════════════════════════════╗");
  Serial.println("║   🌾 Krishi Sakha IoT Sensor System 🌾   ║");
  Serial.println("╚═══════════════════════════════════════════╝");
  Serial.println();
  
  // Initialize sensors
  Serial.println("🔧 Initializing sensors...");
  dht.begin();
  pinMode(SOIL_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);
  
  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Krishi Sakha");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");
  delay(2000);
  
  Serial.println("✅ Sensors initialized");
  
  // Connect to WiFi
  connectWiFi();
  
  Serial.println();
  Serial.println("╔═══════════════════════════════════════════╗");
  Serial.println("║          🚀 System Ready!                 ║");
  Serial.println("║   Sending data every 10 seconds...        ║");
  Serial.println("╚═══════════════════════════════════════════╝");
  Serial.println();
}

// ==================== WiFi CONNECTION ====================
void connectWiFi() {
  Serial.println("📡 Connecting to WiFi...");
  Serial.print("   Network: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  Serial.print("   ");
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✅ WiFi Connected!");
    Serial.print("   IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("   Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    
    // Show on LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    delay(2000);
  } else {
    Serial.println("❌ WiFi Connection Failed!");
    Serial.println("   Please check your SSID and password");
    Serial.println("   Note: ESP32 only supports 2.4GHz WiFi");
    
    // Show error on LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed!");
    lcd.setCursor(0, 1);
    lcd.print("Check Settings");
  }
}

// ==================== SENSOR READING FUNCTIONS ====================

float readTemperature() {
  float temp = dht.readTemperature();
  if (isnan(temp)) {
    Serial.println("⚠️  Warning: Failed to read temperature from DHT22");
    return 25.0; // Return default value
  }
  return temp;
}

float readHumidity() {
  float humidity = dht.readHumidity();
  if (isnan(humidity)) {
    Serial.println("⚠️  Warning: Failed to read humidity from DHT22");
    return 65.0; // Return default value
  }
  return humidity;
}

float readSoilMoisture() {
  // Read raw analog value (0-4095 for ESP32 12-bit ADC)
  int rawValue = analogRead(SOIL_PIN);
  
  // Convert to percentage (0-100%)
  // Calibration: Adjust these values based on your sensor
  // Dry soil = low value, Wet soil = high value
  int dryValue = 3200;   // Sensor reading in dry soil
  int wetValue = 1400;   // Sensor reading in wet soil
  
  float moisture = map(rawValue, dryValue, wetValue, 0, 100);
  moisture = constrain(moisture, 0, 100);
  
  return moisture;
}

float readPH() {
  // Read raw analog value
  int rawValue = analogRead(PH_PIN);
  
  // Convert to voltage (ESP32 ADC: 0-4095 = 0-3.3V)
  float voltage = rawValue * (3.3 / 4095.0);
  
  // Convert voltage to pH
  // Standard calibration: pH 7.0 = 1.65V, pH changes by ~0.33V per pH unit
  // Adjust calibration values based on your specific pH sensor
  float ph = 7.0 + ((voltage - 1.65) / 0.33);
  
  // Ensure pH is within valid range (0-14)
  ph = constrain(ph, 0, 14);
  
  return ph;
}

float readRainLevel() {
  // Read raw analog value (0-4095 for ESP32)
  int rawValue = analogRead(RAIN_PIN);
  
  // Convert to percentage (0-100%)
  // Rain sensor: High value = dry, Low value = wet
  int dryValue = 4095;   // Sensor reading when dry
  int wetValue = 0;      // Sensor reading when fully wet
  
  // Invert the mapping: 0% = no rain, 100% = heavy rain
  float rainLevel = map(rawValue, dryValue, wetValue, 0, 100);
  rainLevel = constrain(rainLevel, 0, 100);
  
  return rainLevel;
}

// ==================== LCD DISPLAY FUNCTION ====================

void updateLCDDisplay(float temp, float humidity, float soilMoisture, float ph, float rainLevel) {
  lcd.clear();
  
  if (displayMode == 0) {
    // Display Temperature & Humidity
    lcd.setCursor(0, 0);
    lcd.print("Temp: ");
    lcd.print(temp, 1);
    lcd.print((char)223);  // Degree symbol
    lcd.print("C");
    
    lcd.setCursor(0, 1);
    lcd.print("Humid: ");
    lcd.print(humidity, 1);
    lcd.print("%");
  } 
  else if (displayMode == 1) {
    // Display Soil Moisture & pH
    lcd.setCursor(0, 0);
    lcd.print("Soil: ");
    lcd.print(soilMoisture, 1);
    lcd.print("%");
    
    lcd.setCursor(0, 1);
    lcd.print("pH: ");
    lcd.print(ph, 2);
  }
  else if (displayMode == 2) {
    // Display Rain Level & WiFi Status
    lcd.setCursor(0, 0);
    lcd.print("Rain: ");
    lcd.print(rainLevel, 1);
    lcd.print("%");
    
    lcd.setCursor(0, 1);
    if (WiFi.status() == WL_CONNECTED) {
      lcd.print("WiFi: OK");
    } else {
      lcd.print("WiFi: Disconn");
    }
  }
  
  // Cycle through display modes
  displayMode++;
  if (displayMode > 2) displayMode = 0;
}

// ==================== DATA TRANSMISSION ====================

bool sendSensorData(float temp, float humidity, float soilMoisture, float ph, float rainLevel) {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi disconnected! Reconnecting...");
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      return false;
    }
  }
  
  HTTPClient http;
  
  // Configure HTTP client
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000); // 10 second timeout
  
  // Create JSON payload
  StaticJsonDocument<350> doc;
  doc["temperature"] = roundf(temp * 100) / 100;        // 2 decimal places
  doc["humidity"] = roundf(humidity * 100) / 100;
  doc["soilMoisture"] = roundf(soilMoisture * 100) / 100;
  doc["pH"] = roundf(ph * 100) / 100;
  doc["rainLevel"] = roundf(rainLevel * 100) / 100;
  doc["deviceId"] = deviceId;
  
  // Add optional fields if configured
  if (strlen(farmerId) > 0) {
    doc["farmerId"] = farmerId;
  }
  
  if (strlen(apiKey) > 0) {
    doc["apiKey"] = apiKey;
  }
  
  // Serialize JSON to string
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  // Send HTTP POST request
  Serial.println("📤 Sending data to server...");
  Serial.println("   URL: " + String(serverUrl));
  Serial.println("   Payload: " + jsonPayload);
  
  int httpCode = http.POST(jsonPayload);
  
  // Handle response
  if (httpCode > 0) {
    Serial.print("   Response Code: ");
    Serial.println(httpCode);
    
    if (httpCode == 201 || httpCode == 200) {
      Serial.println("✅ Data sent successfully!");
      Serial.println("┌─────────────────────────────────┐");
      Serial.print("│ 🌡️  Temperature:    ");
      Serial.print(temp, 1);
      Serial.println(" °C     │");
      Serial.print("│ 💧 Humidity:       ");
      Serial.print(humidity, 1);
      Serial.println(" %      │");
      Serial.print("│ 🌱 Soil Moisture:  ");
      Serial.print(soilMoisture, 1);
      Serial.println(" %      │");
      Serial.print("│ 🧪 pH Level:       ");
      Serial.print(ph, 2);
      Serial.println("          │");
      Serial.print("│ 🌧️  Rain Level:     ");
      Serial.print(rainLevel, 1);
      Serial.println(" %      │");
      Serial.println("└─────────────────────────────────┘");
      
      // Print server response
      String response = http.getString();
      if (response.length() > 0) {
        Serial.println("   Server Response: " + response);
      }
      
      http.end();
      return true;
    } else {
      Serial.print("❌ Server error (HTTP ");
      Serial.print(httpCode);
      Serial.println(")");
      String response = http.getString();
      Serial.println("   Error: " + response);
    }
  } else {
    Serial.print("❌ Connection failed: ");
    Serial.println(http.errorToString(httpCode));
  }
  
  http.end();
  return false;
}

// ==================== MAIN LOOP ====================

void loop() {
  unsigned long currentTime = millis();
  
  // Send data at regular intervals
  if (currentTime - lastSendTime >= sendInterval) {
    lastSendTime = currentTime;
    
    Serial.println();
    Serial.println("═══════════════════════════════════════════");
    Serial.print("⏰ Time: ");
    Serial.print(currentTime / 1000);
    Serial.println(" seconds since boot");
    
    // Read all sensors
    Serial.println("📊 Reading sensors...");
    float temp = readTemperature();
    float humidity = readHumidity();
    float soilMoisture = readSoilMoisture();
    float ph = readPH();
    float rainLevel = readRainLevel();
    
    // Send data to backend
    sendSensorData(temp, humidity, soilMoisture, ph, rainLevel);
    
    Serial.println("═══════════════════════════════════════════");
  }
  
  // Update LCD display at regular intervals
  if (currentTime - lastDisplayUpdate >= displayInterval) {
    lastDisplayUpdate = currentTime;
    
    float temp = readTemperature();
    float humidity = readHumidity();
    float soilMoisture = readSoilMoisture();
    float ph = readPH();
    float rainLevel = readRainLevel();
    
    updateLCDDisplay(temp, humidity, soilMoisture, ph, rainLevel);
  }
  
  // Small delay to prevent overwhelming the CPU
  delay(100);
}

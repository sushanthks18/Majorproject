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
 * 
 * Libraries Required:
 * - WiFi (built-in)
 * - HTTPClient (built-in)
 * - ArduinoJson (install via Library Manager)
 * - DHT sensor library (install via Library Manager)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ===== Sensor Data Structure =====
struct SensorData {
  float temperature;
  float humidity;
  float soilMoisture;
  float pH;
  float rainLevel;
};


// ===== WiFi Configuration =====
const char* ssid = "YOUR_WIFI_SSID";           // Replace with your WiFi name
const char* password = "YOUR_WIFI_PASSWORD";   // Replace with your WiFi password

// ===== Server Configuration =====
const char* serverUrl = "http://c3d68d5ed3b1be.lhr.life/api/sensors/data";  // Dynamically points to the running backend local host
const char* deviceId = "ESP32_SENSOR_001";     // Unique device identifier
const char* apiKey = "your-api-key-here";      // Optional API key for authentication

// ===== Sensor Pin Configuration =====
#define DHT_PIN 4           // DHT22 data pin
#define DHT_TYPE DHT22      // DHT sensor type
#define SOIL_PIN 34         // Soil moisture sensor analog pin
#define PH_PIN 35           // pH sensor analog pin
#define RAIN_PIN 32         // Rain sensor analog pin

// ===== Timing Configuration =====
const unsigned long SEND_INTERVAL = 5000;  // Send data every 5 seconds (5000ms)

// ===== Global Variables =====
DHT dht(DHT_PIN, DHT_TYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);  // LCD I2C address 0x27, 16 columns, 2 rows
unsigned long lastSendTime = 0;
int sendCount = 0;
int displayMode = 0;  // 0=Temp&Hum, 1=Soil&pH, 2=Rain&Status
unsigned long lastDisplayUpdate = 0;

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
  
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  
  if (strlen(password) > 0) {
    WiFi.begin(ssid, password);
  } else {
    WiFi.begin(ssid);
  }
  
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
    delay(10000);
    ESP.restart();
  }
}



// ===== Read All Sensors =====
SensorData readSensors() {
  SensorData data;
  
  // Read DHT22 (Temperature & Humidity)
  data.temperature = dht.readTemperature();
  data.humidity = dht.readHumidity();
  
  // Check if DHT22 reading failed
  if (isnan(data.temperature) || isnan(data.humidity)) {
    Serial.println("⚠️  DHT22 read failed, using default values");
    data.temperature = 25.0;
    data.humidity = 65.0;
  }
  
  // Read Soil Moisture (0-4095 raw value, convert to 0-100%)
  // INVERTED: High value (dry air) = 0%, Low value (wet soil) = 100%
  int soilRaw = analogRead(SOIL_PIN);
  data.soilMoisture = map(soilRaw, 4095, 0, 0, 100);  // Inverted mapping
  
  // Ensure soil moisture is in valid range
  if (data.soilMoisture < 0) data.soilMoisture = 0;
  if (data.soilMoisture > 100) data.soilMoisture = 100;
  
  // Read pH Sensor (0-4095 raw value, convert to pH scale 0-14)
  int phRaw = analogRead(PH_PIN);
  data.pH = map(phRaw, 0, 4095, 0, 1400) / 100.0;  // Convert to 0-14 pH scale
  
  // Ensure pH is in valid range (typically 4-9 for soil)
  if (data.pH < 4.0) data.pH = 4.0;
  if (data.pH > 9.0) data.pH = 9.0;
  
  // Read Rain Sensor (0-4095 raw value, convert to 0-100%)
  // Lower value = more rain detected
  // Inverted: 0% = dry, 100% = heavy rain
  int rainRaw = analogRead(RAIN_PIN);
  data.rainLevel = map(rainRaw, 4095, 0, 0, 100);  // Inverted mapping
  
  // Ensure rain level is in valid range
  if (data.rainLevel < 0) data.rainLevel = 0;
  if (data.rainLevel > 100) data.rainLevel = 100;
  
  return data;
}

// ===== Send Data to Backend =====
void sendToBackend(SensorData data) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Cannot send - WiFi not connected");
    return;
  }
  
  WiFiClient client;
  HTTPClient http;
  http.begin(client, serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<256> jsonDoc;
  jsonDoc["temperature"] = data.temperature;
  jsonDoc["humidity"] = data.humidity;
  jsonDoc["soilMoisture"] = data.soilMoisture;
  jsonDoc["pH"] = data.pH;
  jsonDoc["rainLevel"] = data.rainLevel;
  jsonDoc["deviceId"] = deviceId;
  jsonDoc["apiKey"] = apiKey;
  
  String jsonString;
  serializeJson(jsonDoc, jsonString);
  
  // Print sending info
  Serial.println("\n📤 Sending data to backend...");
  Serial.print("   Count: #");
  Serial.println(sendCount + 1);
  Serial.print("   Temperature: ");
  Serial.print(data.temperature);
  Serial.println("°C");
  Serial.print("   Humidity: ");
  Serial.print(data.humidity);
  Serial.println("%");
  Serial.print("   Soil Moisture: ");
  Serial.print(data.soilMoisture);
  Serial.println("%");
  Serial.print("   pH: ");
  Serial.println(data.pH);
  Serial.print("   Rain Level: ");
  Serial.print(data.rainLevel);
  Serial.print("% ");
  if (data.rainLevel > 70) {
    Serial.println("(Heavy Rain)");
  } else if (data.rainLevel > 30) {
    Serial.println("(Light Rain)");
  } else {
    Serial.println("(Dry)");
  }
  
  // Send POST request
  int httpResponseCode = http.POST(jsonString);
  
  // Handle response
  if (httpResponseCode > 0) {
    Serial.print("✅ Response Code: ");
    Serial.println(httpResponseCode);
    
    if (httpResponseCode == 201) {
      Serial.println("   ✓ Data saved successfully!");
    } else if (httpResponseCode == 200) {
      Serial.println("   ✓ Request successful!");
    }
    
    String response = http.getString();
    Serial.print("   Server Response: ");
    Serial.println(response);
    
  } else {
    Serial.print("❌ Error Code: ");
    Serial.println(httpResponseCode);
    Serial.println("   Possible issues:");
    Serial.println("   - Backend server not running");
    Serial.println("   - Wrong server URL/IP address");
    Serial.println("   - Firewall blocking connection");
    Serial.println("   - Network connectivity issue");
  }
  
  Serial.println("-----------------------------------");
  
  http.end();
}

// ===== Update LCD Display =====
void updateLCDDisplay() {
  // Read current sensor data
  SensorData data = readSensors();
  
  lcd.clear();
  
  // Rotate through different display modes every 3 seconds
  displayMode = (displayMode + 1) % 3;
  
  switch (displayMode) {
    case 0:  // Temperature & Humidity
      lcd.setCursor(0, 0);
      lcd.print("Temp: ");
      lcd.print(data.temperature, 1);
      lcd.print((char)223);  // Degree symbol
      lcd.print("C");
      
      lcd.setCursor(0, 1);
      lcd.print("Humi: ");
      lcd.print(data.humidity, 1);
      lcd.print("%");
      break;
      
    case 1:  // Soil Moisture & pH
      lcd.setCursor(0, 0);
      lcd.print("Soil: ");
      lcd.print(data.soilMoisture, 0);
      lcd.print("%");
      
      lcd.setCursor(0, 1);
      lcd.print("pH: ");
      lcd.print(data.pH, 1);
      break;
      
    case 2:  // Rain Level & Connection Status
      lcd.setCursor(0, 0);
      lcd.print("Rain: ");
      lcd.print(data.rainLevel, 0);
      lcd.print("%");
      if (data.rainLevel > 70) {
        lcd.print(" Heavy");
      } else if (data.rainLevel > 30) {
        lcd.print(" Light");
      } else {
        lcd.print(" Dry");
      }
      
      lcd.setCursor(0, 1);
      if (WiFi.status() == WL_CONNECTED) {
        lcd.print("WiFi: OK ");
        lcd.print(WiFi.RSSI());
        lcd.print("dB");
      } else {
        lcd.print("WiFi: Disconn.");
      }
      break;
  }
}

/*
 * Smart Agriculture System - ESP32/ESP8266 Sensor Client
 * This sketch reads sensor data and sends it to the backend server
 * 
 * Required Libraries:
 * - WiFi (built-in)
 * - HTTPClient (built-in)
 * - ArduinoJson
 * - DHT sensor library (for DHT22)
 * 
 * Hardware Connections:
 * - DHT22: Data pin to GPIO 4
 * - Soil Moisture Sensor: Analog pin to GPIO 34 (ESP32) or A0 (ESP8266)
 * - pH Sensor: Analog pin to GPIO 35 (ESP32)
 */

#include <WiFi.h>        // For ESP32
// #include <ESP8266WiFi.h> // Uncomment for ESP8266
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Backend configuration
const char* serverUrl = "http://YOUR_SERVER_IP:5001/api/sensors/data";
const char* farmerId = ""; // Leave empty or set farmer ID
const char* deviceId = "ESP32_SENSOR_001";
const char* apiKey = "your-api-key-here";

// Pin definitions
#define DHTPIN 4          // DHT22 data pin
#define DHTTYPE DHT22     // DHT sensor type
#define SOIL_PIN 34       // Soil moisture sensor (ESP32)
#define PH_PIN 35         // pH sensor analog pin

// Sensor objects
DHT dht(DHTPIN, DHTTYPE);

// Timing
unsigned long lastSendTime = 0;
const long sendInterval = 5000; // Send data every 5 seconds

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("🌾 Smart Agriculture IoT Sensor");
  Serial.println("================================");
  
  // Initialize sensors
  dht.begin();
  pinMode(SOIL_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  
  // Connect to WiFi
  connectWiFi();
  
  Serial.println("✅ Setup complete!");
  Serial.println("================================\n");
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("✅ WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("❌ WiFi Connection Failed!");
  }
}

float readTemperature() {
  float temp = dht.readTemperature();
  if (isnan(temp)) {
    Serial.println("⚠️  Failed to read temperature!");
    return 25.0; // Default value
  }
  return temp;
}

float readHumidity() {
  float humidity = dht.readHumidity();
  if (isnan(humidity)) {
    Serial.println("⚠️  Failed to read humidity!");
    return 65.0; // Default value
  }
  return humidity;
}

float readSoilMoisture() {
  // Read analog value (0-4095 for ESP32, 0-1023 for ESP8266)
  int rawValue = analogRead(SOIL_PIN);
  
  // Convert to percentage (calibrate these values for your sensor)
  float moisture = map(rawValue, 0, 4095, 0, 100);
  return constrain(moisture, 0, 100);
}

float readPH() {
  // Read analog value
  int rawValue = analogRead(PH_PIN);
  
  // Convert to pH (calibrate for your sensor)
  // Typical pH sensor outputs: 0V = pH 0, 3.3V = pH 14
  float voltage = rawValue * (3.3 / 4095.0);
  float ph = 7.0 + ((voltage - 1.65) / 0.33); // Calibration formula
  return constrain(ph, 0, 14);
}

bool sendSensorData(float temp, float humidity, float soilMoisture, float ph) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected!");
    connectWiFi();
    return false;
  }
  
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["temperature"] = temp;
  doc["humidity"] = humidity;
  doc["soilMoisture"] = soilMoisture;
  doc["pH"] = ph;
  doc["deviceId"] = deviceId;
  
  if (strlen(farmerId) > 0) {
    doc["farmerId"] = farmerId;
  }
  
  if (strlen(apiKey) > 0) {
    doc["apiKey"] = apiKey;
  }
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send POST request
  int httpCode = http.POST(jsonString);
  
  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_CREATED || httpCode == HTTP_CODE_OK) {
      Serial.println("✅ Data sent successfully!");
      Serial.print("   Temperature: "); Serial.print(temp); Serial.println("°C");
      Serial.print("   Humidity: "); Serial.print(humidity); Serial.println("%");
      Serial.print("   Soil Moisture: "); Serial.print(soilMoisture); Serial.println("%");
      Serial.print("   pH: "); Serial.println(ph);
      Serial.println("-----------------------------------");
      http.end();
      return true;
    } else {
      Serial.print("❌ Server error: ");
      Serial.println(httpCode);
      String response = http.getString();
      Serial.println(response);
    }
  } else {
    Serial.print("❌ HTTP error: ");
    Serial.println(http.errorToString(httpCode));
  }
  
  http.end();
  return false;
}

void loop() {
  unsigned long currentTime = millis();
  
  // Send data at regular intervals
  if (currentTime - lastSendTime >= sendInterval) {
    lastSendTime = currentTime;
    
    // Read all sensors
    float temp = readTemperature();
    float humidity = readHumidity();
    float soilMoisture = readSoilMoisture();
    float ph = readPH();
    
    // Send to backend
    sendSensorData(temp, humidity, soilMoisture, ph);
  }
  
  // Small delay to prevent overwhelming the system
  delay(100);
}

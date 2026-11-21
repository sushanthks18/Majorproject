#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ================= LoRa Pins =================
#define LORA_SCK       18
#define LORA_MISO      19
#define LORA_MOSI      23
#define LORA_CS         5
#define LORA_RST       14
#define LORA_DIO0       2
#define LORA_FREQUENCY 433E6
#define LORA_SYNC_WORD 0xF3

// ================= LCD =================
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ================= Wi-Fi Configuration =================
const char* WIFI_SSID = "LORA";
const char* WIFI_PASSWORD = "11112222";

// ================= Dynamic Auto-Discovery Backend State =================
// Starts with initial fallback, then updates automatically whenever MacBook sends beacon:
String backendUrl = "http://10.240.60.37:5001/api/sensors/data";
WiFiUDP udp;
const int UDP_BEACON_PORT = 5002;
bool udpListening = false;

// ================= Wi-Fi Timing =================
unsigned long lastWiFiAttempt = 0;
const unsigned long WIFI_RETRY_INTERVAL = 10000;
unsigned long lastBackendAttempt = 0;
const unsigned long BACKEND_RETRY_INTERVAL = 3000;

// ================= Received Values =================
unsigned long packetNumber = 0;
int nitrogen = -1;
int phosphorus = -1;
int potassium = -1;
int soilRaw = 0;
int soilPercent = 0;
bool rainDetected = false;
float temperature = -1.0;
float humidity = -1.0;
int receivedRSSI = 0;

// ================= Display Control =================
bool dataReceived = false;
unsigned long lastPacketTime = 0;
unsigned long lastScreenChange = 0;
const unsigned long screenInterval = 2000;
const unsigned long signalTimeout = 15000;
int currentScreen = 0;

// ================= Packet Parsing =================
String getField(const String &data, int fieldNumber) {
  int currentField = 0;
  int startPosition = 0;
  for (int i = 0; i <= data.length(); i++) {
    if (i == data.length() || data.charAt(i) == ',') {
      if (currentField == fieldNumber) {
        return data.substring(startPosition, i);
      }
      currentField++;
      startPosition = i + 1;
    }
  }
  return "";
}

// Expected packet contains nine fields and eight commas.
bool validPacket(const String &packet) {
  int commaCount = 0;
  for (int i = 0; i < packet.length(); i++) {
    if (packet.charAt(i) == ',') {
      commaCount++;
    }
  }
  return commaCount == 8;
}

// ================= Wi-Fi Connection =================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }
  if (millis() - lastWiFiAttempt < WIFI_RETRY_INTERVAL) {
    return;
  }
  lastWiFiAttempt = millis();
  Serial.println("Connecting to Wi-Fi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// ================= Automatic UDP Beacon Listener =================
// Listens for MacBook beacon broadcast to detect MacBook's IP on ANY Wi-Fi automatically
void checkUdpBeacon() {
  if (WiFi.status() != WL_CONNECTED) {
    udpListening = false;
    return;
  }
  if (!udpListening) {
    udp.begin(UDP_BEACON_PORT);
    udpListening = true;
    Serial.println("📡 [Auto-Discovery] Listening for MacBook Beacon on port 5002...");
  }

  int packetSize = udp.parsePacket();
  if (packetSize > 0) {
    char buffer[256];
    int len = udp.read(buffer, sizeof(buffer) - 1);
    if (len > 0) {
      buffer[len] = '\0';
      StaticJsonDocument<256> beaconDoc;
      DeserializationError err = deserializeJson(beaconDoc, buffer);
      if (!err && beaconDoc.containsKey("ip")) {
        const char* detectedIp = beaconDoc["ip"];
        int detectedPort = beaconDoc["port"] | 5001;
        String newUrl = "http://" + String(detectedIp) + ":" + String(detectedPort) + "/api/sensors/data";
        if (newUrl != backendUrl) {
          backendUrl = newUrl;
          Serial.println("\n🎯 [AUTO-DISCOVERY SUCCESS] Detected MacBook IP over Wi-Fi!");
          Serial.println("   New Dashboard Target: " + backendUrl);
        }
      }
    }
  }
}

// ================= Backend Upload =================
void sendToBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi unavailable. Upload skipped.");
    return;
  }
  // Limit upload attempts to avoid repeated requests.
  if (millis() - lastBackendAttempt < BACKEND_RETRY_INTERVAL) {
    return;
  }
  lastBackendAttempt = millis();

  HTTPClient http;
  http.setConnectTimeout(5000);
  http.setTimeout(5000);

  if (!http.begin(backendUrl)) {
    Serial.println("Failed to initialize backend URL: " + backendUrl);
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", "krishi_sakha_device_secret_2026");

  StaticJsonDocument<512> doc;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["soilMoisture"] = soilPercent;
  doc["rainLevel"] = rainDetected ? 100 : 0;
  doc["deviceId"] = "KRISHI_SAKHA_LORA_001";
  doc["nitrogen"] = nitrogen;
  doc["phosphorus"] = phosphorus;
  doc["potassium"] = potassium;
  doc["soilRaw"] = soilRaw;
  doc["rssi"] = receivedRSSI;
  doc["packetNum"] = packetNumber;
  doc["source"] = "lora-sx1278";

  String payload;
  serializeJson(doc, payload);
  Serial.print("Uploading sensor data to ");
  Serial.println(backendUrl);

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    Serial.print("Backend HTTP status: ");
    Serial.println(httpCode);
    if (httpCode >= 200 && httpCode < 300) {
      Serial.println("✅ Sensor data uploaded successfully to Dashboard!");
    } else {
      Serial.println("⚠️ Backend rejected the request.");
      Serial.println(http.getString());
    }
  } else {
    Serial.print("❌ Backend connection failed: ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
}

// ================= LCD Display =================
void displayScreen() {
  lcd.clear();
  if (!dataReceived) {
    lcd.setCursor(0, 0);
    lcd.print("LoRa Receiver");
    lcd.setCursor(0, 1);
    lcd.print("Waiting...");
    return;
  }
  // Page 1: NPK
  if (currentScreen == 0) {
    lcd.setCursor(0, 0);
    lcd.print("N:");
    lcd.print(nitrogen);
    lcd.print(" P:");
    lcd.print(phosphorus);
    lcd.setCursor(0, 1);
    lcd.print("K:");
    lcd.print(potassium);
    lcd.print(" mg/kg");
  }
  // Page 2: Soil moisture and rain
  else if (currentScreen == 1) {
    lcd.setCursor(0, 0);
    lcd.print("Soil:");
    lcd.print(soilPercent);
    lcd.print("%");
    lcd.setCursor(0, 1);
    lcd.print("Rain:");
    lcd.print(rainDetected ? "YES" : "NO");
  }
  // Page 3: Temperature and humidity
  else if (currentScreen == 2) {
    lcd.setCursor(0, 0);
    lcd.print("Temp:");
    if (temperature < 0) {
      lcd.print("ERROR");
    } else {
      lcd.print(temperature, 1);
      lcd.print((char)223);
      lcd.print("C");
    }
    lcd.setCursor(0, 1);
    lcd.print("Hum :");
    if (humidity < 0) {
      lcd.print("ERROR");
    } else {
      lcd.print(humidity, 1);
      lcd.print("%");
    }
  }
  // Page 4: Packet number and LoRa signal
  else {
    lcd.setCursor(0, 0);
    lcd.print("Packet:");
    lcd.print(packetNumber);
    lcd.setCursor(0, 1);
    lcd.print("RSSI:");
    lcd.print(receivedRSSI);
    lcd.print("dBm");
  }
}

// ================= Setup =================
void setup() {
  Serial.begin(115200);
  delay(1000);

  // Initialize LCD.
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Starting LoRa");

  // Initialize LoRa SPI.
  SPI.begin(
    LORA_SCK,
    LORA_MISO,
    LORA_MOSI,
    LORA_CS
  );
  LoRa.setPins(
    LORA_CS,
    LORA_RST,
    LORA_DIO0
  );

  if (!LoRa.begin(LORA_FREQUENCY)) {
    Serial.println("LoRa initialization failed!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("LoRa FAILED");
    while (true) {
      delay(1000);
    }
  }

  LoRa.setSyncWord(LORA_SYNC_WORD);
  Serial.println("LoRa receiver ready.");

  // Start Wi-Fi without waiting for connection.
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWiFiAttempt = millis();
  Serial.println("Wi-Fi connection started.");

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("LoRa Receiver");
  lcd.setCursor(0, 1);
  lcd.print("Waiting...");
}

// ================= Main Loop =================
void loop() {
  // 1. Maintain Wi-Fi connection
  connectWiFi();

  // 2. Automatically check for MacBook Beacon to update IP on ANY Wi-Fi
  checkUdpBeacon();

  // 3. Check for received LoRa packets.
  int packetSize = LoRa.parsePacket();
  if (packetSize > 0) {
    String packet = "";
    while (LoRa.available()) {
      packet += (char)LoRa.read();
    }
    receivedRSSI = LoRa.packetRssi();
    Serial.print("Received: ");
    Serial.println(packet);
    Serial.print("RSSI: ");
    Serial.println(receivedRSSI);

    if (validPacket(packet)) {
      /*
        Expected packet:
        packetNumber,N,P,K,soilRaw,soilPercent,rain,temp,humidity
        Example:
        26,0,0,0,3421,0,0,27.0,54.9
      */
      packetNumber = getField(packet, 0).toInt();
      nitrogen = getField(packet, 1).toInt();
      phosphorus = getField(packet, 2).toInt();
      potassium = getField(packet, 3).toInt();
      soilRaw = getField(packet, 4).toInt();
      soilPercent = getField(packet, 5).toInt();
      rainDetected = (getField(packet, 6).toInt() == 1);
      temperature = getField(packet, 7).toFloat();
      humidity = getField(packet, 8).toFloat();

      bool firstPacket = !dataReceived;
      dataReceived = true;
      lastPacketTime = millis();

      if (firstPacket) {
        currentScreen = 0;
        lastScreenChange = millis();
      }

      // Preserve the existing LCD behaviour.
      displayScreen();

      // Forward the received values to the dynamically discovered backend.
      sendToBackend();

      Serial.print("Temperature: ");
      Serial.print(temperature, 1);
      Serial.println(" C");
      Serial.print("Humidity: ");
      Serial.print(humidity, 1);
      Serial.println("%");
      Serial.print("LCD page: ");
      Serial.println(currentScreen);
    } else {
      Serial.println("Invalid packet format.");
    }
  }

  // Change LCD page every two seconds.
  if (
    dataReceived &&
    millis() - lastScreenChange >= screenInterval
  ) {
    lastScreenChange = millis();
    currentScreen++;
    if (currentScreen > 3) {
      currentScreen = 0;
    }
    displayScreen();
  }

  // Warn if no LoRa packet arrives for 15 seconds.
  if (
    dataReceived &&
    millis() - lastPacketTime >= signalTimeout
  ) {
    dataReceived = false;
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Signal lost");
    lcd.setCursor(0, 1);
    lcd.print("RSSI:");
    lcd.print(receivedRSSI);
    lcd.print("dBm");
    Serial.println("LoRa signal lost.");
  }
}

#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ESPmDNS.h>
#include <WiFiManager.h>
#include <Preferences.h>
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

// ================= Portal Trigger Pin =================
#define TRIGGER_PIN     0    // BOOT button on ESP32 (active LOW)

// ================= Captive Portal Configuration =================
#define AP_SSID        "KrishiSakha-Setup"
#define AP_PASSWORD    "KrishiSakha@2026"

// ================= LCD =================
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ================= Persistent Storage =================
Preferences preferences;
char deviceToken[64] = "krishi_sakha_device_secret_2026";
char customBackend[128] = "10.240.60.37";

// ================= Dynamic Backend State =================
String backendUrl = "";
bool backendDiscovered = false;
unsigned long lastDiscoveryAttempt = 0;
const unsigned long REDISCOVERY_INTERVAL = 30000; // 30s retry if not found

// ================= Sensor Data Struct =================
struct SensorPacket {
  unsigned long packetNum;
  int nitrogen;
  int phosphorus;
  int potassium;
  int soilRaw;
  int soilPercent;
  bool rainDetected;
  float temperature;
  float humidity;
  int rssi;
};

// Queue for inter-task communication (Core 1 -> Core 0)
QueueHandle_t packetQueue;

// Display values (updated by Core 1)
volatile unsigned long currentPacketNum = 0;
volatile int currentN = -1;
volatile int currentP = -1;
volatile int currentK = -1;
volatile int currentSoilPercent = 0;
volatile bool currentRain = false;
volatile float currentTemp = -1.0;
volatile float currentHum = -1.0;
volatile int currentRSSI = 0;
volatile bool hasReceivedData = false;
volatile unsigned long lastPacketTime = 0;

int currentScreen = 0;
unsigned long lastScreenChange = 0;
const unsigned long screenInterval = 2000;
const unsigned long signalTimeout = 15000;

// Flag to request on-demand config portal from Core 0
volatile bool triggerPortalFlag = false;

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

bool validPacket(const String &packet) {
  int commaCount = 0;
  for (int i = 0; i < packet.length(); i++) {
    if (packet.charAt(i) == ',') {
      commaCount++;
    }
  }
  return commaCount == 8;
}

// ================= LCD Display =================
void displayScreen() {
  lcd.clear();
  if (!hasReceivedData) {
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
    lcd.print(currentN);
    lcd.print(" P:");
    lcd.print(currentP);
    lcd.setCursor(0, 1);
    lcd.print("K:");
    lcd.print(currentK);
    lcd.print(" mg/kg");
  }
  // Page 2: Soil moisture and rain
  else if (currentScreen == 1) {
    lcd.setCursor(0, 0);
    lcd.print("Soil:");
    lcd.print(currentSoilPercent);
    lcd.print("%");
    lcd.setCursor(0, 1);
    lcd.print("Rain:");
    lcd.print(currentRain ? "YES" : "NO");
  }
  // Page 3: Temperature and humidity
  else if (currentScreen == 2) {
    lcd.setCursor(0, 0);
    lcd.print("Temp:");
    if (currentTemp < 0) {
      lcd.print("ERROR");
    } else {
      lcd.print(currentTemp, 1);
      lcd.print((char)223);
      lcd.print("C");
    }
    lcd.setCursor(0, 1);
    lcd.print("Hum :");
    if (currentHum < 0) {
      lcd.print("ERROR");
    } else {
      lcd.print(currentHum, 1);
      lcd.print("%");
    }
  }
  // Page 4: Packet number and LoRa signal
  else {
    lcd.setCursor(0, 0);
    lcd.print("Packet:");
    lcd.print(currentPacketNum);
    lcd.setCursor(0, 1);
    lcd.print("RSSI:");
    lcd.print(currentRSSI);
    lcd.print("dBm");
  }
}

// ================= Dynamic mDNS & Cloud Backend Discovery =================
bool discoverBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  // 1. Check if user configured a stable cloud endpoint or manual host (Primary priority)
  if (strlen(customBackend) > 0) {
    String cHost = String(customBackend);
    cHost.trim();
    if (!cHost.startsWith("http://") && !cHost.startsWith("https://")) {
      // Default to https if looks like cloud domain, else http
      if (cHost.indexOf(".com") >= 0 || cHost.indexOf(".app") >= 0 || cHost.indexOf(".dev") >= 0) {
        cHost = "https://" + cHost;
      } else {
        cHost = "http://" + cHost;
      }
    }
    bool isPublicCloud = cHost.indexOf(".onrender.com") >= 0 || 
                         cHost.indexOf(".railway.app") >= 0 || 
                         cHost.indexOf(".up.railway.app") >= 0 || 
                         cHost.indexOf(".fly.dev") >= 0 || 
                         cHost.startsWith("https://");
    // If user specified a .local hostname (e.g. krishisakha.local), resolve via mDNS directly
    if (cHost.indexOf(".local") >= 0) {
      String rawHost = cHost;
      rawHost.replace("http://", "");
      rawHost.replace("https://", "");
      int colonPos = rawHost.indexOf(":");
      if (colonPos >= 0) rawHost = rawHost.substring(0, colonPos);
      int slashPos = rawHost.indexOf("/");
      if (slashPos >= 0) rawHost = rawHost.substring(0, slashPos);
      rawHost.replace(".local", "");

      IPAddress resolvedLocalIP = MDNS.queryHost(rawHost.c_str());
      if (resolvedLocalIP[0] != 0 && resolvedLocalIP[0] != 255) {
        backendUrl = "http://" + resolvedLocalIP.toString() + ":5001/api/sensors/data";
        Serial.printf("   ☁️ [Configured .local] Resolved %s via mDNS: %s\n", rawHost.c_str(), backendUrl.c_str());
        backendDiscovered = true;
        return true;
      }
    }

    if (!isPublicCloud && cHost.indexOf(":5001") < 0) {
      cHost += ":5001";
    }
    if (cHost.indexOf("/api/sensors/data") < 0) {
      if (cHost.endsWith("/")) cHost += "api/sensors/data";
      else cHost += "/api/sensors/data";
    }
    backendUrl = cHost;
    Serial.println("   ☁️ [Configured Target] Endpoint: " + backendUrl);
    backendDiscovered = true;
    return true;
  }

  Serial.println("\n🔍 [mDNS] Discovering Krishi Sakha Backend on Local Network...");
  IPAddress myIP = WiFi.localIP();
  IPAddress netmask = WiFi.subnetMask();
  String fallbackCandidate = "";

  // 2. Query mDNS service _http._tcp
  int n = MDNS.queryService("http", "tcp");
  if (n > 0) {
    for (int i = 0; i < n; i++) {
      String sName = MDNS.instanceName(i);
      IPAddress sIP = MDNS.address(i);
      uint16_t sPort = MDNS.port(i);
      Serial.printf("   Found service '%s' at %s:%d\n", sName.c_str(), sIP.toString().c_str(), sPort);

      if (sName.indexOf("Krishi") >= 0 || sPort == 5001) {
        // Check if TXT record includes advertised LAN IP
        if (MDNS.hasTxt(i, "ip")) {
          String txtIp = MDNS.txt(i, "ip");
          if (txtIp.length() > 6) {
            backendUrl = "http://" + txtIp + ":" + String(sPort) + "/api/sensors/data";
            Serial.println("   ✅ Matched via mDNS TXT record IP: " + backendUrl);
            backendDiscovered = true;
            return true;
          }
        }

        // Check if sIP matches local subnet
        bool sameSubnet = true;
        for (int b = 0; b < 4; b++) {
          if ((myIP[b] & netmask[b]) != (sIP[b] & netmask[b])) {
            sameSubnet = false;
            break;
          }
        }
        if (sameSubnet && sIP[0] != 0) {
          backendUrl = "http://" + sIP.toString() + ":" + String(sPort) + "/api/sensors/data";
          Serial.println("   ✅ Matched via local subnet mDNS IP: " + backendUrl);
          backendDiscovered = true;
          return true;
        } else if (fallbackCandidate.length() == 0 && sIP[0] != 0) {
          fallbackCandidate = "http://" + sIP.toString() + ":" + String(sPort) + "/api/sensors/data";
        }
      }
    }
  }

  // 3. Resolve hostname krishisakha, krishisakha-backend, or Mac hostnames via MDNS
  const char* hostCandidates[] = {
    "krishisakha-2",
    "krishisakha",
    "krishisakha-backend",
    "Sushanths-MacBook-Air-4",
    "Sushanths-MacBook-Air-2",
    "Sushanths-MacBook-Air"
  };
  for (const char* h : hostCandidates) {
    IPAddress hostIP = MDNS.queryHost(h);
    if (hostIP[0] != 0 && hostIP[0] != 255) {
      backendUrl = "http://" + hostIP.toString() + ":5001/api/sensors/data";
      Serial.printf("   ✅ Resolved %s via mDNS: %s\n", h, backendUrl.c_str());
      backendDiscovered = true;
      return true;
    }
    String localHost = String(h) + ".local";
    if (WiFi.hostByName(localHost.c_str(), hostIP) == 1) {
      backendUrl = "http://" + hostIP.toString() + ":5001/api/sensors/data";
      Serial.printf("   ✅ Resolved %s via DNS: %s\n", localHost.c_str(), backendUrl.c_str());
      backendDiscovered = true;
      return true;
    }
  }

  // 4. Fallback candidate from service query if found
  if (fallbackCandidate.length() > 0) {
    backendUrl = fallbackCandidate;
    Serial.println("   ℹ️ Using service candidate IP: " + backendUrl);
    backendDiscovered = true;
    return true;
  }

  // 5. Default Gateway fallback (when Mac provides hotspot)
  IPAddress gateway = WiFi.gatewayIP();
  if (gateway[0] != 0 && gateway[0] != 255) {
    backendUrl = "http://" + gateway.toString() + ":5001/api/sensors/data";
    Serial.println("   ℹ️ Fallback to Gateway IP: " + backendUrl);
    backendDiscovered = true;
    return true;
  }

  Serial.println("   ❌ No backend discovered. Will retry.");
  backendDiscovered = false;
  return false;
}

// ================= Backend HTTP/HTTPS Upload =================
void sendToBackend(const SensorPacket &p) {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  if (!backendDiscovered || backendUrl.length() == 0) {
    if (millis() - lastDiscoveryAttempt >= REDISCOVERY_INTERVAL) {
      lastDiscoveryAttempt = millis();
      discoverBackend();
    }
    if (!backendDiscovered) return;
  }

  HTTPClient http;
  http.setConnectTimeout(6000);
  http.setTimeout(6000);

  bool beginOk = false;
  WiFiClientSecure *secClient = nullptr;

  if (backendUrl.startsWith("https://")) {
    secClient = new WiFiClientSecure();
    if (secClient) {
      secClient->setInsecure(); // Permits connection without hardcoding certificates that expire
      beginOk = http.begin(*secClient, backendUrl);
    }
  } else {
    beginOk = http.begin(backendUrl);
  }

  if (!beginOk) {
    Serial.println("Failed to initialize backend URL: " + backendUrl);
    if (secClient) delete secClient;
    backendDiscovered = false;
    return;
  }

  http.addHeader("Content-Type", "application/json");
  // Secure Device Authentication Header
  http.addHeader("X-Device-Token", deviceToken);

  StaticJsonDocument<512> doc;
  doc["temperature"] = p.temperature;
  doc["humidity"] = p.humidity;
  doc["soilMoisture"] = p.soilPercent; // 1:1 soil moisture parity with LCD
  doc["rainLevel"] = p.rainDetected ? 100 : 0;
  doc["deviceId"] = "KRISHI_SAKHA_LORA_001";
  doc["nitrogen"] = p.nitrogen;
  doc["phosphorus"] = p.phosphorus;
  doc["potassium"] = p.potassium;
  doc["soilRaw"] = p.soilRaw;
  doc["rssi"] = p.rssi;
  doc["packetNum"] = p.packetNum;

  String payload;
  serializeJson(doc, payload);

  Serial.println("📤 [HTTP Upload] " + backendUrl);
  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    Serial.printf("   Backend HTTP status: %d\n", httpCode);
    if (httpCode >= 200 && httpCode < 300) {
      Serial.printf("   ✅ Packet #%lu uploaded successfully!\n", p.packetNum);
    } else if (httpCode == 401) {
      Serial.println("   🔒 Authentication failed: Invalid Device Token");
    } else {
      Serial.println("   ⚠️ Backend response: " + http.getString());
    }
  } else {
    Serial.println("   ❌ Connection failed: " + http.errorToString(httpCode));
    // If connection failed, trigger rediscovery
    backendDiscovered = false;
  }
  http.end();
  if (secClient) delete secClient;
}

// ================= WiFiManager Setup =================
bool shouldSaveConfig = false;
void saveConfigCallback() {
  shouldSaveConfig = true;
}

void setupWiFiManager(bool forcePortal = false) {
  WiFiManager wm;
  wm.setSaveConfigCallback(saveConfigCallback);
  wm.setConfigPortalTimeout(180); // 3 minutes timeout

  // Custom parameters: Device Token and Manual Backend Host / Cloud URL
  WiFiManagerParameter p_token("token", "Device Token (for /api/sensors/data)", deviceToken, 64);
  WiFiManagerParameter p_backend("backend", "Cloud URL or Backend IP (e.g. https://...)", customBackend, 128);
  wm.addParameter(&p_token);
  wm.addParameter(&p_backend);

  bool res = false;
  if (forcePortal) {
    Serial.println("\n📱 [WiFiManager] Launching On-Demand Config Portal: " AP_SSID);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Config Mode");
    lcd.setCursor(0, 1);
    lcd.print(AP_SSID);
    res = wm.startConfigPortal(AP_SSID, AP_PASSWORD);
  } else {
    Serial.println("\n🔌 [WiFiManager] Connecting to saved Wi-Fi or opening portal...");
    res = wm.autoConnect(AP_SSID, AP_PASSWORD);
  }

  if (shouldSaveConfig) {
    strncpy(deviceToken, p_token.getValue(), sizeof(deviceToken) - 1);
    strncpy(customBackend, p_backend.getValue(), sizeof(customBackend) - 1);
    preferences.begin("krishi", false);
    preferences.putString("dev_token", deviceToken);
    preferences.putString("backend_host", customBackend);
    preferences.end();
    Serial.println("💾 [Preferences] Saved updated credentials to NVS!");
    shouldSaveConfig = false;
  }

  if (res) {
    Serial.print("✅ [Wi-Fi] Connected! Assigned IP: ");
    Serial.println(WiFi.localIP());
    // Requirement 14: Ensure setup portal is disabled during normal operation
    WiFi.mode(WIFI_STA);
    if (!MDNS.begin("krishisakha-esp32")) {
      Serial.println("⚠️ [mDNS] Error setting up MDNS responder");
    } else {
      Serial.println("✅ [mDNS] Responder active (krishisakha-esp32.local)");
    }
    discoverBackend();
  } else {
    Serial.println("⚠️ [WiFiManager] Config portal finished or timed out.");
  }
}

// ================= FreeRTOS Task: Core 1 (LoRa & LCD) =================
void loRaTaskCode(void *pvParameters) {
  unsigned long lastScreenTimer = millis();

  while (true) {
    // 1. Check BOOT button (GPIO 0) held for 3 seconds
    if (digitalRead(TRIGGER_PIN) == LOW) {
      vTaskDelay(pdMS_TO_TICKS(50));
      if (digitalRead(TRIGGER_PIN) == LOW) {
        unsigned long pressStart = millis();
        while (digitalRead(TRIGGER_PIN) == LOW) {
          if (millis() - pressStart >= 3000) {
            Serial.println("\n🔘 [Button] BOOT held 3s -> Requesting Config Portal!");
            triggerPortalFlag = true;
            break;
          }
          vTaskDelay(pdMS_TO_TICKS(50));
        }
      }
    }

    // 2. Poll LoRa receiver (non-blocking)
    int packetSize = LoRa.parsePacket();
    if (packetSize > 0) {
      String packet = "";
      while (LoRa.available()) {
        packet += (char)LoRa.read();
      }
      int rssi = LoRa.packetRssi();

      if (validPacket(packet)) {
        SensorPacket sp;
        sp.packetNum = getField(packet, 0).toInt();
        sp.nitrogen = getField(packet, 1).toInt();
        sp.phosphorus = getField(packet, 2).toInt();
        sp.potassium = getField(packet, 3).toInt();
        sp.soilRaw = getField(packet, 4).toInt();
        sp.soilPercent = getField(packet, 5).toInt();
        sp.rainDetected = (getField(packet, 6).toInt() == 1);
        sp.temperature = getField(packet, 7).toFloat();
        sp.humidity = getField(packet, 8).toFloat();
        sp.rssi = rssi;

        // Update local display values
        currentPacketNum = sp.packetNum;
        currentN = sp.nitrogen;
        currentP = sp.phosphorus;
        currentK = sp.potassium;
        currentSoilPercent = sp.soilPercent;
        currentRain = sp.rainDetected;
        currentTemp = sp.temperature;
        currentHum = sp.humidity;
        currentRSSI = sp.rssi;
        hasReceivedData = true;
        lastPacketTime = millis();

        displayScreen();

        // Push to queue for Core 0 network task
        xQueueSend(packetQueue, &sp, 0);
      }
    }

    // 3. Rotate LCD screens
    if (hasReceivedData && (millis() - lastScreenTimer >= screenInterval)) {
      lastScreenTimer = millis();
      currentScreen++;
      if (currentScreen > 3) currentScreen = 0;
      displayScreen();
    }

    // 4. Signal timeout warning
    if (hasReceivedData && (millis() - lastPacketTime >= signalTimeout)) {
      hasReceivedData = false;
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Signal lost");
      lcd.setCursor(0, 1);
      lcd.printf("RSSI: %d dBm", currentRSSI);
    }

    vTaskDelay(pdMS_TO_TICKS(20)); // Yield to keep FreeRTOS scheduler responsive
  }
}

// ================= FreeRTOS Task: Core 0 (Network & HTTP) =================
void networkTaskCode(void *pvParameters) {
  setupWiFiManager(false);

  SensorPacket packet;
  unsigned long lastWiFiCheck = 0;

  while (true) {
    // If on-demand config portal requested
    if (triggerPortalFlag) {
      triggerPortalFlag = false;
      setupWiFiManager(true);
    }

    // Wi-Fi periodic health check
    if (WiFi.status() != WL_CONNECTED) {
      if (millis() - lastWiFiCheck >= 10000) {
        lastWiFiCheck = millis();
        Serial.println("⚠️ [Wi-Fi] Reconnecting...");
        WiFi.reconnect();
        backendDiscovered = false;
        lastDiscoveryAttempt = 0; // Trigger discovery immediately upon reconnection
      }
    } else {
      if (!backendDiscovered && (millis() - lastDiscoveryAttempt >= REDISCOVERY_INTERVAL)) {
        lastDiscoveryAttempt = millis();
        discoverBackend();
      }
    }

    // Read packet from Core 1 queue and upload
    if (xQueueReceive(packetQueue, &packet, pdMS_TO_TICKS(500)) == pdPASS) {
      sendToBackend(packet);
    }
  }
}

// ================= Setup =================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n======================================");
  Serial.println("  Krishi Sakha — ESP32 Smart Gateway  ");
  Serial.println("======================================");

  pinMode(TRIGGER_PIN, INPUT_PULLUP);

  // Initialize NVS storage
  preferences.begin("krishi", false);
  String storedToken = preferences.getString("dev_token", "krishi_sakha_device_secret_2026");
  String storedHost = preferences.getString("backend_host", "10.240.60.37");
  preferences.end();

  storedToken.toCharArray(deviceToken, sizeof(deviceToken));
  if (storedHost.length() > 0) {
    storedHost.toCharArray(customBackend, sizeof(customBackend));
  } else {
    strncpy(customBackend, "10.240.60.37", sizeof(customBackend) - 1);
  }
  Serial.printf("🔑 [Auth] Device Token loaded: %s\n", deviceToken);
  Serial.printf("🌐 [Backend] Target Host loaded: %s\n", customBackend);

  // Initialize LCD
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Starting LoRa...");

  // Initialize LoRa SPI
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQUENCY)) {
    Serial.println("❌ LoRa initialization failed!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("LoRa FAILED");
    while (true) delay(1000);
  }
  LoRa.setSyncWord(LORA_SYNC_WORD);
  Serial.println("✅ LoRa receiver ready on 433 MHz.");

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("LoRa Receiver");
  lcd.setCursor(0, 1);
  lcd.print("Waiting...");

  // Create FreeRTOS Queue for up to 10 packets
  packetQueue = xQueueCreate(10, sizeof(SensorPacket));

  // Launch Core 1 LoRa Task (Priority 2)
  xTaskCreatePinnedToCore(
    loRaTaskCode,
    "LoRaTask",
    4096,
    NULL,
    2,
    NULL,
    1
  );

  // Launch Core 0 Network Task (Priority 1)
  xTaskCreatePinnedToCore(
    networkTaskCode,
    "NetworkTask",
    8192,
    NULL,
    1,
    NULL,
    0
  );
}

// ================= Main Loop =================
void loop() {
  // Tasks on Core 0 and Core 1 handle all execution independently.
  vTaskDelay(pdMS_TO_TICKS(1000));
}

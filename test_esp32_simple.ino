// Simple ESP32 Test - Verify Serial Monitor Works
void setup() {
  Serial.begin(115200);
  delay(2000);
  Serial.println("\n\n=== ESP32 TEST ===");
  Serial.println("If you see this, Serial Monitor is working!");
  Serial.println("==================\n");
}

void loop() {
  Serial.println("ESP32 is running...");
  delay(1000);
}

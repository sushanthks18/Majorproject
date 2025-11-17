#!/usr/bin/env python3
"""
Smart Agriculture System - IoT Sensor Integration
This script reads sensor data from hardware and sends it to the backend server.
Compatible with: Arduino, Raspberry Pi, ESP32/ESP8266
"""

import requests
import time
import random
import json
from datetime import datetime

# Configuration
BACKEND_URL = "http://localhost:5001/api/sensors/data"
FARMER_ID = None  # Set to specific farmer ID or leave None
DEVICE_ID = "SENSOR_001"
API_KEY = "your-api-key-here"  # Optional security key
INTERVAL_SECONDS = 5  # Send data every 5 seconds

# Hardware sensor reading functions (Replace with actual sensor reading code)
def read_temperature():
    """Read temperature from DHT22/DS18B20 sensor"""
    # Example: Replace with actual sensor reading
    # import Adafruit_DHT
    # humidity, temperature = Adafruit_DHT.read_retry(Adafruit_DHT.DHT22, 4)
    return round(25 + (random.random() - 0.5) * 10, 2)

def read_humidity():
    """Read humidity from DHT22 sensor"""
    return round(65 + (random.random() - 0.5) * 20, 2)

def read_soil_moisture():
    """Read soil moisture from capacitive sensor"""
    # Example: Replace with actual ADC reading
    # import board
    # import busio
    # import adafruit_ads1x15.ads1115 as ADS
    # from adafruit_ads1x15.analog_in import AnalogIn
    # i2c = busio.I2C(board.SCL, board.SDA)
    # ads = ADS.ADS1115(i2c)
    # chan = AnalogIn(ads, ADS.P0)
    # moisture = (chan.value / 65535) * 100
    return round(45 + (random.random() - 0.5) * 30, 2)

def read_ph():
    """Read pH from pH sensor"""
    return round(6.5 + (random.random() - 0.5) * 2, 2)

def collect_sensor_data():
    """Collect data from all sensors"""
    return {
        "temperature": read_temperature(),
        "humidity": read_humidity(),
        "soilMoisture": read_soil_moisture(),
        "pH": read_ph(),
        "farmerId": FARMER_ID,
        "deviceId": DEVICE_ID,
        "apiKey": API_KEY,
        "timestamp": datetime.now().isoformat()
    }

def send_to_backend(data):
    """Send sensor data to backend server"""
    try:
        response = requests.post(
            BACKEND_URL,
            json=data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 201:
            print(f"✅ [{datetime.now().strftime('%H:%M:%S')}] Data sent successfully")
            print(f"   Temperature: {data['temperature']}°C")
            print(f"   Humidity: {data['humidity']}%")
            print(f"   Soil Moisture: {data['soilMoisture']}%")
            print(f"   pH: {data['pH']}")
            print("-----------------------------------")
            return True
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Connection error: {e}")
        return False

def main():
    """Main loop"""
    print("🌾 Smart Agriculture IoT Sensor Client")
    print("=" * 50)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Device ID: {DEVICE_ID}")
    print(f"Update Interval: {INTERVAL_SECONDS} seconds")
    print("=" * 50)
    print()
    
    while True:
        try:
            # Collect sensor data
            sensor_data = collect_sensor_data()
            
            # Send to backend
            send_to_backend(sensor_data)
            
            # Wait before next reading
            time.sleep(INTERVAL_SECONDS)
            
        except KeyboardInterrupt:
            print("\n👋 Shutting down sensor client...")
            break
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    main()

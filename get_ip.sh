#!/bin/bash

echo "================================"
echo "YOUR COMPUTER'S IP ADDRESSES"
echo "================================"
echo ""

echo "📍 Wi-Fi IP Address (en0):"
ipconfig getifaddr en0 2>/dev/null || echo "   Not connected to Wi-Fi"

echo ""
echo "📍 Ethernet IP Address (en1):"
ipconfig getifaddr en1 2>/dev/null || echo "   Not connected to Ethernet"

echo ""
echo "📍 All Network IPs:"
ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print "   " $2}'

echo ""
echo "================================"
echo ""
echo "✅ Use the Wi-Fi IP for ESP32!"
echo ""
echo "Update your ESP32 code with:"
echo 'const char* serverUrl = "http://YOUR_IP_HERE:5001/api/sensors/data";'
echo ""

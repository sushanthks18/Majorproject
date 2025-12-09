#!/bin/bash

clear
echo "╔═══════════════════════════════════════════════════════╗"
echo "║       FIND YOUR IP ADDRESS FOR ESP32                  ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Searching for your IP address..."
echo ""

# Try Wi-Fi first (en0)
IP_WIFI=$(ipconfig getifaddr en0 2>/dev/null)

if [ ! -z "$IP_WIFI" ]; then
    echo "✅ FOUND YOUR WI-FI IP ADDRESS:"
    echo ""
    echo "   ┌─────────────────────────────────┐"
    echo "   │  IP: $IP_WIFI         │"
    echo "   └─────────────────────────────────┘"
    echo ""
    echo "✅ THIS IS YOUR IP ADDRESS!"
    echo ""
    echo "📝 UPDATE ESP32 CODE:"
    echo ""
    echo "   Change line 25 in ESP32_FINAL_CODE.ino to:"
    echo ""
    echo "   const char* serverUrl = \"http://$IP_WIFI:5001/api/sensors/data\";"
    echo ""
    CORRECT_IP=$IP_WIFI
else
    # Try Ethernet (en1)
    IP_ETH=$(ipconfig getifaddr en1 2>/dev/null)
    
    if [ ! -z "$IP_ETH" ]; then
        echo "✅ FOUND YOUR ETHERNET IP ADDRESS:"
        echo ""
        echo "   ┌─────────────────────────────────┐"
        echo "   │  IP: $IP_ETH         │"
        echo "   └─────────────────────────────────┘"
        echo ""
        CORRECT_IP=$IP_ETH
    else
        echo "❌ Could not automatically find IP address."
        echo ""
        echo "Manual method:"
        echo "1. Click Apple Menu → System Preferences → Network"
        echo "2. Select Wi-Fi (or Ethernet if using cable)"
        echo "3. Look for 'IP Address:' on the right side"
        echo ""
        
        # Show all IPs as fallback
        echo "All network addresses found:"
        ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print "   " $2}'
        echo ""
        exit 1
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
echo "🔧 NEXT STEPS:"
echo ""
echo "1. Open ESP32_FINAL_CODE.ino in Arduino IDE"
echo ""
echo "2. Find line 25 and change it to:"
echo "   const char* serverUrl = \"http://$CORRECT_IP:5001/api/sensors/data\";"
echo ""
echo "3. Save the file (Cmd+S)"
echo ""
echo "4. Upload to ESP32 (click Upload button)"
echo ""
echo "5. Open Serial Monitor (Tools → Serial Monitor, 115200 baud)"
echo ""
echo "6. You should see: ✅ Data sent successfully!"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Press Enter to close this window..."
read

exit 0

# 🌐 HOW TO FIND YOUR COMPUTER'S IP ADDRESS

## 📍 **Method 1: Terminal Command (Mac)**

Open Terminal and run:

```bash
ipconfig getifaddr en0
```

**Example Output:**
```
192.168.1.105
```

This is YOUR IP address! ✅

---

## 📍 **Method 2: System Preferences (Mac)**

1. Click **Apple Menu** (top left)
2. Click **System Preferences**
3. Click **Network**
4. Select **Wi-Fi** (should have green dot)
5. Look for **IP Address:** on the right side

**Example:**
```
IP Address: 192.168.1.105
```

---

## 📍 **Method 3: Check Network Utility**

1. Open **Spotlight** (Cmd + Space)
2. Type: **Network Utility**
3. Click **Info** tab
4. Select **en0** (Wi-Fi) from dropdown
5. Look for **IPv4 Address:**

---

## 🔧 **What to Do with Your IP**

Once you have your IP (example: `192.168.1.105`):

### **Update ESP32 Code:**

Open `ESP32_Complete_Code.ino` and find this line:

```cpp
const char* serverUrl = "http://10.116.189.241:5001/api/sensors/data";
```

**Change to YOUR IP:**

```cpp
const char* serverUrl = "http://192.168.1.105:5001/api/sensors/data";
//                            ^^^^^^^^^^^^^^
//                            YOUR IP HERE!
```

### **Re-upload to ESP32:**

1. Save the file
2. Click **Upload** in Arduino IDE
3. Wait for "Done uploading"
4. Open **Serial Monitor** (115200 baud)
5. Watch for "✅ Data sent successfully!"

---

## ⚠️ **IMPORTANT NOTES**

### Your IP Might Change!

Your IP address can change when:
- You restart your computer
- You reconnect to Wi-Fi
- Your router assigns a new IP
- You switch networks

**Solution:** Always check your IP before uploading to ESP32!

### Make IP Static (Optional)

To prevent IP from changing:

1. **System Preferences** → **Network**
2. Select **Wi-Fi** → **Advanced**
3. Click **TCP/IP** tab
4. Change **Configure IPv4** from "Using DHCP" to "Manually"
5. Enter your current IP, Subnet Mask, and Router address
6. Click **OK** → **Apply**

---

## 🧪 **Test Your IP**

After updating ESP32 code, verify it works:

### **1. Ping Test:**
```bash
ping YOUR_IP_ADDRESS
```

Should respond with:
```
64 bytes from 192.168.1.105: icmp_seq=0 ttl=64 time=0.043 ms
```

### **2. Backend Test:**
```bash
curl http://localhost:5001/api/sensors/latest
```

Should return sensor data.

### **3. ESP32 Test:**

In Serial Monitor, you should see:
```
📡 Sending data to: http://192.168.1.105:5001/api/sensors/data
✅ HTTP Response Code: 201
✅ Data sent successfully!
```

---

## 🎯 **Current ESP32 Configuration**

Your ESP32 code currently uses:
```
IP: 10.116.189.241
Port: 5001
Endpoint: /api/sensors/data
```

**Full URL:**
```
http://10.116.189.241:5001/api/sensors/data
```

**If your current IP is different**, you MUST update the code!

---

## 📋 **Quick Reference**

| Network | Command | Interface |
|---------|---------|-----------|
| Wi-Fi | `ipconfig getifaddr en0` | en0 |
| Ethernet | `ipconfig getifaddr en1` | en1 |
| All IPs | `ifconfig \| grep "inet "` | All |

---

## ✅ **Verification Checklist**

- [ ] Found your IP address
- [ ] Updated ESP32 code with your IP
- [ ] Saved the file
- [ ] Re-uploaded to ESP32
- [ ] Opened Serial Monitor (115200 baud)
- [ ] Confirmed "✅ WiFi Connected!"
- [ ] Confirmed "✅ Data sent successfully!"
- [ ] Checked dashboard for live data

---

## 🆘 **Still Can't Find IP?**

### Alternative Method - Check Router Admin Page:

1. Open browser
2. Go to: `http://192.168.1.1` or `http://192.168.0.1`
3. Login to router admin
4. Look for "Connected Devices" or "DHCP Clients"
5. Find your Mac's hostname
6. Note the IP address

---

**🎯 Most likely your IP is in the format:**
- `192.168.1.x` (most common)
- `192.168.0.x`
- `10.0.0.x`
- `10.116.x.x` (your current network)

**Once you have it, update ESP32 code and re-upload!**

# 🔍 NetScan - IP Address Finder

A beautiful, real-time network IP scanner that helps you discover available IP addresses in your network for new device assignments.

![NetScan Interface](https://img.shields.io/badge/Status-Production%20Ready-green)
![Node.js](https://img.shields.io/badge/Node.js-v16+-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 🎯 Real Network Scanning
- **Actual ping-based detection** - Uses real ICMP ping requests to detect live hosts
- **Parallel batch scanning** - Scans 20 IPs at a time for speed
- **Response time tracking** - Shows ping latency for each discovered host

### 🎨 Modern UI
- **Dark glassmorphism design** with gradient backgrounds
- **Real-time IP grid visualization** - Color-coded status for each IP
- **Animated progress indicators** - Live scanning feedback
- **Responsive layout** - Works on desktop and mobile

### 📊 Smart Features
- **Reserved IP management** - Exclude gateway and other static IPs
- **Usage recommendations** - Suggests IP ranges for workstations, servers, IoT, etc.
- **Export to JSON** - Save scan results for documentation
- **Copy to clipboard** - Quick IP copying for configuration
- **Single IP verification** - Re-ping individual IPs on demand

## 🚀 Quick Start

### Prerequisites
- Node.js v16 or higher
- Network access to target subnet

### Installation

```bash
# Clone or navigate to the project
cd ip-finder

# Start the server
node server.js
```

### Usage

1. Open your browser to **http://localhost:3001**
2. Configure your network settings:
   - **Network Address**: Your network base (e.g., `172.15.10.0`)
   - **Subnet Mask**: Select from /24 to /28
   - **Gateway**: Your router IP (auto-added to reserved)
   - **Timeout**: Ping timeout in milliseconds
3. Add any **Reserved IPs** you want to exclude
4. Click **"Start Network Scan"**
5. View results in the grid map and table

## 📁 Project Structure

```
ip-finder/
├── index.html      # Main UI with all components
├── styles.css      # Dark theme styling with animations
├── app.js          # Frontend JavaScript (scanner logic)
├── server.js       # Node.js backend with real ping API
└── README.md       # This file
```

## 🔌 API Endpoints

### POST `/api/scan`
Scan an entire network range.

**Request Body:**
```json
{
  "networkAddress": "172.15.10.0",
  "subnetMask": 24,
  "reservedIPs": ["172.15.10.254"],
  "timeout": 1000
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "ip": "172.15.10.1", "status": "used", "reachable": true, "responseTime": 5.2 },
    { "ip": "172.15.10.2", "status": "available", "reachable": false }
  ],
  "summary": {
    "total": 254,
    "available": 192,
    "used": 61,
    "reserved": 1
  }
}
```

### GET `/api/ping?ip=x.x.x.x`
Ping a single IP address.

**Response:**
```json
{
  "ip": "172.15.10.16",
  "status": "used",
  "reachable": true,
  "responseTime": 9.57
}
```

## 🎨 IP Status Colors

| Color | Status | Meaning |
|-------|--------|---------|
| 🟢 Green | Available | IP did not respond to ping - safe to assign |
| 🟠 Orange | In Use | IP responded to ping - device is active |
| 🔴 Red | Reserved | IP is marked as reserved (gateway, etc.) |
| ⬜ Gray | Unknown | IP not yet scanned |

## 💡 Usage Recommendations

The tool suggests IP ranges based on common network practices:

| IP Range | Recommended For |
|----------|-----------------|
| .11 - .49 | Workstations |
| .61 - .99 | Laptops / Mobile |
| .111 - .150 | Servers |
| .151 - .199 | Network Devices |
| .211 - .253 | IoT / Printers |

## ⚙️ Configuration

### Adjusting Scan Speed

Edit `server.js` to change batch size:
```javascript
const batchSize = 20;  // Increase for faster scans, decrease for less network load
```

### Changing Default Network

Edit `app.js` constructor:
```javascript
this.networkAddress = '192.168.1.0';  // Your network
this.gateway = '192.168.1.1';          // Your gateway
```

## 🔒 Security Notes

- The scanner requires network access to ping target IPs
- Some networks may block ICMP (ping) packets - results may vary
- Run on trusted networks only
- No authentication is implemented - bind to localhost for security

## 🐛 Troubleshooting

### "Scan error: Make sure the server is running"
- Ensure `node server.js` is running on port 3001
- Check firewall isn't blocking localhost:3001

### All IPs show as "Available"
- Target network may be blocking ICMP ping
- Check if you can ping IPs manually: `ping 172.15.10.1`
- Try increasing the timeout value

### Scan is slow
- Increase batch size in `server.js`
- Decrease timeout value
- Use a smaller subnet mask (/25, /26)

## 📝 License

MIT License - Feel free to use and modify for your needs.

## 🤝 Contributing

Contributions welcome! Feel free to submit issues and pull requests.

---

**Built with ❤️ for network administrators**

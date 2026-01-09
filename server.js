const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

// MIME types for serving static files
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

// Function to ping a single IP
function pingIP(ip, timeout = 1) {
    return new Promise((resolve) => {
        // Use ping command with timeout
        // -c 1: send 1 packet, -W: timeout in seconds
        const cmd = process.platform === 'win32'
            ? `ping -n 1 -w ${timeout * 1000} ${ip}`
            : `ping -c 1 -W ${timeout} ${ip}`;

        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                // Ping failed - IP is available
                resolve({ ip, status: 'available', reachable: false });
            } else {
                // Ping succeeded - IP is in use
                // Try to extract response time
                let responseTime = null;
                const timeMatch = stdout.match(/time[=<](\d+\.?\d*)/i);
                if (timeMatch) {
                    responseTime = parseFloat(timeMatch[1]);
                }
                resolve({ ip, status: 'used', reachable: true, responseTime });
            }
        });
    });
}

// Function to scan a range of IPs
async function scanNetwork(baseIP, startHost, endHost, timeout) {
    const results = [];
    const parts = baseIP.split('.');
    const networkBase = parts.slice(0, 3).join('.');

    // Scan IPs in parallel batches for speed
    const batchSize = 20;

    for (let i = startHost; i <= endHost; i += batchSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, endHost + 1); j++) {
            const ip = `${networkBase}.${j}`;
            batch.push(pingIP(ip, timeout));
        }
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
    }

    return results;
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);

    // API endpoint for scanning
    if (url.pathname === '/api/scan' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { networkAddress, subnetMask, reservedIPs, timeout } = JSON.parse(body);

                // Calculate host range based on subnet mask
                const hostCount = Math.pow(2, 32 - subnetMask) - 2;
                const startHost = 1;
                const endHost = hostCount;

                console.log(`Scanning ${networkAddress}/${subnetMask} (${hostCount} hosts)...`);

                const results = await scanNetwork(networkAddress, startHost, endHost, timeout / 1000);

                // Filter out reserved IPs
                const reservedSet = new Set(reservedIPs || []);
                results.forEach(r => {
                    if (reservedSet.has(r.ip)) {
                        r.status = 'reserved';
                    }
                });

                const available = results.filter(r => r.status === 'available').map(r => r.ip);
                const used = results.filter(r => r.status === 'used');

                console.log(`Scan complete: ${available.length} available, ${used.length} in use`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    results,
                    summary: {
                        total: hostCount,
                        available: available.length,
                        used: used.length,
                        reserved: reservedIPs?.length || 0
                    }
                }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }

    // API endpoint for single IP ping
    if (url.pathname === '/api/ping' && req.method === 'GET') {
        const ip = url.searchParams.get('ip');
        if (!ip) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'IP parameter required' }));
            return;
        }

        const result = await pingIP(ip, 2);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
    }

    // Serve static files
    let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'text/plain';

    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch (error) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
    }
});

server.listen(PORT, () => {
    console.log(`🔍 NetScan Server running at http://localhost:${PORT}`);
    console.log(`   API endpoints:`);
    console.log(`   - POST /api/scan - Scan network range`);
    console.log(`   - GET /api/ping?ip=x.x.x.x - Ping single IP`);
});

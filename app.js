// IP Scanner Application - Real Network Scanning
class IPScanner {
    constructor() {
        this.networkAddress = '172.15.10.0';
        this.subnetMask = 24;
        this.gateway = '172.15.10.254';
        this.timeout = 1000;
        this.reservedIPs = new Set(['172.15.10.254']);
        this.ipStatus = new Map();
        this.isScanning = false;
        this.availableIPs = [];
        this.usedIPs = [];
        this.scanResults = [];

        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.generateIPGrid();
        this.updateStats();
    }

    cacheDOM() {
        this.elements = {
            networkAddress: document.getElementById('networkAddress'),
            subnetMask: document.getElementById('subnetMask'),
            gateway: document.getElementById('gateway'),
            scanTimeout: document.getElementById('scanTimeout'),
            reservedIpsInput: document.getElementById('reservedIps'),
            addReservedBtn: document.getElementById('addReserved'),
            reservedTags: document.getElementById('reservedTags'),
            startScanBtn: document.getElementById('startScan'),
            statusIndicator: document.getElementById('statusIndicator'),
            progressSection: document.getElementById('progressSection'),
            progressFill: document.getElementById('progressFill'),
            progressPercentage: document.getElementById('progressPercentage'),
            currentScanIp: document.getElementById('currentScanIp'),
            scanSpeed: document.getElementById('scanSpeed'),
            ipGrid: document.getElementById('ipGrid'),
            resultsTableBody: document.getElementById('resultsTableBody'),
            availableCount: document.getElementById('availableCount'),
            usedCount: document.getElementById('usedCount'),
            reservedCount: document.getElementById('reservedCount'),
            totalCount: document.getElementById('totalCount'),
            searchIp: document.getElementById('searchIp'),
            exportBtn: document.getElementById('exportBtn'),
            copyBtn: document.getElementById('copyBtn'),
            toast: document.getElementById('toast'),
            modalOverlay: document.getElementById('modalOverlay'),
            modalClose: document.getElementById('modalClose'),
            modalBody: document.getElementById('modalBody')
        };
    }

    bindEvents() {
        this.elements.startScanBtn.addEventListener('click', () => this.startScan());
        this.elements.addReservedBtn.addEventListener('click', () => this.addReservedIP());
        this.elements.reservedIpsInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addReservedIP();
        });
        this.elements.reservedTags.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-remove')) {
                this.removeReservedIP(e.target.dataset.ip);
            }
        });
        this.elements.subnetMask.addEventListener('change', () => {
            this.subnetMask = parseInt(this.elements.subnetMask.value);
            this.generateIPGrid();
            this.updateStats();
        });
        this.elements.searchIp.addEventListener('input', (e) => this.filterResults(e.target.value));
        this.elements.exportBtn.addEventListener('click', () => this.exportResults());
        this.elements.copyBtn.addEventListener('click', () => this.copyAllIPs());
        this.elements.modalClose.addEventListener('click', () => this.closeModal());
        this.elements.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.modalOverlay) this.closeModal();
        });
        this.elements.ipGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('ip-block')) {
                this.showIPDetails(e.target.dataset.ip);
            }
        });
    }

    getHostCount() {
        return Math.pow(2, 32 - this.subnetMask) - 2;
    }

    parseNetworkAddress() {
        const parts = this.elements.networkAddress.value.split('.');
        return parts.map(p => parseInt(p));
    }

    generateIP(baseIP, hostNum) {
        const ip = [...baseIP];
        ip[3] = hostNum;
        return ip.join('.');
    }

    generateIPGrid() {
        const hostCount = this.getHostCount();
        const baseIP = this.parseNetworkAddress();
        this.elements.ipGrid.innerHTML = '';

        for (let i = 1; i <= hostCount; i++) {
            const ip = this.generateIP(baseIP, i);
            const block = document.createElement('div');
            block.className = 'ip-block';
            block.dataset.ip = ip;
            block.dataset.host = i;

            if (this.reservedIPs.has(ip)) {
                block.classList.add('reserved');
            } else if (this.ipStatus.has(ip)) {
                block.classList.add(this.ipStatus.get(ip));
            }

            this.elements.ipGrid.appendChild(block);
        }
    }

    addReservedIP() {
        const input = this.elements.reservedIpsInput.value.trim();
        if (!input) return;

        const ips = input.split(',').map(ip => ip.trim()).filter(ip => this.isValidIP(ip));

        ips.forEach(ip => {
            if (!this.reservedIPs.has(ip)) {
                this.reservedIPs.add(ip);
                this.addReservedTag(ip);
                this.updateIPBlockStatus(ip, 'reserved');
            }
        });

        this.elements.reservedIpsInput.value = '';
        this.updateStats();
    }

    addReservedTag(ip) {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.innerHTML = `${ip} <button class="tag-remove" data-ip="${ip}">×</button>`;
        this.elements.reservedTags.appendChild(tag);
    }

    removeReservedIP(ip) {
        this.reservedIPs.delete(ip);
        const tags = this.elements.reservedTags.querySelectorAll('.tag');
        tags.forEach(tag => {
            if (tag.textContent.includes(ip)) tag.remove();
        });
        this.updateIPBlockStatus(ip, 'unknown');
        this.updateStats();
    }

    updateIPBlockStatus(ip, status) {
        const block = this.elements.ipGrid.querySelector(`[data-ip="${ip}"]`);
        if (block) {
            block.className = 'ip-block';
            if (status) block.classList.add(status);
        }
        if (status !== 'reserved') {
            this.ipStatus.set(ip, status);
        }
    }

    isValidIP(ip) {
        const parts = ip.split('.');
        if (parts.length !== 4) return false;
        return parts.every(part => {
            const num = parseInt(part);
            return !isNaN(num) && num >= 0 && num <= 255;
        });
    }

    async startScan() {
        if (this.isScanning) {
            this.stopScan();
            return;
        }

        this.isScanning = true;
        this.networkAddress = this.elements.networkAddress.value;
        this.gateway = this.elements.gateway.value;
        this.timeout = parseInt(this.elements.scanTimeout.value);
        this.availableIPs = [];
        this.usedIPs = [];
        this.scanResults = [];

        // Reset grid
        this.ipStatus.clear();
        this.generateIPGrid();

        this.elements.startScanBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <rect x="6" y="6" width="12" height="12" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>Stop Scan</span>
        `;
        this.elements.startScanBtn.classList.add('scanning');
        this.elements.statusIndicator.classList.add('scanning');
        this.elements.statusIndicator.querySelector('.status-text').textContent = 'Scanning...';
        this.elements.progressSection.style.display = 'block';
        this.elements.currentScanIp.textContent = 'Sending ping requests...';
        this.elements.progressFill.style.width = '10%';
        this.elements.progressPercentage.textContent = 'Scanning...';

        try {
            // Call the real scanning API
            const response = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    networkAddress: this.networkAddress,
                    subnetMask: this.subnetMask,
                    reservedIPs: Array.from(this.reservedIPs),
                    timeout: this.timeout
                })
            });

            if (!response.ok) {
                throw new Error('Network scan failed');
            }

            const data = await response.json();

            if (data.success) {
                this.scanResults = data.results;

                // Update the grid with real results
                data.results.forEach(result => {
                    this.ipStatus.set(result.ip, result.status);
                    this.updateIPBlockStatus(result.ip, result.status);

                    if (result.status === 'available') {
                        this.availableIPs.push(result.ip);
                    } else if (result.status === 'used') {
                        this.usedIPs.push({
                            ip: result.ip,
                            responseTime: result.responseTime
                        });
                    }
                });

                this.elements.progressFill.style.width = '100%';
                this.elements.progressPercentage.textContent = '100%';
                this.elements.scanSpeed.textContent = `${data.summary.total} IPs scanned`;

                this.showToast(`Scan complete! Found ${this.availableIPs.length} available IPs.`, 'success');
            } else {
                throw new Error(data.error || 'Scan failed');
            }
        } catch (error) {
            console.error('Scan error:', error);
            this.showToast(`Scan error: ${error.message}. Make sure the server is running.`, 'error');
        }

        this.finishScan();
    }

    stopScan() {
        this.isScanning = false;
        this.finishScan();
    }

    finishScan() {
        this.isScanning = false;
        this.elements.startScanBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>Start Network Scan</span>
        `;
        this.elements.startScanBtn.classList.remove('scanning');
        this.elements.statusIndicator.classList.remove('scanning');
        this.elements.statusIndicator.querySelector('.status-text').textContent = 'Scan Complete';
        this.elements.currentScanIp.textContent = 'Scan complete!';

        this.updateStats();
        this.renderResults();
    }

    updateStats() {
        const hostCount = this.getHostCount();
        this.elements.totalCount.textContent = hostCount;
        this.elements.reservedCount.textContent = this.reservedIPs.size;

        let available = 0;
        let used = 0;
        this.ipStatus.forEach((status) => {
            if (status === 'available') available++;
            if (status === 'used') used++;
        });

        this.elements.availableCount.textContent = available || '-';
        this.elements.usedCount.textContent = used || '-';
    }

    renderResults() {
        if (this.availableIPs.length === 0) {
            this.elements.resultsTableBody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="5">
                        <div class="empty-message">
                            <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
                                <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            <p>No available IPs found in the network</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        this.elements.resultsTableBody.innerHTML = this.availableIPs.map((ip, index) => {
            const recommendation = this.getRecommendation(ip);
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td class="ip-address">${ip}</td>
                    <td><span class="status-badge available">Available</span></td>
                    <td class="recommendation">${recommendation}</td>
                    <td>
                        <button class="btn-action" onclick="scanner.copyIP('${ip}')">
                            <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                                <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            Copy
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getRecommendation(ip) {
        const lastOctet = parseInt(ip.split('.')[3]);
        if (lastOctet >= 11 && lastOctet <= 49) return 'Workstations';
        if (lastOctet >= 61 && lastOctet <= 99) return 'Laptops / Mobile';
        if (lastOctet >= 111 && lastOctet <= 150) return 'Servers';
        if (lastOctet >= 151 && lastOctet <= 199) return 'Network Devices';
        if (lastOctet >= 211 && lastOctet <= 253) return 'IoT / Printers';
        return 'General Use';
    }

    filterResults(query) {
        const rows = this.elements.resultsTableBody.querySelectorAll('tr:not(.empty-state)');
        rows.forEach(row => {
            const ip = row.querySelector('.ip-address')?.textContent || '';
            row.style.display = ip.includes(query) ? '' : 'none';
        });
    }

    copyIP(ip) {
        navigator.clipboard.writeText(ip).then(() => {
            this.showToast(`Copied: ${ip}`, 'success');
        });
    }

    copyAllIPs() {
        if (this.availableIPs.length === 0) {
            this.showToast('No IPs to copy', 'error');
            return;
        }
        navigator.clipboard.writeText(this.availableIPs.join('\n')).then(() => {
            this.showToast(`Copied ${this.availableIPs.length} IPs to clipboard`, 'success');
        });
    }

    exportResults() {
        if (this.availableIPs.length === 0) {
            this.showToast('No IPs to export', 'error');
            return;
        }

        const data = {
            network: this.networkAddress,
            subnetMask: this.subnetMask,
            gateway: this.gateway,
            scanDate: new Date().toISOString(),
            availableIPs: this.availableIPs,
            usedIPs: this.usedIPs,
            reserved: Array.from(this.reservedIPs)
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `network-scan-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Results exported successfully', 'success');
    }

    showIPDetails(ip) {
        const status = this.reservedIPs.has(ip) ? 'Reserved' :
            this.ipStatus.get(ip) === 'available' ? 'Available' :
                this.ipStatus.get(ip) === 'used' ? 'In Use' : 'Unknown';

        const statusColor = status === 'Available' ? 'var(--color-available)' :
            status === 'In Use' ? 'var(--color-used)' :
                status === 'Reserved' ? 'var(--color-reserved)' : 'var(--color-unknown)';

        // Find response time if available
        const usedEntry = this.usedIPs.find(u => u.ip === ip);
        const responseTime = usedEntry?.responseTime ? `${usedEntry.responseTime}ms` : 'N/A';

        this.elements.modalBody.innerHTML = `
            <div class="modal-ip"><span>${ip}</span></div>
            <div class="modal-details">
                <div class="modal-detail-row">
                    <span class="modal-detail-label">Status</span>
                    <span class="modal-detail-value" style="color: ${statusColor}">${status}</span>
                </div>
                <div class="modal-detail-row">
                    <span class="modal-detail-label">Response Time</span>
                    <span class="modal-detail-value">${responseTime}</span>
                </div>
                <div class="modal-detail-row">
                    <span class="modal-detail-label">Network</span>
                    <span class="modal-detail-value">${this.networkAddress}/${this.subnetMask}</span>
                </div>
                <div class="modal-detail-row">
                    <span class="modal-detail-label">Gateway</span>
                    <span class="modal-detail-value">${this.gateway}</span>
                </div>
                <div class="modal-detail-row">
                    <span class="modal-detail-label">Recommendation</span>
                    <span class="modal-detail-value">${this.getRecommendation(ip)}</span>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="scanner.verifyIP('${ip}')">
                    Verify with Ping
                </button>
                <button class="btn-primary" onclick="scanner.copyIP('${ip}'); scanner.closeModal();">
                    Copy IP
                </button>
            </div>
        `;
        this.elements.modalOverlay.classList.add('active');
    }

    async verifyIP(ip) {
        this.showToast(`Pinging ${ip}...`, 'success');

        try {
            const response = await fetch(`/api/ping?ip=${ip}`);
            const result = await response.json();

            if (result.reachable) {
                this.showToast(`${ip} is REACHABLE (${result.responseTime}ms) - IP is IN USE!`, 'error');
                this.updateIPBlockStatus(ip, 'used');
            } else {
                this.showToast(`${ip} is NOT reachable - IP is AVAILABLE!`, 'success');
                this.updateIPBlockStatus(ip, 'available');
            }

            // Refresh the modal
            this.showIPDetails(ip);
        } catch (error) {
            this.showToast(`Error verifying IP: ${error.message}`, 'error');
        }
    }

    closeModal() {
        this.elements.modalOverlay.classList.remove('active');
    }

    showToast(message, type = 'success') {
        const toast = this.elements.toast;
        toast.querySelector('.toast-message').textContent = message;
        toast.className = `toast ${type} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the scanner when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.scanner = new IPScanner();
});

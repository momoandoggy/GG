// Aplikasi utama untuk monitoring aplikasi Play Store
class PlayStoreMonitor {
    constructor() {
        this.apps = [];
        this.botConfig = {
            token: '',
            chatId: '',
            messageTemplate: '⚠️ PERINGATAN! Aplikasi {app_id} telah dihapus dari Google Play Store!'
        };
        this.monitoringInterval = null;
        this.isMonitoring = true;
        this.checkInterval = 30000; // 30 detik
        
        this.initializeApp();
    }
    
    // Inisialisasi aplikasi
    initializeApp() {
        this.loadData();
        this.setupEventListeners();
        this.updateUI();
        this.startMonitoring();
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Tombol tambah aplikasi
        document.getElementById('add-app-btn').addEventListener('click', () => {
            this.addSingleApp();
        });
        
        // Tombol tambah massal
        document.getElementById('batch-add-btn').addEventListener('click', () => {
            this.batchAddApps();
        });
        
        // Tombol hapus massal
        document.getElementById('batch-delete-btn').addEventListener('click', () => {
            this.showDeleteConfirmation();
        });
        
        // Pilih semua checkbox
        document.getElementById('select-all').addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });
        
        // Simpan konfigurasi bot
        document.getElementById('save-bot-config').addEventListener('click', () => {
            this.saveBotConfig();
        });
        
        // Test bot
        document.getElementById('test-bot').addEventListener('click', () => {
            this.testBot();
        });
        
        // Toggle monitoring
        document.getElementById('toggle-monitoring').addEventListener('click', () => {
            this.toggleMonitoring();
        });
        
        // Modal events
        document.getElementById('confirm-cancel').addEventListener('click', () => {
            this.hideModal('confirm-modal');
        });
        
        document.getElementById('confirm-ok').addEventListener('click', () => {
            this.batchDeleteApps();
            this.hideModal('confirm-modal');
        });
        
        document.getElementById('message-close').addEventListener('click', () => {
            this.hideModal('message-modal');
        });
    }
    
    // Muat data dari localStorage
    loadData() {
        // Muat daftar aplikasi
        const savedApps = localStorage.getItem('playstore-monitor-apps');
        if (savedApps) {
            this.apps = JSON.parse(savedApps);
        }
        
        // Muat konfigurasi bot
        const savedBotConfig = localStorage.getItem('playstore-monitor-bot-config');
        if (savedBotConfig) {
            this.botConfig = { ...this.botConfig, ...JSON.parse(savedBotConfig) };
            this.updateBotConfigUI();
        }
    }
    
    // Simpan data ke localStorage
    saveData() {
        localStorage.setItem('playstore-monitor-apps', JSON.stringify(this.apps));
        localStorage.setItem('playstore-monitor-bot-config', JSON.stringify(this.botConfig));
    }
    
    // Update UI dengan data terkini
    updateUI() {
        this.updateAppsTable();
        this.updateStats();
        this.updateBotConfigUI();
    }
    
    // Update tabel aplikasi
    updateAppsTable() {
        const tbody = document.getElementById('apps-list');
        tbody.innerHTML = '';
        
        if (this.apps.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Tidak ada aplikasi yang dimonitor</td></tr>';
            return;
        }
        
        this.apps.forEach((app, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="app-checkbox" data-index="${index}"></td>
                <td>${app.id}</td>
                <td><a href="${app.url}" target="_blank">${app.url}</a></td>
                <td><span class="status-badge ${app.status === 'active' ? 'status-active' : 'status-removed'}">${app.status === 'active' ? 'Aktif' : 'Dihapus'}</span></td>
                <td>${app.lastChecked ? new Date(app.lastChecked).toLocaleString('id-ID') : '-'}</td>
                <td>
                    <button class="btn btn-secondary btn-sm check-now" data-index="${index}">Cek Sekarang</button>
                    <button class="btn btn-danger btn-sm delete-app" data-index="${index}">Hapus</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Tambah event listeners untuk tombol aksi
        document.querySelectorAll('.check-now').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.target.getAttribute('data-index');
                this.checkAppStatus(index);
            });
        });
        
        document.querySelectorAll('.delete-app').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.target.getAttribute('data-index');
                this.deleteApp(index);
            });
        });
        
        document.querySelectorAll('.app-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateBatchDeleteButton();
            });
        });
        
        this.updateBatchDeleteButton();
    }
    
    // Update statistik
    updateStats() {
        const totalApps = this.apps.length;
        const activeApps = this.apps.filter(app => app.status === 'active').length;
        const removedApps = this.apps.filter(app => app.status === 'removed').length;
        
        document.getElementById('total-apps').textContent = totalApps;
        document.getElementById('active-apps').textContent = activeApps;
        document.getElementById('removed-apps').textContent = removedApps;
    }
    
    // Update konfigurasi bot di UI
    updateBotConfigUI() {
        document.getElementById('bot-token').value = this.botConfig.token;
        document.getElementById('chat-id').value = this.botConfig.chatId;
        document.getElementById('message-template').value = this.botConfig.messageTemplate;
    }
    
    // Update status tombol hapus massal
    updateBatchDeleteButton() {
        const checkedBoxes = document.querySelectorAll('.app-checkbox:checked');
        const deleteBtn = document.getElementById('batch-delete-btn');
        
        if (checkedBoxes.length > 0) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = `<i class="fas fa-trash"></i> Hapus ${checkedBoxes.length} Aplikasi`;
        } else {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = `<i class="fas fa-trash"></i> Hapus yang Dipilih`;
        }
    }
    
    // Tambah aplikasi tunggal
    addSingleApp() {
        const appId = document.getElementById('app-id').value.trim();
        const appUrl = document.getElementById('app-url').value.trim();
        
        if (!appId || !appUrl) {
            this.showMessage('Error', 'ID Aplikasi dan URL harus diisi!', 'error');
            return;
        }
        
        if (!this.isValidUrl(appUrl)) {
            this.showMessage('Error', 'URL tidak valid! Pastikan URL dimulai dengan https://', 'error');
            return;
        }
        
        // Cek apakah aplikasi sudah ada
        if (this.apps.some(app => app.id === appId)) {
            this.showMessage('Error', `Aplikasi dengan ID ${appId} sudah ada!`, 'error');
            return;
        }
        
        const newApp = {
            id: appId,
            url: appUrl,
            status: 'active',
            lastChecked: null
        };
        
        this.apps.push(newApp);
        this.saveData();
        this.updateUI();
        
        // Reset form
        document.getElementById('app-id').value = '';
        document.getElementById('app-url').value = '';
        
        this.showMessage('Sukses', 'Aplikasi berhasil ditambahkan!', 'success');
    }
    
    // Tambah aplikasi secara massal
    batchAddApps() {
        const batchInput = document.getElementById('batch-input').value.trim();
        
        if (!batchInput) {
            this.showMessage('Error', 'Masukkan data aplikasi!', 'error');
            return;
        }
        
        const lines = batchInput.split('\n');
        let addedCount = 0;
        let errorCount = 0;
        
        lines.forEach(line => {
            const parts = line.split('|');
            
            if (parts.length === 2) {
                const appId = parts[0].trim();
                const appUrl = parts[1].trim();
                
                if (appId && appUrl && this.isValidUrl(appUrl)) {
                    // Cek apakah aplikasi sudah ada
                    if (!this.apps.some(app => app.id === appId)) {
                        this.apps.push({
                            id: appId,
                            url: appUrl,
                            status: 'active',
                            lastChecked: null
                        });
                        addedCount++;
                    } else {
                        errorCount++;
                    }
                } else {
                    errorCount++;
                }
            } else {
                errorCount++;
            }
        });
        
        if (addedCount > 0) {
            this.saveData();
            this.updateUI();
        }
        
        let message = '';
        if (addedCount > 0) {
            message += `Berhasil menambahkan ${addedCount} aplikasi. `;
        }
        if (errorCount > 0) {
            message += `${errorCount} entri gagal ditambahkan (format salah atau duplikat).`;
        }
        
        this.showMessage(
            addedCount > 0 ? 'Sukses' : 'Peringatan',
            message || 'Tidak ada aplikasi yang ditambahkan.',
            addedCount > 0 ? 'success' : 'warning'
        );
        
        // Reset form
        document.getElementById('batch-input').value = '';
    }
    
    // Hapus aplikasi
    deleteApp(index) {
        this.apps.splice(index, 1);
        this.saveData();
        this.updateUI();
        this.showMessage('Sukses', 'Aplikasi berhasil dihapus!', 'success');
    }
    
    // Hapus aplikasi secara massal
    batchDeleteApps() {
        const checkedBoxes = document.querySelectorAll('.app-checkbox:checked');
        const indices = Array.from(checkedBoxes).map(checkbox => 
            parseInt(checkbox.getAttribute('data-index'))
        ).sort((a, b) => b - a); // Urutkan dari besar ke kecil untuk menghindari masalah index
        
        if (indices.length === 0) return;
        
        indices.forEach(index => {
            this.apps.splice(index, 1);
        });
        
        this.saveData();
        this.updateUI();
        this.showMessage('Sukses', `${indices.length} aplikasi berhasil dihapus!`, 'success');
    }
    
    // Toggle pilih semua
    toggleSelectAll(checked) {
        document.querySelectorAll('.app-checkbox').forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateBatchDeleteButton();
    }
    
    // Tampilkan konfirmasi hapus
    showDeleteConfirmation() {
        const checkedCount = document.querySelectorAll('.app-checkbox:checked').length;
        
        if (checkedCount === 0) {
            this.showMessage('Peringatan', 'Pilih setidaknya satu aplikasi untuk dihapus!', 'warning');
            return;
        }
        
        document.getElementById('confirm-message').textContent = 
            `Apakah Anda yakin ingin menghapus ${checkedCount} aplikasi?`;
        this.showModal('confirm-modal');
    }
    
    // Cek status aplikasi
    async checkAppStatus(index) {
        const app = this.apps[index];
        
        try {
            // Simulasi pengecekan status (dalam implementasi nyata, ini akan melakukan HTTP request)
            // Untuk demo, kita acak statusnya
            const isAvailable = Math.random() > 0.2; // 80% kemungkinan tersedia
            
            app.lastChecked = new Date().toISOString();
            
            if (isAvailable) {
                app.status = 'active';
            } else {
                app.status = 'removed';
                // Kirim notifikasi jika status berubah dari aktif ke dihapus
                if (app.previousStatus !== 'removed') {
                    this.sendTelegramNotification(app);
                }
            }
            
            app.previousStatus = app.status;
            
            this.saveData();
            this.updateUI();
            
            if (!isAvailable) {
                this.showMessage('Peringatan', `Aplikasi ${app.id} tidak tersedia di Play Store!`, 'warning');
            }
            
        } catch (error) {
            console.error('Error checking app status:', error);
        }
    }
    
    // Mulai monitoring
    startMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        this.monitoringInterval = setInterval(() => {
            if (this.isMonitoring) {
                this.checkAllApps();
                this.updateLastCheckTime();
            }
        }, this.checkInterval);
        
        this.updateMonitoringUI();
    }
    
    // Cek semua aplikasi
    async checkAllApps() {
        if (this.apps.length === 0) return;
        
        for (let i = 0; i < this.apps.length; i++) {
            await this.checkAppStatus(i);
            // Tunggu sebentar antara pengecekan untuk menghindari rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Update waktu pengecekan terakhir
    updateLastCheckTime() {
        const now = new Date();
        document.getElementById('last-check').textContent = now.toLocaleString('id-ID');
        
        const nextCheck = new Date(now.getTime() + this.checkInterval);
        document.getElementById('next-check').textContent = nextCheck.toLocaleString('id-ID');
    }
    
    // Toggle monitoring
    toggleMonitoring() {
        this.isMonitoring = !this.isMonitoring;
        this.updateMonitoringUI();
        
        const status = this.isMonitoring ? 'diaktifkan' : 'dihentikan';
        this.showMessage('Info', `Monitoring ${status}!`, 'info');
    }
    
    // Update UI status monitoring
    updateMonitoringUI() {
        const statusElement = document.getElementById('monitoring-status');
        const toggleButton = document.getElementById('toggle-monitoring');
        
        if (this.isMonitoring) {
            statusElement.textContent = 'Aktif';
            statusElement.style.color = '#34a853';
            toggleButton.innerHTML = '<i class="fas fa-pause"></i> Hentikan Monitoring';
            toggleButton.className = 'btn btn-warning';
        } else {
            statusElement.textContent = 'Dihentikan';
            statusElement.style.color = '#ea4335';
            toggleButton.innerHTML = '<i class="fas fa-play"></i> Mulai Monitoring';
            toggleButton.className = 'btn btn-success';
        }
    }
    
    // Simpan konfigurasi bot
    saveBotConfig() {
        const token = document.getElementById('bot-token').value.trim();
        const chatId = document.getElementById('chat-id').value.trim();
        const messageTemplate = document.getElementById('message-template').value.trim();
        
        if (!token || !chatId) {
            this.showMessage('Error', 'Token dan Chat ID harus diisi!', 'error');
            return;
        }
        
        this.botConfig.token = token;
        this.botConfig.chatId = chatId;
        this.botConfig.messageTemplate = messageTemplate || this.botConfig.messageTemplate;
        
        this.saveData();
        this.showMessage('Sukses', 'Konfigurasi bot berhasil disimpan!', 'success');
    }
    
    // Test bot
    async testBot() {
        if (!this.botConfig.token || !this.botConfig.chatId) {
            this.showMessage('Error', 'Token dan Chat ID harus diisi terlebih dahulu!', 'error');
            return;
        }
        
        try {
            // Simulasi pengiriman pesan test
            // Dalam implementasi nyata, ini akan mengirim request ke API Telegram
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.showMessage('Sukses', 'Pesan test berhasil dikirim ke bot!', 'success');
        } catch (error) {
            console.error('Error testing bot:', error);
            this.showMessage('Error', 'Gagal mengirim pesan test. Periksa token dan chat ID!', 'error');
        }
    }
    
    // Kirim notifikasi Telegram
    async sendTelegramNotification(app) {
        if (!this.botConfig.token || !this.botConfig.chatId) {
            console.warn('Bot Telegram tidak dikonfigurasi dengan benar');
            return;
        }
        
        try {
            const message = this.botConfig.messageTemplate.replace('{app_id}', app.id);
            
            // Simulasi pengiriman pesan ke Telegram
            // Dalam implementasi nyata, ini akan mengirim request ke API Telegram
            console.log('Mengirim notifikasi Telegram:', message);
            
            // Contoh request ke API Telegram (dikomentari karena membutuhkan token asli)
            /*
            const response = await fetch(`https://api.telegram.org/bot${this.botConfig.token}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: this.botConfig.chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send Telegram message');
            }
            */
            
        } catch (error) {
            console.error('Error sending Telegram notification:', error);
        }
    }
    
    // Validasi URL
    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }
    
    // Tampilkan modal
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }
    
    // Sembunyikan modal
    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
    
    // Tampilkan pesan
    showMessage(title, text, type = 'info') {
        document.getElementById('message-title').textContent = title;
        document.getElementById('message-text').textContent = text;
        
        // Set warna berdasarkan jenis pesan
        const titleElement = document.getElementById('message-title');
        titleElement.style.color = 
            type === 'success' ? '#34a853' :
            type === 'error' ? '#ea4335' :
            type === 'warning' ? '#fbbc05' : '#4285f4';
        
        this.showModal('message-modal');
    }
}

// Inisialisasi aplikasi ketika halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    new PlayStoreMonitor();
});

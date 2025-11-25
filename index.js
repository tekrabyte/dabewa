const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

function addLog(type, message) {
    // Waktu WIB (Asia/Jakarta)
    const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const logEntry = { time, type, message };
    
    // Tambahkan ke awal array (terbaru di atas)
    historyLogs.unshift(logEntry);
    
    // Hapus log lama jika melebihi batas
    if (historyLogs.length > MAX_LOGS) historyLogs.pop();
    
    console.log(`[${type}] ${message}`);
}
// --- HAPUS SESI LAMA (PENTING AGAR TIDAK CRASH) ---
const SESSION_DIR = '/railway/data/.wwebjs_auth';
if (fs.existsSync(SESSION_DIR)) {
    try {
        console.log('Menghapus sesi lama untuk start bersih...');
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    } catch (e) {
        console.error('Gagal hapus sesi:', e);
    }
}

// --- INISIALISASI APP EXPRESS (INI YANG HILANG SEBELUMNYA) ---
const app = express();
app.use(express.json());
app.use(cors());

// --- KONFIGURASI CLIENT WA (ANTI-CRASH) ---
const client = new Client({
    restartOnAuthFail: true,
    authStrategy: new LocalAuth({
        clientId: 'tekra_bot_v3', // Ganti ID biar fresh
        dataPath: '/railway/data'
    }),
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // WAJIB
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', 
            '--disable-gpu'
        ]
    }
});
// Variabel global untuk menyimpan QR code terakhir
let qrCodeData = null;
let isReady = false;

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrCodeData = qr; // Simpan QR code saat event 'qr' muncul
    isReady = false;
});

client.on('ready', () => {
    console.log('Client is ready!');
    qrCodeData = null; // Reset QR code saat sudah terhubung
    isReady = true;
});
app.get('/status', (req, res) => {
    let statusStr = 'INITIALIZING';

    if (isReady) {
        statusStr = 'CONNECTED';
    } else if (qrCodeData) {
        statusStr = 'QR_READY';
    } else {
        statusStr = 'DISCONNECTED';
    }

    res.json({
        status: statusStr, // Mengirim string yang diharapkan WordPress
        qr: qrCodeData
    });
});
// Endpoint Logs (BARU)
app.get('/logs', (req, res) => {
    res.json({ status: true, data: historyLogs });
});
// --- EVENT LISTENERS ---

client.on('qr', (qr) => {
    console.log('SCAN QR CODE DI BAWAH INI:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Bot Siap! Device Connected.');
});

client.on('disconnected', async (reason) => {
    console.log('Bot Terputus:', reason);
    
    // Reset variabel status
    isReady = false;
    qrCodeData = null;

    // Hapus sesi lama jika ada (Opsional tapi disarankan di Railway)
    const sessionPath = path.join(__dirname, '.wwebjs_auth'); 
    // Catatan: path session sesuaikan dengan config authStrategy Anda (di script awal Anda pakai /railway/data)
    
    // Re-initialize client agar muncul QR Code baru
    console.log('Menginisialisasi ulang client...');
    
    // Kita perlu destroy dulu untuk memastikan bersih sebelum init ulang
    try {
        await client.destroy();
    } catch (e) { }
    
    client.initialize();
});

// --- API ENDPOINTS ---

app.get('/', (req, res) => {
    res.send('');
});

app.post('/send-otp', async (req, res) => {
    const { target, message } = req.body;
    if (!target || !message) return res.status(400).json({ status: false, msg: 'Data kurang' });

    // Format nomor HP
    let number = target;
    if (number.startsWith('0')) number = '62' + number.slice(1);
    const chatId = number + '@c.us';

    try {
        await client.sendMessage(chatId, message);
        console.log(`Sukses kirim ke ${target}`);
        res.json({ status: true, msg: 'Terkirim' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, msg: error.message });
    }
});
app.post('/logout', async (req, res) => {
    try {
        // Periksa apakah client sedang berjalan sebelum logout
        if (isReady || client.info) {
            await client.logout();
            res.json({ status: true, message: 'Berhasil logout. Silakan scan ulang.' });
        } else {
            res.json({ status: false, message: 'Bot belum terhubung, tidak perlu logout.' });
        }
    } catch (error) {
        console.error('Logout Error:', error);
        // Jika gagal logout normal (misal sesi corrupt), paksa reset
        try {
            await client.destroy();
            await client.initialize();
            res.json({ status: true, message: 'Sesi dipaksa reset.' });
        } catch (e) {
            res.status(500).json({ status: false, message: 'Gagal logout: ' + error.message });
        }
    }
});
// --- JALANKAN SERVER ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
    console.log('Menyalakan WhatsApp Client...');
    client.initialize();
});

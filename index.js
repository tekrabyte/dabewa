const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// --- DEFINISI VARIABEL LOGGING (WAJIB ADA) ---
const historyLogs = []; 
const MAX_LOGS = 50;    

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

// --- INISIALISASI APP EXPRESS ---
const app = express();
app.use(express.json());
app.use(cors());

// --- KONFIGURASI CLIENT WA (ANTI-CRASH) ---
const client = new Client({
    restartOnAuthFail: true,
    authStrategy: new LocalAuth({
        clientId: 'tekra_bot_v3', 
        dataPath: '/railway/data'
    }),
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
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

// --- EVENT LISTENERS ---

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrCodeData = qr; 
    isReady = false;
    addLog('SYSTEM', 'QR Code baru muncul. Silakan scan.');
});

client.on('ready', () => {
    console.log('Client is ready!');
    qrCodeData = null; 
    isReady = true;
    addLog('SYSTEM', 'WhatsApp Bot Siap & Terhubung!');
});

client.on('authenticated', () => {
    addLog('SYSTEM', 'Sesi terautentikasi.');
});

client.on('disconnected', async (reason) => {
    console.log('Bot Terputus:', reason);
    addLog('SYSTEM', `Bot Terputus: ${reason}`);
    
    // Reset variabel status
    isReady = false;
    qrCodeData = null;

    // Re-initialize client agar muncul QR Code baru
    console.log('Menginisialisasi ulang client...');
    
    try {
        await client.destroy();
    } catch (e) { }
    
    client.initialize();
});

// --- API ENDPOINTS ---

app.get('/', (req, res) => {
    res.send('WhatsApp Bot Service Running...');
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
        status: statusStr,
        qr: qrCodeData
    });
});

// Endpoint Logs (DIPERBAIKI)
app.get('/logs', (req, res) => {
    // Pastikan historyLogs ada (sudah didefinisikan di atas)
    res.json({ status: true, data: historyLogs || [] });
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
        addLog('OTP', `Sukses kirim ke ${target}`);
        res.json({ status: true, msg: 'Terkirim' });
    } catch (error) {
        console.error(error);
        addLog('ERROR', `Gagal kirim ke ${target}: ${error.message}`);
        res.status(500).json({ status: false, msg: error.message });
    }
});

app.post('/logout', async (req, res) => {
    try {
        addLog('SYSTEM', 'Permintaan Logout diterima.');
        if (isReady || client.info) {
            await client.logout();
            res.json({ status: true, message: 'Berhasil logout. Silakan scan ulang.' });
        } else {
            res.json({ status: false, message: 'Bot belum terhubung, tidak perlu logout.' });
        }
    } catch (error) {
        console.error('Logout Error:', error);
        addLog('ERROR', `Gagal Logout: ${error.message}`);
        
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
    addLog('SYSTEM', 'Server dimulai...');
    client.initialize();
});

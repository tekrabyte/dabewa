const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. KONFIGURASI CLIENT WA (KHUSUS RAILWAY/DOCKER) ---
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'tekra_bot', // Tambahkan ID spesifik biar session rapi
        dataPath: '/railway/data' 
    }),
    puppeteer: { 
        headless: true,
        executablePath: '/usr/bin/google-chrome-stable',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // PENTING: Cegah crash memori
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // PENTING: Hemat RAM
            '--disable-gpu',
            '--disable-extensions',
            '--disable-software-rasterizer',
            '--mute-audio',
            '--disable-gl-drawing-for-tests',
            '--window-size=1280,1024'
        ]
    }
});

// --- 2. EVENT LISTENERS ---

// Generate QR Code di Terminal (Logs Railway)
client.on('qr', (qr) => {
    console.log('SCAN QR CODE DI BAWAH INI:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Bot Siap! Device Connected.');
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});

// --- 3. API ENDPOINTS (WAJIB ADA) ---

// Endpoint Cek Server (Supaya tidak 404 saat dibuka di browser)
app.get('/', (req, res) => {
    res.send('Server Bot WhatsApp Jalan! (Gunakan POST /send-otp untuk kirim pesan)');
});

// Endpoint Kirim OTP (Ini yang dipanggil WordPress)
app.post('/send-otp', async (req, res) => {
    console.log("Request masuk ke /send-otp", req.body);
    
    const { target, message } = req.body;

    if (!target || !message) {
        return res.status(400).json({ status: false, msg: 'Target atau Message kosong' });
    }

    // Format nomor HP: 08xx -> 628xx
    let number = target;
    if (number.startsWith('0')) {
        number = '62' + number.slice(1);
    }
    // Tambahkan suffix ID WhatsApp
    const chatId = number + '@c.us';

    try {
        // Cek status koneksi dulu
        const state = await client.getState();
        if (state !== 'CONNECTED') {
             // Coba initialize ulang jika terputus (opsional)
             console.log('Bot sedang tidak terhubung (State: ' + state + ')');
        }

        await client.sendMessage(chatId, message);
        console.log(`Sukses kirim pesan ke ${target}`);
        res.json({ status: true, msg: 'Pesan Terkirim' });

    } catch (error) {
        console.error('Gagal kirim pesan:', error);
        res.status(500).json({ status: false, msg: error.message });
    }
});

// --- 4. JALANKAN SERVER ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
    
    // Jalankan Bot WA setelah server Express siap
    console.log('Menyalakan WhatsApp Client...');
    client.initialize();
});

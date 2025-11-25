const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// --- HAPUS SESI LAMA AGAR TIDAK CRASH (RESET) ---
// Hati-hati: Ini akan meminta scan QR ulang setiap restart.
// Jika nanti sudah stabil, bagian ini bisa dihapus.
const SESSION_DIR = '/railway/data/.wwebjs_auth';
if (fs.existsSync(SESSION_DIR)) {
    console.log('Menghapus sesi lama untuk mencegah crash...');
    fs.rmSync(SESSION_DIR, { recursive: true, force: true });
}

const app = express();
app.use(express.json());
app.use(cors());

const client = new Client({
    restartOnAuthFail: true,
    authStrategy: new LocalAuth({
        clientId: 'tekra_bot',
        dataPath: '/railway/data'
    }),
    puppeteer: { 
        headless: true,
        executablePath: '/usr/bin/google-chrome-stable',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // WAJIB: Pakai disk /tmp bukan RAM
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', 
            '--disable-gpu',
            '--disable-extensions',
            '--disable-software-rasterizer',
            '--mute-audio',
            '--disable-gl-drawing-for-tests',
            '--window-size=1280,1024'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('SCAN QR CODE DI BAWAH INI:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Bot Siap! Device Connected.');
});

client.on('disconnected', (reason) => {
    console.log('Bot Terputus:', reason);
});

// API Endpoints
app.get('/', (req, res) => {
    res.send('Server Bot WhatsApp Jalan!');
});

app.post('/send-otp', async (req, res) => {
    const { target, message } = req.body;
    if (!target || !message) return res.status(400).json({ status: false, msg: 'Data kurang' });

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

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
    console.log('Menyalakan WhatsApp Client...');
    client.initialize();
});

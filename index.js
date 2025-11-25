const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- KONFIGURASI KHUSUS UNTUK MENGATASI CRASH DI RAILWAY ---
const client = new Client({
    restartOnAuthFail: true,
    authStrategy: new LocalAuth({
        clientId: 'client-one',
        dataPath: '/railway/data' 
    }),
    puppeteer: { 
        headless: true,
        executablePath: '/usr/bin/google-chrome-stable', // Sesuai Dockerfile
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // PENTING: Pakai /tmp bukan /dev/shm
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // PENTING: Hemat RAM
            '--disable-gpu',
            '--disable-extensions',
            '--disable-component-extensions-with-background-pages',
            '--disable-default-apps',
            '--mute-audio',
            '--no-default-browser-check',
            '--autoplay-policy=user-gesture-required',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-notifications',
            '--disable-popup-blocking'
        ]
    }
});

// Event Listeners
client.on('qr', (qr) => {
    console.log('SCAN QR CODE DI BAWAH INI:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Bot Siap! Device Connected.');
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    client.initialize(); // Auto reconnect
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

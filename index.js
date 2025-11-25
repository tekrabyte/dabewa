const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Konfigurasi Client WA (Support Docker/Linux)
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: '/railway/data' // Pastikan ini sesuai mount volume Railway Anda
    }),
    puppeteer: { 
        headless: true,
        // PATH INI PENTING: Menggunakan Chrome yang diinstall via Dockerfile
        executablePath: '/usr/bin/google-chrome-stable',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Wajib untuk mengatasi error memori di container
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', 
            '--disable-gpu'
        ]
    }
});

// Generate QR Code di Terminal (Logs)
client.on('qr', (qr) => {
    console.log('SCAN QR CODE INI:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Bot Siap! Device Connected.');
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
});

// Endpoint API
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

// PENTING: Gunakan process.env.PORT untuk Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
    client.initialize();
});

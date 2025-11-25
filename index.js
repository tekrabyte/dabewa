const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- KONFIGURASI CLIENT WA YANG BENAR UNTUK DOCKER/RAILWAY ---
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: '/railway/data' // Pastikan Anda sudah Add Volume di Railway
    }),
    puppeteer: { 
        headless: true,
        executablePath: '/usr/bin/google-chrome-stable', // Sesuai Dockerfile
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // PENTING: Mengatasi crash memori
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('SCAN QR CODE INI:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Bot Siap! Device Connected.');
});

// ... (Sisa kode endpoint API biarkan sama) ...

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
    client.initialize();
});

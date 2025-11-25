const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const SESSION_DIR = '/railway/data/.wwebjs_auth';
if (fs.existsSync(SESSION_DIR)) {
    try {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        console.log('Sesi lama dihapus untuk start bersih.');
    } catch (e) {
        console.error('Gagal hapus sesi:', e);
    }
}

const client = new Client({
    restartOnAuthFail: true,
    authStrategy: new LocalAuth({
        clientId: 'tekra_bot_v2', // Ganti ID biar fresh
        dataPath: '/railway/data'
    }),
    puppeteer: { 
        headless: true,
        // HAPUS BARIS executablePath !!! Biarkan kosong.
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

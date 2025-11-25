FROM node:18-slim

# 1. Install dependencies dasar & Google Chrome Stable
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 2. Set Environment Variables
# Lewati download chromium bawaan puppeteer (hemat waktu & kuota build)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# Arahkan puppeteer ke chrome yang baru diinstall
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

# 3. Copy & Install Project
COPY package*.json ./
RUN npm install

COPY . .

# 4. Jalankan
CMD [ "node", "index.js" ]

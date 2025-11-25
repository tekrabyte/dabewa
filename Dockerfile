FROM node:18

# 1. Install Google Chrome Stable & Font Pendukung (Wajib untuk Linux)
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 2. Set Environment Variables agar Puppeteer tahu lokasi Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# 3. Setup Direktori Kerja
WORKDIR /usr/src/app

# 4. Install Dependencies
COPY package*.json ./
RUN npm install

# 5. Copy Source Code
COPY . .

# 6. Jalankan
CMD [ "node", "index.js" ]

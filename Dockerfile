# ใช้ PHP 8.2 + Apache
FROM php:8.2-apache

RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_mysql gd zip \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

RUN a2enmod rewrite

# 1. Backend (PHP)
COPY backend/ /var/www/html/
RUN chown -R www-data:www-data /var/www/html

# 2. Frontend (Next.js)
WORKDIR /app/frontend

# ลอง COPY แบบเจาะจง เพื่อเช็กว่าไฟล์มีตัวตนบน context หรือไม่
COPY frontend/package.json ./
# สั่งลิสต์ไฟล์ออกมาดูให้โลกเห็น!
RUN ls -la

RUN npm install
COPY frontend/ ./
RUN npm run build

# 3. Startup
WORKDIR /app
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 80 3000
CMD ["./start.sh"]

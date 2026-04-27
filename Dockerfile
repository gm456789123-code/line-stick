# ใช้ PHP 8.2 + Apache เป็นฐาน
FROM php:8.2-apache

# ติดตั้ง System Dependencies และ Node.js
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

# เปิดใช้งาน Apache Rewrite Module (สำคัญสำหรับ PHP Backend)
RUN a2enmod rewrite

# ==========================================
# ส่วนที่ 1: ตั้งค่า Backend (PHP)
# ==========================================
# ก็อปปี้ไฟล์ในโฟลเดอร์ backend ไปไว้ในโฟลเดอร์รันเว็บของ Apache
COPY backend/ /var/www/html/
# อนุญาตให้ Apache อ่าน/เขียนไฟล์ได้
RUN chown -R www-data:www-data /var/www/html

# ==========================================
# ส่วนที่ 2: ตั้งค่า Frontend (Next.js)
# ==========================================
WORKDIR /app/frontend

# ก็อปปี้ package ของ frontend และติดตั้ง
COPY frontend/package*.json ./
RUN npm install

# ก็อปปี้โค้ด frontend ทั้งหมดและทำการ Build
COPY frontend/ ./
RUN npm run build

# ==========================================
# ส่วนที่ 3: เตรียมรันทั้ง 2 ระบบ
# ==========================================
WORKDIR /app
# ก็อปปี้สคริปต์สั่งรันมาไว้ที่ container
COPY start.sh ./
RUN chmod +x start.sh

# เปิด Port 80 (API Backend) และ 3000 (Next.js Frontend)
EXPOSE 80 3000

# สั่งรันสคริปต์
CMD ["./start.sh"]

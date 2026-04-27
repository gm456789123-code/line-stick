# ใช้ PHP 8.2 + Apache เป็นฐาน (รองรับทั้ง PHP Backend และ Node.js Frontend)
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

# เปิดใช้งาน Apache Rewrite Module (สำหรับ API Backend)
RUN a2enmod rewrite

# ==========================================
# 1. จัดการ Backend (PHP)
# ==========================================
COPY backend/ /var/www/html/
RUN chown -R www-data:www-data /var/www/html

# ==========================================
# 2. จัดการ Frontend (Next.js)
# ==========================================
WORKDIR /app/frontend
COPY frontend/ ./

# ใช้ npm install แทน npm ci เพื่อความยืดหยุ่น
RUN npm install
RUN npm run build

# ==========================================
# 3. เตรียมตัวรัน
# ==========================================
WORKDIR /app
COPY start.sh ./
RUN chmod +x start.sh

# เปิดพอร์ต 80 (Backend) และ 3000 (Frontend)
EXPOSE 80 3000

CMD ["./start.sh"]

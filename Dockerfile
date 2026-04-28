# ใช้ PHP 8.2 + Apache
FROM php:8.2-apache

# ติดตั้ง System Dependencies และ Node.js 20 (ตามที่ Next.js ต้องการ)
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
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# เปิดใช้งาน Apache Modules ที่จำเป็น
RUN a2enmod rewrite proxy proxy_http headers

# ==========================================
# 1. จัดการ Backend (PHP) และตั้งค่า Proxy
# ==========================================
COPY backend/ /var/www/html/
RUN chown -R www-data:www-data /var/www/html

RUN echo "<VirtualHost *:80>\n\
    DocumentRoot /var/www/html\n\
    <Directory /var/www/html>\n\
        AllowOverride All\n\
        Require all granted\n\
    </Directory>\n\
    ProxyPreserveHost On\n\
    ProxyPass /api !\n\
    ProxyPass /uploads !\n\
    ProxyPass /storage !\n\
    ProxyPass / http://127.0.0.1:3000/\n\
    ProxyPassReverse / http://127.0.0.1:3000/\n\
</VirtualHost>" > /etc/apache2/sites-available/000-default.conf

# ==========================================
# 2. จัดการ Frontend (Next.js)
# ==========================================
WORKDIR /app/frontend
COPY frontend/ ./

# ส่องดูไฟล์ (เก็บไว้ดูเพื่อความชัวร์)
RUN echo "=== FILES IN FRONTEND DIRECTORY ===" && ls -la

RUN npm install
RUN npm run build

# ==========================================
# 3. เตรียมตัวรัน
# ==========================================
WORKDIR /app
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 80
CMD ["./start.sh"]

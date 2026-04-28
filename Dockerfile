# ใช้ PHP 8.2 + Apache
FROM php:8.2-apache

# ติดตั้ง System Dependencies และ Node.js 20
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

# เปิดใช้งาน Apache Modules
RUN a2enmod rewrite proxy proxy_http headers

# 1. Backend (PHP)
COPY backend/ /var/www/html/
RUN chown -R www-data:www-data /var/www/html

RUN echo "<VirtualHost *:80>\n\
    DocumentRoot /var/www/html\n\
    <Directory /var/www/html>\n\
        AllowOverride All\n\
        Require all granted\n\
    </Directory>\n\
    ProxyPreserveHost On\n\
    RewriteEngine On\n\
    RewriteCond %{DOCUMENT_ROOT}%{REQUEST_FILENAME} -f [OR]\n\
    RewriteCond %{DOCUMENT_ROOT}%{REQUEST_FILENAME} -d\n\
    RewriteRule ^ - [L]\n\
    ProxyPass /api !\n\
    ProxyPass /uploads !\n\
    ProxyPass /storage !\n\
    ProxyPass / http://127.0.0.1:3001/\n\
    ProxyPassReverse / http://127.0.0.1:3001/\n\
</VirtualHost>" > /etc/apache2/sites-available/000-default.conf

# 2. Frontend (Next.js)
WORKDIR /app/frontend
COPY frontend/ ./

# จำกัดการใช้แรมของ Node.js เพื่อไม่ให้เครื่องค้าง (Set ไว้ที่ 1.5GB จาก 1.9GB)
ENV NODE_OPTIONS="--max-old-space-size=1536"

RUN npm install
RUN npm run build

# 3. Startup
WORKDIR /app
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 80
CMD ["./start.sh"]

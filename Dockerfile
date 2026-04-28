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
    ProxyPass /api !\n\
    ProxyPass /uploads !\n\
    ProxyPass /storage !\n\
    ProxyPass / http://127.0.0.1:3000/\n\
    ProxyPassReverse / http://127.0.0.1:3000/\n\
</VirtualHost>" > /etc/apache2/sites-available/000-default.conf

# 2. Frontend (Next.js)
WORKDIR /app/frontend
COPY frontend/ ./

# === ส่องดูไฟล์ว่าถูกอัปโหลดมาบน Server ครบไหม ===
RUN echo "=== FILES IN FRONTEND DIRECTORY ===" && ls -la

RUN npm install
RUN npm run build

# 3. Startup
WORKDIR /app
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 80
CMD ["./start.sh"]

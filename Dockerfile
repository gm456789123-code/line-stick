# 1. Build Stage สำหรับ Next.js
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
# จำกัดแรมตอน Build
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN npm install
COPY frontend/ ./
RUN npm run build

# 2. Production Stage (PHP + Apache)
FROM php:8.2-apache
RUN apt-get update && apt-get install -y nodejs npm && a2enmod rewrite proxy proxy_http headers

# ก๊อปปี้ไฟล์ Backend ไปที่ /var/www/html
COPY backend/ /var/www/html/
RUN chown -R www-data:www-data /var/www/html

# ตั้งค่า Apache แบบคลีนๆ (ไม่มี \n\ ให้งง)
RUN printf "<VirtualHost *:80>\n\
    DocumentRoot /var/www/html\n\
    <Directory /var/www/html>\n\
        AllowOverride All\n\
        Require all granted\n\
    </Directory>\n\
    ProxyPreserveHost On\n\
    ProxyPass /api !\n\
    ProxyPass /uploads !\n\
    ProxyPass /storage !\n\
    ProxyPass / http://127.0.0.1:3001/\n\
    ProxyPassReverse / http://127.0.0.1:3001/\n\
</VirtualHost>" > /etc/apache2/sites-available/000-default.conf

# ก๊อปปี้ไฟล์ Next.js ที่ Build เสร็จแล้วมาลงในเครื่องนี้
WORKDIR /app/frontend
COPY --from=frontend-builder /app/frontend/.next ./.next
COPY --from=frontend-builder /app/frontend/node_modules ./node_modules
COPY --from=frontend-builder /app/frontend/public ./public
COPY --from=frontend-builder /app/frontend/package.json ./package.json

# ก๊อปปี้สคริปต์เริ่มงาน
WORKDIR /app
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 80
CMD ["./start.sh"]

#!/bin/bash

# สั่งให้รัน Next.js ใน Background
echo "Starting Next.js Frontend on port 3000..."
cd /app/frontend
# ใช้คำสั่ง PORT=3000 เพื่อความชัวร์
PORT=3000 npm start &

# รอซัก 5 วินาทีให้ Next.js เริ่มทำงาน
sleep 5

# รัน Apache ใน Foreground
echo "Starting Apache Backend on port 80..."
apache2-foreground

#!/bin/bash

# รัน Next.js (Frontend) ไว้ใน Background
echo "Starting Next.js Frontend on port 3000..."
cd /app/frontend
npm start &

# รัน Apache (Backend PHP) ไว้ใน Foreground (เพื่อให้ Container ไม่ดับ)
echo "Starting Apache Backend on port 80..."
apache2-foreground

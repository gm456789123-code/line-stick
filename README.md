# LINE-STICK Frontend (Main App)

โปรเจ็คหลักอยู่ที่โฟลเดอร์นี้ (`frontend`) และรันแบบ Next.js fullstack

## Run

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000`

## Environment

สร้างไฟล์ `.env.local` จาก `.env.example` แล้วตั้งค่า MySQL

```env
APP_URL=http://localhost:3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=line_stick
DB_USER=root
DB_PASS=
SESSION_SECRET=your-random-secret
```

## Build / Start

```bash
npm run build
npm run start
```

## Docker

```bash
docker build -t line-stick-frontend .
docker run --rm -p 3000:3000 --env-file .env.local line-stick-frontend
```

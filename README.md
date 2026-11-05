# 🌲 Dearleaf ERP

Hệ thống quản lý bán hàng cho cửa hàng cây tùng Noel **Dearleaf**.

## Stack
- **Frontend & Backend**: Next.js 14 (App Router)
- **Database**: SQLite (better-sqlite3)
- **UI**: Tailwind CSS + Radix UI
- **Charts**: Recharts
- **Auth**: JWT (jose)

## Tính năng
- 📊 Dashboard tổng quan (doanh thu, lợi nhuận, tồn kho, công nợ)
- 📋 Quản lý đơn hàng (tạo, theo dõi, trạng thái)
- 📦 Quản lý sản phẩm & kho hàng
- 🛒 Quản lý mua hàng từ nhà cung cấp
- 👥 Quản lý khách hàng & nhà cung cấp
- 💰 Quản lý công nợ & thanh toán
- 📈 Báo cáo theo thời gian
- ⚙️ Cài đặt hệ thống

## Cài đặt & Chạy

### Yêu cầu
- Node.js 18+
- npm hoặc yarn

### 1. Clone và cài đặt
```bash
git clone https://github.com/YOUR_USERNAME/dearleaf-erp.git
cd dearleaf-erp
npm install
```

### 2. Cấu hình môi trường
```bash
cp .env.example .env.local
# Sửa các giá trị trong .env.local
```

### 3. Khởi tạo database
```bash
npm run db:migrate
npm run db:seed
```

### 4. Chạy development
```bash
npm run dev
# Truy cập http://localhost:3000
```

### 5. Build production
```bash
npm run build
npm run start
```

## Deploy lên Hostinger VPS

### 1. Chuẩn bị VPS
```bash
# SSH vào VPS
ssh root@YOUR_VPS_IP

# Cài Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cài PM2
npm install -g pm2

# Cài nginx
sudo apt install -y nginx
```

### 2. Upload code
```bash
# Trên máy local
git push origin main

# Trên VPS
cd /var/www
git clone https://github.com/YOUR_USERNAME/dearleaf-erp.git dearleaf
cd dearleaf
npm install --production
cp .env.example .env.local
nano .env.local  # Sửa cấu hình
npm run build
npm run db:migrate
npm run db:seed
```

### 3. Cấu hình PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Cấu hình Nginx
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/dearleaf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL với Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Tài khoản mặc định
- **Email**: admin@dearleaf.co
- **Mật khẩu**: dearleaf@2024

> ⚠️ **Quan trọng**: Thay đổi mật khẩu ngay sau lần đăng nhập đầu tiên!

## Cấu trúc thư mục
```
dearleaf/
├── src/
│   ├── app/
│   │   ├── (dashboard)/     # Layout + trang chính
│   │   ├── api/             # API routes
│   │   ├── login/           # Trang đăng nhập
│   │   └── globals.css
│   ├── lib/
│   │   ├── db.ts            # Database connection
│   │   └── auth.ts          # Authentication
│   └── middleware.ts        # Auth middleware
├── scripts/
│   ├── migrate.js           # Database migration
│   └── seed.js              # Seed data
├── data/                    # SQLite database (không commit)
├── ecosystem.config.js      # PM2 config
└── package.json
```

## License
Private - Dearleaf © 2024

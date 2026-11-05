# 🚀 Hướng dẫn Deploy Dearleaf ERP lên GitHub + Hostinger VPS

## BƯỚC 1: Push lên GitHub

### 1a. Tạo repo trên GitHub
1. Truy cập https://github.com/new
2. Tên repo: `dearleaf-erp`
3. Chọn **Private** (để bảo mật)
4. Nhấn **Create repository**

### 1b. Push code (chạy trong terminal tại thư mục dearleaf)
```bash
cd /path/to/dearleaf  # thư mục này
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/dearleaf-erp.git
git push -u origin main
```

---

## BƯỚC 2: Chuẩn bị Hostinger VPS

### 2a. SSH vào VPS
```bash
ssh root@YOUR_VPS_IP
```

### 2b. Cài đặt Node.js 18+
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Phải >= 18
```

### 2c. Cài PM2 (process manager)
```bash
npm install -g pm2
```

### 2d. Cài Nginx
```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## BƯỚC 3: Deploy code lên VPS

### 3a. Clone repo
```bash
cd /var/www
git clone https://github.com/YOUR_GITHUB_USERNAME/dearleaf-erp.git dearleaf
cd dearleaf
```

### 3b. Cài dependencies
```bash
npm install
```

### 3c. Cấu hình môi trường
```bash
cp .env.example .env.local
nano .env.local
```
Sửa các dòng:
```env
JWT_SECRET=abc123xyz_random_secret_thay_bang_key_manh  # Tạo ngẫu nhiên!
DATABASE_PATH=/var/www/dearleaf/data/dearleaf.db
```

### 3d. Khởi tạo database
```bash
npm run db:migrate
npm run db:seed
```

### 3e. Build ứng dụng
```bash
npm run build
```

### 3f. Chạy với PM2
```bash
# Sửa file ecosystem.config.js - đổi JWT_SECRET
nano ecosystem.config.js

pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Chạy lệnh nó hiển thị ra
```

---

## BƯỚC 4: Cấu hình Nginx

```bash
sudo nano /etc/nginx/sites-available/dearleaf
```

Dán vào:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    # Upload limit
    client_max_body_size 50M;

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
        proxy_read_timeout 86400;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/dearleaf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## BƯỚC 5: Cài SSL (HTTPS) - Miễn phí với Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Certbot tự cấu hình Nginx + tự renewal
```

---

## BƯỚC 6: Trỏ domain về VPS (trên Hostinger)

1. Vào **Hostinger Panel** → **Domains** → **DNS Zone**
2. Thêm A Record:
   - **Host**: `@` → **Value**: IP VPS của bạn
   - **Host**: `www` → **Value**: IP VPS của bạn
3. Chờ DNS propagate (5-30 phút)

---

## 🔄 Update code sau này

```bash
# Trên máy local
git add .
git commit -m "feat: mô tả thay đổi"
git push origin main

# Trên VPS
cd /var/www/dearleaf
git pull origin main
npm install          # nếu có package mới
npm run build
pm2 restart dearleaf-erp
```

---

## 🔐 Bảo mật sau deploy

1. **Đổi mật khẩu admin** ngay sau lần đăng nhập đầu tiên
2. **Backup database** định kỳ:
   ```bash
   # Tạo cron backup hàng ngày
   crontab -e
   # Thêm dòng:
   0 2 * * * cp /var/www/dearleaf/data/dearleaf.db /var/backups/dearleaf-$(date +%Y%m%d).db
   ```
3. **Firewall**:
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

---

## ✅ Kiểm tra sau deploy

- [ ] Web mở được: `https://yourdomain.com`
- [ ] Login được với admin@dearleaf.co
- [ ] Dashboard hiển thị đúng
- [ ] Tạo đơn hàng thử được
- [ ] PM2 running: `pm2 status`
- [ ] Nginx running: `sudo systemctl status nginx`

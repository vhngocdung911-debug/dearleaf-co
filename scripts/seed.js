const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'dearleaf.db');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

function run() {
  // Default settings
  const defaultSettings = [
    { key: 'company_name', value: 'Dearleaf' },
    { key: 'company_tax_code', value: '' },
    { key: 'company_address', value: '' },
    { key: 'company_phone', value: '' },
    { key: 'company_email', value: '' },
    { key: 'company_logo', value: '' },
    { key: 'default_vat', value: '0' },
    { key: 'currency', value: 'VND' },
    { key: 'bank_name', value: '' },
    { key: 'bank_account', value: '' },
    { key: 'bank_owner', value: '' },
    { key: 'bank_branch', value: '' },
    { key: 'invoice_prefix', value: 'DL' },
    { key: 'quote_prefix', value: 'BG' },
    { key: 'purchase_prefix', value: 'MH' },
    { key: 'low_stock_days', value: '7' },
    { key: 'email_host', value: 'smtp.gmail.com' },
    { key: 'email_port', value: '587' },
    { key: 'email_user', value: '' },
    { key: 'email_pass', value: '' },
    { key: 'backup_frequency', value: 'weekly' },
    { key: 'timezone', value: 'Asia/Ho_Chi_Minh' },
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);
  
  for (const s of defaultSettings) {
    insertSetting.run(s.key, s.value);
  }

  // Admin user
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@dearleaf.co');
  if (!existingAdmin) {
    const hash = bcrypt.hashSync('dearleaf@2024', 10);
    db.prepare(`
      INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)
    `).run('Admin', 'admin@dearleaf.co', hash, 'admin');
  }

  // Product categories
  const categories = [
    { name: 'Cây tùng Noel', description: 'Các loại cây thông Noel' },
    { name: 'Cây trang trí', description: 'Cây trang trí nội thất' },
    { name: 'Phụ kiện Noel', description: 'Đèn, chuông, bóng trang trí' },
    { name: 'Chậu & Giá đỡ', description: 'Chậu và giá đỡ cây' },
  ];

  const insertCat = db.prepare('INSERT OR IGNORE INTO product_categories (name, description) VALUES (?, ?)');
  for (const c of categories) {
    insertCat.run(c.name, c.description);
  }

  // Sample products
  const cat1 = db.prepare("SELECT id FROM product_categories WHERE name = 'Cây tùng Noel'").get();
  const sampleProducts = [
    { code: 'TUNG-S', name: 'Sơn tùng size S (60cm)', cost_price: 150000, sell_price: 280000, min_stock: 10, max_stock: 200, current_stock: 85, unit: 'cây' },
    { code: 'TUNG-M', name: 'Sơn tùng size M (90cm)', cost_price: 280000, sell_price: 520000, min_stock: 10, max_stock: 150, current_stock: 48, unit: 'cây' },
    { code: 'TUNG-L', name: 'Sơn tùng size L (120cm)', cost_price: 450000, sell_price: 850000, min_stock: 5, max_stock: 100, current_stock: 32, unit: 'cây' },
    { code: 'TUNG-XL', name: 'Sơn tùng size XL (150cm)', cost_price: 680000, sell_price: 1250000, min_stock: 5, max_stock: 80, current_stock: 20, unit: 'cây' },
    { code: 'TRAU-XE', name: 'Trầu bà lá xẻ', cost_price: 180000, sell_price: 320000, min_stock: 5, max_stock: 100, current_stock: 36, unit: 'cây' },
    { code: 'MONSTERA', name: 'Monstera deliciosa', cost_price: 220000, sell_price: 420000, min_stock: 5, max_stock: 80, current_stock: 28, unit: 'cây' },
  ];

  const insertProd = db.prepare(`
    INSERT OR IGNORE INTO products 
    (code, name, cost_price, sell_price, min_stock, max_stock, current_stock, unit, category_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const p of sampleProducts) {
    insertProd.run(p.code, p.name, p.cost_price, p.sell_price, p.min_stock, p.max_stock, p.current_stock, p.unit, cat1?.id || null);
  }

  // Sample supplier
  const existingSupplier = db.prepare("SELECT id FROM suppliers WHERE code = 'NCC001'").get();
  if (!existingSupplier) {
    db.prepare(`
      INSERT INTO suppliers (code, name, contact_person, phone, email, address, payment_terms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('NCC001', 'Vườn ươm Miền Bắc', 'Anh Hùng', '0901234567', 'vuonuom@email.com', 'Hà Nội', 30);
  }

  // Sample customers
  const customerData = [
    { code: 'KH001', name: 'Chị Mai', phone: '0901111111', email: 'mai@email.com', customer_type: 'wholesale' },
    { code: 'KH002', name: 'Anh Tuấn', phone: '0902222222', email: '', customer_type: 'retail' },
  ];
  const insertCust = db.prepare(`
    INSERT OR IGNORE INTO customers (code, name, phone, email, customer_type)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const c of customerData) {
    insertCust.run(c.code, c.name, c.phone, c.email, c.customer_type);
  }

  console.log('✅ Seed data inserted');
}

run();
db.close();

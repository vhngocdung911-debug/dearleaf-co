import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== process.env.JWT_SECRET?.slice(0, 16)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'dearleaf.db');
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const migrations = [
      `CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, value TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin','manager','staff','accountant')), is_active INTEGER NOT NULL DEFAULT 1, avatar_url TEXT, last_login DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS product_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, parent_id INTEGER REFERENCES product_categories(id), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, description TEXT, category_id INTEGER REFERENCES product_categories(id), unit TEXT DEFAULT 'cây', cost_price REAL DEFAULT 0, selling_price REAL DEFAULT 0, current_stock REAL DEFAULT 0, min_stock REAL DEFAULT 0, max_stock REAL, is_active INTEGER DEFAULT 1, image_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, contact_name TEXT, phone TEXT, email TEXT, address TEXT, tax_code TEXT, bank_account TEXT, bank_name TEXT, total_debt REAL DEFAULT 0, notes TEXT, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, tax_code TEXT, customer_type TEXT DEFAULT 'retail' CHECK(customer_type IN ('retail','wholesale','vip')), total_debt REAL DEFAULT 0, total_purchased REAL DEFAULT 0, notes TEXT, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS inventory_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, product_id INTEGER NOT NULL REFERENCES products(id), transaction_type TEXT NOT NULL, quantity REAL NOT NULL, before_stock REAL, after_stock REAL, unit_cost REAL, total_cost REAL, reference_id INTEGER, reference_type TEXT, notes TEXT, created_by INTEGER REFERENCES users(id), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS purchase_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, supplier_id INTEGER REFERENCES suppliers(id), status TEXT DEFAULT 'draft' CHECK(status IN ('draft','confirmed','received','cancelled')), order_date DATETIME DEFAULT CURRENT_TIMESTAMP, expected_date DATETIME, received_date DATETIME, total_amount REAL DEFAULT 0, paid_amount REAL DEFAULT 0, debt_amount REAL DEFAULT 0, payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','partial','paid')), notes TEXT, created_by INTEGER REFERENCES users(id), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS purchase_order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id), product_id INTEGER NOT NULL REFERENCES products(id), quantity REAL NOT NULL, unit_price REAL NOT NULL, total_price REAL NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS quotes (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, customer_id INTEGER REFERENCES customers(id), customer_name TEXT, customer_phone TEXT, status TEXT DEFAULT 'draft' CHECK(status IN ('draft','sent','accepted','rejected','expired')), quote_date DATETIME DEFAULT CURRENT_TIMESTAMP, expiry_date DATETIME, total_amount REAL DEFAULT 0, discount_amount REAL DEFAULT 0, final_amount REAL DEFAULT 0, notes TEXT, created_by INTEGER REFERENCES users(id), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS quote_items (id INTEGER PRIMARY KEY AUTOINCREMENT, quote_id INTEGER NOT NULL REFERENCES quotes(id), product_id INTEGER NOT NULL REFERENCES products(id), quantity REAL NOT NULL, unit_price REAL NOT NULL, discount_percent REAL DEFAULT 0, total_price REAL NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS sales_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, customer_id INTEGER REFERENCES customers(id), customer_name TEXT, customer_phone TEXT, quote_id INTEGER REFERENCES quotes(id), status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','delivered','cancelled','returned')), order_date DATETIME DEFAULT CURRENT_TIMESTAMP, delivery_date DATETIME, total_amount REAL DEFAULT 0, discount_amount REAL DEFAULT 0, final_amount REAL DEFAULT 0, paid_amount REAL DEFAULT 0, debt_amount REAL DEFAULT 0, payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','partial','paid')), payment_method TEXT DEFAULT 'cash', notes TEXT, created_by INTEGER REFERENCES users(id), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS sales_order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id), product_id INTEGER NOT NULL REFERENCES products(id), quantity REAL NOT NULL, unit_price REAL NOT NULL, cost_price REAL DEFAULT 0, discount_percent REAL DEFAULT 0, total_price REAL NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, payment_type TEXT NOT NULL CHECK(payment_type IN ('receivable','payable')), reference_id INTEGER, reference_type TEXT, customer_id INTEGER REFERENCES customers(id), supplier_id INTEGER REFERENCES suppliers(id), amount REAL NOT NULL, payment_method TEXT DEFAULT 'cash', payment_date DATETIME DEFAULT CURRENT_TIMESTAMP, notes TEXT, created_by INTEGER REFERENCES users(id), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS stock_takes (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, status TEXT DEFAULT 'draft' CHECK(status IN ('draft','in_progress','completed','cancelled')), take_date DATETIME DEFAULT CURRENT_TIMESTAMP, notes TEXT, created_by INTEGER REFERENCES users(id), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS stock_take_items (id INTEGER PRIMARY KEY AUTOINCREMENT, stock_take_id INTEGER NOT NULL REFERENCES stock_takes(id), product_id INTEGER NOT NULL REFERENCES products(id), system_stock REAL, actual_stock REAL, difference REAL, notes TEXT)`,
      `CREATE TABLE IF NOT EXISTS sales_returns (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, sales_order_id INTEGER REFERENCES sales_orders(id), customer_id INTEGER REFERENCES customers(id), status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), return_date DATETIME DEFAULT CURRENT_TIMESTAMP, total_amount REAL DEFAULT 0, reason TEXT, notes TEXT, created_by INTEGER REFERENCES users(id), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS sales_return_items (id INTEGER PRIMARY KEY AUTOINCREMENT, sales_return_id INTEGER NOT NULL REFERENCES sales_returns(id), product_id INTEGER NOT NULL REFERENCES products(id), quantity REAL NOT NULL, unit_price REAL NOT NULL, total_price REAL NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id), action TEXT NOT NULL, entity_type TEXT, entity_id INTEGER, old_values TEXT, new_values TEXT, ip_address TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    ];

    for (const sql of migrations) {
      db.prepare(sql).run();
    }

    // Seed default settings
    const defaultSettings = [
      ['company_name', 'Dearleaf'],
      ['company_address', ''],
      ['company_phone', ''],
      ['company_email', 'admin@dearleaf.co'],
      ['company_website', 'https://dearleaf.co'],
      ['company_tax_code', ''],
      ['currency', 'VND'],
      ['currency_symbol', '₫'],
      ['vat_rate', '10'],
      ['bank_account_number', ''],
      ['bank_account_name', ''],
      ['bank_name', ''],
      ['low_stock_threshold', '10'],
      ['order_prefix', 'SO'],
      ['purchase_prefix', 'PO'],
      ['quote_prefix', 'QT'],
      ['payment_prefix', 'PM'],
      ['invoice_footer', 'Cảm ơn quý khách!'],
      ['fiscal_year_start', '01-01'],
      ['timezone', 'Asia/Ho_Chi_Minh'],
      ['language', 'vi'],
      ['date_format', 'DD/MM/YYYY'],
    ];

    const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
    for (const [key, value] of defaultSettings) {
      insertSetting.run(key, value);
    }

    // Seed admin user
    const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@dearleaf.co');
    if (!existingAdmin) {
      const passwordHash = bcrypt.hashSync('dearleaf@2024', 10);
      db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`).run('Admin', 'admin@dearleaf.co', passwordHash, 'admin');
    }

    // Seed categories
    const catStmt = db.prepare(`INSERT OR IGNORE INTO product_categories (name, description) VALUES (?, ?)`);
    catStmt.run('Cây Noel', 'Các loại cây thông Noel');
    catStmt.run('Cây cảnh', 'Cây cảnh trang trí');
    catStmt.run('Phụ kiện', 'Phụ kiện trang trí');
    catStmt.run('Khác', 'Sản phẩm khác');

    db.close();

    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully with tables and seed data!' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

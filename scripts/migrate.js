const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'dearleaf.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const migrations = [
  // ============ SETTINGS ============
  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // ============ USERS ============
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin','manager','staff','accountant')),
    is_active INTEGER NOT NULL DEFAULT 1,
    avatar_url TEXT,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // ============ PRODUCT CATEGORIES ============
  `CREATE TABLE IF NOT EXISTS product_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES product_categories(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // ============ PRODUCTS ============
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES product_categories(id),
    unit TEXT NOT NULL DEFAULT 'cây',
    cost_price REAL NOT NULL DEFAULT 0,
    sell_price REAL NOT NULL DEFAULT 0,
    image_url TEXT,
    min_stock INTEGER NOT NULL DEFAULT 5,
    max_stock INTEGER NOT NULL DEFAULT 500,
    current_stock INTEGER NOT NULL DEFAULT 0,
    vat_rate REAL NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // ============ SUPPLIERS ============
  `CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    tax_code TEXT,
    bank_name TEXT,
    bank_account TEXT,
    bank_branch TEXT,
    payment_terms INTEGER DEFAULT 30,
    total_debt REAL NOT NULL DEFAULT 0,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // ============ CUSTOMERS ============
  `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    tax_code TEXT,
    customer_type TEXT DEFAULT 'retail' CHECK(customer_type IN ('retail','wholesale','vip')),
    discount_rate REAL DEFAULT 0,
    total_debt REAL NOT NULL DEFAULT 0,
    total_revenue REAL NOT NULL DEFAULT 0,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // ============ INVENTORY TRANSACTIONS ============
  `CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('purchase_in','sale_out','manual_in','manual_out','adjustment','return_in','return_out','opening')),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL,
    unit_price REAL,
    reference_id INTEGER,
    reference_type TEXT,
    note TEXT,
    before_stock REAL NOT NULL,
    after_stock REAL NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // ============ PURCHASE ORDERS ============
  `CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','confirmed','receiving','received','cancelled')),
    order_date DATE NOT NULL,
    expected_date DATE,
    received_date DATE,
    subtotal REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    vat_amount REAL NOT NULL DEFAULT 0,
    shipping_fee REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    debt_amount REAL NOT NULL DEFAULT 0,
    due_date DATE,
    payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','partial','paid')),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    discount_rate REAL DEFAULT 0,
    vat_rate REAL DEFAULT 0,
    subtotal REAL NOT NULL,
    received_qty REAL DEFAULT 0
  )`,

  // ============ SALES ORDERS ============
  `CREATE TABLE IF NOT EXISTS sales_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','confirmed','packing','shipping','delivered','cancelled','returned')),
    order_date DATE NOT NULL,
    delivery_date DATE,
    subtotal REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    vat_amount REAL NOT NULL DEFAULT 0,
    shipping_fee REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    debt_amount REAL NOT NULL DEFAULT 0,
    due_date DATE,
    payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','partial','paid')),
    cost_total REAL DEFAULT 0,
    profit REAL DEFAULT 0,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS sales_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    cost_price REAL NOT NULL DEFAULT 0,
    discount_rate REAL DEFAULT 0,
    vat_rate REAL DEFAULT 0,
    subtotal REAL NOT NULL,
    profit REAL DEFAULT 0
  )`,

  // ============ QUOTES ============
  `CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    customer_name TEXT,
    customer_phone TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','accepted','rejected','expired','converted')),
    quote_date DATE NOT NULL,
    expiry_date DATE,
    subtotal REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    vat_amount REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL DEFAULT 0,
    converted_to_order_id INTEGER REFERENCES sales_orders(id),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS quote_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    discount_rate REAL DEFAULT 0,
    vat_rate REAL DEFAULT 0,
    subtotal REAL NOT NULL
  )`,

  // ============ RETURNS ============
  `CREATE TABLE IF NOT EXISTS sales_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id),
    customer_id INTEGER REFERENCES customers(id),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','completed','rejected')),
    return_date DATE NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0,
    refund_method TEXT CHECK(refund_method IN ('cash','bank_transfer','credit')),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS sales_return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sales_return_id INTEGER NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    max_returnable_qty REAL NOT NULL,
    subtotal REAL NOT NULL
  )`,

  // ============ PAYMENTS ============
  `CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('receipt','payment')),
    reference_type TEXT NOT NULL CHECK(reference_type IN ('sales_order','purchase_order','manual')),
    reference_id INTEGER,
    party_type TEXT CHECK(party_type IN ('customer','supplier')),
    party_id INTEGER,
    party_name TEXT,
    amount REAL NOT NULL,
    method TEXT NOT NULL CHECK(method IN ('cash','bank_transfer','momo','zalo_pay')),
    payment_date DATE NOT NULL,
    bank_reference TEXT,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // ============ STOCK TAKES ============
  `CREATE TABLE IF NOT EXISTS stock_takes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','in_progress','completed','cancelled')),
    start_date DATETIME,
    end_date DATETIME,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS stock_take_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_take_id INTEGER NOT NULL REFERENCES stock_takes(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    system_qty REAL NOT NULL,
    actual_qty REAL,
    difference REAL,
    notes TEXT
  )`,

  // ============ AUDIT LOG ============
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    user_name TEXT,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id INTEGER,
    old_values TEXT,
    new_values TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // ============ INDEXES ============
  `CREATE INDEX IF NOT EXISTS idx_products_code ON products(code)`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(order_date)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date)`,
  `CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON inventory_transactions(product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at)`,
];

console.log('Running migrations...');
db.transaction(() => {
  for (const sql of migrations) {
    db.exec(sql);
  }
})();

console.log('✅ Database migrations completed');
db.close();

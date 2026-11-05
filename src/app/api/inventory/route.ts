import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { generateCode } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || '';
  const product_id = searchParams.get('product_id') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const db = getDb();

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (search) { where += ' AND (p.name LIKE ? OR it.code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (type) { where += ' AND it.type = ?'; params.push(type); }
  if (product_id) { where += ' AND it.product_id = ?'; params.push(product_id); }

  const transactions = db.prepare(`
    SELECT it.*, p.name as product_name, p.unit, p.code as product_code
    FROM inventory_transactions it
    LEFT JOIN products p ON it.product_id = p.id
    ${where}
    ORDER BY it.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM inventory_transactions it LEFT JOIN products p ON it.product_id = p.id ${where}`).get(...params) as any).cnt;

  const stats = db.prepare(`
    SELECT
      COUNT(DISTINCT p.id) as total_products,
      COALESCE(SUM(p.current_stock * p.cost_price), 0) as total_value,
      COUNT(CASE WHEN p.current_stock <= p.min_stock AND p.current_stock > 0 THEN 1 END) as low_stock,
      COUNT(CASE WHEN p.current_stock = 0 THEN 1 END) as out_of_stock
    FROM products p WHERE p.is_active = 1
  `).get() as any;

  return NextResponse.json({ transactions, total, page, limit, stats });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { product_id, type, quantity, unit_cost, notes, reference_id, reference_type } = body;

  if (!product_id || !type || !quantity) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
  }

  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id) as any;
  if (!product) return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 404 });

  const qty = parseFloat(quantity);
  const before_stock = product.current_stock;
  let after_stock = before_stock;

  if (type === 'import' || type === 'adjust_increase') after_stock = before_stock + qty;
  else if (type === 'export' || type === 'adjust_decrease') after_stock = before_stock - qty;
  else if (type === 'adjust') after_stock = qty;

  if (after_stock < 0) return NextResponse.json({ error: 'Tồn kho không đủ' }, { status: 400 });

  const code = generateCode('KHO', 6);

  const tx = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO inventory_transactions (code, product_id, type, quantity, before_stock, after_stock, unit_cost, notes, reference_id, reference_type, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(code, product_id, type, qty, before_stock, after_stock, unit_cost || product.cost_price, notes, reference_id, reference_type, user.id);

    db.prepare('UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(after_stock, product_id);
    return result;
  });

  const result = tx();
  return NextResponse.json({ id: result.lastInsertRowid, code }, { status: 201 });
}

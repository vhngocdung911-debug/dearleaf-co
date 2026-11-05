import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const params: any[] = [];
  
  if (search) { where += ' AND (p.name LIKE ? OR p.code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (category) { where += ' AND p.category_id = ?'; params.push(category); }
  if (status === 'low') { where += ' AND p.current_stock <= p.min_stock AND p.current_stock > 0'; }
  if (status === 'out') { where += ' AND p.current_stock = 0'; }
  if (status === 'over') { where += ' AND p.current_stock > p.max_stock'; }
  if (status === 'active') { where += ' AND p.is_active = 1'; }

  const products = db.prepare(`
    SELECT p.*, c.name as category_name,
      CASE 
        WHEN p.current_stock = 0 THEN 'out'
        WHEN p.current_stock <= p.min_stock THEN 'low'
        WHEN p.current_stock > p.max_stock THEN 'over'
        ELSE 'ok'
      END as stock_status
    FROM products p
    LEFT JOIN product_categories c ON p.category_id = c.id
    ${where}
    ORDER BY p.name
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM products p ${where}`).get(...params) as any).cnt;

  return NextResponse.json({ products, total, page, limit });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const body = await req.json();
    const db = getDb();
    
    const existing = db.prepare('SELECT id FROM products WHERE code = ?').get(body.code);
    if (existing) return NextResponse.json({ error: 'Mã sản phẩm đã tồn tại' }, { status: 400 });

    const result = db.prepare(`
      INSERT INTO products (code, name, description, category_id, unit, cost_price, sell_price, min_stock, max_stock, current_stock, vat_rate, notes, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.code, body.name, body.description || null, body.category_id || null,
      body.unit || 'cây', body.cost_price || 0, body.sell_price || 0,
      body.min_stock || 5, body.max_stock || 500, body.current_stock || 0,
      body.vat_rate || 0, body.notes || null, body.image_url || null
    );

    if ((body.current_stock || 0) > 0) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid) as any;
      db.prepare(`
        INSERT INTO inventory_transactions (code, type, product_id, quantity, before_stock, after_stock, note, created_by)
        VALUES (?, 'opening', ?, ?, 0, ?, 'Tồn đầu kỳ', ?)
      `).run(`IT${Date.now()}`, result.lastInsertRowid, body.current_stock, body.current_stock, user.id);
    }

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

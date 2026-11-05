import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { generateCode } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const db = getDb();

  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (search) { where += ' AND (po.code LIKE ? OR s.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (status) { where += ' AND po.status = ?'; params.push(status); }

  const orders = db.prepare(`
    SELECT po.*, s.name as supplier_name, s.phone as supplier_phone
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    ${where}
    ORDER BY po.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id ${where}`).get(...params) as any).cnt;

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
      COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
      COUNT(CASE WHEN status = 'received' THEN 1 END) as received,
      COALESCE(SUM(CASE WHEN status = 'received' THEN total_amount END), 0) as total_spent
    FROM purchase_orders
  `).get() as any;

  return NextResponse.json({ orders, total, page, limit, stats });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { supplier_id, expected_date, notes, items } = body;

  if (!supplier_id || !items || items.length === 0) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
  }

  const db = getDb();
  const supplier = db.prepare('SELECT id FROM suppliers WHERE id = ?').get(supplier_id);
  if (!supplier) return NextResponse.json({ error: 'Nhà cung cấp không tồn tại' }, { status: 404 });

  const code = generateCode('MH', 6);
  const total_amount = items.reduce((s: number, it: any) => s + (parseFloat(it.quantity) * parseFloat(it.unit_price)), 0);

  const tx = db.transaction(() => {
    const po = db.prepare(`
      INSERT INTO purchase_orders (code, supplier_id, status, total_amount, expected_date, notes, created_by)
      VALUES (?, ?, 'draft', ?, ?, ?, ?)
    `).run(code, supplier_id, total_amount, expected_date, notes, user.id);

    const id = po.lastInsertRowid;
    for (const item of items) {
      db.prepare(`
        INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, item.product_id, item.quantity, item.unit_price, parseFloat(item.quantity) * parseFloat(item.unit_price));
    }
    return id;
  });

  const id = tx();
  return NextResponse.json({ id, code }, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const product = db.prepare(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN product_categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(params.id);
  if (!product) return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });
  
  const history = db.prepare(`
    SELECT it.*, 'inventory' as ref_type FROM inventory_transactions it
    WHERE it.product_id = ? ORDER BY it.created_at DESC LIMIT 20
  `).all(params.id);
  
  return NextResponse.json({ product, history });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const db = getDb();
    db.prepare(`
      UPDATE products SET name=?, description=?, category_id=?, unit=?, cost_price=?, sell_price=?,
      min_stock=?, max_stock=?, vat_rate=?, notes=?, image_url=?, is_active=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      body.name, body.description||null, body.category_id||null, body.unit||'cây',
      body.cost_price||0, body.sell_price||0, body.min_stock||5, body.max_stock||500,
      body.vat_rate||0, body.notes||null, body.image_url||null, body.is_active??1, params.id
    );
    return NextResponse.json({ success: true });
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = getDb();
  db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(params.id);
  return NextResponse.json({ success: true });
}

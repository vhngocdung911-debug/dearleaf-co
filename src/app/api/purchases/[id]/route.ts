import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { generateCode } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const order = db.prepare(`
    SELECT po.*, s.name as supplier_name, s.phone as supplier_phone, s.email as supplier_email
    FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.id = ?
  `).get(params.id) as any;

  if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });

  const items = db.prepare(`
    SELECT poi.*, p.name as product_name, p.unit, p.code as product_code
    FROM purchase_order_items poi LEFT JOIN products p ON poi.product_id = p.id
    WHERE poi.purchase_order_id = ?
  `).all(params.id);

  return NextResponse.json({ ...order, items });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  const db = getDb();
  const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(params.id) as any;
  if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });

  if (action === 'confirm') {
    if (order.status !== 'draft') return NextResponse.json({ error: 'Chỉ có thể xác nhận đơn nháp' }, { status: 400 });
    db.prepare("UPDATE purchase_orders SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(params.id);
    return NextResponse.json({ success: true });
  }

  if (action === 'receive') {
    if (order.status !== 'confirmed') return NextResponse.json({ error: 'Chỉ có thể nhận đơn đã xác nhận' }, { status: 400 });

    const items = db.prepare('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?').all(params.id) as any[];

    const tx = db.transaction(() => {
      db.prepare("UPDATE purchase_orders SET status = 'received', received_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(params.id);

      for (const item of items) {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id) as any;
        if (!product) continue;

        const before_stock = product.current_stock;
        const after_stock = before_stock + item.quantity;
        const itCode = generateCode('KHO', 6);

        db.prepare(`
          INSERT INTO inventory_transactions (code, product_id, type, quantity, before_stock, after_stock, unit_cost, reference_id, reference_type, notes, created_by)
          VALUES (?, ?, 'import', ?, ?, ?, ?, ?, 'purchase_order', ?, ?)
        `).run(itCode, item.product_id, item.quantity, before_stock, after_stock, item.unit_price, params.id, `Nhập hàng từ đơn ${order.code}`, user.id);

        db.prepare('UPDATE products SET current_stock = ?, cost_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(after_stock, item.unit_price, item.product_id);
      }

      db.prepare('UPDATE suppliers SET total_debt = total_debt + ? WHERE id = ?').run(order.total_amount, order.supplier_id);
    });

    tx();
    return NextResponse.json({ success: true });
  }

  if (action === 'cancel') {
    if (!['draft','confirmed'].includes(order.status)) return NextResponse.json({ error: 'Không thể huỷ đơn này' }, { status: 400 });
    db.prepare("UPDATE purchase_orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(params.id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
}

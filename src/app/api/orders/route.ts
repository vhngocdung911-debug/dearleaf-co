import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateCode } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (search) { where += ' AND (so.code LIKE ? OR so.customer_name LIKE ? OR so.customer_phone LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  if (status) { where += ' AND so.status = ?'; params.push(status); }
  if (dateFrom) { where += ' AND so.order_date >= ?'; params.push(dateFrom); }
  if (dateTo) { where += ' AND so.order_date <= ?'; params.push(dateTo); }

  const orders = db.prepare(`
    SELECT so.*, c.name as customer_obj_name,
      (SELECT COUNT(*) FROM sales_order_items WHERE sales_order_id = so.id) as item_count
    FROM sales_orders so
    LEFT JOIN customers c ON so.customer_id = c.id
    ${where}
    ORDER BY so.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM sales_orders so ${where}`).get(...params) as any).cnt;
  return NextResponse.json({ orders, total, page, limit });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const db = getDb();
    const code = generateCode('DL');
    
    // Check stock availability
    for (const item of body.items) {
      const prod = db.prepare('SELECT current_stock, name FROM products WHERE id = ?').get(item.product_id) as any;
      if (!prod) return NextResponse.json({ error: `Sản phẩm không tồn tại` }, { status: 400 });
      if (prod.current_stock < item.quantity) {
        return NextResponse.json({ error: `Sản phẩm "${prod.name}" không đủ tồn kho (còn ${prod.current_stock})` }, { status: 400 });
      }
    }

    let subtotal = 0, discount_amount = 0, vat_amount = 0, cost_total = 0;
    const processedItems = body.items.map((item: any) => {
      const prod = db.prepare('SELECT sell_price, cost_price FROM products WHERE id = ?').get(item.product_id) as any;
      const unit_price = item.unit_price || prod.sell_price;
      const cost_price = prod.cost_price;
      const disc = (unit_price * item.quantity * (item.discount_rate || 0)) / 100;
      const itemSubtotal = unit_price * item.quantity - disc;
      const vat = itemSubtotal * (item.vat_rate || 0) / 100;
      subtotal += itemSubtotal;
      vat_amount += vat;
      cost_total += cost_price * item.quantity;
      return { ...item, unit_price, cost_price, subtotal: itemSubtotal, profit: itemSubtotal - cost_price * item.quantity };
    });

    discount_amount = body.discount_amount || 0;
    const shipping_fee = body.shipping_fee || 0;
    const total_amount = subtotal - discount_amount + vat_amount + shipping_fee;
    const paid_amount = body.paid_amount || 0;
    const debt_amount = total_amount - paid_amount;
    const profit = subtotal - discount_amount - cost_total;

    const orderResult = db.prepare(`
      INSERT INTO sales_orders (code, customer_id, customer_name, customer_phone, customer_address,
        status, order_date, delivery_date, subtotal, discount_amount, vat_amount, shipping_fee,
        total_amount, paid_amount, debt_amount, due_date, payment_status, cost_total, profit, notes, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      code, body.customer_id||null, body.customer_name||'Khách lẻ', body.customer_phone||null,
      body.customer_address||null, body.status||'confirmed', body.order_date||new Date().toISOString().split('T')[0],
      body.delivery_date||null, subtotal, discount_amount, vat_amount, shipping_fee,
      total_amount, paid_amount, debt_amount, body.due_date||null,
      debt_amount <= 0 ? 'paid' : paid_amount > 0 ? 'partial' : 'unpaid',
      cost_total, profit, body.notes||null, user.id
    );

    const orderId = orderResult.lastInsertRowid;

    // Insert items and update stock
    for (const item of processedItems) {
      db.prepare(`
        INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, cost_price, discount_rate, vat_rate, subtotal, profit)
        VALUES (?,?,?,?,?,?,?,?,?)
      `).run(orderId, item.product_id, item.quantity, item.unit_price, item.cost_price, item.discount_rate||0, item.vat_rate||0, item.subtotal, item.profit);

      const prod = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(item.product_id) as any;
      const newStock = prod.current_stock - item.quantity;
      db.prepare('UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, item.product_id);
      db.prepare(`
        INSERT INTO inventory_transactions (code, type, product_id, quantity, unit_price, reference_id, reference_type, before_stock, after_stock, note, created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `).run(`IT${Date.now()}-${item.product_id}`, 'sale_out', item.product_id, item.quantity, item.unit_price, orderId, 'sales_order', prod.current_stock, newStock, `Xuất bán ${code}`, user.id);
    }

    // Update customer debt
    if (body.customer_id && debt_amount > 0) {
      db.prepare('UPDATE customers SET total_debt = total_debt + ?, total_revenue = total_revenue + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(debt_amount, total_amount, body.customer_id);
    }

    // Record payment if paid
    if (paid_amount > 0) {
      db.prepare(`
        INSERT INTO payments (code, type, reference_type, reference_id, party_type, party_id, party_name, amount, method, payment_date, created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `).run(`PT${Date.now()}`, 'receipt', 'sales_order', orderId, 'customer', body.customer_id||null, body.customer_name||'Khách lẻ', paid_amount, body.payment_method||'cash', body.order_date||new Date().toISOString().split('T')[0], user.id);
    }

    return NextResponse.json({ success: true, id: orderId, code });
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

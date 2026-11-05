import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

  const db = getDb();

  const monthly = db.prepare(`
    SELECT
      strftime('%m', o.created_at) as month,
      COUNT(*) as orders,
      COALESCE(SUM(o.total_amount), 0) as revenue,
      COALESCE(SUM(o.total_amount - COALESCE(o.discount_amount,0) - COALESCE(
        (SELECT SUM(oi2.quantity * p2.cost_price) FROM order_items oi2 JOIN products p2 ON oi2.product_id = p2.id WHERE oi2.order_id = o.id), 0
      )), 0) as profit
    FROM orders o
    WHERE strftime('%Y', o.created_at) = ? AND o.status NOT IN ('cancelled')
    GROUP BY strftime('%m', o.created_at)
    ORDER BY month
  `).all(String(year));

  const topProducts = db.prepare(`
    SELECT
      p.id, p.name, p.code, p.unit,
      SUM(oi.quantity) as total_qty,
      SUM(oi.quantity * oi.unit_price) as total_revenue,
      SUM(oi.quantity * (oi.unit_price - p.cost_price)) as total_profit
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE strftime('%Y', o.created_at) = ? AND o.status NOT IN ('cancelled')
    GROUP BY p.id ORDER BY total_revenue DESC LIMIT 10
  `).all(String(year));

  const byCategory = db.prepare(`
    SELECT
      COALESCE(c.name, 'Khác') as category,
      SUM(oi.quantity * oi.unit_price) as revenue,
      SUM(oi.quantity) as total_qty
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    JOIN orders o ON oi.order_id = o.id
    WHERE strftime('%Y', o.created_at) = ? AND o.status NOT IN ('cancelled')
    GROUP BY c.id ORDER BY revenue DESC
  `).all(String(year));

  const inventoryByCategory = db.prepare(`
    SELECT
      COALESCE(c.name, 'Khác') as category,
      SUM(p.current_stock) as total_qty,
      SUM(p.current_stock * p.cost_price) as total_value
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
    GROUP BY c.id ORDER BY total_value DESC
  `).all();

  const yearTotals = db.prepare(`
    SELECT
      COUNT(*) as orders,
      COALESCE(SUM(total_amount), 0) as revenue,
      COALESCE(SUM(total_amount - COALESCE(discount_amount,0)), 0) as profit
    FROM orders WHERE strftime('%Y', created_at) = ? AND status NOT IN ('cancelled')
  `).get(String(year)) as any;

  const purchaseTotals = db.prepare(`
    SELECT COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as total
    FROM purchase_orders WHERE strftime('%Y', created_at) = ? AND status = 'received'
  `).get(String(year)) as any;

  return NextResponse.json({ monthly, topProducts, byCategory, inventoryByCategory, yearTotals, purchaseTotals });
}

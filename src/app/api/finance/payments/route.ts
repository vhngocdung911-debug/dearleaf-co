import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  let where = 'WHERE 1=1'; const params: any[] = [];
  if (type) { where += ' AND type = ?'; params.push(type); }
  if (dateFrom) { where += ' AND payment_date >= ?'; params.push(dateFrom); }
  if (dateTo) { where += ' AND payment_date <= ?'; params.push(dateTo); }
  const payments = db.prepare(`SELECT p.*, u.name as created_by_name FROM payments p LEFT JOIN users u ON p.created_by=u.id ${where} ORDER BY payment_date DESC LIMIT 100`).all(...params);
  const totals = db.prepare(`SELECT type, COALESCE(SUM(amount),0) as total FROM payments p ${where} GROUP BY type`).all(...params);
  return NextResponse.json({ payments, totals });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const db = getDb();
    const code = `PT${Date.now()}`;
    
    // Validate amount not exceeding debt
    if (body.reference_type === 'sales_order' && body.reference_id) {
      const order = db.prepare('SELECT debt_amount FROM sales_orders WHERE id=?').get(body.reference_id) as any;
      if (order && body.amount > order.debt_amount) {
        return NextResponse.json({ error: `Số tiền thu (${body.amount}) vượt quá công nợ còn lại (${order.debt_amount})` }, { status: 400 });
      }
    }
    
    const r = db.prepare(`INSERT INTO payments (code,type,reference_type,reference_id,party_type,party_id,party_name,amount,method,payment_date,bank_reference,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(code,body.type,body.reference_type,body.reference_id||null,body.party_type||null,body.party_id||null,body.party_name||null,body.amount,body.method||'cash',body.payment_date,body.bank_reference||null,body.notes||null,user.id);
    
    // Update order payment status
    if (body.reference_type === 'sales_order' && body.reference_id) {
      const order = db.prepare('SELECT total_amount, paid_amount FROM sales_orders WHERE id=?').get(body.reference_id) as any;
      if (order) {
        const newPaid = order.paid_amount + body.amount;
        const newDebt = Math.max(0, order.total_amount - newPaid);
        const payStatus = newDebt <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
        db.prepare('UPDATE sales_orders SET paid_amount=?, debt_amount=?, payment_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(newPaid, newDebt, payStatus, body.reference_id);
        if (body.party_id) db.prepare('UPDATE customers SET total_debt = MAX(0, total_debt - ?) WHERE id=?').run(body.amount, body.party_id);
      }
    }
    if (body.reference_type === 'purchase_order' && body.reference_id) {
      const order = db.prepare('SELECT total_amount, paid_amount FROM purchase_orders WHERE id=?').get(body.reference_id) as any;
      if (order) {
        const newPaid = order.paid_amount + body.amount;
        const newDebt = Math.max(0, order.total_amount - newPaid);
        const payStatus = newDebt <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
        db.prepare('UPDATE purchase_orders SET paid_amount=?, debt_amount=?, payment_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(newPaid, newDebt, payStatus, body.reference_id);
        if (body.party_id) db.prepare('UPDATE suppliers SET total_debt = MAX(0, total_debt - ?) WHERE id=?').run(body.amount, body.party_id);
      }
    }
    
    return NextResponse.json({ success: true, id: r.lastInsertRowid });
  } catch(e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

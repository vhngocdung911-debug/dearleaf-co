import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'month';
  const now = new Date();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const y = now.getFullYear();
  const lastDay = new Date(y, now.getMonth()+1, 0).getDate();
  const dateFrom = period === 'year' ? `${y}-01-01` : `${y}-${m}-01`;
  const dateTo = period === 'year' ? `${y}-12-31` : `${y}-${m}-${String(lastDay).padStart(2,'0')}`;
  const prevY = period === 'year' ? y-1 : y;
  const prevM = period === 'year' ? 1 : (now.getMonth() === 0 ? 12 : now.getMonth());
  const prevMStr = String(prevM).padStart(2,'0');
  const prevLastDay = new Date(prevY, prevM, 0).getDate();
  const prevFrom = `${prevY}-${prevMStr}-01`;
  const prevTo = `${prevY}-${prevMStr}-${String(prevLastDay).padStart(2,'0')}`;
  
  const curStats = db.prepare("SELECT COUNT(*) as order_count, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(profit),0) as profit FROM sales_orders WHERE order_date BETWEEN ? AND ? AND status != 'cancelled'").get(dateFrom, dateTo) as any;
  const prevStats = db.prepare("SELECT COUNT(*) as order_count, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(profit),0) as profit FROM sales_orders WHERE order_date BETWEEN ? AND ? AND status != 'cancelled'").get(prevFrom, prevTo) as any;
  const pct = (c: number, p: number) => p > 0 ? Math.round(((c-p)/p)*100) : 100;
  
  const lowStock = db.prepare("SELECT id,code,name,current_stock,min_stock,unit FROM products WHERE current_stock <= min_stock AND is_active=1 ORDER BY current_stock ASC LIMIT 10").all();
  const topProducts = db.prepare("SELECT p.id,p.name,SUM(soi.quantity) as total_qty,SUM(soi.subtotal) as total_revenue FROM sales_order_items soi JOIN products p ON soi.product_id=p.id JOIN sales_orders so ON soi.sales_order_id=so.id WHERE so.order_date BETWEEN ? AND ? AND so.status!='cancelled' GROUP BY p.id ORDER BY total_qty DESC LIMIT 5").all(dateFrom, dateTo);
  const receivable = db.prepare("SELECT COALESCE(SUM(debt_amount),0) as total FROM sales_orders WHERE debt_amount>0 AND status!='cancelled'").get() as any;
  const payable = db.prepare("SELECT COALESCE(SUM(debt_amount),0) as total FROM purchase_orders WHERE debt_amount>0 AND status!='cancelled'").get() as any;
  const inv = db.prepare("SELECT COALESCE(SUM(current_stock*cost_price),0) as value, COALESCE(SUM(current_stock),0) as qty FROM products WHERE is_active=1").get() as any;
  const monthly = db.prepare("SELECT strftime('%m',order_date) as month,strftime('%Y',order_date) as year,COALESCE(SUM(total_amount),0) as revenue,COALESCE(SUM(profit),0) as profit FROM sales_orders WHERE order_date>=date('now','-12 months') AND status!='cancelled' GROUP BY year,month ORDER BY year,month").all();
  const cashIn = db.prepare("SELECT COALESCE(SUM(debt_amount),0) as total FROM sales_orders WHERE due_date BETWEEN date('now') AND date('now','+30 days') AND payment_status!='paid'").get() as any;
  const cashOut = db.prepare("SELECT COALESCE(SUM(debt_amount),0) as total FROM purchase_orders WHERE due_date BETWEEN date('now') AND date('now','+30 days') AND payment_status!='paid'").get() as any;
  
  return NextResponse.json({
    stats: {
      orders: {value: curStats.order_count, pct: pct(curStats.order_count,prevStats.order_count)},
      revenue: {value: curStats.revenue, pct: pct(curStats.revenue,prevStats.revenue)},
      profit: {value: curStats.profit, pct: pct(curStats.profit,prevStats.profit)}
    },
    lowStockCount: lowStock.length, lowStockProducts: lowStock, topProducts,
    receivable: receivable.total, payable: payable.total,
    inventoryValue: inv.value, totalInventoryQty: inv.qty,
    monthlyData: monthly, cashForecast: { in: cashIn.total, out: cashOut.total },
    period: {dateFrom, dateTo}
  });
}

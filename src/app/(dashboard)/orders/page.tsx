'use client';
import { useState, useEffect, useCallback } from 'react';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
const fmtM = (n: number) => n >= 1e9 ? (n/1e9).toFixed(1)+'T' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : fmt(n);

const STATUS_MAP: Record<string, {label:string, cls:string}> = {
  draft: { label:'Nháp', cls:'badge-gray' },
  confirmed: { label:'Đã xác nhận', cls:'badge-blue' },
  packing: { label:'Đóng gói', cls:'badge-yellow' },
  shipping: { label:'Vận chuyển', cls:'badge-orange' },
  delivered: { label:'Đã giao', cls:'badge-green' },
  cancelled: { label:'Đã hủy', cls:'badge-red' },
  returned: { label:'Trả hàng', cls:'badge-gray' },
};

const PAY_MAP: Record<string, {label:string, cls:string}> = {
  paid: { label:'Đã thanh toán', cls:'badge-green' },
  partial: { label:'Thanh toán một phần', cls:'badge-yellow' },
  unpaid: { label:'Chưa thanh toán', cls:'badge-red' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_id: '', order_date: new Date().toISOString().split('T')[0],
    due_date: '', notes: '', payment_method: 'cash', paid_amount: 0, shipping_fee: 0, discount_amount: 0, status: 'confirmed',
    items: [] as {product_id:number, name:string, unit:string, quantity:number, unit_price:number, cost_price:number, discount_rate:number, vat_rate:number}[]
  });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ search, status });
    fetch(`/api/orders?${params}`).then(r => r.json())
      .then(d => { setOrders(d.orders || []); setTotal(d.total || 0); setLoading(false); });
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (showForm) {
      fetch('/api/products?limit=100').then(r=>r.json()).then(d=>setProducts(d.products||[]));
      fetch('/api/customers?limit=100').then(r=>r.json()).then(d=>setCustomers(d.customers||[]));
    }
  }, [showForm]);

  function addItem() {
    setForm(f => ({...f, items: [...f.items, {product_id:0, name:'', unit:'cây', quantity:1, unit_price:0, cost_price:0, discount_rate:0, vat_rate:0}]}));
  }

  function updateItem(i: number, field: string, val: any) {
    setForm(f => {
      const items = [...f.items];
      items[i] = {...items[i], [field]: val};
      if (field === 'product_id') {
        const prod = products.find(p => p.id === +val);
        if (prod) { items[i].name = prod.name; items[i].unit = prod.unit; items[i].unit_price = prod.sell_price; items[i].cost_price = prod.cost_price; }
      }
      return {...f, items};
    });
  }

  function removeItem(i: number) {
    setForm(f => ({...f, items: f.items.filter((_,idx) => idx !== i)}));
  }

  const subtotal = form.items.reduce((s, i) => s + i.unit_price * i.quantity * (1 - i.discount_rate/100), 0);
  const vatTotal = form.items.reduce((s, i) => s + i.unit_price * i.quantity * (1-i.discount_rate/100) * i.vat_rate/100, 0);
  const total_amount = subtotal + vatTotal + +form.shipping_fee - +form.discount_amount;

  async function handleSave() {
    if (form.items.length === 0) { setMsg('❌ Vui lòng thêm ít nhất một sản phẩm'); return; }
    setMsg('');
    const res = await fetch('/api/orders', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...form, paid_amount: +form.paid_amount}) });
    const data = await res.json();
    if (res.ok) { setMsg(`✅ Tạo đơn hàng ${data.code} thành công!`); setShowForm(false); load(); }
    else setMsg('❌ ' + data.error);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Đơn hàng</h1>
          <p className="text-sm text-gray-500">Quản lý đơn bán hàng • {total} đơn</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-leaf-600 hover:bg-leaf-700 text-white rounded-xl text-sm font-medium">
          + Tạo đơn hàng
        </button>
      </div>

      {msg && <div className={`mb-4 p-3 rounded-xl text-sm ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã đơn, khách hàng..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30"/>
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30 bg-white">
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_MAP).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mã đơn</th><th>Khách hàng</th><th>Ngày</th>
              <th className="text-right">Tổng tiền</th><th className="text-right">Còn nợ</th>
              <th>TT Đơn</th><th>TT Thanh toán</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="text-center py-8 text-gray-400">Đang tải...</td></tr>}
            {!loading && orders.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">Chưa có đơn hàng nào</td></tr>}
            {orders.map(o => {
              const st = STATUS_MAP[o.status] || {label: o.status, cls:'badge-gray'};
              const pt = PAY_MAP[o.payment_status] || {label:o.payment_status, cls:'badge-gray'};
              return (
                <tr key={o.id}>
                  <td><span className="font-mono text-xs font-semibold text-leaf-700">{o.code}</span></td>
                  <td>
                    <p className="font-medium text-sm text-gray-800">{o.customer_name}</p>
                    {o.customer_phone && <p className="text-xs text-gray-400">{o.customer_phone}</p>}
                  </td>
                  <td className="text-sm text-gray-500">{o.order_date}</td>
                  <td className="text-right font-semibold text-sm">{fmtM(o.total_amount)}đ</td>
                  <td className="text-right">
                    <span className={o.debt_amount > 0 ? 'text-red-500 font-semibold text-sm' : 'text-gray-400 text-sm'}>
                      {o.debt_amount > 0 ? fmtM(o.debt_amount)+'đ' : '—'}
                    </span>
                  </td>
                  <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                  <td><span className={`badge ${pt.cls}`}>{pt.label}</span></td>
                  <td><button className="text-xs text-leaf-600 hover:text-leaf-700 font-medium">Chi tiết</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Order Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">Tạo đơn hàng mới</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Customer info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng</label>
                  <select onChange={e => {
                    const c = customers.find(c=>c.id===+e.target.value);
                    if (c) setForm(f=>({...f, customer_id:e.target.value, customer_name:c.name, customer_phone:c.phone||''}));
                    else setForm(f=>({...f, customer_id:'', customer_name:'', customer_phone:''}));
                  }} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-leaf-500/30">
                    <option value="">-- Khách lẻ --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên khách (nếu khách lẻ)</label>
                  <input value={form.customer_name} onChange={e=>setForm(f=>({...f,customer_name:e.target.value}))} placeholder="Khách lẻ"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày đặt</label>
                  <input type="date" value={form.order_date} onChange={e=>setForm(f=>({...f,order_date:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hạn thanh toán</label>
                  <input type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30"/>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Sản phẩm *</label>
                  <button onClick={addItem} className="text-xs text-leaf-600 hover:text-leaf-700 font-medium">+ Thêm dòng</button>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Sản phẩm</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">SL</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Đơn giá</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Thành tiền</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2">
                            <select value={item.product_id} onChange={e=>updateItem(i,'product_id',+e.target.value)}
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-leaf-500/30">
                              <option value={0}>-- Chọn SP --</option>
                              {products.map(p=><option key={p.id} value={p.id}>{p.name} (tồn: {p.current_stock})</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={1} value={item.quantity} onChange={e=>updateItem(i,'quantity',+e.target.value)}
                              className="w-16 text-center text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-leaf-500/30"/>
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" value={item.unit_price} onChange={e=>updateItem(i,'unit_price',+e.target.value)}
                              className="w-28 text-right text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-leaf-500/30"/>
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-medium">
                            {new Intl.NumberFormat('vi-VN').format(item.unit_price * item.quantity)}đ
                          </td>
                          <td className="px-2 py-2">
                            <button onClick={()=>removeItem(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                          </td>
                        </tr>
                      ))}
                      {form.items.length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-4 text-center text-xs text-gray-400">Chưa có sản phẩm. Nhấn "+ Thêm dòng" để thêm</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phí ship (đ)</label>
                    <input type="number" value={form.shipping_fee} onChange={e=>setForm(f=>({...f,shipping_fee:+e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giảm giá (đ)</label>
                    <input type="number" value={form.discount_amount} onChange={e=>setForm(f=>({...f,discount_amount:+e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tiền khách trả ngay (đ)</label>
                    <input type="number" value={form.paid_amount} onChange={e=>setForm(f=>({...f,paid_amount:+e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30"/>
                  </div>
                </div>
                <div className="bg-leaf-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tiền hàng:</span><span>{fmtM(subtotal)}đ</span>
                  </div>
                  {+form.shipping_fee > 0 && <div className="flex justify-between text-sm text-gray-600">
                    <span>Phí ship:</span><span>+{fmtM(+form.shipping_fee)}đ</span>
                  </div>}
                  {+form.discount_amount > 0 && <div className="flex justify-between text-sm text-gray-600">
                    <span>Giảm giá:</span><span className="text-red-500">-{fmtM(+form.discount_amount)}đ</span>
                  </div>}
                  <div className="flex justify-between font-bold text-leaf-700 text-base pt-2 border-t border-leaf-200">
                    <span>Tổng cộng:</span><span>{fmtM(total_amount)}đ</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Đã trả:</span><span className="text-green-600 font-medium">{fmtM(+form.paid_amount)}đ</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Còn nợ:</span>
                    <span className={total_amount - +form.paid_amount > 0 ? 'text-red-500 font-semibold' : 'text-green-600 font-medium'}>
                      {fmtM(Math.max(0, total_amount - +form.paid_amount))}đ
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30 resize-none"/>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
              <button onClick={()=>setShowForm(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Hủy</button>
              <button onClick={handleSave} disabled={form.items.length===0}
                className="flex-1 px-4 py-2 bg-leaf-600 text-white rounded-xl text-sm font-medium hover:bg-leaf-700 disabled:opacity-50">
                Tạo đơn hàng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

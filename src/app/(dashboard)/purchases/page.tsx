'use client';
import { useState, useEffect, useCallback } from 'react';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
const fmtM = (n: number) => n >= 1e9 ? (n/1e9).toFixed(1)+'T' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : fmt(n);

const STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Nháp', color: 'bg-gray-100 text-gray-600' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-700' },
  received: { label: 'Đã nhận hàng', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Đã huỷ', color: 'bg-red-100 text-red-600' },
};

export default function PurchasesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', expected_date: '', notes: '', items: [{ product_id: '', quantity: '', unit_price: '' }] });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search, status: statusFilter });
    const res = await fetch(`/api/purchases?${params}`);
    const data = await res.json();
    setOrders(data.orders || []);
    setStats(data.stats);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch('/api/suppliers?limit=200').then(r => r.json()).then(d => setSuppliers(d.suppliers || []));
    fetch('/api/products?limit=200').then(r => r.json()).then(d => setProducts(d.products || []));
  }, []);

  const handleAction = async (id: number, action: string) => {
    const res = await fetch(`/api/purchases/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    if (res.ok) { load(); if (selected?.id === id) { const r = await fetch(`/api/purchases/${id}`); setSelected(await r.json()); } }
    else { const d = await res.json(); alert(d.error || 'Lỗi'); }
  };

  const handleSelect = async (id: number) => {
    const res = await fetch(`/api/purchases/${id}`);
    setSelected(await res.json());
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: '', quantity: '', unit_price: '' }] }));
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i: number, k: string, v: string) => setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [k]: v } : it) }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/purchases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { setShowCreate(false); setForm({ supplier_id: '', expected_date: '', notes: '', items: [{ product_id: '', quantity: '', unit_price: '' }] }); load(); }
    else { const d = await res.json(); alert(d.error || 'Lỗi'); }
    setSaving(false);
  };

  const totalCreate = form.items.reduce((s, it) => s + (parseFloat(it.quantity||'0') * parseFloat(it.unit_price||'0')), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🛒 Mua Hàng</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý đơn đặt hàng nhà cung cấp</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ Tạo đơn mua</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng đơn', value: fmt(stats?.total||0), icon: '📋', color: 'text-gray-700' },
          { label: 'Chờ xác nhận', value: fmt(stats?.draft||0), icon: '📝', color: 'text-gray-600' },
          { label: 'Đã xác nhận', value: fmt(stats?.confirmed||0), icon: '✅', color: 'text-blue-600' },
          { label: 'Đã nhận hàng', value: fmt(stats?.received||0), icon: '📦', color: 'text-leaf-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex gap-3 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã đơn, nhà cung cấp..." className="input-field flex-1 min-w-48" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-44">
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        {loading ? <div className="p-8 text-center text-gray-400">Đang tải...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Mã đơn','Nhà cung cấp','Trạng thái','Tổng tiền','Ngày dự kiến','Hành động'].map(h =>
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 text-xs">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Chưa có đơn mua hàng nào</td></tr>
                ) : orders.map((o: any) => {
                  const st = STATUS[o.status] || { label: o.status, color: 'bg-gray-100 text-gray-500' };
                  return (
                    <tr key={o.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleSelect(o.id)}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-leaf-700">{o.code}</td>
                      <td className="px-4 py-3"><div className="font-medium text-gray-800">{o.supplier_name}</div><div className="text-xs text-gray-400">{o.supplier_phone}</div></td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span></td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{fmtM(o.total_amount)}đ</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{o.expected_date ? new Date(o.expected_date).toLocaleDateString('vi-VN') : '-'}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {o.status === 'draft' && <button onClick={() => handleAction(o.id, 'confirm')} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">Xác nhận</button>}
                          {o.status === 'confirmed' && <button onClick={() => handleAction(o.id, 'receive')} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">Nhận hàng</button>}
                          {['draft','confirmed'].includes(o.status) && <button onClick={() => handleAction(o.id, 'cancel')} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">Huỷ</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="font-semibold text-gray-800">{selected.code}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS[selected.status]?.color}`}>{STATUS[selected.status]?.label}</span>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Nhà cung cấp:</span> <span className="font-medium">{selected.supplier_name}</span></div>
                <div><span className="text-gray-500">Điện thoại:</span> <span>{selected.supplier_phone || '-'}</span></div>
                <div><span className="text-gray-500">Ngày tạo:</span> <span>{new Date(selected.created_at).toLocaleString('vi-VN')}</span></div>
                <div><span className="text-gray-500">Ngày dự kiến:</span> <span>{selected.expected_date ? new Date(selected.expected_date).toLocaleDateString('vi-VN') : '-'}</span></div>
              </div>
              {selected.notes && <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">{selected.notes}</div>}
              <table className="w-full text-sm border border-gray-100 rounded-xl overflow-hidden">
                <thead className="bg-gray-50"><tr>{['Sản phẩm','SL','Đơn giá','Thành tiền'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-600">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(selected.items||[]).map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{it.product_name}<span className="text-xs text-gray-400 ml-1">{it.unit}</span></td>
                      <td className="px-3 py-2">{fmt(it.quantity)}</td>
                      <td className="px-3 py-2">{fmtM(it.unit_price)}đ</td>
                      <td className="px-3 py-2 font-semibold">{fmtM(it.total_price)}đ</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-leaf-50"><tr><td colSpan={3} className="px-3 py-2 font-semibold text-right text-gray-700">Tổng cộng:</td><td className="px-3 py-2 font-bold text-leaf-700">{fmtM(selected.total_amount)}đ</td></tr></tfoot>
              </table>
              {['draft','confirmed'].includes(selected.status) && (
                <div className="flex gap-3">
                  {selected.status === 'draft' && <button onClick={() => handleAction(selected.id, 'confirm')} className="btn-primary flex-1">✅ Xác nhận đơn</button>}
                  {selected.status === 'confirmed' && <button onClick={() => handleAction(selected.id, 'receive')} className="btn-primary flex-1">📦 Nhận hàng</button>}
                  <button onClick={() => handleAction(selected.id, 'cancel')} className="btn-secondary flex-1 !text-red-600">🚫 Huỷ đơn</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-800">Tạo đơn mua hàng</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp *</label>
                  <select value={form.supplier_id} onChange={e => setForm(f => ({...f, supplier_id: e.target.value}))} required className="input-field w-full">
                    <option value="">Chọn nhà cung cấp</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày dự kiến nhận</label>
                  <input type="date" value={form.expected_date} onChange={e => setForm(f => ({...f, expected_date: e.target.value}))} className="input-field w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} className="input-field w-full resize-none" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Danh sách sản phẩm *</label>
                  <button type="button" onClick={addItem} className="text-xs text-leaf-600 hover:text-leaf-800 font-medium">+ Thêm dòng</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((it, i) => (
                    <div key={i} className="grid grid-cols-[1fr_100px_120px_32px] gap-2 items-center">
                      <select value={it.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)} required className="input-field">
                        <option value="">Chọn sản phẩm</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="number" min="0.01" step="0.01" value={it.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} required placeholder="SL" className="input-field" />
                      <input type="number" min="0" value={it.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} required placeholder="Đơn giá" className="input-field" />
                      {form.items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>}
                    </div>
                  ))}
                </div>
                {totalCreate > 0 && <div className="mt-2 text-right text-sm font-semibold text-leaf-700">Tổng: {fmtM(totalCreate)}đ</div>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Huỷ</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Đang lưu...' : 'Tạo đơn hàng'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

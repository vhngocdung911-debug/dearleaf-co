'use client';
import { useState, useEffect, useCallback } from 'react';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
const STATUS_LABELS: Record<string, {label: string, cls: string}> = {
  out: { label: 'Hết hàng', cls: 'badge-red' },
  low: { label: 'Sắp hết', cls: 'badge-yellow' },
  over: { label: 'Vượt tồn', cls: 'badge-orange' },
  ok: { label: 'Đủ hàng', cls: 'badge-green' },
};

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code:'', name:'', unit:'cây', cost_price:0, sell_price:0, min_stock:5, max_stock:500, current_stock:0, vat_rate:0, notes:'' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ search, status });
    fetch(`/api/products?${params}`)
      .then(r => r.json())
      .then(d => { setProducts(d.products || []); setTotal(d.total || 0); setLoading(false); });
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setMsg('');
    const res = await fetch('/api/products', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) { setMsg('✅ Thêm sản phẩm thành công!'); setShowForm(false); setForm({ code:'', name:'', unit:'cây', cost_price:0, sell_price:0, min_stock:5, max_stock:500, current_stock:0, vat_rate:0, notes:'' }); load(); }
    else { setMsg('❌ ' + data.error); }
    setSaving(false);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Sản phẩm</h1>
          <p className="text-sm text-gray-500">Quản lý danh mục sản phẩm • {total} sản phẩm</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-leaf-600 hover:bg-leaf-700 text-white rounded-xl text-sm font-medium flex items-center gap-2">
          <span>+</span> Thêm sản phẩm
        </button>
      </div>

      {msg && <div className={`mb-4 p-3 rounded-xl text-sm ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã, tên sản phẩm..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30"/>
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30 bg-white">
          <option value="">Tất cả trạng thái</option>
          <option value="out">Hết hàng</option>
          <option value="low">Sắp hết</option>
          <option value="ok">Đủ hàng</option>
          <option value="over">Vượt tồn</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mã SP</th>
              <th>Tên sản phẩm</th>
              <th>ĐVT</th>
              <th className="text-right">Giá vốn</th>
              <th className="text-right">Giá bán</th>
              <th className="text-right">Tồn kho</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Đang tải...</td></tr>
            )}
            {!loading && products.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Chưa có sản phẩm nào</td></tr>
            )}
            {products.map(p => {
              const st = STATUS_LABELS[p.stock_status] || STATUS_LABELS.ok;
              return (
                <tr key={p.id}>
                  <td className="font-mono text-xs text-gray-500">{p.code}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-lg">🌲</div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                        {p.category_name && <p className="text-xs text-gray-400">{p.category_name}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="text-gray-500 text-sm">{p.unit}</td>
                  <td className="text-right text-sm text-gray-600">{fmt(p.cost_price)}đ</td>
                  <td className="text-right text-sm font-semibold text-leaf-700">{fmt(p.sell_price)}đ</td>
                  <td className="text-right">
                    <span className={`font-bold text-sm ${p.current_stock === 0 ? 'text-red-500' : p.current_stock <= p.min_stock ? 'text-orange-500' : 'text-gray-800'}`}>
                      {fmt(p.current_stock)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{p.unit}</span>
                  </td>
                  <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                  <td>
                    <button className="text-xs text-leaf-600 hover:text-leaf-700 font-medium">Sửa</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Thêm sản phẩm mới</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã sản phẩm *</label>
                  <input value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="TUNG-M"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị tính</label>
                  <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30 bg-white">
                    <option>cây</option><option>bộ</option><option>hộp</option><option>cái</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Sơn tùng size M (90cm)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá vốn (đ)</label>
                  <input type="number" value={form.cost_price} onChange={e => setForm({...form, cost_price: +e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá bán (đ)</label>
                  <input type="number" value={form.sell_price} onChange={e => setForm({...form, sell_price: +e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30"/>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tồn hiện tại</label>
                  <input type="number" value={form.current_stock} onChange={e => setForm({...form, current_stock: +e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tồn tối thiểu</label>
                  <input type="number" value={form.min_stock} onChange={e => setForm({...form, min_stock: +e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tồn tối đa</label>
                  <input type="number" value={form.max_stock} onChange={e => setForm({...form, max_stock: +e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30 resize-none"/>
              </div>
              {form.cost_price > 0 && form.sell_price > 0 && (
                <div className="p-3 bg-leaf-50 rounded-xl text-sm">
                  <span className="text-gray-600">Biên lợi nhuận: </span>
                  <span className="font-semibold text-leaf-700">
                    {new Intl.NumberFormat('vi-VN').format(form.sell_price - form.cost_price)}đ
                    ({((form.sell_price - form.cost_price)/form.sell_price*100).toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Hủy</button>
              <button onClick={handleSave} disabled={saving || !form.code || !form.name}
                className="flex-1 px-4 py-2 bg-leaf-600 text-white rounded-xl text-sm font-medium hover:bg-leaf-700 disabled:opacity-50">
                {saving ? 'Đang lưu...' : 'Lưu sản phẩm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

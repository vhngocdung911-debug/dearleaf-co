'use client';
import { useState, useEffect, useCallback } from 'react';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
const fmtM = (n: number) => n >= 1e9 ? (n/1e9).toFixed(1)+'T' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : fmt(n);

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  import: { label: 'Nhập kho', color: 'bg-green-100 text-green-700' },
  export: { label: 'Xuất kho', color: 'bg-red-100 text-red-700' },
  adjust: { label: 'Điều chỉnh', color: 'bg-blue-100 text-blue-700' },
  adjust_increase: { label: 'Tăng số lượng', color: 'bg-teal-100 text-teal-700' },
  adjust_decrease: { label: 'Giảm số lượng', color: 'bg-orange-100 text-orange-700' },
  damage: { label: 'Hàng hỏng', color: 'bg-gray-100 text-gray-700' },
  return: { label: 'Hàng trả', color: 'bg-purple-100 text-purple-700' },
};

export default function InventoryPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'history'|'stock'>('history');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ product_id: '', type: 'import', quantity: '', unit_cost: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search, type: typeFilter });
    const res = await fetch(`/api/inventory?${params}`);
    const data = await res.json();
    setTransactions(data.transactions || []);
    setStats(data.stats);
    setLoading(false);
  }, [search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch('/api/products?limit=200').then(r => r.json()).then(d => setProducts(d.products || []));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { setShowModal(false); setForm({ product_id: '', type: 'import', quantity: '', unit_cost: '', notes: '' }); load(); }
    else { const d = await res.json(); alert(d.error || 'Lỗi'); }
    setSaving(false);
  };

  const lowStock = products.filter(p => p.current_stock <= (p.min_stock || 5) && p.current_stock > 0);
  const outOfStock = products.filter(p => p.current_stock === 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📦 Kho Hàng</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý tồn kho và giao dịch</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Tạo giao dịch</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Giá trị tồn kho', value: fmtM(stats?.total_value||0)+'đ', icon: '💰', color: 'text-leaf-700' },
          { label: 'Tổng sản phẩm', value: fmt(stats?.total_products||0), icon: '🌲', color: 'text-blue-600' },
          { label: 'Sắp hết hàng', value: fmt(stats?.low_stock||0), icon: '⚠️', color: 'text-yellow-600' },
          { label: 'Hết hàng', value: fmt(stats?.out_of_stock||0), icon: '🚫', color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[{k:'history',l:'Lịch sử giao dịch'},{k:'stock',l:'Tồn kho hiện tại'}].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab===t.k ? 'border-leaf-600 text-leaf-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t.l}</button>
        ))}
      </div>

      {tab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex gap-3 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã, tên sản phẩm..." className="input-field flex-1 min-w-48" />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field w-44">
              <option value="">Tất cả loại</option>
              {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {loading ? <div className="p-8 text-center text-gray-400">Đang tải...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Mã GD','Sản phẩm','Loại','SL','Trước','Sau','Đơn giá','Ghi chú','Thời gian'].map(h =>
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 text-xs">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Chưa có giao dịch nào</td></tr>
                  ) : transactions.map((t: any) => {
                    const tl = TYPE_LABELS[t.type] || { label: t.type, color: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.code}</td>
                        <td className="px-4 py-3"><div className="font-medium text-gray-800">{t.product_name}</div><div className="text-xs text-gray-400">{t.product_code}</div></td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tl.color}`}>{tl.label}</span></td>
                        <td className="px-4 py-3 font-semibold">{fmt(t.quantity)} {t.unit}</td>
                        <td className="px-4 py-3 text-gray-500">{fmt(t.before_stock)}</td>
                        <td className="px-4 py-3 font-medium text-leaf-700">{fmt(t.after_stock)}</td>
                        <td className="px-4 py-3 text-gray-600">{t.unit_cost ? fmtM(t.unit_cost)+'đ' : '-'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{t.notes || '-'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{new Date(t.created_at).toLocaleString('vi-VN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'stock' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Sản phẩm','Danh mục','ĐVT','Tồn hiện tại','Tồn tối thiểu','Giá vốn','Giá trị tồn','Trạng thái'].map(h =>
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 text-xs">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Chưa có sản phẩm</td></tr>
                ) : products.map((p: any) => {
                  const isOut = p.current_stock === 0;
                  const isLow = !isOut && p.current_stock <= (p.min_stock || 5);
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 ${isOut ? 'bg-red-50/30' : isLow ? 'bg-yellow-50/30' : ''}`}>
                      <td className="px-4 py-3"><div className="font-medium text-gray-800">{p.name}</div><div className="text-xs text-gray-400">{p.code}</div></td>
                      <td className="px-4 py-3 text-gray-500">{p.category_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                      <td className="px-4 py-3 font-bold text-gray-800">{fmt(p.current_stock)}</td>
                      <td className="px-4 py-3 text-gray-500">{fmt(p.min_stock || 0)}</td>
                      <td className="px-4 py-3 text-gray-600">{fmtM(p.cost_price)}đ</td>
                      <td className="px-4 py-3 font-semibold text-leaf-700">{fmtM(p.current_stock * p.cost_price)}đ</td>
                      <td className="px-4 py-3">
                        {isOut ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Hết hàng</span>
                          : isLow ? <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">Sắp hết</span>
                          : <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Còn hàng</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Tạo giao dịch kho</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm *</label>
                <select value={form.product_id} onChange={e => setForm(f => ({...f, product_id: e.target.value}))} required className="input-field w-full">
                  <option value="">Chọn sản phẩm</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (tồn: {fmt(p.current_stock)} {p.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại giao dịch *</label>
                <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} className="input-field w-full">
                  {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng *</label>
                  <input type="number" min="0" step="0.01" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} required placeholder="0" className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn giá</label>
                  <input type="number" min="0" value={form.unit_cost} onChange={e => setForm(f => ({...f, unit_cost: e.target.value}))} placeholder="0" className="input-field w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} className="input-field w-full resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Huỷ</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Đang lưu...' : 'Tạo giao dịch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

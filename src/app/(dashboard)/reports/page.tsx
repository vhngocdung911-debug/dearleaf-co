'use client';
import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN', {maximumFractionDigits: 0}).format(n);
const fmtM = (n: number) => n >= 1e9 ? (n/1e9).toFixed(1)+'T' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : fmt(n);

const COLORS = ['#2d6e2d','#5ea65e','#8ec48e','#bbdcbb','#c8b082','#bb9b68','#d9c9a8'];
const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [tab, setTab] = useState<'overview'|'products'|'inventory'>('overview');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/summary?year=${year}`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, [year]);

  const monthlyChart = Array.from({length: 12}, (_, i) => {
    const m = data?.monthly?.find((x: any) => parseInt(x.month) === i + 1);
    return { name: MONTHS[i], revenue: m?.revenue || 0, profit: m?.profit || 0, orders: m?.orders || 0 };
  });

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-96">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-leaf-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">Đang tải báo cáo...</p>
      </div>
    </div>
  );

  const yt = data?.yearTotals || {};
  const pt = data?.purchaseTotals || {};
  const profitMargin = yt.revenue > 0 ? ((yt.profit / yt.revenue) * 100).toFixed(1) : '0';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📈 Báo Cáo</h1>
          <p className="text-sm text-gray-500 mt-0.5">Phân tích kinh doanh chi tiết</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-field w-32">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Doanh thu năm', value: fmtM(yt.revenue||0)+'đ', icon: '💰', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Lợi nhuận', value: fmtM(yt.profit||0)+'đ', icon: '📈', color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Biên lợi nhuận', value: profitMargin+'%', icon: '📊', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Tổng đơn hàng', value: fmt(yt.orders||0), icon: '📋', color: 'text-leaf-700', bg: 'bg-leaf-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-xl mb-3`}>{s.icon}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[{k:'overview',l:'📊 Tổng quan'},{k:'products',l:'🌲 Sản phẩm'},{k:'inventory',l:'📦 Tồn kho'}].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab===t.k ? 'border-leaf-600 text-leaf-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-leaf-100/50">
            <h3 className="font-semibold text-gray-800 mb-4">Doanh thu & Lợi nhuận theo tháng</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyChart} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{fontSize: 12}} stroke="#ccc" />
                <YAxis tickFormatter={v => fmtM(v)} tick={{fontSize: 11}} stroke="#ccc" />
                <Tooltip formatter={(v: any) => fmtM(v)+'đ'} labelStyle={{fontWeight:600}} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="revenue" fill="#2d6e2d" radius={[4,4,0,0]} name="Doanh thu" />
                <Bar dataKey="profit" fill="#8ec48e" radius={[4,4,0,0]} name="Lợi nhuận" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-leaf-100/50">
            <h3 className="font-semibold text-gray-800 mb-4">Số đơn hàng theo tháng</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{fontSize:12}} stroke="#ccc" />
                <YAxis tick={{fontSize:11}} stroke="#ccc" />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#c8b082" strokeWidth={2.5} dot={{r:3}} name="Đơn hàng" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {data?.byCategory?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-leaf-100/50">
                <h3 className="font-semibold text-gray-800 mb-4">Doanh thu theo danh mục</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.byCategory} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({category, percent}: any) => `${category} ${(percent*100).toFixed(0)}%`}>
                      {data.byCategory.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtM(v)+'đ'} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-leaf-100/50">
                <h3 className="font-semibold text-gray-800 mb-4">Chi tiết theo danh mục</h3>
                <div className="space-y-3">
                  {data.byCategory.map((c: any, i: number) => {
                    const total = data.byCategory.reduce((s: number, x: any) => s + x.revenue, 0);
                    const pct = total > 0 ? (c.revenue / total * 100).toFixed(0) : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{c.category || 'Khác'}</span>
                          <span className="text-gray-500">{fmtM(c.revenue)}đ ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 rounded-full" style={{width:`${pct}%`, backgroundColor: COLORS[i % COLORS.length]}} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'products' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Top sản phẩm bán chạy năm {year}</h3></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['#','Sản phẩm','ĐVT','SL bán','Doanh thu','Lợi nhuận','Biên LN'].map(h =>
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 text-xs">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.topProducts?.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Chưa có dữ liệu bán hàng</td></tr>
              ) : data?.topProducts?.map((p: any, i: number) => {
                const margin = p.total_revenue > 0 ? (p.total_profit / p.total_revenue * 100).toFixed(1) : '0';
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-leaf-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{i+1}</span>
                    </td>
                    <td className="px-4 py-3"><div className="font-medium text-gray-800">{p.name}</div><div className="text-xs text-gray-400">{p.code}</div></td>
                    <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                    <td className="px-4 py-3 font-medium">{fmt(p.total_qty)}</td>
                    <td className="px-4 py-3 font-semibold text-leaf-700">{fmtM(p.total_revenue)}đ</td>
                    <td className="px-4 py-3 text-purple-600 font-medium">{fmtM(p.total_profit)}đ</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${parseFloat(margin) >= 20 ? 'bg-green-100 text-green-700' : parseFloat(margin) >= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>{margin}%</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4">Giá trị tồn kho theo danh mục</h3>
              {data?.inventoryByCategory?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.inventoryByCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tickFormatter={v => fmtM(v)} tick={{fontSize:10}} />
                    <YAxis type="category" dataKey="category" tick={{fontSize:11}} width={80} />
                    <Tooltip formatter={(v: any) => fmtM(v)+'đ'} />
                    <Bar dataKey="total_value" fill="#2d6e2d" radius={[0,4,4,0]} name="Giá trị" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="text-center text-gray-400 py-10">Chưa có dữ liệu</div>}
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4">Thống kê nhập hàng năm {year}</h3>
              <div className="space-y-4">
                <div className="p-4 bg-leaf-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Tổng tiền nhập hàng</p>
                  <p className="text-2xl font-bold text-leaf-700">{fmtM(pt.total||0)}đ</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Số đơn nhập</p>
                  <p className="text-2xl font-bold text-blue-700">{fmt(pt.orders||0)} đơn</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Tồn kho theo danh mục</h3></div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Danh mục','Tổng SL','Giá trị tồn'].map(h =>
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 text-xs">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.inventoryByCategory?.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Chưa có dữ liệu</td></tr>
                ) : data?.inventoryByCategory?.map((c: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.category || 'Khác'}</td>
                    <td className="px-4 py-3 text-gray-600">{fmt(c.total_qty)}</td>
                    <td className="px-4 py-3 font-semibold text-leaf-700">{fmtM(c.total_value)}đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

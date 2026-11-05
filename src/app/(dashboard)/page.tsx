'use client';
import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN', {maximumFractionDigits: 0}).format(n);
const fmtM = (n: number) => n >= 1e9 ? (n/1e9).toFixed(1)+'T' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : fmt(n);

function StatCard({icon, label, value, pct, color, unit='đ'}: any) {
  const isPos = pct >= 0;
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-2xl`}>{icon}</div>
        {typeof pct !== 'undefined' && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isPos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isPos ? '↑' : '↓'} {Math.abs(pct)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-800">{unit === 'đ' ? fmtM(value) + 'đ' : fmt(value)}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/dashboard?period=${period}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [period]);

  const PERIODS = [
    { value: 'today', label: 'Hôm nay' },
    { value: 'week', label: 'Tuần này' },
    { value: 'month', label: 'Tháng này' },
    { value: 'year', label: 'Năm nay' },
  ];

  const monthNames = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-96">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-leaf-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">Đang tải dữ liệu...</p>
      </div>
    </div>
  );

  const chartData = Array.from({length: 12}, (_, i) => {
    const month = data?.monthlyData?.find((m: any) => parseInt(m.month) === i+1);
    return { name: monthNames[i], revenue: month?.revenue || 0, profit: month?.profit || 0 };
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Xin chào, Dearleaf! 👋</h1>
          <p className="text-gray-500 text-sm mt-0.5">Cùng nhau phát triển bền vững 🌱</p>
        </div>
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${period === p.value ? 'bg-leaf-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📋" label="Đơn hàng" value={data?.stats?.orders?.value || 0} pct={data?.stats?.orders?.pct} color="bg-blue-50" unit="x"/>
        <StatCard icon="💰" label="Doanh thu" value={data?.stats?.revenue?.value || 0} pct={data?.stats?.revenue?.pct} color="bg-green-50"/>
        <StatCard icon="📈" label="Lợi nhuận" value={data?.stats?.profit?.value || 0} pct={data?.stats?.profit?.pct} color="bg-purple-50"/>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-2xl">📦</div>
            {(data?.lowStockCount || 0) > 0 && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-700">Cần chú ý!</span>
            )}
          </div>
          <div className="text-2xl font-bold text-gray-800">{data?.lowStockCount || 0}</div>
          <div className="text-sm text-gray-500 mt-1">Sản phẩm sắp hết</div>
        </div>
      </div>

      {/* Charts & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-leaf-100/50">
          <h3 className="font-semibold text-gray-800 mb-4">Doanh thu & Lợi nhuận</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="name" tick={{fontSize: 12}} stroke="#ccc"/>
              <YAxis tickFormatter={fmtM} tick={{fontSize: 11}} stroke="#ccc"/>
              <Tooltip formatter={(v: any) => fmtM(v)+'đ'} labelStyle={{fontWeight: 600}}/>
              <Legend iconType="circle" iconSize={8}/>
              <Line type="monotone" dataKey="revenue" stroke="#2d6e2d" strokeWidth={2.5} dot={{r: 3}} name="Doanh thu"/>
              <Line type="monotone" dataKey="profit" stroke="#8ec48e" strokeWidth={2.5} dot={{r: 3}} name="Lợi nhuận"/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-leaf-100/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Top sản phẩm bán chạy</h3>
            <a href="/products" className="text-xs text-leaf-600 hover:text-leaf-700 font-medium">Xem thêm →</a>
          </div>
          <div className="space-y-3">
            {(data?.topProducts || []).map((p: any, i: number) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-leaf-100 text-leaf-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">🌲</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{fmt(p.total_qty)} đơn</p>
                </div>
                <span className="text-sm font-semibold text-gray-700 flex-shrink-0">{fmtM(p.total_revenue)}đ</span>
              </div>
            ))}
            {(!data?.topProducts || data.topProducts.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Inventory */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-leaf-100/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">📦 Tồn kho</h3>
            <a href="/inventory" className="text-xs text-leaf-600 hover:text-leaf-700 font-medium">Xem chi tiết →</a>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f0f0f0" strokeWidth="3"/>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2d6e2d" strokeWidth="3"
                  strokeDasharray="72 100" strokeLinecap="round"/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-800">72%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tổng thu</p>
              <p className="text-xl font-bold text-gray-800">{fmt(data?.totalInventoryQty || 0)}</p>
              <p className="text-xs text-gray-500">sản phẩm</p>
              <p className="text-sm font-medium text-leaf-600 mt-1">{fmtM(data?.inventoryValue || 0)}đ giá trị</p>
            </div>
          </div>
          {data?.lowStockProducts?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-orange-600 font-medium mb-2">⚠️ Cần nhập thêm:</p>
              {data.lowStockProducts.slice(0,3).map((p: any) => (
                <div key={p.id} className="flex justify-between text-xs py-1">
                  <span className="text-gray-600 truncate">{p.name}</span>
                  <span className={`font-medium ${p.current_stock === 0 ? 'text-red-500' : 'text-orange-500'}`}>{p.current_stock} {p.unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Receivables/Payables */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-leaf-100/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">💳 Công nợ</h3>
            <a href="/finance" className="text-xs text-leaf-600 hover:text-leaf-700 font-medium">Xem chi tiết →</a>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-500">Phải thu (KH)</span>
                <span className="text-sm font-bold text-green-600">+{fmtM(data?.receivable || 0)}đ</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full">
                <div className="h-1.5 bg-green-500 rounded-full" style={{width: '62%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-500">Phải trả (NCC)</span>
                <span className="text-sm font-bold text-red-500">-{fmtM(data?.payable || 0)}đ</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full">
                <div className="h-1.5 bg-red-400 rounded-full" style={{width: '38%'}}></div>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Net</span>
                <span className={`text-sm font-bold ${(data?.receivable||0) - (data?.payable||0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {fmtM((data?.receivable||0) - (data?.payable||0))}đ
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cash Flow */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-leaf-100/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">📊 Dòng tiền 30 ngày</h3>
            <a href="/reports" className="text-xs text-leaf-600 hover:text-leaf-700 font-medium">Xem chi tiết →</a>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Dự báo thu</p>
              <p className="text-xl font-bold text-green-700">+{fmtM(data?.cashForecast?.in || 0)}đ</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Dự báo chi</p>
              <p className="text-xl font-bold text-red-600">-{fmtM(data?.cashForecast?.out || 0)}đ</p>
            </div>
            <div className="p-3 bg-leaf-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Dự kiến còn lại</p>
              <p className="text-xl font-bold text-leaf-700">
                {fmtM((data?.cashForecast?.in||0) - (data?.cashForecast?.out||0))}đ
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@dearleaf.co');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push('/');
    } catch { setError('Lỗi kết nối. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex" style={{background: 'linear-gradient(135deg, #0d1f0d 0%, #1f461f 50%, #2d6e2d 100%)'}}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center p-12 text-white">
        <div className="text-center">
          <div className="mb-8">
            <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <span className="text-5xl">🌲</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">dearleaf</h1>
            <p className="text-leaf-300 text-lg">ERP System</p>
          </div>
          <p className="text-leaf-200 text-xl max-w-sm leading-relaxed">
            Hệ thống quản lý bán hàng thông minh cho cửa hàng cây tùng Noel của bạn
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-sm">
            {['Quản lý kho hàng', 'Hóa đơn & Báo giá', 'Công nợ & Dòng tiền', 'Báo cáo chi tiết'].map(f => (
              <div key={f} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-cream-50/95 backdrop-blur-sm">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-leaf-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🌲</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Đăng nhập</h2>
              <p className="text-gray-500 text-sm mt-1">Dearleaf ERP System</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-leaf-500 focus:border-transparent text-sm"
                  placeholder="admin@dearleaf.co" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-leaf-500 focus:border-transparent text-sm"
                  placeholder="••••••••" required
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-3 px-4 bg-leaf-600 hover:bg-leaf-700 disabled:bg-leaf-300 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>

            <div className="mt-6 p-4 bg-gray-50 rounded-xl text-xs text-gray-500 text-center">
              <p className="font-medium text-gray-600 mb-1">Tài khoản mặc định</p>
              <p>Email: admin@dearleaf.co</p>
              <p>Mật khẩu: dearleaf@2024</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

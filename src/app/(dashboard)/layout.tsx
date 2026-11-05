'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/orders', icon: '📋', label: 'Đơn hàng' },
  { href: '/products', icon: '📦', label: 'Sản phẩm' },
  { href: '/inventory', icon: '🏪', label: 'Kho hàng' },
  { href: '/purchases', icon: '🛒', label: 'Mua hàng' },
  { href: '/customers', icon: '👥', label: 'Khách hàng' },
  { href: '/suppliers', icon: '🤝', label: 'Nhà cung cấp' },
  { href: '/finance', icon: '💰', label: 'Công nợ' },
  { href: '/reports', icon: '📈', label: 'Báo cáo' },
  { href: '/settings', icon: '⚙️', label: 'Cài đặt' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me').then(r => {
      if (!r.ok) { router.push('/login'); return null; }
      return r.json();
    }).then(data => { if (data) setUser(data.user); });
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-cream-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-leaf-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Đang tải...</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-cream-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} flex-shrink-0 flex flex-col transition-all duration-300`}
        style={{background: 'linear-gradient(180deg, #1a3a1a 0%, #255825 100%)'}}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 h-16 border-b border-white/10">
          <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🌲</span>
          </div>
          {sidebarOpen && <div>
            <div className="text-white font-bold text-base leading-tight">dearleaf</div>
            <div className="text-leaf-300 text-xs">ERP</div>
          </div>}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {NAV_ITEMS.map(item => {
            const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`sidebar-nav-item ${isActive ? 'active' : 'inactive'}`}>
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-leaf-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{user.name}</p>
                <p className="text-leaf-300 text-xs truncate">{user.role}</p>
              </div>
              <button onClick={handleLogout} className="text-leaf-300 hover:text-white transition-colors text-sm" title="Đăng xuất">↪</button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full text-leaf-300 hover:text-white text-lg" title="Đăng xuất">↪</button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-border flex items-center px-6 gap-4 flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <div className="flex-1 relative max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input placeholder="Tìm kiếm đơn hàng, sản phẩm..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/30"/>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-leaf-50 rounded-xl border border-leaf-100">
              <div className="w-7 h-7 bg-leaf-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700">{user.name}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

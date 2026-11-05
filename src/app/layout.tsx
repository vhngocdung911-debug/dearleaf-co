import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dearleaf ERP',
  description: 'Hệ thống quản lý bán hàng Dearleaf - Cây tùng Noel',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}

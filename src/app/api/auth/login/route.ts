import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email và mật khẩu không được để trống' }, { status: 400 });
    }
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email) as any;
    if (!user) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
    }
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    const token = await signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    const res = NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    res.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

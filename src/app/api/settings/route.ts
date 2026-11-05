import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as any[];
  const settings: Record<string, string> = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await req.json();
    const db = getDb();
    const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP');
    db.transaction(() => {
      for (const [key, value] of Object.entries(body)) {
        upsert.run(key, String(value));
      }
    })();
    return NextResponse.json({ success: true });
  } catch(e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

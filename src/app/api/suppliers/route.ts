import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  let where = 'WHERE 1=1'; const params: any[] = [];
  if (search) { where += ' AND (name LIKE ? OR phone LIKE ? OR code LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  const suppliers = db.prepare(`SELECT * FROM suppliers ${where} ORDER BY name LIMIT 100`).all(...params);
  return NextResponse.json({ suppliers });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const db = getDb();
    const count = (db.prepare('SELECT COUNT(*) as c FROM suppliers').get() as any).c;
    const code = body.code || `NCC${String(count+1).padStart(4,'0')}`;
    const r = db.prepare(`INSERT INTO suppliers (code,name,contact_person,phone,email,address,tax_code,bank_name,bank_account,bank_branch,payment_terms,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(code,body.name,body.contact_person||null,body.phone||null,body.email||null,body.address||null,body.tax_code||null,body.bank_name||null,body.bank_account||null,body.bank_branch||null,body.payment_terms||30,body.notes||null);
    return NextResponse.json({ success: true, id: r.lastInsertRowid });
  } catch(e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

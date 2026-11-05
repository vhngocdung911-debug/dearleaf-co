import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default function RootPage() {
  const token = cookies().get('auth_token');
  if (!token) redirect('/login');
  redirect('/dashboard');
}

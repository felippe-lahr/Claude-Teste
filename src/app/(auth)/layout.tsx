import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Topbar } from '@/components/layout/topbar';
import { Nav } from '@/components/layout/nav';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <Nav />
      <main className="max-w-screen-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

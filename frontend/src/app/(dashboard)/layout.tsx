import Sidebar from '@/components/layout/Sidebar';
import DemoBanner from '@/components/dashboard/DemoBanner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-60">
        <DemoBanner />
        {children}
      </main>
    </div>
  );
}

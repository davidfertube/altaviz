import Navbar from '@/components/marketing/Navbar';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#FAFAFA]">
      <Navbar />
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}

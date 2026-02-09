import Navbar from '@/components/marketing/Navbar';
import Footer from '@/components/marketing/Footer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0A0E17] min-h-screen">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

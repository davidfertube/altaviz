import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAFAFA]">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-[#F5C518] mb-4">
          404
        </div>
        <h1 className="text-2xl font-bold text-[#0A0A0A] mb-2">Page Not Found</h1>
        <p className="text-[#6B7280] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild className="bg-[#F5C518] hover:bg-[#FFD84D] text-[#0A0A0A] rounded-full px-6">
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline" className="border-[#E5E5E5] text-[#0A0A0A] hover:bg-[#F5F5F5] rounded-full px-6">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

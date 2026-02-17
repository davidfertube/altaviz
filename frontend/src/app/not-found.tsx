import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF9F6]">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-[#C4A77D] mb-4">
          404
        </div>
        <h1 className="text-2xl font-bold text-[#1C1917] mb-2">Page Not Found</h1>
        <p className="text-[#78716C] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild className="bg-[#1C1917] hover:bg-[#2D2D2D] text-white rounded-full px-6">
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline" className="border-[#E7E0D5] text-[#1C1917] hover:bg-[#F5F0E8] rounded-full px-6">
            <Link href="/contact">Contact Sales</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

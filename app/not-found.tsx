import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#fafaf9] text-center text-stone-900">
      <h1 className="text-5xl font-semibold tracking-tight">
        404<span className="text-sky-600">.</span>
      </h1>
      <p className="text-stone-600">That campaign or page doesn&apos;t exist.</p>
      <div className="mt-2 flex gap-3 text-sm">
        <Link href="/app" className="rounded-lg bg-stone-900 px-4 py-2 font-medium text-white transition hover:bg-stone-700">
          Open the dashboard
        </Link>
        <Link href="/" className="rounded-lg border border-stone-300 px-4 py-2 font-medium text-stone-700 transition hover:border-stone-400">
          Home
        </Link>
      </div>
    </main>
  );
}

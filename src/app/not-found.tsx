import Link from "next/link";
import { Compass, Home } from "lucide-react";
import Card from "@/components/Card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <Card padding="lg" className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
          <Compass size={28} className="text-primary" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
          404
        </p>
        <h1 className="mt-1 text-[20px] font-bold text-text-primary">Page not found</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
          We couldn&rsquo;t find what you were looking for. The link may be broken
          or the page may have moved.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors no-underline"
        >
          <Home size={14} />
          Back home
        </Link>
      </Card>
    </div>
  );
}

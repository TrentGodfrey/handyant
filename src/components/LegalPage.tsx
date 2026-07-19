import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-5 py-10 sm:py-16">
      <article className="mx-auto max-w-3xl rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-[13px] font-semibold text-primary">← MCQ Property Care</Link>
        <h1 className="mt-5 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">{title}</h1>
        <p className="mt-2 text-[13px] text-text-tertiary">Last updated {updated}</p>
        <div className="mt-8 space-y-7 text-[14px] leading-7 text-text-secondary [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text-primary [&_a]:font-semibold [&_a]:text-primary [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </main>
  );
}

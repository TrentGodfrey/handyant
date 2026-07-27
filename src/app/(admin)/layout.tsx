import BottomNav from "@/components/BottomNav";
import { requirePrivilegedPage } from "@/lib/privileged-page";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePrivilegedPage();

  return (
    <>
      <main className="app-shell min-w-0 w-full flex-1 lg:ml-64 lg:w-auto lg:pb-8">
        <div className="min-w-0 w-full lg:mx-auto lg:max-w-3xl">
          {children}
        </div>
      </main>
      <BottomNav variant="admin" />
    </>
  );
}

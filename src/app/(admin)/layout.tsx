import BottomNav from "@/components/BottomNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex-1 lg:pb-8 lg:ml-64">
        <div className="lg:max-w-3xl lg:mx-auto">
          {children}
        </div>
      </main>
      <BottomNav variant="admin" />
    </>
  );
}

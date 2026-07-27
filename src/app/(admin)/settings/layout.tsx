import { requirePrivilegedPage } from "@/lib/privileged-page";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePrivilegedPage({ ownerOnly: true });
  return children;
}

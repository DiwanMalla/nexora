import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

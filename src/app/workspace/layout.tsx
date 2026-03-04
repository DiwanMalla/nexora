import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WorkspaceProvider } from "@/components/dashboard/WorkspaceProvider";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </WorkspaceProvider>
  );
}

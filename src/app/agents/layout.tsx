import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WorkspaceProvider } from "@/components/dashboard/WorkspaceProvider";

export default function AgentsLayout({
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

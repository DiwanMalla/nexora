import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WorkspaceProvider } from "@/components/dashboard/WorkspaceProvider";

export default function SlidesLayout({
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

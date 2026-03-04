import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default function DriveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

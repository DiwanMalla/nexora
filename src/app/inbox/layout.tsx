import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

import { redirect } from "next/navigation";

// Admin Dashboard has been removed. Admins land on User Management instead.
// This route is retired and redirects to /admin/users. Safe to delete this
// file/folder when convenient.
export default function RetiredAdminDashboardPage() {
  redirect("/admin/users");
}

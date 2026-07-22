import { redirect } from "next/navigation";

// System Status has been removed from the Admin area. This route is retired and
// redirects to the Admin Users page. Safe to delete this file/folder.
export default function RetiredSystemStatusPage() {
  redirect("/admin/users");
}

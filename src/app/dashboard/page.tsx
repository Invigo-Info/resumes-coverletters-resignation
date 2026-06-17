import { redirect } from "next/navigation";

// The Resumes dashboard now lives at "/" (canonical home). Keep "/dashboard" as
// a redirect so existing links/bookmarks resolve to the root URL.
export default function DashboardPage() {
  redirect("/");
}

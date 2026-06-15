import { redirect } from "next/navigation";

// Home landing page (after login): the Resumes dashboard (empty-state design).
export default function Home() {
  redirect("/dashboard");
}

import { redirect } from "next/navigation";
import { AdminLoginForm } from "./LoginForm.tsx";
import { getAdminSession } from "../session.ts";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getAdminSession()) {
    redirect("/admin");
  }

  return (
    <div className="admin-login">
      <section className="admin-login-panel" aria-labelledby="admin-login-title">
        <h1 className="admin-section-bar" id="admin-login-title">
          Authorization
          <span>Staff only</span>
        </h1>
        <AdminLoginForm />
      </section>
    </div>
  );
}

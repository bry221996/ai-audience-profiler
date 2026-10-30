import { redirect } from "next/navigation";
import { getAdminUser, createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();
  if (!admin) {
    // Signed in but not an administrator: show a clear dead end.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/admin/login");
    return (
      <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-5">
        <h1 className="text-2xl font-bold tracking-tight">Not an administrator</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {user.email} is signed in, but isn&apos;t listed in the{" "}
          <code className="rounded bg-raised px-1 py-0.5 text-ink">admin_users</code>{" "}
          table. Add this user&apos;s id there (see README) and reload.
        </p>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <AdminNav email={admin.email ?? ""} />
      <main className="flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  LogOut,
  MonitorPlay,
  QrCode,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cx } from "@/components/ui";

const LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/responses", label: "Responses", icon: ListChecks },
  { href: "/admin/qr", label: "QR code", icon: QrCode },
];

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <aside className="border-b border-line bg-sunken lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-4 py-3 lg:flex-col lg:items-stretch lg:px-4 lg:py-6">
        <div className="lg:mb-8">
          <p className="text-sm font-bold tracking-tight text-ink">AI Audience Profiler</p>
          <p className="hidden truncate text-xs text-ink-mute lg:block">{email}</p>
        </div>

        <nav className="flex items-center gap-1 lg:flex-col lg:items-stretch">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cx(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-raised text-ink"
                    : "text-ink-soft hover:bg-raised hover:text-ink",
                )}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          <Link
            href="/present"
            target="_blank"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-raised hover:text-ink"
          >
            <MonitorPlay size={16} />
            <span className="hidden sm:inline">Present</span>
          </Link>
        </nav>

        <button
          onClick={signOut}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-mute transition-colors hover:bg-raised hover:text-ink lg:mt-auto"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </aside>
  );
}

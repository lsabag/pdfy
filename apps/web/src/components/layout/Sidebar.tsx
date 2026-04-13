"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  FolderOpen,
  Star,
  Share2,
  Trash2,
  Settings,
  Shield,
  Clock,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Documents", icon: FileText },
  { href: "/dashboard/folders", label: "Folders", icon: FolderOpen },
  { href: "/dashboard/favorites", label: "Favorites", icon: Star },
  { href: "/dashboard/shared", label: "Shared", icon: Share2 },
  { href: "/dashboard/recent", label: "Recent", icon: Clock },
  { href: "/dashboard/trash", label: "Trash", icon: Trash2 },
];

const adminItems = [
  { href: "/dashboard/admin/users", label: "Users", icon: Shield },
  { href: "/dashboard/admin/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-[var(--sidebar-width)] flex flex-col flex-shrink-0 h-full"
      style={{ background: "var(--color-sidebar-bg)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[var(--topbar-height)] flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
          style={{ background: "var(--color-primary)" }}
        >
          P
        </div>
        <span className="text-white text-lg font-semibold tracking-tight">
          pdfy
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  color: isActive
                    ? "var(--color-sidebar-text-active)"
                    : "var(--color-sidebar-text)",
                  background: isActive
                    ? "var(--color-sidebar-active)"
                    : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background =
                      "var(--color-sidebar-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <Icon size={18} strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Admin section */}
        <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--color-sidebar-hover)" }}>
          <p
            className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-sidebar-text)" }}
          >
            Admin
          </p>
          <div className="flex flex-col gap-0.5">
            {adminItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    color: isActive
                      ? "var(--color-sidebar-text-active)"
                      : "var(--color-sidebar-text)",
                    background: isActive
                      ? "var(--color-sidebar-active)"
                      : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background =
                        "var(--color-sidebar-hover)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Storage usage */}
      <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--color-sidebar-hover)" }}>
        <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--color-sidebar-text)" }}>
          <span>Storage</span>
          <span>0 / 5 GB</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: "var(--color-sidebar-hover)" }}>
          <div
            className="h-full rounded-full"
            style={{ background: "var(--color-primary)", width: "0%" }}
          />
        </div>
      </div>
    </aside>
  );
}

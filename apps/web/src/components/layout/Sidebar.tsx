"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText, FolderOpen, Star, Share2, Trash2, Settings, Shield, Clock,
  Edit3, ArrowLeftRight, PenTool, Wrench,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: FileText },
  { href: "/dashboard/edit", label: "Edit", icon: Edit3 },
  { href: "/dashboard/convert", label: "Convert", icon: ArrowLeftRight },
  { href: "/dashboard/esign", label: "E-Sign", icon: PenTool },
  { href: "/dashboard/tools", label: "All tools", icon: Wrench },
];

const docItems = [
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
        <NavGroup items={navItems} pathname={pathname} />

        <NavSection title="Documents" items={docItems} pathname={pathname} />
        <NavSection title="Admin" items={adminItems} pathname={pathname} />
      </nav>

      {/* Storage usage */}
      <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--color-sidebar-hover)" }}>
        <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--color-sidebar-text)" }}>
          <span>Storage</span>
          <span>0 / 50 GB</span>
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

function NavItem({ href, icon: Icon, label, pathname }: { href: string; icon: any; label: string; pathname: string }) {
  const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  return (
    <Link href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
      style={{
        color: isActive ? "var(--color-sidebar-text-active)" : "var(--color-sidebar-text)",
        background: isActive ? "var(--color-sidebar-active)" : "transparent",
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--color-sidebar-hover)"; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
      <Icon size={17} strokeWidth={1.8} />
      {label}
    </Link>
  );
}

function NavGroup({ items, pathname }: { items: typeof navItems; pathname: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => <NavItem key={item.href} {...item} pathname={pathname} />)}
    </div>
  );
}

function NavSection({ title, items, pathname }: { title: string; items: typeof navItems; pathname: string }) {
  return (
    <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--color-sidebar-hover)" }}>
      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--color-sidebar-text)", opacity: 0.6 }}>{title}</p>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => <NavItem key={item.href} {...item} pathname={pathname} />)}
      </div>
    </div>
  );
}

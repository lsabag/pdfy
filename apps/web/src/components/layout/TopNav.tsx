"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import {
  Search, Bell, Upload, LogOut, User, ChevronDown, Menu, X,
} from "lucide-react";

const navLinks = [
  { href: "/dashboard", label: "Home" },
  { href: "/documents", label: "Documents" },
  { href: "/dashboard/edit", label: "Edit", hasDropdown: true },
  { href: "/dashboard/convert", label: "Convert", hasDropdown: true },
  { href: "/dashboard/esign", label: "E-sign", hasDropdown: true },
  { href: "/dashboard/tools", label: "All tools" },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showUser, setShowUser] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = () => { logout(); router.push("/login"); };

  return (
    <>
      <header className="h-14 flex items-center px-4 md:px-6 flex-shrink-0 sticky top-0 z-30"
        style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 mr-6 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
            style={{ background: "var(--color-primary)" }}>P</div>
          <span className="text-base font-semibold tracking-tight hidden sm:block"
            style={{ color: "var(--color-text-primary)" }}>pdfy</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden lg:flex items-center gap-1 flex-1">
          {navLinks.map((link) => {
            const isActive = link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
                style={{
                  color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                  background: isActive ? "var(--color-primary-light)" : "transparent",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--color-surface-secondary)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                {link.label}
                {link.hasDropdown && <ChevronDown size={12} />}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Admin link - only for OWNER/ADMIN */}
          {(user?.role === "OWNER" || user?.role === "ADMIN") && (
            <Link href="/dashboard/admin/settings"
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                color: pathname.startsWith("/dashboard/admin") ? "var(--color-primary)" : "var(--color-text-secondary)",
                background: pathname.startsWith("/dashboard/admin") ? "var(--color-primary-light)" : "transparent",
              }}>
              Admin
            </Link>
          )}

          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" size={14}
              style={{ color: "var(--color-text-tertiary)" }} />
            <input id="topbar-search" name="search" type="text"
              className="input h-8 text-sm w-48 lg:w-64"
              style={{ background: "var(--color-surface-secondary)", border: "1px solid transparent", paddingLeft: "32px", fontSize: "13px" }}
              placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search documents" />
          </div>

          {/* Upload */}
          <button className="btn btn-primary h-8 text-xs px-3"
            onClick={() => document.dispatchEvent(new CustomEvent("pdfy:open-upload"))}>
            <Upload size={14} /> <span className="hidden sm:inline">Upload</span>
          </button>

          {/* Bell */}
          <button className="btn-icon" style={{ width: 32, height: 32 }} title="Notifications">
            <Bell size={15} />
          </button>

          {/* User avatar */}
          <div className="relative">
            <button onClick={() => setShowUser(!showUser)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold cursor-pointer"
              style={{ background: "var(--color-primary)" }}>
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </button>
            {showUser && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUser(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 py-1 rounded-xl z-50"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-lg)" }}>
                  <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                    <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{user?.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>{user?.email}</p>
                  </div>
                  <DropItem icon={User} label="Profile" onClick={() => { setShowUser(false); router.push("/dashboard/profile"); }} />
                  <DropItem icon={LogOut} label="Sign out" onClick={() => { setShowUser(false); handleLogout(); }} danger />
                </div>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="btn-icon mobile-only-btn" style={{ width: 32, height: 32 }}
            onClick={() => setShowMobile(!showMobile)}>
            {showMobile ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* Mobile nav dropdown */}
      {showMobile && (
        <div className="lg:hidden" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
          <nav className="flex flex-col p-2">
            {navLinks.map((link) => {
              const isActive = link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href} onClick={() => setShowMobile(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium"
                  style={{ color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)", background: isActive ? "var(--color-primary-light)" : "transparent" }}>
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}

function DropItem({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
      style={{ color: danger ? "var(--color-error)" : "var(--color-text-secondary)" }}
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-secondary)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      <Icon size={15} /> {label}
    </button>
  );
}

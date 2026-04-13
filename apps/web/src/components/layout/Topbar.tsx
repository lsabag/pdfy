"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Search, Bell, Upload, LogOut, User, ChevronDown } from "lucide-react";

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header
      className="h-[var(--topbar-height)] flex items-center justify-between px-6 flex-shrink-0"
      style={{
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {/* Search */}
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            size={15}
            style={{ color: "var(--color-text-tertiary)" }}
          />
          <input
            type="text"
            className="input h-9 text-sm"
            style={{
              background: "var(--color-surface-secondary)",
              border: "1px solid transparent",
              paddingLeft: "36px",
            }}
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          className="btn btn-primary h-9 text-sm"
          onClick={() => {
            // Will trigger upload modal
            document.dispatchEvent(new CustomEvent("pdfy:open-upload"));
          }}
        >
          <Upload size={16} />
          Upload
        </button>

        <button className="btn btn-ghost w-9 h-9 p-0 relative">
          <Bell size={18} />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            className="flex items-center gap-2 btn btn-ghost h-9 pl-2 pr-2"
            onClick={() => setShowMenu(!showMenu)}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{ background: "var(--color-primary)" }}
            >
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <ChevronDown size={14} />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div
                className="absolute right-0 top-full mt-1 w-56 py-1 rounded-lg z-50"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid var(--color-border-light)" }}
                >
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {user?.name}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {user?.email}
                  </p>
                </div>
                <button
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: "var(--color-text-secondary)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "var(--color-surface-secondary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <User size={16} />
                  Profile
                </button>
                <button
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: "var(--color-error)" }}
                  onClick={handleLogout}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "var(--color-surface-secondary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

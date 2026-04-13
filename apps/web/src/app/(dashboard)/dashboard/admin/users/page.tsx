"use client";

import { useEffect, useState } from "react";
import { Shield, UserPlus, ToggleLeft, ToggleRight } from "lucide-react";
import { api } from "@/lib/api-client";

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  documentCount: number;
  storageUsedBytes: number;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLES = ["OWNER", "ADMIN", "EDITOR", "VIEWER"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId: string, role: string) => {
    await api.patch(`/admin/users/${userId}/role`, { role });
    fetchUsers();
  };

  const handleToggleActive = async (userId: string) => {
    await api.patch(`/admin/users/${userId}/toggle-active`);
    fetchUsers();
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/admin/invites", { email: inviteEmail, role: inviteRole });
    setInviteEmail("");
    setShowInvite(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>User Management</h1>
        <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
          <UserPlus size={16} /> Invite User
        </button>
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="flex gap-2 mb-6 p-4 rounded-xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <input className="input flex-1" type="email" placeholder="Email address" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
          <select className="input w-32" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
            {ROLES.filter((r) => r !== "OWNER").map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">Send Invite</button>
          <button type="button" className="btn btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                {["User", "Role", "Documents", "Storage", "Status", "Last Login"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{user.name}</p>
                    <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="text-xs px-2 py-1 rounded-md" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={user.role === "OWNER"}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>{user.documentCount}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>{formatBytes(user.storageUsedBytes)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(user.id)} disabled={user.role === "OWNER"}>
                      {user.isActive
                        ? <ToggleRight size={24} style={{ color: "var(--color-success)" }} />
                        : <ToggleLeft size={24} style={{ color: "var(--color-text-tertiary)" }} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

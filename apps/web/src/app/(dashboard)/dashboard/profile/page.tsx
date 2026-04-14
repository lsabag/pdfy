"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Mail, Shield, HardDrive, Trash2, Save, Check } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // Delete account
  const [deletePw, setDeletePw] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        setProfile(data);
        setName(data.name);
        setEmail(data.email);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true); setSaveMsg("");
    try {
      const { data } = await api.patch("/auth/profile", { name, email });
      setProfile(data);
      setSaveMsg("Saved!");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (err: any) {
      setSaveMsg(err.response?.data?.error || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    setPwMsg("");
    if (newPw !== confirmPw) { setPwMsg("Passwords don't match"); return; }
    if (newPw.length < 8) { setPwMsg("Minimum 8 characters"); return; }
    setPwSaving(true);
    try {
      await api.post("/auth/change-password", { currentPassword: currentPw, newPassword: newPw });
      setPwMsg("Password changed!");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwMsg(""), 3000);
    } catch (err: any) {
      setPwMsg(err.response?.data?.error || "Failed");
    } finally { setPwSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure? This will deactivate your account.")) return;
    try {
      await api.delete("/auth/account", { data: { password: deletePw } });
      logout();
      router.push("/login");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed");
    }
  };

  const formatBytes = (b: number) => {
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
    if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + " MB";
    return (b / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const storagePercent = profile.storageQuotaBytes > 0
    ? Math.round((profile.storageUsedBytes / profile.storageQuotaBytes) * 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-text-primary)" }}>Profile</h1>

      {/* Avatar + Role */}
      <div className="rounded-xl p-6 mb-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ background: "var(--color-primary)" }}>
            {profile.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>{profile.name}</h2>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{profile.email}</p>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 font-medium"
              style={{ background: "var(--color-badge-blue)", color: "var(--color-primary)" }}>
              <Shield size={10} /> {profile.role}
            </span>
          </div>
        </div>

        {/* Storage */}
        <div className="p-3 rounded-lg" style={{ background: "var(--color-surface-secondary)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              <HardDrive size={14} /> Storage
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {formatBytes(profile.storageUsedBytes)} / {formatBytes(profile.storageQuotaBytes)}
            </span>
          </div>
          <div className="h-2 rounded-full" style={{ background: "var(--color-border-light)" }}>
            <div className="h-full rounded-full transition-all" style={{
              background: storagePercent > 90 ? "var(--color-error)" : "var(--color-primary)",
              width: `${Math.min(100, storagePercent)}%`,
            }} />
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
            {storagePercent}% used &middot; Member since {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Edit Profile */}
      <div className="rounded-xl p-6 mb-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
          <User size={18} /> Edit Profile
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>Name</label>
            <input id="profile-name" name="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="profile-email" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>Email</label>
            <input id="profile-email" name="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={14} /> Save Changes</>}
            </button>
            {saveMsg && (
              <span className="text-sm flex items-center gap-1" style={{ color: saveMsg === "Saved!" ? "var(--color-success)" : "var(--color-error)" }}>
                {saveMsg === "Saved!" && <Check size={14} />} {saveMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-xl p-6 mb-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
          <Lock size={18} /> Change Password
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="profile-current-password" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>Current Password</label>
            <input id="profile-current-password" name="currentPassword" className="input" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Enter current password" />
          </div>
          <div>
            <label htmlFor="profile-new-password" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>New Password</label>
            <input id="profile-new-password" name="newPassword" className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min 8 characters" />
          </div>
          <div>
            <label htmlFor="profile-confirm-password" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>Confirm New Password</label>
            <input id="profile-confirm-password" name="confirmPassword" className="input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Repeat new password" />
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" onClick={handleChangePassword} disabled={pwSaving || !currentPw || !newPw}>
              {pwSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Change Password"}
            </button>
            {pwMsg && (
              <span className="text-sm" style={{ color: pwMsg.includes("changed") ? "var(--color-success)" : "var(--color-error)" }}>
                {pwMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl p-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-error)" }}>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--color-error)" }}>
          <Trash2 size={18} /> Danger Zone
        </h3>
        <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
          Deactivate your account. This will prevent login but your data will be preserved.
        </p>
        {!showDelete ? (
          <button className="btn btn-danger"
            onClick={() => setShowDelete(true)}>
            Deactivate Account
          </button>
        ) : (
          <div className="flex gap-2">
            <input id="profile-delete-password" name="deletePassword" className="input flex-1" type="password" placeholder="Enter your password to confirm"
              value={deletePw} onChange={(e) => setDeletePw(e.target.value)} aria-label="Password to confirm account deactivation" />
            <button className="btn btn-danger"
              onClick={handleDeleteAccount} disabled={!deletePw}>
              Confirm
            </button>
            <button className="btn btn-secondary" onClick={() => setShowDelete(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

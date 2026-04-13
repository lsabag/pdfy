"use client";

import { useState, useEffect } from "react";
import { Megaphone, Save, Trash2, Check } from "lucide-react";
import { api } from "@/lib/api-client";

export default function AdminSettingsPage() {
  // Banner state
  const [bannerMsg, setBannerMsg] = useState("");
  const [bannerType, setBannerType] = useState("info");
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerStatus, setBannerStatus] = useState("");
  const [currentBanner, setCurrentBanner] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/admin/banner");
        if (data?.message) {
          setCurrentBanner(data);
          setBannerMsg(data.message);
          setBannerType(data.type || "info");
        }
      } catch {}
    })();
  }, []);

  const handleSaveBanner = async () => {
    setBannerSaving(true);
    try {
      await api.post("/admin/banner", { message: bannerMsg, type: bannerType });
      setCurrentBanner(bannerMsg ? { message: bannerMsg, type: bannerType } : null);
      setBannerStatus("Saved!");
      setTimeout(() => setBannerStatus(""), 2000);
    } catch { setBannerStatus("Failed"); }
    finally { setBannerSaving(false); }
  };

  const handleDeleteBanner = async () => {
    await api.delete("/admin/banner");
    setCurrentBanner(null);
    setBannerMsg("");
    setBannerStatus("Deleted");
    setTimeout(() => setBannerStatus(""), 2000);
  };

  const typeColors: Record<string, string> = {
    info: "#E8F0FE", success: "#E3F8EE", warning: "#FFF8E1", error: "#FFEBE7",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-text-primary)" }}>Settings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Banner management */}
        <div className="rounded-xl p-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
            <Megaphone size={18} /> Dashboard Banner
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-text-tertiary)" }}>
            Show a message to all users at the top of the Home page
          </p>

          {/* Current banner preview */}
          {currentBanner && (
            <div className="rounded-lg p-3 mb-4 flex items-center justify-between"
              style={{ background: typeColors[currentBanner.type] || typeColors.info, border: "1px solid var(--color-border-light)" }}>
              <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                <strong>Active:</strong> {currentBanner.message}
              </p>
              <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={handleDeleteBanner} title="Remove banner">
                <Trash2 size={12} style={{ color: "var(--color-error)" }} />
              </button>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label htmlFor="banner-message" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>Message</label>
              <input id="banner-message" name="bannerMessage" className="input" placeholder="Enter announcement message..."
                value={bannerMsg} onChange={(e) => setBannerMsg(e.target.value)} />
            </div>
            <div>
              <label htmlFor="banner-type" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>Type</label>
              <div className="flex gap-2">
                {(["info", "success", "warning", "error"] as const).map((t) => (
                  <button key={t} onClick={() => setBannerType(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                    style={{
                      background: typeColors[t],
                      border: bannerType === t ? "2px solid var(--color-primary)" : "2px solid transparent",
                      color: "var(--color-text-primary)",
                    }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn btn-primary text-sm" onClick={handleSaveBanner} disabled={bannerSaving}>
                {bannerSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={14} /> Publish Banner</>}
              </button>
              {bannerStatus && (
                <span className="text-sm flex items-center gap-1" style={{ color: bannerStatus === "Saved!" ? "var(--color-success)" : bannerStatus === "Deleted" ? "var(--color-text-tertiary)" : "var(--color-error)" }}>
                  {bannerStatus === "Saved!" && <Check size={14} />} {bannerStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* General settings */}
        <div className="rounded-xl p-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>General</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="settings-instance-name" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>Instance Name</label>
              <input id="settings-instance-name" name="instanceName" className="input" defaultValue="pdfy" />
            </div>
            <div>
              <label htmlFor="settings-storage-quota" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>Default Storage Quota per User</label>
              <input id="settings-storage-quota" name="storageQuota" className="input" defaultValue="50 GB" />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="rounded-xl p-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>Security</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Require strong passwords</p>
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Minimum 8 chars, mixed case, numbers</p>
              </div>
              <input id="settings-strong-passwords" name="requireStrongPasswords" type="checkbox" defaultChecked className="w-5 h-5 rounded" aria-label="Require strong passwords" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Allow public share links</p>
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Users can create links for external access</p>
              </div>
              <input id="settings-public-share-links" name="allowPublicShareLinks" type="checkbox" defaultChecked className="w-5 h-5 rounded" aria-label="Allow public share links" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

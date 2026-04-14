"use client";

import { useState, useEffect } from "react";
import { Megaphone, Save, Trash2, Check, Settings, Shield } from "lucide-react";
import { api } from "@/lib/api-client";

export default function AdminSettingsPage() {
  // Banner
  const [bannerMsg, setBannerMsg] = useState("");
  const [bannerType, setBannerType] = useState("info");
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerStatus, setBannerStatus] = useState("");
  const [currentBanner, setCurrentBanner] = useState<any>(null);

  // Settings
  const [instanceName, setInstanceName] = useState("pdfy");
  const [storageQuota, setStorageQuota] = useState("50");
  const [requireStrongPw, setRequireStrongPw] = useState(true);
  const [allowPublicShare, setAllowPublicShare] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data: banner } = await api.get("/admin/banner");
        if (banner?.message) { setCurrentBanner(banner); setBannerMsg(banner.message); setBannerType(banner.type || "info"); }
      } catch {}
      try {
        const { data: settings } = await api.get("/admin/settings");
        if (settings.instanceName) setInstanceName(settings.instanceName);
        if (settings.storageQuotaGB) setStorageQuota(settings.storageQuotaGB);
        if (settings.requireStrongPasswords !== undefined) setRequireStrongPw(settings.requireStrongPasswords === "true");
        if (settings.allowPublicShareLinks !== undefined) setAllowPublicShare(settings.allowPublicShareLinks === "true");
      } catch {}
    })();
  }, []);

  const handleSaveBanner = async () => {
    setBannerSaving(true);
    try {
      await api.post("/admin/banner", { message: bannerMsg, type: bannerType });
      setCurrentBanner(bannerMsg ? { message: bannerMsg, type: bannerType } : null);
      setBannerStatus("Saved!"); setTimeout(() => setBannerStatus(""), 2000);
    } catch { setBannerStatus("Failed"); }
    finally { setBannerSaving(false); }
  };

  const handleDeleteBanner = async () => {
    await api.delete("/admin/banner");
    setCurrentBanner(null); setBannerMsg("");
    setBannerStatus("Deleted"); setTimeout(() => setBannerStatus(""), 2000);
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      await api.post("/admin/settings", {
        instanceName,
        storageQuotaGB: storageQuota,
        requireStrongPasswords: String(requireStrongPw),
        allowPublicShareLinks: String(allowPublicShare),
      });
      setSettingsStatus("Saved!"); setTimeout(() => setSettingsStatus(""), 2000);
    } catch { setSettingsStatus("Failed"); }
    finally { setSettingsSaving(false); }
  };

  const typeColors: Record<string, string> = { info: "#E8F0FE", success: "#E3F8EE", warning: "#FFF8E1", error: "#FFEBE7" };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-text-primary)" }}>Settings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Banner */}
        <div className="rounded-xl p-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
            <Megaphone size={18} /> Dashboard Banner
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-text-tertiary)" }}>Show a message to all users on the Home page</p>
          {currentBanner && (
            <div className="rounded-lg p-3 mb-4 flex items-center justify-between"
              style={{ background: typeColors[currentBanner.type] || typeColors.info }}>
              <p className="text-sm" style={{ color: "var(--color-text-primary)" }}><strong>Active:</strong> {currentBanner.message}</p>
              <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={handleDeleteBanner}>
                <Trash2 size={12} style={{ color: "var(--color-error)" }} />
              </button>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label htmlFor="banner-message" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>Message</label>
              <input id="banner-message" name="bannerMessage" className="input" placeholder="Enter announcement..."
                value={bannerMsg} onChange={(e) => setBannerMsg(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>Type</label>
              <div className="flex gap-2">
                {(["info", "success", "warning", "error"] as const).map((t) => (
                  <button key={t} onClick={() => setBannerType(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
                    style={{ background: typeColors[t], border: bannerType === t ? "2px solid var(--color-primary)" : "2px solid transparent" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn btn-primary text-sm" onClick={handleSaveBanner} disabled={bannerSaving}>
                {bannerSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={14} /> Publish</>}
              </button>
              {bannerStatus && <span className="text-sm" style={{ color: bannerStatus === "Saved!" ? "var(--color-success)" : "var(--color-text-tertiary)" }}>{bannerStatus}</span>}
            </div>
          </div>
        </div>

        {/* General + Security */}
        <div className="space-y-6">
          <div className="rounded-xl p-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
              <Settings size={18} /> General
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="settings-instance-name" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>Instance Name</label>
                <input id="settings-instance-name" name="instanceName" className="input"
                  value={instanceName} onChange={(e) => setInstanceName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="settings-storage-quota" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>Default Storage Quota (GB)</label>
                <input id="settings-storage-quota" name="storageQuota" className="input" type="number"
                  value={storageQuota} onChange={(e) => setStorageQuota(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-xl p-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
              <Shield size={18} /> Security
            </h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Require strong passwords</p>
                  <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Min 8 chars, mixed case, numbers</p>
                </div>
                <input id="settings-strong-pw" name="requireStrongPasswords" type="checkbox" className="w-5 h-5 rounded"
                  checked={requireStrongPw} onChange={(e) => setRequireStrongPw(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Allow public share links</p>
                  <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Users can create links for external access</p>
                </div>
                <input id="settings-public-share" name="allowPublicShareLinks" type="checkbox" className="w-5 h-5 rounded"
                  checked={allowPublicShare} onChange={(e) => setAllowPublicShare(e.target.checked)} />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn btn-primary" onClick={handleSaveSettings} disabled={settingsSaving}>
              {settingsSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={14} /> Save Settings</>}
            </button>
            {settingsStatus && <span className="text-sm flex items-center gap-1" style={{ color: settingsStatus === "Saved!" ? "var(--color-success)" : "var(--color-error)" }}>
              {settingsStatus === "Saved!" && <Check size={14} />} {settingsStatus}
            </span>}
          </div>
        </div>
      </div>
    </div>
  );
}

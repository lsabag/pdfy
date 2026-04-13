"use client";

import { Settings } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-text-primary)" }}>Settings</h1>
      <div className="max-w-2xl space-y-6">
        <div className="rounded-xl p-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>General</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="settings-instance-name" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>Instance Name</label>
              <input id="settings-instance-name" name="instanceName" className="input" defaultValue="pdfy" />
            </div>
            <div>
              <label htmlFor="settings-storage-quota" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>Default Storage Quota per User</label>
              <input id="settings-storage-quota" name="storageQuota" className="input" defaultValue="5 GB" />
            </div>
          </div>
        </div>

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

        <button className="btn btn-primary">Save Settings</button>
      </div>
    </div>
  );
}

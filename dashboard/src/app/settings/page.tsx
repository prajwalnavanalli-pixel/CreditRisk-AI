"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Bell,
  CheckCircle2,
  Database,
  KeyRound,
  Moon,
  Save,
  Settings as SettingsIcon,
  Shield,
  Sun,
  User,
} from "lucide-react";

import { useApp } from "@/components/providers/app-provider";
import { api, type SystemSettingsResponse } from "@/lib/api";

export default function SettingsPage() {
  const { user, theme, setTheme, refreshUser, notify } = useApp();

  const [fullNameDraft, setFullNameDraft] = useState<string | null>(null);
  const [organizationDraft, setOrganizationDraft] = useState<string | null>(null);
  const [notificationsDraft, setNotificationsDraft] = useState<boolean | null>(
    null
  );
  const [thresholdDraft, setThresholdDraft] = useState<number | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const fullName = fullNameDraft ?? user?.full_name ?? "";
  const organization = organizationDraft ?? user?.organization ?? "";
  const notificationsEnabled =
    notificationsDraft ?? user?.notifications_enabled ?? true;
  const alertThreshold =
    thresholdDraft ?? user?.high_risk_alert_threshold ?? 50;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [systemInfo, setSystemInfo] = useState<SystemSettingsResponse | null>(
    null
  );
  const [lowThreshold, setLowThreshold] = useState(0.2);
  const [mediumThreshold, setMediumThreshold] = useState(0.5);
  const [savingSystem, setSavingSystem] = useState(false);

  useEffect(() => {
    api
      .getSystemSettings()
      .then((res) => {
        setSystemInfo(res);
        setLowThreshold(res.risk_thresholds.low_risk_max_threshold);
        setMediumThreshold(res.risk_thresholds.medium_risk_max_threshold);
      })
      .catch(() => {
        // Ignore if unreachable
      });
  }, []);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.updateProfile({
        full_name: fullName,
        organization,
        theme_preference: theme,
        notifications_enabled: notificationsEnabled,
        high_risk_alert_threshold: alertThreshold,
      });
      await refreshUser();
      notify({
        type: "success",
        title: "Profile Saved",
        message: "Your preferences have been persisted to MongoDB.",
      });
    } catch (err) {
      notify({
        type: "error",
        title: "Update Failed",
        message: err instanceof Error ? err.message : "Unable to update profile",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      notify({
        type: "success",
        title: "Password Updated",
        message: "Your account password has been changed securely.",
      });
    } catch (err) {
      notify({
        type: "error",
        title: "Password Update Failed",
        message: err instanceof Error ? err.message : "Check current password",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveSystemThresholds = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSystem(true);
    try {
      const res = await api.updateSystemSettings({
        low_risk_max_threshold: lowThreshold,
        medium_risk_max_threshold: mediumThreshold,
        high_risk_alert_enabled: true,
      });
      setSystemInfo((prev) =>
        prev ? { ...prev, risk_thresholds: res.risk_thresholds } : prev
      );
      notify({
        type: "success",
        title: "System Thresholds Updated",
        message: "Global risk configuration saved.",
      });
    } catch (err) {
      notify({
        type: "error",
        title: "Admin Update Failed",
        message: err instanceof Error ? err.message : "Admin privileges needed",
      });
    } finally {
      setSavingSystem(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
          <SettingsIcon size={14} />
          Workspace &amp; Governance
        </div>
        <h1 className="mt-1 text-2xl font-bold text-white">
          Settings &amp; User Experience
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Manage appearance themes, analyst profile, alert thresholds,
          password security, and database index health.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appearance & Theme */}
        <section className="glass-panel rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-white">
            Theme &amp; Appearance
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Choose between institutional dark mode and high-contrast light mode.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                theme === "dark"
                  ? "border-indigo-500 bg-indigo-500/15 text-white"
                  : "border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/5"
              }`}
            >
              <Moon size={18} className="text-indigo-400" />
              <div>
                <p className="text-xs font-semibold">Midnight Dark</p>
                <p className="text-[11px] opacity-75">Default analyst theme</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                theme === "light"
                  ? "border-indigo-500 bg-indigo-500/15 text-white"
                  : "border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/5"
              }`}
            >
              <Sun size={18} className="text-amber-400" />
              <div>
                <p className="text-xs font-semibold">Institutional Light</p>
                <p className="text-[11px] opacity-75">Daylight workspace</p>
              </div>
            </button>
          </div>
        </section>

        {/* Profile & Notification Preferences */}
        <section className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <User size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">
              Analyst Profile &amp; Alerts
            </h2>
          </div>

          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullNameDraft(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Organization
                </label>
                <input
                  type="text"
                  required
                  value={organization}
                  onChange={(e) => setOrganizationDraft(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Bell size={15} className="text-indigo-400" />
                <div>
                  <p className="text-xs font-medium text-white">
                    High-Risk Alert Notifications
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Trigger toast warnings when risk &ge; {alertThreshold}%
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsDraft(e.target.checked)}
                className="h-4 w-4 accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>Alert Threshold</span>
                <span className="font-mono font-semibold text-indigo-400">
                  {alertThreshold}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={95}
                value={alertThreshold}
                onChange={(e) => setThresholdDraft(Number(e.target.value))}
                className="mt-2 w-full accent-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="preserve-white inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-white"
            >
              <Save size={14} />
              {savingProfile ? "Saving..." : "Save Profile Settings"}
            </button>
          </form>
        </section>

        {/* Password Security */}
        <section className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">
              Account Security
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Signed in as <strong className="text-white">{user?.email}</strong>{" "}
            (Role: <span className="uppercase text-indigo-400">{user?.role}</span>)
          </p>

          <form onSubmit={handleChangePassword} className="mt-4 space-y-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Current Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                New Password (min 6 chars)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>

        {/* System Status & MongoDB Indexes */}
        <section className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">
              Database Indexes &amp; Risk Governance
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="text-slate-500">MongoDB Status</p>
              <p className="mt-1 flex items-center gap-1.5 font-semibold text-emerald-400">
                <CheckCircle2 size={13} />
                {systemInfo?.system.database_status || "checking..."}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="text-slate-500">API Auth Protection</p>
              <p className="mt-1 flex items-center gap-1.5 font-semibold text-indigo-400">
                <Shield size={13} />
                {systemInfo?.system.auth_enabled ? "JWT Enabled" : "Disabled"}
              </p>
            </div>
          </div>

          {systemInfo?.system.indexes && (
            <div className="mt-4 space-y-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5 text-[11px]">
              <p className="font-semibold text-slate-300">
                Verified Collection Indexes
              </p>
              {Object.entries(systemInfo.system.indexes).map(([col, idxs]) => (
                <div
                  key={col}
                  className="flex flex-wrap items-center justify-between gap-2 text-slate-400"
                >
                  <span className="font-mono text-slate-200">{col}</span>
                  <span>{idxs.length} indexes active</span>
                </div>
              ))}
            </div>
          )}

          {user?.role === "admin" && (
            <form
              onSubmit={handleSaveSystemThresholds}
              className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4"
            >
              <div>
                <label className="mb-1 block text-[11px] text-slate-400">
                  Low-Risk Max
                </label>
                <input
                  type="number"
                  step="0.05"
                  min={0.05}
                  max={0.45}
                  value={lowThreshold}
                  onChange={(e) => setLowThreshold(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-slate-400">
                  Medium-Risk Max
                </label>
                <input
                  type="number"
                  step="0.05"
                  min={0.25}
                  max={0.85}
                  value={mediumThreshold}
                  onChange={(e) => setMediumThreshold(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                disabled={savingSystem}
                className="col-span-2 rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/25"
              >
                {savingSystem ? "Saving..." : "Update Admin Risk Thresholds"}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

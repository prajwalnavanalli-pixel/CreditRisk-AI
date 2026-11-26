"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  Command,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react";

import { useApp } from "@/components/providers/app-provider";
import { api, type AnalyticsSummaryResponse } from "@/lib/api";

interface HeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

export default function Header({
  onMenuClick,
  sidebarCollapsed,
}: HeaderProps) {
  const router = useRouter();
  const { user, theme, toggleTheme, logout } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAlerts, setShowAlerts] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [alerts, setAlerts] = useState<
    AnalyticsSummaryResponse["high_risk_alerts"]
  >([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .getAnalyticsSummary()
      .then((res) => {
        if (active) setAlerts(res.high_risk_alerts || []);
      })
      .catch(() => {
        // Silent fallback in header
      });
    return () => {
      active = false;
    };
  }, [user]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    router.push(
      trimmed
        ? `/applicants?search=${encodeURIComponent(trimmed)}`
        : "/applicants"
    );
  };

  const initials = (user?.full_name || "CR")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed left-0 right-0 top-0 z-30 flex h-[76px] items-center justify-between border-b border-white/[0.07] bg-[#0b1019]/95 px-5 backdrop-blur-xl transition-all duration-300 lg:px-8 ${
        sidebarCollapsed ? "lg:left-[84px]" : "lg:left-[260px]"
      }`}
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={19} />
        </button>

        <div>
          <h2 className="text-sm font-semibold text-white sm:text-base">
            Credit Risk Intelligence
          </h2>
          <p className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">
            AI-powered financial risk management
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSearch}
        className="hidden w-full max-w-[300px] items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 md:flex"
      >
        <Search size={16} className="text-slate-500" />
        <input
          ref={searchInputRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search applicant ID..."
          className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
        />
        <div className="flex items-center gap-1 rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-slate-500">
          <Command size={10} /> K
        </div>
      </form>

      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-xl border border-white/[0.08] p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Toggle color theme"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowAlerts((prev) => !prev);
              setShowProfileMenu(false);
            }}
            className="relative rounded-xl border border-white/[0.08] p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label="High-risk alerts"
          >
            <Bell size={17} />
            {alerts.length > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#0b1019]" />
            )}
          </button>

          {showAlerts && (
            <div className="glass-panel absolute right-0 mt-2 w-80 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <p className="text-xs font-semibold text-white">
                  High-Risk Watchlist ({alerts.length})
                </p>
                <Link
                  href="/predictions/history"
                  onClick={() => setShowAlerts(false)}
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="mt-2.5 max-h-60 space-y-2 overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500">
                    No high-risk alerts recorded yet.
                  </p>
                ) : (
                  alerts.map((item) => (
                    <div
                      key={item.prediction_id}
                      className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          size={14}
                          className="shrink-0 text-rose-400"
                        />
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {item.applicant_id}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            High Default Risk
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-rose-400">
                        {item.risk_percentage.toFixed(1)}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative border-l border-white/10 pl-3 sm:pl-4">
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu((prev) => !prev);
              setShowAlerts(false);
            }}
            className="flex items-center gap-2.5 rounded-xl py-1 transition hover:opacity-90"
          >
            <div className="preserve-white flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold text-slate-200">
                {user?.full_name || "Risk Analyst"}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                {user?.role || "Analyst"}
              </p>
            </div>
            <ChevronDown size={14} className="hidden text-slate-500 sm:block" />
          </button>

          {showProfileMenu && (
            <div className="glass-panel absolute right-0 mt-2 w-56 rounded-2xl p-2 shadow-2xl">
              <div className="border-b border-white/10 px-3 py-2">
                <p className="truncate text-xs font-semibold text-white">
                  {user?.full_name}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {user?.email}
                </p>
              </div>
              <Link
                href="/settings"
                onClick={() => setShowProfileMenu(false)}
                className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <Settings size={14} />
                Profile &amp; Settings
              </Link>
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                className="mt-0.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-rose-400 transition hover:bg-rose-500/10"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}

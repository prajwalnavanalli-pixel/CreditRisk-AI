"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  BrainCircuit,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  History,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import { useApp } from "@/components/providers/app-provider";

export const navigationItems = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Applicants", href: "/applicants", icon: Users },
  { label: "New Prediction", href: "/predictions", icon: BrainCircuit },
  { label: "Prediction History", href: "/predictions/history", icon: History },
  { label: "Risk Analytics", href: "/analytics", icon: ChartNoAxesCombined },
  { label: "Model Insights", href: "/models", icon: ShieldCheck },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { health } = useApp();

  const isHealthy =
    health?.api_status === "running" && health?.database_status === "connected";

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 84 : 260 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/[0.07] bg-[#0b1019] lg:flex"
    >
      {/* Brand header */}
      <div className="flex h-[76px] items-center justify-between border-b border-white/[0.07] px-5">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="preserve-white flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-xs font-bold text-white">
            CR
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-white">
                CreditRisk <span className="text-indigo-400">AI</span>
              </h2>
              <p className="truncate text-[10px] tracking-widest text-slate-500">
                INTELLIGENCE PLATFORM
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/predictions"
                ? pathname === "/predictions"
                : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-indigo-500/15 font-medium text-indigo-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Live system pill + collapse toggle */}
      <div className="space-y-2.5 border-t border-white/[0.07] p-3">
        {!collapsed && (
          <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[11px]">
            <span className="text-slate-400">API &amp; MongoDB</span>
            <span className="flex items-center gap-1.5 font-medium text-slate-200">
              <span
                className={`h-2 w-2 rounded-full ${
                  isHealthy ? "status-pulse bg-emerald-400" : "bg-amber-400"
                }`}
              />
              {isHealthy ? "Live" : "Degraded"}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}

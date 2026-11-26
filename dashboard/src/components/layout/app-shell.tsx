"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

import AuthGate from "@/components/auth/auth-gate";
import { AppProvider } from "@/components/providers/app-provider";
import Sidebar, { navigationItems } from "./sidebar";
import Header from "./header";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <AppProvider>
      <AuthGate>
        <div className="min-h-screen bg-[#080b12]">
          {/* Desktop sidebar */}
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

          {/* Top navigation */}
          <Header
            onMenuClick={() => setMobileOpen(true)}
            sidebarCollapsed={collapsed}
          />

          {/* Mobile navigation drawer */}
          <AnimatePresence>
            {mobileOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileOpen(false)}
                  className="fixed inset-0 z-50 bg-black/70 lg:hidden"
                />

                <motion.aside
                  initial={{ x: -300 }}
                  animate={{ x: 0 }}
                  exit={{ x: -300 }}
                  transition={{ duration: 0.25 }}
                  className="fixed inset-y-0 left-0 z-[60] w-[280px] border-r border-white/10 bg-[#0b1019] p-5 lg:hidden"
                >
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-white">
                        CreditRisk <span className="text-indigo-400">AI</span>
                      </h2>
                      <p className="text-[10px] tracking-widest text-slate-500">
                        INTELLIGENCE PLATFORM
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-white/5"
                      aria-label="Close navigation"
                    >
                      <X size={19} />
                    </button>
                  </div>

                  <nav className="space-y-2">
                    {navigationItems.map((item) => {
                      const Icon = item.icon;
                      const active =
                        item.href === "/"
                          ? pathname === "/"
                          : item.href === "/predictions"
                            ? pathname === "/predictions"
                            : pathname === item.href ||
                              pathname.startsWith(item.href + "/");

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                            active
                              ? "bg-indigo-500/15 text-indigo-400"
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <Icon size={18} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* Main application content */}
          <main
            className={`min-h-screen px-4 pb-8 pt-[100px] transition-[margin] duration-300 sm:px-6 lg:px-8 ${
              collapsed ? "lg:ml-[84px]" : "lg:ml-[260px]"
            }`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>

            <footer className="mt-12 flex flex-col justify-between gap-2 border-t border-white/[0.07] py-5 text-[11px] text-slate-500 sm:flex-row">
              <span>
                © 2026 CreditRisk AI. Intelligent Risk Management.
              </span>
              <span>
                Random Forest (0.7755 ROC-AUC) · SHAP Explainability · FastAPI
              </span>
            </footer>
          </main>
        </div>
      </AuthGate>
    </AppProvider>
  );
}

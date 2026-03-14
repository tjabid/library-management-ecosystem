"use client";

import { useState } from "react";
import { BookOpen, LogOut, Menu, X } from "lucide-react";
import { signOut } from "@/lib/firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";

export function TopNav() {
  const { user, role } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Staff";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      {/* Top bar */}
      <header className="h-14 bg-white/80 backdrop-blur-sm border-b border-slate-200/70 flex items-center px-4 gap-3 flex-shrink-0 z-20 sticky top-0">
        {/* Mobile menu button */}
        <button
          className="md:hidden text-slate-500 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo (mobile only) */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="p-1 bg-gradient-to-br from-emerald-700 to-red-700 rounded-md">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-sm">Library Management Ecosystem</span>
        </div>

        <div className="flex-1" />

        {/* User section */}
        <div className="flex items-center gap-2.5">
          {/* Name + role */}
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800 leading-none">{displayName}</p>
            <p className="text-[11px] text-emerald-600 capitalize mt-0.5 leading-none font-medium">{role ?? ""}</p>
          </div>

          {/* Avatar */}
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-700 to-red-700 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-xs font-bold text-white leading-none">{initials}</span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-slate-200 hidden sm:block" />

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-gradient-to-br from-emerald-700 to-red-700 rounded-md">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-slate-900 text-sm">Library Management Ecosystem</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar onNav={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

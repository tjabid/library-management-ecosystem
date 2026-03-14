"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  PlusCircle,
  Undo2,
  BarChart2,
  Settings,
  ClipboardList,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard",   icon: LayoutDashboard },
  { href: "/books",     label: "Books",        icon: BookOpen },
  { href: "/members",   label: "Members",      icon: Users },
  { href: "/issue",     label: "Issue Book",   icon: PlusCircle },
  { href: "/return",    label: "Return Book",  icon: Undo2 },
  { href: "/reports",   label: "Reports",      icon: BarChart2 },
  { href: "/settings",  label: "Settings",     icon: Settings, adminOnly: true },
  { href: "/audit",     label: "Audit Log",    icon: ClipboardList, adminOnly: true },
];

interface SidebarProps {
  onNav?: () => void;
}

export function Sidebar({ onNav }: SidebarProps) {
  const pathname = usePathname();
  const { role } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin");

  return (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 hidden md:block">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-linear-to-br from-emerald-700 to-red-700 rounded-lg shadow-sm">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm leading-none">Library Management Ecosystem</span>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Management System</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden md:block mx-4 h-px bg-slate-100 mb-3" />

      {/* Nav label */}
      <p className="hidden md:block px-4 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Navigation
      </p>

      <ul className="flex-1 space-y-0.5 px-3 overflow-y-auto">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNav}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-linear-to-br from-emerald-700 to-emerald-800 text-white shadow-sm shadow-emerald-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "h-4.5 w-4.5 shrink-0",
                    active ? "text-white/90" : "text-slate-400"
                  )}
                  style={{ width: "1.125rem", height: "1.125rem" }}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Bottom divider + version tag */}
      <div className="hidden md:block px-4 pb-4 pt-3 border-t border-slate-100 mt-2">
        <p className="text-[10px] text-slate-300 text-center">Library Management Ecosystem</p>
      </div>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Timer,
  Heart,
  Target,
  ClipboardCheck,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItemConfig {
  href: string;
  icon: LucideIcon;
  label: string;
}

const navItems: NavItemConfig[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/study', icon: Timer, label: 'Study Sessions' },
  { href: '/dashboard/habits', icon: Heart, label: 'Habits' },
  { href: '/dashboard/goals', icon: Target, label: 'Goals' },
  { href: '/dashboard/tasks', icon: ClipboardCheck, label: 'Tasks' },
  { href: '/dashboard/insights', icon: BarChart3, label: 'Insights' },
];

export function Sidebar({ userName, userEmail }: { userName: string; userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-surface-200 bg-white/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-surface-100 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="font-heading text-xl font-bold bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
          StudyFlow
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={isActive}
            />
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-surface-100 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-secondary-500 text-sm font-semibold text-white shadow-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-surface-900">{userName}</p>
            <p className="truncate text-xs text-surface-400">{userEmail}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link href={href} className="relative block">
      <motion.div
        className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'text-brand-700'
            : 'text-surface-500 hover:text-surface-900'
        }`}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {isActive && (
          <motion.div
            layoutId="activeNav"
            className="absolute inset-0 rounded-xl bg-brand-50 border border-brand-100"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <Icon className={`relative z-10 h-[18px] w-[18px] ${isActive ? 'text-brand-600' : ''}`} />
        <span className="relative z-10">{label}</span>
        {isActive && (
          <motion.div
            className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-500"
            layoutId="activeIndicator"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
      </motion.div>
    </Link>
  );
}

'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/context/user-context';
// No external icon library imports needed, we use custom lightweight SVG icons

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, allUsers, setCurrentUserById } = useUser();

  const navItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-indigo-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      )
    },
    {
      name: 'Submit an Idea',
      href: '/ideas/submit',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-indigo-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentUserById(e.target.value);
    router.refresh();
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'manager':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between h-screen fixed top-0 left-0 z-20">
      {/* Upper Section */}
      <div className="flex flex-col">
        {/* Brand Logo & Name */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-2.5">
          <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-semibold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-200">
            Innovation Hub
          </span>
        </div>

        {/* Navigation items */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                  active
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/10'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                }`}
              >
                {item.icon(active)}
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Role Switcher & User Profile Info */}
      <div className="p-4 border-t border-slate-800 space-y-4">
        {currentUser && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center font-semibold text-white shadow-inner uppercase">
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">{currentUser.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold border ${getRoleBadgeColor(currentUser.role)}`}>
                    {currentUser.role.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">{currentUser.department}</span>
                </div>
              </div>
            </div>

            {/* Simulated Live Role Switcher Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block px-1">
                Simulated Persona (Test Role-Based UI)
              </label>
              <select
                value={currentUser.id}
                onChange={handleRoleChange}
                className="w-full text-xs bg-slate-900 text-slate-300 border border-slate-800 rounded-xl px-2.5 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer font-medium"
              >
                {allUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

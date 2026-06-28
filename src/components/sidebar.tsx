'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/context/user-context';
import { useTheme } from '@/context/theme-context';
// No external icon library imports needed, we use custom lightweight SVG icons

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, allUsers, setCurrentUserById } = useUser();
  const { theme, toggleTheme } = useTheme();

  const sections = [
    {
      title: 'Innovation Hub',
      items: [
        {
          name: 'Overview',
          href: '/overview',
          icon: (active: boolean) => (
            <svg className={`w-5 h-5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          )
        },
        {
          name: 'Dashboard',
          href: '/',
          icon: (active: boolean) => (
            <svg className={`w-5 h-5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
          )
        },
        {
          name: 'Submit an Idea',
          href: '/ideas/submit',
          icon: (active: boolean) => (
            <svg className={`w-5 h-5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        },
        {
          name: 'Report',
          href: '/report',
          icon: (active: boolean) => (
            <svg className={`w-5 h-5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
          )
        }
      ]
    },
    {
      title: 'Productions Hub',
      items: [
        {
          name: 'Active Apps',
          href: '/implemented',
          icon: (active: boolean) => (
            <svg className={`w-5 h-5 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          )
        },
        {
          name: 'Register Built App',
          href: '/implemented/register',
          icon: (active: boolean) => (
            <svg className={`w-5 h-5 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
      ]
    },
    {
      title: 'Future Development',
      items: [
        {
          name: 'Integrate Deriv Brain',
          href: '/future/deriv-brain',
          icon: (active: boolean) => (
            <svg className={`w-5 h-5 ${active ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          )
        }
      ]
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
    <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-screen fixed top-0 left-0 z-20 transition-colors duration-200">
      {/* Upper Section */}
      <div className="flex flex-col">
        {/* Brand Logo & Name */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800 gap-2.5 transition-colors duration-200">
          <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-semibold text-lg bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-800 dark:from-white dark:via-slate-100 dark:to-slate-200">
            Innovation Hub
          </span>
        </div>

        {/* Navigation items */}
        <nav className="p-4 space-y-5 max-h-[calc(100vh-14rem)] overflow-y-auto scrollbar-thin">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 flex items-center justify-between">
                <span>{section.title}</span>
                {section.title === 'Productions Hub' && (
                  <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[8px] rounded-full font-bold border border-emerald-500/20">
                    LIVE
                  </span>
                )}
                {section.title === 'Future Development' && (
                  <span className="bg-violet-500/10 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 text-[8px] rounded-full font-bold border border-violet-500/20">
                    SOON
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  const isImplementedItem = section.title === 'Productions Hub';
                  const isFutureItem = section.title === 'Future Development';
                  return (
                    <button
                      key={item.name}
                      onClick={() => router.push(item.href)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                        active
                          ? isImplementedItem
                            ? 'bg-emerald-600/10 dark:bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10'
                            : isFutureItem
                              ? 'bg-violet-600/10 dark:bg-violet-600/15 text-violet-600 dark:text-violet-400 border border-violet-500/10'
                              : 'bg-indigo-600/10 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      {item.icon(active)}
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Theme Toggle Button */}
        <div className="px-4 pb-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          >
            {theme === 'dark' ? (
              <>
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Role Switcher & User Profile Info */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4 transition-colors duration-200">
        {currentUser && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 transition-colors duration-200">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center font-semibold text-white shadow-inner uppercase">
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{currentUser.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold border ${getRoleBadgeColor(currentUser.role)}`}>
                    {currentUser.role.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{currentUser.department}</span>
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
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer font-medium"
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

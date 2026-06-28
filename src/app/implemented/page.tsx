'use client';

import React, { useState, useEffect } from 'react';
import { LayoutWrapper } from '@/components/layout-wrapper';
import { Idea } from '@/types';
import { useRouter } from 'next/navigation';

export default function ActiveAppsPage() {
  const router = useRouter();
  const [implementedApps, setImplementedApps] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMadeBy, setSelectedMadeBy] = useState<'All' | 'Deriv' | 'Third Party'>('All');
  const [sortBy, setSortBy] = useState<'implemented_newest' | 'implemented_oldest' | 'title_asc' | 'score_desc'>('implemented_newest');

  const fetchImplementedApps = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ideas');
      if (res.ok) {
        const data: Idea[] = await res.json();
        // Filter specifically for implemented status
        const liveApps = data.filter((idea) => idea.status === 'implemented');

        // Merge local storage items if any have been manually built or registered
        if (typeof window !== 'undefined') {
          try {
            const localIdeas = JSON.parse(localStorage.getItem('local_submitted_ideas') || '[]');
            const serverIds = new Set(liveApps.map((item) => item.id));
            for (const local of localIdeas) {
              if (local.status === 'implemented' && !serverIds.has(local.id)) {
                liveApps.unshift(local);
              }
            }
          } catch (e) {
            console.error('Error merging local implemented apps:', e);
          }
        }

        setImplementedApps(liveApps);
      }
    } catch (err) {
      console.error('Error fetching implemented apps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImplementedApps();
  }, []);

  function formatDept(dept: string) {
    if (!dept) return '';
    return dept.charAt(0).toUpperCase() + dept.slice(1);
  }

  // Extract unique departments and categories
  const departments = ['All', ...Array.from(new Set(implementedApps.map((i) => formatDept(i.department))))];
  const categories = ['All', ...Array.from(new Set(implementedApps.map((i) => i.category)))];

  // Counts for Made By filter
  const derivCount = implementedApps.filter((a) => !a.madeBy || a.madeBy === 'Deriv').length;
  const thirdPartyCount = implementedApps.filter((a) => a.madeBy === 'Third Party').length;

  // Filtering
  const filteredApps = implementedApps.filter((app) => {
    const matchesSearch =
      app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.systemOwner || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.backupSystemOwner || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.slackChannel || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept =
      selectedDept === 'All' || formatDept(app.department).toLowerCase() === selectedDept.toLowerCase();

    const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;

    const matchesMadeBy =
      selectedMadeBy === 'All' ||
      (selectedMadeBy === 'Deriv' && (!app.madeBy || app.madeBy === 'Deriv')) ||
      (selectedMadeBy === 'Third Party' && app.madeBy === 'Third Party');

    return matchesSearch && matchesDept && matchesCategory && matchesMadeBy;
  });

  // Sorting
  const sortedApps = [...filteredApps].sort((a, b) => {
    if (sortBy === 'implemented_newest') {
      const dateA = a.implementedAt ? new Date(a.implementedAt).getTime() : 0;
      const dateB = b.implementedAt ? new Date(b.implementedAt).getTime() : 0;
      return dateB - dateA;
    }
    if (sortBy === 'implemented_oldest') {
      const dateA = a.implementedAt ? new Date(a.implementedAt).getTime() : 0;
      const dateB = b.implementedAt ? new Date(b.implementedAt).getTime() : 0;
      return dateA - dateB;
    }
    if (sortBy === 'title_asc') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'score_desc') {
      return b.innovationScore - a.innovationScore;
    }
    return 0;
  });

  return (
    <LayoutWrapper>
      <div className="space-y-8 animate-fade-in">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Productions Hub</h1>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-xs rounded-full font-bold border border-emerald-500/20 shadow-sm uppercase">
                Active Production Systems
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-1.5 text-sm">
              Explore the official catalog of successfully completed projects and live applications, along with active system ownership and support channels.
            </p>
          </div>
          <button
            onClick={() => router.push('/implemented/register')}
            className="self-start md:self-auto bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 transition-all duration-200 flex items-center gap-2 group border border-emerald-400/20"
          >
            <svg
              className="w-4.5 h-4.5 text-white group-hover:scale-110 transition-all duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Register Built App
          </button>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Catalog Registry</span>
              <span className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                {sortedApps.length} App{sortedApps.length === 1 ? '' : 's'} Live
              </span>
            </div>

            {/* Sorting & Search */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">Sort by</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'implemented_newest' | 'implemented_oldest' | 'title_asc' | 'score_desc')}
                  className="w-full sm:w-auto text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 transition-all font-medium"
                >
                  <option value="implemented_newest">Newly Implemented</option>
                  <option value="implemented_oldest">Oldest Implemented</option>
                  <option value="title_asc">Title (A-Z)</option>
                  <option value="score_desc">Innovation Score</option>
                </select>
              </div>

              <div className="relative w-full lg:max-w-xs">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search live apps, owners, channels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-0.5">Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 transition-all font-medium"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-0.5">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 transition-all font-medium"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Made By */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-0.5">Made By</label>
              <select
                value={selectedMadeBy}
                onChange={(e) => setSelectedMadeBy(e.target.value as 'All' | 'Deriv' | 'Third Party')}
                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 transition-all font-medium"
              >
                <option value="All">All ({implementedApps.length})</option>
                <option value="Deriv">Deriv ({derivCount})</option>
                <option value="Third Party">Third Party ({thirdPartyCount})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Directory Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl h-64 animate-pulse space-y-4 shadow-sm" />
            ))}
          </div>
        ) : sortedApps.length === 0 ? (
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 text-center space-y-4 shadow-sm">
            <div className="p-4 bg-emerald-500/10 w-16 h-16 rounded-2xl flex items-center justify-center border border-emerald-500/20 text-emerald-500 mx-auto">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Active Production Apps Found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {"Register an existing app manually, or graduate approved ideas inside the Innovation Hub to 'Implemented' status to see them listed in this active apps directory."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sortedApps.map((app) => (
              <div
                key={app.id}
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-300 pointer-events-none" />

                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold border rounded-md px-2 py-0.5 bg-emerald-500/15 text-emerald-500 border-emerald-500/20 uppercase tracking-wide">
                        LIVE
                      </span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md font-semibold">
                        {app.category}
                      </span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md font-semibold">
                        {formatDept(app.department)}
                      </span>
                      {/* Made By Badge */}
                      {(!app.madeBy || app.madeBy === 'Deriv') ? (
                        <span className="text-[10px] font-bold border rounded-md px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          Deriv
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold border rounded-md px-2 py-0.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          3rd Party
                        </span>
                      )}
                    </div>

                    {app.innovationScore > 0 && (
                      <div className="flex items-center gap-1 text-[11px] font-bold border rounded-md px-2 py-0.5 text-indigo-400 border-indigo-500/30 bg-indigo-500/10">
                        <span>Score:</span>
                        <span className="text-xs font-extrabold">{app.innovationScore}</span>
                      </div>
                    )}
                  </div>

                  {/* Title & Desc */}
                  <h3
                    onClick={() => router.push(`/ideas/${app.id}`)}
                    className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 hover:underline transition-all cursor-pointer truncate"
                  >
                    {app.title}
                  </h3>
                  {app.appDescription && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1 line-clamp-2">
                      {app.appDescription}
                    </p>
                  )}
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                    {app.description}
                  </p>

                  {/* Implementation Meta Grid */}
                  <div className="mt-5 grid grid-cols-2 gap-4 bg-slate-50/60 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-900/60">
                    {/* System Owner */}
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                        System Owner
                      </span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          {app.systemOwner ? app.systemOwner.charAt(0).toUpperCase() : 'O'}
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate" title={app.systemOwner}>
                          {app.systemOwner || 'Not Assigned'}
                        </span>
                      </div>
                    </div>

                    {/* Backup Owner */}
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                        Backup Owner
                      </span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] font-extrabold text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                          {app.backupSystemOwner ? app.backupSystemOwner.charAt(0).toUpperCase() : 'B'}
                        </div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate" title={app.backupSystemOwner}>
                          {app.backupSystemOwner || 'None'}
                        </span>
                      </div>
                    </div>

                    {/* Slack Channel */}
                    <div className="space-y-0.5 col-span-2 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                        Support Slack Channel
                      </span>
                      <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-1.5 px-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/80">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-emerald-500 font-bold text-xs">#</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                            {app.slackChannel ? app.slackChannel.replace(/^#/, '') : 'general'}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(app.slackChannel || '');
                          }}
                          className="text-[9px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 hover:dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded transition-all shrink-0"
                          title="Copy Channel Name"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom line with Date and Graduation Badge */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-4 mt-5">
                  <div className="flex items-center gap-1.5">
                    {app.id.startsWith('manual_') ? (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-bold">
                        Manual Entry
                      </span>
                    ) : (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md font-bold">
                        Graduated Idea
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] font-semibold">
                      Live since {app.implementedAt ? new Date(app.implementedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'recently'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </LayoutWrapper>
  );
}

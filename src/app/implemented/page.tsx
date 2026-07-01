'use client';

import React, { useState, useEffect } from 'react';
import { LayoutWrapper } from '@/components/layout-wrapper';
import { Idea } from '@/types';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/user-context';
import { implementedAppSchema } from '@/utils/schemas';

export default function ActiveAppsPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [implementedApps, setImplementedApps] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit App States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);

  // Edit Form States
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDepartment, setEditDepartment] = useState('engineering');
  const [editCategory, setEditCategory] = useState('Process Optimization');
  const [editSystemOwner, setEditSystemOwner] = useState('');
  const [editBackupSystemOwner, setEditBackupSystemOwner] = useState('');
  const [editSlackChannel, setEditSlackChannel] = useState('');
  const [editMadeBy, setEditMadeBy] = useState<'Deriv' | 'Third Party'>('Deriv');
  const [editImplementedAt, setEditImplementedAt] = useState('');

  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSuccessMsg, setEditSuccessMsg] = useState('');

  const handleOpenEditModal = (app: Idea) => {
    setEditingAppId(app.id);
    setEditTitle(app.title);
    setEditDescription(app.appDescription || app.description);
    setEditDepartment(app.department ? app.department.toLowerCase() : 'engineering');
    setEditCategory(app.category || 'Process Optimization');
    setEditSystemOwner(app.systemOwner || '');
    setEditBackupSystemOwner(app.backupSystemOwner || '');
    setEditSlackChannel(app.slackChannel || '');
    setEditMadeBy(app.madeBy || 'Deriv');
    setEditImplementedAt(app.implementedAt || new Date().toISOString().substring(0, 10));
    setEditErrors({});
    setEditSuccessMsg('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrors({});
    setEditSuccessMsg('');

    if (!editingAppId) return;

    // Client-side Zod validation
    const result = implementedAppSchema.safeParse({
      title: editTitle,
      description: editDescription,
      department: editDepartment,
      category: editCategory,
      systemOwner: editSystemOwner,
      backupSystemOwner: editBackupSystemOwner || undefined,
      slackChannel: editSlackChannel,
      implementedAt: editImplementedAt,
      madeBy: editMadeBy,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      const formatted = result.error.format();
      if (formatted.title) errors.title = formatted.title._errors[0];
      if (formatted.description) errors.description = formatted.description._errors[0];
      if (formatted.department) errors.department = formatted.department._errors[0];
      if (formatted.category) errors.category = formatted.category._errors[0];
      if (formatted.systemOwner) errors.systemOwner = formatted.systemOwner._errors[0];
      if (formatted.backupSystemOwner) errors.backupSystemOwner = formatted.backupSystemOwner._errors[0];
      if (formatted.slackChannel) errors.slackChannel = formatted.slackChannel._errors[0];
      if (formatted.implementedAt) errors.implementedAt = formatted.implementedAt._errors[0];
      setEditErrors(errors);
      return;
    }

    try {
      setIsSubmittingEdit(true);

      const res = await fetch('/api/implemented', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({
          id: editingAppId,
          ...result.data,
          appDescription: editDescription,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setEditErrors({ submit: errorData.error || 'Failed to update the implemented app' });
        setIsSubmittingEdit(false);
        return;
      }

      setEditSuccessMsg('App successfully updated!');
      await fetchImplementedApps();

      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditingAppId(null);
      }, 1000);

    } catch (err) {
      console.error('Error updating implemented app:', err);
      setEditErrors({ submit: 'Network error updating details. Please try again.' });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

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
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                    {app.appDescription || app.description}
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {app.id.startsWith('manual_') ? (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-bold">
                        Manual Entry
                      </span>
                    ) : (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md font-bold">
                        Graduated Idea
                      </span>
                    )}

                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(app);
                        }}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline font-bold px-2 py-0.5 border border-indigo-500/20 rounded-md bg-indigo-500/5 transition-all flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit
                      </button>
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

      {/* Edit App Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
              <div>
                <h2 className="text-xl font-bold text-slate-950 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Implemented App
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  Modify active production registry info.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              {editErrors.submit && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-semibold animate-fade-in">
                  {editErrors.submit}
                </div>
              )}

              {editSuccessMsg && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl font-semibold animate-fade-in">
                  {editSuccessMsg}
                </div>
              )}

              {/* App Name */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider block">
                  App Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deriv CRM Loyalty Portal"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={`w-full bg-white dark:bg-slate-900 border ${
                    editErrors.title ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                  } rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all`}
                />
                {editErrors.title && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{editErrors.title}</p>
                )}
              </div>

              {/* Department & Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Department */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider block">
                    Department
                  </label>
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                  >
                    <option value="engineering">Engineering</option>
                    <option value="marketing">Marketing</option>
                    <option value="operations">Operations</option>
                    <option value="product">Product Management</option>
                    <option value="hr">Human Resources</option>
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider block">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                  >
                    <option value="Process Optimization">Process Optimization</option>
                    <option value="Product Innovation">Product Innovation</option>
                    <option value="Sustainability">Sustainability</option>
                    <option value="Cost Reduction">Cost Reduction</option>
                    <option value="Employee Engagement">Employee Engagement</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider block">
                  System Description & Purpose
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe what the system does, its technical stack, and who are the target users."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className={`w-full bg-white dark:bg-slate-900 border ${
                    editErrors.description ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                  } rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-relaxed`}
                />
                {editErrors.description && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{editErrors.description}</p>
                )}
              </div>

              {/* Ownership Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* System Owner */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider block">
                    System Owner
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Chen"
                    value={editSystemOwner}
                    onChange={(e) => setEditSystemOwner(e.target.value)}
                    className={`w-full bg-white dark:bg-slate-900 border ${
                      editErrors.systemOwner ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                    } rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all`}
                  />
                  {editErrors.systemOwner && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{editErrors.systemOwner}</p>
                  )}
                </div>

                {/* Backup Owner */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider block">
                    Backup Owner
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={editBackupSystemOwner}
                    onChange={(e) => setEditBackupSystemOwner(e.target.value)}
                    className={`w-full bg-white dark:bg-slate-900 border ${
                      editErrors.backupSystemOwner ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                    } rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all`}
                  />
                  {editErrors.backupSystemOwner && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{editErrors.backupSystemOwner}</p>
                  )}
                </div>
              </div>

              {/* Made By */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider block">
                  Made By
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditMadeBy('Deriv')}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      editMadeBy === 'Deriv'
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Deriv
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMadeBy('Third Party')}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      editMadeBy === 'Third Party'
                        ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Third Party
                  </button>
                </div>
              </div>

              {/* Slack & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Slack Channel */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider block">
                    Slack Channel
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. #support-loyalty-portal"
                    value={editSlackChannel}
                    onChange={(e) => setEditSlackChannel(e.target.value)}
                    className={`w-full bg-white dark:bg-slate-900 border ${
                      editErrors.slackChannel ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                    } rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all`}
                  />
                  {editErrors.slackChannel && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{editErrors.slackChannel}</p>
                  )}
                </div>

                {/* Implementation Date */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider block">
                    Implementation Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editImplementedAt}
                    onChange={(e) => setEditImplementedAt(e.target.value)}
                    className={`w-full bg-white dark:bg-slate-900 border ${
                      editErrors.implementedAt ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                    } rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all`}
                  />
                  {editErrors.implementedAt && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{editErrors.implementedAt}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-900">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </LayoutWrapper>
  );
}

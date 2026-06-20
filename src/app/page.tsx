'use client';

import React, { useState, useEffect } from 'react';
import { LayoutWrapper } from '@/components/layout-wrapper';
import { useUser } from '@/context/user-context';
import { Idea, Vote } from '@/types';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [allVotes, setAllVotes] = useState<{ [ideaId: string]: Vote[] }>({});
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedRating, setSelectedRating] = useState('All');
  const [selectedScore, setSelectedScore] = useState('All');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'mine'>('all');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ideas');
      const data: Idea[] = await res.json();
      setIdeas(data);

      const votesMap: { [ideaId: string]: Vote[] } = {};
      let needsFallback = false;

      for (const idea of data) {
        if (idea.votes) {
          votesMap[idea.id] = idea.votes;
        } else {
          needsFallback = true;
          break;
        }
      }

      if (needsFallback) {
        // Fallback to individual fetches if API didn't return votes
        for (const idea of data) {
          const detailsRes = await fetch(`/api/ideas/${idea.id}`);
          if (detailsRes.ok) {
            const details = await detailsRes.json();
            votesMap[idea.id] = details.votes || [];
          }
        }
      }
      setAllVotes(votesMap);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Helper functions for vote computations
  const getVoteCounts = (ideaId: string) => {
    const votes = allVotes[ideaId] || [];
    const totalVotes = votes.length;
    const avgRating = totalVotes > 0 ? (votes.reduce((acc, v) => acc + v.vote, 0) / totalVotes).toFixed(1) : '0.0';
    return { avgRating, totalVotes };
  };

  // Extract unique departments and categories for filter dropdowns
  const departments = ['All', ...Array.from(new Set(ideas.map((i) => ideaDepartmentFormatted(i.department))))];
  const categories = ['All', ...Array.from(new Set(ideas.map((i) => i.category)))];

  function ideaDepartmentFormatted(dept: string) {
    if (!dept) return '';
    return dept.charAt(0).toUpperCase() + dept.slice(1);
  }

  // Filter logic
  const filteredIdeas = ideas.filter((idea) => {
    // Search query match
    const matchesSearch =
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Department match
    const matchesDept =
      selectedDept === 'All' ||
      ideaDepartmentFormatted(idea.department).toLowerCase() === selectedDept.toLowerCase();

    // Category match
    const matchesCategory = selectedCategory === 'All' || idea.category === selectedCategory;

    // Status match
    const matchesStatus = selectedStatus === 'All' || idea.status === selectedStatus;

    // Rating match
    let matchesRating = true;
    if (selectedRating !== 'All') {
      const { avgRating } = getVoteCounts(idea.id);
      const numericAvg = parseFloat(avgRating);
      if (selectedRating === '5') {
        matchesRating = numericAvg === 5.0;
      } else if (selectedRating === '4') {
        matchesRating = numericAvg >= 4.0 && numericAvg < 5.0;
      } else if (selectedRating === '3') {
        matchesRating = numericAvg >= 3.0 && numericAvg < 4.0;
      } else if (selectedRating === '2') {
        matchesRating = numericAvg >= 2.0 && numericAvg < 3.0;
      } else if (selectedRating === '1') {
        matchesRating = numericAvg >= 1.0 && numericAvg < 2.0;
      }
    }

    // Score match
    let matchesScore = true;
    if (selectedScore !== 'All') {
      const score = idea.innovationScore;
      if (selectedScore === '90-100') {
        matchesScore = score >= 90 && score <= 100;
      } else if (selectedScore === '80-89') {
        matchesScore = score >= 80 && score <= 89;
      } else if (selectedScore === '70-79') {
        matchesScore = score >= 70 && score <= 79;
      } else if (selectedScore === '60-69') {
        matchesScore = score >= 60 && score <= 69;
      } else if (selectedScore === '50-59') {
        matchesScore = score >= 50 && score <= 59;
      } else if (selectedScore === 'below-50') {
        matchesScore = score < 50;
      }
    }

    // Role-based tab match
    let matchesTab = true;
    if (activeTab === 'mine') {
      matchesTab = currentUser ? idea.createdBy === currentUser.id : false;
    } else if (activeTab === 'pending') {
      matchesTab = idea.status === 'submitted' || idea.status === 'under_review';
    }

    return matchesSearch && matchesDept && matchesCategory && matchesStatus && matchesRating && matchesScore && matchesTab;
  });

  // KPI Calculations
  const totalIdeasCount = ideas.length;
  const approvedCount = ideas.filter((i) => i.status === 'approved').length;
  const pendingCount = ideas.filter((i) => i.status === 'submitted' || i.status === 'under_review').length;
  const rejectedCount = ideas.filter((i) => i.status === 'rejected').length;
  const averageInnovationScore =
    ideas.length > 0
      ? Math.round(ideas.reduce((acc, i) => acc + i.innovationScore, 0) / ideas.length)
      : 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
      case 'rejected':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/20';
      case 'under_review':
        return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <LayoutWrapper>
      <div className="space-y-8 animate-fade-in">
        {/* Header / Intro Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Innovation Portfolio</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1.5 text-sm">
              Discover, evaluate, and test high-impact ideas powered by AI multi-agent evaluation.
            </p>
          </div>
          <button
            onClick={() => router.push('/ideas/submit')}
            className="self-start md:self-auto bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 transition-all duration-200 flex items-center gap-2 group border border-indigo-400/20"
          >
            <svg
              className="w-4.5 h-4.5 text-white group-hover:rotate-90 transition-all duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m7-8H5" />
            </svg>
            Submit an Idea
          </button>
        </div>

        {/* High Fidelity Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {/* Card 1 */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-md flex flex-col justify-between relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all duration-300" />
            <div>
              <div className="flex justify-between items-start gap-4">
                <div className="min-h-[38px] flex items-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-tight">Total Ideas Submitted</p>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{loading ? '...' : totalIdeasCount}</h3>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-900/40 min-h-[36px] flex items-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100% active</span> submissions
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-md flex flex-col justify-between relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-300" />
            <div>
              <div className="flex justify-between items-start gap-4">
                <div className="min-h-[38px] flex items-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-tight">
                    Approved<br />Ideas
                  </p>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{loading ? '...' : approvedCount}</h3>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-900/40 min-h-[36px] flex items-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Ready for implementation
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-md flex flex-col justify-between relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-300" />
            <div>
              <div className="flex justify-between items-start gap-4">
                <div className="min-h-[38px] flex items-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-tight">Under Review and Submitted</p>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{loading ? '...' : pendingCount}</h3>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-900/40 min-h-[36px] flex items-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Awaiting agent evaluation
              </p>
            </div>
          </div>

          {/* Card 4 (Rejected Count) */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-md flex flex-col justify-between relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all duration-300" />
            <div>
              <div className="flex justify-between items-start gap-4">
                <div className="min-h-[38px] flex items-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-tight">
                    Rejected<br />Ideas
                  </p>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{loading ? '...' : rejectedCount}</h3>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-900/40 min-h-[36px] flex items-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Archived ideas and submissions
              </p>
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-md flex flex-col justify-between relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-all duration-300" />
            <div>
              <div className="flex justify-between items-start gap-4">
                <div className="min-h-[38px] flex items-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-tight">Avg Innovation Score</p>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.001 0 0120.488 9z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{loading ? '...' : `${averageInnovationScore}/100`}</h3>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-900/40 min-h-[36px] flex items-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Calculated across multi-agents
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Search, Filter and Tabs block */}
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
          {/* Tabs header & search */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
            {/* Tab items */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  activeTab === 'all'
                    ? 'bg-indigo-600/10 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                }`}
              >
                All Ideas
              </button>

              {(currentUser?.role === 'manager' || currentUser?.role === 'admin') && (
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 ${
                    activeTab === 'pending'
                      ? 'bg-amber-600/10 dark:bg-amber-600/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                  }`}
                >
                  Needs Review
                  {pendingCount > 0 && (
                    <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setActiveTab('mine')}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  activeTab === 'mine'
                    ? 'bg-indigo-600/10 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                }`}
              >
                My Submissions
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative w-full lg:max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search ideas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Filtering Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-0.5">Filter by Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 transition-all font-medium"
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
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-0.5">Filter by Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 transition-all font-medium"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-0.5">Filter by Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 transition-all font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Star Rating */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-0.5">Filter by Rating</label>
              <select
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 transition-all font-medium"
              >
                <option value="All">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars (4.0 to 4.9)</option>
                <option value="3">3 Stars (3.0 to 3.9)</option>
                <option value="2">2 Stars (2.0 to 2.9)</option>
                <option value="1">1 Stars (1.0 to 1.9)</option>
              </select>
            </div>

            {/* Score Filter */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-0.5">Filter by Score</label>
              <select
                value={selectedScore}
                onChange={(e) => setSelectedScore(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 transition-all font-medium"
              >
                <option value="All">All Scores</option>
                <option value="90-100">90 - 100</option>
                <option value="80-89">80 - 89</option>
                <option value="70-79">70 - 79</option>
                <option value="60-69">60 - 69</option>
                <option value="50-59">50 - 59</option>
                <option value="below-50">Below 50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ideas List Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl h-48 animate-pulse space-y-4 shadow-sm">
                <div className="flex justify-between">
                  <div className="h-6 w-32 bg-slate-100 dark:bg-slate-900 rounded" />
                  <div className="h-6 w-12 bg-slate-100 dark:bg-slate-900 rounded" />
                </div>
                <div className="h-4 w-full bg-slate-100 dark:bg-slate-900 rounded" />
                <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-900 rounded" />
                <div className="flex gap-4 pt-4">
                  <div className="h-6 w-16 bg-slate-100 dark:bg-slate-900 rounded" />
                  <div className="h-6 w-16 bg-slate-100 dark:bg-slate-900 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 text-center space-y-4 shadow-sm">
            <div className="p-4 bg-slate-100/80 dark:bg-slate-900/80 w-16 h-16 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 mx-auto">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Innovation Ideas Found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                We were unable to find any ideas matching the current search parameters or active tab filter.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDept('All');
                setSelectedCategory('All');
                setSelectedStatus('All');
                setSelectedRating('All');
                setSelectedScore('All');
                setActiveTab('all');
              }}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold hover:dark:bg-slate-800 hover:dark:text-white transition-all"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredIdeas.map((idea) => {
              const { avgRating, totalVotes } = getVoteCounts(idea.id);
              return (
                <div
                  key={idea.id}
                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 p-6 rounded-2xl shadow-sm hover:shadow-md hover:shadow-indigo-500/[0.02] flex gap-5 transition-all duration-200 group relative"
                >
                  {/* Left Side: Rating Badge */}
                  <div className="flex flex-col items-center justify-center self-start bg-amber-500/[0.03] dark:bg-amber-500/[0.01] border border-amber-500/10 dark:border-amber-500/5 p-3 rounded-2xl min-w-[76px] shadow-inner">
                    <svg className="w-7 h-7 text-amber-500 dark:text-amber-400 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <span className="text-base font-black text-slate-800 dark:text-slate-100 mt-1">
                      {avgRating}
                    </span>
                    <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">
                      {totalVotes} {totalVotes === 1 ? 'rating' : 'ratings'}
                    </span>
                  </div>

                  {/* Right Side: Idea details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold border rounded-md px-2 py-0.5 uppercase ${getStatusBadgeColor(idea.status)}`}>
                            {idea.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md font-semibold">
                            {idea.category}
                          </span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md font-semibold">
                            {ideaDepartmentFormatted(idea.department)}
                          </span>
                        </div>
                        {/* Innovation Score Badge */}
                        <div
                          className={`flex items-center gap-1 text-[11px] font-bold border rounded-md px-2 py-0.5 ${getScoreColor(
                            idea.innovationScore
                          )}`}
                          title="Multi-agent aggregate score"
                        >
                          <span>Score:</span>
                          <span className="text-xs font-extrabold">{idea.innovationScore}</span>
                        </div>
                      </div>

                      {/* Title & Desc */}
                      <h3
                        onClick={() => router.push(`/ideas/${idea.id}`)}
                        className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 hover:underline transition-all cursor-pointer truncate"
                      >
                        {idea.title}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                        {idea.description}
                      </p>
                    </div>

                    {/* Metadata bottom section */}
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-4 mt-5">
                      <div className="flex items-center gap-2">
                        <div className="w-5.5 h-5.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center uppercase">
                          {idea.createdBy.slice(-2)}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          By User #{idea.createdBy.split('_')[1] || idea.createdBy}
                        </span>
                      </div>

                      {idea.clickup && (
                        <a
                          href={idea.clickup.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] text-[#7b68ee] dark:text-[#9381ff] bg-[#7b68ee]/10 dark:bg-[#7b68ee]/20 border border-[#7b68ee]/25 dark:border-[#7b68ee]/40 px-2 py-0.5 rounded-md font-black hover:underline flex items-center gap-1 transition-all"
                        >
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                          </svg>
                          ClickUp Created: {idea.clickup.ticketKey}
                        </a>
                      )}

                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                        {new Date(idea.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LayoutWrapper>
  );
}

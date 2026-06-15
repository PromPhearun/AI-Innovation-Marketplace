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
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'mine'>('all');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ideas');
      const data: Idea[] = await res.json();
      setIdeas(data);

      // Fetch votes and details for each idea
      const votesMap: { [ideaId: string]: Vote[] } = {};
      for (const idea of data) {
        const detailsRes = await fetch(`/api/ideas/${idea.id}`);
        if (detailsRes.ok) {
          const details = await detailsRes.json();
          votesMap[idea.id] = details.votes || [];
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

  const handleVote = async (ideaId: string, value: 1 | -1) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/ideas/${ideaId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ vote: value }),
      });

      if (res.ok) {
        // Refresh votes for this idea
        const detailsRes = await fetch(`/api/ideas/${ideaId}`);
        if (detailsRes.ok) {
          const details = await detailsRes.json();
          setAllVotes((prev) => ({
            ...prev,
            [ideaId]: details.votes || [],
          }));
        }
      }
    } catch (err) {
      console.error('Error upvoting:', err);
    }
  };

  // Helper functions for vote computations
  const getVoteCounts = (ideaId: string) => {
    const votes = allVotes[ideaId] || [];
    const score = votes.reduce((acc, v) => acc + v.vote, 0);
    const userVote = currentUser ? votes.find((v) => v.userId === currentUser.id)?.vote : undefined;
    return { score, userVote };
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

    // Role-based tab match
    let matchesTab = true;
    if (activeTab === 'mine') {
      matchesTab = currentUser ? idea.createdBy === currentUser.id : false;
    } else if (activeTab === 'pending') {
      matchesTab = idea.status === 'submitted' || idea.status === 'under_review';
    }

    return matchesSearch && matchesDept && matchesCategory && matchesStatus && matchesTab;
  });

  // KPI Calculations
  const totalIdeasCount = ideas.length;
  const approvedCount = ideas.filter((i) => i.status === 'approved').length;
  const pendingCount = ideas.filter((i) => i.status === 'submitted' || i.status === 'under_review').length;
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
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Innovation Portfolio</h1>
            <p className="text-slate-400 mt-1.5 text-sm">
              Discover, evaluate, and sand-box high-impact ideas powered by AI multi-agent evaluation.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1 */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 shadow-md flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Ideas</p>
                <h3 className="text-3xl font-black text-slate-100 mt-1">{loading ? '...' : totalIdeasCount}</h3>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-slate-400">
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
            <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
              <span className="text-emerald-400 font-semibold">100% active</span> submissions
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 shadow-md flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Approved Projects</p>
                <h3 className="text-3xl font-black text-emerald-400 mt-1">{loading ? '...' : approvedCount}</h3>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-emerald-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
              Ready for executive implementation
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 shadow-md flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Review Sandbox</p>
                <h3 className="text-3xl font-black text-amber-400 mt-1">{loading ? '...' : pendingCount}</h3>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-amber-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
              Awaiting agent sandbox evaluation
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 shadow-md flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-all" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Innovation Score</p>
                <h3 className="text-3xl font-black text-indigo-400 mt-1">{loading ? '...' : `${averageInnovationScore}/100`}</h3>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-indigo-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.001 0 0120.488 9z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
              Calculated across multi-agents
            </p>
          </div>
        </div>

        {/* Interactive Search, Filter and Tabs block */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 space-y-6">
          {/* Tabs header & search */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800/80 pb-4">
            {/* Tab items */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  activeTab === 'all'
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                All Ideas
              </button>

              {(currentUser?.role === 'manager' || currentUser?.role === 'admin') && (
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 ${
                    activeTab === 'pending'
                      ? 'bg-amber-600/15 text-amber-400 border border-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  Needs Review
                  {pendingCount > 0 && (
                    <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setActiveTab('mine')}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  activeTab === 'mine'
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                My Submissions
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative w-full lg:max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search ideas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-900 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Filtering Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold px-0.5">Filter by Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full text-sm bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 transition-all font-medium"
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
              <label className="text-xs text-slate-400 font-semibold px-0.5">Filter by Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-sm bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 transition-all font-medium"
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
              <label className="text-xs text-slate-400 font-semibold px-0.5">Filter by Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-sm bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 transition-all font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ideas List Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl h-48 animate-pulse space-y-4">
                <div className="flex justify-between">
                  <div className="h-6 w-32 bg-slate-900 rounded" />
                  <div className="h-6 w-12 bg-slate-900 rounded" />
                </div>
                <div className="h-4 w-full bg-slate-900 rounded" />
                <div className="h-4 w-3/4 bg-slate-900 rounded" />
                <div className="flex gap-4 pt-4">
                  <div className="h-6 w-16 bg-slate-900 rounded" />
                  <div className="h-6 w-16 bg-slate-900 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-12 text-center space-y-4">
            <div className="p-4 bg-slate-900/80 w-16 h-16 rounded-2xl flex items-center justify-center border border-slate-800 text-slate-500 mx-auto">
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
              <h3 className="text-lg font-bold text-white">No Innovation Ideas Found</h3>
              <p className="text-sm text-slate-400">
                We were unable to find any ideas matching the current search parameters or active tab filter.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDept('All');
                setSelectedCategory('All');
                setSelectedStatus('All');
                setActiveTab('all');
              }}
              className="bg-slate-900 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 hover:text-white transition-all"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredIdeas.map((idea) => {
              const { score, userVote } = getVoteCounts(idea.id);
              return (
                <div
                  key={idea.id}
                  className="bg-slate-950 border border-slate-800/80 hover:border-slate-700/80 p-6 rounded-2xl shadow-sm hover:shadow-md hover:shadow-indigo-500/[0.02] flex gap-5 transition-all duration-200 group relative"
                >
                  {/* Left Side: Vote Selector */}
                  <div className="flex flex-col items-center gap-1.5 self-start bg-slate-900/60 border border-slate-800/50 p-2.5 rounded-xl">
                    <button
                      onClick={() => handleVote(idea.id, 1)}
                      className={`p-1 rounded-lg transition-colors ${
                        userVote === 1
                          ? 'text-indigo-400 bg-indigo-500/10'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                      }`}
                      title="Upvote Idea"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <span className={`text-sm font-bold ${score >= 0 ? 'text-slate-200' : 'text-slate-400'}`}>
                      {score}
                    </span>
                    <button
                      onClick={() => handleVote(idea.id, -1)}
                      className={`p-1 rounded-lg transition-colors ${
                        userVote === -1
                          ? 'text-rose-400 bg-rose-500/10'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                      }`}
                      title="Downvote Idea"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
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
                          <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md font-semibold">
                            {idea.category}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md font-semibold">
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
                        className="text-lg font-bold text-slate-100 group-hover:text-indigo-400 hover:underline transition-all cursor-pointer truncate"
                      >
                        {idea.title}
                      </h3>
                      <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                        {idea.description}
                      </p>
                    </div>

                    {/* Metadata bottom section */}
                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-4 mt-5">
                      <div className="flex items-center gap-2">
                        <div className="w-5.5 h-5.5 rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300 flex items-center justify-center uppercase">
                          {idea.createdBy.slice(-2)}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          By User #{idea.createdBy.split('_')[1] || idea.createdBy}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">
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

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LayoutWrapper } from '@/components/layout-wrapper';
import { Idea } from '@/types';

// Color definitions for departments & categories to ensure high-fidelity styling
const COLOR_PALETTE = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#f43f5e', // Rose
];

// Months list for chronological sorting
const MONTHS_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface ChartHoverState {
  chartId: string;
  label: string;
  value: string | number;
  extra?: string;
  x: number;
  y: number;
}

export default function ReportPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hover states for various charts
  const [activeTooltip, setActiveTooltip] = useState<ChartHoverState | null>(null);

  // Date range picker states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [appliedStartDate, setAppliedStartDate] = useState<string>('');
  const [appliedEndDate, setAppliedEndDate] = useState<string>('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside of dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sync state inputs when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      setStartDate(appliedStartDate);
      setEndDate(appliedEndDate);
    }
  }, [isDropdownOpen, appliedStartDate, appliedEndDate]);

  const handleApply = () => {
    if (startDate && endDate) {
      setAppliedStartDate(startDate);
      setAppliedEndDate(endDate);
      setIsDropdownOpen(false);
    }
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    setAppliedStartDate('');
    setAppliedEndDate('');
    setIsDropdownOpen(false);
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filter ideas based on selected range or default to 1 year
  const filteredIdeas = useMemo(() => {
    return ideas.filter((idea) => {
      if (!idea.createdAt) return false;
      const ideaDate = new Date(idea.createdAt);

      if (appliedStartDate && appliedEndDate) {
        const start = new Date(appliedStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(appliedEndDate);
        end.setHours(23, 59, 59, 999);
        return ideaDate >= start && ideaDate <= end;
      }

      // Default: 1 year time frame from current date
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      oneYearAgo.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      return ideaDate >= oneYearAgo && ideaDate <= now;
    });
  }, [ideas, appliedStartDate, appliedEndDate]);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/ideas');
        if (!res.ok) {
          throw new Error('Failed to load ideas data');
        }
        const data: Idea[] = await res.json();
        setIdeas(data);
      } catch (err) {
        console.error('Error fetching report details:', err);
        setError('We were unable to load the visual reports dashboard. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  // Format Helper for Department
  const formatDept = (dept: string) => {
    if (!dept) return '';
    return dept.charAt(0).toUpperCase() + dept.slice(1);
  };

  // ----------------------------------------------------
  // DATA AGGREGATION & DERIVED ANALYTICS
  // ----------------------------------------------------

  // 1. KPI Aggregations
  const totalSubmissions = filteredIdeas.length;
  const approvedIdeas = filteredIdeas.filter((i) => i.status === 'approved');
  const rejectedIdeas = filteredIdeas.filter((i) => i.status === 'rejected');
  const pendingIdeas = filteredIdeas.filter((i) => i.status === 'submitted' || i.status === 'under_review');

  const approvalRate = totalSubmissions > 0 
    ? Math.round((approvedIdeas.length / (approvedIdeas.length + rejectedIdeas.length || 1)) * 100) 
    : 0;

  const averageScore = totalSubmissions > 0
    ? Math.round(filteredIdeas.reduce((acc, i) => acc + i.innovationScore, 0) / totalSubmissions)
    : 0;

  const totalComments = filteredIdeas.reduce((acc, i) => acc + (i.comments?.length || 0), 0);
  const totalVotes = filteredIdeas.reduce((acc, i) => acc + (i.votes?.length || 0), 0);

  // 2. Ideas by Month & Status (Grouped Column Chart)
  // We want to group ideas chronologically.
  const getMonthlyStatusData = () => {
    const counts: { [key: string]: { submitted: number; approved: number; rejected: number } } = {};

    filteredIdeas.forEach((idea) => {
      if (!idea.createdAt) return;
      const date = new Date(idea.createdAt);
      const monthLabel = date.toLocaleString('default', { month: 'short' });
      const yearLabel = date.getFullYear().toString().slice(-2);
      const key = `${monthLabel} '${yearLabel}`;

      if (!counts[key]) {
        counts[key] = { submitted: 0, approved: 0, rejected: 0 };
      }

      // Increment totals
      counts[key].submitted += 1;
      if (idea.status === 'approved') counts[key].approved += 1;
      if (idea.status === 'rejected') counts[key].rejected += 1;
    });

    // Sort chronologically (Sort by parsed Date)
    return Object.keys(counts)
      .map((key) => {
        const [mStr, yStr] = key.split(" '");
        const monthIndex = MONTHS_ORDER.indexOf(mStr);
        const yearValue = parseInt(yStr) + 2000;
        return { key, monthIndex, yearValue, data: counts[key] };
      })
      .sort((a, b) => {
        if (a.yearValue !== b.yearValue) return a.yearValue - b.yearValue;
        return a.monthIndex - b.monthIndex;
      })
      .map((item) => ({
        label: item.key,
        submitted: item.data.submitted,
        approved: item.data.approved,
        rejected: item.data.rejected,
      }));
  };

  const monthlyStatusData = getMonthlyStatusData();

  // 3. Ideas by Team (Department Donut Chart)
  const getDepartmentData = () => {
    const deptMap: { [key: string]: number } = {};
    filteredIdeas.forEach((idea) => {
      const dept = formatDept(idea.department) || 'General';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    return Object.entries(deptMap)
      .map(([name, count], index) => ({
        name,
        count,
        color: COLOR_PALETTE[index % COLOR_PALETTE.length],
        percentage: totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  };

  const departmentData = getDepartmentData();

  // 4. Ideas by Category (Horizontal Progressive Bars)
  const getCategoryData = () => {
    const catMap: { [key: string]: number } = {};
    filteredIdeas.forEach((idea) => {
      const cat = idea.category || 'Uncategorized';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(catMap), 1);

    return Object.entries(catMap)
      .map(([name, count], index) => ({
        name,
        count,
        color: COLOR_PALETTE[(index + 3) % COLOR_PALETTE.length],
        percentageOfMax: Math.round((count / maxCount) * 100),
        percentageOfTotal: totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  };

  const categoryData = getCategoryData();

  // Helper to compute average rating for a single idea
  const getIdeaAvgRating = (idea: Idea): number => {
    if (!idea.votes || idea.votes.length === 0) return 0;
    return idea.votes.reduce((acc, v) => acc + v.vote, 0) / idea.votes.length;
  };

  // 5. Ideas by Average Rating (Buckets)
  const getRatingBucketData = () => {
    const buckets = {
      '5-stars': { label: '5.0 Stars', count: 0, color: '#f59e0b' },
      '4-stars': { label: '4.0 - 4.9 Stars', count: 0, color: '#fbbf24' },
      '3-stars': { label: '3.0 - 3.9 Stars', count: 0, color: '#fcd34d' },
      '2-stars': { label: '2.0 - 2.9 Stars', count: 0, color: '#fde68a' },
      '1-stars': { label: '1.0 - 1.9 Stars', count: 0, color: '#fef3c7' },
      'no-rating': { label: 'Unrated', count: 0, color: '#e2e8f0' },
    };

    filteredIdeas.forEach((idea) => {
      const avg = getIdeaAvgRating(idea);
      if (avg === 0) {
        buckets['no-rating'].count += 1;
      } else if (avg === 5) {
        buckets['5-stars'].count += 1;
      } else if (avg >= 4) {
        buckets['4-stars'].count += 1;
      } else if (avg >= 3) {
        buckets['3-stars'].count += 1;
      } else if (avg >= 2) {
        buckets['2-stars'].count += 1;
      } else {
        buckets['1-stars'].count += 1;
      }
    });

    return Object.values(buckets);
  };

  const ratingBucketData = getRatingBucketData();

  // 6. Ideas by Scoring Range (Buckets)
  const getScoreBucketData = () => {
    const buckets = {
      '90-100': { label: '90 - 100 (Elite)', count: 0, color: '#10b981' }, // emerald
      '80-89': { label: '80 - 89 (High)', count: 0, color: '#34d399' },  // light emerald
      '70-79': { label: '70 - 79 (Good)', count: 0, color: '#fbbf24' },  // amber
      '60-69': { label: '60 - 69 (Fair)', count: 0, color: '#f97316' },  // orange
      '50-59': { label: '50 - 59 (Weak)', count: 0, color: '#f43f5e' },  // rose
      'below-50': { label: 'Below 50 (Critical)', count: 0, color: '#ef4444' }, // red
    };

    filteredIdeas.forEach((idea) => {
      const score = idea.innovationScore;
      if (score >= 90) buckets['90-100'].count += 1;
      else if (score >= 80) buckets['80-89'].count += 1;
      else if (score >= 70) buckets['70-79'].count += 1;
      else if (score >= 60) buckets['60-69'].count += 1;
      else if (score >= 50) buckets['50-59'].count += 1;
      else buckets['below-50'].count += 1;
    });

    return Object.values(buckets);
  };

  const scoreBucketData = getScoreBucketData();

  // Compute Top Team (The department with the highest submission count)
  const topTeam = departmentData.length > 0 ? departmentData[0].name : 'N/A';
  const highImpactSubmissions = filteredIdeas.filter((i) => i.innovationScore >= 80).length;

  return (
    <LayoutWrapper>
      <div className="space-y-8 animate-fade-in pb-12">
        {/* Header Title section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-900 pb-5">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Reports & Analytics</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1.5 text-sm">
              High-fidelity visual insights tracking the velocity, team alignment, ratings, and AI innovation scoring of submitted ideas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0" ref={dropdownRef}>
            {/* Status Indicator Badges */}
            {appliedStartDate && appliedEndDate ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 rounded-full border border-indigo-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Custom Range Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-full border border-amber-500/10 animate-fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Last 1 Year (Default)
              </span>
            )}

            {/* Date Range Dropdown Toggle Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-slate-950 border rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all ${
                  isDropdownOpen 
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>
                  {appliedStartDate && appliedEndDate 
                    ? `${formatDateLabel(appliedStartDate)} - ${formatDateLabel(appliedEndDate)}` 
                    : 'Select Date Range'}
                </span>
                <svg className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Popover */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-5 z-40 space-y-4 animate-scale-up origin-top-right">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Filter by Date Range</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Select start and end dates to filter report metrics.</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all [color-scheme:light] dark:[color-scheme:dark]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all [color-scheme:light] dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-900/50">
                    <button
                      type="button"
                      onClick={handleClear}
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={!startDate || !endDate}
                      className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-semibold text-white transition-all shadow-sm shadow-indigo-600/10"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-sm rounded-xl font-medium">
            {error}
          </div>
        )}

        {loading ? (
          // SKELETON LOADER
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 h-32 animate-pulse space-y-4 shadow-sm" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 h-80 animate-pulse shadow-sm" />
              ))}
            </div>
          </div>
        ) : ideas.length === 0 ? (
          // EMPTY STATE
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-16 text-center space-y-4 shadow-sm max-w-xl mx-auto">
            <div className="p-4 bg-slate-100/80 dark:bg-slate-900/80 w-16 h-16 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 mx-auto">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.001 0 0120.488 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Ideas Placed Yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              There is currently no submission history available to formulate analytical visual reports. Submit your first innovation idea to activate live reports!
            </p>
          </div>
        ) : filteredIdeas.length === 0 ? (
          // FILTERED EMPTY STATE
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-16 text-center space-y-4 shadow-sm max-w-xl mx-auto animate-fade-in">
            <div className="p-4 bg-slate-100/80 dark:bg-slate-900/80 w-16 h-16 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 mx-auto">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Results for Selected Range</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {appliedStartDate && appliedEndDate ? (
                `There are no ideas submitted during this date range (${formatDateLabel(appliedStartDate)} - ${formatDateLabel(appliedEndDate)}).`
              ) : (
                "There are no ideas submitted within the default 1-year time frame."
              )}{" "}
              Try selecting a different range or clearing the filter.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-indigo-600/10 hover:shadow-indigo-600/20"
              >
                Clear Date Filter
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ----------------------------------------------------
                KPI CARD METRICS HEADER PANEL
                ---------------------------------------------------- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {/* Metric 1 */}
              <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl" />
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Cumulative Ideas</span>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalSubmissions}</h3>
                </div>
                <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-900/40 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="text-indigo-500 font-extrabold">{pendingIdeas.length}</span> awaiting evaluation
                </div>
              </div>

              {/* Metric 2 */}
              <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl" />
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Approval Rate</span>
                  <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{approvalRate}%</h3>
                </div>
                <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-900/40 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="text-emerald-500 font-extrabold">{approvedIdeas.length} approved</span> vs {rejectedIdeas.length} rejected
                </div>
              </div>

              {/* Metric 3 */}
              <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl" />
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Elite Ideas (Score ≥ 80)</span>
                  <h3 className="text-2xl font-black text-amber-500">{highImpactSubmissions}</h3>
                </div>
                <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-900/40 text-[11px] text-slate-500 dark:text-slate-400">
                  Avg cognitive score: <span className="font-extrabold text-amber-500">{averageScore}/100</span>
                </div>
              </div>

              {/* Metric 4 */}
              <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl" />
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Top Hub Team</span>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 truncate">{topTeam}</h3>
                </div>
                <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-900/40 text-[11px] text-slate-500 dark:text-slate-400">
                  Out of <span className="text-blue-500 font-extrabold">{departmentData.length} active</span> teams
                </div>
              </div>

              {/* Metric 5 */}
              <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/5 rounded-full blur-xl" />
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Ecosystem Collabs</span>
                  <h3 className="text-2xl font-black text-pink-500">{totalComments + totalVotes}</h3>
                </div>
                <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-900/40 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Votes: <strong className="text-slate-700 dark:text-slate-300">{totalVotes}</strong></span>
                  <span>Comments: <strong className="text-slate-700 dark:text-slate-300">{totalComments}</strong></span>
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------
                CHARTS GRID CONTAINER
                ---------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">

              {/* CHART 1: MONTHLY PERFORMANCE TIMELINE (GROUPED COLUMN CHART) */}
              <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Monthly Submissions & Lifecycle</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Track and compare ideas submitted, approved, and rejected on a month-to-month timeline.</p>
                </div>

                {monthlyStatusData.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-xs text-slate-400">Insufficent date history to show timeline.</div>
                ) : (
                  <div className="relative pt-2">
                    {/* Visual custom-crafted SVG grouped column chart */}
                    <svg className="w-full overflow-visible" height="230" viewBox="0 0 540 230" preserveAspectRatio="none">
                      {/* Grid lines */}
                      {[0, 25, 50, 75, 100].map((percent) => (
                        <line
                          key={percent}
                          x1="30"
                          y1={20 + (160 * percent) / 100}
                          x2="530"
                          y2={20 + (160 * percent) / 100}
                          stroke="currentColor"
                          className="text-slate-100 dark:text-slate-900"
                          strokeWidth="1"
                        />
                      ))}

                      {/* Bar groups */}
                      {(() => {
                        // Max value calculation across all categories
                        const maxVal = Math.max(
                          ...monthlyStatusData.map((d) => Math.max(d.submitted, d.approved, d.rejected, 1))
                        );

                        const rawBandWidth = 500 / monthlyStatusData.length;
                        const maxSingleBarWidth = 24;

                        // Calculate standard widths
                        const rawGroupWidth = rawBandWidth - 16;
                        const rawSingleBarWidth = rawGroupWidth / 3 - 2;

                        const singleBarWidth = Math.max(2, Math.min(rawSingleBarWidth, maxSingleBarWidth));
                        const groupWidth = (singleBarWidth + 2) * 3;

                        return monthlyStatusData.map((data, idx) => {
                          const bandCenter = 30 + idx * rawBandWidth + rawBandWidth / 2;
                          const xStart = bandCenter - groupWidth / 2;

                          // Heights
                          const hSub = (data.submitted / maxVal) * 160;
                          const hApp = (data.approved / maxVal) * 160;
                          const hRej = (data.rejected / maxVal) * 160;

                          // Y coordinates
                          const ySub = 180 - hSub;
                          const yApp = 180 - hApp;
                          const yRej = 180 - hRej;

                          return (
                            <g key={data.label} className="group/item">
                              {/* Background hover guide */}
                              <rect
                                x={xStart - 4}
                                y="15"
                                width={groupWidth + 8}
                                height="170"
                                fill="currentColor"
                                className="fill-slate-50/0 hover:fill-slate-50/50 dark:hover:fill-slate-900/30 transition-all duration-200 rounded"
                              />

                              {/* Submitted bar (Indigo) */}
                              <rect
                                x={xStart}
                                y={ySub}
                                width={singleBarWidth}
                                height={hSub}
                                fill="#6366f1"
                                className="rx-[2px] cursor-pointer transition-all duration-200 hover:brightness-110"
                                onMouseEnter={(e) => {
                                  setActiveTooltip({
                                    chartId: 'monthly',
                                    label: `${data.label} - Submissions`,
                                    value: `${data.submitted} ideas`,
                                    x: e.clientX,
                                    y: e.clientY,
                                  });
                                }}
                                onMouseLeave={() => setActiveTooltip(null)}
                              />

                              {/* Approved bar (Emerald) */}
                              <rect
                                x={xStart + singleBarWidth + 2}
                                y={yApp}
                                width={singleBarWidth}
                                height={hApp}
                                fill="#10b981"
                                className="rx-[2px] cursor-pointer transition-all duration-200 hover:brightness-110"
                                onMouseEnter={(e) => {
                                  setActiveTooltip({
                                    chartId: 'monthly',
                                    label: `${data.label} - Approved`,
                                    value: `${data.approved} ideas`,
                                    x: e.clientX,
                                    y: e.clientY,
                                  });
                                }}
                                onMouseLeave={() => setActiveTooltip(null)}
                              />

                              {/* Rejected bar (Rose) */}
                              <rect
                                x={xStart + (singleBarWidth + 2) * 2}
                                y={yRej}
                                width={singleBarWidth}
                                height={hRej}
                                fill="#f43f5e"
                                className="rx-[2px] cursor-pointer transition-all duration-200 hover:brightness-110"
                                onMouseEnter={(e) => {
                                  setActiveTooltip({
                                    chartId: 'monthly',
                                    label: `${data.label} - Rejected`,
                                    value: `${data.rejected} ideas`,
                                    x: e.clientX,
                                    y: e.clientY,
                                  });
                                }}
                                onMouseLeave={() => setActiveTooltip(null)}
                              />

                              {/* Value Label: Submitted */}
                              {data.submitted > 0 && (
                                <text
                                  x={xStart + singleBarWidth / 2}
                                  y={ySub - 6}
                                  textAnchor="middle"
                                  className="text-[9px] font-bold fill-indigo-600 dark:fill-indigo-400 select-none animate-fade-in"
                                >
                                  {data.submitted}
                                </text>
                              )}

                              {/* Value Label: Approved */}
                              {data.approved > 0 && (
                                <text
                                  x={xStart + singleBarWidth * 1.5 + 2}
                                  y={yApp - 6}
                                  textAnchor="middle"
                                  className="text-[9px] font-bold fill-emerald-600 dark:fill-emerald-400 select-none animate-fade-in"
                                >
                                  {data.approved}
                                </text>
                              )}

                              {/* Value Label: Rejected */}
                              {data.rejected > 0 && (
                                <text
                                  x={xStart + singleBarWidth * 2.5 + 4}
                                  y={yRej - 6}
                                  textAnchor="middle"
                                  className="text-[9px] font-bold fill-rose-600 dark:fill-rose-400 select-none animate-fade-in"
                                >
                                  {data.rejected}
                                </text>
                              )}

                              {/* X Axis Label */}
                              <text
                                x={xStart + groupWidth / 2}
                                y="200"
                                textAnchor="middle"
                                className="text-[10px] font-bold fill-slate-500 dark:fill-slate-400"
                              >
                                {data.label}
                              </text>
                            </g>
                          );
                        });
                      })()}

                      {/* Y-axis values */}
                      <text x="22" y="24" textAnchor="end" className="text-[9px] font-semibold fill-slate-400">
                        {Math.max(...monthlyStatusData.map((d) => Math.max(d.submitted, d.approved, d.rejected, 1)))}
                      </text>
                      <text x="22" y="100" textAnchor="end" className="text-[9px] font-semibold fill-slate-400">
                        {Math.round(Math.max(...monthlyStatusData.map((d) => Math.max(d.submitted, d.approved, d.rejected, 1))) / 2)}
                      </text>
                      <text x="22" y="180" textAnchor="end" className="text-[9px] font-semibold fill-slate-400">0</text>

                      {/* X and Y lines */}
                      <line x1="30" y1="180" x2="530" y2="180" stroke="currentColor" className="text-slate-300 dark:text-slate-800" strokeWidth="1.5" />
                    </svg>

                    {/* Legends */}
                    <div className="flex justify-center items-center gap-6 mt-2 pt-2 border-t border-slate-50 dark:border-slate-900/60">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
                        Submitted
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                        Approved
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                        Rejected
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CHART 2: TEAM SUBMISSIONS (DONUT CHART) */}
              <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Submissions by Team</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Breakdown of organizational innovation engagement by department.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Circle SVG */}
                  <div className="md:col-span-5 flex justify-center relative">
                    <svg width="150" height="150" viewBox="0 0 100 100" className="overflow-visible">
                      {departmentData.length === 0 ? (
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                      ) : (
                        (() => {
                          let accumulatedPercentage = 0;
                          const radius = 38;
                          const circumference = 2 * Math.PI * radius; // ~238.76

                          return departmentData.map((dept) => {
                            const strokeDashArray = `${(dept.percentage * circumference) / 100} ${circumference}`;
                            const rotation = (accumulatedPercentage * 360) / 100;
                            accumulatedPercentage += dept.percentage;

                            return (
                              <circle
                                key={dept.name}
                                cx="50"
                                cy="50"
                                r={radius}
                                fill="transparent"
                                stroke={dept.color}
                                strokeWidth="11"
                                strokeDasharray={strokeDashArray}
                                strokeDashoffset="0"
                                transform={`rotate(${rotation - 90} 50 50)`}
                                className="cursor-pointer transition-all duration-300 hover:stroke-[14px]"
                                onMouseEnter={(e) => {
                                  setActiveTooltip({
                                    chartId: 'team',
                                    label: dept.name,
                                    value: `${dept.count} ideas (${dept.percentage}%)`,
                                    x: e.clientX,
                                    y: e.clientY,
                                  });
                                }}
                                onMouseLeave={() => setActiveTooltip(null)}
                              />
                            );
                          });
                        })()
                      )}
                      {/* Central total card */}
                      <circle cx="50" cy="50" r="28" className="fill-white dark:fill-slate-950" />
                      <text x="50" y="47" textAnchor="middle" className="text-[8px] uppercase tracking-wider font-bold fill-slate-400">Total</text>
                      <text x="50" y="60" textAnchor="middle" className="text-sm font-black fill-slate-800 dark:fill-slate-100">{totalSubmissions}</text>
                    </svg>
                  </div>

                  {/* Legends side card */}
                  <div className="md:col-span-7 space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {departmentData.map((dept) => (
                      <div
                        key={dept.name}
                        className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-150 cursor-pointer"
                        onMouseEnter={(e) => {
                          setActiveTooltip({
                            chartId: 'team',
                            label: dept.name,
                            value: `${dept.count} ideas (${dept.percentage}%)`,
                            x: e.clientX,
                            y: e.clientY,
                          });
                        }}
                        onMouseLeave={() => setActiveTooltip(null)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                          <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{dept.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-slate-500 dark:text-slate-400">{dept.count} ideas</span>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded font-black text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/50">
                            {dept.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CHART 3: INNOVATION SCORES (COLUMN CHART) */}
              <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Ideas by AI Innovation Score</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Distribution of ideas across multi-agent consensus scoring tiers.</p>
                </div>

                <div className="relative pt-2">
                  <svg className="w-full overflow-visible" height="180" viewBox="0 0 540 180" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {[0, 50, 100].map((percent) => (
                      <line
                        key={percent}
                        x1="35"
                        y1={15 + (120 * percent) / 100}
                        x2="530"
                        y2={15 + (120 * percent) / 100}
                        stroke="currentColor"
                        className="text-slate-100 dark:text-slate-900"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Bars */}
                    {(() => {
                      const maxVal = Math.max(...scoreBucketData.map((d) => d.count), 1);
                      const bandWidth = 495 / scoreBucketData.length;
                      const barWidth = Math.min(bandWidth - 14, 40);

                      return scoreBucketData.map((data, idx) => {
                        const x = 35 + idx * bandWidth + (bandWidth - barWidth) / 2;
                        const barHeight = (data.count / maxVal) * 120;
                        const y = 135 - barHeight;

                        return (
                          <g key={data.label} className="group/bar">
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              fill={data.color}
                              className="rx-[4px] cursor-pointer transition-all duration-200 hover:opacity-90"
                              onMouseEnter={(e) => {
                                setActiveTooltip({
                                  chartId: 'score',
                                  label: data.label,
                                  value: `${data.count} submissions`,
                                  x: e.clientX,
                                  y: e.clientY,
                                });
                              }}
                              onMouseLeave={() => setActiveTooltip(null)}
                            />
                            <text
                              x={x + barWidth / 2}
                              y="150"
                              textAnchor="middle"
                              className="text-[9px] font-bold fill-slate-500 dark:fill-slate-400"
                            >
                              {data.label.split(' ')[0]}
                            </text>
                            {/* Inner Value */}
                            {data.count > 0 && (
                              <text
                                x={x + barWidth / 2}
                                y={y - 5}
                                textAnchor="middle"
                                className="text-[10px] font-bold fill-slate-700 dark:fill-slate-300"
                              >
                                {data.count}
                              </text>
                            )}
                          </g>
                        );
                      });
                    })()}

                    {/* Axes */}
                    <line x1="35" y1="135" x2="530" y2="135" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>

              {/* CHART 4: IDEAS BY RATING (COLUMN CHART) */}
              <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Ideas by Rating</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Breakdown of submissions according to community review averages.</p>
                </div>

                <div className="relative pt-2">
                  <svg className="w-full overflow-visible" height="180" viewBox="0 0 540 180" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {[0, 50, 100].map((percent) => (
                      <line
                        key={percent}
                        x1="35"
                        y1={15 + (120 * percent) / 100}
                        x2="530"
                        y2={15 + (120 * percent) / 100}
                        stroke="currentColor"
                        className="text-slate-100 dark:text-slate-900"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Bars */}
                    {(() => {
                      const maxVal = Math.max(...ratingBucketData.map((d) => d.count), 1);
                      const bandWidth = 495 / ratingBucketData.length;
                      const barWidth = Math.min(bandWidth - 14, 40);

                      return ratingBucketData.map((data, idx) => {
                        const x = 35 + idx * bandWidth + (bandWidth - barWidth) / 2;
                        const barHeight = (data.count / maxVal) * 120;
                        const y = 135 - barHeight;

                        return (
                          <g key={data.label} className="group/bar">
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              fill={data.color}
                              className="rx-[4px] cursor-pointer transition-all duration-200 hover:opacity-90"
                              onMouseEnter={(e) => {
                                setActiveTooltip({
                                  chartId: 'rating',
                                  label: data.label,
                                  value: `${data.count} submissions`,
                                  x: e.clientX,
                                  y: e.clientY,
                                });
                              }}
                              onMouseLeave={() => setActiveTooltip(null)}
                            />
                            <text
                              x={x + barWidth / 2}
                              y="150"
                              textAnchor="middle"
                              className="text-[9px] font-bold fill-slate-500 dark:fill-slate-400"
                            >
                              {data.label.split(' ')[0]}
                            </text>
                            {/* Inner Value */}
                            {data.count > 0 && (
                              <text
                                x={x + barWidth / 2}
                                y={y - 5}
                                textAnchor="middle"
                                className="text-[10px] font-bold fill-slate-700 dark:fill-slate-300"
                              >
                                {data.count}
                              </text>
                            )}
                          </g>
                        );
                      });
                    })()}

                    {/* Axes */}
                    <line x1="35" y1="135" x2="530" y2="135" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>

              {/* CHART 5: IDEAS BY CATEGORY DISTRIBUTION (FULL WIDTH COMPARISON BAR CHART) */}
              <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm lg:col-span-2 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Submission Category Distributions</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Comparative representation of categories across the entire innovation portfolio.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 pt-2">
                  {categoryData.slice(0, 10).map((cat) => (
                    <div
                      key={cat.name}
                      className="space-y-1.5 p-2 rounded-xl border border-transparent hover:border-slate-100 dark:hover:border-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-all cursor-pointer"
                      onMouseEnter={(e) => {
                        setActiveTooltip({
                          chartId: 'category',
                          label: cat.name,
                          value: `${cat.count} submissions (${cat.percentageOfTotal}% of total)`,
                          x: e.clientX,
                          y: e.clientY,
                        });
                      }}
                      onMouseLeave={() => setActiveTooltip(null)}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{cat.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-slate-500 dark:text-slate-450">{cat.count} ideas</span>
                          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500">{cat.percentageOfTotal}%</span>
                        </div>
                      </div>
                      {/* Bar indicator */}
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${cat.percentageOfMax}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ----------------------------------------------------
                FLOATING MOUSE-COORDINATE TOOLTIP CARD
                ---------------------------------------------------- */}
            {activeTooltip && (
              <div
                className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-[calc(100%+14px)] bg-slate-900/95 dark:bg-slate-950/95 text-white p-3 rounded-xl border border-slate-800 shadow-xl backdrop-blur-md transition-opacity duration-150 animate-fade-in text-xs space-y-1"
                style={{
                  left: `${activeTooltip.x}px`,
                  top: `${activeTooltip.y}px`,
                }}
              >
                <div className="font-extrabold text-slate-200 uppercase tracking-wide text-[9.5px] border-b border-slate-800/80 pb-1 mb-1">
                  {activeTooltip.label}
                </div>
                <div className="font-black text-white text-sm">
                  {activeTooltip.value}
                </div>
                {activeTooltip.extra && (
                  <div className="text-[10px] text-slate-400 font-medium">
                    {activeTooltip.extra}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </LayoutWrapper>
  );
}

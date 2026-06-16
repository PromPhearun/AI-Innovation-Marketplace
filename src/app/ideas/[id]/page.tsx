'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LayoutWrapper } from '@/components/layout-wrapper';
import { useUser } from '@/context/user-context';
import { useParams, useRouter } from 'next/navigation';
import { Idea, Vote, Comment, AIReview } from '@/types';

interface ParsedSections {
  title?: string;
  problemStatement?: string;
  proposedSolution?: string;
  expectedBenefits?: string;
  implementationRecommendation?: string;
  unparsed: string[];
}

function parseSummary(text: string): ParsedSections {
  const sections: ParsedSections = { unparsed: [] };
  const lines = text.split('\n');
  let currentKey: 'title' | 'problemStatement' | 'proposedSolution' | 'expectedBenefits' | 'implementationRecommendation' | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('###')) {
      sections.title = line.replace(/^###\s*/, '').replace(/\*\*/g, '').trim();
      currentKey = null;
      continue;
    }

    const problemMatch = line.match(/^\*\*Problem Statement:\*\*\s*(.*)/i) || line.match(/^Problem Statement:\s*(.*)/i);
    if (problemMatch) {
      sections.problemStatement = problemMatch[1].trim();
      currentKey = 'problemStatement';
      continue;
    }

    const solutionMatch = line.match(/^\*\*Proposed Solution:\*\*\s*(.*)/i) || line.match(/^Proposed Solution:\s*(.*)/i);
    if (solutionMatch) {
      sections.proposedSolution = solutionMatch[1].trim();
      currentKey = 'proposedSolution';
      continue;
    }

    const benefitsMatch = line.match(/^\*\*Expected Benefits:\*\*\s*(.*)/i) || line.match(/^Expected Benefits:\s*(.*)/i);
    if (benefitsMatch) {
      sections.expectedBenefits = benefitsMatch[1].trim();
      currentKey = 'expectedBenefits';
      continue;
    }

    const recommendationMatch = line.match(/^\*\*Implementation Recommendation:\*\*\s*(.*)/i) || line.match(/^Implementation Recommendation:\s*(.*)/i);
    if (recommendationMatch) {
      sections.implementationRecommendation = recommendationMatch[1].trim();
      currentKey = 'implementationRecommendation';
      continue;
    }

    if (currentKey) {
      sections[currentKey] = (sections[currentKey] ? sections[currentKey] + ' ' : '') + line.replace(/^\s*\*\s*/, '').trim();
    } else {
      sections.unparsed.push(line);
    }
  }

  return sections;
}

function FormattedExecutiveSummary({ text }: { text: string }) {
  const sections = parseSummary(text);

  return (
    <div className="space-y-4">
      {sections.title && (
        <h4 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {sections.title}
        </h4>
      )}

      <div className="grid grid-cols-1 gap-4">
        {sections.problemStatement && (
          <div className="p-4 rounded-xl border bg-rose-50/40 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20 space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Problem Statement
            </div>
            <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed font-medium">
              {sections.problemStatement}
            </p>
          </div>
        )}

        {sections.proposedSolution && (
          <div className="p-4 rounded-xl border bg-indigo-50/40 dark:bg-indigo-950/10 border-indigo-100 dark:border-indigo-900/20 space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Proposed Solution
            </div>
            <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed font-medium">
              {sections.proposedSolution}
            </p>
          </div>
        )}

        {sections.expectedBenefits && (
          <div className="p-4 rounded-xl border bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20 space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Expected Benefits
            </div>
            <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed font-medium">
              {sections.expectedBenefits}
            </p>
          </div>
        )}

        {sections.implementationRecommendation && (
          <div className="p-4 rounded-xl border bg-sky-50/40 dark:bg-sky-950/10 border-sky-100 dark:border-sky-900/20 space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400 font-bold text-xs uppercase tracking-wider">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              Implementation Recommendation
            </div>
            <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed font-medium">
              {sections.implementationRecommendation}
            </p>
          </div>
        )}

        {sections.unparsed.length > 0 && (
          <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs leading-relaxed space-y-1">
            {sections.unparsed.map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const getGradientColors = (score: number) => {
  if (score >= 75) return { stop1: '#10b981', stop2: '#06b6d4' }; // Emerald Green to Teal (highly green/vibrant)
  if (score >= 50) return { stop1: '#f59e0b', stop2: '#10b981' }; // Amber Yellow to Emerald Green (moderately green)
  return { stop1: '#ef4444', stop2: '#f97316' }; // Red to Orange (low score, not green)
};

export default function IdeaDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { currentUser } = useUser();

  // Core states
  const [idea, setIdea] = useState<Idea | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviews, setReviews] = useState<AIReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Interaction states
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const fetchIdeaDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ideas/${id}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        setIdea(null);
        return;
      }
      const data = await res.json();
      setIdea(data.idea);
      setVotes(data.votes || []);
      setComments(data.comments || []);
      setReviews(data.reviews || []);
      setSummary(data.idea.aiSummary || null);
    } catch (err) {
      console.error('Error fetching details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchIdeaDetails();
    }
  }, [id, fetchIdeaDetails]);

  const handleVote = async (value: 1 | -1) => {
    if (!currentUser || !idea || isVoting) return;
    try {
      setIsVoting(true);
      const res = await fetch(`/api/ideas/${idea.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ vote: value }),
      });

      if (res.ok) {
        // Refresh votes with cache bypass
        const detailsRes = await fetch(`/api/ideas/${idea.id}?t=${Date.now()}`, { cache: 'no-store' });
        if (detailsRes.ok) {
          const details = await detailsRes.json();
          setVotes(details.votes || []);
        }
      }
    } catch (err) {
      console.error('Error voting:', err);
    } finally {
      setIsVoting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentUser || !idea) return;

    try {
      setSubmittingComment(true);
      const res = await fetch(`/api/ideas/${idea.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ comment: newCommentText }),
      });

      if (res.ok) {
        setNewCommentText('');
        // Refresh comments list
        const detailsRes = await fetch(`/api/ideas/${idea.id}?t=${Date.now()}`, { cache: 'no-store' });
        if (detailsRes.ok) {
          const details = await detailsRes.json();
          setComments(details.comments || []);
        }
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!idea) return;
    try {
      setIsSummarizing(true);
      const res = await fetch(`/api/ideas/${idea.id}/summarize`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Error generating summary:', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'approved' | 'rejected' | 'under_review') => {
    if (!idea || !currentUser) return;
    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/ideas/${idea.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Refresh page details
        await fetchIdeaDetails();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Vote calculations
  const voteScore = votes.reduce((acc, v) => acc + v.vote, 0);
  const userVote = currentUser ? votes.find((v) => v.userId === currentUser.id)?.vote : undefined;

  // Circular progress calculations for Innovation Score
  const score = idea ? idea.innovationScore : 0;
  const radius = 58;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const gradColors = getGradientColors(score);

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
              <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            </div>
            <div className="h-60 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  if (!idea) {
    return (
      <LayoutWrapper>
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto mt-12 space-y-4 shadow-sm">
          <div className="p-4 bg-slate-50 dark:bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-800 text-rose-500 mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Idea Not Found</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            The proposal you are trying to access does not exist or may have been deleted.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </LayoutWrapper>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10';
    return 'text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10';
  };

  const getAgentLabel = (agent: string) => {
    switch (agent) {
      case 'business':
        return 'Business Viability Agent';
      case 'feasibility':
        return 'Technical Feasibility Agent';
      case 'employeeImpact':
        return 'Employee Satisfaction Council';
      case 'innovation':
        return 'Chief Innovation Officer';
      default:
        return agent;
    }
  };

  const getAgentIcon = (agent: string) => {
    switch (agent) {
      case 'business':
        return (
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'feasibility':
        return (
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.42 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'employeeImpact':
        return (
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30';
      case 'rejected':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30';
      case 'under_review':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 dark:border-indigo-500/30';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <LayoutWrapper>
      <div className="space-y-8 animate-fade-in">
        {/* Navigation & Status Title Panel */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
          <div className="space-y-2">
            <button
              onClick={() => router.push('/')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Portfolio Dashboard
            </button>
            <div className="flex items-center gap-3.5 flex-wrap">
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{idea.title}</h1>
              <span className={`text-xs font-bold border rounded-md px-2.5 py-1 uppercase ${getStatusBadgeColor(idea.status)}`}>
                {idea.status.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Submitted by User #{idea.createdBy.split('_')[1] || idea.createdBy}</span>
              <span>•</span>
              <span className="capitalize">{idea.department} Department</span>
              <span>•</span>
              <span>Category: {idea.category}</span>
              <span>•</span>
              <span>Drafted {new Date(idea.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Voting Box */}
          <div className="flex items-center gap-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl self-start lg:self-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-2">Vote on Draft</span>
            <div className={`flex items-center gap-1 ${isVoting ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}>
              <button
                onClick={() => handleVote(1)}
                disabled={isVoting}
                className={`p-1.5 rounded-xl transition-colors ${
                  userVote === 1
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent'
                } ${isVoting ? 'cursor-not-allowed' : ''}`}
                title="Upvote Idea"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 px-1.5 min-w-[20px] text-center">
                {voteScore}
              </span>
              <button
                onClick={() => handleVote(-1)}
                disabled={isVoting}
                className={`p-1.5 rounded-xl transition-colors ${
                  userVote === -1
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent'
                } ${isVoting ? 'cursor-not-allowed' : ''}`}
                title="Downvote Idea"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side Column: Descriptions, AI Summary, Agent Evaluations */}
          <div className="lg:col-span-2 space-y-8">
            {/* Proposal Overview */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Proposal Overview</h3>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {idea.description}
              </p>

              {idea.expectedBenefits && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-900 space-y-2">
                  <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Expected Benefits</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                    {idea.expectedBenefits}
                  </p>
                </div>
              )}
            </div>

            {/* AI Executive Summary Section */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">AI Executive Summary</h3>
                {!summary && (
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isSummarizing}
                    className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-3 py-1.5 rounded-xl border border-indigo-500/20 transition-all flex items-center gap-1"
                  >
                    {isSummarizing ? 'Synthesizing...' : 'Generate AI Executive Summary'}
                  </button>
                )}
              </div>

              {isSummarizing ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-indigo-500 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-mono">Consolidating evaluation data & compiling brief...</p>
                </div>
              ) : summary ? (
                <div className="bg-gradient-to-br from-indigo-500/5 to-violet-500/5 p-5 rounded-xl border border-indigo-500/10 text-slate-700 dark:text-slate-300 text-xs leading-relaxed space-y-3 shadow-inner">
                  <FormattedExecutiveSummary text={summary} />
                  <p className="text-[10px] text-slate-500 italic pt-2 border-t border-indigo-500/10">Generated instantly by Enterprise LLM Consensus Agent.</p>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center rounded-xl">
                  <p className="text-xs text-slate-500">
                    No summary generated yet. Click above to let AI synthesize the entire multi-agent review into an executive brief.
                  </p>
                </div>
              )}
            </div>

            {/* Multi-Agent Evaluations (Domain Experts) */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">AI Domain-Agent Evaluations</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getAgentIcon(review.agentType)}
                          <span className="text-xs font-extrabold text-slate-850 dark:text-slate-200">
                            {getAgentLabel(review.agentType)}
                          </span>
                        </div>
                        <span className={`text-xs font-black border rounded px-2 py-0.5 ${getScoreColor(review.score * 10)}`}>
                          {review.score * 10}/100
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed italic">
                        {`"${review.analysis}"`}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-900/60 pt-3 mt-4 flex items-center justify-end text-[10px] text-slate-500 font-semibold">
                      <span>Verified Evaluation Protocol</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Discussion Board</h3>

              {/* Comment Submission form */}
              {currentUser && (
                <form onSubmit={handleAddComment} className="flex gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Contribute your feedback or ask a question..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all"
                  >
                    Post
                  </button>
                </form>
              )}

              {/* Comments list */}
              <div className="space-y-4 pt-2">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4 italic">No comments posted yet. Be the first to start the discussion!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 p-4 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-semibold">
                        <span className="text-indigo-600 dark:text-indigo-400">User #{comment.userId.split('_')[1] || comment.userId}</span>
                        <span className="text-slate-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{comment.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Side Column: Meta Score Summary & Role-Based Actions */}
          <div className="space-y-6">
            {/* Aggregate score circle card */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl text-center space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Innovation Score</h3>
              
              <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                {/* SVG Progress Ring with Dynamic Gradients */}
                <svg className="w-full h-full transform -rotate-90">
                  <defs>
                    <linearGradient id={`scoreGrad-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={gradColors.stop1} />
                      <stop offset="100%" stopColor={gradColors.stop2} />
                    </linearGradient>
                  </defs>
                  {/* Background Circle */}
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="stroke-slate-100 dark:stroke-slate-900"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  {/* Foreground Progress Circle */}
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    stroke={`url(#scoreGrad-${score})`}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                {/* Real interactive score overlaid inside */}
                <div className="absolute text-center">
                  <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">
                    {score}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold uppercase tracking-wider mt-1.5">
                    out of 100
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <p className="font-semibold text-slate-800 dark:text-slate-300">Agent Aggregate consensus reached</p>
                <p className="leading-relaxed text-[11px]">
                  Consensus generated from business viabilites, tech feasibilities, and strategic alignments.
                </p>
              </div>
            </div>

            {/* Role-Based Manager Approval & Reject Panel */}
            {(currentUser?.role === 'manager' || currentUser?.role === 'admin') && (
              <div className="bg-white dark:bg-slate-950 border border-amber-500/20 bg-amber-500/[0.01] p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Manager Controls (Simulated)
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  As a logged-in <span className="font-bold text-slate-700 dark:text-slate-300">{currentUser.role.toUpperCase()}</span>, you have authority to update the status of this idea in real-time.
                </p>

                <div className="grid grid-cols-1 gap-2.5 pt-2">
                  <button
                    onClick={() => handleUpdateStatus('approved')}
                    disabled={updatingStatus || idea.status === 'approved'}
                    className={`w-full font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      idea.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve Proposal
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('rejected')}
                    disabled={updatingStatus || idea.status === 'rejected'}
                    className={`w-full font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      idea.status === 'rejected'
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 cursor-not-allowed'
                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject Proposal
                  </button>

                  {idea.status !== 'under_review' && (
                    <button
                      onClick={() => handleUpdateStatus('under_review')}
                      disabled={updatingStatus}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all"
                    >
                      Revert to Under Review
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}

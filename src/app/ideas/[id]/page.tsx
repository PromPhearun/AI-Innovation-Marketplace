'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LayoutWrapper } from '@/components/layout-wrapper';
import AgentLoopPanel from '@/components/agent-loop-panel';
import { useUser } from '@/context/user-context';
import { useParams, useRouter } from 'next/navigation';
import { Idea, Vote, Comment, AIReview, PRD, Roadmap, ClickUpSync, ManagerComment } from '@/types';

interface ParsedSections {
  title?: string;
  problemStatement?: string;
  proposedSolution?: string;
  expectedBenefits?: string;
  implementationRecommendation?: string;
  unparsed: string[];
}

interface SlackBroadcastResult {
  success: boolean;
  channel: string;
  timestamp: string;
  message: string;
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

// Robust, dependency-free Markdown to JSX converter to satisfy OWASP safety regulations
function parseBoldText(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-extrabold text-slate-900 dark:text-white">{part}</strong>;
    }
    const italicParts = part.split(/\*(.*?)\*/g);
    return italicParts.map((ipart, iindex) => {
      if (iindex % 2 === 1) {
        return <em key={iindex} className="italic text-slate-500 dark:text-slate-400">{ipart}</em>;
      }
      return ipart;
    });
  });
}

function renderMarkdownToJSX(md: string) {
  const lines = md.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return (
        <h1 key={idx} className="text-2xl font-black text-slate-900 dark:text-white mt-6 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          {trimmed.substring(2)}
        </h1>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={idx} className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-5 mb-2.5 flex items-center gap-2">
          {trimmed.substring(3)}
        </h2>
      );
    }
    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={idx} className="text-md font-bold text-indigo-600 dark:text-indigo-400 mt-4 mb-2">
          {trimmed.substring(4)}
        </h3>
      );
    }
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      return (
        <li key={idx} className="ml-5 list-disc text-slate-750 dark:text-slate-300 text-xs leading-relaxed mb-1 font-medium">
          {parseBoldText(trimmed.substring(2))}
        </li>
      );
    }
    if (trimmed) {
      return (
        <p key={idx} className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed mb-3 font-medium">
          {parseBoldText(trimmed)}
        </p>
      );
    }
    return <div key={idx} className="h-2" />;
  });
}

const getGradientColors = (score: number) => {
  if (score >= 75) return { stop1: '#10b981', stop2: '#06b6d4' };
  if (score >= 50) return { stop1: '#f59e0b', stop2: '#10b981' };
  return { stop1: '#ef4444', stop2: '#f97316' };
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

  // Tab State
  const [activeTab, setActiveTab] = useState<'evaluation' | 'prd' | 'roadmap' | 'syndication' | 'agentLoop'>('evaluation');

  // Integration details states
  const [prd, setPrd] = useState<PRD | null>(null);
  const [isGeneratingPRD, setIsGeneratingPRD] = useState(false);

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

  const [clickup, setClickup] = useState<ClickUpSync | null>(null);
  const [isSyncingClickUp, setIsSyncingClickUp] = useState(false);

  const [isBroadcastingSlack, setIsBroadcastingSlack] = useState(false);
  const [showSlackModal, setShowSlackModal] = useState(false);
  const [slackResult, setSlackResult] = useState<SlackBroadcastResult | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Interaction states
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  // Productions Hub Transition States
  const [showImplementationModal, setShowImplementationModal] = useState(false);
  const [systemOwnerInput, setSystemOwnerInput] = useState('');
  const [backupSystemOwnerInput, setBackupSystemOwnerInput] = useState('');
  const [slackChannelInput, setSlackChannelInput] = useState('');
  const [implementedAtInput, setImplementedAtInput] = useState(new Date().toISOString().split('T')[0]);
  const [implementationError, setImplementationError] = useState<string | null>(null);
  const [appDescriptionInput, setAppDescriptionInput] = useState('');
  const [isGeneratingAppDesc, setIsGeneratingAppDesc] = useState(false);

  const [newManagerCommentText, setNewManagerCommentText] = useState('');
  const [postingManagerComment, setPostingManagerComment] = useState(false);
  const [revertingFromImplemented, setRevertingFromImplemented] = useState(false);

  // Loaders
  const fetchIdeaDetails = useCallback(async () => {
    try {
      setLoading(true);
      interface IdeaDetailsResponse {
        idea: Idea;
        votes?: Vote[];
        comments?: Comment[];
        reviews?: AIReview[];
        summary?: { summary: string };
      }
      let data: IdeaDetailsResponse | null = null;
      try {
        const res = await fetch(`/api/ideas/${id}?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          data = await res.json();
        }
      } catch (err) {
        console.error('Network error fetching details:', err);
      }

      if (data) {
        setIdea(data.idea);
        setVotes(data.votes || []);
        setComments(data.comments || []);
        setReviews(data.reviews || []);
        setSummary(data.summary?.summary || null);

      } else {
        // Fallback: Check localStorage for locally saved submission
        if (typeof window !== 'undefined') {
          try {
            const localIdeas = JSON.parse(localStorage.getItem('local_submitted_ideas') || '[]');
            const found = localIdeas.find((item: { id: string }) => item.id === id);
            if (found) {
              setIdea(found);
              setVotes(found.votes || []);
              setComments(found.comments || []);
              setReviews(found.reviews || found.evaluationResults || []);
              setSummary(found.executiveSummary || null);
              return;
            }
          } catch (e) {
            console.error('Error parsing local submitted ideas fallback:', e);
          }
        }
        setIdea(null);
      }
    } catch (err) {
      console.error('Error fetching details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchIdeaDetails();
      loadClickUp();
    }
  }, [id, fetchIdeaDetails]);

  // Tab loader triggers
  const loadPRD = async (forceRegen = false) => {
    try {
      setIsGeneratingPRD(true);
      const method = forceRegen ? 'POST' : 'GET';
      const res = await fetch(`/api/ideas/${id}/prd`, { method });
      if (res.ok) {
        const data = await res.json();
        setPrd(data);
      }
    } catch (err) {
      console.error('Error fetching/generating PRD:', err);
    } finally {
      setIsGeneratingPRD(false);
    }
  };

  const loadRoadmap = async (forceRegen = false) => {
    try {
      setIsGeneratingRoadmap(true);
      const method = forceRegen ? 'POST' : 'GET';
      const res = await fetch(`/api/ideas/${id}/roadmap`, { method });
      if (res.ok) {
        const data = await res.json();
        setRoadmap(data);
      }
    } catch (err) {
      console.error('Error fetching/generating Roadmap:', err);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const loadClickUp = async () => {
    try {
      const res = await fetch(`/api/ideas/${id}/clickup`);
      if (res.ok) {
        const data = await res.json();
        if (data.ticketKey) {
          setClickup(data);
        }
      }
    } catch (err) {
      console.error('Error loading ClickUp details:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'prd' && !prd) {
      loadPRD();
    } else if (activeTab === 'roadmap' && !roadmap) {
      loadRoadmap();
    } else if (activeTab === 'syndication') {
      loadClickUp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleVote = async (value: number) => {
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
        await fetchIdeaDetails();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };


  // Syndication Actions
  const handleSyncClickUp = async () => {
    try {
      setIsSyncingClickUp(true);
      const res = await fetch(`/api/ideas/${id}/clickup`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setClickup(data);
        showToast('Successfully generated ClickUp Epic with synced subtasks!');
        await fetchIdeaDetails();
      }
    } catch (err) {
      console.error('Error syncing with ClickUp:', err);
    } finally {
      setIsSyncingClickUp(false);
    }
  };

  const handleBroadcastSlack = async () => {
    try {
      setIsBroadcastingSlack(true);
      const res = await fetch(`/api/ideas/${id}/slack`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSlackResult(data);
        setShowSlackModal(true);
      }
    } catch (err) {
      console.error('Error broadcasting Slack message:', err);
    } finally {
      setIsBroadcastingSlack(false);
    }
  };

  const triggerSlackBroadcastFinal = () => {
    setShowSlackModal(false);
    showToast('Slack announcement broadcasted to #innovation-broadcast!');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Export functions
  const handleExportMarkdown = () => {
    if (!prd) return;
    const element = document.createElement('a');
    const file = new Blob([prd.markdown], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${idea?.title.toLowerCase().replace(/\s+/g, '_')}_prd.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('PRD downloaded as Markdown (.md) successfully!');
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Vote calculations
  const totalVotes = votes.length;
  const avgRating = totalVotes > 0 ? (votes.reduce((acc, v) => acc + v.vote, 0) / totalVotes).toFixed(1) : '0.0';
  const userVote = currentUser ? votes.find((v) => v.userId === currentUser.id)?.vote : undefined;

  // Circular progress calculations
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
        return 'Chief Finance Officer (CFO)';
      case 'feasibility':
        return 'Chief Engineering Officer (ChEO)';
      case 'employeeImpact':
        return 'Chief Human Resources Officer (CHRO)';
      case 'innovation':
        return 'Chief Compliance Officer (CCO)';
      case 'security':
        return 'Chief Security Officer (CSO)';
      case 'customerImpact':
        return 'Chief Growth Officer (CGO)';
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
      case 'innovation':
        return (
          <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'security':
        return (
          <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'customerImpact':
        return (
          <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

  const getDeptColor = (dept: string) => {
    const d = dept.toLowerCase();
    if (d.includes('product') || d.includes('architecture')) return 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900/40';
    if (d.includes('frontend') || d.includes('design')) return 'bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-900/40';
    if (d.includes('security') || d.includes('devops')) return 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/40';
    return 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/40';
  };

  return (
    <LayoutWrapper>
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl border border-slate-800 flex items-center gap-2 animate-bounce">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
          {toastMessage}
        </div>
      )}

      {/* CSS Print Stylesheet injected dynamically for PDF exports */}
      <style jsx global>{`
        @media print {
          body, html, main, #__next {
            background: white !important;
            color: black !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header, sidebar, .no-print, nav, .sidebar-wrapper, button, .tabs-bar {
            display: none !important;
          }
          .print-only-layout {
            display: block !important;
            padding: 2.5cm !important;
            width: 100% !important;
          }
          .print-title {
            font-size: 28pt !important;
            font-weight: 900 !important;
            color: #1e293b !important;
            border-bottom: 2px solid #e2e8f0 !important;
            padding-bottom: 12pt !important;
            margin-bottom: 20pt !important;
          }
          .print-meta {
            font-size: 11pt !important;
            color: #64748b !important;
            margin-bottom: 30pt !important;
          }
          .print-content h1 {
            font-size: 20pt !important;
            margin-top: 24pt !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding-bottom: 6pt !important;
          }
          .print-content h2 {
            font-size: 15pt !important;
            margin-top: 18pt !important;
          }
          .print-content p, .print-content li {
            font-size: 11pt !important;
            line-height: 1.6 !important;
            color: #334155 !important;
          }
        }
      `}</style>

      {/* Printable Only Container */}
      {prd && (
        <div className="hidden print-only-layout print-only">
          <div className="print-title">{idea.title}</div>
          <div className="print-meta">
            <strong>Department:</strong> {idea.department} | <strong>Category:</strong> {idea.category} | <strong>Innovation Score:</strong> {idea.innovationScore}/100
          </div>
          <div className="print-content">
            {renderMarkdownToJSX(prd.markdown)}
          </div>
        </div>
      )}

      {/* Main Visible Screen Layout (Disabled under printing) */}
      <div className="space-y-8 animate-fade-in no-print">
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
              {clickup && (
                <a
                  href={clickup.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#7b68ee] dark:text-[#9381ff] bg-[#7b68ee]/10 dark:bg-[#7b68ee]/20 border border-[#7b68ee]/25 dark:border-[#7b68ee]/40 px-2.5 py-1 rounded-md font-black hover:underline flex items-center gap-1.5 transition-all animate-fade-in"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                  </svg>
                  ClickUp Created: {clickup.ticketKey}
                </a>
              )}
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
          <div className="flex items-center gap-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl self-start lg:self-auto shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold px-2 uppercase tracking-wide">Rate Draft</span>
            <div className={`flex items-center gap-1 ${isVoting ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isLit = hoveredStar !== null ? star <= hoveredStar : (userVote ?? 0) >= star;
                return (
                  <button
                    key={star}
                    onClick={() => handleVote(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(null)}
                    disabled={isVoting}
                    className={`p-1 transition-all transform hover:scale-125 duration-150 ${
                      isLit
                        ? 'text-amber-500 dark:text-amber-400 scale-110'
                        : 'text-slate-300 dark:text-slate-700 hover:text-amber-400'
                    }`}
                    title={`Rate ${star} Stars`}
                  >
                    <svg
                      className="w-6 h-6 stroke-amber-500 dark:stroke-amber-400"
                      fill={isLit ? 'currentColor' : 'none'}
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </button>
                );
              })}
              <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 pl-2 pr-1">
                {avgRating}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                ({totalVotes} {totalVotes === 1 ? 'rating' : 'ratings'})
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="tabs-bar flex items-center border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('evaluation')}
            className={`flex items-center gap-1.5 font-bold text-xs py-3 px-4 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'evaluation'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Evaluation Hub
          </button>
          <button
            onClick={() => setActiveTab('prd')}
            className={`flex items-center gap-1.5 font-bold text-xs py-3 px-4 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'prd'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            AI PRD Specification
          </button>
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`flex items-center gap-1.5 font-bold text-xs py-3 px-4 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'roadmap'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Interactive Timeline Roadmap
          </button>
          <button
            onClick={() => setActiveTab('syndication')}
            className={`flex items-center gap-1.5 font-bold text-xs py-3 px-4 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'syndication'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Enterprise Syndication
          </button>

          <button
            onClick={() => setActiveTab('agentLoop')}
            className={`flex items-center gap-1.5 font-bold text-xs py-3 px-4 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'agentLoop'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.025 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m-3-3h6" />
            </svg>
            AI Agent Loop
          </button>
        </div>

        {/* Dynamic Content Switching Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* EVALUATION HUB TAB */}
            {activeTab === 'evaluation' && (
              <div className="space-y-8">
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
                    <div className="bg-gradient-to-br from-indigo-500/5 to-violet-500/5 p-5 rounded-xl border border-indigo-500/10 text-slate-700 dark:text-slate-300 text-xs leading-relaxed space-y-3 shadow-inner animate-fade-in">
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
                        className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all"
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

                {/* Comments Discussion Board */}
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Discussion Board</h3>

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

                  <div className="space-y-4 pt-2">
                    {comments.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4 italic">No comments posted yet. Be the first to start the discussion!</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 p-4 rounded-xl space-y-1.5 animate-fade-in">
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
            )}

            {/* AI PRD SPECIFICATION TAB */}
            {activeTab === 'prd' && (
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      AI-Generated Product Requirements Document
                    </h3>
                    {prd && (
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        Compiled on {new Date(prd.generatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadPRD(true)}
                      disabled={isGeneratingPRD}
                      className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1"
                      title="Force Re-generate Product Specification"
                    >
                      <svg className={`w-3.5 h-3.5 ${isGeneratingPRD ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.25} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Regenerate
                    </button>

                    {prd && (
                      <>
                        <button
                          onClick={handleExportMarkdown}
                          className="bg-indigo-600/10 hover:bg-indigo-600/25 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download MD
                        </button>
                        <button
                          onClick={handlePrintPDF}
                          className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1 shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          Export PDF
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isGeneratingPRD ? (
                  <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-250 dark:border-slate-800 space-y-4 animate-pulse">
                    <div className="w-10 h-10 rounded-full border-3 border-slate-200 border-t-indigo-500 animate-spin mx-auto" />
                    <div className="space-y-1">
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-bold font-mono">Formulating Core Functional Blueprint...</p>
                      <p className="text-[10px] text-slate-400">Specifying user stories, security bounds, architecture schemas, and KPI targets</p>
                    </div>
                  </div>
                ) : prd ? (
                  <div className="bg-slate-50/40 dark:bg-slate-900/10 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium space-y-1 shadow-inner animate-fade-in">
                    {renderMarkdownToJSX(prd.markdown)}
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center rounded-2xl">
                    <p className="text-xs text-slate-500">
                      No PRD has been generated. Press the button above to synthesize a complete professional technical spec.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* INTERACTIVE TIMELINE ROADMAP TAB */}
            {activeTab === 'roadmap' && (
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      6-Week Implementation Timeline
                    </h3>
                    {roadmap && (
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        Synthesized on {new Date(roadmap.generatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => loadRoadmap(true)}
                    disabled={isGeneratingRoadmap}
                    className="bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1 shadow-sm"
                  >
                    <svg className={`w-3.5 h-3.5 ${isGeneratingRoadmap ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.25} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Regenerate Roadmap
                  </button>
                </div>

                {isGeneratingRoadmap ? (
                  <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-pulse">
                    <div className="w-10 h-10 rounded-full border-3 border-slate-200 border-t-indigo-500 animate-spin mx-auto" />
                    <div className="space-y-1">
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-bold font-mono">Architecting Project Phases...</p>
                      <p className="text-[10px] text-slate-400">Allocating resources, mapping deliverables, and organizing parallel execution pipelines</p>
                    </div>
                  </div>
                ) : roadmap ? (
                  <div className="space-y-6 animate-fade-in">
                    {/* Visual Gantt-Style Horizontal Timeline Overview */}
                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl hidden md:block">
                      <h4 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Roadmap Phase GANTT Summary</h4>
                      <div className="grid grid-cols-4 gap-1 border-t border-slate-200 dark:border-slate-800 pt-3 relative">
                        {roadmap.phases.map((phase) => (
                          <div key={phase.phaseNumber} className="relative group cursor-pointer">
                            <div className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 mb-1">
                              {phase.weeks}
                            </div>
                            <div className="h-5 rounded-lg bg-indigo-600/15 group-hover:bg-indigo-600/25 border border-indigo-500/20 text-[9px] font-black text-indigo-700 dark:text-indigo-300 flex items-center justify-center transition-all px-1 truncate">
                              P{phase.phaseNumber}: {phase.title.substring(0, 18)}...
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Detailed Vertical Phase List */}
                    <div className="space-y-6 relative border-l-2 border-indigo-100 dark:border-indigo-900/50 pl-8 ml-3">
                      {roadmap.phases.map((phase) => (
                        <div key={phase.phaseNumber} className="relative bg-white dark:bg-slate-950 border border-slate-200/85 dark:border-slate-800/80 rounded-xl p-5 shadow-sm group hover:shadow-md transition-all">
                          {/* Circle Badge Dot on Timeline */}
                          <div className="absolute -left-12 top-5 bg-indigo-600 text-white text-[10px] font-black w-8 h-8 rounded-full border-4 border-white dark:border-slate-950 flex items-center justify-center">
                            {phase.phaseNumber}
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 dark:border-slate-900 pb-3 mb-3.5">
                            <div>
                              <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                Phase {phase.phaseNumber} • {phase.weeks}
                              </div>
                              <h4 className="text-sm font-extrabold text-slate-850 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {phase.title}
                              </h4>
                            </div>

                            <span className={`text-[10px] font-bold border rounded-md px-2 py-0.5 whitespace-nowrap self-start sm:self-auto ${getDeptColor(phase.ownerDepartment)}`}>
                              {phase.ownerDepartment}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Key Tasks */}
                            <div className="space-y-2">
                              <h5 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                Priority Implementation Tasks
                              </h5>
                              <ul className="space-y-1.5">
                                {phase.tasks.map((task, idx) => (
                                  <li key={idx} className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed flex items-start gap-1.5 font-medium">
                                    <span className="text-indigo-500 mt-1 flex-shrink-0">•</span>
                                    {task}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Deliverables */}
                            <div className="space-y-2">
                              <h5 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Hard Sign-off Deliverables
                              </h5>
                              <ul className="space-y-1.5">
                                {phase.deliverables.map((deliv, idx) => (
                                  <li key={idx} className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed flex items-start gap-1.5 font-semibold">
                                    <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {deliv}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center rounded-2xl">
                    <p className="text-xs text-slate-500">
                      No implementation timeline generated. Click above to map a multi-week visual release cycle.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* AI AGENT LOOP TAB */}
            {activeTab === 'agentLoop' && (
              <AgentLoopPanel
                ideaId={id}
                ideaTitle={idea.title}
                ideaDescription={idea.description}
              />
            )}

            {/* ENTERPRISE SYNDICATION TAB */}
            {activeTab === 'syndication' && (
              <div className="space-y-8 animate-fade-in">
                {/* ClickUp Sync Card */}
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 dark:border-slate-900 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-[#7b68ee]/10 text-[#7b68ee] rounded-xl border border-[#7b68ee]/20">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                          ClickUp Workspace Integration
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Automate workflow syndication & assign backlog tasks directly into project epics
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleSyncClickUp}
                      disabled={isSyncingClickUp}
                      className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
                        clickup
                          ? 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-250 dark:border-slate-800 hover:bg-slate-200'
                          : 'bg-[#7b68ee] hover:bg-[#6450dd] text-white'
                      }`}
                    >
                      {isSyncingClickUp ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2.25} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          Syndicating Boards...
                        </>
                      ) : clickup ? (
                        <>
                          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          Synced (Re-sync Board)
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Sync Proposal Backlog
                        </>
                      )}
                    </button>
                  </div>

                  {clickup ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-850">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">ClickUp Epic Key</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-[#7b68ee] bg-[#7b68ee]/10 border border-[#7b68ee]/20 px-2 py-0.5 rounded-md">
                              {clickup.ticketKey}
                            </span>
                            <a
                              href={clickup.ticketUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-indigo-500 font-bold hover:underline flex items-center gap-0.5"
                            >
                              Launch Board URL
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Sync Timestamp</span>
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold font-mono">
                            {new Date(clickup.syncedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Synced Backlog Subtasks list */}
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          Synced Epic Subtasks ({clickup.subtasks.length} Backlog Items)
                        </h4>

                        <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-850 rounded-xl divide-y divide-slate-100 dark:divide-slate-900 pr-1">
                          {clickup.subtasks.map((task) => (
                            <div key={task.id} className="p-3.5 flex items-center justify-between gap-3 bg-white dark:bg-slate-950/20 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                                  task.completed
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                                    : 'border-slate-300 dark:border-slate-700 text-transparent'
                                }`}>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <span className={`text-xs font-semibold ${task.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {task.text}
                                </span>
                              </div>

                              <span className={`text-[9px] font-black uppercase tracking-wider rounded px-1.5 py-0.5 ${
                                task.completed
                                  ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-500/10'
                                  : 'bg-amber-100 dark:bg-amber-950/30 text-amber-600 border border-amber-500/10'
                              }`}>
                                {task.completed ? 'Completed' : 'To Do'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-250 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        This proposal is not linked to any active project management sprints. Click the button above to generate a synced ticket backlog mapped directly from the AI timeline roadmap!
                      </p>
                    </div>
                  )}
                </div>

                {/* Slack Broadcast Card */}
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-[#e01e5a]/10 text-[#e01e5a] rounded-xl border border-[#e01e5a]/20">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                          Corporate Slack Broadcast
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Announce new spotlight concepts automatically into the corporate <strong>#innovation-broadcast</strong> channel
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleBroadcastSlack}
                      disabled={isBroadcastingSlack}
                      className="bg-[#e01e5a] hover:bg-[#c2144b] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      {isBroadcastingSlack ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2.25} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          Assembling Spotlight...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Broadcast Spotlight Announcement
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side Column: Meta Score Summary & Role-Based Actions */}
          <div className="space-y-6">
            {/* Aggregate score circle card */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl text-center space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Innovation Score</h3>
              
              <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <defs>
                    <linearGradient id={`scoreGrad-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={gradColors.stop1} />
                      <stop offset="100%" stopColor={gradColors.stop2} />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="stroke-slate-100 dark:stroke-slate-900"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
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
              <div className="bg-white dark:bg-slate-950 border border-amber-500/20 bg-amber-500/[0.01] p-6 rounded-2xl space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Manager Controls
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
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
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
                        : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md'
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
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all"
                    >
                      Revert to Under Review
                    </button>
                  )}

                  {idea.status === 'approved' && (
                    <button
                      onClick={() => {
                        setSystemOwnerInput('');
                        setBackupSystemOwnerInput('');
                        setSlackChannelInput('');
                        setImplementedAtInput(new Date().toISOString().split('T')[0]);
                        setImplementationError(null);
                        setAppDescriptionInput('');
                        setShowImplementationModal(true);
                      }}
                      disabled={updatingStatus}
                      className="w-full font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Mark as Implemented
                    </button>
                  )}

                  {/* Admin-only: Revert from Implemented back to Innovation Hub */}
                  {idea.status === 'implemented' && currentUser?.role === 'admin' && (
                    <button
                      onClick={async () => {
                        if (!currentUser || !idea) return;
                        if (!confirm('Revert this implemented app back to the Innovation Hub as "approved"? This action is admin-only.')) return;
                        setRevertingFromImplemented(true);
                        try {
                          const res = await fetch(`/api/ideas/${idea.id}/status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
                            body: JSON.stringify({ status: 'approved' }),
                          });
                          if (res.ok) {
                            showToast('App reverted to Innovation Hub (approved status).');
                            await fetchIdeaDetails();
                          } else {
                            const data = await res.json();
                            alert(data.error || 'Failed to revert');
                          }
                        } catch (e) { console.error(e); }
                        finally { setRevertingFromImplemented(false); }
                      }}
                      disabled={revertingFromImplemented}
                      className="w-full font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white shadow-md border border-orange-400/30"
                    >
                      {revertingFromImplemented ? (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                      )}
                      Revert to Innovation Hub
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Manager Comments Section */}
            {((currentUser?.role === 'manager' || currentUser?.role === 'admin') || (idea && idea.managerComment)) && (
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Manager Comments
                </h3>

                {/* Show existing manager comment thread */}
                {(() => {
                  const allComments: Array<{id: string; comment: string; authorName: string; createdAt: string}> = [];
                  // Legacy single comment
                  if (idea.managerComment) {
                    allComments.push({
                      id: 'legacy',
                      comment: idea.managerComment,
                      authorName: 'Manager',
                      createdAt: idea.createdAt,
                    });
                  }
                  // New thread comments
                  if (idea.managerComments && idea.managerComments.length > 0) {
                    idea.managerComments.forEach(mc => allComments.push({ id: mc.id, comment: mc.comment, authorName: mc.authorName, createdAt: mc.createdAt }));
                  }
                  return allComments.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {allComments.map((mc) => (
                        <div key={mc.id} className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-xl p-3 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-semibold">
                            <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              {mc.authorName}
                            </span>
                            <span className="text-slate-400">{new Date(mc.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{mc.comment}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-2">No manager comments yet.</p>
                  );
                })()}

                {/* Post new comment - manager/admin only */}
                {(currentUser?.role === 'manager' || currentUser?.role === 'admin') && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <textarea
                      value={newManagerCommentText}
                      onChange={(e) => setNewManagerCommentText(e.target.value)}
                      placeholder="Post a manager comment (cannot be edited or deleted)..."
                      maxLength={2000}
                      className="w-full h-24 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">{newManagerCommentText.length}/2000</span>
                      <button
                        onClick={async () => {
                          if (!newManagerCommentText.trim() || !currentUser || !idea) return;
                          setPostingManagerComment(true);
                          try {
                            const res = await fetch(`/api/ideas/${idea.id}/manager-comments`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
                              body: JSON.stringify({ text: newManagerCommentText.trim() }),
                            });
                            if (res.ok) {
                              setNewManagerCommentText('');
                              await fetchIdeaDetails();
                            }
                          } catch (e) { console.error(e); }
                          finally { setPostingManagerComment(false); }
                        }}
                        disabled={postingManagerComment || !newManagerCommentText.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                      >
                        {postingManagerComment ? (
                          <><svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Posting...</>
                        ) : (
                          <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>Post Comment</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SLACK MODAL SIMULATION VIEWPORT */}
      {showSlackModal && slackResult && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print animate-fade-in">
          <div className="bg-slate-900 w-full max-w-2xl rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col h-[520px]">
            {/* Window Header */}
            <div className="bg-[#121016] border-b border-slate-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-400 text-xs font-bold font-mono ml-2">Simulated Slack Workspace - Desktop App</span>
              </div>
              <button
                onClick={() => setShowSlackModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Workplace Panel Workspace Split */}
            <div className="flex-1 flex overflow-hidden">
              {/* Slack Left Sidebar */}
              <div className="w-48 bg-[#19171d] border-r border-slate-850 hidden sm:flex flex-col text-slate-450 p-3 space-y-4">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-2">Channels</div>
                  <div className="space-y-0.5">
                    <div className="text-xs px-2 py-1.5 rounded hover:bg-[#350d36] cursor-pointer font-medium flex items-center gap-1 text-slate-300">
                      <span>#</span> announcements
                    </div>
                    <div className="text-xs px-2 py-1.5 rounded bg-[#1164a3] text-white cursor-pointer font-black flex items-center gap-1 shadow-sm">
                      <span>#</span> innovation-broadcast
                    </div>
                    <div className="text-xs px-2 py-1.5 rounded hover:bg-[#350d36] cursor-pointer font-medium flex items-center gap-1 text-slate-300">
                      <span>#</span> general
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-2">Direct Messages</div>
                  <div className="space-y-0.5 text-xs">
                    <div className="px-2 py-1 rounded hover:bg-[#350d36] cursor-pointer font-medium flex items-center gap-1.5 text-slate-400">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Innovation-Bot (Apps)
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Viewport Area */}
              <div className="flex-1 bg-white text-slate-900 flex flex-col justify-between overflow-hidden">
                {/* Channel Title Bar */}
                <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-2">
                  <span className="font-extrabold text-base text-slate-800">#innovation-broadcast</span>
                  <span className="text-[10px] bg-slate-100 border text-slate-500 font-bold rounded px-1.5 py-0.5">App Integration</span>
                </div>

                {/* Feed Chat List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Message Item */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded bg-gradient-to-tr from-[#e01e5a] to-[#36c5f0] text-white font-extrabold flex items-center justify-center shadow flex-shrink-0 text-sm">
                      IB
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-black text-slate-950">Innovation Spotlight Bot</span>
                        <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 font-extrabold rounded px-1 py-px uppercase">APP</span>
                        <span className="text-[9px] text-slate-400 font-semibold font-mono">Today at {new Date(slackResult.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {/* Render simulated slack blocks */}
                      <div className="border-l-4 border-[#e01e5a] bg-slate-50 p-4 rounded-r-xl border border-slate-100 space-y-2.5 max-w-lg shadow-sm">
                        <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          🚀 New Innovation Spotlight Broadcast
                        </h4>
                        <div className="text-xs text-slate-650 font-medium">
                          <strong>Title:</strong> <strong className="text-slate-950 font-extrabold">{idea.title}</strong>
                        </div>
                        <div className="text-xs text-slate-650 font-semibold flex items-center gap-2 flex-wrap">
                          <span><strong>Category:</strong> {idea.category}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-amber-600">⭐ <strong>Innovation Score:</strong> {idea.innovationScore}/100</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed italic bg-white p-3 rounded-lg border border-slate-100">
                          {`"${idea.description.substring(0, 220)}${idea.description.length > 220 ? '...' : ''}"`}
                        </p>
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 pt-1">
                          <span>🔗 Synced via AI Marketplace Portal</span>
                        </div>
                      </div>

                      {/* Mock reactions */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] bg-slate-100 hover:bg-slate-200 cursor-pointer border rounded-full px-2 py-0.5 font-bold flex items-center gap-1">
                          🚀 <span className="text-slate-600">8</span>
                        </span>
                        <span className="text-[11px] bg-indigo-50 hover:bg-slate-100 cursor-pointer border border-indigo-100 rounded-full px-2 py-0.5 font-bold flex items-center gap-1">
                          🎉 <span className="text-indigo-600">12</span>
                        </span>
                        <span className="text-[11px] bg-slate-100 hover:bg-slate-200 cursor-pointer border rounded-full px-2 py-0.5 font-bold flex items-center gap-1">
                          🔥 <span className="text-slate-600">6</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer dispatch button */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => setShowSlackModal(false)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={triggerSlackBroadcastFinal}
                    className="bg-[#36c5f0] hover:bg-[#1bb8ea] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
                  >
                    Confirm & Publish Announcement
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MARK AS IMPLEMENTED TRANSITION MODAL */}
      {showImplementationModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Mark Proposal as Implemented
              </h3>
              <button
                onClick={() => setShowImplementationModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Move this approved idea into the <strong>Productions Hub</strong> directory. This ensures the app is fully operational and registers vital system contacts and communication channels.
            </p>

            {implementationError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {implementationError}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    System Owner <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alice Smith"
                    value={systemOwnerInput}
                    onChange={(e) => setSystemOwnerInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Backup System Owner
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bob Jones"
                    value={backupSystemOwnerInput}
                    onChange={(e) => setBackupSystemOwnerInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Indicated Slack Channel <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. #system-alerts"
                    value={slackChannelInput}
                    onChange={(e) => setSlackChannelInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-semibold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Implementation Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={implementedAtInput}
                    onChange={(e) => setImplementedAtInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            {/* App Description Field with AI Generate */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  App Description <span className="text-slate-400 font-medium normal-case">(shown in Active Apps)</span>
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    if (!idea) return;
                    setIsGeneratingAppDesc(true);
                    try {
                      const res = await fetch(`/api/ideas/${idea.id}/app-description`, { method: 'POST' });
                      if (res.ok) {
                        const data = await res.json();
                        setAppDescriptionInput(data.description || '');
                      }
                    } catch (e) { console.error(e); }
                    finally { setIsGeneratingAppDesc(false); }
                  }}
                  disabled={isGeneratingAppDesc}
                  className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-all disabled:opacity-60"
                >
                  {isGeneratingAppDesc ? (
                    <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Generating...</>
                  ) : (
                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>✨ AI Fill</>
                  )}
                </button>
              </div>
              <textarea
                value={appDescriptionInput}
                onChange={(e) => setAppDescriptionInput(e.target.value)}
                placeholder="Brief description of the live app that will appear in the Active Apps directory..."
                maxLength={500}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all resize-none"
              />
              <p className="text-[10px] text-slate-400">{appDescriptionInput.length}/500 chars</p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowImplementationModal(false)}
                disabled={updatingStatus}
                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!idea || !currentUser) return;
                  if (!systemOwnerInput.trim()) { setImplementationError('System owner is required'); return; }
                  if (!slackChannelInput.trim()) { setImplementationError('Slack channel is required'); return; }
                  if (!implementedAtInput) { setImplementationError('Implementation date is required'); return; }
                  const slackChannelFormatted = slackChannelInput.trim();
                  if (!/^#?[a-zA-Z0-9_-]+$/.test(slackChannelFormatted)) {
                    setImplementationError('Slack channel must be a valid channel name (e.g. #my-channel)');
                    return;
                  }
                  try {
                    const updatingStatus_local = true;
                    void updatingStatus_local;
                    setUpdatingStatus(true);
                    setImplementationError(null);
                    const res = await fetch(`/api/ideas/${idea.id}/status`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
                      body: JSON.stringify({
                        status: 'implemented',
                        systemOwner: systemOwnerInput.trim(),
                        backupSystemOwner: backupSystemOwnerInput.trim() || undefined,
                        slackChannel: slackChannelFormatted,
                        implementedAt: implementedAtInput,
                        appDescription: appDescriptionInput.trim() || undefined,
                      }),
                    });
                    if (res.ok) {
                      setShowImplementationModal(false);
                      setAppDescriptionInput('');
                      showToast('Idea successfully marked as Implemented!');
                      await fetchIdeaDetails();
                    } else {
                      const data = await res.json();
                      setImplementationError(data.error || 'Failed to update status');
                    }
                  } catch (err) {
                    console.error('Error marking as implemented:', err);
                    setImplementationError('Network error or server down');
                  } finally {
                    setUpdatingStatus(false);
                  }
                }}
                disabled={updatingStatus}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                {updatingStatus ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Publishing...
                  </>
                ) : (
                  'Confirm & Deploy to Hub'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutWrapper>
  );
}

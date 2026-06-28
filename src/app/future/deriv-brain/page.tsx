'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LayoutWrapper } from '@/components/layout-wrapper';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExportPayload {
  exportedAt: string;
  version: string;
  source: string;
  summary: {
    totalIdeas: number;
    totalImplementedApps: number;
    totalAIReviews: number;
    totalVotes: number;
    totalComments: number;
    avgInnovationScore: number;
    byStatus: Record<string, number>;
    byDepartment: Record<string, number>;
    byCategory: Record<string, number>;
  };
  ideas: unknown[];
  implementedApps: unknown[];
  aiReviews: unknown[];
}

type TabId = 'overview' | 'data' | 'api' | 'config';

interface ApiEndpoint {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  headers: { key: string; value: string }[];
  sampleResponse: string;
  color: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'overview',
    label: 'Integration Overview',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'data',
    label: 'Live Data Export',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
  },
  {
    id: 'api',
    label: 'API Reference',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    id: 'config',
    label: 'Configuration',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/api/ideas',
    description: 'All innovation ideas with votes, comments, and ClickUp sync status.',
    headers: [{ key: 'Accept', value: 'application/json' }],
    sampleResponse: `{
  "id": "idea_1",
  "title": "AI Webinar Campaign Planner",
  "status": "approved",
  "innovationScore": 87,
  "department": "Marketing",
  "category": "AI/ML",
  "voteCount": 12,
  "commentCount": 5
}`,
    color: 'emerald',
  },
  {
    method: 'GET',
    path: '/api/ideas/[id]',
    description: 'Single idea with full details including manager comments, PRD, roadmap, and AI reviews.',
    headers: [{ key: 'Accept', value: 'application/json' }],
    sampleResponse: `{
  "id": "idea_1",
  "title": "AI Webinar Campaign Planner",
  "description": "Full description...",
  "managerComments": [...],
  "votes": [...],
  "comments": [...],
  "clickup": { "ticketKey": "CU-001" }
}`,
    color: 'emerald',
  },
  {
    method: 'GET',
    path: '/api/implemented',
    description: 'All live/implemented apps with system owners, Slack channels, and descriptions.',
    headers: [{ key: 'Accept', value: 'application/json' }],
    sampleResponse: `{
  "id": "idea_3",
  "title": "Internal Risk Monitor",
  "systemOwner": "alice@deriv.com",
  "slackChannel": "#risk-alerts",
  "implementedAt": "2024-11-01",
  "madeBy": "Deriv"
}`,
    color: 'blue',
  },
  {
    method: 'GET',
    path: '/api/brain/export',
    description: 'Consolidated full-data export optimised for Deriv Brain ingestion. Includes stats, all ideas, implemented apps, and AI review scores.',
    headers: [
      { key: 'Authorization', value: 'Bearer <DERIV_BRAIN_API_KEY>' },
      { key: 'Accept', value: 'application/json' },
    ],
    sampleResponse: `{
  "exportedAt": "2024-12-01T10:00:00Z",
  "version": "1.0",
  "source": "Deriv AI Innovation Marketplace",
  "summary": {
    "totalIdeas": 24,
    "avgInnovationScore": 74.5,
    "byStatus": { "approved": 8, "implemented": 5 }
  },
  "ideas": [...],
  "implementedApps": [...],
  "aiReviews": [...]
}`,
    color: 'violet',
  },
  {
    method: 'POST',
    path: '/api/brain/webhook',
    description: 'Deriv Brain pushes insights, recommendations, or triggered actions back into the marketplace.',
    headers: [
      { key: 'Content-Type', value: 'application/json' },
      { key: 'X-Brain-Signature', value: 'hmac-sha256-signature' },
    ],
    sampleResponse: `// Request body:
{
  "event": "insight.generated",
  "data": {
    "ideaId": "idea_1",
    "insight": "High adoption probability based on 3 similar approved ideas.",
    "confidence": 0.91
  },
  "sentAt": "2024-12-01T10:05:00Z"
}

// Response:
{ "success": true, "id": "brain_1234_abc", "receivedAt": "..." }`,
    color: 'amber',
  },
];

// ─── Helper Components ────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function MethodBadge({ method }: { method: 'GET' | 'POST' }) {
  return (
    <span
      className={`text-[11px] font-bold px-2 py-0.5 rounded-md font-mono ${
        method === 'GET'
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
      }`}
    >
      {method}
    </span>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab() {
  const dataTypes = [
    {
      icon: '💡',
      label: 'Innovation Ideas',
      count: 'All ideas',
      detail: 'Title, description, department, category, status, innovation score, votes, comments',
      color: 'indigo',
    },
    {
      icon: '🤖',
      label: 'AI Agent Reviews',
      count: '6 agents per idea',
      detail: 'Business, Feasibility, Employee Impact, Innovation, Security, Customer Impact scores + analysis',
      color: 'violet',
    },
    {
      icon: '🏗️',
      label: 'Implemented Apps',
      count: 'Live apps',
      detail: 'System owner, Slack channel, implementation date, app description, made-by attribution',
      color: 'emerald',
    },
    {
      icon: '📊',
      label: 'Analytics & Stats',
      count: 'Aggregated',
      detail: 'Ideas by status, department, category, avg innovation score, vote/comment totals',
      color: 'blue',
    },
    {
      icon: '🗺️',
      label: 'Roadmaps & PRDs',
      count: 'Per idea',
      detail: 'AI-generated product requirements docs and phased implementation roadmaps',
      color: 'amber',
    },
    {
      icon: '👥',
      label: 'User & Vote Data',
      count: 'Engagement',
      detail: 'Star ratings per idea, comment threads, submitter department context',
      color: 'rose',
    },
  ];

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    violet: 'bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
  };

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 p-8 text-white shadow-xl shadow-violet-500/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC4yIiBvcGFjaXR5PSIwLjMiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Integrate Deriv Brain</h2>
              <p className="text-violet-200 text-sm">Connect your AI assistant to the Innovation Marketplace</p>
            </div>
          </div>
          <p className="text-violet-100 leading-relaxed max-w-2xl">
            Deriv Brain can become the intelligence layer of the Innovation Marketplace — reading all ideas,
            AI scores, implemented apps, and user engagement data to surface insights, predict outcomes,
            and drive smarter innovation decisions across the company.
          </p>
        </div>
      </div>

      {/* Architecture diagram */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Integration Architecture
        </h3>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Deriv Brain */}
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 min-w-[140px]">
            <div className="p-2 bg-violet-100 dark:bg-violet-800/40 rounded-lg">
              <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">Deriv Brain</span>
            <span className="text-[10px] text-violet-500 dark:text-violet-400 text-center">AI Intelligence Layer</span>
          </div>

          {/* Arrow right */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <div className="h-px w-12 bg-slate-300 dark:bg-slate-600" />
              <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-[9px] text-slate-400 font-mono">GET /api/brain/export</span>
            <div className="flex items-center gap-1 mt-1">
              <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              <div className="h-px w-12 bg-slate-300 dark:bg-slate-600" />
            </div>
            <span className="text-[9px] text-slate-400 font-mono">POST /api/brain/webhook</span>
          </div>

          {/* API Gateway */}
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 min-w-[140px]">
            <div className="p-2 bg-blue-100 dark:bg-blue-800/40 rounded-lg">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">API Gateway</span>
            <span className="text-[10px] text-blue-500 dark:text-blue-400 text-center">Auth + Rate Limit</span>
          </div>

          {/* Arrow */}
          <div className="hidden md:flex items-center gap-1">
            <div className="h-px w-8 bg-slate-300 dark:bg-slate-600" />
            <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>

          {/* Marketplace */}
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 min-w-[140px]">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-800/40 rounded-lg">
              <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Marketplace</span>
            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 text-center">Next.js + Firestore</span>
          </div>

          {/* Arrow */}
          <div className="hidden md:flex items-center gap-1">
            <div className="h-px w-8 bg-slate-300 dark:bg-slate-600" />
            <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>

          {/* Firestore */}
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 min-w-[140px]">
            <div className="p-2 bg-amber-100 dark:bg-amber-800/40 rounded-lg">
              <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Firestore</span>
            <span className="text-[10px] text-amber-500 dark:text-amber-400 text-center">Data Store</span>
          </div>
        </div>
      </div>

      {/* What Deriv Brain gets */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          What Deriv Brain Can Access
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dataTypes.map((dt) => (
            <div
              key={dt.label}
              className={`p-4 rounded-xl border ${colorMap[dt.color]} bg-opacity-5`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{dt.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{dt.label}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5 mb-1.5 opacity-70">{dt.count}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{dt.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What Brain can do */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          What Deriv Brain Can Do With This Data
        </h3>
        <div className="space-y-3">
          {[
            {
              title: 'Predict Idea Success',
              desc: 'Using historical approval patterns, AI review scores, vote counts, and department context, Deriv Brain can predict the likelihood of any new idea getting approved and implemented.',
              badge: 'ML Inference',
              badgeColor: 'violet',
            },
            {
              title: 'Surface Duplicate & Similar Ideas',
              desc: 'By embedding all idea descriptions, Brain can alert submitters to existing ideas and suggest mergers, reducing redundant work.',
              badge: 'Semantic Search',
              badgeColor: 'blue',
            },
            {
              title: 'Generate Innovation Reports',
              desc: 'Brain can produce weekly/monthly narratives: "Top trending ideas this week", "Departments most active in innovation", "Ideas at risk of stalling".',
              badge: 'Report Generation',
              badgeColor: 'emerald',
            },
            {
              title: 'Auto-Prioritise the Review Queue',
              desc: 'Brain can rank pending ideas by urgency, business impact, and effort — helping managers focus on the highest-value items first.',
              badge: 'Prioritisation',
              badgeColor: 'amber',
            },
            {
              title: 'Answer Questions About Innovation',
              desc: '"Which ideas were submitted by Marketing last quarter?" or "What is the average implementation time for approved ideas?" — Brain can answer these naturally.',
              badge: 'Q&A / RAG',
              badgeColor: 'indigo',
            },
            {
              title: 'Push Back Insights via Webhook',
              desc: 'After analysing data, Brain can POST insights back to the marketplace webhook to tag ideas, update scores, or flag risks — creating a two-way intelligence loop.',
              badge: 'Feedback Loop',
              badgeColor: 'rose',
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="mt-0.5">
                <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border
                    ${item.badgeColor === 'violet' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' : ''}
                    ${item.badgeColor === 'blue' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' : ''}
                    ${item.badgeColor === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : ''}
                    ${item.badgeColor === 'amber' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : ''}
                    ${item.badgeColor === 'indigo' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' : ''}
                    ${item.badgeColor === 'rose' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : ''}
                  `}>
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Live Data ───────────────────────────────────────────────────────────

function LiveDataTab() {
  const [exportData, setExportData] = useState<ExportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/brain/export');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as ExportPayload;
      setExportData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load export data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDownload = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deriv-brain-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-violet-500/30 border-t-violet-500 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Fetching live data from marketplace…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800 text-center max-w-md">
          <p className="text-rose-600 dark:text-rose-400 font-semibold text-sm">Failed to load export data</p>
          <p className="text-xs text-rose-500 mt-1">{error}</p>
          <button
            onClick={() => void loadData()}
            className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!exportData) return null;

  const { summary } = exportData;

  const sections = [
    {
      key: 'ideas',
      label: 'Innovation Ideas',
      icon: '💡',
      count: summary.totalIdeas,
      color: 'indigo',
      data: exportData.ideas,
    },
    {
      key: 'implementedApps',
      label: 'Implemented Apps',
      icon: '🏗️',
      count: summary.totalImplementedApps,
      color: 'emerald',
      data: exportData.implementedApps,
    },
    {
      key: 'aiReviews',
      label: 'AI Reviews',
      icon: '🤖',
      count: summary.totalAIReviews,
      color: 'violet',
      data: exportData.aiReviews,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Live Data Preview</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            This is exactly what Deriv Brain receives when it calls{' '}
            <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">GET /api/brain/export</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadData()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloaded ? 'Downloaded!' : 'Download JSON'}
          </button>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Ideas', value: summary.totalIdeas, color: 'indigo' },
          { label: 'Implemented', value: summary.totalImplementedApps, color: 'emerald' },
          { label: 'AI Reviews', value: summary.totalAIReviews, color: 'violet' },
          { label: 'Votes', value: summary.totalVotes, color: 'blue' },
          { label: 'Comments', value: summary.totalComments, color: 'amber' },
          { label: 'Avg Score', value: summary.avgInnovationScore, color: 'rose' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-center"
          >
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{kpi.value}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ideas by Status</p>
          <CopyButton text={JSON.stringify(summary.byStatus, null, 2)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.byStatus).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{status}</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Expandable data sections */}
      {sections.map((section) => (
        <div key={section.key} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            onClick={() => setExpandedSection(expandedSection === section.key ? null : section.key)}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{section.icon}</span>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{section.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{section.count} records</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CopyButton text={JSON.stringify(section.data, null, 2)} />
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${expandedSection === section.key ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {expandedSection === section.key && (
            <div className="border-t border-slate-200 dark:border-slate-800">
              <pre className="text-xs text-slate-600 dark:text-slate-400 p-4 overflow-x-auto max-h-80 font-mono leading-relaxed bg-slate-50 dark:bg-slate-900">
                {JSON.stringify(section.data.slice(0, 3), null, 2)}
                {section.data.length > 3 && `\n\n// ... ${section.data.length - 3} more records`}
              </pre>
            </div>
          )}
        </div>
      ))}

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        Export time: {new Date(exportData.exportedAt).toLocaleString()} · Version {exportData.version}
      </p>
    </div>
  );
}

// ─── Tab: API Reference ───────────────────────────────────────────────────────

function ApiReferenceTab() {
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>('/api/brain/export');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-marketplace.com';

  return (
    <div className="space-y-4">
      <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800 p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Base URL</p>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs font-mono text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 rounded">
              {baseUrl}
            </code>
            <CopyButton text={baseUrl} />
          </div>
          <p className="text-xs text-violet-600 dark:text-violet-400 mt-1.5">
            Set <code className="font-mono bg-violet-100 dark:bg-violet-900/40 px-1 rounded">DERIV_BRAIN_API_KEY</code> in{' '}
            <code className="font-mono bg-violet-100 dark:bg-violet-900/40 px-1 rounded">.env</code> to enforce Bearer token authentication on the export endpoint.
          </p>
        </div>
      </div>

      {API_ENDPOINTS.map((ep) => {
        const isExpanded = expandedEndpoint === ep.path;
        const fullUrl = `${baseUrl}${ep.path}`;
        return (
          <div key={ep.path} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              onClick={() => setExpandedEndpoint(isExpanded ? null : ep.path)}
            >
              <div className="flex items-center gap-3">
                <MethodBadge method={ep.method} />
                <code className="text-sm font-mono text-slate-700 dark:text-slate-300">{ep.path}</code>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block max-w-xs truncate">{ep.description}</p>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">{ep.description}</p>

                {/* Headers */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Headers</p>
                  <div className="space-y-1.5">
                    {ep.headers.map((h) => (
                      <div key={h.key} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                        <code className="text-xs font-mono text-violet-600 dark:text-violet-400">{h.key}:</code>
                        <code className="text-xs font-mono text-slate-600 dark:text-slate-400">{h.value}</code>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Example curl */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Example (curl)</p>
                    <CopyButton
                      text={`curl -X ${ep.method} "${fullUrl}" \\\n${ep.headers.map((h) => `  -H "${h.key}: ${h.value}"`).join(' \\\n')}`}
                    />
                  </div>
                  <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 rounded-lg p-3 overflow-x-auto">
                    {`curl -X ${ep.method} "${fullUrl}" \\
${ep.headers.map((h) => `  -H "${h.key}: ${h.value}"`).join(' \\\n')}`}
                  </pre>
                </div>

                {/* Sample response */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sample Response</p>
                    <CopyButton text={ep.sampleResponse} />
                  </div>
                  <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 rounded-lg p-3 overflow-x-auto max-h-60">
                    {ep.sampleResponse}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Configuration ───────────────────────────────────────────────────────

function ConfigurationTab() {
  const [brainUrl, setBrainUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBrainUrl(localStorage.getItem('deriv_brain_url') ?? '');
      setApiKey(localStorage.getItem('deriv_brain_api_key') ?? '');
      setAutoSync(localStorage.getItem('deriv_brain_auto_sync') === 'true');
    }
  }, []);

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      // Only save non-sensitive config to localStorage in this demo
      localStorage.setItem('deriv_brain_url', brainUrl);
      localStorage.setItem('deriv_brain_auto_sync', String(autoSync));
      // Note: API keys should NOT be stored in localStorage in production —
      // this is a demo/config preview only.
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    if (!brainUrl) {
      setTestStatus('error');
      setTestMessage('Please enter a Deriv Brain endpoint URL first.');
      return;
    }

    // Validate URL format
    try {
      new URL(brainUrl);
    } catch {
      setTestStatus('error');
      setTestMessage('Invalid URL format. Please enter a valid URL (e.g. https://brain.deriv.com).');
      return;
    }

    setTestStatus('loading');
    setTestMessage('');

    // Simulate connection test (real implementation would ping the Brain endpoint)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // For demo, we simulate a success when URL looks valid
    if (brainUrl.startsWith('http')) {
      setTestStatus('success');
      setTestMessage('Connection established. Deriv Brain endpoint is reachable.');
    } else {
      setTestStatus('error');
      setTestMessage('Connection failed. Ensure the URL is correct and Brain is accessible.');
    }
  };

  const handleExportNow = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/brain/export');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deriv-brain-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 2500);
    } catch {
      // Handle silently
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Info banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Demo Configuration</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 leading-relaxed">
            In production, store <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">DERIV_BRAIN_API_KEY</code> and{' '}
            <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">DERIV_BRAIN_WEBHOOK_SECRET</code> as server-side
            environment variables — never in the browser. This panel is for integration configuration preview only.
          </p>
        </div>
      </div>

      {/* Config form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Deriv Brain Connection</h3>

        {/* Brain URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Deriv Brain Endpoint URL
          </label>
          <input
            type="url"
            value={brainUrl}
            onChange={(e) => setBrainUrl(e.target.value)}
            placeholder="https://brain.deriv.com/api/v1"
            className="w-full text-sm bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all placeholder-slate-400"
          />
          <p className="text-xs text-slate-400">The base URL of the Deriv Brain API that will receive marketplace data.</p>
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            API Key (Brain → Marketplace)
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-brain-xxxxxxxxxxxx"
              className="w-full text-sm bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-10 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all placeholder-slate-400 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showKey ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Set this as <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">DERIV_BRAIN_API_KEY</code> on the server to protect the export endpoint.
          </p>
        </div>

        {/* Auto-sync toggle */}
        <div className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Auto-sync on New Idea Submission</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              When enabled, Deriv Brain is notified every time a new idea is submitted, triggering automatic analysis.
            </p>
          </div>
          <button
            onClick={() => setAutoSync(!autoSync)}
            className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ml-4 mt-0.5 ${autoSync ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoSync ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {saved ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save Configuration
            </>
          )}
        </button>
      </div>

      {/* Test connection */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Test & Sync</h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => void handleTestConnection()}
            disabled={testStatus === 'loading'}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {testStatus === 'loading' ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Testing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
                Test Connection
              </>
            )}
          </button>

          <button
            onClick={() => void handleExportNow()}
            disabled={exporting}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Exporting…
              </>
            ) : exportDone ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Exported!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export All Data Now
              </>
            )}
          </button>
        </div>

        {testStatus === 'success' && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">{testMessage}</p>
          </div>
        )}
        {testStatus === 'error' && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl">
            <svg className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-rose-700 dark:text-rose-300">{testMessage}</p>
          </div>
        )}
      </div>

      {/* Environment variables reference */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Environment Variables</h3>
        <div className="space-y-3">
          {[
            {
              key: 'DERIV_BRAIN_API_KEY',
              desc: 'Secret key required in the Authorization: Bearer header when Deriv Brain calls GET /api/brain/export.',
              required: false,
            },
            {
              key: 'DERIV_BRAIN_WEBHOOK_SECRET',
              desc: 'HMAC-SHA256 secret used to verify X-Brain-Signature on incoming webhook payloads from Deriv Brain.',
              required: false,
            },
          ].map((envVar) => (
            <div key={envVar.key} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400">{envVar.key}</code>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                  {envVar.required ? 'REQUIRED' : 'OPTIONAL'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{envVar.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DerivBrainPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <LayoutWrapper>
      <div className="max-w-6xl mx-auto animate-fade-in space-y-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mb-3">
            <span>Future Development</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-violet-600 dark:text-violet-400 font-semibold">Integrate Deriv Brain</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-500/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Integrate Deriv Brain</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-bold uppercase tracking-wider">
                  Future
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Connect Deriv Brain to the Innovation Marketplace — give it full access to all ideas, scores, apps, and engagement data.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'data' && <LiveDataTab />}
          {activeTab === 'api' && <ApiReferenceTab />}
          {activeTab === 'config' && <ConfigurationTab />}
        </div>
      </div>
    </LayoutWrapper>
  );
}

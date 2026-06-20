'use client';

import React, { useState, useEffect } from 'react';
import { LayoutWrapper } from '@/components/layout-wrapper';

interface AgentInfo {
  id: string;
  name: string;
  fullName: string;
  role: string;
  avatar: string;
  metric: string;
}

const strategicCouncil: AgentInfo[] = [
  { id: 'cfo', name: 'CFO Agent', fullName: 'Chief Financial Officer', role: 'Financial ROI', avatar: '💼', metric: 'Strategic Fit' },
  { id: 'cio', name: 'CIO Agent', fullName: 'Chief Innovation Officer', role: 'Patent & Novelty', avatar: '💡', metric: 'Novelty Score' },
  { id: 'cco', name: 'CCO Agent', fullName: 'Chief Customer Officer', role: 'User Impact', avatar: '🎯', metric: 'Adoption Rate' }
];

const executionCouncil: AgentInfo[] = [
  { id: 'cto', name: 'CTO Agent', fullName: 'Chief Technology Officer', role: 'Infra & Feasibility', avatar: '🛠️', metric: 'Feasibility' },
  { id: 'cpo', name: 'CPO Agent', fullName: 'Chief People Officer', role: 'Workload Synergy', avatar: '👥', metric: 'FTE Delta' },
  { id: 'ciso', name: 'CISO Agent', fullName: 'Chief Information Security Officer', role: 'Sec & Compliance', avatar: '🛡️', metric: 'Risk Offset' }
];

interface LoopIdea {
  title: string;
  description: string;
  expectedBenefits: string;
  department: string;
  category: string;
  score: number;
}

const loopingIdeas: LoopIdea[] = [
  {
    title: 'Zero-Knowledge Financial Audit Pipeline',
    description: 'A privacy-preserving, cryptographically secure auditing system that compiles tax and treasury ledgers into zero-knowledge proofs without exposing raw data tables.',
    expectedBenefits: 'Reduces regulatory auditing cycles from 3 months to 3 minutes with absolute data confidentiality.',
    department: 'Finance',
    category: 'Security & Compliance',
    score: 94
  },
  {
    title: 'Virtual Office Pet & Team-Building Simulator',
    description: 'An interactive virtual pet app that grows based on slack interactions, designed to promote team synergy and positive workspace habits.',
    expectedBenefits: 'Fun gamification concept; however, offers limited direct operational ROI or strategic enterprise value.',
    department: 'HR',
    category: 'Employee Engagement',
    score: 68
  },
  {
    title: 'Autonomous Legacy COBOL Code Documenter',
    description: 'Integrates specialized large language models to ingest 30-year-old COBOL scripts and automatically generate modern, high-fidelity technical specs.',
    expectedBenefits: 'Saves thousands of developer hours and eliminates institutional brain-drain of retiring legacy engineers.',
    department: 'Engineering',
    category: 'Legacy Modernization',
    score: 91
  },
  {
    title: 'Automated Social Clickbait Generator',
    description: 'Pulls current hot topics from public feeds and generates mass clickbait headlines and low-quality social outreach graphics automatically with zero review.',
    expectedBenefits: 'Increases short-term impressions; however, carries significant brand dilution and legal compliance risks.',
    department: 'Marketing',
    category: 'Content Generation',
    score: 62
  },
  {
    title: 'Real-time Fraud Behavioral Scanner',
    description: 'Analyzes micro-interaction user events, mouse movements, and payment velocities to detect botnets and compromised trading accounts before fraud occurs.',
    expectedBenefits: 'Protects customer accounts and mitigates bad debt overhead with zero false-positives.',
    department: 'Risk Management',
    category: 'Automation & Security',
    score: 87
  }
];

export default function OverviewPage() {
  const [activeStage, setActiveStage] = useState<number>(1);
  const [currentIdeaIndex, setCurrentIdeaIndex] = useState<number>(0);
  const [agentScores, setAgentScores] = useState<Record<string, number>>({});
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const currentIdea = loopingIdeas[currentIdeaIndex];

  // Main intelligence flow cycle
  useEffect(() => {
    if (isTransitioning) return;

    let intervalDuration = 4000;
    if (activeStage === 1) intervalDuration = 3500; // Submission
    if (activeStage === 2) intervalDuration = 4000; // Summarization
    if (activeStage === 3) intervalDuration = 5500; // Agent Councils
    if (activeStage === 4) intervalDuration = 3500; // Consensus scoring
    if (activeStage === 5) intervalDuration = 3500; // Decision Gate
    if (activeStage === 6) intervalDuration = 6500; // Termination outcomes

    const timer = setTimeout(() => {
      if (activeStage < 6) {
        setActiveStage(prev => prev + 1);
      } else {
        // Complete the loop! Start fading transition to next idea
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentIdeaIndex(prev => (prev + 1) % loopingIdeas.length);
          setActiveStage(1);
          setAgentScores({});
          setIsTransitioning(false);
        }, 850);
      }
    }, intervalDuration);

    return () => clearTimeout(timer);
  }, [activeStage, isTransitioning]);

  // Generate high-fidelity scores out of 100 for all agents whenever currentIdeaIndex changes
  useEffect(() => {
    const base = currentIdea.score;
    setAgentScores({
      cfo: Math.min(100, Math.max(10, Math.round(base + (Math.random() * 12 - 6)))),
      cio: Math.min(100, Math.max(10, Math.round(base + (Math.random() * 12 - 6)))),
      cco: Math.min(100, Math.max(10, Math.round(base + (Math.random() * 12 - 6)))),
      cto: Math.min(100, Math.max(10, Math.round(base + (Math.random() * 12 - 6)))),
      cpo: Math.min(100, Math.max(10, Math.round(base + (Math.random() * 12 - 6)))),
      ciso: Math.min(100, Math.max(10, Math.round(base + (Math.random() * 6 - 2))))
    });
  }, [currentIdeaIndex]);

  const approved = currentIdea.score >= 80;

  return (
    <LayoutWrapper>
      <div className="space-y-6 max-w-6xl mx-auto pb-10">
        {/* Header Block */}
        <div className="space-y-8 mb-10">
          {/* Brand Hero Welcome Area */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              &ldquo;Turn Every Employee Into an Innovator&rdquo;
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-base max-w-3xl mx-auto leading-relaxed">
              A centralized AI-powered platform where Deriv employees can submit ideas, receive instant business analysis from multiple AI agents, collaborate with colleagues, vote on innovations, and help management prioritize the most impactful initiatives.
            </p>
          </div>

          {/* Problem Statement Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Left Card: The Influx Opportunity */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">
                  The Idea Influx
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Large organizations like <span className="font-semibold text-slate-700 dark:text-slate-300">Deriv</span> generate hundreds of valuable opportunities and suggestions every year:
              </p>
              <div className="space-y-3 pt-1">
                <div className="flex gap-2.5 items-start">
                  <div className="flex items-center justify-center w-5 h-5 rounded bg-sky-500/10 text-sky-500 shrink-0 text-[11px] font-bold">1</div>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-normal">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Employees</span> have suggestions for process improvements.
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="flex items-center justify-center w-5 h-5 rounded bg-indigo-500/10 text-indigo-500 shrink-0 text-[11px] font-bold">2</div>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-normal">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Country Managers</span> identify market opportunities.
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="flex items-center justify-center w-5 h-5 rounded bg-pink-500/10 text-pink-500 shrink-0 text-[11px] font-bold">3</div>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-normal">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Support teams</span> discover customer pain points.
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="flex items-center justify-center w-5 h-5 rounded bg-purple-500/10 text-purple-500 shrink-0 text-[11px] font-bold">4</div>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-normal">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Marketing teams</span> find automation opportunities.
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="flex items-center justify-center w-5 h-5 rounded bg-amber-500/10 text-amber-500 shrink-0 text-[11px] font-bold">5</div>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-normal">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Partners</span> provide valuable feedback.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Card: The Problem Statement / Operational Friction */}
            <div className="p-6 rounded-2xl border border-rose-100 dark:border-rose-950/40 bg-rose-50/20 dark:bg-rose-950/5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <h3 className="font-extrabold text-rose-700 dark:text-rose-400 text-sm uppercase tracking-wider">
                  The Problem Statement
                </h3>
              </div>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/80 leading-normal">
                However, standard enterprise pipelines can face operational challenges:
              </p>
              <div className="space-y-3 pt-1">
                <div className="flex gap-2.5 items-start">
                  <span className="text-xs shrink-0 select-none pt-0.5">❌</span>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-normal">
                    Ideas are <span className="font-bold text-slate-800 dark:text-slate-200">scattered across Slack</span>, meetings, emails, ClickUp, and conversations.
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="text-xs shrink-0 select-none pt-0.5">❌</span>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-normal">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Similar ideas</span> are repeatedly proposed.
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="text-xs shrink-0 select-none pt-0.5">❌</span>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-normal">
                    Prioritizing and reviewing a high volume of submissions is resource-intensive.
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="text-xs shrink-0 select-none pt-0.5">❌</span>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-normal">
                    Employees <span className="font-bold text-slate-800 dark:text-slate-200">rarely know</span> whether their ideas are valuable.
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="text-xs shrink-0 select-none pt-0.5">❌</span>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-normal">
                    Good ideas <span className="font-bold text-slate-800 dark:text-slate-200">often die</span> before reaching decision-makers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section Divider with Simulation Status */}
          <div className="flex items-center gap-4 max-w-5xl mx-auto pt-4">
            <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent flex-1" />
            <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm animate-pulse shrink-0">
              Live Intelligence Simulator
            </span>
            <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent flex-1" />
          </div>
        </div>

        {/* Scrollable Container Wrapper */}
        <div className="w-full overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-sm p-1">
          {/* Locked coordinate canvas (Width: 1000px, Height: 1220px) */}
          <div 
            className={`relative w-[1000px] h-[1240px] mx-auto transition-opacity duration-700 select-none ${
              isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
          >
            {/* Blueprint Grid Background */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

            {/* SVG CONNECTION CABLES */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 1240" preserveAspectRatio="none">
              <defs>
                {/* Glow Filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Path 1: Ingestion -> Executive Summary (Straight) */}
              <path
                d="M 500,170 L 500,230"
                stroke={activeStage >= 1 ? '#0ea5e9' : '#e2e8f0'}
                className="dark:stroke-slate-800 transition-colors duration-500"
                strokeWidth="3"
                fill="none"
              />

              {/* Path 2a: Executive Summary -> Strategic Council (Left Curve) */}
              <path
                d="M 500,360 C 500,390 240,390 240,420"
                stroke={activeStage >= 2 ? '#6366f1' : '#e2e8f0'}
                className="dark:stroke-slate-800 transition-colors duration-500"
                strokeWidth="3"
                fill="none"
              />

              {/* Path 2b: Executive Summary -> Execution Council (Right Curve) */}
              <path
                d="M 500,360 C 500,390 760,390 760,420"
                stroke={activeStage >= 2 ? '#ec4899' : '#e2e8f0'}
                className="dark:stroke-slate-800 transition-colors duration-500"
                strokeWidth="3"
                fill="none"
              />

              {/* Path 3a: Strategic Council -> Consensus (Left Curve) */}
              <path
                d="M 240,600 C 240,630 500,630 500,660"
                stroke={activeStage >= 3 ? '#6366f1' : '#e2e8f0'}
                className="dark:stroke-slate-800 transition-colors duration-500"
                strokeWidth="3"
                fill="none"
              />

              {/* Path 3b: Execution Council -> Consensus (Right Curve) */}
              <path
                d="M 760,600 C 760,630 500,630 500,660"
                stroke={activeStage >= 3 ? '#ec4899' : '#e2e8f0'}
                className="dark:stroke-slate-800 transition-colors duration-500"
                strokeWidth="3"
                fill="none"
              />

              {/* Path 4: Consensus -> Decision Gate (Straight) */}
              <path
                d="M 500,800 L 500,860"
                stroke={activeStage >= 4 ? '#8b5cf6' : '#e2e8f0'}
                className="dark:stroke-slate-800 transition-colors duration-500"
                strokeWidth="3"
                fill="none"
              />

              {/* Path 5a: Decision Gate -> Implemented (Left Approved Curve) */}
              <path
                d="M 500,990 C 500,1020 240,1020 240,1050"
                stroke={activeStage >= 5 && approved ? '#10b981' : '#e2e8f0'}
                className="dark:stroke-slate-800 transition-colors duration-500"
                strokeWidth="3"
                fill="none"
                strokeDasharray={!approved && activeStage >= 5 ? '4,4' : undefined}
              />

              {/* Path 5b: Decision Gate -> Archived (Right Rejected Curve) */}
              <path
                d="M 500,990 C 500,1020 760,1020 760,1050"
                stroke={activeStage >= 5 && !approved ? '#f43f5e' : '#e2e8f0'}
                className="dark:stroke-slate-800 transition-colors duration-500"
                strokeWidth="3"
                fill="none"
                strokeDasharray={approved && activeStage >= 5 ? '4,4' : undefined}
              />

              {/* GLOWING CONNECTOR CABLE TERMINAL PORTS (ANCHOR POINTS) */}
              {/* L1 Bottom */}
              <circle cx="500" cy="170" r="4.5" className="fill-white stroke-sky-500 stroke-2 dark:fill-slate-950" />
              {/* L2 Top */}
              <circle cx="500" cy="230" r="4.5" className="fill-white stroke-sky-500 stroke-2 dark:fill-slate-950" />
              {/* L2 Bottom */}
              <circle cx="500" cy="360" r="4.5" className="fill-white stroke-purple-500 stroke-2 dark:fill-slate-950" />
              
              {/* L3 Left Strategic Top */}
              <circle cx="240" cy="420" r="4.5" className="fill-white stroke-indigo-500 stroke-2 dark:fill-slate-950" />
              {/* L3 Left Strategic Bottom */}
              <circle cx="240" cy="600" r="4.5" className="fill-white stroke-indigo-500 stroke-2 dark:fill-slate-950" />
              
              {/* L3 Right Execution Top */}
              <circle cx="760" cy="420" r="4.5" className="fill-white stroke-pink-500 stroke-2 dark:fill-slate-950" />
              {/* L3 Right Execution Bottom */}
              <circle cx="760" cy="600" r="4.5" className="fill-white stroke-pink-500 stroke-2 dark:fill-slate-950" />

              {/* L4 Consensus Top */}
              <circle cx="500" cy="660" r="4.5" className="fill-white stroke-violet-500 stroke-2 dark:fill-slate-950" />
              {/* L4 Consensus Bottom */}
              <circle cx="500" cy="800" r="4.5" className="fill-white stroke-violet-500 stroke-2 dark:fill-slate-950" />

              {/* L5 Decision Gateway Top */}
              <circle cx="500" cy="860" r="4.5" className="fill-white stroke-amber-500 stroke-2 dark:fill-slate-950" />
              {/* L5 Decision Gateway Bottom */}
              <circle cx="500" cy="990" r="4.5" className="fill-white stroke-amber-500 stroke-2 dark:fill-slate-950" />

              {/* L6 Implemented Top */}
              <circle cx="240" cy="1050" r="4.5" className="fill-white stroke-emerald-500 stroke-2 dark:fill-slate-950" />
              {/* L6 Archived Top */}
              <circle cx="760" cy="1050" r="4.5" className="fill-white stroke-rose-500 stroke-2 dark:fill-slate-950" />

              {/* ACTIVE FLOWING NEON PARTICLES */}
              {activeStage === 1 && (
                <circle r="4" fill="#0ea5e9" filter="url(#glow)">
                  <animateMotion dur="2.2s" repeatCount="indefinite" path="M 500,170 L 500,230" />
                </circle>
              )}

              {activeStage === 2 && (
                <>
                  <circle r="4" fill="#6366f1" filter="url(#glow)">
                    <animateMotion dur="2.8s" repeatCount="indefinite" path="M 500,360 C 500,390 240,390 240,420" />
                  </circle>
                  <circle r="4" fill="#ec4899" filter="url(#glow)">
                    <animateMotion dur="2.8s" repeatCount="indefinite" path="M 500,360 C 500,390 760,390 760,420" />
                  </circle>
                </>
              )}

              {activeStage === 3 && (
                <>
                  <circle r="4" fill="#6366f1" filter="url(#glow)">
                    <animateMotion dur="2.8s" repeatCount="indefinite" path="M 240,600 C 240,630 500,630 500,660" />
                  </circle>
                  <circle r="4" fill="#ec4899" filter="url(#glow)">
                    <animateMotion dur="2.8s" repeatCount="indefinite" path="M 760,600 C 760,630 500,630 500,660" />
                  </circle>
                </>
              )}

              {activeStage === 4 && (
                <circle r="4" fill="#8b5cf6" filter="url(#glow)">
                  <animateMotion dur="2.2s" repeatCount="indefinite" path="M 500,800 L 500,860" />
                </circle>
              )}

              {activeStage === 5 && (
                <>
                  {approved ? (
                    <circle r="4.5" fill="#10b981" filter="url(#glow)">
                      <animateMotion dur="2.5s" repeatCount="indefinite" path="M 500,990 C 500,1020 240,1020 240,1050" />
                    </circle>
                  ) : (
                    <circle r="4.5" fill="#f43f5e" filter="url(#glow)">
                      <animateMotion dur="2.5s" repeatCount="indefinite" path="M 500,990 C 500,1020 760,1020 760,1050" />
                    </circle>
                  )}
                </>
              )}
            </svg>

            {/* FLOW INDICATOR LABELS (PLACED MIDPOINT OVER THE CABLES) */}
            {/* Label 1 (L1 -> L2) */}
            <div className="absolute left-[500px] top-[192px] -translate-x-1/2 -translate-y-1/2 z-20">
              <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-bold tracking-wider uppercase border shadow-sm transition-all duration-300 ${
                activeStage >= 1 
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 border-sky-500/30' 
                  : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-850'
              }`}>
                vetted submission
              </span>
            </div>

            {/* Label 2a (L2 -> L3 Left) */}
            <div className="absolute left-[360px] top-[382px] -translate-x-1/2 -translate-y-1/2 z-20">
              <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-bold tracking-wider uppercase border shadow-sm transition-all duration-300 ${
                activeStage >= 2 
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' 
                  : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-850'
              }`}>
                strategic fit
              </span>
            </div>

            {/* Label 2b (L2 -> L3 Right) */}
            <div className="absolute left-[640px] top-[382px] -translate-x-1/2 -translate-y-1/2 z-20">
              <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-bold tracking-wider uppercase border shadow-sm transition-all duration-300 ${
                activeStage >= 2 
                  ? 'bg-white dark:bg-slate-900 text-pink-600 dark:text-pink-400 border-pink-500/30' 
                  : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-850'
              }`}>
                technical scan
              </span>
            </div>

            {/* Label 3a (L3 Left -> L4) */}
            <div className="absolute left-[340px] top-[622px] -translate-x-1/2 -translate-y-1/2 z-20">
              <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-bold tracking-wider uppercase border shadow-sm transition-all duration-300 ${
                activeStage >= 3 
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' 
                  : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-850'
              }`}>
                strategic weights
              </span>
            </div>

            {/* Label 3b (L3 Right -> L4) */}
            <div className="absolute left-[660px] top-[622px] -translate-x-1/2 -translate-y-1/2 z-20">
              <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-bold tracking-wider uppercase border shadow-sm transition-all duration-300 ${
                activeStage >= 3 
                  ? 'bg-white dark:bg-slate-900 text-pink-600 dark:text-pink-400 border-pink-500/30' 
                  : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-850'
              }`}>
                execution weights
              </span>
            </div>

            {/* Label 4 (L4 -> L5) */}
            <div className="absolute left-[500px] top-[822px] -translate-x-1/2 -translate-y-1/2 z-20">
              <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-bold tracking-wider uppercase border shadow-sm transition-all duration-300 ${
                activeStage >= 4 
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 border-purple-500/30' 
                  : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-850'
              }`}>
                compiled consensus
              </span>
            </div>

            {/* Label 5a (L5 -> L6 Left - Implemented) */}
            <div className="absolute left-[330px] top-[1012px] -translate-x-1/2 -translate-y-1/2 z-20">
              <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-bold tracking-wider uppercase border shadow-sm transition-all duration-300 ${
                activeStage >= 5 && approved
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-black' 
                  : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-850'
              }`}>
                meets threshold
              </span>
            </div>

            {/* Label 5b (L5 -> L6 Right - Archived) */}
            <div className="absolute left-[670px] top-[1012px] -translate-x-1/2 -translate-y-1/2 z-20">
              <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-bold tracking-wider uppercase border shadow-sm transition-all duration-300 ${
                activeStage >= 5 && !approved
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border-rose-500/30 font-black' 
                  : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-850'
              }`}>
                below threshold
              </span>
            </div>


            {/* LEVEL 1: IDEA SUBMITTED (Y: 40px) */}
            <div className="absolute left-[360px] top-[40px] w-[280px] h-[130px] z-10">
              <div
                className={`w-full h-full p-4 rounded-2xl border transition-all duration-500 flex flex-col justify-between shadow-sm bg-white dark:bg-slate-900 ${
                  activeStage === 1
                    ? 'border-sky-500 shadow-md shadow-sky-500/10 ring-1 ring-sky-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs">📥</span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Idea Submitted
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/10">
                      L1
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight">
                    {currentIdea.title}
                  </h3>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-1.5 mt-1">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase truncate max-w-[140px]">
                    {currentIdea.category}
                  </span>
                  <span className="text-[9px] font-extrabold px-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                    {currentIdea.department}
                  </span>
                </div>
              </div>
            </div>


            {/* LEVEL 2: AI EXECUTIVE SUMMARY (Y: 230px) */}
            <div className="absolute left-[360px] top-[230px] w-[280px] h-[130px] z-10">
              <div
                className={`w-full h-full p-4 rounded-2xl border transition-all duration-500 flex flex-col justify-between shadow-sm bg-white dark:bg-slate-900 ${
                  activeStage === 2
                    ? 'border-purple-500 shadow-md shadow-purple-500/10 ring-1 ring-purple-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs">✨</span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400 dark:text-purple-500">
                        Executive Digest
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/10">
                      L2
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-snug italic line-clamp-3">
                    {currentIdea.description}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-1.5">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase">
                    AI Summary Engine
                  </span>
                  <span className="text-[9px] font-bold text-purple-500">ACTIVE</span>
                </div>
              </div>
            </div>


            {/* LEVEL 3 LEFT: STRATEGIC COUNCIL (Y: 420px) */}
            <div className="absolute left-[110px] top-[420px] w-[260px] h-[180px] z-10">
              <div
                className={`w-full h-full p-4 rounded-2xl border transition-all duration-500 flex flex-col justify-between shadow-sm bg-white dark:bg-slate-900 ${
                  activeStage === 3
                    ? 'border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                      Strategic Alignment
                    </span>
                    <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/10">
                      3 Agents
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {strategicCouncil.map(agent => {
                      const score = agentScores[agent.id];
                      return (
                        <div key={agent.id} className="flex items-center justify-between gap-2 p-0.5 rounded hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm shrink-0">{agent.avatar}</span>
                            <div className="min-w-0">
                              <p className="text-[9.5px] font-bold text-slate-800 dark:text-slate-200 truncate leading-none mb-0.5">{agent.name}</p>
                              <p className="text-[8px] text-indigo-600 dark:text-indigo-400 truncate leading-none mb-0.5 font-medium">{agent.fullName}</p>
                              <p className="text-[8.5px] text-slate-500 dark:text-slate-400 truncate leading-none">{agent.role}</p>
                            </div>
                          </div>
                          {score ? (
                            <span className="text-[9.5px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {score}/100
                            </span>
                          ) : (
                            <span className="text-[8.5px] text-slate-400 dark:text-slate-600 italic">Pending</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>


            {/* LEVEL 3 RIGHT: EXECUTION COUNCIL (Y: 420px) */}
            <div className="absolute left-[630px] top-[420px] w-[260px] h-[180px] z-10">
              <div
                className={`w-full h-full p-4 rounded-2xl border transition-all duration-500 flex flex-col justify-between shadow-sm bg-white dark:bg-slate-900 ${
                  activeStage === 3
                    ? 'border-pink-500 shadow-md shadow-pink-500/10 ring-1 ring-pink-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                      Technical Feasibility
                    </span>
                    <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-500 border border-pink-500/10">
                      3 Agents
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {executionCouncil.map(agent => {
                      const score = agentScores[agent.id];
                      return (
                        <div key={agent.id} className="flex items-center justify-between gap-2 p-0.5 rounded hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm shrink-0">{agent.avatar}</span>
                            <div className="min-w-0">
                              <p className="text-[9.5px] font-bold text-slate-800 dark:text-slate-200 truncate leading-none mb-0.5">{agent.name}</p>
                              <p className="text-[8px] text-pink-600 dark:text-pink-400 truncate leading-none mb-0.5 font-medium">{agent.fullName}</p>
                              <p className="text-[8.5px] text-slate-500 dark:text-slate-400 truncate leading-none">{agent.role}</p>
                            </div>
                          </div>
                          {score ? (
                            <span className="text-[9.5px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {score}/100
                            </span>
                          ) : (
                            <span className="text-[8.5px] text-slate-400 dark:text-slate-600 italic">Pending</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>


            {/* LEVEL 4: COGNITIVE CONSENSUS (Y: 660px) */}
            <div className="absolute left-[380px] top-[660px] w-[240px] h-[140px] z-10">
              <div
                className={`w-full h-full p-4 rounded-2xl border transition-all duration-500 flex flex-col justify-between shadow-sm bg-white dark:bg-slate-900 ${
                  activeStage === 4
                    ? 'border-violet-500 shadow-md shadow-violet-500/10 ring-1 ring-violet-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                      Cognitive Consensus
                    </span>
                    <span className="text-[8px] font-bold px-1 rounded bg-violet-500/10 text-violet-500 border border-violet-500/10">
                      L4
                    </span>
                  </div>
                  <p className="text-[9.5px] text-slate-400 dark:text-slate-500 leading-normal">
                    Aggregating councils with Bayesian metrics:
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Consensus Score</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black font-mono px-2 py-0.5 rounded border transition-all bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400 font-extrabold text-base">
                      {currentIdea.score}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">/100</span>
                  </div>
                </div>
              </div>
            </div>


            {/* LEVEL 5: DECISION GATEWAY (Y: 860px) */}
            <div className="absolute left-[390px] top-[860px] w-[220px] h-[130px] z-10">
              <div
                className={`w-full h-full p-4 rounded-2xl border transition-all duration-500 flex flex-col justify-between shadow-sm bg-white dark:bg-slate-900 ${
                  activeStage === 5
                    ? 'border-amber-500 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                      Decision Gateway
                    </span>
                    <span className="text-[8px] font-bold px-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/10">
                      L5
                    </span>
                  </div>
                  <p className="text-[9.5px] text-slate-400 dark:text-slate-500 leading-normal">
                    Threshold: <span className="font-extrabold text-slate-700 dark:text-slate-300">80 / 100</span>
                  </p>
                </div>
                <div className="flex items-center justify-center pt-1">
                  <span
                    className={`text-[10.5px] font-black uppercase tracking-wider px-3 py-1 rounded-lg border-2 w-full text-center transition-all ${
                      approved
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10'
                        : 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-sm shadow-rose-500/10'
                    }`}
                  >
                    {approved ? 'APPROVED' : 'REJECTED'}
                  </span>
                </div>
              </div>
            </div>


            {/* LEVEL 6 LEFT: APPROVED -> IMPLEMENTED (Y: 1050px) */}
            <div className="absolute left-[115px] top-[1050px] w-[250px] h-[150px] z-10">
              <div
                className={`w-full h-full p-4 rounded-2xl border transition-all duration-500 flex flex-col justify-between shadow-sm bg-white dark:bg-slate-900 ${
                  activeStage === 6 && approved
                    ? 'border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/20 z-20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🚀</span>
                      <span className="text-[10px] font-extrabold uppercase text-emerald-500 tracking-wider">
                        Implemented
                      </span>
                    </div>
                    <span className="text-[8px] font-bold px-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
                      L6
                    </span>
                  </div>
                  <div className="space-y-1 text-[9.5px] text-slate-500 dark:text-slate-400 leading-tight">
                    <p className="flex items-center gap-1">✅ <span className="font-bold text-slate-700 dark:text-slate-300">PRD Spec</span>: auto-generated</p>
                    <p className="flex items-center gap-1">✅ <span className="font-bold text-slate-700 dark:text-slate-300">ClickUp Board</span>: configured</p>
                    <p className="flex items-center gap-1">✅ <span className="font-bold text-slate-700 dark:text-slate-300">Slack Stream</span>: broadcasted</p>
                  </div>
                </div>
                <div className="text-[9px] border-t border-slate-100 dark:border-slate-800/80 pt-1.5 mt-1">
                  <span className="text-emerald-500 font-extrabold uppercase tracking-wide">syndicating webhooks</span>
                </div>
              </div>
            </div>


            {/* LEVEL 6 RIGHT: REJECTED -> ARCHIVED (Y: 1050px) */}
            <div className="absolute left-[635px] top-[1050px] w-[250px] h-[150px] z-10">
              <div
                className={`w-full h-full p-4 rounded-2xl border transition-all duration-500 flex flex-col justify-between shadow-sm bg-white dark:bg-slate-900 ${
                  activeStage === 6 && !approved
                    ? 'border-rose-500 shadow-md shadow-rose-500/10 ring-1 ring-rose-500/20 z-20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">📁</span>
                      <span className="text-[10px] font-extrabold uppercase text-rose-500 tracking-wider">
                        Archived
                      </span>
                    </div>
                    <span className="text-[8px] font-bold px-1 rounded bg-rose-500/10 text-rose-500 border border-rose-500/10">
                      L6
                    </span>
                  </div>
                  <div className="space-y-1 text-[9.5px] text-slate-500 dark:text-slate-400 leading-tight">
                    <p className="flex items-center gap-1">💾 <span className="font-bold text-slate-700 dark:text-slate-300">Vector Index</span>: preserved</p>
                    <p className="flex items-center gap-1">💾 <span className="font-bold text-slate-700 dark:text-slate-300">Duplicate Check</span>: mapped</p>
                    <p className="flex items-center gap-1">💾 <span className="font-bold text-slate-700 dark:text-slate-300">Reference Corpus</span>: logged</p>
                  </div>
                </div>
                <div className="text-[9px] border-t border-slate-100 dark:border-slate-800/80 pt-1.5 mt-1">
                  <span className="text-rose-500 font-extrabold uppercase tracking-wide">preserved in search catalog</span>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}

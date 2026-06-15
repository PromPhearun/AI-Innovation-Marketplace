'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LayoutWrapper } from '@/components/layout-wrapper';
import { useUser } from '@/context/user-context';
import { useRouter } from 'next/navigation';
import { ideaSchema } from '@/utils/schemas';

interface SimilarIdeaResult {
  id: string;
  title: string;
  score: number;
}

const evaluationStages = [
  'Initializing AI Multi-Agent consensus protocols...',
  'Assigning Business Strategy Expert for market viability...',
  'Spinning up Feasibility Engineer to rate technical complexities...',
  'Deploying Employee Impact Council for cultural synergy rating...',
  'Engaging Chief Innovation Officer to review novelty aspects...',
  'Aggregating scores and writing executive summary...',
  'Finalizing sandbox deployment...'
];

export default function SubmitIdeaPage() {
  const router = useRouter();
  const { currentUser } = useUser();

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expectedBenefits, setExpectedBenefits] = useState('');
  const [department, setDepartment] = useState('engineering');
  const [category, setCategory] = useState('Process Optimization');

  // Interactive duplicate warning states
  const [similarIdeas, setSimilarIdeas] = useState<SimilarIdeaResult[]>([]);
  const [checkingSimilarity, setCheckingSimilarity] = useState(false);
  const similarityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Submission/Agent evaluation states
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationStage, setEvaluationStage] = useState(0);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Debounce similarity checking when title or description changes
  useEffect(() => {
    if (similarityTimeoutRef.current) {
      clearTimeout(similarityTimeoutRef.current);
    }

    if (title.length < 5 && description.length < 10) {
      setSimilarIdeas([]);
      return;
    }

    similarityTimeoutRef.current = setTimeout(async () => {
      try {
        setCheckingSimilarity(true);
        const res = await fetch('/api/ideas/similarity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description }),
        });

        if (res.ok) {
          const data = await res.json();
          // Filter out low scores, only show ideas with >= 30% similarity for high-fidelity alerts
          const highlySimilar = (data.similarIdeas || []).filter(
            (item: SimilarIdeaResult) => item.score >= 30
          );
          setSimilarIdeas(highlySimilar);
        }
      } catch (err) {
        console.error('Similarity check error:', err);
      } finally {
        setCheckingSimilarity(false);
      }
    }, 600); // 600ms debounce

    return () => {
      if (similarityTimeoutRef.current) {
        clearTimeout(similarityTimeoutRef.current);
      }
    };
  }, [title, description]);

  // Handle stage increments during the AI Multi-Agent loading process
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isEvaluating) {
      interval = setInterval(() => {
        setEvaluationStage((prev) => {
          if (prev < evaluationStages.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1500); // Shift stage every 1.5 seconds to simulate high-fidelity AI agent thinking
    }
    return () => clearInterval(interval);
  }, [isEvaluating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Client-side Zod validation
    const result = ideaSchema.safeParse({
      title,
      description,
      department,
      category,
      expectedBenefits: expectedBenefits || undefined,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      const formatted = result.error.format();
      if (formatted.title) errors.title = formatted.title._errors[0];
      if (formatted.description) errors.description = formatted.description._errors[0];
      if (formatted.expectedBenefits) errors.expectedBenefits = formatted.expectedBenefits._errors[0];
      setFormErrors(errors);
      return;
    }

    try {
      setIsEvaluating(true);
      setEvaluationStage(0);

      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'user_3',
        },
        body: JSON.stringify(result.data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setFormErrors({ submit: errorData.error || 'Failed to submit idea' });
        setIsEvaluating(false);
        return;
      }

      const responseData = await res.json();
      
      // Let the loader finish nicely
      setEvaluationStage(evaluationStages.length - 1);
      setTimeout(() => {
        setIsEvaluating(false);
        router.push(`/ideas/${responseData.idea.id}`);
      }, 1000);

    } catch (err) {
      console.error('Error submitting idea:', err);
      setFormErrors({ submit: 'Network error submitting idea. Please try again.' });
      setIsEvaluating(false);
    }
  };

  const highSimilarityWarningExists = similarIdeas.some((item) => item.score >= 50);

  return (
    <LayoutWrapper>
      {isEvaluating ? (
        /* Multi-Agent Sandbox Evaluation Screening Loader */
        <div className="flex flex-col items-center justify-center min-h-[70vh] bg-slate-950 rounded-3xl border border-slate-800 p-8 text-center space-y-8 animate-fade-in">
          <div className="relative">
            {/* Pulsing glow behind spinner */}
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />
            <div className="w-24 h-24 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin relative z-10" />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400">
              AGENT DB
            </span>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            <h2 className="text-2xl font-extrabold text-white tracking-tight animate-pulse">
              AI Multi-Agent Evaluation Active
            </h2>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-slate-300 font-mono text-xs text-left h-24 flex items-center shadow-inner">
              <span className="animate-fade-in-fast">{evaluationStages[evaluationStage]}</span>
            </div>
            <p className="text-xs text-slate-500">
              Four specialized domain-specific LLM agents are currently reviewing your idea draft. Do not close this page.
            </p>
          </div>
        </div>
      ) : (
        /* Normal Submission Form Page */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Side */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Submit Your Innovation Draft</h1>
              <p className="text-slate-400 mt-1 text-sm">
                Fill in the details below. Our AI Multi-Agent system will immediately analyze and score your proposal.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-6">
              {formErrors.submit && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl font-semibold">
                  {formErrors.submit}
                </div>
              )}

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-bold uppercase tracking-wider block">Idea Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dynamic Shift Rotation Optimization with AI Scheduling"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full bg-slate-900 border ${
                    formErrors.title ? 'border-rose-500' : 'border-slate-800'
                  } rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-500`}
                />
                {formErrors.title ? (
                  <p className="text-xs text-rose-400 font-medium">{formErrors.title}</p>
                ) : (
                  <p className="text-[10px] text-slate-500">Must be at least 5 characters. Be clear and specific.</p>
                )}
              </div>

              {/* Department & Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Department */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold uppercase tracking-wider block">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-medium"
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
                  <label className="text-xs text-slate-300 font-bold uppercase tracking-wider block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                  >
                    <option value="Process Optimization">Process Optimization</option>
                    <option value="Product Innovation">Product Innovation</option>
                    <option value="Sustainability">Sustainability</option>
                    <option value="Cost Reduction">Cost Reduction</option>
                    <option value="Employee Engagement">Employee Engagement</option>
                  </select>
                </div>
              </div>

              {/* Description Input */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-bold uppercase tracking-wider block">Detailed Proposal</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Provide a detailed overview of the idea, describing the problem it solves, how it will be implemented, and any operational challenges it resolves."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full bg-slate-900 border ${
                    formErrors.description ? 'border-rose-500' : 'border-slate-800'
                  } rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-500 leading-relaxed`}
                />
                {formErrors.description ? (
                  <p className="text-xs text-rose-400 font-medium">{formErrors.description}</p>
                ) : (
                  <p className="text-[10px] text-slate-500">Must be at least 15 characters.</p>
                )}
              </div>

              {/* Expected Benefits Input */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-bold uppercase tracking-wider block">
                  Expected Benefits (Metrics / Value Addition)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Reduces scheduling turnaround by 40%, increases employee department satisfaction index by 15%."
                  value={expectedBenefits}
                  onChange={(e) => setExpectedBenefits(e.target.value)}
                  className={`w-full bg-slate-900 border ${
                    formErrors.expectedBenefits ? 'border-rose-500' : 'border-slate-800'
                  } rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-500 leading-relaxed`}
                />
                {formErrors.expectedBenefits && (
                  <p className="text-xs text-rose-400 font-medium">{formErrors.expectedBenefits}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEvaluating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  Evaluate & Submit
                </button>
              </div>
            </form>
          </div>

          {/* Right Side: Similarity & Duplicate Alert Sandbox */}
          <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Duplicate Engine Sandbox</h3>
                {checkingSimilarity && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                    <span className="text-[10px] text-slate-500 font-semibold">Running comparison...</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                As you fill out your draft proposal, the AI Sandbox compares your ideas in real-time with existing submissions to prevent redundant duplicates.
              </p>

              {similarIdeas.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <div
                    className={`p-4 rounded-xl border ${
                      highSimilarityWarningExists
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    } flex items-start gap-3`}
                  >
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        {highSimilarityWarningExists ? 'CRITICAL DUPLICATE DETECTED' : 'POTENTIAL SIMILAR IDEAS'}
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {highSimilarityWarningExists
                          ? 'A highly similar proposal already exists. We strongly advise merging features into the existing proposal to avoid rejection.'
                          : 'Some overlapping ideas have been found. Review them to ensure your proposal offers unique value.'}
                      </p>
                    </div>
                  </div>

                  {/* List of similar ideas */}
                  <div className="space-y-2">
                    {similarIdeas.map((idea) => (
                      <div
                        key={idea.id}
                        className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-4 hover:border-slate-700 cursor-pointer transition-colors"
                        onClick={() => router.push(`/ideas/${idea.id}`)}
                      >
                        <span className="text-xs text-slate-300 font-semibold truncate hover:underline">
                          {idea.title}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${
                            idea.score >= 50
                              ? 'text-rose-400 border-rose-500/20 bg-rose-500/5'
                              : 'text-amber-400 border-amber-500/20 bg-amber-500/5'
                          }`}
                        >
                          {idea.score}% Match
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-slate-800 p-8 text-center rounded-xl">
                  <svg className="w-8 h-8 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <p className="text-[11px] text-slate-500">
                    Draft proposal is fully unique! No duplicates detected yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </LayoutWrapper>
  );
}

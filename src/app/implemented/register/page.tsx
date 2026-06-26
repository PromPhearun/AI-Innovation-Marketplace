'use client';

import React, { useState } from 'react';
import { LayoutWrapper } from '@/components/layout-wrapper';
import { useUser } from '@/context/user-context';
import { useRouter } from 'next/navigation';
import { implementedAppSchema } from '@/utils/schemas';

export default function RegisterImplementedPage() {
  const router = useRouter();
  const { currentUser } = useUser();

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('engineering');
  const [category, setCategory] = useState('Process Optimization');
  const [systemOwner, setSystemOwner] = useState('');
  const [backupSystemOwner, setBackupSystemOwner] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [madeBy, setMadeBy] = useState<'Deriv' | 'Third Party'>('Deriv');
  const [implementedAt, setImplementedAt] = useState(() => {
    return new Date().toISOString().substring(0, 10); // Default to today
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSuccessMsg('');

    // Client-side Zod validation
    const result = implementedAppSchema.safeParse({
      title,
      description,
      department,
      category,
      systemOwner,
      backupSystemOwner: backupSystemOwner || undefined,
      slackChannel,
      implementedAt,
      madeBy,
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
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch('/api/implemented', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'user_3',
        },
        body: JSON.stringify(result.data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setFormErrors({ submit: errorData.error || 'Failed to register the implemented app' });
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg('App successfully registered in the Project Directory!');
      
      // Redirect to implemented page after brief success message
      setTimeout(() => {
        router.push('/implemented');
      }, 1500);

    } catch (err) {
      console.error('Error submitting implemented app:', err);
      setFormErrors({ submit: 'Network error submitting details. Please try again.' });
      setIsSubmitting(false);
    }
  };

  return (
    <LayoutWrapper>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Register Built App
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Manually key in an existing operational system/app that has already been built and deployed. This registers it directly into the Implemented Hub (Project Directory).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-6 shadow-sm">
          {formErrors.submit && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-semibold animate-fade-in">
              {formErrors.submit}
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl font-semibold animate-fade-in">
              {successMsg}
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider block">
              App Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Deriv CRM Loyalty Portal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full bg-white dark:bg-slate-900 border ${
                formErrors.title ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
              } rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500`}
            />
            {formErrors.title ? (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{formErrors.title}</p>
            ) : (
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Must be at least 5 characters.</p>
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
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-medium"
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
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-medium"
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
            <label className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider block">
              System Description & Purpose
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe what the system does, its technical stack, and who are the target users."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full bg-white dark:bg-slate-900 border ${
                formErrors.description ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
              } rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-relaxed`}
            />
            {formErrors.description ? (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{formErrors.description}</p>
            ) : (
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Must be at least 20 characters.</p>
            )}
          </div>

          {/* Ownership Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-900 pt-4">
            {/* System Owner */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider block">
                System Owner
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sarah Chen"
                value={systemOwner}
                onChange={(e) => setSystemOwner(e.target.value)}
                className={`w-full bg-white dark:bg-slate-900 border ${
                  formErrors.systemOwner ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                } rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500`}
              />
              {formErrors.systemOwner && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{formErrors.systemOwner}</p>
              )}
            </div>

            {/* Backup System Owner */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider block">
                Backup System Owner
              </label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={backupSystemOwner}
                onChange={(e) => setBackupSystemOwner(e.target.value)}
                className={`w-full bg-white dark:bg-slate-900 border ${
                  formErrors.backupSystemOwner ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                } rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500`}
              />
              {formErrors.backupSystemOwner && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{formErrors.backupSystemOwner}</p>
              )}
            </div>
          </div>

          {/* Made By */}
          <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-900 pt-4">
            <label className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider block">
              Made By
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMadeBy('Deriv')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                  madeBy === 'Deriv'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-600'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Deriv
              </button>
              <button
                type="button"
                onClick={() => setMadeBy('Third Party')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                  madeBy === 'Third Party'
                    ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-violet-400 dark:hover:border-violet-600'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Third Party
              </button>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Select whether this app was built by Deriv or an external third party.</p>
          </div>

          {/* Communication & Launch Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Slack Channel */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider block">
                Indicated Slack Channel
              </label>
              <input
                type="text"
                required
                placeholder="e.g. #proj-loyalty-portal"
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                className={`w-full bg-white dark:bg-slate-900 border ${
                  formErrors.slackChannel ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                } rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500`}
              />
              {formErrors.slackChannel && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{formErrors.slackChannel}</p>
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
                value={implementedAt}
                onChange={(e) => setImplementedAt(e.target.value)}
                className={`w-full bg-white dark:bg-slate-900 border ${
                  formErrors.implementedAt ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                } rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all`}
              />
              {formErrors.implementedAt && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{formErrors.implementedAt}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-900">
            <button
              type="button"
              onClick={() => router.push('/implemented')}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? 'Registering...' : 'Register App'}
            </button>
          </div>
        </form>
      </div>
    </LayoutWrapper>
  );
}

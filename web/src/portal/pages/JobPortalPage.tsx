import React, { useState } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  MapPin,
  Clock,
  Sparkles,
  FileText,
  CheckCircle,
  Building,
  DollarSign,
  Send,
  X,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { usePortalStore } from '../store/portalStore';
import { Job } from '../types';
import { ResumeBuilderModal } from '../components/ResumeBuilderModal';

export function JobPortalPage() {
  const jobs = usePortalStore((s) => s.jobs);
  const applications = usePortalStore((s) => s.applications);
  const currentUser = usePortalStore((s) => s.currentUser);
  const applyForJob = usePortalStore((s) => s.applyForJob);

  const [activeTab, setActiveTab] = useState<'listings' | 'applications'>('listings');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobForApply, setSelectedJobForApply] = useState<Job | null>(null);
  const [coverNote, setCoverNote] = useState('');
  const [showResumeBuilder, setShowResumeBuilder] = useState(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState(false);

  const CATEGORIES = ['All', 'Remote work', 'Part-time', 'Full-time', 'Freelance', 'Leadership'];

  // AI Skill Matching Calculation
  const calculateMatchScore = (jobSkills: string[]) => {
    if (!currentUser.skills || currentUser.skills.length === 0) return 65;
    const userSkillsLower = currentUser.skills.map((s) => s.toLowerCase());
    const matches = jobSkills.filter((js) =>
      userSkillsLower.some((us) => js.toLowerCase().includes(us) || us.includes(js.toLowerCase()))
    );
    const score = Math.round((matches.length / jobSkills.length) * 100);
    return Math.max(60, Math.min(98, score || 72));
  };

  const filteredJobs = jobs.filter((j) => {
    const matchesCat = selectedCategory === 'All' || j.type === selectedCategory;
    const matchesSearch =
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.skillsRequired.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobForApply) return;
    applyForJob(selectedJobForApply.id, coverNote);
    setApplySuccessMessage(true);
    setTimeout(() => {
      setApplySuccessMessage(false);
      setSelectedJobForApply(null);
      setCoverNote('');
      setActiveTab('applications');
    }, 1200);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
            <Briefcase className="size-3.5" />
            <span>Inclusive Career Opportunities</span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Verified Women-Inclusive Job Portal
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Equal-pay certified roles, returnship programs, remote work, and executive opportunities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResumeBuilder(true)}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:from-rose-600 hover:to-purple-700"
          >
            <FileText className="size-4" /> AI Resume Builder
          </button>
        </div>
      </div>

      {/* Tabs: Job Listings vs My Applications */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('listings')}
            className={`border-b-2 pb-3 text-sm font-bold transition ${
              activeTab === 'listings'
                ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Explore Openings ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold transition ${
              activeTab === 'applications'
                ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <span>My Applications</span>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              {applications.length}
            </span>
          </button>
        </div>

        {activeTab === 'listings' && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by title, skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs outline-none focus:border-purple-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        )}
      </div>

      {activeTab === 'listings' ? (
        <div className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Jobs List */}
          <div className="space-y-4">
            {filteredJobs.map((job) => {
              const matchScore = calculateMatchScore(job.skillsRequired);
              const hasApplied = applications.some((a) => a.jobId === job.id);

              return (
                <div
                  key={job.id}
                  className="flex flex-col justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-purple-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        {job.type}
                      </span>
                      {job.urgency === 'Urgent' && (
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                          Urgent Hiring
                        </span>
                      )}
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <Sparkles className="size-3" /> AI Match: {matchScore}%
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {job.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <Building className="size-3.5" /> {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5" /> {job.location}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400">
                        <DollarSign className="size-3.5" /> {job.salary}
                      </span>
                      <span className="text-slate-400">• Posted {job.postedDate}</span>
                    </div>

                    <p className="max-w-3xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {job.description}
                    </p>

                    {/* Perks & Skills */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {job.perks.map((perk, i) => (
                        <span
                          key={i}
                          className="rounded-lg bg-pink-50 px-2 py-0.5 text-[10px] font-semibold text-pink-700 dark:bg-pink-950/60 dark:text-pink-300"
                        >
                          ✓ {perk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 md:items-end">
                    {hasApplied ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle className="size-4" /> Already Applied
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedJobForApply(job)}
                        className="rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-purple-700"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Applications Tracker Tab */
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <Briefcase className="mx-auto size-12 text-slate-300" />
              <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">No Applications Yet</h3>
              <p className="mt-1 text-xs text-slate-500">Explore openings and apply with your AI-optimized resume.</p>
              <button
                onClick={() => setActiveTab('listings')}
                className="mt-4 rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-700"
              >
                Browse Job Listings
              </button>
            </div>
          ) : (
            applications.map((app) => (
              <div
                key={app.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center"
              >
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{app.jobTitle}</h4>
                  <p className="text-xs text-slate-500">{app.company} · Applied on {app.appliedDate}</p>
                  {app.coverNote && (
                    <p className="mt-2 text-xs italic text-slate-600 dark:text-slate-400">
                      "{app.coverNote}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      app.status === 'Interview Scheduled'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : app.status === 'Under Review'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    Status: {app.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Apply Modal */}
      {selectedJobForApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8">
            <button
              onClick={() => setSelectedJobForApply(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="size-5" />
            </button>

            <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
              <span className="text-xs font-bold text-purple-600">Quick Job Application</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedJobForApply.title}
              </h3>
              <p className="text-xs text-slate-500">{selectedJobForApply.company} · {selectedJobForApply.location}</p>
            </div>

            {applySuccessMessage && (
              <div className="my-4 rounded-xl bg-emerald-50 p-3 text-center text-xs font-bold text-emerald-700">
                ✓ Application submitted successfully! Good luck!
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="mt-5 space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Applicant Details:</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{currentUser.name} ({currentUser.email})</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {currentUser.skills.map((s, idx) => (
                    <span key={idx} className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Custom Cover Note or Message to Hiring Team
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Introduce yourself, why you want to work at this company, and relevant experience..."
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-purple-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Attached: System ATS Resume ({currentUser.name})</span>
                <button
                  type="button"
                  onClick={() => setShowResumeBuilder(true)}
                  className="font-bold text-purple-600 hover:underline"
                >
                  Edit Resume
                </button>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedJobForApply(null)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-purple-700"
                >
                  <Send className="size-3.5" /> Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resume Builder Modal */}
      {showResumeBuilder && (
        <ResumeBuilderModal
          isOpen={showResumeBuilder}
          onClose={() => setShowResumeBuilder(false)}
        />
      )}
    </div>
  );
}

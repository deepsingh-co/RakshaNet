import React from 'react';
import {
  GraduationCap,
  Briefcase,
  Scale,
  HeartPulse,
  Users,
  ShieldAlert,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Award,
  Activity,
  Smile,
  FileText,
  UserCheck,
} from 'lucide-react';
import { usePortalStore } from '../store/portalStore';

interface DashboardPageProps {
  onNavigate: (module: string) => void;
  onOpenSos: () => void;
  onOpenResumeBuilder?: () => void;
}

export function DashboardPage({ onNavigate, onOpenSos, onOpenResumeBuilder }: DashboardPageProps) {
  const currentUser = usePortalStore((s) => s.currentUser);
  const courses = usePortalStore((s) => s.courses);
  const enrolledCourseIds = usePortalStore((s) => s.enrolledCourseIds);
  const courseProgress = usePortalStore((s) => s.courseProgress);
  const applications = usePortalStore((s) => s.applications);
  const appointments = usePortalStore((s) => s.appointments);
  const moodLogs = usePortalStore((s) => s.moodLogs);
  const incidents = usePortalStore((s) => s.incidents);
  const allUsers = usePortalStore((s) => s.allUsers);

  const enrolledCourses = courses.filter((c) => enrolledCourseIds.includes(c.id));
  const latestMood = moodLogs[0];

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-700 p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="size-3.5 text-amber-300" />
              <span>Role: {currentUser.role} View</span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl md:text-4xl">
              Welcome back, {currentUser.name}!
            </h1>
            <p className="mt-2 max-w-xl text-xs text-rose-100 sm:text-sm">
              {currentUser.role === 'Beneficiary' &&
                'Track your learning journey, apply for verified women-inclusive jobs, and stay protected with our 24x7 safety network.'}
              {currentUser.role === 'Mentor' &&
                'Empower female talents, conduct 1-on-1 career guidance sessions, and shape future women leaders in STEM & Business.'}
              {currentUser.role === 'Admin' &&
                'Oversee platform health, audit emergency response logs, manage user privileges, and track national empowerment metrics.'}
              {currentUser.role === 'Volunteer' &&
                'Support local community distress alerts, verify safe zones, and guide women to legal and healthcare aid.'}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <button
              onClick={onOpenSos}
              className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-bold text-red-600 shadow-lg transition hover:bg-red-50 active:scale-95 sm:text-sm"
            >
              <ShieldAlert className="size-4 animate-pulse" />
              <span>Trigger Emergency SOS</span>
            </button>
            <button
              onClick={() => onNavigate('education')}
              className="rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:text-sm"
            >
              Explore Courses
            </button>
          </div>
        </div>
      </div>

      {/* Role-Specific Views */}
      {currentUser.role === 'Beneficiary' && (
        <BeneficiaryDashboardView
          enrolledCourses={enrolledCourses}
          courseProgress={courseProgress}
          applications={applications}
          appointments={appointments}
          latestMood={latestMood}
          onNavigate={onNavigate}
          onOpenResumeBuilder={onOpenResumeBuilder}
        />
      )}

      {currentUser.role === 'Mentor' && (
        <MentorDashboardView
          onNavigate={onNavigate}
        />
      )}

      {currentUser.role === 'Admin' && (
        <AdminDashboardView
          allUsers={allUsers}
          incidents={incidents}
          onNavigate={onNavigate}
        />
      )}

      {currentUser.role === 'Volunteer' && (
        <VolunteerDashboardView
          incidents={incidents}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}

// 1. Beneficiary View
function BeneficiaryDashboardView({
  enrolledCourses,
  courseProgress,
  applications,
  appointments,
  latestMood,
  onNavigate,
  onOpenResumeBuilder,
}: any) {
  return (
    <>
      {/* Real-time KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Enrolled Courses</span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <GraduationCap className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {enrolledCourses.length}
            </span>
            <span className="text-xs font-semibold text-emerald-600">Active</span>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Job Applications</span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <Briefcase className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {applications.length}
            </span>
            <span className="text-xs font-semibold text-purple-600">In Review</span>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Doctor Bookings</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <HeartPulse className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {appointments.length}
            </span>
            <span className="text-xs font-semibold text-blue-600">Confirmed</span>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Mind &amp; Mood Status</span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Smile className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {latestMood ? latestMood.mood : 'Calm'}
            </span>
            <span className="text-xs font-semibold text-amber-600">7-Day Streak</span>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Quick Actions &amp; Services
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <button
            onClick={() => onNavigate('education')}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center transition hover:border-rose-200 hover:bg-rose-50/50 dark:border-slate-800 dark:bg-slate-800/40"
          >
            <div className="rounded-xl bg-rose-500 p-2.5 text-white">
              <GraduationCap className="size-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Study Course</span>
          </button>

          <button
            onClick={() => onNavigate('jobs')}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center transition hover:border-purple-200 hover:bg-purple-50/50 dark:border-slate-800 dark:bg-slate-800/40"
          >
            <div className="rounded-xl bg-purple-600 p-2.5 text-white">
              <Briefcase className="size-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Find Jobs</span>
          </button>

          <button
            onClick={onOpenResumeBuilder}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center transition hover:border-pink-200 hover:bg-pink-50/50 dark:border-slate-800 dark:bg-slate-800/40"
          >
            <div className="rounded-xl bg-pink-500 p-2.5 text-white">
              <FileText className="size-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">AI Resume</span>
          </button>

          <button
            onClick={() => onNavigate('legal')}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center transition hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-800/40"
          >
            <div className="rounded-xl bg-indigo-600 p-2.5 text-white">
              <Scale className="size-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Know Rights</span>
          </button>

          <button
            onClick={() => onNavigate('mental-health')}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center transition hover:border-teal-200 hover:bg-teal-50/50 dark:border-slate-800 dark:bg-slate-800/40"
          >
            <div className="rounded-xl bg-teal-600 p-2.5 text-white">
              <Activity className="size-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Therapist</span>
          </button>

          <button
            onClick={() => onNavigate('finance')}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center transition hover:border-amber-200 hover:bg-amber-50/50 dark:border-slate-800 dark:bg-slate-800/40"
          >
            <div className="rounded-xl bg-amber-600 p-2.5 text-white">
              <DollarSign className="size-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Govt Grants</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Courses Progress & Job Track */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active Learning Progress */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Courses &amp; Progress</h3>
            <button
              onClick={() => onNavigate('education')}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline"
            >
              Browse all <ArrowRight className="size-3.5" />
            </button>
          </div>
          <div className="mt-5 space-y-4">
            {enrolledCourses.length === 0 ? (
              <p className="text-xs text-slate-400">You haven't enrolled in any courses yet.</p>
            ) : (
              enrolledCourses.map((c: any) => {
                const progress = courseProgress[c.id] || 0;
                return (
                  <div
                    key={c.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{c.title}</h4>
                        <p className="text-[11px] text-slate-500">Instructor: {c.instructor}</p>
                      </div>
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        {progress}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 to-purple-600 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{c.duration} total duration</span>
                      {progress === 100 ? (
                        <span className="flex items-center gap-1 font-bold text-emerald-600">
                          <CheckCircle className="size-3.5" /> Completed · Certificate Ready
                        </span>
                      ) : (
                        <button
                          onClick={() => onNavigate('education')}
                          className="font-bold text-rose-600 hover:underline"
                        >
                          Continue Learning →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Job Applications Tracker */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Job Applications</h3>
            <button
              onClick={() => onNavigate('jobs')}
              className="flex items-center gap-1 text-xs font-bold text-purple-600 hover:underline"
            >
              View jobs <ArrowRight className="size-3.5" />
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {applications.length === 0 ? (
              <p className="text-xs text-slate-400">No applications submitted yet.</p>
            ) : (
              applications.map((app: any) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{app.jobTitle}</h4>
                    <p className="text-[11px] text-slate-500">{app.company} · Applied {app.appliedDate}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      app.status === 'Interview Scheduled'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : app.status === 'Under Review'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// 2. Mentor View
function MentorDashboardView({ onNavigate }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500">Active Mentees</div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">12</div>
          <p className="text-[11px] text-emerald-600">+3 this month</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500">Sessions Hosted</div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">48 hrs</div>
          <p className="text-[11px] text-purple-600">100% attendance</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500">Mentorship Rating</div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">4.95 ★</div>
          <p className="text-[11px] text-amber-600">32 student reviews</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500">Pending Requests</div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">4</div>
          <p className="text-[11px] text-rose-600">Requires review</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">My Assigned Mentees &amp; Goals</h3>
        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                alt="Mentee"
                className="size-10 rounded-full object-cover"
              />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Ananya Sharma</p>
                <p className="text-[11px] text-slate-500">Goal: Frontend Developer Role · React Bootcamp</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('community')}
              className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300"
            >
              Open Mentee Log
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80"
                alt="Mentee"
                className="size-10 rounded-full object-cover"
              />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Sneha Patel</p>
                <p className="text-[11px] text-slate-500">Goal: Career Returnship after 3-year break</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('community')}
              className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300"
            >
              Open Mentee Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. Admin View
function AdminDashboardView({ allUsers, incidents, onNavigate }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500">Registered Users</div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{allUsers.length * 3120}</div>
          <p className="text-[11px] text-emerald-600">99.4% Active Ratio</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500">Emergency Dispatches</div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">1,412</div>
          <p className="text-[11px] text-rose-600">Zero unresolved alarms</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500">Successful Placements</div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">840+</div>
          <p className="text-[11px] text-purple-600">Average CTC: ₹8.4 LPA</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500">System Gateway Uptime</div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">99.98%</div>
          <p className="text-[11px] text-emerald-600">SMS &amp; GPS Online</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Safety Incidents &amp; Triage</h3>
            <button onClick={() => onNavigate('admin')} className="text-xs font-bold text-rose-600 hover:underline">
              Manage in Admin Panel →
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {incidents.map((inc: any) => (
              <div
                key={inc.id}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{inc.type}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    {inc.status}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{inc.location} · {inc.date}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Quick Admin Controls</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('admin')}
              className="flex items-center gap-2 rounded-xl bg-purple-50 p-3 text-xs font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300"
            >
              <UserCheck className="size-4" /> Manage User Roles
            </button>
            <button
              onClick={() => onNavigate('admin')}
              className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300"
            >
              <FileText className="size-4" /> Review Audit Logs
            </button>
            <button
              onClick={() => onNavigate('analytics')}
              className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
            >
              <TrendingUp className="size-4" /> National Impact Reports
            </button>
            <button
              onClick={() => onNavigate('safety')}
              className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300"
            >
              <ShieldAlert className="size-4" /> Emergency Broadcast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 4. Volunteer View
function VolunteerDashboardView({ incidents, onNavigate }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500">Volunteer Hours Logged</div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">64 hrs</div>
          <p className="text-[11px] text-emerald-600">Level 2 Field Responder</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500">Active Support Queue</div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">3 cases</div>
          <p className="text-[11px] text-amber-600">Pending shelter link</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500">Community Workshops</div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">8 held</div>
          <p className="text-[11px] text-purple-600">420 women trained</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500">Safe Zones Verified</div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">14 booths</div>
          <p className="text-[11px] text-emerald-600">Jaipur &amp; Pune</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Distress &amp; Relief Support Tasks</h3>
        <p className="mt-1 text-xs text-slate-500">Assigned incident assistance cases requiring field coordination.</p>
        <div className="mt-4 space-y-3">
          {incidents.map((inc: any) => (
            <div
              key={inc.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50"
            >
              <div>
                <span className="font-mono text-xs font-bold text-rose-600">#{inc.id}</span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{inc.type} · {inc.location}</h4>
                <p className="text-[11px] text-slate-500">{inc.actionTaken}</p>
              </div>
              <button
                onClick={() => onNavigate('safety')}
                className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Respond
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  BarChart3,
  Users,
  Award,
  Briefcase,
  ShieldAlert,
  Download,
} from 'lucide-react';

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y'>('30d');

  // Realistic impact analytics dataset
  const METRICS = [
    { label: 'Active Beneficiaries', value: '14,820', change: '+24.5%', isUp: true, icon: Users, color: 'text-rose-600 bg-rose-50' },
    { label: 'Course Credentials Earned', value: '8,410', change: '+18.2%', isUp: true, icon: Award, color: 'text-amber-600 bg-amber-50' },
    { label: 'Verified Job Placements', value: '1,940', change: '+31.4%', isUp: true, icon: Briefcase, color: 'text-purple-600 bg-purple-50' },
    { label: 'SOS Emergencies Resolved', value: '412', change: '100% Resolved', isUp: true, icon: ShieldAlert, color: 'text-emerald-600 bg-emerald-50' },
  ];

  const MONTHLY_TREND = [
    { month: 'Jun', users: 5200, courses: 2100, jobs: 420 },
    { month: 'Jul', users: 6800, courses: 3400, jobs: 680 },
    { month: 'Aug', users: 8900, courses: 4600, jobs: 940 },
    { month: 'Sep', users: 11200, courses: 6100, jobs: 1320 },
    { month: 'Oct', users: 13400, courses: 7400, jobs: 1680 },
    { month: 'Nov', users: 14820, courses: 8410, jobs: 1940 },
  ];

  const DEMOGRAPHICS = [
    { segment: '18 - 24 yrs (Early Career & College)', percent: 38, count: '5,630' },
    { segment: '25 - 34 yrs (Professionals & Mid-Career)', percent: 44, count: '6,520' },
    { segment: '35 - 45 yrs (Career Returnships & Business)', percent: 14, count: '2,075' },
    { segment: '45+ yrs (Community Mentors & Grassroots)', percent: 4, count: '595' },
  ];

  const REGIONAL_SPREAD = [
    { region: 'Northern Region (Delhi, Rajasthan, UP)', percent: 34 },
    { region: 'Western Region (Maharashtra, Gujarat)', percent: 28 },
    { region: 'Southern Region (Karnataka, Telangana, TN)', percent: 26 },
    { region: 'Eastern & Central Region', percent: 12 },
  ];

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Month,TotalUsers,CoursesCompleted,JobsPlaced\n' +
      MONTHLY_TREND.map((e) => `${e.month},${e.users},${e.courses},${e.jobs}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'RakshaNet_Empowerment_Impact_Report_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            <BarChart3 className="size-3.5" />
            <span>National Impact Assessment</span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Analytics &amp; Empowerment Metrics
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Measuring educational outcomes, income equality growth, safety response velocity, and community engagement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(['30d', '90d', '1y'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`rounded-lg px-3 py-1 text-xs font-bold ${
                  timeRange === r
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {r === '30d' ? '30 Days' : r === '90d' ? '3 Months' : '1 Year'}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <Download className="size-3.5" /> Export Impact CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {METRICS.map((m, i) => {
          const Icon = m.icon;
          return (
            <div
              key={i}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{m.label}</span>
                <div className={`rounded-xl p-2 ${m.color}`}>
                  <Icon className="size-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                  {m.value}
                </span>
                <span className="text-xs font-bold text-emerald-600">{m.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Growth Graph (SVG Bar & Area Visualization) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Platform Growth &amp; Engagement Trajectory
              </h3>
              <p className="text-xs text-slate-500">Active learners vs courses completed</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="size-2 rounded-full bg-rose-500" /> Active Users
              </span>
              <span className="flex items-center gap-1.5 text-purple-600">
                <span className="size-2 rounded-full bg-purple-500" /> Certifications
              </span>
            </div>
          </div>

          {/* SVG Bar Visual */}
          <div className="mt-8 flex h-56 items-end justify-between gap-3 px-4">
            {MONTHLY_TREND.map((item, idx) => {
              const maxUsers = 16000;
              const heightPercent = Math.round((item.users / maxUsers) * 100);
              const coursePercent = Math.round((item.courses / maxUsers) * 100);

              return (
                <div key={idx} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
                  <div className="flex w-full items-end justify-center gap-1.5 h-44">
                    {/* User bar */}
                    <div
                      className="w-1/2 rounded-t-lg bg-gradient-to-t from-rose-600 to-pink-500 transition-all duration-500 hover:opacity-80"
                      style={{ height: `${heightPercent}%` }}
                      title={`${item.users} Active Users`}
                    />
                    {/* Course bar */}
                    <div
                      className="w-1/2 rounded-t-lg bg-gradient-to-t from-purple-600 to-indigo-500 transition-all duration-500 hover:opacity-80"
                      style={{ height: `${coursePercent}%` }}
                      title={`${item.courses} Courses Completed`}
                    />
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-500">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Demographic Breakdown */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Demographics &amp; Age Split</h3>
          <p className="text-xs text-slate-500">Distribution of registered female participants</p>

          <div className="mt-6 space-y-4">
            {DEMOGRAPHICS.map((d, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{d.segment}</span>
                  <span className="font-bold text-rose-600">{d.percent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-purple-600"
                    style={{ width: `${d.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Regional Spread */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Geographic Reach Across India</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REGIONAL_SPREAD.map((r, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40"
            >
              <span className="text-2xl font-black text-slate-900 dark:text-white">{r.percent}%</span>
              <p className="mt-1 text-xs text-slate-500">{r.region}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

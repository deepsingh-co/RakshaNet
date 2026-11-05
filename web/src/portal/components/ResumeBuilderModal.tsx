import { useState } from 'react';
import { X, FileText, Printer, CheckCircle } from 'lucide-react';
import { usePortalStore } from '../store/portalStore';

interface ResumeBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResumeBuilderModal({ isOpen, onClose }: ResumeBuilderModalProps) {
  const currentUser = usePortalStore((s) => s.currentUser);

  const [fullName, setFullName] = useState(currentUser.name);
  const [headline, setHeadline] = useState('Frontend Web Developer | React & TypeScript');
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone);
  const [location, setLocation] = useState(currentUser.location);
  const [summary, setSummary] = useState(
    'Dedicated and ambitious software developer with hands-on proficiency in React, TypeScript, and modern UI engineering. Highly adaptable with strong problem-solving skills and a passion for building inclusive digital products.'
  );

  const [skills, setSkills] = useState('React, TypeScript, JavaScript, Tailwind CSS, Redux, Git, HTML5, CSS3, REST APIs');

  const [experiences] = useState([
    {
      id: 1,
      role: 'Junior Frontend Developer Intern',
      company: 'TechEmpower Solutions',
      period: '2025 - Present',
      points: 'Developed responsive UI components using React and Tailwind CSS. Improved web accessibility scores by 35%.',
    },
    {
      id: 2,
      role: 'Digital Coordinator & Web Contributor',
      company: 'SheSparks Foundation',
      period: '2024 - 2025',
      points: 'Managed digital landing pages, organized webinars for 1,200+ female learners, and led technical workshops.',
    },
  ]);

  const [education] = useState([
    {
      id: 1,
      degree: 'B.Tech in Computer Science & Engineering',
      institution: 'State Technical University',
      year: '2021 - 2025',
      score: '8.6 CGPA / First Class with Distinction',
    },
  ]);

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('preview');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <FileText className="size-5" />
            </span>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">AI-Powered Resume Builder</h3>
              <p className="text-xs text-slate-500">ATS-Optimized format designed for modern hiring systems</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                onClick={() => setActiveTab('preview')}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  activeTab === 'preview'
                    ? 'bg-white text-rose-600 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab('edit')}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  activeTab === 'edit'
                    ? 'bg-white text-rose-600 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Edit Details
              </button>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {activeTab === 'edit' ? (
          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Professional Headline</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Professional Summary</label>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Skills (Comma-separated)</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setActiveTab('preview')}
                className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-rose-700"
              >
                View Generated ATS Preview
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* ATS Printable Sheet */}
            <div
              id="resume-sheet"
              className="my-5 rounded-2xl border border-slate-300 bg-white p-8 text-slate-900 shadow-sm font-sans"
            >
              <div className="border-b-2 border-slate-900 pb-4 text-center">
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">{fullName}</h1>
                <p className="mt-1 text-sm font-semibold text-rose-700">{headline}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-x-4 text-xs text-slate-600">
                  <span>{email}</span>
                  <span>•</span>
                  <span>{phone}</span>
                  <span>•</span>
                  <span>{location}</span>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-5">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                  Professional Summary
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-700">{summary}</p>
              </div>

              {/* Core Competencies */}
              <div className="mt-5">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                  Key Skills &amp; Competencies
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {skills.split(',').map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-800"
                    >
                      {s.trim()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Work Experience */}
              <div className="mt-5">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                  Work &amp; Project Experience
                </h2>
                <div className="mt-3 space-y-3">
                  {experiences.map((exp) => (
                    <div key={exp.id}>
                      <div className="flex justify-between text-xs font-bold text-slate-900">
                        <span>{exp.role} · <span className="font-normal text-slate-600">{exp.company}</span></span>
                        <span className="text-slate-500 font-normal">{exp.period}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-700 leading-relaxed">• {exp.points}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education */}
              <div className="mt-5">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                  Education &amp; Credentials
                </h2>
                <div className="mt-3 space-y-2">
                  {education.map((edu) => (
                    <div key={edu.id} className="flex justify-between text-xs text-slate-900">
                      <div>
                        <span className="font-bold">{edu.degree}</span>
                        <div className="text-[11px] text-slate-600">{edu.institution}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-slate-700">{edu.year}</span>
                        <div className="text-[11px] text-emerald-700 font-semibold">{edu.score}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
              <button
                onClick={() => setActiveTab('edit')}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Modify Sections
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-slate-800"
              >
                <Printer className="size-4" /> Print / Save PDF
              </button>
              <button
                onClick={() => {
                  alert('Resume generated and attached to your Job Portal profile!');
                  onClose();
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:from-rose-600"
              >
                <CheckCircle className="size-4" /> Use as Active Job Resume
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

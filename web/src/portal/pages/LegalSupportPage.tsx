import React, { useState } from 'react';
import {
  Scale,
  Shield,
  FileText,
  Search,
  Download,
  Copy,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  UserCheck,
  AlertTriangle,
  Mail,
  X,
} from 'lucide-react';
import {
  MOCK_LEGAL_RESOURCES,
  MOCK_LEGAL_ADVOCATES,
  MOCK_LEGAL_TEMPLATES,
} from '../data/mockData';
import { usePortalStore } from '../store/portalStore';
import { LegalAdvocate, LegalTemplate } from '../types';

export function LegalSupportPage() {
  const legalCases = usePortalStore((s) => s.legalCases);

  const [activeTab, setActiveTab] = useState<'rights' | 'directory' | 'cases' | 'templates'>('rights');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLawId, setExpandedLawId] = useState<string | null>('law-1');
  const [selectedAdvocate, setSelectedAdvocate] = useState<LegalAdvocate | null>(null);
  const [consultationMessage, setConsultationMessage] = useState('');
  const [consultationSuccess, setConsultationSuccess] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LegalTemplate | null>(null);
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

  const handleCopyTemplate = (temp: LegalTemplate) => {
    navigator.clipboard.writeText(temp.content);
    setCopiedTemplateId(temp.id);
    setTimeout(() => setCopiedTemplateId(null), 2000);
  };

  const handleBookConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    setConsultationSuccess(true);
    setTimeout(() => {
      setConsultationSuccess(false);
      setSelectedAdvocate(null);
      setConsultationMessage('');
    }, 1500);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <Scale className="size-3.5" />
            <span>Legal Aid &amp; Constitutional Rights</span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Legal Support &amp; Justice Hub
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Empowering women with statutory awareness, pro-bono advocates, case tracking, and verified legal drafts.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 scrollbar-none dark:border-slate-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('rights')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'rights'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Know Your Rights ({MOCK_LEGAL_RESOURCES.length})
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'directory'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Pro-Bono Legal Aid Directory ({MOCK_LEGAL_ADVOCATES.length})
          </button>
          <button
            onClick={() => setActiveTab('cases')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'cases'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Case Tracker ({legalCases.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'templates'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Legal Document Templates ({MOCK_LEGAL_TEMPLATES.length})
          </button>
        </div>
      </div>

      {/* 1. Know Your Rights Tab */}
      {activeTab === 'rights' && (
        <div className="space-y-4">
          {MOCK_LEGAL_RESOURCES.map((law) => {
            const isExpanded = expandedLawId === law.id;
            return (
              <div
                key={law.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition dark:border-slate-800 dark:bg-slate-900"
              >
                <div
                  onClick={() => setExpandedLawId(isExpanded ? null : law.id)}
                  className="flex cursor-pointer items-center justify-between p-6 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="space-y-1">
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {law.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {law.title}
                    </h3>
                    <p className="text-xs text-slate-500">{law.summary}</p>
                  </div>
                  <button className="rounded-full p-2 text-slate-400">
                    {isExpanded ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-6 space-y-4 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-300">
                    <div>
                      <h4 className="font-bold uppercase tracking-wider text-slate-400">Statutory Provisions</h4>
                      <p className="mt-1 leading-relaxed">{law.fullText}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-950 dark:bg-rose-950/20">
                        <span className="font-bold text-rose-700 dark:text-rose-400">Penalties for Violation:</span>
                        <p className="mt-1 text-slate-800 dark:text-slate-200">{law.penalties}</p>
                      </div>

                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-950 dark:bg-emerald-950/20">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">How to Seek Redressal:</span>
                        <p className="mt-1 text-slate-800 dark:text-slate-200">{law.howToApply}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Legal Aid Directory Tab */}
      {activeTab === 'directory' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {MOCK_LEGAL_ADVOCATES.map((adv) => (
            <div
              key={adv.id}
              className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Pro-Bono / Free Consultation
                  </span>
                  <span className="text-xs font-bold text-amber-500">★ {adv.rating}</span>
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                  {adv.name}
                </h3>
                <p className="text-xs text-indigo-600 font-semibold">{adv.specialty}</p>

                <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                  <p>• Experience: {adv.experience}</p>
                  <p>• Location: {adv.location}</p>
                  <p>• Cases Successfully Resolved: {adv.casesWon}+</p>
                  <p>• Languages: {adv.languages.join(', ')}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAdvocate(adv)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-700"
              >
                <Mail className="size-3.5" /> Request Legal Consultation
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 3. Case Tracker Tab */}
      {activeTab === 'cases' && (
        <div className="space-y-6">
          {legalCases.map((c) => (
            <div
              key={c.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center">
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-600">{c.caseNumber}</span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{c.title}</h3>
                  <p className="text-xs text-slate-500">Jurisdiction: {c.court} · Counsel: {c.advocateName}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    Stage: {c.stage}
                  </span>
                  <p className="mt-1 text-xs text-slate-500">Next Hearing: <strong>{c.nextHearingDate}</strong></p>
                </div>
              </div>

              {/* Step-by-Step Progress Timeline */}
              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Case Updates History</h4>
                <div className="mt-3 space-y-3">
                  {c.updates.map((up, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                        ✓
                      </span>
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{up.date}</span>
                        <p className="text-slate-600 dark:text-slate-400">{up.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Document Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {MOCK_LEGAL_TEMPLATES.map((temp) => (
            <div
              key={temp.id}
              className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {temp.category}
                </span>
                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {temp.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {temp.description}
                </p>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setSelectedTemplate(temp)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Preview Text
                </button>
                <button
                  onClick={() => handleCopyTemplate(temp)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  {copiedTemplateId === temp.id ? (
                    <>
                      <CheckCircle className="size-3.5" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" /> Copy Draft
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Consultation Modal */}
      {selectedAdvocate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8">
            <button
              onClick={() => setSelectedAdvocate(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Request Free Consultation with {selectedAdvocate.name}
            </h3>
            <p className="text-xs text-slate-500">Specialty: {selectedAdvocate.specialty}</p>

            {consultationSuccess && (
              <div className="my-4 rounded-xl bg-emerald-50 p-3 text-center text-xs font-bold text-emerald-700">
                ✓ Consultation request dispatched to {selectedAdvocate.name}. You will be contacted via email/phone within 24 hours.
              </div>
            )}

            <form onSubmit={handleBookConsultation} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Brief description of legal query (confidential &amp; encrypted)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe your situation (e.g., workplace harassment, domestic maintenance, cyber stalking)..."
                  value={consultationMessage}
                  onChange={(e) => setConsultationMessage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAdvocate(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-6 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Send Confidential Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedTemplate.title}</h3>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            <pre className="my-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 font-mono text-xs leading-relaxed text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              {selectedTemplate.content}
            </pre>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => handleCopyTemplate(selectedTemplate)}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Copy Complete Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

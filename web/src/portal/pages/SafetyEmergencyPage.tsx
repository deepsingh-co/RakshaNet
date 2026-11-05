import React, { useState } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  MapPin,
  AlertTriangle,
  Send,
  CheckCircle,
  FileText,
  Volume2,
  Lock,
  ExternalLink,
  Navigation,
  Sparkles,
} from 'lucide-react';
import { usePortalStore } from '../store/portalStore';
import { MOCK_SAFE_LOCATIONS } from '../data/mockData';
import { IncidentReport } from '../types';

interface SafetyEmergencyPageProps {
  onOpenSos: () => void;
}

export function SafetyEmergencyPage({ onOpenSos }: SafetyEmergencyPageProps) {
  const incidents = usePortalStore((s) => s.incidents);
  const submitIncidentReport = usePortalStore((s) => s.submitIncidentReport);
  const currentUser = usePortalStore((s) => s.currentUser);

  const [activeTab, setActiveTab] = useState<'sos' | 'report' | 'safe-locations' | 'tips'>('sos');

  // Incident form state
  const [incType, setIncType] = useState<IncidentReport['type']>('Harassment');
  const [incDate, setIncDate] = useState(new Date().toISOString().split('T')[0]);
  const [incTime, setIncTime] = useState('20:30');
  const [incLocation, setIncLocation] = useState('');
  const [incDescription, setIncDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [reportSuccess, setReportSuccess] = useState(false);

  const handleIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incLocation || !incDescription) return;
    submitIncidentReport(incType, incDate, incTime, incLocation, incDescription, isAnonymous);
    setReportSuccess(true);
    setTimeout(() => {
      setReportSuccess(false);
      setIncLocation('');
      setIncDescription('');
    }, 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
            <ShieldAlert className="size-3.5" />
            <span>RakshaNet Crisis &amp; Emergency Hub</span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Safety, Emergency SOS &amp; Incident Redressal
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            High-speed emergency broadcast, encrypted incident reporting, verified safe transit shelters, and personal safety protocols.
          </p>
        </div>

        <button
          onClick={onOpenSos}
          className="flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-3 text-xs font-black text-white shadow-lg shadow-red-600/30 transition hover:bg-red-700 active:scale-95"
        >
          <ShieldAlert className="size-4 animate-ping" />
          <span>TRIGGER LIVE SOS NOW</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 scrollbar-none dark:border-slate-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('sos')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'sos'
                ? 'border-red-600 text-red-600 dark:border-red-400 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Emergency SOS &amp; Helplines
          </button>
          <button
            onClick={() => setActiveTab('safe-locations')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'safe-locations'
                ? 'border-red-600 text-red-600 dark:border-red-400 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Nearby Safe Locations ({MOCK_SAFE_LOCATIONS.length})
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'report'
                ? 'border-red-600 text-red-600 dark:border-red-400 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Report an Incident ({incidents.length} logged)
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'tips'
                ? 'border-red-600 text-red-600 dark:border-red-400 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Personal Safety Protocols
          </button>
        </div>
      </div>

      {/* 1. SOS & Helplines Tab */}
      {activeTab === 'sos' && (
        <div className="space-y-6">
          {/* Big SOS Center Card */}
          <div className="rounded-3xl border border-red-200 bg-gradient-to-br from-red-50/60 via-white to-rose-50/40 p-8 text-center dark:border-red-950 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Instant One-Touch Distress Dispatch
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-xs text-slate-600 dark:text-slate-400">
              Dispatches your exact GPS coordinates with audio alarm to <strong>{currentUser.emergencyContact.name} ({currentUser.emergencyContact.phone})</strong> and nearest verified emergency responders via SMS and WhatsApp fallback.
            </p>

            <div className="my-8 flex justify-center">
              <button
                onClick={onOpenSos}
                className="group relative flex size-44 items-center justify-center rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-2xl shadow-red-600/40 transition hover:scale-105 active:scale-95"
              >
                <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping opacity-25" />
                <div className="text-center">
                  <ShieldAlert className="mx-auto size-14 mb-1" />
                  <span className="text-lg font-black tracking-wider">TAP SOS</span>
                </div>
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="size-4 text-emerald-600" /> GPS Auto-Lock Active
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="size-4 text-emerald-600" /> WhatsApp Direct Fallback
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="size-4 text-emerald-600" /> Offline Sync Capable
              </span>
            </div>
          </div>

          {/* Direct Toll-Free Helplines Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              National 24x7 Emergency Helplines (1-Tap Dial)
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { name: 'National Emergency', number: '112', desc: 'Police, Fire, Ambulance', color: 'bg-red-50 text-red-700 border-red-200' },
                { name: 'Women in Distress', number: '1091', desc: '24x7 Police Assistance', color: 'bg-rose-50 text-rose-700 border-rose-200' },
                { name: 'Domestic Abuse', number: '181', desc: 'Women Protection Cell', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                { name: 'Childline Care', number: '1098', desc: 'Minors & Children Helpline', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                { name: 'National Cyber Fraud', number: '1930', desc: 'Financial & Identity Fraud', color: 'bg-blue-50 text-blue-700 border-blue-200' },
              ].map((h, i) => (
                <a
                  key={i}
                  href={`tel:${h.number}`}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition hover:scale-102 ${h.color}`}
                >
                  <div>
                    <span className="text-[11px] font-semibold">{h.name}</span>
                    <div className="mt-1 font-mono text-2xl font-black">{h.number}</div>
                  </div>
                  <p className="mt-2 text-[10px] opacity-80">{h.desc}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Nearby Safe Locations Tab */}
      {activeTab === 'safe-locations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {MOCK_SAFE_LOCATIONS.map((loc) => (
              <div
                key={loc.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {loc.type}
                  </span>
                  <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">{loc.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{loc.address}</p>

                  <div className="mt-4 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <p className="font-bold text-emerald-600">• {loc.distance}</p>
                    <p>• {loc.openHours}</p>
                    <p>• Phone: {loc.contact}</p>
                  </div>
                </div>

                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(loc.name + ' ' + loc.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
                >
                  <Navigation className="size-3.5" /> Navigate on Map
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Report Incident Tab */}
      {activeTab === 'report' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Secure &amp; Anonymous Incident Report
            </h3>
            <p className="text-xs text-slate-500">
              All submissions are strictly encrypted. Choose whether to report anonymously or request direct police &amp; NGO aid.
            </p>

            {reportSuccess && (
              <div className="my-4 rounded-xl bg-emerald-50 p-3 text-center text-xs font-bold text-emerald-700">
                ✓ Incident report recorded and assigned to emergency triage cell.
              </div>
            )}

            <form onSubmit={handleIncidentSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Incident Category</label>
                  <select
                    value={incType}
                    onChange={(e) => setIncType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option>Harassment</option>
                    <option>Domestic Abuse</option>
                    <option>Cyberstalking</option>
                    <option>Workplace Discrimination</option>
                    <option>Stalking</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Date of Incident</label>
                  <input
                    type="date"
                    value={incDate}
                    onChange={(e) => setIncDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Location / Platform</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Near Metro Station Gate 3, or Instagram DM"
                  value={incLocation}
                  onChange={(e) => setIncLocation(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Detailed Description of What Occurred</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe facts, perpetrator appearance, vehicle number, or offensive communications..."
                  value={incDescription}
                  onChange={(e) => setIncDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anonCheck"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="accent-red-600"
                />
                <label htmlFor="anonCheck" className="text-xs text-slate-600 dark:text-slate-400">
                  Submit anonymously without revealing my name or phone to police
                </label>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-red-600 py-3 text-xs font-bold text-white shadow hover:bg-red-700"
              >
                Submit Incident Report
              </button>
            </form>
          </div>

          {/* Past Incidents List */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Tracked Incident Reports</h3>
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-red-600">#{inc.id}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {inc.status}
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{inc.type}</h4>
                <p className="text-xs text-slate-500">{inc.location} · {inc.date} at {inc.time}</p>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{inc.description}</p>
                <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Action: {inc.actionTaken}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Personal Safety Protocols Tab */}
      {activeTab === 'tips' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              title: 'Night Travel & Cab Verification Protocol',
              category: 'Transit Safety',
              tips: [
                'Verify driver photo & number plate before boarding.',
                'Keep live location shared with trusted contact on RakshaNet.',
                'Check child-lock status on rear door handle.',
                'Speak on call mentioning the vehicle number loudly.',
              ],
            },
            {
              title: 'Cyber Safety & Social Media Privacy',
              category: 'Digital Security',
              tips: [
                'Enable Two-Factor Authentication (2FA) across all email/socials.',
                'Never click suspicious APK or loan app links.',
                'Keep metadata location tags off in smartphone camera settings.',
                'Report deepfakes immediately at cybercrime.gov.in (1930).',
              ],
            },
            {
              title: 'Physical De-escalation & Target Points',
              category: 'Self Defense',
              tips: [
                'Maintain spatial boundary of 2 arm lengths.',
                'Target high-vulnerability zones: eyes, throat, groin, knee joints.',
                'Utilize everyday objects: house keys, umbrella tip, or deodorant spray.',
                'Trigger loud voice alarms immediately to attract bystander attention.',
              ],
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="text-[10px] font-bold uppercase text-red-600">{item.category}</span>
              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{item.title}</h3>
              <ul className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                {item.tips.map((t, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle className="size-3.5 shrink-0 text-red-600 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

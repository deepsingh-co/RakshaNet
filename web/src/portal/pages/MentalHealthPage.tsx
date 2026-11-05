import React, { useState, useEffect } from 'react';
import {
  Activity,
  PhoneCall,
  Calendar,
  Play,
  Pause,
  X,
} from 'lucide-react';
import { usePortalStore } from '../store/portalStore';
import { MOCK_COUNSELORS } from '../data/mockData';
import { MoodEntry } from '../types';

export function MentalHealthPage() {
  const moodLogs = usePortalStore((s) => s.moodLogs);
  const addMoodLog = usePortalStore((s) => s.addMoodLog);

  const [activeTab, setActiveTab] = useState<'mood' | 'counseling' | 'meditation' | 'resources'>('mood');

  // Mood selector state
  const [selectedMood, setSelectedMood] = useState<MoodEntry['mood']>('Joyful');
  const [energyLevel, setEnergyLevel] = useState<number>(8);
  const [reflectionNote, setReflectionNote] = useState('');
  const [moodSaved, setMoodSaved] = useState(false);

  // Meditation timer state
  const [isMeditating, setIsMeditating] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [meditationSeconds, setMeditationSeconds] = useState(0);

  // Counseling booking state
  const [selectedCounselor, setSelectedCounselor] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState('2026-11-14');
  const [bookingTime, setBookingTime] = useState('04:00 PM');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isMeditating) {
      interval = setInterval(() => {
        setMeditationSeconds((s) => s + 1);
        const cycle = (meditationSeconds % 12);
        if (cycle < 4) setBreathPhase('Inhale');
        else if (cycle < 8) setBreathPhase('Hold');
        else setBreathPhase('Exhale');
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isMeditating, meditationSeconds]);

  const handleSaveMood = (e: React.FormEvent) => {
    e.preventDefault();
    addMoodLog(selectedMood, energyLevel, reflectionNote);
    setMoodSaved(true);
    setReflectionNote('');
    setTimeout(() => setMoodSaved(false), 2000);
  };

  const handleBookCounselor = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingSuccess(true);
    setTimeout(() => {
      setBookingSuccess(false);
      setSelectedCounselor(null);
    }, 1500);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
            <Activity className="size-3.5" />
            <span>Mental Health, Healing &amp; Inner Peace</span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Mental Health &amp; Emotional Wellness
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Confidential counseling, guided breathing meditation, mood tracking, and 24x7 crisis helplines.
          </p>
        </div>

        {/* 24x7 Crisis Direct Helpline button */}
        <a
          href="tel:18005990019"
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:from-teal-700 hover:to-emerald-700"
        >
          <PhoneCall className="size-4" /> 24x7 KIRAN Toll-Free: 1800-599-0019
        </a>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 scrollbar-none dark:border-slate-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('mood')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'mood'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Daily Mood Tracker ({moodLogs.length} logs)
          </button>
          <button
            onClick={() => setActiveTab('counseling')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'counseling'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Free Confidential Counseling ({MOCK_COUNSELORS.length})
          </button>
          <button
            onClick={() => setActiveTab('meditation')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'meditation'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Guided Breathing &amp; Meditation
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'resources'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Self-Help Articles &amp; Exercises
          </button>
        </div>
      </div>

      {/* 1. Daily Mood Tracker Tab */}
      {activeTab === 'mood' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Mood Check-In Form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              How are you feeling right now?
            </h3>
            <p className="text-xs text-slate-500">
              Tracking your mental wellbeing helps spot burnout early and celebrate positive moments.
            </p>

            {moodSaved && (
              <div className="my-3 rounded-xl bg-teal-50 p-2.5 text-center text-xs font-bold text-teal-700">
                ✓ Today's emotional check-in recorded!
              </div>
            )}

            <form onSubmit={handleSaveMood} className="mt-5 space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {[
                  { name: 'Joyful', icon: '😄' },
                  { name: 'Peaceful', icon: '😌' },
                  { name: 'Neutral', icon: '😐' },
                  { name: 'Anxious', icon: '😟' },
                  { name: 'Overwhelmed', icon: '😢' },
                ].map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => setSelectedMood(m.name as MoodEntry['mood'])}
                    className={`flex flex-col items-center gap-1 rounded-2xl border p-3 transition ${
                      selectedMood === m.name
                        ? 'border-teal-500 bg-teal-50 text-teal-900 font-bold dark:bg-teal-950 dark:text-teal-200'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-2xl">{m.icon}</span>
                    <span className="text-[11px]">{m.name}</span>
                  </button>
                ))}
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>Energy &amp; Vitality Level</span>
                  <span>{energyLevel} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(Number(e.target.value))}
                  className="mt-2 w-full accent-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Reflection Note (What went well or triggered stress?)
                </label>
                <textarea
                  rows={3}
                  placeholder="Today I made good progress on my coursework and took a healthy walk..."
                  value={reflectionNote}
                  onChange={(e) => setReflectionNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white shadow hover:bg-teal-700"
              >
                Log Emotional State
              </button>
            </form>
          </div>

          {/* 7-Day Mood History & Visual Logs */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Mood History</h3>
            <p className="text-xs text-slate-500">Your recent reflection logs and wellbeing trajectory.</p>

            <div className="mt-5 space-y-3">
              {moodLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{log.mood}</span>
                      <span className="rounded-full bg-teal-100 px-2 py-0.2 text-[10px] font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                        Energy {log.energy}/10
                      </span>
                    </div>
                    {log.note && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">"{log.note}"</p>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">{log.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Free Confidential Counseling Tab */}
      {activeTab === 'counseling' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {MOCK_COUNSELORS.map((coun) => (
            <div
              key={coun.id}
              className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {coun.sessionFee}
                  </span>
                  <span className="text-xs font-bold text-amber-500">★ {coun.rating}</span>
                </div>

                <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                  {coun.name}
                </h3>
                <p className="text-xs font-semibold text-teal-600">{coun.qualification}</p>
                <p className="mt-1 text-xs text-slate-500">Specialty: {coun.specialty}</p>

                <div className="mt-4 space-y-1 text-xs text-slate-500">
                  <p>• Experience: {coun.experience}</p>
                  <p>• Languages: {coun.languages.join(', ')}</p>
                  <p>• Available Days: {coun.availableDays.join(', ')}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCounselor(coun)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white shadow hover:bg-teal-700"
              >
                <Calendar className="size-3.5" /> Book Free Confidential Session
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 3. Guided Breathing & Meditation Tab */}
      {activeTab === 'meditation' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            4-4-4 Box Breathing Relaxation
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-xs text-slate-500">
            Scientifically proven to trigger the parasympathetic nervous system, lowering cortisol and heart rate in under 2 minutes.
          </p>

          {/* Animated Breathing Circle */}
          <div className="my-8 flex justify-center">
            <div
              className={`flex size-48 items-center justify-center rounded-full bg-gradient-to-tr from-teal-500 via-emerald-400 to-cyan-500 text-white shadow-2xl transition-all duration-1000 ${
                isMeditating
                  ? breathPhase === 'Inhale'
                    ? 'scale-125 ring-8 ring-teal-200'
                    : breathPhase === 'Hold'
                    ? 'scale-125 ring-8 ring-amber-200'
                    : 'scale-90 ring-4 ring-cyan-100'
                  : 'scale-100 ring-4 ring-slate-100'
              }`}
            >
              <div className="text-center">
                <span className="text-2xl font-black">{isMeditating ? breathPhase : 'Ready'}</span>
                {isMeditating && (
                  <p className="mt-1 font-mono text-xs">{meditationSeconds}s elapsed</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => setIsMeditating(!isMeditating)}
              className="flex items-center gap-2 rounded-2xl bg-teal-600 px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-teal-700"
            >
              {isMeditating ? <Pause className="size-4" /> : <Play className="size-4" />}
              {isMeditating ? 'Pause Session' : 'Start 4-4-4 Breathing'}
            </button>
          </div>
        </div>
      )}

      {/* 4. Self-Help Resources Tab */}
      {activeTab === 'resources' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              title: 'Healing from Toxic Workplaces & Burnout',
              time: '6 min read',
              author: 'Clinical Team',
              summary: 'Tactical boundaries to set with managers, recognizing quiet exploitation, and replenishing cognitive focus.',
            },
            {
              title: 'Overcoming Impostor Phenomenon in STEM',
              time: '5 min read',
              author: 'Dr. Priya Deshmukh',
              summary: 'Why highly competent women feel like frauds, and how to internalize achievements using evidence journals.',
            },
            {
              title: 'Post-Trauma Nervous System Reset',
              time: '8 min read',
              author: 'Trauma Specialist Cell',
              summary: 'Somatic grounding techniques, vagus nerve stimulation, and safe breathing practices following crisis incidents.',
            },
          ].map((res, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <span className="text-[10px] font-bold uppercase text-teal-600">{res.time}</span>
                <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{res.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{res.summary}</p>
              </div>
              <p className="mt-4 text-[11px] font-semibold text-slate-400">By {res.author}</p>
            </div>
          ))}
        </div>
      )}

      {/* Counseling Booking Modal */}
      {selectedCounselor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8">
            <button
              onClick={() => setSelectedCounselor(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Schedule Confidential Session with {selectedCounselor.name}
            </h3>
            <p className="text-xs text-slate-500">100% Free · Covered under RakshaNet Mental Wellness Fund</p>

            {bookingSuccess && (
              <div className="my-4 rounded-xl bg-teal-50 p-3 text-center text-xs font-bold text-teal-700">
                ✓ Confidential session booked for {bookingDate} at {bookingTime}. Link sent to your email.
              </div>
            )}

            <form onSubmit={handleBookCounselor} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Select Date</label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Select Time Slot</label>
                <select
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option>10:00 AM</option>
                  <option>02:00 PM</option>
                  <option>04:00 PM</option>
                  <option>06:30 PM</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCounselor(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-6 py-2 text-xs font-bold text-white hover:bg-teal-700"
                >
                  Confirm Free Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

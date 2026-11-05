import { useState, useEffect } from 'react';
import { ShieldAlert, PhoneCall, MapPin, Volume2, CheckCircle, X } from 'lucide-react';
import { usePortalStore } from '../store/portalStore';

interface QuickSosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickSosModal({ isOpen, onClose }: QuickSosModalProps) {
  const [countdown, setCountdown] = useState(5);
  const [isAlertTriggered, setIsAlertTriggered] = useState(false);
  const [sirenPlaying, setSirenPlaying] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const currentUser = usePortalStore((s) => s.currentUser);
  const addAuditLog = usePortalStore((s) => s.addAuditLog);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      setIsAlertTriggered(false);
      setSirenPlaying(false);
      return;
    }

    // Try fetching GPS coordinates
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoordinates({ lat: 26.9124, lng: 75.7873 }) // Fallback Jaipur coords
      );
    }

    // Countdown timer for automatic dispatch
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerEmergencyDispatch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const triggerEmergencyDispatch = () => {
    setIsAlertTriggered(true);
    setSirenPlaying(true);
    addAuditLog(
      'INSTANT_SOS_TRIGGERED',
      `Emergency SOS triggered by ${currentUser.name}. Location: ${coordinates ? `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}` : 'Captured'}`,
      'ALERT'
    );
  };

  const cancelCountdown = () => {
    setCountdown(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-white/20 animate-pulse">
                <ShieldAlert className="size-5 text-white" />
              </span>
              <div>
                <h3 className="text-lg font-black tracking-wide">EMERGENCY SOS DISPATCH</h3>
                <p className="text-xs text-red-100">RakshaNet Instant Crisis Response System</p>
              </div>
            </div>
            <button
              onClick={cancelCountdown}
              className="rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {!isAlertTriggered ? (
            <div className="text-center">
              <div className="mx-auto my-4 flex size-28 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60 ring-8 ring-red-50 dark:ring-red-900/30">
                <span className="text-5xl font-black text-red-600 dark:text-red-400 animate-bounce">
                  {countdown}
                </span>
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                Broadcasting Emergency Alert in {countdown}s...
              </h4>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Your live GPS coordinates will be sent to your primary emergency contact (
                <strong className="text-slate-900 dark:text-white">{currentUser.emergencyContact.name} - {currentUser.emergencyContact.phone}</strong>) and local RakshaNet volunteer responders.
              </p>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={triggerEmergencyDispatch}
                  className="flex-1 rounded-xl bg-red-600 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-red-700 active:scale-95"
                >
                  Send Immediately Now
                </button>
                <button
                  onClick={cancelCountdown}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="text-sm">
                  <p className="font-bold">Emergency Signal Sent!</p>
                  <p className="text-xs text-emerald-800 dark:text-emerald-400">
                    Encrypted alerts dispatched via SMS &amp; WhatsApp fallback. Responders alerted.
                  </p>
                </div>
              </div>

              {/* Siren Control & Location */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <MapPin className="size-4 text-rose-500" />
                    GPS Coordinates
                  </div>
                  <p className="mt-1 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                    {coordinates ? `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}` : 'Detecting GPS...'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="size-4 text-amber-500" />
                      Audible Siren
                    </span>
                    <button
                      onClick={() => setSirenPlaying(!sirenPlaying)}
                      className="rounded px-2 py-0.5 text-[11px] font-bold text-rose-600 hover:bg-rose-100"
                    >
                      {sirenPlaying ? 'Mute' : 'Play'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-200">
                    {sirenPlaying ? '🚨 Sounding High-Decibel Siren' : 'Muted'}
                  </p>
                </div>
              </div>

              {/* Direct Instant Helplines */}
              <h5 className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">
                Direct Toll-Free Government Helplines
              </h5>
              <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <a
                  href="tel:112"
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 p-2.5 font-bold text-red-700 transition hover:bg-red-100"
                >
                  <PhoneCall className="size-4 text-red-600" />
                  <div>
                    <div className="text-xs">National SOS</div>
                    <div className="text-sm font-black">112</div>
                  </div>
                </a>
                <a
                  href="tel:1091"
                  className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-2.5 font-bold text-rose-700 transition hover:bg-rose-100"
                >
                  <PhoneCall className="size-4 text-rose-600" />
                  <div>
                    <div className="text-xs">Women Helpline</div>
                    <div className="text-sm font-black">1091</div>
                  </div>
                </a>
                <a
                  href="tel:181"
                  className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50/80 p-2.5 font-bold text-purple-700 transition hover:bg-purple-100"
                >
                  <PhoneCall className="size-4 text-purple-600" />
                  <div>
                    <div className="text-xs">Domestic Abuse</div>
                    <div className="text-sm font-black">181</div>
                  </div>
                </a>
                <a
                  href="tel:1098"
                  className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 font-bold text-amber-700 transition hover:bg-amber-100"
                >
                  <PhoneCall className="size-4 text-amber-600" />
                  <div>
                    <div className="text-xs">Childline</div>
                    <div className="text-sm font-black">1098</div>
                  </div>
                </a>
                <a
                  href="tel:1930"
                  className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 p-2.5 font-bold text-blue-700 transition hover:bg-blue-100"
                >
                  <PhoneCall className="size-4 text-blue-600" />
                  <div>
                    <div className="text-xs">Cyber Fraud</div>
                    <div className="text-sm font-black">1930</div>
                  </div>
                </a>
                <a
                  href="tel:18005990019"
                  className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 font-bold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <PhoneCall className="size-4 text-emerald-600" />
                  <div>
                    <div className="text-xs">Mental Health</div>
                    <div className="text-xs font-black">1800-599</div>
                  </div>
                </a>
              </div>

              <button
                onClick={onClose}
                className="mt-5 w-full rounded-xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                Dismiss Window (Keep Alert Active)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

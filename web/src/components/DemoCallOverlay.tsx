import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  MapPin,
  Mic,
  PhoneCall,
  PhoneOff,
  Radio,
  ShieldAlert,
  Volume2,
} from "lucide-react";
import {
  playDemoCallRingtone,
  stopDemoCallRingtone,
  speakDemoCallOperator,
  stopDemoCallOperatorSpeech,
} from "../services/voiceDistressService";

interface DemoCallState {
  isOpen: boolean;
  caller: string;
  number: string;
  phrase: string;
  status: "ringing" | "connected" | "ended";
  duration: number;
}

const DEFAULT_CALLER = "RakshaNet Safety Dispatch";
const DEFAULT_NUMBER = "+91 112 • Emergency SOS Desk";
const DEFAULT_PHRASE = "Mera koi picha kr raha hai";

const TRANSCRIPT_BARS = [10, 20, 15, 26, 13, 22, 17];

export function DemoCallOverlay() {
  const [call, setCall] = useState<DemoCallState>({
    isOpen: false,
    caller: DEFAULT_CALLER,
    number: DEFAULT_NUMBER,
    phrase: DEFAULT_PHRASE,
    status: "ringing",
    duration: 0,
  });

  const timerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Listen for global demo-call events
  useEffect(() => {
    const handleTriggerCall = (event: Event) => {
      const { phrase, caller, number } = (event as CustomEvent).detail || {};

      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);

      setCall({
        isOpen: true,
        caller: caller || DEFAULT_CALLER,
        number: number || DEFAULT_NUMBER,
        phrase: phrase || DEFAULT_PHRASE,
        status: "ringing",
        duration: 0,
      });

      playDemoCallRingtone();
    };

    window.addEventListener("rakshanet:demo-call", handleTriggerCall);
    return () => {
      window.removeEventListener("rakshanet:demo-call", handleTriggerCall);
    };
  }, []);

  // Connected call duration timer
  useEffect(() => {
    if (call.status === "connected") {
      timerRef.current = window.setInterval(() => {
        setCall((prev) => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    }

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [call.status]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    },
    []
  );

  const handleAnswer = useCallback(() => {
    stopDemoCallRingtone();
    setCall((prev) => ({ ...prev, status: "connected", duration: 0 }));
    speakDemoCallOperator(call.phrase);
  }, [call.phrase]);

  const handleDecline = useCallback(() => {
    stopDemoCallRingtone();
    stopDemoCallOperatorSpeech();
    setCall((prev) => ({ ...prev, status: "ended" }));
    closeTimerRef.current = window.setTimeout(() => {
      setCall((prev) => ({ ...prev, isOpen: false }));
    }, 600);
  }, []);

  // Dialog chrome: Escape ends the demo call, background scroll is locked.
  useEffect(() => {
    if (!call.isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleDecline();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [call.isOpen, handleDecline]);

  // Move focus into the dialog without pre-selecting a call action.
  useEffect(() => {
    if (call.isOpen) dialogRef.current?.focus();
  }, [call.isOpen]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const isRinging = call.status === "ringing";
  const isConnected = call.status === "connected";

  return (
    <AnimatePresence>
      {call.isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="rn-call-scrim"
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rn-call-name"
            aria-describedby="rn-call-status"
            initial={{ scale: 0.96, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: 12, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className={`rn-call is-${call.status}`}
          >
            <span className="rn-call-glow" aria-hidden="true" />

            {/* Header ------------------------------------------------- */}
            <header className="rn-call-head">
              <span
                className={`rn-call-pill ${isRinging ? "is-rose" : isConnected ? "is-emerald" : ""}`}
              >
                <Radio className="h-3 w-3" aria-hidden="true" />
                {isRinging
                  ? "Incoming emergency call"
                  : isConnected
                    ? "Call in progress"
                    : "Call ended"}
              </span>
              <span className="rn-call-brand">
                <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                RakshaNet dispatch
              </span>
            </header>

            {/* Avatar ------------------------------------------------ */}
            <div className="rn-call-avatar-wrap">
              {isRinging && (
                <>
                  <span className="rn-call-radar" aria-hidden="true" />
                  <span
                    className="rn-call-radar is-delayed"
                    aria-hidden="true"
                  />
                </>
              )}
              <span className="rn-call-avatar" aria-hidden="true">
                <ShieldAlert className="h-9 w-9" strokeWidth={1.6} />
              </span>
            </div>

            {/* Identity ---------------------------------------------- */}
            <div className="rn-call-identity">
              <h2 id="rn-call-name" className="rn-call-name">
                {call.caller}
              </h2>
              <p className="rn-call-number">{call.number}</p>
              <span className="rn-call-verified">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Verified emergency line
              </span>
            </div>

            {/* Trigger context --------------------------------------- */}
            <p className="rn-call-trigger">
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="rn-call-trigger-label">Trigger phrase</span>
              <span className="rn-call-trigger-phrase">“{call.phrase}”</span>
            </p>

            {/* Status / timer ---------------------------------------- */}
            <div
              id="rn-call-status"
              className="rn-call-status"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {isRinging ? (
                <>
                  <span className="rn-call-status-line is-rose">
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                    Ringing — demo escape call
                  </span>
                  <span className="rn-call-hint">
                    Answer to hear the dispatcher, or decline to dismiss.
                  </span>
                </>
              ) : isConnected ? (
                <>
                  <span className="sr-only">
                    Call connected. Dispatcher speaking.
                  </span>
                  <span className="rn-call-timer" aria-hidden="true">
                    {formatTimer(call.duration)}
                  </span>
                  <span className="rn-call-status-line is-emerald" aria-hidden="true">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Voice operator active
                    <span className="rn-call-dot" aria-hidden="true" />
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    Location shared
                  </span>
                </>
              ) : (
                <>
                  <span className="rn-call-status-line">Call ended</span>
                  <span className="rn-call-hint">Closing the demo call…</span>
                </>
              )}
            </div>

            {/* Dispatcher transcript ---------------------------------- */}
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rn-call-transcript"
              >
                <div className="rn-call-transcript-head">
                  <span>
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Dispatcher speaking
                  </span>
                  <span className="rn-call-wave" aria-hidden="true">
                    {TRANSCRIPT_BARS.map((height, index) => (
                      <span
                        key={index}
                        className="rn-call-bar"
                        style={{
                          height: `${height}px`,
                          animationDelay: `${index * 110}ms`,
                        }}
                      />
                    ))}
                  </span>
                </div>
                <p>
                  “RakshaNet command here. Distress detected for{" "}
                  <strong>‘{call.phrase}’</strong>. Emergency SMS and WhatsApp
                  alerts have been sent to your guardians with your live
                  location. Help is on the way.”
                </p>
              </motion.div>
            )}

            {/* Actions ----------------------------------------------- */}
            <div className="rn-call-actions">
              {isRinging ? (
                <>
                  <button
                    type="button"
                    className="rn-call-action is-decline"
                    onClick={handleDecline}
                  >
                    <span className="rn-call-action-icon" aria-hidden="true">
                      <PhoneOff className="h-5 w-5" />
                    </span>
                    Decline
                  </button>
                  <button
                    type="button"
                    className="rn-call-action is-answer"
                    onClick={handleAnswer}
                  >
                    <span className="rn-call-action-icon" aria-hidden="true">
                      <PhoneCall className="h-5 w-5" />
                    </span>
                    Answer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="rn-call-action is-end"
                  onClick={handleDecline}
                >
                  <span className="rn-call-action-icon" aria-hidden="true">
                    <PhoneOff className="h-5 w-5" />
                  </span>
                  End emergency call
                </button>
              )}
            </div>

            <p className="rn-call-foot">
              Demo call only — no real call is placed. Ringtone and voice are
              simulated in the browser.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

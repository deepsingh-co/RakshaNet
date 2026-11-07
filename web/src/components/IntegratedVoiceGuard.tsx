import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AudioLines,
  CheckCircle2,
  Languages,
  Mic,
  PhoneCall,
  Plus,
  Radio,
  RotateCcw,
  ShieldCheck,
  Siren,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import {
  getTriggerKeywords,
  addTriggerKeyword,
  removeTriggerKeyword,
  resetTriggerKeywords,
  checkDistressKeywords,
  executeVoiceDistressDispatch,
} from "../services/voiceDistressService";
import { useSafetyStore } from "../store/safetyStore";

interface IntegratedVoiceGuardProps {
  variant?: "full" | "compact" | "drawer";
  onClose?: () => void;
}

const DEFAULT_METER = [22, 34, 52, 68, 44, 30, 58, 72, 50, 36, 62, 46];

const FLAGSHIP_WORD = /picha|peecha|following/i;

export function IntegratedVoiceGuard({
  variant = "full",
  onClose,
}: IntegratedVoiceGuardProps) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [heardTranscript, setHeardTranscript] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [micBlocked, setMicBlocked] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [supported, setSupported] = useState(() => {
    if (typeof window === "undefined") return true;
    return Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  });
  const [audioMeter, setAudioMeter] = useState<number[]>(DEFAULT_METER);

  const inputId = useId();
  const isMountedRef = useRef(true);
  const feedbackTimer = useRef<number | null>(null);

  const flash = useCallback((message: string) => {
    setFeedbackMsg(message);
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedbackMsg(""), 4000);
  }, []);

  const refreshKeywords = useCallback(() => {
    setKeywords(getTriggerKeywords());
  }, []);

  useEffect(() => {
    refreshKeywords();
    const handleUpdate = () => refreshKeywords();
    window.addEventListener("rakshanet:keywords-updated", handleUpdate);
    return () => window.removeEventListener("rakshanet:keywords-updated", handleUpdate);
  }, [refreshKeywords]);

  useEffect(
    () => () => {
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    },
    []
  );

  const handleTrigger = useCallback(
    async (phrase: string, source: "gnani.ai" | "web-speech" | "manual-test") => {
      flash(`Activated by “${phrase}”. Alerts and the demo call are being dispatched.`);
      await executeVoiceDistressDispatch(phrase, source);
    },
    [flash]
  );

  // Continuous auto-listening without requiring clicks.
  useEffect(() => {
    isMountedRef.current = true;
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      setIsListening(false);
      return;
    }

    setSupported(true);

    let recog: any = null;
    let blocked = false;

    const startListening = () => {
      try {
        if (recog) {
          try {
            recog.abort();
          } catch {
            /* ignore */
          }
        }

        recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = "hi-IN";

        recog.onstart = () => {
          if (!isMountedRef.current) return;
          setIsListening(true);
          setMicBlocked(false);
        };

        recog.onresult = (event: any) => {
          let text = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
          }
          if (!isMountedRef.current) return;

          setHeardTranscript(text.trim());
          setAudioMeter(
            Array.from({ length: DEFAULT_METER.length }, () =>
              Math.floor(20 + Math.random() * 64)
            )
          );

          const check = checkDistressKeywords(text);
          if (check.isDistress && !useSafetyStore.getState().sosActive) {
            handleTrigger(check.matchedKeyword, "web-speech");
          }
        };

        recog.onerror = (event: any) => {
          if (!isMountedRef.current) return;
          const denied =
            event?.error === "not-allowed" || event?.error === "service-not-allowed";
          if (denied) {
            blocked = true;
            setIsListening(false);
            setMicBlocked(true);
          }
        };

        recog.onend = () => {
          if (!isMountedRef.current) return;
          if (blocked || useSafetyStore.getState().sosActive) {
            setIsListening(false);
            return;
          }
          try {
            recog.start();
          } catch {
            /* ignore */
          }
        };

        recog.start();
      } catch {
        if (isMountedRef.current) {
          setSupported(false);
          setIsListening(false);
        }
      }
    };

    startListening();

    return () => {
      isMountedRef.current = false;
      if (recog) {
        try {
          recog.abort();
        } catch {
          /* ignore */
        }
      }
    };
  }, [handleTrigger, retryKey]);

  const handleAddWord = (event: React.FormEvent) => {
    event.preventDefault();
    const phrase = newWord.trim();
    if (!phrase) return;

    const exists = keywords.some(
      (keyword) => keyword.toLowerCase() === phrase.toLowerCase()
    );
    if (exists) {
      flash(`“${phrase}” is already one of your trigger phrases.`);
      return;
    }

    const updated = addTriggerKeyword(phrase);
    setKeywords(updated);
    setNewWord("");
    flash(`Added trigger phrase “${phrase}”.`);
  };

  const handleRemoveWord = (word: string) => {
    const updated = removeTriggerKeyword(word);
    setKeywords(updated);
    flash(`Removed “${word}” from your trigger phrases.`);
  };

  const handleResetDefaults = () => {
    const updated = resetTriggerKeywords();
    setKeywords(updated);
    flash("Restored the default trigger phrases.");
  };

  const handleSimulateDemoCall = () => {
    window.dispatchEvent(
      new CustomEvent("rakshanet:demo-call", {
        detail: {
          phrase: "Mera koi picha kr raha hai",
          caller: "RakshaNet Safety Dispatch",
          number: "+91 112 • Emergency SOS Desk",
        },
      })
    );
  };

  const handleRetryMic = () => {
    setMicBlocked(false);
    setIsListening(false);
    flash("Requesting microphone access again…");
    setRetryKey((key) => key + 1);
  };

  const status = !supported
    ? {
        label: "Unavailable",
        toneClass: "is-amber",
        detail: "This browser can't run speech detection",
      }
    : micBlocked
      ? {
          label: "Mic blocked",
          toneClass: "is-rose",
          detail: "Allow microphone access to resume",
        }
      : isListening
        ? {
            label: "Listening",
            toneClass: "is-emerald",
            detail: "Auto listening · zero-click",
          }
        : {
            label: "Starting",
            toneClass: "is-amber",
            detail: "Connecting to the microphone",
          };

  const barsLive = supported && !micBlocked;

  return (
    <section
      className="rn-voice"
      data-variant={variant}
      aria-label="AI voice distress guard"
    >
      {/* Header ---------------------------------------------------- */}
      <header className="rn-voice-head">
        <span className="rn-voice-mark" aria-hidden="true">
          <Mic className="h-[18px] w-[18px]" strokeWidth={1.9} />
          <span className={`rn-voice-mark-dot ${isListening ? "is-live" : ""}`} />
        </span>

        <div className="rn-voice-heading">
          <div className="rn-voice-kicker">
            Ambient detection
            <span className="rn-voice-brand">
              <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
              Gnani.ai
            </span>
          </div>
          <h2 className="rn-voice-title">Voice distress guard</h2>
          <p className="rn-voice-sub">
            Zero-click monitoring. Say a trigger phrase and your circle is alerted.
          </p>
        </div>

        <div className="rn-voice-head-actions">
          {onClose && (
            <button
              type="button"
              className="rn-voice-close"
              onClick={onClose}
              aria-label="Close voice guard"
              autoFocus
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      {/* Live stage ------------------------------------------------ */}
      <div className="rn-voice-stage">
        <div className="rn-voice-stage-top">
          <span className="rn-voice-stage-label">
            <AudioLines className="h-3.5 w-3.5" aria-hidden="true" />
            Heard just now
          </span>
          <span className={`rn-voice-status ${status.toneClass}`}>
            <span className="rn-voice-status-dot" aria-hidden="true" />
            {status.label}
          </span>
        </div>

        <div className="rn-voice-wave" aria-hidden="true">
          {audioMeter.map((height, index) => (
            <span
              key={index}
              className={`rn-voice-bar ${barsLive && isListening ? "is-live" : ""}`}
              style={{
                height: `${Math.max(6, Math.min(46, height * 0.62))}px`,
                animationDelay: `${index * 70}ms`,
              }}
            />
          ))}
        </div>

        <p
          className="rn-voice-quote"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {heardTranscript ? (
            `“${heardTranscript}”`
          ) : (
            <span className="rn-voice-quote-idle">Waiting for a phrase…</span>
          )}
        </p>

        <div className="rn-voice-meta">
          <span>
            <Radio className="h-3 w-3" aria-hidden="true" />
            {status.detail}
          </span>
          <span>
            <Languages className="h-3 w-3" aria-hidden="true" />
            Hindi + English
          </span>
          <span>
            <Zap className="h-3 w-3" aria-hidden="true" />
            Dispatch under 1s
          </span>
        </div>
      </div>

      {/* Actions --------------------------------------------------- */}
      <div className="rn-voice-actions">
        <button
          type="button"
          className="rn-voice-btn is-accent"
          onClick={() => handleTrigger("Mera koi picha kr raha hai", "manual-test")}
          title="Simulate a full trigger with SMS, WhatsApp and the demo call"
        >
          <Siren className="h-3.5 w-3.5" aria-hidden="true" />
          Test trigger
        </button>
        <button
          type="button"
          className="rn-voice-btn"
          onClick={handleSimulateDemoCall}
          title="Preview the demo escape call"
        >
          <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
          Demo call
        </button>
        {micBlocked && (
          <button type="button" className="rn-voice-btn is-quiet" onClick={handleRetryMic}>
            <Mic className="h-3.5 w-3.5" aria-hidden="true" />
            Retry mic
          </button>
        )}
      </div>

      {feedbackMsg && (
        <div className="rn-voice-feedback" role="status" aria-live="polite" aria-atomic="true">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Trigger phrases ------------------------------------------- */}
      <div className="rn-voice-phrases">
        <div className="rn-voice-phrases-head">
          <div>
            <h3 className="rn-voice-phrases-title">
              Trigger phrases
              <span className="rn-voice-count">{keywords.length}</span>
            </h3>
            <p className="rn-voice-phrases-sub">
              Spoken in Hindi or English. Remove any phrase with its close button.
            </p>
          </div>
          <button
            type="button"
            className="rn-voice-reset"
            onClick={handleResetDefaults}
            title="Restore the default trigger phrases"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Reset
          </button>
        </div>

        <form className="rn-voice-add" onSubmit={handleAddWord}>
          <label className="sr-only" htmlFor={inputId}>
            Add a trigger phrase
          </label>
          <div className="rn-voice-input-wrap">
            <Plus className="rn-voice-input-icon" aria-hidden="true" />
            <input
              id={inputId}
              type="text"
              value={newWord}
              onChange={(event) => setNewWord(event.target.value)}
              placeholder="Add a phrase, e.g. “Code Red”"
              className="rn-voice-input"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="rn-voice-add-btn" disabled={!newWord.trim()}>
            Add
          </button>
        </form>

        {keywords.length === 0 ? (
          <p className="rn-voice-empty">
            No trigger phrases yet. Add one to arm voice detection.
          </p>
        ) : (
          <ul className="rn-voice-chips">
            {keywords.map((word) => (
              <li
                key={word}
                className={`rn-voice-chip ${FLAGSHIP_WORD.test(word) ? "is-urgent" : ""}`}
              >
                <span>{word}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveWord(word)}
                  aria-label={`Remove “${word}”`}
                  title={`Remove “${word}”`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rn-voice-foot">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        <span>
          Listening runs only while RakshaNet is open. A matching phrase dispatches
          SOS, SMS and the demo call.
        </span>
      </div>
    </section>
  );
}

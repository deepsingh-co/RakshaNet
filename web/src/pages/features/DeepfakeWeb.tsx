import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Mic, Shield, AlertTriangle, CheckCircle2, ArrowLeft, Sparkles,
  AudioLines, Activity, Waves, Square,
} from "lucide-react";
import { Card, Pill } from "../../components/ui";

import { aiServicesApi } from "../../api/endpoints";

interface Analysis {
  isDeepfake: boolean;
  confidence: number;
  spectralAnomalies: number;
  voiceMatch: number;
  artifacts: string[];
}

export default function DeepfakeWeb() {
  const [isRecording, setIsRecording] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setAnalysis(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
    console.log("🎤 Requesting mic access to record real soundwaves...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("✅ Microphone access granted.");
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        console.log(`📦 Compiled audio blob size: ${audioBlob.size} bytes. Transmitting to backend...`);

        try {
          console.log("📡 Sending POST request to live FastAPI on http://localhost:8000/ai/deepfake...");
          const data = await aiServicesApi.detectDeepfake(audioBlob);
          console.log("📥 Received response from FastAPI deepfake detector:", data);

          const result: Analysis = {
            isDeepfake: data.is_deepfake,
            confidence: data.confidence,
            spectralAnomalies: data.spectral_anomalies,
            voiceMatch: data.voice_match,
            artifacts: data.artifacts || [],
          };
          console.log("📊 Updated frontend state result mapping:", result);
          setAnalysis(result);
          setHistory((prev) => [result, ...prev].slice(0, 5));
        } catch (e) {
          console.error("❌ Failed to run deepfake voice analyzer:", e);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error("❌ Failed to access microphone:", err);
      alert("Microphone permission denied or unsupported in this browser/protocol.");
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    clearInterval(timerRef.current);
    console.log("🎤 Stopping MediaRecorder and releasing mic tracks...");

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/app/features" className="p-2 glass-chip hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-pink-300">Voice Security</div>
          <h1 className="text-3xl font-black">Deepfake Voice Defender</h1>
          <p className="text-slate-400 text-sm mt-1">Detect AI-cloned voices with spectral analysis</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main recorder */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-pink-300" />
              <span className="text-sm font-semibold">How it works</span>
            </div>
            <div className="grid md:grid-cols-4 gap-3">
              {[
                { n: "1", t: "Record", d: "Capture 5-10s of caller's voice" },
                { n: "2", t: "Analyze", d: "FFT + phase discontinuity" },
                { n: "3", t: "Detect", d: "AI artifacts & anomalies" },
                { n: "4", t: "Alert", d: "Warn if deepfake detected" },
              ].map((s) => (
                <div key={s.n} className="glass p-3 rounded-xl">
                  <div className="text-2xl font-black text-gradient-pink">{s.n}</div>
                  <div className="text-sm font-bold mt-1">{s.t}</div>
                  <div className="text-xs text-slate-400">{s.d}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recording UI */}
          <Card>
            <div className="text-center py-8">
              <div className="relative inline-block">
                {isRecording && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-pink-500/30 animate-ping" />
                    <div className="absolute -inset-4 rounded-full border-2 border-pink-400/40 animate-pulse" />
                  </>
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative w-32 h-32 rounded-full grid place-items-center transition-all ${
                    isRecording
                      ? "bg-gradient-to-br from-red-500 to-red-700 glow-pink"
                      : "bg-gradient-to-br from-pink-500 to-rose-600 glow-pink hover:scale-105"
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-12 h-12 text-white" fill="white" />
                  ) : (
                    <Mic className="w-12 h-12 text-white" />
                  )}
                </button>
              </div>

              <div className="mt-6">
                <div className="text-lg font-bold">
                  {isRecording ? `Recording... ${recordingTime}s` : "Tap to record caller"}
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  {isRecording ? "Tap again to stop & analyze" : "Hold phone near speaker for best results"}
                </div>
              </div>

              {isRecording && (
                <div className="mt-6 flex items-center justify-center gap-1">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-gradient-to-t from-pink-500 to-cyan-400 rounded-full"
                      animate={{ height: [8, Math.random() * 40 + 10, 8] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Analysis Result */}
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card glow={analysis.isDeepfake ? "pink" : "emerald"}>
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl grid place-items-center ${
                    analysis.isDeepfake ? "bg-red-500/20" : "bg-emerald-500/20"
                  }`}>
                    {analysis.isDeepfake ? (
                      <AlertTriangle className="w-7 h-7 text-red-400" />
                    ) : (
                      <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-xl font-black">
                      {analysis.isDeepfake ? "⚠ DEEPFAKE DETECTED" : "✓ AUTHENTIC VOICE"}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      Confidence: {(analysis.confidence * 100).toFixed(1)}%
                    </div>
                    {analysis.isDeepfake && (
                      <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-400/30 text-sm text-red-200">
                        <AlertTriangle className="w-4 h-4 inline mr-1" />
                        This voice shows AI-cloning artifacts. <strong>Do NOT</strong> send money or share sensitive info.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div className="glass p-3 rounded-xl">
                    <div className="text-xs text-slate-400">Spectral Anomalies</div>
                    <div className={`text-2xl font-black tabular ${
                      analysis.spectralAnomalies > 2 ? "text-red-300" : "text-emerald-300"
                    }`}>{analysis.spectralAnomalies}</div>
                  </div>
                  <div className="glass p-3 rounded-xl">
                    <div className="text-xs text-slate-400">Voice Match</div>
                    <div className="text-2xl font-black tabular text-cyan-300">
                      {(analysis.voiceMatch * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="glass p-3 rounded-xl">
                    <div className="text-xs text-slate-400">Confidence</div>
                    <div className="text-2xl font-black tabular text-pink-300">
                      {(analysis.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {analysis.artifacts.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-slate-400 mb-2">Detected artifacts:</div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.artifacts.map((a) => (
                        <Pill key={a} tone="pink">{a}</Pill>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-cyan-300" />
              <span className="text-sm font-semibold">ML Model</span>
            </div>
            <div className="text-xs text-slate-400 space-y-2">
              <div className="flex justify-between">
                <span>Algorithm</span>
                <span className="text-cyan-300 font-semibold">FFT + Phase</span>
              </div>
              <div className="flex justify-between">
                <span>Features</span>
                <span className="text-cyan-300 font-semibold">5 spectral</span>
              </div>
              <div className="flex justify-between">
                <span>Endpoint</span>
                <span className="text-cyan-300 font-mono text-[10px]">/ai/deepfake</span>
              </div>
              <div className="flex justify-between">
                <span>Latency</span>
                <span className="text-emerald-300 font-semibold">~2.5s</span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-semibold">What it detects</span>
            </div>
            <div className="space-y-2 text-xs">
              {[
                { i: Waves, t: "Spectral flatness", d: "Unnatural uniformity" },
                { i: AudioLines, t: "Phase discontinuity", d: "TTS artifacts" },
                { i: Activity, t: "HF energy loss", d: "Missing harmonics" },
                { i: Sparkles, t: "RMS consistency", d: "Too-perfect patterns" },
              ].map((f) => (
                <div key={f.t} className="flex items-start gap-2 glass p-2 rounded-lg">
                  <f.i className="w-3.5 h-3.5 text-amber-300 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-white">{f.t}</div>
                    <div className="text-slate-400">{f.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {history.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-pink-300" />
                <span className="text-sm font-semibold">Recent Scans</span>
              </div>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 glass p-2 rounded-lg text-xs">
                    {h.isDeepfake ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span className="flex-1">{h.isDeepfake ? "Deepfake" : "Authentic"}</span>
                    <span className="text-slate-400 tabular">{(h.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

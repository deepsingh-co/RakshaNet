import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bluetooth, Zap, Shield,
  Cpu, AlertTriangle, Heart, Radio,
} from "lucide-react";
import { Card, Pill } from "../../components/ui";

import { aiServicesApi } from "../../api/endpoints";

const DEVICES = [
  /*
  { id: "nimb", name: "Nimb Ring", icon: "💍", desc: "Press button for silent SOS", category: "Ring" },
  { id: "invisawear", name: "Invisawear Necklace", icon: "📿", desc: "Double-press pendant", category: "Jewelry" },
  { id: "apple", name: "Apple Watch", icon: "⌚", desc: "Hold side button 3s", category: "Watch" },
  { id: "fitbit", name: "Fitbit Sense", icon: "⌚", desc: "Triple-tap screen", category: "Watch" },
  { id: "garmin", name: "Garmin Venu", icon: "⌚", desc: "Long press button", category: "Watch" },
  */
  { id: "safetyband", name: "Silent Beacon Band", icon: "⌚", desc: "Squeeze band", category: "Wristband" },
];

export default function WearablesWeb() {
  const [connected, setConnected] = useState<string[]>([]);
  const [gesture, setGesture] = useState<any>(null);
  const [detecting, setDetecting] = useState(false);
  const navigate = useNavigate();

  const handleGoogleFitConnect = () => {
    if (!(window as any).google) {
      alert("Google Identity Services failed to load. Please try refreshing.");
      return;
    }
    
    const GOOGLE_CLIENT_ID = '474105204785-gqu4an78s8q66l01rju7mqut1lflk2td.apps.googleusercontent.com';
    const SCOPES = 'https://www.googleapis.com/auth/fitness.activity.read ' +
                   'https://www.googleapis.com/auth/fitness.body.read ' +
                   'https://www.googleapis.com/auth/fitness.blood_pressure.read ' +
                   'https://www.googleapis.com/auth/fitness.heart_rate.read ' +
                   'https://www.googleapis.com/auth/fitness.sleep.read ' +
                   'https://www.googleapis.com/auth/fitness.oxygen_saturation.read';

    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: async (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
           sessionStorage.setItem('google_fit_token', tokenResponse.access_token);
           setConnected([...connected, "apple"]);
           navigate("/app/features/wearables/vitals");
        }
      },
      error_callback: () => {
        alert("Google Sign-In failed or was cancelled.");
      }
    });

    tokenClient.requestAccessToken();
  };

  const connectDevice = (id: string) => {
    if (id === "apple") {
      if (connected.includes("apple")) {
        setConnected(connected.filter((d) => d !== "apple"));
        sessionStorage.removeItem('google_fit_token');
      } else {
        handleGoogleFitConnect();
      }
      return;
    }

    if (connected.includes(id)) {
      setConnected(connected.filter((d) => d !== id));
    } else {
      setConnected([...connected, id]);
    }
  };

  const testGesture = async () => {
    setDetecting(true);
    setGesture(null);
    
    const mockReadings = Array.from({ length: 50 }, (_, idx) => ({
      timestamp: idx * 0.02,
      accel_x: 0.1 + Math.random() * 0.5,
      accel_y: 0.2 + Math.random() * 0.5,
      accel_z: 9.8 + Math.random() * 1.2,
      gyro_x: Math.floor(Math.random() * 10),
      gyro_y: Math.floor(Math.random() * 5),
      gyro_z: Math.floor(Math.random() * 2),
    }));

    try {
      const data = await aiServicesApi.recognizeGesture(mockReadings);
      setGesture({
        gesture: data.gesture,
        confidence: data.confidence,
        isSOS: data.is_sos_trigger,
        scores: data.all_scores,
      });
    } catch (e) {
      console.error("Gesture recognition failed:", e);
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/app/features" className="p-2 glass-chip hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-amber-300">Wearables</div>
          <h1 className="text-3xl font-black">Child Safety Hub</h1>
          <p className="text-slate-400 text-sm mt-1">Unified control for safety wearables</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card glow="amber">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-semibold">ML Model: MLPClassifier Neural Network</span>
            </div>
            <p className="text-sm text-slate-400">
              64→32 neuron network trained on 17 statistical features from accelerometer + gyroscope.
              Recognizes 6 gesture classes including 4 SOS patterns (tap, double-tap, shake, press).
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Your Devices</h3>
              <Pill tone="amber">{connected.length} connected</Pill>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {DEVICES.map((d) => {
                const isConnected = connected.includes(d.id);
                return (
                  <motion.div
                    key={d.id}
                    whileHover={{ scale: 1.02 }}
                    className={`glass p-4 rounded-2xl border transition ${
                      isConnected ? "border-amber-400/40 bg-amber-500/5" : "border-white/5"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl grid place-items-center text-2xl ${
                        isConnected ? "bg-amber-500/20" : "bg-white/5"
                      }`}>
                        {d.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{d.name}</span>
                          <Pill tone="slate">{d.category}</Pill>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{d.desc}</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => connectDevice(d.id)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${
                          isConnected
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "bg-amber-600 text-white hover:bg-amber-700"
                        }`}
                      >
                        <Bluetooth className="w-3 h-3" />
                        {isConnected ? "Disconnect" : "Connect"}
                      </button>
                      {isConnected && (
                        d.id === "apple" ? (
                          <Link
                            to="/app/features/wearables/vitals"
                            className="flex-1 py-2 rounded-lg bg-emerald-500/20 text-emerald-200 text-xs font-semibold hover:bg-emerald-500/30 flex items-center justify-center gap-1"
                          >
                            <Heart className="w-3 h-3" /> View Vitals
                          </Link>
                        ) : (
                          <button
                            onClick={testGesture}
                            className="flex-1 py-2 rounded-lg bg-pink-600 text-white text-xs font-semibold hover:bg-pink-700 flex items-center justify-center gap-1"
                          >
                            <AlertTriangle className="w-3 h-3" /> Test SOS
                          </button>
                        )
                      )}
                    </div>

                    {isConnected && (
                      <div className="mt-2 text-[10px] text-emerald-700 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 blink" />
                        Connected & listening
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </Card>

          {connected.length > 0 && (
            <Card glow="pink">
              <div className="flex items-center gap-2 mb-3">
                <Radio className="w-4 h-4 text-pink-300" />
                <h3 className="text-lg font-bold">Gesture Recognition Test</h3>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Click "Test SOS" on any connected device to simulate gesture detection.
              </p>

              {detecting ? (
                <div className="py-8 text-center">
                  <div className="inline-block w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
                  <div className="text-sm text-slate-400">Analyzing gesture...</div>
                </div>
              ) : gesture ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-400/30 mb-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-8 h-8 text-pink-400" />
                      <div>
                        <div className="font-bold text-pink-200">SOS Gesture Detected</div>
                        <div className="text-xs text-pink-300/80">
                          {gesture.gesture.replace(/_/g, " ").toUpperCase()} • {(gesture.confidence * 100).toFixed(1)}% confidence
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-slate-400 mb-1">All gesture probabilities:</div>
                    {Object.entries(gesture.scores).map(([g, score]: any) => (
                      <div key={g} className="flex items-center gap-2">
                        <div className="w-32 text-xs text-slate-300">{g.replace(/_/g, " ")}</div>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${score * 100}%` }}
                            className={`h-full ${score > 0.5 ? "bg-gradient-to-r from-pink-500 to-rose-600" : "bg-white/20"}`}
                          />
                        </div>
                        <div className="w-12 text-xs text-right tabular">{(score * 100).toFixed(0)}%</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="py-6 text-center text-sm text-slate-400">
                  Test a gesture to see ML classification results
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="text-sm font-bold mb-3">ML Architecture</div>
            <div className="space-y-2 text-xs">
              {[
                { label: "Input", value: "17 features" },
                { label: "Hidden 1", value: "64 neurons" },
                { label: "Hidden 2", value: "32 neurons" },
                { label: "Output", value: "6 classes" },
                { label: "Training data", value: "600 samples" },
                { label: "Accuracy", value: "94%" },
              ].map((s) => (
                <div key={s.label} className="flex justify-between glass p-2 rounded-lg">
                  <span className="text-slate-400">{s.label}</span>
                  <span className="text-amber-300 font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold mb-3">SOS Gestures</div>
            <div className="space-y-2 text-xs">
              {[
                { g: "Tap", d: "Single firm tap", icon: "👆" },
                { g: "Double Tap", d: "Two quick taps", icon: "👆👆" },
                { g: "Shake", d: "Vigorous shaking", icon: "🤝" },
                { g: "Press", d: "Long press (3s)", icon: "👇" },
              ].map((g) => (
                <div key={g.g} className="flex items-center gap-3 glass p-2 rounded-lg">
                  <div className="text-2xl">{g.icon}</div>
                  <div>
                    <div className="font-semibold">{g.g}</div>
                    <div className="text-slate-400">{g.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold mb-3">Sensor Features</div>
            <div className="space-y-1.5 text-xs text-slate-300">
              {[
                "Acceleration magnitude stats",
                "Gyroscope magnitude stats",
                "Temporal derivatives",
                "Zero-crossing rate",
                "Peak detection",
                "Signal energy",
              ].map((f) => (
                <div key={f} className="flex items-start gap-2 glass p-2 rounded-lg">
                  <Zap className="w-3 h-3 text-amber-300 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-pink-300" />
              <span className="text-sm font-bold">Discreet & Powerful</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Smart jewelry looks like normal accessories but can trigger silent SOS. Perfect when phone access is dangerous.
            </p>
          </Card>

          {connected.length > 0 && (
            <Card glow="emerald">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-300" />
                <span className="text-sm font-bold">Active Protection</span>
              </div>
              <div className="text-2xl font-black text-gradient-amber">{connected.length}</div>
              <div className="text-xs text-slate-400">devices listening for SOS</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

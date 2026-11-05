import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Camera, ShieldCheck, Car, Navigation, CheckCircle2, AlertTriangle, Play, MapPin, Upload } from "lucide-react";
import { Card } from "../ui";
import { api } from "../api/client";

export default function SafeRideWeb() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Ride State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [driverVerified, setDriverVerified] = useState(false);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");

  const [activeRide, setActiveRide] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for active ride on mount
  useEffect(() => {
    api.get("/api/v1/safe-ride/active").then(res => {
      if (res.data && res.data.id) {
        setActiveRide(res.data);
      }
    }).catch(() => {});
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const sendOtp = async () => {
    if (!driverMobile || driverMobile.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formattedNumber = driverMobile.startsWith("+") ? driverMobile : `+91${driverMobile}`;
      await api.post("/api/v1/safe-ride/driver-otp/send", { mobile: formattedNumber });
      setOtpSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length < 4) return;
    setLoading(true);
    setError("");
    try {
      const formattedNumber = driverMobile.startsWith("+") ? driverMobile : `+91${driverMobile}`;
      const { data } = await api.post("/api/v1/safe-ride/driver-otp/verify", {
        mobile: formattedNumber,
        otp,
      });
      if (data.verified) {
        setDriverVerified(true);
        setError("");
      } else {
        setError("Invalid OTP. Please try again.");
      }
    } catch (err: any) {
      setError("OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const startJourney = async () => {
    if (!vehicleNumber || !source || !destination) {
      setError("Vehicle number, source, and destination are required.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        vehicleNumber,
        vehiclePhotoUrl: photoPreview, // base64
        driverName,
        driverMobile,
        driverVerified,
        sourceLocation: source,
        destinationLocation: destination
      };
      const { data } = await api.post("/api/v1/safe-ride/start", payload);
      setActiveRide(data);
      // Start mock location tracking locally
      startMockLocationUpdates(data.id);
    } catch {
      setError("Failed to start journey.");
    } finally {
      setLoading(false);
    }
  };

  const startMockLocationUpdates = (rideId: string) => {
    // In a real app, use navigator.geolocation.watchPosition
    setInterval(() => {
      api.post(`/api/v1/safe-ride/${rideId}/location`, { location: "28.7041,77.1025" }).catch(()=>{});
    }, 30000); // every 30 seconds
  };

  const endJourney = async () => {
    if (!activeRide) return;
    try {
      await api.post(`/api/v1/safe-ride/${activeRide.id}/end`);
      setActiveRide(null);
      setStep(1);
      // Reset form
      setPhotoPreview(null);
      setVehicleNumber("");
      setDriverMobile("");
      setDriverName("");
      setSource("");
      setDestination("");
      setOtpSent(false);
      setDriverVerified(false);
    } catch {
      alert("Failed to end journey");
    }
  };

  if (activeRide) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Link to="/features" className="p-2 glass-chip hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-400">Live Journey</div>
            <h1 className="text-3xl font-black">Safe Ride Active</h1>
          </div>
        </div>

        <Card glow="emerald">
          <div className="text-center py-10 space-y-4">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
              <div className="relative w-full h-full bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                <Navigation className="w-10 h-10 text-white animate-pulse" />
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-bold">Your Guardians are monitoring</h2>
              <p className="text-slate-400 text-sm mt-1">Vehicle {activeRide.vehicleNumber} is being tracked.</p>
            </div>

            <button
              onClick={endJourney}
              className="mt-6 px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
            >
              End Safe Journey
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to="/features" className="p-2 glass-chip hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-blue-400">Journey Protection</div>
          <h1 className="text-3xl font-black">Safe Ride Verification</h1>
          <p className="text-slate-400 text-sm mt-1">Verify driver details and share live journey tracking with your guardians.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          
          {/* STEP 1: PHOTO */}
          <Card className={`transition-all ${step !== 1 ? 'opacity-50 pointer-events-none' : 'ring-1 ring-blue-500/50'} relative overflow-hidden`}>
            {step > 1 && <div className="absolute right-4 top-4"><CheckCircle2 className="w-5 h-5 text-emerald-400" /></div>}
            <div className="flex items-center gap-2 mb-4">
              <Camera className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold">1. Vehicle Photo</h3>
            </div>
            <div className="space-y-4">
              {photoPreview ? (
                <div className="relative h-48 w-full rounded-xl overflow-hidden border border-white/10">
                  <img src={photoPreview} alt="Vehicle" className="w-full h-full object-cover" />
                  <button onClick={() => setPhotoPreview(null)} className="absolute top-2 right-2 p-2 bg-black/50 rounded-lg hover:bg-black/70 backdrop-blur-sm">
                    Change
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="h-40 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition group"
                >
                  <Upload className="w-8 h-8 text-slate-500 group-hover:text-blue-400 mb-2 transition" />
                  <p className="text-sm font-medium">Capture or Upload Vehicle Photo</p>
                  <p className="text-xs text-slate-500 mt-1">Number plate should be visible</p>
                </div>
              )}
              <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handlePhotoUpload} />
              {step === 1 && (
                <button onClick={() => setStep(2)} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold transition">
                  {photoPreview ? "Continue" : "Skip Photo"}
                </button>
              )}
            </div>
          </Card>

          {/* STEP 2: VEHICLE & DRIVER */}
          <Card className={`transition-all ${step !== 2 ? 'opacity-50 pointer-events-none' : 'ring-1 ring-blue-500/50'} relative`}>
            {step > 2 && <div className="absolute right-4 top-4"><CheckCircle2 className="w-5 h-5 text-emerald-400" /></div>}
            <div className="flex items-center gap-2 mb-4">
              <Car className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold">2. Vehicle & Driver Details</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">VEHICLE NUMBER <span className="text-red-400">*</span></label>
                <input 
                  type="text" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. MH02AB1234" 
                  className="w-full glass px-4 py-3 rounded-xl text-sm font-mono uppercase outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1 block">DRIVER NAME</label>
                  <input 
                    type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Optional" 
                    className="w-full glass px-4 py-3 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1 block">DRIVER MOBILE</label>
                  <input 
                    type="tel" value={driverMobile} onChange={(e) => setDriverMobile(e.target.value)}
                    placeholder="10 digit number" 
                    className="w-full glass px-4 py-3 rounded-xl text-sm outline-none"
                  />
                </div>
              </div>

              {driverMobile.length >= 10 && !driverVerified && (
                <div className="p-3 glass rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Verify Driver (Optional but recommended)</span>
                    {!otpSent ? (
                      <button onClick={sendOtp} disabled={loading} className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-600/30">
                        {loading ? "Sending..." : "Send OTP"}
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400">OTP Sent via SMS</span>
                    )}
                  </div>
                  
                  {otpSent && (
                    <div className="flex gap-2">
                      <input 
                        type="text" value={otp} onChange={e => setOtp(e.target.value)}
                        placeholder="Enter 4-digit OTP" 
                        className="flex-1 glass px-3 py-2 rounded-lg text-sm text-center tracking-widest font-mono"
                        maxLength={4}
                      />
                      <button onClick={verifyOtp} disabled={loading || otp.length !== 4} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-bold disabled:opacity-50">
                        Verify
                      </button>
                    </div>
                  )}
                </div>
              )}

              {driverVerified && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Driver Verified Successfully
                </div>
              )}

              {error && step === 2 && <p className="text-red-400 text-sm text-center">{error}</p>}

              {step === 2 && (
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-medium transition">Back</button>
                  <button 
                    onClick={() => {
                      if (!vehicleNumber) { setError("Vehicle number is required"); return; }
                      setError(""); setStep(3);
                    }} 
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold transition"
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* STEP 3: JOURNEY */}
          <Card className={`transition-all ${step !== 3 ? 'opacity-50 pointer-events-none' : 'ring-1 ring-emerald-500/50'}`}>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold">3. Journey Route</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">FROM <span className="text-red-400">*</span></label>
                <input 
                  type="text" value={source} onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. Airport Terminal 2" 
                  className="w-full glass px-4 py-3 rounded-xl text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">TO <span className="text-red-400">*</span></label>
                <input 
                  type="text" value={destination} onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Home, Andheri West" 
                  className="w-full glass px-4 py-3 rounded-xl text-sm outline-none"
                />
              </div>

              {error && step === 3 && <p className="text-red-400 text-sm text-center">{error}</p>}

              {step === 3 && (
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(2)} className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-medium transition">Back</button>
                  <button 
                    onClick={startJourney}
                    disabled={loading || !source || !destination}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Play className="w-4 h-4 fill-white" /> Start Safe Journey</>}
                  </button>
                </div>
              )}
            </div>
          </Card>

        </div>

        {/* SIDEBAR */}
        <div className="space-y-4">
          <Card glow="blue">
            <div className="text-sm font-bold mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" /> What happens next?
            </div>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex gap-2"><span className="text-blue-400">1.</span> <b>Guardians Notified:</b> An SMS with vehicle details and a live tracking link is sent instantly.</li>
              <li className="flex gap-2"><span className="text-blue-400">2.</span> <b>Live Tracking:</b> AI monitors your route for unexpected deviations or stops.</li>
              <li className="flex gap-2"><span className="text-blue-400">3.</span> <b>Evidence Vault:</b> Vehicle photo is securely locked in the cloud.</li>
              <li className="flex gap-2"><span className="text-blue-400">4.</span> <b>SOS Sync:</b> If SOS is triggered, these vehicle details are sent directly to the Police.</li>
            </ul>
          </Card>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex gap-2 leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Always check the vehicle number plate against the app before entering. If the driver refuses verification, consider booking another ride.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
